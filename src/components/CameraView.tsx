import { Camera, CameraOff, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { normalizePose } from "../pose/Normalizer";
import { PoseDetector } from "../pose/PoseDetector";
import { LandmarkSmoother } from "../pose/Smoother";
import type { PoseFrame, PoseLandmarks, TrackingStatus } from "../types/pose";
import { clearPoseCanvas, drawPoseSkeleton } from "./PoseSkeleton";

const LOST_AFTER_MS = 900;

export interface CameraViewProps {
  onPoseFrame?: (frame: PoseFrame | null) => void;
  onStatusChange?: (status: TrackingStatus) => void;
}

export function CameraView({ onPoseFrame, onStatusChange }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const smootherRef = useRef(new LandmarkSmoother(0.4));
  const fpsRef = useRef(0);
  const lostTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const onPoseFrameRef = useRef(onPoseFrame);
  const onStatusChangeRef = useRef(onStatusChange);
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onPoseFrameRef.current = onPoseFrame;
  }, [onPoseFrame]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const updateStatus = useCallback((nextStatus: TrackingStatus) => {
    if (!mountedRef.current) {
      return;
    }

    setStatus(nextStatus);
    onStatusChangeRef.current?.(nextStatus);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (canvas && context) {
      clearPoseCanvas(context, canvas.clientWidth, canvas.clientHeight);
    }
  }, []);

  const drawLandmarks = useCallback((landmarks: PoseLandmarks) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    clearPoseCanvas(context, width, height);
    drawPoseSkeleton(context, landmarks, { width, height, mirrored: true });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas) {
      return;
    }

    const resizeCanvas = (): void => {
      const { width, height } = container.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext("2d");
      context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    resizeCanvas();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    mountedRef.current = true;

    async function startCameraAndDetector(): Promise<void> {
      setErrorMessage(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        updateStatus("unsupported");
        setErrorMessage("This browser does not support camera capture.");
        return;
      }

      try {
        updateStatus("requesting-camera");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 960 },
            frameRate: { ideal: 30, max: 60 },
          },
        });

        if (cancelled) {
          stopMediaStream(stream);
          return;
        }

        const video = videoRef.current;

        if (!video) {
          stopMediaStream(stream);
          throw new Error("Camera video element is unavailable");
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        updateStatus("loading-model");
        const detector = new PoseDetector({
          onResults: (landmarks, capturedAt) => {
            if (!mountedRef.current) {
              return;
            }

            if (!landmarks) {
              clearCanvas();
              onPoseFrameRef.current?.(null);

              if (lostTimerRef.current === null) {
                lostTimerRef.current = window.setTimeout(() => {
                  updateStatus("lost");
                }, LOST_AFTER_MS);
              }

              return;
            }

            if (lostTimerRef.current !== null) {
              window.clearTimeout(lostTimerRef.current);
              lostTimerRef.current = null;
            }

            const smoothed = smootherRef.current.smooth(landmarks);
            const normalized = normalizePose(smoothed);
            drawLandmarks(smoothed);
            updateStatus("tracking");
            onPoseFrameRef.current?.({
              landmarks: smoothed,
              normalizedLandmarks: normalized,
              capturedAt,
              inferenceFps: fpsRef.current,
            });
          },
          onFpsChange: (fps) => {
            fpsRef.current = fps;
          },
          onError: (error) => {
            setErrorMessage(error.message);
            updateStatus("error");
          },
        });

        detectorRef.current = detector;
        await detector.initialize();

        if (cancelled) {
          detector.dispose();
          return;
        }

        detector.start(video);
      } catch (cause: unknown) {
        if (cancelled) {
          return;
        }

        const error = cause instanceof Error ? cause : new Error(String(cause));
        const denied =
          error.name === "NotAllowedError" || error.name === "PermissionDeniedError";
        updateStatus(denied ? "permission-denied" : "error");
        setErrorMessage(
          denied
            ? "Camera access is blocked. Allow access in your browser settings, then try again."
            : "The camera or pose model could not start. Check your connection and try again.",
        );
      }
    }

    void startCameraAndDetector();

    return () => {
      cancelled = true;
      mountedRef.current = false;

      if (lostTimerRef.current !== null) {
        window.clearTimeout(lostTimerRef.current);
        lostTimerRef.current = null;
      }

      detectorRef.current?.dispose();
      detectorRef.current = null;
      smootherRef.current.reset();
      stopMediaStream(streamRef.current);
      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [attempt, clearCanvas, drawLandmarks, updateStatus]);

  const retry = (): void => {
    setAttempt((current) => current + 1);
  };

  const isLoading = status === "requesting-camera" || status === "loading-model";
  const isFailure =
    status === "permission-denied" || status === "unsupported" || status === "error";

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0c120f] shadow-2xl"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
        autoPlay
        muted
        playsInline
        aria-label="Live camera preview"
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-5 py-4">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur-md">
          <span
            className={`h-2 w-2 rounded-full ${status === "tracking" ? "animate-pulse bg-lime" : "bg-amber-400"}`}
          />
          {getStatusLabel(status)}
        </div>
        <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 font-mono text-xs text-white/60 backdrop-blur-md">
          ON-DEVICE
        </div>
      </div>

      {(isLoading || isFailure || status === "lost") && (
        <div className="absolute inset-0 grid place-items-center bg-black/45 p-6 backdrop-blur-[2px]">
          <div className="max-w-sm rounded-3xl border border-white/10 bg-[#111916]/95 p-6 text-center shadow-2xl">
            {isLoading ? (
              <LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-lime" />
            ) : status === "lost" ? (
              <CameraOff className="mx-auto mb-4 h-8 w-8 text-amber-300" />
            ) : (
              <Camera className="mx-auto mb-4 h-8 w-8 text-amber-300" />
            )}
            <p className="text-base font-bold text-white">
              {isLoading
                ? status === "requesting-camera"
                  ? "Waiting for camera"
                  : "Loading pose model"
                : status === "lost"
                  ? "User lost — stand back in camera view"
                  : "Camera unavailable"}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/55">
              {isLoading
                ? "Your video stays in this browser and is processed on your device."
                : status === "lost"
                  ? "Keep your head, shoulders, hips, and hands visible."
                  : errorMessage}
            </p>
            {isFailure && (
              <button
                type="button"
                onClick={retry}
                className="pointer-events-auto mt-5 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-extrabold text-ink transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-lime focus:ring-offset-2 focus:ring-offset-ink"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-5 bottom-5 flex items-end justify-between">
        <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
            Frame guide
          </p>
          <p className="mt-1 text-sm font-semibold text-white/90">Keep upper body visible</p>
        </div>
        <div className="h-16 w-16 rounded-br-2xl border-b-2 border-r-2 border-lime/70" />
      </div>
    </div>
  );
}

function getStatusLabel(status: TrackingStatus): string {
  switch (status) {
    case "tracking":
      return "Tracking live";
    case "lost":
      return "Pose lost";
    case "loading-model":
      return "Loading model";
    case "requesting-camera":
      return "Camera access";
    case "permission-denied":
    case "unsupported":
    case "error":
      return "Offline";
    case "idle":
      return "Starting";
  }
}

function stopMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}
