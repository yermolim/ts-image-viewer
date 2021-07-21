import { Mat3, Vec2 } from "mathador";

import { Double, Quadruple } from "../common/types";
import { EventService } from "../common/event-service";
import { AnnotationBase, AnnotationDto } from "../common/annotation";
import { AppearanceRenderResult, BBox, buildLineEndingPath, JustificationType, justificationTypes, 
  LineEndingType, lineEndingTypes, LINE_END_MIN_SIZE, LINE_END_SIZE_RATIO, 
  SELECTION_STROKE_WIDTH, SvgElementWithBlendMode, TEXT_FONT_RATIO } from "../drawing/utils";
import { SvgTempPath } from "../drawing/paths/svg-temp-path";
import { buildTextDataAsync } from "../common/text-data";

export interface TextAnnotPointsDto {
  /**text box bottom-left corner */
  bl: Double; 
  /**text box top-right corner */
  tr: Double;
  /**text box bottom-right corner */
  br: Double;
  /**text box top-left corner */
  tl: Double;

  /**text box left edge center */
  l: Double;
  /**text box top edge center */
  t: Double; 
  /**text box right edge center */
  r: Double;
  /**text box bottom edge center */
  b: Double;

  /**callout base point*/
  cob?: Double;
  /**callout knee point*/
  cok?: Double;
  /**callout pointer point*/
  cop?: Double;
}

export class TextAnnotPoints {
  /**text box bottom-left corner */
  protected _bl: Vec2; 
  get bl(): Vec2 {
    return this._bl;
  }
  /**text box top-right corner */
  protected _tr: Vec2;
  get tr(): Vec2 {
    return this._tr;
  }
  /**text box bottom-right corner */
  protected _br: Vec2;
  get br(): Vec2 {
    return this._br;
  }
  /**text box top-left corner */
  protected _tl: Vec2;
  get tl(): Vec2 {
    return this._tl;
  }

  /**text box left edge center */
  protected _l: Vec2;
  get l(): Vec2 {
    return this._l;
  }
  /**text box top edge center */
  protected _t: Vec2; 
  get t(): Vec2 {
    return this._t;
  }
  /**text box right edge center */
  protected _r: Vec2;
  get r(): Vec2 {
    return this._r;
  }
  /**text box bottom edge center */
  protected _b: Vec2;
  get b(): Vec2 {
    return this._b;
  }

  /**callout base point*/
  protected _cob?: Vec2;
  get cob(): Vec2 {
    return this._cob;
  }
  /**callout knee point*/
  protected _cok?: Vec2;
  get cok(): Vec2 {
    return this._cok;
  }
  /**callout pointer point*/
  protected _cop?: Vec2;
  get cop(): Vec2 {
    return this._cop;
  }

  constructor(dto: TextAnnotPointsDto) {
    const {bl, tr, br, tl, l, t, r, b, cob, cok, cop} = dto;

    this._bl = new Vec2(bl[0], bl[1]);
    this._tr = new Vec2(tr[0], tr[1]);
    this._br = new Vec2(br[0], br[1]);
    this._tl = new Vec2(tl[0], tl[1]);    
    this._l = new Vec2(l[0], l[1]);
    this._t = new Vec2(t[0], t[1]); 
    this._r = new Vec2(r[0], r[1]);
    this._b = new Vec2(b[0], b[1]);    
    this._cob = cob ? new Vec2(cob[0], cob[1]) : null;
    this._cok = cok ? new Vec2(cok[0], cok[1]) : null;
    this._cop = cop ? new Vec2(cop[0], cop[1]) : null;
  }

  clone(): TextAnnotPoints {
    return new TextAnnotPoints(this.toDto());
  }

