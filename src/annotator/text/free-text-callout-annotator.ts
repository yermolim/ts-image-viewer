import { Vec2 } from "mathador";

import { getRandomUuid } from "../../common/uuid";
import { Double, Quadruple } from "../../common/types";
import { justificationTypes, lineEndingTypes } from "../../drawing/utils";

import { Viewer } from "../../components/viewer";
import { ImageService } from "../../services/image-service";

import { TextAnnotation, TextAnnotationDto, 
  TextAnnotPointsDto } from "../../annotations/text-annotation";
import { TextAnnotator, TextAnnotatorOptions } from "./text-annotator";

export class FreeTextCalloutAnnotator extends TextAnnotator {
  protected readonly _viewer: Viewer;
  
  /**last 'pointerdown' position in the page coordinate system */
  protected _down: Vec2;
  /**min and max rectangle corners in the page coordinate system */
  protected _rect: Quadruple;
  /**future annotation key points */
  protected _points: TextAnnotPointsDto;

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
    this._points = null;
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

  protected initPoints() {    
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

    this._points = points;
    this.emitDataChanged(2, true, true);
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

  protected redrawCallout() {
    // pop the rect svg from group
    const svgRect = this._svgGroup.lastChild;
    svgRect.remove();
    // clear group content
    this._svgGroup.innerHTML = "";
    
    const [r, g, b, a] = this._color || [0, 0, 0, 1];
    const callout = document.createElementNS("http://www.w3.org/2000/svg", "path");
    callout.setAttribute("fill", "none");
    callout.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
    callout.setAttribute("stroke-width", this._strokeWidth + "");
    let d = `M${this._points.cob[0]},${this._points.cob[1]} `;
    if (this._points.cok) {
      d += `L${this._points.cok[0]},${this._points.cok[1]} `;
    }
    d += `L${this._points.cop[0]},${this._points.cop[1]}`;
    callout.setAttribute("d", d);

    this._svgGroup.append(callout);

    // append the rect svg back to group
    this._svgGroup.append(svgRect);
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
    if (uuid !== this._imageUuid) {
      this.clear();
    }
    this._imageUuid = uuid;
    this._down = new Vec2(ix, iy);

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
     
    if (!this._points) {    
      const imageCoords = this._pointerCoordsInImageCS;
      if (!imageCoords) {
        // return if the pointer is outside image
        return;
      }
      const {x: ix, y: iy} = imageCoords;
      const {min, max} = Vec2.minMax(this._down, new Vec2(ix, iy));

      this.redrawRect(min, max);
    }
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

    if (!this._rect) {
      return;
    }
    
    if (!this._points) {
      this.initPoints();
      return;
    }   

    const imageCoords = this._pointerCoordsInImageCS;
    if (!imageCoords) {
      // return if the pointer is outside image
      return;
    }

    const {x: ix, y: iy} = imageCoords;
    const p = new Vec2(ix, iy);

    // get the nearest side center and setting callout start to it
    const {l, b, r, t} = this._points;
    const lv = new Vec2(l[0], l[1]);
    const bv = new Vec2(b[0], b[1]);
    const rv = new Vec2(r[0], r[1]);
    const tv = new Vec2(t[0], t[1]);
    let cob = lv;
    let minDistance = Vec2.subtract(p, lv).getMagnitude();
    const bvToP = Vec2.subtract(p, bv).getMagnitude();
    if (bvToP < minDistance) {
      minDistance = bvToP;
      cob = bv;
    }
    const rvToP = Vec2.subtract(p, rv).getMagnitude();
    if (rvToP < minDistance) {
      minDistance = rvToP;
      cob = rv;
    }
    const tvToP = Vec2.subtract(p, tv).getMagnitude();
    if (tvToP < minDistance) {
      minDistance = tvToP;
      cob = tv;
    }

    this._points.cob = <Double><any>cob.toFloatArray();
    if (!this._points.cop) {
      this._points.cop = <Double><any>p.toFloatArray();
    } else {
      this._points.cok = <Double><any>p.toFloatArray();
    }
    this.redrawCallout();
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

    const dto: TextAnnotationDto = {
      uuid: getRandomUuid(),
      annotationType: "text",
      imageUuid: null,

      dateCreated: nowString,
      dateModified: nowString,
      author: this._imageService.userName || "unknown",
      
      textContent: text,

      points: this._points,
      strokeColor: this._color,
      strokeWidth: this._strokeWidth,
      justification: justificationTypes.LEFT,
      calloutEndingType: lineEndingTypes.ARROW_OPEN,
    };

    return dto;
  }
}
