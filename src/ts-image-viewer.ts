/* eslint-disable @typescript-eslint/no-use-before-define */
import { html } from "./assets/index.html";
import { styles } from "./assets/styles.html";

import { getDistance, Quadruple } from "./common";
import { clamp, Vec2 } from "mathador";

import { ContextMenu } from "./elements/context-menu";

import { AnnotationDto, AnnotEvent, AnnotEventDetail } from "./annotations/annotation";
import { PathChangeEvent } from "./annotations/pen-annotation";
import { Annotator } from "./annotator/annotator";
import { PenAnnotator } from "./annotator/pen-annotator";

import { ImageEvent, ImageLoadInfo, ViewerData } from "./viewer/viewer-data";
import { ImageView } from "./image/image-view";

type ViewerMode = "hand" | "annotation";
type AnnotatorMode = "select" | "pen";

type FileButtons = "open" | "save" | "close";

export interface TsImageViewerOptions {
  /**parent container CSS selector */
  containerSelector: string;
  /**current user name (used for annotations) */
  userName?: string;

  /**list of the file interaction buttons shown */
  fileButtons?: FileButtons[];
  /**action to execute instead of the default file open action */
  fileOpenAction?: () => void;
  /**action to execute instead of the default file download action */
  fileSaveAction?: () => void;
  fileCloseAction?: () => void;

  /**action to execute on annotation change event */
  annotChangeCallback?: (detail: AnnotEventDetail) => void;
}

export {AnnotationDto, AnnotEvent, AnnotEventDetail, ImageLoadInfo};

export class TsImageViewer {
  //#region private fields
  private readonly _userName: string;

  // TODO: move readonly properties to the main options
  /**count of the prerendered previews outside of the current preview viewport */
  private readonly _visibleAdjPreviews = 0;
  private readonly _previewWidth = 100;
  private readonly _minScale = 0.125;
  private readonly _maxScale = 8;
  private _scale = 1;

  private _outerContainer: HTMLDivElement;
  private _shadowRoot: ShadowRoot;

  private _mainContainer: HTMLDivElement;
  private _mainContainerRObserver: ResizeObserver;
  private _panelsHidden: boolean;
  private _fileInput: HTMLInputElement;

  private _previewer: HTMLDivElement;
  private _previewerHidden = true;

  private _viewer: HTMLDivElement;
  private _viewerMode: ViewerMode;
  private _viewerData: ViewerData;

  private _contextMenu: ContextMenu;
  private _contextMenuEnabled: boolean;

  private _annotatorMode: AnnotatorMode;
  private _annotator: Annotator;
  private _annotChangeCallback: (detail: AnnotEventDetail) => void;

  private _fileOpenAction: () => void;
  private _fileSaveAction: () => void;
  private _fileCloseAction: () => void;
  
  /**information about the last pointer position */
  private _pointerInfo = {
    lastPos: <Vec2>null,
    downPos: <Vec2>null,
    downScroll: <Vec2>null, 
  };
  /**common timers */
  private _timers = {    
    hidePanels: 0,
  };
  /**the object used for touch zoom handling */
  private _pinchInfo = {
    active: false,
    lastDist: 0,
    minDist: 10,
    sensitivity: 0.025,
    target: <HTMLElement>null,
  };
  //#endregion

  constructor(options: TsImageViewerOptions) {
    if (!options) {
      throw new Error("No options provided");
    }

    const container = document.querySelector(options.containerSelector);
    if (!container) {
      throw new Error("Container not found");
    } else if (!(container instanceof HTMLDivElement)) {
      throw new Error("Container is not a DIV element");
    } else {
      this._outerContainer = container;
    }

    this._userName = options.userName || "Guest";
    this._fileOpenAction = options.fileOpenAction;
    this._fileSaveAction = options.fileSaveAction;
    this._fileCloseAction = options.fileCloseAction;
    this._annotChangeCallback = options.annotChangeCallback;

    this._viewerData = new ViewerData({previewWidth: this._previewWidth});

    this._shadowRoot = this._outerContainer.attachShadow({mode: "open"});
    this._shadowRoot.innerHTML = styles + html;         

    this.initMainDivs();
    this.initViewControls();
    this.initFileButtons(options.fileButtons || []);
    this.initModeSwitchButtons();
    this.initAnnotationButtons();
    
    document.addEventListener("tsimage-imagechange", this.onImageChange);
    document.addEventListener("tsimage-annotchange", this.onAnnotationChange);  
  }

