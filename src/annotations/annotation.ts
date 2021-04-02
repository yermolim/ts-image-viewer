import { Mat3, Vec2, vecMinMax } from "../math";
import { BBox, getRandomUuid, Octuple, Double, Quadruple, RenderToSvgResult, Hextuple } from "../common";

export abstract class Annotation {
  translationEnabled: boolean;
  
  readonly type: string;
  readonly uuid: string;
  protected _imageUuid: string;
  get imageUuid(): string {
    return this._imageUuid;
  }
  set imageUuid(value: string) {
    if (value !== this._imageUuid) {
      this._imageUuid = value;
    }
  }

  protected _deleted: boolean;
  get deleted(): boolean {
    return this._deleted;
  }
  set deleted(value: boolean) {
    this._deleted = value;
  }
  
  protected _dateCreated: Date;
  get dateCreated(): Date {
    return new Date(this._dateCreated);
  }
  protected _dateModified: Date;
  get dateModified(): Date {
    return new Date(this._dateModified);
  }
  protected _author: string;
  get author(): string {
    return this._author;
  }

  //#region edit-related properties
  protected readonly _imageDimensions: Vec2 = new Vec2();
  get imageDimensions(): Vec2 {
    return this._imageDimensions;
  }
  set imageDimensions(value: Vec2) {
    if (value) {
      this._imageDimensions.setFromVec2(value);
    } else {
      this.imageDimensions.set(0, 0);
    }
    this.updateRender();
  }

  protected _aabb: Quadruple;
  protected _bb: Octuple;
  protected _matrix: Mat3;

  protected _transformationTimer: number; 
  protected _transformationMatrix = new Mat3(); 
  protected _transformationPoint = new Vec2();

  protected _currentAngle = 0; 
  protected _boxX = new Vec2();
  protected _boxY = new Vec2();
  protected _boxXLength: number;
  protected _boxYLength: number;
  //#endregion

  //#region render-related properties
  protected readonly _svgId = getRandomUuid();
  protected _svg: SVGGraphicsElement;
  protected _svgBox: SVGGraphicsElement;
  protected _svgContentCopy: SVGGraphicsElement;
  protected _svgContentCopyUse: SVGUseElement;
  protected _svgContent: SVGGraphicsElement;
  protected _svgClipPaths: SVGClipPathElement[];
  protected _lastRenderResult: RenderToSvgResult;
  get lastRenderResult(): RenderToSvgResult {
    return this._lastRenderResult;
  }
  //#endregion
  
  protected constructor(dto?: AnnotationDto) {
    this.type = dto?.annotationType || "none";
    this.uuid = dto?.uuid || getRandomUuid();
    this._imageUuid = dto?.imageUuid;
    this._dateCreated = dto?.dateCreated 
      ? new Date(dto.dateCreated) 
      : new Date();
    this._dateModified = dto?.dateModified
      ? new Date(dto.dateModified) 
      : new Date();
    this._author = dto?.author || "unknown";
    this._aabb = dto?.rect || [0, 0, 0, 0];
    if (dto?.bbox) {
      const [a, b, d, e, g, h] = dto.matrix;
      this._matrix = new Mat3().set(a, b, 0, d, e, 0, g, h, 1);
    } else {

    }
    if (dto?.matrix) {
      const [a, b, d, e, g, h] = dto.matrix;
      this._matrix = new Mat3().set(a, b, 0, d, e, 0, g, h, 1);
    } else {
      this._matrix = new Mat3();
    }
  }
  
  render(): RenderToSvgResult {
    if (!this._svg) {
      this._svg = this.renderMainElement();
    }

    this.updateRender(); 

    const renderResult: RenderToSvgResult = {
      svg: this._svg,
      clipPaths: this._svgClipPaths,      
      tempCopy: this._svgContentCopy,
      tempCopyUse: this._svgContentCopyUse,
    };
    this._lastRenderResult = renderResult;
    return renderResult;
  } 

