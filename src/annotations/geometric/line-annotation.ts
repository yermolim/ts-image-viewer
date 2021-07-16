import { Mat3, Vec2 } from "mathador";

import { Double } from "../../common/types";
import { AppearanceRenderResult, BBox, buildLineEndingPath, getLineRenderHelpers, LineEndingType, 
  lineEndingTypes, LineRenderHelpers, LINE_CAPTION_FONT_RATIO, LINE_CAPTION_SIZE_RATIO, LINE_END_MIN_SIZE, 
  LINE_END_SIZE_RATIO, SELECTION_STROKE_WIDTH, SvgElementWithBlendMode } from "../../drawing/utils";

import { EventService } from "../../common/event-service";
import { GeometricAnnotation, GeometricAnnotationDto } from "./geometric-annotation";
import { SvgTempPath } from "../../drawing/paths/svg-temp-path";
import { buildTextDataAsync } from "../../common/text-data";

export interface LineAnnotationDto extends GeometricAnnotationDto {  
  vertices: [Double, Double];

  endings?: [LineEndingType, LineEndingType];
  caption?: string;

  leaderLineTopHeight?: number;
  leaderLineBottomHeight?: number;
}

export class LineAnnotation extends GeometricAnnotation {
  protected _vertices: [Vec2, Vec2];
  get vertices(): [Vec2, Vec2] {
    return this._vertices;
  }

  protected _endings: [startType: LineEndingType, endType: LineEndingType];
  get endings(): [startType: LineEndingType, endType: LineEndingType] {
    return this._endings;
  }

  protected _caption: string;
  get caption(): string {
    return this._caption;
  }
  
  protected _leaderLineTopHeight: number;
  get leaderLineTopHeight(): number {
    return this._leaderLineTopHeight;
  }

  protected _leaderLineBottomHeight: number;
  get leaderLineBottomHeight(): number {
    return this._leaderLineBottomHeight;
  }

  get matrix(): Mat3 {
    return this.getRenderHelpers().matrix;
  }

  protected _scaleHandleActive: "start" | "end"; 
  protected readonly _svgTemp = new SvgTempPath(); 
  
