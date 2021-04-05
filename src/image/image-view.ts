import { ImageInfo } from "./image-info";
import { ImageAnnotationView } from "./image-annotations-view";

export class ImageView { 
  readonly index: number;  
  readonly imageInfo: ImageInfo;

  private _dimensions: {
    width: number; 
    height: number;
    previewWidth: number;
    previewHeight: number;
    scaledWidth?: number;
    scaledHeight?: number;
    scaledDprWidth?: number;
    scaledDprHeight?: number;
  };

  private _previewContainer: HTMLDivElement; 
  get previewContainer(): HTMLDivElement {
    return this._previewContainer;
  }
  private _previewRendered: boolean;

  private _viewContainer: HTMLDivElement; 
  get viewContainer(): HTMLDivElement {
    return this._viewContainer;
  }  
  private $viewRendered: boolean;
  private set _viewRendered(value: boolean) {
    this.$viewRendered = value;
    this._viewContainer.setAttribute("data-loaded", value + "");
  } 
  private get _viewRendered(): boolean {
    return this.$viewRendered;
  }
  private _viewCanvas: HTMLCanvasElement;

  private _annotationView: ImageAnnotationView;
  
  private _scale: number; 
  set scale(value: number) {   
    if (value <= 0 || this._scale === value) {
      return;
    }
    this._scale = value;
    const dpr = window.devicePixelRatio;
    
    this._dimensions.scaledWidth = this._dimensions.width * this._scale;
    this._dimensions.scaledHeight = this._dimensions.height * this._scale;
    this._dimensions.scaledDprWidth = this._dimensions.scaledWidth * dpr;
    this._dimensions.scaledDprHeight = this._dimensions.scaledHeight * dpr;

    this._viewContainer.style.width = this._dimensions.scaledWidth + "px";
    this._viewContainer.style.height = this._dimensions.scaledHeight + "px";
    
    if (this._viewCanvas) {
      this._viewCanvas.style.width = this._dimensions.scaledWidth + "px";
      this._viewCanvas.style.height = this._dimensions.scaledHeight + "px";
    }

    this._scaleIsValid = false;
  } 

  private _scaleIsValid: boolean;
  get viewValid(): boolean {
    return this._scaleIsValid && this._viewRendered;
  }

  constructor(imageInfo: ImageInfo, index: number, previewWidth: number) {
    if (!imageInfo) {
      throw new Error("Image info is not defined");
    }
    if (isNaN(index)) {
      throw new Error("Index is not defined");
    }

    this.imageInfo = imageInfo;
    this.index = index;

    const {x: width, y: height} = imageInfo.dimensions;
    previewWidth = Math.max(previewWidth ?? 0, 50);
    const previewHeight = previewWidth * (height / width);
    this._dimensions = {width, height, previewWidth, previewHeight};

    this._previewContainer = document.createElement("div");
    this._previewContainer.classList.add("image-preview");    
    this._previewContainer.setAttribute("data-image-index", this.index + 1 + "");
    this._previewContainer.style.width = this._dimensions.previewWidth + "px";
    this._previewContainer.style.height = this._dimensions.previewHeight + "px";

    this._viewContainer = document.createElement("div");
    this._viewContainer.classList.add("image");
    this._viewContainer.setAttribute("data-image-index", this.index + "");
    this.scale = 1;  
  }

  destroy() {
    this._previewContainer.remove();
    this._viewContainer.remove();
  }  

  renderPreview(force = false) {    
    if (!force && this._previewRendered) {
      return;
    }

    const canvas = this.createPreviewCanvas();
    const ctx = canvas.getContext("2d");
    const {x: imgW, y: imgH} = this.imageInfo.dimensions;
    ctx.drawImage(this.imageInfo.image, 0, 0, imgW, imgH, 0, 0, canvas.width, canvas.height);

    this._previewContainer.innerHTML = "";
    this._previewContainer.append(canvas);
    this._previewRendered = true;
  }
  
  renderView(force = false) {
    if (!force && this.viewValid) {
      return;
    }

    const scale = this._scale;

    // create a new canvas of the needed size and fill it with a rendered image
    const canvas = this.createViewCanvas();
    const ctx = canvas.getContext("2d");
    const {x: imgW, y: imgH} = this.imageInfo.dimensions;
    ctx.drawImage(this.imageInfo.image, 0, 0, imgW, imgH, 0, 0, canvas.width, canvas.height);

    this._viewCanvas?.remove();
    this._viewContainer.append(canvas);
    this._viewCanvas = canvas;
    this._viewRendered = true;

    // add annotations div on top of canvas
    if (!this._annotationView) {
      this._annotationView = new ImageAnnotationView(this.imageInfo);
    }
    this._annotationView.append(this.viewContainer);

    // check if scale not changed during text render
    if (scale === this._scale) {
      this._scaleIsValid = true;
    }  
  }
  
  clearPreview() {
    this._previewContainer.innerHTML = "";
  }

  clearView() {
    this._annotationView?.destroy();
    this._annotationView = null;
    
    this._viewCanvas?.remove();
    this._viewRendered = false;
  }

  async bakeAnnotationsAsync(): Promise<Blob>  {
    const tempCanvas = document.createElement("canvas");
    const {x, y} = this.imageInfo.dimensions;
    tempCanvas.width = x;
    tempCanvas.height = y;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(this.imageInfo.image, 0, 0, x, y, 0, 0, x, y);

    if (this._annotationView) {
      const annotationsImage = await this._annotationView.toImageAsync();
      tempCtx.drawImage(annotationsImage, 0, 0);
    }

    const result = await new Promise<Blob>((resolve, reject) => {
      tempCanvas.toBlob((blob: Blob) => {
        resolve(blob);
      }, "image/png", 0.7);
    });

    return result;
  }
  
  private createPreviewCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.classList.add("image-canvas");  
    const dpr = window.devicePixelRatio;
    const {previewWidth: width, previewHeight: height} = this._dimensions;  
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    return canvas;
  }

  private createViewCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.classList.add("image-canvas"); 
    canvas.style.width = this._dimensions.scaledWidth + "px";
    canvas.style.height = this._dimensions.scaledHeight + "px";
    canvas.width = this._dimensions.scaledDprWidth;
    canvas.height = this._dimensions.scaledDprHeight;
    return canvas;
  }
}
