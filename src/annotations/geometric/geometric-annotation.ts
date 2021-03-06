import { EventService, Double, Quadruple } from "ts-viewers-core";

import { AnnotationBase, AnnotationDto } from "../../common/annotation";

export interface GeometricAnnotationDto extends AnnotationDto {
  strokeColor: Quadruple;
  strokeWidth: number;
  strokeDashGap?: Double;
}

export abstract class GeometricAnnotation extends AnnotationBase {
  protected _strokeColor: Quadruple;
  get strokeColor(): Quadruple {
    return this._strokeColor;
  }

  protected _strokeWidth: number;
  get strokeWidth(): number {
    return this._strokeWidth;
  }
  
  protected _strokeDashGap: Double;
  get strokeDashGap(): Double {
    return this._strokeDashGap;
  }
  
  protected constructor(eventService: EventService, dto: GeometricAnnotationDto) {
    if (!dto) {
      throw new Error("No source object passed to the constructor");
    }

    super(eventService, dto);

    this._strokeColor = dto.strokeColor || [0, 0, 0, 1];
    this._strokeWidth = dto.strokeWidth || 3;
    this._strokeDashGap = dto.strokeDashGap || [3, 0];
  }
}
