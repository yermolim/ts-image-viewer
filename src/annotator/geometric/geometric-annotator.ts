import { Annotator, AnnotatorDataChangeEvent } from "../annotator";
import { Quadruple } from "../../common/types";
import { ImageService } from "../../services/image-service";


export interface GeometricAnnotatorOptions {
  strokeWidth?: number;  
  color?: Quadruple;
  /**enables replacing straight lines with cloud-like curves */
  cloudMode?: boolean;
}

export abstract class GeometricAnnotator extends Annotator { 
  protected _color: Quadruple;
  protected _strokeWidth: number;
  protected _cloudMode: boolean;
  
  /**current image uuid */
  protected _imageUuid: string;
  
  protected constructor(imageService: ImageService, parent: HTMLDivElement, 
    options: GeometricAnnotatorOptions) {
    super(imageService, parent);
    
    this._color = options?.color || [0, 0, 0, 1];
    this._strokeWidth = options?.strokeWidth || 3;    
    this._cloudMode = options?.cloudMode || false;
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

    // TODO: ADAPT to html coordinates (0,0 - topleft)

    // const {height: pageHeight, width: pageWidth, top: pageTop, left: pageLeft} = 
    //   image.viewContainer.getBoundingClientRect();
    // const pageBottom = pageTop + pageHeight;
    // const pageRight = pageLeft + pageWidth;
    // const {height: overlayHeight, top: overlayTop, left: overlayLeft} = 
    //   this._overlay.getBoundingClientRect();
    // const overlayBottom = overlayTop + overlayHeight;
    // const rotation = image.rotation;
    // const scale = image.scale;
    // let offsetX: number;
    // let offsetY: number;    
    // switch (rotation) {
    //   case 0:
    //     // bottom-left page corner
    //     offsetX = (pageLeft - overlayLeft) / scale;
    //     offsetY = (overlayBottom - pageBottom) / scale;
    //     break;
    //   case 90:
    //     // top-left page corner
    //     offsetX = (pageLeft - overlayLeft) / scale;
    //     offsetY = (overlayBottom - pageTop) / scale;
    //     break;
    //   case 180:    
    //     // top-right page corner
    //     offsetX = (pageRight - overlayLeft) / scale;
    //     offsetY = (overlayBottom - pageTop) / scale; 
    //     break;
    //   case 270:
    //     // bottom-right page corner
    //     offsetX = (pageRight - overlayLeft) / scale;
    //     offsetY = (overlayBottom - pageBottom) / scale;
    //     break;
    //   default:
    //     throw new Error(`Invalid rotation degree: ${rotation}`);
    // }
    // this._svgGroup.setAttribute("transform",
    //   `translate(${offsetX} ${offsetY}) rotate(${-rotation})`);     
  }
  
  abstract override undo(): void;
  
  abstract override clear(): void;
  
  abstract override saveAnnotationAsync(): Promise<void>;
}
