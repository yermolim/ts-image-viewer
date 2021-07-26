import { DomUtils, EventService, Thumbs } from "ts-viewers-core";

import { ImageCoords, ImageInfo, ImageInfoView } from "../common/image-info";
import { ImageAnnotationView } from "./image-annotation-view";

export class ImageView implements ImageInfoView { 
  readonly index: number;  
  readonly eventService: EventService;
  readonly imageInfo: ImageInfo;

  private readonly _dimensions = {
    width: 0, 
    height: 0,
    previewWidth: 0,
    previewHeight: 0,
    scaledWidth: 0,
    scaledHeight: 0,
  };

  private _previewWidth: number;
  private _previewContainer: HTMLDivElement; 
  get previewContainer(): HTMLDivElement {
    return this._previewContainer;
  }
  private _previewRendered: boolean;
  private _previewRenderPromise: Promise<void>;

  private _viewOuterContainer: HTMLDivElement;
  /**relatively positioned image view outer container */
  get viewWrapper(): HTMLDivElement {
    return this._viewOuterContainer;
  }  
  /**absolutely positioned image view inner container */
  private _viewInnerContainer: HTMLDivElement; 
  get viewContainer(): HTMLDivElement {
    return this._viewInnerContainer;
  }  
  private _viewRendered: boolean;
  private set $viewRendered(value: boolean) {
    this._viewRendered = value;
    this._viewInnerContainer.setAttribute("data-loaded", value + "");
  } 
  private get $viewRendered(): boolean {
    return this._viewRendered;
  }
  private _viewCanvas: HTMLCanvasElement;

  private _annotationView: ImageAnnotationView;
  
  set scale(value: number) {   
    if (this.imageInfo.scale === value) {
      return;
    }
    this.imageInfo.scale = value;
    this.refreshDimensions();
  }
  get scale(): number {
    return this.imageInfo.scale;
  }
  
  private set $rotation(value: number) {
    if (this.imageInfo.rotation === value) {
      return;
    }
    this.imageInfo.rotation = value;
    this.refreshDimensions();
  } 
  get rotation(): number {
    return this.imageInfo.rotation;
  }

  private _dimensionsValid: boolean;
  /**true if the view render is up to date */
  get viewValid(): boolean {
    return this._dimensionsValid && this.$viewRendered;
  }

  constructor(eventService: EventService, imageInfo: ImageInfo, index: number, previewWidth: number) {    
    if (!eventService) {
      throw new Error("Event service is not defined");
    }
    if (!imageInfo) {
      throw new Error("Image info is not defined");
    }
    if (isNaN(index)) {
      throw new Error("Index is not defined");
    }    

    this.eventService = eventService;
    this.imageInfo = imageInfo;
    this.index = index;

    this._previewWidth = previewWidth;

    this._previewContainer = document.createElement("div");
    this._previewContainer.classList.add("page-preview");    
    this._previewContainer.setAttribute("data-page-number", this.index + 1 + "");

    this._viewInnerContainer = document.createElement("div");
    this._viewInnerContainer.classList.add("page");
    this._viewInnerContainer.setAttribute("data-page-number", this.index + "");

    this._viewOuterContainer = document.createElement("div");
    this._viewOuterContainer.classList.add("page-container");
    this._viewOuterContainer.setAttribute("data-page-number", this.index + "");
    this._viewOuterContainer.append(this._viewInnerContainer);    
    
    this.refreshDimensions();
  }

  /**free the object resources to let GC clean them to avoid memory leak */
  destroy() {
    this._previewContainer.remove();
    this._viewOuterContainer.remove();
  }  

