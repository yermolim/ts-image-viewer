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
  };

  private _previewContainer: HTMLDivElement; 
  get previewContainer(): HTMLDivElement {
    return this._previewContainer;
  }
  private _previewRendered: boolean;

  private _viewWrapper: HTMLDivElement;
  /**relatively positioned image view outer container */
  get viewWrapper(): HTMLDivElement {
    return this._viewWrapper;
  }  
  /**absolutely positioned image view inner container */
  private _viewContainer: HTMLDivElement; 
  get viewContainer(): HTMLDivElement {
    return this._viewContainer;
  }  
  private _viewRendered: boolean;
  private set $viewRendered(value: boolean) {
    this._viewRendered = value;
    this._viewContainer.setAttribute("data-loaded", value + "");
  } 
  private get $viewRendered(): boolean {
    return this._viewRendered;
  }
  private _viewCanvas: HTMLCanvasElement;

  private _annotationView: ImageAnnotationView;
  
  private _scale: number; 
  set scale(value: number) {   
    if (value <= 0 || this._scale === value) {
      return;
    }
    this._scale = value;
    this.updateDimensions();
  }
  get scale(): number {
    return this._scale;
  }
  
  private _rotation: number;
  private set $rotation(value: number) {
    if (this._rotation === value) {
      return;
    }
    this._rotation = value;
    this.updateDimensions();
  } 
  get rotation(): number {
    return this._rotation;
  }

  private _dimensionsValid: boolean;
  /**true if the view render is up to date */
  get viewValid(): boolean {
    return this._dimensionsValid && this.$viewRendered;
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

    // using a relatively positioned wrapper and an absolutely positioned inner element
    // simplifies the image rotation implementation

    this._viewContainer = document.createElement("div");
    this._viewContainer.classList.add("image");
    this._viewContainer.setAttribute("data-image-index", this.index + "");

    this._viewWrapper = document.createElement("div");
    this._viewWrapper.classList.add("image-wrapper");
    this._viewWrapper.setAttribute("data-image-index", this.index + "");
    this._viewWrapper.append(this.viewContainer);    
    
    this._scale = 1;
    this._rotation = 0;
    this.updateDimensions();
  }

  /**free the object resources to let GC clean them to avoid memory leak */
  destroy() {
    this._previewContainer.remove();
    this._viewWrapper.remove();
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

    // create a new canvas of the needed size and fill it with a rendered image
    const canvas = this.createViewCanvas();
    const ctx = canvas.getContext("2d");
    const {x: imgW, y: imgH} = this.imageInfo.dimensions;
    ctx.drawImage(this.imageInfo.image, 0, 0, imgW, imgH, 0, 0, canvas.width, canvas.height);

    this._viewCanvas?.remove();
    this._viewContainer.append(canvas);
    this._viewCanvas = canvas;
    this.$viewRendered = true;

    // add annotations div on top of canvas
    if (!this._annotationView) {
      this._annotationView = new ImageAnnotationView(this.imageInfo);
    }
    this._annotationView.appendTo(this.viewContainer);

    this._dimensionsValid = true;
  }
  
  clearPreview() {
    this._previewContainer.innerHTML = "";
  }

  clearView() {
    this._annotationView?.destroy();
    this._annotationView = null;
    
    this._viewCanvas?.remove();
    this.$viewRendered = false;
  }

  rotateClockwise() {
    if (this._rotation === 270) {
      this.$rotation = 0;
    } else {
      this.$rotation = (this._rotation || 0) + 90;
    }
  }

  rotateCounterClockwise() {
    if (!this._rotation) {
      this.$rotation = 270;
    } else {
      this.$rotation = this._rotation - 90;
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
    tempCtx.drawImage(this.imageInfo.image, 0, 0, x, y, 0, 0, x, y);

    if (this._annotationView) {
      const annotationsImage = await this._annotationView.toImageAsync();
      // draw the annotations over the original image
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
    canvas.width = this._dimensions.width;
    canvas.height = this._dimensions.height;
    return canvas;
  }

  private updateDimensions() {
    this._dimensions.scaledWidth = this._dimensions.width * this._scale;
    this._dimensions.scaledHeight = this._dimensions.height * this._scale;

    const w = this._dimensions.scaledWidth;
    const h = this._dimensions.scaledHeight;    
    
    if (this._viewCanvas) {
      this._viewCanvas.style.width = w + "px";
      this._viewCanvas.style.height = h + "px";
    }

    this._viewContainer.style.width = w + "px";
    this._viewContainer.style.height = h + "px";

    if (this._rotation) {    
      // transform the view container depending on the rotation angle 
      switch (this._rotation) {
        case 90:
          this._viewWrapper.style.width = h + "px";
          this._viewWrapper.style.height = w + "px";
          this._viewContainer.style.transform = "rotate(90deg) translateY(-100%)";
          break;
        case 180:
          this._viewWrapper.style.width = w + "px";
          this._viewWrapper.style.height = h + "px";
          this._viewContainer.style.transform = "rotate(180deg) translateX(-100%) translateY(-100%)";
          break;
        case 270:
          this._viewWrapper.style.width = h + "px";
          this._viewWrapper.style.height = w + "px";
          this._viewContainer.style.transform = "rotate(270deg) translateX(-100%)";
          break;
        default:
          throw new Error(`Invalid rotation degree: ${this._rotation}`);
      }
    } else {
      this._viewWrapper.style.width = w + "px";
      this._viewWrapper.style.height = h + "px";
      this._viewContainer.style.transform = "";
    }

    this._dimensionsValid = false;
  }
}
