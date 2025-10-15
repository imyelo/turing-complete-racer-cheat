import {
  CAPTURE_HEIGHT_RATIO,
  CAPTURE_WIDTH_RATIO,
  COLOR_TOLERANCE,
  HIGHLIGHT_COLOR,
} from "./config";
import { getOCRWorker } from "./utils";
import type { PreviewMode } from "./interfaces";

export const processScreen = async (
  bitmap: ImageBitmap,
  source: HTMLCanvasElement,
  previewMode: PreviewMode
): Promise<string> => {
  if (!bitmap) {
    return "";
  }

  try {
    const captureWidth = bitmap.width * CAPTURE_WIDTH_RATIO;
    const captureHeight = bitmap.height * CAPTURE_HEIGHT_RATIO;
    const captureX = (bitmap.width - captureWidth) / 2;
    const captureY = (bitmap.height - captureHeight) / 2;

    const filter = document.createElement("canvas");
    filter.width = captureWidth;
    filter.height = captureHeight;
    const context = filter.getContext("2d");

    context?.drawImage(
      bitmap,
      captureX,
      captureY,
      captureWidth,
      captureHeight,
      0,
      0,
      captureWidth,
      captureHeight
    );

    const image = context?.getImageData(0, 0, captureWidth, captureHeight);
    const filteredData = filterColor(
      image?.data,
      HIGHLIGHT_COLOR,
      COLOR_TOLERANCE
    );
    const data = new ImageData(filteredData, captureWidth, captureHeight);
    context?.putImageData(data, 0, 0);

    const sourceContext = source?.getContext("2d");
    if (sourceContext && previewMode === "filter") {
      sourceContext.fillStyle = "rgba(0, 0, 0)";
      sourceContext.fillRect(captureX, captureY, captureWidth, captureHeight);
      sourceContext.drawImage(filter, captureX, captureY);
      sourceContext.drawImage(filter, captureX, captureY);
      sourceContext.strokeStyle = "rgb(0, 255, 0)";
      sourceContext.lineWidth = 1;
      sourceContext.strokeRect(captureX, captureY, captureWidth, captureHeight);
    }

    return (await performOCR(filter)) || "";
  } catch (error) {
    console.error("Failed to process:", error);
    return "";
  }
};

const filterColor = (
  pixels: Uint8ClampedArray | void,
  targetColor: { r: number; g: number; b: number },
  tolerance: number
) => {
  if (!pixels) {
    return new Uint8ClampedArray();
  }

  const newPixels = new Uint8ClampedArray(pixels.length);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const distance = Math.sqrt(
      Math.pow(r - targetColor.r, 2) +
        Math.pow(g - targetColor.g, 2) +
        Math.pow(b - targetColor.b, 2)
    );
    if (distance <= tolerance) {
      newPixels[i] = r;
      newPixels[i + 1] = g;
      newPixels[i + 2] = b;
      newPixels[i + 3] = 255;
    } else {
      newPixels[i + 3] = 0;
    }
  }

  return newPixels;
};

const performOCR = async (canvas: HTMLCanvasElement) => {
  try {
    const worker = await getOCRWorker();
    const {
      data: { text },
    } = await worker.recognize(canvas);
    return text;
  } catch (error) {
    console.error("Failed to OCR:", error);
    return null;
  }
};
