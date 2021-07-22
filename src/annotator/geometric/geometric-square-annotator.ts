import { Vec2 } from "mathador";

import { UUID, CloudCurveData } from "ts-viewers-core";
import { CLOUD_ARC_RATIO } from "../../drawing/utils";

import { ImageService } from "../../services/image-service";
import { SquareAnnotation, SquareAnnotationDto } from "../../annotations/geometric/square-annotation";
import { GeometricAnnotator, GeometricAnnotatorOptions } from "./geometric-annotator";

export class GeometricSquareAnnotator extends GeometricAnnotator {
  /**last 'pointerdown' position in the page coordinate system */
  protected _down: Vec2;

  protected _center: Vec2;
  protected _w: number;
  protected _h: number;
  
  constructor(imageService: ImageService,  
    parent: HTMLDivElement, options?: GeometricAnnotatorOptions) {
    super(imageService, parent, options || {});
    this.init();
  }

  override destroy() {
    super.destroy();
  }  
  
  undo() {
    this.clear();
  }
  
  clear() {  
    this._center = null;
    this.clearGroup();
  }
  
  async saveAnnotationAsync() {
    if (!this._center) {
      return;
    }

    const imageUuid = this._imageUuid;
    const dto = this.buildAnnotationDto();
    const annotation = new SquareAnnotation(this._imageService.eventService, dto);
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
   * clear the old svg rectangle if present and draw a new one instead
   * @param min rect corner with the minimal coordinate values
   * @param max rect corner with the maximal coordinate values
   */
  protected redraw(min: Vec2, max: Vec2) {
    this._svgGroup.innerHTML = "";

    const minSize = this._strokeWidth * 2;
    if (max.x - min.x <= minSize || max.y - min.y <= minSize) {
      // square is too small
      this._center = null;
      return;
    }

    const [r, g, b, a] = this._color || [0, 0, 0, 1];
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
    path.setAttribute("stroke-width", this._strokeWidth + "");
    
    let pathString: string;
    const w = (max.x - min.x);
    const h = (max.y - min.y);
    const center = new Vec2(min.x + w / 2, min.y + h / 2);
    
    this._center = center.clone();
    this._w = w;
    this._h = h;
    this._cloudArcSize = this._imageService.currentImageView.imageInfo.dimensions.x * CLOUD_ARC_RATIO;

    if (this._cloudMode) {
      path.setAttribute("stroke-linecap", "round");      
      path.setAttribute("stroke-linejoin", "round");   
      
      const curveData = CloudCurveData.buildFromPolyline([
        new Vec2(min.x, min.y),
        new Vec2(max.x, min.y),
        new Vec2(max.x, max.y),
        new Vec2(min.x, max.y),
        new Vec2(min.x, min.y),
      ], this._cloudArcSize);    
  
      pathString = "M" + curveData.start.x + "," + curveData.start.y;
      curveData.curves.forEach(x => {
        pathString += ` C${x[0].x},${x[0].y} ${x[1].x},${x[1].y} ${x[2].x},${x[2].y}`;
      });
    } else {
      path.setAttribute("stroke-linecap", "square");      
      path.setAttribute("stroke-linejoin", "miter");

      pathString = "M" + min.x + "," + min.y;
      pathString += " L" + max.x + "," + min.y;
      pathString += " L" + max.x + "," + max.y;
      pathString += " L" + min.x + "," + max.y;
      pathString += " Z";
    }
    
    path.setAttribute("d", pathString);
    this._svgGroup.append(path);
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
        
    this.redraw(min, max);
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
    
    if (this._center) {
      this.emitDataChanged(2, true, true);
    }
  };
  
  protected buildAnnotationDto(): SquareAnnotationDto {
    const nowString = new Date().toISOString();
    const dto: SquareAnnotationDto = {
      uuid: UUID.getRandomUuid(),
      annotationType: "square",
      imageUuid: null,

      dateCreated: nowString,
      dateModified: nowString,
      author: this._imageService.userName || "unknown",
      
      textContent: null,

      strokeColor: this._color,
      strokeWidth: this._strokeWidth,
      strokeDashGap: null,      

      cloud: this._cloudMode,
      cloudArcSize: this._cloudArcSize,
      
      rotation: 0,
      width: this._w,
      height: this._h,
      center: [this._center.x, this._center.y],
    };

    return dto;
  }
}