  moveTo(imageX: number, imageY: number) {
    const width = this._bb[2] - this._bb[0];
    const height = this._bb[3] - this._bb[1];
    const x = imageX - width / 2;
    const y = imageY - height / 2;
    const mat = Mat3.buildTranslate(x, y);
    this.applyCommonTransform(mat);
  }

  toDto(): AnnotationDto {
    return {
      annotationType: this.type,
      uuid: this.uuid,
      imageUuid: this.imageUuid,

      dateCreated: this.dateCreated.toISOString(),
      dateModified: this.dateModified.toISOString(),
      author: this.author,

      rect: this._aabb,
      bbox: this._bb,
      matrix: <Hextuple><unknown>this._matrix.toFloatShortArray(),
      html: this._svgContent?.innerHTML,
    };
  }
  
  //#region protected render methods

  //#region common methods used for rendering purposes
  protected getCurrentRotation(): number {
    // TODO: try to implement getting rotation without using AP (if possible)
    const matrix = this._matrix;
    if (!matrix) {
      return 0;
    }
    const {r} = matrix.getTRS();
    return r;
  }

  protected getLocalBB(): BBox {    
    let bBoxLL: Vec2;
    let bBoxLR: Vec2;
    let bBoxUR: Vec2;
    let bBoxUL: Vec2;
    
    if (this._bb) {
      // use the saved bounding box if present
      bBoxLL = new Vec2(this._bb[0], this._bb[1]);
      bBoxLR = new Vec2(this._bb[2], this._bb[3]);
      bBoxUR = new Vec2(this._bb[4], this._bb[5]);
      bBoxUL = new Vec2(this._bb[6], this._bb[7]);
    } else {  
      // else use the aabb property data
      bBoxLL = new Vec2(this._aabb[0], this._aabb[1]);
      bBoxLR = new Vec2(this._aabb[2], this._aabb[1]);
      bBoxUR = new Vec2(this._aabb[2], this._aabb[3]);
      bBoxUL = new Vec2(this._aabb[0], this._aabb[3]);
    } 
    
    this._bb = [bBoxLL.x, bBoxLL.y, bBoxLR.x, bBoxLR.y, bBoxUR.x, bBoxUR.y, bBoxUL.x, bBoxUL.y];

    return {
      ll: bBoxLL,
      lr: bBoxLR,
      ur: bBoxUR,
      ul: bBoxUL,
    }; 
  }  

  protected applyRectTransform(matrix: Mat3) {
    // transform current bounding box (not axis-aligned)
    const bBox = this.getLocalBB();
    bBox.ll.applyMat3(matrix);
    bBox.lr.applyMat3(matrix);
    bBox.ur.applyMat3(matrix);
    bBox.ul.applyMat3(matrix);

    // get an axis-aligned bounding box and assign it to the Rect property
    const {min: newRectMin, max: newRectMax} = 
      vecMinMax(bBox.ll, bBox.lr, bBox.ur, bBox.ul);
    this._aabb = [newRectMin.x, newRectMin.y, newRectMax.x, newRectMax.y];
  } 
  
  protected applyCommonTransform(matrix: Mat3) {
    this.applyRectTransform(matrix);
    this._dateModified = new Date();
  }

  /**
   * get 2D vector with a position of the specified point in image coords 
   * @param clientX 
   * @param clientY 
   */
  protected convertClientCoordsToImage(clientX: number, clientY: number): Vec2 {
    // html coords (0,0 is top-left corner)
    const {x, y, width, height} = this._svgBox.getBoundingClientRect();
    const rectMinScaled = new Vec2(x, y);
    const rectMaxScaled = new Vec2(x + width, y + height);
    const imageScale = (rectMaxScaled.x - rectMinScaled.x) / (this._aabb[2] - this._aabb[0]);
    // the lower-left corner of the image. keep in mind that PDF Rect uses inversed coords
    const imageLowerLeft = new Vec2(x - this._aabb[0] * imageScale, y + height + (this._aabb[1] * imageScale));
    // invert Y coord
    const position = new Vec2(
      (clientX - imageLowerLeft.x) / imageScale,
      (imageLowerLeft.y - clientY) / imageScale,
    );

    return position;
  }
  
