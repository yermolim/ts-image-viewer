import { clamp, Vec2, getDistance2D } from "mathador";

import { textDialogHtml } from "../assets/index.html";

import { htmlToElements } from "../common/dom";
import { imageChangeEvent, ImageEvent } from "../common/events";
import { ImageInfoView } from "../common/image-info";
import { ImageService } from "../services/image-service";

export const viewerModes = ["hand", "annotation"] as const;
export type ViewerMode =  typeof viewerModes[number];

export interface ViewerOptions {
  minImageSize?: number;
}

export class Viewer {
  private readonly _minImageSize: number;

  private readonly _imageService: ImageService;
  private readonly _container: HTMLDivElement;
  get container(): HTMLDivElement {
    return this._container;
  }

  private _mode: ViewerMode;  
  get mode(): ViewerMode {
    return this._mode;
  }
  set mode(value: ViewerMode) {
    // close an opened dialog if present
    if (this._dialogClose) {
      this._dialogClose();
    }

    if (!value || value === this._mode) {
      return;
    }

    this._mode = value;
  }

  private _scale = 1;
  get scale(): number {
    return this._scale;
  }

  /**information about the last pointer position */
  private _pointerInfo = {
    lastPos: <Vec2>null,
    downPos: <Vec2>null,
    downScroll: <Vec2>null, 
  };
  /**the object used for touch zoom handling */
  private _pinchInfo = {
    active: false,
    lastDist: 0,
    minDist: 10,
    sensitivity: 0.025,
    target: <HTMLElement>null,
  };

  private _dialogClose: () => void;

  constructor(imageService: ImageService, container: HTMLDivElement, options?: ViewerOptions) {
    if (!imageService) {
      throw new Error("Image service is not defined");
    }
    if (!container) {
      throw new Error("Container is not defined");
    }
    
    this._imageService = imageService;
    this._container = container;

    this._minImageSize = options?.minImageSize || 100;

    this.init();
  } 
  
  destroy() {
    this._imageService.eventService.removeListener(imageChangeEvent, this.onImageChange);

    this._container.removeEventListener("scroll", this.onScroll);
    this._container.removeEventListener("wheel", this.onWheelZoom);
    this._container.removeEventListener("pointermove", this.onPointerMove);
    this._container.removeEventListener("pointerdown", this.onPointerDownScroll);    
    this._container.removeEventListener("touchstart", this.onTouchZoom);    
  }

  zoomOut() {
    this.zoomOutCentered();
  }

  zoomIn() {
    this.zoomInCentered();
  }
  
  zoomFitViewer() {
    const cWidth = this._container.getBoundingClientRect().width;
    const pWidth = this._imageService.currentImageView
      .viewContainer.getBoundingClientRect().width;
    const scale = (cWidth  - 20) / pWidth * this._scale;
    this.setScale(scale);
  }
  
  zoomFitImage() {
    const { width: cWidth, height: cHeight } = this._container.getBoundingClientRect();
    const { width: pWidth, height: pHeight } = this._imageService.currentImageView
      .viewContainer.getBoundingClientRect();
    const hScale = (cWidth - 20) / pWidth * this._scale;
    const vScale = (cHeight - 20) / pHeight * this._scale;
    this.setScale(Math.min(hScale, vScale));
  }  
  
  async showTextDialogAsync(initialText: string): Promise<string> {
    if (this._dialogClose) {
      // can't open multiple dialogs at the same time
      return;
    }

    const dialog = htmlToElements(textDialogHtml)[0];
    dialog.style.top = this._container.scrollTop + "px";
    dialog.style.left = this._container.scrollLeft + "px";

    this._container.append(dialog);
    this._container.classList.add("dialog-shown");

    let value = initialText || "";      
    const input = dialog.querySelector(".text-input") as HTMLTextAreaElement;
    input.placeholder = "Enter text...";
    input.value = value;
    input.addEventListener("change", () => value = input.value);

    const textPromise = new Promise<string>((resolve, reject) => {

      const ok = () => {
        resolve(value || "");
      };
      const cancel = () => {
        resolve(null);
      };

      dialog.addEventListener("click", (e: Event) => {
        if (e.target === dialog) {
          cancel();
        }
      });      
      dialog.querySelector(".text-ok").addEventListener("click", ok);
      dialog.querySelector(".text-cancel").addEventListener("click", cancel);
      
      // save the dialog close callback to the viewer property
      this._dialogClose = () => resolve(null);
    });

    const result = await textPromise;

    this._dialogClose = null;
    dialog.remove();
    this._container.classList.remove("dialog-shown");
    
    return result;
  }

