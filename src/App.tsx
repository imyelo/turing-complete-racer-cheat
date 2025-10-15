import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useInterval } from "ahooks";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Link from "@mui/material/Link";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import PreviewIcon from "@mui/icons-material/Preview";
import BlurCircularIcon from "@mui/icons-material/BlurCircular";
import { cn } from "@sglara/cn";
import { processScreen } from "./process";
import { numberToByte, getOCRWorker } from "./utils";
import type { PreviewMode } from "./interfaces";
import { FPS } from "./config";

const App = () => {
  const [number, setNumber] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("original");
  const [stream, setStream] = useState<MediaStream>();
  const $canvas = useRef<HTMLCanvasElement>(document.createElement("canvas"));

  const byte = useMemo(() => numberToByte(number), [number]);

  const stop = () => {
    if (stream?.active) {
      stream?.getTracks().forEach((track) => track.stop());
    }
    setCapturing(false);
  };

  const start = async () => {
    setStream(
      await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })
    );
  };

  const handleClickPreviewMode = useCallback(
    (_: React.MouseEvent<HTMLElement>, newAlignment: PreviewMode) => {
      setPreviewMode(newAlignment);
    },
    []
  );

  useInterval(async () => {
    try {
      if (!stream?.active) {
        stop();
        return;
      }
      setCapturing(true);
      const video = stream.getVideoTracks()[0];
      const capture = new ImageCapture(video);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bitmap: ImageBitmap = await (capture as any).grabFrame();
      if ($canvas.current) {
        $canvas.current.width = bitmap.width;
        $canvas.current.height = bitmap.height;
        $canvas.current?.getContext("2d")?.drawImage(bitmap, 0, 0);
      }
      setNumber(await processScreen(bitmap, $canvas.current, previewMode));
    } catch (error) {
      console.error(error);
    }
  }, 1000 / FPS);

  useEffect(() => {
    getOCRWorker();
  }, []);

  return (
    <Box className="flex flex-col items-center py-8 gap-4">
      <Card variant="outlined">
        <CardContent className="flex flex-col gap-4">
          <Box
            className={cn(
              "text-4xl font-mono text-center",
              !capturing ? "text-gray-400" : "text-yellow-500"
            )}
          >
            {!capturing ? "-" : number}
          </Box>
          <Box className="flex justify-center gap-2">
            {byte.map((bit, index) => (
              <Box
                key={index}
                className={cn(
                  "w-10 h-10 flex justify-center items-center rounded-full text-white",
                  !capturing
                    ? "bg-gray-400"
                    : bit === "1"
                    ? "bg-emerald-600"
                    : "bg-orange-600"
                )}
              >
                {Math.pow(2, 7 - index)}
              </Box>
            ))}
          </Box>
          <Divider />
          <Box className="flex justify-between items-center">
            {capturing ? (
              <Button variant="outlined" onClick={stop} className="w-20">
                stop
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={start}
                className="bg-blue-500 text-white py-2 px-4 rounded-2xl text-white"
              >
                start
              </Button>
            )}
            <ToggleButtonGroup
              color="primary"
              value={previewMode}
              exclusive
              onChange={handleClickPreviewMode}
              className="ml-4"
              disabled={!capturing}
              size="small"
            >
              <ToggleButton value="hide">
                <VisibilityOffIcon />
              </ToggleButton>
              <ToggleButton value="original">
                <PreviewIcon />
              </ToggleButton>
              <ToggleButton value="filter">
                <BlurCircularIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </CardContent>
      </Card>
      <Link
        href="https://turingcomplete.game/"
        target="_blank"
      >
        Turing Complete
      </Link>
      {capturing && previewMode !== "hide" && (
        <Card>
          <CardContent>
            <canvas ref={$canvas} />
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default App;
