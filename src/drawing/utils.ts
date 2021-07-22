import { Mat3, Vec2 } from "mathador";
  
export type CssMixBlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" 
| "color-dodge" |"color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion";

/**width (in image units) of the transparent lines rendered to simplify annotation selection */
export const SELECTION_STROKE_WIDTH = 20;

/**constant used to imitate circle using four cubic bezier curves */
export const BEZIER_CONSTANT = 0.551915;

/**cloud arc size to image width ratio */
export const CLOUD_ARC_RATIO = 0.02;

/**defines how many times the line ending size is larger than the line width */
export const LINE_END_SIZE_RATIO = 3;
export const LINE_END_MIN_SIZE = 10;
/**defines how many times the line caption size is larger than the line width */
export const LINE_CAPTION_SIZE_RATIO = 5;
/**defines how many times the line font size is larger than the line width */
export const LINE_CAPTION_FONT_RATIO = 4;
/**defines how many times the line caption size is larger than the line width */
export const TEXT_SIZE_RATIO = 5;
/**defines how many times the line font size is larger than the line width */
export const TEXT_FONT_RATIO = 4;

export const lineEndingTypes = {
  SQUARE: "square",
  CIRCLE: "circle",
  DIAMOND: "diamond",
  ARROW_OPEN: "openarrow",
  ARROW_CLOSED: "closedarrow",
  NONE: "none",
  BUTT: "butt",
  ARROW_OPEN_R: "ropenArrow",
  ARROW_CLOSED_R: "rclosedArrow",
  SLASH: "slash",
} as const;
export type LineEndingType = typeof lineEndingTypes[keyof typeof lineEndingTypes];

export const justificationTypes = {
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right",
} as const;
export type JustificationType = typeof justificationTypes[keyof typeof justificationTypes];

export interface BBox {
  /**lower-left corner coords */
  ll: Vec2; 
  /**lower-right corner coords */
  lr: Vec2; 
  /**upper-right corner coords */
  ur: Vec2; 
  /**upper-left corner coords */
  ul: Vec2;
}

export interface BaseDimensions {  
  width: number;
  height: number;
  scale?: number;
  rotation?: number;
}
  
export interface PointerDownInfo {
  timestamp: number;
  clientX: number;
  clientY: number;
}

export interface TransformationInfo {
  tx?: number;
  ty?: number;
  rotation?: number;
  sx?: number;
  sy?: number;
}

export interface SvgElementWithBlendMode {
  element: SVGGraphicsElement; 
  blendMode: CssMixBlendMode;
}

export interface AppearanceRenderResult {
  /**
   * array of all clip paths used in the stream.
   * taken out separately to prevent duplicating the clip paths for each stream item
   */
  clipPaths: SVGClipPathElement[];
  /**
   * svg graphics elements for each item in the stream paired with its blend mode
   */
  elements: SvgElementWithBlendMode[];
  /**
   * transparent copies with wide stroke of the SVG elements.
   * they are intended to use in user interaction layer to simplify narrow items selection
   */
  pickHelpers: SVGGraphicsElement[];
}

export interface LineRenderHelpers {
  matrix: Mat3;
  alignedStart: Vec2;
  alignedEnd: Vec2;
}

