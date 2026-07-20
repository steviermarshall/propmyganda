// Progressive-save controller for the funding wizard.
//
// The core promise of the flow: every answer is written to Postgres the moment
// it's given, starting from Q1 — so a merchant who bails on step 3 is still a
// lead with a name, phone, and funding amount. Answers are also mirrored to
// localStorage so a refresh resumes the UX without needing anon read access
// (the DB row is write-only from the anon key; only the account owner can read
// it back).

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  getSessionId,
  getAttribution,
  trackEvent,
} from "@/lib/funding/analytics";
import { QUESTION_KEYS, TOTAL_QUESTIONS } from "@/lib/funding/steps";

type FundingUpdate = Database["public"]["Tables"]["funding_applications"]["Update"];

const APP_ID_KEY = "pmg_funding_app_id";
const ANSWERS_KEY = "pmg_funding_answers";

export type Answers = Record<string, string>;

/** Coerce a raw string answer into the column's storage type. */
function coerce(key: string, value: string): unknown {
  if (key === "funding_amount" || key === "monthly_revenue") {
    const n = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (key === "accepts_cards") {
    if (value === "yes") return true;
    if (value === "no") return false;
    return null;
  }
  return value.trim() === "" ? null : value.trim();
}

function loadAnswers(): Answers {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(ANSWERS_KEY) ?? "{}") as Answers;
  } catch {
    return {};
  }
}

export function useFundingApplication() {
  const [answers, setAnswers] = useState<Answers>(loadAnswers);
  const [applicationId, setApplicationId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(APP_ID_KEY),
  );
  const [saving, setSaving] = useState(false);
  // guards against two rapid answers both trying to INSERT a fresh row
  const creatingRef = useRef<Promise<string | null> | null>(null);

  // mirror answers to localStorage on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
  }, [answers]);

  const persistId = useCallback((id: string | null) => {
    setApplicationId(id);
    if (typeof window === "undefined") return;
    if (id) window.localStorage.setItem(APP_ID_KEY, id);
    else window.localStorage.removeItem(APP_ID_KEY);
  }, []);

  /** Create the row on the first answer, capturing first-touch attribution. */
  const ensureApplication = useCallback(
    async (firstPatch: FundingUpdate): Promise<string | null> => {
      if (applicationId) return applicationId;
      if (creatingRef.current) return creatingRef.current;

      const attribution = getAttribution();
      const promise = (async () => {
        const { data, error } = await supabase
          .from("funding_applications")
          .insert({
            session_id: getSessionId(),
            status: "started",
            current_step: 0,
            ...attribution,
            ...firstPatch,
          } as never)
          .select("id")
          .single();
        if (error || !data) {
          creatingRef.current = null;
          return null;
        }
        const newId = (data as { id: string }).id;
        persistId(newId);
        creatingRef.current = null;
        return newId;
      })();

      creatingRef.current = promise;
      return promise;
    },
    [applicationId, persistId],
  );

  /**
   * Save a single answer. Creates the application row if this is the first
   * answer, otherwise patches the existing row. Returns the application id.
   */
  const saveAnswer = useCallback(
    async (key: string, rawValue: string, step: number): Promise<string | null> => {
      setSaving(true);
      try {
        setAnswers((prev) => ({ ...prev, [key]: rawValue }));

        const completed = Array.from(
          new Set([...Object.keys(loadAnswers()), key]),
        ).filter((k) => QUESTION_KEYS.includes(k));

        const answered = Object.keys(loadAnswers()).length + 1;
        const status = answered >= TOTAL_QUESTIONS ? "questions_complete" : "started";

        const patch: FundingUpdate = {
          [key]: coerce(key, rawValue) as never,
          current_step: step,
          completed_questions: completed,
          status,
        };

        let id = applicationId;
        if (!id) {
          id = await ensureApplication(patch);
        } else {
          await supabase.from("funding_applications").update(patch as never).eq("id", id);
        }

        void trackEvent("question_answered", {
          applicationId: id,
          questionKey: key,
        });
        return id;
      } finally {
        setSaving(false);
      }
    },
    [applicationId, ensureApplication],
  );

  /**
   * Attach the (now authenticated) user to their application via the
   * SECURITY DEFINER claim function, then mark it submitted.
   */
  const claimAndSubmit = useCallback(async (): Promise<boolean> => {
    if (!applicationId) return false;
    const { error } = await supabase.rpc("claim_funding_application", {
      app_id: applicationId,
    } as never);
    if (error) return false;

    await supabase
      .from("funding_applications")
      .update({ status: "submitted", submitted_at: new Date().toISOString() } as never)
      .eq("id", applicationId);

    void trackEvent("submitted", { applicationId });
    return true;
  }, [applicationId]);

  const setAnswer = useCallback((key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
    answers,
    applicationId,
    saving,
    setAnswer,
    saveAnswer,
    claimAndSubmit,
  };
}
