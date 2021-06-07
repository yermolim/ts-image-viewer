/* eslint-disable @typescript-eslint/no-use-before-define */
import { Mat3, Vec2 } from "mathador";
import { BaseDimensions, BBox, getRandomUuid, RenderToSvgResult } from "../common";

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
      this._imageDimensions = null;
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
  /**axis-aligned bounding box */
  protected readonly _aabb: readonly [min: Vec2, min: Vec2] = [new Vec2(), new Vec2()];
  /**axis-aligned bounding box */
  get aabb(): readonly [min: Vec2, min: Vec2] {
    return [this._aabb[0].clone(), this._aabb[1].clone()];
  }

  protected _imageDimensions: BaseDimensions;

  protected _transformationTimer: number; 
  protected _tempX: number;
  protected _tempY: number;

  /**temp object used for calculations to prevent unnecessary objects creation overhead */
  protected readonly _tempTransformationMatrix = new Mat3(); 
  /**temp object used for calculations to prevent unnecessary objects creation overhead */
  protected readonly _tempTransformationStartPoint = new Vec2();
  /**temp object used for calculations to prevent unnecessary objects creation overhead */
  protected readonly _tempVecX = new Vec2();
  /**temp object used for calculations to prevent unnecessary objects creation overhead */
  protected readonly _tempVecY = new Vec2();
  //#endregion

  //#region render-related properties
  protected readonly _svgId = getRandomUuid();

  /**outer svg container */
  protected _svg: SVGGraphicsElement;
  /**rendered box showing the annotation dimensions */
  protected _svgBox: SVGGraphicsElement;
  /**rendered annotation content */
  protected _svgContent: SVGGraphicsElement;
  /**copy of the rendered annotation content */
  protected _svgContentCopy: SVGGraphicsElement;
  /**use element attached to the copy of the rendered annotation content */
  protected _svgContentCopyUse: SVGUseElement;
  /**rendered svg clip paths */
  protected _svgClipPaths: SVGClipPathElement[];
  /**rendered transformation handles */
  protected _svgHandles: SVGGraphicsElement[];

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
  }
  
  /**
   * render current annotation to an svg element
   * @param imageDimensions object with the parent image dimention info
   * @param forceRerender 
   * @returns 
   */
  render(imageDimensions: BaseDimensions, forceRerender = false): RenderToSvgResult {
    this._imageDimensions = imageDimensions;

    if (!this._svg) {
      this._svg = this.renderMainElement();
    }

    if (this._lastRenderResult && !forceRerender) {
      this.updateHandles();
      return this._lastRenderResult;
    } else {
      this.updateRender();
    }

    const renderResult: RenderToSvgResult = {
      svg: this._svg,
      clipPaths: this._svgClipPaths,      
      tempCopy: this._svgContentCopy,
      tempCopyUse: this._svgContentCopyUse,
    };
    this._lastRenderResult = renderResult;
    return renderResult;
  } 

  /**
   * move the annotation to the specified coords relative to the image
   * @param imageX 
   * @param imageY 
   */
  moveTo(imageX: number, imageY: number) {
    const aabb = this._aabb;
    const width = aabb[1].x - aabb[0].x;
    const height = aabb[1].y - aabb[0].y;
    const x = imageX - width / 2;
    const y = imageY - height / 2;
    const mat = Mat3.buildTranslate(x, y);
    this.applyCommonTransform(mat);
  }

  /**
   * rotate the annotation around its own center
   * @param degree 
   */
  rotate(degree: number) {
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this._aabb;
    const halfWidth = (xmax - xmin) / 2;
    const halfHeight = (ymax - ymin) / 2;
    const x = xmin + halfWidth;
    const y = ymin + halfHeight;
    
    this._tempTransformationMatrix.reset()
      .applyTranslation(-x, -y)
      .applyRotation(degree / 180 * Math.PI)
      .applyTranslation(x, y);
    this.applyCommonTransform(this._tempTransformationMatrix);
  }

  /**
   * serialize the annotation to a data transfer object
   * @returns 
   */
  toDto(): AnnotationDto {
    return {
      annotationType: this.type,
      uuid: this.uuid,
      imageUuid: this.imageUuid,

      dateCreated: this.dateCreated.toISOString(),
      dateModified: this.dateModified.toISOString(),
      author: this.author,
    };
  }
  
  //#region protected render methods

  //#region common methods used for rendering purposes  
  /**
   * get a 2D vector with a position of the specified point in the image coords 
   * @param clientX 
   * @param clientY 
   */
  protected convertClientCoordsToImage(clientX: number, clientY: number): Vec2 {
    // local coords - coordinates in the image coordinate system
    // client coords - coordinates in the page coordinate system
    // hor length - the length of the side of the annotation that is currently horizontal (after the image rotation)

    this.updateAABB();
    const [annotLocalMin, annotLocalMax] = this.aabb;  
    const {x: annotClientXMin, y: annotClientYMin, 
      width: annotClientHorLength, height: annotClientVertLength} = 
      this._svgBox.getBoundingClientRect();

    const imageRotation = this._imageDimensions?.rotation || 0;
    let imageScale = this?._imageDimensions?.scale;
    let annotLocalHorLength: number;
    // current client position of the image corner with image coords 0,0
    const imageClientZero = new Vec2(); 
    const localResult = new Vec2();
    switch(imageRotation) {
      // rotated clockwise around the image top-left corner
      case 0:
        // horizontal edge is horizontal, so use X coords
        annotLocalHorLength = annotLocalMax.x - annotLocalMin.x;
        imageScale ||= annotClientHorLength / annotLocalHorLength;

        imageClientZero.set(
          annotClientXMin - annotLocalMin.x * imageScale,
          annotClientYMin - annotLocalMin.y * imageScale
        );

        localResult.set(          
          (clientX - imageClientZero.x) / imageScale,
          (clientY - imageClientZero.y) / imageScale
        );
        break;
      case 90:
        // rotate(90deg) translateY(-100%)
        // vertical edge is horizontal, so use Y coords
        annotLocalHorLength = annotLocalMax.x - annotLocalMin.x;
        imageScale ||= annotClientHorLength / annotLocalHorLength;

        imageClientZero.set(
          annotClientXMin + annotClientHorLength + annotLocalMin.y * imageScale,
          annotClientYMin - annotLocalMin.x * imageScale
        );

        localResult.set(          
          (clientY - imageClientZero.y) / imageScale,
          (imageClientZero.x - clientX) / imageScale
        );
        break;
      case 180:
        // rotate(180deg) translateX(-100%) translateY(-100%)
        // horizontal edge is horizontal, so use X coords
        annotLocalHorLength = annotLocalMax.x - annotLocalMin.x;
        imageScale ||= annotClientHorLength / annotLocalHorLength;

        imageClientZero.set(
          annotClientXMin + annotClientHorLength + annotLocalMin.x * imageScale,
          annotClientYMin + annotClientVertLength + annotLocalMin.y * imageScale
        );

        localResult.set(          
          (imageClientZero.x - clientX) / imageScale,
          (imageClientZero.y - clientY) / imageScale
        );
        break;
      case 270:
        // rotate(270deg) translateX(-100%)
        // vertical edge is horizontal, so use Y coords
        annotLocalHorLength = annotLocalMax.y - annotLocalMin.y;
        imageScale ||= annotClientHorLength / annotLocalHorLength;

        imageClientZero.set(
          annotClientXMin - annotLocalMin.y * imageScale,
          annotClientYMin + annotClientVertLength + annotLocalMin.x * imageScale
        );

        localResult.set(          
          (imageClientZero.y - clientY) / imageScale,
          (clientX - imageClientZero.x) / imageScale
        );
        break;
      default:
        throw new Error(`Invalid rotation image value: ${imageRotation}`);
    }

    return localResult;
  }
  
  /**
   * get a 2D vector with a position of the specified point in the client coords 
   * @param imageX 
   * @param imageY 
   */
  protected convertImageCoordsToClient(imageX: number, imageY: number): Vec2 {    
    // local coords - coordinates in the image coordinate system
    // client coords - coordinates in the page coordinate system
    // hor length - the length of the side of the annotation that is currently horizontal (after the image rotation)

    this.updateAABB();
    const [annotLocalMin, annotLocalMax] = this.aabb;  
    const {x: annotClientXMin, y: annotClientYMin, 
      width: annotClientHorLength, height: annotClientVertLength} = 
      this._svgBox.getBoundingClientRect();

    const imageRotation = this._imageDimensions?.rotation || 0;
    let imageScale = this?._imageDimensions?.scale;
    let annotLocalHorLength: number;
    // current client position of the image corner with image coords 0,0
    const imageClientZero = new Vec2(); 
    const localResult = new Vec2();
    switch(imageRotation) {
      // rotated clockwise around the image top-left corner
      case 0:
        // horizontal edge is horizontal, so use X coords
        annotLocalHorLength = annotLocalMax.x - annotLocalMin.x;
        imageScale ||= annotClientHorLength / annotLocalHorLength;

        imageClientZero.set(
          annotClientXMin - annotLocalMin.x * imageScale,
          annotClientYMin - annotLocalMin.y * imageScale
        );

        localResult.set(
          imageX * imageScale + imageClientZero.x,
          imageY * imageScale + imageClientZero.y
        );
        break;
      case 90:
        // rotate(90deg) translateY(-100%)
        // vertical edge is horizontal, so use Y coords
        annotLocalHorLength = annotLocalMax.x - annotLocalMin.x;
        imageScale ||= annotClientHorLength / annotLocalHorLength;

        imageClientZero.set(
          annotClientXMin + annotClientHorLength + annotLocalMin.y * imageScale,
          annotClientYMin - annotLocalMin.x * imageScale,
        );

        localResult.set(      
          imageClientZero.x - imageY * imageScale,
          imageX * imageScale + imageClientZero.y
        );
        break;
      case 180:
        // rotate(180deg) translateX(-100%) translateY(-100%)
        // horizontal edge is horizontal, so use X coords
        annotLocalHorLength = annotLocalMax.x - annotLocalMin.x;
        imageScale ||= annotClientHorLength / annotLocalHorLength;

        imageClientZero.set(
          annotClientXMin + annotClientHorLength + annotLocalMin.x * imageScale,
          annotClientYMin + annotClientVertLength + annotLocalMin.y * imageScale,
        );

        localResult.set(          
          imageClientZero.x - imageX * imageScale,
          imageClientZero.y - imageY * imageScale
        );
        break;
      case 270:
        // rotate(270deg) translateX(-100%)
        // vertical edge is horizontal, so use Y coords
        annotLocalHorLength = annotLocalMax.y - annotLocalMin.y;
        imageScale ||= annotClientHorLength / annotLocalHorLength;

        imageClientZero.set(
          annotClientXMin - annotLocalMin.y * imageScale,
          annotClientYMin + annotClientVertLength + annotLocalMin.x * imageScale,
        );

        localResult.set(     
          imageY * imageScale + imageClientZero.x,
          imageClientZero.y - imageX * imageScale
        );
        break;
      default:
        throw new Error(`Invalid rotation image value: ${imageRotation}`);
    }

    return localResult;
  }

  /**construct the annotation transformation matrix depending on the current image rotation */
  protected getAnnotationToImageMatrix(imageDimensions: BaseDimensions): Mat3 {
    if (!imageDimensions) {
      return new Mat3();
    }
    
    const imageRotation = imageDimensions?.rotation;
    if (!imageRotation) {
      return new Mat3();
    }

    // calculate a transformation matrix depending on the current image rotation

    this.updateAABB();
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this.aabb;

    const centerX = (xmax + xmin) / 2;
    const centerY = (ymax + ymin) / 2;
    const {width: imageWidth, height: imageHeight} = imageDimensions;

    let x: number;
    let y: number;
    switch(imageRotation) {
      // rotated clockwise around the image top-left corner
      case 90:
        // rotate(90deg) translateY(-100%)
        x = centerY;
        y = imageHeight - centerX;
        break;
      case 180:
        // rotate(180deg) translateX(-100%) translateY(-100%)
        x = imageWidth - centerX;
        y = imageHeight - centerY;
        break;
      case 270:
        // rotate(270deg) translateX(-100%)
        x = imageWidth - centerY;
        y = centerX;
        break;
      default:
        throw new Error(`Invalid rotation image value: ${imageRotation}`);
    }

    const mat = new Mat3()
      .applyTranslation(-centerX, -centerY)
      .applyRotation(imageRotation / 180 * Math.PI)
      .applyTranslation(x, y);
    return mat;
  }
  //#endregion

  //#region annotation components render
  protected renderBox(): SVGGraphicsElement {
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this._aabb;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.classList.add("svg-annot-rect");
    rect.setAttribute("data-annotation-name", this.uuid);
    rect.setAttribute("x", xmin + "");
    rect.setAttribute("y", ymin + "");     
    rect.setAttribute("width", xmax - xmin + "");
    rect.setAttribute("height", ymax - ymin + "");

    return rect;
  }

  protected renderMainElement(): SVGGraphicsElement {    
    const mainSvg = document.createElementNS("http://www.w3.org/2000/svg", "g");
    mainSvg.classList.add("svg-annotation");
    mainSvg.setAttribute("data-annotation-name", this.uuid);    
    mainSvg.addEventListener("pointerdown", this.onRectPointerDown);

    return mainSvg;
  }

  protected renderContentCopy(): {copy: SVGGraphicsElement; use: SVGUseElement} {
    const copy = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    const copyDefs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const copySymbol = document.createElementNS("http://www.w3.org/2000/svg", "symbol");
    copySymbol.id = this._svgId + "_symbol";
    const copySymbolUse = document.createElementNS("http://www.w3.org/2000/svg", "use");
    copySymbolUse.setAttribute("href", `#${this._svgId}`);
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
  protected renderScaleHandles(scale = 1): SVGGraphicsElement[] { 
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this._aabb;
    const bBox: BBox = {
      ul: new Vec2(xmin, ymin),
      ll: new Vec2(xmin, ymax),
      lr: new Vec2(xmax, ymax),
      ur: new Vec2(xmax, ymin),
    };

    const handles: SVGGraphicsElement[] = [];
    ["ll", "lr", "ur", "ul"].forEach(x => {
      const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      handle.classList.add("svg-annot-handle-scale");
      handle.setAttribute("data-handle-name", x);
      handle.setAttribute("cx", bBox[x].x + "");
      handle.setAttribute("cy", bBox[x].y + ""); 
      handle.setAttribute("r", 8 / scale + ""); 
      handle.addEventListener("pointerdown", this.onScaleHandlePointerDown); 
      handles.push(handle);   
    });

    return handles;
  } 
  
  protected renderRotationHandle(scale = 1): SVGGraphicsElement { 
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this._aabb;

    const centerX = (xmin + xmax) / 2;
    const centerY = (ymin + ymax) / 2;

    const rotationGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    rotationGroup.classList.add("svg-annot-rotation");
    rotationGroup.setAttribute("data-handle-name", "center");  
     
    const rotationGroupCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    rotationGroupCircle.classList.add("dashed");
    rotationGroupCircle.setAttribute("cx", centerX + "");
    rotationGroupCircle.setAttribute("cy", centerY + "");
    rotationGroupCircle.setAttribute("r", 25 / scale + "");

    const handleMatrix = new Mat3()
      .applyTranslation(-centerX, -centerY + 35 / scale)
      // .applyRotation(currentRotation)
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
    centerRectHandle.setAttribute("r", 8 / scale + ""); 
    centerRectHandle.addEventListener("pointerdown", this.onRotationHandlePointerDown);

    rotationGroup.append(rotationGroupCircle, rotationGroupLine, centerRectHandle);
    return rotationGroup;
  } 

  /**
   * override in subclass to apply a custom annotation handles renderer
   */
  protected renderHandles(): SVGGraphicsElement[] { 
    const scale = this._imageDimensions?.scale || 1;
    return [...this.renderScaleHandles(scale), this.renderRotationHandle(scale)];
  } 

  protected updateHandles() {
    this._svgHandles?.forEach(x => x.remove());
    setTimeout(() => {
      // wrapped in setTimeout to let element sizes refresh
      this._svgHandles = this.renderHandles(); 
      this._svg.append(...this._svgHandles); 
    }, 0);
  }
  //#endregion

  protected updateRender() {
    if (!this._svg) {
      // not rendered yet. no svg to update
      return;
    }

    this._svg.innerHTML = "";
    
    this.updateAABB();

    const contentResult = this.renderContent();
    if (!contentResult) { 
      this._svgBox = null;
      this._svgContent = null;
      this._svgContentCopy = null;
      this._svgContentCopyUse = null;
      this._svgClipPaths = null;
      this._svgHandles = null;
      return;
    }  

    const box = this.renderBox();
    const content = contentResult.svg;
    content.id = this._svgId;
    content.classList.add("svg-annotation-content");
    content.setAttribute("data-annotation-name", this.uuid); 
    const {copy, use} = this.renderContentCopy();     
    this._svg.append(box, content);

    this._svgBox = box;
    this._svgContent = content;
    this._svgContentCopy = copy;
    this._svgContentCopyUse = use; 
    this._svgClipPaths = contentResult.clipPaths;

    this.updateHandles();
  }
  //#endregion

  //#region event handlers 

  /**
   * reset the svg element copy used for transformation purposes
   */
  protected applyTempTransform() {
    if (this._transformationTimer) {
      clearTimeout(this._transformationTimer);
      this._transformationTimer = null;
      return;
    }

    // remove the copy from DOM
    this._svgContentCopy.remove();
    // reset the copy transform
    this._svgContentCopyUse.setAttribute("transform", "matrix(1 0 0 1 0 0)");

    // transform the annotation
    this.applyCommonTransform(this._tempTransformationMatrix);

    // reset the temp matrix
    this._tempTransformationMatrix.reset();
  }

  //#region main svg handlers (selection + translation)
  protected onRectPointerDown = (e: PointerEvent) => { 
    document.dispatchEvent(new AnnotSelectionRequestEvent({annotation: this}));

    if (!this.translationEnabled || !e.isPrimary) {
      // translation disabled or it's a secondary touch action
      return;
    }

    document.addEventListener("pointerup", this.onRectPointerUp);
    document.addEventListener("pointerout", this.onRectPointerUp);  

    // set timeout to prevent an accidental annotation translation
    this._transformationTimer = setTimeout(() => {
      this._transformationTimer = null;   
      // append the svg element copy   
      this._svg.after(this._svgContentCopy);
      // set the starting transformation point
      this._tempTransformationStartPoint.setFromVec2(this.convertClientCoordsToImage(e.clientX, e.clientY));
      document.addEventListener("pointermove", this.onRectPointerMove);
    }, 200);
  };

  protected onRectPointerMove = (e: PointerEvent) => {
    if (!e.isPrimary) {
      // it's a secondary touch action
      return;
    }

    const current = this.convertClientCoordsToImage(e.clientX, e.clientY);
    // update the temp transformation matrix
    this._tempTransformationMatrix.reset()
      .applyTranslation(current.x - this._tempTransformationStartPoint.x, 
        current.y - this._tempTransformationStartPoint.y);

    // move the svg element copy to visualize the future transformation in real-time
    this._svgContentCopyUse.setAttribute("transform", 
      `matrix(${this._tempTransformationMatrix.toFloatShortArray().join(" ")})`);
  };
  
  protected onRectPointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }

    document.removeEventListener("pointermove", this.onRectPointerMove);
    document.removeEventListener("pointerup", this.onRectPointerUp);
    document.removeEventListener("pointerout", this.onRectPointerUp);

    // transform the annotation
    this.applyTempTransform();
  };
  //#endregion
  
  //#region rotation handlers
  protected onRotationHandlePointerDown = (e: PointerEvent) => {    
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }

    document.addEventListener("pointerup", this.onRotationHandlePointerUp);
    document.addEventListener("pointerout", this.onRotationHandlePointerUp);    

    // set timeout to prevent an accidental annotation rotation
    this._transformationTimer = setTimeout(() => {
      this._transformationTimer = null;   
      // append the svg element copy      
      this._svg.after(this._svgContentCopy);
      document.addEventListener("pointermove", this.onRotationHandlePointerMove);
    }, 200);

    e.stopPropagation();
  };

  protected onRotationHandlePointerMove = (e: PointerEvent) => {
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }
  
    // calculate current angle depending on the pointer position relative to the rotation center
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this._aabb;
    const centerX = (xmin + xmax) / 2;
    const centerY = (ymin + ymax) / 2;
    const clientCenter = this.convertImageCoordsToClient(centerX, centerY);
    const imageAngle = this._imageDimensions?.rotation
      ? this._imageDimensions.rotation / 180 * Math.PI
      : 0;
    const angle = Math.atan2(e.clientX - clientCenter.x, e.clientY - clientCenter.y) + imageAngle;

    // update the temp transformation matrix
    this._tempTransformationMatrix.reset()
      .applyTranslation(-centerX, -centerY)
      .applyRotation(angle)
      .applyTranslation(centerX, centerY);

    // move the svg element copy to visualize the future transformation in real-time
    this._svgContentCopyUse.setAttribute("transform", 
      `matrix(${this._tempTransformationMatrix.toFloatShortArray().join(" ")})`);
  };
  
  protected onRotationHandlePointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }

    document.removeEventListener("pointermove", this.onRotationHandlePointerMove);
    document.removeEventListener("pointerup", this.onRotationHandlePointerUp);
    document.removeEventListener("pointerout", this.onRotationHandlePointerUp);

    // transform the annotation
    this.applyTempTransform();
  };
  //#endregion
  
  //#region scale handlers
  protected onScaleHandlePointerDown = (e: PointerEvent) => { 
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }

    document.addEventListener("pointerup", this.onScaleHandlePointerUp);
    document.addEventListener("pointerout", this.onScaleHandlePointerUp); 

    const target = e.target as HTMLElement;

    // calculate the initial bounding box side vectors (from the further corner to the handle corner)
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this._aabb;
    const ul = new Vec2(xmin, ymin);
    const ll = new Vec2(xmin, ymax);
    const lr = new Vec2(xmax, ymax);
    const ur = new Vec2(xmax, ymin);
    const handleName = target.dataset["handleName"];
    switch (handleName) {
      case "ll": 
        this._tempTransformationStartPoint.setFromVec2(ur);
        this._tempVecX.setFromVec2(ul).substract(ur);
        this._tempVecY.setFromVec2(lr).substract(ur);      
        break;
      case "lr":
        this._tempTransformationStartPoint.setFromVec2(ul);
        this._tempVecX.setFromVec2(ur).substract(ul);
        this._tempVecY.setFromVec2(ll).substract(ul); 
        break;
      case "ur":
        this._tempTransformationStartPoint.setFromVec2(ll); 
        this._tempVecX.setFromVec2(lr).substract(ll);
        this._tempVecY.setFromVec2(ul).substract(ll);
        break;
      case "ul":
        this._tempTransformationStartPoint.setFromVec2(lr); 
        this._tempVecX.setFromVec2(ll).substract(lr);
        this._tempVecY.setFromVec2(ur).substract(lr);
        break;
      default:
        // execution should not reach here
        throw new Error(`Invalid handle name: ${handleName}`);
    }
    this._tempX = this._tempVecX.getMagnitude();
    this._tempY = this._tempVecY.getMagnitude();

    // set timeout to prevent an accidental annotation scaling
    this._transformationTimer = setTimeout(() => {
      this._transformationTimer = null;    
      // append the svg element copy     
      this._svg.after(this._svgContentCopy);
      document.addEventListener("pointermove", this.onScaleHandlePointerMove);
    }, 200);

    e.stopPropagation();
  };

  protected onScaleHandlePointerMove = (e: PointerEvent) => {
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }
    
    // calculate scale change comparing bounding boxes vectors:
    // first box - from the further corner to the handle corner (initial)
    // second box - from the further corner to the current pointer position (current)

    // calculate the current diagonal vector
    const currentBoxDiagonal = this.convertClientCoordsToImage(e.clientX, e.clientY)
      .substract(this._tempTransformationStartPoint);
    const currentBoxDiagonalLength = currentBoxDiagonal.getMagnitude();

    // calculate the cosine of the angle between the current diagonal vector and the initial box side
    const cos = Math.abs(currentBoxDiagonal.dotProduct(this._tempVecX)) 
      / currentBoxDiagonalLength / this._tempX;
    // calculate the current box side lengths
    const currentXSideLength = cos * currentBoxDiagonalLength;
    const currentYSideLength = Math.sqrt(currentBoxDiagonalLength * currentBoxDiagonalLength 
      - currentXSideLength * currentXSideLength);    

    const scaleX = currentXSideLength / this._tempX;
    const scaleY = currentYSideLength / this._tempY;
    
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this._aabb;
    const annotCenterX = (xmin + xmax) / 2;
    const annotCenterY = (ymin + ymax) / 2;

    // update the temp transformation matrix
    this._tempTransformationMatrix.reset()
      .applyTranslation(-annotCenterX, -annotCenterY)
      // .applyRotation(-currentRotation)
      .applyScaling(scaleX, scaleY)
      // .applyRotation(currentRotation)
      .applyTranslation(annotCenterX, annotCenterY);
    const translation = this._tempTransformationStartPoint.clone().substract(
      this._tempTransformationStartPoint.clone().applyMat3(this._tempTransformationMatrix));
    this._tempTransformationMatrix.applyTranslation(translation.x, translation.y);
    
    // move the svg element copy to visualize the future transformation in real-time
    this._svgContentCopyUse.setAttribute("transform", 
      `matrix(${this._tempTransformationMatrix.toFloatShortArray().join(" ")})`);
  };
  
  protected onScaleHandlePointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }

    document.removeEventListener("pointermove", this.onScaleHandlePointerMove);
    document.removeEventListener("pointerup", this.onScaleHandlePointerUp);
    document.removeEventListener("pointerout", this.onScaleHandlePointerUp);

    // transform the annotation
    this.applyTempTransform();
  };
  //#endregion

  //#endregion

  /**
   * transform the annotation using a 3x3 matrix
   * @param matrix 
   */
  protected abstract applyCommonTransform(matrix: Mat3): void;
  
  protected abstract renderContent(): RenderToSvgResult;
  
  protected abstract updateAABB(): void;
}

export interface AnnotationDto {
  annotationType: string;
  uuid: string;
  imageUuid: string;

  dateCreated: string;
  dateModified: string;
  author: string;
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