  async renderPreviewAsync(force = false) {    
    if (!force && this._previewRendered) {
      return;
    }

    if (this._previewRenderPromise) {
      await this._previewRenderPromise;
    } else {
      this._previewRenderPromise = new Promise<void>(async (resolve, reject) => {
        const image = await this.imageInfo.getImageAsync();
        const {x: imgW, y: imgH} = this.imageInfo.dimensions;
        this.refreshDimensions();
    
        const canvas = this.createPreviewCanvas();
        const ctx = canvas.getContext("2d");
        if (image) {
          ctx.drawImage(image, 0, 0, imgW, imgH, 0, 0, canvas.width, canvas.height);
        } else {      
          // the image failed to load. replace it with placeholder
          const placeholder = await DomUtils.loadImageAsync(Thumbs.thumb_error, true);
          ctx.drawImage(placeholder, 
            0, 0, placeholder.naturalWidth, placeholder.naturalHeight, 
            0, 0, canvas.width, canvas.height);
        }
    
        this._previewContainer.innerHTML = "";
        this._previewContainer.append(canvas);
        this._previewRendered = true;
        resolve();
      });
      await this._previewRenderPromise;
      this._previewRenderPromise = null;  
    }
  }
  
  async renderViewAsync(force = false) {
    if (!force && this.viewValid) {
      return;
    }

    const image = await this.imageInfo.getImageAsync();
    const {x: imgW, y: imgH} = this.imageInfo.dimensions;
    this.refreshDimensions();

    // create a new canvas of the needed size and fill it with a rendered image
    const canvas = this.createViewCanvas();
    const ctx = canvas.getContext("2d");
    if (image) {
      ctx.drawImage(image, 0, 0, imgW, imgH, 0, 0, canvas.width, canvas.height);
    }

    this._viewCanvas?.remove();
    this._viewInnerContainer.append(canvas);
    this._viewCanvas = canvas;
    this.$viewRendered = true;

    // add annotations div on top of canvas
    if (!this._annotationView) {
      this._annotationView = new ImageAnnotationView(this.eventService, this.imageInfo);
    }
    await this._annotationView.appendAsync(this.viewContainer);

    this._dimensionsValid = true;
  }
  
  clearPreview() {
    this._previewContainer.innerHTML = "";
    this._previewRendered = false;
  }

  clearView() {
    this._annotationView?.destroy();
    this._annotationView = null;
    
    this._viewCanvas?.remove();
    this.$viewRendered = false;
  }

  rotateClockwise() {
    if (this.rotation === 270) {
      this.$rotation = 0;
    } else {
      this.$rotation = (this.rotation || 0) + 90;
    }
  }

  rotateCounterClockwise() {
    if (!this.rotation) {
      this.$rotation = 270;
    } else {
      this.$rotation = this.rotation - 90;
    }
  }

  /**
   * export the image as a PNG file with all its annotations drawn over 
   * @returns PNG Blob
   */
  async bakeAnnotationsAsync(): Promise<Blob>  {
    const tempCanvas = document.createElement("canvas");
    const {x, y} = this.imageInfo.dimensions;
    tempCanvas.width = x;
    tempCanvas.height = y;
    const tempCtx = tempCanvas.getContext("2d");

    // draw the original image
    const image = await this.imageInfo.getImageAsync();
    if (image) {
      tempCtx.drawImage(image, 0, 0, x, y, 0, 0, x, y);
    }

    for (const annot of this.imageInfo.annotations || []) {
      if (annot.deleted) {
        continue;
      }

      const annotImages = await annot.toImageAsync();
      // draw the annotations over the original image
      for (const annotImage of annotImages) {
        tempCtx.drawImage(annotImage, 0, 0);
      }
    }

    const result = await new Promise<Blob>((resolve, reject) => {
      tempCanvas.toBlob((blob: Blob) => {
        resolve(blob);
      }, "image/png", 0.7);
    });

    return result;
  }  
     
