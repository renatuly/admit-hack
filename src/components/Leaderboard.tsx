import { Trophy } from "lucide-react";

export function Leaderboard() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-center gap-3">
        <Trophy className="h-5 w-5 text-lime" />
        <div>
          <p className="font-bold text-white">Daily leaderboard</p>
          <p className="text-xs text-white/40">Available after your first session</p>
        </div>
      </div>
    </section>
  );
}
