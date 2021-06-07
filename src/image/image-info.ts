import { Vec2 } from "mathador";
import { getRandomUuid } from "../common";
import { Annotation } from "../annotations/annotation";

export class ImageInfo {
  protected readonly _uuid: string;
  get uuid(): string {
    return this._uuid;
  }
  
  protected readonly _image: HTMLImageElement;
  get image(): HTMLImageElement {
    return this._image;
  }

  protected readonly _dimensions: Vec2 = new Vec2();
  /**the image original width and height */
  get dimensions(): Vec2 {
    return this._dimensions;
  }
  
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

  protected _annotations: Annotation[] = [];
  get annotations(): Annotation[] {
    return this._annotations;
  }

  constructor(image: HTMLImageElement, uuid?: string) {
    if (!image || !image.complete) {
      throw new Error("Image is not loaded");
    }
    this._uuid = uuid || getRandomUuid();
    this._image = image;
    this._dimensions.set(image.naturalWidth, image.naturalHeight);
  }
}