  protected convertImageCoordsToClient(imageX: number, imageY: number): Vec2 {
    // html coords (0,0 is top-left corner)
    const {x, y, width, height} = this._svgBox.getBoundingClientRect();
    const rectMinScaled = new Vec2(x, y);
    const rectMaxScaled = new Vec2(x + width, y + height);
    const imageScale = (rectMaxScaled.x - rectMinScaled.x) / (this._aabb[2] - this._aabb[0]);
    // the lower-left corner of the image. keep in mind that PDF Rect uses inversed coords
    const imageLowerLeft = new Vec2(x - this._aabb[0] * imageScale, y + height + (this._aabb[1] * imageScale));
    // invert Y coord
    const position = new Vec2(
      imageLowerLeft.x + (imageX * imageScale),
      imageLowerLeft.y - (imageY * imageScale),
    );

    return position;
  }
  //#endregion

  //#region annotation container render
  protected renderRect(): SVGGraphicsElement {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.classList.add("svg-annot-rect");
    rect.setAttribute("data-annotation-name", this.uuid);
    rect.setAttribute("x", this._aabb[0] + "");
    rect.setAttribute("y", this._aabb[1] + "");
    rect.setAttribute("width", this._aabb[2] - this._aabb[0] + "");
    rect.setAttribute("height", this._aabb[3] - this._aabb[1] + "");

    return rect;
  }
  
  protected renderBox(): SVGGraphicsElement {
    const {ll, lr, ur, ul} = this.getLocalBB();
    const boxPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    boxPath.classList.add("svg-annot-box");
    boxPath.setAttribute("data-annotation-name", this.uuid);
    boxPath.setAttribute("d", `M ${ll.x} ${ll.y} L ${lr.x} ${lr.y} L ${ur.x} ${ur.y} L ${ul.x} ${ul.y} Z`);

    return boxPath;
  }

  protected renderMainElement(): SVGGraphicsElement {    
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "g");
    rect.classList.add("svg-annotation");
    rect.setAttribute("data-annotation-name", this.uuid);    
    rect.addEventListener("pointerdown", this.onRectPointerDown);

