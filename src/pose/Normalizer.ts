import {
  POSE_LANDMARK,
  type NormalizedPoseLandmark,
  type PoseLandmark,
  type PoseLandmarks,
} from "../types/pose";

const MIN_SHOULDER_WIDTH = 0.01;

export interface PoseScale {
  shoulderCenter: PoseLandmark;
  shoulderWidth: number;
}

/** Converts image coordinates into shoulder-centered, shoulder-width units. */
export function normalizePose(landmarks: PoseLandmarks): NormalizedPoseLandmark[] {
  const scale = getPoseScale(landmarks);

  if (!scale) {
    return [];
  }

  return landmarks.map((landmark, sourceIndex) => ({
    x: (landmark.x - scale.shoulderCenter.x) / scale.shoulderWidth,
    y: (landmark.y - scale.shoulderCenter.y) / scale.shoulderWidth,
    z: (landmark.z - scale.shoulderCenter.z) / scale.shoulderWidth,
    visibility: landmark.visibility ?? 1,
    sourceIndex,
  }));
}

export function getPoseScale(landmarks: PoseLandmarks): PoseScale | null {
  const leftShoulder = landmarks[POSE_LANDMARK.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARK.RIGHT_SHOULDER];

  if (!leftShoulder || !rightShoulder) {
    return null;
  }

  const shoulderWidth = Math.hypot(
    leftShoulder.x - rightShoulder.x,
    leftShoulder.y - rightShoulder.y,
    leftShoulder.z - rightShoulder.z,
  );

  if (!Number.isFinite(shoulderWidth) || shoulderWidth < MIN_SHOULDER_WIDTH) {
    return null;
  }

  return {
    shoulderCenter: {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2,
      visibility: Math.min(leftShoulder.visibility ?? 1, rightShoulder.visibility ?? 1),
    },
    shoulderWidth,
  };
}
