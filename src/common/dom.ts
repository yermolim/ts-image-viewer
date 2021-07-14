/**
 * create HTML elements from HTML string
 * @param html HTML string
 * @returns HTML element array
 */
export function htmlToElements(html: string): HTMLElement[] {
  const template = document.createElement("template");
  template.innerHTML = html;
  const nodes: HTMLElement[] = [];
  template.content.childNodes.forEach(x => {
    if (x instanceof HTMLElement) { 
      nodes.push(x);
    }
  });
  return nodes;
}

/**
 * wrap callback with setTimeout inside Promise<T>
 * @param callback 
 * @returns 
 */
export async function promisify<T>(callback: () => T): Promise<T> {
  return new Promise<T>(resolve => {
    setTimeout(() => {
      const result = callback();
      resolve(result);
    }, 0);
  });
}

/**
 * calls empty setTimeout to force DOM refresh
 */
export async function runEmptyTimeout() {
  await promisify(() => undefined);
}

/**create a temp download link and click on it */
export function downloadFile(blob: Blob, name?: string) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("download", name);
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function loadImageAsync(url: string, revoke = false): Promise<HTMLImageElement> {  
  const loadedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onerror = (e: string | Event) => {
      if (revoke) {        
        URL.revokeObjectURL(url);
      }
      console.log(`Error while loading image: ${e}`);
      resolve(null);
    };
    image.onload = () => {
      if (revoke) {        
        URL.revokeObjectURL(url);
      }
      resolve(image);
    };
    image.src = url;
  });

  return loadedImage;
}
