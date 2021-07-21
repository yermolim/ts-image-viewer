import { Mat3, Vec2 } from "mathador";

import { Double, Quadruple } from "../common/types";
import { AnnotationBase, AnnotationDto } from "../common/annotation";
import { EventService } from "../common/event-service";
import { AppearanceRenderResult, BBox, SELECTION_STROKE_WIDTH, 
  SvgElementWithBlendMode } from "../drawing/utils";

//#region additional text annotation types and constants
const noteAnnotationForms = {
  NOTE: [
    { 
      pathString: `
        M25,10
        L175,10
        C175,10 190,10 190,25
        L190,135
        C190,135 190,150 175,150
        L95,150
        L10,190
        L35,150
        L25,150
        C25,150 10,150 10,135
        L10,25
        C10,25 10,10 25,10
        Z`,
      stroke: true,
      fill: true,
    },
    { 
      pathString: `
        M35,35
        L165,35`,
      stroke: true,
    },
    { 
      pathString: `
        M35,55
        L165,55`,
      stroke: true,
    },
    { 
      pathString: `
        M35,75
        L125,75`,
      stroke: true,
    },
    { 
      pathString: `
        M35,95
        L165,95`,
      stroke: true,
    },
    { 
      pathString: `
        M35,115
        L115,115`,
      stroke: true,
    },
  ],
} as const;

interface NoteCreationInfo {   
  formPaths: {
    pathString: string;
    fill: boolean;
    stroke: boolean; 
  }[];
  subject: string;
  strokeWidth: number;
  bbox: Quadruple;
}

const textNoteCreationInfos = {
  "Note": {        
    formPaths: noteAnnotationForms.NOTE,
    subject: "Note",
    strokeWidth: 8.58,
    bbox: [0, 0, 200, 200],
  },
} as const;

export const noteIconTypes = {
  COMMENT: "Comment",
  KEY: "Key",
  NOTE: "Note",
  HELP: "Help",
  NEW_PARAGRAPH: "NewParagraph",
  PARAGRAPH: "Paragraph",
  INSERT: "Insert",
} as const;
export type NoteIconType = typeof noteIconTypes[keyof typeof noteIconTypes];

export interface NoteAnnotationDto extends AnnotationDto {
  iconType: NoteIconType;
  strokeColor?: Quadruple;
  fillColor?: Quadruple;
  width?: number;
  height?: number;
  center: Double;
}
//#endregion

export class NoteAnnotation extends AnnotationBase {
  protected _iconType: NoteIconType;
  get iconType(): NoteIconType {
    return this._iconType;
  }
  
  protected _center: Vec2;
  get center(): Vec2 {
    return this._center.clone();
  }

  protected _strokeColor: Quadruple;
  get strokeColor(): Quadruple {
    return this._strokeColor;
  }

  protected _fillColor: Quadruple;
  get fillColor(): Quadruple {
    return this._fillColor;
  }

  protected readonly _defaultWidth: number;
  get defaultWidth(): number {
    return this._defaultWidth;
  }

  protected readonly _defaultHeight: number;
  get defaultHeight(): number {
    return this._defaultHeight;
  }
  
  protected _width: number;
  get width(): number {
    return this._width;
  }

  protected _height: number;
  get height(): number {
    return this._height;
  }
  
  protected readonly _creationInfo: NoteCreationInfo;
  
  constructor(eventService: EventService, dto: NoteAnnotationDto) {
    if (!dto) {
      throw new Error("No source object passed to the constructor");
    }
    super(eventService, dto);
    
    if (dto.annotationType !== "note") {
      throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'note')`);
    }

    this._iconType = dto.iconType || noteIconTypes.NOTE;
    this._creationInfo = textNoteCreationInfos[this._iconType];
    if (!this._creationInfo) {
      throw new Error(`Can't find data for the note type: ${this._iconType}`);
    }
    this._defaultWidth = this._creationInfo.bbox[2];
    this._defaultHeight = this._creationInfo.bbox[3];
    this._width = dto.width ?? this._defaultWidth;
    this._height = dto.height ?? this._defaultHeight;

