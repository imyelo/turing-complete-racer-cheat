import { useState, useEffect, useRef } from "react";
import { createWorker } from "tesseract.js";
import leftPad from "just-left-pad";

const HIGHLIGHT_COLOR = { r: 228, g: 159, b: 68 }; // #e49f44
const COLOR_TOLERANCE = 60;
const CAPTURE_RATIO = 1 / 4;
const FPS = 60;

type Byte = [string, string, string, string, string, string, string, string];
const numberToByte = (num: number): Byte => {
  const binaryString = leftPad(num.toString(2), 8, "0");
  return binaryString.split("") as Byte;
}

const getOCRWorker = (() => {
  let once;
  return async () => {
    return (once ||= await createWorker("eng"));
  };
})();

const parseBinaryFromScreen = async (bitmap: ImageBitmap): Promise<Byte> => {
  if (!bitmap) {
    return numberToByte(0);
  }

  try {
    const captureWidth = bitmap.width * CAPTURE_RATIO;
    const captureHeight = bitmap.height * CAPTURE_RATIO;
    const captureX = (bitmap.width - captureWidth) / 2;
    const captureY = (bitmap.height - captureHeight) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = captureWidth;
    canvas.height = captureHeight;
    const context = canvas.getContext("2d");

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

    const number = await performOCR(canvas);
    return numberToByte(number || 0);
  } catch (error) {
    console.error("Failed to process:", error);
    return numberToByte(0);
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
    const numbers = text.match(/\d+/g);
    return numbers ? parseInt(numbers[0]) : null;
  } catch (error) {
    console.error("Failed to OCR:", error);
    return null;
  }
};

const App = () => {
  const [binary, setBinary] = useState<Byte>(['0','0','0','0','0','0','0','0']);
  const [capturing, setCapturing] = useState(false);
  const $canvas = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const [stream, setStream] = useState<MediaStream>();

  const [timer, setTimer] = useState<number>();

  const stop = () => {
    clearInterval(timer);
    if (stream?.active) {
      stream?.getTracks().forEach((track) => track.stop());
    }
    setCapturing(false);
  };

  const start = async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    setStream(stream);

    stream.addEventListener("removetrack", () => {
      console.log("remove track");
    });

    const video = stream.getVideoTracks()[0];
    const capture = new ImageCapture(video);

    setTimer(
      setInterval(async () => {
        try {
          if (!stream.active) {
            stop();
            return;
          }
          setCapturing(true);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bitmap: ImageBitmap = await (capture as any).grabFrame();
          $canvas.current.width = bitmap.width;
          $canvas.current.height = bitmap.height;
          $canvas.current?.getContext("2d")?.drawImage(bitmap, 0, 0);
          setBinary(await parseBinaryFromScreen(bitmap));
        } catch (error) {
          console.error(error);
        }
      }, 1000 / FPS)
    );
  };

  useEffect(() => {
    getOCRWorker();
  }, []);

  return (
    <div className="App">
      {capturing && <canvas ref={$canvas} />}
      <div>
        {capturing ? (
          <button type="button" onClick={stop}>
            stop
          </button>
        ) : (
          <button type="button" onClick={start}>
            start
          </button>
        )}
      </div>
      <div>{binary}</div>
    </div>
  );
};

export default App;
