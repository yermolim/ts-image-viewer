import { Vec2, Mat3, getDistance2D } from "mathador";

/**tuple representing cubic bezier curve data (two control points and the end of the curve) */
type CurveData = [control1: Vec2, control2: Vec2, end: Vec2];

export interface CloudCurveData {
  start: Vec2;
  curves: CurveData[];
}

/**
 * calculate cubic bezier curves of the 'cloud' using the provided polyline points
 * @param polylinePoints ordered counterclockwise
 * @param maxArcSize maximum size of the single 'cloud' arc
 * @returns 
 */
export function buildCloudCurveFromPolyline(polylinePoints: Vec2[], maxArcSize: number): CloudCurveData {
  if (!polylinePoints || polylinePoints.length < 2) {
    // not a polyline
    return null;
  }
  if (isNaN(maxArcSize) || maxArcSize <= 0) {
    throw new Error(`Invalid maximal arc size ${maxArcSize}`);
  }
  
  const start = polylinePoints[0].clone().truncate(2);
  const curves: CurveData[] = [];

  const zeroVec = new Vec2();
  const lengthVec = new Vec2();
  let i: number;
  let j: number;
  let lineStart: Vec2;
  let lineEnd: Vec2;
  let lineLength: number;
  let arcCount: number;
  let arcSize: number;  
  let halfArcSize: number;
  let arcStart: number;
  let arcEnd: number;
  for (i = 0; i < polylinePoints.length - 1; i++) {
    lineStart = polylinePoints[i];
    lineEnd = polylinePoints[i + 1];
    lineLength = Vec2.subtract(lineEnd, lineStart).getMagnitude();
    if (!lineLength) {
      // skip lines with zero length
      continue;
    }

    lengthVec.set(lineLength, 0);
    // get the matrix to transform the 'cloudy' line to the same position the source line has
    const matrix = Mat3.from4Vec2(zeroVec, lengthVec, lineStart, lineEnd);    

    arcCount = Math.ceil(lineLength / maxArcSize);
    arcSize = lineLength / arcCount;
    halfArcSize = arcSize / 2;
    for (j = 0; j < arcCount; j++) {
      arcStart = j * arcSize;
      arcEnd = (j + 1) * arcSize;
      const curve: CurveData = [
        new Vec2(arcStart, -halfArcSize).applyMat3(matrix).truncate(2), // curve control 1
        new Vec2(arcEnd, -halfArcSize).applyMat3(matrix).truncate(2), // curve control 2
        new Vec2(arcEnd, 0).applyMat3(matrix).truncate(2), // curve end
      ];
      curves.push(curve);
    }
  }

  return {
    start,
    curves,
  };
}

/**
 * calculate cubic bezier curves of the 'cloud' using the provided information
 * @param rx ellipse horizontal radius
 * @param ry ellipse vertical radius
 * @param maxArcSize maximum size of the single 'cloud' arc
 * @param matrix transformation matrix to apply to the result
 * @returns 
 */
export function buildCloudCurveFromEllipse(rx: number, ry: number, maxArcSize: number, matrix?: Mat3,): CloudCurveData {  
  matrix ||= new Mat3();
  const center = new Vec2();
  // use Srinivasa Ramanujan's approximation
  const ellipseCircumferenceApprox = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  // calculate ellipse segments rounding to the nearest multiple of 4 (for symmetry)
  const segmentsNumber = Math.ceil(ellipseCircumferenceApprox / maxArcSize / 4) * 4;
  const maxSegmentLength = Math.ceil(ellipseCircumferenceApprox / segmentsNumber);
  const points: Vec2[] = [];
  const current = new Vec2(center.x + rx, center.y);
  const next = new Vec2();
  let angle = 0;
  let distance: number;
  // push start point
  points.push(current.clone().applyMat3(matrix).truncate(2));
  for (let i = 0; i < segmentsNumber; i++) {
    distance = 0;
    while (distance < maxSegmentLength) {
      angle += 0.25 / 180 * Math.PI;
      next.set(rx * Math.cos(angle) + center.x, ry * Math.sin(angle) + center.y);
      distance += getDistance2D(current.x, current.y, next.x, next.y);
      current.setFromVec2(next);
    }
    points.push(current.clone().applyMat3(matrix).truncate(2));
  }

  const curveData = buildCloudCurveFromPolyline(points, maxArcSize);    
  return curveData;
}
