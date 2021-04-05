import { Vec2 } from "../math";
import { Quadruple } from "../common";

import { Annotator } from "./annotator";
import { PenData } from "./pen-data";
import { PathChangeEvent, PenAnnotation } from "../annotations/pen-annotation";
import { ImageView } from "../image/image-view";

export class PenAnnotator extends Annotator {
  protected static lastColor: Quadruple;

  protected _annotationPenData: PenData;  
  protected _color: Quadruple;

  constructor(parent: HTMLDivElement, imageView: ImageView, color?: Quadruple) {
    super(parent, imageView);
    this.init();

    this._color = color || PenAnnotator.lastColor || [0, 0, 0, 0.9];
    PenAnnotator.lastColor = this._color;
  }

  destroy() {   
    this.removeTempPenData();
    super.destroy();
  }

  refreshViewBox() {
    super.refreshViewBox();
    this.updatePenGroupPosition();
  }

  undoPath() {
    this._annotationPenData?.removeLastPath();
    this.emitPathCount();
  }

  clearPaths() {
    this.removeTempPenData();
  }

  savePathsAsPenAnnotation(userName?: string): 
  {imageUuid: string; annotation: PenAnnotation} {
    if (!this._annotationPenData) {
      return;
    }

    const imageUuid = this._annotationPenData.id;
    const annotation = PenAnnotation.createFromPenData(
      this._annotationPenData, userName);
    
    this.removeTempPenData();
    return {imageUuid, annotation};
  }
  
  protected init() {
    super.init();    
    this._overlay.addEventListener("pointerdown", 
      this.onPenPointerDown);
  }  

  protected updatePenGroupPosition() {
    if (!this._annotationPenData) {
      return;
    }

    const image = this._imageView;
    if (!image) {
      // set scale to 0 to hide pen group if it's image is not rendered
      this._annotationPenData.setGroupMatrix(
        [0, 0, 0, 0, 0, 0]);
    }
    const {height: ph, top: ptop, left: px} = image.viewContainer.getBoundingClientRect();
    const py = ptop + ph;
    const {height: vh, top: vtop, left: vx} = this._overlay.getBoundingClientRect();
    const vy = vtop + vh;
    const offsetX = (px - vx) / this._scale;
    const offsetY = (vy - py) / this._scale;

    this._annotationPenData.setGroupMatrix(
      [1, 0, 0, 1, offsetX, offsetY]);
  }

  protected removeTempPenData() {
    if (this._annotationPenData) {
      this._annotationPenData.group.remove();
      this._annotationPenData = null;
      this.emitPathCount();
    }    
  }

  protected resetTempPenData(imageUuid: string) {    
    this.removeTempPenData();    
    this._annotationPenData = new PenData({id: imageUuid, color: this._color});
    this._svgGroup.append(this._annotationPenData.group);

    // update pen group matrix to position the group properly
    this.updatePenGroupPosition();
  }
  
  protected onPenPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary || e.button === 2) {
      return;
    }    

    const {clientX: cx, clientY: cy} = e;
    this.updateImageCoords(cx, cy);
    const imageCoords = this._imageCoords;
    if (!imageCoords) {
      // return if the pointer is outside image
      return;
    }

    const {imageX: px, imageY: py} = imageCoords;
    if (!this._annotationPenData) {
      this.resetTempPenData(this._imageView.imageInfo.uuid);
    }
    this._annotationPenData.newPath(new Vec2(px, py));

    const target = e.target as HTMLElement;
    target.addEventListener("pointermove", this.onPenPointerMove);
    target.addEventListener("pointerup", this.onPenPointerUp);    
    target.addEventListener("pointerout", this.onPenPointerUp);  
    // capture pointer to make pointer events fire on same target
    target.setPointerCapture(e.pointerId);
  };

  protected onPenPointerMove = (e: PointerEvent) => {
    if (!e.isPrimary || !this._annotationPenData) {
      return;
    }

    const {clientX: cx, clientY: cy} = e;
    this.updateImageCoords(cx, cy);

    const imageCoords = this._imageCoords;
    if (!imageCoords) {
      // skip move if the pointer is outside of the image
      return;
    }
    
    this._annotationPenData.addPosition(new Vec2(imageCoords.imageX, imageCoords.imageY));
  };

  protected onPenPointerUp = (e: PointerEvent) => {
    if (!e.isPrimary) {
      return;
    }

    const target = e.target as HTMLElement;
    target.removeEventListener("pointermove", this.onPenPointerMove);
    target.removeEventListener("pointerup", this.onPenPointerUp);    
    target.removeEventListener("pointerout", this.onPenPointerUp);
    target.releasePointerCapture(e.pointerId);   

    this._annotationPenData?.endPath();
    this.emitPathCount();
  };

  protected emitPathCount() {
    this._parent.dispatchEvent(new PathChangeEvent({
      pathCount: this._annotationPenData?.pathCount || 0,
    }));
  }
}
