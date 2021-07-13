/* eslint-disable @typescript-eslint/no-use-before-define */
import { mainHtml } from "./assets/index.html";
import { styles } from "./assets/styles.html";

import { downloadFile } from "./common/dom";
import { AnnotationDto } from "./common/annotation";
import { ImageLoadInfo } from "./common/image-info";
import { EventService } from "./common/event-service";
import { AnnotEventDetail, AnnotEvent,
  imageChangeEvent, imageServiceStateChangeEvent, annotChangeEvent, 
  ImageEvent, ImageServiceStateChangeEvent } from "./common/events";

import { AnnotatorService } from "./services/annotator-service";
  
import { Loader } from "./components/loader";
import { Previewer } from "./components/previewer";
import { Viewer, ViewerMode, viewerModes } from "./components/viewer";
import { annotatorDataChangeEvent, AnnotatorDataChangeEvent, 
  annotatorTypes } from "./annotator/annotator";
import { ImageService } from "./services/image-service";

type AnnotatorMode = "select" | "stamp" | "pen" | "geometric" | "text";
type FileButtons = "open" | "save" | "close";

export interface TsImageViewerOptions {
  /**parent container CSS selector */
  containerSelector: string;
  /**current user name (used for annotations) */
  userName?: string;

  /**list of the file interaction buttons shown */
  fileButtons?: FileButtons[];
  /**
   * action to execute instead of the default file open action
   * f.e. to open a custom dialog that allows the user to select a file from the database
   */
  fileOpenAction?: () => void;
  /**
   * action to execute instead of the default file close action
   * f.e. to discard all the changes made to the file
   */
  fileSaveAction?: () => void;
  /**
   * action to execute instead of the default file close action
   * f.e. to discard all the changes made to the file
   */
  fileCloseAction?: () => void;

  /**
   * action to execute on annotation change event 
   * f.e. to save the changes to the database
   */
  annotChangeCallback?: (detail: AnnotEventDetail) => void;
  
  // /**
  //  * array of objects describing custom stamps
  //  */
  // customStamps?: CustomStampCreationInfo[];
  
  // /**
  //  * action to execute on custom stamp change event.
  //  * fires when a new custom stamp is added or an old one is deleted.
  //  * can be used for managing custom stamp library
  //  */
  // customStampChangeCallback?: (detail: CustomStampEventDetail) => void;
    
  /**
   * use lazy loading for the images (has effect only if image loaded via url)
   */
  lazyLoadImages?: boolean;

  /**image preview canvas width in px */
  previewWidth?: number;
}

export {AnnotationDto, AnnotEvent, AnnotEventDetail, ImageLoadInfo};

export class TsImageViewer {
  //#region private fields
  private readonly _userName: string;

  private _outerContainer: HTMLDivElement;
  private _shadowRoot: ShadowRoot;
  private _mainContainer: HTMLDivElement;
  
  private readonly _eventService: EventService;
  private readonly _imageService: ImageService;
  private readonly _annotatorService: AnnotatorService;
  // private readonly _customStampsService: CustomStampService;

  private readonly _loader: Loader;
  private readonly _viewer: Viewer;
  private readonly _previewer: Previewer;  
  
  private _fileOpenAction: () => void;
  private _fileSaveAction: () => void;
  private _fileCloseAction: () => void;
  private _annotChangeCallback: (detail: AnnotEventDetail) => void;
  // private _customStampChangeCallback: (detail: CustomStampEventDetail) => void;

  private _mainContainerRObserver: ResizeObserver;
  private _panelsHidden: boolean;

  private _fileInput: HTMLInputElement;

  private _imageLoadingTask: Promise<void>;
  
  /**common timers */
  private _timers = {    
    hidePanels: 0,
  };

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

    this._userName = options.userName || "guest";
    this._fileOpenAction = options.fileOpenAction;
    this._fileSaveAction = options.fileSaveAction;
    this._fileCloseAction = options.fileCloseAction;
    this._annotChangeCallback = options.annotChangeCallback;
    // this._customStampChangeCallback = options.customStampChangeCallback;    

    const lazyLoadImages = options.lazyLoadImages ?? true;
    const previewWidth = options.previewWidth || 100;
    
    this._shadowRoot = this._outerContainer.attachShadow({mode: "open"});
    this._shadowRoot.innerHTML = styles + mainHtml;    
    this._mainContainer = this._shadowRoot.querySelector("div#main-container") as HTMLDivElement;
    
    this._eventService = new EventService(this._mainContainer); 
    this._imageService = new ImageService(this._eventService, {
      lazyLoadImages: lazyLoadImages, 
      previewWidth: previewWidth,
      userName: this._userName,
    });      

