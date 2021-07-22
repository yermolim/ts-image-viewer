import { getDistance2D, Vec2 } from "mathador";
import { UUID } from "ts-viewers-core";

import { Viewer } from "../../components/viewer";
import { ImageService } from "../../services/image-service";

import { NoteAnnotation, NoteAnnotationDto, noteIconTypes } from "../../annotations/note-annotation";
import { TextAnnotator, TextAnnotatorOptions } from "./text-annotator";

export class TextNoteAnnotator extends TextAnnotator {
  protected readonly _viewer: Viewer;

  protected _tempAnnotation: NoteAnnotation;

  constructor(imageService: ImageService, viewer: Viewer, options?: TextAnnotatorOptions) {
    super(imageService, viewer.container, options || {});
    this._viewer = viewer;
    this.init();
  }

  override destroy() {    
    this._tempAnnotation = null;
    super.destroy();
  }

  undo() {
    this.clear();
  }

  clear() {
    this._tempAnnotation = null;
  }

  /**saves the current temp annotation to the document data */
  async saveAnnotationAsync() {
    if (!this._imageUuid || !this._tempAnnotation) {
      return;
    }
    
    const initialText = this._tempAnnotation?.textContent;

    const text = await this._viewer.showTextDialogAsync(initialText);
    if (text !== null) {
      await this._tempAnnotation.setTextContentAsync(text);

      // append the current temp annotation to the image
      this._imageService.appendAnnotationToImage(this._imageUuid, this._tempAnnotation);
    }

    // create a new temp annotation
    await this.createTempNoteAnnotationAsync();
  }
  
  protected override init() {
    super.init();

    this._overlay.addEventListener("pointermove", 
      this.onPointerMove);
    this._overlay.addEventListener("pointerup", 
      this.onPointerUp);
    this.createTempNoteAnnotationAsync();
  }
  
  /**
   * create temporary stamp annotation to render in under the pointer
   */
  protected async createTempNoteAnnotationAsync() {
    const nowString = new Date().toISOString();
    const size = (this._imageService.currentImageView?.imageInfo?.dimensions?.x ?? 2000) / 20;
    const dto: NoteAnnotationDto = {
      uuid: UUID.getRandomUuid(),
      annotationType: "note",
      imageUuid: null,

      dateCreated: nowString,
      dateModified: nowString,
      author: this._imageService.userName || "unknown",

      textContent: null,

      iconType: noteIconTypes.NOTE,
      strokeColor: this._color,
      center: [0, 0],
      width: size,
      height: size,
    };
    const note = new NoteAnnotation(this._imageService.eventService, dto);
    const renderResult = await note.renderNoteAppearanceAsync();  

    this._svgGroup.innerHTML = "";
    this._svgGroup.append(...renderResult.clipPaths);
    this._svgGroup.append(...renderResult.elements.map(x => x.element));

    this._tempAnnotation = note;
  }

  protected onPointerMove = (e: PointerEvent) => {
    if (!e.isPrimary) {
      // the event source is the non-primary touch. ignore that
      return;
    }

    const {clientX: cx, clientY: cy} = e;
    this.updatePointerCoords(cx, cy);
    const imageCoords = this._pointerCoordsInImageCS;
    if (!imageCoords) {
      // return if the pointer is outside image
      return;
    }

    // move temp stamp under the current pointer position
    if (this._tempAnnotation) {
      const {x: ox, y: oy} = this._overlay.getBoundingClientRect();
      const offsetX = (cx - ox) / this._imageService.scale;
      const offsetY = (cy - oy) / this._imageService.scale;
      this._svgGroup.setAttribute("transform",
        `translate(${offsetX} ${offsetY})`);
    }
  };

  protected onPointerUp = async (e: PointerEvent) => {
    if (!e.isPrimary || e.button === 2) {
      // the event source is the non-primary touch or the RMB. ignore that
      return;
    }

    const {clientX: cx, clientY: cy} = e;

    if (e.pointerType === "touch") {
      // 700ms - the default Chrome (v.89) delay for detecting a long tap
      const longTap = performance.now() - this._lastPointerDownInfo?.timestamp > 700;
      if (longTap) {
        const downX = this._lastPointerDownInfo?.clientX || 0;
        const downY = this._lastPointerDownInfo?.clientY || 0;
        const displacement = Math.abs(getDistance2D(cx, cy, downX, downY));
        // 7.5px seems to be the default Chrome (v.89) displacement limit for firing 'contextmenu' event
        const displaced = displacement > 7.5;
        if (!displaced) {
          // long tap without displacement - the context menu condition
          // do not append new annotation 
          return;
        }
      }
    }

    const imageCoords = this._pointerCoordsInImageCS;
    if (!imageCoords) {
      // return if the pointer is outside image
      return;
    }
    if (!imageCoords || !this._tempAnnotation) {
      return;
    }

    const {x: ix, y: iy} = imageCoords;
    const currentImage = this._imageService.currentImageView.imageInfo;
    if (!currentImage) {
      return;
    }
    const {uuid, rotation} = this._imageService.currentImageView.imageInfo;

    // translate the stamp to the pointer position
    await this._tempAnnotation.moveToAsync(new Vec2(ix, iy));
    // rotate the current annotation according to the image rotation
    if (rotation) {      
      await this._tempAnnotation.rotateByAsync(rotation / 180 * Math.PI);
    }

    // save the current temp stamp to the document data
    this._imageUuid = uuid;
    await this.saveAnnotationAsync();
  };

  protected refreshGroupPosition() {
    // no implementation needed
  }
}
