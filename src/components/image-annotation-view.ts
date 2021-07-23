import { EventService } from "ts-viewers-core";

import { ImageInfo } from "../common/image-info";
import { AnnotationRenderResult, RenderableAnnotation } from "../common/annotation";
import { AnnotSelectionRequestEvent, 
  annotChangeEvent, AnnotFocusRequestEvent } from "../common/events";
import { AnnotEvent } from "../ts-image-viewer";

export class ImageAnnotationView {
  private readonly _eventService: EventService;
  private readonly _imageInfo: ImageInfo;

  private _container: HTMLDivElement;
  private _svg: SVGSVGElement;
  
  private _rendered = new Set<RenderableAnnotation>();

  private _destroyed: boolean;

  constructor(eventService: EventService, imageInfo: ImageInfo) {
    if (!eventService) {
      throw new Error("Event service is not defined");
    }
    if (!imageInfo) {
      throw new Error("Image info is not defined");
    }

    this._eventService = eventService;
    this._imageInfo = imageInfo;

    this._container = document.createElement("div");
    this._container.classList.add("page-annotations");

    this._svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this._svg.classList.add("page-annotations-controls");
    this._svg.setAttribute("data-image-uuid", imageInfo.uuid + "");
    this._svg.setAttribute("viewBox", `0 0 ${imageInfo.dimensions.x} ${imageInfo.dimensions.y}`);
    // handle annotation selection
    this._svg.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.target === this._svg) {
        eventService.dispatchEvent(new AnnotSelectionRequestEvent({annotation: null}));
      }
    });   
  }
  
  /**free the object resources to let GC clean them to avoid memory leak */
  destroy() {
    this._destroyed = true;

    this.remove();
    this._container = null;
    this._rendered.clear();
  }

  /**remove from DOM */
  remove() {    
    this._container?.remove();
    this._eventService.removeListener(annotChangeEvent, this.onAnnotationSelectionChange);
  }  

  /**append to the specified element */
  async appendAsync(parent: HTMLElement) {
    if (this._destroyed) {
      return;
    }

    parent.append(this._container);
    
    const renderResult = await this.renderAnnotationsAsync();
    if (!renderResult) {
      this._container?.remove();
      return;
    }
    
    this._eventService.addListener(annotChangeEvent, this.onAnnotationSelectionChange);
  }

  private async renderAnnotationsAsync(): Promise<boolean> {    
    if (this._destroyed) {
      return false;
    }

    this.clear();

    const annotations = this._imageInfo.annotations || [];

    for (let i = 0; i < annotations.length || 0; i++) {
      const annotation = annotations[i];
      if (annotation.deleted) {
        continue;
      }
      
      let renderResult: AnnotationRenderResult;
      if (!this._rendered.has(annotation)) {
        // attach events to the annotation
        annotation.onPointerDownAction = (e: PointerEvent) => {
          this._eventService.dispatchEvent(new AnnotSelectionRequestEvent({annotation}));
        };        
        annotation.onPointerEnterAction = (e: PointerEvent) => {
          this._eventService.dispatchEvent(new AnnotFocusRequestEvent({annotation}));
        };        
        annotation.onPointerLeaveAction = (e: PointerEvent) => {
          this._eventService.dispatchEvent(new AnnotFocusRequestEvent({annotation: null}));
        };
        renderResult = await annotation.renderAsync(this._imageInfo);
      } else {
        renderResult = annotation.lastRenderResult || await annotation.renderAsync(this._imageInfo);
      }   

      if (!renderResult) {
        continue;
      }      

      this._rendered.add(annotation);
      this._svg.append(renderResult.controls);

      if (this._destroyed) {
        return false;
      }
      this._container.append(renderResult.content);
    }

    if (this._destroyed) {
      return false;
    }
    this._container.append(this._svg);
    return true;
  }

  private clear() {
    this._container.innerHTML = "";
    this._svg.innerHTML = "";
  }

  private onAnnotationSelectionChange = (e: AnnotEvent) => {
    if (!this._destroyed && e.detail.type === "select") {
      // toggle "touchAction" to prevent default gestures from interfering with the annotation edit logic
      if (e.detail.annotations?.length) {
        this._container.style.touchAction = "none";
      } else {
        this._container.style.touchAction = "";
      }
    }
  };
}
