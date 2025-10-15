import { createWorker } from "tesseract.js";
import leftPad from "just-left-pad";
import type { Byte, QuestionMode } from "./interfaces";

export const numberToByte = (num: string, mode: QuestionMode): Byte => {
  const binaryString = leftPad(
    parseInt(num, mode === "hex-to-binary" ? 16 : 10).toString(2),
    8,
    "0"
  );
  return binaryString.split("") as Byte;
};

export const getOCRWorker = (() => {
  let once;
  return async () => {
    return (once ||= await createWorker("eng"));
  };
})();
