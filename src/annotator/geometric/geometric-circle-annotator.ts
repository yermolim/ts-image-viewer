import { Mat3, Vec2 } from "mathador";

import { getRandomUuid } from "../../common/uuid";
import { buildCloudCurveFromEllipse } from "../../drawing/clouds";
import { BEZIER_CONSTANT, CLOUD_ARC_RATIO } from "../../drawing/utils";

import { ImageService } from "../../services/image-service";
import { CircleAnnotation, CircleAnnotationDto } from "../../annotations/geometric/circle-annotation";
import { GeometricAnnotator, GeometricAnnotatorOptions } from "./geometric-annotator";

export class GeometricCircleAnnotator extends GeometricAnnotator {
  /**last 'pointerdown' position in the page coordinate system */
  protected _down: Vec2;

  protected _center: Vec2;
  protected _rx: number;
  protected _ry: number;
  
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
    const annotation = new CircleAnnotation(this._imageService.eventService, dto);
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
   * clear the old svg circle if present and draw a new one instead
   * @param min rect corner with the minimal coordinate values
   * @param max rect corner with the maximal coordinate values
   */
  protected redrawCircle(min: Vec2, max: Vec2) {
    this._svgGroup.innerHTML = "";

    const minSize = this._strokeWidth * 2;
    if (max.x - min.x <= minSize || max.y - min.y <= minSize) {
      // circle is too small
      this._center = null;
      return;
    }

    const [r, g, b, a] = this._color || [0, 0, 0, 1];

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
    path.setAttribute("stroke-width", this._strokeWidth + "");
    path.setAttribute("stroke-linecap", "round");      
    path.setAttribute("stroke-linejoin", "round");   

    let pathString: string;
    const rx = (max.x - min.x) / 2;
    const ry = (max.y - min.y) / 2;
    const center = new Vec2(min.x + rx, min.y + ry);

    this._center = center.clone();
    this._rx = rx;
    this._ry = ry;
    this._cloudArcSize = this._imageService.currentImageView.imageInfo.dimensions.x * CLOUD_ARC_RATIO;

    if (this._cloudMode) {
      const curveData = buildCloudCurveFromEllipse(rx, ry, this._cloudArcSize, 
        new Mat3().applyTranslation(center.x, center.y));    
  
      pathString = "M" + curveData.start.x + "," + curveData.start.y;
      curveData.curves.forEach(x => {
        pathString += ` C${x[0].x},${x[0].y} ${x[1].x},${x[1].y} ${x[2].x},${x[2].y}`;
      });
    } else {      
      const c = BEZIER_CONSTANT;
      const cw = c * rx;
      const ch = c * ry;
      // drawing four cubic bezier curves starting at the top tangent
      pathString = "M" + center.x + "," + max.y;
      pathString += ` C${center.x + cw},${max.y} ${max.x},${center.y + ch} ${max.x},${center.y}`;
      pathString += ` C${max.x},${center.y - ch} ${center.x + cw},${min.y} ${center.x},${min.y}`;
      pathString += ` C${center.x - cw},${min.y} ${min.x},${center.y - ch} ${min.x},${center.y}`;
      pathString += ` C${min.x},${center.y + ch} ${center.x - cw},${max.y} ${center.x},${max.y}`;
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
        
    this.redrawCircle(min, max);
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
  
  protected buildAnnotationDto(): CircleAnnotationDto {
    const nowString = new Date().toISOString();
    const dto: CircleAnnotationDto = {
      uuid: getRandomUuid(),
      annotationType: "circle",
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
      rx: this._rx,
      ry: this._ry,
      center: [this._center.x, this._center.y],
    };

    return dto;
  }
}
