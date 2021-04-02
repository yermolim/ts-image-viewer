import { Vec2 } from "../math";
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
  get dimensions(): Vec2 {
    return this._dimensions;
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
