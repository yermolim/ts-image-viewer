import { Mat3, Vec2 } from "mathador";
import { EventService, CloudCurveData, Double } from "ts-viewers-core";

import { AppearanceRenderResult, BBox, BEZIER_CONSTANT, SELECTION_STROKE_WIDTH, 
  SvgElementWithBlendMode } from "../../drawing/utils";
import { GeometricAnnotation, GeometricAnnotationDto } from "./geometric-annotation";

export interface CircleAnnotationDto extends GeometricAnnotationDto {  
  rx: number;
  ry: number;
  center: Double;
  cloud: boolean;
  cloudArcSize?: number;
}

export class CircleAnnotation extends GeometricAnnotation {
  /**defines if annotation should be rendered using wavy lines (for custom annotations) */
  protected _cloud: boolean;
  get cloud(): boolean {
    return this._cloud;
  }
  protected _cloudArcSize: number;

  protected _rx: number;
  get rx(): number {
    return this._rx;
  }

  protected _ry: number;
  get ry(): number {
    return this._ry;
  }

  protected _center: Vec2;
  get center(): Vec2 {
    return this._center.clone();
  }
  
  constructor(eventService: EventService, dto: CircleAnnotationDto) {
    super(eventService, dto);
    
    if (dto.annotationType !== "circle") {
      throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'circle')`);
    }

    this._rx = dto.rx ?? 0;
    this._ry = dto.ry ?? 0;
    this._center = dto.center 
      ? new Vec2(dto.center[0], dto.center[1])
      : new Vec2();
    this._cloud = dto.cloud ?? false;
    this._cloudArcSize = dto.cloudArcSize ?? 20;
  }
  
  override toDto(): CircleAnnotationDto {
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

      rx: this._rx,
      ry: this._ry,
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

    // update radiuses 
    this._rx = boxBottomEdgeAfter.getMagnitude() / 2;
    this._ry = boxLeftEdgeAfter.getMagnitude() / 2;

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
      
      const rx = this._rx;
      const ry = this._ry;
      const topV = new Vec2(0, ry);
      const bottomV = new Vec2(0, -ry);
      const leftV = new Vec2(-rx, 0);
      const rightV = new Vec2(rx, 0);
      const zeroV = new Vec2();
      
      if (this._cloud) {
        path.setAttribute("stroke-linecap", "round");      
        path.setAttribute("stroke-linejoin", "round");   

        const curveData = CloudCurveData.buildFromEllipse(rx, ry, this._cloudArcSize, new Mat3()); 
        d += `M${curveData.start.x},${curveData.start.y}`;
        curveData.curves.forEach(x => {
          d += ` C${x[0].x},${x[0].y} ${x[1].x},${x[1].y} ${x[2].x},${x[2].y}`;
        });
      } else {
        // draw ellipse using four cubic bezier curves
        // calculate the curves control points
        const c = BEZIER_CONSTANT;
        const cx = Vec2.multiplyByScalar(rightV, c);
        const cy = Vec2.multiplyByScalar(topV, c);
        const controlTR1 = Vec2.add(Vec2.add(zeroV, topV), cx);
        const controlTR2 = Vec2.add(Vec2.add(zeroV, cy), rightV);
        const controlRB1 = Vec2.add(Vec2.subtract(zeroV, cy), rightV);
        const controlRB2 = Vec2.add(Vec2.subtract(zeroV, topV), cx);
        const controlBL1 = Vec2.subtract(Vec2.subtract(zeroV, topV), cx);
        const controlBL2 = Vec2.subtract(Vec2.subtract(zeroV, cy), rightV);
        const controlLT1 = Vec2.subtract(Vec2.add(zeroV, cy), rightV);
        const controlLT2 = Vec2.subtract(Vec2.add(zeroV, topV), cx);
        // drawing the curves starting at the top tangent
        d += `M${topV.x},${topV.y}`;
        d += ` C${controlTR1.x},${controlTR1.y} ${controlTR2.x},${controlTR2.y} ${rightV.x},${rightV.y}`;
        d += ` C${controlRB1.x},${controlRB1.y} ${controlRB2.x},${controlRB2.y} ${bottomV.x},${bottomV.y}`;
        d += ` C${controlBL1.x},${controlBL1.y} ${controlBL2.x},${controlBL2.y} ${leftV.x},${leftV.y}`;
        d += ` C${controlLT1.x},${controlLT1.y} ${controlLT2.x},${controlLT2.y} ${topV.x},${topV.y}`;
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
    const rx = this._rx + margin;
    const ry = this._ry + margin;

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
