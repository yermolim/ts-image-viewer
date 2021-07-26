import {AnnotEventDetail, TsImageViewer, ImageLoadInfo } from "./ts-image-viewer";

async function run(): Promise<void> {  
  const viewer = new TsImageViewer({
    containerSelector: "#image-main-container",
    userName: "viva",
    fileButtons: ["open", "close", "save"],
    lazyLoadImages: true,
    annotChangeCallback: (detail: AnnotEventDetail) => console.log(detail.type),
  });

  const infos: ImageLoadInfo[] = [];
  for (let i = 0; i < 5000; i++) {
    infos.push({
      type: "URL",
      data: `https://via.placeholder.com/4000x3000/aaaaaa/fff.png?text=image${i}`,
      uuid: i + "",
    });
  } 
  // wrong url test
  infos[1] = {
    type: "URL",
    data: "https://via.placehder.com/4000x3000/aaaaaa/fff.png?text=image",
    uuid: "1",
  };
  viewer.openImagesAsync(infos);
} 

run();
