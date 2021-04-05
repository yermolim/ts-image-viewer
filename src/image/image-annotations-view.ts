import { RenderToSvgResult } from "../common";
import { Annotation, AnnotSelectionRequestEvent } from "../annotations/annotation";
import { ImageInfo } from "./image-info";

export class ImageAnnotationView {
  private readonly _imageInfo: ImageInfo;

  private _rendered = new Set<Annotation>();

  private _container: HTMLDivElement;
  private _svg: SVGSVGElement;
  private _defs: SVGDefsElement;

  private _destroyed: boolean;

  constructor(imageInfo: ImageInfo) {
    if (!imageInfo) {
      throw new Error("Image info is not defined");
    }
    this._imageInfo = imageInfo;

    this._container = document.createElement("div");
    this._container.classList.add("image-annotations");

    this._svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this._svg.classList.add("stretch");
    this._svg.setAttribute("data-image-id", this._imageInfo.uuid + "");
    this._svg.setAttribute("fill", "none");
    const {x, y} = this._imageInfo.dimensions;
    this._svg.setAttribute("viewBox", `0 0 ${x} ${y}`);
    
    // handle annotation selection
    this._svg.addEventListener("pointerdown", () => {      
      document.dispatchEvent(new AnnotSelectionRequestEvent({
        annotation: null,
      }));
    });
    
    this._defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    this._container.append(this._svg);
  } 

  destroy() {
    this.remove();
    this._container = null;
    this._destroyed = true;
  }

  remove() {    
    this._container?.remove();
    document.removeEventListener("annotationselectionchange", this.onAnnotationSelectionChange);
  }  

  append(parent: HTMLElement) {
    if (this._destroyed) {
      return;
    }
    
    this.renderAnnotations();
    parent.append(this._container);
    document.addEventListener("annotationselectionchange", this.onAnnotationSelectionChange);
  }

  async toImageAsync(): Promise<HTMLImageElement> {
    const svgSerialized = new XMLSerializer().serializeToString(this._svg);
    const svgBlob = new Blob([svgSerialized], {type: "image/svg+xml;charset=utf-8"});
    const svgUrl = URL.createObjectURL(svgBlob);

    const result = await new Promise<HTMLImageElement>((resolve, reject) => {      
      const image = new Image();
      image.onerror = (e: string | Event) => {
        console.log(`Error while loading image: ${e}`);
        resolve(null);
      };
      image.onload = () => {
        resolve(image);
      };
      image.src = svgUrl;
    });
    
    URL.revokeObjectURL(svgUrl);
    return result;
  }

  private renderAnnotations(): boolean {    
    this.clear();

    const annotations = this._imageInfo.annotations || [];

    for (let i = 0; i < annotations.length || 0; i++) {
      const annotation = annotations[i];
      if (annotation.deleted) {
        continue;
      }

      let renderResult: RenderToSvgResult;
      if (!this._rendered.has(annotation)) {
        renderResult = annotation.render();
      } else {
        renderResult = annotation.lastRenderResult;
      }   

      if (!renderResult) {
        continue;
      }      
      this._rendered.add(annotation);
      const {svg, clipPaths} = renderResult;
      this._svg.append(svg);
      clipPaths?.forEach(x => this._defs.append(x));
      svg.addEventListener("pointerdown", 
        () => document.dispatchEvent(new AnnotSelectionRequestEvent({annotation})));
    }

    this._svg.append(this._defs);

    return true;
  }

  private clear() {
    this._svg.innerHTML = "";
    // this._rendered.clear();
  }

  private onAnnotationSelectionChange = (e: Event) => {
    const annotation: Annotation = e["detail"].annotation;
    if (annotation) {
      this._container.style.touchAction = "none";
    } else {
      this._container.style.touchAction = "";
    }
  };
}
