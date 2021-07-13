import { Vec2 } from "mathador";
import { Quadruple } from "../../common/types";
import { getRandomUuid } from "../../common/uuid";

import { ImageService } from "../../services/image-service";

import { Annotator, AnnotatorDataChangeEvent } from "../annotator";
import { SvgSmoothPath } from "../../drawing/paths/svg-smooth-path";
import { PenAnnotation, PenAnnotationDto } from "../../annotations/pen-annotation";

export interface PenAnnotatorOptions {
  strokeWidth?: number;  
  color?: Quadruple;
}

/**tool for adding ink (hand-drawn) annotations */
export class PenAnnotator extends Annotator {
  protected _annotationPathData: SvgSmoothPath;  
  protected _color: Quadruple;
  protected _strokeWidth: number;

  constructor(imageService: ImageService, parent: HTMLDivElement, 
    options?: PenAnnotatorOptions) {
    super(imageService, parent);
    this.init();

    this._color = options?.color || [0, 0, 0, 0.9];
    this._strokeWidth = options?.strokeWidth || 3;
  }

  override destroy() {   
    this.removeTempPenData();
    super.destroy();
  }

  /**remove the last path from the temp path group */
  undo() {
    this._annotationPathData?.removeLastPath();
    this.emitDataChanged();
  }

  /**clear the temp path group */
  clear() {
    this.removeTempPenData();
  }

  /**
   * save the current temp path as an pen annotation and append it to the image
   */
  async saveAnnotationAsync() {
    if (!this._annotationPathData) {
      return;
    }

    const imageUuid = this._annotationPathData.uuid;
    const dto = this.buildAnnotationDto(this._annotationPathData);
    const annotation = new PenAnnotation(this._imageService.eventService, dto);
    // DEBUG
    // console.log(annotation);

    this._imageService.appendAnnotationToImage(imageUuid, annotation);
    
    this.clear();
  }
  
  protected override init() {
    super.init();    
    this._overlay.addEventListener("pointerdown", 
      this.onPointerDown);
  }

  /**
   * adapt the Svg group positions to the current view box dimensions
   */
  protected refreshGroupPosition() {
    if (!this._annotationPathData) {
      return;
    }
    
    const image = this._imageService.currentImageView;
    if (!image || image.imageInfo.uuid !== this._annotationPathData.uuid) {
      // set scale to 0 to hide pen group if it's image is not rendered
      this._annotationPathData.group.setAttribute("transform", "scale(0)");
      return;
    }

    const {height: imageHeight, width: imageWidth, top: imageTop, left: imageLeft} = 
      image.viewContainer.getBoundingClientRect();
    const imageBottom = imageTop + imageHeight;
    const imageRight = imageLeft + imageWidth;
    const {top: overlayTop, left: overlayLeft} = this._overlay.getBoundingClientRect();
    const rotation = image.rotation;
    const scale = image.scale;
    let offsetX: number;
    let offsetY: number;   
    switch (rotation) {
      case 0:
        // top-left image corner
        offsetX = (imageLeft - overlayLeft) / scale;
        offsetY = (imageTop - overlayTop) / scale;
        break;
      case 90:
        // top-right image corner
        offsetX = (imageRight - overlayLeft) / scale;
        offsetY = (imageTop - overlayTop) / scale; 
        break;
      case 180:    
        // bottom-right image corner
        offsetX = (imageRight - overlayLeft) / scale;
        offsetY = (imageBottom - overlayTop) / scale;
        break;
      case 270:
        // bottom-left image corner
        offsetX = (imageLeft - overlayLeft) / scale;
        offsetY = (imageBottom - overlayTop) / scale;
        break;
      default:
        throw new Error(`Invalid rotation degree: ${rotation}`);
    }
    this._annotationPathData.group.setAttribute("transform",
      `translate(${offsetX} ${offsetY}) rotate(${rotation})`);      
  }

