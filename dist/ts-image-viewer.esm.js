/**
 * Browser image viewer with basic annotationing support
 * Copyright (C) 2021-present Volodymyr Yermolenko (yermolim@gmail.com), Chemproject PJSC
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 * 
 * You can be released from the requirements of the license by purchasing
 * a commercial license. Buying such a license is mandatory as soon as you
 * develop commercial activities involving this program without
 * disclosing the source code of your own applications.
 */

import { Icons, getCommonStyles, UUID, SvgSmoothPath, CloudCurveData, DomUtils, SvgTempPath, ContextMenu, HtmlTemplates, EventService, CustomStampService, Loader, customStampEvent } from 'ts-viewers-core';
import { Vec2, Mat3, getDistance2D } from 'mathador';

const mainHtml = `
  <div id="main-container" class="hide-previewer disabled" 
    ondragstart="return false;" ondrop="return false;">
    <div id="viewer"></div>
    <div id="previewer"></div>
    <div id="top-panel"> 
      <div id="previewer-toggler" class="subpanel panel-item">
        <div id="toggle-previewer" class="panel-button panel-item">
          <img src="${Icons.icon_sidebar}"/>
        </div> 
      </div>
      <div id="modes" class="subpanel panel-item">
        <div id="button-mode-hand" class="panel-button panel-item">
          <img src="${Icons.icon_hand}"/>
        </div> 
        <div id="button-mode-annotation" class="panel-button panel-item">
          <img src="${Icons.icon_popup}"/>
        </div> 
        <div class="panel-v-separator margin-s-5 panel-item"></div>
        <div id="button-open-file" class="panel-button panel-item">
          <img src="${Icons.icon_load}"/>
        </div> 
        <div id="button-save-file" class="panel-button panel-item">
          <img src="${Icons.icon_download}"/>
        </div> 
        <div id="button-close-file" class="panel-button panel-item">
          <img src="${Icons.icon_close2}"/>
        </div> 
      </div>
    </div>
    <div id="bottom-panel">
      <div id="paginator" class="subpanel panel-item">
        <div id="paginator-prev" class="panel-button">
          <img src="${Icons.icon_arrow_left}"/>
        </div>
        <div id="paginator-next" class="panel-button">
          <img src="${Icons.icon_arrow_right}"/>
        </div>
      </div>
      <div class="panel-v-separator panel-item"></div>
      <div id="rotator" class="subpanel panel-item">        
        <div id="rotate-counterclockwise" class="panel-button">
          <img src="${Icons.icon_counter_clockwise}"/>
        </div>
        <div id="rotate-clockwise" class="panel-button">
          <img src="${Icons.icon_clockwise}"/>
        </div>
      </div>      
      <div class="panel-v-separator panel-item"></div>
      <div id="zoomer" class="subpanel panel-item">
        <div id="zoom-out" class="panel-button">
          <img src="${Icons.icon_minus}"/>
        </div>
        <div id="zoom-in" class="panel-button">
          <img src="${Icons.icon_plus}"/>
        </div>
        <div id="zoom-fit-viewer" class="panel-button">
          <img src="${Icons.icon_fit_viewer}"/>
        </div>
        <div id="zoom-fit-page" class="panel-button">
          <img src="${Icons.icon_fit_page}"/>
        </div>
      </div>
    </div>
    <div id="command-panel">
      <div class="command-panel-row">
        <div id="button-command-undo" 
          class="panel-button command-panel-subitem accent">
          <img src="${Icons.icon_back}"/>
        </div>
      </div>      
    </div>
    <div id="annotation-panel">
      <div class="annotation-panel-row">
        <div id="button-annotation-edit-text" 
          class="panel-button annotation-panel-subitem">
          <img src="${Icons.icon_text}"/>
        </div> 
        <div id="button-annotation-delete" 
          class="panel-button annotation-panel-subitem">
          <img src="${Icons.icon_close}"/>
        </div> 
        <div id="button-annotation-mode-select" 
          class="panel-button annotation-panel-item">
          <img src="${Icons.icon_pointer}"/>
        </div> 
      </div>
      <div class="annotation-panel-row">
        <div id="button-annotation-stamp-undo" 
          class="panel-button annotation-panel-subitem">
          <img src="${Icons.icon_back}"/>
        </div> 
        <div id="button-annotation-stamp-clear" 
          class="panel-button annotation-panel-subitem">
          <img src="${Icons.icon_close}"/>
        </div>
        <div id="button-annotation-stamp-save" 
          class="panel-button annotation-panel-subitem">
          <img src="${Icons.icon_ok}"/>
        </div> 
        <div id="button-annotation-mode-stamp" 
          class="panel-button annotation-panel-item">
          <img src="${Icons.icon_stamp}"/>
        </div> 
      </div>
      <div class="annotation-panel-row">
        <div id="button-annotation-pen-undo" 
          class="panel-button annotation-panel-subitem">
          <img src="${Icons.icon_back}"/>
        </div> 
        <div id="button-annotation-pen-clear" 
          class="panel-button annotation-panel-subitem">
          <img src="${Icons.icon_close}"/>
        </div> 
        <div id="button-annotation-pen-save" 
          class="panel-button annotation-panel-subitem">
          <img src="${Icons.icon_ok}"/>
        </div> 
        <div id="button-annotation-mode-pen" 
          class="panel-button annotation-panel-item">
          <img src="${Icons.icon_pen}"/>
        </div> 
      </div>
      <div class="annotation-panel-row">
        <div id="button-annotation-geometric-undo" 
          class="panel-button annotation-panel-subitem">
          <img src="${Icons.icon_back}"/>
        </div> 
        <div id="button-annotation-geometric-clear" 
          class="panel-button annotation-panel-subitem">
          <img src="${Icons.icon_close}"/>
        </div> 
        <div id="button-annotation-geometric-save" 
          class="panel-button annotation-panel-subitem">
          <img src="${Icons.icon_ok}"/>
        </div> 
        <div id="button-annotation-mode-geometric" 
          class="panel-button annotation-panel-item">
          <img src="${Icons.icon_geometric}"/>
        </div>
      </div>
      <div class="annotation-panel-row">
        <div id="button-annotation-text-undo" 
          class="panel-button annotation-panel-subitem">
          <img src="${Icons.icon_back}"/>
        </div> 
        <div id="button-annotation-text-clear" 
          class="panel-button annotation-panel-subitem">
          <img src="${Icons.icon_close}"/>
        </div> 
        <div id="button-annotation-text-save" 
          class="panel-button annotation-panel-subitem">
          <img src="${Icons.icon_ok}"/>
        </div> 
        <div id="button-annotation-mode-text" 
          class="panel-button annotation-panel-item">
          <img src="${Icons.icon_text2}"/>
        </div>
      </div>
    </div>

    <div id="focused-annotation-panel">
      <p id="focused-annotation-author" class="line-clamp"></p>
      <p id="focused-annotation-date" class="line-clamp"></p>
      <p id="focused-annotation-text" class="line-clamp"></p>
    </div>

    <input id="open-file-input" type="file" multiple="true" class="abs-hidden">
  </div>
`;

const appName = "tsimage";
const styles = `
<style>
  ${getCommonStyles(appName)}
  
  #bottom-panel {
    left: calc(50% - 160px);
    width: 320px;
  }
  .compact #bottom-panel {  
    left: calc(50% - 120px);  
    width: 240px;
  }

  .page-container {
    margin: auto;
  }
</style>
`;

const imageChangeEvent = "tsimage-imagechange";
const scaleChangedEvent = "tsimage-scalechanged";
const annotSelectionRequestEvent = "tsimage-annotselectionrequest";
const annotFocusRequestEvent = "tsimage-annotfocusrequest";
const annotEditRequestEvent = "tsimage-annoteditrequest";
const annotChangeEvent = "tsimage-annotchange";
const imageServiceStateChangeEvent = "tsimage-imageservicechange";
class ImageEvent extends CustomEvent {
    constructor(detail) {
        super(imageChangeEvent, { detail });
    }
}
class ScaleChangedEvent extends CustomEvent {
    constructor(detail) {
        super(scaleChangedEvent, { detail });
    }
}
class AnnotSelectionRequestEvent extends CustomEvent {
    constructor(detail) {
        super(annotSelectionRequestEvent, { detail });
    }
}
class AnnotFocusRequestEvent extends CustomEvent {
    constructor(detail) {
        super(annotFocusRequestEvent, { detail });
    }
}
class AnnotEditRequestEvent extends CustomEvent {
    constructor(detail) {
        super(annotEditRequestEvent, { detail });
    }
}
class AnnotEvent extends CustomEvent {
    constructor(detail) {
        super(annotChangeEvent, { detail });
    }
}
class ImageServiceStateChangeEvent extends CustomEvent {
    constructor(detail) {
        super(imageServiceStateChangeEvent, { detail });
    }
}

var __awaiter$r = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class AnnotationBase {
    constructor(eventService, dto) {
        var _a;
        this._aabb = [new Vec2(), new Vec2()];
        this._currentAngle = 0;
        this._tempTransformationMatrix = new Mat3();
        this._tempStartPoint = new Vec2();
        this._tempVecX = new Vec2();
        this._tempVecY = new Vec2();
        this._svgId = UUID.getRandomUuid();
        this.onSvgPointerEnter = (e) => {
            if (this.onPointerEnterAction) {
                this.onPointerEnterAction(e);
            }
        };
        this.onSvgPointerLeave = (e) => {
            if (this.onPointerLeaveAction) {
                this.onPointerLeaveAction(e);
            }
        };
        this.onSvgPointerDown = (e) => {
            if (!this.imageUuid) {
                return;
            }
            if (this.onPointerDownAction) {
                this.onPointerDownAction(e);
            }
            this.onTranslationPointerDown(e);
        };
        this.onTranslationPointerDown = (e) => {
            if (!this.translationEnabled || !e.isPrimary) {
                return;
            }
            const target = e.target;
            target.setPointerCapture(e.pointerId);
            target.addEventListener("pointerup", this.onTranslationPointerUp);
            target.addEventListener("pointerout", this.onTranslationPointerUp);
            this._moved = false;
            this._transformationTimer = setTimeout(() => {
                this._transformationTimer = null;
                this._renderedControls.after(this._svgContentCopy);
                this._tempStartPoint.setFromVec2(this.convertClientCoordsToImage(e.clientX, e.clientY));
                target.addEventListener("pointermove", this.onTranslationPointerMove);
            }, 200);
        };
        this.onTranslationPointerMove = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const current = this.convertClientCoordsToImage(e.clientX, e.clientY);
            this._tempTransformationMatrix.reset()
                .applyTranslation(current.x - this._tempStartPoint.x, current.y - this._tempStartPoint.y);
            this._svgContentCopy.setAttribute("transform", `matrix(${this._tempTransformationMatrix.toFloatShortArray().join(" ")})`);
            this._moved = true;
        };
        this.onTranslationPointerUp = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.removeEventListener("pointermove", this.onTranslationPointerMove);
            target.removeEventListener("pointerup", this.onTranslationPointerUp);
            target.removeEventListener("pointerout", this.onTranslationPointerUp);
            target.releasePointerCapture(e.pointerId);
            this.applyTempTransformAsync();
        };
        this.onRotationHandlePointerDown = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.setPointerCapture(e.pointerId);
            target.addEventListener("pointerup", this.onRotationHandlePointerUp);
            target.addEventListener("pointerout", this.onRotationHandlePointerUp);
            this._moved = false;
            this._transformationTimer = setTimeout(() => {
                this._transformationTimer = null;
                this._renderedControls.after(this._svgContentCopy);
                target.addEventListener("pointermove", this.onRotationHandlePointerMove);
            }, 200);
            e.stopPropagation();
        };
        this.onRotationHandlePointerMove = (e) => {
            var _a;
            if (!e.isPrimary) {
                return;
            }
            const [{ x: xmin, y: ymin }, { x: xmax, y: ymax }] = this.aabb;
            const centerX = (xmin + xmax) / 2;
            const centerY = (ymin + ymax) / 2;
            const clientCenter = this.convertImageCoordsToClient(centerX, centerY);
            const imageAngle = ((_a = this._imageInfo) === null || _a === void 0 ? void 0 : _a.rotation)
                ? this._imageInfo.rotation / 180 * Math.PI
                : 0;
            const angle = Math.atan2(e.clientX - clientCenter.x, e.clientY - clientCenter.y) + imageAngle;
            this._tempTransformationMatrix.reset()
                .applyTranslation(-centerX, -centerY)
                .applyRotation(angle)
                .applyTranslation(centerX, centerY);
            this._svgContentCopy.setAttribute("transform", `matrix(${this._tempTransformationMatrix.toFloatShortArray().join(" ")})`);
            this._moved = true;
        };
        this.onRotationHandlePointerUp = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.removeEventListener("pointermove", this.onRotationHandlePointerMove);
            target.removeEventListener("pointerup", this.onRotationHandlePointerUp);
            target.removeEventListener("pointerout", this.onRotationHandlePointerUp);
            target.releasePointerCapture(e.pointerId);
            this.applyTempTransformAsync();
        };
        this.onScaleHandlePointerDown = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.setPointerCapture(e.pointerId);
            target.addEventListener("pointerup", this.onScaleHandlePointerUp);
            target.addEventListener("pointerout", this.onScaleHandlePointerUp);
            const { ul, ll, lr, ur } = this.bbox;
            const handleName = target.dataset["handleName"];
            switch (handleName) {
                case "ll":
                    this._tempStartPoint.setFromVec2(ur);
                    this._tempVecX.setFromVec2(ul).subtract(ur);
                    this._tempVecY.setFromVec2(lr).subtract(ur);
                    break;
                case "lr":
                    this._tempStartPoint.setFromVec2(ul);
                    this._tempVecX.setFromVec2(ur).subtract(ul);
                    this._tempVecY.setFromVec2(ll).subtract(ul);
                    break;
                case "ur":
                    this._tempStartPoint.setFromVec2(ll);
                    this._tempVecX.setFromVec2(lr).subtract(ll);
                    this._tempVecY.setFromVec2(ul).subtract(ll);
                    break;
                case "ul":
                    this._tempStartPoint.setFromVec2(lr);
                    this._tempVecX.setFromVec2(ll).subtract(lr);
                    this._tempVecY.setFromVec2(ur).subtract(lr);
                    break;
                default:
                    throw new Error(`Invalid handle name: ${handleName}`);
            }
            this._tempX = this._tempVecX.getMagnitude();
            this._tempY = this._tempVecY.getMagnitude();
            this._moved = false;
            this._transformationTimer = setTimeout(() => {
                this._transformationTimer = null;
                this._renderedControls.after(this._svgContentCopy);
                target.addEventListener("pointermove", this.onScaleHandlePointerMove);
            }, 200);
            e.stopPropagation();
        };
        this.onScaleHandlePointerMove = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const currentBoxDiagonal = this.convertClientCoordsToImage(e.clientX, e.clientY)
                .subtract(this._tempStartPoint);
            const currentBoxDiagonalLength = currentBoxDiagonal.getMagnitude();
            const cos = Math.abs(currentBoxDiagonal.dotProduct(this._tempVecX))
                / currentBoxDiagonalLength / this._tempX;
            const currentXSideLength = cos * currentBoxDiagonalLength;
            const currentYSideLength = Math.sqrt(currentBoxDiagonalLength * currentBoxDiagonalLength
                - currentXSideLength * currentXSideLength);
            const scaleX = currentXSideLength / this._tempX;
            const scaleY = currentYSideLength / this._tempY;
            const [{ x: xmin, y: ymin }, { x: xmax, y: ymax }] = this.aabb;
            const annotCenterX = (xmin + xmax) / 2;
            const annotCenterY = (ymin + ymax) / 2;
            const currentRotation = this._rotation;
            this._tempTransformationMatrix.reset()
                .applyTranslation(-annotCenterX, -annotCenterY)
                .applyRotation(-currentRotation)
                .applyScaling(scaleX, scaleY)
                .applyRotation(currentRotation)
                .applyTranslation(annotCenterX, annotCenterY);
            const translation = this._tempStartPoint.clone().subtract(this._tempStartPoint.clone().applyMat3(this._tempTransformationMatrix));
            this._tempTransformationMatrix.applyTranslation(translation.x, translation.y);
            this._svgContentCopy.setAttribute("transform", `matrix(${this._tempTransformationMatrix.toFloatShortArray().join(" ")})`);
            this._moved = true;
        };
        this.onScaleHandlePointerUp = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.removeEventListener("pointermove", this.onScaleHandlePointerMove);
            target.removeEventListener("pointerup", this.onScaleHandlePointerUp);
            target.removeEventListener("pointerout", this.onScaleHandlePointerUp);
            target.releasePointerCapture(e.pointerId);
            this.applyTempTransformAsync();
        };
        if (!eventService) {
            throw new Error("Event service is not defined");
        }
        this.eventService = eventService;
        this.type = (dto === null || dto === void 0 ? void 0 : dto.annotationType) || "none";
        this.uuid = (dto === null || dto === void 0 ? void 0 : dto.uuid) || UUID.getRandomUuid();
        this._imageUuid = dto === null || dto === void 0 ? void 0 : dto.imageUuid;
        this._dateCreated = (dto === null || dto === void 0 ? void 0 : dto.dateCreated)
            ? new Date(dto.dateCreated)
            : new Date();
        this._dateModified = (dto === null || dto === void 0 ? void 0 : dto.dateModified)
            ? new Date(dto.dateModified)
            : new Date();
        this._author = (dto === null || dto === void 0 ? void 0 : dto.author) || "unknown";
        if (dto === null || dto === void 0 ? void 0 : dto.textContent) {
            this._textContent = dto.textContent;
        }
        this._rotation = (_a = dto === null || dto === void 0 ? void 0 : dto.rotation) !== null && _a !== void 0 ? _a : 0;
    }
    get imageUuid() {
        return this._imageUuid;
    }
    set imageUuid(value) {
        if (value !== this._imageUuid) {
            this._imageUuid = value;
            this._imageInfo = null;
        }
    }
    get deleted() {
        return this._deleted;
    }
    set deleted(value) {
        this._deleted = value;
    }
    get dateCreated() {
        return new Date(this._dateCreated);
    }
    get dateModified() {
        return new Date(this._dateModified);
    }
    get author() {
        return this._author;
    }
    get textContent() {
        return this._textContent;
    }
    get rotation() {
        return this._rotation;
    }
    get bbox() {
        if (this._bbox) {
            return this._bbox;
        }
        const [{ x: xmin, y: ymin }, { x: xmax, y: ymax }] = this.aabb;
        const bbox = {
            ul: new Vec2(xmin, ymin),
            ll: new Vec2(xmin, ymax),
            lr: new Vec2(xmax, ymax),
            ur: new Vec2(xmax, ymin),
        };
        return bbox;
    }
    get aabb() {
        if (!this._aabbIsActual) {
            this.updateAABB();
            this._aabbIsActual = true;
        }
        return [this._aabb[0].clone(), this._aabb[1].clone()];
    }
    get lastRenderResult() {
        if (!this._renderedControls || !this._renderedContent) {
            return null;
        }
        return {
            controls: this._renderedControls,
            content: this._renderedContent,
        };
    }
    renderAsync(imageInfo) {
        return __awaiter$r(this, void 0, void 0, function* () {
            if (!imageInfo) {
                throw new Error("Can't render the annotation: image dimensions is not defined");
            }
            this._imageInfo = imageInfo;
            if (!this._renderedControls) {
                this._renderedControls = this.renderControls();
            }
            yield new Promise((resolve, reject) => {
                setTimeout(() => __awaiter$r(this, void 0, void 0, function* () {
                    yield this.updateRenderAsync();
                    resolve();
                }), 0);
            });
            return this.lastRenderResult;
        });
    }
    moveToAsync(point) {
        return __awaiter$r(this, void 0, void 0, function* () {
            const aabb = this.aabb;
            const width = aabb[1].x - aabb[0].x;
            const height = aabb[1].y - aabb[0].y;
            const x = point.x - width / 2;
            const y = point.y - height / 2;
            const mat = Mat3.buildTranslate(x, y);
            yield this.applyCommonTransformAsync(mat);
        });
    }
    rotateByAsync(angle, center) {
        return __awaiter$r(this, void 0, void 0, function* () {
            if (!center) {
                const [{ x: xmin, y: ymin }, { x: xmax, y: ymax }] = this.aabb;
                center = new Vec2((xmin + xmax) / 2, (ymin + ymax) / 2);
            }
            const mat = new Mat3()
                .applyTranslation(-center.x, -center.y)
                .applyRotation(angle)
                .applyTranslation(center.x, center.y);
            yield this.applyCommonTransformAsync(mat);
        });
    }
    toDto() {
        var _a, _b;
        return {
            annotationType: this.type,
            uuid: this.uuid,
            imageUuid: this.imageUuid,
            dateCreated: (_a = this._dateCreated) === null || _a === void 0 ? void 0 : _a.toISOString(),
            dateModified: (_b = this._dateModified) === null || _b === void 0 ? void 0 : _b.toISOString(),
            author: this._author,
            textContent: this._textContent,
        };
    }
    setTextContentAsync(text, undoable = true) {
        return __awaiter$r(this, void 0, void 0, function* () {
            const oldText = this._textContent;
            this._textContent = text;
            this._dateModified = new Date();
            const undoAction = undoable
                ? () => __awaiter$r(this, void 0, void 0, function* () {
                    yield this.setTextContentAsync(oldText, false);
                })
                : undefined;
            this.emitEditRequest(undoAction);
        });
    }
    toImageAsync() {
        return __awaiter$r(this, void 0, void 0, function* () {
            const renderedContent = this._renderedContent;
            if (!renderedContent) {
                return null;
            }
            const contentSvgs = renderedContent.querySelectorAll(".annotation-content-element");
            if (!(contentSvgs === null || contentSvgs === void 0 ? void 0 : contentSvgs.length)) {
                return null;
            }
            const svgs = [];
            contentSvgs.forEach(x => {
                if (x instanceof SVGGraphicsElement) {
                    svgs.push(x);
                }
            });
            const images = [];
            for (const svg of svgs) {
                const svgSerialized = new XMLSerializer().serializeToString(svg);
                const svgBlob = new Blob([svgSerialized], { type: "image/svg+xml;charset=utf-8" });
                const svgUrl = URL.createObjectURL(svgBlob);
                const result = yield new Promise((resolve, reject) => {
                    const image = new Image();
                    image.onerror = (e) => {
                        console.log(`Error while loading image: ${e}`);
                        resolve(null);
                    };
                    image.onload = () => {
                        resolve(image);
                    };
                    image.src = svgUrl;
                });
                URL.revokeObjectURL(svgUrl);
                images.push(result);
            }
            return images;
        });
    }
    convertClientCoordsToImage(clientX, clientY) {
        var _a, _b;
        const [annotLocalMin, annotLocalMax] = this.aabb;
        const { x: annotClientXMin, y: annotClientYMin, width: annotClientHorLength, height: annotClientVertLength } = this._renderedBox.getBoundingClientRect();
        const imageRotation = ((_a = this._imageInfo) === null || _a === void 0 ? void 0 : _a.rotation) || 0;
        let imageScale = (_b = this === null || this === void 0 ? void 0 : this._imageInfo) === null || _b === void 0 ? void 0 : _b.scale;
        let annotLocalHorLength;
        const imageClientZero = new Vec2();
        const localResult = new Vec2();
        switch (imageRotation) {
            case 0:
                annotLocalHorLength = annotLocalMax.x - annotLocalMin.x;
                imageScale || (imageScale = annotClientHorLength / annotLocalHorLength);
                imageClientZero.set(annotClientXMin - annotLocalMin.x * imageScale, annotClientYMin - annotLocalMin.y * imageScale);
                localResult.set((clientX - imageClientZero.x) / imageScale, (clientY - imageClientZero.y) / imageScale);
                break;
            case 90:
                annotLocalHorLength = annotLocalMax.x - annotLocalMin.x;
                imageScale || (imageScale = annotClientHorLength / annotLocalHorLength);
                imageClientZero.set(annotClientXMin + annotClientHorLength + annotLocalMin.y * imageScale, annotClientYMin - annotLocalMin.x * imageScale);
                localResult.set((clientY - imageClientZero.y) / imageScale, (imageClientZero.x - clientX) / imageScale);
                break;
            case 180:
                annotLocalHorLength = annotLocalMax.x - annotLocalMin.x;
                imageScale || (imageScale = annotClientHorLength / annotLocalHorLength);
                imageClientZero.set(annotClientXMin + annotClientHorLength + annotLocalMin.x * imageScale, annotClientYMin + annotClientVertLength + annotLocalMin.y * imageScale);
                localResult.set((imageClientZero.x - clientX) / imageScale, (imageClientZero.y - clientY) / imageScale);
                break;
            case 270:
                annotLocalHorLength = annotLocalMax.y - annotLocalMin.y;
                imageScale || (imageScale = annotClientHorLength / annotLocalHorLength);
                imageClientZero.set(annotClientXMin - annotLocalMin.y * imageScale, annotClientYMin + annotClientVertLength + annotLocalMin.x * imageScale);
                localResult.set((imageClientZero.y - clientY) / imageScale, (clientX - imageClientZero.x) / imageScale);
                break;
            default:
                throw new Error(`Invalid rotation image value: ${imageRotation}`);
        }
        return localResult;
    }
    convertImageCoordsToClient(imageX, imageY) {
        var _a, _b;
        const [annotLocalMin, annotLocalMax] = this.aabb;
        const { x: annotClientXMin, y: annotClientYMin, width: annotClientHorLength, height: annotClientVertLength } = this._renderedBox.getBoundingClientRect();
        const imageRotation = ((_a = this._imageInfo) === null || _a === void 0 ? void 0 : _a.rotation) || 0;
        let imageScale = (_b = this === null || this === void 0 ? void 0 : this._imageInfo) === null || _b === void 0 ? void 0 : _b.scale;
        let annotLocalHorLength;
        const imageClientZero = new Vec2();
        const localResult = new Vec2();
        switch (imageRotation) {
            case 0:
                annotLocalHorLength = annotLocalMax.x - annotLocalMin.x;
                imageScale || (imageScale = annotClientHorLength / annotLocalHorLength);
                imageClientZero.set(annotClientXMin - annotLocalMin.x * imageScale, annotClientYMin - annotLocalMin.y * imageScale);
                localResult.set(imageX * imageScale + imageClientZero.x, imageY * imageScale + imageClientZero.y);
                break;
            case 90:
                annotLocalHorLength = annotLocalMax.x - annotLocalMin.x;
                imageScale || (imageScale = annotClientHorLength / annotLocalHorLength);
                imageClientZero.set(annotClientXMin + annotClientHorLength + annotLocalMin.y * imageScale, annotClientYMin - annotLocalMin.x * imageScale);
                localResult.set(imageClientZero.x - imageY * imageScale, imageX * imageScale + imageClientZero.y);
                break;
            case 180:
                annotLocalHorLength = annotLocalMax.x - annotLocalMin.x;
                imageScale || (imageScale = annotClientHorLength / annotLocalHorLength);
                imageClientZero.set(annotClientXMin + annotClientHorLength + annotLocalMin.x * imageScale, annotClientYMin + annotClientVertLength + annotLocalMin.y * imageScale);
                localResult.set(imageClientZero.x - imageX * imageScale, imageClientZero.y - imageY * imageScale);
                break;
            case 270:
                annotLocalHorLength = annotLocalMax.y - annotLocalMin.y;
                imageScale || (imageScale = annotClientHorLength / annotLocalHorLength);
                imageClientZero.set(annotClientXMin - annotLocalMin.y * imageScale, annotClientYMin + annotClientVertLength + annotLocalMin.x * imageScale);
                localResult.set(imageY * imageScale + imageClientZero.x, imageClientZero.y - imageX * imageScale);
                break;
            default:
                throw new Error(`Invalid rotation image value: ${imageRotation}`);
        }
        return localResult;
    }
    getAnnotationToImageMatrix() {
        const imageInfo = this._imageInfo;
        if (!imageInfo) {
            return new Mat3();
        }
        const imageRotation = imageInfo === null || imageInfo === void 0 ? void 0 : imageInfo.rotation;
        if (!imageRotation) {
            return new Mat3();
        }
        const [{ x: xmin, y: ymin }, { x: xmax, y: ymax }] = this.aabb;
        const centerX = (xmax + xmin) / 2;
        const centerY = (ymax + ymin) / 2;
        const { x: imageWidth, y: imageHeight } = imageInfo.dimensions;
        let x;
        let y;
        switch (imageRotation) {
            case 90:
                x = centerY;
                y = imageHeight - centerX;
                break;
            case 180:
                x = imageWidth - centerX;
                y = imageHeight - centerY;
                break;
            case 270:
                x = imageWidth - centerY;
                y = centerX;
                break;
            default:
                throw new Error(`Invalid rotation image value: ${imageRotation}`);
        }
        const mat = new Mat3()
            .applyTranslation(-centerX, -centerY)
            .applyRotation(imageRotation / 180 * Math.PI)
            .applyTranslation(x, y);
        return mat;
    }
    applyCommonTransformAsync(matrix, undoable = true) {
        return __awaiter$r(this, void 0, void 0, function* () {
            this._dateModified = new Date();
            this._aabbIsActual = false;
            yield this.updateRenderAsync();
            const invertedMat = Mat3.invert(matrix);
            const undoAction = undoable
                ? () => __awaiter$r(this, void 0, void 0, function* () {
                    yield this.applyCommonTransformAsync(invertedMat, false);
                })
                : undefined;
            this.emitEditRequest(undoAction);
        });
    }
    applyTempTransformAsync() {
        return __awaiter$r(this, void 0, void 0, function* () {
            if (this._transformationTimer) {
                clearTimeout(this._transformationTimer);
                this._transformationTimer = null;
                return;
            }
            if (this._transformationPromise) {
                yield this._transformationPromise;
            }
            this._transformationPromise = new Promise((resolve) => __awaiter$r(this, void 0, void 0, function* () {
                this._svgContentCopy.remove();
                this._svgContentCopy.setAttribute("transform", "matrix(1 0 0 1 0 0)");
                if (this._moved) {
                    yield this.applyCommonTransformAsync(this._tempTransformationMatrix);
                }
                this._tempTransformationMatrix.reset();
                resolve();
            }));
            yield this._transformationPromise;
        });
    }
    renderRect() {
        const [{ x: xmin, y: ymin }, { x: xmax, y: ymax }] = this.aabb;
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.classList.add("annotation-rect");
        rect.setAttribute("data-annotation-name", this.uuid);
        rect.setAttribute("x", xmin + "");
        rect.setAttribute("y", ymin + "");
        rect.setAttribute("width", xmax - xmin + "");
        rect.setAttribute("height", ymax - ymin + "");
        return rect;
    }
    renderBox() {
        const { ll, lr, ur, ul } = this.bbox;
        const boxPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        boxPath.classList.add("annotation-bbox");
        boxPath.setAttribute("data-annotation-name", this.uuid);
        boxPath.setAttribute("d", `M ${ll.x} ${ll.y} L ${lr.x} ${lr.y} L ${ur.x} ${ur.y} L ${ul.x} ${ul.y} Z`);
        return boxPath;
    }
    renderControls() {
        const controlsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        controlsGroup.classList.add("annotation-controls");
        controlsGroup.setAttribute("data-annotation-name", this.uuid);
        controlsGroup.addEventListener("pointerdown", this.onSvgPointerDown);
        controlsGroup.addEventListener("pointerenter", this.onSvgPointerEnter);
        controlsGroup.addEventListener("pointerleave", this.onSvgPointerLeave);
        return controlsGroup;
    }
    buildRenderedContentStructure(renderResult) {
        var _a;
        const content = document.createElement("div");
        content.id = this._svgId;
        content.classList.add("annotation-content");
        content.setAttribute("data-annotation-name", this.uuid);
        const { x: width, y: height } = this._imageInfo.dimensions;
        if ((_a = renderResult.clipPaths) === null || _a === void 0 ? void 0 : _a.length) {
            const clipPathsContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            clipPathsContainer.setAttribute("viewBox", `0 0 ${width} ${height}`);
            clipPathsContainer.append(...renderResult.clipPaths);
            content.append(clipPathsContainer);
        }
        renderResult.elements.forEach(x => {
            const elementContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            elementContainer.classList.add("annotation-content-element");
            elementContainer.setAttribute("viewBox", `0 0 ${width} ${height}`);
            elementContainer.style["mixBlendMode"] = x.blendMode;
            elementContainer.append(x.element);
            content.append(elementContainer);
        });
        return content;
    }
    buildRenderContentCopy(contentRenderResult) {
        const copy = document.createElementNS("http://www.w3.org/2000/svg", "g");
        contentRenderResult.elements.forEach(x => {
            copy.append(x.element.cloneNode(true));
        });
        copy.classList.add("annotation-temp-copy");
        return copy;
    }
    renderScaleHandles() {
        const bbox = this.bbox;
        const handles = [];
        ["ll", "lr", "ur", "ul"].forEach(x => {
            const handle = document.createElementNS("http://www.w3.org/2000/svg", "line");
            handle.classList.add("annotation-handle", "scale");
            handle.setAttribute("data-handle-name", x);
            handle.setAttribute("x1", bbox[x].x + "");
            handle.setAttribute("y1", bbox[x].y + "");
            handle.setAttribute("x2", bbox[x].x + "");
            handle.setAttribute("y2", bbox[x].y + 0.1 + "");
            handle.addEventListener("pointerdown", this.onScaleHandlePointerDown);
            handles.push(handle);
        });
        return handles;
    }
    renderRotationHandle() {
        const [{ x: xmin, y: ymin }, { x: xmax, y: ymax }] = this.aabb;
        const centerX = (xmin + xmax) / 2;
        const centerY = (ymin + ymax) / 2;
        const currentRotation = this._rotation;
        const rotationGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        rotationGroup.classList.add("annotation-rotator");
        rotationGroup.setAttribute("data-handle-name", "center");
        const rotationGroupCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        rotationGroupCircle.classList.add("circle", "dashed");
        rotationGroupCircle.setAttribute("cx", centerX + "");
        rotationGroupCircle.setAttribute("cy", centerY + "");
        const handleMatrix = new Mat3()
            .applyTranslation(-centerX, -centerY + 35)
            .applyRotation(currentRotation)
            .applyTranslation(centerX, centerY);
        const handleCenter = new Vec2(centerX, centerY).applyMat3(handleMatrix);
        const rotationGroupLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        rotationGroupLine.classList.add("dashed");
        rotationGroupLine.setAttribute("x1", centerX + "");
        rotationGroupLine.setAttribute("y1", centerY + "");
        rotationGroupLine.setAttribute("x2", handleCenter.x + "");
        rotationGroupLine.setAttribute("y2", handleCenter.y + "");
        const centerRectHandle = document.createElementNS("http://www.w3.org/2000/svg", "line");
        centerRectHandle.classList.add("annotation-handle", "rotation");
        centerRectHandle.setAttribute("data-handle-name", "center");
        centerRectHandle.setAttribute("x1", handleCenter.x + "");
        centerRectHandle.setAttribute("y1", handleCenter.y + "");
        centerRectHandle.setAttribute("x2", handleCenter.x + "");
        centerRectHandle.setAttribute("y2", handleCenter.y + 0.1 + "");
        centerRectHandle.addEventListener("pointerdown", this.onRotationHandlePointerDown);
        rotationGroup.append(rotationGroupCircle, rotationGroupLine, centerRectHandle);
        return rotationGroup;
    }
    renderHandles() {
        return [...this.renderScaleHandles(), this.renderRotationHandle()];
    }
    updateRenderAsync() {
        var _a;
        return __awaiter$r(this, void 0, void 0, function* () {
            if (!this._renderedControls) {
                return;
            }
            this._renderedControls.innerHTML = "";
            const contentRenderResult = yield this.renderAppearanceAsync();
            if (!contentRenderResult || !((_a = contentRenderResult.elements) === null || _a === void 0 ? void 0 : _a.length)) {
                this._renderedBox = null;
                this._svgContentCopy = null;
                return null;
            }
            const content = this.buildRenderedContentStructure(contentRenderResult);
            this._renderedContent = content;
            const rect = this.renderRect();
            const box = this.renderBox();
            const handles = this.renderHandles();
            this._renderedBox = box;
            this._renderedControls.append(rect, box, ...contentRenderResult.pickHelpers, ...handles);
            const copy = this.buildRenderContentCopy(contentRenderResult);
            this._svgContentCopy = copy;
            this.eventService.dispatchEvent(new AnnotEvent({
                type: "render",
                annotations: [this.toDto()],
            }));
        });
    }
    emitEditRequest(undoAction) {
        this.eventService.dispatchEvent(new AnnotEditRequestEvent({
            undoAction,
            annotation: this,
        }));
    }
}

const SELECTION_STROKE_WIDTH = 20;
const BEZIER_CONSTANT = 0.551915;
const CLOUD_ARC_RATIO = 0.02;
const LINE_END_SIZE_RATIO = 3;
const LINE_END_MIN_SIZE = 10;
const LINE_CAPTION_SIZE_RATIO = 5;
const LINE_CAPTION_FONT_RATIO = 4;
const TEXT_FONT_RATIO = 4;
const lineEndingTypes = {
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
};
const justificationTypes = {
    LEFT: "left",
    CENTER: "center",
    RIGHT: "right",
};
function buildLineEndingPath(point, type, strokeWidth, side) {
    const size = Math.max(strokeWidth * LINE_END_SIZE_RATIO, LINE_END_MIN_SIZE);
    let text = "";
    switch (type) {
        case lineEndingTypes.ARROW_OPEN:
            if (side === "left") {
                text += `M${point.x + size},${point.y + size / 2}`;
                text += ` L${point.x},${point.y}`;
                text += ` L${point.x + size},${point.y - size / 2}`;
            }
            else {
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
            }
            else {
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
            }
            else {
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
            }
            else {
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
function getLineRenderHelpers(start, end) {
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

var __awaiter$q = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class PenAnnotation extends AnnotationBase {
    constructor(eventService, dto) {
        if (!dto) {
            throw new Error("No source object passed to the constructor");
        }
        super(eventService, dto);
        if (dto.annotationType !== "pen") {
            throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'pen')`);
        }
        this._pathList = dto.pathList || [];
        this._strokeColor = dto.strokeColor || [0, 0, 0, 1];
        this._strokeWidth = dto.strokeWidth || 3;
        this._strokeDashGap = dto.strokeDashGap || [3, 0];
    }
    get pathList() {
        return this._pathList;
    }
    get color() {
        return this.color;
    }
    get strokeWidth() {
        return this._strokeWidth;
    }
    get strokeDashGap() {
        return this._strokeDashGap;
    }
    toDto() {
        return {
            annotationType: this.type,
            uuid: this.uuid,
            imageUuid: this._imageUuid,
            dateCreated: this._dateCreated.toISOString(),
            dateModified: this._dateModified.toISOString(),
            author: this._author,
            rotation: this._rotation,
            textContent: this._textContent,
            pathList: this._pathList,
            strokeColor: this._strokeColor,
            strokeWidth: this._strokeWidth,
            strokeDashGap: this._strokeDashGap,
        };
    }
    applyCommonTransformAsync(matrix, undoable = true) {
        const _super = Object.create(null, {
            applyCommonTransformAsync: { get: () => super.applyCommonTransformAsync }
        });
        return __awaiter$q(this, void 0, void 0, function* () {
            let x;
            let y;
            const vec = new Vec2();
            this._pathList.forEach(list => {
                for (let i = 0; i < list.length; i = i + 2) {
                    x = list[i];
                    y = list[i + 1];
                    vec.set(x, y).applyMat3(matrix);
                    list[i] = vec.x;
                    list[i + 1] = vec.y;
                }
            });
            yield _super.applyCommonTransformAsync.call(this, matrix, undoable);
        });
    }
    updateAABB() {
        let x;
        let y;
        let xMin;
        let yMin;
        let xMax;
        let yMax;
        this._pathList.forEach(list => {
            for (let i = 0; i < list.length; i = i + 2) {
                x = list[i];
                y = list[i + 1];
                if (!xMin || x < xMin) {
                    xMin = x;
                }
                if (!yMin || y < yMin) {
                    yMin = y;
                }
                if (!xMax || x > xMax) {
                    xMax = x;
                }
                if (!yMax || y > yMax) {
                    yMax = y;
                }
            }
        });
        const halfStrokeW = this._strokeWidth / 2;
        xMin -= halfStrokeW;
        yMin -= halfStrokeW;
        xMax += halfStrokeW;
        xMax += halfStrokeW;
        this._aabb[0].set(xMin, yMin);
        this._aabb[1].set(xMax, yMax);
    }
    renderAppearanceAsync() {
        return __awaiter$q(this, void 0, void 0, function* () {
            try {
                const clipPaths = [];
                const elements = [];
                const pickHelpers = [];
                const [min, max] = this.aabb;
                const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
                clipPath.id = `clip0_${this.uuid}`;
                clipPath.innerHTML = "<path d=\""
                    + `M${min.x},${min.y} `
                    + `L${max.x},${min.y} `
                    + `L${max.x},${max.y} `
                    + `L${min.x},${max.y} `
                    + "z"
                    + "\"/>";
                clipPaths.push(clipPath);
                const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
                group.setAttribute("clip-path", `url(#${clipPath.id})`);
                const clonedGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                clonedGroup.classList.add("annotation-pick-helper");
                for (const pathCoords of this.pathList) {
                    if (!(pathCoords === null || pathCoords === void 0 ? void 0 : pathCoords.length)) {
                        continue;
                    }
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute("fill", "none");
                    const [r, g, b, a] = this._strokeColor;
                    path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
                    path.setAttribute("stroke-width", this._strokeWidth + "");
                    if (this._strokeDashGap) {
                        path.setAttribute("stroke-dasharray", this._strokeDashGap.join(" "));
                    }
                    let d = `M ${pathCoords[0]} ${pathCoords[1]}`;
                    for (let i = 2; i < pathCoords.length;) {
                        d += ` L ${pathCoords[i++]} ${pathCoords[i++]}`;
                    }
                    path.setAttribute("d", d);
                    group.append(path);
                    const clonedPath = path.cloneNode(true);
                    const clonedPathStrokeWidth = this._strokeWidth < SELECTION_STROKE_WIDTH
                        ? SELECTION_STROKE_WIDTH
                        : this._strokeWidth;
                    clonedPath.setAttribute("stroke-width", clonedPathStrokeWidth + "");
                    clonedPath.setAttribute("stroke", "transparent");
                    clonedPath.setAttribute("fill", "none");
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
        });
    }
}

const annotatorTypes = ["geom", "pen", "stamp", "text"];
const annotatorDataChangeEvent = "tsimage-annotatordatachange";
class AnnotatorDataChangeEvent extends CustomEvent {
    constructor(detail) {
        super(annotatorDataChangeEvent, { detail });
    }
}
class Annotator {
    constructor(imageService, parent) {
        this.onImageChange = (event) => {
            this.refreshViewBox();
        };
        this.onStateChange = (event) => {
            this.refreshViewBox();
        };
        this.onParentScroll = () => {
            this.refreshViewBox();
        };
        this.onOverlayPointerDown = (e) => {
            if (!e.isPrimary) {
                return;
            }
            this._lastPointerDownInfo = {
                timestamp: performance.now(),
                clientX: e.clientX,
                clientY: e.clientY,
            };
        };
        if (!imageService) {
            throw new Error("Image service not defined");
        }
        if (!parent) {
            throw new Error("Parent container not defined");
        }
        this._imageService = imageService;
        this._parent = parent;
    }
    get overlayContainer() {
        return this._overlayContainer;
    }
    destroy() {
        var _a, _b, _c;
        this._imageService.eventService.removeListener(imageChangeEvent, this.onImageChange);
        this._imageService.eventService.removeListener(imageServiceStateChangeEvent, this.onStateChange);
        (_a = this._parent) === null || _a === void 0 ? void 0 : _a.removeEventListener("scroll", this.onParentScroll);
        (_b = this._parentMutationObserver) === null || _b === void 0 ? void 0 : _b.disconnect();
        (_c = this._parentResizeObserver) === null || _c === void 0 ? void 0 : _c.disconnect();
        this._overlayContainer.remove();
    }
    refreshViewBox() {
        const { width: w, height: h } = this._overlay.getBoundingClientRect();
        if (!w || !h) {
            return;
        }
        this._overlay.style.left = this._parent.scrollLeft + "px";
        this._overlay.style.top = this._parent.scrollTop + "px";
        const viewBoxWidth = w / this._imageService.scale;
        const viewBoxHeight = h / this._imageService.scale;
        this._svgWrapper.setAttribute("viewBox", `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
        this.refreshGroupPosition();
    }
    init() {
        const annotationOverlayContainer = document.createElement("div");
        annotationOverlayContainer.id = "annotation-overlay-container";
        const annotationOverlay = document.createElement("div");
        annotationOverlay.id = "annotation-overlay";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add("abs-stretch", "no-margin", "no-padding");
        svg.setAttribute("opacity", "0.5");
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
        this.initEventHandlers();
    }
    initEventHandlers() {
        this._overlay.addEventListener("pointerdown", this.onOverlayPointerDown);
        this._parent.addEventListener("scroll", this.onParentScroll);
        const parentRObserver = new ResizeObserver((entries) => {
            this.refreshViewBox();
        });
        const parentMObserver = new MutationObserver((mutations) => {
            const record = mutations[0];
            if (!record) {
                return;
            }
            record.addedNodes.forEach(x => {
                const element = x;
                if (element.classList.contains("page")) {
                    parentRObserver.observe(x);
                }
            });
            record.removedNodes.forEach(x => parentRObserver.unobserve(x));
            this.refreshViewBox();
        });
        parentRObserver.observe(this._parent);
        parentMObserver.observe(this._parent, {
            attributes: false,
            childList: true,
            subtree: false,
        });
        this._parentMutationObserver = parentMObserver;
        this._parentResizeObserver = parentRObserver;
        this._imageService.eventService.addListener(imageChangeEvent, this.onImageChange);
        this._imageService.eventService.addListener(imageServiceStateChangeEvent, this.onStateChange);
    }
    updatePointerCoords(clientX, clientY) {
        var _a;
        const imageCoords = (_a = this._imageService
            .currentImageView) === null || _a === void 0 ? void 0 : _a.getImageCoordsUnderPointer(clientX, clientY);
        if (!imageCoords) {
            this._svgGroup.classList.add("annotation-out-of-page");
        }
        else {
            this._svgGroup.classList.remove("annotation-out-of-page");
        }
        this._pointerCoordsInImageCS = imageCoords;
    }
    getImageTransformationInfo(image) {
        const { height: imageHeight, width: imageWidth, top: imageTop, left: imageLeft } = image.viewContainer.getBoundingClientRect();
        const imageBottom = imageTop + imageHeight;
        const imageRight = imageLeft + imageWidth;
        const { top: overlayTop, left: overlayLeft } = this._overlay.getBoundingClientRect();
        const rotation = image.rotation;
        const scale = image.scale;
        let offsetX;
        let offsetY;
        switch (rotation) {
            case 0:
                offsetX = (imageLeft - overlayLeft) / scale;
                offsetY = (imageTop - overlayTop) / scale;
                break;
            case 90:
                offsetX = (imageRight - overlayLeft) / scale;
                offsetY = (imageTop - overlayTop) / scale;
                break;
            case 180:
                offsetX = (imageRight - overlayLeft) / scale;
                offsetY = (imageBottom - overlayTop) / scale;
                break;
            case 270:
                offsetX = (imageLeft - overlayLeft) / scale;
                offsetY = (imageBottom - overlayTop) / scale;
                break;
            default:
                throw new Error(`Invalid rotation degree: ${rotation}`);
        }
        return {
            tx: offsetX,
            ty: offsetY,
            rotation,
        };
    }
}

var __awaiter$p = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class PenAnnotator extends Annotator {
    constructor(imageService, parent, options) {
        super(imageService, parent);
        this.onPointerDown = (e) => {
            if (!e.isPrimary || e.button === 2) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy, info: { uuid } } = imageCoords;
            if (!this._annotationPathData || uuid !== this._annotationPathData.uuid) {
                this.resetTempPenData(uuid);
            }
            this._annotationPathData.newPath(new Vec2(ix, iy));
            const target = e.target;
            target.addEventListener("pointermove", this.onPointerMove);
            target.addEventListener("pointerup", this.onPointerUp);
            target.addEventListener("pointerout", this.onPointerUp);
            target.setPointerCapture(e.pointerId);
        };
        this.onPointerMove = (e) => {
            var _a;
            if (!e.isPrimary || !this._annotationPathData) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords || ((_a = imageCoords.info) === null || _a === void 0 ? void 0 : _a.uuid) !== this._annotationPathData.uuid) {
                return;
            }
            const position = new Vec2(imageCoords.x, imageCoords.y);
            this._annotationPathData.addPosition(position);
        };
        this.onPointerUp = (e) => {
            var _a;
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.removeEventListener("pointermove", this.onPointerMove);
            target.removeEventListener("pointerup", this.onPointerUp);
            target.removeEventListener("pointerout", this.onPointerUp);
            target.releasePointerCapture(e.pointerId);
            (_a = this._annotationPathData) === null || _a === void 0 ? void 0 : _a.endPath();
            this.emitDataChanged();
        };
        this.init();
        this._color = (options === null || options === void 0 ? void 0 : options.color) || [0, 0, 0, 0.9];
        this._strokeWidth = (options === null || options === void 0 ? void 0 : options.strokeWidth) || 3;
    }
    destroy() {
        this.removeTempPenData();
        super.destroy();
    }
    undo() {
        var _a;
        (_a = this._annotationPathData) === null || _a === void 0 ? void 0 : _a.removeLastPath();
        this.emitDataChanged();
    }
    clear() {
        this.removeTempPenData();
    }
    saveAnnotationAsync() {
        return __awaiter$p(this, void 0, void 0, function* () {
            if (!this._annotationPathData) {
                return;
            }
            const imageUuid = this._annotationPathData.uuid;
            const dto = this.buildAnnotationDto(this._annotationPathData);
            const annotation = new PenAnnotation(this._imageService.eventService, dto);
            this._imageService.appendAnnotationToImage(imageUuid, annotation);
            this.clear();
        });
    }
    init() {
        super.init();
        this._overlay.addEventListener("pointerdown", this.onPointerDown);
    }
    refreshGroupPosition() {
        if (!this._annotationPathData) {
            return;
        }
        const image = this._imageService.currentImageView;
        if (!image || image.imageInfo.uuid !== this._annotationPathData.uuid) {
            this._annotationPathData.group.setAttribute("transform", "scale(0)");
            return;
        }
        const { tx, ty, rotation } = this.getImageTransformationInfo(image);
        this._annotationPathData.group.setAttribute("transform", `translate(${tx} ${ty}) rotate(${rotation})`);
    }
    removeTempPenData() {
        if (this._annotationPathData) {
            this._annotationPathData.group.remove();
            this._annotationPathData = null;
            this.emitDataChanged();
        }
    }
    resetTempPenData(imageUuid) {
        this.removeTempPenData();
        this._annotationPathData = new SvgSmoothPath({
            uuid: imageUuid,
            color: this._color,
            strokeWidth: this._strokeWidth,
        });
        this._svgGroup.append(this._annotationPathData.group);
        this.refreshGroupPosition();
    }
    emitDataChanged() {
        var _a;
        const count = ((_a = this._annotationPathData) === null || _a === void 0 ? void 0 : _a.pathCount) || 0;
        this._imageService.eventService.dispatchEvent(new AnnotatorDataChangeEvent({
            annotatorType: "pen",
            elementCount: count,
            undoable: count > 1,
            clearable: count > 0,
            saveable: count > 0,
        }));
    }
    buildAnnotationDto(data) {
        const pathList = [];
        data.paths.forEach(path => {
            const ink = [];
            path.positions.forEach(pos => {
                ink.push(pos.x, pos.y);
            });
            pathList.push(ink);
        });
        const nowString = new Date().toISOString();
        const dto = {
            uuid: UUID.getRandomUuid(),
            annotationType: "pen",
            imageUuid: null,
            dateCreated: nowString,
            dateModified: nowString,
            author: this._imageService.userName || "unknown",
            textContent: null,
            pathList,
            strokeColor: data.color,
            strokeWidth: data.strokeWidth,
            strokeDashGap: null,
        };
        return dto;
    }
}

class GeometricAnnotation extends AnnotationBase {
    constructor(eventService, dto) {
        if (!dto) {
            throw new Error("No source object passed to the constructor");
        }
        super(eventService, dto);
        this._strokeColor = dto.strokeColor || [0, 0, 0, 1];
        this._strokeWidth = dto.strokeWidth || 3;
        this._strokeDashGap = dto.strokeDashGap || [3, 0];
    }
    get strokeColor() {
        return this._strokeColor;
    }
    get strokeWidth() {
        return this._strokeWidth;
    }
    get strokeDashGap() {
        return this._strokeDashGap;
    }
}

var __awaiter$o = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class SquareAnnotation extends GeometricAnnotation {
    constructor(eventService, dto) {
        var _a, _b, _c, _d;
        if (!dto) {
            throw new Error("No source object passed to the constructor");
        }
        if (dto.annotationType !== "square") {
            throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'square')`);
        }
        super(eventService, dto);
        this._width = (_a = dto.width) !== null && _a !== void 0 ? _a : 0;
        this._height = (_b = dto.height) !== null && _b !== void 0 ? _b : 0;
        this._center = dto.center
            ? new Vec2(dto.center[0], dto.center[1])
            : new Vec2();
        this._cloud = (_c = dto.cloud) !== null && _c !== void 0 ? _c : false;
        this._cloudArcSize = (_d = dto.cloudArcSize) !== null && _d !== void 0 ? _d : 20;
    }
    get cloud() {
        return this._cloud;
    }
    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }
    get center() {
        return this._center.clone();
    }
    toDto() {
        return {
            annotationType: this.type,
            uuid: this.uuid,
            imageUuid: this._imageUuid,
            dateCreated: this._dateCreated.toISOString(),
            dateModified: this._dateModified.toISOString(),
            author: this._author,
            rotation: this._rotation,
            textContent: this._textContent,
            strokeColor: this._strokeColor,
            strokeWidth: this._strokeWidth,
            strokeDashGap: this._strokeDashGap,
            width: this._width,
            height: this._height,
            center: [this._center.x, this._center.y],
            cloud: this._cloud,
        };
    }
    applyCommonTransformAsync(matrix, undoable = true) {
        const _super = Object.create(null, {
            applyCommonTransformAsync: { get: () => super.applyCommonTransformAsync }
        });
        return __awaiter$o(this, void 0, void 0, function* () {
            const { ll, lr, ur, ul } = this.getBoxCorners(false);
            ll.applyMat3(matrix);
            lr.applyMat3(matrix);
            ur.applyMat3(matrix);
            ul.applyMat3(matrix);
            const boxBottomEdgeAfter = Vec2.subtract(lr, ll);
            const boxLeftEdgeAfter = Vec2.subtract(ul, ll);
            this._width = boxBottomEdgeAfter.getMagnitude();
            this._height = boxLeftEdgeAfter.getMagnitude();
            this._center.setFromVec2(Vec2.add(ll, ur).multiplyByScalar(0.5));
            const boxBottomEdgeHor = new Vec2(boxBottomEdgeAfter.getMagnitude(), 0);
            this._rotation = boxBottomEdgeHor.getAngle(boxBottomEdgeAfter);
            yield _super.applyCommonTransformAsync.call(this, matrix, undoable);
        });
    }
    updateAABB() {
        const bbox = this.getBoxCorners(true);
        const { ll, lr, ur, ul } = bbox;
        const { min, max } = Vec2.minMax(ll, lr, ur, ul);
        this._bbox = bbox;
        this._aabb[0].setFromVec2(min);
        this._aabb[1].setFromVec2(max);
    }
    renderAppearanceAsync() {
        return __awaiter$o(this, void 0, void 0, function* () {
            try {
                const clipPaths = [];
                const elements = [];
                const pickHelpers = [];
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
                const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
                group.setAttribute("clip-path", `url(#${clipPath.id})`);
                const clonedGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                clonedGroup.classList.add("annotation-pick-helper");
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("fill", "none");
                const [r, g, b, a] = this._strokeColor;
                path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
                path.setAttribute("stroke-width", this._strokeWidth + "");
                if (this._strokeDashGap) {
                    path.setAttribute("stroke-dasharray", this._strokeDashGap.join(" "));
                }
                let d = "";
                const w = this._width / 2;
                const h = this._height / 2;
                const bl = new Vec2(-w, -h);
                const br = new Vec2(w, -h);
                const tr = new Vec2(w, h);
                const tl = new Vec2(-w, h);
                if (this._cloud) {
                    path.setAttribute("stroke-linecap", "round");
                    path.setAttribute("stroke-linejoin", "round");
                    const curveData = CloudCurveData.buildFromPolyline([
                        bl.clone(),
                        br.clone(),
                        tr.clone(),
                        tl.clone(),
                        bl.clone(),
                    ], this._cloudArcSize);
                    d += `M${curveData.start.x},${curveData.start.y}`;
                    curveData.curves.forEach(x => {
                        d += ` C${x[0].x},${x[0].y} ${x[1].x},${x[1].y} ${x[2].x},${x[2].y}`;
                    });
                }
                else {
                    path.setAttribute("stroke-linecap", "square");
                    path.setAttribute("stroke-linejoin", "miter");
                    d += `M${bl.x},${bl.y}`;
                    d += ` L${br.x},${br.y}`;
                    d += ` L${tr.x},${tr.y}`;
                    d += ` L${tl.x},${tl.y}`;
                    d += " Z";
                }
                const { x: tx, y: ty } = this._center.clone().truncate(1);
                const angle = this._rotation * 180 / Math.PI;
                path.setAttribute("transform", `translate(${tx} ${ty}) rotate(${-angle})`);
                path.setAttribute("d", d);
                group.append(path);
                const clonedPath = path.cloneNode(true);
                const clonedPathStrokeWidth = this._strokeWidth < SELECTION_STROKE_WIDTH
                    ? SELECTION_STROKE_WIDTH
                    : this._strokeWidth;
                clonedPath.setAttribute("stroke-width", clonedPathStrokeWidth + "");
                clonedPath.setAttribute("stroke", "transparent");
                clonedPath.setAttribute("fill", "none");
                clonedGroup.append(clonedPath);
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
        });
    }
    getBoxCorners(withMargins) {
        const margin = withMargins
            ? this._cloud
                ? this._strokeWidth / 2 + this._cloudArcSize
                : this._strokeWidth / 2
            : 0;
        const rx = this._width / 2 + margin;
        const ry = this._height / 2 + margin;
        const bl = new Vec2(-rx, -ry);
        const br = new Vec2(rx, -ry);
        const tr = new Vec2(rx, ry);
        const tl = new Vec2(-rx, ry);
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

class GeometricAnnotator extends Annotator {
    constructor(imageService, parent, options) {
        var _a;
        super(imageService, parent);
        this._color = (options === null || options === void 0 ? void 0 : options.color) || [0, 0, 0, 1];
        this._strokeWidth = (options === null || options === void 0 ? void 0 : options.strokeWidth) || 3;
        this._cloudMode = (_a = options === null || options === void 0 ? void 0 : options.cloudMode) !== null && _a !== void 0 ? _a : false;
    }
    get color() {
        return this._color;
    }
    get strokeWidth() {
        return this._strokeWidth;
    }
    get cloudMode() {
        return this._cloudMode;
    }
    get imageUuid() {
        return this._imageUuid;
    }
    destroy() {
        this.clearGroup();
        super.destroy();
    }
    init() {
        super.init();
    }
    emitDataChanged(count, saveable, clearable, undoable) {
        this._imageService.eventService.dispatchEvent(new AnnotatorDataChangeEvent({
            annotatorType: "geom",
            elementCount: count,
            undoable,
            clearable,
            saveable,
        }));
    }
    clearGroup() {
        this._svgGroup.innerHTML = "";
        this.emitDataChanged(0);
    }
    refreshGroupPosition() {
        if (!this._imageUuid) {
            return;
        }
        const image = this._imageService.currentImageView;
        if (!image || image.imageInfo.uuid !== this._imageUuid) {
            this._svgGroup.setAttribute("transform", "scale(0)");
            return;
        }
        const { tx, ty, rotation } = this.getImageTransformationInfo(image);
        this._svgGroup.setAttribute("transform", `translate(${tx} ${ty}) rotate(${rotation})`);
    }
}

var __awaiter$n = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class GeometricSquareAnnotator extends GeometricAnnotator {
    constructor(imageService, parent, options) {
        super(imageService, parent, options || {});
        this.onPointerDown = (e) => {
            if (!e.isPrimary || e.button === 2) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy, info: { uuid } } = imageCoords;
            this._imageUuid = uuid;
            this._down = new Vec2(ix, iy);
            this.clear();
            this.refreshGroupPosition();
            const target = e.target;
            target.addEventListener("pointermove", this.onPointerMove);
            target.addEventListener("pointerup", this.onPointerUp);
            target.addEventListener("pointerout", this.onPointerUp);
            target.setPointerCapture(e.pointerId);
        };
        this.onPointerMove = (e) => {
            if (!e.isPrimary
                || !this._down) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy } = imageCoords;
            const { min, max } = Vec2.minMax(this._down, new Vec2(ix, iy));
            this.redraw(min, max);
        };
        this.onPointerUp = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.removeEventListener("pointermove", this.onPointerMove);
            target.removeEventListener("pointerup", this.onPointerUp);
            target.removeEventListener("pointerout", this.onPointerUp);
            target.releasePointerCapture(e.pointerId);
            if (this._center) {
                this.emitDataChanged(2, true, true);
            }
        };
        this.init();
    }
    destroy() {
        super.destroy();
    }
    undo() {
        this.clear();
    }
    clear() {
        this._center = null;
        this.clearGroup();
    }
    saveAnnotationAsync() {
        return __awaiter$n(this, void 0, void 0, function* () {
            if (!this._center) {
                return;
            }
            const imageUuid = this._imageUuid;
            const dto = this.buildAnnotationDto();
            const annotation = new SquareAnnotation(this._imageService.eventService, dto);
            this._imageService.appendAnnotationToImage(imageUuid, annotation);
            this.clear();
        });
    }
    init() {
        super.init();
        this._overlay.addEventListener("pointerdown", this.onPointerDown);
    }
    redraw(min, max) {
        this._svgGroup.innerHTML = "";
        const minSize = this._strokeWidth * 2;
        if (max.x - min.x <= minSize || max.y - min.y <= minSize) {
            this._center = null;
            return;
        }
        const [r, g, b, a] = this._color || [0, 0, 0, 1];
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
        path.setAttribute("stroke-width", this._strokeWidth + "");
        let pathString;
        const w = (max.x - min.x);
        const h = (max.y - min.y);
        const center = new Vec2(min.x + w / 2, min.y + h / 2);
        this._center = center.clone();
        this._w = w;
        this._h = h;
        this._cloudArcSize = this._imageService.currentImageView.imageInfo.dimensions.x * CLOUD_ARC_RATIO;
        if (this._cloudMode) {
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");
            const curveData = CloudCurveData.buildFromPolyline([
                new Vec2(min.x, min.y),
                new Vec2(max.x, min.y),
                new Vec2(max.x, max.y),
                new Vec2(min.x, max.y),
                new Vec2(min.x, min.y),
            ], this._cloudArcSize);
            pathString = "M" + curveData.start.x + "," + curveData.start.y;
            curveData.curves.forEach(x => {
                pathString += ` C${x[0].x},${x[0].y} ${x[1].x},${x[1].y} ${x[2].x},${x[2].y}`;
            });
        }
        else {
            path.setAttribute("stroke-linecap", "square");
            path.setAttribute("stroke-linejoin", "miter");
            pathString = "M" + min.x + "," + min.y;
            pathString += " L" + max.x + "," + min.y;
            pathString += " L" + max.x + "," + max.y;
            pathString += " L" + min.x + "," + max.y;
            pathString += " Z";
        }
        path.setAttribute("d", pathString);
        this._svgGroup.append(path);
    }
    buildAnnotationDto() {
        const nowString = new Date().toISOString();
        const dto = {
            uuid: UUID.getRandomUuid(),
            annotationType: "square",
            imageUuid: null,
            dateCreated: nowString,
            dateModified: nowString,
            author: this._imageService.userName || "unknown",
            textContent: null,
            strokeColor: this._color,
            strokeWidth: this._strokeWidth,
            strokeDashGap: null,
            cloud: this._cloudMode,
            cloudArcSize: this._cloudArcSize,
            rotation: 0,
            width: this._w,
            height: this._h,
            center: [this._center.x, this._center.y],
        };
        return dto;
    }
}

var __awaiter$m = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class CircleAnnotation extends GeometricAnnotation {
    constructor(eventService, dto) {
        var _a, _b, _c, _d;
        super(eventService, dto);
        if (dto.annotationType !== "circle") {
            throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'circle')`);
        }
        this._rx = (_a = dto.rx) !== null && _a !== void 0 ? _a : 0;
        this._ry = (_b = dto.ry) !== null && _b !== void 0 ? _b : 0;
        this._center = dto.center
            ? new Vec2(dto.center[0], dto.center[1])
            : new Vec2();
        this._cloud = (_c = dto.cloud) !== null && _c !== void 0 ? _c : false;
        this._cloudArcSize = (_d = dto.cloudArcSize) !== null && _d !== void 0 ? _d : 20;
    }
    get cloud() {
        return this._cloud;
    }
    get rx() {
        return this._rx;
    }
    get ry() {
        return this._ry;
    }
    get center() {
        return this._center.clone();
    }
    toDto() {
        return {
            annotationType: this.type,
            uuid: this.uuid,
            imageUuid: this._imageUuid,
            dateCreated: this._dateCreated.toISOString(),
            dateModified: this._dateModified.toISOString(),
            author: this._author,
            rotation: this._rotation,
            textContent: this._textContent,
            strokeColor: this._strokeColor,
            strokeWidth: this._strokeWidth,
            strokeDashGap: this._strokeDashGap,
            rx: this._rx,
            ry: this._ry,
            center: [this._center.x, this._center.y],
            cloud: this._cloud,
        };
    }
    applyCommonTransformAsync(matrix, undoable = true) {
        const _super = Object.create(null, {
            applyCommonTransformAsync: { get: () => super.applyCommonTransformAsync }
        });
        return __awaiter$m(this, void 0, void 0, function* () {
            const { ll, lr, ur, ul } = this.getBoxCorners(false);
            ll.applyMat3(matrix);
            lr.applyMat3(matrix);
            ur.applyMat3(matrix);
            ul.applyMat3(matrix);
            const boxBottomEdgeAfter = Vec2.subtract(lr, ll);
            const boxLeftEdgeAfter = Vec2.subtract(ul, ll);
            this._rx = boxBottomEdgeAfter.getMagnitude() / 2;
            this._ry = boxLeftEdgeAfter.getMagnitude() / 2;
            this._center.setFromVec2(Vec2.add(ll, ur).multiplyByScalar(0.5));
            const boxBottomEdgeHor = new Vec2(boxBottomEdgeAfter.getMagnitude(), 0);
            this._rotation = boxBottomEdgeHor.getAngle(boxBottomEdgeAfter);
            yield _super.applyCommonTransformAsync.call(this, matrix, undoable);
        });
    }
    updateAABB() {
        const bbox = this.getBoxCorners(true);
        const { ll, lr, ur, ul } = bbox;
        const { min, max } = Vec2.minMax(ll, lr, ur, ul);
        this._bbox = bbox;
        this._aabb[0].setFromVec2(min);
        this._aabb[1].setFromVec2(max);
    }
    renderAppearanceAsync() {
        return __awaiter$m(this, void 0, void 0, function* () {
            try {
                const clipPaths = [];
                const elements = [];
                const pickHelpers = [];
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
                const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
                group.setAttribute("clip-path", `url(#${clipPath.id})`);
                const clonedGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                clonedGroup.classList.add("annotation-pick-helper");
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("fill", "none");
                const [r, g, b, a] = this._strokeColor;
                path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
                path.setAttribute("stroke-width", this._strokeWidth + "");
                if (this._strokeDashGap) {
                    path.setAttribute("stroke-dasharray", this._strokeDashGap.join(" "));
                }
                let d = "";
                const rx = this._rx;
                const ry = this._ry;
                const topV = new Vec2(0, ry);
                const bottomV = new Vec2(0, -ry);
                const leftV = new Vec2(-rx, 0);
                const rightV = new Vec2(rx, 0);
                const zeroV = new Vec2();
                if (this._cloud) {
                    path.setAttribute("stroke-linecap", "round");
                    path.setAttribute("stroke-linejoin", "round");
                    const curveData = CloudCurveData.buildFromEllipse(rx, ry, this._cloudArcSize, new Mat3());
                    d += `M${curveData.start.x},${curveData.start.y}`;
                    curveData.curves.forEach(x => {
                        d += ` C${x[0].x},${x[0].y} ${x[1].x},${x[1].y} ${x[2].x},${x[2].y}`;
                    });
                }
                else {
                    const c = BEZIER_CONSTANT;
                    const cx = Vec2.multiplyByScalar(rightV, c);
                    const cy = Vec2.multiplyByScalar(topV, c);
                    const controlTR1 = Vec2.add(Vec2.add(zeroV, topV), cx);
                    const controlTR2 = Vec2.add(Vec2.add(zeroV, cy), rightV);
                    const controlRB1 = Vec2.add(Vec2.subtract(zeroV, cy), rightV);
                    const controlRB2 = Vec2.add(Vec2.subtract(zeroV, topV), cx);
                    const controlBL1 = Vec2.subtract(Vec2.subtract(zeroV, topV), cx);
                    const controlBL2 = Vec2.subtract(Vec2.subtract(zeroV, cy), rightV);
                    const controlLT1 = Vec2.subtract(Vec2.add(zeroV, cy), rightV);
                    const controlLT2 = Vec2.subtract(Vec2.add(zeroV, topV), cx);
                    d += `M${topV.x},${topV.y}`;
                    d += ` C${controlTR1.x},${controlTR1.y} ${controlTR2.x},${controlTR2.y} ${rightV.x},${rightV.y}`;
                    d += ` C${controlRB1.x},${controlRB1.y} ${controlRB2.x},${controlRB2.y} ${bottomV.x},${bottomV.y}`;
                    d += ` C${controlBL1.x},${controlBL1.y} ${controlBL2.x},${controlBL2.y} ${leftV.x},${leftV.y}`;
                    d += ` C${controlLT1.x},${controlLT1.y} ${controlLT2.x},${controlLT2.y} ${topV.x},${topV.y}`;
                }
                const { x: tx, y: ty } = this._center.clone().truncate(1);
                const angle = this._rotation * 180 / Math.PI;
                path.setAttribute("transform", `translate(${tx} ${ty}) rotate(${-angle})`);
                path.setAttribute("d", d);
                group.append(path);
                const clonedPath = path.cloneNode(true);
                const clonedPathStrokeWidth = this._strokeWidth < SELECTION_STROKE_WIDTH
                    ? SELECTION_STROKE_WIDTH
                    : this._strokeWidth;
                clonedPath.setAttribute("stroke-width", clonedPathStrokeWidth + "");
                clonedPath.setAttribute("stroke", "transparent");
                clonedPath.setAttribute("fill", "none");
                clonedGroup.append(clonedPath);
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
        });
    }
    getBoxCorners(withMargins) {
        const margin = withMargins
            ? this._cloud
                ? this._strokeWidth / 2 + this._cloudArcSize
                : this._strokeWidth / 2
            : 0;
        const rx = this._rx + margin;
        const ry = this._ry + margin;
        const bl = new Vec2(-rx, -ry);
        const br = new Vec2(rx, -ry);
        const tr = new Vec2(rx, ry);
        const tl = new Vec2(-rx, ry);
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

var __awaiter$l = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class GeometricCircleAnnotator extends GeometricAnnotator {
    constructor(imageService, parent, options) {
        super(imageService, parent, options || {});
        this.onPointerDown = (e) => {
            if (!e.isPrimary || e.button === 2) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy, info: { uuid } } = imageCoords;
            this._imageUuid = uuid;
            this._down = new Vec2(ix, iy);
            this.clear();
            this.refreshGroupPosition();
            const target = e.target;
            target.addEventListener("pointermove", this.onPointerMove);
            target.addEventListener("pointerup", this.onPointerUp);
            target.addEventListener("pointerout", this.onPointerUp);
            target.setPointerCapture(e.pointerId);
        };
        this.onPointerMove = (e) => {
            if (!e.isPrimary
                || !this._down) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy } = imageCoords;
            const { min, max } = Vec2.minMax(this._down, new Vec2(ix, iy));
            this.redraw(min, max);
        };
        this.onPointerUp = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.removeEventListener("pointermove", this.onPointerMove);
            target.removeEventListener("pointerup", this.onPointerUp);
            target.removeEventListener("pointerout", this.onPointerUp);
            target.releasePointerCapture(e.pointerId);
            if (this._center) {
                this.emitDataChanged(2, true, true);
            }
        };
        this.init();
    }
    destroy() {
        super.destroy();
    }
    undo() {
        this.clear();
    }
    clear() {
        this._center = null;
        this.clearGroup();
    }
    saveAnnotationAsync() {
        return __awaiter$l(this, void 0, void 0, function* () {
            if (!this._center) {
                return;
            }
            const imageUuid = this._imageUuid;
            const dto = this.buildAnnotationDto();
            const annotation = new CircleAnnotation(this._imageService.eventService, dto);
            this._imageService.appendAnnotationToImage(imageUuid, annotation);
            this.clear();
        });
    }
    init() {
        super.init();
        this._overlay.addEventListener("pointerdown", this.onPointerDown);
    }
    redraw(min, max) {
        this._svgGroup.innerHTML = "";
        const minSize = this._strokeWidth * 2;
        if (max.x - min.x <= minSize || max.y - min.y <= minSize) {
            this._center = null;
            return;
        }
        const [r, g, b, a] = this._color || [0, 0, 0, 1];
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
        path.setAttribute("stroke-width", this._strokeWidth + "");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        let pathString;
        const rx = (max.x - min.x) / 2;
        const ry = (max.y - min.y) / 2;
        const center = new Vec2(min.x + rx, min.y + ry);
        this._center = center.clone();
        this._rx = rx;
        this._ry = ry;
        this._cloudArcSize = this._imageService.currentImageView.imageInfo.dimensions.x * CLOUD_ARC_RATIO;
        if (this._cloudMode) {
            const curveData = CloudCurveData.buildFromEllipse(rx, ry, this._cloudArcSize, new Mat3().applyTranslation(center.x, center.y));
            pathString = "M" + curveData.start.x + "," + curveData.start.y;
            curveData.curves.forEach(x => {
                pathString += ` C${x[0].x},${x[0].y} ${x[1].x},${x[1].y} ${x[2].x},${x[2].y}`;
            });
        }
        else {
            const c = BEZIER_CONSTANT;
            const cw = c * rx;
            const ch = c * ry;
            pathString = "M" + center.x + "," + max.y;
            pathString += ` C${center.x + cw},${max.y} ${max.x},${center.y + ch} ${max.x},${center.y}`;
            pathString += ` C${max.x},${center.y - ch} ${center.x + cw},${min.y} ${center.x},${min.y}`;
            pathString += ` C${center.x - cw},${min.y} ${min.x},${center.y - ch} ${min.x},${center.y}`;
            pathString += ` C${min.x},${center.y + ch} ${center.x - cw},${max.y} ${center.x},${max.y}`;
        }
        path.setAttribute("d", pathString);
        this._svgGroup.append(path);
    }
    buildAnnotationDto() {
        const nowString = new Date().toISOString();
        const dto = {
            uuid: UUID.getRandomUuid(),
            annotationType: "circle",
            imageUuid: null,
            dateCreated: nowString,
            dateModified: nowString,
            author: this._imageService.userName || "unknown",
            textContent: null,
            strokeColor: this._color,
            strokeWidth: this._strokeWidth,
            strokeDashGap: null,
            cloud: this._cloudMode,
            cloudArcSize: this._cloudArcSize,
            rotation: 0,
            rx: this._rx,
            ry: this._ry,
            center: [this._center.x, this._center.y],
        };
        return dto;
    }
}

class PolyAnnotation extends GeometricAnnotation {
    constructor(eventService, dto) {
        super(eventService, dto);
        this._vertices = (dto.vertices || []).map(x => new Vec2(x[0], x[1]));
    }
    get vertices() {
        return this._vertices;
    }
}

var __awaiter$k = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class PolylineAnnotation extends PolyAnnotation {
    constructor(eventService, dto) {
        super(eventService, dto);
        if (dto.annotationType !== "polyline") {
            throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'polyline')`);
        }
        this._endings = [lineEndingTypes.NONE, lineEndingTypes.NONE];
    }
    get endings() {
        return this._endings;
    }
    toDto() {
        return {
            annotationType: this.type,
            uuid: this.uuid,
            imageUuid: this._imageUuid,
            dateCreated: this._dateCreated.toISOString(),
            dateModified: this._dateModified.toISOString(),
            author: this._author,
            rotation: this._rotation,
            textContent: this._textContent,
            strokeColor: this._strokeColor,
            strokeWidth: this._strokeWidth,
            strokeDashGap: this._strokeDashGap,
            vertices: this._vertices.map(x => [x.x, x.y]),
            endings: this._endings,
        };
    }
    applyCommonTransformAsync(matrix, undoable = true) {
        const _super = Object.create(null, {
            applyCommonTransformAsync: { get: () => super.applyCommonTransformAsync }
        });
        return __awaiter$k(this, void 0, void 0, function* () {
            this._vertices.forEach(x => x.applyMat3(matrix));
            yield _super.applyCommonTransformAsync.call(this, matrix, undoable);
        });
    }
    updateAABB() {
        const { min, max } = Vec2.minMax(...this._vertices);
        const endingNotNone = this._endings &&
            (this._endings[0] && this._endings[0] !== lineEndingTypes.NONE
                || this._endings[1] && this._endings[1] !== lineEndingTypes.NONE);
        const margin = endingNotNone
            ? this._strokeWidth / 2 + Math.max(LINE_END_MIN_SIZE, LINE_END_SIZE_RATIO * this._strokeWidth)
            : this._strokeWidth / 2;
        min.addScalar(-margin);
        max.addScalar(margin);
        this._aabb[0].setFromVec2(min);
        this._aabb[1].setFromVec2(max);
    }
    renderAppearanceAsync() {
        return __awaiter$k(this, void 0, void 0, function* () {
            try {
                const clipPaths = [];
                const elements = [];
                const pickHelpers = [];
                const [min, max] = this.aabb;
                const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
                clipPath.id = `clip0_${this.uuid}`;
                clipPath.innerHTML = "<path d=\""
                    + `M${min.x},${min.y} `
                    + `L${max.x},${min.y} `
                    + `L${max.x},${max.y} `
                    + `L${min.x},${max.y} `
                    + "z"
                    + "\"/>";
                clipPaths.push(clipPath);
                const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
                group.setAttribute("clip-path", `url(#${clipPath.id})`);
                const clonedGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                clonedGroup.classList.add("annotation-pick-helper");
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("fill", "none");
                const [r, g, b, a] = this._strokeColor;
                path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
                path.setAttribute("stroke-width", this._strokeWidth + "");
                if (this._strokeDashGap) {
                    path.setAttribute("stroke-dasharray", this._strokeDashGap.join(" "));
                }
                path.setAttribute("stroke-linecap", "square");
                path.setAttribute("stroke-linejoin", "miter");
                const zeroVertex = (this._vertices && this._vertices[0]) || new Vec2();
                let d = `M${zeroVertex.x},${zeroVertex.y}`;
                for (let i = 1; i < this._vertices.length; i++) {
                    const vertex = this._vertices[i];
                    d += ` L${vertex.x},${vertex.y}`;
                }
                path.setAttribute("d", d);
                group.append(path);
                const clonedPath = path.cloneNode(true);
                const clonedPathStrokeWidth = this._strokeWidth < SELECTION_STROKE_WIDTH
                    ? SELECTION_STROKE_WIDTH
                    : this._strokeWidth;
                clonedPath.setAttribute("stroke-width", clonedPathStrokeWidth + "");
                clonedPath.setAttribute("stroke", "transparent");
                clonedPath.setAttribute("fill", "none");
                clonedGroup.append(clonedPath);
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
        });
    }
}

var __awaiter$j = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class GeometricPolylineAnnotator extends GeometricAnnotator {
    constructor(imageService, parent, options) {
        super(imageService, parent, options || {});
        this._points = [];
        this.onPointerDown = (e) => {
            if (!e.isPrimary || e.button === 2) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy, info: { uuid } } = imageCoords;
            this._imageUuid = uuid;
            this.refreshGroupPosition();
            if (!this._points.length) {
                this._points.push(new Vec2(ix, iy));
            }
            this._points.push(new Vec2(ix, iy));
            const target = e.target;
            target.addEventListener("pointermove", this.onPointerMove);
            target.addEventListener("pointerup", this.onPointerUp);
            target.addEventListener("pointerout", this.onPointerUp);
            target.setPointerCapture(e.pointerId);
        };
        this.onPointerMove = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy } = imageCoords;
            this._points[this._points.length - 1].set(ix, iy);
            this.redraw();
        };
        this.onPointerUp = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.removeEventListener("pointermove", this.onPointerMove);
            target.removeEventListener("pointerup", this.onPointerUp);
            target.removeEventListener("pointerout", this.onPointerUp);
            target.releasePointerCapture(e.pointerId);
            this.emitPointsDataChanged();
        };
        this.init();
    }
    destroy() {
        super.destroy();
    }
    undo() {
        if (this._points.length) {
            this._points.pop();
            this.redraw();
            this.emitPointsDataChanged();
        }
    }
    clear() {
        var _a;
        if ((_a = this._points) === null || _a === void 0 ? void 0 : _a.length) {
            this._points.length = 0;
            this.clearGroup();
        }
    }
    saveAnnotationAsync() {
        return __awaiter$j(this, void 0, void 0, function* () {
            if (this._points.length < 2) {
                return;
            }
            const imageUuid = this._imageUuid;
            const dto = this.buildAnnotationDto();
            const annotation = new PolylineAnnotation(this._imageService.eventService, dto);
            this._imageService.appendAnnotationToImage(imageUuid, annotation);
            this.clear();
        });
    }
    init() {
        super.init();
        this._overlay.addEventListener("pointerdown", this.onPointerDown);
    }
    emitPointsDataChanged() {
        const count = this._points.length;
        this.emitDataChanged(count, count > 1, count > 0, count > 2);
    }
    redraw() {
        this._svgGroup.innerHTML = "";
        if (this._points.length < 2) {
            return;
        }
        const [r, g, b, a] = this._color || [0, 0, 0, 1];
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
        path.setAttribute("stroke-width", this._strokeWidth + "");
        path.setAttribute("stroke-linecap", "square");
        path.setAttribute("stroke-linejoin", "miter");
        const start = this._points[0];
        let pathString = "M" + start.x + "," + start.y;
        for (let i = 1; i < this._points.length; i++) {
            const point = this._points[i];
            pathString += " L" + point.x + "," + point.y;
        }
        path.setAttribute("d", pathString);
        this._svgGroup.append(path);
    }
    buildAnnotationDto() {
        const nowString = new Date().toISOString();
        const dto = {
            uuid: UUID.getRandomUuid(),
            annotationType: "polyline",
            imageUuid: null,
            dateCreated: nowString,
            dateModified: nowString,
            author: this._imageService.userName || "unknown",
            textContent: null,
            strokeColor: this._color,
            strokeWidth: this._strokeWidth,
            strokeDashGap: null,
            rotation: 0,
            vertices: this._points.map(x => [x.x, x.y]),
            endings: [lineEndingTypes.NONE, lineEndingTypes.NONE],
        };
        return dto;
    }
}

var __awaiter$i = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class PolygonAnnotation extends PolyAnnotation {
    constructor(eventService, dto) {
        var _a, _b;
        super(eventService, dto);
        if (dto.annotationType !== "polygon") {
            throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'polygon')`);
        }
        this._cloud = (_a = dto.cloud) !== null && _a !== void 0 ? _a : false;
        this._cloudArcSize = (_b = dto.cloudArcSize) !== null && _b !== void 0 ? _b : 20;
    }
    get cloud() {
        return this._cloud;
    }
    toDto() {
        return {
            annotationType: this.type,
            uuid: this.uuid,
            imageUuid: this._imageUuid,
            dateCreated: this._dateCreated.toISOString(),
            dateModified: this._dateModified.toISOString(),
            author: this._author,
            rotation: this._rotation,
            textContent: this._textContent,
            strokeColor: this._strokeColor,
            strokeWidth: this._strokeWidth,
            strokeDashGap: this._strokeDashGap,
            cloud: this._cloud,
            cloudArcSize: this._cloudArcSize,
            vertices: this._vertices.map(x => [x.x, x.y]),
        };
    }
    applyCommonTransformAsync(matrix, undoable = true) {
        const _super = Object.create(null, {
            applyCommonTransformAsync: { get: () => super.applyCommonTransformAsync }
        });
        return __awaiter$i(this, void 0, void 0, function* () {
            this._vertices.forEach(x => x.applyMat3(matrix));
            yield _super.applyCommonTransformAsync.call(this, matrix, undoable);
        });
    }
    updateAABB() {
        const { min, max } = Vec2.minMax(...this._vertices);
        const margin = this._strokeWidth / 2;
        min.addScalar(-margin);
        max.addScalar(margin);
        this._aabb[0].setFromVec2(min);
        this._aabb[1].setFromVec2(max);
    }
    renderAppearanceAsync() {
        var _a, _b;
        return __awaiter$i(this, void 0, void 0, function* () {
            try {
                if (!((_a = this._vertices) === null || _a === void 0 ? void 0 : _a.length) || this._vertices.length < 3) {
                    throw new Error("Any polygon can't have less than 3 vertices");
                }
                const clipPaths = [];
                const elements = [];
                const pickHelpers = [];
                const [min, max] = this.aabb;
                const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
                clipPath.id = `clip0_${this.uuid}`;
                clipPath.innerHTML = "<path d=\""
                    + `M${min.x},${min.y} `
                    + `L${max.x},${min.y} `
                    + `L${max.x},${max.y} `
                    + `L${min.x},${max.y} `
                    + "z"
                    + "\"/>";
                clipPaths.push(clipPath);
                const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
                group.setAttribute("clip-path", `url(#${clipPath.id})`);
                const clonedGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                clonedGroup.classList.add("annotation-pick-helper");
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("fill", "none");
                const [r, g, b, a] = this._strokeColor;
                path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
                path.setAttribute("stroke-width", this._strokeWidth + "");
                if (this._strokeDashGap) {
                    path.setAttribute("stroke-dasharray", this._strokeDashGap.join(" "));
                }
                let d;
                if (this._cloud) {
                    path.setAttribute("stroke-linecap", "round");
                    path.setAttribute("stroke-linejoin", "round");
                    const vertices = [...this._vertices];
                    vertices.push(this._vertices[0]);
                    const curveData = CloudCurveData.buildFromPolyline(vertices, this._cloudArcSize);
                    d = `M${curveData.start.x},${curveData.start.y}`;
                    curveData.curves.forEach(x => {
                        d += ` C${x[0].x},${x[0].y} ${x[1].x},${x[1].y} ${x[2].x},${x[2].y}`;
                    });
                }
                else {
                    path.setAttribute("stroke-linecap", "square");
                    path.setAttribute("stroke-linejoin", "miter");
                    const zeroVertex = ((_b = this._vertices) === null || _b === void 0 ? void 0 : _b.length)
                        ? this._vertices[0]
                        : new Vec2();
                    d = `M${zeroVertex.x},${zeroVertex.y}`;
                    for (let i = 1; i < this._vertices.length; i++) {
                        const vertex = this._vertices[i];
                        d += ` L${vertex.x},${vertex.y}`;
                    }
                    d += " Z";
                }
                path.setAttribute("d", d);
                group.append(path);
                const clonedPath = path.cloneNode(true);
                const clonedPathStrokeWidth = this._strokeWidth < SELECTION_STROKE_WIDTH
                    ? SELECTION_STROKE_WIDTH
                    : this._strokeWidth;
                clonedPath.setAttribute("stroke-width", clonedPathStrokeWidth + "");
                clonedPath.setAttribute("stroke", "transparent");
                clonedPath.setAttribute("fill", "none");
                clonedGroup.append(clonedPath);
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
        });
    }
}

var __awaiter$h = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class GeometricPolygonAnnotator extends GeometricAnnotator {
    constructor(imageService, parent, options) {
        super(imageService, parent, options || {});
        this._points = [];
        this.onPointerDown = (e) => {
            if (!e.isPrimary || e.button === 2) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy, info: { uuid } } = imageCoords;
            this._imageUuid = uuid;
            this.refreshGroupPosition();
            if (!this._points.length) {
                this._points.push(new Vec2(ix, iy));
            }
            this._points.push(new Vec2(ix, iy));
            const target = e.target;
            target.addEventListener("pointermove", this.onPointerMove);
            target.addEventListener("pointerup", this.onPointerUp);
            target.addEventListener("pointerout", this.onPointerUp);
            target.setPointerCapture(e.pointerId);
        };
        this.onPointerMove = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy } = imageCoords;
            this._points[this._points.length - 1].set(ix, iy);
            this.redraw();
        };
        this.onPointerUp = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.removeEventListener("pointermove", this.onPointerMove);
            target.removeEventListener("pointerup", this.onPointerUp);
            target.removeEventListener("pointerout", this.onPointerUp);
            target.releasePointerCapture(e.pointerId);
            this.emitPointsDataChanged();
        };
        this.init();
    }
    destroy() {
        super.destroy();
    }
    undo() {
        if (this._points.length) {
            this._points.pop();
            this.redraw();
            this.emitPointsDataChanged();
        }
    }
    clear() {
        var _a;
        if ((_a = this._points) === null || _a === void 0 ? void 0 : _a.length) {
            this._points.length = 0;
            this.clearGroup();
        }
    }
    saveAnnotationAsync() {
        return __awaiter$h(this, void 0, void 0, function* () {
            if (this._points.length < 3) {
                return;
            }
            const imageUuid = this._imageUuid;
            const dto = this.buildAnnotationDto();
            const annotation = new PolygonAnnotation(this._imageService.eventService, dto);
            this._imageService.appendAnnotationToImage(imageUuid, annotation);
            this.clear();
        });
    }
    init() {
        super.init();
        this._overlay.addEventListener("pointerdown", this.onPointerDown);
    }
    emitPointsDataChanged() {
        const count = this._points.length;
        this.emitDataChanged(count, count > 1, count > 0, count > 2);
    }
    redraw() {
        this._svgGroup.innerHTML = "";
        if (this._points.length < 2) {
            return;
        }
        const [r, g, b, a] = this._color || [0, 0, 0, 1];
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
        path.setAttribute("stroke-width", this._strokeWidth + "");
        let pathString;
        this._cloudArcSize = this._imageService.currentImageView.imageInfo.dimensions.x * CLOUD_ARC_RATIO;
        if (this._cloudMode) {
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");
            const curveData = CloudCurveData.buildFromPolyline([...this._points, this._points[0]], this._cloudArcSize);
            pathString = "M" + curveData.start.x + "," + curveData.start.y;
            curveData.curves.forEach(x => {
                pathString += ` C${x[0].x},${x[0].y} ${x[1].x},${x[1].y} ${x[2].x},${x[2].y}`;
            });
            path.setAttribute("d", pathString);
        }
        else {
            path.setAttribute("stroke-linecap", "square");
            path.setAttribute("stroke-linejoin", "miter");
            const start = this._points[0];
            pathString = "M" + start.x + "," + start.y;
            for (let i = 1; i < this._points.length; i++) {
                const point = this._points[i];
                pathString += " L" + point.x + "," + point.y;
            }
            pathString += " Z";
        }
        path.setAttribute("d", pathString);
        this._svgGroup.append(path);
    }
    buildAnnotationDto() {
        const nowString = new Date().toISOString();
        const dto = {
            uuid: UUID.getRandomUuid(),
            annotationType: "polygon",
            imageUuid: null,
            dateCreated: nowString,
            dateModified: nowString,
            author: this._imageService.userName || "unknown",
            textContent: null,
            strokeColor: this._color,
            strokeWidth: this._strokeWidth,
            strokeDashGap: null,
            rotation: 0,
            vertices: this._points.map(x => [x.x, x.y]),
            cloud: this._cloudMode,
            cloudArcSize: this._cloudArcSize,
        };
        return dto;
    }
}

var __awaiter$g = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class TextData {
    static buildAsync(text, options) {
        return __awaiter$g(this, void 0, void 0, function* () {
            let result;
            if (text) {
                const pTemp = document.createElement("p");
                pTemp.style.color = "black";
                pTemp.style.fontSize = options.fontSize + "px";
                pTemp.style.fontFamily = "arial";
                pTemp.style.fontWeight = "normal";
                pTemp.style.fontStyle = "normal";
                pTemp.style.lineHeight = "normal";
                pTemp.style.overflowWrap = "normal";
                pTemp.style.textAlign = options.textAlign;
                pTemp.style.textDecoration = "none";
                pTemp.style.verticalAlign = "top";
                pTemp.style.whiteSpace = "pre-wrap";
                pTemp.style.wordBreak = "normal";
                pTemp.style.position = "fixed";
                pTemp.style.left = "0";
                pTemp.style.top = "0";
                pTemp.style.margin = "0";
                pTemp.style.padding = "0";
                pTemp.style.width = options.maxWidth.toFixed() + "px";
                pTemp.style.visibility = "hidden";
                pTemp.style.transform = "scale(0.1)";
                pTemp.style.transformOrigin = "top left";
                document.body.append(pTemp);
                const words = text.split(/([- \n\r])/u);
                const lines = [];
                let currentLineText = "";
                let previousHeight = 0;
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    pTemp.textContent += word;
                    yield DomUtils.runEmptyTimeout();
                    const currentHeight = pTemp.offsetHeight;
                    previousHeight || (previousHeight = currentHeight);
                    if (currentHeight > previousHeight) {
                        lines.push(currentLineText);
                        currentLineText = word;
                        previousHeight = currentHeight;
                    }
                    else {
                        currentLineText += word;
                    }
                }
                lines.push(currentLineText);
                pTemp.innerHTML = "";
                const lineSpans = [];
                for (const line of lines) {
                    const lineSpan = document.createElement("span");
                    lineSpan.style.position = "relative";
                    lineSpan.textContent = line;
                    lineSpans.push(lineSpan);
                    pTemp.append(lineSpan);
                }
                yield DomUtils.runEmptyTimeout();
                const textWidth = pTemp.offsetWidth;
                const textHeight = pTemp.offsetHeight;
                let pivotPoint;
                switch (options.pivotPoint) {
                    case "top-left":
                        pivotPoint = new Vec2(0, 0);
                        break;
                    case "bottom-margin":
                        pivotPoint = new Vec2(textWidth / 2, options.strokeWidth + textHeight);
                        break;
                    case "center":
                    default:
                        pivotPoint = new Vec2(textWidth / 2, textHeight / 2);
                        break;
                }
                const lineData = [];
                for (let i = 0; i < lines.length; i++) {
                    const span = lineSpans[i];
                    const x = span.offsetLeft;
                    const y = span.offsetTop;
                    const width = span.offsetWidth;
                    const height = span.offsetHeight;
                    const lineTopLeft = new Vec2(x, y);
                    const lineBottomRight = new Vec2(x + width, y + height);
                    const lineRect = [
                        lineTopLeft.x, lineTopLeft.y,
                        lineBottomRight.x, lineBottomRight.y
                    ];
                    const lineTopLeftRel = Vec2.subtract(lineTopLeft, pivotPoint);
                    const lineBottomRightRel = Vec2.subtract(lineBottomRight, pivotPoint);
                    const lineRelativeRect = [
                        lineTopLeftRel.x, lineTopLeftRel.y,
                        lineBottomRightRel.x, lineBottomRightRel.y
                    ];
                    lineData.push({
                        text: lines[i],
                        rect: lineRect,
                        relativeRect: lineRelativeRect,
                    });
                }
                const textRect = [0, 0, textWidth, textHeight];
                const textRelativeRect = [
                    0 - pivotPoint.x, 0 - pivotPoint.y,
                    textWidth - pivotPoint.x, textHeight - pivotPoint.y
                ];
                const textData = {
                    width: textWidth,
                    height: textHeight,
                    rect: textRect,
                    relativeRect: textRelativeRect,
                    lines: lineData,
                };
                pTemp.remove();
                result = textData;
            }
            else {
                result = null;
            }
            return result;
        });
    }
}

var __awaiter$f = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class LineAnnotation extends GeometricAnnotation {
    constructor(eventService, dto) {
        var _a, _b, _c;
        super(eventService, dto);
        this._svgTemp = new SvgTempPath();
        this.onLineEndHandlePointerDown = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.setPointerCapture(e.pointerId);
            target.addEventListener("pointerup", this.onLineEndHandlePointerUp);
            target.addEventListener("pointerout", this.onLineEndHandlePointerUp);
            const handleName = target.dataset.handleName;
            switch (handleName) {
                case "start":
                    this._scaleHandleActive = "start";
                    break;
                case "end":
                    this._scaleHandleActive = "end";
                    break;
                default:
                    throw new Error(`Invalid handle name: ${handleName}`);
            }
            this._moved = false;
            this._transformationTimer = setTimeout(() => {
                this._transformationTimer = null;
                this._svgTemp.insertAfter(this._renderedControls);
                target.addEventListener("pointermove", this.onLineEndHandlePointerMove);
            }, 200);
            e.stopPropagation();
        };
        this.onLineEndHandlePointerMove = (e) => {
            if (!e.isPrimary || !this._scaleHandleActive) {
                return;
            }
            const [start, end] = this._vertices;
            let startTemp;
            let endTemp;
            if (this._scaleHandleActive === "start") {
                startTemp = this.convertClientCoordsToImage(e.clientX, e.clientY);
                endTemp = end.clone();
            }
            else {
                startTemp = start.clone();
                endTemp = this.convertClientCoordsToImage(e.clientX, e.clientY);
            }
            this._tempTransformationMatrix = Mat3.from4Vec2(start, end, startTemp, endTemp);
            this._svgTemp.set("none", "blue", this.strokeWidth, [startTemp, endTemp]);
            this._moved = true;
        };
        this.onLineEndHandlePointerUp = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.removeEventListener("pointermove", this.onLineEndHandlePointerMove);
            target.removeEventListener("pointerup", this.onLineEndHandlePointerUp);
            target.removeEventListener("pointerout", this.onLineEndHandlePointerUp);
            target.releasePointerCapture(e.pointerId);
            this._svgTemp.remove();
            this.applyTempTransformAsync();
        };
        if (dto.annotationType !== "line") {
            throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'line')`);
        }
        this._vertices = ((_a = dto.vertices) === null || _a === void 0 ? void 0 : _a.length) === 2
            ? [
                new Vec2(dto.vertices[0][0], dto.vertices[0][1]),
                new Vec2(dto.vertices[1][0], dto.vertices[1][1]),
            ]
            : [new Vec2(), new Vec2()];
        this._endings = dto.endings || [lineEndingTypes.NONE, lineEndingTypes.NONE];
        this._caption = dto.caption;
        this._leaderLineTopHeight = (_b = dto.leaderLineTopHeight) !== null && _b !== void 0 ? _b : 0;
        this._leaderLineBottomHeight = (_c = dto.leaderLineBottomHeight) !== null && _c !== void 0 ? _c : 0;
    }
    get vertices() {
        return this._vertices;
    }
    get endings() {
        return this._endings;
    }
    get caption() {
        return this._caption;
    }
    get leaderLineTopHeight() {
        return this._leaderLineTopHeight;
    }
    get leaderLineBottomHeight() {
        return this._leaderLineBottomHeight;
    }
    get matrix() {
        return this.getRenderHelpers().matrix;
    }
    toDto() {
        return {
            annotationType: this.type,
            uuid: this.uuid,
            imageUuid: this._imageUuid,
            dateCreated: this._dateCreated.toISOString(),
            dateModified: this._dateModified.toISOString(),
            author: this._author,
            rotation: this._rotation,
            textContent: this._textContent,
            strokeColor: this._strokeColor,
            strokeWidth: this._strokeWidth,
            strokeDashGap: this._strokeDashGap,
            caption: this._caption,
            vertices: [
                [this._vertices[0].x, this._vertices[0].y],
                [this._vertices[1].x, this._vertices[1].y],
            ],
            endings: this._endings,
            leaderLineTopHeight: this._leaderLineTopHeight,
            leaderLineBottomHeight: this._leaderLineBottomHeight,
        };
    }
    setTextContentAsync(text, undoable = true) {
        const _super = Object.create(null, {
            setTextContentAsync: { get: () => super.setTextContentAsync }
        });
        return __awaiter$f(this, void 0, void 0, function* () {
            this._caption = text;
            this.updateAABB();
            yield _super.setTextContentAsync.call(this, text, undoable);
            yield this.updateRenderAsync();
        });
    }
    applyCommonTransformAsync(matrix, undoable = true) {
        const _super = Object.create(null, {
            applyCommonTransformAsync: { get: () => super.applyCommonTransformAsync }
        });
        return __awaiter$f(this, void 0, void 0, function* () {
            this._vertices.forEach(x => x.applyMat3(matrix));
            yield _super.applyCommonTransformAsync.call(this, matrix, undoable);
        });
    }
    renderAppearanceAsync() {
        return __awaiter$f(this, void 0, void 0, function* () {
            try {
                const clipPaths = [];
                const elements = [];
                const pickHelpers = [];
                const sw = this._strokeWidth;
                const [min, max] = this.aabb;
                const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
                clipPath.id = `clip0_${this.uuid}`;
                clipPath.innerHTML = "<path d=\""
                    + `M${min.x},${min.y} `
                    + `L${max.x},${min.y} `
                    + `L${max.x},${max.y} `
                    + `L${min.x},${max.y} `
                    + "z"
                    + "\"/>";
                clipPaths.push(clipPath);
                const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
                group.setAttribute("clip-path", `url(#${clipPath.id})`);
                const clonedGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                clonedGroup.classList.add("annotation-pick-helper");
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("fill", "none");
                const [r, g, b, a] = this._strokeColor;
                path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
                path.setAttribute("stroke-width", this._strokeWidth + "");
                if (this._strokeDashGap) {
                    path.setAttribute("stroke-dasharray", this._strokeDashGap.join(" "));
                }
                path.setAttribute("stroke-linecap", "square");
                path.setAttribute("stroke-linejoin", "miter");
                const { matrix, alignedStart, alignedEnd } = this.getRenderHelpers();
                let d = `M${alignedStart.x},${alignedStart.y}`;
                d += ` L${alignedEnd.x},${alignedEnd.y}`;
                if (this._leaderLineTopHeight || this._leaderLineBottomHeight) {
                    const llTop = new Vec2(0, -Math.abs(this._leaderLineTopHeight));
                    const llBottom = new Vec2(0, Math.abs(this._leaderLineBottomHeight));
                    const llLeftStart = Vec2.add(alignedStart, llBottom);
                    const llLeftEnd = Vec2.add(alignedStart, llTop);
                    const llRightStart = Vec2.add(alignedEnd, llBottom);
                    const llRightEnd = Vec2.add(alignedEnd, llTop);
                    d += ` M${llLeftStart.x},${llLeftStart.y}`;
                    d += ` L${llLeftEnd.x},${llLeftEnd.y}`;
                    d += ` M${llRightStart.x},${llRightStart.y}`;
                    d += ` L${llRightEnd.x},${llRightEnd.y}`;
                }
                if (this._endings) {
                    if (this._endings[0] !== lineEndingTypes.NONE) {
                        const endingPathString = buildLineEndingPath(alignedStart, this._endings[0], sw, "left");
                        d += " " + endingPathString;
                    }
                    if (this._endings[1] !== lineEndingTypes.NONE) {
                        const endingPathString = buildLineEndingPath(alignedEnd, this._endings[1], sw, "right");
                        d += " " + endingPathString;
                    }
                }
                path.setAttribute("d", d);
                group.append(path);
                if (this._caption) {
                    const fontSize = LINE_CAPTION_FONT_RATIO * sw;
                    const captionHeight = LINE_CAPTION_SIZE_RATIO * sw;
                    const sidePadding = Math.max(sw * LINE_END_SIZE_RATIO, LINE_END_MIN_SIZE);
                    const maxTextWidth = alignedEnd.getMagnitude() - 2 * sidePadding;
                    const textPivot = new Vec2(alignedEnd.getMagnitude() / 2, -captionHeight / 2 - sw / 2);
                    if (maxTextWidth > 0) {
                        const textData = yield TextData.buildAsync(this._caption, {
                            maxWidth: maxTextWidth,
                            fontSize: fontSize,
                            strokeWidth: sw,
                            textAlign: "center",
                            pivotPoint: "center",
                        });
                        const firstLine = textData.lines[0];
                        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                        rect.setAttribute("x", textPivot.x + firstLine.relativeRect[0] + "");
                        rect.setAttribute("y", textPivot.y - captionHeight / 2 + "");
                        rect.setAttribute("width", firstLine.relativeRect[2] - firstLine.relativeRect[0] + "");
                        rect.setAttribute("height", captionHeight + "");
                        rect.setAttribute("fill", "rgba(255,255,255,0.5)");
                        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                        text.setAttribute("x", textPivot.x + "");
                        text.setAttribute("y", textPivot.y + "");
                        text.setAttribute("fill", "black");
                        text.setAttribute("dominant-baseline", "middle");
                        text.setAttribute("text-anchor", "middle");
                        text.style.fontSize = fontSize + "px";
                        text.style.fontFamily = "sans-serif";
                        text.textContent = firstLine.text;
                        group.append(rect, text);
                    }
                }
                const matrixString = `matrix(${matrix.truncate(5).toFloatShortArray().join(",")})`;
                group.childNodes.forEach(x => {
                    if (x instanceof SVGGraphicsElement) {
                        x.setAttribute("transform", matrixString);
                    }
                });
                const clonedPath = path.cloneNode(true);
                const clonedPathStrokeWidth = sw < SELECTION_STROKE_WIDTH
                    ? SELECTION_STROKE_WIDTH
                    : sw;
                clonedPath.setAttribute("stroke-width", clonedPathStrokeWidth + "");
                clonedPath.setAttribute("stroke", "transparent");
                clonedPath.setAttribute("fill", "none");
                clonedPath.setAttribute("transform", `matrix(${matrix.truncate(5).toFloatShortArray().join(",")})`);
                clonedGroup.append(clonedPath);
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
        });
    }
    updateAABB() {
        const bbox = this.getBoxCorners();
        const { ll, lr, ur, ul } = bbox;
        const { min, max } = Vec2.minMax(ll, lr, ur, ul);
        this._bbox = bbox;
        this._aabb[0].setFromVec2(min);
        this._aabb[1].setFromVec2(max);
    }
    getRenderHelpers() {
        const start = this._vertices[0].clone();
        const end = this._vertices[1].clone();
        return getLineRenderHelpers(start, end);
    }
    getBoxCorners(helpers) {
        const { matrix, alignedStart, alignedEnd } = helpers !== null && helpers !== void 0 ? helpers : this.getRenderHelpers();
        const sw = this._strokeWidth;
        const endingNotNone = this._endings &&
            (this._endings[0] && this._endings[0] !== lineEndingTypes.NONE
                || this._endings[1] && this._endings[1] !== lineEndingTypes.NONE);
        const margin = endingNotNone
            ? sw / 2 + Math.max(LINE_END_MIN_SIZE, LINE_END_SIZE_RATIO * sw)
            : sw / 2;
        const marginTop = Math.max(Math.abs(this._leaderLineTopHeight), margin, this._caption ? LINE_CAPTION_SIZE_RATIO * sw + sw / 2 : 0);
        const marginBottom = Math.max(Math.abs(this._leaderLineBottomHeight), margin);
        const min = Vec2.add(alignedStart, new Vec2(-margin, -marginTop));
        const max = Vec2.add(alignedEnd, new Vec2(margin, marginBottom));
        const bl = new Vec2(min.x, min.y).applyMat3(matrix);
        const br = new Vec2(max.x, min.y).applyMat3(matrix);
        const tr = new Vec2(max.x, max.y).applyMat3(matrix);
        const tl = new Vec2(min.x, max.y).applyMat3(matrix);
        return {
            ll: bl,
            lr: br,
            ur: tr,
            ul: tl,
        };
    }
    renderHandles() {
        return [...this.renderLineEndHandles(), this.renderRotationHandle()];
    }
    renderLineEndHandles() {
        const [start, end] = this._vertices;
        const startHandle = document.createElementNS("http://www.w3.org/2000/svg", "line");
        startHandle.classList.add("annotation-handle", "scale");
        startHandle.setAttribute("data-handle-name", "start");
        startHandle.setAttribute("x1", start.x + "");
        startHandle.setAttribute("y1", start.y + "");
        startHandle.setAttribute("x2", start.x + "");
        startHandle.setAttribute("y2", start.y + 0.1 + "");
        startHandle.addEventListener("pointerdown", this.onLineEndHandlePointerDown);
        const endHandle = document.createElementNS("http://www.w3.org/2000/svg", "line");
        endHandle.classList.add("annotation-handle", "scale");
        endHandle.setAttribute("data-handle-name", "end");
        endHandle.setAttribute("x1", end.x + "");
        endHandle.setAttribute("y1", end.y + "");
        endHandle.setAttribute("x2", end.x + "");
        endHandle.setAttribute("y2", end.y + 0.1 + "");
        endHandle.addEventListener("pointerdown", this.onLineEndHandlePointerDown);
        return [startHandle, endHandle];
    }
}

var __awaiter$e = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class GeometricLineAnnotator extends GeometricAnnotator {
    constructor(imageService, parent, options) {
        super(imageService, parent, options || {});
        this._points = [];
        this.onPointerDown = (e) => {
            if (!e.isPrimary || e.button === 2) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy, info: { uuid } } = imageCoords;
            this._imageUuid = uuid;
            this._down = new Vec2(ix, iy);
            this.clear();
            this.refreshGroupPosition();
            const target = e.target;
            target.addEventListener("pointermove", this.onPointerMove);
            target.addEventListener("pointerup", this.onPointerUp);
            target.addEventListener("pointerout", this.onPointerUp);
            target.setPointerCapture(e.pointerId);
        };
        this.onPointerMove = (e) => {
            if (!e.isPrimary
                || !this._down) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy } = imageCoords;
            const start = this._down.clone();
            const end = new Vec2(ix, iy);
            this._points[0] = start;
            this._points[1] = end;
            this.redraw(this._down, end);
        };
        this.onPointerUp = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.removeEventListener("pointermove", this.onPointerMove);
            target.removeEventListener("pointerup", this.onPointerUp);
            target.removeEventListener("pointerout", this.onPointerUp);
            target.releasePointerCapture(e.pointerId);
            if (this._points.length > 1) {
                this.emitDataChanged(2, true, true);
            }
        };
        this.init();
    }
    destroy() {
        super.destroy();
    }
    undo() {
        this.clear();
    }
    clear() {
        this._points.length = 0;
        this.clearGroup();
    }
    saveAnnotationAsync() {
        return __awaiter$e(this, void 0, void 0, function* () {
            if (this._points.length < 2) {
                return;
            }
            const imageUuid = this._imageUuid;
            const dto = this.buildAnnotationDto();
            const annotation = new LineAnnotation(this._imageService.eventService, dto);
            this._imageService.appendAnnotationToImage(imageUuid, annotation);
            this.clear();
        });
    }
    init() {
        super.init();
        this._overlay.addEventListener("pointerdown", this.onPointerDown);
    }
    redraw(min, max) {
        this._svgGroup.innerHTML = "";
        if (this._points.length < 2) {
            return;
        }
        const [r, g, b, a] = this._color || [0, 0, 0, 1];
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
        path.setAttribute("stroke-width", this._strokeWidth + "");
        path.setAttribute("stroke-linecap", "square");
        path.setAttribute("stroke-linejoin", "miter");
        const pathString = `M ${min.x},${min.y} L ${max.x},${max.y}`;
        path.setAttribute("d", pathString);
        this._svgGroup.append(path);
    }
    buildAnnotationDto() {
        const nowString = new Date().toISOString();
        const dto = {
            uuid: UUID.getRandomUuid(),
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
            endings: [lineEndingTypes.NONE, lineEndingTypes.NONE],
            leaderLineTopHeight: 0,
            leaderLineBottomHeight: 0,
            caption: null,
        };
        return dto;
    }
}

class GeometricArrowAnnotator extends GeometricLineAnnotator {
    constructor(imageService, parent, options) {
        super(imageService, parent, options || {});
    }
    redraw(min, max) {
        this._svgGroup.innerHTML = "";
        const [r, g, b, a] = this._color || [0, 0, 0, 1];
        const { matrix, alignedStart, alignedEnd } = getLineRenderHelpers(min, max);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
        path.setAttribute("stroke-width", this._strokeWidth + "");
        path.setAttribute("stroke-linecap", "square");
        let pathString = `M${alignedStart.x},${alignedStart.y} L${alignedEnd.x},${alignedEnd.y}`;
        const arrowPathString = buildLineEndingPath(alignedEnd, lineEndingTypes.ARROW_OPEN, this._strokeWidth, "right");
        pathString += " " + arrowPathString;
        path.setAttribute("d", pathString);
        path.setAttribute("transform", `matrix(${matrix.truncate(2).toFloatShortArray().join(",")})`);
        this._svgGroup.append(path);
    }
    buildAnnotationDto() {
        const nowString = new Date().toISOString();
        const dto = {
            uuid: UUID.getRandomUuid(),
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
            leaderLineTopHeight: 0,
            leaderLineBottomHeight: 0,
            caption: null,
        };
        return dto;
    }
}

const geometricAnnotatorTypes = ["square", "circle",
    "polyline", "polygon", "line", "arrow"];
class GeometricAnnotatorFactory {
    createAnnotator(imageService, parent, options, type) {
        var _a, _b;
        if (!imageService) {
            throw new Error("Document service is not defined");
        }
        if (!parent) {
            throw new Error("Parent container is not defined");
        }
        type || (type = this._lastType || "square");
        this._lastType = type;
        const color = (options === null || options === void 0 ? void 0 : options.color) || this._lastColor || [0, 0, 0, 0.9];
        this._lastColor = color;
        const strokeWidth = (options === null || options === void 0 ? void 0 : options.strokeWidth) || this._lastStrokeWidth || 3;
        this._lastStrokeWidth = strokeWidth;
        const cloudMode = (_b = (_a = options === null || options === void 0 ? void 0 : options.cloudMode) !== null && _a !== void 0 ? _a : this._lastCloudMode) !== null && _b !== void 0 ? _b : false;
        this._lastCloudMode = cloudMode;
        const combinedOptions = {
            color,
            strokeWidth,
            cloudMode,
        };
        switch (type) {
            case "square":
                return new GeometricSquareAnnotator(imageService, parent, combinedOptions);
            case "circle":
                return new GeometricCircleAnnotator(imageService, parent, combinedOptions);
            case "polyline":
                return new GeometricPolylineAnnotator(imageService, parent, combinedOptions);
            case "polygon":
                return new GeometricPolygonAnnotator(imageService, parent, combinedOptions);
            case "line":
                return new GeometricLineAnnotator(imageService, parent, combinedOptions);
            case "arrow":
                return new GeometricArrowAnnotator(imageService, parent, combinedOptions);
            default:
                throw new Error(`Invalid geometric annotator type: ${type}`);
        }
    }
}

const standardStampColors = {
    redColor: [205, 0, 0, 1],
    greenColor: [0, 205, 0, 1],
    blueColor: [0, 0, 205, 1],
};
const standardStampBBox = [0, 0, 440, 120];
const stampAnnotationForms = {
    DRAFT: [
        {
            pathString: `
        M33.5,13.4
        L404.5,6.92
        C419.6,6.657 431.9,18.52 432.1,33.62
        L432.89,78.92
        C433.153,94.02 421.29,106.32 406.19,106.52
        L35.19,113
        C20.09,113.263 7.79,101.4 7.59,86.3
        L6.8,41
        C6.537,25.9 18.4,13.6 33.5,13.4
        Z`,
            stroke: true,
        },
        {
            pathString: `
        M150,61
        C150.047,65.947 149.114,70.413 147.2,74.4
        C145.287,78.333 142.853,81.373 139.9,83.52
        C137.68,85.127 135.24,86.263 132.58,86.93
        C129.92,87.593 126.763,87.957 123.11,88.02
        L106.91,88.29
        L106.401,35.19
        L123.001,34.912
        C126.734,34.85 129.961,35.165 132.681,35.857
        C135.394,36.524 137.681,37.507 139.541,38.807
        C142.721,40.994 145.234,43.974 147.081,47.747
        C148.941,51.5 149.898,55.934 149.951,61.047
        Z
        M137.8,61.097
        C137.767,57.597 137.183,54.621 136.05,52.167
        C134.937,49.687 133.183,47.764 130.79,46.397
        C129.57,45.731 128.323,45.287 127.05,45.067
        C125.797,44.827 123.897,44.728 121.35,44.77
        L118.36,44.82
        L118.678,78.12
        L121.668,78.07
        C124.481,78.023 126.541,77.846 127.848,77.538
        C129.161,77.207 130.438,76.637 131.678,75.828
        C133.818,74.362 135.381,72.432 136.368,70.038
        C137.348,67.618 137.821,64.648 137.788,61.128
        Z
        M185,50
        C184.987,48.667 184.74,47.53 184.259,46.59
        C183.778,45.643 182.961,44.907 181.809,44.38
        C181.002,44.013 180.066,43.802 178.999,43.749
        C177.932,43.672 176.689,43.645 175.269,43.669
        L170.989,43.74
        L171.126,58.04
        L174.756,57.979
        C176.643,57.948 178.223,57.814 179.496,57.579
        C180.769,57.344 181.833,56.837 182.686,56.059
        C183.499,55.306 184.086,54.486 184.446,53.599
        C184.827,52.686 185.011,51.483 184.996,49.989
        Z
        M203.8,86.6
        L189.4,86.841
        L176.7,67.541
        L171.25,67.632
        L171.437,87.132
        L159.637,87.329
        L159.128,34.229
        L178.928,33.897
        C181.635,33.852 183.965,33.991 185.918,34.315
        C187.871,34.639 189.705,35.382 191.418,36.545
        C193.151,37.705 194.531,39.228 195.558,41.115
        C196.605,42.975 197.141,45.335 197.168,48.195
        C197.206,52.122 196.446,55.335 194.888,57.835
        C193.355,60.335 191.138,62.432 188.238,64.125
        Z
        M251,85.8
        L238.8,86.004
        L235.53,75.304
        L218.53,75.588
        L215.46,86.388
        L203.56,86.587
        L219.96,33.187
        L233.56,32.959
        Z
        M232.6,65.6
        L226.78,46.6
        L221.33,65.8
        Z
        M290,42.3
        L268.9,42.653
        L268.995,52.543
        L288.495,52.216
        L288.593,62.516
        L269.093,62.843
        L269.31,85.543
        L257.51,85.74
        L257.001,32.64
        L289.801,32.091
        Z
        M334,41.5
        L319.7,41.739
        L320.11,84.639
        L308.31,84.837
        L307.9,41.937
        L293.6,42.176
        L293.502,31.876
        L333.902,31.199
        Z`,
            fill: true,
        },
    ],
    APPROVED: [
        {
            pathString: `
        M33.5,13.4
        L404.5,6.92
        C419.6,6.657 431.9,18.52 432.1,33.62
        L432.89,78.92
        C433.153,94.02 421.29,106.32 406.19,106.52
        L35.19,113
        C20.09,113.263 7.79,101.4 7.59,86.3
        L6.8,41
        C6.537,25.9 18.4,13.6 33.5,13.4
        Z`,
            stroke: true,
        },
        {
            pathString: `
        M88.9,86.4
        L78,86.585
        L75.08,76.895
        L59.88,77.153
        L57.14,86.933
        L46.54,87.114
        L61.24,38.714
        L73.34,38.508
        Z
        M72.4,68.1
        L67.21,50.9
        L62.35,68.3
        Z
        M128,52.8
        C128.02,54.953 127.72,57.073 127.098,59.16
        C126.477,61.22 125.577,62.96 124.398,64.38
        C122.785,66.307 120.975,67.77 118.968,68.77
        C116.981,69.777 114.495,70.303 111.508,70.35
        L104.938,70.462
        L105.086,86.162
        L94.586,86.341
        L94.132,38.141
        L111.532,37.846
        C114.132,37.802 116.322,38.034 118.102,38.543
        C119.902,39.03 121.492,39.79 122.872,40.823
        C124.532,42.07 125.802,43.676 126.682,45.643
        C127.582,47.61 128.045,49.986 128.072,52.773
        Z
        M117.1,53.276
        C117.087,51.916 116.765,50.756 116.133,49.796
        C115.501,48.816 114.771,48.139 113.943,47.766
        C112.836,47.267 111.763,47.005 110.723,46.98
        C109.676,46.933 108.283,46.924 106.543,46.954
        L104.733,46.985
        L104.869,61.385
        L107.889,61.333
        C109.682,61.303 111.156,61.149 112.309,60.87
        C113.476,60.592 114.449,60.058 115.229,59.27
        C115.902,58.57 116.379,57.744 116.659,56.79
        C116.961,55.817 117.106,54.64 117.093,53.26
        Z
        M170,52.1
        C170.02,54.253 169.72,56.373 169.098,58.46
        C168.477,60.52 167.577,62.26 166.398,63.68
        C164.785,65.607 162.975,67.07 160.968,68.07
        C158.981,69.077 156.495,69.603 153.508,69.65
        L146.938,69.762
        L147.086,85.462
        L136.586,85.641
        L136.132,37.441
        L153.532,37.146
        C156.132,37.102 158.322,37.334 160.102,37.843
        C161.902,38.33 163.492,39.09 164.872,40.123
        C166.532,41.37 167.802,42.976 168.682,44.943
        C169.582,46.91 170.045,49.286 170.072,52.073
        Z
        M159.1,52.576
        C159.087,51.216 158.765,50.056 158.133,49.096
        C157.501,48.116 156.771,47.439 155.943,47.066
        C154.836,46.567 153.763,46.305 152.723,46.28
        C151.676,46.233 150.283,46.224 148.543,46.254
        L146.733,46.285
        L146.869,60.685
        L149.889,60.633
        C151.682,60.603 153.156,60.449 154.309,60.17
        C155.476,59.892 156.449,59.358 157.229,58.57
        C157.902,57.87 158.379,57.044 158.659,56.09
        C158.961,55.117 159.106,53.94 159.093,52.56
        Z
        M200,51.1
        C199.989,49.893 199.768,48.863 199.339,48.01
        C198.91,47.157 198.18,46.49 197.149,46.01
        C196.429,45.677 195.592,45.487 194.639,45.438
        C193.686,45.368 192.576,45.344 191.309,45.365
        L187.489,45.43
        L187.611,58.43
        L190.851,58.375
        C192.538,58.346 193.948,58.225 195.081,58.012
        C196.214,57.799 197.161,57.342 197.921,56.642
        C198.648,55.962 199.171,55.219 199.491,54.412
        C199.831,53.585 199.995,52.492 199.982,51.132
        Z
        M216.8,84.2
        L203.9,84.419
        L192.6,66.919
        L187.74,67.002
        L187.906,84.702
        L177.406,84.88
        L176.952,36.68
        L194.652,36.379
        C197.072,36.338 199.152,36.464 200.892,36.758
        C202.632,37.052 204.269,37.725 205.802,38.778
        C207.349,39.831 208.579,41.211 209.492,42.918
        C210.425,44.604 210.902,46.741 210.922,49.328
        C210.956,52.888 210.279,55.801 208.892,58.068
        C207.519,60.334 205.539,62.234 202.952,63.768
        Z
        M261,59.4
        C261.073,67.067 259.263,73.2 255.57,77.8
        C251.877,82.373 246.743,84.713 240.17,84.82
        C233.597,84.932 228.43,82.765 224.67,78.32
        C220.89,73.853 218.963,67.787 218.89,60.12
        C218.817,52.387 220.627,46.253 224.32,41.72
        C228.013,37.147 233.147,34.807 239.72,34.7
        C246.273,34.589 251.44,36.755 255.22,41.2
        C259.013,45.62 260.947,51.687 261.02,59.4
        Z
        M247.1,71.8
        C248.113,70.313 248.857,68.577 249.33,66.59
        C249.805,64.577 250.03,62.223 250.005,59.53
        C249.978,56.643 249.671,54.19 249.084,52.17
        C248.497,50.15 247.741,48.523 246.814,47.29
        C245.867,46.01 244.777,45.09 243.544,44.53
        C242.331,43.968 241.064,43.698 239.744,43.721
        C238.404,43.744 237.144,44.045 235.964,44.626
        C234.797,45.207 233.724,46.153 232.744,47.466
        C231.837,48.686 231.101,50.369 230.534,52.516
        C229.986,54.636 229.725,57.099 229.752,59.906
        C229.779,62.773 230.077,65.216 230.645,67.236
        C231.232,69.229 231.988,70.856 232.915,72.116
        C233.842,73.376 234.922,74.296 236.155,74.876
        C237.388,75.459 238.682,75.739 240.035,75.716
        C241.388,75.693 242.675,75.369 243.895,74.745
        C245.115,74.099 246.178,73.122 247.085,71.815
        Z
        M306,34.6
        L291.5,83
        L279.7,83.201
        L264.3,35.301
        L275.4,35.113
        L285.6,68.813
        L295.17,34.813
        Z
        M342,82.1
        L312.4,82.603
        L311.946,34.403
        L341.546,33.9
        L341.634,43.22
        L322.534,43.544
        L322.612,51.854
        L340.312,51.553
        L340.4,60.873
        L322.7,61.174
        L322.812,73.074
        L341.912,72.75
        Z
        M389,57.3
        C389.042,61.787 388.209,65.82 386.5,69.4
        C384.793,72.967 382.62,75.72 379.98,77.66
        C378,79.12 375.82,80.15 373.44,80.75
        C371.067,81.351 368.25,81.68 364.99,81.735
        L350.59,81.98
        L350.136,33.78
        L364.936,33.528
        C368.269,33.471 371.146,33.757 373.566,34.384
        C375.993,34.99 378.033,35.883 379.686,37.064
        C382.526,39.044 384.769,41.744 386.416,45.164
        C388.076,48.564 388.929,52.597 388.976,57.264
        Z
        M378.1,57.388
        C378.07,54.222 377.55,51.525 376.54,49.298
        C375.547,47.052 373.983,45.308 371.85,44.068
        C370.763,43.461 369.65,43.058 368.51,42.858
        C367.39,42.64 365.693,42.551 363.42,42.589
        L360.76,42.634
        L361.044,72.734
        L363.704,72.689
        C366.211,72.647 368.051,72.486 369.224,72.207
        C370.391,71.907 371.531,71.391 372.644,70.657
        C374.557,69.331 375.951,67.581 376.824,65.407
        C377.704,63.214 378.127,60.521 378.094,57.327
        Z`,
            fill: true,
        },
    ],
    NOT_APPROVED: [
        {
            pathString: `
        M33.5,13.4
        L404.5,6.92
        C419.6,6.657 431.9,18.52 432.1,33.62
        L432.89,78.92
        C433.153,94.02 421.29,106.32 406.19,106.52
        L35.19,113
        C20.09,113.263 7.79,101.4 7.59,86.3
        L6.8,41
        C6.537,25.9 18.4,13.6 33.5,13.4
        Z`,
            stroke: true,
        },
        {
            pathString: `
        M57.1,85.5
        L49.12,85.636
        L35.32,55.036
        L35.469,85.936
        L27.879,86.066
        L27.662,41.066
        L37.562,40.897
        L49.362,66.497
        L49.238,40.697
        L56.828,40.567
        Z
        M96.4,62.4
        C96.435,69.533 94.995,75.267 92.08,79.6
        C89.167,83.86 85.133,86.033 79.98,86.12
        C74.82,86.208 70.753,84.175 67.78,80.02
        C64.827,75.84 63.333,70.173 63.3,63.02
        C63.265,55.82 64.705,50.087 67.62,45.82
        C70.533,41.56 74.567,39.387 79.72,39.3
        C84.867,39.212 88.933,41.245 91.92,45.4
        C94.887,49.533 96.387,55.2 96.42,62.4
        Z
        M85.5,74
        C86.3,72.62 86.89,71 87.27,69.14
        C87.649,67.26 87.833,65.063 87.82,62.55
        C87.807,59.85 87.573,57.56 87.118,55.68
        C86.663,53.793 86.073,52.273 85.348,51.12
        C84.608,49.927 83.755,49.067 82.788,48.54
        C81.835,48.013 80.841,47.758 79.808,47.776
        C78.761,47.794 77.771,48.073 76.838,48.612
        C75.918,49.151 75.075,50.031 74.308,51.252
        C73.595,52.392 73.011,53.962 72.558,55.962
        C72.122,57.942 71.91,60.242 71.923,62.862
        C71.936,65.542 72.163,67.822 72.603,69.702
        C73.058,71.569 73.648,73.089 74.373,74.262
        C75.1,75.435 75.946,76.295 76.913,76.842
        C77.88,77.389 78.893,77.654 79.953,77.635
        C81.02,77.617 82.033,77.318 82.993,76.738
        C83.953,76.138 84.79,75.228 85.503,74.008
        Z
        M128,48
        L118,48.172
        L118.175,84.472
        L109.895,84.614
        L109.72,48.314
        L99.72,48.486
        L99.678,39.786
        L127.978,39.301
        Z
        M178,83.4
        L169.44,83.546
        L167.18,74.496
        L155.28,74.7
        L153.1,83.83
        L144.76,83.973
        L156.36,38.773
        L165.89,38.61
        Z
        M165.1,66.3
        L161.08,50.2
        L157.21,66.4
        Z
        M209,52.1
        C209.01,54.113 208.768,56.09 208.274,58.03
        C207.78,59.95 207.07,61.573 206.144,62.9
        C204.871,64.693 203.447,66.057 201.874,66.99
        C200.314,67.923 198.361,68.41 196.014,68.45
        L190.864,68.538
        L190.935,83.138
        L182.655,83.28
        L182.438,38.28
        L196.038,38.047
        C198.078,38.012 199.798,38.235 201.198,38.714
        C202.611,39.173 203.858,39.886 204.938,40.854
        C206.238,42.021 207.231,43.524 207.918,45.364
        C208.618,47.204 208.974,49.421 208.988,52.014
        Z
        M200.44,52.518
        C200.434,51.251 200.184,50.168 199.691,49.268
        C199.198,48.348 198.628,47.715 197.981,47.368
        C197.114,46.9 196.271,46.653 195.451,46.626
        C194.631,46.58 193.538,46.568 192.171,46.592
        L190.751,46.616
        L190.816,60.116
        L193.186,60.075
        C194.593,60.051 195.749,59.911 196.656,59.653
        C197.576,59.396 198.343,58.899 198.956,58.163
        C199.485,57.51 199.861,56.74 200.086,55.853
        C200.326,54.947 200.443,53.847 200.437,52.553
        Z
        M241,51.6
        C241.01,53.613 240.768,55.59 240.274,57.53
        C239.78,59.45 239.07,61.073 238.144,62.4
        C236.871,64.193 235.447,65.557 233.874,66.49
        C232.314,67.423 230.361,67.91 228.014,67.95
        L222.864,68.038
        L222.935,82.638
        L214.655,82.78
        L214.438,37.78
        L228.038,37.547
        C230.078,37.512 231.798,37.735 233.198,38.214
        C234.611,38.673 235.858,39.386 236.938,40.354
        C238.238,41.521 239.231,43.024 239.918,44.864
        C240.618,46.704 240.974,48.921 240.988,51.514
        Z
        M232.44,52.018
        C232.434,50.751 232.184,49.668 231.691,48.768
        C231.198,47.848 230.628,47.215 229.981,46.868
        C229.114,46.4 228.271,46.153 227.451,46.126
        C226.631,46.08 225.538,46.068 224.171,46.092
        L222.751,46.116
        L222.816,59.616
        L225.186,59.575
        C226.593,59.551 227.749,59.411 228.656,59.153
        C229.576,58.896 230.343,58.399 230.956,57.663
        C231.485,57.01 231.861,56.24 232.086,55.353
        C232.326,54.447 232.443,53.347 232.437,52.053
        Z
        M265,50.7
        C264.995,49.573 264.825,48.61 264.49,47.81
        C264.155,47.01 263.585,46.387 262.78,45.94
        C262.218,45.627 261.565,45.447 260.82,45.4
        C260.073,45.332 259.203,45.307 258.21,45.324
        L255.21,45.375
        L255.269,57.475
        L257.809,57.432
        C259.129,57.409 260.235,57.299 261.129,57.103
        C262.022,56.906 262.769,56.479 263.369,55.823
        C263.941,55.189 264.354,54.499 264.609,53.753
        C264.878,52.986 265.01,51.966 265.004,50.693
        Z
        M278.1,81.7
        L268,81.873
        L259.17,65.573
        L255.35,65.638
        L255.43,82.138
        L247.19,82.279
        L246.973,37.279
        L260.873,37.041
        C262.773,37.009 264.406,37.132 265.773,37.41
        C267.139,37.689 268.423,38.322 269.623,39.31
        C270.836,40.297 271.799,41.59 272.513,43.19
        C273.239,44.77 273.609,46.767 273.623,49.18
        C273.639,52.5 273.099,55.217 272.003,57.33
        C270.923,59.444 269.366,61.21 267.333,62.63
        Z
        M313,58.7
        C313.035,65.833 311.595,71.567 308.68,75.9
        C305.767,80.16 301.733,82.333 296.58,82.42
        C291.42,82.508 287.353,80.475 284.38,76.32
        C281.427,72.14 279.933,66.473 279.9,59.32
        C279.865,52.12 281.305,46.387 284.22,42.12
        C287.133,37.86 291.167,35.687 296.32,35.6
        C301.467,35.512 305.533,37.545 308.52,41.7
        C311.487,45.833 312.987,51.5 313.02,58.7
        Z
        M302.1,70.3
        C302.9,68.92 303.49,67.3 303.87,65.44
        C304.249,63.56 304.433,61.363 304.42,58.85
        C304.407,56.15 304.173,53.86 303.718,51.98
        C303.263,50.093 302.673,48.573 301.948,47.42
        C301.208,46.227 300.355,45.367 299.388,44.84
        C298.435,44.313 297.441,44.058 296.408,44.076
        C295.361,44.094 294.371,44.373 293.438,44.912
        C292.518,45.451 291.675,46.331 290.908,47.552
        C290.195,48.692 289.611,50.262 289.158,52.262
        C288.722,54.242 288.51,56.542 288.523,59.162
        C288.536,61.842 288.763,64.122 289.203,66.002
        C289.658,67.869 290.248,69.389 290.973,70.562
        C291.7,71.735 292.546,72.595 293.513,73.142
        C297.62,73.917 298.633,73.618 299.593,73.038
        C300.553,72.438 301.39,71.528 302.103,70.308
        Z
        M348,35.6
        L336.5,80.8
        L327.23,80.959
        L315.33,36.159
        L324.02,36.01
        L331.93,67.41
        L339.54,35.71
        Z
        M376,80
        L352.8,80.397
        L352.583,35.397
        L375.783,35
        L375.825,43.7
        L360.825,43.956
        L360.863,51.716
        L374.762,51.478
        L374.804,60.178
        L360.904,60.416
        L360.958,71.516
        L375.958,71.26
        Z
        M413,57
        C413.02,61.187 412.357,64.953 411.01,68.3
        C409.663,71.627 407.95,74.193 405.87,76
        C404.31,77.353 402.597,78.31 400.73,78.87
        C398.863,79.425 396.65,79.725 394.09,79.769
        L382.79,79.963
        L382.573,34.963
        L394.173,34.764
        C396.786,34.719 399.043,34.993 400.943,35.584
        C402.843,36.155 404.443,36.992 405.743,38.094
        C407.963,39.947 409.713,42.474 410.993,45.674
        C412.286,48.854 412.943,52.621 412.963,56.974
        Z
        M404.44,57.056
        C404.426,54.096 404.026,51.576 403.24,49.496
        C402.467,47.396 401.243,45.766 399.57,44.606
        C398.717,44.037 397.847,43.66 396.96,43.476
        C396.08,43.269 394.75,43.181 392.97,43.212
        L390.88,43.248
        L391.016,71.348
        L393.106,71.312
        C395.073,71.278 396.516,71.133 397.436,70.876
        C398.356,70.599 399.253,70.122 400.126,69.446
        C401.626,68.213 402.726,66.583 403.426,64.556
        C404.119,62.509 404.459,59.996 404.446,57.016
        Z`,
            fill: true,
        },
    ],
    DEPARTMENTAL: [
        {
            pathString: `
        M33.5,13.4
        L404.5,6.92
        C419.6,6.657 431.9,18.52 432.1,33.62
        L432.89,78.92
        C433.153,94.02 421.29,106.32 406.19,106.52
        L35.19,113
        C20.09,113.263 7.79,101.4 7.59,86.3
        L6.8,41
        C6.537,25.9 18.4,13.6 33.5,13.4
        Z`,
            stroke: true,
        },
        {
            pathString: `
        M56.4,63.1
        C56.412,67.46 55.746,71.393 54.4,74.9
        C53.06,78.36 51.36,81.03 49.3,82.91
        C47.753,84.317 46.053,85.31 44.2,85.89
        L26.42,86.996
        L26.286,40.196
        L37.786,40.009
        C40.379,39.967 42.616,40.256 44.496,40.875
        C46.376,41.474 47.959,42.35 49.246,43.505
        C51.446,45.438 53.176,48.072 54.436,51.405
        C55.709,54.718 56.353,58.652 56.366,63.205
        Z
        M47.92,63.143
        C47.911,60.063 47.518,57.437 46.74,55.263
        C45.98,53.077 44.773,51.377 43.12,50.163
        C42.28,49.569 41.417,49.175 40.53,48.983
        C39.663,48.767 38.347,48.673 36.58,48.701
        L34.51,48.735
        L34.594,78.035
        L36.664,78.001
        C38.617,77.97 40.047,77.821 40.954,77.554
        C41.867,77.267 42.757,76.77 43.624,76.064
        C45.117,74.784 46.207,73.088 46.894,70.974
        C47.587,68.848 47.927,66.231 47.914,63.124
        Z
        M85.8,86
        L62.8,86.373
        L62.666,39.573
        L85.666,39.2
        L85.692,48.26
        L70.892,48.501
        L70.915,56.581
        L84.715,56.357
        L84.741,65.417
        L70.941,65.641
        L70.974,77.241
        L85.774,77
        Z
        M119,53.4
        C119.006,55.493 118.763,57.553 118.27,59.58
        C117.777,61.58 117.071,63.27 116.15,64.65
        C114.89,66.517 113.477,67.933 111.91,68.9
        C110.363,69.867 108.43,70.37 106.11,70.41
        L101.01,70.493
        L101.054,85.793
        L92.854,85.926
        L92.72,39.126
        L106.22,38.907
        C108.24,38.874 109.943,39.108 111.33,39.61
        C112.723,40.091 113.956,40.837 115.03,41.85
        C116.316,43.063 117.296,44.63 117.97,46.55
        C118.656,48.47 119.003,50.78 119.01,53.48
        Z
        M110.52,53.821
        C110.516,52.501 110.271,51.374 109.784,50.441
        C109.297,49.488 108.734,48.824 108.094,48.451
        C107.241,47.962 106.407,47.703 105.594,47.674
        C104.781,47.624 103.697,47.61 102.344,47.632
        L100.934,47.655
        L100.974,61.655
        L103.324,61.617
        C104.717,61.595 105.864,61.45 106.764,61.184
        C107.677,60.918 108.437,60.401 109.044,59.634
        C109.569,58.954 109.945,58.151 110.174,57.224
        C110.413,56.278 110.531,55.134 110.527,53.794
        Z
        M154,84.9
        L145.52,85.038
        L143.29,75.608
        L131.49,75.799
        L129.32,85.299
        L121.06,85.433
        L132.66,38.433
        L142.1,38.28
        Z
        M141.3,67.1
        L137.34,50.4
        L133.48,67.3
        Z
        M176,52
        C175.997,50.827 175.83,49.823 175.5,48.99
        C175.17,48.157 174.607,47.507 173.81,47.04
        C173.254,46.713 172.604,46.525 171.86,46.474
        C171.12,46.402 170.26,46.374 169.28,46.39
        L166.31,46.438
        L166.346,59.038
        L168.866,58.998
        C170.173,58.976 171.269,58.864 172.156,58.662
        C173.036,58.458 173.776,58.015 174.376,57.332
        C174.943,56.672 175.353,55.952 175.606,55.172
        C175.874,54.372 176.006,53.312 176.003,51.992
        Z
        M188.9,84.3
        L178.9,84.463
        L170.18,67.463
        L166.4,67.524
        L166.449,84.724
        L158.289,84.856
        L158.155,38.056
        L171.955,37.833
        C173.835,37.803 175.452,37.934 176.805,38.226
        C178.158,38.519 179.428,39.179 180.615,40.206
        C181.815,41.233 182.765,42.58 183.465,44.246
        C184.178,45.893 184.542,47.973 184.555,50.486
        C184.565,53.946 184.025,56.776 182.935,58.976
        C181.862,61.176 180.315,63.016 178.295,64.496
        Z
        M218,46.1
        L208.07,46.261
        L208.178,84.061
        L199.978,84.194
        L199.87,46.394
        L189.94,46.555
        L189.914,37.495
        L218.014,37.039
        Z
        M256,83.2
        L247.84,83.332
        L247.75,51.932
        L241.91,72.332
        L236.25,72.424
        L230.3,52.124
        L230.39,83.524
        L222.66,83.65
        L222.526,36.85
        L232.046,36.695
        L239.266,60.095
        L246.336,36.495
        L255.856,36.34
        Z
        M287,82.7
        L264,83.073
        L263.866,36.273
        L286.866,35.9
        L286.892,44.96
        L272.092,45.201
        L272.115,53.281
        L285.915,53.057
        L285.941,62.117
        L272.141,62.341
        L272.174,73.941
        L286.974,73.7
        Z
        M323,82.2
        L315.1,82.328
        L301.5,50.428
        L301.592,82.528
        L294.072,82.65
        L293.938,35.85
        L303.738,35.691
        L315.438,62.291
        L315.361,35.491
        L322.881,35.369
        Z
        M356,43.9
        L346.07,44.061
        L346.178,81.861
        L337.978,81.994
        L337.87,44.194
        L327.94,44.355
        L327.914,35.295
        L356.014,34.839
        Z
        M390,81.1
        L381.52,81.238
        L379.29,71.808
        L367.49,71.999
        L365.32,81.499
        L357.06,81.633
        L368.66,34.633
        L378.1,34.48
        Z
        M377.3,63.3
        L373.34,46.6
        L369.48,63.5
        Z
        M418,80.6
        L395.1,80.972
        L394.966,34.172
        L403.166,34.039
        L403.274,71.839
        L417.974,71.6
        Z`,
            fill: true,
        },
    ],
    CONFIDENTIAL: [
        {
            pathString: `
        M33.5,13.4
        L404.5,6.92
        C419.6,6.657 431.9,18.52 432.1,33.62
        L432.89,78.92
        C433.153,94.02 421.29,106.32 406.19,106.52
        L35.19,113
        C20.09,113.263 7.79,101.4 7.59,86.3
        L6.8,41
        C6.537,25.9 18.4,13.6 33.5,13.4
        Z`,
            stroke: true,
        },
        {
            pathString: `
        M48,86.5
        C45.613,86.541 43.403,86.084 41.37,85.13
        C39.35,84.177 37.61,82.737 36.15,80.81
        C34.69,78.883 33.55,76.467 32.73,73.56
        C31.923,70.653 31.513,67.287 31.5,63.46
        C31.483,59.9 31.849,56.663 32.6,53.75
        C33.347,50.837 34.44,48.333 35.88,46.24
        C37.267,44.227 38.983,42.657 41.03,41.53
        C43.097,40.41 45.35,39.827 47.79,39.78
        C49.143,39.757 50.36,39.847 51.44,40.05
        C52.533,40.233 53.54,40.487 54.46,40.814
        C55.427,41.18 56.297,41.597 57.07,42.064
        C57.863,42.513 58.557,42.933 59.15,43.324
        L59.203,54.224
        L58.254,54.24
        C57.849,53.764 57.336,53.201 56.714,52.55
        C56.107,51.896 55.414,51.253 54.634,50.62
        C53.84,49.99 52.984,49.46 52.064,49.03
        C51.144,48.603 50.157,48.398 49.104,48.416
        C47.937,48.436 46.83,48.717 45.784,49.258
        C44.737,49.78 43.77,50.643 42.884,51.848
        C42.044,53.008 41.36,54.538 40.834,56.438
        C40.326,58.338 40.078,60.638 40.091,63.338
        C40.104,66.158 40.396,68.508 40.966,70.388
        C41.55,72.268 42.276,73.745 43.146,74.818
        C44.026,75.912 45.006,76.692 46.086,77.158
        C47.166,77.603 48.229,77.816 49.276,77.798
        C50.282,77.781 51.272,77.553 52.246,77.113
        C53.232,76.674 54.142,76.084 54.976,75.343
        C55.676,74.747 56.326,74.111 56.926,73.433
        C57.526,72.76 58.02,72.177 58.406,71.683
        L59.268,71.668
        L59.32,82.368
        C58.52,82.885 57.753,83.372 57.02,83.828
        C56.286,84.284 55.52,84.68 54.72,85.018
        C53.673,85.459 52.69,85.799 51.77,86.038
        Z
        M96.6,62.3
        C96.635,69.433 95.195,75.167 92.28,79.5
        C89.367,83.76 85.333,85.933 80.18,86.02
        C75.02,86.108 70.953,84.075 67.98,79.92
        C65.027,75.74 63.533,70.073 63.5,62.92
        C63.465,55.72 64.905,49.987 67.82,45.72
        C70.733,41.46 74.767,39.287 79.92,39.2
        C85.067,39.112 89.133,41.145 92.12,45.3
        C95.087,49.433 96.587,55.1 96.62,62.3
        Z
        M85.7,73.9
        C86.5,72.52 87.09,70.9 87.47,69.04
        C87.849,67.16 88.033,64.963 88.02,62.45
        C88.007,59.75 87.773,57.46 87.318,55.58
        C86.863,53.693 86.273,52.173 85.548,51.02
        C84.808,49.827 83.955,48.967 82.988,48.44
        C82.035,47.913 81.041,47.658 80.008,47.676
        C78.961,47.694 77.971,47.973 77.038,48.512
        C76.118,49.051 75.275,49.931 74.508,51.152
        C73.795,52.292 73.211,53.862 72.758,55.862
        C72.322,57.842 72.11,60.142 72.123,62.762
        C72.136,65.442 72.363,67.722 72.803,69.602
        C73.258,71.469 73.848,72.989 74.573,74.162
        C75.3,75.335 76.146,76.195 77.113,76.742
        C78.08,77.289 79.093,77.554 80.153,77.535
        C81.22,77.517 82.233,77.218 83.193,76.638
        C84.153,76.038 84.99,75.128 85.703,73.908
        Z
        M132,84.2
        L124.02,84.336
        L110.22,53.736
        L110.369,84.636
        L102.779,84.766
        L102.562,39.766
        L112.462,39.597
        L124.262,65.197
        L124.138,39.397
        L131.728,39.267
        Z
        M163,47.4
        L148.2,47.653
        L148.24,56.013
        L161.94,55.779
        L161.982,64.479
        L148.282,64.713
        L148.375,83.913
        L140.135,84.054
        L139.918,39.054
        L162.918,38.66
        Z
        M186,83.3
        L167.2,83.622
        L167.161,75.652
        L172.421,75.562
        L172.281,46.562
        L167.022,46.652
        L166.983,38.682
        L185.783,38.36
        L185.822,46.33
        L180.562,46.42
        L180.702,75.42
        L185.962,75.33
        Z
        M223,60.2
        C223.02,64.387 222.357,68.153 221.01,71.5
        C219.663,74.827 217.95,77.393 215.87,79.2
        C214.31,80.553 212.597,81.51 210.73,82.07
        C208.863,82.625 206.65,82.925 204.09,82.969
        L192.79,83.163
        L192.573,38.163
        L204.173,37.964
        C206.786,37.919 209.043,38.193 210.943,38.784
        C212.843,39.355 214.443,40.192 215.743,41.294
        C217.963,43.147 219.713,45.674 220.993,48.874
        C222.286,52.054 222.943,55.821 222.963,60.174
        Z
        M214.44,60.256
        C214.426,57.296 214.026,54.776 213.24,52.696
        C212.467,50.596 211.243,48.966 209.57,47.806
        C208.717,47.237 207.847,46.86 206.96,46.676
        C206.08,46.469 204.75,46.381 202.97,46.412
        L200.88,46.448
        L201.016,74.548
        L203.106,74.512
        C205.073,74.478 206.516,74.333 207.436,74.076
        C208.356,73.799 209.253,73.322 210.126,72.646
        C211.626,71.413 212.726,69.783 213.426,67.756
        C214.119,65.709 214.459,63.196 214.446,60.216
        Z
        M253,82.1
        L229.8,82.497
        L229.583,37.497
        L252.783,37.1
        L252.825,45.8
        L237.825,46.056
        L237.862,53.816
        L251.762,53.578
        L251.804,62.278
        L237.904,62.516
        L237.958,73.616
        L252.958,73.36
        Z
        M289,81.5
        L281.02,81.636
        L267.22,51.036
        L267.369,81.936
        L259.779,82.066
        L259.562,37.066
        L269.462,36.897
        L281.262,62.497
        L281.138,36.697
        L288.728,36.567
        Z
        M322,44.7
        L312,44.872
        L312.175,81.172
        L303.895,81.314
        L303.72,45.014
        L293.72,45.186
        L293.678,36.486
        L321.978,36.001
        Z
        M345,80.6
        L326.2,80.922
        L326.161,72.952
        L331.421,72.862
        L331.281,43.862
        L326.022,43.952
        L325.983,35.982
        L344.783,35.66
        L344.822,43.63
        L339.562,43.72
        L339.702,72.72
        L344.962,72.63
        Z
        M381,79.9
        L372.44,80.046
        L370.18,70.996
        L358.28,71.2
        L356.1,80.33
        L347.76,80.473
        L359.36,35.273
        L368.89,35.11
        Z
        M368.1,62.8
        L364.08,46.7
        L360.21,62.9
        Z
        M409,79.5
        L385.8,79.896
        L385.583,34.896
        L393.863,34.754
        L394.038,71.054
        L408.938,70.799
        Z`,
            fill: true,
        },
    ],
    FINAL: [
        {
            pathString: `
        M33.5,13.4
        L404.5,6.92
        C419.6,6.657 431.9,18.52 432.1,33.62
        L432.89,78.92
        C433.153,94.02 421.29,106.32 406.19,106.52
        L35.19,113
        C20.09,113.263 7.79,101.4 7.59,86.3
        L6.8,41
        C6.537,25.9 18.4,13.6 33.5,13.4
        Z`,
            stroke: true,
        },
        {
            pathString: `
        M148,44.7
        L126.9,45.053
        L126.995,54.943
        L146.495,54.616
        L146.593,64.916
        L127.093,65.243
        L127.31,87.943
        L115.51,88.14
        L115.001,35.04
        L147.801,34.491
        Z
        M181,87
        L154.2,87.449
        L154.11,78.029
        L161.62,77.903
        L161.292,43.603
        L153.782,43.729
        L153.692,34.309
        L180.492,33.86
        L180.582,43.28
        L173.072,43.406
        L173.4,77.706
        L180.91,77.58
        Z
        M233,86.1
        L221.6,86.291
        L201.8,50.191
        L202.149,86.691
        L191.349,86.872
        L190.84,33.772
        L204.94,33.536
        L221.94,63.736
        L221.649,33.336
        L232.449,33.155
        Z
        M287,85.2
        L274.8,85.404
        L271.53,74.704
        L254.53,74.988
        L251.46,85.788
        L239.56,85.987
        L255.96,32.587
        L269.56,32.359
        Z
        M268.6,65
        L262.78,46
        L257.33,65.2
        Z
        M326,84.5
        L292.9,85.053
        L292.391,31.953
        L304.191,31.755
        L304.601,74.655
        L325.801,74.3
        Z`,
            fill: true,
        },
    ],
    EXPIRED: [
        {
            pathString: `
        M33.5,13.4
        L404.5,6.92
        C419.6,6.657 431.9,18.52 432.1,33.62
        L432.89,78.92
        C433.153,94.02 421.29,106.32 406.19,106.52
        L35.19,113
        C20.09,113.263 7.79,101.4 7.59,86.3
        L6.8,41
        C6.537,25.9 18.4,13.6 33.5,13.4
        Z`,
            stroke: true,
        },
        {
            pathString: `
        M99.4,88.3
        L66.3,88.855
        L65.791,35.755
        L98.891,35.2
        L98.989,45.5
        L77.589,45.858
        L77.677,55.028
        L97.577,54.696
        L97.676,64.996
        L77.776,65.328
        L77.902,78.428
        L99.302,78.07
        Z
        M151,87.5
        L137.3,87.729
        L127.3,70.429
        L117.4,88.129
        L104.3,88.347
        L120.3,61.347
        L104.1,35.247
        L117.7,35.019
        L127.4,51.419
        L137.06,34.719
        L150.16,34.5
        L134.36,60.6
        Z
        M195,50.4
        C195.023,52.78 194.686,55.117 193.99,57.41
        C193.297,59.683 192.29,61.603 190.97,63.17
        C189.163,65.297 187.137,66.913 184.89,68.02
        C182.663,69.127 179.877,69.71 176.53,69.77
        L169.17,69.893
        L169.336,87.193
        L157.536,87.391
        L157.027,34.291
        L176.527,33.966
        C179.44,33.917 181.894,34.174 183.887,34.735
        C185.9,35.272 187.684,36.112 189.237,37.255
        C191.097,38.628 192.52,40.402 193.507,42.575
        C194.514,44.748 195.03,47.368 195.057,50.435
        Z
        M182.8,50.926
        C182.786,49.426 182.426,48.146 181.72,47.086
        C181.013,46.006 180.197,45.259 179.27,44.846
        C178.037,44.295 176.833,44.006 175.66,43.978
        C174.487,43.926 172.927,43.917 170.98,43.949
        L168.95,43.983
        L169.102,59.883
        L172.492,59.827
        C174.505,59.793 176.155,59.623 177.442,59.316
        C178.755,59.008 179.849,58.418 180.722,57.546
        C181.475,56.772 182.012,55.859 182.332,54.806
        C182.671,53.732 182.833,52.432 182.818,50.906
        Z
        M228,86.2
        L201.2,86.649
        L201.11,77.229
        L208.62,77.103
        L208.292,42.803
        L200.782,42.929
        L200.692,33.509
        L227.492,33.06
        L227.582,42.48
        L220.072,42.606
        L220.4,76.906
        L227.91,76.78
        Z
        M263,48.7
        C262.987,47.367 262.74,46.23 262.259,45.29
        C261.778,44.343 260.961,43.607 259.809,43.08
        C259.002,42.713 258.066,42.502 256.999,42.449
        C255.932,42.372 254.689,42.345 253.269,42.369
        L248.989,42.44
        L249.126,56.74
        L252.756,56.679
        C254.643,56.648 256.223,56.514 257.496,56.279
        C258.769,56.044 259.833,55.537 260.686,54.759
        C261.499,54.006 262.086,53.186 262.446,52.299
        C262.827,51.386 263.011,50.183 262.996,48.689
        Z
        M281.8,85.3
        L267.4,85.541
        L254.7,66.241
        L249.25,66.332
        L249.437,85.832
        L237.637,86.029
        L237.128,32.929
        L256.928,32.597
        C259.635,32.552 261.965,32.691 263.918,33.015
        C265.871,33.339 267.705,34.082 269.418,35.245
        C271.151,36.405 272.531,37.928 273.558,39.815
        C274.605,41.675 275.141,44.035 275.168,46.895
        C275.206,50.822 274.446,54.035 272.888,56.535
        C271.355,59.035 269.138,61.132 266.238,62.825
        Z
        M321,84.6
        L287.9,85.155
        L287.391,32.055
        L320.491,31.5
        L320.589,41.8
        L299.189,42.158
        L299.277,51.328
        L319.177,50.996
        L319.276,61.296
        L299.376,61.628
        L299.502,74.728
        L320.902,74.37
        Z
        M373,57.2
        C373.047,62.147 372.114,66.613 370.2,70.6
        C368.287,74.533 365.853,77.573 362.9,79.72
        C360.68,81.327 358.24,82.463 355.58,83.13
        C352.92,83.793 349.763,84.157 346.11,84.22
        L329.91,84.49
        L329.401,31.39
        L346.001,31.112
        C349.734,31.05 352.961,31.365 355.681,32.057
        C358.394,32.724 360.681,33.707 362.541,35.007
        C365.721,37.194 368.234,40.174 370.081,43.947
        C371.941,47.7 372.898,52.134 372.951,57.247
        Z
        M360.8,57.297
        C360.767,53.797 360.183,50.821 359.05,48.367
        C357.937,45.887 356.183,43.964 353.79,42.597
        C352.57,41.931 351.323,41.487 350.05,41.267
        C348.797,41.027 346.897,40.928 344.35,40.97
        L341.36,41.02
        L341.678,74.32
        L344.668,74.27
        C347.481,74.223 349.541,74.046 350.848,73.738
        C352.161,73.407 353.438,72.837 354.678,72.028
        C356.818,70.562 358.381,68.632 359.368,66.238
        C360.348,63.818 360.821,60.848 360.788,57.328
        Z`,
            fill: true,
        },
    ],
    AS_IS: [
        {
            pathString: `
        M33.5,13.4
        L404.5,6.92
        C419.6,6.657 431.9,18.52 432.1,33.62
        L432.89,78.92
        C433.153,94.02 421.29,106.32 406.19,106.52
        L35.19,113
        C20.09,113.263 7.79,101.4 7.59,86.3
        L6.8,41
        C6.537,25.9 18.4,13.6 33.5,13.4
        Z`,
            stroke: true,
        },
        {
            pathString: `
        M170,87.2
        L157.8,87.404
        L154.53,76.704
        L137.53,76.988
        L134.46,87.788
        L122.56,87.987
        L138.96,34.587
        L152.56,34.359
        Z
        M151.6,67
        L145.78,48
        L140.33,67.2
        Z
        M213,69.7
        C213.05,74.933 211.173,79.233 207.37,82.6
        C203.583,85.927 198.417,87.643 191.87,87.75
        C188.077,87.813 184.76,87.488 181.92,86.774
        C179.1,86.034 176.453,85.091 173.98,83.944
        L173.858,71.244
        L175.148,71.222
        C177.615,73.442 180.361,75.132 183.388,76.292
        C186.435,77.452 189.355,78.009 192.148,77.962
        C192.868,77.95 193.811,77.863 194.978,77.7
        C196.145,77.538 197.098,77.284 197.838,76.938
        C198.738,76.495 199.471,75.948 200.038,75.298
        C200.627,74.646 200.915,73.689 200.903,72.428
        C200.892,71.262 200.452,70.268 199.583,69.448
        C198.736,68.608 197.49,67.975 195.843,67.548
        C194.116,67.101 192.286,66.691 190.353,66.318
        C188.44,65.922 186.64,65.415 184.953,64.798
        C181.08,63.412 178.28,61.495 176.553,59.048
        C174.846,56.575 173.976,53.495 173.943,49.808
        C173.896,44.862 175.766,40.795 179.553,37.608
        C183.36,34.402 188.26,32.748 194.253,32.648
        C197.266,32.598 200.246,32.893 203.193,33.534
        C206.153,34.151 208.716,34.954 210.883,35.944
        L211,48.144
        L209.74,48.166
        C207.88,46.486 205.6,45.095 202.9,43.995
        C200.22,42.875 197.487,42.339 194.7,42.386
        C193.713,42.402 192.73,42.502 191.75,42.684
        C190.79,42.843 189.86,43.144 188.96,43.587
        C188.16,43.958 187.477,44.518 186.91,45.267
        C186.342,45.994 186.063,46.821 186.072,47.747
        C186.085,49.154 186.559,50.227 187.492,50.967
        C188.425,51.687 190.175,52.337 192.742,52.917
        C194.429,53.293 196.042,53.66 197.582,54.017
        C199.142,54.372 200.819,54.869 202.612,55.508
        C206.132,56.781 208.735,58.557 210.422,60.837
        C212.129,63.091 212.999,66.051 213.032,69.718
        Z
        M267,85.5
        L240.2,85.949
        L240.11,76.529
        L247.62,76.403
        L247.292,42.103
        L239.782,42.229
        L239.692,32.809
        L266.492,32.36
        L266.582,41.78
        L259.072,41.906
        L259.4,76.206
        L266.91,76.08
        Z
        M313,68.1
        C313.05,73.333 311.173,77.633 307.37,81
        C303.583,84.327 298.417,86.043 291.87,86.15
        C288.077,86.213 284.76,85.888 281.92,85.174
        C279.1,84.434 276.453,83.491 273.98,82.344
        L273.858,69.644
        L275.148,69.622
        C277.615,71.842 280.361,73.532 283.388,74.692
        C286.435,75.852 289.355,76.409 292.148,76.362
        C292.868,76.35 293.811,76.263 294.978,76.1
        C298.738,74.895 299.471,74.348 300.038,73.698
        C300.627,73.046 300.915,72.089 300.903,70.828
        C300.892,69.662 300.452,68.668 299.583,67.848
        C298.736,67.008 297.49,66.375 295.843,65.948
        C294.116,65.501 292.286,65.091 290.353,64.718
        C288.44,64.322 286.64,63.815 284.953,63.198
        C281.08,61.812 278.28,59.895 276.553,57.448
        C274.846,54.975 273.976,51.895 273.943,48.208
        C273.896,43.262 275.766,39.195 279.553,36.008
        C283.36,32.802 288.26,31.148 294.253,31.048
        C297.266,30.998 300.246,31.293 303.193,31.934
        C306.153,32.551 308.716,33.354 310.883,34.344
        L311,46.544
        L309.74,46.565
        C307.88,44.885 305.6,43.495 302.9,42.395
        C300.22,41.275 297.487,40.739 294.7,40.785
        C293.713,40.802 292.73,40.902 291.75,41.084
        C290.79,41.243 289.86,41.544 288.96,41.987
        C288.16,42.357 287.477,42.917 286.91,43.667
        C286.342,44.394 286.063,45.221 286.072,46.147
        C286.085,47.554 286.559,48.627 287.492,49.367
        C288.425,50.087 290.175,50.737 292.742,51.317
        C294.429,51.693 296.042,52.06 297.582,52.417
        C299.142,52.772 300.819,53.269 302.612,53.907
        C306.132,55.181 308.735,56.957 310.422,59.237
        C312.129,61.491 312.999,64.451 313.032,68.117
        Z`,
            fill: true,
        },
    ],
    SOLD: [
        {
            pathString: `
        M33.5,13.4
        L404.5,6.92
        C419.6,6.657 431.9,18.52 432.1,33.62
        L432.89,78.92
        C433.153,94.02 421.29,106.32 406.19,106.52
        L35.19,113
        C20.09,113.263 7.79,101.4 7.59,86.3
        L6.8,41
        C6.537,25.9 18.4,13.6 33.5,13.4
        Z`,
            stroke: true,
        },
        {
            pathString: `
        M166,70.5
        C166.05,75.733 164.173,80.033 160.37,83.4
        C156.583,86.727 151.417,88.443 144.87,88.55
        C141.077,88.613 137.76,88.288 134.92,87.574
        C132.1,86.834 129.453,85.891 126.98,84.744
        L126.858,72.044
        L128.148,72.022
        C130.615,74.242 133.361,75.932 136.388,77.092
        C139.435,78.252 142.355,78.809 145.148,78.762
        C145.868,78.75 146.811,78.663 147.978,78.5
        C149.145,78.338 150.098,78.084 150.838,77.738
        C151.738,77.295 152.471,76.748 153.038,76.098
        C153.627,75.446 153.915,74.489 153.903,73.228
        C153.892,72.062 153.452,71.068 152.583,70.248
        C151.736,69.408 150.49,68.775 148.843,68.348
        C147.116,67.901 145.286,67.491 143.353,67.118
        C141.44,66.722 139.64,66.215 137.953,65.598
        C134.08,64.212 131.28,62.295 129.553,59.848
        C127.846,57.375 126.976,54.295 126.943,50.608
        C126.896,45.662 128.766,41.595 132.553,38.408
        C136.36,35.202 141.26,33.548 147.253,33.448
        C150.266,33.398 153.246,33.693 156.193,34.334
        C159.153,34.951 161.716,35.754 163.883,36.744
        L164,48.944
        L162.74,48.965
        C160.88,47.285 158.6,45.895 155.9,44.795
        C153.22,43.675 150.487,43.139 147.7,43.185
        C146.713,43.202 145.73,43.302 144.75,43.484
        C143.79,43.643 142.86,43.944 141.96,44.387
        C141.16,44.757 140.477,45.317 139.91,46.067
        C139.342,46.794 139.063,47.621 139.072,48.547
        C139.085,49.954 139.559,51.027 140.492,51.767
        C141.425,52.487 143.175,53.137 145.742,53.717
        C147.429,54.093 149.042,54.46 150.582,54.817
        C152.142,55.172 153.819,55.669 155.612,56.307
        C159.132,57.581 161.735,59.357 163.422,61.637
        C165.129,63.891 165.999,66.851 166.032,70.517
        Z
        M218,59.8
        C218.081,68.267 216.051,75.033 211.91,80.1
        C207.77,85.14 202.003,87.723 194.61,87.85
        C187.277,87.973 181.477,85.583 177.21,80.68
        C172.977,75.753 170.82,69.053 170.74,60.58
        C170.658,52.047 172.688,45.28 176.83,40.28
        C180.97,35.24 186.737,32.657 194.13,32.53
        C201.463,32.407 207.263,34.797 211.53,39.7
        C215.783,44.58 217.95,51.28 218.03,59.8
        Z
        M202.5,73.5
        C203.633,71.86 204.467,69.943 205,67.75
        C205.533,65.53 205.785,62.933 205.757,59.96
        C205.726,56.773 205.383,54.067 204.727,51.84
        C204.07,49.613 203.22,47.82 202.177,46.46
        C201.117,45.047 199.897,44.033 198.517,43.42
        C197.157,42.8 195.737,42.502 194.257,42.527
        C192.757,42.552 191.344,42.885 190.017,43.526
        C188.71,44.167 187.51,45.21 186.417,46.656
        C185.404,48.003 184.58,49.859 183.947,52.226
        C183.333,54.566 183.041,57.283 183.071,60.376
        C183.101,63.543 183.435,66.239 184.071,68.466
        C184.728,70.666 185.578,72.459 186.621,73.846
        C187.661,75.233 188.871,76.246 190.251,76.886
        C191.631,77.529 193.081,77.838 194.601,77.813
        C196.121,77.788 197.564,77.431 198.931,76.743
        C200.298,76.03 201.488,74.95 202.501,73.503
        Z
        M261,85.6
        L227.9,86.153
        L227.391,33.053
        L239.191,32.855
        L239.601,75.755
        L260.801,75.4
        Z
        M311,58.3
        C311.047,63.247 310.114,67.713 308.2,71.7
        C306.287,75.633 303.853,78.673 300.9,80.82
        C298.68,82.427 296.24,83.563 293.58,84.23
        L267.91,85.59
        L267.401,32.49
        L284.001,32.212
        C287.734,32.15 290.961,32.465 293.681,33.157
        C296.394,33.824 298.681,34.807 300.541,36.107
        C303.721,38.294 306.234,41.274 308.081,45.047
        C309.941,48.8 310.898,53.234 310.951,58.347
        Z
        M298.8,58.397
        C298.767,54.897 298.183,51.921 297.05,49.467
        C295.937,46.987 294.183,45.064 291.79,43.697
        C290.57,43.031 289.323,42.587 288.05,42.367
        C286.797,42.127 284.897,42.028 282.35,42.07
        L279.36,42.12
        L279.678,75.42
        L282.668,75.37
        C285.481,75.323 287.541,75.146 288.848,74.838
        C290.161,74.507 291.438,73.937 292.678,73.128
        C294.818,71.662 296.381,69.732 297.368,67.338
        C298.348,64.918 298.821,61.948 298.788,58.428
        Z`,
            fill: true,
        },
    ],
    EXPERIMENTAL: [
        {
            pathString: `
        M33.5,13.4
        L404.5,6.92
        C419.6,6.657 431.9,18.52 432.1,33.62
        L432.89,78.92
        C433.153,94.02 421.29,106.32 406.19,106.52
        L35.19,113
        C20.09,113.263 7.79,101.4 7.59,86.3
        L6.8,41
        C6.537,25.9 18.4,13.6 33.5,13.4
        Z`,
            stroke: true,
        },
        {
            pathString: `
        M55.9,86.5
        L32.9,86.873
        L32.766,40.073
        L55.766,39.7
        L55.792,48.76
        L40.992,49.001
        L41.015,57.081
        L54.815,56.857
        L54.841,65.917
        L41.041,66.141
        L41.074,77.741
        L55.874,77.5
        Z
        M91.6,85.9
        L82.12,86.054
        L75.22,70.754
        L68.28,86.254
        L59.23,86.401
        L70.43,62.601
        L59.33,39.501
        L68.79,39.347
        L75.45,53.847
        L82.22,39.147
        L91.3,39
        L80.3,61.9
        Z
        M122,53.4
        C122,55.493 121.757,57.553 121.27,59.58
        C120.777,61.58 120.071,63.27 119.15,64.65
        C117.89,66.517 116.477,67.933 114.91,68.9
        C113.363,69.867 111.43,70.37 109.11,70.41
        L104.01,70.493
        L104.054,85.793
        L95.854,85.926
        L95.72,39.126
        L109.22,38.907
        C111.24,38.874 112.943,39.108 114.33,39.61
        C115.723,40.091 116.956,40.837 118.03,41.85
        C119.316,43.063 120.296,44.63 120.97,46.55
        C121.656,48.47 122.003,50.78 122.01,53.48
        Z
        M113.52,53.821
        C113.52,52.501 113.275,51.374 112.784,50.441
        C112.297,49.488 111.734,48.824 111.094,48.451
        C110.241,47.962 109.407,47.703 108.594,47.674
        C107.781,47.624 106.697,47.61 105.344,47.632
        L103.934,47.655
        L103.974,61.655
        L106.324,61.617
        C107.717,61.595 108.864,61.45 109.764,61.184
        C110.677,60.918 111.437,60.401 112.044,59.634
        C112.569,58.954 112.945,58.151 113.174,57.224
        C113.413,56.278 113.531,55.134 113.527,53.794
        Z
        M151,84.9
        L128,85.273
        L127.866,38.473
        L150.866,38.1
        L150.892,47.16
        L136.092,47.401
        L136.115,55.481
        L149.915,55.257
        L149.941,64.317
        L136.141,64.541
        L136.174,76.141
        L150.974,75.9
        Z
        M176,52.1
        C176,50.927 175.833,49.923 175.5,49.09
        C175.17,48.257 174.607,47.607 173.81,47.14
        C173.254,46.813 172.604,46.625 171.86,46.574
        C171.12,46.502 170.26,46.474 169.28,46.49
        L166.31,46.538
        L166.346,59.138
        L168.866,59.098
        C170.173,59.076 171.269,58.964 172.156,58.762
        C173.036,58.558 173.776,58.115 174.376,57.432
        C174.943,56.772 175.353,56.052 175.606,55.272
        C175.874,54.471 176.006,53.411 176.003,52.092
        Z
        M188.9,84.4
        L178.9,84.563
        L170.18,67.563
        L166.4,67.624
        L166.449,84.824
        L158.289,84.956
        L158.155,38.156
        L171.955,37.933
        C173.835,37.903 175.452,38.034 176.805,38.326
        C178.158,38.619 179.428,39.279 180.615,40.306
        C181.815,41.333 182.765,42.68 183.465,44.346
        C184.178,45.993 184.542,48.073 184.555,50.586
        C184.565,54.046 184.025,56.876 182.935,59.076
        C181.862,61.276 180.315,63.116 178.295,64.596
        Z
        M210,84
        L191.4,84.302
        L191.376,76.002
        L196.586,75.917
        L196.5,45.717
        L191.29,45.802
        L191.266,37.502
        L209.866,37.2
        L209.89,45.5
        L204.68,45.585
        L204.766,75.785
        L209.976,75.7
        Z
        M250,83.3
        L241.84,83.432
        L241.75,52.032
        L235.91,72.432
        L230.25,72.524
        L224.3,52.224
        L224.39,83.624
        L216.66,83.75
        L216.526,36.95
        L226.046,36.795
        L233.266,60.195
        L240.336,36.595
        L249.856,36.44
        Z
        M281,82.8
        L258,83.173
        L257.866,36.373
        L280.866,36
        L280.892,45.06
        L266.092,45.301
        L266.115,53.381
        L279.915,53.157
        L279.941,62.217
        L266.141,62.441
        L266.174,74.041
        L280.974,73.8
        Z
        M316,82.3
        L308.1,82.428
        L294.5,50.528
        L294.592,82.628
        L287.072,82.75
        L286.938,35.95
        L296.738,35.791
        L308.438,62.391
        L308.361,35.591
        L315.881,35.469
        Z
        M349,44
        L339.07,44.161
        L339.178,81.961
        L330.978,82.094
        L330.87,44.294
        L320.94,44.455
        L320.914,35.395
        L349.014,34.939
        Z
        M384,81.2
        L375.52,81.338
        L373.29,71.908
        L361.49,72.099
        L359.32,81.599
        L351.06,81.733
        L362.66,34.733
        L372.1,34.58
        Z
        M371.3,63.4
        L367.34,46.7
        L363.48,63.6
        Z
        M411,80.7
        L388.1,81.072
        L387.966,34.272
        L396.166,34.139
        L396.274,71.939
        L410.974,71.7
        Z`,
            fill: true,
        },
    ],
    FOR_COMMENT: [
        {
            pathString: `
        M33.5,13.4
        L404.5,6.92
        C419.6,6.657 431.9,18.52 432.1,33.62
        L432.89,78.92
        C433.153,94.02 421.29,106.32 406.19,106.52
        L35.19,113
        C20.09,113.263 7.79,101.4 7.59,86.3
        L6.8,41
        C6.537,25.9 18.4,13.6 33.5,13.4
        Z`,
            stroke: true,
        },
        {
            pathString: `
        M61.6,49.9
        L46.8,50.184
        L46.866,58.134
        L60.566,57.871
        L60.635,66.141
        L46.935,66.404
        L47.087,84.704
        L38.837,84.862
        L38.48,42.162
        L61.48,41.72
        Z
        M98.7,62.3
        C98.757,69.1 97.334,74.533 94.43,78.6
        C91.523,82.653 87.49,84.73 82.33,84.83
        C77.163,84.929 73.097,83.006 70.13,79.06
        C67.157,75.1 65.643,69.7 65.59,62.86
        C65.533,55.993 66.956,50.527 69.86,46.46
        C72.767,42.407 76.8,40.33 81.96,40.23
        C87.113,40.131 91.18,42.055 94.16,46
        C97.147,49.927 98.667,55.327 98.72,62.2
        Z
        M87.8,73.3
        C88.593,71.98 89.177,70.437 89.55,68.67
        C89.924,66.883 90.101,64.793 90.081,62.4
        C90.06,59.833 89.818,57.657 89.357,55.87
        C88.896,54.077 88.299,52.633 87.567,51.54
        C86.82,50.407 85.964,49.59 84.997,49.09
        C84.044,48.591 83.047,48.352 82.007,48.372
        C80.954,48.392 79.964,48.66 79.037,49.176
        C78.117,49.691 77.274,50.531 76.507,51.696
        C75.794,52.783 75.217,54.276 74.777,56.176
        C74.346,58.063 74.141,60.249 74.162,62.736
        C74.183,65.283 74.417,67.449 74.864,69.236
        C75.325,71.009 75.922,72.453 76.654,73.566
        C80.171,76.533 81.187,76.782 82.254,76.761
        C83.321,76.741 84.334,76.453 85.294,75.899
        C86.254,75.326 87.091,74.459 87.804,73.299
        Z
        M123,53.6
        C122.991,52.527 122.818,51.61 122.48,50.85
        C122.143,50.09 121.569,49.497 120.76,49.07
        C120.196,48.775 119.539,48.605 118.79,48.562
        C118.043,48.5 117.173,48.478 116.18,48.497
        L113.18,48.555
        L113.276,60.055
        L115.826,60.006
        C117.153,59.981 118.259,59.873 119.146,59.684
        C120.039,59.495 120.786,59.088 121.386,58.464
        C121.957,57.86 122.37,57.2 122.626,56.484
        C122.893,55.751 123.022,54.781 123.012,53.574
        Z
        M136.2,83
        L126.1,83.194
        L117.2,67.694
        L113.38,67.767
        L113.511,83.467
        L105.261,83.625
        L104.904,40.925
        L118.804,40.658
        C120.704,40.622 122.341,40.734 123.714,40.995
        C125.087,41.256 126.374,41.853 127.574,42.785
        C128.794,43.719 129.761,44.945 130.474,46.465
        C131.207,47.965 131.584,49.862 131.604,52.155
        C131.63,55.315 131.097,57.899 130.004,59.905
        C128.924,61.919 127.367,63.605 125.334,64.965
        Z
        M169,83.2
        C166.607,83.246 164.393,82.819 162.36,81.92
        C160.333,81.02 158.587,79.657 157.12,77.83
        C155.653,76.003 154.503,73.71 153.67,70.95
        C152.857,68.19 152.433,64.993 152.4,61.36
        C152.372,57.973 152.728,54.893 153.47,52.12
        C154.21,49.347 155.3,46.963 156.74,44.97
        C158.12,43.05 159.837,41.553 161.89,40.48
        C163.957,39.407 166.213,38.847 168.66,38.8
        C170.013,38.774 171.23,38.856 172.31,39.046
        C173.403,39.217 174.413,39.456 175.34,39.763
        C176.307,40.108 177.18,40.502 177.96,40.943
        C178.753,41.368 179.447,41.764 180.04,42.133
        L180.127,52.533
        L179.177,52.551
        C178.77,52.1 178.253,51.563 177.627,50.941
        C177.017,50.321 176.32,49.711 175.537,49.111
        C174.737,48.514 173.877,48.014 172.957,47.611
        C168.83,47.059 167.723,47.329 166.677,47.846
        C165.63,48.345 164.663,49.168 163.777,50.316
        C162.937,51.423 162.257,52.88 161.737,54.686
        C161.233,56.493 160.992,58.68 161.014,61.246
        C161.036,63.926 161.335,66.16 161.912,67.946
        C162.502,69.733 163.236,71.136 164.112,72.156
        C164.998,73.19 165.985,73.926 167.072,74.366
        C168.158,74.786 169.225,74.985 170.272,74.965
        C171.278,74.946 172.271,74.726 173.251,74.305
        C174.245,73.885 175.155,73.321 175.981,72.615
        C176.681,72.047 177.332,71.44 177.931,70.795
        C178.531,70.152 179.024,69.599 179.411,69.135
        L180.275,69.119
        L180.361,79.319
        C179.561,79.813 178.794,80.276 178.061,80.709
        C177.327,81.144 176.561,81.524 175.761,81.849
        C174.714,82.271 173.731,82.596 172.811,82.824
        C171.891,83.052 170.624,83.181 169.011,83.213
        Z
        M218,60
        C218.057,66.8 216.634,72.233 213.73,76.3
        C210.823,80.353 206.79,82.43 201.63,82.53
        C196.463,82.629 192.397,80.706 189.43,76.76
        C186.457,72.8 184.943,67.4 184.89,60.56
        C184.833,53.693 186.256,48.227 189.16,44.16
        C192.067,40.107 196.1,38.03 201.26,37.93
        C206.413,37.831 210.48,39.755 213.46,43.7
        C216.447,47.627 217.967,53.027 218.02,59.9
        Z
        M207.1,71
        C207.893,69.68 208.477,68.137 208.85,66.37
        C209.224,64.583 209.401,62.493 209.381,60.1
        C209.36,57.533 209.118,55.357 208.657,53.57
        C208.196,51.777 207.599,50.333 206.867,49.24
        C206.12,48.107 205.264,47.29 204.297,46.79
        C203.344,46.291 202.347,46.052 201.307,46.072
        C200.254,46.092 199.264,46.36 198.337,46.876
        C197.417,47.391 196.574,48.231 195.807,49.396
        C195.094,50.483 194.517,51.976 194.077,53.876
        C193.646,55.763 193.441,57.949 193.462,60.436
        C193.483,62.983 193.717,65.149 194.164,66.936
        C194.625,68.709 195.222,70.153 195.954,71.266
        C199.471,74.233 200.487,74.482 201.554,74.461
        C202.621,74.441 203.634,74.153 204.594,73.599
        C205.554,73.026 206.391,72.159 207.104,70.999
        Z
        M258,80.6
        L249.75,80.758
        L249.511,52.158
        L243.701,70.858
        L237.981,70.968
        L231.861,52.468
        L232.1,81.068
        L224.28,81.218
        L223.923,38.518
        L233.553,38.333
        L240.963,59.633
        L247.993,38.033
        L257.623,37.848
        Z
        M300,79.8
        L291.75,79.958
        L291.511,51.358
        L285.701,70.058
        L279.981,70.168
        L273.861,51.668
        L274.1,80.268
        L266.28,80.418
        L265.923,37.718
        L275.553,37.533
        L282.963,58.833
        L289.993,37.233
        L299.623,37.048
        Z
        M332,79.2
        L308.7,79.646
        L308.343,36.946
        L331.643,36.5
        L331.712,44.77
        L316.712,45.058
        L316.774,52.438
        L330.674,52.171
        L330.743,60.441
        L316.843,60.708
        L316.931,71.308
        L331.931,71.02
        Z
        M368,78.5
        L360.01,78.653
        L346.11,49.553
        L346.355,78.853
        L338.755,78.999
        L338.398,36.299
        L348.308,36.109
        L360.208,60.409
        L360.004,35.909
        L367.604,35.763
        Z
        M401,43.4
        L391,43.593
        L391.288,78.093
        L382.998,78.252
        L382.71,43.752
        L372.71,43.945
        L372.641,35.675
        L401.041,35.131
        Z`,
            fill: true,
        },
    ],
    TOP_SECRET: [
        {
            pathString: `
        M33.5,13.4
        L404.5,6.92
        C419.6,6.657 431.9,18.52 432.1,33.62
        L432.89,78.92
        C433.153,94.02 421.29,106.32 406.19,106.52
        L35.19,113
        C20.09,113.263 7.79,101.4 7.59,86.3
        L6.8,41
        C6.537,25.9 18.4,13.6 33.5,13.4
        Z`,
            stroke: true,
        },
        {
            pathString: `
        M67.5,47.4
        L55,47.623
        L55.357,87.423
        L45.057,87.607
        L44.7,47.807
        L32.2,48.03
        L32.114,38.48
        L67.314,37.851
        Z
        M113,61.7
        C113.071,69.567 111.304,75.867 107.7,80.6
        C104.093,85.287 99.06,87.687 92.6,87.8
        C86.187,87.915 81.12,85.695 77.4,81.14
        C73.713,76.56 71.833,70.327 71.76,62.44
        C71.689,54.507 73.455,48.207 77.06,43.54
        C80.667,38.853 85.667,36.453 92.06,36.34
        C98.453,36.226 103.52,38.446 107.26,43
        C110.967,47.533 112.853,53.767 112.92,61.7
        Z
        M99.5,74.4
        C100.487,72.88 101.213,71.097 101.68,69.05
        C102.144,66.983 102.364,64.57 102.339,61.81
        C102.312,58.85 102.013,56.333 101.44,54.26
        C100.867,52.193 100.127,50.527 99.22,49.26
        C98.3,47.947 97.237,47.003 96.03,46.43
        C94.843,45.854 93.607,45.577 92.32,45.6
        C91.013,45.623 89.783,45.933 88.63,46.528
        C87.49,47.123 86.443,48.093 85.49,49.438
        C84.61,50.691 83.893,52.418 83.34,54.618
        C82.805,56.798 82.551,59.325 82.577,62.198
        C82.603,65.138 82.894,67.645 83.449,69.718
        C84.022,71.765 84.762,73.431 85.669,74.718
        C86.576,76.005 87.629,76.948 88.829,77.548
        C90.029,78.146 91.292,78.433 92.619,78.409
        C93.939,78.385 95.196,78.053 96.389,77.413
        C97.582,76.75 98.619,75.747 99.499,74.403
        Z
        M153,51.9
        C153.02,54.113 152.726,56.287 152.12,58.42
        C151.513,60.533 150.637,62.317 149.49,63.77
        C147.917,65.743 146.153,67.247 144.2,68.28
        C142.26,69.307 139.833,69.847 136.92,69.9
        L130.51,70.014
        L130.654,86.114
        L120.354,86.298
        L119.911,36.898
        L136.811,36.596
        C139.351,36.551 141.488,36.789 143.221,37.311
        C144.974,37.81 146.528,38.59 147.881,39.651
        C149.501,40.924 150.741,42.571 151.601,44.591
        C152.474,46.611 152.924,49.048 152.951,51.901
        Z
        M142.4,52.388
        C142.388,50.995 142.073,49.805 141.457,48.818
        C140.84,47.811 140.127,47.115 139.317,46.728
        C138.237,46.217 137.19,45.948 136.177,45.922
        C135.157,45.874 133.8,45.865 132.107,45.895
        L130.337,45.927
        L130.47,60.727
        L133.42,60.674
        C135.173,60.643 136.61,60.485 137.73,60.199
        C138.87,59.913 139.82,59.367 140.58,58.559
        C141.235,57.839 141.701,56.989 141.98,56.009
        C142.275,55.009 142.416,53.803 142.403,52.389
        Z
        M211,69.1
        C211.044,73.967 209.407,77.967 206.09,81.1
        C202.797,84.187 198.297,85.783 192.59,85.89
        C189.283,85.949 186.393,85.647 183.92,84.983
        C181.467,84.296 179.163,83.42 177.01,82.353
        L176.904,70.553
        L178.034,70.533
        C180.181,72.593 182.571,74.166 185.204,75.253
        C187.857,76.333 190.401,76.853 192.834,76.813
        C193.459,76.802 194.279,76.721 195.294,76.57
        C196.314,76.419 197.144,76.183 197.784,75.862
        C198.564,75.45 199.204,74.94 199.704,74.332
        C200.217,73.726 200.468,72.836 200.457,71.662
        C200.447,70.575 200.064,69.652 199.307,68.892
        C198.567,68.112 197.48,67.522 196.047,67.122
        C194.54,66.707 192.947,66.327 191.267,65.982
        C189.6,65.613 188.034,65.143 186.567,64.572
        C183.194,63.285 180.757,61.505 179.257,59.232
        C177.77,56.939 177.01,54.079 176.977,50.652
        C176.936,46.052 178.562,42.285 181.857,39.352
        C185.17,36.372 189.437,34.835 194.657,34.742
        C197.284,34.695 199.877,34.969 202.437,35.565
        C205.017,36.138 207.247,36.885 209.127,37.805
        L209.229,49.205
        L208.129,49.225
        C206.509,47.658 204.522,46.368 202.169,45.355
        C199.836,44.315 197.456,43.815 195.029,43.855
        C194.169,43.87 193.312,43.963 192.459,44.133
        C191.619,44.281 190.809,44.561 190.029,44.973
        C189.336,45.317 188.742,45.837 188.249,46.533
        C187.754,47.206 187.511,47.973 187.519,48.833
        C187.531,50.139 187.941,51.139 188.749,51.833
        C189.562,52.506 191.086,53.109 193.319,53.643
        C194.786,53.993 196.192,54.333 197.539,54.663
        C198.899,54.992 200.359,55.452 201.919,56.043
        C204.986,57.229 207.252,58.879 208.719,60.993
        C210.206,63.086 210.962,65.836 210.989,69.243
        Z
        M248,84
        L219.1,84.515
        L218.657,35.115
        L247.557,34.6
        L247.643,44.15
        L229.043,44.483
        L229.119,53.003
        L246.419,52.694
        L246.505,62.244
        L229.205,62.553
        L229.314,74.753
        L247.914,74.42
        Z
        M274,84.5
        C271.033,84.553 268.287,84.06 265.76,83.02
        C263.247,81.98 261.08,80.403 259.26,78.29
        C257.433,76.177 256.007,73.527 254.98,70.34
        C253.967,67.153 253.443,63.453 253.41,59.24
        C253.375,55.327 253.815,51.76 254.73,48.54
        C255.65,45.34 257,42.583 258.78,40.27
        C260.493,38.05 262.623,36.32 265.17,35.08
        C267.73,33.84 270.53,33.193 273.57,33.14
        C275.25,33.11 276.76,33.205 278.1,33.424
        C279.46,33.621 280.713,33.897 281.86,34.253
        C283.06,34.652 284.147,35.108 285.12,35.623
        C286.107,36.114 286.97,36.574 287.71,37.003
        L287.817,49.003
        L286.637,49.024
        C286.132,48.502 285.492,47.882 284.717,47.164
        C283.957,46.451 283.094,45.747 282.127,45.054
        C281.14,44.361 280.07,43.784 278.917,43.324
        C277.77,42.858 276.544,42.637 275.237,42.66
        C273.79,42.686 272.417,42.998 271.117,43.596
        C269.817,44.172 268.62,45.122 267.527,46.446
        C266.487,47.726 265.644,49.409 264.997,51.496
        C264.372,53.589 264.073,56.116 264.1,59.076
        C264.128,62.169 264.498,64.749 265.21,66.816
        C265.943,68.883 266.85,70.503 267.93,71.676
        C269.03,72.876 270.253,73.729 271.6,74.236
        C272.947,74.721 274.27,74.951 275.57,74.928
        C276.823,74.906 278.053,74.651 279.26,74.165
        C280.487,73.678 281.617,73.028 282.65,72.215
        C283.517,71.558 284.323,70.858 285.07,70.115
        C285.817,69.375 286.427,68.735 286.9,68.195
        L287.97,68.176
        L288.076,79.976
        C287.083,80.547 286.133,81.083 285.226,81.586
        C284.319,82.089 283.366,82.525 282.366,82.896
        C281.066,83.383 279.846,83.76 278.706,84.026
        C277.566,84.289 275.996,84.439 273.996,84.475
        Z
        M318,48.5
        C317.989,47.26 317.774,46.203 317.355,45.33
        C316.936,44.45 316.223,43.767 315.215,43.28
        C314.515,42.939 313.702,42.743 312.775,42.693
        C311.848,42.621 310.768,42.596 309.535,42.618
        L305.805,42.685
        L305.924,55.985
        L309.084,55.928
        C310.731,55.899 312.104,55.775 313.204,55.556
        C314.311,55.338 315.237,54.868 315.984,54.146
        C316.691,53.446 317.201,52.686 317.514,51.866
        C317.846,51.02 318.006,49.9 317.993,48.506
        Z
        M334.4,82.5
        L321.8,82.724
        L310.8,64.824
        L306.06,64.909
        L306.222,83.009
        L296.022,83.192
        L295.579,33.792
        L312.879,33.484
        C315.239,33.442 317.269,33.571 318.969,33.873
        C320.669,34.174 322.266,34.864 323.759,35.943
        C325.272,37.023 326.472,38.439 327.359,40.193
        C328.266,41.926 328.732,44.119 328.759,46.773
        C328.792,50.419 328.132,53.406 326.779,55.733
        C325.439,58.059 323.509,60.006 320.989,61.573
        Z
        M368,81.9
        L339.1,82.415
        L338.657,33.015
        L367.557,32.5
        L367.643,42.05
        L349.043,42.383
        L349.119,50.903
        L366.419,50.594
        L366.505,60.144
        L349.205,60.453
        L349.314,72.653
        L367.914,72.32
        Z
        M407,41.3
        L394.5,41.523
        L394.857,81.323
        L384.557,81.507
        L384.2,41.707
        L371.7,41.93
        L371.614,32.38
        L406.814,31.751
        Z`,
            fill: true,
        },
    ],
    FOR_PUBLIC_RELEASE: [
        {
            pathString: `
        M33.5,13.4
        L404.5,6.92
        C419.6,6.657 431.9,18.52 432.1,33.62
        L432.89,78.92
        C433.153,94.02 421.29,106.32 406.19,106.52
        L35.19,113
        C20.09,113.263 7.79,101.4 7.59,86.3
        L6.8,41
        C6.537,25.9 18.4,13.6 33.5,13.4
        Z`,
            stroke: true,
        },
        {
            pathString: `
        M93.2,32.1
        L78.5,32.323
        L78.566,38.583
        L92.166,38.376
        L92.234,44.886
        L78.634,45.093
        L78.785,59.493
        L70.605,59.618
        L70.251,25.918
        L93.151,25.57
        Z
        M130,41.8
        C130.056,47.167 128.646,51.467 125.77,54.7
        C122.89,57.893 118.89,59.53 113.77,59.61
        C108.643,59.688 104.61,58.175 101.67,55.07
        C98.723,51.95 97.223,47.717 97.17,42.37
        C97.113,36.957 98.523,32.657 101.4,29.47
        C104.28,26.277 108.28,24.64 113.4,24.56
        C118.513,24.482 122.547,25.995 125.5,29.1
        C128.46,32.187 129.97,36.453 130.03,41.9
        Z
        M119.2,50.49
        C119.987,49.45 120.567,48.237 120.94,46.85
        C121.311,45.443 121.486,43.797 121.466,41.91
        C121.445,39.89 121.205,38.177 120.748,36.77
        C120.291,35.363 119.701,34.227 118.978,33.36
        C118.238,32.467 117.388,31.823 116.428,31.43
        C115.481,31.037 114.495,30.849 113.468,30.865
        C112.428,30.881 111.445,31.092 110.518,31.498
        C109.611,31.904 108.775,32.564 108.008,33.478
        C107.301,34.331 106.728,35.508 106.288,37.008
        C105.861,38.495 105.657,40.215 105.678,42.168
        C105.699,44.175 105.931,45.881 106.375,47.288
        C106.832,48.681 107.422,49.818 108.145,50.698
        C108.865,51.578 109.708,52.221 110.675,52.628
        C111.635,53.035 112.645,53.231 113.705,53.215
        C114.758,53.199 115.762,52.973 116.715,52.536
        C117.668,52.085 118.495,51.401 119.195,50.486
        Z
        M154,34.9
        C153.991,34.053 153.819,33.333 153.485,32.74
        C153.15,32.142 152.58,31.675 151.775,31.34
        C151.216,31.107 150.566,30.974 149.825,30.94
        C149.085,30.891 148.222,30.874 147.235,30.889
        L144.255,30.934
        L144.35,39.994
        L146.88,39.956
        C148.194,39.936 149.294,39.851 150.18,39.702
        C151.067,39.552 151.807,39.232 152.4,38.741
        C152.966,38.265 153.376,37.745 153.63,37.181
        C153.896,36.604 154.023,35.841 154.013,34.891
        Z
        M167.1,58.1
        L157.1,58.253
        L148.27,46.053
        L144.48,46.111
        L144.61,58.411
        L136.43,58.536
        L136.076,24.836
        L149.876,24.626
        C151.763,24.597 153.386,24.685 154.746,24.891
        C156.106,25.096 157.383,25.566 158.576,26.301
        C159.783,27.034 160.743,28.001 161.456,29.201
        C162.183,30.381 162.556,31.874 162.576,33.681
        C162.602,36.167 162.072,38.204 160.986,39.791
        C159.919,41.377 158.376,42.704 156.356,43.771
        Z
        M212,34.4
        C212.016,35.907 211.782,37.387 211.297,38.84
        C210.812,40.28 210.112,41.497 209.197,42.49
        C207.937,43.837 206.527,44.86 204.967,45.56
        C203.42,46.26 201.48,46.63 199.147,46.67
        L194.027,46.748
        L194.142,57.748
        L185.922,57.873
        L185.568,24.173
        L199.068,23.967
        C201.095,23.936 202.801,24.098 204.188,24.454
        C205.588,24.795 206.828,25.325 207.908,26.044
        C209.201,26.911 210.191,28.034 210.878,29.414
        C211.578,30.787 211.938,32.447 211.958,34.394
        Z
        M203.5,34.733
        C203.49,33.786 203.239,32.976 202.746,32.303
        C202.253,31.616 201.683,31.143 201.036,30.883
        C200.176,30.534 199.339,30.351 198.526,30.333
        C197.713,30.3 196.626,30.294 195.266,30.315
        L193.856,30.336
        L193.962,40.436
        L196.322,40.4
        C197.722,40.379 198.872,40.271 199.772,40.076
        C200.685,39.882 201.445,39.508 202.052,38.956
        C202.575,38.466 202.949,37.886 203.172,37.216
        C203.407,36.536 203.52,35.713 203.51,34.746
        Z
        M246,44.7
        C246.044,48.86 244.877,52.067 242.5,54.32
        C240.127,56.573 236.593,57.733 231.9,57.8
        C227.233,57.871 223.7,56.818 221.3,54.64
        C218.893,52.46 217.667,49.3 217.62,45.16
        L217.394,23.66
        L225.664,23.534
        L225.885,44.534
        C225.91,46.867 226.393,48.601 227.335,49.734
        C228.275,50.867 229.788,51.417 231.875,51.384
        C233.928,51.353 235.422,50.779 236.355,49.664
        C237.302,48.551 237.762,46.781 237.735,44.354
        L237.514,23.354
        L245.784,23.228
        Z
        M281,46.1
        C281.017,47.727 280.718,49.187 280.103,50.48
        C279.502,51.773 278.662,52.85 277.583,53.71
        C276.336,54.723 274.96,55.453 273.453,55.9
        C271.96,56.345 270.056,56.585 267.743,56.62
        L253.843,56.832
        L253.489,23.132
        L265.889,22.944
        C268.462,22.905 270.342,22.967 271.529,23.129
        C272.729,23.292 273.919,23.672 275.099,24.269
        C276.319,24.898 277.229,25.758 277.829,26.849
        C278.44,27.922 278.753,29.162 278.768,30.569
        C278.785,32.196 278.392,33.642 277.588,34.909
        C276.788,36.156 275.648,36.156 274.168,34.909
        C276.255,35.314 277.915,36.194 279.148,37.549
        C280.388,38.902 281.021,40.702 281.048,42.949
        Z
        M270.3,32.4
        C270.3,31.843 270.158,31.286 269.875,30.73
        C269.612,30.176 269.142,29.769 268.465,29.51
        C267.863,29.278 267.113,29.161 266.215,29.16
        C265.328,29.143 264.078,29.147 262.465,29.172
        L261.694,29.184
        L261.769,36.304
        L263.059,36.284
        C264.359,36.264 265.466,36.225 266.379,36.166
        C267.292,36.107 268.012,35.945 268.539,35.681
        C269.279,35.323 269.759,34.87 269.979,34.321
        C270.202,33.76 270.309,33.116 270.301,32.391
        Z
        M272.46,46.1
        C272.449,45.033 272.24,44.217 271.834,43.65
        C271.442,43.068 270.772,42.641 269.824,42.37
        C269.179,42.184 268.293,42.092 267.164,42.094
        C266.037,42.096 264.861,42.107 263.634,42.125
        L261.834,42.153
        L261.922,50.543
        L262.522,50.534
        C264.836,50.498 266.492,50.466 267.492,50.435
        C268.492,50.405 269.412,50.195 270.252,49.805
        C271.106,49.415 271.686,48.909 271.992,48.285
        C272.314,47.647 272.471,46.921 272.462,46.105
        Z
        M310,55.9
        L287,56.25
        L286.646,22.55
        L294.866,22.425
        L295.152,49.525
        L309.952,49.3
        Z
        M332,55.6
        L313.3,55.884
        L313.237,49.914
        L318.467,49.834
        L318.239,28.134
        L313.009,28.214
        L312.946,22.244
        L331.646,21.96
        L331.709,27.93
        L326.479,28.01
        L326.707,49.71
        L331.937,49.63
        Z
        M353,55.9
        C350.627,55.936 348.43,55.599 346.41,54.89
        C344.403,54.183 342.67,53.11 341.21,51.67
        C339.75,50.23 338.61,48.423 337.79,46.25
        C336.983,44.077 336.563,41.56 336.53,38.7
        C336.502,36.033 336.855,33.61 337.59,31.43
        C338.323,29.25 339.403,27.373 340.83,25.8
        C342.197,24.287 343.897,23.107 345.93,22.26
        C347.977,21.413 350.213,20.973 352.64,20.94
        C353.98,20.92 355.187,20.984 356.26,21.134
        C357.347,21.268 358.347,21.456 359.26,21.699
        C360.22,21.971 361.087,22.282 361.86,22.632
        C362.647,22.967 363.337,23.28 363.93,23.573
        L364.016,31.733
        L363.074,31.747
        C362.67,31.392 362.16,30.969 361.544,30.477
        C360.939,29.989 360.249,29.509 359.474,29.037
        C358.68,28.567 357.827,28.174 356.914,27.857
        C355.994,27.54 355.014,27.389 353.974,27.404
        C352.82,27.422 351.724,27.635 350.684,28.042
        C349.644,28.435 348.687,29.082 347.814,29.982
        C346.98,30.856 346.307,32.002 345.794,33.422
        C345.294,34.849 345.055,36.572 345.077,38.592
        C345.099,40.699 345.396,42.459 345.968,43.872
        C346.554,45.279 347.28,46.382 348.148,47.182
        C349.028,47.996 350.004,48.576 351.078,48.922
        C352.151,49.252 353.211,49.41 354.258,49.394
        C355.258,49.379 356.241,49.206 357.208,48.874
        C358.188,48.543 359.091,48.1 359.918,47.544
        C360.611,47.096 361.254,46.62 361.848,46.114
        C362.442,45.608 362.929,45.171 363.308,44.804
        L364.165,44.791
        L364.249,52.841
        C363.456,53.23 362.696,53.597 361.969,53.941
        C361.243,54.284 360.483,54.582 359.689,54.835
        C358.649,55.168 357.673,55.424 356.759,55.603
        C355.846,55.783 354.589,55.885 352.989,55.909
        Z
        M130,74.7
        C129.991,73.853 129.819,73.133 129.485,72.54
        C129.15,71.942 128.58,71.475 127.775,71.14
        C127.216,70.907 126.566,70.774 125.825,70.74
        C125.085,70.691 124.222,70.674 123.235,70.689
        L120.255,70.734
        L120.35,79.794
        L122.88,79.756
        C124.194,79.736 125.294,79.651 126.18,79.502
        C127.067,79.352 127.807,79.032 128.4,78.541
        C128.966,78.065 129.376,77.545 129.63,76.981
        C129.896,76.404 130.023,75.641 130.013,74.691
        Z
        M143.1,97.9
        L133.1,98.053
        L124.27,85.853
        L120.48,85.911
        L120.61,98.211
        L112.43,98.336
        L112.076,64.636
        L125.876,64.426
        C127.763,64.397 129.386,64.485 130.746,64.691
        C132.106,64.896 133.383,65.366 134.576,66.101
        C135.783,66.834 136.743,67.801 137.456,69.001
        C138.183,70.181 138.556,71.674 138.576,73.481
        C138.602,75.967 138.072,78.004 136.986,79.591
        C135.919,81.177 134.376,82.504 132.356,83.571
        Z
        M170,97.4
        L146.9,97.751
        L146.546,64.051
        L169.646,63.7
        L169.714,70.21
        L154.814,70.437
        L154.876,76.247
        L168.676,76.037
        L168.744,82.547
        L154.944,82.757
        L155.032,91.077
        L169.932,90.85
        Z
        M200,97
        L177,97.35
        L176.646,63.65
        L184.866,63.525
        L185.152,90.625
        L199.952,90.4
        Z
        M228,96.5
        L204.9,96.851
        L204.546,63.151
        L227.646,62.8
        L227.714,69.31
        L212.814,69.537
        L212.876,75.347
        L226.676,75.137
        L226.744,81.647
        L212.944,81.857
        L213.032,90.177
        L227.932,89.95
        Z
        M264,96
        L255.5,96.129
        L253.22,89.359
        L241.42,89.539
        L239.29,96.379
        L231,96.505
        L242.4,62.705
        L251.87,62.561
        Z
        M251.2,83.2
        L247.15,71.2
        L243.36,83.3
        Z
        M294,84.9
        C294.035,88.213 292.728,90.93 290.08,93.05
        C287.447,95.157 283.847,96.243 279.28,96.31
        C276.64,96.35 274.33,96.144 272.35,95.692
        C270.39,95.225 268.55,94.628 266.83,93.902
        L266.745,85.832
        L267.645,85.818
        C269.358,87.225 271.268,88.295 273.375,89.028
        C275.495,89.762 277.525,90.115 279.465,90.088
        C279.965,90.081 280.622,90.025 281.435,89.922
        C282.248,89.82 282.912,89.659 283.425,89.44
        C284.05,89.16 284.56,88.813 284.955,88.4
        C285.365,87.987 285.566,87.38 285.557,86.58
        C285.549,85.84 285.243,85.21 284.637,84.69
        C284.046,84.157 283.179,83.757 282.037,83.49
        C280.837,83.207 279.564,82.948 278.217,82.712
        C276.884,82.461 275.63,82.141 274.457,81.752
        C271.764,80.872 269.817,79.659 268.617,78.112
        C267.43,76.546 266.824,74.596 266.797,72.262
        C266.764,69.129 268.064,66.556 270.697,64.542
        C273.344,62.516 276.744,61.469 280.897,61.402
        C282.997,61.37 285.07,61.557 287.117,61.963
        C289.177,62.354 290.96,62.861 292.467,63.483
        L292.549,71.233
        L291.671,71.247
        C290.377,70.18 288.791,69.3 286.911,68.607
        C285.044,67.893 283.141,67.553 281.201,67.587
        C280.514,67.597 279.831,67.66 279.151,67.777
        C278.477,67.877 277.831,68.068 277.211,68.349
        C276.656,68.583 276.183,68.937 275.791,69.409
        C275.395,69.867 275.201,70.39 275.208,70.979
        C275.217,71.865 275.545,72.545 276.193,73.019
        C276.84,73.476 278.057,73.886 279.843,74.249
        C281.016,74.487 282.139,74.719 283.213,74.944
        C284.299,75.168 285.466,75.482 286.713,75.885
        C289.166,76.691 290.976,77.818 292.143,79.265
        C293.329,80.691 293.936,82.565 293.963,84.885
        Z
        M323,95.1
        L299.9,95.451
        L299.546,61.751
        L322.646,61.4
        L322.714,67.91
        L307.815,68.137
        L307.876,73.947
        L321.676,73.737
        L321.744,80.247
        L307.944,80.457
        L308.032,88.777
        L322.932,88.55
        Z`,
            fill: true,
        },
    ],
    NOT_FOR_PUBLIC_RELEASE: [
        {
            pathString: `
        M33.5,13.4
        L404.5,6.92
        C419.6,6.657 431.9,18.52 432.1,33.62
        L432.89,78.92
        C433.153,94.02 421.29,106.32 406.19,106.52
        L35.19,113
        C20.09,113.263 7.79,101.4 7.59,86.3
        L6.8,41
        C6.537,25.9 18.4,13.6 33.5,13.4
        Z`,
            stroke: true,
        },
        {
            pathString: `
        M140,57.9
        L132.53,58.021
        L119.53,35.121
        L119.759,58.221
        L112.649,58.336
        L112.315,24.636
        L121.585,24.486
        L132.785,43.586
        L132.594,24.286
        L139.704,24.171
        Z
        M177,40.5
        C177.053,45.867 175.723,50.167 173.01,53.4
        C170.297,56.593 166.53,58.23 161.71,58.31
        C156.877,58.388 153.077,56.875 150.31,53.77
        C147.53,50.65 146.113,46.417 146.06,41.07
        C146.006,35.657 147.336,31.357 150.05,28.17
        C152.763,24.977 156.53,23.34 161.35,23.26
        C166.17,23.182 169.97,24.695 172.75,27.8
        C175.543,30.887 176.967,35.153 177.02,40.6
        Z
        M166.8,49.19
        C167.547,48.15 168.093,46.937 168.44,45.55
        C168.789,44.143 168.955,42.497 168.936,40.61
        C168.916,38.59 168.69,36.877 168.259,35.47
        C167.828,34.063 167.271,32.927 166.589,32.06
        C165.896,31.167 165.096,30.523 164.189,30.13
        C163.296,29.737 162.366,29.549 161.399,29.565
        C160.419,29.581 159.492,29.792 158.619,30.198
        C157.759,30.604 156.972,31.264 156.259,32.178
        C155.594,33.031 155.054,34.208 154.639,35.708
        C154.236,37.195 154.045,38.915 154.064,40.868
        C154.084,42.875 154.303,44.581 154.721,45.988
        C155.152,47.381 155.709,48.518 156.391,49.398
        C157.071,50.278 157.864,50.921 158.771,51.328
        C159.678,51.735 160.628,51.931 161.621,51.915
        C162.614,51.899 163.561,51.673 164.461,51.236
        C165.361,50.785 166.141,50.101 166.801,49.186
        Z
        M207,29.7
        L197.61,29.852
        L197.879,56.952
        L190.129,57.077
        L189.86,29.977
        L180.47,30.129
        L180.406,23.619
        L206.906,23.19
        Z
        M247,29
        L233.2,29.223
        L233.262,35.483
        L246.062,35.276
        L246.127,41.786
        L233.327,41.993
        L233.47,56.393
        L225.76,56.518
        L225.426,22.818
        L246.926,22.47
        Z
        M282,38.8
        C282.053,44.167 280.723,48.467 278.01,51.7
        C275.297,54.893 271.53,56.53 266.71,56.61
        C261.877,56.688 258.077,55.175 255.31,52.07
        C252.53,48.95 251.113,44.717 251.06,39.37
        C251.006,33.957 252.336,29.657 255.05,26.47
        C257.763,23.277 261.53,21.64 266.35,21.56
        C271.17,21.482 274.97,22.995 277.75,26.1
        C280.543,29.187 281.967,33.453 282.02,38.9
        Z
        M271.8,47.49
        C272.547,46.45 273.093,45.237 273.44,43.85
        C273.789,42.443 273.955,40.797 273.936,38.91
        C273.916,36.89 273.69,35.177 273.259,33.77
        C272.828,32.363 272.271,31.227 271.589,30.36
        C270.896,29.467 270.096,28.823 269.189,28.43
        C268.296,28.037 267.366,27.849 266.399,27.865
        C265.419,27.881 264.492,28.092 263.619,28.498
        C262.759,28.904 261.972,29.564 261.259,30.478
        C260.594,31.331 260.054,32.508 259.639,34.008
        C259.236,35.495 259.045,37.215 259.064,39.168
        C259.084,41.175 259.303,42.881 259.721,44.288
        C260.152,45.681 260.709,46.818 261.391,47.698
        C262.071,48.578 262.864,49.221 263.771,49.628
        C264.678,50.035 265.628,50.231 266.621,50.215
        C267.614,50.199 268.561,49.973 269.461,49.536
        C270.361,49.085 271.141,48.401 271.801,47.486
        Z
        M304,31.9
        C303.992,31.053 303.83,30.333 303.514,29.74
        C303.199,29.142 302.662,28.675 301.904,28.34
        C301.377,28.107 300.763,27.974 300.064,27.94
        C299.364,27.891 298.551,27.874 297.624,27.889
        L294.814,27.934
        L294.904,36.994
        L297.284,36.956
        C298.524,36.936 299.561,36.851 300.394,36.702
        C301.227,36.552 301.924,36.232 302.484,35.741
        C303.018,35.265 303.405,34.745 303.644,34.181
        C303.894,33.604 304.014,32.841 304.005,31.891
        Z
        M316.3,55.1
        L306.83,55.253
        L298.51,43.053
        L294.94,43.111
        L295.062,55.411
        L287.352,55.536
        L287.018,21.836
        L300.018,21.626
        C301.791,21.597 303.321,21.685 304.608,21.891
        C305.888,22.096 307.091,22.566 308.218,23.301
        C309.358,24.034 310.261,25.001 310.928,26.201
        C311.615,27.381 311.965,28.874 311.978,30.681
        C312.003,33.167 311.506,35.204 310.488,36.791
        C309.481,38.377 308.028,39.704 306.128,40.771
        Z
        M52,75.7
        C52.015,77.207 51.794,78.687 51.337,80.14
        C50.88,81.58 50.22,82.797 49.357,83.79
        C48.17,85.137 46.84,86.16 45.367,86.86
        C43.907,87.56 42.08,87.93 39.887,87.97
        L35.057,88.048
        L35.166,99.048
        L27.416,99.173
        L27.082,65.473
        L39.882,65.267
        C41.795,65.236 43.405,65.398 44.712,65.754
        C46.032,66.095 47.202,66.625 48.222,67.344
        C49.442,68.211 50.375,69.334 51.022,70.714
        C51.682,72.087 52.022,73.747 52.042,75.694
        Z
        M43.99,76.033
        C43.981,75.086 43.744,74.276 43.279,73.603
        C42.814,72.916 42.278,72.443 41.669,72.183
        C40.856,71.834 40.066,71.651 39.299,71.633
        C38.532,71.6 37.509,71.594 36.229,71.615
        L34.899,71.636
        L34.999,81.736
        L37.219,81.7
        C38.539,81.679 39.622,81.571 40.469,81.376
        C41.329,81.182 42.046,80.808 42.619,80.256
        C43.112,79.766 43.462,79.186 43.669,78.516
        C43.891,77.836 43.997,77.013 43.988,76.046
        Z
        M83.9,86
        C83.941,90.16 82.841,93.367 80.6,95.62
        C78.36,97.873 75.04,99.033 70.64,99.1
        C66.24,99.171 62.907,98.118 60.64,95.94
        C58.373,93.76 57.217,90.6 57.17,86.46
        L56.957,64.96
        L64.747,64.834
        L64.955,85.834
        C64.978,88.167 65.431,89.901 66.315,91.034
        C67.202,92.167 68.628,92.717 70.595,92.684
        C72.535,92.653 73.942,92.079 74.815,90.964
        C75.708,89.851 76.142,88.081 76.115,85.654
        L75.907,64.654
        L83.697,64.528
        Z
        M117,87.3
        C117.016,88.927 116.734,90.387 116.155,91.68
        C115.589,92.973 114.799,94.05 113.785,94.91
        C112.612,95.923 111.312,96.653 109.885,97.1
        C108.478,97.545 106.685,97.785 104.505,97.82
        L91.405,98.032
        L91.071,64.332
        L102.771,64.144
        C105.191,64.105 106.961,64.167 108.081,64.329
        C109.214,64.492 110.334,64.872 111.441,65.469
        C112.594,66.098 113.451,66.958 114.011,68.049
        C114.587,69.122 114.882,70.362 114.896,71.769
        C114.912,73.396 114.542,74.842 113.786,76.109
        C113.033,77.356 111.959,77.356 110.566,76.109
        C112.533,76.514 114.096,77.394 115.256,78.749
        C116.429,80.102 117.026,81.902 117.046,84.149
        Z
        M106.9,73.6
        C106.9,73.043 106.767,72.486 106.5,71.93
        C106.252,71.376 105.812,70.969 105.18,70.71
        C104.612,70.478 103.905,70.361 103.06,70.36
        C102.227,70.343 101.05,70.347 99.53,70.372
        L98.803,70.384
        L98.874,77.504
        L100.084,77.484
        C101.31,77.464 102.354,77.425 103.214,77.366
        C104.074,77.307 104.75,77.145 105.244,76.881
        C105.937,76.523 106.39,76.07 106.604,75.521
        C106.814,74.96 106.915,74.316 106.908,73.591
        Z
        M108.93,87.3
        C108.919,86.233 108.723,85.417 108.34,84.85
        C107.971,84.268 107.341,83.841 106.45,83.57
        C105.843,83.384 105.006,83.292 103.94,83.294
        C102.873,83.296 101.763,83.307 100.61,83.325
        L98.91,83.353
        L98.993,91.743
        L99.558,91.733
        C101.738,91.698 103.298,91.666 104.238,91.635
        C105.178,91.605 106.045,91.395 106.838,91.005
        C107.645,90.615 108.191,90.109 108.478,89.485
        C108.781,88.847 108.929,88.121 108.921,87.305
        Z
        M144,97.2
        L122.3,97.55
        L121.966,63.85
        L129.716,63.725
        L129.985,90.825
        L143.885,90.6
        Z
        M165,96.9
        L147.4,97.184
        L147.341,91.214
        L152.271,91.134
        L152.056,69.434
        L147.126,69.514
        L147.067,63.544
        L164.667,63.26
        L164.726,69.23
        L159.796,69.31
        L160.011,91.01
        L164.941,90.93
        Z
        M185,97.2
        C182.767,97.236 180.697,96.899 178.79,96.19
        C176.897,95.483 175.263,94.41 173.89,92.97
        C172.517,91.53 171.443,89.723 170.67,87.55
        C169.91,85.377 169.513,82.86 169.48,80
        C169.454,77.333 169.786,74.91 170.478,72.73
        C171.171,70.55 172.188,68.673 173.528,67.1
        C174.821,65.587 176.425,64.407 178.338,63.56
        C180.271,62.713 182.381,62.273 184.668,62.24
        C185.935,62.22 187.071,62.284 188.078,62.434
        C189.105,62.568 190.048,62.756 190.908,62.999
        C191.815,63.271 192.631,63.582 193.358,63.932
        C194.105,64.267 194.755,64.58 195.308,64.873
        L195.389,73.033
        L194.501,73.047
        C194.12,72.692 193.637,72.269 193.051,71.777
        C192.481,71.289 191.831,70.809 191.101,70.337
        C190.354,69.867 189.551,69.474 188.691,69.157
        C187.824,68.84 186.901,68.689 185.921,68.704
        C184.828,68.722 183.794,68.935 182.821,69.342
        C181.841,69.735 180.938,70.382 180.111,71.282
        C179.324,72.156 178.691,73.302 178.211,74.722
        C177.74,76.149 177.515,77.872 177.535,79.892
        C177.556,81.999 177.836,83.759 178.375,85.172
        C178.928,86.579 179.611,87.682 180.425,88.482
        C181.252,89.296 182.172,89.876 183.185,90.222
        C184.198,90.552 185.195,90.71 186.175,90.694
        C187.115,90.679 188.042,90.506 188.955,90.174
        C189.882,89.843 190.732,89.4 191.505,88.844
        C192.16,88.396 192.767,87.92 193.325,87.414
        C193.886,86.908 194.346,86.471 194.705,86.104
        L195.513,86.091
        L195.593,94.141
        C194.846,94.53 194.129,94.897 193.443,95.241
        C192.763,95.584 192.046,95.882 191.293,96.135
        C190.313,96.468 189.393,96.724 188.533,96.903
        Z
        M232,72.4
        C231.992,71.553 231.83,70.833 231.514,70.24
        C231.199,69.642 230.662,69.175 229.904,68.84
        C229.377,68.607 228.763,68.474 228.064,68.44
        C227.364,68.391 226.551,68.374 225.624,68.389
        L222.814,68.434
        L222.904,77.494
        L225.284,77.456
        C226.524,77.436 227.56,77.351 228.394,77.202
        C229.227,77.052 229.924,76.732 230.484,76.241
        C231.018,75.765 231.404,75.245 231.644,74.681
        C231.894,74.104 232.014,73.341 232.005,72.391
        Z
        M244.3,95.6
        L234.83,95.753
        L226.51,83.553
        L222.94,83.611
        L223.062,95.911
        L215.352,96.036
        L215.018,62.336
        L228.018,62.126
        C229.791,62.097 231.321,62.185 232.608,62.391
        C233.888,62.596 235.091,63.066 236.218,63.801
        C237.358,64.534 238.261,65.501 238.928,66.701
        C239.615,67.881 239.965,69.374 239.978,71.181
        C240.003,73.667 239.506,75.704 238.488,77.291
        C237.481,78.877 236.028,80.204 234.128,81.271
        Z
        M270,95.2
        L248.3,95.551
        L247.966,61.851
        L269.666,61.5
        L269.731,68.01
        L255.731,68.237
        L255.788,74.047
        L268.788,73.837
        L268.853,80.347
        L255.853,80.557
        L255.935,88.877
        L269.935,88.65
        Z
        M298,94.7
        L276.3,95.05
        L275.966,61.35
        L283.716,61.225
        L283.985,88.325
        L297.885,88.1
        Z
        M324,94.3
        L302.3,94.651
        L301.966,60.951
        L323.666,60.6
        L323.731,67.11
        L309.731,67.337
        L309.788,73.147
        L322.788,72.937
        L322.853,79.447
        L309.853,79.657
        L309.935,87.977
        L323.935,87.75
        Z
        M359,93.7
        L350.99,93.829
        L348.84,87.059
        L337.74,87.239
        L335.73,94.079
        L327.92,94.205
        L338.72,60.405
        L347.64,60.261
        Z
        M346.9,80.9
        L343.09,68.9
        L339.52,81
        Z
        M387,82.7
        C387.033,86.013 385.8,88.73 383.3,90.85
        C380.82,92.957 377.42,94.043 373.1,94.11
        C370.613,94.15 368.437,93.944 366.57,93.492
        C364.723,93.025 362.987,92.428 361.36,91.702
        L361.28,83.632
        L362.128,83.618
        C363.741,85.025 365.541,86.095 367.528,86.828
        C369.528,87.562 371.445,87.915 373.278,87.888
        C373.749,87.881 374.369,87.825 375.138,87.722
        C375.905,87.62 376.528,87.459 377.008,87.24
        C377.597,86.96 378.077,86.613 378.448,86.2
        C378.834,85.787 379.023,85.18 379.016,84.38
        C379.009,83.64 378.72,83.01 378.149,82.49
        C377.592,81.957 376.772,81.557 375.689,81.29
        C374.556,81.007 373.356,80.748 372.089,80.512
        C370.836,80.261 369.656,79.941 368.549,79.552
        C366.009,78.672 364.172,77.459 363.039,75.912
        C361.919,74.346 361.349,72.396 361.329,70.062
        C361.298,66.929 362.525,64.356 365.009,62.342
        C367.509,60.316 370.729,59.269 374.669,59.202
        C376.649,59.17 378.602,59.357 380.529,59.763
        C382.469,60.154 384.149,60.661 385.569,61.283
        L385.646,69.033
        L384.818,69.047
        C383.598,67.98 382.101,67.1 380.328,66.407
        C378.568,65.693 376.775,65.353 374.948,65.387
        C374.302,65.397 373.655,65.46 373.008,65.577
        C372.376,65.677 371.766,65.868 371.178,66.149
        C370.655,66.383 370.209,66.737 369.838,67.209
        C369.465,67.667 369.282,68.19 369.288,68.779
        C369.297,69.665 369.606,70.345 370.217,70.819
        C370.827,71.276 371.974,71.686 373.657,72.049
        C374.764,72.287 375.824,72.519 376.837,72.744
        C377.864,72.968 378.964,73.282 380.137,73.685
        C382.444,74.491 384.15,75.618 385.257,77.065
        C386.377,78.491 386.947,80.365 386.967,82.685
        Z
        M414,92.9
        L392.3,93.251
        L391.966,59.551
        L413.666,59.2
        L413.731,65.71
        L399.731,65.937
        L399.788,71.747
        L412.788,71.537
        L412.853,78.047
        L399.853,78.257
        L399.935,86.577
        L413.935,86.35
        Z`,
            fill: true,
        },
    ],
};
const standardStampCreationInfos = {
    "Draft": {
        formPaths: stampAnnotationForms.DRAFT,
        strokeWidth: 8.58,
        color: standardStampColors.redColor,
        subject: "Draft",
        bbox: standardStampBBox,
    },
    "Approved": {
        formPaths: stampAnnotationForms.APPROVED,
        strokeWidth: 8.58,
        color: standardStampColors.greenColor,
        subject: "Approved",
        bbox: standardStampBBox,
    },
    "NotApproved": {
        formPaths: stampAnnotationForms.NOT_APPROVED,
        strokeWidth: 8.58,
        color: standardStampColors.redColor,
        subject: "Not Approved",
        bbox: standardStampBBox,
    },
    "Departmental": {
        formPaths: stampAnnotationForms.DEPARTMENTAL,
        strokeWidth: 8.58,
        color: standardStampColors.blueColor,
        subject: "Departmental",
        bbox: standardStampBBox,
    },
    "Confidential": {
        formPaths: stampAnnotationForms.CONFIDENTIAL,
        strokeWidth: 8.58,
        color: standardStampColors.redColor,
        subject: "Confidential",
        bbox: standardStampBBox,
    },
    "Final": {
        formPaths: stampAnnotationForms.FINAL,
        strokeWidth: 8.58,
        color: standardStampColors.redColor,
        subject: "Final",
        bbox: standardStampBBox,
    },
    "Expired": {
        formPaths: stampAnnotationForms.EXPIRED,
        strokeWidth: 8.58,
        color: standardStampColors.redColor,
        subject: "Expired",
        bbox: standardStampBBox,
    },
    "AsIs": {
        formPaths: stampAnnotationForms.AS_IS,
        strokeWidth: 8.58,
        color: standardStampColors.redColor,
        subject: "As Is",
        bbox: standardStampBBox,
    },
    "Sold": {
        formPaths: stampAnnotationForms.SOLD,
        strokeWidth: 8.58,
        color: standardStampColors.blueColor,
        subject: "Sold",
        bbox: standardStampBBox,
    },
    "Experimental": {
        formPaths: stampAnnotationForms.EXPERIMENTAL,
        strokeWidth: 8.58,
        color: standardStampColors.blueColor,
        subject: "Experimental",
        bbox: standardStampBBox,
    },
    "ForComment": {
        formPaths: stampAnnotationForms.FOR_COMMENT,
        strokeWidth: 8.58,
        color: standardStampColors.greenColor,
        subject: "For Comment",
        bbox: standardStampBBox,
    },
    "TopSecret": {
        formPaths: stampAnnotationForms.TOP_SECRET,
        strokeWidth: 8.58,
        color: standardStampColors.redColor,
        subject: "Top Secret",
        bbox: standardStampBBox,
    },
    "ForPublicRelease": {
        formPaths: stampAnnotationForms.FOR_PUBLIC_RELEASE,
        strokeWidth: 8.58,
        color: standardStampColors.greenColor,
        subject: "For Public Release",
        bbox: standardStampBBox,
    },
    "NotForPublicRelease": {
        formPaths: stampAnnotationForms.NOT_FOR_PUBLIC_RELEASE,
        strokeWidth: 8.58,
        color: standardStampColors.redColor,
        subject: "Not For Public Release",
        bbox: standardStampBBox,
    },
};

var __awaiter$d = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class StampAnnotation extends AnnotationBase {
    constructor(eventService, dto) {
        var _a, _b, _c, _d;
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
        this._width = (_a = dto.width) !== null && _a !== void 0 ? _a : 0;
        this._height = (_b = dto.height) !== null && _b !== void 0 ? _b : 0;
        this._defaultWidth = (_c = dto.defaultWidth) !== null && _c !== void 0 ? _c : this._width;
        this._defaultHeight = (_d = dto.defaultHeight) !== null && _d !== void 0 ? _d : this._height;
        this._center = dto.center
            ? new Vec2(dto.center[0], dto.center[1])
            : new Vec2();
    }
    get stampType() {
        return this._stampType;
    }
    get stampSubject() {
        return this._stampSubject;
    }
    get stampImageData() {
        return this._stampImageData;
    }
    get defaultWidth() {
        return this._defaultWidth;
    }
    get defaultHeight() {
        return this._defaultHeight;
    }
    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }
    get center() {
        return this._center.clone();
    }
    toDto() {
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
    renderStampAppearanceAsync() {
        return __awaiter$d(this, void 0, void 0, function* () {
            return yield this.renderAppearanceAsync();
        });
    }
    moveToAsync(point) {
        return __awaiter$d(this, void 0, void 0, function* () {
            const x = point.x - this._center.x;
            const y = point.y - this._center.y;
            const mat = Mat3.buildTranslate(x, y);
            yield this.applyCommonTransformAsync(mat);
        });
    }
    rotateByAsync(angle, center) {
        return __awaiter$d(this, void 0, void 0, function* () {
            center || (center = this._center);
            const mat = new Mat3()
                .applyTranslation(-center.x, -center.y)
                .applyRotation(angle)
                .applyTranslation(center.x, center.y);
            yield this.applyCommonTransformAsync(mat);
        });
    }
    applyCommonTransformAsync(matrix, undoable = true) {
        const _super = Object.create(null, {
            applyCommonTransformAsync: { get: () => super.applyCommonTransformAsync }
        });
        return __awaiter$d(this, void 0, void 0, function* () {
            const { ll, lr, ur, ul } = this.getBoxCorners();
            ll.applyMat3(matrix);
            lr.applyMat3(matrix);
            ur.applyMat3(matrix);
            ul.applyMat3(matrix);
            const boxBottomEdgeAfter = Vec2.subtract(lr, ll);
            const boxLeftEdgeAfter = Vec2.subtract(ul, ll);
            this._width = boxBottomEdgeAfter.getMagnitude();
            this._height = boxLeftEdgeAfter.getMagnitude();
            this._center.setFromVec2(Vec2.add(ll, ur).multiplyByScalar(0.5));
            const boxBottomEdgeHor = new Vec2(boxBottomEdgeAfter.getMagnitude(), 0);
            this._rotation = boxBottomEdgeHor.getAngle(boxBottomEdgeAfter);
            yield _super.applyCommonTransformAsync.call(this, matrix, undoable);
        });
    }
    updateAABB() {
        const bbox = this.getBoxCorners();
        const { ll, lr, ur, ul } = bbox;
        const { min, max } = Vec2.minMax(ll, lr, ur, ul);
        this._bbox = bbox;
        this._aabb[0].setFromVec2(min);
        this._aabb[1].setFromVec2(max);
    }
    renderAppearanceAsync() {
        var _a;
        return __awaiter$d(this, void 0, void 0, function* () {
            try {
                const clipPaths = [];
                const elements = [];
                const pickHelpers = [];
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
                const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
                group.setAttribute("clip-path", `url(#${clipPath.id})`);
                const clonedGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                clonedGroup.classList.add("annotation-pick-helper");
                if (!((_a = this._stampImageData) === null || _a === void 0 ? void 0 : _a.length)) {
                    const stampData = standardStampCreationInfos[this._stampType];
                    if (!stampData) {
                        throw new Error(`Can't find data for the stamp type: ${this._stampType}`);
                    }
                    const matrix = new Mat3();
                    const halfDefaultBboxWidth = stampData.bbox[2] / 2;
                    const halfDefaultBboxHeight = stampData.bbox[3] / 2;
                    matrix.applyTranslation(-halfDefaultBboxWidth, -halfDefaultBboxHeight);
                    const halfScaledWidth = this._width / 2;
                    const halfScaledHeight = this._height / 2;
                    matrix.applyScaling(halfScaledWidth / halfDefaultBboxWidth, halfScaledHeight / halfDefaultBboxHeight);
                    matrix.applyRotation(this._rotation);
                    matrix.applyTranslation(this._center.x, this.center.y);
                    const transformationString = `matrix(${matrix.truncate(5).toFloatShortArray().join(" ")})`;
                    const [r, g, b, a] = stampData.color;
                    const colorString = `rgba(${r * 255},${g * 255},${b * 255},${a})`;
                    for (const pathData of stampData.formPaths) {
                        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                        path.setAttribute("fill", pathData.fill ? colorString : "none");
                        path.setAttribute("stroke", pathData.stroke ? colorString : "none");
                        path.setAttribute("stroke-width", stampData.strokeWidth + "");
                        path.setAttribute("d", pathData.pathString);
                        path.setAttribute("transform", transformationString);
                        group.append(path);
                        const clonedPath = path.cloneNode(true);
                        const clonedPathStrokeWidth = stampData.strokeWidth < SELECTION_STROKE_WIDTH
                            ? SELECTION_STROKE_WIDTH
                            : stampData.strokeWidth;
                        clonedPath.setAttribute("stroke-width", clonedPathStrokeWidth + "");
                        clonedPath.setAttribute("stroke", "transparent");
                        clonedPath.setAttribute("fill", pathData.fill ? "transparent" : "none");
                        clonedGroup.append(clonedPath);
                    }
                }
                else {
                    if (this._stampImageData.length % 4) {
                        throw new Error(`Wrong image data array length: ${this._stampImageData.length}`);
                    }
                    const matrix = new Mat3();
                    const halfWidth = this._width / 2;
                    const halfHeight = this._height / 2;
                    matrix.applyTranslation(-halfWidth, -halfHeight);
                    matrix.applyRotation(this._rotation);
                    matrix.applyTranslation(this._center.x, this.center.y);
                    const transformationString = `matrix(${matrix.truncate(5).toFloatShortArray().join(" ")})`;
                    const imageData = new ImageData(this._stampImageData, this._defaultWidth, this._defaultHeight);
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
                    image.onload = e => { };
                    image.setAttribute("href", imageDataBase64);
                    image.setAttribute("width", this._width + "");
                    image.setAttribute("height", this._height + "");
                    image.setAttribute("preserveAspectRatio", "none");
                    image.setAttribute("transform", transformationString);
                    group.append(image);
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
        });
    }
    getBoxCorners() {
        const hw = this._width / 2;
        const hh = this._height / 2;
        const bl = new Vec2(-hw, -hh);
        const br = new Vec2(hw, -hh);
        const tr = new Vec2(hw, hh);
        const tl = new Vec2(-hw, hh);
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

var __awaiter$c = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const supportedStampTypes = [
    { type: "Draft", name: "Draft" },
    { type: "Approved", name: "Approved" },
    { type: "NotApproved", name: "Not Approved" },
    { type: "Departmental", name: "Departmental" },
    { type: "Confidential", name: "Confidential" },
    { type: "Final", name: "Final" },
    { type: "Expired", name: "Expired" },
    { type: "AsIs", name: "As Is" },
    { type: "Sold", name: "Sold" },
    { type: "Experimental", name: "Experimental" },
    { type: "ForComment", name: "For Comment" },
    { type: "TopSecret", name: "Top Secret" },
    { type: "ForPublicRelease", name: "For Public" },
    { type: "NotForPublicRelease", name: "Not For Public" },
];
class StampAnnotator extends Annotator {
    constructor(imageService, parent, type, creationInfo) {
        super(imageService, parent);
        this.onPointerMove = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            if (this._tempAnnotation) {
                const { x: ox, y: oy } = this._overlay.getBoundingClientRect();
                const offsetX = (cx - ox) / this._imageService.scale;
                const offsetY = (cy - oy) / this._imageService.scale;
                this._svgGroup.setAttribute("transform", `translate(${offsetX} ${offsetY})`);
            }
        };
        this.onPointerUp = (e) => __awaiter$c(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (!e.isPrimary || e.button === 2) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            if (e.pointerType === "touch") {
                const longTap = performance.now() - ((_a = this._lastPointerDownInfo) === null || _a === void 0 ? void 0 : _a.timestamp) > 700;
                if (longTap) {
                    const downX = ((_b = this._lastPointerDownInfo) === null || _b === void 0 ? void 0 : _b.clientX) || 0;
                    const downY = ((_c = this._lastPointerDownInfo) === null || _c === void 0 ? void 0 : _c.clientY) || 0;
                    const displacement = Math.abs(getDistance2D(cx, cy, downX, downY));
                    const displaced = displacement > 7.5;
                    if (!displaced) {
                        return;
                    }
                }
            }
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            if (!imageCoords || !this._tempAnnotation) {
                return;
            }
            const { x: ix, y: iy } = imageCoords;
            const currentImage = this._imageService.currentImageView.imageInfo;
            if (!currentImage) {
                return;
            }
            const { uuid, rotation } = this._imageService.currentImageView.imageInfo;
            yield this._tempAnnotation.moveToAsync(new Vec2(ix, iy));
            if (rotation) {
                yield this._tempAnnotation.rotateByAsync(rotation / 180 * Math.PI);
            }
            this._imageUuid = uuid;
            yield this.saveAnnotationAsync();
        });
        if (!type) {
            throw new Error("Stamp type is not defined");
        }
        this._type = type;
        this._creationInfo = creationInfo;
        this.init();
    }
    destroy() {
        this._tempAnnotation = null;
        super.destroy();
    }
    undo() {
        this.clear();
    }
    clear() {
        this._tempAnnotation = null;
    }
    saveAnnotationAsync() {
        return __awaiter$c(this, void 0, void 0, function* () {
            if (!this._imageUuid || !this._tempAnnotation) {
                return;
            }
            this._imageService.appendAnnotationToImage(this._imageUuid, this._tempAnnotation);
            yield this.createTempStampAnnotationAsync();
        });
    }
    init() {
        super.init();
        this._overlay.addEventListener("pointermove", this.onPointerMove);
        this._overlay.addEventListener("pointerup", this.onPointerUp);
        this.createTempStampAnnotationAsync();
    }
    createStandardStamp(type, userName) {
        const nowString = new Date().toISOString();
        const stampData = standardStampCreationInfos[type];
        const dto = {
            uuid: UUID.getRandomUuid(),
            annotationType: "stamp",
            imageUuid: null,
            dateCreated: nowString,
            dateModified: nowString,
            author: userName || "unknown",
            textContent: null,
            stampType: type,
            stampSubject: null,
            stampImageData: null,
            defaultWidth: stampData.bbox[2],
            defaultHeight: stampData.bbox[3],
            width: stampData.bbox[2],
            height: stampData.bbox[3],
            center: [0, 0],
        };
        return new StampAnnotation(this._imageService.eventService, dto);
    }
    createCustomStamp(creationInfo, userName) {
        const nowString = new Date().toISOString();
        const dto = {
            uuid: UUID.getRandomUuid(),
            annotationType: "stamp",
            imageUuid: null,
            dateCreated: nowString,
            dateModified: nowString,
            author: userName || "unknown",
            textContent: null,
            stampType: creationInfo.type,
            stampSubject: creationInfo.subject,
            stampImageData: [...creationInfo.imageData],
            defaultWidth: creationInfo.bbox[2],
            defaultHeight: creationInfo.bbox[3],
            width: creationInfo.bbox[2],
            height: creationInfo.bbox[3],
            center: [0, 0],
        };
        return new StampAnnotation(this._imageService.eventService, dto);
    }
    createTempStampAnnotationAsync() {
        return __awaiter$c(this, void 0, void 0, function* () {
            let stamp;
            if (standardStampCreationInfos[this._type]) {
                stamp = this.createStandardStamp(this._type, this._imageService.userName);
            }
            else if (this._creationInfo) {
                stamp = this.createCustomStamp(this._creationInfo, this._imageService.userName);
            }
            else {
                throw new Error(`Unsupported stamp type: ${this._type}`);
            }
            const renderResult = yield stamp.renderStampAppearanceAsync();
            this._svgGroup.innerHTML = "";
            this._svgGroup.append(...renderResult.clipPaths);
            this._svgGroup.append(...renderResult.elements.map(x => x.element));
            this._tempAnnotation = stamp;
        });
    }
    refreshGroupPosition() {
    }
}

var __awaiter$b = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
};
const textNoteCreationInfos = {
    "Note": {
        formPaths: noteAnnotationForms.NOTE,
        subject: "Note",
        strokeWidth: 8.58,
        bbox: [0, 0, 200, 200],
    },
};
const noteIconTypes = {
    COMMENT: "Comment",
    KEY: "Key",
    NOTE: "Note",
    HELP: "Help",
    NEW_PARAGRAPH: "NewParagraph",
    PARAGRAPH: "Paragraph",
    INSERT: "Insert",
};
class NoteAnnotation extends AnnotationBase {
    constructor(eventService, dto) {
        var _a, _b;
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
        this._width = (_a = dto.width) !== null && _a !== void 0 ? _a : this._defaultWidth;
        this._height = (_b = dto.height) !== null && _b !== void 0 ? _b : this._defaultHeight;
        this._strokeColor = dto.strokeColor || [0, 0, 0, 1];
        this._fillColor = dto.fillColor || [1, 1, 0.4, 1];
        this._center = dto.center
            ? new Vec2(dto.center[0], dto.center[1])
            : new Vec2();
    }
    get iconType() {
        return this._iconType;
    }
    get center() {
        return this._center.clone();
    }
    get strokeColor() {
        return this._strokeColor;
    }
    get fillColor() {
        return this._fillColor;
    }
    get defaultWidth() {
        return this._defaultWidth;
    }
    get defaultHeight() {
        return this._defaultHeight;
    }
    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }
    toDto() {
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
    renderNoteAppearanceAsync() {
        return __awaiter$b(this, void 0, void 0, function* () {
            return yield this.renderAppearanceAsync();
        });
    }
    moveToAsync(point) {
        return __awaiter$b(this, void 0, void 0, function* () {
            const x = point.x - this._center.x;
            const y = point.y - this._center.y;
            const mat = Mat3.buildTranslate(x, y);
            yield this.applyCommonTransformAsync(mat);
        });
    }
    rotateByAsync(angle, center) {
        return __awaiter$b(this, void 0, void 0, function* () {
            center || (center = this._center);
            const mat = new Mat3()
                .applyTranslation(-center.x, -center.y)
                .applyRotation(angle)
                .applyTranslation(center.x, center.y);
            yield this.applyCommonTransformAsync(mat);
        });
    }
    getBoxCorners() {
        const hw = this._width / 2;
        const hh = this._height / 2;
        const bl = new Vec2(-hw, -hh);
        const br = new Vec2(hw, -hh);
        const tr = new Vec2(hw, hh);
        const tl = new Vec2(-hw, hh);
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
    updateAABB() {
        const bbox = this.getBoxCorners();
        const { ll, lr, ur, ul } = bbox;
        const { min, max } = Vec2.minMax(ll, lr, ur, ul);
        this._bbox = bbox;
        this._aabb[0].setFromVec2(min);
        this._aabb[1].setFromVec2(max);
    }
    renderAppearanceAsync() {
        return __awaiter$b(this, void 0, void 0, function* () {
            try {
                const clipPaths = [];
                const elements = [];
                const pickHelpers = [];
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
                const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
                group.setAttribute("clip-path", `url(#${clipPath.id})`);
                const clonedGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                clonedGroup.classList.add("annotation-pick-helper");
                const noteIconData = this._creationInfo;
                const matrix = new Mat3();
                const halfDefaultBboxWidth = this._defaultWidth / 2;
                const halfDefaultBboxHeight = this._defaultHeight / 2;
                matrix.applyTranslation(-halfDefaultBboxWidth, -halfDefaultBboxHeight);
                const halfScaledWidth = this._width / 2;
                const halfScaledHeight = this._height / 2;
                matrix.applyScaling(halfScaledWidth / halfDefaultBboxWidth, halfScaledHeight / halfDefaultBboxHeight);
                matrix.applyRotation(this._rotation);
                matrix.applyTranslation(this._center.x, this.center.y);
                const transformationString = `matrix(${matrix.truncate(5).toFloatShortArray().join(" ")})`;
                const [fr, fg, fb, fa] = this._fillColor;
                const fillColorString = `rgba(${fr * 255},${fg * 255},${fb * 255},${fa})`;
                const [sr, sg, sb, sa] = this._strokeColor;
                const strokeColorString = `rgba(${sr * 255},${sg * 255},${sb * 255},${sa})`;
                for (const pathData of noteIconData.formPaths) {
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute("fill", pathData.fill ? fillColorString : "none");
                    path.setAttribute("stroke", pathData.stroke ? strokeColorString : "none");
                    path.setAttribute("stroke-width", noteIconData.strokeWidth + "");
                    path.setAttribute("d", pathData.pathString);
                    path.setAttribute("transform", transformationString);
                    group.append(path);
                    const clonedPath = path.cloneNode(true);
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
        });
    }
    applyCommonTransformAsync(matrix, undoable = true) {
        const _super = Object.create(null, {
            applyCommonTransformAsync: { get: () => super.applyCommonTransformAsync }
        });
        return __awaiter$b(this, void 0, void 0, function* () {
            const { ll, lr, ur, ul } = this.getBoxCorners();
            ll.applyMat3(matrix);
            lr.applyMat3(matrix);
            ur.applyMat3(matrix);
            ul.applyMat3(matrix);
            const boxBottomEdgeAfter = Vec2.subtract(lr, ll);
            const boxLeftEdgeAfter = Vec2.subtract(ul, ll);
            this._width = boxBottomEdgeAfter.getMagnitude();
            this._height = boxLeftEdgeAfter.getMagnitude();
            this._center.setFromVec2(Vec2.add(ll, ur).multiplyByScalar(0.5));
            const boxBottomEdgeHor = new Vec2(boxBottomEdgeAfter.getMagnitude(), 0);
            this._rotation = boxBottomEdgeHor.getAngle(boxBottomEdgeAfter);
            yield _super.applyCommonTransformAsync.call(this, matrix, undoable);
        });
    }
    renderHandles() {
        return [];
    }
}

class TextAnnotator extends Annotator {
    constructor(imageService, parent, options) {
        super(imageService, parent);
        this._color = (options === null || options === void 0 ? void 0 : options.color) || [0, 0, 0, 1];
        this._strokeWidth = (options === null || options === void 0 ? void 0 : options.strokeWidth) || 3;
    }
    emitDataChanged(count, saveable, clearable, undoable) {
        this._imageService.eventService.dispatchEvent(new AnnotatorDataChangeEvent({
            annotatorType: "text",
            elementCount: count,
            undoable,
            clearable,
            saveable,
        }));
    }
}

var __awaiter$a = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class TextNoteAnnotator extends TextAnnotator {
    constructor(imageService, viewer, options) {
        super(imageService, viewer.container, options || {});
        this.onPointerMove = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            if (this._tempAnnotation) {
                const { x: ox, y: oy } = this._overlay.getBoundingClientRect();
                const offsetX = (cx - ox) / this._imageService.scale;
                const offsetY = (cy - oy) / this._imageService.scale;
                this._svgGroup.setAttribute("transform", `translate(${offsetX} ${offsetY})`);
            }
        };
        this.onPointerUp = (e) => __awaiter$a(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (!e.isPrimary || e.button === 2) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            if (e.pointerType === "touch") {
                const longTap = performance.now() - ((_a = this._lastPointerDownInfo) === null || _a === void 0 ? void 0 : _a.timestamp) > 700;
                if (longTap) {
                    const downX = ((_b = this._lastPointerDownInfo) === null || _b === void 0 ? void 0 : _b.clientX) || 0;
                    const downY = ((_c = this._lastPointerDownInfo) === null || _c === void 0 ? void 0 : _c.clientY) || 0;
                    const displacement = Math.abs(getDistance2D(cx, cy, downX, downY));
                    const displaced = displacement > 7.5;
                    if (!displaced) {
                        return;
                    }
                }
            }
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            if (!imageCoords || !this._tempAnnotation) {
                return;
            }
            const { x: ix, y: iy } = imageCoords;
            const currentImage = this._imageService.currentImageView.imageInfo;
            if (!currentImage) {
                return;
            }
            const { uuid, rotation } = this._imageService.currentImageView.imageInfo;
            yield this._tempAnnotation.moveToAsync(new Vec2(ix, iy));
            if (rotation) {
                yield this._tempAnnotation.rotateByAsync(rotation / 180 * Math.PI);
            }
            this._imageUuid = uuid;
            yield this.saveAnnotationAsync();
        });
        this._viewer = viewer;
        this.init();
    }
    destroy() {
        this._tempAnnotation = null;
        super.destroy();
    }
    undo() {
        this.clear();
    }
    clear() {
        this._tempAnnotation = null;
    }
    saveAnnotationAsync() {
        var _a;
        return __awaiter$a(this, void 0, void 0, function* () {
            if (!this._imageUuid || !this._tempAnnotation) {
                return;
            }
            const initialText = (_a = this._tempAnnotation) === null || _a === void 0 ? void 0 : _a.textContent;
            const text = yield this._viewer.showTextDialogAsync(initialText);
            if (text !== null) {
                yield this._tempAnnotation.setTextContentAsync(text);
                this._imageService.appendAnnotationToImage(this._imageUuid, this._tempAnnotation);
            }
            yield this.createTempNoteAnnotationAsync();
        });
    }
    init() {
        super.init();
        this._overlay.addEventListener("pointermove", this.onPointerMove);
        this._overlay.addEventListener("pointerup", this.onPointerUp);
        this.createTempNoteAnnotationAsync();
    }
    createTempNoteAnnotationAsync() {
        var _a, _b, _c, _d;
        return __awaiter$a(this, void 0, void 0, function* () {
            const nowString = new Date().toISOString();
            const size = ((_d = (_c = (_b = (_a = this._imageService.currentImageView) === null || _a === void 0 ? void 0 : _a.imageInfo) === null || _b === void 0 ? void 0 : _b.dimensions) === null || _c === void 0 ? void 0 : _c.x) !== null && _d !== void 0 ? _d : 2000) / 20;
            const dto = {
                uuid: UUID.getRandomUuid(),
                annotationType: "note",
                imageUuid: null,
                dateCreated: nowString,
                dateModified: nowString,
                author: this._imageService.userName || "unknown",
                textContent: null,
                iconType: noteIconTypes.NOTE,
                strokeColor: this._color,
                center: [0, 0],
                width: size,
                height: size,
            };
            const note = new NoteAnnotation(this._imageService.eventService, dto);
            const renderResult = yield note.renderNoteAppearanceAsync();
            this._svgGroup.innerHTML = "";
            this._svgGroup.append(...renderResult.clipPaths);
            this._svgGroup.append(...renderResult.elements.map(x => x.element));
            this._tempAnnotation = note;
        });
    }
    refreshGroupPosition() {
    }
}

var __awaiter$9 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class TextAnnotPoints {
    constructor(dto) {
        const { bl, tr, br, tl, l, t, r, b, cob, cok, cop } = dto;
        this._bl = new Vec2(bl[0], bl[1]);
        this._tr = new Vec2(tr[0], tr[1]);
        this._br = new Vec2(br[0], br[1]);
        this._tl = new Vec2(tl[0], tl[1]);
        this._l = new Vec2(l[0], l[1]);
        this._t = new Vec2(t[0], t[1]);
        this._r = new Vec2(r[0], r[1]);
        this._b = new Vec2(b[0], b[1]);
        this._cob = cob ? new Vec2(cob[0], cob[1]) : null;
        this._cok = cok ? new Vec2(cok[0], cok[1]) : null;
        this._cop = cop ? new Vec2(cop[0], cop[1]) : null;
    }
    get bl() {
        return this._bl;
    }
    get tr() {
        return this._tr;
    }
    get br() {
        return this._br;
    }
    get tl() {
        return this._tl;
    }
    get l() {
        return this._l;
    }
    get t() {
        return this._t;
    }
    get r() {
        return this._r;
    }
    get b() {
        return this._b;
    }
    get cob() {
        return this._cob;
    }
    get cok() {
        return this._cok;
    }
    get cop() {
        return this._cop;
    }
    clone() {
        return new TextAnnotPoints(this.toDto());
    }
    toDto() {
        const dto = {
            bl: this._bl.clone().truncate().toFloatArray(),
            tr: this._tr.clone().truncate().toFloatArray(),
            br: this._br.clone().truncate().toFloatArray(),
            tl: this._tl.clone().truncate().toFloatArray(),
            l: this._l.clone().truncate().toFloatArray(),
            t: this._t.clone().truncate().toFloatArray(),
            r: this._r.clone().truncate().toFloatArray(),
            b: this._b.clone().truncate().toFloatArray(),
            cob: this.cob ? this._cob.clone().truncate().toFloatArray() : null,
            cok: this.cok ? this._cok.clone().truncate().toFloatArray() : null,
            cop: this.cop ? this._cop.clone().truncate().toFloatArray() : null,
        };
        return dto;
    }
    toVecArray() {
        return [
            this._bl,
            this._tr,
            this._br,
            this._tl,
            this._l,
            this._t,
            this._r,
            this._b,
            this._cob,
            this._cok,
            this._cop,
        ];
    }
    minMax() {
        return Vec2.minMax(...this.toVecArray());
    }
    applyMatrix(matrix) {
        var _a, _c, _d;
        this._bl.applyMat3(matrix);
        this._tr.applyMat3(matrix);
        this._br.applyMat3(matrix);
        this._tl.applyMat3(matrix);
        this._l.applyMat3(matrix);
        this._t.applyMat3(matrix);
        this._r.applyMat3(matrix);
        this._b.applyMat3(matrix);
        (_a = this._cob) === null || _a === void 0 ? void 0 : _a.applyMat3(matrix);
        (_c = this._cok) === null || _c === void 0 ? void 0 : _c.applyMat3(matrix);
        (_d = this._cop) === null || _d === void 0 ? void 0 : _d.applyMat3(matrix);
        return this;
    }
    toHorAligned() {
        const nonAlignedEdgeStart = this._bl.clone();
        const nonAlignedEdgeEnd = this._br.clone();
        const edgeLength = Vec2.subtract(this._br, this._bl).getMagnitude();
        const horAlignedEdgeStart = new Vec2(0, 0);
        const horAlignedEdgeEnd = new Vec2(edgeLength, 0);
        const matrixToAligned = Mat3.from4Vec2(nonAlignedEdgeStart, nonAlignedEdgeEnd, horAlignedEdgeStart, horAlignedEdgeEnd);
        const horAlignedPoints = this.clone().applyMatrix(matrixToAligned);
        return {
            points: horAlignedPoints,
            matrixInversed: matrixToAligned.invert(),
        };
    }
    getBBox(margin) {
        margin || (margin = 0);
        const { points: horAlignedPoints, matrixInversed } = this.toHorAligned();
        const { min, max } = horAlignedPoints.minMax();
        min.addScalar(-margin);
        max.addScalar(margin);
        const bbox = {
            ll: new Vec2(min.x, min.y).applyMat3(matrixInversed),
            lr: new Vec2(max.x, min.y).applyMat3(matrixInversed),
            ur: new Vec2(max.x, max.y).applyMat3(matrixInversed),
            ul: new Vec2(min.x, max.y).applyMat3(matrixInversed),
        };
        return bbox;
    }
    getAABB(margin) {
        const bbox = this.getBBox(margin);
        return Vec2.minMax(bbox.ll, bbox.lr, bbox.ur, bbox.ul);
    }
}
class TextAnnotation extends AnnotationBase {
    constructor(eventService, dto) {
        super(eventService, dto);
        this._svgTemp = new SvgTempPath();
        this.onTextBoxCornerHandlePointerDown = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.setPointerCapture(e.pointerId);
            target.addEventListener("pointerup", this.onTextBoxCornerHandlePointerUp);
            target.addEventListener("pointerout", this.onTextBoxCornerHandlePointerUp);
            this._pointsTemp = this._points.clone();
            this._moved = false;
            this._transformationTimer = setTimeout(() => {
                this._transformationTimer = null;
                this._svgTemp.insertAfter(this._renderedControls);
                target.addEventListener("pointermove", this.onTextBoxCornerHandlePointerMove);
            }, 200);
            e.stopPropagation();
        };
        this.onTextBoxCornerHandlePointerMove = (e) => {
            var _a;
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            const handleName = target.dataset.handleName;
            const points = this._pointsTemp;
            const p = this.convertClientCoordsToImage(e.clientX, e.clientY);
            const horLength = Vec2.subtract(points.br, points.bl).getMagnitude();
            const vertLength = Vec2.subtract(points.tl, points.bl).getMagnitude();
            const matToAligned = Mat3.from4Vec2(points.bl, points.br, new Vec2(), new Vec2(horLength, 0));
            let oppositeP;
            switch (handleName) {
                case "tb-bl":
                    oppositeP = points.tr;
                    break;
                case "tb-br":
                    oppositeP = points.tl;
                    break;
                case "tb-tr":
                    oppositeP = points.bl;
                    break;
                case "tb-tl":
                    oppositeP = points.br;
                    break;
                default:
                    return;
            }
            const pAligned = Vec2.applyMat3(p, matToAligned);
            const oppositePAligned = Vec2.applyMat3(oppositeP, matToAligned);
            const transformedHorLength = Math.abs(pAligned.x - oppositePAligned.x);
            const transformedVertLength = Math.abs(pAligned.y - oppositePAligned.y);
            const scaleX = transformedHorLength / horLength;
            const scaleY = transformedVertLength / vertLength;
            const { r: rotation } = matToAligned.getTRS();
            const mat = new Mat3()
                .applyTranslation(-oppositeP.x, -oppositeP.y)
                .applyRotation(rotation)
                .applyScaling(scaleX, scaleY)
                .applyRotation(-rotation)
                .applyTranslation(oppositeP.x, oppositeP.y);
            points.bl.applyMat3(mat);
            points.br.applyMat3(mat);
            points.tr.applyMat3(mat);
            points.tl.applyMat3(mat);
            points.l.applyMat3(mat);
            points.t.applyMat3(mat);
            points.r.applyMat3(mat);
            points.b.applyMat3(mat);
            (_a = points.cob) === null || _a === void 0 ? void 0 : _a.applyMat3(mat);
            this._svgTemp.set("lightblue", "blue", this.strokeWidth, [points.bl, points.br, points.tr, points.tl], true);
            this._moved = true;
        };
        this.onTextBoxCornerHandlePointerUp = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.removeEventListener("pointermove", this.onTextBoxCornerHandlePointerMove);
            target.removeEventListener("pointerup", this.onTextBoxCornerHandlePointerUp);
            target.removeEventListener("pointerout", this.onTextBoxCornerHandlePointerUp);
            target.releasePointerCapture(e.pointerId);
            this._svgTemp.remove();
            if (this._moved) {
                this._points = this._pointsTemp;
                this._pointsTemp = null;
                this.updateAABB();
                this.updateRenderAsync();
            }
        };
        this.onSideHandlePointerUp = (e) => {
            if (!e.isPrimary) {
                return;
            }
            e.stopPropagation();
            const target = e.target;
            const handleName = target.dataset.handleName;
            const points = this._points;
            switch (handleName) {
                case "co-pivot-l":
                    if (Vec2.equals(points.cob, points.l)) {
                        return;
                    }
                    points.cob.setFromVec2(points.l);
                    break;
                case "co-pivot-t":
                    if (Vec2.equals(points.cob, points.t)) {
                        return;
                    }
                    points.cob.setFromVec2(points.t);
                    break;
                case "co-pivot-r":
                    if (Vec2.equals(points.cob, points.r)) {
                        return;
                    }
                    points.cob.setFromVec2(points.r);
                    break;
                case "co-pivot-b":
                    if (Vec2.equals(points.cob, points.b)) {
                        return;
                    }
                    points.cob.setFromVec2(points.b);
                    break;
                default:
                    return;
            }
            this.updateAABB();
            this.updateRenderAsync();
        };
        this.onCalloutHandlePointerDown = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.setPointerCapture(e.pointerId);
            target.addEventListener("pointerup", this.onCalloutHandlePointerUp);
            target.addEventListener("pointerout", this.onCalloutHandlePointerUp);
            this._pointsTemp = this._points.clone();
            this._moved = false;
            this._transformationTimer = setTimeout(() => {
                this._transformationTimer = null;
                this._svgTemp.insertAfter(this._renderedControls);
                target.addEventListener("pointermove", this.onCalloutHandlePointerMove);
            }, 200);
            e.stopPropagation();
        };
        this.onCalloutHandlePointerMove = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            const handleName = target.dataset.handleName;
            switch (handleName) {
                case "co-knee":
                    this._pointsTemp.cok.setFromVec2(this.convertClientCoordsToImage(e.clientX, e.clientY));
                    break;
                case "co-pointer":
                    this._pointsTemp.cop.setFromVec2(this.convertClientCoordsToImage(e.clientX, e.clientY));
                    break;
                default:
                    return;
            }
            this._svgTemp.set("none", "blue", this.strokeWidth, this._pointsTemp.cok
                ? [this._pointsTemp.cob, this._pointsTemp.cok, this._pointsTemp.cop]
                : [this._pointsTemp.cob, this._pointsTemp.cop]);
            this._moved = true;
        };
        this.onCalloutHandlePointerUp = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.removeEventListener("pointermove", this.onCalloutHandlePointerMove);
            target.removeEventListener("pointerup", this.onCalloutHandlePointerUp);
            target.removeEventListener("pointerout", this.onCalloutHandlePointerUp);
            target.releasePointerCapture(e.pointerId);
            this._svgTemp.remove();
            if (this._moved) {
                this._points = this._pointsTemp;
                this._pointsTemp = null;
                this.updateAABB();
                this.updateRenderAsync();
            }
        };
        if (!dto) {
            throw new Error("No source object passed to the constructor");
        }
        if (dto.annotationType !== "text") {
            throw new Error(`Invalid annotation type: '${dto.annotationType}' (must be 'text')`);
        }
        this._points = new TextAnnotPoints(dto.points);
        this._strokeColor = dto.strokeColor || [0, 0, 0, 1];
        this._strokeWidth = dto.strokeWidth || 3;
        this._strokeDashGap = dto.strokeDashGap || [3, 0];
        this._justification = dto.justification || justificationTypes.LEFT;
        this._calloutEndingType = dto.calloutEndingType || lineEndingTypes.ARROW_OPEN;
    }
    get color() {
        return this.color;
    }
    get strokeWidth() {
        return this._strokeWidth;
    }
    get strokeDashGap() {
        return this._strokeDashGap;
    }
    get justification() {
        return this._justification;
    }
    get calloutEndingType() {
        return this._calloutEndingType;
    }
    get minMargin() {
        const strokeWidth = this._strokeWidth;
        const halfStrokeWidth = strokeWidth / 2;
        let marginMin;
        if (this._calloutEndingType && this._calloutEndingType !== lineEndingTypes.NONE) {
            const endingSizeWoStroke = Math.max(strokeWidth * LINE_END_SIZE_RATIO, LINE_END_MIN_SIZE);
            const endingSize = endingSizeWoStroke + strokeWidth;
            marginMin = endingSize / 2;
        }
        else {
            marginMin = halfStrokeWidth;
        }
        return marginMin;
    }
    toDto() {
        return {
            annotationType: this.type,
            uuid: this.uuid,
            imageUuid: this._imageUuid,
            dateCreated: this._dateCreated.toISOString(),
            dateModified: this._dateModified.toISOString(),
            author: this._author,
            rotation: this._rotation,
            textContent: this._textContent,
            points: this._points.toDto(),
            strokeColor: this._strokeColor,
            strokeWidth: this._strokeWidth,
            strokeDashGap: this._strokeDashGap,
            justification: this._justification,
            calloutEndingType: this._calloutEndingType,
        };
    }
    setTextContentAsync(text, undoable = true) {
        const _super = Object.create(null, {
            setTextContentAsync: { get: () => super.setTextContentAsync }
        });
        return __awaiter$9(this, void 0, void 0, function* () {
            this.updateAABB();
            yield _super.setTextContentAsync.call(this, text, undoable);
            yield this.updateRenderAsync();
        });
    }
    applyCommonTransformAsync(matrix, undoable = true) {
        const _super = Object.create(null, {
            applyCommonTransformAsync: { get: () => super.applyCommonTransformAsync }
        });
        return __awaiter$9(this, void 0, void 0, function* () {
            this._points.applyMatrix(matrix);
            yield _super.applyCommonTransformAsync.call(this, matrix, undoable);
        });
    }
    updateAABB() {
        const margin = this.minMargin;
        const bbox = this._points.getBBox(margin);
        const { ll, lr, ur, ul } = bbox;
        const { min, max } = Vec2.minMax(ll, lr, ur, ul);
        this._bbox = bbox;
        this._aabb[0].setFromVec2(min);
        this._aabb[1].setFromVec2(max);
    }
    renderAppearanceAsync() {
        return __awaiter$9(this, void 0, void 0, function* () {
            try {
                const clipPaths = [];
                const elements = [];
                const pickHelpers = [];
                const sw = this._strokeWidth;
                const [min, max] = this.aabb;
                const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
                clipPath.id = `clip0_${this.uuid}`;
                clipPath.innerHTML = "<path d=\""
                    + `M${min.x},${min.y} `
                    + `L${max.x},${min.y} `
                    + `L${max.x},${max.y} `
                    + `L${min.x},${max.y} `
                    + "z"
                    + "\"/>";
                clipPaths.push(clipPath);
                const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
                group.setAttribute("clip-path", `url(#${clipPath.id})`);
                const clonedGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                clonedGroup.classList.add("annotation-pick-helper");
                const strokeDashArrayString = this._strokeDashGap.join(" ");
                const [sr, sg, sb, sa] = this._strokeColor;
                const colorString = `rgba(${sr * 255},${sg * 255},${sb * 255},${sa})`;
                const { bl, tr, br, tl, cob, cok, cop } = this._points;
                const newPath = (fillColor) => {
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute("fill", fillColor || "none");
                    path.setAttribute("stroke", colorString);
                    path.setAttribute("stroke-width", sw + "");
                    if (this._strokeDashGap) {
                        path.setAttribute("stroke-dasharray", strokeDashArrayString);
                    }
                    path.setAttribute("stroke-linecap", "square");
                    path.setAttribute("stroke-linejoin", "miter");
                    return path;
                };
                const clonePath = (path, stroke = true, fill = false) => {
                    const clonedPath = path.cloneNode(true);
                    const clonedPathStrokeWidth = sw < SELECTION_STROKE_WIDTH
                        ? SELECTION_STROKE_WIDTH
                        : sw;
                    clonedPath.setAttribute("stroke-width", clonedPathStrokeWidth + "");
                    clonedPath.setAttribute("stroke", stroke ? "transparent" : "none");
                    clonedPath.setAttribute("fill", fill ? "transparent" : "none");
                    return clonedPath;
                };
                if (cob && cop) {
                    const calloutPath = newPath();
                    let calloutD = `M${cob.x},${cob.y}`;
                    if (cok) {
                        calloutD += ` L${cok.x},${cok.y}`;
                    }
                    calloutD += ` L${cop.x},${cop.y}`;
                    calloutPath.setAttribute("d", calloutD);
                    group.append(calloutPath);
                    const clonedCalloutPath = clonePath(calloutPath, true);
                    clonedGroup.append(clonedCalloutPath);
                    if (this._calloutEndingType && this._calloutEndingType !== lineEndingTypes.NONE) {
                        const nonAlignedCalloutStart = cok ? cok.clone() : cob.clone();
                        const nonAlignedCalloutEnd = cop.clone();
                        const calloutLength = Vec2.subtract(nonAlignedCalloutEnd, nonAlignedCalloutStart).getMagnitude();
                        const horAlignedCalloutStart = new Vec2(0, 0);
                        const horAlignedCalloutEnd = new Vec2(calloutLength, 0);
                        const matrixFromAlignedCallout = Mat3.from4Vec2(nonAlignedCalloutStart, nonAlignedCalloutEnd, horAlignedCalloutStart, horAlignedCalloutEnd).invert();
                        const endingPathString = buildLineEndingPath(horAlignedCalloutEnd, this._calloutEndingType, sw, "right");
                        const calloutEndingPath = newPath();
                        calloutEndingPath.setAttribute("d", endingPathString);
                        calloutEndingPath.setAttribute("transform", `matrix(${matrixFromAlignedCallout.truncate(5).toFloatShortArray().join(" ")})`);
                        group.append(calloutEndingPath);
                        const clonedCalloutEndingPath = clonePath(calloutEndingPath, true);
                        clonedGroup.append(clonedCalloutEndingPath);
                    }
                }
                const rectPath = newPath("white");
                const rectD = `M${bl.x},${bl.y}`
                    + ` L${br.x},${br.y}`
                    + ` L${tr.x},${tr.y}`
                    + ` L${tl.x},${tl.y} Z`;
                rectPath.setAttribute("d", rectD);
                group.append(rectPath);
                const clonedRectPath = clonePath(rectPath, true, true);
                clonedGroup.append(clonedRectPath);
                if (this._textContent) {
                    const { points: alignedPoints, matrixInversed } = this._points.toHorAligned();
                    const matrixString = `matrix(${matrixInversed.truncate(5).toFloatShortArray().join(",")})`;
                    const fontSize = TEXT_FONT_RATIO * sw;
                    const sidePadding = Math.max(sw * LINE_END_SIZE_RATIO, LINE_END_MIN_SIZE);
                    const textRectWidth = Vec2.subtract(alignedPoints.br, alignedPoints.bl).getMagnitude();
                    const maxTextWidth = textRectWidth - 2 * sidePadding;
                    const textPivot = new Vec2(alignedPoints.bl.x + sidePadding, alignedPoints.bl.y + sidePadding);
                    if (maxTextWidth > 0) {
                        const textData = yield TextData.buildAsync(this._textContent, {
                            maxWidth: maxTextWidth,
                            fontSize: fontSize,
                            strokeWidth: sw,
                            textAlign: this._justification,
                            pivotPoint: "top-left",
                        });
                        for (const line of textData.lines) {
                            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                            text.setAttribute("x", textPivot.x +
                                ((line.relativeRect[0] + line.relativeRect[2]) / 2) + "");
                            text.setAttribute("y", textPivot.y +
                                ((line.relativeRect[1] + line.relativeRect[3]) / 2) + "");
                            text.setAttribute("fill", "black");
                            text.setAttribute("dominant-baseline", "central");
                            text.setAttribute("text-anchor", "middle");
                            text.setAttribute("transform", matrixString);
                            text.style.fontSize = fontSize + "px";
                            text.style.fontFamily = "sans-serif";
                            text.textContent = line.text;
                            group.append(text);
                        }
                    }
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
        });
    }
    renderHandles() {
        const points = this._points;
        return [
            ...this.renderTextBoxCornerHandles(points),
            ...this.renderCalloutHandles(points),
            this.renderRotationHandle()
        ];
    }
    renderTextBoxCornerHandles(points) {
        const { bl: pBL, br: pBR, tr: pTR, tl: pTL } = points;
        const cornerMap = new Map();
        cornerMap.set("tb-bl", pBL);
        cornerMap.set("tb-br", pBR);
        cornerMap.set("tb-tr", pTR);
        cornerMap.set("tb-tl", pTL);
        const handles = [];
        ["tb-bl", "tb-br", "tb-tr", "tb-tl"].forEach(x => {
            const { x: cx, y: cy } = cornerMap.get(x);
            const handle = document.createElementNS("http://www.w3.org/2000/svg", "line");
            handle.classList.add("annotation-handle", "scale");
            handle.setAttribute("data-handle-name", x);
            handle.setAttribute("x1", cx + "");
            handle.setAttribute("y1", cy + "");
            handle.setAttribute("x2", cx + "");
            handle.setAttribute("y2", cy + 0.1 + "");
            handle.addEventListener("pointerdown", this.onTextBoxCornerHandlePointerDown);
            handles.push(handle);
        });
        return handles;
    }
    renderCalloutHandles(points) {
        const handles = [];
        if (!points.cop) {
            return handles;
        }
        ["l", "t", "r", "b"].forEach(x => {
            const side = points[x];
            const sideHandle = document.createElementNS("http://www.w3.org/2000/svg", "line");
            sideHandle.classList.add("annotation-handle", "helper");
            sideHandle.setAttribute("data-handle-name", `co-pivot-${x}`);
            sideHandle.setAttribute("x1", side.x + "");
            sideHandle.setAttribute("y1", side.y + "");
            sideHandle.setAttribute("x2", side.x + "");
            sideHandle.setAttribute("y2", side.y + 0.1 + "");
            sideHandle.addEventListener("pointerdown", this.onSideHandlePointerUp);
            handles.push(sideHandle);
        });
        if (points.cok) {
            const pCoKnee = points.cok;
            const kneeHandle = document.createElementNS("http://www.w3.org/2000/svg", "line");
            kneeHandle.classList.add("annotation-handle", "translation");
            kneeHandle.setAttribute("data-handle-name", "co-knee");
            kneeHandle.setAttribute("x1", pCoKnee.x + "");
            kneeHandle.setAttribute("y1", pCoKnee.y + "");
            kneeHandle.setAttribute("x2", pCoKnee.x + "");
            kneeHandle.setAttribute("y2", pCoKnee.y + 0.1 + "");
            kneeHandle.addEventListener("pointerdown", this.onCalloutHandlePointerDown);
            handles.push(kneeHandle);
        }
        const pCoPointer = points.cop;
        const pointerHandle = document.createElementNS("http://www.w3.org/2000/svg", "line");
        pointerHandle.classList.add("annotation-handle", "translation");
        pointerHandle.setAttribute("data-handle-name", "co-pointer");
        pointerHandle.setAttribute("x1", pCoPointer.x + "");
        pointerHandle.setAttribute("y1", pCoPointer.y + "");
        pointerHandle.setAttribute("x2", pCoPointer.x + "");
        pointerHandle.setAttribute("y2", pCoPointer.y + 0.1 + "");
        pointerHandle.addEventListener("pointerdown", this.onCalloutHandlePointerDown);
        handles.push(pointerHandle);
        return handles;
    }
}

var __awaiter$8 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class FreeTextAnnotator extends TextAnnotator {
    constructor(imageService, viewer, options) {
        super(imageService, viewer.container, options || {});
        this.onPointerDown = (e) => {
            if (!e.isPrimary || e.button === 2) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy, info: { uuid } } = imageCoords;
            this._imageUuid = uuid;
            this._down = new Vec2(ix, iy);
            this.clear();
            this.refreshGroupPosition();
            const target = e.target;
            target.addEventListener("pointermove", this.onPointerMove);
            target.addEventListener("pointerup", this.onPointerUp);
            target.addEventListener("pointerout", this.onPointerUp);
            target.setPointerCapture(e.pointerId);
        };
        this.onPointerMove = (e) => {
            if (!e.isPrimary
                || !this._down) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy } = imageCoords;
            const { min, max } = Vec2.minMax(this._down, new Vec2(ix, iy));
            this.redrawRect(min, max);
        };
        this.onPointerUp = (e) => __awaiter$8(this, void 0, void 0, function* () {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.removeEventListener("pointermove", this.onPointerMove);
            target.removeEventListener("pointerup", this.onPointerUp);
            target.removeEventListener("pointerout", this.onPointerUp);
            target.releasePointerCapture(e.pointerId);
            if (this._rect) {
                yield this.saveAnnotationAsync();
            }
        });
        this._viewer = viewer;
        this.init();
    }
    destroy() {
        this.emitDataChanged(0);
        super.destroy();
    }
    undo() {
        this.clear();
    }
    clear() {
        this._rect = null;
        this._svgGroup.innerHTML = "";
        this.emitDataChanged(0);
    }
    saveAnnotationAsync() {
        return __awaiter$8(this, void 0, void 0, function* () {
            if (!this._imageUuid || !this._rect) {
                return;
            }
            const text = yield this._viewer.showTextDialogAsync("");
            if (text !== null) {
                const imageUuid = this._imageUuid;
                const dto = this.buildAnnotationDto(text);
                if (dto) {
                    const annotation = new TextAnnotation(this._imageService.eventService, dto);
                    this._imageService.appendAnnotationToImage(imageUuid, annotation);
                }
            }
            this.clear();
        });
    }
    init() {
        super.init();
        this._overlay.addEventListener("pointerdown", this.onPointerDown);
    }
    redrawRect(min, max) {
        this._svgGroup.innerHTML = "";
        const minSize = this._strokeWidth * 2;
        if (max.x - min.x <= minSize || max.y - min.y <= minSize) {
            this._rect = null;
            return;
        }
        const [r, g, b, a] = this._color || [0, 0, 0, 1];
        this._rect = [min.x, min.y, max.x, max.y];
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("fill", "white");
        rect.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
        rect.setAttribute("stroke-width", this._strokeWidth + "");
        rect.setAttribute("x", min.x + "");
        rect.setAttribute("y", min.y + "");
        rect.setAttribute("width", max.x - min.x + "");
        rect.setAttribute("height", max.y - min.y + "");
        this._svgGroup.append(rect);
    }
    refreshGroupPosition() {
        if (!this._imageUuid) {
            return;
        }
        const image = this._imageService.currentImageView;
        if (!image || image.imageInfo.uuid !== this._imageUuid) {
            this._svgGroup.setAttribute("transform", "scale(0)");
            return;
        }
        const { tx, ty, rotation } = this.getImageTransformationInfo(image);
        this._svgGroup.setAttribute("transform", `translate(${tx} ${ty}) rotate(${rotation})`);
    }
    buildAnnotationDto(text) {
        const nowString = new Date().toISOString();
        const [xmin, ymin, xmax, ymax] = this._rect;
        const horCenterX = (xmin + xmax) / 2;
        const vertCenterY = (ymin + ymax) / 2;
        const points = {
            bl: [xmin, ymin],
            tr: [xmax, ymax],
            br: [xmax, ymin],
            tl: [xmin, ymax],
            l: [xmin, vertCenterY],
            t: [horCenterX, ymax],
            r: [xmax, vertCenterY],
            b: [horCenterX, ymin],
        };
        const dto = {
            uuid: UUID.getRandomUuid(),
            annotationType: "text",
            imageUuid: null,
            dateCreated: nowString,
            dateModified: nowString,
            author: this._imageService.userName || "unknown",
            textContent: text,
            points,
            strokeColor: this._color,
            strokeWidth: this._strokeWidth,
            justification: justificationTypes.LEFT,
            calloutEndingType: lineEndingTypes.ARROW_OPEN,
        };
        return dto;
    }
}

var __awaiter$7 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class FreeTextCalloutAnnotator extends TextAnnotator {
    constructor(imageService, viewer, options) {
        super(imageService, viewer.container, options || {});
        this.onPointerDown = (e) => {
            if (!e.isPrimary || e.button === 2) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy, info: { uuid } } = imageCoords;
            if (uuid !== this._imageUuid) {
                this.clear();
            }
            this._imageUuid = uuid;
            this._down = new Vec2(ix, iy);
            this.refreshGroupPosition();
            const target = e.target;
            target.addEventListener("pointermove", this.onPointerMove);
            target.addEventListener("pointerup", this.onPointerUp);
            target.addEventListener("pointerout", this.onPointerUp);
            target.setPointerCapture(e.pointerId);
        };
        this.onPointerMove = (e) => {
            if (!e.isPrimary
                || !this._down) {
                return;
            }
            const { clientX: cx, clientY: cy } = e;
            this.updatePointerCoords(cx, cy);
            if (!this._points) {
                const imageCoords = this._pointerCoordsInImageCS;
                if (!imageCoords) {
                    return;
                }
                const { x: ix, y: iy } = imageCoords;
                const { min, max } = Vec2.minMax(this._down, new Vec2(ix, iy));
                this.redrawRect(min, max);
            }
        };
        this.onPointerUp = (e) => {
            if (!e.isPrimary) {
                return;
            }
            const target = e.target;
            target.removeEventListener("pointermove", this.onPointerMove);
            target.removeEventListener("pointerup", this.onPointerUp);
            target.removeEventListener("pointerout", this.onPointerUp);
            target.releasePointerCapture(e.pointerId);
            if (!this._rect) {
                return;
            }
            if (!this._points) {
                this.initPoints();
                return;
            }
            const imageCoords = this._pointerCoordsInImageCS;
            if (!imageCoords) {
                return;
            }
            const { x: ix, y: iy } = imageCoords;
            const p = new Vec2(ix, iy);
            const { l, b, r, t } = this._points;
            const lv = new Vec2(l[0], l[1]);
            const bv = new Vec2(b[0], b[1]);
            const rv = new Vec2(r[0], r[1]);
            const tv = new Vec2(t[0], t[1]);
            let cob = lv;
            let minDistance = Vec2.subtract(p, lv).getMagnitude();
            const bvToP = Vec2.subtract(p, bv).getMagnitude();
            if (bvToP < minDistance) {
                minDistance = bvToP;
                cob = bv;
            }
            const rvToP = Vec2.subtract(p, rv).getMagnitude();
            if (rvToP < minDistance) {
                minDistance = rvToP;
                cob = rv;
            }
            const tvToP = Vec2.subtract(p, tv).getMagnitude();
            if (tvToP < minDistance) {
                minDistance = tvToP;
                cob = tv;
            }
            this._points.cob = cob.toFloatArray();
            if (!this._points.cop) {
                this._points.cop = p.toFloatArray();
            }
            else {
                this._points.cok = p.toFloatArray();
            }
            this.redrawCallout();
        };
        this._viewer = viewer;
        this.init();
    }
    destroy() {
        this.emitDataChanged(0);
        super.destroy();
    }
    undo() {
        this.clear();
    }
    clear() {
        this._rect = null;
        this._points = null;
        this._svgGroup.innerHTML = "";
        this.emitDataChanged(0);
    }
    saveAnnotationAsync() {
        return __awaiter$7(this, void 0, void 0, function* () {
            if (!this._imageUuid || !this._rect) {
                return;
            }
            const text = yield this._viewer.showTextDialogAsync("");
            if (text !== null) {
                const imageUuid = this._imageUuid;
                const dto = this.buildAnnotationDto(text);
                if (dto) {
                    const annotation = new TextAnnotation(this._imageService.eventService, dto);
                    this._imageService.appendAnnotationToImage(imageUuid, annotation);
                }
            }
            this.clear();
        });
    }
    init() {
        super.init();
        this._overlay.addEventListener("pointerdown", this.onPointerDown);
    }
    initPoints() {
        const [xmin, ymin, xmax, ymax] = this._rect;
        const horCenterX = (xmin + xmax) / 2;
        const vertCenterY = (ymin + ymax) / 2;
        const points = {
            bl: [xmin, ymin],
            tr: [xmax, ymax],
            br: [xmax, ymin],
            tl: [xmin, ymax],
            l: [xmin, vertCenterY],
            t: [horCenterX, ymax],
            r: [xmax, vertCenterY],
            b: [horCenterX, ymin],
        };
        this._points = points;
        this.emitDataChanged(2, true, true);
    }
    redrawRect(min, max) {
        this._svgGroup.innerHTML = "";
        const minSize = this._strokeWidth * 2;
        if (max.x - min.x <= minSize || max.y - min.y <= minSize) {
            this._rect = null;
            return;
        }
        const [r, g, b, a] = this._color || [0, 0, 0, 1];
        this._rect = [min.x, min.y, max.x, max.y];
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("fill", "white");
        rect.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
        rect.setAttribute("stroke-width", this._strokeWidth + "");
        rect.setAttribute("x", min.x + "");
        rect.setAttribute("y", min.y + "");
        rect.setAttribute("width", max.x - min.x + "");
        rect.setAttribute("height", max.y - min.y + "");
        this._svgGroup.append(rect);
    }
    redrawCallout() {
        const svgRect = this._svgGroup.lastChild;
        svgRect.remove();
        this._svgGroup.innerHTML = "";
        const [r, g, b, a] = this._color || [0, 0, 0, 1];
        const callout = document.createElementNS("http://www.w3.org/2000/svg", "path");
        callout.setAttribute("fill", "none");
        callout.setAttribute("stroke", `rgba(${r * 255},${g * 255},${b * 255},${a})`);
        callout.setAttribute("stroke-width", this._strokeWidth + "");
        let d = `M${this._points.cob[0]},${this._points.cob[1]} `;
        if (this._points.cok) {
            d += `L${this._points.cok[0]},${this._points.cok[1]} `;
        }
        d += `L${this._points.cop[0]},${this._points.cop[1]}`;
        callout.setAttribute("d", d);
        this._svgGroup.append(callout);
        this._svgGroup.append(svgRect);
    }
    refreshGroupPosition() {
        if (!this._imageUuid) {
            return;
        }
        const image = this._imageService.currentImageView;
        if (!image || image.imageInfo.uuid !== this._imageUuid) {
            this._svgGroup.setAttribute("transform", "scale(0)");
            return;
        }
        const { tx, ty, rotation } = this.getImageTransformationInfo(image);
        this._svgGroup.setAttribute("transform", `translate(${tx} ${ty}) rotate(${rotation})`);
    }
    buildAnnotationDto(text) {
        const nowString = new Date().toISOString();
        const dto = {
            uuid: UUID.getRandomUuid(),
            annotationType: "text",
            imageUuid: null,
            dateCreated: nowString,
            dateModified: nowString,
            author: this._imageService.userName || "unknown",
            textContent: text,
            points: this._points,
            strokeColor: this._color,
            strokeWidth: this._strokeWidth,
            justification: justificationTypes.LEFT,
            calloutEndingType: lineEndingTypes.ARROW_OPEN,
        };
        return dto;
    }
}

const textAnnotatorTypes = ["note", "freeText", "freeTextCallout"];
class TextAnnotatorFactory {
    createAnnotator(imageService, viewer, options, type) {
        if (!imageService) {
            throw new Error("Image service is not defined");
        }
        if (!viewer) {
            throw new Error("Viewer is not defined");
        }
        type || (type = this._lastType || "note");
        this._lastType = type;
        const color = (options === null || options === void 0 ? void 0 : options.color) || this._lastColor || [0, 0, 0, 1];
        this._lastColor = color;
        const strokeWidth = (options === null || options === void 0 ? void 0 : options.strokeWidth) || this._lastStrokeWidth || 3;
        this._lastStrokeWidth = strokeWidth;
        const combinedOptions = {
            color,
            strokeWidth,
        };
        switch (type) {
            case "note":
                return new TextNoteAnnotator(imageService, viewer, combinedOptions);
            case "freeText":
                return new FreeTextAnnotator(imageService, viewer, combinedOptions);
            case "freeTextCallout":
                return new FreeTextCalloutAnnotator(imageService, viewer, combinedOptions);
            default:
                throw new Error(`Invalid geometric annotator type: ${type}`);
        }
    }
}

class AnnotatorService {
    constructor(imageService, customStampService, viewer) {
        this._annotationColors = [
            [0, 0, 0, 0.5],
            [0.804, 0, 0, 0.5],
            [0, 0.804, 0, 0.5],
            [0, 0, 0.804, 0.5],
            [1, 0.5, 0, 0.5],
            [1, 0.2, 1, 0.5],
        ];
        this._strokeColor = this._annotationColors[0];
        this._strokeWidth = 3;
        this._stampType = supportedStampTypes[0].type;
        this._geometricCloudMode = false;
        this._geometricSubmode = geometricAnnotatorTypes[0];
        this._textSubmode = textAnnotatorTypes[0];
        this.onContextMenu = (event) => {
            if (this._contextMenu.enabled) {
                event.preventDefault();
                this._contextMenu.show(new Vec2(event.clientX, event.clientY), this._viewer.container);
            }
        };
        this.onImageChange = (event) => {
            if (event.detail.type === "render") {
                this._contextMenu.hide();
            }
        };
        if (!imageService) {
            throw new Error("Page service is not defined");
        }
        if (!customStampService) {
            throw new Error("Custom stamp service is not defined");
        }
        if (!viewer) {
            throw new Error("Viewer is not defined");
        }
        this._imageService = imageService;
        this._customStampService = customStampService;
        this._viewer = viewer;
        this.init();
    }
    get mode() {
        return this._mode;
    }
    set mode(value) {
        this.setMode(value);
    }
    get annotator() {
        return this._annotator;
    }
    destroy() {
        var _a, _b, _c;
        this._imageService.eventService.removeListener(imageChangeEvent, this.onImageChange);
        this._viewer.container.removeEventListener("contextmenu", this.onContextMenu);
        (_a = this._viewerResizeObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
        (_b = this._contextMenu) === null || _b === void 0 ? void 0 : _b.destroy();
        (_c = this._annotator) === null || _c === void 0 ? void 0 : _c.destroy();
    }
    init() {
        this._imageService.eventService.addListener(imageChangeEvent, this.onImageChange);
        this._viewer.container.addEventListener("contextmenu", this.onContextMenu);
        const viewerRObserver = new ResizeObserver((entries) => {
            var _a;
            (_a = this._contextMenu) === null || _a === void 0 ? void 0 : _a.hide();
        });
        viewerRObserver.observe(this._viewer.container);
        this._viewerResizeObserver = viewerRObserver;
        this._contextMenu = new ContextMenu();
        this._geometricFactory = new GeometricAnnotatorFactory();
        this._textFactory = new TextAnnotatorFactory();
    }
    setMode(mode) {
        var _a;
        mode || (mode = this._mode);
        this._contextMenu.content = [];
        (_a = this._annotator) === null || _a === void 0 ? void 0 : _a.destroy();
        this._imageService.setSelectedAnnotation(null);
        this._mode = mode;
        switch (mode) {
            case "select":
                this._contextMenu.enabled = false;
                return;
            case "stamp":
                this._annotator = new StampAnnotator(this._imageService, this._viewer.container, this._stampType, this._stampCreationInfo);
                break;
            case "pen":
                this._annotator = new PenAnnotator(this._imageService, this._viewer.container, {
                    strokeWidth: this._strokeWidth,
                    color: this._strokeColor,
                });
                break;
            case "geometric":
                this._annotator = this._geometricFactory.createAnnotator(this._imageService, this._viewer.container, {
                    strokeWidth: this._strokeWidth,
                    color: this._strokeColor,
                    cloudMode: this._geometricCloudMode,
                }, this._geometricSubmode);
                break;
            case "text":
                this._annotator = this._textFactory.createAnnotator(this._imageService, this._viewer, {
                    strokeWidth: this._strokeWidth,
                    color: this._strokeColor,
                }, this._textSubmode);
                break;
            default:
                throw new Error(`Invalid annotation mode: ${mode}`);
        }
        const cmContent = this.buildContextMenuContent();
        this._contextMenu.content = cmContent;
        this._contextMenu.enabled = true;
    }
    buildContextMenuContent() {
        switch (this._mode) {
            case "select":
                return [];
            case "stamp":
                return [
                    this.buildCustomStampButtons(),
                    this.buildStampTypePicker(),
                ];
            case "pen":
                return [
                    this.buildStrokeColorPicker(),
                    this.buildStrokeWidthSlider(false),
                ];
            case "geometric":
                return [
                    this.buildGeometricSubmodePicker(),
                    this.buildStrokeColorPicker(),
                    this.buildStrokeWidthSlider(true),
                ];
            case "text":
                return [
                    this.buildTextSubmodePicker(),
                    this.buildStrokeColorPicker(),
                    this.buildStrokeWidthSlider(false),
                ];
            default:
                throw new Error(`Invalid annotation mode: ${this._mode}`);
        }
    }
    buildCustomStampButtons() {
        const buttonsContainer = DomUtils.htmlToElements(HtmlTemplates.stampContextButtonsHtml)[0];
        buttonsContainer.querySelector(".stamp-load-image").addEventListener("click", () => {
            this._customStampService.startLoadingImage();
        });
        buttonsContainer.querySelector(".stamp-draw-image").addEventListener("click", () => {
            this._customStampService.startDrawing();
        });
        if (this._stampCreationInfo) {
            const deleteButton = buttonsContainer.querySelector(".stamp-delete");
            deleteButton.addEventListener("click", () => {
                this._customStampService.removeCustomStamp(this._stampType);
            });
            deleteButton.classList.remove("disabled");
        }
        return buttonsContainer;
    }
    buildStampTypePicker() {
        const stampTypes = supportedStampTypes;
        const pickerDiv = document.createElement("div");
        pickerDiv.classList.add("context-menu-content", "column");
        [...stampTypes, ...this._customStampService.getCustomStamps()].forEach(x => {
            const item = document.createElement("div");
            item.classList.add("context-menu-stamp-select-button");
            if (x.type === this._stampType) {
                item.classList.add("on");
            }
            item.addEventListener("click", () => {
                this._stampType = x.type;
                if (x["imageData"]) {
                    this._stampCreationInfo = x;
                }
                else {
                    this._stampCreationInfo = null;
                }
                this.setMode();
            });
            const stampName = document.createElement("div");
            stampName.innerHTML = x.name;
            item.append(stampName);
            pickerDiv.append(item);
        });
        return pickerDiv;
    }
    buildGeometricSubmodePicker() {
        const submodePicker = document.createElement("div");
        submodePicker.classList.add("context-menu-content", "row");
        geometricAnnotatorTypes.forEach(x => {
            const item = document.createElement("div");
            item.classList.add("panel-button");
            if (x === this._geometricSubmode) {
                item.classList.add("on");
            }
            item.addEventListener("click", () => {
                this._geometricSubmode = x;
                this.setMode();
            });
            item.innerHTML = Icons.geometricIcons[x];
            submodePicker.append(item);
        });
        return submodePicker;
    }
    buildTextSubmodePicker() {
        const submodePicker = document.createElement("div");
        submodePicker.classList.add("context-menu-content", "row");
        textAnnotatorTypes.forEach(x => {
            const item = document.createElement("div");
            item.classList.add("panel-button");
            if (x === this._textSubmode) {
                item.classList.add("on");
            }
            item.addEventListener("click", () => {
                this._textSubmode = x;
                this.setMode();
            });
            item.innerHTML = Icons.textIcons[x];
            submodePicker.append(item);
        });
        return submodePicker;
    }
    buildStrokeColorPicker() {
        const colorPickerDiv = document.createElement("div");
        colorPickerDiv.classList.add("context-menu-content", "row");
        this._annotationColors.forEach(x => {
            const item = document.createElement("div");
            item.classList.add("panel-button");
            if (x === this._strokeColor) {
                item.classList.add("on");
            }
            item.addEventListener("click", () => {
                this._strokeColor = x;
                this.setMode();
            });
            const colorIcon = document.createElement("div");
            colorIcon.classList.add("context-menu-color-icon");
            colorIcon.style.backgroundColor = `rgb(${x[0] * 255},${x[1] * 255},${x[2] * 255})`;
            item.append(colorIcon);
            colorPickerDiv.append(item);
        });
        return colorPickerDiv;
    }
    buildStrokeWidthSlider(cloudButtons) {
        const disableLineTypeButtons = !cloudButtons
            || this._geometricSubmode === "polyline"
            || this._geometricSubmode === "line"
            || this._geometricSubmode === "arrow";
        const div = document.createElement("div");
        div.classList.add("context-menu-content", "row");
        const cloudyLineButton = document.createElement("div");
        cloudyLineButton.classList.add("panel-button");
        if (disableLineTypeButtons) {
            cloudyLineButton.classList.add("disabled");
        }
        else {
            if (this._geometricCloudMode) {
                cloudyLineButton.classList.add("on");
            }
            cloudyLineButton.addEventListener("click", () => {
                this._geometricCloudMode = true;
                this.setMode();
            });
        }
        cloudyLineButton.innerHTML = Icons.lineTypeIcons.cloudy;
        div.append(cloudyLineButton);
        const straightLineButton = document.createElement("div");
        straightLineButton.classList.add("panel-button");
        if (disableLineTypeButtons) {
            straightLineButton.classList.add("disabled");
        }
        else {
            if (!this._geometricCloudMode) {
                straightLineButton.classList.add("on");
            }
            straightLineButton.addEventListener("click", () => {
                this._geometricCloudMode = false;
                this.setMode();
            });
        }
        straightLineButton.innerHTML = Icons.lineTypeIcons.straight;
        div.append(straightLineButton);
        const slider = document.createElement("input");
        slider.setAttribute("type", "range");
        slider.setAttribute("min", "2");
        slider.setAttribute("max", "64");
        slider.setAttribute("step", "2");
        slider.setAttribute("value", this._strokeWidth + "");
        slider.classList.add("context-menu-slider");
        slider.addEventListener("change", () => {
            this._strokeWidth = slider.valueAsNumber;
            this.setMode();
        });
        div.append(slider);
        return div;
    }
}

var __awaiter$6 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class ImageInfo {
    constructor(source, uuid) {
        this._dimensions = new Vec2();
        this._scale = 1;
        this._rotation = 0;
        this._annotations = [];
        this._uuid = uuid || UUID.getRandomUuid();
        if (source instanceof HTMLImageElement) {
            if (!source || !source.complete) {
                throw new Error("Image is not loaded");
            }
            this._preloadedImage = source;
            this._dimensions.set(source.naturalWidth, source.naturalHeight);
            return;
        }
        this._url = source;
    }
    get uuid() {
        return this._uuid;
    }
    get url() {
        return this._url;
    }
    get dimensions() {
        return this._dimensions;
    }
    set scale(value) {
        if (this._scale === value) {
            return;
        }
        this._scale = Math.max(value, 0);
    }
    get scale() {
        return this._scale;
    }
    set rotation(value) {
        if (this._rotation === value || isNaN(value)) {
            return;
        }
        this._rotation = value % 360;
    }
    get rotation() {
        return this._rotation;
    }
    get annotations() {
        return this._annotations;
    }
    getImageAsync() {
        return __awaiter$6(this, void 0, void 0, function* () {
            if (this._preloadedImage) {
                return this._preloadedImage;
            }
            if (!this._url) {
                throw new Error("No image or image url found");
            }
            const image = yield DomUtils.loadImageAsync(this._url);
            if (image) {
                this._dimensions.set(image.naturalWidth, image.naturalHeight);
            }
            return image;
        });
    }
}

var __awaiter$5 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class ImageAnnotationView {
    constructor(eventService, imageInfo) {
        this._rendered = new Set();
        this.onAnnotationSelectionChange = (e) => {
            var _a;
            if (e.detail.type === "select") {
                if ((_a = e.detail.annotations) === null || _a === void 0 ? void 0 : _a.length) {
                    this._container.style.touchAction = "none";
                }
                else {
                    this._container.style.touchAction = "";
                }
            }
        };
        if (!eventService) {
            throw new Error("Event service is not defined");
        }
        if (!imageInfo) {
            throw new Error("Image info is not defined");
        }
        this._eventService = eventService;
        this._imageInfo = imageInfo;
        this._container = document.createElement("div");
        this._container.classList.add("page-annotations");
        this._svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this._svg.classList.add("page-annotations-controls");
        this._svg.setAttribute("data-image-uuid", imageInfo.uuid + "");
        this._svg.setAttribute("viewBox", `0 0 ${imageInfo.dimensions.x} ${imageInfo.dimensions.y}`);
        this._svg.addEventListener("pointerdown", (e) => {
            if (e.target === this._svg) {
                eventService.dispatchEvent(new AnnotSelectionRequestEvent({ annotation: null }));
            }
        });
    }
    destroy() {
        this.remove();
        this._container = null;
        this._destroyed = true;
    }
    remove() {
        var _a;
        (_a = this._container) === null || _a === void 0 ? void 0 : _a.remove();
        this._eventService.removeListener(annotChangeEvent, this.onAnnotationSelectionChange);
    }
    appendAsync(parent) {
        return __awaiter$5(this, void 0, void 0, function* () {
            if (this._destroyed) {
                return;
            }
            yield this.renderAnnotationsAsync();
            parent.append(this._container);
            this._eventService.addListener(annotChangeEvent, this.onAnnotationSelectionChange);
        });
    }
    renderAnnotationsAsync() {
        var _a, _b;
        return __awaiter$5(this, void 0, void 0, function* () {
            this.clear();
            const annotations = this._imageInfo.annotations || [];
            for (let i = 0; i < annotations.length || 0; i++) {
                const annotation = annotations[i];
                if (annotation.deleted) {
                    continue;
                }
                let renderResult;
                if (!this._rendered.has(annotation)) {
                    annotation.onPointerDownAction = (e) => {
                        this._eventService.dispatchEvent(new AnnotSelectionRequestEvent({ annotation }));
                    };
                    annotation.onPointerEnterAction = (e) => {
                        this._eventService.dispatchEvent(new AnnotFocusRequestEvent({ annotation }));
                    };
                    annotation.onPointerLeaveAction = (e) => {
                        this._eventService.dispatchEvent(new AnnotFocusRequestEvent({ annotation: null }));
                    };
                    renderResult = yield annotation.renderAsync(this._imageInfo);
                }
                else {
                    renderResult = annotation.lastRenderResult || (yield annotation.renderAsync(this._imageInfo));
                }
                if (!renderResult) {
                    continue;
                }
                this._rendered.add(annotation);
                this._svg.append(renderResult.controls);
                (_a = this._container) === null || _a === void 0 ? void 0 : _a.append(renderResult.content);
            }
            (_b = this._container) === null || _b === void 0 ? void 0 : _b.append(this._svg);
            return true;
        });
    }
    clear() {
        this._container.innerHTML = "";
        this._svg.innerHTML = "";
    }
}

var __awaiter$4 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class ImageView {
    constructor(eventService, imageInfo, index, previewWidth) {
        this._dimensions = {
            width: 0,
            height: 0,
            previewWidth: 0,
            previewHeight: 0,
            scaledWidth: 0,
            scaledHeight: 0,
        };
        if (!eventService) {
            throw new Error("Event service is not defined");
        }
        if (!imageInfo) {
            throw new Error("Image info is not defined");
        }
        if (isNaN(index)) {
            throw new Error("Index is not defined");
        }
        this.eventService = eventService;
        this.imageInfo = imageInfo;
        this.index = index;
        this._previewWidth = previewWidth;
        this._previewContainer = document.createElement("div");
        this._previewContainer.classList.add("page-preview");
        this._previewContainer.setAttribute("data-page-number", this.index + 1 + "");
        this._viewInnerContainer = document.createElement("div");
        this._viewInnerContainer.classList.add("page");
        this._viewInnerContainer.setAttribute("data-page-number", this.index + "");
        this._viewOuterContainer = document.createElement("div");
        this._viewOuterContainer.classList.add("page-container");
        this._viewOuterContainer.setAttribute("data-page-number", this.index + "");
        this._viewOuterContainer.append(this._viewInnerContainer);
        this.refreshDimensions();
    }
    get previewContainer() {
        return this._previewContainer;
    }
    get viewWrapper() {
        return this._viewOuterContainer;
    }
    get viewContainer() {
        return this._viewInnerContainer;
    }
    set $viewRendered(value) {
        this._viewRendered = value;
        this._viewInnerContainer.setAttribute("data-loaded", value + "");
    }
    get $viewRendered() {
        return this._viewRendered;
    }
    set scale(value) {
        if (this.imageInfo.scale === value) {
            return;
        }
        this.imageInfo.scale = value;
        this.refreshDimensions();
    }
    get scale() {
        return this.imageInfo.scale;
    }
    set $rotation(value) {
        if (this.imageInfo.rotation === value) {
            return;
        }
        this.imageInfo.rotation = value;
        this.refreshDimensions();
    }
    get rotation() {
        return this.imageInfo.rotation;
    }
    get viewValid() {
        return this._dimensionsValid && this.$viewRendered;
    }
    destroy() {
        this._previewContainer.remove();
        this._viewOuterContainer.remove();
    }
    renderPreviewAsync(force = false) {
        return __awaiter$4(this, void 0, void 0, function* () {
            if (!force && this._previewRendered) {
                return;
            }
            const image = yield this.imageInfo.getImageAsync();
            const { x: imgW, y: imgH } = this.imageInfo.dimensions;
            this.refreshDimensions();
            const canvas = this.createPreviewCanvas();
            const ctx = canvas.getContext("2d");
            if (image) {
                ctx.drawImage(image, 0, 0, imgW, imgH, 0, 0, canvas.width, canvas.height);
            }
            this._previewContainer.innerHTML = "";
            this._previewContainer.append(canvas);
            this._previewRendered = true;
        });
    }
    renderViewAsync(force = false) {
        var _a;
        return __awaiter$4(this, void 0, void 0, function* () {
            if (!force && this.viewValid) {
                return;
            }
            const image = yield this.imageInfo.getImageAsync();
            const { x: imgW, y: imgH } = this.imageInfo.dimensions;
            this.refreshDimensions();
            const canvas = this.createViewCanvas();
            const ctx = canvas.getContext("2d");
            if (image) {
                ctx.drawImage(image, 0, 0, imgW, imgH, 0, 0, canvas.width, canvas.height);
            }
            (_a = this._viewCanvas) === null || _a === void 0 ? void 0 : _a.remove();
            this._viewInnerContainer.append(canvas);
            this._viewCanvas = canvas;
            this.$viewRendered = true;
            if (!this._annotationView) {
                this._annotationView = new ImageAnnotationView(this.eventService, this.imageInfo);
            }
            yield this._annotationView.appendAsync(this.viewContainer);
            this._dimensionsValid = true;
        });
    }
    clearPreview() {
        this._previewContainer.innerHTML = "";
        this._previewRendered = false;
    }
    clearView() {
        var _a, _b;
        (_a = this._annotationView) === null || _a === void 0 ? void 0 : _a.destroy();
        this._annotationView = null;
        (_b = this._viewCanvas) === null || _b === void 0 ? void 0 : _b.remove();
        this.$viewRendered = false;
    }
    rotateClockwise() {
        if (this.rotation === 270) {
            this.$rotation = 0;
        }
        else {
            this.$rotation = (this.rotation || 0) + 90;
        }
    }
    rotateCounterClockwise() {
        if (!this.rotation) {
            this.$rotation = 270;
        }
        else {
            this.$rotation = this.rotation - 90;
        }
    }
    bakeAnnotationsAsync() {
        return __awaiter$4(this, void 0, void 0, function* () {
            const tempCanvas = document.createElement("canvas");
            const { x, y } = this.imageInfo.dimensions;
            tempCanvas.width = x;
            tempCanvas.height = y;
            const tempCtx = tempCanvas.getContext("2d");
            const image = yield this.imageInfo.getImageAsync();
            if (image) {
                tempCtx.drawImage(image, 0, 0, x, y, 0, 0, x, y);
            }
            for (const annot of this.imageInfo.annotations || []) {
                if (annot.deleted) {
                    continue;
                }
                const annotImages = yield annot.toImageAsync();
                for (const annotImage of annotImages) {
                    tempCtx.drawImage(annotImage, 0, 0);
                }
            }
            const result = yield new Promise((resolve, reject) => {
                tempCanvas.toBlob((blob) => {
                    resolve(blob);
                }, "image/png", 0.7);
            });
            return result;
        });
    }
    getImageCoordsUnderPointer(clientX, clientY) {
        const { left: pxMin, top: pyMin, width: pw, height: ph } = this.viewContainer.getBoundingClientRect();
        const pxMax = pxMin + pw;
        const pyMax = pyMin + ph;
        if ((clientX < pxMin || clientX > pxMax)
            || (clientY < pyMin || clientY > pyMax)) {
            return null;
        }
        let x;
        let y;
        const scale = this.scale;
        const rotation = this.rotation;
        switch (rotation) {
            case 0:
                x = (clientX - pxMin) / scale;
                y = (clientY - pyMin) / scale;
                break;
            case 90:
                x = (clientY - pyMin) / scale;
                y = (pxMax - clientX) / scale;
                break;
            case 180:
                x = (pxMax - clientX) / scale;
                y = (pyMax - clientY) / scale;
                break;
            case 270:
                x = (pyMax - clientY) / scale;
                y = (clientX - pxMin) / scale;
                break;
            default:
                throw new Error(`Invalid rotation degree: ${rotation}`);
        }
        return {
            info: this.imageInfo,
            x,
            y,
        };
    }
    createPreviewCanvas() {
        const canvas = document.createElement("canvas");
        canvas.classList.add("page-canvas");
        const dpr = window.devicePixelRatio;
        const { previewWidth: width, previewHeight: height } = this._dimensions;
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        return canvas;
    }
    createViewCanvas() {
        const canvas = document.createElement("canvas");
        canvas.classList.add("page-canvas");
        canvas.style.width = this._dimensions.scaledWidth + "px";
        canvas.style.height = this._dimensions.scaledHeight + "px";
        canvas.width = this._dimensions.width;
        canvas.height = this._dimensions.height;
        return canvas;
    }
    refreshDimensions() {
        var _a;
        const { x: width, y: height } = this.imageInfo.dimensions;
        const previewWidth = Math.max((_a = this._previewWidth) !== null && _a !== void 0 ? _a : 0, 50);
        const previewHeight = previewWidth * (height / width);
        this._dimensions.width = width;
        this._dimensions.height = height;
        this._dimensions.previewWidth = previewWidth;
        this._dimensions.previewHeight = previewHeight;
        this._previewContainer.style.width = this._dimensions.previewWidth + "px";
        this._previewContainer.style.height = this._dimensions.previewHeight + "px";
        this._dimensions.scaledWidth = this._dimensions.width * this.scale;
        this._dimensions.scaledHeight = this._dimensions.height * this.scale;
        const w = this._dimensions.scaledWidth + "px";
        const h = this._dimensions.scaledHeight + "px";
        if (this._viewCanvas) {
            this._viewCanvas.style.width = w;
            this._viewCanvas.style.height = h;
        }
        this._viewInnerContainer.style.width = w;
        this._viewInnerContainer.style.height = h;
        switch (this.rotation) {
            case 0:
                this._viewOuterContainer.style.width = w;
                this._viewOuterContainer.style.height = h;
                this._viewInnerContainer.style.transform = "";
                break;
            case 90:
                this._viewOuterContainer.style.width = h;
                this._viewOuterContainer.style.height = w;
                this._viewInnerContainer.style.transform = "rotate(90deg) translateY(-100%)";
                break;
            case 180:
                this._viewOuterContainer.style.width = w;
                this._viewOuterContainer.style.height = h;
                this._viewInnerContainer.style.transform = "rotate(180deg) translateX(-100%) translateY(-100%)";
                break;
            case 270:
                this._viewOuterContainer.style.width = h;
                this._viewOuterContainer.style.height = w;
                this._viewInnerContainer.style.transform = "rotate(270deg) translateX(-100%)";
                break;
            default:
                throw new Error(`Invalid rotation degree: ${this.rotation}`);
        }
        this._dimensionsValid = false;
    }
}

var __awaiter$3 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class ImageService {
    constructor(eventService, options) {
        var _a;
        this._imageViews = [];
        this._lastCommands = [];
        this.onSelectionRequest = (e) => {
            var _a;
            if ((_a = e.detail) === null || _a === void 0 ? void 0 : _a.annotation) {
                this.setSelectedAnnotation(e.detail.annotation);
            }
            else {
                this.setSelectedAnnotation(null);
            }
        };
        this.onFocusRequest = (e) => {
            var _a;
            if ((_a = e.detail) === null || _a === void 0 ? void 0 : _a.annotation) {
                this.setFocusedAnnotation(e.detail.annotation);
            }
            else {
                this.setFocusedAnnotation(null);
            }
        };
        this.onEditRequest = (e) => {
            var _a;
            if ((_a = e.detail) === null || _a === void 0 ? void 0 : _a.annotation) {
                this.setFocusedAnnotation(e.detail.annotation);
            }
            else {
                this.setFocusedAnnotation(null);
            }
            const { annotation, undoAction } = e.detail;
            if (!annotation.imageUuid) {
                return;
            }
            if (undoAction) {
                this.pushCommand({ timestamp: Date.now(), undo: undoAction });
            }
            this._eventService.dispatchEvent(new AnnotEvent({
                type: "edit",
                annotations: [annotation.toDto()],
            }));
        };
        if (!eventService) {
            throw new Error("Event service is not defined");
        }
        this._eventService = eventService;
        this._userName = (options === null || options === void 0 ? void 0 : options.userName) || "guest";
        this._previewWidth = (options === null || options === void 0 ? void 0 : options.previewWidth) || 100;
        this._lazyLoadImages = (_a = options === null || options === void 0 ? void 0 : options.lazyLoadImages) !== null && _a !== void 0 ? _a : true;
        this._eventService.addListener(annotSelectionRequestEvent, this.onSelectionRequest);
        this._eventService.addListener(annotFocusRequestEvent, this.onFocusRequest);
        this._eventService.addListener(annotEditRequestEvent, this.onEditRequest);
    }
    get eventService() {
        return this._eventService;
    }
    get userName() {
        return this._userName;
    }
    get imageViews() {
        return this._imageViews;
    }
    get imageCount() {
        return this._imageViews.length;
    }
    get currentImageView() {
        return this._currentImageView;
    }
    get focusedAnnotation() {
        return this._focusedAnnotation;
    }
    get selectedAnnotation() {
        return this._selectedAnnotation;
    }
    get scale() {
        var _a;
        return ((_a = this._imageViews[0]) === null || _a === void 0 ? void 0 : _a.scale) || 1;
    }
    set scale(value) {
        if (!value || isNaN(value)) {
            value = 1;
        }
        this._imageViews.forEach(x => x.scale = value);
        this._eventService.dispatchEvent(new ScaleChangedEvent({ scale: value }));
    }
    destroy() {
        var _a;
        this._eventService.removeListener(annotSelectionRequestEvent, this.onSelectionRequest);
        this._eventService.removeListener(annotFocusRequestEvent, this.onFocusRequest);
        this._eventService.removeListener(annotEditRequestEvent, this.onEditRequest);
        (_a = this._imageViews) === null || _a === void 0 ? void 0 : _a.forEach(x => x.destroy());
    }
    undoAsync() {
        return __awaiter$3(this, void 0, void 0, function* () {
            yield this.undoCommandAsync();
            this.setSelectedAnnotation(null);
            this.setFocusedAnnotation(null);
        });
    }
    addImagesAsync(loadInfos) {
        var _a;
        return __awaiter$3(this, void 0, void 0, function* () {
            if (!(loadInfos === null || loadInfos === void 0 ? void 0 : loadInfos.length)) {
                return;
            }
            for (const info of loadInfos) {
                if (!info || !info.type || !info.data) {
                    console.log("Empty image load info");
                    continue;
                }
                let imageSource;
                let imageUrl;
                switch (info.type) {
                    case "URL":
                        if (typeof info.data !== "string") {
                            throw new Error(`Invalid data type: ${typeof info.data} (must be string)`);
                        }
                        if (this._lazyLoadImages) {
                            imageSource = info.data;
                        }
                        else {
                            imageSource = yield DomUtils.loadImageAsync(info.data);
                        }
                        break;
                    case "Base64":
                        if (typeof info.data !== "string") {
                            throw new Error(`Invalid data type: ${typeof info.data} (must be string)`);
                        }
                        imageSource = yield DomUtils.loadImageAsync(info.data);
                        break;
                    case "Blob":
                        if (!(info.data instanceof Blob)) {
                            throw new Error("Invalid data type: must be Blob");
                        }
                        imageUrl = URL.createObjectURL(info.data);
                        imageSource = yield DomUtils.loadImageAsync(imageUrl, true);
                        break;
                    case "ByteArray":
                        if (!(info.data instanceof Uint8Array)) {
                            throw new Error("Invalid data type: must be Uint8Array");
                        }
                        if (!((_a = info.data) === null || _a === void 0 ? void 0 : _a.length)) {
                            console.log("Empty image load byte data");
                            continue;
                        }
                        const blob = new Blob([info.data], {
                            type: "application/octet-binary",
                        });
                        imageUrl = URL.createObjectURL(blob);
                        imageSource = yield DomUtils.loadImageAsync(imageUrl, true);
                        break;
                    default:
                        throw new Error(`Invalid info type: ${info.type}`);
                }
                if (!imageSource) {
                    continue;
                }
                const imageInfo = new ImageInfo(imageSource, info.uuid);
                const view = new ImageView(this._eventService, imageInfo, this._imageViews.length, this._previewWidth);
                this._imageViews.push(view);
            }
            this._eventService.dispatchEvent(new ImageEvent({
                type: "open",
                imageViews: [...this._imageViews],
            }));
            if (!this._currentImageView) {
                this.setImageAtIndexAsCurrent(0);
            }
        });
    }
    clearImages() {
        this.setSelectedAnnotation(null);
        this._currentImageView = null;
        this._imageViews.forEach(x => x.destroy());
        this._eventService.dispatchEvent(new ImageEvent({
            type: "close",
            imageViews: [...this._imageViews],
        }));
        this._imageViews.length = 0;
    }
    getImage(index) {
        return this._imageViews[index];
    }
    setImageAtIndexAsCurrent(index) {
        var _a;
        const imageView = this._imageViews[index];
        if (!imageView || imageView === this._currentImageView) {
            return;
        }
        (_a = this._currentImageView) === null || _a === void 0 ? void 0 : _a.previewContainer.classList.remove("current");
        this._currentImageView = imageView;
        this._currentImageView.previewContainer.classList.add("current");
        this._eventService.dispatchEvent(new ImageEvent({
            type: "select",
            imageViews: [this._currentImageView],
        }));
    }
    setPreviousImageAsCurrent() {
        this.setImageAtIndexAsCurrent(this._currentImageView.index - 1);
    }
    setNextImageAsCurrent() {
        this.setImageAtIndexAsCurrent(this._currentImageView.index + 1);
    }
    appendAnnotationToImage(imageUuid, annotation) {
        this.appendAnnotation(imageUuid, annotation, true);
    }
    appendSerializedAnnotations(dtos) {
        let annotation;
        for (const dto of dtos) {
            switch (dto.annotationType) {
                case "pen":
                    annotation = new PenAnnotation(this._eventService, dto);
                    break;
                default:
                    throw new Error(`Unsupported annotation type: ${dto.annotationType}`);
            }
            this.appendAnnotationToImage(dto.imageUuid, annotation);
        }
    }
    deleteAnnotation(annotation) {
        this.removeAnnotation(annotation, true);
    }
    deleteSelectedAnnotation() {
        const annotation = this._selectedAnnotation;
        if (annotation) {
            this.removeAnnotation(annotation, true);
        }
    }
    serializeAnnotations(imageUuid) {
        var _a, _b, _c, _d, _e;
        const dtos = [];
        if (imageUuid) {
            for (const imageView of this._imageViews) {
                if (((_a = imageView.imageInfo) === null || _a === void 0 ? void 0 : _a.uuid) === imageUuid) {
                    if ((_c = (_b = imageView.imageInfo) === null || _b === void 0 ? void 0 : _b.annotations) === null || _c === void 0 ? void 0 : _c.length) {
                        dtos.push(...imageView.imageInfo.annotations.map(x => x.toDto()));
                    }
                    break;
                }
            }
        }
        else {
            for (const imageView of this._imageViews) {
                if ((_e = (_d = imageView.imageInfo) === null || _d === void 0 ? void 0 : _d.annotations) === null || _e === void 0 ? void 0 : _e.length) {
                    dtos.push(...imageView.imageInfo.annotations.map(x => x.toDto()));
                }
            }
        }
        return dtos;
    }
    setSelectedAnnotation(annotation) {
        var _a, _b, _c;
        if (annotation === this._selectedAnnotation) {
            return;
        }
        if (this._selectedAnnotation) {
            this._selectedAnnotation.translationEnabled = false;
            const oldSelectedSvg = (_b = (_a = this._selectedAnnotation) === null || _a === void 0 ? void 0 : _a.lastRenderResult) === null || _b === void 0 ? void 0 : _b.controls;
            oldSelectedSvg === null || oldSelectedSvg === void 0 ? void 0 : oldSelectedSvg.classList.remove("selected");
        }
        const newSelectedSvg = (_c = annotation === null || annotation === void 0 ? void 0 : annotation.lastRenderResult) === null || _c === void 0 ? void 0 : _c.controls;
        if (!newSelectedSvg) {
            this._selectedAnnotation = null;
        }
        else {
            annotation.translationEnabled = true;
            newSelectedSvg.classList.add("selected");
            this._selectedAnnotation = annotation;
        }
        this._eventService.dispatchEvent(new AnnotEvent({
            type: "select",
            annotations: this._selectedAnnotation
                ? [this._selectedAnnotation.toDto()]
                : [],
        }));
        return this._selectedAnnotation;
    }
    setFocusedAnnotation(annotation) {
        var _a, _b, _c;
        if (annotation === this._focusedAnnotation) {
            return;
        }
        if (this._focusedAnnotation) {
            this._focusedAnnotation.translationEnabled = false;
            const oldFocusedSvg = (_b = (_a = this._focusedAnnotation) === null || _a === void 0 ? void 0 : _a.lastRenderResult) === null || _b === void 0 ? void 0 : _b.controls;
            oldFocusedSvg === null || oldFocusedSvg === void 0 ? void 0 : oldFocusedSvg.classList.remove("focused");
        }
        const newFocusedSvg = (_c = annotation === null || annotation === void 0 ? void 0 : annotation.lastRenderResult) === null || _c === void 0 ? void 0 : _c.controls;
        if (!newFocusedSvg) {
            this._focusedAnnotation = null;
        }
        else {
            annotation.translationEnabled = true;
            newFocusedSvg.classList.add("focused");
            this._focusedAnnotation = annotation;
        }
        this._eventService.dispatchEvent(new AnnotEvent({
            type: "focus",
            annotations: this._focusedAnnotation
                ? [this._focusedAnnotation.toDto()]
                : [],
        }));
        return this._focusedAnnotation;
    }
    getSelectedAnnotationTextContent() {
        var _a;
        return (_a = this._selectedAnnotation) === null || _a === void 0 ? void 0 : _a.textContent;
    }
    setSelectedAnnotationTextContentAsync(text) {
        var _a;
        return __awaiter$3(this, void 0, void 0, function* () {
            yield ((_a = this._selectedAnnotation) === null || _a === void 0 ? void 0 : _a.setTextContentAsync(text));
        });
    }
    bakeImageAnnotationsAsync(imageUuid) {
        return __awaiter$3(this, void 0, void 0, function* () {
            const imageView = imageUuid
                ? this._imageViews.find(x => x.imageInfo.uuid === imageUuid)
                : this._currentImageView;
            if (!imageView) {
                return null;
            }
            const blob = imageView.bakeAnnotationsAsync();
            return blob;
        });
    }
    emitRendered(imageViews) {
        this._eventService.dispatchEvent(new ImageEvent({ type: "render", imageViews: imageViews }));
    }
    emitStateChanged() {
        this._eventService.dispatchEvent(new ImageServiceStateChangeEvent({
            undoableCount: this._lastCommands.length,
            scale: this.scale,
        }));
    }
    pushCommand(command) {
        this._lastCommands.push(command);
        this.emitStateChanged();
    }
    undoCommandAsync() {
        return __awaiter$3(this, void 0, void 0, function* () {
            if (!this._lastCommands.length) {
                return;
            }
            const lastCommand = this._lastCommands.pop();
            yield lastCommand.undo();
            this.emitStateChanged();
        });
    }
    appendAnnotation(imageUuid, annotation, undoable) {
        if (!annotation) {
            throw new Error("Annotation is not defined");
        }
        const image = this._imageViews.find(x => x.imageInfo.uuid === imageUuid);
        if (!image) {
            throw new Error(`Image with uuid '${imageUuid}' is not found`);
        }
        if (image.imageInfo.annotations.find(x => x.uuid === annotation.uuid)) {
            throw new Error(`Image already has the annotation with this uuid: '${imageUuid}'`);
        }
        image.imageInfo.annotations.push(annotation);
        annotation.deleted = false;
        annotation.imageUuid = imageUuid;
        if (undoable) {
            this.pushCommand({
                timestamp: Date.now(),
                undo: () => __awaiter$3(this, void 0, void 0, function* () {
                    this.removeAnnotation(annotation, false);
                    if (this.selectedAnnotation === annotation) {
                        this.setSelectedAnnotation(null);
                    }
                })
            });
        }
        this._eventService.dispatchEvent(new AnnotEvent({
            type: "add",
            annotations: [annotation.toDto()],
        }));
    }
    removeAnnotation(annotation, undoable) {
        if (!annotation) {
            return;
        }
        annotation.deleted = true;
        this.setSelectedAnnotation(null);
        if (undoable) {
            this.pushCommand({
                timestamp: Date.now(),
                undo: () => __awaiter$3(this, void 0, void 0, function* () {
                    this.appendAnnotation(annotation.imageUuid, annotation, false);
                })
            });
        }
        this._eventService.dispatchEvent(new AnnotEvent({
            type: "delete",
            annotations: [annotation.toDto()],
        }));
    }
}

var __awaiter$2 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Previewer {
    constructor(imageService, container, options) {
        this._hidden = true;
        this.onImageChange = (event) => __awaiter$2(this, void 0, void 0, function* () {
            var _a;
            if (event.detail.type === "open") {
                (_a = event.detail.imageViews) === null || _a === void 0 ? void 0 : _a.forEach(x => {
                    x.previewContainer.addEventListener("click", this.onPreviewerImageClick);
                    this._container.append(x.previewContainer);
                });
            }
            else if (event.detail.type === "select") {
                this.scrollToPreview(event.detail.imageViews[0].index);
            }
            yield this.renderVisibleAsync();
        });
        this.onPreviewerImageClick = (e) => {
            let target = e.target;
            let imageNumber;
            while (target && !imageNumber) {
                const data = target.dataset["pageNumber"];
                if (data) {
                    imageNumber = +data;
                }
                else {
                    target = target.parentElement;
                }
            }
            if (imageNumber) {
                this._imageService.setImageAtIndexAsCurrent(imageNumber - 1);
            }
        };
        this.onPreviewerScroll = (e) => __awaiter$2(this, void 0, void 0, function* () {
            yield this.renderVisibleAsync();
        });
        if (!imageService) {
            throw new Error("Image service is not defined");
        }
        if (!container) {
            throw new Error("Container is not defined");
        }
        this._imageService = imageService;
        this._container = container;
        this._canvasWidth = (options === null || options === void 0 ? void 0 : options.canvasWidth) || 100;
        this.init();
    }
    get canvasWidth() {
        return this._canvasWidth;
    }
    get hidden() {
        return this._hidden;
    }
    destroy() {
        this._imageService.eventService.removeListener(imageChangeEvent, this.onImageChange);
        this._container.removeEventListener("scroll", this.onPreviewerScroll);
    }
    show() {
        this._hidden = false;
        setTimeout(() => this.renderVisibleAsync(), 1000);
    }
    hide() {
        this._hidden = true;
    }
    init() {
        this._container.addEventListener("scroll", this.onPreviewerScroll);
        this._imageService.eventService.addListener(imageChangeEvent, this.onImageChange);
    }
    scrollToPreview(imageIndex) {
        if (!this._imageService.imageCount) {
            return;
        }
        const { top: cTop, height: cHeight } = this._container.getBoundingClientRect();
        const { top: pTop, height: pHeight } = this._imageService.getImage(imageIndex)
            .previewContainer.getBoundingClientRect();
        const cCenter = cTop + cHeight / 2;
        const pCenter = pTop + pHeight / 2;
        const scroll = pCenter - cCenter + this._container.scrollTop;
        this._container.scrollTo(0, scroll);
    }
    getVisiblePreviewImages() {
        const images = this._imageService.imageViews;
        const cointainer = this._container;
        const imagesVisible = new Set();
        if (!images.length) {
            return imagesVisible;
        }
        const cRect = cointainer.getBoundingClientRect();
        const cTop = cRect.top;
        const cBottom = cRect.top + cRect.height;
        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const pRect = image.previewContainer.getBoundingClientRect();
            const pTop = pRect.top;
            const pBottom = pRect.top + pRect.height;
            if (pTop < cBottom && pBottom > cTop) {
                imagesVisible.add(i);
            }
            else if (imagesVisible.size) {
                break;
            }
        }
        return imagesVisible;
    }
    renderVisibleAsync() {
        return __awaiter$2(this, void 0, void 0, function* () {
            if (this._hidden) {
                return;
            }
            const images = this._imageService.imageViews;
            const visiblePreviewNumbers = this.getVisiblePreviewImages();
            const minImageNumber = Math.max(Math.min(...visiblePreviewNumbers), 0);
            const maxImageNumber = Math.min(Math.max(...visiblePreviewNumbers), images.length - 1);
            for (let i = 0; i < images.length; i++) {
                const image = images[i];
                if (i >= minImageNumber && i <= maxImageNumber) {
                    yield image.renderPreviewAsync();
                }
            }
        });
    }
}

var __awaiter$1 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const viewerModes = ["hand", "annotation"];
class Viewer {
    constructor(imageService, container, options) {
        this._scale = 1;
        this._pointerInfo = {
            lastPos: null,
            downPos: null,
            downScroll: null,
        };
        this._pinchInfo = {
            active: false,
            lastDist: 0,
            minDist: 10,
            sensitivity: 0.025,
            target: null,
        };
        this.onImageChange = (e) => __awaiter$1(this, void 0, void 0, function* () {
            if (e.detail.type === "select") {
                const selectedImageView = e.detail.imageViews[0];
                yield this.renderImageAsync(selectedImageView);
            }
        });
        this.onPointerMove = (event) => {
            const { clientX, clientY } = event;
            this._pointerInfo.lastPos = new Vec2(clientX, clientY);
        };
        this.onScroll = (e) => {
        };
        this.onPointerDownScroll = (e) => {
            if (this._mode !== "hand") {
                return;
            }
            const { clientX, clientY } = e;
            this._pointerInfo.downPos = new Vec2(clientX, clientY);
            this._pointerInfo.downScroll = new Vec2(this._container.scrollLeft, this._container.scrollTop);
            const onPointerMove = (moveEvent) => {
                const { x, y } = this._pointerInfo.downPos;
                const { x: left, y: top } = this._pointerInfo.downScroll;
                const dX = moveEvent.clientX - x;
                const dY = moveEvent.clientY - y;
                this._container.scrollTo(left - dX, top - dY);
            };
            const onPointerUp = (upEvent) => {
                this._pointerInfo.downPos = null;
                this._pointerInfo.downScroll = null;
                const upTarget = upEvent.target;
                upTarget.removeEventListener("pointermove", onPointerMove);
                upTarget.removeEventListener("pointerup", onPointerUp);
                upTarget.removeEventListener("pointerout", onPointerUp);
                upTarget.releasePointerCapture(upEvent.pointerId);
            };
            const target = e.target;
            target.setPointerCapture(e.pointerId);
            target.addEventListener("pointermove", onPointerMove);
            target.addEventListener("pointerup", onPointerUp);
            target.addEventListener("pointerout", onPointerUp);
        };
        this.onWheelZoom = (event) => {
            if (!event.ctrlKey) {
                return;
            }
            event.preventDefault();
            if (event.deltaY > 0) {
                this.zoomOutCentered(this._pointerInfo.lastPos);
            }
            else {
                this.zoomInCentered(this._pointerInfo.lastPos);
            }
        };
        this.onTouchZoom = (event) => {
            if (event.touches.length !== 2) {
                return;
            }
            const a = event.touches[0];
            const b = event.touches[1];
            this._pinchInfo.active = true;
            this._pinchInfo.lastDist = getDistance2D(a.clientX, a.clientY, b.clientX, b.clientY);
            const onTouchMove = (moveEvent) => {
                if (moveEvent.touches.length !== 2) {
                    return;
                }
                const mA = moveEvent.touches[0];
                const mB = moveEvent.touches[1];
                const dist = getDistance2D(mA.clientX, mA.clientY, mB.clientX, mB.clientY);
                const delta = dist - this._pinchInfo.lastDist;
                const factor = Math.floor(delta / this._pinchInfo.minDist);
                if (factor) {
                    const center = new Vec2((mB.clientX + mA.clientX) / 2, (mB.clientY + mA.clientY) / 2);
                    this._pinchInfo.lastDist = dist;
                    this.zoom(factor * this._pinchInfo.sensitivity, center);
                }
            };
            const onTouchEnd = (endEvent) => {
                this._pinchInfo.active = false;
                this._pinchInfo.lastDist = 0;
                event.target.removeEventListener("touchmove", onTouchMove);
                event.target.removeEventListener("touchend", onTouchEnd);
                event.target.removeEventListener("touchcancel", onTouchEnd);
            };
            event.target.addEventListener("touchmove", onTouchMove);
            event.target.addEventListener("touchend", onTouchEnd);
            event.target.addEventListener("touchcancel", onTouchEnd);
        };
        if (!imageService) {
            throw new Error("Image service is not defined");
        }
        if (!container) {
            throw new Error("Container is not defined");
        }
        this._imageService = imageService;
        this._container = container;
        this._minImageSize = (options === null || options === void 0 ? void 0 : options.minImageSize) || 100;
        this.init();
    }
    get container() {
        return this._container;
    }
    get mode() {
        return this._mode;
    }
    set mode(value) {
        if (this._dialogClose) {
            this._dialogClose();
        }
        if (!value || value === this._mode) {
            return;
        }
        this._mode = value;
    }
    get scale() {
        return this._scale;
    }
    destroy() {
        this._imageService.eventService.removeListener(imageChangeEvent, this.onImageChange);
        this._container.removeEventListener("scroll", this.onScroll);
        this._container.removeEventListener("wheel", this.onWheelZoom);
        this._container.removeEventListener("pointermove", this.onPointerMove);
        this._container.removeEventListener("pointerdown", this.onPointerDownScroll);
        this._container.removeEventListener("touchstart", this.onTouchZoom);
    }
    zoomOut() {
        this.zoomOutCentered();
    }
    zoomIn() {
        this.zoomInCentered();
    }
    zoomFitViewer() {
        const cWidth = this._container.getBoundingClientRect().width;
        const pWidth = this._imageService.currentImageView
            .viewContainer.getBoundingClientRect().width;
        const scale = (cWidth - 20) / pWidth * this._scale;
        if (!scale || scale === Infinity) {
            return;
        }
        this.setScale(scale);
    }
    zoomFitImage() {
        const { width: cWidth, height: cHeight } = this._container.getBoundingClientRect();
        const { width: pWidth, height: pHeight } = this._imageService.currentImageView
            .viewContainer.getBoundingClientRect();
        const hScale = (cWidth - 20) / pWidth * this._scale;
        const vScale = (cHeight - 20) / pHeight * this._scale;
        const scale = Math.min(hScale, vScale);
        if (!scale || scale === Infinity) {
            return;
        }
        this.setScale(scale);
    }
    showTextDialogAsync(initialText) {
        return __awaiter$1(this, void 0, void 0, function* () {
            if (this._dialogClose) {
                return;
            }
            const dialog = DomUtils.htmlToElements(HtmlTemplates.textDialogHtml)[0];
            dialog.style.top = this._container.scrollTop + "px";
            dialog.style.left = this._container.scrollLeft + "px";
            this._container.append(dialog);
            this._container.classList.add("dialog-shown");
            let value = initialText || "";
            const input = dialog.querySelector(".text-input");
            input.placeholder = "Enter text...";
            input.value = value;
            input.addEventListener("change", () => value = input.value);
            const textPromise = new Promise((resolve, reject) => {
                const ok = () => {
                    resolve(value || "");
                };
                const cancel = () => {
                    resolve(null);
                };
                dialog.addEventListener("click", (e) => {
                    if (e.target === dialog) {
                        cancel();
                    }
                });
                dialog.querySelector(".text-ok").addEventListener("click", ok);
                dialog.querySelector(".text-cancel").addEventListener("click", cancel);
                this._dialogClose = () => resolve(null);
            });
            const result = yield textPromise;
            this._dialogClose = null;
            dialog.remove();
            this._container.classList.remove("dialog-shown");
            return result;
        });
    }
    init() {
        this._container.addEventListener("scroll", this.onScroll);
        this._container.addEventListener("wheel", this.onWheelZoom, { passive: false });
        this._container.addEventListener("pointermove", this.onPointerMove);
        this._container.addEventListener("pointerdown", this.onPointerDownScroll);
        this._container.addEventListener("touchstart", this.onTouchZoom);
        this._imageService.eventService.addListener(imageChangeEvent, this.onImageChange);
    }
    renderImageAsync(image) {
        return __awaiter$1(this, void 0, void 0, function* () {
            image.scale = this._scale;
            yield image.renderViewAsync(false);
            this._container.innerHTML = "";
            this._container.append(image.viewWrapper);
            this.zoomFitImage();
            this._imageService.emitRendered([image]);
        });
    }
    setScale(scale, cursorPosition = null) {
        var _a;
        const imageView = (_a = this === null || this === void 0 ? void 0 : this._imageService) === null || _a === void 0 ? void 0 : _a.currentImageView;
        if (!scale || !imageView) {
            return;
        }
        cursorPosition || (cursorPosition = this.getCenterPosition());
        const { x, y } = cursorPosition;
        const { x: imageX, y: imageY, width: imageWidth, height: imageHeight } = imageView.viewContainer.getBoundingClientRect();
        const minScale = this._minImageSize / imageView.imageInfo.dimensions.x;
        if (scale < minScale) {
            scale = minScale;
        }
        if (scale === this._scale) {
            return;
        }
        let imageUnderCursor;
        let xImageRatio;
        let yImageRatio;
        if (imageX <= x
            && imageX + imageWidth >= x
            && imageY <= y
            && imageY + imageHeight >= y) {
            imageUnderCursor = true;
            xImageRatio = (x - imageX) / imageWidth;
            yImageRatio = (y - imageY) / imageHeight;
        }
        this._scale = scale;
        this._imageService.scale = scale;
        this._imageService.emitStateChanged();
        if (imageUnderCursor) {
            const { x: imageScaledX, y: imageScaledY, width: imageScaledWidth, height: imageScaledHeight } = imageView.viewContainer.getBoundingClientRect();
            let scrollLeft;
            let scrollTop;
            if (imageScaledWidth > this._container.clientHeight
                || imageScaledHeight > this._container.clientWidth) {
                const { x: initialX, y: initialY } = cursorPosition;
                const resultX = imageScaledX + (imageScaledWidth * xImageRatio);
                const resultY = imageScaledY + (imageScaledHeight * yImageRatio);
                scrollLeft = this._container.scrollLeft + (resultX - initialX);
                scrollTop = this._container.scrollTop + (resultY - initialY);
                scrollLeft = scrollLeft < 0
                    ? 0
                    : scrollLeft;
                scrollTop = scrollTop < 0
                    ? 0
                    : scrollTop;
            }
            else {
                scrollLeft = 0;
                scrollTop = 0;
            }
            if (scrollTop !== this._container.scrollTop
                || scrollLeft !== this._container.scrollLeft) {
                this._container.scrollTo(scrollLeft, scrollTop);
                return;
            }
        }
    }
    zoom(diff, cursorPosition = null) {
        const scale = this._scale + diff;
        this.setScale(scale, cursorPosition || this.getCenterPosition());
    }
    zoomOutCentered(center = null) {
        this.zoom(-this.getZoomStep(), center);
    }
    zoomInCentered(center = null) {
        this.zoom(this.getZoomStep(), center);
    }
    getCenterPosition() {
        const { x, y, width, height } = this._container.getBoundingClientRect();
        return new Vec2(x + width / 2, y + height / 2);
    }
    getZoomStep() {
        let step = 0;
        if (this._scale < 0.5) {
            step = 0.1;
        }
        else if (this._scale < 1) {
            step = 0.25;
        }
        else if (this._scale < 2) {
            step = 0.5;
        }
        else {
            step = 1;
        }
        return step;
    }
}

var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class TsImageViewer {
    constructor(options) {
        var _a;
        this._timers = {
            hidePanels: 0,
        };
        this.onFileInput = () => {
            const files = this._fileInput.files;
            if (files.length === 0) {
                return;
            }
            const imageLoadInfos = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const imageLoadInfo = {
                    type: "Blob",
                    data: file,
                };
                imageLoadInfos.push(imageLoadInfo);
            }
            this._fileInput.value = null;
            this.openImagesAsync(imageLoadInfos);
        };
        this.onOpenFileButtonClick = () => {
            this._shadowRoot.getElementById("open-file-input").click();
        };
        this.onSaveFileButtonClick = () => __awaiter(this, void 0, void 0, function* () {
            const blob = yield this._imageService.bakeImageAnnotationsAsync();
            if (!blob) {
                return;
            }
            DomUtils.downloadFile(blob, `img_${new Date().toISOString()}.png`);
        });
        this.onCloseFileButtonClick = () => {
            this.closeImages();
        };
        this.onHandModeButtonClick = () => {
            this.setViewerMode("hand");
        };
        this.onAnnotatorModeButtonClick = () => {
            this.setViewerMode("annotation");
        };
        this.onZoomOutClick = () => {
            this._viewer.zoomOut();
        };
        this.onZoomInClick = () => {
            this._viewer.zoomIn();
        };
        this.onZoomFitViewerClick = () => {
            this._viewer.zoomFitViewer();
        };
        this.onZoomFitImageClick = () => {
            this._viewer.zoomFitImage();
        };
        this.onRotateCounterClockwiseClick = () => {
            var _a;
            (_a = this._imageService.currentImageView) === null || _a === void 0 ? void 0 : _a.rotateCounterClockwise();
            this.setAnnotatorMode(this._annotatorService.mode);
        };
        this.onRotateClockwiseClick = () => {
            var _a;
            (_a = this._imageService.currentImageView) === null || _a === void 0 ? void 0 : _a.rotateClockwise();
            this.setAnnotatorMode(this._annotatorService.mode);
        };
        this.onPaginatorPrevClick = () => {
            this._imageService.setPreviousImageAsCurrent();
        };
        this.onPaginatorNextClick = () => {
            this._imageService.setNextImageAsCurrent();
        };
        this.annotatorUndo = () => {
            var _a;
            (_a = this._annotatorService.annotator) === null || _a === void 0 ? void 0 : _a.undo();
        };
        this.annotatorClear = () => {
            var _a;
            (_a = this._annotatorService.annotator) === null || _a === void 0 ? void 0 : _a.clear();
        };
        this.annotatorSave = () => {
            var _a;
            (_a = this._annotatorService.annotator) === null || _a === void 0 ? void 0 : _a.saveAnnotationAsync();
        };
        this.onCustomStampChanged = (e) => {
            this.setAnnotatorMode("stamp");
            if (this._customStampChangeCallback) {
                this._customStampChangeCallback(e.detail);
            }
        };
        this.onAnnotatorChange = (e) => __awaiter(this, void 0, void 0, function* () {
            if (!e.detail) {
                return;
            }
            const annotations = e.detail.annotations;
            switch (e.detail.type) {
                case "focus":
                    if (annotations === null || annotations === void 0 ? void 0 : annotations.length) {
                        this._mainContainer.classList.add("annotation-focused");
                    }
                    else {
                        this._mainContainer.classList.remove("annotation-focused");
                    }
                    const annotation = annotations[0];
                    if (annotation) {
                        this._shadowRoot.querySelector("#focused-annotation-author")
                            .textContent = annotation.author || "";
                        this._shadowRoot.querySelector("#focused-annotation-date")
                            .textContent = new Date(annotation.dateModified || annotation.dateCreated).toDateString();
                        this._shadowRoot.querySelector("#focused-annotation-text")
                            .textContent = annotation.textContent || "";
                    }
                    else {
                        this._shadowRoot.querySelector("#focused-annotation-author")
                            .textContent = "";
                        this._shadowRoot.querySelector("#focused-annotation-date")
                            .textContent = "";
                        this._shadowRoot.querySelector("#focused-annotation-text")
                            .textContent = "";
                    }
                    break;
                case "select":
                    if (annotations === null || annotations === void 0 ? void 0 : annotations.length) {
                        this._mainContainer.classList.add("annotation-selected");
                        this._mainContainer.classList.add("annotation-focused");
                    }
                    else {
                        this._mainContainer.classList.remove("annotation-selected");
                        this._mainContainer.classList.remove("annotation-focused");
                    }
                    break;
                case "add":
                case "delete":
                case "render":
                    if (annotations === null || annotations === void 0 ? void 0 : annotations.length) {
                        const imageUuidSet = new Set(annotations.map(x => x.imageUuid));
                        if (this._imageService.currentImageView
                            && imageUuidSet.has(this._imageService.currentImageView.imageInfo.uuid)) {
                            yield this._imageService.currentImageView.renderViewAsync(true);
                        }
                    }
                    break;
            }
            if (this._annotChangeCallback) {
                this._annotChangeCallback(e.detail);
            }
        });
        this.onAnnotatorDataChanged = (event) => {
            annotatorTypes.forEach(x => {
                this._mainContainer.classList.remove(x + "-annotator-data-saveable");
                this._mainContainer.classList.remove(x + "-annotator-data-undoable");
                this._mainContainer.classList.remove(x + "-annotator-data-clearable");
            });
            if (event.detail.saveable) {
                this._mainContainer.classList.add(event.detail.annotatorType + "-annotator-data-saveable");
            }
            if (event.detail.undoable) {
                this._mainContainer.classList.add(event.detail.annotatorType + "-annotator-data-undoable");
            }
            if (event.detail.clearable) {
                this._mainContainer.classList.add(event.detail.annotatorType + "-annotator-data-clearable");
            }
        };
        this.onAnnotatorEditTextButtonClick = () => __awaiter(this, void 0, void 0, function* () {
            var _b, _c;
            const initialText = (_b = this._imageService) === null || _b === void 0 ? void 0 : _b.getSelectedAnnotationTextContent();
            const text = yield this._viewer.showTextDialogAsync(initialText);
            if (text === null) {
                return;
            }
            yield ((_c = this._imageService) === null || _c === void 0 ? void 0 : _c.setSelectedAnnotationTextContentAsync(text));
        });
        this.onAnnotatorDeleteButtonClick = () => {
            var _a;
            (_a = this._imageService) === null || _a === void 0 ? void 0 : _a.deleteSelectedAnnotation();
        };
        this.onAnnotatorSelectModeButtonClick = () => {
            this.setAnnotatorMode("select");
        };
        this.onAnnotatorStampModeButtonClick = () => {
            this.setAnnotatorMode("stamp");
        };
        this.onAnnotatorPenModeButtonClick = () => {
            this.setAnnotatorMode("pen");
        };
        this.onAnnotatorGeometricModeButtonClick = () => {
            this.setAnnotatorMode("geometric");
        };
        this.onAnnotatorTextModeButtonClick = () => {
            this.setAnnotatorMode("text");
        };
        this.imageServiceUndo = () => {
            var _a;
            (_a = this._imageService) === null || _a === void 0 ? void 0 : _a.undoAsync();
        };
        this.onImageChange = (e) => {
            if (e.detail.type === "open"
                || e.detail.type === "close") {
                setTimeout(() => this.refreshImages(), 0);
            }
            else if (e.detail.type === "select") {
                setTimeout(() => this.setAnnotatorMode(this._annotatorService.mode), 0);
            }
        };
        this.onImageServiceStateChange = (e) => {
            if (e.detail.undoableCount) {
                this._mainContainer.classList.add("undoable-commands");
            }
            else {
                this._mainContainer.classList.remove("undoable-commands");
            }
        };
        this.onPreviewerToggleClick = () => {
            this.showPreviewer(this._previewer.hidden);
        };
        this.onMainContainerPointerMove = (event) => {
            const { clientX, clientY } = event;
            const { x: rectX, y: rectY, width, height } = this._mainContainer.getBoundingClientRect();
            const l = clientX - rectX;
            const t = clientY - rectY;
            const r = width - l;
            const b = height - t;
            if (Math.min(l, r, t, b) > 150) {
                if (!this._panelsHidden && !this._timers.hidePanels) {
                    this._timers.hidePanels = setTimeout(() => {
                        if (!this._imageService.currentImageView) {
                            return;
                        }
                        this._mainContainer.classList.add("hide-panels");
                        this._panelsHidden = true;
                        this._timers.hidePanels = null;
                    }, 5000);
                }
            }
            else {
                if (this._timers.hidePanels) {
                    clearTimeout(this._timers.hidePanels);
                    this._timers.hidePanels = null;
                }
                if (this._panelsHidden) {
                    this._mainContainer.classList.remove("hide-panels");
                    this._panelsHidden = false;
                }
            }
        };
        if (!options) {
            throw new Error("No options provided");
        }
        const container = document.querySelector(options.containerSelector);
        if (!container) {
            throw new Error("Container not found");
        }
        else if (!(container instanceof HTMLDivElement)) {
            throw new Error("Container is not a DIV element");
        }
        else {
            this._outerContainer = container;
        }
        this._userName = options.userName || "guest";
        this._fileOpenAction = options.fileOpenAction;
        this._fileSaveAction = options.fileSaveAction;
        this._fileCloseAction = options.fileCloseAction;
        this._annotChangeCallback = options.annotChangeCallback;
        this._customStampChangeCallback = options.customStampChangeCallback;
        const lazyLoadImages = (_a = options.lazyLoadImages) !== null && _a !== void 0 ? _a : true;
        const previewWidth = options.previewWidth || 100;
        this._shadowRoot = this._outerContainer.attachShadow({ mode: "open" });
        this._shadowRoot.innerHTML = styles + mainHtml;
        this._mainContainer = this._shadowRoot.querySelector("div#main-container");
        this._eventService = new EventService(this._mainContainer);
        this._imageService = new ImageService(this._eventService, {
            lazyLoadImages: lazyLoadImages,
            previewWidth: previewWidth,
            userName: this._userName,
        });
        this._customStampsService = new CustomStampService(this._mainContainer, this._eventService);
        this._loader = new Loader();
        this._previewer = new Previewer(this._imageService, this._shadowRoot.querySelector("#previewer"), { canvasWidth: previewWidth });
        this._viewer = new Viewer(this._imageService, this._shadowRoot.querySelector("#viewer"));
        this._viewer.container.addEventListener("contextmenu", e => e.preventDefault());
        this._annotatorService = new AnnotatorService(this._imageService, this._customStampsService, this._viewer);
        this.initMainContainerEventHandlers();
        this.initViewControls();
        this.initFileButtons(options.fileButtons || []);
        this.initModeSwitchButtons();
        this.initAnnotationButtons();
        this._eventService.addListener(imageChangeEvent, this.onImageChange);
        this._eventService.addListener(imageServiceStateChangeEvent, this.onImageServiceStateChange);
        this._eventService.addListener(annotChangeEvent, this.onAnnotatorChange);
        this._eventService.addListener(annotatorDataChangeEvent, this.onAnnotatorDataChanged);
        this._eventService.addListener(customStampEvent, this.onCustomStampChanged);
    }
    destroy() {
        var _a, _b;
        this._annotChangeCallback = null;
        this._customStampChangeCallback = null;
        this._eventService.removeListener(customStampEvent, this.onCustomStampChanged);
        this._eventService.removeListener(annotatorDataChangeEvent, this.onAnnotatorDataChanged);
        this._eventService.removeListener(annotChangeEvent, this.onAnnotatorChange);
        this._eventService.removeListener(imageServiceStateChangeEvent, this.onImageServiceStateChange);
        this._eventService.removeListener(imageChangeEvent, this.onImageChange);
        (_a = this._mainContainerRObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
        (_b = this._annotatorService) === null || _b === void 0 ? void 0 : _b.destroy();
        this._viewer.destroy();
        this._previewer.destroy();
        this._imageService.destroy();
        this._customStampsService.destroy();
        this._eventService.destroy();
        this._shadowRoot.innerHTML = "";
    }
    openImagesAsync(loadInfos) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._imageService.addImagesAsync(loadInfos);
            }
            catch (e) {
                throw new Error(`Cannot load file data: ${e.message}`);
            }
        });
    }
    closeImages() {
        this._imageService.clearImages();
    }
    importAnnotations(dtos) {
        try {
            this._imageService.appendSerializedAnnotations(dtos);
        }
        catch (e) {
            console.log(`Error while importing annotations: ${e.message}`);
        }
    }
    importAnnotationsFromJson(json) {
        try {
            const dtos = JSON.parse(json);
            this._imageService.appendSerializedAnnotations(dtos);
        }
        catch (e) {
            console.log(`Error while importing annotations: ${e.message}`);
        }
    }
    exportAnnotations(imageUuid) {
        const dtos = this._imageService.serializeAnnotations(imageUuid);
        return dtos;
    }
    exportAnnotationsToJson(imageUuid) {
        const dtos = this._imageService.serializeAnnotations(imageUuid);
        return JSON.stringify(dtos);
    }
    importCustomStamps(customStamps) {
        try {
            this._customStampsService.importCustomStamps(customStamps);
        }
        catch (e) {
            console.log(`Error while importing custom stamps: ${e.message}`);
        }
    }
    importCustomStampsFromJson(json) {
        try {
            const customStamps = JSON.parse(json);
            this._customStampsService.importCustomStamps(customStamps);
        }
        catch (e) {
            console.log(`Error while importing custom stamps: ${e.message}`);
        }
    }
    exportCustomStamps() {
        const customStamps = this._customStampsService.getCustomStamps();
        return customStamps;
    }
    exportCustomStampsToJson() {
        const customStamps = this._customStampsService.getCustomStamps();
        return JSON.stringify(customStamps);
    }
    initMainContainerEventHandlers() {
        const mcResizeObserver = new ResizeObserver((entries) => {
            const { width } = this._mainContainer.getBoundingClientRect();
            if (width < 721) {
                this._mainContainer.classList.add("mobile");
            }
            else {
                this._mainContainer.classList.remove("mobile");
            }
            if (width < 400) {
                this._mainContainer.classList.add("compact");
            }
            else {
                this._mainContainer.classList.remove("compact");
            }
        });
        mcResizeObserver.observe(this._mainContainer);
        this._mainContainerRObserver = mcResizeObserver;
        this._mainContainer.addEventListener("pointermove", this.onMainContainerPointerMove);
    }
    initViewControls() {
        this._shadowRoot.querySelector("#paginator-prev")
            .addEventListener("click", this.onPaginatorPrevClick);
        this._shadowRoot.querySelector("#paginator-next")
            .addEventListener("click", this.onPaginatorNextClick);
        this._shadowRoot.querySelector("#rotate-counterclockwise")
            .addEventListener("click", this.onRotateCounterClockwiseClick);
        this._shadowRoot.querySelector("#rotate-clockwise")
            .addEventListener("click", this.onRotateClockwiseClick);
        this._shadowRoot.querySelector("#zoom-out")
            .addEventListener("click", this.onZoomOutClick);
        this._shadowRoot.querySelector("#zoom-in")
            .addEventListener("click", this.onZoomInClick);
        this._shadowRoot.querySelector("#zoom-fit-viewer")
            .addEventListener("click", this.onZoomFitViewerClick);
        this._shadowRoot.querySelector("#zoom-fit-page")
            .addEventListener("click", this.onZoomFitImageClick);
        this._shadowRoot.querySelector("#toggle-previewer")
            .addEventListener("click", this.onPreviewerToggleClick);
    }
    initFileButtons(fileButtons) {
        const openButton = this._shadowRoot.querySelector("#button-open-file");
        const saveButton = this._shadowRoot.querySelector("#button-save-file");
        const closeButton = this._shadowRoot.querySelector("#button-close-file");
        if (fileButtons.includes("open")) {
            this._fileInput = this._shadowRoot.getElementById("open-file-input");
            this._fileInput.addEventListener("change", this.onFileInput);
            openButton.addEventListener("click", this._fileOpenAction || this.onOpenFileButtonClick);
        }
        else {
            openButton.remove();
        }
        if (fileButtons.includes("save")) {
            saveButton.addEventListener("click", this._fileSaveAction || this.onSaveFileButtonClick);
        }
        else {
            saveButton.remove();
        }
        if (fileButtons.includes("close")) {
            closeButton.addEventListener("click", this._fileCloseAction || this.onCloseFileButtonClick);
        }
        else {
            closeButton.remove();
        }
    }
    initModeSwitchButtons() {
        this._shadowRoot.querySelector("#button-mode-hand")
            .addEventListener("click", this.onHandModeButtonClick);
        this._shadowRoot.querySelector("#button-mode-annotation")
            .addEventListener("click", this.onAnnotatorModeButtonClick);
        this.setViewerMode("hand");
    }
    initAnnotationButtons() {
        this._shadowRoot.querySelector("#button-annotation-mode-select")
            .addEventListener("click", this.onAnnotatorSelectModeButtonClick);
        this._shadowRoot.querySelector("#button-annotation-mode-stamp")
            .addEventListener("click", this.onAnnotatorStampModeButtonClick);
        this._shadowRoot.querySelector("#button-annotation-mode-pen")
            .addEventListener("click", this.onAnnotatorPenModeButtonClick);
        this._shadowRoot.querySelector("#button-annotation-mode-geometric")
            .addEventListener("click", this.onAnnotatorGeometricModeButtonClick);
        this._shadowRoot.querySelector("#button-annotation-mode-text")
            .addEventListener("click", this.onAnnotatorTextModeButtonClick);
        this._shadowRoot.querySelector("#button-annotation-edit-text")
            .addEventListener("click", this.onAnnotatorEditTextButtonClick);
        this._shadowRoot.querySelector("#button-annotation-delete")
            .addEventListener("click", this.onAnnotatorDeleteButtonClick);
        this._shadowRoot.querySelector("#button-annotation-stamp-undo")
            .addEventListener("click", this.annotatorUndo);
        this._shadowRoot.querySelector("#button-annotation-stamp-clear")
            .addEventListener("click", this.annotatorClear);
        this._shadowRoot.querySelector("#button-annotation-pen-undo")
            .addEventListener("click", this.annotatorUndo);
        this._shadowRoot.querySelector("#button-annotation-pen-clear")
            .addEventListener("click", this.annotatorClear);
        this._shadowRoot.querySelector("#button-annotation-pen-save")
            .addEventListener("click", this.annotatorSave);
        this._shadowRoot.querySelector("#button-annotation-geometric-undo")
            .addEventListener("click", this.annotatorUndo);
        this._shadowRoot.querySelector("#button-annotation-geometric-clear")
            .addEventListener("click", this.annotatorClear);
        this._shadowRoot.querySelector("#button-annotation-geometric-save")
            .addEventListener("click", this.annotatorSave);
        this._shadowRoot.querySelector("#button-annotation-text-undo")
            .addEventListener("click", this.annotatorUndo);
        this._shadowRoot.querySelector("#button-annotation-text-clear")
            .addEventListener("click", this.annotatorClear);
        this._shadowRoot.querySelector("#button-annotation-text-save")
            .addEventListener("click", this.annotatorSave);
        this._shadowRoot.querySelector("#button-command-undo")
            .addEventListener("click", this.imageServiceUndo);
    }
    setViewerMode(mode) {
        mode = mode || "hand";
        viewerModes.forEach(x => {
            this._mainContainer.classList.remove("mode-" + x);
            this._shadowRoot.querySelector("#button-mode-" + x).classList.remove("on");
        });
        this.setAnnotatorMode("select");
        this._mainContainer.classList.add("mode-" + mode);
        this._shadowRoot.querySelector("#button-mode-" + mode).classList.add("on");
        this._viewer.mode = mode;
    }
    setAnnotatorMode(mode) {
        var _a, _b;
        if (!this._annotatorService || !mode) {
            return;
        }
        const prevMode = this._annotatorService.mode;
        (_a = this._shadowRoot.querySelector(`#button-annotation-mode-${prevMode}`)) === null || _a === void 0 ? void 0 : _a.classList.remove("on");
        (_b = this._shadowRoot.querySelector(`#button-annotation-mode-${mode}`)) === null || _b === void 0 ? void 0 : _b.classList.add("on");
        this._annotatorService.mode = mode;
    }
    showPreviewer(value) {
        if (value) {
            this._mainContainer.classList.remove("hide-previewer");
            this._shadowRoot.querySelector("div#toggle-previewer").classList.add("on");
            this._previewer.show();
            setTimeout(() => this._viewer.zoomFitImage(), 1000);
        }
        else {
            this._mainContainer.classList.add("hide-previewer");
            this._shadowRoot.querySelector("div#toggle-previewer").classList.remove("on");
            this._previewer.hide();
        }
    }
    refreshImages() {
        const imageCount = this._imageService.imageCount;
        if (!imageCount) {
            this._mainContainer.classList.add("disabled");
            this.setViewerMode("hand");
            this.setAnnotatorMode("select");
            this.showPreviewer(false);
            return;
        }
        this._mainContainer.classList.remove("disabled");
        if (imageCount === 1) {
            this.showPreviewer(false);
            this._shadowRoot.querySelector("#paginator").classList.add("disabled");
        }
        else {
            this.showPreviewer(true);
            this._shadowRoot.querySelector("#paginator").classList.remove("disabled");
        }
    }
}

export { AnnotEvent, TsImageViewer };
