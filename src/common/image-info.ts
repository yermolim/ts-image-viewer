import { Vec2 } from "mathador";
import { DomUtils, EventService, UUID } from "ts-viewers-core";

import { AnnotationBase } from "./annotation";

export class ImageInfo {
  protected readonly _uuid: string;
  get uuid(): string {
    return this._uuid;
  }

  protected readonly _url: string;
  get url(): string {
    return this._url;
  }

  protected readonly _dimensions: Vec2 = new Vec2();
  /**the image original width and height */
  get dimensions(): Vec2 {
    return this._dimensions;
  }
  
  protected _preloadedImage: HTMLImageElement;
  
  protected _scale = 1; 
  set scale(value: number) {   
    if (this._scale === value) {
      return;
    }
    this._scale = Math.max(value, 0);
  }
  get scale(): number {
    return this._scale;
  }
  
  protected _rotation = 0;
  set rotation(value: number) {
    if (this._rotation === value || isNaN(value)) {
      return;
    }
    this._rotation = value % 360;
  } 
  get rotation(): number {
    return this._rotation;
  }

  protected _annotations: AnnotationBase[] = [];
  get annotations(): AnnotationBase[] {
    return this._annotations;
  }

  /**
   * 
   * @param source loaded image element or image url
   * @param uuid unique id to identify the image
   * @returns 
   */
  constructor(source: HTMLImageElement | string, uuid?: string) {
    this._uuid = uuid || UUID.getRandomUuid();

    if (source instanceof HTMLImageElement) {
      if (!source || !source.complete) {
        throw new Error("Image is not loaded");
      }  
      this._preloadedImage = source;
      this._dimensions.set(source.naturalWidth, source.naturalHeight);
      return;
    }

    this._url = source;
  }

  async getImageAsync(): Promise<HTMLImageElement> {
    if (this._preloadedImage) {
      // image is preloaded. return it
      return this._preloadedImage;
    }

    if (!this._url) {
      throw new Error("No image or image url found");
    }

    const image = await DomUtils.loadImageAsync(this._url);
    if (image) {      
      this._dimensions.set(image.naturalWidth, image.naturalHeight);
    }

    return image;
  }
}

/**coordinates in the image coordinate system */
export interface ImageCoords {
  info: ImageInfo;
  x: number;
  y: number;
}


export interface ImageLoadInfo {
  type: "URL" | "Base64" | "Blob" | "ByteArray";
  data: string | Blob | Uint8Array;
  uuid?: string;
}

export interface ImageInfoView {  
  readonly index: number;  
  readonly eventService: EventService;
  readonly imageInfo: ImageInfo;

  get previewContainer(): HTMLDivElement;
  get viewWrapper(): HTMLDivElement;
  get viewContainer(): HTMLDivElement;
  
  get scale(): number;
  set scale(value: number);

  get rotation(): number;

  /**true if the view render is up to date */
  get viewValid(): boolean;

  /**free the object resources to let GC clean them to avoid memory leak */
  destroy(): void;

  renderPreviewAsync(force: boolean): Promise<void>;

  renderViewAsync(force: boolean): Promise<void>;

  clearPreview(): void;

  rotateClockwise(): void;

  rotateCounterClockwise(): void;

  /**
   * export the image as a PNG file with all its annotations drawn over 
   * @returns PNG Blob
   */
  bakeAnnotationsAsync(): Promise<Blob>;
   
  getImageCoordsUnderPointer(clientX: number, clientY: number): ImageCoords;  
}
