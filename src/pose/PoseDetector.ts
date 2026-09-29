import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

import type { PoseLandmarks } from "../types/pose";

const DEFAULT_WASM_ROOT =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const DEFAULT_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export interface PoseDetectorOptions {
  wasmRoot?: string;
  modelUrl?: string;
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
  onResults: (landmarks: PoseLandmarks | null, timestampMs: number) => void;
  onError?: (error: Error) => void;
  onFpsChange?: (fps: number) => void;
}

/** Owns MediaPipe initialization and a duplicate-frame-safe video inference loop. */
export class PoseDetector {
  private readonly options: PoseDetectorOptions;
  private landmarker: PoseLandmarker | null = null;
  private animationFrameId: number | null = null;
  private lastVideoTime = -1;
  private running = false;
  private frameCount = 0;
  private fpsWindowStartedAt = 0;

  constructor(options: PoseDetectorOptions) {
    this.options = options;
  }

  public async initialize(): Promise<void> {
    if (this.landmarker) {
      return;
    }

    const vision = await FilesetResolver.forVisionTasks(
      this.options.wasmRoot ?? DEFAULT_WASM_ROOT,
    );

    const commonOptions = {
      baseOptions: {
        modelAssetPath: this.options.modelUrl ?? DEFAULT_MODEL_URL,
      },
      runningMode: "VIDEO" as const,
      numPoses: 1,
      minPoseDetectionConfidence: this.options.minPoseDetectionConfidence ?? 0.55,
      minPosePresenceConfidence: this.options.minPosePresenceConfidence ?? 0.55,
      minTrackingConfidence: this.options.minTrackingConfidence ?? 0.55,
      outputSegmentationMasks: false,
    };

    try {
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        ...commonOptions,
        baseOptions: {
          ...commonOptions.baseOptions,
          delegate: "GPU",
        },
      });
    } catch {
      // Some browsers and virtualized environments cannot create a WebGL context.
      this.landmarker = await PoseLandmarker.createFromOptions(vision, commonOptions);
    }
  }

  public start(video: HTMLVideoElement): void {
    if (!this.landmarker) {
      throw new Error("PoseDetector must be initialized before it is started");
    }

    if (this.running) {
      return;
    }

    this.running = true;
    this.lastVideoTime = -1;
    this.frameCount = 0;
    this.fpsWindowStartedAt = performance.now();

    const detectFrame = (): void => {
      if (!this.running || !this.landmarker) {
        return;
      }

      if (
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.currentTime !== this.lastVideoTime
      ) {
        this.lastVideoTime = video.currentTime;
        const timestampMs = performance.now();

        try {
          const result = this.landmarker.detectForVideo(video, timestampMs);
          this.handleResult(result, timestampMs);
          this.updateFps(timestampMs);
        } catch (cause: unknown) {
          this.options.onError?.(toError(cause));
          this.stop();
          return;
        }
      }

      this.animationFrameId = requestAnimationFrame(detectFrame);
    };

    this.animationFrameId = requestAnimationFrame(detectFrame);
  }

  public stop(): void {
    this.running = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public dispose(): void {
    this.stop();
    this.landmarker?.close();
    this.landmarker = null;
  }

  private handleResult(result: PoseLandmarkerResult, timestampMs: number): void {
    const landmarks = result.landmarks[0];
    this.options.onResults(landmarks ?? null, timestampMs);
  }

  private updateFps(now: number): void {
    this.frameCount += 1;
    const elapsed = now - this.fpsWindowStartedAt;

    if (elapsed < 500) {
      return;
    }

    const fps = Math.round((this.frameCount * 1000) / elapsed);
    this.options.onFpsChange?.(fps);
    this.frameCount = 0;
    this.fpsWindowStartedAt = now;
  }
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}
