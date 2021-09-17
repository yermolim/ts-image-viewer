import { EventService, customStampEvent, CustomStampEvent, CustomStampCreationInfo, CustomStampEventDetail } from 'ts-viewers-core';
export { CustomStampCreationInfo, CustomStampEventDetail } from 'ts-viewers-core';
import { Vec2, Mat3 } from 'mathador';

declare type CssMixBlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion";
interface BBox {
    ll: Vec2;
    lr: Vec2;
    ur: Vec2;
    ul: Vec2;
}
interface SvgElementWithBlendMode {
    element: SVGGraphicsElement;
    blendMode: CssMixBlendMode;
}
interface AppearanceRenderResult {
    clipPaths: SVGClipPathElement[];
    elements: SvgElementWithBlendMode[];
    pickHelpers: SVGGraphicsElement[];
}

declare class ImageInfo {
    protected readonly _uuid: string;
    get uuid(): string;
    protected readonly _url: string;
    get url(): string;
    protected readonly _dimensions: Vec2;
    get dimensions(): Vec2;
    protected _preloadedImage: HTMLImageElement;
    protected _scale: number;
    set scale(value: number);
    get scale(): number;
    protected _rotation: number;
    set rotation(value: number);
    get rotation(): number;
    protected _annotations: AnnotationBase[];
    get annotations(): AnnotationBase[];
    constructor(source: HTMLImageElement | string, uuid?: string);
    getImageAsync(): Promise<HTMLImageElement>;
}
interface ImageCoords {
    info: ImageInfo;
    x: number;
    y: number;
}
interface ImageLoadInfo {
    type: "URL" | "Base64" | "Blob" | "ByteArray";
    data: string | Blob | Uint8Array;
    uuid?: string;
}
interface ImageInfoView {
    readonly index: number;
    readonly eventService: EventService;
    readonly imageInfo: ImageInfo;
    get previewContainer(): HTMLDivElement;
    get viewWrapper(): HTMLDivElement;
    get viewContainer(): HTMLDivElement;
    get scale(): number;
    set scale(value: number);
    get rotation(): number;
    get viewValid(): boolean;
    destroy(): void;
    renderPreviewAsync(force: boolean): Promise<void>;
    renderViewAsync(force: boolean): Promise<void>;
    clearPreview(): void;
    rotateClockwise(): void;
    rotateCounterClockwise(): void;
    bakeAnnotationsAsync(): Promise<Blob>;
    getImageCoordsUnderPointer(clientX: number, clientY: number): ImageCoords;
}

