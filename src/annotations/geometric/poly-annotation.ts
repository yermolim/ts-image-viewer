import { Vec2 } from "mathador";
import { EventService, Double } from "ts-viewers-core";

import { GeometricAnnotation, GeometricAnnotationDto } from "./geometric-annotation";

export interface PolyAnnotationDto extends GeometricAnnotationDto {
  vertices: Double[];
}

export abstract class PolyAnnotation extends GeometricAnnotation {
  protected _vertices: Vec2[];
  get vertices(): Vec2[] {
    return this._vertices;
  }
  
  protected constructor(eventService: EventService, dto: PolyAnnotationDto) {
    super(eventService, dto);

    this._vertices = (dto.vertices || []).map(x => new Vec2(x[0], x[1]));
  }
}
