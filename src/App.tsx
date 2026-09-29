import { Dumbbell, LockKeyhole, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

import { CameraView } from "./components/CameraView";
import { FeedbackCard } from "./components/FeedbackCard";
import { Leaderboard } from "./components/Leaderboard";
import { WorkoutHud } from "./components/WorkoutHud";
import type { PoseFrame } from "./types/pose";

export function App() {
  const [fps, setFps] = useState(0);
  const [visibleLandmarks, setVisibleLandmarks] = useState(0);

  const handlePoseFrame = useCallback((frame: PoseFrame | null) => {
    if (!frame) {
      setVisibleLandmarks(0);
      return;
    }

    setFps(frame.inferenceFps);
    setVisibleLandmarks(
      frame.landmarks.filter((landmark) => (landmark.visibility ?? 1) >= 0.45).length,
    );
  }, []);

  return (
    <div className="min-h-screen overflow-hidden bg-ink text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(199,255,74,0.11),transparent_30%),radial-gradient(circle_at_90%_80%,rgba(33,112,81,0.12),transparent_35%)]" />

      <header className="relative z-10 border-b border-white/[0.07]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-lime text-ink shadow-glow">
              <Dumbbell className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-display text-lg font-black uppercase leading-none tracking-[-0.04em]">
                Shadow<span className="text-lime">Coach</span>
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.24em] text-white/35">
                Motion intelligence
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs font-semibold text-white/45 sm:flex">
            <LockKeyhole className="h-3.5 w-3.5 text-lime/70" />
            Video processed on device
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 py-7 lg:px-8 lg:py-10">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime/[0.06] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-lime">
              <Sparkles className="h-3 w-3" />
              Live technique lab
            </div>
            <h1 className="max-w-2xl font-display text-3xl font-black uppercase leading-[0.95] tracking-[-0.055em] sm:text-5xl">
              Your movement.
              <br />
              <span className="text-white/35">Sharper every round.</span>
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-6 text-white/45">
            Step into frame with your upper body visible. ShadowCoach will map your pose locally and prepare your first routine.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,0.75fr)]">
          <CameraView onPoseFrame={handlePoseFrame} />

          <aside className="flex flex-col gap-4">
            <WorkoutHud fps={fps} visibleLandmarks={visibleLandmarks} />
            <FeedbackCard />

            <section className="relative overflow-hidden rounded-3xl border border-lime/15 bg-lime p-5 text-ink">
              <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border-[20px] border-black/[0.06]" />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-55">
                Up next
              </p>
              <p className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.04em]">
                Boxing basics
              </p>
              <div className="mt-5 flex gap-2 text-xs font-extrabold uppercase tracking-wide">
                <span className="rounded-full bg-black/10 px-3 py-1.5">5 Jabs</span>
                <span className="rounded-full bg-black/10 px-3 py-1.5">5 Crosses</span>
              </div>
            </section>

            <Leaderboard />
          </aside>
        </div>
      </main>
    </div>
  );
}
