import { useEffect, useRef } from "react";
import type { Question } from "@/lib/funding/steps";

interface QuestionScreenProps {
  question: Question;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  /**
   * Advance to the next screen. Pass an explicit value for auto-advancing
   * inputs (select/boolean) so validation doesn't race React's state commit.
   */
  onNext: (explicitValue?: string) => void;
}

const inputBase =
  "w-full bg-transparent border-b border-white/20 py-4 text-2xl md:text-3xl text-white placeholder:text-white/25 focus:border-electric outline-none transition-colors font-display tracking-wide";

// Renders a single question. One question per screen — the whole point of the
// flow is momentum, so we auto-focus and let Enter advance.
export default function QuestionScreen({
  question,
  value,
  error,
  onChange,
  onNext,
}: QuestionScreenProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // focus the field each time we land on a new text-like question
    if (question.type !== "select" && question.type !== "boolean") {
      inputRef.current?.focus();
    }
  }, [question.key, question.type]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      onNext();
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl md:text-5xl uppercase text-white leading-[1.05]">
          {question.prompt}
        </h2>
        {question.subtext && (
          <p className="text-white/50 text-sm mt-3 max-w-md">{question.subtext}</p>
        )}
      </div>

      {(question.type === "text" ||
        question.type === "email" ||
        question.type === "tel") && (
        <input
          ref={inputRef}
          type={question.type === "text" ? "text" : question.type}
          inputMode={question.type === "tel" ? "tel" : undefined}
          value={value}
          placeholder={question.placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={inputBase}
          autoComplete={
            question.key === "email"
              ? "email"
              : question.key === "phone"
                ? "tel"
                : question.key === "contact_name"
                  ? "name"
                  : "off"
          }
        />
      )}

      {question.type === "currency" && (
        <div className="flex items-center border-b border-white/20 focus-within:border-electric transition-colors">
          <span className="text-2xl md:text-3xl text-white/50 font-display pr-1">$</span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={value}
            placeholder={question.placeholder}
            onChange={(e) => {
              // keep only digits + commas, format with thousands separators
              const digits = e.target.value.replace(/[^0-9]/g, "");
              onChange(digits ? Number(digits).toLocaleString("en-US") : "");
            }}
            onKeyDown={handleKeyDown}
            className={`${inputBase} border-b-0`}
          />
        </div>
      )}

      {question.type === "select" && (
        <div className="grid gap-2.5">
          {question.options?.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  // give the fill a beat to render, then advance with the
                  // explicit value so validation doesn't read stale state
                  setTimeout(() => onNext(opt.value), 160);
                }}
                className={`text-left px-5 py-4 border transition-all text-base md:text-lg ${
                  selected
                    ? "border-electric bg-electric/10 text-white"
                    : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "boolean" && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ].map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setTimeout(() => onNext(opt.value), 160);
                }}
                className={`px-5 py-5 border transition-all text-lg uppercase tracking-widest font-display ${
                  selected
                    ? "border-electric bg-electric/10 text-white"
                    : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
