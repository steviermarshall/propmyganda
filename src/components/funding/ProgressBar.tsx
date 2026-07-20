import { STEPS } from "@/lib/funding/steps";

interface ProgressBarProps {
  /** 0-based index of the step currently on screen */
  currentStep: number;
  /** 0..1 overall completion across all questions */
  fraction: number;
}

// Five-segment progress bar with step labels, mirroring the 1West wizard's
// header. The active segment fills proportionally to answers given within it.
export default function ProgressBar({ currentStep, fraction }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-end justify-between mb-3">
        {STEPS.map((step) => {
          const state =
            step.index < currentStep
              ? "done"
              : step.index === currentStep
                ? "active"
                : "todo";
          return (
            <div key={step.index} className="flex flex-col items-center flex-1">
              <span
                className={`text-[10px] tracking-[0.2em] uppercase transition-colors ${
                  state === "todo" ? "text-white/30" : "text-white"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1.5">
        {STEPS.map((step) => (
          <div key={step.index} className="flex-1 h-1 bg-white/10 overflow-hidden">
            <div
              className="h-full bg-electric transition-all duration-500 ease-out"
              style={{
                width:
                  step.index < currentStep
                    ? "100%"
                    : step.index === currentStep
                      ? "100%"
                      : "0%",
                opacity: step.index <= currentStep ? 1 : 0,
              }}
            />
          </div>
        ))}
      </div>

      <p className="mt-2 text-[10px] tracking-[0.2em] uppercase text-white/40">
        {Math.round(fraction * 100)}% complete
      </p>
    </div>
  );
}