    this._strokeColor = dto.strokeColor || [0, 0, 0, 1];
    this._fillColor = dto.fillColor || [1, 1, 0.4, 1];
    this._center = dto.center 
      ? new Vec2(dto.center[0], dto.center[1])
      : new Vec2();
  }
  
  toDto(): NoteAnnotationDto {
    return {
      annotationType: this.type,
      uuid: this.uuid,
      imageUuid: this._imageUuid,

      dateCreated: this._dateCreated.toISOString(),
      dateModified: this._dateModified.toISOString(),
      author: this._author,

      rotation: this._rotation,
      textContent: this._textContent,

      iconType: this._iconType,
      strokeColor: this._strokeColor,
      fillColor: this._fillColor,
      center: [this._center.x, this._center.y],
      width: this._width,
      height: this._height,
    };
  } 

  async renderNoteAppearanceAsync(): Promise<AppearanceRenderResult> {
    return await this.renderAppearanceAsync();
  }
  
  /**
   * move the annotation to the specified coords relative to the image
   * @param point target point corrdiantes in the image coordinate system 
   */
  override async moveToAsync(point: Vec2) {
    const x = point.x - this._center.x;
    const y = point.y - this._center.y;
    const mat = Mat3.buildTranslate(x, y);
    await this.applyCommonTransformAsync(mat);
  } 
  
  /**
   * rotate the annotation by a certain angle
   * @param angle angle in radians
   * @param center point to rotate around (if not specified, the annotation center is used)
   */
  async rotateByAsync(angle: number, center?: Vec2) {   
    center ||= this._center;
    const mat = new Mat3()
      .applyTranslation(-center.x, -center.y)
      .applyRotation(angle)
      .applyTranslation(center.x, center.y);
    await this.applyCommonTransformAsync(mat);
  }
  
  protected getBoxCorners(): BBox {
    // get half-dimensions
    const hw = this._width / 2;
    const hh = this._height / 2;

    // create vectors for box corners
    const bl = new Vec2(-hw, -hh);
    const br = new Vec2(hw, -hh);
    const tr = new Vec2(hw, hh);
    const tl = new Vec2(-hw, hh);

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
  
  protected updateAABB() {
    // get annotation box corners
    const bbox = this.getBoxCorners();
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

      const noteIconData = this._creationInfo;      

      // calculate graphics matrix
      const matrix = new Mat3();
      // center stamp around 0,0
      const halfDefaultBboxWidth = this._defaultWidth / 2;
      const halfDefaultBboxHeight = this._defaultHeight / 2;
      matrix.applyTranslation(-halfDefaultBboxWidth, -halfDefaultBboxHeight);
      // apply scaling
      const halfScaledWidth = this._width / 2;
      const halfScaledHeight = this._height / 2;
      matrix.applyScaling(halfScaledWidth / halfDefaultBboxWidth, 
        halfScaledHeight / halfDefaultBboxHeight);
      // apply rotation
      matrix.applyRotation(this._rotation);
      // move to the center point
      matrix.applyTranslation(this._center.x, this.center.y);
      // get svg attribute transformation string
      const transformationString = `matrix(${matrix.truncate(5).toFloatShortArray().join(" ")})`;

      const [fr, fg, fb, fa] = this._fillColor;
      const fillColorString = `rgba(${fr*255},${fg*255},${fb*255},${fa})`;
      const [sr, sg, sb, sa] = this._strokeColor;
      const strokeColorString = `rgba(${sr*255},${sg*255},${sb*255},${sa})`;
      for (const pathData of noteIconData.formPaths) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", pathData.fill ? fillColorString : "none");
        path.setAttribute("stroke", pathData.stroke ? strokeColorString : "none");
        path.setAttribute("stroke-width", noteIconData.strokeWidth + "");
        path.setAttribute("d", pathData.pathString);
        path.setAttribute("transform", transformationString);          
        group.append(path);
        
        // create a transparent path copy with large stroke width to simplify user interaction  
        const clonedPath = path.cloneNode(true) as SVGPathElement;
        const clonedPathStrokeWidth = noteIconData.strokeWidth < SELECTION_STROKE_WIDTH
          ? SELECTION_STROKE_WIDTH
          : noteIconData.strokeWidth;
        clonedPath.setAttribute("stroke-width", clonedPathStrokeWidth + "");
        clonedPath.setAttribute("stroke", "transparent");
        clonedPath.setAttribute("fill", pathData.fill ? "transparent" : "none");
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
  
  protected override async applyCommonTransformAsync(matrix: Mat3, undoable = true) {
    // get annotation corners
    const {ll, lr, ur, ul} = this.getBoxCorners();
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

  // disable handles
  protected override renderHandles(): SVGGraphicsElement[] {   
    return [];
  }
}
