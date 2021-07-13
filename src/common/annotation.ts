import { Mat3, Vec2 } from "mathador";
import { AppearanceRenderResult, BBox } from "../drawing/utils";
import { EventService } from "./event-service";
import { AnnotEditRequestEvent, AnnotEvent } from "./events";
import { ImageInfo } from "./image-info";
import { getRandomUuid } from "./uuid";

export interface AnnotationRenderResult {
  /**svg container with all the annotation rendered helpers (boxes, handles, etc.) */
  controls: SVGGraphicsElement;
  /**container with the annotation rendered content*/
  content: HTMLDivElement;
}

export interface AnnotationDto {
  annotationType: string;
  uuid: string;
  imageUuid: string;

  dateCreated: string;
  dateModified: string;
  author: string;

  textContent?: string;

  /**rotation in radians */
  rotation?: number;
}

export interface RenderableAnnotation {
  /**optional action callback which is called on 'pointer down' event */
  onPointerDownAction: (e: PointerEvent) => void;  
  /**optional action callback which is called on 'pointer enter' event */
  onPointerEnterAction: (e: PointerEvent) => void;
  /**optional action callback which is called on 'pointer leave' event */
  onPointerLeaveAction: (e: PointerEvent) => void;

  get lastRenderResult(): AnnotationRenderResult;

  /**
   * render current annotation using SVG
   * @param viewBox view box used for SVG elements
   * @returns 
   */
  renderAsync(imageInfo: ImageInfo): Promise<AnnotationRenderResult>;
  
  /**
   * serialize the annotation to a data transfer object
   * @returns 
   */
  toDto(): AnnotationDto;

  /**create array of HTMLImageElement from all the annotations*/
  toImageAsync(): Promise<HTMLImageElement[]>;
}

export abstract class AnnotationBase implements RenderableAnnotation {
  translationEnabled: boolean;
  
  readonly eventService: EventService;
  readonly uuid: string;
  readonly type: string;

  /**optional action callback which is called on 'pointer down' event */
  onPointerDownAction: (e: PointerEvent) => void;  
  /**optional action callback which is called on 'pointer enter' event */
  onPointerEnterAction: (e: PointerEvent) => void;
  /**optional action callback which is called on 'pointer leave' event */
  onPointerLeaveAction: (e: PointerEvent) => void;
  
  protected _imageInfo: ImageInfo;

