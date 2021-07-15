import { Vec2 } from "mathador";

import { Double } from "../../common/types";
import { EventService } from "../../common/event-service";

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
    if (!dto) {
      throw new Error("No source object passed to the constructor");
    }

    super(eventService, dto);

    this._vertices = (dto.vertices || []).map(x => new Vec2(x[0], x[1]));
  }
}
