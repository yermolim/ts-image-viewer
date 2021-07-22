import { Quadruple } from "ts-viewers-core";

import { Annotator, AnnotatorDataChangeEvent } from "../annotator";
import { ImageService } from "../../services/image-service";

export interface GeometricAnnotatorOptions {
  strokeWidth?: number;  
  color?: Quadruple;
  /**enables replacing straight lines with cloud-like curves */
  cloudMode?: boolean;
}

export abstract class GeometricAnnotator extends Annotator { 
  protected _color: Quadruple;
  get color(): Quadruple {
    return this._color;
  }

  protected _strokeWidth: number;
  get strokeWidth(): number {
    return this._strokeWidth;
  }

  protected _cloudMode: boolean;
  get cloudMode(): boolean {
    return this._cloudMode;
  }
  protected _cloudArcSize: number;
  
  /**current image uuid */
  protected _imageUuid: string;
  get imageUuid(): string {
    return this._imageUuid;
  }
  
  protected constructor(imageService: ImageService, parent: HTMLDivElement, 
    options: GeometricAnnotatorOptions) {
    super(imageService, parent);    
    
    this._color = options?.color || [0, 0, 0, 1];
    this._strokeWidth = options?.strokeWidth || 3;    
    this._cloudMode = options?.cloudMode ?? false;
  }
  
  override destroy() {
    this.clearGroup();
    super.destroy();
  }

  protected override init() {
    super.init();
  }
  
  protected emitDataChanged(count: number, 
    saveable?: boolean, clearable?: boolean, undoable?: boolean) {
    this._imageService.eventService.dispatchEvent(new AnnotatorDataChangeEvent({
      annotatorType: "geom",
      elementCount: count,
      undoable,
      clearable,
      saveable,
    }));
  }

  protected clearGroup() {
    this._svgGroup.innerHTML = "";
    this.emitDataChanged(0);
  }
    
  protected refreshGroupPosition() {
    if (!this._imageUuid) {
      // image for drawing not selected
      return;
    }    

    const image = this._imageService.currentImageView;
    if (!image || image.imageInfo.uuid !== this._imageUuid) {
      // set scale to 0 to hide the svg group if it's image is not rendered
      this._svgGroup.setAttribute("transform", "scale(0)");
      return;
    }

    const {tx, ty, rotation} = this.getImageTransformationInfo(image);
    this._svgGroup.setAttribute("transform",
      `translate(${tx} ${ty}) rotate(${rotation})`);        
  }
  
  abstract override undo(): void;
  
  abstract override clear(): void;
  
  abstract override saveAnnotationAsync(): Promise<void>;
}
