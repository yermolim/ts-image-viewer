import { Quadruple } from "../../common/types";

import { ImageService } from "../../services/image-service";

import { GeometricAnnotator, GeometricAnnotatorOptions } from "./geometric-annotator";
import { GeometricCircleAnnotator } from "../geometric-circle-annotator";
// import { GeometricArrowAnnotator } from "./geometric-arrow-annotator";
// import { GeometricLineAnnotator } from "./geometric-line-annotator";
// import { GeometricPolygonAnnotator } from "./geometric-polygon-annotator";
// import { GeometricPolylineAnnotator } from "./geometric-polyline-annotator";
// import { GeometricSquareAnnotator } from "./geometric-square-annotator";

export const geometricAnnotatorTypes = ["circle", "square", "line", "arrow", "polyline", "polygon"] as const;
export type GeometricAnnotatorType =  typeof geometricAnnotatorTypes[number];

export class GeometricAnnotatorFactory {
  protected _lastType: GeometricAnnotatorType;
  protected _lastColor: Quadruple;
  protected _lastStrokeWidth: number;
  protected _lastCloudMode: boolean;

  createAnnotator(imageService: ImageService, parent: HTMLDivElement,
    options?: GeometricAnnotatorOptions, type?: GeometricAnnotatorType): GeometricAnnotator {

    if (!imageService) {
      throw new Error("Document service is not defined");
    }
    if (!parent) {
      throw new Error("Parent container is not defined");
    }
    
    type ||= this._lastType || "circle";
    this._lastType = type;   
    
    const color = options?.color || this._lastColor || [0, 0, 0, 0.9];
    this._lastColor = color;

    const strokeWidth = options?.strokeWidth || this._lastStrokeWidth || 3;
    this._lastStrokeWidth = strokeWidth;
    
    const cloudMode = options?.cloudMode ?? this._lastCloudMode ?? false;
    this._lastCloudMode = cloudMode; 

    const combinedOptions: GeometricAnnotatorOptions = {
      color,
      strokeWidth,
      cloudMode,
    };

    switch (type) {
      // case "square":
      //   return new GeometricSquareAnnotator(imageService, imageService, parent, combinedOptions);
      case "circle":
        return new GeometricCircleAnnotator(imageService, parent, combinedOptions);
      // case "line":
      //   return new GeometricLineAnnotator(imageService, imageService, parent, combinedOptions);
      // case "arrow":
      //   return new GeometricArrowAnnotator(imageService, imageService, parent, combinedOptions);
      // case "polyline":
      //   return new GeometricPolylineAnnotator(imageService, imageService, parent, combinedOptions);
      // case "polygon":
      //   return new GeometricPolygonAnnotator(imageService, imageService, parent, combinedOptions);
      default:
        throw new Error(`Invalid geometric annotator type: ${type}`);
    }
  }
}
