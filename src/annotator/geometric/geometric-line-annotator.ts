import { Vec2 } from "mathador";

import { UUID} from "ts-viewers-core";
import { lineEndingTypes } from "../../drawing/utils";

import { ImageService } from "../../services/image-service";
import { LineAnnotation, LineAnnotationDto } from "../../annotations/geometric/line-annotation";
import { GeometricAnnotator, GeometricAnnotatorOptions } from "./geometric-annotator";

export class GeometricLineAnnotator extends GeometricAnnotator {
  /**last 'pointerdown' position in the page coordinate system */
  protected _down: Vec2;
  
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
    this.clear();
  }
  
  clear() {  
    this._points.length = 0;
    this.clearGroup();
  }
  
  async saveAnnotationAsync() {
    if (this._points.length < 2) {
      return;
    }

    const imageUuid = this._imageUuid;
    const dto = this.buildAnnotationDto();
    const annotation = new LineAnnotation(this._imageService.eventService, dto);
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
   * clear the old svg line if present and draw a new one instead
   * @param min segment start
   * @param max segment end
   */
  protected redraw(min: Vec2, max: Vec2) {
    this._svgGroup.innerHTML = "";

    if (this._points.length < 2) {
      return;
    }

    const [r, g, b, a] = this._color || [0, 0, 0, 1];

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
    path.setAttribute("stroke-width", this._strokeWidth + "");
    path.setAttribute("stroke-linecap", "square");      
    path.setAttribute("stroke-linejoin", "miter");

    const pathString = `M ${min.x},${min.y} L ${max.x},${max.y}`;
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
    const start = this._down.clone();
    const end = new Vec2(ix, iy);
    this._points[0] = start;
    this._points[1] = end;
        
    this.redraw(this._down, end);
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
    
    if (this._points.length > 1) {
      this.emitDataChanged(2, true, true);
    }
  };
  
  protected buildAnnotationDto(): LineAnnotationDto {    
    const nowString = new Date().toISOString();
    const dto: LineAnnotationDto = {
      uuid: UUID.getRandomUuid(),
      annotationType: "line",
      imageUuid: null,

      dateCreated: nowString,
      dateModified: nowString,
      author: this._imageService.userName || "unknown",
      
      textContent: null,

      strokeColor: this._color,
      strokeWidth: this._strokeWidth,
      strokeDashGap: null,
      
      rotation: 0,

      vertices: [
        [this._points[0].x, this._points[0].y],
        [this._points[1].x, this._points[1].y],
      ],
      endings: [lineEndingTypes.NONE, lineEndingTypes.NONE],
      leaderLineTopHeight: 0,
      leaderLineBottomHeight: 0,
      caption: null,
    };

    return dto;
  }
}