  /**create a temp download link and click on it */
  private static downloadFile(blob: Blob, name?: string) {
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("download", name);
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  /**free the object resources to let GC clean them to avoid memory leak */
  destroy() {
    document.removeEventListener("tsimage-imagechange", this.onImageChange);
    document.removeEventListener("tsimage-annotchange", this.onAnnotationChange);
    this._annotChangeCallback = null;

    this._annotator?.destroy();
    this._viewerData.destroy(); 

    this._contextMenu?.destroy();
    this._mainContainerRObserver?.disconnect();
    this._shadowRoot.innerHTML = "";
  }  
  
  /**
   * 
   * @param loadInfos array of objects with an information about files being loaded
   */
  async openImagesAsync(loadInfos: ImageLoadInfo[]): Promise<void> {
    try {
      await this._viewerData.addImagesAsync(loadInfos);
    } catch (e) {
      throw new Error(`Cannot load file data: ${e.message}`);
    }
    this.refreshImages();
  }

  /**close all opened images */
  closeImages(): void {
    this._viewerData.clearImages();
    this.refreshImages();
  }
  
  /**
   * import previously exported TsImage annotations
   * @param dtos annotation data transfer objects
   */
  importAnnotations(dtos: AnnotationDto[]) {
    try {
      this._viewerData.appendSerializedAnnotations(dtos);
    } catch (e) {
      console.log(`Error while importing annotations: ${e.message}`);      
    }
  }
  
  /**
   * export TsImage annotations as data transfer objects
   * @param imageUuid if omitted, annotations from all opened images will be exported
   * @returns 
   */
  exportAnnotations(imageUuid?: string): AnnotationDto[] {
    const dtos = this._viewerData.serializeAnnotations(imageUuid);
    return dtos;
  }
  
  /**
   * import previously exported serialized TsImage annotations
   * @param json serialized annotation data transfer objects
   */
  importAnnotationsFromJson(json: string) {
    try {
      const dtos: AnnotationDto[] = JSON.parse(json);
      this._viewerData.appendSerializedAnnotations(dtos);
    } catch (e) {
      console.log(`Error while importing annotations: ${e.message}`);      
    }
  }
  
  /**
   * export TsImage annotations as a serialized array of data transfer objects
   * @param imageUuid if omitted, annotations from all opened images will be exported
   * @returns json string
   */
  exportAnnotationsToJson(imageUuid?: string): string {
    const dtos = this._viewerData.serializeAnnotations(imageUuid);
    return JSON.stringify(dtos);
  }

  //#region GUI initialization methods
  private initMainDivs() {
    const mainContainer = this._shadowRoot.querySelector("div#main-container") as HTMLDivElement;

    const mcResizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {    
      const {width} = this._mainContainer.getBoundingClientRect();
      if (width < 721) {      
        this._mainContainer.classList.add("mobile");
      } else {      
        this._mainContainer.classList.remove("mobile");
      }
      this._contextMenu.hide();
      this._annotator?.refreshViewBox();
    });
    mcResizeObserver.observe(mainContainer);

    this._mainContainer = mainContainer;
    this._mainContainerRObserver = mcResizeObserver;  

    this._contextMenu = new ContextMenu();
    this._previewer = this._shadowRoot.querySelector("#previewer");
    this._viewer = this._shadowRoot.querySelector("#viewer") as HTMLDivElement;
    this._viewer.addEventListener("contextmenu", (e: MouseEvent) => {
      if (this._contextMenuEnabled) {
        e.preventDefault();
        this._contextMenu.show(new Vec2(e.clientX, e.clientY), this._mainContainer);
      }
    });
  }
  
