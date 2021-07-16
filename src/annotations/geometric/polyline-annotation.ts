import { Mat3, Vec2 } from "mathador";

import { AppearanceRenderResult, LineEndingType, lineEndingTypes, 
  LINE_END_MIN_SIZE, LINE_END_MULTIPLIER, SELECTION_STROKE_WIDTH, 
  SvgElementWithBlendMode } from "../../drawing/utils";

import { EventService } from "../../common/event-service";
import { PolyAnnotation, PolyAnnotationDto } from "./poly-annotation";

export interface PolylineAnnotationDto extends PolyAnnotationDto {  
  endings?: [LineEndingType, LineEndingType];
}

export class PolylineAnnotation extends PolyAnnotation {  
  protected _endings: [startType: LineEndingType, endType: LineEndingType];
  get endings(): [startType: LineEndingType, endType: LineEndingType] {
    return this._endings;
  }

  constructor(eventService: EventService, dto: PolylineAnnotationDto) {
    super(eventService, dto);

    if (dto.annotationType !== "polyline") {
      throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'polyline')`);
    }

    this._endings = [lineEndingTypes.NONE, lineEndingTypes.NONE];
  }
    
  override toDto(): PolylineAnnotationDto {
    return {
      annotationType: this.type,
      uuid: this.uuid,
      imageUuid: this._imageUuid,

      dateCreated: this._dateCreated.toISOString(),
      dateModified: this._dateModified.toISOString(),
      author: this._author,

      rotation: this._rotation,
      textContent: this._textContent,

      strokeColor: this._strokeColor,
      strokeWidth: this._strokeWidth,
      strokeDashGap: this._strokeDashGap,

      vertices: this._vertices.map(x => [x.x, x.y]),
      endings: this._endings,
    };
  }  
  
  protected override async applyCommonTransformAsync(matrix: Mat3, undoable = true) {
    this._vertices.forEach(x => x.applyMat3(matrix));

    await super.applyCommonTransformAsync(matrix, undoable);
  } 
  
  protected updateAABB() {
    // find the minimum and maximum points
    const {min, max} = Vec2.minMax(...this._vertices);

    // get box margin taking into account stroke width
    const endingNotNone = this._endings &&
      (this._endings[0] && this._endings[0] !== lineEndingTypes.NONE
        || this._endings[1] && this._endings[1] !== lineEndingTypes.NONE);

    const margin = endingNotNone
      ? this._strokeWidth / 2 + Math.max(LINE_END_MIN_SIZE, LINE_END_MULTIPLIER * this._strokeWidth)
      : this._strokeWidth / 2;
    min.addScalar(-margin);
    max.addScalar(margin);

    // assign the corresponding fields values
    this._aabb[0].setFromVec2(min);
    this._aabb[1].setFromVec2(max);
  }  

  protected renderAppearance(): AppearanceRenderResult {   
    try {
      const clipPaths: SVGClipPathElement[] = [];
      const elements: SvgElementWithBlendMode[] = [];
      const pickHelpers: SVGGraphicsElement[] = [];
      
      // clip paths
      const [min, max] = this.aabb;
      const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
      clipPath.id = `clip0_${this.uuid}`;
      clipPath.innerHTML = "<path d=\""
        + `M${min.x},${min.y} `
        + `L${max.x},${min.y} `
        + `L${max.x},${max.y} `
        + `L${min.x},${max.y} `
        + "z"
        + "\"/>";
      clipPaths.push(clipPath);

      // graphic elements
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("clip-path", `url(#${clipPath.id})`);
      
      const clonedGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      clonedGroup.classList.add("annotation-pick-helper");

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("fill", "none");
      const [r, g, b, a] = this._strokeColor;
      path.setAttribute("stroke", `rgba(${r*255},${g*255},${b*255},${a})`);
      path.setAttribute("stroke-width", this._strokeWidth + "");
      if (this._strokeDashGap) {
        path.setAttribute("stroke-dasharray", this._strokeDashGap.join(" "));       
      }     
      path.setAttribute("stroke-linecap", "square");      
      path.setAttribute("stroke-linejoin", "miter");
      
      const zeroVertex = (this._vertices && this._vertices[0]) || new Vec2();      
      let d = `M${zeroVertex.x},${zeroVertex.y}`;

      for (let i = 1; i < this._vertices.length; i++) {
        const vertex = this._vertices[i];
        d += ` L${vertex.x},${vertex.y}`;
      }

      // TODO: draw line endings        

      path.setAttribute("d", d);
      group.append(path);

      // create a transparent path copy with large stroke width to simplify user interaction  
      const clonedPath = path.cloneNode(true) as SVGPathElement;
      const clonedPathStrokeWidth = this._strokeWidth < SELECTION_STROKE_WIDTH
        ? SELECTION_STROKE_WIDTH
        : this._strokeWidth;
      clonedPath.setAttribute("stroke-width", clonedPathStrokeWidth + "");
      clonedPath.setAttribute("stroke", "transparent");
      clonedPath.setAttribute("fill", "none");
      clonedGroup.append(clonedPath);

      elements.push({
        element: group, 
        blendMode: "normal",
      });
      pickHelpers.push(clonedGroup);
      
      return {
        elements,
        clipPaths,
        pickHelpers,
      };
    }
    catch (e) {
      console.log(`Annotation render error: ${e.message}`);
      return null;   
    } 
  }
}
