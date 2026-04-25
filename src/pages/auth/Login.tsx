import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import pmgLogo from "@/assets/pmg-logo-clean.png";

type Mode = "magic" | "password";

export default function Login() {
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) return <Navigate to="/dashboard" replace />;

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setSubmitting(false);
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) setError(err.message);
    else setSent(true);
    setSubmitting(false);
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-12">
          <img src={pmgLogo} alt="PMG" className="h-8 w-auto" />
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="text-electric text-5xl font-display">CHECK IT</div>
            <p className="text-white/60 text-sm">
              Magic link sent to <span className="text-white">{email}</span>
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-xs text-white/40 hover:text-white/70 transition-colors underline underline-offset-4 mt-4"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-display text-white uppercase">Staff Login</h1>
              <p className="text-white/40 text-xs tracking-widest uppercase">PMG Internal</p>
            </div>

            {/* Mode toggle */}
            <div className="flex border border-white/10">
              <button
                onClick={() => { setMode("password"); setError(null); }}
                className={`flex-1 py-2 text-[10px] uppercase tracking-widest transition-colors ${
                  mode === "password" ? "bg-white text-black" : "text-white/40 hover:text-white"
                }`}
              >
                Password
              </button>
              <button
                onClick={() => { setMode("magic"); setError(null); }}
                className={`flex-1 py-2 text-[10px] uppercase tracking-widest transition-colors ${
                  mode === "magic" ? "bg-white text-black" : "text-white/40 hover:text-white"
                }`}
              >
                Magic Link
              </button>
            </div>

            {mode === "password" ? (
              <form onSubmit={handlePassword} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full bg-transparent border-b border-white/20 py-3 text-sm text-white placeholder:text-white/30 focus:border-electric outline-none transition-colors"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full bg-transparent border-b border-white/20 py-3 text-sm text-white placeholder:text-white/30 focus:border-electric outline-none transition-colors"
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-white text-black py-4 text-xs tracking-[0.2em] uppercase font-bold hover:bg-electric transition-colors disabled:opacity-50"
                >
                  {submitting ? "Signing in…" : "Sign In"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full bg-transparent border-b border-white/20 py-3 text-sm text-white placeholder:text-white/30 focus:border-electric outline-none transition-colors"
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-white text-black py-4 text-xs tracking-[0.2em] uppercase font-bold hover:bg-electric transition-colors disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Send Magic Link"}
                </button>
              </form>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-black px-4 text-xs text-white/30 uppercase tracking-widest">or</span>
              </div>
            </div>

            <button
              onClick={handleGoogle}
              className="w-full border border-white/20 text-white py-4 text-xs tracking-[0.2em] uppercase font-bold hover:border-white/60 transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
