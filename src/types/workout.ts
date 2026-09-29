export type PunchType = "jab" | "cross" | "hook";

export type FeedbackSeverity = "success" | "warning" | "error" | "info";

export interface FeedbackMessage {
  id: string;
  title: string;
  detail: string;
  severity: FeedbackSeverity;
}

export interface RepMetrics {
  punchType: PunchType;
  startedAt: number;
  completedAt: number;
  isClean: boolean;
  accuracyScore: number;
  errors: readonly string[];
}

export interface WorkoutSession {
  id: string;
  startedAt: string;
  completedAt?: string;
  reps: readonly RepMetrics[];
}
