import { Quadruple, Double, Hextuple, getRandomUuid, RenderToSvgResult } from "../common";
import { Mat3, Vec2, vecMinMax } from "../math";
import { PenData } from "../annotator/pen-data";

import { Annotation, AnnotationDto } from "./annotation";

export class PenAnnotation extends Annotation {  
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

  constructor(dto: PenAnnotationDto) {
    if (!dto) {
      throw new Error("No source object passed to the constructor");
    }
    if (dto.annotationType !== "pen") {
      throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'pen')`);
    }

    super(dto);

    this._pathList = dto.pathList;
    this._strokeColor = dto.strokeColor;
    this._strokeWidth = dto.strokeWidth;
    this._strokeDashGap = dto.strokeDashGap;
  }
  
  static createFromPenData(data: PenData, userName: string): PenAnnotation {
    const positions: Vec2[] = [];
    const pathList: number[][] = [];
    data.paths.forEach(path => {
      const ink: number[] = [];
      path.positions.forEach(pos => {
        positions.push(pos);
        ink.push(pos.x, pos.y);
      });
      pathList.push(ink);
    });
    const {min: newRectMin, max: newRectMax} = 
      vecMinMax(...positions);  
    const w = data.strokeWidth; 
    const rect: Quadruple = [
      newRectMin.x - w / 2, 
      newRectMin.y - w / 2, 
      newRectMax.x + w / 2, 
      newRectMax.y + w / 2,
    ];

    const nowString = new Date().toISOString();
    const dto: PenAnnotationDto = {
      uuid: getRandomUuid(),
      annotationType: "pen",
      imageUuid: null,

      dateCreated: nowString,
      dateModified: nowString,
      author: userName || "unknown",

      rect,
      bbox: null,
      matrix: [1, 0, 0, 1, 0, 0],
      html: null,

      pathList,
      strokeColor: data.color,
      strokeWidth: data.strokeWidth,
      strokeDashGap: null,
    };

    return new PenAnnotation(dto);
  }

  toDto(): PenAnnotationDto {
    return {
      annotationType: this.type,
      uuid: this.uuid,
      imageUuid: this._imageUuid,

      dateCreated: this._dateCreated.toISOString(),
      dateModified: this._dateModified.toISOString(),
      author: this._author,

      rect: this._aabb,
      bbox: this._bb,
      matrix: <Hextuple><unknown>this._matrix.toFloatShortArray(),
      html: this._svgContent?.innerHTML,

      pathList: this._pathList,
      strokeColor: this._strokeColor,
      strokeWidth: this._strokeWidth,
      strokeDashGap: this._strokeDashGap,
    };
  }
    
  protected applyCommonTransform(matrix: Mat3) {
    // transform current InkList and Rect
    let x: number;
    let y: number;
    let xMin: number;
    let yMin: number;
    let xMax: number;
    let yMax: number;
    const vec = new Vec2();
    this._pathList.forEach(list => {
      for (let i = 0; i < list.length; i = i + 2) {
        x = list[i];
        y = list[i + 1];
        vec.set(x, y).applyMat3(matrix);
        list[i] = vec.x;
        list[i + 1] = vec.y;

        if (!xMin || vec.x < xMin) {
          xMin = vec.x;
        }
        if (!yMin || vec.y < yMin) {
          yMin = vec.y;
        }
        if (!xMax || vec.x > xMax) {
          xMax = vec.x;
        }
        if (!yMax || vec.y > yMax) {
          yMax = vec.y;
        }
      }
    });
    this._aabb = [xMin, yMin, xMax, yMax];
    // update calculated bBox if present
    if (this._bb) {
      const bBox =  this.getLocalBB();
      bBox.ll.set(xMin, yMin);
      bBox.lr.set(xMax, yMin);
      bBox.ur.set(xMax, yMax);
      bBox.ul.set(xMin, yMax);
    }

    this._dateModified = new Date();
  }

  protected renderContent(): RenderToSvgResult {   
    try {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("transform", `matrix(${this._matrix.toFloatShortArray().join(" ")})`);
      g.setAttribute("fill", "none");
      g.setAttribute("stroke", `rgba(${this._strokeColor.join(",")})`);
      g.setAttribute("stroke-width", this._strokeWidth + "");
      if (this._strokeDashGap) {
        g.setAttribute("stroke-dasharray", this._strokeDashGap.join(" "));       
      }

      for (const pathCoords of this.pathList) {
        if (!pathCoords?.length) {
          continue;
        }

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        let d = `M ${pathCoords[0]} ${pathCoords[1]}`;
        for (let i = 2; i < pathCoords.length;) {
          d += ` L ${pathCoords[i++]} ${pathCoords[i++]}`;
        }
        path.setAttribute("d", d);
        g.append(path);
      }
      
      return {
        svg: g,
      };
    }
    catch (e) {
      console.log(`Annotation render error: ${e.message}`);
      return null;   
    } 
  }
}

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