  /**add event listemers to interface general buttons */
  private initViewControls() { 
    this._shadowRoot.querySelector("#paginator-prev")
      .addEventListener("click", this.onPaginatorPrevClick);
    this._shadowRoot.querySelector("#paginator-next")
      .addEventListener("click", this.onPaginatorNextClick);
      
    this._shadowRoot.querySelector("#rotate-counterclockwise")
      .addEventListener("click", this.onRotateCounterClockwiseClick);
    this._shadowRoot.querySelector("#rotate-clockwise")
      .addEventListener("click", this.onRotateClockwiseClick);

    this._shadowRoot.querySelector("#zoom-out")
      .addEventListener("click", this.onZoomOutClick);
    this._shadowRoot.querySelector("#zoom-in")
      .addEventListener("click", this.onZoomInClick);
    this._shadowRoot.querySelector("#zoom-fit-viewer")
      .addEventListener("click", this.onZoomFitViewerClick);
    this._shadowRoot.querySelector("#zoom-fit-image")
      .addEventListener("click", this.onZoomFitImageClick);

    this._shadowRoot.querySelector("#toggle-previewer")
      .addEventListener("click", this.onPreviewerToggleClick);

    this._previewer.addEventListener("scroll", this.onPreviewerScroll);
    this._viewer.addEventListener("scroll", this.onViewerScroll);
    this._viewer.addEventListener("wheel", this.onViewerWheelZoom, {passive: false});
    this._viewer.addEventListener("pointermove", this.onViewerPointerMove);
    this._viewer.addEventListener("pointerdown", this.onViewerPointerDownScroll);    
    this._viewer.addEventListener("touchstart", this.onViewerTouchZoom);     
  }

  private initFileButtons(fileButtons: FileButtons[]) {
    const openButton = this._shadowRoot.querySelector("#button-open-file");
    const saveButton = this._shadowRoot.querySelector("#button-save-file");
    const closeButton = this._shadowRoot.querySelector("#button-close-file");

    if (fileButtons.includes("open")) {
      this._fileInput = this._shadowRoot.getElementById("open-file-input") as HTMLInputElement;
      this._fileInput.addEventListener("change", this.onFileInput);
      openButton.addEventListener("click", this._fileOpenAction || this.onOpenFileButtonClick);
    } else {
      openButton.remove();
    }

    if (fileButtons.includes("save")) {
      saveButton.addEventListener("click", this._fileSaveAction || this.onSaveFileButtonClick);
    } else {
      saveButton.remove();
    }
    
    if (fileButtons.includes("close")) {
      closeButton.addEventListener("click", this._fileCloseAction || this.onCloseFileButtonClick);
    } else {
      closeButton.remove();
    }
  }

  //#region default file buttons actions
  private onFileInput = () => {
    const files = this._fileInput.files;    
    if (files.length === 0) {
      return;
    }

    const imageLoadInfos: ImageLoadInfo[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageLoadInfo: ImageLoadInfo = {
        type: "Blob",
        data: file,
      };
      imageLoadInfos.push(imageLoadInfo);
    }

    this._fileInput.value = null;

    this.openImagesAsync(imageLoadInfos);
  };

  private onOpenFileButtonClick = () => {    
    this._shadowRoot.getElementById("open-file-input").click();
  };

  private onSaveFileButtonClick = async () => {
    const blob = await this._viewerData.bakeImageAnnotationsAsync();
    if (!blob) {
      return;
    }

    TsImageViewer.downloadFile(blob, `img_${new Date().toISOString()}.png`);
  };
  
  private onCloseFileButtonClick = () => {
    this.closeImages();
  };
  //#endregion

  private initModeSwitchButtons() {
    this._shadowRoot.querySelector("#button-mode-hand")
      .addEventListener("click", this.onHandModeButtonClick);
    this._shadowRoot.querySelector("#button-mode-annotation")
      .addEventListener("click", this.onAnnotationModeButtonClick);
    this.setViewerMode("hand");    
  }

