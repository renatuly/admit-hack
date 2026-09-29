import type { PoseLandmarks } from "../types/pose";

const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 7],
  [0, 4],
  [4, 5],
  [5, 6],
  [6, 8],
  [9, 10],
  [11, 12],
  [11, 13],
  [13, 15],
  [15, 17],
  [15, 19],
  [15, 21],
  [17, 19],
  [12, 14],
  [14, 16],
  [16, 18],
  [16, 20],
  [16, 22],
  [18, 20],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [24, 26],
  [25, 27],
  [26, 28],
  [27, 29],
  [28, 30],
  [29, 31],
  [30, 32],
  [27, 31],
  [28, 32],
];

const VISIBILITY_THRESHOLD = 0.45;

export interface SkeletonRenderOptions {
  width: number;
  height: number;
  mirrored?: boolean;
  lineColor?: string;
  jointColor?: string;
}

/** Draws a pose into an already device-pixel-ratio-scaled canvas context. */
export function drawPoseSkeleton(
  context: CanvasRenderingContext2D,
  landmarks: PoseLandmarks,
  options: SkeletonRenderOptions,
): void {
  const {
    width,
    height,
    mirrored = true,
    lineColor = "rgba(199, 255, 74, 0.82)",
    jointColor = "#efffc9",
  } = options;

  context.save();

  if (mirrored) {
    context.translate(width, 0);
    context.scale(-1, 1);
  }

  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = Math.max(2, width / 260);
  context.strokeStyle = lineColor;
  context.shadowColor = "rgba(199, 255, 74, 0.5)";
  context.shadowBlur = 8;

  for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];

    if (!start || !end || !isVisible(start.visibility) || !isVisible(end.visibility)) {
      continue;
    }

    context.beginPath();
    context.moveTo(start.x * width, start.y * height);
    context.lineTo(end.x * width, end.y * height);
    context.stroke();
  }

  context.shadowBlur = 6;
  context.fillStyle = jointColor;

  for (const landmark of landmarks) {
    if (!isVisible(landmark.visibility)) {
      continue;
    }

    context.beginPath();
    context.arc(
      landmark.x * width,
      landmark.y * height,
      Math.max(2.5, width / 180),
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  context.restore();
}

export function clearPoseCanvas(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  context.clearRect(0, 0, width, height);
}

function isVisible(visibility?: number): boolean {
  return visibility === undefined || visibility >= VISIBILITY_THRESHOLD;
}