export function buildLineEndingPath(point: Vec2, type: LineEndingType, 
  strokeWidth: number, side: "left" | "right"): string {
  const size = Math.max(strokeWidth * LINE_END_SIZE_RATIO, 
    LINE_END_MIN_SIZE);
  let text = "";
  switch (type) {
    case lineEndingTypes.ARROW_OPEN:
      if (side === "left") {      
        text += `M${point.x + size},${point.y + size / 2}`;
        text += ` L${point.x},${point.y}`;
        text += ` L${point.x + size},${point.y - size / 2}`;
      } else {
        text += `M${point.x - size},${point.y + size / 2}`;
        text += ` L${point.x},${point.y}`;
        text += ` L${point.x - size},${point.y - size / 2}`;
      }
      return text;
    case lineEndingTypes.ARROW_OPEN_R:
      if (side === "left") {      
        text += `M${point.x},${point.y + size / 2}`;
        text += ` L${point.x + size},${point.y}`;
        text += ` L${point.x},${point.y - size / 2}`;
      } else {
        text += `M${point.x},${point.y + size / 2}`;
        text += ` L${point.x - size},${point.y}`;
        text += ` L${point.x},${point.y - size / 2}`;
      }
      return text;
    case lineEndingTypes.ARROW_CLOSED:
      if (side === "left") {      
        text += `M${point.x + size},${point.y + size / 2}`;
        text += ` L${point.x},${point.y}`;
        text += ` L${point.x + size},${point.y - size / 2}`;
      } else {
        text += `M${point.x - size},${point.y + size / 2}`;
        text += ` L${point.x},${point.y}`;
        text += ` L${point.x - size},${point.y - size / 2}`;
      }
      text += " Z";
      return text;
    case lineEndingTypes.ARROW_CLOSED_R:
      if (side === "left") {  
        text += `M${point.x + size},${point.y}`; 
        text += ` L${point.x},${point.y + size / 2}`;
        text += ` L${point.x},${point.y - size / 2}`;
      } else { 
        text += `M${point.x - size},${point.y}`;
        text += ` L${point.x},${point.y - size / 2}`;
        text += ` L${point.x},${point.y + size / 2}`;
      }
      text += " Z";
      return text;
    case lineEndingTypes.BUTT:     
      text += `M${point.x},${point.y + size / 2}`;
      text += ` L${point.x},${point.y - size / 2}`;
      return text;
    case lineEndingTypes.SLASH:     
      text += `M${point.x + size / 2},${point.y + size / 2}`;
      text += ` L${point.x - size / 2},${point.y - size / 2}`;
      return text;        
    case lineEndingTypes.DIAMOND:     
      text += `M${point.x},${point.y + size / 2}`;
      text += ` L${point.x + size / 2},${point.y}`;
      text += ` L${point.x},${point.y - size / 2}`;
      text += ` L${point.x - size / 2},${point.y}`;
      text += " Z";
      return text;       
    case lineEndingTypes.SQUARE:     
      text += `M${point.x - size / 2},${point.y + size / 2}`;
      text += ` L${point.x + size / 2},${point.y + size / 2}`;
      text += ` L${point.x + size / 2},${point.y - size / 2}`;
      text += ` L${point.x - size / 2},${point.y - size / 2}`;
      text += " Z";
      return text;       
    case lineEndingTypes.CIRCLE:
      const c = BEZIER_CONSTANT;
      const r = size / 2;       
      const cw = c * r;
      const xmin = point.x - r;
      const ymin = point.y - r;
      const xmax = point.x + r;
      const ymax = point.y + r;
      // drawing four cubic bezier curves starting at the top tangent
      text += `M${point.x},${ymax}`;
      text += ` C${point.x + cw},${ymax} ${xmax},${point.y + cw} ${xmax},${point.y}`;
      text += ` C${xmax},${point.y - cw} ${point.x + cw},${ymin} ${point.x},${ymin}`;
      text += ` C${point.x - cw},${ymin} ${xmin},${point.y - cw} ${xmin},${point.y}`;
      text += ` C${xmin},${point.y + cw} ${point.x - cw},${ymax} ${point.x},${ymax}`;
      text += " Z";
      return text;
    case lineEndingTypes.NONE:
    default:
      return "";
  }
}
  
export function getLineRenderHelpers(start: Vec2, end: Vec2): LineRenderHelpers {
  // calculate the data for updating bounding boxes
  const length = Vec2.subtract(end, start).getMagnitude();    
  const alignedStart = new Vec2();
  const alignedEnd = new Vec2(length, 0);
  const matrix = Mat3.from4Vec2(alignedStart, alignedEnd, start, end);    
  return {
    matrix,
    alignedStart,
    alignedEnd,
  };
}
