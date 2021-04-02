import {AnnotEventDetail, TsImageViewer } from "./ts-image-viewer";

async function run(): Promise<void> {  
  const viewer = new TsImageViewer({
    containerSelector: "#image-main-container",
    userName: "viva",
    fileButtons: ["open", "close", "save"],
    annotChangeCallback: (detail: AnnotEventDetail) => console.log(detail.type),
  });
} 

run();
