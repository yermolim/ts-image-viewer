/* eslint-disable @typescript-eslint/no-use-before-define */
import { Annotation, AnnotationDto, AnnotEvent, 
  annotSelectionRequestEvent, AnnotSelectionRequestEvent } from "../annotations/annotation";
import { PenAnnotation, PenAnnotationDto } from "../annotations/pen-annotation";
import { ImageInfo } from "../image/image-info";
import { ImageView } from "../image/image-view";

export interface ImageLoadInfo {
  type: "URL" | "Base64" | "Blob" | "ByteArray";
  data: string | Blob | Uint8Array;
  uuid?: string;
}

export interface ViewerDataOptions {
  previewWidth?: number;
}

export class ViewerData {
  protected previewWidth: number;
  
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

  protected _selectedAnnotation: Annotation;
  get selectedAnnotation(): Annotation {
    return this._selectedAnnotation;
  }
  set selectedAnnotation(annotation: Annotation) {
    if (annotation === this._selectedAnnotation) {
      return;
    }

    if (this._selectedAnnotation) {
      this._selectedAnnotation.translationEnabled = false;
      const oldSelectedSvg = this._selectedAnnotation?.lastRenderResult?.svg;
      oldSelectedSvg?.classList.remove("selected");
    }

    const newSelectedSvg = annotation?.lastRenderResult.svg;
    if (!newSelectedSvg) {
      this._selectedAnnotation = null;
    } else {
      annotation.translationEnabled = true;    
      newSelectedSvg.classList.add("selected");
      this._selectedAnnotation = annotation;
    }

    // dispatch corresponding event
    document.dispatchEvent(new AnnotEvent({      
      type: "select",
      annotations: this._selectedAnnotation
        ? [this._selectedAnnotation.toDto()]
        : [],
    }));
  }

  constructor(options?: ViewerDataOptions) {
    this.previewWidth = options?.previewWidth || 50;
    
    document.addEventListener(annotSelectionRequestEvent, this.onSelectionRequest);
  }

  destroy() {
    document.removeEventListener(annotSelectionRequestEvent, this.onSelectionRequest);
    this._imageViews?.forEach(x => x.destroy());
  }

  async addImagesAsync(loadInfos: ImageLoadInfo[]) {
    if (!loadInfos?.length) {
      return;
    }

    for (const info of loadInfos) {
      if (!info || !info.type || !info.data) {
        console.log("Empty image load info");
        continue;
      }

      let loadedImage: HTMLImageElement;
      let imageUrl: string;
      switch (info.type) {

        case "URL":
        case "Base64":
          if (typeof info.data !== "string") {
            throw new Error(`Invalid data type: ${typeof info.data} (must be string)`);
          }
          loadedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onerror = (e: string | Event) => {
              console.log(`Error while loading image: ${e}`);
              resolve(null);
            };
            image.onload = () => {
              resolve(image);
            };
            image.src = info.data as string;
          });
          break;

        case "Blob":
          if (!(info.data instanceof Blob)) {            
            throw new Error("Invalid data type: must be Blob");
          }
          imageUrl = URL.createObjectURL(info.data);
          loadedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onerror = (e: string | Event) => {
              URL.revokeObjectURL(imageUrl);
              console.log(`Error while loading image: ${e}`);
              resolve(null);
            };
            image.onload = () => {              
              URL.revokeObjectURL(imageUrl);
              resolve(image);
            };
            image.src = imageUrl;
          });
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
          loadedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onerror = (e: string | Event) => {
              URL.revokeObjectURL(imageUrl);
              console.log(`Error while loading image: ${e}`);
              resolve(null);
            };
            image.onload = () => {              
              URL.revokeObjectURL(imageUrl);
              resolve(image);
            };
            image.src = imageUrl;
          });
          break;

        default:
          // execution should not reach this point
          throw new Error(`Invalid info type: ${info.type}`);
      }

      if (!loadedImage) {
        continue;
      }

      const imageInfo = new ImageInfo(loadedImage, info.uuid);
      const view = new ImageView(imageInfo, this._imageViews.length, this.previewWidth);
      this._imageViews.push(view);
    }    

    document.dispatchEvent(new ImageEvent({   
      type: "add",   
      imageViews: [...this._imageViews],
    }));

    if (!this._currentImageView) {
      this.setImageAtIndexAsCurrent(0);
    }
  }

  /**
   * remove all image views
   */
  clearImages() {
    this.selectedAnnotation = null;
    this._currentImageView = null;
    this._imageViews.forEach(x => x.destroy());
    this._imageViews.length = 0;
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
    document.dispatchEvent(new ImageEvent({   
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

  appendAnnotationToImage(imageUuid: string, annotation: Annotation) {
    if (!imageUuid || !annotation) {      
      throw new Error("Argument is not defined");
    }
    const image = this._imageViews.find(x => x.imageInfo.uuid === imageUuid);
    if (!image) {
      throw new Error(`Image with uuid '${imageUuid}' is not found`);
    }
    if (image.imageInfo.annotations.find(x => x.uuid === annotation.uuid)) {      
      throw new Error(`Image already has the annotation with this uuid: '${imageUuid}'`);
    }

    image.imageInfo.annotations.push(annotation);
    annotation.imageUuid = imageUuid;

    document.dispatchEvent(new AnnotEvent({   
      type: "add",   
      annotations: [annotation.toDto()],
    }));
  }
  
  appendSerializedAnnotations(dtos: AnnotationDto[]) {
    let annotation: Annotation;
    for (const dto of dtos) {
      switch (dto.annotationType) {
        case "pen":
          annotation = new PenAnnotation(dto as PenAnnotationDto);
          break;
        default:
          throw new Error(`Unsupported annotation type: ${dto.annotationType}`);
      }
      this.appendAnnotationToImage(dto.imageUuid, annotation);
    }
  }

  deleteAnnotation(annotation: Annotation) {
    if (!annotation) {
      return;
    }
    
    annotation.deleted = true;
    document.dispatchEvent(new AnnotEvent({   
      type: "delete",   
      annotations: [annotation.toDto()],
    }));
  }
  
  deleteSelectedAnnotation() {
    this.deleteAnnotation(this._selectedAnnotation);
  }

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

  private onSelectionRequest = (e: AnnotSelectionRequestEvent) => {
    if (e.detail?.annotation) {
      this.selectedAnnotation = e.detail.annotation;
    } else {
      this.selectedAnnotation = null;
    }
  };
}

//#region custom events
export const imageChangeEvent = "tsimage-imagechange" as const;

export interface ImageEventDetail {
  type: "select" | "add";
  imageViews: ImageView[];
}

export class ImageEvent extends CustomEvent<ImageEventDetail> {
  constructor(detail: ImageEventDetail) {
    super(imageChangeEvent, {detail});
  }
}

declare global {
  interface DocumentEventMap {
    [imageChangeEvent]: ImageEvent;
  }
}
//#endregion