  private initAnnotationButtons() {
    // mode buttons
    this._shadowRoot.querySelector("#button-annotation-mode-select")
      .addEventListener("click", this.onAnnotatorSelectModeButtonClick);
    this._shadowRoot.querySelector("#button-annotation-mode-pen")
      .addEventListener("click", this.onAnnotatorPenModeButtonClick);

    // select buttons
    this._shadowRoot.querySelector("#button-annotation-delete")
      .addEventListener("click", this.onAnnotationDeleteButtonClick);     

    // pen buttons
    this._viewer.addEventListener("tsimage-penpathchange", (e: PathChangeEvent) => {
      if (e.detail.pathCount) {
        this._mainContainer.classList.add("pen-path-present");
      } else {
        this._mainContainer.classList.remove("pen-path-present");
      }
    });
    this._shadowRoot.querySelector("#button-annotation-pen-undo")
      .addEventListener("click", () => {
        if (this._annotator instanceof PenAnnotator) {
          this._annotator.undoPath();
        }
      });
    this._shadowRoot.querySelector("#button-annotation-pen-clear")
      .addEventListener("click", () => {
        if (this._annotator instanceof PenAnnotator) {
          this._annotator.clearPaths();
        }
      });
    this._shadowRoot.querySelector("#button-annotation-pen-save")
      .addEventListener("click", () => {
        if (this._annotator instanceof PenAnnotator) {
          const {imageUuid, annotation} = this._annotator.savePathsAsPenAnnotation(this._userName);
          this._viewerData.appendAnnotationToImage(imageUuid, annotation);
        }
      });
  }
  //#endregion


  //#region open/close private
  private refreshImages(): void {
    const imageCount = this._viewerData.imageCount;

    if (!imageCount) { // all images closed
      if (this?._annotator) {
        this._annotator.destroy();
        this._annotator = null;
      }
      // disable interface
      this._mainContainer.classList.add("disabled");
      // reset modes
      this.setViewerMode("hand");
      this.setAnnotatorMode("select");  
      // hide previewer
      this.togglePreviewer(false);
      return;
    }

    // enable interface
    this._mainContainer.classList.remove("disabled");    
    // remove previous previews
    this._previewer.innerHTML = "";
    // remove old image container    
    this._viewer.innerHTML = "";
    // add current image container
    this._viewer.append(this._viewerData.currentImageView?.viewWrapper);

    if (imageCount === 1) { // only one image opened
      // hide previewer
      this.togglePreviewer(false); 
      this._shadowRoot.querySelector("#previewer-toggler").classList.add("disabled");
      // disable paginator
      this._shadowRoot.querySelector("#paginator").classList.add("disabled");
    } else {
      // set scale and add new previews
      this._shadowRoot.querySelector("#previewer-toggler").classList.remove("disabled");
      for (const imageView of this._viewerData.imageViews) {
        imageView.scale = this._scale;
        imageView.previewContainer.addEventListener("click", this.onPreviewerImageClick);
        this._previewer.append(imageView.previewContainer);
      }
      this.renderVisiblePreviews();
      // enable paginator
      this._shadowRoot.querySelector("#paginator").classList.remove("disabled");
    }
  }
  //#endregion


  //#region previewer
  /**
   * show or hide previewer
   * @param show true: show, false|undefined: hide
   */
  private togglePreviewer(show: boolean) {    
    if (show) {
      this._mainContainer.classList.remove("hide-previewer");
      this._shadowRoot.querySelector("div#toggle-previewer").classList.add("on");
      this._previewerHidden = false;
      setTimeout(() => this.renderVisiblePreviews(), 1000);
    } else {      
      this._mainContainer.classList.add("hide-previewer");
      this._shadowRoot.querySelector("div#toggle-previewer").classList.remove("on");
      this._previewerHidden = true;
    }
  }

  private scrollToCurrentPreview() { 
    const {top: cTop, height: cHeight} = this._previewer.getBoundingClientRect();
    const {top: pTop, height: pHeight} = this._viewerData.currentImageView
      .previewContainer.getBoundingClientRect();

    const cCenter = cTop + cHeight / 2;
    const pCenter = pTop + pHeight / 2;

    const scroll = pCenter - cCenter + this._previewer.scrollTop;
    this._previewer.scrollTo(0, scroll);
  }
  
