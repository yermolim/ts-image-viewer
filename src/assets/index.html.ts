/// <reference path="./assets.d.ts" />

import {Icons} from "ts-viewers-core";

//#region icons
export const geometricIcons = {
  square: `<img src="${Icons.icon_square}"/>`,
  circle: `<img src="${Icons.icon_circle}"/>`,
  line: `<img src="${Icons.icon_line}"/>`,
  arrow: `<img src="${Icons.icon_arrow}"/>`,
  polyline: `<img src="${Icons.icon_polyline}"/>`,
  polygon: `<img src="${Icons.icon_polygon}"/>`,
} as const;

export const textIcons = {
  note: `<img src="${Icons.icon_popup2}"/>`,
  freeText: `<img src="${Icons.icon_text_free}"/>`,
  freeTextCallout: `<img src="${Icons.icon_text_callout}"/>`,
} as const;

export const lineTypeIcons = {  
  straight: `<img src="${Icons.icon_straight}"/>`,
  cloudy: `<img src="${Icons.icon_cloudy}"/>`,
} as const;

export const editIcons = {  
  close: `<img src="${Icons.icon_close}"/>`,
  ok: `<img src="${Icons.icon_ok}"/>`,
  back: `<img src="${Icons.icon_back}"/>`,
  delete: `<img src="${Icons.icon_delete}"/>`,
} as const;
//#endregion

export const mainHtml = /*html*/`
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

export const textDialogHtml =  /*html*/`
  <div class="abs-full-size-overlay text-dialog">
    <div class="form">
      <textarea class="text-input" maxlength="1024"></textarea>
      <div class="buttons">
        <div class="panel-button text-ok">
          <img src="${Icons.icon_ok}"/>
        </div>
        <div class="panel-button text-cancel">
          <img src="${Icons.icon_close}"/>
        </div>
      </div>
    </div>
  </div>
`;

//#region stamps
export const stampContextButtonsHtml = /*html*/`
  <div class="context-menu-content row">
    <div class="panel-button stamp-load-image">
      <img src="${Icons.icon_load}"/>
    </div>
    <div class="panel-button stamp-draw-image">
      <img src="${Icons.icon_pen}"/>
    </div>
    <div class="panel-button stamp-delete disabled">
      <img src="${Icons.icon_delete}"/>
    </div>
  </div>
`;

export const stampImageLoaderHtml = /*html*/`
  <div class="abs-full-size-overlay stamp-dialog">
    <div class="form">
      <div class="form-canvas-wrapper">
        <canvas class="abs-ratio-canvas"></canvas>
      </div>
      <div class="stamp-input-row">
        <p>Stamp name:</p>
        <input class="stamp-name-input" type="text" maxlength="128"/>
      </div>
      <div class="stamp-input-row">
        <p>Stamp description:</p>
        <input class="stamp-subject-input" type="text" maxlength="256"/>
      </div>
      <div class="stamp-input-row">
        <p>Width:</p>
        <input class="stamp-width-input" type="text" maxlength="4"/>
        <p>Height:</p>
        <input class="stamp-height-input" type="text" maxlength="4"/>
      </div>
      <div class="buttons">
        <div class="panel-button stamp-ok">
          <img src="${Icons.icon_ok}"/>
        </div>
        <div class="panel-button stamp-cancel">
          <img src="${Icons.icon_close}"/>
        </div>
      </div>
    </div>
  </div>
`;

export const stampDesignerHtml = /*html*/`
  <div class="abs-full-size-overlay stamp-dialog">
    <div class="form">
      <div class="form-canvas-wrapper">
      </div>
      <div class="stamp-input-row">
        <p>Stamp name:</p>
        <input class="stamp-name-input" type="text" maxlength="128"/>
      </div>
      <div class="stamp-input-row">
        <p>Stamp description:</p>
        <input class="stamp-subject-input" type="text" maxlength="256"/>
      </div>
      <div class="stamp-input-row">
        <p>Width:</p>
        <input class="stamp-width-input" type="text" maxlength="4"/>
        <p>Height:</p>
        <input class="stamp-height-input" type="text" maxlength="4"/>
      </div>
      <div class="buttons">
        <div class="panel-button stamp-ok">
          <img src="${Icons.icon_ok}"/>
        </div>
        <div class="panel-button stamp-cancel">
          <img src="${Icons.icon_close}"/>
        </div>
      </div>
    </div>
  </div>
`;
//#endregion