  constructor(eventService: EventService, dto: LineAnnotationDto) {
    super(eventService, dto);

    if (dto.annotationType !== "line") {
      throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'line')`);
    }

    this._vertices = dto.vertices?.length === 2
      ? [
        new Vec2(dto.vertices[0][0], dto.vertices[0][1]),
        new Vec2(dto.vertices[1][0], dto.vertices[1][1]),
      ]
      : [new Vec2(), new Vec2()];
    this._endings = dto.endings || [lineEndingTypes.NONE, lineEndingTypes.NONE];
    this._caption = dto.caption;
    this._leaderLineTopHeight = dto.leaderLineTopHeight ?? 0;
    this._leaderLineBottomHeight = dto.leaderLineBottomHeight ?? 0;
  } 
    
  override toDto(): LineAnnotationDto {
    return {
      annotationType: this.type,
      uuid: this.uuid,
      imageUuid: this._imageUuid,

      dateCreated: this._dateCreated.toISOString(),
      dateModified: this._dateModified.toISOString(),
      author: this._author,

      rotation: this._rotation,
      textContent: this._textContent,

      strokeColor: this._strokeColor,
      strokeWidth: this._strokeWidth,
      strokeDashGap: this._strokeDashGap,

      caption: this._caption,

      vertices: [
        [this._vertices[0].x, this._vertices[0].y],
        [this._vertices[1].x, this._vertices[1].y],
      ],
      endings: this._endings,
      leaderLineTopHeight: this._leaderLineTopHeight,
      leaderLineBottomHeight: this._leaderLineBottomHeight,
    };
  }  

  override async setTextContentAsync(text: string, undoable = true) {
    this._caption = text; // TODO: separate caption edit from text content (description) edit
    this.updateAABB();
    await super.setTextContentAsync(text, undoable);
    await this.updateRenderAsync();
  }
  
  protected override async applyCommonTransformAsync(matrix: Mat3, undoable = true) {
    this._vertices.forEach(x => x.applyMat3(matrix));

    await super.applyCommonTransformAsync(matrix, undoable);
  } 
  
  protected async renderAppearanceAsync(): Promise<AppearanceRenderResult> {   
    try {
      const clipPaths: SVGClipPathElement[] = [];
      const elements: SvgElementWithBlendMode[] = [];
      const pickHelpers: SVGGraphicsElement[] = [];

      const sw = this._strokeWidth;
      
      // clip paths
      const [min, max] = this.aabb;
      const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
      clipPath.id = `clip0_${this.uuid}`;
      clipPath.innerHTML = "<path d=\""
        + `M${min.x},${min.y} `
        + `L${max.x},${min.y} `
        + `L${max.x},${max.y} `
        + `L${min.x},${max.y} `
        + "z"
        + "\"/>";
      clipPaths.push(clipPath);

      // graphic elements
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("clip-path", `url(#${clipPath.id})`);
      
      const clonedGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      clonedGroup.classList.add("annotation-pick-helper");

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("fill", "none");
      const [r, g, b, a] = this._strokeColor;
      path.setAttribute("stroke", `rgba(${r*255},${g*255},${b*255},${a})`);
      path.setAttribute("stroke-width", this._strokeWidth + "");
      if (this._strokeDashGap) {
        path.setAttribute("stroke-dasharray", this._strokeDashGap.join(" "));       
      }     
      path.setAttribute("stroke-linecap", "square");      
      path.setAttribute("stroke-linejoin", "miter");      

      const {matrix, alignedStart, alignedEnd} = this.getRenderHelpers();  

      // draw line itself
      let d = `M${alignedStart.x},${alignedStart.y}`;
      d += ` L${alignedEnd.x},${alignedEnd.y}`;

      // draw leader lines if present
      if (this._leaderLineTopHeight || this._leaderLineBottomHeight) {
        const llTop = new Vec2(0, -Math.abs(this._leaderLineTopHeight));
        const llBottom = new Vec2(0, Math.abs(this._leaderLineBottomHeight));
        const llLeftStart = Vec2.add(alignedStart, llBottom);
        const llLeftEnd = Vec2.add(alignedStart, llTop);
        const llRightStart = Vec2.add(alignedEnd, llBottom);
        const llRightEnd = Vec2.add(alignedEnd, llTop);        
        d += ` M${llLeftStart.x},${llLeftStart.y}`;
        d += ` L${llLeftEnd.x},${llLeftEnd.y}`;
        d += ` M${llRightStart.x},${llRightStart.y}`;
        d += ` L${llRightEnd.x},${llRightEnd.y}`;
      }

      // draw line endings if present 
      if (this._endings) {
        if (this._endings[0] !== lineEndingTypes.NONE) {
          const endingPathString = buildLineEndingPath(alignedStart, 
            this._endings[0], sw, "left");
          d += " " + endingPathString;
        }
        if (this._endings[1] !== lineEndingTypes.NONE) {
          const endingPathString = buildLineEndingPath(alignedEnd, 
            this._endings[1], sw, "right");
          d += " " + endingPathString;
        }
      }  

      path.setAttribute("d", d);
      group.append(path);

      if (this._caption) {
        const fontSize = LINE_CAPTION_FONT_RATIO * sw;
        const captionHeight = LINE_CAPTION_SIZE_RATIO * sw;
        const sidePadding = Math.max(sw * LINE_END_SIZE_RATIO, 
          LINE_END_MIN_SIZE);
        const maxTextWidth = alignedEnd.getMagnitude() - 2 * sidePadding;
        const textPivot = new Vec2(alignedEnd.getMagnitude() / 2, - captionHeight / 2 - sw / 2);
        if (maxTextWidth > 0) {
          const textData = await buildTextDataAsync(this._caption, {
            maxWidth: maxTextWidth,
            fontSize: fontSize,
            strokeWidth: sw,
            textAlign: "center",
            pivotPoint: "center",
          });
          const firstLine = textData.lines[0]; // only one-liners are supported for line annotation
          const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          rect.setAttribute("x", textPivot.x + firstLine.relativeRect[0] + ""); // TODO: test
          rect.setAttribute("y", textPivot.y - captionHeight / 2 + "");
          rect.setAttribute("width", firstLine.relativeRect[2] - firstLine.relativeRect[0] + "");
          rect.setAttribute("height", captionHeight + "");
          rect.setAttribute("fill", "rgba(255,255,255,0.5)");
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("x", textPivot.x + ""); // TODO: test
          text.setAttribute("y", textPivot.y + "");
          text.setAttribute("fill", "black");
          text.setAttribute("dominant-baseline", "middle");
          text.setAttribute("text-anchor", "middle");
          text.style.fontSize = fontSize + "px";
          text.style.fontFamily = "sans-serif";
          text.textContent = firstLine.text;  
          group.append(rect, text);
        }
      }

      // apply transformation matrix
      const matrixString = `matrix(${matrix.truncate(5).toFloatShortArray().join(",")})`;
      group.childNodes.forEach(x => {
        if (x instanceof SVGGraphicsElement) {          
          x.setAttribute("transform", matrixString);
        }
      });

      // create a transparent path copy with large stroke width to simplify user interaction  
      const clonedPath = path.cloneNode(true) as SVGPathElement;
      const clonedPathStrokeWidth = sw < SELECTION_STROKE_WIDTH
        ? SELECTION_STROKE_WIDTH
        : sw;
      clonedPath.setAttribute("stroke-width", clonedPathStrokeWidth + "");
      clonedPath.setAttribute("stroke", "transparent");
      clonedPath.setAttribute("fill", "none");
      clonedPath.setAttribute("transform", `matrix(${matrix.truncate(5).toFloatShortArray().join(",")})`);
      clonedGroup.append(clonedPath);

      elements.push({
        element: group, 
        blendMode: "normal",
      });
      pickHelpers.push(clonedGroup);
      
      return {
        elements,
        clipPaths,
        pickHelpers,
      };
    }
    catch (e) {
      console.log(`Annotation render error: ${e.message}`);
      return null;   
    } 
  }
  