  private onPreviewerToggleClick = () => {
    this.togglePreviewer(this._previewerHidden);
  };

  private onPreviewerImageClick = (e: Event) => {
    let target = <HTMLElement>e.target;
    let imageNumber: number;
    while (target && !imageNumber) {
      const data = target.dataset["imageIndex"];
      if (data) {
        imageNumber = +data;
      } else {
        target = target.parentElement;
      }
    }    
    if (imageNumber) {
      this._viewerData.setImageAtIndexAsCurrent(imageNumber - 1);
    }
  };
  
  private onPreviewerScroll = (e: Event) => {
    this.renderVisiblePreviews();
  };
  //#endregion
 

  //#region viewer  
  private onViewerPointerMove = (event: PointerEvent) => {
    const {clientX, clientY} = event;
    const {x: rectX, y: rectY, width, height} = this._viewer.getBoundingClientRect();

    const l = clientX - rectX;
    const t = clientY - rectY;
    const r = width - l;
    const b = height - t;

    // hide the top and bottom panels if the cursor is far from the container edge
    if (Math.min(l, r, t, b) > 100) {
      if (!this._panelsHidden && !this._timers.hidePanels) {
        this._timers.hidePanels = setTimeout(() => {
          this._mainContainer.classList.add("hide-panels");
          this._panelsHidden = true;
          this._timers.hidePanels = null;
        }, 5000);
      }      
    } else {
      if (this._timers.hidePanels) {
        clearTimeout(this._timers.hidePanels);
        this._timers.hidePanels = null;
      }
      if (this._panelsHidden) {        
        this._mainContainer.classList.remove("hide-panels");
        this._panelsHidden = false;
      }
    }

    this._pointerInfo.lastPos = new Vec2(clientX, clientY);
  };

  //#region viewer modes
  private setViewerMode(mode: ViewerMode) {
    if (!mode || mode === this._viewerMode) {
      return;
    }
    this.disableCurrentViewerMode();
    switch (mode) {
      case "hand":
        this._mainContainer.classList.add("mode-hand");
        this._shadowRoot.querySelector("#button-mode-hand").classList.add("on");
        break;
      case "annotation":
        this._mainContainer.classList.add("mode-annotation");
        this._shadowRoot.querySelector("#button-mode-annotation").classList.add("on");
        break;
      default:
        // Execution should not come here
        throw new Error(`Invalid viewer mode: ${mode}`);
    }
    this._viewerMode = mode;
  }

  private disableCurrentViewerMode() { 
    this._contextMenu.clear();
    this._contextMenuEnabled = false;
    
    switch (this._viewerMode) {
      case "hand":
        this._mainContainer.classList.remove("mode-hand");
        this._shadowRoot.querySelector("#button-mode-hand").classList.remove("on");
        break;
      case "annotation":
        this._mainContainer.classList.remove("mode-annotation");
        this._shadowRoot.querySelector("#button-mode-annotation").classList.remove("on");
        this.setAnnotatorMode("select");
        break;
      default:
        // mode hasn't been set yet. do nothing
        break;
    }
  }

  private onHandModeButtonClick = () => {
    this.setViewerMode("hand");
  };
  
  private onAnnotationModeButtonClick = () => {
    this.setViewerMode("annotation");
  };
  //#endregion

  //#region viewer scroll  
  private onViewerScroll = (e: Event) => {
    this._contextMenu.hide();
    this._viewerData.currentImageView.renderView();
  };  

  private onViewerPointerDownScroll = (event: PointerEvent) => { 
    if (this._viewerMode !== "hand") {
      return;
    }
    
    const {clientX, clientY} = event;
    this._pointerInfo.downPos = new Vec2(clientX, clientY);
    this._pointerInfo.downScroll = new Vec2(this._viewer.scrollLeft,this._viewer.scrollTop);    

    const onPointerMove = (moveEvent: PointerEvent) => {
      const {x, y} = this._pointerInfo.downPos;
      const {x: left, y: top} = this._pointerInfo.downScroll;
      const dX = moveEvent.clientX - x;
      const dY = moveEvent.clientY - y;
      this._viewer.scrollTo(left - dX, top - dY);
    };
    
    const onPointerUp = (upEvent: PointerEvent) => {
      this._pointerInfo.downPos = null;
      this._pointerInfo.downScroll = null;

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointerout", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointerout", onPointerUp);
  };
  //#endregion

