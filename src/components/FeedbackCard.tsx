import { ShieldCheck } from "lucide-react";

import type { FeedbackMessage } from "../types/workout";

export interface FeedbackCardProps {
  feedback?: FeedbackMessage;
}

export function FeedbackCard({ feedback }: FeedbackCardProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lime/10 text-lime">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lime/70">
            Coach cue
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-white">
            {feedback?.title ?? "Find your stance"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/50">
            {feedback?.detail ??
              "Raise both hands to chin level and keep your elbows close. Your routine starts once tracking locks in."}
          </p>
        </div>
      </div>
    </section>
  );
}