  protected _imageUuid: string;
  get imageUuid(): string {
    return this._imageUuid;
  }
  set imageUuid(value: string) {
    if (value !== this._imageUuid) {
      this._imageUuid = value;
      this._imageInfo = null;
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
  
  protected _textContent: string;
  get textContent(): string {
    return this._textContent;
  }
  
  protected _strokeWidth: number;
  get strokeWidth(): number {
    return this._strokeWidth;
  }

  protected _rotation: number;
  get rotation(): number {
    return this._rotation;
  }

  //#region edit-related properties
  protected _aabbIsActual: boolean;
  protected readonly _aabb: readonly [min: Vec2, min: Vec2] = [new Vec2(), new Vec2()];
  /**axis-aligned bounding box */
  get aabb(): readonly [min: Vec2, min: Vec2] {
    if (!this._aabbIsActual) {
      this.updateAABB();
      this._aabbIsActual = true;
    }
    return [this._aabb[0].clone(), this._aabb[1].clone()];
  }

  protected _transformationPromise: Promise<void>;  
  protected _transformationTimer: number; 
  protected _tempX: number;
  protected _tempY: number;
  protected _currentAngle = 0;   
  protected _moved: boolean;

  /**temp object used for calculations to prevent unnecessary objects creation overhead */
  protected _tempTransformationMatrix = new Mat3(); 
  /**temp object used for calculations to prevent unnecessary objects creation overhead */
  protected _tempStartPoint = new Vec2();

  /**temp object used for calculations to prevent unnecessary objects creation overhead */
  protected _tempVecX = new Vec2();
  /**temp object used for calculations to prevent unnecessary objects creation overhead */
  protected _tempVecY = new Vec2();
  //#endregion

  //#region render-related properties  
  protected readonly _svgId = getRandomUuid();

  /**rendered box showing the annotation dimensions */
  protected _renderedBox: SVGGraphicsElement;
  /**svg container with all the annotation rendered helpers (boxes, handles, etc.) */
  protected _renderedControls: SVGGraphicsElement;  
  /**container with the annotation rendered content*/
  protected _renderedContent: HTMLDivElement;

  /**copy of the rendered annotation content */
  protected _svgContentCopy: SVGGraphicsElement;

  get lastRenderResult(): AnnotationRenderResult {
    if (!this._renderedControls || !this._renderedContent) {
      return null;
    }
    
    return {
      controls: this._renderedControls,
      content: this._renderedContent,
    };
  }  
  //#endregion

  protected constructor(eventService: EventService, dto?: AnnotationDto) {  
    if (!eventService) {
      throw new Error("Event service is not defined");
    }
    
    this.eventService = eventService;
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

    if (dto.textContent) {
      this._textContent = dto.textContent;
    }

    this._rotation = dto.rotation ?? 0;
  }
  
  /**
   * render current annotation using SVG
   * @param imageInfo view box used for SVG elements
   * @returns 
   */
  async renderAsync(imageInfo: ImageInfo): Promise<AnnotationRenderResult> {
    if (!imageInfo) {
      throw new Error("Can't render the annotation: image dimensions is not defined");
    }
    this._imageInfo = imageInfo;
    
    if (!this._renderedControls) {
      this._renderedControls = this.renderControls();
    }

    // wrap render into a fake promise to keep interface responsible between render calls
    await new Promise<void>((resolve, reject) => {
      setTimeout(async () => {        
        await this.updateRenderAsync(); 
        resolve();          
      }, 0);
    });

    return this.lastRenderResult;
  }

  /**
   * move the annotation to the specified coords relative to the image
   * @param point target point corrdiantes in the image coordinate system 
   */
  async moveToAsync(point: Vec2) {
    const aabb = this.aabb;
    const width = aabb[1].x - aabb[0].x;
    const height = aabb[1].y - aabb[0].y;
    const x = point.x - width / 2;
    const y = point.y - height / 2;
    const mat = Mat3.buildTranslate(x, y);
    await this.applyCommonTransformAsync(mat);
  } 

  /**
   * rotate the annotation by a certain angle
   * @param angle angle in radians
   * @param center point to rotate around (if not specified, the annotation center is used)
   */
  async rotateByAsync(angle: number, center?: Vec2) {   
    if (!center) {
      const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this.aabb;
      center = new Vec2(
        (xmin + xmax) / 2,
        (ymin + ymax) / 2,
      );
    } 
    const mat = new Mat3()
      .applyTranslation(-center.x, -center.y)
      .applyRotation(angle)
      .applyTranslation(center.x, center.y);
    await this.applyCommonTransformAsync(mat);
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

      dateCreated: this._dateCreated?.toISOString(),
      dateModified: this._dateModified?.toISOString(),
      author: this._author,

      textContent: this._textContent,
    };
  }

  /**
   * set the annotation text content
   * (override in subclass to add additional logic)
   */
  async setTextContentAsync(text: string, undoable = true) {
    const oldText = this._textContent;
    this._textContent = text;

    this._dateModified = new Date();

    const undoAction = undoable
      ? async () => {
        await this.setTextContentAsync(oldText, false);
      }
      : undefined;
    
    this.emitEditRequest(undoAction);
  }
  
  /**create array of HTMLImageElement from all the annotations*/
  async toImageAsync(): Promise<HTMLImageElement[]> {
    const renderedContent = this._renderedContent;
    if (!renderedContent) {
      return null;
    }
    const contentSvgs = renderedContent.querySelectorAll(".annotation-content-element");
    if (!contentSvgs?.length) {
      return null;
    }
    const svgs: SVGGraphicsElement[] = [];
    contentSvgs.forEach(x => {
      if (x instanceof SVGGraphicsElement) { 
        svgs.push(x); 
      }
    });

    const images: HTMLImageElement[] = [];
    for (const svg of svgs) {
      const svgSerialized = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgSerialized], {type: "image/svg+xml;charset=utf-8"});
      const svgUrl = URL.createObjectURL(svgBlob);
  
      const result = await new Promise<HTMLImageElement>((resolve, reject) => {      
        const image = new Image();
        image.onerror = (e: string | Event) => {
          console.log(`Error while loading image: ${e}`);
          resolve(null);
        };
        image.onload = () => {
          resolve(image);
        };
        image.src = svgUrl;
      });
      
      URL.revokeObjectURL(svgUrl);
      images.push(result);
    }

    return images;
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
    // client coords - coordinates in the image coordinate system
    // hor length - the length of the side of the annotation that is currently horizontal (after the image rotation)

