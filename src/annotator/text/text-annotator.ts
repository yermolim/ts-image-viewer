import { Quadruple } from "ts-viewers-core";

import { ImageService } from "../../services/image-service";

import { Annotator, AnnotatorDataChangeEvent } from "../annotator";

export interface TextAnnotatorOptions {
  strokeWidth?: number;  
  color?: Quadruple;
}

export abstract class TextAnnotator extends Annotator {
  protected _imageUuid: string;
   
  protected _color: Quadruple;
  protected _strokeWidth: number;
  
  protected constructor(imageService: ImageService, parent: HTMLDivElement, 
    options: TextAnnotatorOptions) {
    super(imageService, parent);
    
    this._color = options?.color || [0, 0, 0, 1];
    this._strokeWidth = options?.strokeWidth || 3;
  }

  protected emitDataChanged(count: number, 
    saveable?: boolean, clearable?: boolean, undoable?: boolean) {
    this._imageService.eventService.dispatchEvent(new AnnotatorDataChangeEvent({
      annotatorType: "text",
      elementCount: count,
      undoable,
      clearable,
      saveable,
    }));
  }
}