  getImageCoordsUnderPointer(clientX: number, clientY: number): ImageCoords {
    const {left: pxMin, top: pyMin, width: pw, height: ph} = 
      this.viewContainer.getBoundingClientRect();
    const pxMax = pxMin + pw;
    const pyMax = pyMin + ph;

    if ((clientX < pxMin || clientX > pxMax)
      || (clientY < pyMin || clientY > pyMax)) {
      // point is not inside a image
      return null;
    }

    // the point is inside the image
    let x: number;
    let y: number;
    const scale = this.scale;
    const rotation = this.rotation;
    switch (rotation) {
      case 0:
        // 0, 0 is top-left corner
        // imageX direction = clientX direction
        // imageY direction = clientY direction
        x = (clientX - pxMin) / scale;
        y = (clientY - pyMin) / scale;
        break;
      case 90:  
        // 0, 0 is top-right corner
        // imageX direction = clientY direction
        // imageY direction = -clientX direction
        x = (clientY - pyMin) / scale;
        y = (pxMax - clientX) / scale;      
        break;
      case 180:
        // 0, 0 is bottom-right corner
        // imageX direction = -clientX direction
        // imageY direction = -clientY direction
        x = (pxMax - clientX) / scale;
        y = (pyMax - clientY) / scale;  
        break;
      case 270:
        // 0, 0 is bottom-left corner
        // imageX direction = -clientY direction
        // imageY direction = clientX direction
        x = (pyMax - clientY) / scale;
        y = (clientX - pxMin) / scale;  
        break;
      default:
        throw new Error(`Invalid rotation degree: ${rotation}`);
    }
    
    return {
      info: this.imageInfo,
      x,
      y,
    };
  }

  private createPreviewCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.classList.add("page-canvas");  
    const dpr = window.devicePixelRatio;
    const width = this._dimensions.previewWidth || this._previewWidth;
    const height = this._dimensions.previewHeight || this._previewWidth * 0.75;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    return canvas;
  }

  private createViewCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.classList.add("page-canvas"); 
    canvas.style.width = this._dimensions.scaledWidth + "px";
    canvas.style.height = this._dimensions.scaledHeight + "px";
    canvas.width = this._dimensions.width;
    canvas.height = this._dimensions.height;
    return canvas;
  }

  private refreshDimensions() {
    const {x: width, y: height} = this.imageInfo.dimensions;
    const previewWidth = Math.max(this._previewWidth ?? 0, 50);
    const previewHeight = previewWidth * (height / width) || previewWidth * 0.75;
    
    this._dimensions.width = width;
    this._dimensions.height = height;
    this._dimensions.previewWidth = previewWidth;
    this._dimensions.previewHeight = previewHeight;

    this._previewContainer.style.width = this._dimensions.previewWidth + "px";
    this._previewContainer.style.height = this._dimensions.previewHeight + "px";

    this._dimensions.scaledWidth = this._dimensions.width * this.scale;
    this._dimensions.scaledHeight = this._dimensions.height * this.scale;

    const w = this._dimensions.scaledWidth + "px";
    const h = this._dimensions.scaledHeight + "px"; 
    
    if (this._viewCanvas) {
      this._viewCanvas.style.width = w;
      this._viewCanvas.style.height = h;
    }

    this._viewInnerContainer.style.width = w;
    this._viewInnerContainer.style.height = h;

    switch (this.rotation) {
      case 0: 
        this._viewOuterContainer.style.width = w;
        this._viewOuterContainer.style.height = h;       
        this._viewInnerContainer.style.transform = "";
        break;
      case 90:        
        this._viewOuterContainer.style.width = h;
        this._viewOuterContainer.style.height = w;    
        this._viewInnerContainer.style.transform = "rotate(90deg) translateY(-100%)";
        break;
      case 180:
        this._viewOuterContainer.style.width = w;
        this._viewOuterContainer.style.height = h; 
        this._viewInnerContainer.style.transform = "rotate(180deg) translateX(-100%) translateY(-100%)";
        break;
      case 270:
        this._viewOuterContainer.style.width = h;
        this._viewOuterContainer.style.height = w; 
        this._viewInnerContainer.style.transform = "rotate(270deg) translateX(-100%)";
        break;
      default:
        throw new Error(`Invalid rotation degree: ${this.rotation}`);
    }

    this._dimensionsValid = false;
  }
}