  toDto(): TextAnnotPointsDto {
    const dto: TextAnnotPointsDto = {
      bl: <Double><any>this._bl.clone().truncate().toFloatArray(), 
      tr: <Double><any>this._tr.clone().truncate().toFloatArray(),
      br: <Double><any>this._br.clone().truncate().toFloatArray(),
      tl: <Double><any>this._tl.clone().truncate().toFloatArray(),   
      l: <Double><any>this._l.clone().truncate().toFloatArray(),
      t: <Double><any>this._t.clone().truncate().toFloatArray(), 
      r: <Double><any>this._r.clone().truncate().toFloatArray(),
      b: <Double><any>this._b.clone().truncate().toFloatArray(),    
      cob: this.cob ? <Double><any>this._cob.clone().truncate().toFloatArray() : null,
      cok: this.cok ? <Double><any>this._cok.clone().truncate().toFloatArray() : null,
      cop: this.cop ? <Double><any>this._cop.clone().truncate().toFloatArray() : null,
    };
    return dto;
  }

  toVecArray(): Vec2[] {
    return [
      this._bl,
      this._tr,
      this._br,
      this._tl,
      this._l,
      this._t,
      this._r,
      this._b,
      this._cob,
      this._cok,
      this._cop,
    ];
  }

  minMax(): {min: Vec2; max: Vec2} {
    return Vec2.minMax(...this.toVecArray());
  }

  /**
   * apply a transformation matrix to the current object points in place
   * @param matrix 
   * @returns this object
   */
  applyMatrix(matrix: Mat3): TextAnnotPoints {
    this._bl.applyMat3(matrix);
    this._tr.applyMat3(matrix);
    this._br.applyMat3(matrix);
    this._tl.applyMat3(matrix);
    this._l.applyMat3(matrix);
    this._t.applyMat3(matrix);
    this._r.applyMat3(matrix);
    this._b.applyMat3(matrix);
    this._cob?.applyMat3(matrix);
    this._cok?.applyMat3(matrix);
    this._cop?.applyMat3(matrix);
    return this;
  }

  toHorAligned(): {points: TextAnnotPoints; matrixInversed: Mat3} {
    const nonAlignedEdgeStart = this._bl.clone();
    const nonAlignedEdgeEnd = this._br.clone();
    const edgeLength = Vec2.subtract(this._br, this._bl).getMagnitude();
    const horAlignedEdgeStart = new Vec2(0, 0);
    const horAlignedEdgeEnd = new Vec2(edgeLength, 0);
    const matrixToAligned = Mat3.from4Vec2(nonAlignedEdgeStart, nonAlignedEdgeEnd,
      horAlignedEdgeStart, horAlignedEdgeEnd);
    const horAlignedPoints = this.clone().applyMatrix(matrixToAligned);
    return {
      points: horAlignedPoints,
      matrixInversed: matrixToAligned.invert(),
    };
  }

  getBBox(margin?: number): BBox {
    margin ||= 0;

    const {points: horAlignedPoints, matrixInversed} = this.toHorAligned();
    const {min, max} = horAlignedPoints.minMax();
    min.addScalar(-margin);
    max.addScalar(margin);

    const bbox = {
      ll: new Vec2(min.x, min.y).applyMat3(matrixInversed),
      lr: new Vec2(max.x, min.y).applyMat3(matrixInversed),
      ur: new Vec2(max.x, max.y).applyMat3(matrixInversed),
      ul: new Vec2(min.x, max.y).applyMat3(matrixInversed),
    };
    return bbox;
  }

  getAABB(margin?: number,): {min: Vec2; max: Vec2} {
    const bbox = this.getBBox(margin);
    return Vec2.minMax(bbox.ll, bbox.lr, bbox.ur, bbox.ul);
  }
}

export interface TextAnnotationDto extends AnnotationDto {  
  /**annotation key points in image CS */
  points: TextAnnotPointsDto;
  
  strokeColor: Quadruple;
  strokeWidth?: number;
  strokeDashGap?: Double;

  justification?: JustificationType;
  calloutEndingType?: LineEndingType;
}

export class TextAnnotation extends AnnotationBase {  
  protected _points: TextAnnotPoints;

  protected readonly _svgTemp = new SvgTempPath();
  protected _pointsTemp: TextAnnotPoints;

  protected _strokeColor: Quadruple;
  get color(): Quadruple {
    return this.color;
  }