interface AnnotationRenderResult {
    controls: SVGGraphicsElement;
    content: HTMLDivElement;
}
interface AnnotationDto {
    annotationType: string;
    uuid: string;
    imageUuid: string;
    dateCreated: string;
    dateModified: string;
    author: string;
    textContent?: string;
    rotation?: number;
}
interface RenderableAnnotation {
    onPointerDownAction: (e: PointerEvent) => void;
    onPointerEnterAction: (e: PointerEvent) => void;
    onPointerLeaveAction: (e: PointerEvent) => void;
    get lastRenderResult(): AnnotationRenderResult;
    renderAsync(imageInfo: ImageInfo): Promise<AnnotationRenderResult>;
    toDto(): AnnotationDto;
    toImageAsync(): Promise<HTMLImageElement[]>;
}
declare abstract class AnnotationBase implements RenderableAnnotation {
    translationEnabled: boolean;
    readonly eventService: EventService;
    readonly uuid: string;
    readonly type: string;
    onPointerDownAction: (e: PointerEvent) => void;
    onPointerEnterAction: (e: PointerEvent) => void;
    onPointerLeaveAction: (e: PointerEvent) => void;
    protected _imageInfo: ImageInfo;
    protected _imageUuid: string;
    get imageUuid(): string;
    set imageUuid(value: string);
    protected _deleted: boolean;
    get deleted(): boolean;
    set deleted(value: boolean);
    protected _dateCreated: Date;
    get dateCreated(): Date;
    protected _dateModified: Date;
    get dateModified(): Date;
    protected _author: string;
    get author(): string;
    protected _textContent: string;
    get textContent(): string;
    protected _rotation: number;
    get rotation(): number;
    protected _bbox: BBox;
    get bbox(): BBox;
    protected _aabbIsActual: boolean;
    protected readonly _aabb: readonly [min: Vec2, min: Vec2];
    get aabb(): readonly [min: Vec2, min: Vec2];
    protected _transformationPromise: Promise<void>;
    protected _transformationTimer: number;
    protected _tempX: number;
    protected _tempY: number;
    protected _currentAngle: number;
    protected _moved: boolean;
    protected _tempTransformationMatrix: Mat3;
    protected _tempStartPoint: Vec2;
    protected _tempVecX: Vec2;
    protected _tempVecY: Vec2;
    protected readonly _svgId: string;
    protected _renderedBox: SVGGraphicsElement;
    protected _renderedControls: SVGGraphicsElement;
    protected _renderedContent: HTMLDivElement;
    protected _svgContentCopy: SVGGraphicsElement;
    get lastRenderResult(): AnnotationRenderResult;
    protected constructor(eventService: EventService, dto?: AnnotationDto);
    renderAsync(imageInfo: ImageInfo): Promise<AnnotationRenderResult>;
    moveToAsync(point: Vec2): Promise<void>;
    rotateByAsync(angle: number, center?: Vec2): Promise<void>;
    toDto(): AnnotationDto;
    setTextContentAsync(text: string, undoable?: boolean): Promise<void>;
    toImageAsync(): Promise<HTMLImageElement[]>;
    protected convertClientCoordsToImage(clientX: number, clientY: number): Vec2;
    protected convertImageCoordsToClient(imageX: number, imageY: number): Vec2;
    protected getAnnotationToImageMatrix(): Mat3;
    protected applyCommonTransformAsync(matrix: Mat3, undoable?: boolean): Promise<void>;
    protected applyTempTransformAsync(): Promise<void>;
    protected renderRect(): SVGGraphicsElement;
    protected renderBox(): SVGGraphicsElement;
    protected renderControls(): SVGGraphicsElement;
    protected buildRenderedContentStructure(renderResult: AppearanceRenderResult): HTMLDivElement;
    protected buildRenderContentCopy(contentRenderResult: AppearanceRenderResult): SVGGraphicsElement;
    protected renderScaleHandles(): SVGGraphicsElement[];
    protected renderRotationHandle(): SVGGraphicsElement;
    protected renderHandles(): SVGGraphicsElement[];
    protected updateRenderAsync(): Promise<any>;
    protected onSvgPointerEnter: (e: PointerEvent) => void;
    protected onSvgPointerLeave: (e: PointerEvent) => void;
    protected onSvgPointerDown: (e: PointerEvent) => void;
    protected onTranslationPointerDown: (e: PointerEvent) => void;
    protected onTranslationPointerMove: (e: PointerEvent) => void;
    protected onTranslationPointerUp: (e: PointerEvent) => void;
    protected onRotationHandlePointerDown: (e: PointerEvent) => void;
    protected onRotationHandlePointerMove: (e: PointerEvent) => void;
    protected onRotationHandlePointerUp: (e: PointerEvent) => void;
    protected onScaleHandlePointerDown: (e: PointerEvent) => void;
    protected onScaleHandlePointerMove: (e: PointerEvent) => void;
    protected onScaleHandlePointerUp: (e: PointerEvent) => void;
    protected emitEditRequest(undoAction: () => Promise<void>): void;
    protected abstract renderAppearanceAsync(): Promise<AppearanceRenderResult>;
    protected abstract updateAABB(): void;
}

