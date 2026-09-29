import { Activity, Crosshair, Timer } from "lucide-react";

export interface WorkoutHudProps {
  fps: number;
  visibleLandmarks: number;
}

export function WorkoutHud({ fps, visibleLandmarks }: WorkoutHudProps) {
  return (
    <section className="grid grid-cols-3 gap-2">
      <Metric icon={Crosshair} label="Routine" value="Basics" />
      <Metric icon={Activity} label="Tracking" value={`${visibleLandmarks}/33`} />
      <Metric icon={Timer} label="Inference" value={fps > 0 ? `${fps} fps` : "—"} />
    </section>
  );
}

interface MetricProps {
  icon: typeof Activity;
  label: string;
  value: string;
}

function Metric({ icon: Icon, label, value }: MetricProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
      <Icon className="h-4 w-4 text-lime/70" />
      <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-extrabold text-white">{value}</p>
    </div>
  );
}
