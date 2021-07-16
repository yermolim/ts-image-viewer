import { Mat3, Vec2 } from "mathador";
import { EventService } from "../../common/event-service";
import { Double } from "../../common/types";
import { buildCloudCurveFromPolyline } from "../../drawing/clouds";
import { AppearanceRenderResult, BBox, SELECTION_STROKE_WIDTH, 
  SvgElementWithBlendMode } from "../../drawing/utils";
import { GeometricAnnotation, GeometricAnnotationDto } from "./geometric-annotation";
export interface SquareAnnotationDto extends GeometricAnnotationDto {
  width: number;
  height: number;
  center: Double;
  cloud: boolean;
  cloudArcSize?: number;
}

export class SquareAnnotation extends GeometricAnnotation {
  /**defines if annotation should be rendered using wavy lines (for custom annotations) */
  protected _cloud: boolean;
  get cloud(): boolean {
    return this._cloud;
  }
  protected _cloudArcSize: number;

  protected _width: number;
  get width(): number {
    return this._width;
  }

  protected _height: number;
  get height(): number {
    return this._height;
  }

  protected _center: Vec2;
  get center(): Vec2 {
    return this._center.clone();
  }
    
  constructor(eventService: EventService, dto: SquareAnnotationDto) {
    if (!dto) {
      throw new Error("No source object passed to the constructor");
    }
    if (dto.annotationType !== "square") {
      throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'square')`);
    }

    super(eventService, dto);

    this._width = dto.width ?? 0;
    this._height = dto.height ?? 0;
    this._center = dto.center 
      ? new Vec2(dto.center[0], dto.center[1])
      : new Vec2();
    this._cloud = dto.cloud ?? false;
    this._cloudArcSize = dto.cloudArcSize ?? 20;
  }
  
  override toDto(): SquareAnnotationDto {
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

      width: this._width,
      height: this._height,
      center: [this._center.x, this._center.y],
      cloud: this._cloud,
    };
  }
  
  protected override async applyCommonTransformAsync(matrix: Mat3, undoable = true) {
    // get annotation corners
    const {ll, lr, ur, ul} = this.getBoxCorners(false);
    ll.applyMat3(matrix);
    lr.applyMat3(matrix);
    ur.applyMat3(matrix);
    ul.applyMat3(matrix);
    const boxBottomEdgeAfter = Vec2.subtract(lr, ll);
    const boxLeftEdgeAfter = Vec2.subtract(ul, ll);

    // update dimensions 
    this._width = boxBottomEdgeAfter.getMagnitude();
    this._height = boxLeftEdgeAfter.getMagnitude();

    // update center position
    this._center.setFromVec2(Vec2.add(ll, ur).multiplyByScalar(0.5));  

    // update rotation
    const boxBottomEdgeHor = new Vec2(boxBottomEdgeAfter.getMagnitude(), 0);
    this._rotation = boxBottomEdgeHor.getAngle(boxBottomEdgeAfter); 

    await super.applyCommonTransformAsync(matrix, undoable);
  }
  
  protected updateAABB() {
    // get annotation box corners
    const bbox = this.getBoxCorners(true);
    const {ll, lr, ur, ul} = bbox;

    // find the minimum and maximum points
    const {min, max} = Vec2.minMax(ll, lr, ur, ul);

    // assign the corresponding fields values
    this._bbox = bbox;
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
        + "Z"
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

      let d = "";
      
      const w = this._width / 2;
      const h = this._height / 2;
      const bl = new Vec2(-w, -h);
      const br = new Vec2(w, -h);
      const tr = new Vec2(w, h);
      const tl = new Vec2(-w, h);
      
      if (this._cloud) {   
        path.setAttribute("stroke-linecap", "round");      
        path.setAttribute("stroke-linejoin", "round");   
             
        const curveData = buildCloudCurveFromPolyline([
          bl.clone(),
          br.clone(),
          tr.clone(),
          tl.clone(),
          bl.clone(),
        ], this._cloudArcSize);      
        d += `M${curveData.start.x},${curveData.start.y}`;
        curveData.curves.forEach(x => {
          d += ` C${x[0].x},${x[0].y} ${x[1].x},${x[1].y} ${x[2].x},${x[2].y}`;
        });
      } else {
        path.setAttribute("stroke-linecap", "square");      
        path.setAttribute("stroke-linejoin", "miter");

        d += `M${bl.x},${bl.y}`;
        d += ` L${br.x},${br.y}`;
        d += ` L${tr.x},${tr.y}`;
        d += ` L${tl.x},${tl.y}`;
        d += " Z";
      }

      const {x: tx, y: ty} = this._center.clone().truncate(1);
      const angle = this._rotation * 180 / Math.PI;
      path.setAttribute("transform", `translate(${tx} ${ty}) rotate(${-angle})`); 
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

  protected getBoxCorners(withMargins: boolean): BBox {    
    // get box margin taking into account stroke width and cloud curves
    const margin = withMargins
      ? this._cloud
        ? this._strokeWidth / 2 + this._cloudArcSize
        : this._strokeWidth / 2
      : 0;

    // add margins to radius
    const rx = this._width / 2 + margin;
    const ry = this._height / 2 + margin;

    // create vectors for box corners
    const bl = new Vec2(-rx, -ry);
    const br = new Vec2(rx, -ry);
    const tr = new Vec2(rx, ry);
    const tl = new Vec2(-rx, ry);

    // rotate corners if needed
    if (this._rotation) {
      const mat = new Mat3().applyRotation(this._rotation);
      bl.applyMat3(mat);
      br.applyMat3(mat);
      tr.applyMat3(mat);
      tl.applyMat3(mat); 
    }

    const center = this._center.clone();
    bl.add(center);
    br.add(center);
    tr.add(center);
    tl.add(center);

    return {
      ll: bl,
      lr: br,
      ur: tr,
      ul: tl,
    };
  }
}
