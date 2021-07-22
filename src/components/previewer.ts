import { imageChangeEvent, ImageEvent } from "../common/events";
import { ImageService } from "../services/image-service";

export interface PreviewerOptions {
  canvasWidth?: number;
}

export class Previewer {
  private readonly _imageService: ImageService;
  private readonly _container: HTMLDivElement;

  private readonly _canvasWidth: number;
  get canvasWidth(): number {
    return this._canvasWidth;
  }

  private _hidden = true;
  get hidden(): boolean {
    return this._hidden;
  }
 
  constructor(imageService: ImageService, container: HTMLDivElement, options?: PreviewerOptions) {        
    if (!imageService) {
      throw new Error("Image service is not defined");
    }
    if (!container) {
      throw new Error("Container is not defined");
    }

    this._imageService = imageService;
    this._container = container;

    this._canvasWidth = options?.canvasWidth || 100;

    this.init();
  }
  
  destroy() {   
    this._imageService.eventService.removeListener(imageChangeEvent, this.onImageChange);     
    this._container.removeEventListener("scroll", this.onPreviewerScroll);
  }

  show() {
    this._hidden = false;
    // timeout to give the time to update DOM
    setTimeout(() => this.renderVisibleAsync(), 1000);
  }

  hide() {
    this._hidden = true;
  }

  private init() {
    this._container.addEventListener("scroll", this.onPreviewerScroll);
    this._imageService.eventService.addListener(imageChangeEvent, this.onImageChange); 
  }
  
  private scrollToPreview(imageIndex: number) { 
    if (!this._imageService.imageCount) {
      // no pages
      return;
    }

    const {top: cTop, height: cHeight} = this._container.getBoundingClientRect();
    const {top: pTop, height: pHeight} = this._imageService.getImage(imageIndex)
      .previewContainer.getBoundingClientRect();

    const cCenter = cTop + cHeight / 2;
    const pCenter = pTop + pHeight / 2;

    const scroll = pCenter - cCenter + this._container.scrollTop;
    this._container.scrollTo(0, scroll);
  }

  /**
   * get image previews that are visible in the previewer viewport at the moment
   * @returns 
   */
  private getVisiblePreviewImages(): Set<number> {
    const images = this._imageService.imageViews;
    const cointainer = this._container;

    const imagesVisible = new Set<number>();
    if (!images.length) {
      return imagesVisible;
    }

    const cRect = cointainer.getBoundingClientRect();
    const cTop = cRect.top;
    const cBottom = cRect.top + cRect.height;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const pRect = image.previewContainer.getBoundingClientRect();
      const pTop = pRect.top;
      const pBottom = pRect.top + pRect.height;

      if (pTop < cBottom && pBottom > cTop) {
        imagesVisible.add(i);
      } else if (imagesVisible.size) {
        break;
      }
    }
    return imagesVisible;
  }
  
  /**
   * render image previews that are visible in the previewer viewport at the moment
   */
  private async renderVisibleAsync() {
    if (this._hidden) {
      return;
    }

    const images = this._imageService.imageViews;
    const visiblePreviewNumbers = this.getVisiblePreviewImages();
    
    const minImageNumber = Math.max(Math.min(...visiblePreviewNumbers), 0);
    const maxImageNumber = Math.min(Math.max(...visiblePreviewNumbers), images.length - 1);

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (i >= minImageNumber && i <= maxImageNumber) {
        await image.renderPreviewAsync();
      }
    }
  }
  
  
  private onImageChange = async (event: ImageEvent) => {
    if (event.detail.type === "open") {
      event.detail.imageViews?.forEach(x => {
        x.previewContainer.addEventListener("click", this.onPreviewerImageClick);
        this._container.append(x.previewContainer);
      });
    } else if (event.detail.type === "select") {
      this.scrollToPreview(event.detail.imageViews[0].index);
    }

    await this.renderVisibleAsync();
  };

  private onPreviewerImageClick = (e: Event) => {
    let target = <HTMLElement>e.target;
    let imageNumber: number;
    while (target && !imageNumber) {
      const data = target.dataset["pageNumber"];
      if (data) {
        imageNumber = +data;
      } else {
        target = target.parentElement;
      }
    }
    if (imageNumber) {
      this._imageService.setImageAtIndexAsCurrent(imageNumber - 1);
    }
  };
  
  private onPreviewerScroll = async (e: Event) => {
    await this.renderVisibleAsync();
  };
}