    const [annotLocalMin, annotLocalMax] = this.aabb;  
    const {x: annotClientXMin, y: annotClientYMin, 
      width: annotClientHorLength, height: annotClientVertLength} = 
      this._renderedBox.getBoundingClientRect();

    const imageRotation = this._imageInfo?.rotation || 0;
    let imageScale = this?._imageInfo?.scale;
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
    // client coords - coordinates in the image coordinate system
    // hor length - the length of the side of the annotation that is currently horizontal (after the image rotation)

    const [annotLocalMin, annotLocalMax] = this.aabb;  
    const {x: annotClientXMin, y: annotClientYMin, 
      width: annotClientHorLength, height: annotClientVertLength} = 
      this._renderedBox.getBoundingClientRect();

    const imageRotation = this._imageInfo?.rotation || 0;
    let imageScale = this?._imageInfo?.scale;
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
  protected getAnnotationToImageMatrix(): Mat3 {
    const imageInfo = this._imageInfo;

    if (!imageInfo) {
      return new Mat3();
    }
    
    const imageRotation = imageInfo?.rotation;
    if (!imageRotation) {
      return new Mat3();
    }

    // calculate a transformation matrix depending on the current image rotation

    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this.aabb;

    const centerX = (xmax + xmin) / 2;
    const centerY = (ymax + ymin) / 2;
    const {x: imageWidth, y: imageHeight} = imageInfo.dimensions;

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

  //#region transformation
  /**
   * transform the annotation using a 3x3 matrix
   * @param matrix    * 
   * @param undoable 
   */
  protected async applyCommonTransformAsync(matrix: Mat3, undoable = true) {
    this._dateModified = new Date();    

    this._aabbIsActual = false;
    await this.updateRenderAsync();
    
    const invertedMat = Mat3.invert(matrix);    
    const undoAction = undoable
      ? async () => {
        await this.applyCommonTransformAsync(invertedMat, false);
      }
      : undefined;    
    this.emitEditRequest(undoAction);
  }
  
  /**
   * reset the svg element copy used for transformation purposes
   */
  protected async applyTempTransformAsync() {
    if (this._transformationTimer) {
      clearTimeout(this._transformationTimer);
      this._transformationTimer = null;
      return;
    }

    if (this._transformationPromise) {
      await this._transformationPromise;
    }

    this._transformationPromise = new Promise<void>(async resolve => {
      // reset and remove the copy from DOM
      this._svgContentCopy.remove();
      this._svgContentCopy.setAttribute("transform", "matrix(1 0 0 1 0 0)");

      if (this._moved) {
        // transform the annotation
        await this.applyCommonTransformAsync(this._tempTransformationMatrix);
      }

      // reset the temp matrix
      this._tempTransformationMatrix.reset();

      resolve();
    });

    await this._transformationPromise;
  }
  //#endregion

  //#region render containers creation
  /**render the graphical representation of the annotation Rect (AABB) */
  protected renderRect(): SVGGraphicsElement {
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this.aabb;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.classList.add("annotation-rect");
    rect.setAttribute("data-annotation-name", this.uuid);
    rect.setAttribute("x", xmin + "");
    rect.setAttribute("y", ymin + "");
    rect.setAttribute("width", xmax - xmin + "");
    rect.setAttribute("height", ymax - ymin + "");

    return rect;
  }
  
  /**render the graphical representation of the annotation bounding box */
  protected renderBox(): SVGGraphicsElement {
    // TODO: improve logic to support non-axis -aligned bounding boxes
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this.aabb;
    const bBox: BBox = {
      ul: new Vec2(xmin, ymin),
      ll: new Vec2(xmin, ymax),
      lr: new Vec2(xmax, ymax),
      ur: new Vec2(xmax, ymin),
    };

    const {ll, lr, ur, ul} = bBox;
    const boxPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    boxPath.classList.add("annotation-bbox");
    boxPath.setAttribute("data-annotation-name", this.uuid);
    boxPath.setAttribute("d", `M ${ll.x} ${ll.y} L ${lr.x} ${lr.y} L ${ur.x} ${ur.y} L ${ul.x} ${ul.y} Z`);

    return boxPath;
  }

  /**render the outer svg container for the annotation UI */
  protected renderControls(): SVGGraphicsElement {    
    const controlsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    controlsGroup.classList.add("annotation-controls");
    controlsGroup.setAttribute("data-annotation-name", this.uuid);    
    controlsGroup.addEventListener("pointerdown", this.onSvgPointerDown);
    controlsGroup.addEventListener("pointerenter", this.onSvgPointerEnter);
    controlsGroup.addEventListener("pointerleave", this.onSvgPointerLeave);

    return controlsGroup;
  }  

  /**convert the annotation content render result to a structured html div */
  protected buildRenderedContentStructure(renderResult: AppearanceRenderResult): HTMLDivElement {
    const content = document.createElement("div");
    content.id = this._svgId;
    content.classList.add("annotation-content");
    content.setAttribute("data-annotation-name", this.uuid); 

    const {x: width, y: height} = this._imageInfo.dimensions;
    
    if (renderResult.clipPaths?.length) {
      const clipPathsContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      clipPathsContainer.setAttribute("viewBox", `0 0 ${width} ${height}`);
      clipPathsContainer.append(...renderResult.clipPaths);
      content.append(clipPathsContainer);
    }
      
    renderResult.elements.forEach(x => {      
      const elementContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      elementContainer.classList.add("annotation-content-element");
      elementContainer.setAttribute("viewBox", `0 0 ${width} ${height}`);

      elementContainer.style["mixBlendMode"] = x.blendMode;
      elementContainer.append(x.element);
      content.append(elementContainer);
    });

    return content;
  }

  /**render the copy of the annotation content (used as a temp object for a transformation visualization) */
  protected buildRenderContentCopy(contentRenderResult: AppearanceRenderResult): SVGGraphicsElement {
    const copy = document.createElementNS("http://www.w3.org/2000/svg", "g");
    contentRenderResult.elements.forEach(x => {
      copy.append(x.element.cloneNode(true));
    });
    copy.classList.add("annotation-temp-copy");
    return copy;
  }
  //#endregion

  //#endregion

  //#region render of the annotation control handles 
  protected renderScaleHandles(): SVGGraphicsElement[] { 
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this.aabb;
    const bBox: BBox = {
      ul: new Vec2(xmin, ymin),
      ll: new Vec2(xmin, ymax),
      lr: new Vec2(xmax, ymax),
      ur: new Vec2(xmax, ymin),
    };

    const handles: SVGGraphicsElement[] = [];
    ["ll", "lr", "ur", "ul"].forEach(x => {
      const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      handle.classList.add("annotation-handle", "scale");
      handle.setAttribute("data-handle-name", x);
      handle.setAttribute("cx", bBox[x].x + "");
      handle.setAttribute("cy", bBox[x].y + ""); 
      handle.addEventListener("pointerdown", this.onScaleHandlePointerDown); 
      handles.push(handle);   
    });

    return handles;
  } 
  
  protected renderRotationHandle(): SVGGraphicsElement { 
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this.aabb;
    const centerX = (xmin + xmax) / 2;
    const centerY = (ymin + ymax) / 2;
    // const currentRotation = this._rotation;

    const rotationGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    rotationGroup.classList.add("annotation-rotator");
    rotationGroup.setAttribute("data-handle-name", "center");  
     
    const rotationGroupCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    rotationGroupCircle.classList.add("circle", "dashed");
    rotationGroupCircle.setAttribute("cx", centerX + "");
    rotationGroupCircle.setAttribute("cy", centerY + "");

    const handleMatrix = new Mat3()
      .applyTranslation(-centerX, -centerY + 35)
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
    centerRectHandle.classList.add("annotation-handle", "rotation");
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

  protected async updateRenderAsync() {
    if (!this._renderedControls) {
      // not rendered yet. no svg to update
      return;
    }
    // clear controls group
    this._renderedControls.innerHTML = "";

    // render annotation appearance
    const contentRenderResult = this.renderAppearance();
    if (!contentRenderResult || !contentRenderResult.elements?.length) { 
      this._renderedBox = null;
      this._svgContentCopy = null;
      return null;
    }
    // convert the appearance render result to a structured html div
    const content = this.buildRenderedContentStructure(contentRenderResult);
    this._renderedContent = content;
    
    // render controls
    const rect = this.renderRect();
    const box = this.renderBox();
    const handles = this.renderHandles(); 
    this._renderedBox = box;
    this._renderedControls.append(rect, box, ...contentRenderResult.pickHelpers, ...handles);

    // render annotation content copy used for its transformation
    const copy = this.buildRenderContentCopy(contentRenderResult); 
    this._svgContentCopy = copy;
    
    this.eventService.dispatchEvent(new AnnotEvent({
      type: "render",
      annotations: [this.toDto()],
    }));
  }

  //#endregion

  //#region event handlers 

  //#region selection handlers
  protected onSvgPointerEnter = (e: PointerEvent) => { 
    if (this.onPointerEnterAction) {
      this.onPointerEnterAction(e);
    }
  };

  protected onSvgPointerLeave = (e: PointerEvent) => { 
    if (this.onPointerLeaveAction) {
      this.onPointerLeaveAction(e);
    }    
  };
  
  protected onSvgPointerDown = (e: PointerEvent) => { 
    if (!this.imageUuid) {
      // the annotation is not appended to the image (a temporary one)
      // do nothing
      return;
    }

    // call the additional action if present
    if (this.onPointerDownAction) {
      this.onPointerDownAction(e);
    }

    this.onTranslationPointerDown(e);
  };
  //#endregion

  //#region translation handlers
  protected onTranslationPointerDown = (e: PointerEvent) => { 
    if (!this.translationEnabled || !e.isPrimary) {
      // translation disabled or it's a secondary touch action
      return;
    }

    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    target.addEventListener("pointerup", this.onTranslationPointerUp);
    target.addEventListener("pointerout", this.onTranslationPointerUp);  

    this._moved = false;

    // set timeout to prevent an accidental annotation translation
    this._transformationTimer = setTimeout(() => {
      this._transformationTimer = null;    
      // append the svg element copy       
      this._renderedControls.after(this._svgContentCopy);
      // set the starting transformation point
      this._tempStartPoint.setFromVec2(this.convertClientCoordsToImage(e.clientX, e.clientY));
      target.addEventListener("pointermove", this.onTranslationPointerMove);
    }, 200);
  };

  protected onTranslationPointerMove = (e: PointerEvent) => {
    if (!e.isPrimary) {
      // it's a secondary touch action
      return;
    }
      
    const current = this.convertClientCoordsToImage(e.clientX, e.clientY);
    // update the temp transformation matrix
    this._tempTransformationMatrix.reset()
      .applyTranslation(current.x - this._tempStartPoint.x, 
        current.y - this._tempStartPoint.y);

    // move the svg element copy to visualize the future transformation in real-time
    this._svgContentCopy.setAttribute("transform", 
      `matrix(${this._tempTransformationMatrix.toFloatShortArray().join(" ")})`);

    this._moved = true;
  };
  
  protected onTranslationPointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      // it's a secondary touch action
      return;
    }

    const target = e.target as HTMLElement;
    target.removeEventListener("pointermove", this.onTranslationPointerMove);
    target.removeEventListener("pointerup", this.onTranslationPointerUp);
    target.removeEventListener("pointerout", this.onTranslationPointerUp);
    target.releasePointerCapture(e.pointerId); 

    this.applyTempTransformAsync();
  };
  //#endregion
  