  private init() {
    this._container.addEventListener("scroll", this.onScroll);
    this._container.addEventListener("wheel", this.onWheelZoom, {passive: false});
    this._container.addEventListener("pointermove", this.onPointerMove);
    this._container.addEventListener("pointerdown", this.onPointerDownScroll);    
    this._container.addEventListener("touchstart", this.onTouchZoom);  

    this._imageService.eventService.addListener(imageChangeEvent, this.onImageChange);
  }

  private async renderImageAsync(image: ImageInfoView) {    
    image.scale = this._scale;
    await image.renderViewAsync(false);
    this._container.innerHTML = "";
    this._container.append(image.viewWrapper);
    this.zoomFitImage();
    this._imageService.emitRendered([image]);
  }
  
  private onImageChange = async (e: ImageEvent) => {
    if (e.detail.type === "select") {
      const selectedImageView = e.detail.imageViews[0];
      await this.renderImageAsync(selectedImageView);
    }
  };  

  private onPointerMove = (event: PointerEvent) => {
    const {clientX, clientY} = event;
    this._pointerInfo.lastPos = new Vec2(clientX, clientY);
  };

  private onScroll = (e: Event) => {

  };  

  private onPointerDownScroll = (e: PointerEvent) => { 
    if (this._mode !== "hand") {
      return;
    }
    
    const {clientX, clientY} = e;
    this._pointerInfo.downPos = new Vec2(clientX, clientY);
    this._pointerInfo.downScroll = new Vec2(this._container.scrollLeft,this._container.scrollTop);    

    const onPointerMove = (moveEvent: PointerEvent) => {
      const {x, y} = this._pointerInfo.downPos;
      const {x: left, y: top} = this._pointerInfo.downScroll;
      const dX = moveEvent.clientX - x;
      const dY = moveEvent.clientY - y;
      this._container.scrollTo(left - dX, top - dY);
    };
    
    const onPointerUp = (upEvent: PointerEvent) => {
      this._pointerInfo.downPos = null;
      this._pointerInfo.downScroll = null;

      const upTarget = upEvent.target as HTMLElement;
      upTarget.removeEventListener("pointermove", onPointerMove);
      upTarget.removeEventListener("pointerup", onPointerUp);
      upTarget.removeEventListener("pointerout", onPointerUp);
      upTarget.releasePointerCapture(upEvent.pointerId); 
    };

    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    target.addEventListener("pointermove", onPointerMove);
    target.addEventListener("pointerup", onPointerUp);
    target.addEventListener("pointerout", onPointerUp);
  };

  //#region zoom(scale)
  private setScale(scale: number, cursorPosition: Vec2 = null) {
    const imageView = this?._imageService?.currentImageView;
    if (!scale || !imageView) {
      return;
    }

    cursorPosition ||= this.getCenterPosition();
    const {x, y} = cursorPosition;
    const {x: imageX, y: imageY, width: imageWidth, height: imageHeight} = 
      imageView.viewContainer.getBoundingClientRect();

    const minScale = this._minImageSize / imageView.imageInfo.dimensions.x;
    if (scale < minScale) {
      scale = minScale;
    }

    if (scale === this._scale) {
      return;
    }

    let imageUnderCursor: boolean;
    let xImageRatio: number;
    let yImageRatio: number;
      
    // check if the image is under the cursor
    if (imageX <= x 
      && imageX + imageWidth >= x
      && imageY <= y
      && imageY + imageHeight >= y) {          
      // get cursor position relative to image dimensions before scaling
      imageUnderCursor = true;
      xImageRatio = (x - imageX) / imageWidth;
      yImageRatio = (y - imageY) / imageHeight;
    }

    this._scale = scale;
    this._imageService.scale = scale;

    // emit state changed event to notify subscribers about scale change
    this._imageService.emitStateChanged();
        
    if (imageUnderCursor) {      
      const {x: imageScaledX, y: imageScaledY, width: imageScaledWidth, height: imageScaledHeight} = 
        imageView.viewContainer.getBoundingClientRect();
        
      let scrollLeft: number;
      let scrollTop: number;

      if (imageScaledWidth > this._container.clientHeight 
        || imageScaledHeight > this._container.clientWidth) {
        // the viewer has scrollbars   

        // get the position of the point under cursor after scaling   
        const {x: initialX, y: initialY} = cursorPosition;
        const resultX = imageScaledX + (imageScaledWidth * xImageRatio);
        const resultY = imageScaledY + (imageScaledHeight * yImageRatio);
  
        // scroll image to move the point to its initial position in the viewport
        scrollLeft = this._container.scrollLeft + (resultX - initialX);
        scrollTop = this._container.scrollTop + (resultY - initialY);
        scrollLeft = scrollLeft < 0 
          ? 0 
          : scrollLeft;
        scrollTop = scrollTop < 0
          ? 0
          : scrollTop;
      } else {
        // the viewer shouldn't have scrollbars, 
        // reset scroll offsets to be sure that no scrollbars will remain
        scrollLeft = 0;
        scrollTop = 0;
      }

      if (scrollTop !== this._container.scrollTop
        || scrollLeft !== this._container.scrollLeft) {      
        // scroll need to change
        this._container.scrollTo(scrollLeft, scrollTop);
        // render will be called from the scroll event handler so no need to call it from here
        return;
      }  
    }
  }