  protected _strokeWidth: number;
  get strokeWidth(): number {
    return this._strokeWidth;
  }

  protected _strokeDashGap: Double;
  get strokeDashGap(): Double {
    return this._strokeDashGap;
  }
  
  protected _justification: JustificationType;
  get justification(): JustificationType {
    return this._justification;
  }

  protected _calloutEndingType: LineEndingType;
  get calloutEndingType(): LineEndingType {
    return this._calloutEndingType;
  }

  /**minimal margin needed to be added for correct annotation content rendering */
  get minMargin(): number {
    const strokeWidth = this._strokeWidth;
    const halfStrokeWidth = strokeWidth / 2;    
    // calculate margin
    let marginMin: number;
    if (this._calloutEndingType && this._calloutEndingType !== lineEndingTypes.NONE) {
      // annotation has a callout with special line ending
      const endingSizeWoStroke = Math.max(strokeWidth * LINE_END_SIZE_RATIO, LINE_END_MIN_SIZE);
      // '+ strokeWidth' is used to include the ending figure stroke width
      const endingSize = endingSizeWoStroke + strokeWidth;
      marginMin = endingSize / 2;      
    } else {
      marginMin = halfStrokeWidth;
    }    

    return marginMin;
  }
  
  constructor(eventService: EventService, dto: TextAnnotationDto) {
    super(eventService, dto);

    if (!dto) {
      throw new Error("No source object passed to the constructor");
    }    
    if (dto.annotationType !== "text") {
      throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'text')`);
    }
    
    this._points = new TextAnnotPoints(dto.points);

    this._strokeColor = dto.strokeColor || [0, 0, 0, 1];
    this._strokeWidth = dto.strokeWidth || 3;
    this._strokeDashGap = dto.strokeDashGap || [3, 0];

    this._justification = dto.justification || justificationTypes.LEFT;
    this._calloutEndingType = dto.calloutEndingType || lineEndingTypes.ARROW_OPEN;
  }
  
  toDto(): TextAnnotationDto {
    return {
      annotationType: this.type,
      uuid: this.uuid,
      imageUuid: this._imageUuid,

      dateCreated: this._dateCreated.toISOString(),
      dateModified: this._dateModified.toISOString(),
      author: this._author,

      rotation: this._rotation,
      textContent: this._textContent,

      points: this._points.toDto(),
      strokeColor: this._strokeColor,
      strokeWidth: this._strokeWidth,
      strokeDashGap: this._strokeDashGap,
      justification: this._justification,
      calloutEndingType: this._calloutEndingType,
    };
  }
  
  override async setTextContentAsync(text: string, undoable = true) {
    this.updateAABB();
    await super.setTextContentAsync(text, undoable);
    await this.updateRenderAsync();
  }

  protected override async applyCommonTransformAsync(matrix: Mat3, undoable = true) {
    this._points.applyMatrix(matrix);

    await super.applyCommonTransformAsync(matrix, undoable);
  } 

  protected updateAABB() {
    const margin = this.minMargin;
    // get annotation box corners
    const bbox = this._points.getBBox(margin);
    const {ll, lr, ur, ul} = bbox;

    // find the minimum and maximum points
    const {min, max} = Vec2.minMax(ll, lr, ur, ul);

    // assign the corresponding fields values
    this._bbox = bbox;
    this._aabb[0].setFromVec2(min);
    this._aabb[1].setFromVec2(max);
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
      
      const strokeDashArrayString = this._strokeDashGap.join(" ");
      const [sr, sg, sb, sa] = this._strokeColor;
      const colorString = `rgba(${sr*255},${sg*255},${sb*255},${sa})`;
      
      const {bl, tr, br, tl, cob, cok, cop} = this._points;
     
      const newPath = (fillColor?: string): SVGPathElement => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", fillColor || "none");
        path.setAttribute("stroke", colorString);
        path.setAttribute("stroke-width", sw + "");
        if (this._strokeDashGap) {
          path.setAttribute("stroke-dasharray", strokeDashArrayString);       
        }     
        path.setAttribute("stroke-linecap", "square");      
        path.setAttribute("stroke-linejoin", "miter"); 
        return path;
      };

      const clonePath = (path: SVGPathElement, stroke = true, fill = false): SVGPathElement => {        
        const clonedPath = path.cloneNode(true) as SVGPathElement;
        const clonedPathStrokeWidth = sw < SELECTION_STROKE_WIDTH
          ? SELECTION_STROKE_WIDTH
          : sw;
        clonedPath.setAttribute("stroke-width", clonedPathStrokeWidth + "");
        clonedPath.setAttribute("stroke", stroke ? "transparent" : "none");
        clonedPath.setAttribute("fill", fill ? "transparent" : "none");
        return clonedPath;
      };

      // draw callout line if needed
      if (cob && cop) {     
        const calloutPath = newPath();
        let calloutD = `M${cob.x},${cob.y}`;
        if (cok) {
          calloutD += ` L${cok.x},${cok.y}`;          
        }
        calloutD += ` L${cop.x},${cop.y}`;
        calloutPath.setAttribute("d", calloutD);
        group.append(calloutPath);
        
        // create a transparent callout line path copy with large stroke width to simplify user interaction  
        const clonedCalloutPath = clonePath(calloutPath, true);
        clonedGroup.append(clonedCalloutPath);

        // draw callout line ending if needed
        if (this._calloutEndingType && this._calloutEndingType !== lineEndingTypes.NONE) {
          const nonAlignedCalloutStart = cok ? cok.clone() : cob.clone();
          const nonAlignedCalloutEnd = cop.clone();
          const calloutLength = Vec2.subtract(nonAlignedCalloutEnd, nonAlignedCalloutStart).getMagnitude();
          const horAlignedCalloutStart = new Vec2(0, 0);
          const horAlignedCalloutEnd = new Vec2(calloutLength, 0);
          const matrixFromAlignedCallout = Mat3.from4Vec2(nonAlignedCalloutStart, nonAlignedCalloutEnd,
            horAlignedCalloutStart, horAlignedCalloutEnd).invert();          

          const endingPathString = buildLineEndingPath(horAlignedCalloutEnd, 
            this._calloutEndingType, sw, "right");
          
          const calloutEndingPath = newPath();
          calloutEndingPath.setAttribute("d", endingPathString);
          calloutEndingPath.setAttribute("transform", 
            `matrix(${matrixFromAlignedCallout.truncate(5).toFloatShortArray().join(" ")})`);
          group.append(calloutEndingPath);

          // create a transparent callout line ending path copy with large stroke width to simplify user interaction  
          const clonedCalloutEndingPath = clonePath(calloutEndingPath, true);
          clonedGroup.append(clonedCalloutEndingPath);
        }
      }

      // draw main annotation rect
      const rectPath = newPath("white");
      const rectD = `M${bl.x},${bl.y}`
        + ` L${br.x},${br.y}`
        + ` L${tr.x},${tr.y}`
        + ` L${tl.x},${tl.y} Z`;  
      rectPath.setAttribute("d", rectD);
      group.append(rectPath);

      // create a transparent rect path copy with large stroke width to simplify user interaction  
      const clonedRectPath = clonePath(rectPath, true, true);
      clonedGroup.append(clonedRectPath);

      // draw text
      if (this._textContent) {
        const {points: alignedPoints, matrixInversed} = this._points.toHorAligned();
        const matrixString = `matrix(${matrixInversed.truncate(5).toFloatShortArray().join(",")})`;

        const fontSize = TEXT_FONT_RATIO * sw;
        const sidePadding = Math.max(sw * LINE_END_SIZE_RATIO, 
          LINE_END_MIN_SIZE);
        const textRectWidth = Vec2.subtract(alignedPoints.br, alignedPoints.bl).getMagnitude();
        const maxTextWidth = textRectWidth - 2 * sidePadding;
        const textPivot = new Vec2(alignedPoints.bl.x + sidePadding, alignedPoints.bl.y + sidePadding);
        if (maxTextWidth > 0) {
          const textData = await buildTextDataAsync(this._textContent, {
            maxWidth: maxTextWidth,
            fontSize: fontSize,
            strokeWidth: sw,
            textAlign: this._justification,
            pivotPoint: "top-left",
          });
          for (const line of textData.lines) {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", textPivot.x + 
              ((line.relativeRect[0] + line.relativeRect[2]) / 2) + "");
            text.setAttribute("y", textPivot.y + 
              ((line.relativeRect[1] + line.relativeRect[3]) / 2) + "");
            text.setAttribute("fill", "black");
            text.setAttribute("dominant-baseline", "central");
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("transform", matrixString);
            text.style.fontSize = fontSize + "px";
            text.style.fontFamily = "sans-serif";
            text.textContent = line.text;   
            group.append(text);
          }
        }
      }


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
  
  //#region overriding handles
  protected override renderHandles(): SVGGraphicsElement[] {
    const points = this._points;

    return [
      ...this.renderTextBoxCornerHandles(points), 
      ...this.renderCalloutHandles(points), 
      this.renderRotationHandle()
    ];
  } 
  
  //#region text box handles
  protected renderTextBoxCornerHandles(points: TextAnnotPoints): SVGGraphicsElement[] {
    // text box corners in image CS
    const {bl: pBL, br: pBR, tr: pTR, tl: pTL} = points;

    const cornerMap = new Map<string, Vec2>();
    cornerMap.set("tb-bl", pBL);
    cornerMap.set("tb-br", pBR);
    cornerMap.set("tb-tr", pTR);
    cornerMap.set("tb-tl", pTL);

    const handles: SVGGraphicsElement[] = [];
    ["tb-bl", "tb-br", "tb-tr", "tb-tl"].forEach(x => {
      const {x: cx, y: cy} = cornerMap.get(x);
      const handle = document.createElementNS("http://www.w3.org/2000/svg", "line");
      handle.classList.add("annotation-handle", "scale");
      handle.setAttribute("data-handle-name", x);
      handle.setAttribute("x1", cx + "");
      handle.setAttribute("y1", cy + ""); 
      handle.setAttribute("x2", cx + "");
      handle.setAttribute("y2", cy + 0.1 + ""); 
      handle.addEventListener("pointerdown", this.onTextBoxCornerHandlePointerDown);
      handles.push(handle);   
    });

    return handles;
  }   
  
  protected onTextBoxCornerHandlePointerDown = (e: PointerEvent) => { 
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }

    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    target.addEventListener("pointerup", this.onTextBoxCornerHandlePointerUp);
    target.addEventListener("pointerout", this.onTextBoxCornerHandlePointerUp); 

    this._pointsTemp = this._points.clone();
    this._moved = false;

    // set timeout to prevent an accidental annotation scaling
    this._transformationTimer = setTimeout(() => {
      this._transformationTimer = null;       
      // append the svg element copy     
      this._svgTemp.insertAfter(this._renderedControls);
      target.addEventListener("pointermove", this.onTextBoxCornerHandlePointerMove);
    }, 200);

    e.stopPropagation();
  };

  protected onTextBoxCornerHandlePointerMove = (e: PointerEvent) => {
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }

    const target = e.target as HTMLElement;
    const handleName = target.dataset.handleName;

    const points = this._pointsTemp;
    const p = this.convertClientCoordsToImage(e.clientX, e.clientY);

    // get length of the text box sides
    const horLength = Vec2.subtract(points.br, points.bl).getMagnitude();
    const vertLength = Vec2.subtract(points.tl, points.bl).getMagnitude();
    // calculate the transformation matrix 
    // from the current text box position to the AA CS (with bottom-left corner at 0,0)
    const matToAligned = Mat3.from4Vec2(points.bl, points.br, new Vec2(), new Vec2(horLength, 0));

    // get the opposite point (relatively to the moved one)
    let oppositeP: Vec2;
    switch (handleName) {
      case "tb-bl": 
        oppositeP = points.tr;
        break;
      case "tb-br":
        oppositeP = points.tl;
        break;
      case "tb-tr":
        oppositeP = points.bl;
        break;
      case "tb-tl":
        oppositeP = points.br;
        break;
      default:
        return;
    }  

    // calculate the current point and the opposite point
    // coordinates in the AA CS
    const pAligned = Vec2.applyMat3(p, matToAligned);
    const oppositePAligned = Vec2.applyMat3(oppositeP, matToAligned);
    // calculate length of the text box sides after moving the point
    const transformedHorLength = Math.abs(pAligned.x - oppositePAligned.x);
    const transformedVertLength = Math.abs(pAligned.y - oppositePAligned.y);
    // calculate the transformation scale ratio for X and Y axes
    const scaleX = transformedHorLength / horLength;
    const scaleY = transformedVertLength / vertLength;
    // get the current rotation
    const {r: rotation} = matToAligned.getTRS();
    // calculate the final transformation matrix
    const mat = new Mat3()
      .applyTranslation(-oppositeP.x, -oppositeP.y)
      .applyRotation(rotation)
      .applyScaling(scaleX, scaleY)
      .applyRotation(-rotation)
      .applyTranslation(oppositeP.x, oppositeP.y);
    // apply the matrix to all points that need to be transformed
    points.bl.applyMat3(mat);
    points.br.applyMat3(mat);
    points.tr.applyMat3(mat);
    points.tl.applyMat3(mat); 
    points.l.applyMat3(mat);
    points.t.applyMat3(mat);
    points.r.applyMat3(mat);
    points.b.applyMat3(mat);
    points.cob?.applyMat3(mat);

    // update temp svg element to visualize the future transformation in real-time
    this._svgTemp.set("lightblue", "blue", this.strokeWidth, 
      [points.bl, points.br, points.tr, points.tl], true);

    this._moved = true;
  };
  
  protected onTextBoxCornerHandlePointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      // it's a secondary touch action
      return;
    }

    const target = e.target as HTMLElement;
    target.removeEventListener("pointermove", this.onTextBoxCornerHandlePointerMove);
    target.removeEventListener("pointerup", this.onTextBoxCornerHandlePointerUp);
    target.removeEventListener("pointerout", this.onTextBoxCornerHandlePointerUp);
    target.releasePointerCapture(e.pointerId); 

    this._svgTemp.remove();
    
    if (this._moved) {
      // transform the annotation
      this._points = this._pointsTemp;
      this._pointsTemp = null;
      this.updateAABB();
      this.updateRenderAsync();
    }
  };
  //#endregion
  
  //#region callout handles
  protected renderCalloutHandles(points: TextAnnotPoints): SVGGraphicsElement[] {
    const handles: SVGGraphicsElement[] = [];

    if (!points.cop) {
      return handles;
    }

    ["l", "t", "r", "b"].forEach(x => {    
      const side = points[x];  
      const sideHandle = document.createElementNS("http://www.w3.org/2000/svg", "line");
      sideHandle.classList.add("annotation-handle", "helper");
      sideHandle.setAttribute("data-handle-name", `co-pivot-${x}`);
      sideHandle.setAttribute("x1", side.x + "");
      sideHandle.setAttribute("y1", side.y + ""); 
      sideHandle.setAttribute("x2", side.x + "");
      sideHandle.setAttribute("y2", side.y + 0.1 + ""); 
      sideHandle.addEventListener("pointerdown", this.onSideHandlePointerUp);
      handles.push(sideHandle); 
    });

    if (points.cok) {
      const pCoKnee = points.cok;
      const kneeHandle = document.createElementNS("http://www.w3.org/2000/svg", "line");
      kneeHandle.classList.add("annotation-handle", "translation");
      kneeHandle.setAttribute("data-handle-name", "co-knee");
      kneeHandle.setAttribute("x1", pCoKnee.x + "");
      kneeHandle.setAttribute("y1", pCoKnee.y + ""); 
      kneeHandle.setAttribute("x2", pCoKnee.x + "");
      kneeHandle.setAttribute("y2", pCoKnee.y + 0.1 + ""); 
      kneeHandle.addEventListener("pointerdown", this.onCalloutHandlePointerDown);
      handles.push(kneeHandle);   
    }

    const pCoPointer = points.cop;
    const pointerHandle = document.createElementNS("http://www.w3.org/2000/svg", "line");
    pointerHandle.classList.add("annotation-handle", "translation");
    pointerHandle.setAttribute("data-handle-name", "co-pointer");
    pointerHandle.setAttribute("x1", pCoPointer.x + "");
    pointerHandle.setAttribute("y1", pCoPointer.y + ""); 
    pointerHandle.setAttribute("x2", pCoPointer.x + "");
    pointerHandle.setAttribute("y2", pCoPointer.y + 0.1 + ""); 
    pointerHandle.addEventListener("pointerdown", this.onCalloutHandlePointerDown);
    handles.push(pointerHandle);

    return handles;
  } 
  
  protected onSideHandlePointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      // it's a secondary touch action
      return;
    }

    e.stopPropagation();

    const target = e.target as HTMLElement;
    const handleName = target.dataset.handleName;

    const points = this._points;
    switch (handleName) {
      case "co-pivot-l":
        if (Vec2.equals(points.cob, points.l)) {
          return;
        }
        points.cob.setFromVec2(points.l);
        break;
      case "co-pivot-t":
        if (Vec2.equals(points.cob, points.t)) {
          return;
        }
        points.cob.setFromVec2(points.t);
        break;
      case "co-pivot-r":
        if (Vec2.equals(points.cob, points.r)) {
          return;
        }
        points.cob.setFromVec2(points.r);
        break;
      case "co-pivot-b":
        if (Vec2.equals(points.cob, points.b)) {
          return;
        }
        points.cob.setFromVec2(points.b);
        break;
      default:
        return;
    }
    
    // transform the annotation
    this.updateAABB();
    this.updateRenderAsync();
  };
  
  protected onCalloutHandlePointerDown = (e: PointerEvent) => { 
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }

    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    target.addEventListener("pointerup", this.onCalloutHandlePointerUp);
    target.addEventListener("pointerout", this.onCalloutHandlePointerUp); 

    this._pointsTemp = this._points.clone();
    this._moved = false;

    // set timeout to prevent an accidental annotation scaling
    this._transformationTimer = setTimeout(() => {
      this._transformationTimer = null;       
      // append the svg element copy     
      this._svgTemp.insertAfter(this._renderedControls);
      target.addEventListener("pointermove", this.onCalloutHandlePointerMove);
    }, 200);

    e.stopPropagation();
  };

  protected onCalloutHandlePointerMove = (e: PointerEvent) => {
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }

    const target = e.target as HTMLElement;
    const handleName = target.dataset.handleName;

    switch (handleName) {
      case "co-knee":
        this._pointsTemp.cok.setFromVec2(this.convertClientCoordsToImage(e.clientX, e.clientY));
        break;
      case "co-pointer":
        this._pointsTemp.cop.setFromVec2(this.convertClientCoordsToImage(e.clientX, e.clientY));
        break;
      default:
        return;
    }

    this._svgTemp.set("none", "blue", 
      this.strokeWidth, 
      this._pointsTemp.cok 
        ? [this._pointsTemp.cob, this._pointsTemp.cok, this._pointsTemp.cop]
        : [this._pointsTemp.cob, this._pointsTemp.cop]);
    
    this._moved = true;
  };
  
  protected onCalloutHandlePointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      // it's a secondary touch action
      return;
    }

    const target = e.target as HTMLElement;
    target.removeEventListener("pointermove", this.onCalloutHandlePointerMove);
    target.removeEventListener("pointerup", this.onCalloutHandlePointerUp);
    target.removeEventListener("pointerout", this.onCalloutHandlePointerUp);
    target.releasePointerCapture(e.pointerId); 

    this._svgTemp.remove();
    
    if (this._moved) {
      // transform the annotation
      this._points = this._pointsTemp;
      this._pointsTemp = null;
      this.updateAABB();
      this.updateRenderAsync();
    }
  };
  //#endregion 
  
  //#endregion
}
