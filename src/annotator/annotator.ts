import { ImageView } from "../image/image-view";

interface ImageCoords {
  imageX: number;
  imageY: number;
}

export abstract class Annotator {
  protected readonly _parent: HTMLDivElement;
  protected readonly _imageView: ImageView;

  protected _scale = 1;
  get scale(): number {
    return this._scale;
  }
  set scale(value: number) {
    this._scale = value;
    this.refreshViewBox();
  }
  protected _lastScale: number;
  
  protected _overlayContainer: HTMLDivElement;
  get overlayContainer(): HTMLDivElement {
    return this._overlayContainer;
  }

  protected _overlay: HTMLDivElement;
  protected _svgWrapper: SVGGraphicsElement;
  protected _svgGroup: SVGGraphicsElement;

  protected _parentMutationObserver: MutationObserver;
  protected _parentResizeObserver: ResizeObserver;

  protected _imageCoords: ImageCoords;

  constructor(parent: HTMLDivElement, imageView: ImageView) {
    if (!parent || !imageView) {
      throw new Error("Argument is not defined");
    }
    this._parent = parent;
    this._imageView = imageView;
  }

  destroy() {    
    this._overlayContainer.remove();

    this._parent?.removeEventListener("scroll", this.onParentScroll);
    this._parentMutationObserver?.disconnect();
    this._parentResizeObserver?.disconnect();
  }

  refreshViewBox() {
    const {width: w, height: h} = this._overlay.getBoundingClientRect();
    if (!w || !h) {
      return;
    }

    this._overlay.style.left = this._parent.scrollLeft + "px";
    this._overlay.style.top = this._parent.scrollTop + "px";   
    const viewBoxWidth = w / this._scale;
    const viewBoxHeight = h / this._scale;
    this._svgWrapper.setAttribute("viewBox", `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
    this._lastScale = this._scale;
  }

  protected onParentScroll = () => {
    this.refreshViewBox();
  };

  protected initObservers() {
    this._parent.addEventListener("scroll", this.onParentScroll);
    const onPossibleViewerSizeChanged = () => {
      if (this._scale === this._lastScale) {
        return;
      }
      this.refreshViewBox();
    };
    const viewerRObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      onPossibleViewerSizeChanged();
    });
    const viewerMObserver = new MutationObserver((mutations: MutationRecord[]) => {
      const record = mutations[0];
      if (!record) {
        return;
      }
      record.addedNodes.forEach(x => {
        const element = x as HTMLElement;
        if (element.classList.contains("image")) {
          viewerRObserver.observe(x as HTMLElement);
        }
      });
      record.removedNodes.forEach(x => viewerRObserver.unobserve(x as HTMLElement));
      onPossibleViewerSizeChanged();
    });
    viewerMObserver.observe(this._parent, {
      attributes: false,
      childList: true,
      subtree: false,
    });
    this._parentMutationObserver = viewerMObserver;
    this._parentResizeObserver = viewerRObserver;
  }
  
  protected init() {
    const annotationOverlayContainer = document.createElement("div");
    annotationOverlayContainer.id = "annotator-overlay-container";
    
    const annotationOverlay = document.createElement("div");
    annotationOverlay.id = "annotator-overlay";
    
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("annotator-svg", "abs-stretch", "no-margin", "no-padding");
    svg.setAttribute("opacity", "0.75");

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.append(g);

    annotationOverlay.append(svg);
    annotationOverlayContainer.append(annotationOverlay);    
    
    this._overlayContainer = annotationOverlayContainer;
    this._overlay = annotationOverlay;
    this._svgWrapper = svg;
    this._svgGroup = g;    

    this._parent.append(this._overlayContainer);

    this.refreshViewBox();    
    // add handlers and observers to keep the svg scale actual
    this.initObservers();
  }
  
  protected updateImageCoords(clientX: number, clientY: number) {
    const imageCoords = this.getImageCoordsUnderPointer(clientX, clientY);
    if (!imageCoords) {
      this._svgWrapper.classList.add("out");
    } else {      
      this._svgWrapper.classList.remove("out");
    }

    this._imageCoords = imageCoords;
  }  
   
  protected getImageCoordsUnderPointer(clientX: number, clientY: number): ImageCoords {
    const {left: pxMin, top: pyMin, width: pw, height: ph} = this._imageView.viewContainer.getBoundingClientRect();
    const pxMax = pxMin + pw;
    const pyMax = pyMin + ph;

    if ((clientX < pxMin || clientX > pxMax)
      || (clientY < pyMin || clientY > pyMax)) {
      // point is not inside a image
      return null;
    }

    // point is inside the image
    return {
      imageX: (clientX - pxMin) / this._scale,
      imageY: (clientY - pyMin) / this._scale,
    };  
  }
}
