/* eslint-disable @typescript-eslint/no-use-before-define */
import { DomUtils, EventService } from "ts-viewers-core";

import { ImageInfo, ImageLoadInfo, ImageInfoView } from "../common/image-info";
import { AnnotationBase, AnnotationDto } from "../common/annotation";
import { ScaleChangedEvent, annotSelectionRequestEvent, 
  annotFocusRequestEvent, ImageEvent, ImageServiceStateChangeEvent, 
  AnnotSelectionRequestEvent, AnnotEvent, 
  AnnotEditRequestEvent, annotEditRequestEvent} from "../common/events";

import { ImageView } from "../components/image-view";
import { PenAnnotation, PenAnnotationDto } from "../annotations/pen-annotation";
import { StampAnnotation, StampAnnotationDto } from "../annotations/stamp-annotation";
import { NoteAnnotation, NoteAnnotationDto } from "../annotations/note-annotation";
import { TextAnnotation, TextAnnotationDto } from "../annotations/text-annotation";
import { CircleAnnotation, CircleAnnotationDto } from "../annotations/geometric/circle-annotation";
import { SquareAnnotation, SquareAnnotationDto } from "../annotations/geometric/square-annotation";
import { LineAnnotation, LineAnnotationDto } from "../annotations/geometric/line-annotation";
import { PolylineAnnotation, PolylineAnnotationDto } from "../annotations/geometric/polyline-annotation";
import { PolygonAnnotation, PolygonAnnotationDto } from "../annotations/geometric/polygon-annotation";
  
interface ExecutedAsyncCommand {
  timestamp: number;  
  undo(): Promise<void>;
  redo?(): Promise<void>;
}

export interface ImageServiceOptions {
  previewWidth?: number;
  lazyLoadImages?: boolean;
  userName?: string;
}

export class ImageService {
  protected readonly _eventService: EventService;
  get eventService(): EventService {
    return this._eventService;
  }

  protected _userName: string;
  get userName(): string {
    return this._userName;
  }

  protected _previewWidth: number;
  protected _lazyLoadImages: boolean;
  
  protected _imageViews: ImageView[] = [];
  get imageViews(): ImageView[] {
    return this._imageViews;
  }

  get imageCount(): number {
    return this._imageViews.length;
  }
  
  protected _currentImageView: ImageView;
  get currentImageView(): ImageView {
    return this._currentImageView;
  }
  
  protected _focusedAnnotation: AnnotationBase;
  get focusedAnnotation(): AnnotationBase {
    return this._focusedAnnotation;
  }

  protected _selectedAnnotation: AnnotationBase;
  get selectedAnnotation(): AnnotationBase {
    return this._selectedAnnotation;
  }
  
  get scale(): number {
    return this._imageViews[0]?.scale || 1;
  }
  set scale(value: number) {
    if (!value || isNaN(value)) {
      value = 1;
    }
    this._imageViews.forEach(x => x.scale = value);
    this._eventService.dispatchEvent(new ScaleChangedEvent({scale: value}));
  }
  
  protected _lastCommands: ExecutedAsyncCommand[] = [];

  constructor(eventService: EventService, options?: ImageServiceOptions) {
    if (!eventService) {
      throw new Error("Event service is not defined");
    } 
    this._eventService = eventService;
  
    this._userName = options?.userName || "guest";
    this._previewWidth = options?.previewWidth || 100;
    this._lazyLoadImages = options?.lazyLoadImages ?? true;

    
    this._eventService.addListener(annotSelectionRequestEvent, this.onSelectionRequest);
    this._eventService.addListener(annotFocusRequestEvent, this.onFocusRequest);
    this._eventService.addListener(annotEditRequestEvent, this.onEditRequest);
  }

  /**free the object resources to let GC clean them to avoid memory leak */
  destroy() {
    this._eventService.removeListener(annotSelectionRequestEvent, this.onSelectionRequest);
    this._eventService.removeListener(annotFocusRequestEvent, this.onFocusRequest);
    this._eventService.removeListener(annotEditRequestEvent, this.onEditRequest);
    this._imageViews?.forEach(x => x.destroy());
  }
  
  
  /**undo the most recent command */
  async undoAsync() {
    await this.undoCommandAsync();
    this.setSelectedAnnotation(null);
    this.setFocusedAnnotation(null);
  }