    return rect;
  }
  //#endregion

  //#region annotation content render

  /**
   * override in subclass to apply a custom annotation content renderer
   */
  protected renderContent(): RenderToSvgResult {
    return null;
  }   

  protected renderContentCopy(): {copy: SVGGraphicsElement; use: SVGUseElement} {
    const copy = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    const copyDefs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const copySymbol = document.createElementNS("http://www.w3.org/2000/svg", "symbol");
    copySymbol.id = this._svgId + "_symbol";
    const copySymbolUse = document.createElementNS("http://www.w3.org/2000/svg", "use");
    copySymbolUse.setAttribute("href", `#${this._svgId}`);
    copySymbolUse.setAttribute("viewBox", 
      `0 0 ${this._imageDimensions.x} ${this._imageDimensions.y}`);
    copySymbol.append(copySymbolUse);
    copyDefs.append(copySymbol);

    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#${this._svgId}_symbol`);
    use.setAttribute("opacity", "0.2");
    
    copy.append(copyDefs, use);

    return {copy, use};
  }
  //#endregion

  //#region render of the annotation control handles 
  protected renderScaleHandles(): SVGGraphicsElement[] { 
    const bBox = this.getLocalBB();

    const handles: SVGGraphicsElement[] = [];
    ["ll", "lr", "ur", "ul"].forEach(x => {
      const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      handle.classList.add("svg-annot-handle-scale");
      handle.setAttribute("data-handle-name", x);
      handle.setAttribute("cx", bBox[x].x + "");
      handle.setAttribute("cy", bBox[x].y + ""); 
      handle.addEventListener("pointerdown", this.onScaleHandlePointerDown); 
      handles.push(handle);   
    });

    return handles;
  } 
  
  protected renderRotationHandle(): SVGGraphicsElement { 
    const centerX = (this._aabb[0] + this._aabb[2]) / 2;
    const centerY = (this._aabb[1] + this._aabb[3]) / 2;
    const currentRotation = this.getCurrentRotation();

    const rotationGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    rotationGroup.classList.add("svg-annot-rotation");
    rotationGroup.setAttribute("data-handle-name", "center");  
     
    const rotationGroupCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    rotationGroupCircle.classList.add("circle", "dashed");
    rotationGroupCircle.setAttribute("cx", centerX + "");
    rotationGroupCircle.setAttribute("cy", centerY + "");

    const handleMatrix = new Mat3()
      .applyTranslation(-centerX, -centerY + 35)
      .applyRotation(currentRotation)
      .applyTranslation(centerX, centerY);
    const handleCenter = new Vec2(centerX, centerY).applyMat3(handleMatrix);
    
    const rotationGroupLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    rotationGroupLine.classList.add("dashed");
    rotationGroupLine.setAttribute("x1", centerX + "");
    rotationGroupLine.setAttribute("y1", centerY + "");
    rotationGroupLine.setAttribute("x2", handleCenter.x + "");
    rotationGroupLine.setAttribute("y2", handleCenter.y + "");
    
    const centerRectHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    centerRectHandle.classList.add("svg-annot-handle-rotation");
    centerRectHandle.setAttribute("data-handle-name", "center");
    centerRectHandle.setAttribute("cx", handleCenter.x + "");
    centerRectHandle.setAttribute("cy", handleCenter.y + "");
    centerRectHandle.addEventListener("pointerdown", this.onRotationHandlePointerDown);

    rotationGroup.append(rotationGroupCircle, rotationGroupLine, centerRectHandle);
    return rotationGroup;
  } 

  /**
   * override in subclass to apply a custom annotation handles renderer
   */
  protected renderHandles(): SVGGraphicsElement[] {   
    return [...this.renderScaleHandles(), this.renderRotationHandle()];
  } 
  //#endregion

  protected updateRender() {
    this._svg.innerHTML = "";

    const contentResult = this.renderContent();
    if (!contentResult) { 
      this._svgBox = null;
      this._svgContent = null;
      this._svgContentCopy = null;
      this._svgContentCopyUse = null;
      this._svgClipPaths = null;
      return;
    }  
    const content = contentResult.svg;
    content.id = this._svgId;
    content.classList.add("svg-annotation-content");
    content.setAttribute("data-annotation-name", this.uuid); 
    const {copy, use} = this.renderContentCopy(); 
    
    const rect = this.renderRect();
    const box = this.renderBox();
    const handles = this.renderHandles(); 

    this._svg.append(rect, box, contentResult.svg, ...handles);  

    this._svgBox = box;
    this._svgContent = content;
    this._svgContentCopy = copy;
    this._svgContentCopyUse = use; 
    this._svgClipPaths = contentResult.clipPaths;
  }
  //#endregion

  //#region event handlers 

  //#region translation handlers
  protected onRectPointerDown = (e: PointerEvent) => { 
    if (!this.translationEnabled || !e.isPrimary) {
      return;
    }

    document.addEventListener("pointerup", this.onRectPointerUp);
    document.addEventListener("pointerout", this.onRectPointerUp);  

    // set timeout to prevent an accidental annotation translation
    this._transformationTimer = setTimeout(() => {
      this._transformationTimer = null;      
      this._svg.after(this._svgContentCopy);
      this._transformationPoint.setFromVec2(this.convertClientCoordsToImage(e.clientX, e.clientY));
      document.addEventListener("pointermove", this.onRectPointerMove);
    }, 200);
  };

  protected onRectPointerMove = (e: PointerEvent) => {
    if (!e.isPrimary) {
      return;
    }

    const current = this.convertClientCoordsToImage(e.clientX, e.clientY);
    this._transformationMatrix.reset()
      .applyTranslation(current.x - this._transformationPoint.x, 
        current.y - this._transformationPoint.y);
    this._svgContentCopyUse.setAttribute("transform", 
      `matrix(${this._transformationMatrix.toFloatShortArray().join(" ")})`);
  };
  
  protected onRectPointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      return;
    }

    document.removeEventListener("pointermove", this.onRectPointerMove);
    document.removeEventListener("pointerup", this.onRectPointerUp);
    document.removeEventListener("pointerout", this.onRectPointerUp);

    if (this._transformationTimer) {
      clearTimeout(this._transformationTimer);
      this._transformationTimer = null;
      return;
    }
    
    this._svgContentCopy.remove();
    this._svgContentCopyUse.setAttribute("transform", "matrix(1 0 0 1 0 0)");

    this.applyCommonTransform(this._transformationMatrix);
    this._transformationMatrix.reset();

    this.updateRender();
  };
  //#endregion
  
  //#region rotation handlers
  protected onRotationHandlePointerDown = (e: PointerEvent) => {    
    if (!e.isPrimary) {
      return;
    }

    document.addEventListener("pointerup", this.onRotationHandlePointerUp);
    document.addEventListener("pointerout", this.onRotationHandlePointerUp);    

    // set timeout to prevent an accidental annotation rotation
    this._transformationTimer = setTimeout(() => {
      this._transformationTimer = null;      
      this._svg.after(this._svgContentCopy);
      document.addEventListener("pointermove", this.onRotationHandlePointerMove);
    }, 200);

    e.stopPropagation();
  };

  protected onRotationHandlePointerMove = (e: PointerEvent) => {
    if (!e.isPrimary) {
      return;
    }

    const centerX = (this._aabb[0] + this._aabb[2]) / 2;
    const centerY = (this._aabb[1] + this._aabb[3]) / 2;
    const clientCenter = this.convertImageCoordsToClient(centerX, centerY);
    const currentRotation = this.getCurrentRotation();
    const angle = Math.atan2(
      e.clientY - clientCenter.y, 
      e.clientX - clientCenter.x
    ) + Math.PI / 2 - currentRotation;
    this._currentAngle = angle;
    this._transformationMatrix.reset()
      .applyTranslation(-centerX, -centerY)
      .applyRotation(angle)
      .applyTranslation(centerX, centerY);
    this._svgContentCopyUse.setAttribute("transform", 
      `matrix(${this._transformationMatrix.toFloatShortArray().join(" ")})`);
  };
  
  protected onRotationHandlePointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      return;
    }

    document.removeEventListener("pointermove", this.onRotationHandlePointerMove);
    document.removeEventListener("pointerup", this.onRotationHandlePointerUp);
    document.removeEventListener("pointerout", this.onRotationHandlePointerUp);

    if (this._transformationTimer) {
      clearTimeout(this._transformationTimer);
      this._transformationTimer = null;
      return;
    }
    
    this._svgContentCopy.remove();
    this._svgContentCopyUse.setAttribute("transform", "matrix(1 0 0 1 0 0)");

    this.applyCommonTransform(this._transformationMatrix);
    this._transformationMatrix.reset();

    this.updateRender();
  };
  //#endregion
  
  //#region scale handlers
  protected onScaleHandlePointerDown = (e: PointerEvent) => { 
    if (!e.isPrimary) {
      return;
    }

    document.addEventListener("pointerup", this.onScaleHandlePointerUp);
    document.addEventListener("pointerout", this.onScaleHandlePointerUp); 

    const target = e.target as HTMLElement;

    const {ll, lr, ur, ul} = this.getLocalBB();
    const handleName = target.dataset["handleName"];
    switch (handleName) {
      case "ll": 
        this._transformationPoint.setFromVec2(ur);
        this._boxX.setFromVec2(ul).substract(ur);
        this._boxY.setFromVec2(lr).substract(ur);      
        break;
      case "lr":
        this._transformationPoint.setFromVec2(ul);
        this._boxX.setFromVec2(ur).substract(ul);
        this._boxY.setFromVec2(ll).substract(ul); 
        break;
      case "ur":
        this._transformationPoint.setFromVec2(ll); 
        this._boxX.setFromVec2(lr).substract(ll);
        this._boxY.setFromVec2(ul).substract(ll);
        break;
      case "ul":
        this._transformationPoint.setFromVec2(lr); 
        this._boxX.setFromVec2(ll).substract(lr);
        this._boxY.setFromVec2(ur).substract(lr);
        break;
      default:
        // execution should not reach here
        throw new Error(`Invalid handle name: ${handleName}`);
    }
    this._boxXLength = this._boxX.getMagnitude();
    this._boxYLength = this._boxY.getMagnitude();

    // set timeout to prevent an accidental annotation rotation
    this._transformationTimer = setTimeout(() => {
      this._transformationTimer = null;      
      this._svg.after(this._svgContentCopy);
      document.addEventListener("pointermove", this.onScaleHandlePointerMove);
    }, 200);

    e.stopPropagation();
  };

  protected onScaleHandlePointerMove = (e: PointerEvent) => {
    if (!e.isPrimary) {
      return;
    }

    const current = this.convertClientCoordsToImage(e.clientX, e.clientY)
      .substract(this._transformationPoint);
    const currentLength = current.getMagnitude();

    const cos = Math.abs(current.dotProduct(this._boxX)) / currentLength / this._boxXLength;
    const pXLength = cos * currentLength;
    const pYLength = Math.sqrt(currentLength * currentLength - pXLength * pXLength);    

    const scaleX = pXLength / this._boxXLength;
    const scaleY = pYLength / this._boxYLength;
    
    const centerX = (this._aabb[0] + this._aabb[2]) / 2;
    const centerY = (this._aabb[1] + this._aabb[3]) / 2;
    const currentRotation = this.getCurrentRotation();

    this._transformationMatrix.reset()
      .applyTranslation(-centerX, -centerY)
      .applyRotation(-currentRotation)
      .applyScaling(scaleX, scaleY)
      .applyRotation(currentRotation)
      .applyTranslation(centerX, centerY);
    const translation = this._transformationPoint.clone().substract(
      this._transformationPoint.clone().applyMat3(this._transformationMatrix));
    this._transformationMatrix.applyTranslation(translation.x, translation.y);
    
    this._svgContentCopyUse.setAttribute("transform", 
      `matrix(${this._transformationMatrix.toFloatShortArray().join(" ")})`);
  };
  
  protected onScaleHandlePointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      return;
    }

    document.removeEventListener("pointermove", this.onScaleHandlePointerMove);
    document.removeEventListener("pointerup", this.onScaleHandlePointerUp);
    document.removeEventListener("pointerout", this.onScaleHandlePointerUp);

    if (this._transformationTimer) {
      clearTimeout(this._transformationTimer);
      this._transformationTimer = null;
      return;
    }
    
    this._svgContentCopy.remove();
    this._svgContentCopyUse.setAttribute("transform", "matrix(1 0 0 1 0 0)");

    this.applyCommonTransform(this._transformationMatrix);
    this._transformationMatrix.reset();

    this.updateRender();
  };
  //#endregion

  //#endregion
}

export interface AnnotationDto {
  annotationType: string;
  uuid: string;
  imageUuid: string;

  dateCreated: string;
  dateModified: string;
  author: string;

  rect: Quadruple;
  bbox: Octuple;
  matrix: Hextuple;
  html: string;
}

//#region custom events
export const annotSelectionRequestEvent = "tsimage-annotselectionrequest" as const;

export interface AnnotSelectionRequestEventDetail {
  annotation: Annotation;
}

export class AnnotSelectionRequestEvent extends CustomEvent<AnnotSelectionRequestEventDetail> {
  constructor(detail: AnnotSelectionRequestEventDetail) {
    super(annotSelectionRequestEvent, {detail});
  }
}

export const annotChangeEvent = "tsimage-annotchange" as const;

export interface AnnotEventDetail {
  type: "select" | "add" | "edit" | "delete";
  annotations: AnnotationDto[];
}

export class AnnotEvent extends CustomEvent<AnnotEventDetail> {
  constructor(detail: AnnotEventDetail) {
    super(annotChangeEvent, {detail});
  }
}

declare global {
  interface DocumentEventMap {
    [annotChangeEvent]: AnnotEvent;
    [annotSelectionRequestEvent]: AnnotSelectionRequestEvent;
  }
}
//#endregion