  /**clear the temp path group */
  protected removeTempPenData() {
    if (this._annotationPathData) {
      this._annotationPathData.group.remove();
      this._annotationPathData = null;
      this.emitDataChanged();
    }    
  }

  /**
   * clear the current temp path group and create a new empty one instead
   * @param imageUuid 
   */
  protected resetTempPenData(imageUuid: string) {    
    this.removeTempPenData();      

    this._annotationPathData = new SvgSmoothPath({
      uuid: imageUuid, 
      color: this._color,
      strokeWidth: this._strokeWidth,
    });
    this._svgGroup.append(this._annotationPathData.group);

    // update pen group matrix to position the group properly
    this.refreshGroupPosition();
  }
  
  protected onPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary || e.button === 2) {
      return;
    }    

    const {clientX: cx, clientY: cy} = e;
    this.updatePointerCoords(cx, cy);
    const imageCoords = this._pointerCoordsInImageCS;
    if (!imageCoords) {
      // return if the pointer is outside image
      return;
    }    

    const {x: ix, y: iy, info: {uuid}} = imageCoords;
    if (!this._annotationPathData || uuid !== this._annotationPathData.uuid) {
      // the current image changed. reset the temp group
      this.resetTempPenData(uuid);
    }

    // create a new temp path
    this._annotationPathData.newPath(new Vec2(ix, iy));

    const target = e.target as HTMLElement;
    target.addEventListener("pointermove", this.onPointerMove);
    target.addEventListener("pointerup", this.onPointerUp);    
    target.addEventListener("pointerout", this.onPointerUp);  
    // capture pointer to make pointer events fire on same target
    target.setPointerCapture(e.pointerId);
  };

  protected onPointerMove = (e: PointerEvent) => {
    if (!e.isPrimary || !this._annotationPathData) {
      return;
    }

    const {clientX: cx, clientY: cy} = e;
    this.updatePointerCoords(cx, cy);

    const imageCoords = this._pointerCoordsInImageCS;
    if (!imageCoords || imageCoords.info?.uuid !== this._annotationPathData.uuid) {
      // skip move if the pointer is outside of the starting image
      return;
    }
    
    // add the current pointer position to the current temp path
    const position = new Vec2(imageCoords.x, imageCoords.y);   

    this._annotationPathData.addPosition(position);
  };

  protected onPointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      return;
    }

    const target = e.target as HTMLElement;
    target.removeEventListener("pointermove", this.onPointerMove);
    target.removeEventListener("pointerup", this.onPointerUp);    
    target.removeEventListener("pointerout", this.onPointerUp);
    target.releasePointerCapture(e.pointerId);   

    this._annotationPathData?.endPath();
    this.emitDataChanged();
  };

  protected emitDataChanged() {
    const count = this._annotationPathData?.pathCount || 0;
    this._imageService.eventService.dispatchEvent(new AnnotatorDataChangeEvent({
      annotatorType: "pen",
      elementCount: count,
      undoable: count > 1,
      clearable: count > 0,
      saveable: count > 0,
    }));
  }

  protected buildAnnotationDto(data: SvgSmoothPath): PenAnnotationDto {
    const positions: Vec2[] = [];
    const pathList: number[][] = [];
    data.paths.forEach(path => {
      const ink: number[] = [];
      path.positions.forEach(pos => {
        positions.push(pos);
        ink.push(pos.x, pos.y);
      });
      pathList.push(ink);
    });    

    const nowString = new Date().toISOString();
    const dto: PenAnnotationDto = {
      uuid: getRandomUuid(),
      annotationType: "pen",
      imageUuid: null,

      dateCreated: nowString,
      dateModified: nowString,
      author: this._imageService.userName || "unknown",
      
      textContent: null,

      pathList,
      strokeColor: data.color,
      strokeWidth: data.strokeWidth,
      strokeDashGap: null,
    };

    return dto;
  }
}