  //#region rotation handlers
  protected onRotationHandlePointerDown = (e: PointerEvent) => {    
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }

    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    target.addEventListener("pointerup", this.onRotationHandlePointerUp);
    target.addEventListener("pointerout", this.onRotationHandlePointerUp);   
    
    this._moved = false;

    // set timeout to prevent an accidental annotation rotation
    this._transformationTimer = setTimeout(() => {
      this._transformationTimer = null;  
      // append the svg element copy       
      this._renderedControls.after(this._svgContentCopy);
      target.addEventListener("pointermove", this.onRotationHandlePointerMove);
    }, 200);

    e.stopPropagation();
  };

  protected onRotationHandlePointerMove = (e: PointerEvent) => {
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }
    
    // calculate current angle depending on the pointer position relative to the rotation center
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this.aabb;
    const centerX = (xmin + xmax) / 2;
    const centerY = (ymin + ymax) / 2;
    const clientCenter = this.convertImageCoordsToClient(centerX, centerY);
    const imageAngle = this._imageInfo?.rotation
      ? this._imageInfo.rotation / 180 * Math.PI
      : 0;
    const angle = Math.atan2(e.clientX - clientCenter.x, e.clientY - clientCenter.y) + imageAngle;

    // update the temp transformation matrix
    this._tempTransformationMatrix.reset()
      .applyTranslation(-centerX, -centerY)
      .applyRotation(angle)
      .applyTranslation(centerX, centerY);

    // move the svg element copy to visualize the future transformation in real-time
    this._svgContentCopy.setAttribute("transform", 
      `matrix(${this._tempTransformationMatrix.toFloatShortArray().join(" ")})`);
    
    this._moved = true;
  };
  
  protected onRotationHandlePointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      // it's a secondary touch action
      return;
    }

    const target = e.target as HTMLElement;
    target.removeEventListener("pointermove", this.onRotationHandlePointerMove);
    target.removeEventListener("pointerup", this.onRotationHandlePointerUp);
    target.removeEventListener("pointerout", this.onRotationHandlePointerUp);
    target.releasePointerCapture(e.pointerId);     
    
    this.applyTempTransformAsync();
  };
  //#endregion
  
  //#region scale handlers
  protected onScaleHandlePointerDown = (e: PointerEvent) => { 
    if (!e.isPrimary) {
      //it's a secondary touch action
      return;
    }

    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    target.addEventListener("pointerup", this.onScaleHandlePointerUp);
    target.addEventListener("pointerout", this.onScaleHandlePointerUp);

    // calculate the initial bounding box side vectors (from the further corner to the handle corner)
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this.aabb;
    const ul = new Vec2(xmin, ymin);
    const ll = new Vec2(xmin, ymax);
    const lr = new Vec2(xmax, ymax);
    const ur = new Vec2(xmax, ymin);
    const handleName = target.dataset["handleName"];
    switch (handleName) {
      case "ll": 
        this._tempStartPoint.setFromVec2(ur);
        this._tempVecX.setFromVec2(ul).subtract(ur);
        this._tempVecY.setFromVec2(lr).subtract(ur);      
        break;
      case "lr":
        this._tempStartPoint.setFromVec2(ul);
        this._tempVecX.setFromVec2(ur).subtract(ul);
        this._tempVecY.setFromVec2(ll).subtract(ul); 
        break;
      case "ur":
        this._tempStartPoint.setFromVec2(ll); 
        this._tempVecX.setFromVec2(lr).subtract(ll);
        this._tempVecY.setFromVec2(ul).subtract(ll);
        break;
      case "ul":
        this._tempStartPoint.setFromVec2(lr); 
        this._tempVecX.setFromVec2(ll).subtract(lr);
        this._tempVecY.setFromVec2(ur).subtract(lr);
        break;
      default:
        // execution should not reach here
        throw new Error(`Invalid handle name: ${handleName}`);
    }
    this._tempX = this._tempVecX.getMagnitude();
    this._tempY = this._tempVecY.getMagnitude();

    this._moved = false;

    // set timeout to prevent an accidental annotation scaling
    this._transformationTimer = setTimeout(() => {
      this._transformationTimer = null;       
      // append the svg element copy     
      this._renderedControls.after(this._svgContentCopy);
      target.addEventListener("pointermove", this.onScaleHandlePointerMove);
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
      .subtract(this._tempStartPoint);
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
    
    const [{x: xmin, y: ymin}, {x: xmax, y: ymax}] = this.aabb;
    const annotCenterX = (xmin + xmax) / 2;
    const annotCenterY = (ymin + ymax) / 2;
    // const currentRotation = this._rotation;

    // update the temp transformation matrix
    this._tempTransformationMatrix.reset()
      .applyTranslation(-annotCenterX, -annotCenterY)
      // .applyRotation(-currentRotation)
      .applyScaling(scaleX, scaleY)
      // .applyRotation(currentRotation)
      .applyTranslation(annotCenterX, annotCenterY);
    const translation = this._tempStartPoint.clone().subtract(
      this._tempStartPoint.clone().applyMat3(this._tempTransformationMatrix));
    this._tempTransformationMatrix.applyTranslation(translation.x, translation.y);
    
    // move the svg element copy to visualize the future transformation in real-time
    this._svgContentCopy.setAttribute("transform", 
      `matrix(${this._tempTransformationMatrix.toFloatShortArray().join(" ")})`);
      
    this._moved = true;
  };
  
  protected onScaleHandlePointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      // it's a secondary touch action
      return;
    }

    const target = e.target as HTMLElement;
    target.removeEventListener("pointermove", this.onScaleHandlePointerMove);
    target.removeEventListener("pointerup", this.onScaleHandlePointerUp);
    target.removeEventListener("pointerout", this.onScaleHandlePointerUp);
    target.releasePointerCapture(e.pointerId); 
    
    this.applyTempTransformAsync();
  };
  //#endregion

  //#endregion
    
  protected emitEditRequest(undoAction: () => Promise<void>) {    
    this.eventService.dispatchEvent(new AnnotEditRequestEvent({
      undoAction,
      annotation: this,
    }));
  }

  protected abstract renderAppearance(): AppearanceRenderResult;
   
  protected abstract updateAABB(): void;
}
