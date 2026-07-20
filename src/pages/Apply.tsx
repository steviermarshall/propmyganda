import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import ProgressBar from "@/components/funding/ProgressBar";
import QuestionScreen from "@/components/funding/QuestionScreen";
import { QUESTIONS, STEPS, TOTAL_QUESTIONS } from "@/lib/funding/steps";
import { useFundingApplication } from "@/hooks/use-funding-application";
import { trackEvent } from "@/lib/funding/analytics";

// The gate lives after the last question.
const GATE_SCREEN = TOTAL_QUESTIONS;
const TOTAL_SCREENS = TOTAL_QUESTIONS + 1;

type GateStage = "intro" | "code" | "done";

export default function Apply() {
  const { answers, applicationId, saving, setAnswer, saveAnswer, claimAndSubmit } =
    useFundingApplication();

  const [screen, setScreen] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const seenStep = useRef<number>(-1);

  // ── analytics: one page_view on mount ──
  useEffect(() => {
    void trackEvent("page_view");
  }, []);

  const currentStep = screen < GATE_SCREEN ? QUESTIONS[screen].step : STEPS.length - 1;
  const fraction = Math.min(screen / TOTAL_SCREENS, 1);

  // ── analytics: fire question_view / step_complete as screens change ──
  useEffect(() => {
    if (screen < GATE_SCREEN) {
      const q = QUESTIONS[screen];
      void trackEvent("question_view", { applicationId, questionKey: q.key });
      if (q.step !== seenStep.current && seenStep.current !== -1) {
        void trackEvent("step_complete", {
          applicationId,
          payload: { step: seenStep.current },
        });
      }
      seenStep.current = q.step;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  async function handleNext(explicitValue?: string) {
    if (screen >= GATE_SCREEN) return;
    const q = QUESTIONS[screen];
    const value = explicitValue ?? answers[q.key] ?? "";
    const validationError = q.validate ? q.validate(value) : null;
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    void saveAnswer(q.key, value, q.step);
    setScreen((s) => Math.min(s + 1, GATE_SCREEN));
  }

  function handleBack() {
    setError(null);
    setScreen((s) => Math.max(s - 1, 0));
  }

  return (
    <div className="min-h-screen bg-black">
      <SEO
        title="Apply for Funding — Tip Top Capital"
        description="Get matched with the right funding for your business. A few quick questions — your progress saves as you go."
        path="/apply"
      />

      {/* Header / progress */}
      <header className="sticky top-0 z-20 bg-black/90 backdrop-blur border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between mb-5">
            <Link
              to="/"
              className="text-xs tracking-[0.3em] uppercase text-white/50 hover:text-white transition-colors"
            >
              ← Home
            </Link>
            {saving && (
              <span className="text-[10px] tracking-[0.2em] uppercase text-electric/80">
                Saving…
              </span>
            )}
          </div>
          <ProgressBar currentStep={currentStep} fraction={fraction} />
        </div>
      </header>

      {/* Body */}
      <main className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        {screen < GATE_SCREEN ? (
          <div key={QUESTIONS[screen].key} className="animate-[fadeIn_0.4s_ease]">
            <QuestionScreen
              question={QUESTIONS[screen]}
              value={answers[QUESTIONS[screen].key] ?? ""}
              error={error}
              onChange={(v) => {
                setError(null);
                setAnswer(QUESTIONS[screen].key, v);
              }}
              onNext={handleNext}
            />

            <div className="flex items-center gap-4 mt-12">
              {screen > 0 && (
                <button
                  onClick={handleBack}
                  className="text-xs tracking-[0.2em] uppercase text-white/40 hover:text-white transition-colors"
                >
                  ← Back
                </button>
              )}
              {/* selects/booleans auto-advance; everything else gets a button */}
              {QUESTIONS[screen].type !== "select" &&
                QUESTIONS[screen].type !== "boolean" && (
                  <button
                    onClick={() => handleNext()}
                    className="ml-auto bg-white text-black px-8 py-4 text-xs tracking-[0.2em] uppercase font-bold hover:bg-electric transition-colors"
                  >
                    Continue
                  </button>
                )}
            </div>

            <p className="mt-10 text-[11px] text-white/30 leading-relaxed max-w-md">
              Your answers save as you go — no need to finish in one sitting.
              This is a soft inquiry and never affects your credit.
            </p>
          </div>
        ) : (
          <AccountGate
            applicationId={applicationId}
            email={answers.email ?? ""}
            onBack={handleBack}
            claimAndSubmit={claimAndSubmit}
          />
        )}
      </main>

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

// ── Account gate: in-page email OTP so the applicant never leaves the flow ──
function AccountGate({
  applicationId,
  email,
  onBack,
  claimAndSubmit,
}: {
  applicationId: string | null;
  email: string;
  onBack: () => void;
  claimAndSubmit: () => Promise<boolean>;
}) {
  const [stage, setStage] = useState<GateStage>("intro");
  const [gateEmail, setGateEmail] = useState(email);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If the applicant is already signed in, claim + submit straight away.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session && stage !== "done") {
        const ok = await claimAndSubmit();
        if (ok) setStage("done");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gateEmail.trim())) {
      setErr("Enter a valid email.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: gateEmail.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setStage("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: gateEmail.trim(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setBusy(false);
      setErr("That code didn't work. Check the email and try again.");
      return;
    }
    void trackEvent("account_created", { applicationId });
    const ok = await claimAndSubmit();
    setBusy(false);
    if (ok) setStage("done");
    else setErr("Account created, but we couldn't attach your application. We still have your answers — we'll reach out.");
  }

  if (stage === "done") {
    return (
      <div className="text-center space-y-6 animate-[fadeIn_0.4s_ease]">
        <div className="font-display text-electric text-6xl md:text-7xl uppercase">
          You're in.
        </div>
        <p className="text-white/60 max-w-md mx-auto">
          Your application is submitted and your account is live. Next up: upload
          your last few months of bank statements so we can match you with the
          right offer.
        </p>
        <Link
          to="/dashboard"
          className="inline-block bg-white text-black px-8 py-4 text-xs tracking-[0.2em] uppercase font-bold hover:bg-electric transition-colors"
        >
          Go to my portal
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.4s_ease]">
      <div>
        <p className="text-xs tracking-[0.3em] uppercase text-electric mb-3">
          Last step
        </p>
        <h2 className="font-display text-3xl md:text-5xl uppercase text-white leading-[1.05]">
          Create your account to lock it in
        </h2>
        <p className="text-white/50 text-sm mt-3 max-w-md">
          No password. We'll email you a 6-digit code — enter it here and your
          application is submitted, plus you get a portal to track your offer and
          upload documents.
        </p>
      </div>

      {stage === "intro" ? (
        <form onSubmit={sendCode} className="space-y-4 max-w-sm">
          <input
            type="email"
            value={gateEmail}
            onChange={(e) => setGateEmail(e.target.value)}
            placeholder="you@business.com"
            className="w-full bg-transparent border-b border-white/20 py-4 text-xl text-white placeholder:text-white/25 focus:border-electric outline-none transition-colors"
          />
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-white text-black py-4 text-xs tracking-[0.2em] uppercase font-bold hover:bg-electric transition-colors disabled:opacity-50"
          >
            {busy ? "Sending…" : "Email me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4 max-w-sm">
          <p className="text-white/60 text-sm">
            Code sent to <span className="text-white">{gateEmail}</span>.
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            className="w-full bg-transparent border-b border-white/20 py-4 text-3xl tracking-[0.5em] text-center text-white placeholder:text-white/25 focus:border-electric outline-none transition-colors font-display"
          />
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <button
            type="submit"
            disabled={busy || code.length < 6}
            className="w-full bg-white text-black py-4 text-xs tracking-[0.2em] uppercase font-bold hover:bg-electric transition-colors disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Submit application"}
          </button>
          <button
            type="button"
            onClick={() => { setStage("intro"); setCode(""); setErr(null); }}
            className="text-xs text-white/40 hover:text-white/70 transition-colors underline underline-offset-4"
          >
            Use a different email
          </button>
        </form>
      )}

      <button
        onClick={onBack}
        className="text-xs tracking-[0.2em] uppercase text-white/40 hover:text-white transition-colors"
      >
        ← Back
      </button>
    </div>
  );
}
