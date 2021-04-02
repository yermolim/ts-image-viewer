/// <reference path="./assets.d.ts" />

import icon_arrow_left from "./icons/arrow-left.png";
import icon_arrow_right from "./icons/arrow-right.png";
import icon_minus from "./icons/minus.png";
import icon_plus from "./icons/plus.png";
import icon_fit_viewer from "./icons/fit-viewer.png";
import icon_fit_image from "./icons/fit-page.png";
import icon_sidebar from "./icons/sidebar.png";
import icon_hand from "./icons/hand.png";
import icon_popup from "./icons/popup.png";
import icon_load from "./icons/load.png";
import icon_download from "./icons/download.png";
import icon_ok from "./icons/ok.png";
import icon_close from "./icons/close.png";
import icon_close2 from "./icons/close2.png";
import icon_back from "./icons/back.png";
import icon_delete from "./icons/delete.png";
import icon_pointer from "./icons/pointer.png";
import icon_pen from "./icons/pen.png";

export const html = /*html*/`
  <div id="main-container" class="hide-previewer disabled" 
    ondragstart="return false;" ondrop="return false;">
    <div id="viewer"></div>
    <div id="previewer"></div>
    <div id="top-panel"> 
      <div class="subpanel panel-item">
        <div id="toggle-previewer" class="panel-button panel-item">
          <img src="${icon_sidebar}"/>
        </div> 
      </div>
      <div id="modes" class="subpanel panel-item">
        <div id="button-mode-hand" class="panel-button panel-item">
          <img src="${icon_hand}"/>
        </div> 
        <div id="button-mode-annotation" class="panel-button panel-item">
          <img src="${icon_popup}"/>
        </div> 
        <div class="panel-v-separator margin-s-5 panel-item"></div>
        <div id="button-open-file" class="panel-button panel-item">
          <img src="${icon_load}"/>
        </div> 
        <div id="button-save-file" class="panel-button panel-item">
          <img src="${icon_download}"/>
        </div> 
        <div id="button-close-file" class="panel-button panel-item">
          <img src="${icon_close2}"/>
        </div> 
      </div>
    </div>
    <div id="bottom-panel">
      <div id="paginator" class="subpanel panel-item">
        <div id="paginator-prev" class="panel-button">
          <img src="${icon_arrow_left}"/>
        </div>
        <div id="paginator-next" class="panel-button">
          <img src="${icon_arrow_right}"/>
        </div>
        <input id="paginator-input" type="text">
        <span>&nbsp/&nbsp</span>
        <span id="paginator-total">0</span>
      </div>
      <div class="panel-v-separator panel-item"></div>
      <div id="zoomer" class="subpanel panel-item">
        <div id="zoom-out" class="panel-button">
          <img src="${icon_minus}"/>
        </div>
        <div id="zoom-in" class="panel-button">
          <img src="${icon_plus}"/>
        </div>
        <div id="zoom-fit-viewer" class="panel-button">
          <img src="${icon_fit_viewer}"/>
        </div>
        <div id="zoom-fit-image" class="panel-button">
          <img src="${icon_fit_image}"/>
        </div>
      </div>
    </div>
    <div id="annotation-panel">
      <div class="annotation-panel-row">
        <div id="button-annotation-delete" 
          class="panel-button annotation-panel-subitem">
          <img src="${icon_close}"/>
        </div> 
        <div id="button-annotation-mode-select" 
          class="panel-button annotation-panel-item">
          <img src="${icon_pointer}"/>
        </div> 
      </div>
      <div class="annotation-panel-row">
        <div id="button-annotation-pen-undo" 
          class="panel-button annotation-panel-subitem">
          <img src="${icon_back}"/>
        </div> 
        <div id="button-annotation-pen-clear" 
          class="panel-button annotation-panel-subitem">
          <img src="${icon_close}"/>
        </div> 
        <div id="button-annotation-pen-save" 
          class="panel-button annotation-panel-subitem">
          <img src="${icon_ok}"/>
        </div> 
        <div id="button-annotation-mode-pen" 
          class="panel-button annotation-panel-item">
          <img src="${icon_pen}"/>
        </div> 
      </div>
    </div>
    <input id="open-file-input" type="file" multiple="true">
  </div>
`;