  async addImagesAsync(loadInfos: ImageLoadInfo[], selectedIndex?: number) {
    if (!loadInfos?.length) {
      return;
    }

    selectedIndex ??= 0;
    let imageToSelect: ImageView;
    for (let i = 0; i < loadInfos.length; i++) {
      const info = loadInfos[i];
      if (!info || !info.type || !info.data) {
        console.log("Empty image load info");
        continue;
      }

      let imageSource: HTMLImageElement | string;
      let imageUrl: string;
      switch (info.type) {
        case "URL":
          if (typeof info.data !== "string") {
            throw new Error(`Invalid data type: ${typeof info.data} (must be string)`);
          }
          if (this._lazyLoadImages) {
            imageSource = info.data;
          } else {
            imageSource = await DomUtils.loadImageAsync(info.data as string);
          }
          break;
        case "Base64":
          if (typeof info.data !== "string") {
            throw new Error(`Invalid data type: ${typeof info.data} (must be string)`);
          }
          imageSource = await DomUtils.loadImageAsync(info.data as string);
          break;
        case "Blob":
          if (!(info.data instanceof Blob)) {            
            throw new Error("Invalid data type: must be Blob");
          }
          imageUrl = URL.createObjectURL(info.data);
          imageSource = await DomUtils.loadImageAsync(imageUrl, true);
          break;

        case "ByteArray":
          if (!(info.data instanceof Uint8Array)) {            
            throw new Error("Invalid data type: must be Uint8Array");
          }
          if (!info.data?.length) {
            console.log("Empty image load byte data");
            continue;
          }     
          const blob = new Blob([info.data], {
            type: "application/octet-binary",
          });
          imageUrl = URL.createObjectURL(blob);
          imageSource = await DomUtils.loadImageAsync(imageUrl, true);
          break;

        default:
          // execution should not reach this point
          throw new Error(`Invalid info type: ${info.type}`);
      }

      if (!imageSource) {
        continue;
      }

      const imageInfo = new ImageInfo(imageSource, info.uuid);
      const view = new ImageView(this._eventService, imageInfo, 
        this._imageViews.length, this._previewWidth);
      this._imageViews.push(view);   
      
      if (i === selectedIndex) {
        imageToSelect = view;
      }
    }    

    this._eventService.dispatchEvent(new ImageEvent({   
      type: "open",   
      imageViews: [...this._imageViews],
    }));

    this.setImageAsCurrent(imageToSelect);
  }

  /**
   * remove all image views
   */
  clearImages() {
    this.setSelectedAnnotation(null);
    this._currentImageView = null;
    this._imageViews.forEach(x => x.destroy());

    this._eventService.dispatchEvent(new ImageEvent({   
      type: "close",   
      imageViews: [...this._imageViews],
    }));
    
    this._imageViews.length = 0;

    this._lastCommands.length = 0;
    this.emitStateChanged();
  }

  
  getImage(index: number): ImageView {
    return this._imageViews[index];
  }
  
  setImageAsCurrent(image: ImageView) {
    if (!image) {
      return;
    }
    const imageIndex = this._imageViews.findIndex(x => x === image);
    if (imageIndex === -1) {
      return;
    }

    this.setImageAtIndexAsCurrent(imageIndex);
  }

  setImageAtIndexAsCurrent(index: number) {
    const imageView = this._imageViews[index];
    if (!imageView || imageView === this._currentImageView) {
      // index is out of image array bounds or the image is already set as current
      return;
    }    

    // remove "current" class from previously selected image preview
    this._currentImageView?.previewContainer.classList.remove("current");

    this._currentImageView = imageView;
    this._currentImageView.previewContainer.classList.add("current");    

    this._eventService.dispatchEvent(new ImageEvent({   
      type: "select",   
      imageViews: [this._currentImageView],
    }));
  }
  
  setPreviousImageAsCurrent() {
    this.setImageAtIndexAsCurrent(this._currentImageView.index - 1);
  }

  setNextImageAsCurrent() {
    this.setImageAtIndexAsCurrent(this._currentImageView.index + 1);
  }

  appendAnnotationToImage(imageUuid: string, annotation: AnnotationBase, 
    undoable = true, raiseEvent = true) {
    this.appendAnnotation(imageUuid, annotation, undoable, raiseEvent);
  }
  
