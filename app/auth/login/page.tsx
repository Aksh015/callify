"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/onboarding";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  return (
    <main style={S.root}>
      {/* Animated Background */}
      <div style={S.bgLayer}>
        <div style={S.orb1} />
        <div style={S.orb2} />
        <div style={S.orb3} />
        <div style={S.grid} />
      </div>

      {/* Card */}
      <div style={S.card}>
        {/* Inner glow */}
        <div style={S.cardGlow} />

        {/* Logo Area */}
        <div style={S.logoWrap}>
          <div style={S.logoRing}>
            <div style={S.logoRingInner}>
              <span style={S.logoEmoji}>📞</span>
            </div>
          </div>
          <div style={S.logoBrand}>
            <span style={S.logoBrandAccent}>Callify</span>
            <span style={S.logoBrandAI}> AI</span>
          </div>
        </div>

        {/* Headline */}
        <h1 style={S.title}>Welcome back</h1>
        <p style={S.subtitle}>
          Sign in to your account to manage your hotel&apos;s AI Voice Receptionist and bookings.
        </p>

        {/* Error Banner */}
        {error && (
          <div style={S.errorBanner}>
            <div style={S.errorDot} />
            {error}
          </div>
        )}

        {/* Google Button */}
        <button
          id="google-signin-btn"
          onClick={() => void handleGoogleLogin()}
          disabled={loading}
          style={{
            ...S.googleBtn,
            opacity: loading ? 0.65 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(251,191,36,0.4)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }
          }}
        >
          {loading ? (
            <>
              <div style={S.spinner} />
              Redirecting you...
            </>
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>

        {/* Divider */}
        <div style={S.divider}>
          <div style={S.dividerLine} />
          <span style={S.dividerText}>Secure OAuth 2.0</span>
          <div style={S.dividerLine} />
        </div>

        {/* Feature Pills */}
        <div style={S.features}>
          {["AI Voice Calls", "Room Bookings", "Analytics", "Secure Payments"].map((f) => (
            <span key={f} style={S.featurePill}>{f}</span>
          ))}
        </div>

        {/* Terms */}
        <p style={S.terms}>
          By signing in, you agree to our{" "}
          <a href="#" style={S.termsLink}>Terms of Service</a>
          {" "}and{" "}
          <a href="#" style={S.termsLink}>Privacy Policy</a>.
        </p>
      </div>

      <style>{`
        @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-50px) scale(1.08)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-40px,40px) scale(1.05)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,30px) scale(1.1)} }
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity:0.7; }
          50% { transform: scale(1.05); opacity:0.4; }
          100% { transform: scale(0.9); opacity:0.7; }
        }
      `}</style>
    </main>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#020510",
    fontFamily: "'Space Grotesk', sans-serif",
    position: "relative",
    overflow: "hidden",
    padding: "24px 16px",
  },
  bgLayer: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    overflow: "hidden",
  },
  orb1: {
    position: "absolute",
    top: "-20%",
    left: "-15%",
    width: "60%",
    height: "60%",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)",
    filter: "blur(80px)",
    animation: "float1 14s ease-in-out infinite",
  },
  orb2: {
    position: "absolute",
    bottom: "-20%",
    right: "-15%",
    width: "65%",
    height: "65%",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)",
    filter: "blur(100px)",
    animation: "float2 18s ease-in-out infinite",
  },
  orb3: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "40%",
    height: "40%",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(236,72,153,0.05) 0%, transparent 70%)",
    filter: "blur(60px)",
    animation: "float3 22s ease-in-out infinite",
  },
  grid: {
    position: "absolute",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(251,191,36,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(251,191,36,0.025) 1px, transparent 1px)
    `,
    backgroundSize: "60px 60px",
  },
  card: {
    position: "relative",
    zIndex: 10,
    width: "100%",
    maxWidth: 420,
    padding: "44px 40px",
    borderRadius: 28,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(6, 8, 18, 0.9)",
    backdropFilter: "blur(32px)",
    WebkitBackdropFilter: "blur(32px)",
    boxShadow: "0 40px 120px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.07)",
    textAlign: "center",
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    background: "linear-gradient(180deg, rgba(251,191,36,0.04) 0%, transparent 100%)",
    pointerEvents: "none",
  },
  logoWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
  },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    border: "1.5px solid rgba(251,191,36,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "pulse-ring 3s ease-in-out infinite",
    background: "rgba(251,191,36,0.04)",
  },
  logoRingInner: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))",
    border: "1px solid rgba(251,191,36,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoEmoji: {
    fontSize: 26,
    lineHeight: 1,
  },
  logoBrand: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  logoBrandAccent: {
    color: "#fbbf24",
  },
  logoBrandAI: {
    color: "rgba(255,255,255,0.5)",
    fontWeight: 400,
  },
  title: {
    fontSize: 30,
    fontWeight: 800,
    color: "#fff",
    letterSpacing: "-0.03em",
    marginBottom: 10,
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.38)",
    lineHeight: 1.7,
    marginBottom: 28,
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(239,68,68,0.2)",
    background: "rgba(239,68,68,0.06)",
    color: "#fca5a5",
    fontSize: 13,
    textAlign: "left",
  },
  errorDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#ef4444",
    flexShrink: 0,
  },
  googleBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: "15px 24px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.06)",
    color: "#f3f7fe",
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "'Space Grotesk', sans-serif",
    transition: "all 0.22s ease",
    letterSpacing: "0.01em",
  },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.15)",
    borderTopColor: "#fbbf24",
    animation: "spin 0.7s linear infinite",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "24px 0",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "rgba(255,255,255,0.06)",
  },
  dividerText: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.2)",
    whiteSpace: "nowrap",
  },
  features: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: 24,
  },
  featurePill: {
    padding: "5px 12px",
    borderRadius: 999,
    border: "1px solid rgba(251,191,36,0.15)",
    background: "rgba(251,191,36,0.04)",
    color: "rgba(251,191,36,0.65)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.05em",
  },
  terms: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.2)",
    lineHeight: 1.6,
  },
  termsLink: {
    color: "rgba(251,191,36,0.5)",
    textDecoration: "none",
  },
};

// ─── Google Icon ─────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.09 24.09 0 0 0 0 21.56l7.98-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// ─── Page Export ─────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#020510", color: "#f3f7fe" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.08)",
            borderTopColor: "#fbbf24",
            animation: "spin 0.7s linear infinite",
          }} />
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
