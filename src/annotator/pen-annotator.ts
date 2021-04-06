import { Mat3, Vec2 } from "../math";
import { Quadruple } from "../common";

import { Annotator } from "./annotator";
import { PenData } from "./pen-data";
import { PathChangeEvent, PenAnnotation } from "../annotations/pen-annotation";
import { ImageView } from "../image/image-view";

export interface PenAnnotatorOptions {
  strokeWidth?: number;  
  color?: Quadruple;
}

export class PenAnnotator extends Annotator {
  protected static lastColor: Quadruple;
  protected static lastStrokeWidth: number;

  protected _annotationPenData: PenData;  
  protected _color: Quadruple;
  protected _strokeWidth: number;

  constructor(parent: HTMLDivElement, imageView: ImageView, options?: PenAnnotatorOptions) {
    super(parent, imageView);
    this.init();

    this._color = options?.color || PenAnnotator.lastColor || [0, 0, 0, 0.9];
    PenAnnotator.lastColor = this._color;

    this._strokeWidth = options?.strokeWidth || PenAnnotator.lastStrokeWidth || 3;
    PenAnnotator.lastStrokeWidth = this._strokeWidth;
  }

  destroy() {   
    this.removeTempPenData();
    super.destroy();
  }

  refreshViewBox() {
    super.refreshViewBox();
    this.updatePenGroupPosition();
  }

  undoPath() {
    this._annotationPenData?.removeLastPath();
    this.emitPathCount();
  }

  clearPaths() {
    this.removeTempPenData();
  }

  savePathsAsPenAnnotation(userName?: string): 
  {imageUuid: string; annotation: PenAnnotation} {
    if (!this._annotationPenData) {
      return;
    }

    const imageUuid = this._annotationPenData.id;
    const annotation = PenAnnotation.createFromPenData(
      this._annotationPenData, userName);    
    const rotation = this._imageView.rotation;
    if (rotation) {
      // TODO: implement correct translation depending on the image rotation
      const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = annotation.aabb;
      const centerX = (xmax + xmin) / 2;      
      const centerY = (ymax + ymin) / 2;      
      const {x: imageWidth, y: imageHeight} = this._imageView.imageInfo.dimensions;

      let x: number;
      let y: number;
      switch(rotation) {
        case 90:
          x = centerY;
          y = imageHeight - centerX;
          break;
        case 180:
          x = imageWidth - centerX;
          y = imageHeight - centerY;
          break;
        case 270:
          x = imageWidth - centerY;
          y = centerX;
          break;
        default:
          throw new Error(`Invalid rotation image value: ${rotation}`);
      }

      const mat = new Mat3()
        .applyTranslation(-centerX, -centerY)
        .applyRotation(rotation / 180 * Math.PI)
        .applyTranslation(x, y);
      annotation.applyCommonTransform(mat);
    }
    
    this.removeTempPenData();
    return {imageUuid, annotation};
  }
  
  protected init() {
    super.init();    
    this._overlay.addEventListener("pointerdown", 
      this.onPenPointerDown);
  }  

  protected updatePenGroupPosition() {
    if (!this._annotationPenData) {
      return;
    }

    const image = this._imageView;
    if (!image) {
      // set scale to 0 to hide pen group if it's image is not rendered
      this._annotationPenData.setGroupMatrix(
        [0, 0, 0, 0, 0, 0]);
      return;
    }

    const {top: iy, left: ix} = image.viewContainer.getBoundingClientRect();
    const {top: vy, left: vx} = this._overlay.getBoundingClientRect();
    const offsetX = (ix - vx) / this._scale;
    const offsetY = (iy - vy) / this._scale;

    this._annotationPenData.setGroupMatrix(
      [1, 0, 0, 1, offsetX, offsetY]);
  }

  protected removeTempPenData() {
    if (this._annotationPenData) {
      this._annotationPenData.group.remove();
      this._annotationPenData = null;
      this.emitPathCount();
    }    
  }

  protected resetTempPenData(imageUuid: string) {    
    this.removeTempPenData();    
    this._annotationPenData = new PenData({
      id: imageUuid,
      color: this._color,
      strokeWidth: this._strokeWidth,
    });
    this._svgGroup.append(this._annotationPenData.group);

    // update pen group matrix to position the group properly
    this.updatePenGroupPosition();
  }
  
  protected onPenPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary || e.button === 2) {
      return;
    }    

    const {clientX: cx, clientY: cy} = e;
    this.updateImageCoords(cx, cy);
    const imageCoords = this._imageCoords;
    if (!imageCoords) {
      // return if the pointer is outside image
      return;
    }

    const {imageX: px, imageY: py} = imageCoords;
    if (!this._annotationPenData) {
      this.resetTempPenData(this._imageView.imageInfo.uuid);
    }
    this._annotationPenData.newPath(new Vec2(px, py));

    const target = e.target as HTMLElement;
    target.addEventListener("pointermove", this.onPenPointerMove);
    target.addEventListener("pointerup", this.onPenPointerUp);    
    target.addEventListener("pointerout", this.onPenPointerUp);  
    // capture pointer to make pointer events fire on same target
    target.setPointerCapture(e.pointerId);
  };

  protected onPenPointerMove = (e: PointerEvent) => {
    if (!e.isPrimary || !this._annotationPenData) {
      return;
    }

    const {clientX: cx, clientY: cy} = e;
    this.updateImageCoords(cx, cy);

    const imageCoords = this._imageCoords;
    if (!imageCoords) {
      // skip move if the pointer is outside of the image
      return;
    }
    
    this._annotationPenData.addPosition(new Vec2(imageCoords.imageX, imageCoords.imageY));
  };

  protected onPenPointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      return;
    }

    const target = e.target as HTMLElement;
    target.removeEventListener("pointermove", this.onPenPointerMove);
    target.removeEventListener("pointerup", this.onPenPointerUp);    
    target.removeEventListener("pointerout", this.onPenPointerUp);
    target.releasePointerCapture(e.pointerId);   

    this._annotationPenData?.endPath();
    this.emitPathCount();
  };

  protected emitPathCount() {
    this._parent.dispatchEvent(new PathChangeEvent({
      pathCount: this._annotationPenData?.pathCount || 0,
    }));
  }
}
