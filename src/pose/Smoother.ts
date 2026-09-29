import type { PoseLandmark, PoseLandmarks } from "../types/pose";

const DEFAULT_ALPHA = 0.4;

/**
 * Applies an exponential moving average independently to each pose landmark.
 * A new array is returned for every frame so consumers can safely retain it.
 */
export class LandmarkSmoother {
  private readonly alpha: number;
  private previous: PoseLandmark[] | null = null;

  constructor(alpha = DEFAULT_ALPHA) {
    if (alpha <= 0 || alpha > 1) {
      throw new RangeError("Smoothing alpha must be greater than 0 and at most 1");
    }

    this.alpha = alpha;
  }

  public smooth(landmarks: PoseLandmarks): PoseLandmark[] {
    if (!this.previous || this.previous.length !== landmarks.length) {
      const initial = landmarks.map((landmark) => ({ ...landmark }));
      this.previous = initial;
      return initial.map((landmark) => ({ ...landmark }));
    }

    const smoothed = landmarks.map((landmark, index) => {
      const previous = this.previous?.[index];

      if (!previous) {
        return { ...landmark };
      }

      return {
        x: this.interpolate(landmark.x, previous.x),
        y: this.interpolate(landmark.y, previous.y),
        z: this.interpolate(landmark.z, previous.z),
        visibility: this.interpolateOptional(landmark.visibility, previous.visibility),
        presence: this.interpolateOptional(landmark.presence, previous.presence),
      };
    });

    this.previous = smoothed;
    return smoothed.map((landmark) => ({ ...landmark }));
  }

  public reset(): void {
    this.previous = null;
  }

  private interpolate(current: number, previous: number): number {
    return this.alpha * current + (1 - this.alpha) * previous;
  }

  private interpolateOptional(current?: number, previous?: number): number | undefined {
    if (current === undefined) {
      return previous;
    }

    if (previous === undefined) {
      return current;
    }

    return this.interpolate(current, previous);
  }
}
