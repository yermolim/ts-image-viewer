import { Mat3, Vec2 } from "mathador";
import { EventService, CloudCurveData } from "ts-viewers-core";

import { AppearanceRenderResult, SELECTION_STROKE_WIDTH, 
  SvgElementWithBlendMode } from "../../drawing/utils";

import { PolyAnnotation, PolyAnnotationDto } from "./poly-annotation";

export interface PolygonAnnotationDto extends PolyAnnotationDto {  
  cloud: boolean;
  cloudArcSize?: number;
}

export class PolygonAnnotation extends PolyAnnotation { 
  /**defines if annotation should be rendered using wavy lines (for custom annotations) */
  protected _cloud: boolean;
  get cloud(): boolean {
    return this._cloud;
  } 
  protected _cloudArcSize: number;

  constructor(eventService: EventService, dto: PolygonAnnotationDto) {
    super(eventService, dto);

    if (dto.annotationType !== "polygon") {
      throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'polygon')`);
    }

    this._cloud = dto.cloud ?? false;
    this._cloudArcSize = dto.cloudArcSize ?? 20;
  }
    
  override toDto(): PolygonAnnotationDto {
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

      cloud: this._cloud,
      cloudArcSize: this._cloudArcSize,

      vertices: this._vertices.map(x => [x.x, x.y]),
    };
  }

  protected override async applyCommonTransformAsync(matrix: Mat3, undoable = true) {
    this._vertices.forEach(x => x.applyMat3(matrix));

    await super.applyCommonTransformAsync(matrix, undoable);
  } 
  
  protected updateAABB() {
    // find the minimum and maximum points
    const {min, max} = Vec2.minMax(...this._vertices);

    const margin = this._strokeWidth / 2;
    min.addScalar(-margin);
    max.addScalar(margin);

    // assign the corresponding fields values
    this._aabb[0].setFromVec2(min);
    this._aabb[1].setFromVec2(max);
  }

  protected async renderAppearanceAsync(): Promise<AppearanceRenderResult> {   
    try {
      if (!this._vertices?.length || this._vertices.length < 3) {
        throw new Error("Any polygon can't have less than 3 vertices");
      }

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
      
      let d: string;
      
      if (this._cloud) {
        path.setAttribute("stroke-linecap", "round");      
        path.setAttribute("stroke-linejoin", "round");   
        
        const vertices: Vec2[] = [...this._vertices];
        vertices.push(this._vertices[0]); // close the polygon
        const curveData = CloudCurveData.buildFromPolyline(vertices, this._cloudArcSize);
  
        d = `M${curveData.start.x},${curveData.start.y}`;
        curveData.curves.forEach(x => {
          d += ` C${x[0].x},${x[0].y} ${x[1].x},${x[1].y} ${x[2].x},${x[2].y}`;
        });
      } else {
        path.setAttribute("stroke-linecap", "square");      
        path.setAttribute("stroke-linejoin", "miter");

        const zeroVertex = this._vertices?.length
          ? this._vertices[0] 
          : new Vec2();      
          
        d = `M${zeroVertex.x},${zeroVertex.y}`;        
        for (let i = 1; i < this._vertices.length; i++) {
          const vertex = this._vertices[i];
          d += ` L${vertex.x},${vertex.y}`;
        }
        d += " Z";
      }      

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