  protected updateAABB() {
    // get annotation box corners
    const bbox = this.getBoxCorners();
    const {ll, lr, ur, ul} = bbox;

    // find the minimum and maximum points
    const {min, max} = Vec2.minMax(ll, lr, ur, ul);

    // assign the corresponding fields values
    this._bbox = bbox;
    this._aabb[0].setFromVec2(min);
    this._aabb[1].setFromVec2(max);
  }  
  
  protected getRenderHelpers(): LineRenderHelpers {
    const start = this._vertices[0].clone();
    const end = this._vertices[1].clone();

    return getLineRenderHelpers(start, end);
  }

  protected getBoxCorners(helpers?: LineRenderHelpers): BBox {
    const {matrix, alignedStart, alignedEnd} = helpers ?? this.getRenderHelpers();  
    const sw = this._strokeWidth;

    // get box margins taking into account stroke width
    const endingNotNone = this._endings &&
      (this._endings[0] && this._endings[0] !== lineEndingTypes.NONE
        || this._endings[1] && this._endings[1] !== lineEndingTypes.NONE);
    const margin = endingNotNone
      ? sw / 2 + Math.max(LINE_END_MIN_SIZE, LINE_END_SIZE_RATIO * sw)
      : sw / 2;
    const marginTop = Math.max(Math.abs(this._leaderLineTopHeight), 
      margin, this._caption ? LINE_CAPTION_SIZE_RATIO * sw + sw / 2 : 0);
    const marginBottom = Math.max(Math.abs(this._leaderLineBottomHeight), margin);

    const min = Vec2.add(alignedStart, new Vec2(-margin, -marginTop));
    const max = Vec2.add(alignedEnd, new Vec2(margin, marginBottom));

    // create vectors for box corners
    const bl = new Vec2(min.x, min.y).applyMat3(matrix);
    const br = new Vec2(max.x, min.y).applyMat3(matrix);
    const tr = new Vec2(max.x, max.y).applyMat3(matrix);
    const tl = new Vec2(min.x, max.y).applyMat3(matrix);

    return {
      ll: bl,
      lr: br,
      ur: tr,
      ul: tl,
    };
  }
  