  private zoom(diff: number, cursorPosition: Vec2 = null) {
    const scale = this._scale + diff;
    this.setScale(scale, cursorPosition || this.getCenterPosition());
  }

  private zoomOutCentered(center: Vec2 = null) {
    this.zoom(-this.getZoomStep(), center);
  }
  
  private zoomInCentered(center: Vec2 = null) {
    this.zoom(this.getZoomStep(), center);
  }

  private getCenterPosition(): Vec2 {
    const {x, y, width, height} = this._container.getBoundingClientRect();
    return new Vec2(x + width / 2, y + height / 2);
  }

  private getZoomStep(): number {    
    let step = 0;
    if (this._scale < 0.5) {
      step = 0.1;
    } else if (this._scale < 1) {
      step = 0.25;
    } else if (this._scale < 2) {
      step = 0.5;
    } else {
      step = 1;
    }
    return step;
  }
  
  private onWheelZoom = (event: WheelEvent) => {
    if (!event.ctrlKey) {
      return;
    }

    event.preventDefault();
    if (event.deltaY > 0) {
      this.zoomOutCentered(this._pointerInfo.lastPos);
    } else {
      this.zoomInCentered(this._pointerInfo.lastPos);
    }
  };  

  private onTouchZoom = (event: TouchEvent) => { 
    if (event.touches.length !== 2) {
      return;
    }    

    const a = event.touches[0];
    const b = event.touches[1];    
    this._pinchInfo.active = true;
    this._pinchInfo.lastDist = getDistance2D(a.clientX, a.clientY, b.clientX, b.clientY);

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 2) {
        return;
      }

      const mA = moveEvent.touches[0];
      const mB = moveEvent.touches[1];    
      const dist = getDistance2D(mA.clientX, mA.clientY, mB.clientX, mB.clientY);
      const delta = dist - this._pinchInfo.lastDist;
      const factor = Math.floor(delta / this._pinchInfo.minDist);  

      if (factor) {
        const center = new Vec2((mB.clientX + mA.clientX) / 2, (mB.clientY + mA.clientY) / 2);
        this._pinchInfo.lastDist = dist;
        this.zoom(factor * this._pinchInfo.sensitivity, center);
      }
    };
    
    const onTouchEnd = (endEvent: TouchEvent) => {
      this._pinchInfo.active = false;
      this._pinchInfo.lastDist = 0;

      (<HTMLElement>event.target).removeEventListener("touchmove", onTouchMove);
      (<HTMLElement>event.target).removeEventListener("touchend", onTouchEnd);
      (<HTMLElement>event.target).removeEventListener("touchcancel", onTouchEnd);
    };

    (<HTMLElement>event.target).addEventListener("touchmove", onTouchMove);
    (<HTMLElement>event.target).addEventListener("touchend", onTouchEnd);
    (<HTMLElement>event.target).addEventListener("touchcancel", onTouchEnd);
  };
  //#endregion
}
