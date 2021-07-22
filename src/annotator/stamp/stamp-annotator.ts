import { getDistance2D, Vec2 } from "mathador";

import { UUID, CustomStampCreationInfo} from "ts-viewers-core";
import { StandardStampCreationInfo, standardStampCreationInfos } from "../../drawing/stamps";

import { ImageService } from "../../services/image-service";
import { StampAnnotation, StampAnnotationDto } from "../../annotations/stamp-annotation";
import { Annotator } from "../annotator";

export const supportedStampTypes = [
  {type:"Draft", name: "Draft"},
  {type:"Approved", name: "Approved"},
  {type:"NotApproved", name: "Not Approved"},
  {type:"Departmental", name: "Departmental"},
  {type:"Confidential", name: "Confidential"},
  {type:"Final", name: "Final"},
  {type:"Expired", name: "Expired"},
  {type:"AsIs", name: "As Is"},
  {type:"Sold", name: "Sold"},
  {type:"Experimental", name: "Experimental"},
  {type:"ForComment", name: "For Comment"},
  {type:"TopSecret", name: "Top Secret"},
  {type:"ForPublicRelease", name: "For Public"},
  {type:"NotForPublicRelease", name: "Not For Public"},
] as const;


/**tool for adding rubber stamp annotations */
export class StampAnnotator extends Annotator {
  protected _type: string;
  protected _creationInfo: CustomStampCreationInfo;

  protected _tempAnnotation: StampAnnotation;
  protected _imageUuid: string;

  /**
   * 
   * @param docService 
   * @param parent 
   * @param type stamp type
   */
  constructor(imageService: ImageService, parent: HTMLDivElement, 
    type: string, creationInfo?: CustomStampCreationInfo) {
    super(imageService, parent);
    
    if (!type) {
      throw new Error("Stamp type is not defined");
    }
    this._type = type;
    this._creationInfo = creationInfo;

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

  /**saves the current temp annotation to the image data */
  async saveAnnotationAsync() {
    if (!this._imageUuid || !this._tempAnnotation) {
      return;
    }

    // append the current temp annotation to the image
    this._imageService.appendAnnotationToImage(this._imageUuid, this._tempAnnotation);

    // create a new temp annotation
    await this.createTempStampAnnotationAsync();
  }
  
  protected override init() {
    super.init();

    this._overlay.addEventListener("pointermove", 
      this.onPointerMove);
    this._overlay.addEventListener("pointerup", 
      this.onPointerUp);
    this.createTempStampAnnotationAsync();
  }

  protected createStandardStamp(type: string, 
    userName?: string): StampAnnotation {
    const nowString = new Date().toISOString();    
    const stampData: StandardStampCreationInfo = standardStampCreationInfos[type];
    const dto: StampAnnotationDto = {
      uuid: UUID.getRandomUuid(),
      annotationType: "stamp",
      imageUuid: null,

      dateCreated: nowString,
      dateModified: nowString,
      author: userName || "unknown",

      textContent: null,

      stampType: type,
      stampSubject: null,
      stampImageData: null,
      
      defaultWidth: stampData.bbox[2],
      defaultHeight: stampData.bbox[3],
      width: stampData.bbox[2],
      height: stampData.bbox[3],
      center: [0,0],
    };

    return new StampAnnotation(this._imageService.eventService, dto);
  }

  protected createCustomStamp(creationInfo: CustomStampCreationInfo,
    userName?: string): StampAnnotation {
    const nowString = new Date().toISOString();
    const dto: StampAnnotationDto = {
      uuid: UUID.getRandomUuid(),
      annotationType: "stamp",
      imageUuid: null,

      dateCreated: nowString,
      dateModified: nowString,
      author: userName || "unknown",

      textContent: null,

      stampType: creationInfo.type,
      stampSubject: creationInfo.subject,
      stampImageData: [...creationInfo.imageData],

      defaultWidth: creationInfo.bbox[2],
      defaultHeight: creationInfo.bbox[3],
      width: creationInfo.bbox[2],
      height: creationInfo.bbox[3],
      center: [0,0],
    };

    return new StampAnnotation(this._imageService.eventService, dto);
  }
  
  /**
   * create temporary stamp annotation to render in under the pointer
   */
  protected async createTempStampAnnotationAsync() {
    let stamp: StampAnnotation;
    if (standardStampCreationInfos[this._type]) {
      // stamp is standard
      stamp = this.createStandardStamp(this._type, this._imageService.userName);
    } else if (this._creationInfo) {
      // stamp is custom
      stamp = this.createCustomStamp(this._creationInfo, this._imageService.userName);
    } else {
      throw new Error(`Unsupported stamp type: ${this._type}`);
    }

    // render the newly created stamp
    const renderResult = await stamp.renderStampAppearanceAsync();  

    // append the render result to the annotator SVG
    this._svgGroup.innerHTML = "";
    this._svgGroup.append(...renderResult.clipPaths);
    this._svgGroup.append(...renderResult.elements.map(x => x.element));

    // set the stamp to the corresponding property
    this._tempAnnotation = stamp;
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
