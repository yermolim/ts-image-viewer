import { Vec2 } from "mathador";

import { getRandomUuid } from "../../common/uuid";
import { CLOUD_ARC_RATIO } from "../../drawing/utils";
import { buildCloudCurveFromPolyline } from "../../drawing/clouds";

import { ImageService } from "../../services/image-service";
import { PolygonAnnotation, PolygonAnnotationDto } from "../../annotations/geometric/polygon-annotation";
import { GeometricAnnotator, GeometricAnnotatorOptions } from "./geometric-annotator";

export class GeometricPolygonAnnotator extends GeometricAnnotator {  
  /**points in the page coordinate system */
  protected readonly _points: Vec2[] = [];
  
  constructor(imageService: ImageService,  
    parent: HTMLDivElement, options?: GeometricAnnotatorOptions) {
    super(imageService, parent, options || {});
    this.init();
  }

  override destroy() {
    super.destroy();
  }  
  
  undo() {
    if (this._points.length) {
      this._points.pop();
      this.redraw();
      this.emitPointsDataChanged();
    }
  }
  
  clear() {  
    if (this._points?.length) {
      this._points.length = 0;
      this.clearGroup();
    }
  }
  
  async saveAnnotationAsync() {
    if (this._points.length < 3) {
      // polygon can't contain less than 3 points
      return;
    }

    const imageUuid = this._imageUuid;
    const dto = this.buildAnnotationDto();
    const annotation = new PolygonAnnotation(this._imageService.eventService, dto);
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

  protected emitPointsDataChanged() {    
    const count = this._points.length;
    this.emitDataChanged(count, count > 1, count > 0, count > 2);
  }
    
  protected redraw() {
    this._svgGroup.innerHTML = "";

    if (this._points.length < 2) {
      return;
    }

    const [r, g, b, a] = this._color || [0, 0, 0, 1];

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
    path.setAttribute("stroke-width", this._strokeWidth + "");

    let pathString: string;
    this._cloudArcSize = this._imageService.currentImageView.imageInfo.dimensions.x * CLOUD_ARC_RATIO;

    if (this._cloudMode) {
      path.setAttribute("stroke-linecap", "round");      
      path.setAttribute("stroke-linejoin", "round");     

      const curveData = buildCloudCurveFromPolyline([...this._points, this._points[0]], 
        this._cloudArcSize);    
  
      pathString = "M" + curveData.start.x + "," + curveData.start.y;
      curveData.curves.forEach(x => {
        pathString += ` C${x[0].x},${x[0].y} ${x[1].x},${x[1].y} ${x[2].x},${x[2].y}`;
      });
      path.setAttribute("d", pathString);

    } else {
      path.setAttribute("stroke-linecap", "square");      
      path.setAttribute("stroke-linejoin", "miter");
      
      const start = this._points[0];
      pathString = "M" + start.x + "," + start.y;
      for (let i = 1; i < this._points.length; i++) {
        const point = this._points[i];
        pathString += " L" + point.x + "," + point.y;
      }
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
    
    this.refreshGroupPosition();

    if (!this._points.length) {
      // add a starting point point
      this._points.push(new Vec2(ix, iy));
    }
    // add a temporary point
    this._points.push(new Vec2(ix, iy));

    const target = e.target as HTMLElement;
    target.addEventListener("pointermove", this.onPointerMove);
    target.addEventListener("pointerup", this.onPointerUp);    
    target.addEventListener("pointerout", this.onPointerUp);  
    // capture pointer to make pointer events fire on same target
    target.setPointerCapture(e.pointerId);
  };

  protected onPointerMove = (e: PointerEvent) => {
    if (!e.isPrimary) { // the event caused not by primary pointer
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
    // update last point (temp one)
    this._points[this._points.length - 1].set(ix, iy);
        
    this.redraw();
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
    
    this.emitPointsDataChanged();
  };
    
  protected buildAnnotationDto(): PolygonAnnotationDto {    
    const nowString = new Date().toISOString();
    const dto: PolygonAnnotationDto = {
      uuid: getRandomUuid(),
      annotationType: "polygon",
      imageUuid: null,

      dateCreated: nowString,
      dateModified: nowString,
      author: this._imageService.userName || "unknown",
      
      textContent: null,

      strokeColor: this._color,
      strokeWidth: this._strokeWidth,
      strokeDashGap: null,
      
      rotation: 0,
      vertices: this._points.map(x => [x.x, x.y]),

      cloud: this._cloudMode,
      cloudArcSize: this._cloudArcSize,
    };

    return dto;
  }
}