  /**
   * append previously exported annotations
   * @param dtos annotation data transfer objects
   */
  async appendSerializedAnnotationsAsync(dtos: AnnotationDto[]) {
    let annotation: AnnotationBase;    
    for (const dto of dtos) {
      switch (dto.annotationType) {
        case "pen":
          annotation = new PenAnnotation(this._eventService, dto as PenAnnotationDto);
          break;
        case "stamp":
          annotation = new StampAnnotation(this._eventService, dto as StampAnnotationDto);
          break;
        case "note":
          annotation = new NoteAnnotation(this._eventService, dto as NoteAnnotationDto);
          break;
        case "text":
          annotation = new TextAnnotation(this._eventService, dto as TextAnnotationDto);
          break;
        case "circle":
          annotation = new CircleAnnotation(this._eventService, dto as CircleAnnotationDto);
          break;
        case "square":
          annotation = new SquareAnnotation(this._eventService, dto as SquareAnnotationDto);
          break;
        case "line":
          annotation = new LineAnnotation(this._eventService, dto as LineAnnotationDto);
          break;
        case "polyline":
          annotation = new PolylineAnnotation(this._eventService, dto as PolylineAnnotationDto);
          break;
        case "polygon":
          annotation = new PolygonAnnotation(this._eventService, dto as PolygonAnnotationDto);
          break;
        default:
          throw new Error(`Unsupported annotation type: ${dto.annotationType}`);
      }
      this.appendAnnotationToImage(dto.imageUuid, annotation, false, false);
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          resolve();
        }, 10);
      });
    }
  }

  deleteAnnotation(annotation: AnnotationBase) {
    this.removeAnnotation(annotation, true);
  }
  
  deleteSelectedAnnotation() {
    const annotation = this._selectedAnnotation;
    if (annotation) {
      this.removeAnnotation(annotation, true);
    }
  }

  /**
   * get the annotations as data transfer objects
   * @param imageUuid if not specified all the annotations is returned
   * @returns annotation data transfer objects
   */
  serializeAnnotations(imageUuid?: string): AnnotationDto[] {
    const dtos: AnnotationDto[] = [];

    if (imageUuid) {
      for (const imageView of this._imageViews) {
        if (imageView.imageInfo?.uuid === imageUuid) {
          if (imageView.imageInfo?.annotations?.length) {
            dtos.push(...imageView.imageInfo.annotations.map(x => x.toDto()));
          }
          break;
        }
      }
    } else {
      for (const imageView of this._imageViews) {
        if (imageView.imageInfo?.annotations?.length) {
          dtos.push(...imageView.imageInfo.annotations.map(x => x.toDto()));
        }
      }
    }

    return dtos;
  }
  
  /** set an annotation as the selected one */
  setSelectedAnnotation(annotation: AnnotationBase): AnnotationBase {
    if (annotation === this._selectedAnnotation) {
      return;
    }

    if (this._selectedAnnotation) {
      this._selectedAnnotation.translationEnabled = false;
      const oldSelectedSvg = this._selectedAnnotation?.lastRenderResult?.controls;
      oldSelectedSvg?.classList.remove("selected");
    }

    const newSelectedSvg = annotation?.lastRenderResult?.controls;
    if (!newSelectedSvg) {
      this._selectedAnnotation = null;
    } else {
      annotation.translationEnabled = true;    
      newSelectedSvg.classList.add("selected");
      this._selectedAnnotation = annotation;
    }

    // dispatch corresponding event
    this._eventService.dispatchEvent(new AnnotEvent({      
      type: "select",
      annotations: this._selectedAnnotation
        ? [this._selectedAnnotation.toDto()]
        : [],
    }));

    return this._selectedAnnotation;
  } 
  
  /** set an annotation as the focused one */
  setFocusedAnnotation(annotation: AnnotationBase): AnnotationBase {
    if (annotation === this._focusedAnnotation) {
      return;
    }

    if (this._focusedAnnotation) {
      this._focusedAnnotation.translationEnabled = false;
      const oldFocusedSvg = this._focusedAnnotation?.lastRenderResult?.controls;
      oldFocusedSvg?.classList.remove("focused");
    }

    const newFocusedSvg = annotation?.lastRenderResult?.controls;
    if (!newFocusedSvg) {
      this._focusedAnnotation = null;
    } else {
      annotation.translationEnabled = true;    
      newFocusedSvg.classList.add("focused");
      this._focusedAnnotation = annotation;
    }

    // dispatch corresponding event
    this._eventService.dispatchEvent(new AnnotEvent({      
      type: "focus",
      annotations: this._focusedAnnotation
        ? [this._focusedAnnotation.toDto()]
        : [],
    }));

    return this._focusedAnnotation;
  } 
  
  getSelectedAnnotationTextContent(): string {
    return this._selectedAnnotation?.textContent;
  }

  async setSelectedAnnotationTextContentAsync(text: string) {
    await this._selectedAnnotation?.setTextContentAsync(text);
  }

  /**
   * get image with baked annotations
   * @param imageUuid uuid of the image (the current image is used if uuid is not specified)
   * @returns Promise<Blob> of the image with baked annotations
   */
  async bakeImageAnnotationsAsync(imageUuid?: string): Promise<Blob> {
    const imageView = imageUuid
      ? this._imageViews.find(x => x.imageInfo.uuid === imageUuid)
      : this._currentImageView;
    
    if (!imageView) {
      return null;
    }

    const blob = imageView.bakeAnnotationsAsync();
    return blob;
  }

  emitRendered(imageViews: ImageInfoView[]) {
    this._eventService.dispatchEvent(new ImageEvent({type: "render", imageViews: imageViews}));
  }
  
  emitStateChanged() {
    this._eventService.dispatchEvent(new ImageServiceStateChangeEvent({      
      undoableCount: this._lastCommands.length,
      scale: this.scale,
    }));    
  }
  
  protected pushCommand(command: ExecutedAsyncCommand) {
    this._lastCommands.push(command);
    this.emitStateChanged();
  }

  protected async undoCommandAsync() {
    if (!this._lastCommands.length) {
      return;
    }
    const lastCommand = this._lastCommands.pop();
    await lastCommand.undo();    
    this.emitStateChanged();
  }

  
  protected appendAnnotation(imageUuid: string, annotation: AnnotationBase, 
    undoable: boolean, raiseEvent: boolean) {
    if (!annotation) {
      throw new Error("Annotation is not defined");
    }
    
    const image = this._imageViews.find(x => x.imageInfo.uuid === imageUuid);
    if (!image) {
      throw new Error(`Image with uuid '${imageUuid}' is not found`);
    }
    
    if (image.imageInfo.annotations.find(x => x.uuid === annotation.uuid)) {      
      throw new Error(`Image already has the annotation with this uuid: '${imageUuid}'`);
    }
    
    image.imageInfo.annotations.push(annotation);
    annotation.deleted = false;
    annotation.imageUuid = imageUuid;

    // annotation.$onEditAction = this.getOnAnnotEditAction(annotation);
    // annotation.$onRenderUpdatedAction = this.getOnAnnotRenderUpdatedAction(annotation);

    if (undoable) {
      this.pushCommand({
        timestamp: Date.now(),
        undo: async () => {
          this.removeAnnotation(annotation, false);
          if (this.selectedAnnotation === annotation) {
            this.setSelectedAnnotation(null);
          }
        }
      });
    }

    if (raiseEvent) {
      this._eventService.dispatchEvent(new AnnotEvent({   
        type: "add",   
        annotations: [annotation.toDto()],
      }));
    }
  } 
  
  /**mark an annotation as deleted */
  protected removeAnnotation(annotation: AnnotationBase, undoable: boolean) {
    if (!annotation) {
      return;
    }
    
    annotation.deleted = true;
    this.setSelectedAnnotation(null);

    if (undoable) {
      this.pushCommand({
        timestamp: Date.now(),
        undo: async () => {
          this.appendAnnotation(annotation.imageUuid, annotation, false, true);
        }
      });
    }

    this._eventService.dispatchEvent(new AnnotEvent({   
      type: "delete",   
      annotations: [annotation.toDto()],
    }));
  }  


  protected onSelectionRequest = (e: AnnotSelectionRequestEvent) => {
    if (e.detail?.annotation) {
      this.setSelectedAnnotation(e.detail.annotation);
    } else {
      this.setSelectedAnnotation(null);
    }
  };
  
  protected onFocusRequest = (e: AnnotSelectionRequestEvent) => {
    if (e.detail?.annotation) {
      this.setFocusedAnnotation(e.detail.annotation);
    } else {
      this.setFocusedAnnotation(null);
    }
  };
  
  protected onEditRequest = (e: AnnotEditRequestEvent) => {
    if (e.detail?.annotation) {
      this.setFocusedAnnotation(e.detail.annotation);
    } else {
      this.setFocusedAnnotation(null);
    }

    const { annotation, undoAction } = e.detail;
    
    if (!annotation.imageUuid) {
      // do not emit annotation edit events until the annotation is not appended to image
      return;
    }

    if (undoAction) {
      this.pushCommand({ timestamp: Date.now(), undo: undoAction });
    }
    this._eventService.dispatchEvent(new AnnotEvent({
      type: "edit",
      annotations: [annotation.toDto()],
    }));
  };
}
