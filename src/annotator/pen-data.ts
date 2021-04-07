import { Quadruple, Hextuple } from "../common";
import { Vec2 } from "../math";

interface PathData {
  path: SVGPathElement;
  positions: Vec2[];
}

export interface PenDataOptions {
  /**higher values give smoother lines but lower performance */
  bufferSize?: number; 
  strokeWidth?: number;  
  color?: Quadruple;
  id?: string;
}

export class PenData {
  static readonly defaultOptions: PenDataOptions = {
    bufferSize: 8, 
    strokeWidth: 3,
    color: [0, 0, 0, 0.5],
  };  
  private _options: PenDataOptions;
  get id(): string {
    return this._options.id;
  }
  get bufferSize(): number {
    return this._options.bufferSize;
  }
  get strokeWidth(): number {
    return this._options.strokeWidth;
  } 
  get color(): Quadruple {
    return <Quadruple><unknown>this._options.color.slice();
  }

  private _group: SVGGraphicsElement;
  get group(): SVGGraphicsElement {
    return this._group;
  }

  private _paths: PathData[] = []; 
  get paths(): PathData[] {
    return this._paths.slice();
  }
  get pathCount(): number {
    return this._paths.length;
  }
 
  private _positionBuffer: Vec2[] = [];
  private _currentPath: PathData;
  private _currentPathString: string;

  constructor(options?: PenDataOptions) {
    this._options = Object.assign({}, PenData.defaultOptions, options);
    this._group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  }

  /**start the new path. discards unfinished current path */
  newPath(startPosition: Vec2) {
    const [r, g, b, a] = this._options.color || [0, 0, 0, 1];
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", `rgba(${r},${g},${b},${a})`);
    path.setAttribute("stroke-width", this._options.strokeWidth + "");

    const pathString = "M" + startPosition.x + " " + startPosition.y;
    path.setAttribute("d", pathString);

    this._positionBuffer = [startPosition];
    this._currentPath = {path, positions: [new Vec2(startPosition.x, startPosition.y)]};
    this._currentPathString = pathString;
    this._group.append(path);
  }

  /**end the current path and push it to the 'paths' property */
  endPath() {    
    if (this._currentPath && this._currentPath.positions.length > 1) {      
      this._paths.push(this._currentPath);
    }
    this._positionBuffer = null;
    this._currentPath = null;
    this._currentPathString = null;
  }

  removePath(path: SVGPathElement) {
    if (!path) {
      return;
    }
    path.remove();
    this._paths = this._paths.filter(x => x.path !== path);
  }

  removeLastPath() {
    const pathData = this._paths.pop();
    pathData?.path.remove();
  }

  /**add position to the current path */
  addPosition(pos: Vec2) {
    this.appendPositionToBuffer(pos);
    this.updateCurrentPath();
  }

  /**transform path group */
  setGroupMatrix(matrix?: Hextuple) {
    this._group.setAttribute("transform", `matrix(${matrix.join(" ")})`);
  }
  
  private appendPositionToBuffer(pos: Vec2) {
    const buffer = this._positionBuffer;
    buffer.push(pos);
    this._positionBuffer = buffer
      .slice(Math.max(0, buffer.length - this._options.bufferSize), buffer.length);
  }

  private getAveragePosition(offset: number): Vec2 {
    const bufferLen = this._positionBuffer.length;
    if (bufferLen % 2 === 1 || bufferLen >= this._options.bufferSize) {
      let totalX = 0;
      let totalY = 0;
      let pos: Vec2;
      let i: number;
      let count = 0;
      for (i = offset; i < bufferLen; i++) {
        count++;
        pos = this._positionBuffer[i];
        totalX += pos.x;
        totalY += pos.y;
      }
      return new Vec2(totalX / count, totalY / count);
    }
    return null;
  }  

  private updateCurrentPath() {
    let pos = this.getAveragePosition(0);

    if (pos) {
      // get the smoothed part of the path that will not change
      this._currentPathString += " L" + pos.x + " " + pos.y;    
      this._currentPath.positions.push(pos);

      // get the last part of the path (close to the current mouse position)
      // this part will change if the mouse moves again
      let tmpPath = "";
      for (let offset = 2; offset < this._positionBuffer.length; offset += 2) {
        pos = this.getAveragePosition(offset);
        tmpPath += " L" + pos.x + " " + pos.y;
      }

      // set the complete current path coordinates
      this._currentPath.path.setAttribute("d", this._currentPathString + tmpPath);
    }
  };
}
