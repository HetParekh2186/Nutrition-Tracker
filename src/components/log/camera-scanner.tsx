"use client";

import { useEffect, useRef, useState } from "react";

// The Shape Detection API is in Chrome on Android but not in TypeScript's
// DOM types, and not in Safari at all; iOS falls back to ZXing.
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorClass = {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats: () => Promise<string[]>;
};

const RETAIL_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

export type CameraProblem = "unsupported" | "denied" | "no-camera" | "failed";

/** Whether this browser can open a camera at all (https or localhost). */
export function cameraAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function problemOf(err: unknown): CameraProblem {
  const name = err instanceof Error ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "no-camera";
  }
  return "failed";
}

async function nativeDetector(): Promise<BarcodeDetectorLike | null> {
  const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorClass })
    .BarcodeDetector;
  if (!Detector) return null;
  try {
    const supported = await Detector.getSupportedFormats();
    const formats = RETAIL_FORMATS.filter((f) => supported.includes(f));
    return formats.length ? new Detector({ formats }) : null;
  } catch {
    return null;
  }
}

/**
 * Live viewfinder from the back camera that reports the first retail
 * barcode (EAN or UPC) it reads, then stops. The camera is released when
 * this unmounts.
 */
export function CameraScanner({
  onDetected,
  onProblem,
}: {
  onDetected: (code: string) => void;
  onProblem: (problem: CameraProblem) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  // Latest callbacks, so the camera effect runs once per mount.
  const handlers = useRef({ onDetected, onProblem });
  useEffect(() => {
    handlers.current = { onDetected, onProblem };
  }, [onDetected, onProblem]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!cameraAvailable()) {
      handlers.current.onProblem("unsupported");
      return;
    }
    let stopped = false;
    let stream: MediaStream | null = null;
    let stopZxing: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const found = (raw: string) => {
      const code = raw.replace(/\D/g, "");
      if (stopped || !/^\d{8,14}$/.test(code)) return false;
      stopped = true;
      navigator.vibrate?.(40);
      handlers.current.onDetected(code);
      return true;
    };

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    void (async () => {
      const native = await nativeDetector();
      if (stopped) return;
      try {
        if (native) {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stopped) return;
          video.srcObject = stream;
          await video.play();
          setReady(true);
          const scan = async () => {
            if (stopped) return;
            try {
              const codes = await native.detect(video);
              if (codes.some((c) => found(c.rawValue))) return;
            } catch {
              // A frame that is not ready yet; try the next one.
            }
            timer = setTimeout(() => void scan(), 120);
          };
          void scan();
        } else {
          const [
            { BrowserMultiFormatReader },
            { BarcodeFormat, DecodeHintType },
          ] = await Promise.all([
            import("@zxing/browser"),
            import("@zxing/library"),
          ]);
          if (stopped) return;
          const hints = new Map<number, unknown>([
            [
              DecodeHintType.POSSIBLE_FORMATS,
              [
                BarcodeFormat.EAN_13,
                BarcodeFormat.EAN_8,
                BarcodeFormat.UPC_A,
                BarcodeFormat.UPC_E,
              ],
            ],
          ]);
          const reader = new BrowserMultiFormatReader(hints, {
            delayBetweenScanAttempts: 100,
          });
          const controls = await reader.decodeFromConstraints(
            constraints,
            video,
            (result) => {
              if (result && found(result.getText())) controls.stop();
            },
          );
          stopZxing = () => controls.stop();
          if (stopped) controls.stop();
          else setReady(true);
        }
      } catch (err) {
        if (!stopped) handlers.current.onProblem(problemOf(err));
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stopZxing?.();
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
  }, []);

  return (
    <div className="bg-black relative aspect-[4/3] overflow-hidden rounded-xl">
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label="Camera viewfinder"
        className="size-full object-cover"
      />
      {/* Guide frame: barcodes are wide, so the target is too. */}
      <div
        aria-hidden
        className="border-white/80 pointer-events-none absolute inset-x-[12%] top-1/2 h-[34%] -translate-y-1/2 rounded-lg border-2 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]"
      />
      <p
        role="status"
        className="text-white absolute inset-x-0 bottom-0 px-3 py-2 text-center text-xs"
      >
        {ready ? "Hold the barcode inside the frame" : "Starting the camera"}
      </p>
    </div>
  );
}
