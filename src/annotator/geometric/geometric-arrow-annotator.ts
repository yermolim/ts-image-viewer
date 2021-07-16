import { Vec2 } from "mathador";

import { getRandomUuid } from "../../common/uuid";
import { buildLineEndingPath, getLineRenderHelpers, lineEndingTypes } from "../../drawing/utils";

import { ImageService } from "../../services/image-service";
import { LineAnnotationDto } from "../../annotations/geometric/line-annotation";
import { GeometricAnnotatorOptions } from "./geometric-annotator";
import { GeometricLineAnnotator } from "./geometric-line-annotator";

export class GeometricArrowAnnotator extends GeometricLineAnnotator {    
  constructor(imageService: ImageService,  
    parent: HTMLDivElement, options?: GeometricAnnotatorOptions) {
    super(imageService, parent, options || {});
  } 
   
  protected override redraw(min: Vec2, max: Vec2) {
    this._svgGroup.innerHTML = "";

    const [r, g, b, a] = this._color || [0, 0, 0, 1];

    const {matrix, alignedStart, alignedEnd} = getLineRenderHelpers(min, max);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
    path.setAttribute("stroke-width", this._strokeWidth + "");
    path.setAttribute("stroke-linecap", "square"); 

    // draw a line
    let pathString = `M${alignedStart.x},${alignedStart.y} L${alignedEnd.x},${alignedEnd.y}`;
    // draw an arrow
    const arrowPathString = buildLineEndingPath(alignedEnd, 
      lineEndingTypes.ARROW_OPEN, this._strokeWidth, "right");
    pathString += " " + arrowPathString;

    path.setAttribute("d", pathString);
    
    // transform the line to it's target position
    path.setAttribute("transform", `matrix(${matrix.truncate(2).toFloatShortArray().join(",")})`);

    this._svgGroup.append(path);
  }
  
  protected override buildAnnotationDto(): LineAnnotationDto {    
    const nowString = new Date().toISOString();
    const dto: LineAnnotationDto = {
      uuid: getRandomUuid(),
      annotationType: "line",
      imageUuid: null,

      dateCreated: nowString,
      dateModified: nowString,
      author: this._imageService.userName || "unknown",
      
      textContent: null,

      strokeColor: this._color,
      strokeWidth: this._strokeWidth,
      strokeDashGap: null,
      
      rotation: 0,

      vertices: [
        [this._points[0].x, this._points[0].y],
        [this._points[1].x, this._points[1].y],
      ],
      endings: [lineEndingTypes.NONE, lineEndingTypes.ARROW_OPEN],
      leaderLinePosHeight: 0,
      leaderLineNegHeight: 0,
      caption: null,
    };

    return dto;
  }
}

