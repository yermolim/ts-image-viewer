/// <reference path="./assets.d.ts" />

import { getCommonStyles } from "ts-viewers-core";

const appName = "tsimage";

export const styles = /*html*/`
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
