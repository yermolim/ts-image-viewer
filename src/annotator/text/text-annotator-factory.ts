import { Quadruple } from "../../common/types";

import { ImageService } from "../../services/image-service";
import { Viewer } from "../../components/viewer";

import { TextAnnotator, TextAnnotatorOptions } from "./text-annotator";
import { TextNoteAnnotator } from "./text-note-annotator";
import { FreeTextAnnotator } from "./free-text-annotator";
import { FreeTextCalloutAnnotator } from "./free-text-callout-annotator";

export const textAnnotatorTypes = ["note", "freeText", "freeTextCallout"] as const;
export type TextAnnotatorType =  typeof textAnnotatorTypes[number];

export class TextAnnotatorFactory {
  protected _lastType: TextAnnotatorType;
  protected _lastColor: Quadruple;
  protected _lastStrokeWidth: number;

  createAnnotator(imageService: ImageService, viewer: Viewer,
    options?: TextAnnotatorOptions, type?: TextAnnotatorType): TextAnnotator {

    if (!imageService) {
      throw new Error("Image service is not defined");
    }
    if (!viewer) {
      throw new Error("Viewer is not defined");
    }
    
    type ||= this._lastType || "note";
    this._lastType = type;

    const color = options?.color || this._lastColor || [0, 0, 0, 1];
    this._lastColor = color;

    const strokeWidth = options?.strokeWidth || this._lastStrokeWidth || 3;
    this._lastStrokeWidth = strokeWidth;

    const combinedOptions: TextAnnotatorOptions = {
      color,
      strokeWidth,
    };

    switch (type) {
      case "note":
        return new TextNoteAnnotator(imageService, viewer, combinedOptions);
      case "freeText":
        return new FreeTextAnnotator(imageService, viewer, combinedOptions);
      case "freeTextCallout":
        return new FreeTextCalloutAnnotator(imageService, viewer, combinedOptions);
      default:
        throw new Error(`Invalid geometric annotator type: ${type}`);
    }
  }
}