  //#region overriding handles
  protected override renderHandles(): SVGGraphicsElement[] {   
    return [...this.renderLineEndHandles(), this.renderRotationHandle()];
  } 
  
  protected renderLineEndHandles(): SVGGraphicsElement[] {
    const [start, end] = this._vertices;

    const startHandle = document.createElementNS("http://www.w3.org/2000/svg", "line");
    startHandle.classList.add("annotation-handle", "scale");
    startHandle.setAttribute("data-handle-name", "start");
    startHandle.setAttribute("x1", start.x + "");
    startHandle.setAttribute("y1", start.y + ""); 
    startHandle.setAttribute("x2", start.x + "");
    startHandle.setAttribute("y2", start.y + 0.1 + ""); 
    startHandle.addEventListener("pointerdown", this.onLineEndHandlePointerDown);
    
    const endHandle = document.createElementNS("http://www.w3.org/2000/svg", "line");
    endHandle.classList.add("annotation-handle", "scale");
    endHandle.setAttribute("data-handle-name", "end");
    endHandle.setAttribute("x1", end.x + "");
    endHandle.setAttribute("y1", end.y + ""); 
    endHandle.setAttribute("x2", end.x + "");
    endHandle.setAttribute("y2", end.y + 0.1 + ""); 
    endHandle.addEventListener("pointerdown", this.onLineEndHandlePointerDown);

    return [startHandle, endHandle];
  } 
  
  protected onLineEndHandlePointerDown = (e: PointerEvent) => { 
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }
    
    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    target.addEventListener("pointerup", this.onLineEndHandlePointerUp);
    target.addEventListener("pointerout", this.onLineEndHandlePointerUp);

    const handleName = target.dataset.handleName;
    switch (handleName) {
      case "start": 
        this._scaleHandleActive = "start";    
        break;
      case "end":
        this._scaleHandleActive = "end";    
        break;
      default:
        // execution should not reach here
        throw new Error(`Invalid handle name: ${handleName}`);
    }

    this._moved = false;

    // set timeout to prevent an accidental annotation scaling
    this._transformationTimer = setTimeout(() => {
      this._transformationTimer = null;       
      // append the svg element copy     
      this._svgTemp.insertAfter(this._renderedControls);
      target.addEventListener("pointermove", this.onLineEndHandlePointerMove);
    }, 200);

    e.stopPropagation();
  };

  protected onLineEndHandlePointerMove = (e: PointerEvent) => {
    if (!e.isPrimary || !this._scaleHandleActive) {
      //it's a secondary touch action or no scale handle is activated
      return;
    }

    // calculate transformation
    // source line ends
    const [start, end] = this._vertices;
    // transformed line ends
    let startTemp: Vec2;
    let endTemp: Vec2;
    if (this._scaleHandleActive === "start") {
      startTemp = this.convertClientCoordsToImage(e.clientX, e.clientY);
      endTemp = end.clone();
    } else {
      startTemp = start.clone();
      endTemp = this.convertClientCoordsToImage(e.clientX, e.clientY);
    }    
    // set the temp transformation matrix
    this._tempTransformationMatrix = Mat3.from4Vec2(start, end, startTemp, endTemp);
    
    // move the svg element copy to visualize the future transformation in real-time
    this._svgTemp.set("none", "blue", this.strokeWidth, [startTemp, endTemp]);

    this._moved = true;
  };
  
  protected onLineEndHandlePointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      // it's a secondary touch action
      return;
    }

    const target = e.target as HTMLElement;
    target.removeEventListener("pointermove", this.onLineEndHandlePointerMove);
    target.removeEventListener("pointerup", this.onLineEndHandlePointerUp);
    target.removeEventListener("pointerout", this.onLineEndHandlePointerUp);
    target.releasePointerCapture(e.pointerId);
    
    this._svgTemp.remove();    
    this.applyTempTransformAsync();
  };
  //#endregion
}
