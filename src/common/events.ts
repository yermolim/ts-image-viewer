import { AnnotationBase, AnnotationDto } from "./annotation";
import { ImageInfoView } from "./image-info";

export const imageChangeEvent = "tsimage-imagechange" as const;
export const scaleChangedEvent = "tsimage-scalechanged" as const;
export const annotSelectionRequestEvent = "tsimage-annotselectionrequest" as const;
export const annotFocusRequestEvent = "tsimage-annotfocusrequest" as const;
export const annotEditRequestEvent = "tsimage-annoteditrequest" as const;
export const annotChangeEvent = "tsimage-annotchange" as const;
export const imageServiceStateChangeEvent = "tsimage-imageservicechange" as const;

export interface ImageEventDetail {
  type: "select" | "open" | "close" | "load" | "unload" | "render";
  imageViews: ImageInfoView[];
}
export interface ScaleChangedEventDetail {
  scale: number;
}
export interface AnnotSelectionRequestEventDetail {
  annotation: AnnotationBase;
}
export interface AnnotFocusRequestEventDetail {
  annotation: AnnotationBase;
}
export interface AnnotEditRequestEventDetail {
  annotation: AnnotationBase;
  undoAction: () => Promise<void>;
}
export interface AnnotEventDetail {
  type: "focus" | "select" | "add" | "edit" | "delete" | "render" | "import";
  annotations: AnnotationDto[];
}
export interface ImageServiceStateChangeEventDetail {
  undoableCount: number;
  scale: number;
}

export class ImageEvent extends CustomEvent<ImageEventDetail> {
  constructor(detail: ImageEventDetail) {
    super(imageChangeEvent, {detail});
  }
}
export class ScaleChangedEvent extends CustomEvent<ScaleChangedEventDetail> {
  constructor(detail: ScaleChangedEventDetail) {
    super(scaleChangedEvent, {detail});
  }
}
export class AnnotSelectionRequestEvent extends CustomEvent<AnnotSelectionRequestEventDetail> {
  constructor(detail: AnnotSelectionRequestEventDetail) {
    super(annotSelectionRequestEvent, {detail});
  }
}
export class AnnotFocusRequestEvent extends CustomEvent<AnnotFocusRequestEventDetail> {
  constructor(detail: AnnotFocusRequestEventDetail) {
    super(annotFocusRequestEvent, {detail});
  }
}
export class AnnotEditRequestEvent extends CustomEvent<AnnotEditRequestEventDetail> {
  constructor(detail: AnnotEditRequestEventDetail) {
    super(annotEditRequestEvent, {detail});
  }
}
export class AnnotEvent extends CustomEvent<AnnotEventDetail> {
  constructor(detail: AnnotEventDetail) {
    super(annotChangeEvent, {detail});
  }
}
export class ImageServiceStateChangeEvent extends CustomEvent<ImageServiceStateChangeEventDetail> {
  constructor(detail: ImageServiceStateChangeEventDetail) {
    super(imageServiceStateChangeEvent, {detail});
  }
}

declare global {
  interface HTMLElementEventMap {
    [imageChangeEvent]: ImageEvent;
    [scaleChangedEvent]: ScaleChangedEvent;
    [annotSelectionRequestEvent]: AnnotSelectionRequestEvent;
    [annotFocusRequestEvent]: AnnotFocusRequestEvent;
    [annotEditRequestEvent]: AnnotEditRequestEvent;
    [annotChangeEvent]: AnnotEvent;
    [imageServiceStateChangeEvent]: ImageServiceStateChangeEvent;
  }
}