  //#region viewer image zoom
  private setScale(scale: number, cursorPosition?: Vec2) {
    const imageView = this?._viewerData?.currentImageView;
    if (!scale || scale === this._scale || !imageView) {
      return;
    }

    cursorPosition ||= this.getViewerCenterPosition();

    let imageUnderCursor: boolean;
    let xImageRatio: number;
    let yImageRatio: number;
    
    const {x, y} = cursorPosition;
    const {x: imageX, y: imageY, width: imageWidth, height: imageHeight} = 
      imageView.viewContainer.getBoundingClientRect();
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

    this._contextMenu.hide();
    this._scale = scale;    
    imageView.scale = scale;
    // refresh annotator scale
    if (this._annotator) {
      this._annotator.scale = scale;
    }   
    
    if (imageUnderCursor) {      
      const {x: imageScaledX, y: imageScaledY, width: imageScaledWidth, height: imageScaledHeight} = 
        imageView.viewContainer.getBoundingClientRect();
        
      let scrollLeft: number;
      let scrollTop: number;

      if (imageScaledWidth > this._viewer.clientHeight 
        || imageScaledHeight > this._viewer.clientWidth) {
        // the viewer has scrollbars   

        // get the position of the point under cursor after scaling   
        const {x: initialX, y: initialY} = cursorPosition;
        const resultX = imageScaledX + (imageScaledWidth * xImageRatio);
        const resultY = imageScaledY + (imageScaledHeight * yImageRatio);
  
        // scroll image to move the point to its initial position in the viewport
        scrollLeft = this._viewer.scrollLeft + (resultX - initialX);
        scrollTop = this._viewer.scrollTop + (resultY - initialY);
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

      if (scrollTop !== this._viewer.scrollTop
        || scrollLeft !== this._viewer.scrollLeft) {      
        // scroll need to change
        this._viewer.scrollTo(scrollLeft, scrollTop);
        // render will be called from the scroll event handler so no need to call it from here
        return;
      }   
    }
 
    // use timeout to let browser update image layout
    setTimeout(() => this._viewerData.currentImageView.renderView(), 0);
  }

  private zoom(step: number, cursorPosition?: Vec2) {
    const scale = clamp(this._scale + step, this._minScale, this._maxScale);
    this.setScale(scale, cursorPosition);
  }

  private zoomOut(cursorPosition: Vec2 = null) {
    const scale = this._scale; 
    let step: number;
    if (scale <= 1) {
      step = -0.125;
    } else if (scale <= this._maxScale / 2) {
      step = -0.25;
    } else {
      step = -0.5;
    }
    this.zoom(step, cursorPosition);
  }
  
  private zoomIn(cursorPosition: Vec2 = null) { 
    const scale = this._scale; 
    let step: number;
    if (scale < 1) {
      step = 0.125;
    } else if (scale < this._maxScale / 2) {
      step = 0.25;
    } else {
      step = 0.5;
    }
    this.zoom(step, cursorPosition);
  }

  private zoomFitViewer() {  
    const cWidth = this._viewer.getBoundingClientRect().width;
    const iWidth = this._viewerData.currentImageView
      .viewContainer.getBoundingClientRect().width;
    const scale = clamp((cWidth  - 20) / iWidth * this._scale, this._minScale, this._maxScale);

    console.log(scale);

    this.setScale(scale);
  }

  private zoomFitImage() { 
    const { width: cWidth, height: cHeight } = this._viewer.getBoundingClientRect();
    const { width: pWidth, height: pHeight } = this._viewerData.currentImageView
      .viewContainer.getBoundingClientRect();
    const hScale = clamp((cWidth - 20) / pWidth * this._scale, this._minScale, this._maxScale);
    const vScale = clamp((cHeight - 20) / pHeight * this._scale, this._minScale, this._maxScale);
    this.setScale(Math.min(hScale, vScale));
  }

  private getViewerCenterPosition(): Vec2 {
    const {x, y, width, height} = this._viewer.getBoundingClientRect();
    return new Vec2(x + width / 2, y + height / 2);
  }
  
  private onViewerWheelZoom = (event: WheelEvent) => {
    if (!event.ctrlKey) {
      return;
    }

    event.preventDefault();
    if (event.deltaY > 0) {
      this.zoomOut(this._pointerInfo.lastPos);
    } else {
      this.zoomIn(this._pointerInfo.lastPos);
    }
  };  

  private onViewerTouchZoom = (event: TouchEvent) => { 
    if (event.touches.length !== 2) {
      return;
    }    

    const a = event.touches[0];
    const b = event.touches[1];    
    this._pinchInfo.active = true;
    this._pinchInfo.lastDist = getDistance(a.clientX, a.clientY, b.clientX, b.clientY);

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 2) {
        return;
      }

      const mA = moveEvent.touches[0];
      const mB = moveEvent.touches[1];    
      const dist = getDistance(mA.clientX, mA.clientY, mB.clientX, mB.clientY);
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

  private onZoomOutClick = () => {
    this.zoomOut();
  };

  private onZoomInClick = () => {
    this.zoomIn();
  };
  
  private onZoomFitViewerClick = () => {
    this.zoomFitViewer();
  };
  
  private onZoomFitImageClick = () => {
    this.zoomFitImage();
  };
  //#endregion

  //#region viewer image rotation
  private onRotateCounterClockwiseClick = () => {
    this._viewerData.currentImageView?.rotateCounterClockwise();
    this.setAnnotatorMode(this._annotatorMode, true);
  };
  
  private onRotateClockwiseClick = () => {
    this._viewerData.currentImageView?.rotateClockwise();
    this.setAnnotatorMode(this._annotatorMode, true);
  };
  //#endregion

  //#endregion


  //#region images and paginator
  /**
   * get image previews that are visible in the previewer viewport at the moment
   * @param container 
   * @param images 
   * @returns 
   */
  private getVisiblePreviewImages(container: HTMLDivElement, images: ImageView[]): Set<number> {
    const imagesVisible = new Set<number>();
    if (!images.length) {
      return imagesVisible;
    }

    const cRect = container.getBoundingClientRect();
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
   * @returns 
   */
  private renderVisiblePreviews() {
    if (this._previewerHidden) {
      return;
    }

    const images = this._viewerData.imageViews;
    const visiblePreviewNumbers = this.getVisiblePreviewImages(this._previewer, images);
    
    const minImageNumber = Math.max(Math.min(...visiblePreviewNumbers) - this._visibleAdjPreviews, 0);
    const maxImageNumber = Math.min(Math.max(...visiblePreviewNumbers) + this._visibleAdjPreviews, images.length - 1);

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (i >= minImageNumber && i <= maxImageNumber) {
        image.renderPreview();
      }
    }
  }
  
  private onPaginatorPrevClick = () => {
    this._viewerData.setPreviousImageAsCurrent();
  };

  private onPaginatorNextClick = () => {
    this._viewerData.setNextImageAsCurrent();
  };

  private onImageChange = (e: ImageEvent) => {
    if (e.detail.type === "select") {
      const selectedImageView = e.detail.imageViews[0];
      selectedImageView.scale = this._scale;
      selectedImageView.renderView();
      this.scrollToCurrentPreview();
      this._viewer.innerHTML = "";
      this._viewer.append(selectedImageView.viewWrapper);
      this.zoomFitImage();

      // reset annotator
      this.setAnnotatorMode(this._annotatorMode, true);
    }
  };
  //#endregion
  

  //#region annotations
  private onAnnotationDeleteButtonClick = () => {
    this._viewerData.deleteSelectedAnnotation();
  };

  private setAnnotatorMode(mode: AnnotatorMode, forceReset = false) {
    if (!mode || ((mode === this._annotatorMode) && !forceReset)) {
      return;
    }

    // disable previous mode
    this._contextMenu.clear();
    this._contextMenuEnabled = false;
    this._annotator?.destroy();
    this._annotator = null;
    switch (this._annotatorMode) {
      case "select":
        this._shadowRoot.querySelector("#button-annotation-mode-select").classList.remove("on");
        this._viewerData.selectedAnnotation = null;
        break;
      case "pen":
        this._shadowRoot.querySelector("#button-annotation-mode-pen").classList.remove("on");
        break;
      default:
        // mode hasn't been set. do nothing
        break;
    }

    this._annotatorMode = mode;
    switch (mode) {
      case "select":
        this._shadowRoot.querySelector("#button-annotation-mode-select").classList.add("on");
        break;
      case "pen":
        this._shadowRoot.querySelector("#button-annotation-mode-pen").classList.add("on");
        this._annotator = new PenAnnotator(this._viewer, this._viewerData.currentImageView);
        this._annotator.scale = this._scale;
        this.initContextPenColorPicker();
        break;
      default:
        // Execution should not come here
        throw new Error(`Invalid annotation mode: ${mode}`);
    }
  }
  
  private onAnnotatorSelectModeButtonClick = () => {
    this.setAnnotatorMode("select");
  };

  private onAnnotatorPenModeButtonClick = () => {
    this.setAnnotatorMode("pen");
  };

  private onAnnotationChange = (e: AnnotEvent) => {
    if (!e.detail) {
      return;
    }

    const annotations = e.detail.annotations;

    switch(e.detail.type) {
      case "select":      
        if (annotations?.length) {
          this._mainContainer.classList.add("annotation-selected");
        } else {
          this._mainContainer.classList.remove("annotation-selected");
        }
        break;
      case "add":
        break;
      case "edit":
        break;
      case "delete":
        break;
    }
    
    // execute change callback if present
    if (this._annotChangeCallback) {
      this._annotChangeCallback(e.detail);
    }

    // rerender current images
    if (annotations?.length) {
      this._viewerData.currentImageView?.renderView(true);
    }
  };

  /**
   * prepare the context menu to work with a pen annotator
   */
  private initContextPenColorPicker() {
    // TODO: move default colors to the main options
    const colors: Quadruple[] = [
      [0, 0, 0, 0.9], // black
      [205, 0, 0, 0.9], // red
      [0, 205, 0, 0.9], // green
      [0, 0, 205, 0.9], // blue
    ];
    // init the color picker
    const contextMenuColorPicker = document.createElement("div");
    contextMenuColorPicker.classList.add("context-menu-content", "row");
    colors.forEach(x => {          
      const item = document.createElement("div");
      item.classList.add("panel-button");
      item.addEventListener("click", () => {
        this._contextMenu.hide();
        this._annotator?.destroy();
        this._annotator = new PenAnnotator(this._viewer, this._viewerData.currentImageView, {
          color: x,
        });
        this._annotator.scale = this._scale;
      });
      const colorIcon = document.createElement("div");
      colorIcon.classList.add("context-menu-color-icon");
      colorIcon.style.backgroundColor = `rgb(${x[0]*255},${x[1]*255},${x[2]*255})`;
      item.append(colorIcon);
      contextMenuColorPicker.append(item);
    });

    // init the stroke width selection slider
    const contextMenuWidthSlider = document.createElement("div");
    contextMenuWidthSlider.classList.add("context-menu-content", "row");
    const slider = document.createElement("input");
    slider.setAttribute("type", "range");
    slider.setAttribute("min", "1");
    slider.setAttribute("max", "32");
    slider.setAttribute("step", "1");
    slider.setAttribute("value", "3");
    slider.classList.add("context-menu-slider");
    slider.addEventListener("change", () => {      
      this._annotator?.destroy();
      this._annotator = new PenAnnotator(this._viewer, this._viewerData.currentImageView, {
        strokeWidth: slider.valueAsNumber,
      });
      this._annotator.scale = this._scale;
    });
    contextMenuWidthSlider.append(slider);

    // set the context menu content
    this._contextMenu.content = [contextMenuColorPicker, contextMenuWidthSlider];
    // activate the context menu
    this._contextMenuEnabled = true;
  }
  //#endregion
}
