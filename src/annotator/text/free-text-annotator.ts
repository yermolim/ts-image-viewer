import { Vec2 } from "mathador";

import { getRandomUuid } from "../../common/uuid";
import { Quadruple } from "../../common/types";
import { justificationTypes, lineEndingTypes } from "../../drawing/utils";

import { Viewer } from "../../components/viewer";
import { ImageService } from "../../services/image-service";

import { TextAnnotation, TextAnnotationDto, 
  TextAnnotPointsDto } from "../../annotations/text-annotation";
import { TextAnnotator, TextAnnotatorOptions } from "./text-annotator";

export class FreeTextAnnotator extends TextAnnotator {
  protected readonly _viewer: Viewer;
  
  /**last 'pointerdown' position in the image coordinate system */
  protected _down: Vec2;
  /**min and max rectangle corners in the image coordinate system */
  protected _rect: Quadruple;

  constructor(imageService: ImageService,  
    viewer: Viewer, options?: TextAnnotatorOptions) {
    super(imageService, viewer.container, options || {});
    this._viewer = viewer;
    this.init();
  }

  override destroy() {    
    this.emitDataChanged(0);
    super.destroy();
  }

  undo() {
    this.clear();
  }

  clear() {
    this._rect = null;
    this._svgGroup.innerHTML = "";
    this.emitDataChanged(0);
  }

  /**saves the current temp annotation to the document data */
  async saveAnnotationAsync() {
    if (!this._imageUuid || !this._rect) {
      return;
    }

    const text = await this._viewer.showTextDialogAsync("");
    if (text !== null) {
      const imageUuid = this._imageUuid;
      const dto = this.buildAnnotationDto(text);
      if (dto) {
        const annotation = new TextAnnotation(this._imageService.eventService, dto);
        // DEBUG
        // console.log(annotation);
    
        // append the current temp annotation to the image
        this._imageService.appendAnnotationToImage(imageUuid, annotation);
      }
    }
    
    this.clear();
  }
  
  protected override init() {
    super.init();
    this._overlay.addEventListener("pointerdown", 
      this.onPointerDown);
  }
  
  /**
   * clear the old svg rectangle if present and draw a new one instead
   * @param min rect corner with the minimal coordinate values
   * @param max rect corner with the maximal coordinate values
   */
  protected redrawRect(min: Vec2, max: Vec2) {
    this._svgGroup.innerHTML = "";

    const minSize = this._strokeWidth * 2;
    if (max.x - min.x <= minSize || max.y - min.y <= minSize) {
      // square is too small
      this._rect = null;
      return;
    }

    const [r, g, b, a] = this._color || [0, 0, 0, 1];
    this._rect = [min.x, min.y, max.x, max.y];

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("fill", "white");
    rect.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
    rect.setAttribute("stroke-width", this._strokeWidth + "");
    rect.setAttribute("x", min.x + "");
    rect.setAttribute("y", min.y + "");
    rect.setAttribute("width", max.x - min.x + "");
    rect.setAttribute("height", max.y - min.y + "");  
    this._svgGroup.append(rect);
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
    this._imageUuid = uuid;
    this._down = new Vec2(ix, iy);

    this.clear();
    this.refreshGroupPosition();

    const target = e.target as HTMLElement;
    target.addEventListener("pointermove", this.onPointerMove);
    target.addEventListener("pointerup", this.onPointerUp);    
    target.addEventListener("pointerout", this.onPointerUp);  
    // capture pointer to make pointer events fire on same target
    target.setPointerCapture(e.pointerId);
  };

  protected onPointerMove = (e: PointerEvent) => {
    if (!e.isPrimary // the event caused not by primary pointer
      || !this._down // the pointer is not in the 'down' state
    ) {
      return;
    }

    const {clientX: cx, clientY: cy} = e;
    this.updatePointerCoords(cx, cy);
    const imageCoords = this._pointerCoordsInImageCS;
    if (!imageCoords) {
      // return if the pointer is outside image
      return;
    }

    const {x: ix, y: iy} = imageCoords;
    const {min, max} = Vec2.minMax(this._down, new Vec2(ix, iy));
        
    this.redrawRect(min, max);
  };

  protected onPointerUp = async (e: PointerEvent) => {
    if (!e.isPrimary) {
      return;
    }

    const target = e.target as HTMLElement;
    target.removeEventListener("pointermove", this.onPointerMove);
    target.removeEventListener("pointerup", this.onPointerUp);    
    target.removeEventListener("pointerout", this.onPointerUp);
    target.releasePointerCapture(e.pointerId); 
    
    if (this._rect) {
      await this.saveAnnotationAsync();
    }
  };

  protected refreshGroupPosition() {
    if (!this._imageUuid) {
      // image for drawing not selected
      return;
    }    

    const image = this._imageService.currentImageView;
    if (!image || image.imageInfo.uuid !== this._imageUuid) {
      // set scale to 0 to hide the svg group if it's image is not rendered
      this._svgGroup.setAttribute("transform", "scale(0)");
      return;
    }

    const {tx, ty, rotation} = this.getImageTransformationInfo(image);
    this._svgGroup.setAttribute("transform",
      `translate(${tx} ${ty}) rotate(${rotation})`);      
  }
  
  protected buildAnnotationDto(text: string): TextAnnotationDto {
    const nowString = new Date().toISOString();

    const [xmin, ymin, xmax, ymax] = this._rect;
    const horCenterX = (xmin + xmax) / 2;
    const vertCenterY = (ymin + ymax) / 2;

    const points: TextAnnotPointsDto = {
      bl: [xmin, ymin], 
      tr: [xmax, ymax],
      br: [xmax, ymin],
      tl: [xmin, ymax],    
      l: [xmin, vertCenterY],
      t: [horCenterX, ymax], 
      r: [xmax, vertCenterY],
      b: [horCenterX, ymin],
    };

    const dto: TextAnnotationDto = {
      uuid: getRandomUuid(),
      annotationType: "text",
      imageUuid: null,

      dateCreated: nowString,
      dateModified: nowString,
      author: this._imageService.userName || "unknown",
      
      textContent: text,

      points,
      strokeColor: this._color,
      strokeWidth: this._strokeWidth,
      justification: justificationTypes.LEFT,
      calloutEndingType: lineEndingTypes.ARROW_OPEN,
    };

    return dto;
  }
}
