import { Mat3, Vec2 } from "mathador";

import { Double } from "../common/types";
import { AnnotationBase, AnnotationDto } from "../common/annotation";
import { EventService } from "../common/event-service";

import { AppearanceRenderResult, BBox, SELECTION_STROKE_WIDTH, 
  SvgElementWithBlendMode } from "../drawing/utils";
import { StandardStampCreationInfo, standardStampCreationInfos } from "../drawing/stamps";

export interface StampAnnotationDto extends AnnotationDto {
  stampType: string;
  stampSubject?: string;
  stampImageData?: number[];
  defaultWidth?: number;
  defaultHeight?: number;
  width: number;
  height: number;
  center: Double;
}

export class StampAnnotation extends AnnotationBase {
  protected _stampType: string;
  get stampType(): string {
    return this._stampType;
  }
  
  protected _stampSubject: string;
  get stampSubject(): string {
    return this._stampSubject;
  }
  
  protected _stampImageData: Uint8ClampedArray;
  get stampImageData(): Uint8ClampedArray {
    return this._stampImageData;
  }
  
  protected _defaultWidth: number;
  get defaultWidth(): number {
    return this._defaultWidth;
  }

  protected _defaultHeight: number;
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

  protected _center: Vec2;
  get center(): Vec2 {
    return this._center.clone();
  }
  
  constructor(eventService: EventService, dto: StampAnnotationDto) {
    if (!dto) {
      throw new Error("No source object passed to the constructor");
    }

    super(eventService, dto);
    
    if (dto.annotationType !== "stamp") {
      throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'stamp')`);
    }

    this._stampType = dto.stampType;
    this._stampImageData = new Uint8ClampedArray(dto.stampImageData);
    this._stampSubject = dto.stampSubject;
    this._width = dto.width ?? 0;
    this._height = dto.height ?? 0;
    this._defaultWidth = dto.defaultWidth ?? this._width;
    this._defaultHeight = dto.defaultHeight ?? this._height;
    this._center = dto.center 
      ? new Vec2(dto.center[0], dto.center[1])
      : new Vec2();
  }
  
  toDto(): StampAnnotationDto {
    return {
      annotationType: this.type,
      uuid: this.uuid,
      imageUuid: this._imageUuid,

      dateCreated: this._dateCreated.toISOString(),
      dateModified: this._dateModified.toISOString(),
      author: this._author,

      rotation: this._rotation,
      textContent: this._textContent,
      
      stampType: this._stampType,
      stampSubject: this._stampSubject,
      stampImageData: [...this._stampImageData],
      defaultWidth: this._defaultWidth,
      defaultHeight: this._defaultHeight,
      width: this._width,
      height: this._height,
      center: [this._center.x, this._center.y],
    };
  } 
  
  async renderStampAppearanceAsync(): Promise<AppearanceRenderResult> {
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

      if (!this._stampImageData?.length) {
        const stampData: StandardStampCreationInfo = standardStampCreationInfos[this._stampType];
        if (!stampData) {
          throw new Error(`Can't find data for the stamp type: ${this._stampType}`);
        }        

        // calculate graphics matrix
        const matrix = new Mat3();
        // center stamp around 0,0
        const halfDefaultBboxWidth = stampData.bbox[2] / 2;
        const halfDefaultBboxHeight = stampData.bbox[3] / 2;
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

        const [r, g, b, a] = stampData.color;
        const colorString = `rgba(${r*255},${g*255},${b*255},${a})`;
        for (const pathData of stampData.formPaths) {
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("fill", pathData.fill ? colorString : "none");
          path.setAttribute("stroke", pathData.stroke ? colorString : "none");
          path.setAttribute("stroke-width", stampData.strokeWidth + "");
          path.setAttribute("d", pathData.pathString);
          path.setAttribute("transform", transformationString);          
          group.append(path);
          
          // create a transparent path copy with large stroke width to simplify user interaction  
          const clonedPath = path.cloneNode(true) as SVGPathElement;
          const clonedPathStrokeWidth = stampData.strokeWidth < SELECTION_STROKE_WIDTH
            ? SELECTION_STROKE_WIDTH
            : stampData.strokeWidth;
          clonedPath.setAttribute("stroke-width", clonedPathStrokeWidth + "");
          clonedPath.setAttribute("stroke", "transparent");
          clonedPath.setAttribute("fill", pathData.fill ? "transparent" : "none");
          clonedGroup.append(clonedPath);
        }
      } else {
        if (this._stampImageData.length % 4) {
          throw new Error(`Wrong image data array length: ${this._stampImageData.length}`);
        }       

        // calculate graphics matrix
        const matrix = new Mat3();
        // center stamp around 0,0
        const halfWidth = this._width / 2;
        const halfHeight = this._height / 2;
        matrix.applyTranslation(-halfWidth, -halfHeight);
        // apply rotation
        matrix.applyRotation(this._rotation);
        // move to the center point
        matrix.applyTranslation(this._center.x, this.center.y);
        // get svg attribute transformation string
        const transformationString = `matrix(${matrix.truncate(5).toFloatShortArray().join(" ")})`;
        
        // convert RGBA array to url using canvas
        const imageData = new ImageData(this._stampImageData, 
          this._defaultWidth, this._defaultHeight);
        const canvas = document.createElement("canvas");
        canvas.width = this._defaultWidth;
        canvas.height = this._defaultHeight;
        canvas.getContext("2d").putImageData(imageData, 0, 0);
        const imageDataBase64 = canvas.toDataURL("image/png");        

        const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        image.onerror = e => {
          console.log(e);
          console.log("Loading stamp image data failed");
        };
        image.onload = e => {};
        image.setAttribute("href", imageDataBase64);
        image.setAttribute("width", this._width + "");
        image.setAttribute("height", this._height + "");   
        image.setAttribute("preserveAspectRatio", "none");
        image.setAttribute("transform", transformationString);
        group.append(image);

        // create a transparent rect with same dimensions as the image 
        // to simplify user interaction 
        const imageCopyRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        imageCopyRect.setAttribute("width", this._width + "");
        imageCopyRect.setAttribute("height", this._height + "");   
        imageCopyRect.setAttribute("fill", "transparent");
        imageCopyRect.setAttribute("transform", transformationString);
        clonedGroup.append(imageCopyRect);
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
}
