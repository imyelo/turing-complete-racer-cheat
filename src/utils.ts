import { createWorker } from "tesseract.js";
import leftPad from "just-left-pad";
import type { Byte } from "./interfaces";

export const numberToByte = (num: number): Byte => {
  const binaryString = leftPad(num.toString(2), 8, "0");
  return binaryString.split("") as Byte;
};

export const getOCRWorker = (() => {
  let once;
  return async () => {
    return (once ||= await createWorker("eng"));
  };
})();