    this._loader = new Loader();
    this._previewer = new Previewer(this._imageService, this._shadowRoot.querySelector("#previewer"), 
      {canvasWidth: previewWidth});
    this._viewer = new Viewer(this._imageService, this._shadowRoot.querySelector("#viewer")); 
    this._viewer.container.addEventListener("contextmenu", e => e.preventDefault());
    
    this._annotatorService = new AnnotatorService(this._imageService, this._viewer);

    this.initMainContainerEventHandlers();
    this.initViewControls();
    this.initFileButtons(options.fileButtons || []);
    this.initModeSwitchButtons();
    this.initAnnotationButtons();
    
    this._eventService.addListener(imageChangeEvent, this.onImageChange);
    this._eventService.addListener(imageServiceStateChangeEvent, this.onImageServiceStateChange);
    this._eventService.addListener(annotChangeEvent, this.onAnnotatorChange);
    this._eventService.addListener(annotatorDataChangeEvent, this.onAnnotatorDataChanged);
    // this._eventService.addListener(docServiceStateChangeEvent, this.onDocServiceStateChange);
    // this._eventService.addListener(customStampEvent, this.onCustomStampChanged);
  }

  /**free the object resources to let GC clean them to avoid memory leak */
  destroy() {
    this._annotChangeCallback = null; 

    this._annotatorService?.destroy();

    this._viewer.destroy();
    this._previewer.destroy();
    this._imageService.destroy();
    
    // this._customStampsService.destroy();
    this._eventService.removeListener(imageServiceStateChangeEvent, this.onImageServiceStateChange);
    this._eventService.removeListener(imageChangeEvent, this.onImageChange);
    this._eventService.destroy();

    this._mainContainerRObserver?.disconnect();
    this._shadowRoot.innerHTML = "";
  }  
  
  /**
   * 
   * @param loadInfos array of objects with an information about files being loaded
   */
  async openImagesAsync(loadInfos: ImageLoadInfo[]): Promise<void> {
    try {
      await this._imageService.addImagesAsync(loadInfos);
    } catch (e) {
      throw new Error(`Cannot load file data: ${e.message}`);
    }
  }

  /**close all opened images */
  closeImages(): void {
    this._imageService.clearImages();
  }
  
  //#region annotations
  /**
   * import previously exported TsImage annotations
   * @param dtos annotation data transfer objects
   */
  importAnnotations(dtos: AnnotationDto[]) {
    try {
      this._imageService.appendSerializedAnnotations(dtos);
    } catch (e) {
      console.log(`Error while importing annotations: ${e.message}`);      
    }
  }

  /**
   * import previously exported serialized TsImage annotations
   * @param json serialized annotation data transfer objects
   */
  importAnnotationsFromJson(json: string) {
    try {
      const dtos: AnnotationDto[] = JSON.parse(json);
      this._imageService.appendSerializedAnnotations(dtos);
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
    const dtos = this._imageService.serializeAnnotations(imageUuid);
    return dtos;
  }  
  
  /**
   * export TsImage annotations as a serialized array of data transfer objects
   * @param imageUuid if omitted, annotations from all opened images will be exported
   * @returns json string
   */
  exportAnnotationsToJson(imageUuid?: string): string {
    const dtos = this._imageService.serializeAnnotations(imageUuid);
    return JSON.stringify(dtos);
  }
  //#endregion

  //#region custom stamps
  // importCustomStamps(customStamps: CustomStampCreationInfo[]) {  
  //   try {
  //     this._customStampsService.importCustomStamps(customStamps);
  //   } catch (e) {
  //     console.log(`Error while importing custom stamps: ${e.message}`);      
  //   }   
  // }
  
  // importCustomStampsFromJson(json: string) { 
  //   try {
  //     const customStamps: CustomStampCreationInfo[] = JSON.parse(json); 
  //     this._customStampsService.importCustomStamps(customStamps);
  //   } catch (e) {
  //     console.log(`Error while importing custom stamps: ${e.message}`);      
  //   } 
  // }
  
  // /**
  //  * export custom stamps
  //  * @returns 
  //  */
  // exportCustomStamps(): CustomStampCreationInfo[] {
  //   const customStamps = this._customStampsService.getCustomStamps();
  //   return customStamps;
  // }  
  
  // /**
  //  * export custom stamps as a serialized array of the corresponding objects
  //  * @returns 
  //  */
  // exportCustomStampsToJson(): string {
  //   const customStamps = this._customStampsService.getCustomStamps();
  //   return JSON.stringify(customStamps);
  // }
  //#endregion



  //#region GUI initialization methods
  private initMainContainerEventHandlers() { 
    const mcResizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {    
      const {width} = this._mainContainer.getBoundingClientRect();
      if (width < 721) {      
        this._mainContainer.classList.add("mobile");
      } else {      
        this._mainContainer.classList.remove("mobile");
      }
      if (width < 400) {        
        this._mainContainer.classList.add("compact");
      } else {
        this._mainContainer.classList.remove("compact");
      }
    });
    mcResizeObserver.observe(this._mainContainer);
    this._mainContainerRObserver = mcResizeObserver;
    this._mainContainer.addEventListener("pointermove", this.onMainContainerPointerMove);
  }
  
  /**add event listeners to interface general buttons */
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
    const blob = await this._imageService.bakeImageAnnotationsAsync();
    if (!blob) {
      return;
    }

    downloadFile(blob, `img_${new Date().toISOString()}.png`);
  };
  
  private onCloseFileButtonClick = () => {
    this.closeImages();
  };
  //#endregion

  private initModeSwitchButtons() {
    this._shadowRoot.querySelector("#button-mode-hand")
      .addEventListener("click", this.onHandModeButtonClick);
    this._shadowRoot.querySelector("#button-mode-annotation")
      .addEventListener("click", this.onAnnotatorModeButtonClick);
    this.setViewerMode("hand");    
  }

  private initAnnotationButtons() {
    // mode buttons
    this._shadowRoot.querySelector("#button-annotation-mode-select")
      .addEventListener("click", this.onAnnotatorSelectModeButtonClick);
    this._shadowRoot.querySelector("#button-annotation-mode-pen")
      .addEventListener("click", this.onAnnotatorPenModeButtonClick);

    // select buttons
    this._shadowRoot.querySelector("#button-annotation-edit-text")
      .addEventListener("click", this.onAnnotatorEditTextButtonClick);   
    this._shadowRoot.querySelector("#button-annotation-delete")
      .addEventListener("click", this.onAnnotatorDeleteButtonClick);    

    // pen buttons
    this._shadowRoot.querySelector("#button-annotation-pen-undo")
      .addEventListener("click", this.annotatorUndo);
    this._shadowRoot.querySelector("#button-annotation-pen-clear")
      .addEventListener("click", this.annotatorClear);
    this._shadowRoot.querySelector("#button-annotation-pen-save")
      .addEventListener("click", this.annotatorSave);
      
    // geometric buttons
    this._shadowRoot.querySelector("#button-annotation-geometric-undo")
      .addEventListener("click", this.annotatorUndo);
    this._shadowRoot.querySelector("#button-annotation-geometric-clear")
      .addEventListener("click", this.annotatorClear);
    this._shadowRoot.querySelector("#button-annotation-geometric-save")
      .addEventListener("click", this.annotatorSave);
      
    // text buttons
    this._shadowRoot.querySelector("#button-annotation-text-undo")
      .addEventListener("click", this.annotatorUndo);
    this._shadowRoot.querySelector("#button-annotation-text-clear")
      .addEventListener("click", this.annotatorClear);
    this._shadowRoot.querySelector("#button-annotation-text-save")
      .addEventListener("click", this.annotatorSave);

    this._shadowRoot.querySelector("#button-command-undo")
      .addEventListener("click", this.imageServiceUndo);     
  }
  //#endregion


 

  //#region viewer modes
  private setViewerMode(mode: ViewerMode) {
    mode = mode || "hand"; // 'text' is the default mode

    // disable previous viewer mode
    viewerModes.forEach(x => {
      this._mainContainer.classList.remove("mode-" + x);
      this._shadowRoot.querySelector("#button-mode-" + x).classList.remove("on");
    });
    this.setAnnotatorMode("select");

    this._mainContainer.classList.add("mode-" + mode);
    this._shadowRoot.querySelector("#button-mode-" + mode).classList.add("on");
    this._viewer.mode = mode;
  }

  private onHandModeButtonClick = () => {
    this.setViewerMode("hand");
  };
  
  private onAnnotatorModeButtonClick = () => {
    this.setViewerMode("annotation");
  };
  //#endregion

  //#region viewer zoom
  private onZoomOutClick = () => {
    this._viewer.zoomOut();
  };

  private onZoomInClick = () => {
    this._viewer.zoomIn();
  };
  
  private onZoomFitViewerClick = () => {
    this._viewer.zoomFitViewer();
  };
  
  private onZoomFitImageClick = () => {
    this._viewer.zoomFitImage();
  };
  //#endregion

  //#region image rotation
  private onRotateCounterClockwiseClick = () => {
    this._imageService.currentImageView?.rotateCounterClockwise();
    this.setAnnotatorMode(this._annotatorService.mode);
  };
  
  private onRotateClockwiseClick = () => {
    this._imageService.currentImageView?.rotateClockwise();
    this.setAnnotatorMode(this._annotatorService.mode);
  };
  //#endregion


  //#region paginator  
  private onPaginatorPrevClick = () => {
    this._imageService.setPreviousImageAsCurrent();
  };

  private onPaginatorNextClick = () => {
    this._imageService.setNextImageAsCurrent();
  };
  //#endregion
  

  //#region annotations
  private annotatorUndo = () => {
    this._annotatorService.annotator?.undo();
  };

  private annotatorClear = () => {
    this._annotatorService.annotator?.clear();
  };
  
  private annotatorSave = () => {
    this._annotatorService.annotator?.saveAnnotationAsync();
  };
  
  // private onCustomStampChanged = (e: CustomStampEvent) => {
  //   this.setAnnotationMode("stamp");

  //   // execute change callback if present
  //   if (this._customStampChangeCallback) {
  //     this._customStampChangeCallback(e.detail);
  //   }
  // };
  
  private onAnnotatorChange = async (e: AnnotEvent) => {
    if (!e.detail) {
      return;
    }

    const annotations = e.detail.annotations;
    switch(e.detail.type) {
      case "focus":      
        if (annotations?.length) {
          this._mainContainer.classList.add("annotation-focused");
        } else {
          this._mainContainer.classList.remove("annotation-focused");
        }
        const annotation = annotations[0];
        if (annotation) {
          (<HTMLParagraphElement>this._shadowRoot.querySelector("#focused-annotation-author"))
            .textContent = annotation.author || "";
          (<HTMLParagraphElement>this._shadowRoot.querySelector("#focused-annotation-date"))
            .textContent = new Date(annotation.dateModified || annotation.dateCreated).toDateString();
          (<HTMLParagraphElement>this._shadowRoot.querySelector("#focused-annotation-text"))
            .textContent = annotation.textContent || "";
        } else {
          (<HTMLParagraphElement>this._shadowRoot.querySelector("#focused-annotation-author"))
            .textContent = "";
          (<HTMLParagraphElement>this._shadowRoot.querySelector("#focused-annotation-date"))
            .textContent = "";
          (<HTMLParagraphElement>this._shadowRoot.querySelector("#focused-annotation-text"))
            .textContent = "";
        }
        break;
      case "select":      
        if (annotations?.length) {
          this._mainContainer.classList.add("annotation-selected");
          this._mainContainer.classList.add("annotation-focused"); // for touch devices
        } else {
          this._mainContainer.classList.remove("annotation-selected");
          this._mainContainer.classList.remove("annotation-focused"); // for touch devices
        }
        break;
      case "add":
      case "delete":
      case "render":
        // rerender current image if affected
        if (annotations?.length) {
          const imageUuidSet = new Set<string>(annotations.map(x => x.imageUuid));
          if (this._imageService.currentImageView 
            && imageUuidSet.has(this._imageService.currentImageView.imageInfo.uuid)) {
            await this._imageService.currentImageView.renderViewAsync(true);
          }            
        }
        break;
      case "edit":
        // there is no need to rerender image on edit 
        // because the annotation render may be still in process.
        // so just wait for the 'render' event
        break;
    }
    
    // execute change callback if present
    if (this._annotChangeCallback) {
      this._annotChangeCallback(e.detail);
    }
  };

  private onAnnotatorDataChanged = (event: AnnotatorDataChangeEvent) => {
    annotatorTypes.forEach(x => {
      this._mainContainer.classList.remove(x + "-annotator-data-saveable");
      this._mainContainer.classList.remove(x + "-annotator-data-undoable");
      this._mainContainer.classList.remove(x + "-annotator-data-clearable");
    });

    if (event.detail.saveable) {
      this._mainContainer.classList.add(event.detail.annotatorType + "-annotator-data-saveable");
    }
    if (event.detail.undoable) {
      this._mainContainer.classList.add(event.detail.annotatorType + "-annotator-data-undoable");
    }
    if (event.detail.clearable) {
      this._mainContainer.classList.add(event.detail.annotatorType + "-annotator-data-clearable");
    }
  };

  private setAnnotatorMode(mode: AnnotatorMode) {
    if (!this._annotatorService || !mode) {
      return;
    }

    const prevMode = this._annotatorService.mode;
    this._shadowRoot.querySelector(`#button-annotation-mode-${prevMode}`)?.classList.remove("on");
    this._shadowRoot.querySelector(`#button-annotation-mode-${mode}`)?.classList.add("on");

    this._annotatorService.mode = mode;
  }
   
  private onAnnotatorEditTextButtonClick = async () => {
    const initialText = this._imageService?.getSelectedAnnotationTextContent();
    const text = await this._viewer.showTextDialogAsync(initialText);
    if (text === null) {
      return;
    }
    await this._imageService?.setSelectedAnnotationTextContentAsync(text);
  };

  private onAnnotatorDeleteButtonClick = () => {
    this._imageService?.deleteSelectedAnnotation();
  };

  private onAnnotatorSelectModeButtonClick = () => {
    this.setAnnotatorMode("select");
  };

  private onAnnotatorStampModeButtonClick = () => {
    this.setAnnotatorMode("stamp");
  };

  private onAnnotatorPenModeButtonClick = () => {
    this.setAnnotatorMode("pen");
  };
  
  private onAnnotatorGeometricModeButtonClick = () => {
    this.setAnnotatorMode("geometric");
  };

  private onAnnotatorTextModeButtonClick = () => {
    this.setAnnotatorMode("text");
  };
  //#endregion

  //#region  misc
  private imageServiceUndo = () => {
    this._imageService?.undoAsync();
  };

  private onImageChange = (e: ImageEvent) => {
    if (e.detail.type === "open" 
      || e.detail.type === "close") {
      // timeout is used to give te viewer DOM time to refresh
      setTimeout(() => this.refreshImages(), 0);
    } else if (e.detail.type === "select") {
      // reset annotation mode    
      // timeout is used to give te viewer DOM time to refresh
      setTimeout(() =>  this.setAnnotatorMode(this._annotatorService.mode), 0);
    }
  };

  private onImageServiceStateChange = (e: ImageServiceStateChangeEvent) => {
    if (e.detail.undoableCount) {
      this._mainContainer.classList.add("undoable-commands");
    } else {      
      this._mainContainer.classList.remove("undoable-commands");
    }
  };
  
  private refreshImages(): void {
    const imageCount = this._imageService.imageCount;
    if (!imageCount) { // all images closed
      // disable interface
      this._mainContainer.classList.add("disabled");
      // reset modes
      this.setViewerMode("hand");
      this.setAnnotatorMode("select");  
      // hide previewer
      this._previewer.hide();
      return;
    } 
    
    // enable interface
    this._mainContainer.classList.remove("disabled");

    if (imageCount === 1) { // only one image opened
      // hide and disable previewer
      this._previewer.hide(); 
      this._shadowRoot.querySelector("#previewer-toggler").classList.add("disabled");
      // disable paginator
      this._shadowRoot.querySelector("#paginator").classList.add("disabled");
    } else {
      // enable previewer
      this._shadowRoot.querySelector("#previewer-toggler").classList.remove("disabled");
      // enable paginator
      this._shadowRoot.querySelector("#paginator").classList.remove("disabled");
    }
  }
  
  private onPreviewerToggleClick = () => {
    if (this._previewer.hidden) {
      this._mainContainer.classList.remove("hide-previewer");
      this._shadowRoot.querySelector("div#toggle-previewer").classList.add("on");
      this._previewer.show();
    } else {      
      this._mainContainer.classList.add("hide-previewer");
      this._shadowRoot.querySelector("div#toggle-previewer").classList.remove("on");
      this._previewer.hide();
    }
  };
  
  private onMainContainerPointerMove = (event: PointerEvent) => {
    const {clientX, clientY} = event;
    const {x: rectX, y: rectY, width, height} = this._mainContainer.getBoundingClientRect();

    const l = clientX - rectX;
    const t = clientY - rectY;
    const r = width - l;
    const b = height - t;

    if (Math.min(l, r, t, b) > 150) {
      // hide panels if pointer is far from the container edges
      if (!this._panelsHidden && !this._timers.hidePanels) {
        this._timers.hidePanels = setTimeout(() => {
          if (!this._imageService.currentImageView) {
            return; // hide panels only if any image is open
          }
          this._mainContainer.classList.add("hide-panels");
          this._panelsHidden = true;
          this._timers.hidePanels = null;
        }, 5000);
      }      
    } else {
      // show panels otherwise
      if (this._timers.hidePanels) {
        clearTimeout(this._timers.hidePanels);
        this._timers.hidePanels = null;
      }
      if (this._panelsHidden) {        
        this._mainContainer.classList.remove("hide-panels");
        this._panelsHidden = false;
      }
    }
  };
  //#endregion
}
