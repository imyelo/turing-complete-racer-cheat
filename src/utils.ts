import { createWorker } from "tesseract.js";
import leftPad from "just-left-pad";
import type { Byte, QuestionMode } from "./interfaces";
import { OCR_CHAR_WHITELIST } from "./config";

export const numberToByte = (num: string, mode: QuestionMode): Byte => {
  const binaryString = leftPad(
    parseInt(num, mode === "hex-to-binary" ? 16 : 10).toString(2),
    8,
    "0"
  );
  return binaryString.split("") as Byte;
};

export const getOCRWorker = (() => {
  let once: ReturnType<typeof createWorker>;
  return async () => {
    if (!once) {
      once = (async () => {
        const worker = await createWorker("eng");
        await worker.setParameters({
          tessedit_char_whitelist: OCR_CHAR_WHITELIST,
        });
        return worker;
      })();
    }
    return once;
  };
})();