declare const imageChangeEvent: "tsimage-imagechange";
declare const scaleChangedEvent: "tsimage-scalechanged";
declare const annotSelectionRequestEvent: "tsimage-annotselectionrequest";
declare const annotFocusRequestEvent: "tsimage-annotfocusrequest";
declare const annotEditRequestEvent: "tsimage-annoteditrequest";
declare const annotChangeEvent: "tsimage-annotchange";
declare const imageServiceStateChangeEvent: "tsimage-imageservicechange";
interface ImageEventDetail {
    type: "select" | "open" | "close" | "load" | "unload" | "render";
    imageViews: ImageInfoView[];
}
interface ScaleChangedEventDetail {
    scale: number;
}
interface AnnotSelectionRequestEventDetail {
    annotation: AnnotationBase;
}
interface AnnotFocusRequestEventDetail {
    annotation: AnnotationBase;
}
interface AnnotEditRequestEventDetail {
    annotation: AnnotationBase;
    undoAction: () => Promise<void>;
}
interface AnnotEventDetail {
    type: "focus" | "select" | "add" | "edit" | "delete" | "render" | "import";
    annotations: AnnotationDto[];
}
interface ImageServiceStateChangeEventDetail {
    undoableCount: number;
    scale: number;
}
declare class ImageEvent extends CustomEvent<ImageEventDetail> {
    constructor(detail: ImageEventDetail);
}
declare class ScaleChangedEvent extends CustomEvent<ScaleChangedEventDetail> {
    constructor(detail: ScaleChangedEventDetail);
}
declare class AnnotSelectionRequestEvent extends CustomEvent<AnnotSelectionRequestEventDetail> {
    constructor(detail: AnnotSelectionRequestEventDetail);
}
declare class AnnotFocusRequestEvent extends CustomEvent<AnnotFocusRequestEventDetail> {
    constructor(detail: AnnotFocusRequestEventDetail);
}
declare class AnnotEditRequestEvent extends CustomEvent<AnnotEditRequestEventDetail> {
    constructor(detail: AnnotEditRequestEventDetail);
}
declare class AnnotEvent extends CustomEvent<AnnotEventDetail> {
    constructor(detail: AnnotEventDetail);
}
declare class ImageServiceStateChangeEvent extends CustomEvent<ImageServiceStateChangeEventDetail> {
    constructor(detail: ImageServiceStateChangeEventDetail);
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

declare global {
    interface HTMLElementEventMap {
        [customStampEvent]: CustomStampEvent;
    }
}
declare type FileButtons = "open" | "save" | "close";
interface TsImageViewerOptions {
    containerSelector: string;
    userName?: string;
    fileButtons?: FileButtons[];
    fileOpenAction?: () => void;
    fileSaveAction?: () => void;
    fileCloseAction?: () => void;
    annotChangeCallback?: (detail: AnnotEventDetail) => void;
    customStamps?: CustomStampCreationInfo[];
    customStampChangeCallback?: (detail: CustomStampEventDetail) => void;
    lazyLoadImages?: boolean;
    previewWidth?: number;
}
declare class TsImageViewer {
    private readonly _userName;
    private _outerContainer;
    private _shadowRoot;
    private _mainContainer;
    private readonly _eventService;
    private readonly _imageService;
    private readonly _annotatorService;
    private readonly _customStampsService;
    private readonly _loader;
    private readonly _viewer;
    private readonly _previewer;
    private _fileOpenAction;
    private _fileSaveAction;
    private _fileCloseAction;
    private _annotChangeCallback;
    private _customStampChangeCallback;
    private _mainContainerRObserver;
    private _panelsHidden;
    private _fileInput;
    private _imageLoadingTask;
    private _timers;
    constructor(options: TsImageViewerOptions);
    destroy(): void;
    openImagesAsync(loadInfos: ImageLoadInfo[], selectedIndex?: number): Promise<void>;
    closeImages(): void;
    importAnnotationsAsync(dtos: AnnotationDto[]): Promise<void>;
    importAnnotationsFromJsonAsync(json: string): Promise<void>;
    exportAnnotations(imageUuid?: string): AnnotationDto[];
    exportAnnotationsToJson(imageUuid?: string): string;
    importCustomStamps(customStamps: CustomStampCreationInfo[]): void;
    importCustomStampsFromJson(json: string): void;
    exportCustomStamps(): CustomStampCreationInfo[];
    exportCustomStampsToJson(): string;
    private initMainContainerEventHandlers;
    private initViewControls;
    private initFileButtons;
    private onFileInput;
    private onOpenFileButtonClick;
    private onSaveFileButtonClick;
    private onCloseFileButtonClick;
    private initModeSwitchButtons;
    private initAnnotationButtons;
    private setViewerMode;
    private onHandModeButtonClick;
    private onAnnotatorModeButtonClick;
    private onZoomOutClick;
    private onZoomInClick;
    private onZoomFitViewerClick;
    private onZoomFitImageClick;
    private onRotateCounterClockwiseClick;
    private onRotateClockwiseClick;
    private onPaginatorPrevClick;
    private onPaginatorNextClick;
    private annotatorUndo;
    private annotatorClear;
    private annotatorSave;
    private onCustomStampChanged;
    private onAnnotatorChange;
    private onAnnotatorDataChanged;
    private setAnnotatorMode;
    private onAnnotatorEditTextButtonClick;
    private onAnnotatorDeleteButtonClick;
    private onAnnotatorSelectModeButtonClick;
    private onAnnotatorStampModeButtonClick;
    private onAnnotatorPenModeButtonClick;
    private onAnnotatorGeometricModeButtonClick;
    private onAnnotatorTextModeButtonClick;
    private imageServiceUndo;
    private onImageChange;
    private onImageServiceStateChange;
    private showPreviewer;
    private refreshImages;
    private onPreviewerToggleClick;
    private onMainContainerPointerMove;
}

export { AnnotEvent, AnnotEventDetail, AnnotationDto, FileButtons, ImageLoadInfo, TsImageViewer, TsImageViewerOptions };
