import { Mat3, Vec2 } from "mathador";
import { EventService, Quadruple, Double } from "ts-viewers-core";

import { AnnotationBase, AnnotationDto } from "../common/annotation";
import { AppearanceRenderResult, SELECTION_STROKE_WIDTH, 
  SvgElementWithBlendMode } from "../drawing/utils";

export interface PenAnnotationDto extends AnnotationDto {
  pathList: number[][];
  strokeColor: Quadruple;
  strokeWidth: number;
  strokeDashGap?: Double;
}

//#region custom events
export const pathChangeEvent = "tsimage-penpathchange" as const;
export interface PathChangeEventDetail {
  pathCount: number;
}
export class PathChangeEvent extends CustomEvent<PathChangeEventDetail> {
  constructor(detail: PathChangeEventDetail) {
    super(pathChangeEvent, {detail});
  }
}
declare global {
  interface HTMLElementEventMap {
    [pathChangeEvent]: PathChangeEvent;
  }
}
//#endregion

export class PenAnnotation extends AnnotationBase {  
  protected _pathList: number[][];
  get pathList(): number[][] {
    return this._pathList;
  }

  protected _strokeColor: Quadruple;
  get color(): Quadruple {
    return this.color;
  }

  protected _strokeWidth: number;
  get strokeWidth(): number {
    return this._strokeWidth;
  }
  
  protected _strokeDashGap: Double;
  get strokeDashGap(): Double {
    return this._strokeDashGap;
  }

  constructor(eventService: EventService, dto: PenAnnotationDto) {
    if (!dto) {
      throw new Error("No source object passed to the constructor");
    }

    super(eventService, dto);
    
    if (dto.annotationType !== "pen") {
      throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'pen')`);
    }

    this._pathList = dto.pathList || [];
    this._strokeColor = dto.strokeColor || [0, 0, 0, 1];
    this._strokeWidth = dto.strokeWidth || 3;
    this._strokeDashGap = dto.strokeDashGap || [3, 0];
  }

  toDto(): PenAnnotationDto {
    return {
      annotationType: this.type,
      uuid: this.uuid,
      imageUuid: this._imageUuid,

      dateCreated: this._dateCreated.toISOString(),
      dateModified: this._dateModified.toISOString(),
      author: this._author,

      rotation: this._rotation,
      textContent: this._textContent,

      pathList: this._pathList,
      strokeColor: this._strokeColor,
      strokeWidth: this._strokeWidth,
      strokeDashGap: this._strokeDashGap,
    };
  }

  protected override async applyCommonTransformAsync(matrix: Mat3, undoable = true) {
    // transform current InkList
    let x: number;
    let y: number;
    const vec = new Vec2();
    this._pathList.forEach(list => {
      for (let i = 0; i < list.length; i = i + 2) {
        x = list[i];
        y = list[i + 1];
        vec.set(x, y).applyMat3(matrix);
        list[i] = vec.x;
        list[i + 1] = vec.y;
      }
    });

    await super.applyCommonTransformAsync(matrix, undoable);
  }

  protected updateAABB() {
    let x: number;
    let y: number;
    let xMin: number;
    let yMin: number;
    let xMax: number;
    let yMax: number;
    this._pathList.forEach(list => {
      for (let i = 0; i < list.length; i = i + 2) {
        x = list[i];
        y = list[i + 1];

        if (!xMin || x < xMin) {
          xMin = x;
        }
        if (!yMin || y < yMin) {
          yMin = y;
        }
        if (!xMax || x > xMax) {
          xMax = x;
        }
        if (!yMax || y > yMax) {
          yMax = y;
        }
      }
    });

    const halfStrokeW = this._strokeWidth / 2;
    xMin -= halfStrokeW;
    yMin -= halfStrokeW;
    xMax += halfStrokeW;
    xMax += halfStrokeW;

    this._aabb[0].set(xMin, yMin);
    this._aabb[1].set(xMax, yMax);
  } 

  protected async renderAppearanceAsync(): Promise<AppearanceRenderResult> {   
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

      for (const pathCoords of this.pathList) {
        if (!pathCoords?.length) {
          continue;
        }        

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        const [r, g, b, a] = this._strokeColor;
        path.setAttribute("stroke", `rgba(${r*255},${g*255},${b*255},${a})`);
        path.setAttribute("stroke-width", this._strokeWidth + "");
        if (this._strokeDashGap) {
          path.setAttribute("stroke-dasharray", this._strokeDashGap.join(" "));       
        }

        let d = `M ${pathCoords[0]} ${pathCoords[1]}`;
        for (let i = 2; i < pathCoords.length;) {
          d += ` L ${pathCoords[i++]} ${pathCoords[i++]}`;
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
      }

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
