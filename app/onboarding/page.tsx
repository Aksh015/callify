"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Tier = 1 | 2;

type HotelDetails = {
    hotelName: string;
    city: string;
    phone: string;
    timezone: string;
    systemPrompt: string;
};

const steps = ["Hotel Setup", "Choose Plan", "Payment"];

const tiers: Array<{
    id: Tier;
    name: string;
    amount: number;
    pitch: string;
    benefits: string[];
    icon: string;
}> = [
        {
            id: 1,
            name: "Starter",
            amount: 6,
            pitch: "Your hotel's AI voice agent handles guest calls 24/7 — room info, availability & FAQs.",
            benefits: [
                "AI Voice Receptionist (24/7)",
                "Room Availability Queries",
                "Hotel FAQ & Info Handling",
                "Basic Manager Dashboard",
            ],
            icon: "🏨",
        },
        {
            id: 2,
            name: "Pro",
            amount: 7,
            pitch: "Everything in Starter, plus guests can pay online and book rooms directly over the phone.",
            benefits: [
                "Everything in Starter",
                "Online Room Reservation via Call",
                "Secure IVR Payments (Cashfree)",
                "Full Analytics Dashboard",
            ],
            icon: "🚀",
        },
    ];

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
    const raw = await response.text();
    if (!raw.trim()) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

function loadCashfreeSDK(): Promise<any> {
    return new Promise((resolve, reject) => {
        if ((window as any).Cashfree) {
            const cf = new (window as any).Cashfree({
                mode: process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === "production" ? "production" : "sandbox",
            });
            resolve(cf);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
        script.onload = () => {
            if ((window as any).Cashfree) {
                const cf = new (window as any).Cashfree({
                    mode: process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === "production" ? "production" : "sandbox",
                });
                resolve(cf);
            } else {
                reject(new Error("Cashfree SDK failed to load."));
            }
        };
        script.onerror = () => reject(new Error("Failed to load Cashfree SDK script."));
        document.head.appendChild(script);
    });
}

export default function OnboardingPage() {
    const router = useRouter();
    const [authChecked, setAuthChecked] = useState(false);
    const [step, setStep] = useState(0);
    const [tier, setTier] = useState<Tier | null>(null);
    const [businessId, setBusinessId] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<"idle" | "creating" | "processing" | "verifying" | "success" | "failed">("idle");
    const [error, setError] = useState("");

    const [hotel, setHotel] = useState<HotelDetails>({
        hotelName: "",
        city: "",
        phone: "",
        timezone: "Asia/Kolkata",
        systemPrompt: "",
    });

    const selectedTier = useMemo(() => tiers.find((item) => item.id === tier) || null, [tier]);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((res) => {
                if (!res.ok) {
                    window.location.href = "/auth/login?redirect=/onboarding";
                    return;
                }
                return res.json();
            })
            .then((data) => {
                if (!data) return;
                if (data?.profile?.plan_status === "active") {
                    window.location.href = "/dashboard";
                    return;
                }
                setAuthChecked(true);
            })
            .catch(() => {
                window.location.href = "/auth/login?redirect=/onboarding";
            });
    }, []);

    function validateCurrentStep() {
        if (step === 0) {
            if (!hotel.hotelName.trim()) return "Hotel name is required.";
            if (!hotel.city.trim()) return "City is required.";
            if (!hotel.phone.trim()) return "Front desk phone number is required.";
        }
        if (step === 1 && !tier) return "Please select a plan to continue.";
        return "";
    }

    async function saveOnboardingDetails() {
        if (!tier) return null;
        setIsSaving(true);
        setError("");
        try {
            const response = await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hotel, tier }),
            });
            const data = (await parseJsonSafe<{ error?: string; businessId?: string }>(response)) || {};
            if (!response.ok || !data.businessId) {
                throw new Error(data.error || "Failed to save hotel details.");
            }
            setBusinessId(data.businessId);
            return data.businessId;
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save hotel details.");
            return null;
        } finally {
            setIsSaving(false);
        }
    }

    async function handlePayment() {
        if (!tier) return;
        setIsPaying(true);
        setError("");

        try {
            // Step 1: Verify session is still valid
            setPaymentStatus("creating");
            const meRes = await fetch("/api/auth/me");
            if (!meRes.ok) {
                window.location.href = "/auth/login?redirect=/onboarding";
                return;
            }

            // Step 2: Save hotel details if not already saved
            let activeBusinessId = businessId;
            if (!activeBusinessId) {
                const savedId = await saveOnboardingDetails();
                if (!savedId) {
                    setIsPaying(false);
                    setPaymentStatus("failed");
                    return;
                }
                activeBusinessId = savedId;
            }

            // Step 3: Create Cashfree order
            const checkoutRes = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId: activeBusinessId, tier }),
            });

            const checkoutData = (await parseJsonSafe<{
                error?: string;
                paymentSessionId?: string;
                orderId?: string;
            }>(checkoutRes)) || {};

            if (checkoutRes.status === 401) {
                window.location.href = "/auth/login?redirect=/onboarding";
                return;
            }

            if (!checkoutRes.ok || !checkoutData.paymentSessionId || !checkoutData.orderId) {
                throw new Error(checkoutData.error || "Failed to initiate payment. Please try again.");
            }

            // Step 4: Launch Cashfree checkout modal
            setPaymentStatus("processing");
            const cashfree = await loadCashfreeSDK();
            const result = await cashfree.checkout({
                paymentSessionId: checkoutData.paymentSessionId,
                redirectTarget: "_modal",
            });

            if (result.error) {
                throw new Error(result.error.message || "Payment was cancelled or failed.");
            }

            // Step 5: Verify payment on server
            setPaymentStatus("verifying");
            const verifyRes = await fetch("/api/billing/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: checkoutData.orderId, businessId: activeBusinessId }),
            });

            const verifyData = (await parseJsonSafe<{ error?: string; status?: string }>(verifyRes)) || {};

            if (!verifyRes.ok) {
                throw new Error(verifyData.error || "Payment verification failed.");
            }

            if (verifyData.status !== "SUCCESS") {
                throw new Error("Payment not confirmed yet. Please wait a moment and check your dashboard.");
            }

            // Step 6: Success!
            setPaymentStatus("success");
            setTimeout(() => {
                router.push("/dashboard?payment=success");
            }, 1200);

        } catch (e) {
            setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
            setPaymentStatus("failed");
        } finally {
            setIsPaying(false);
        }
    }

    function nextStep() {
        const validationError = validateCurrentStep();
        if (validationError) { setError(validationError); return; }
        setError("");
        setStep((prev) => Math.min(prev + 1, steps.length - 1));
    }

    function previousStep() {
        setError("");
        setPaymentStatus("idle");
        setStep((prev) => Math.max(prev - 1, 0));
    }

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
    }

    if (!authChecked) {
        return (
            <main style={S.loadingScreen}>
                <div style={S.loadingOrb} />
                <div style={S.loadingContent}>
                    <div style={S.loadingSpinner} />
                    <p style={S.loadingText}>Initializing your workspace...</p>
                </div>
            </main>
        );
    }

    const progressPercent = ((step + 1) / steps.length) * 100;

    return (
        <main style={S.root}>
            {/* Animated Background */}
            <div style={S.bgLayer}>
                <div style={S.orb1} />
                <div style={S.orb2} />
                <div style={S.orb3} />
                <div style={S.gridOverlay} />
            </div>

            {/* Scrollable Content */}
            <div style={S.scrollArea}>
                <div style={S.contentWrap}>

                    {/* Top Nav */}
                    <div style={S.topNav}>
                        <Link href="/" style={S.backLink} className="back-link">
                            <span style={S.backArrow} className="back-arrow">←</span>
                            Back to home
                        </Link>
                        <div style={S.navRight}>
                            <div style={S.stepBadge}>
                                <div style={S.stepBadgeDot} />
                                <span style={S.stepBadgeText}>Step {step + 1} of {steps.length}</span>
                            </div>
                            <button onClick={() => void handleLogout()} style={S.signOutBtn}>
                                Sign out
                            </button>
                        </div>
                    </div>

                    {/* Step Indicator */}
                    <div style={S.stepIndicatorRow}>
                        {steps.map((label, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", flex: 1, gap: 0 }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                                    <div style={{
                                        ...S.stepCircle,
                                        ...(i < step ? S.stepCircleDone : i === step ? S.stepCircleActive : S.stepCircleInactive),
                                    }}>
                                        {i < step ? "✓" : i + 1}
                                    </div>
                                    <span style={{ ...S.stepLabel, color: i <= step ? "#fbbf24" : "rgba(255,255,255,0.25)" }}>
                                        {label}
                                    </span>
                                </div>
                                {i < steps.length - 1 && (
                                    <div style={{
                                        ...S.stepConnector,
                                        background: i < step ? "linear-gradient(90deg,#fbbf24,#f59e0b)" : "rgba(255,255,255,0.06)",
                                    }} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Main Card */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -24, scale: 0.98 }}
                            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                            style={S.card}
                        >
                            {/* Card Header */}
                            <div style={S.cardHeader}>
                                <div style={S.cardHeaderGlow} />
                                <div style={S.cardHeaderInner}>
                                    <div>
                                        <div style={S.preLabel}>
                                            <span style={S.preLabelDot} />
                                            Onboarding Pre-Flight · Hotel AI Setup
                                        </div>
                                        <h1 style={S.cardTitle}>
                                            {step === 0 ? "Configure Your Hotel" : step === 1 ? "Select Your Plan" : "Activate & Pay"}
                                        </h1>
                                        <p style={S.cardSubtitle}>
                                            {step === 0 && "Tell us about your hotel so we can personalise your AI voice receptionist to match your brand and services."}
                                            {step === 1 && "Pick the plan that fits your hotel's needs. Both plans include a 24/7 AI voice receptionist for your hotel guests."}
                                            {step === 2 && "Review your hotel setup and complete the payment to activate your AI receptionist instantly."}
                                        </p>
                                    </div>
                                    <div style={S.stepEmoji}>
                                        {step === 0 ? "🏨" : step === 1 ? "⚡" : "🔐"}
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div style={S.progressTrack}>
                                    <motion.div
                                        style={S.progressFill}
                                        initial={{ width: `${(step / steps.length) * 100}%` }}
                                        animate={{ width: `${progressPercent}%` }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                    />
                                </div>
                            </div>

                            {/* Card Body */}
                            <div style={S.cardBody}>

                                {/* Error Banner */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            style={S.errorBanner}
                                        >
                                            <div style={S.errorDot} />
                                            <span>{error}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* ── Step 0: Hotel Setup ── */}
                                {step === 0 && (
                                    <div style={S.formGrid}>
                                        <Field
                                            label="Hotel Name"
                                            value={hotel.hotelName}
                                            onChange={(v) => setHotel((p) => ({ ...p, hotelName: v }))}
                                            placeholder="e.g. Grand Plaza Hotel"
                                            icon="🏨"
                                        />
                                        <Field
                                            label="City"
                                            value={hotel.city}
                                            onChange={(v) => setHotel((p) => ({ ...p, city: v }))}
                                            placeholder="e.g. Mumbai"
                                            icon="📍"
                                        />
                                        <Field
                                            label="Front Desk Phone"
                                            value={hotel.phone}
                                            onChange={(v) => setHotel((p) => ({ ...p, phone: v }))}
                                            placeholder="+91 XXXXX XXXXX"
                                            icon="📞"
                                        />
                                        <Field
                                            label="Operational Timezone"
                                            value={hotel.timezone}
                                            onChange={(v) => setHotel((p) => ({ ...p, timezone: v }))}
                                            placeholder="Asia/Kolkata"
                                            icon="🕐"
                                        />
                                        <div style={{ gridColumn: "1 / -1" }}>
                                            <label style={S.fieldLabel}>
                                                <span style={S.fieldLabelIcon}>🧠</span>
                                                AI Personality / Concierge Tone
                                                <span style={S.optionalTag}>Optional</span>
                                            </label>
                                            <textarea
                                                value={hotel.systemPrompt}
                                                onChange={(e) => setHotel((p) => ({ ...p, systemPrompt: e.target.value }))}
                                                placeholder="e.g. Warm and professional. Always highlight our rooftop pool, 24/7 room service, and complimentary breakfast."
                                                className="field-textarea"
                                                style={S.textareaInput}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* ── Step 1: Choose Plan ── */}
                                {step === 1 && (
                                    <div style={S.tierGrid}>
                                        {tiers.map((plan) => (
                                            <button
                                                key={plan.id}
                                                type="button"
                                                onClick={() => setTier(plan.id)}
                                                style={{
                                                    ...S.tierCard,
                                                    ...(tier === plan.id ? S.tierCardSelected : S.tierCardUnselected),
                                                }}
                                            >
                                                {tier === plan.id && (
                                                    <div style={S.tierCheckBadge}>✓</div>
                                                )}
                                                {plan.id === 2 && tier !== plan.id && (
                                                    <div style={S.popularBadge}>Recommended</div>
                                                )}
                                                <div style={S.tierIconWrap}>{plan.icon}</div>
                                                <div style={{ marginBottom: 14 }}>
                                                    <p style={{ ...S.tierIdLabel, color: tier === plan.id ? "#fbbf24" : "rgba(255,255,255,0.25)" }}>
                                                        Plan {plan.id}
                                                    </p>
                                                    <p style={{ ...S.tierName, color: tier === plan.id ? "#fff" : "rgba(255,255,255,0.85)" }}>
                                                        {plan.name}
                                                    </p>
                                                </div>
                                                <div style={S.tierPrice}>
                                                    <span style={S.tierPriceAmount}>₹{plan.amount}</span>
                                                    <span style={S.tierPriceUnit}>/month</span>
                                                </div>
                                                <p style={S.tierPitch}>"{plan.pitch}"</p>
                                                <div style={S.tierBenefits}>
                                                    {plan.benefits.map((item) => (
                                                        <div key={item} style={S.tierBenefitItem}>
                                                            <span style={{
                                                                ...S.tierBenefitDot,
                                                                background: tier === plan.id ? "#fbbf24" : "rgba(255,255,255,0.2)",
                                                            }} />
                                                            {item}
                                                        </div>
                                                    ))}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* ── Step 2: Payment ── */}
                                {step === 2 && selectedTier && (
                                    <div style={S.paymentGrid}>
                                        {/* Summary Card */}
                                        <div style={S.summaryCard}>
                                            <p style={S.sectionLabel}>
                                                <span>📋</span> Hotel Configuration
                                            </p>
                                            <div style={S.summaryRows}>
                                                <SummaryRow label="Hotel Name" value={hotel.hotelName} />
                                                <SummaryRow label="Location" value={hotel.city} />
                                                <SummaryRow label="Front Desk" value={hotel.phone} />
                                                <SummaryRow label="Timezone" value={hotel.timezone} />
                                                <div style={S.summaryDivider} />
                                                <SummaryRow
                                                    label="Selected Plan"
                                                    value={`${selectedTier.name} · ₹${selectedTier.amount}/mo`}
                                                    highlight
                                                />
                                            </div>
                                            <div style={S.termsNote}>
                                                🔒 Your payment is processed securely by Cashfree. By proceeding you agree to our Terms of Service and Privacy Policy.
                                            </div>
                                        </div>

                                        {/* Checkout Card */}
                                        <div style={S.checkoutCard}>
                                            <div style={S.checkoutGlow} />

                                            {paymentStatus === "success" ? (
                                                <div style={S.successState}>
                                                    <div style={S.successIcon}>✓</div>
                                                    <p style={S.successTitle}>Payment Confirmed!</p>
                                                    <p style={S.successSub}>Redirecting to your dashboard...</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <p style={S.checkoutLabel}>Checkout Total</p>
                                                    <div style={S.checkoutAmount}>
                                                        <span style={S.checkoutRupee}>₹</span>
                                                        <span style={S.checkoutNum}>{selectedTier.amount}</span>
                                                        <span style={S.checkoutDecimal}>.00</span>
                                                    </div>
                                                    <p style={S.checkoutNote}>Monthly · No hidden fees · Cancel anytime</p>

                                                    {/* Payment Status Indicator */}
                                                    {paymentStatus !== "idle" && paymentStatus !== "failed" && (
                                                        <div style={S.payStatusRow}>
                                                            <div style={S.payStatusSpinner} />
                                                            <span style={S.payStatusText}>
                                                                {paymentStatus === "creating" && "Creating secure session..."}
                                                                {paymentStatus === "processing" && "Waiting for payment..."}
                                                                {paymentStatus === "verifying" && "Verifying transaction..."}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div style={S.checkoutFeatures}>
                                                        {selectedTier.benefits.map((b) => (
                                                            <div key={b} style={S.checkoutFeatureItem}>
                                                                <span style={S.checkoutFeatureTick}>✓</span>
                                                                <span>{b}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        id="complete-payment-btn"
                                                        onClick={() => void handlePayment()}
                                                        disabled={isSaving || isPaying}
                                                        style={{
                                                            ...S.payBtn,
                                                            opacity: isSaving || isPaying ? 0.7 : 1,
                                                            cursor: isSaving || isPaying ? "not-allowed" : "pointer",
                                                        }}
                                                    >
                                                        {isPaying || isSaving ? (
                                                            <>
                                                                <div style={S.payBtnSpinner} />
                                                                {paymentStatus === "creating" ? "Creating Order..." :
                                                                    paymentStatus === "processing" ? "Processing Payment..." :
                                                                        paymentStatus === "verifying" ? "Verifying..." :
                                                                            "Please wait..."}
                                                            </>
                                                        ) : (
                                                            <>🔐 Complete Purchase · ₹{selectedTier.amount}</>
                                                        )}
                                                    </button>

                                                    <div style={S.securityRow}>
                                                        <span style={S.securityItem}>🔒 256-bit SSL</span>
                                                        <span style={S.securityItem}>🛡️ Cashfree Secured</span>
                                                        <span style={S.securityItem}>✅ PCI DSS</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Bottom Actions */}
                                <div style={S.actions}>
                                    <button
                                        type="button"
                                        onClick={previousStep}
                                        disabled={step === 0 || isPaying || isSaving}
                                        style={{
                                            ...S.prevBtn,
                                            opacity: step === 0 ? 0.2 : 1,
                                            cursor: step === 0 ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        ← Previous Step
                                    </button>

                                    {step < steps.length - 1 ? (
                                        <button
                                            type="button"
                                            id="next-step-btn"
                                            onClick={nextStep}
                                            disabled={isPaying || isSaving}
                                            style={S.nextBtn}
                                            className="next-btn"
                                        >
                                            Next Phase →
                                        </button>
                                    ) : (
                                        <Link href="/dashboard" style={S.skipLink}>
                                            Skip to dashboard →
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <style>{`
                @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-60px) scale(1.08)} }
                @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-50px,40px) scale(1.06)} }
                @keyframes float3 { 0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,50px) scale(1.1)} }
                @keyframes spin-slow { 0%{transform:rotate(0deg)}100%{transform:rotate(360deg)} }
                @keyframes pay-spin { 0%{transform:rotate(0deg)}100%{transform:rotate(360deg)} }
                @keyframes success-pop { 0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1} }
                .field-input:focus { outline:none!important; border-color:#fbbf24!important; box-shadow:0 0 0 3px rgba(251,191,36,0.15)!important; }
                .field-input::placeholder, .field-textarea::placeholder { color:rgba(255,255,255,0.18); }
                .field-textarea:focus { outline:none; border-color:#fbbf24; box-shadow:0 0 0 3px rgba(251,191,36,0.15); }
                .next-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 12px 40px rgba(251,191,36,0.45)!important; }
                .back-link:hover { color:#fbbf24!important; }
            `}</style>
        </main>
    );
}

// ─── Field Component ──────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, icon }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; icon?: string;
}) {
    return (
        <div>
            <label style={S.fieldLabel}>
                {icon && <span style={S.fieldLabelIcon}>{icon}</span>}
                {label}
            </label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="field-input"
                style={S.fieldInput}
            />
        </div>
    );
}

// ─── SummaryRow Component ─────────────────────────────────────────────────────

function SummaryRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>{label}</span>
            <span style={{
                fontSize: 13, fontWeight: 700,
                color: highlight ? "#fbbf24" : "#fff",
                maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right",
            }}>{value}</span>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
    root: { position: "fixed", inset: 0, width: "100vw", height: "100vh", background: "#020510", fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden" },
    bgLayer: { position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" },
    orb1: { position: "absolute", top: "-15%", left: "-10%", width: "55%", height: "55%", borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)", filter: "blur(60px)", animation: "float1 12s ease-in-out infinite" },
    orb2: { position: "absolute", bottom: "-20%", right: "-10%", width: "60%", height: "60%", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)", filter: "blur(80px)", animation: "float2 16s ease-in-out infinite" },
    orb3: { position: "absolute", top: "40%", left: "40%", width: "30%", height: "30%", borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)", filter: "blur(60px)", animation: "float3 20s ease-in-out infinite" },
    gridOverlay: { position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(251,191,36,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(251,191,36,0.03) 1px,transparent 1px)", backgroundSize: "60px 60px" },
    scrollArea: { position: "relative", zIndex: 10, height: "100vh", overflowY: "auto", overflowX: "hidden", padding: "0 16px", scrollbarWidth: "thin", scrollbarColor: "rgba(251,191,36,0.2) transparent" },
    contentWrap: { maxWidth: 860, margin: "0 auto", paddingTop: 28, paddingBottom: 48 },
    topNav: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
    backLink: { display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: 13, transition: "color 0.2s" },
    backArrow: { fontSize: 18, display: "inline-block", transition: "transform 0.2s" },
    navRight: { display: "flex", alignItems: "center", gap: 12 },
    stepBadge: { display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)" },
    stepBadgeDot: { width: 7, height: 7, borderRadius: "50%", background: "#fbbf24", boxShadow: "0 0 10px rgba(251,191,36,0.7)" },
    stepBadgeText: { fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" },
    signOutBtn: { padding: "6px 16px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Space Grotesk', sans-serif" },
    stepIndicatorRow: { display: "flex", alignItems: "flex-start", marginBottom: 24, gap: 0 },
    stepCircle: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "all 0.3s" },
    stepCircleActive: { background: "#fbbf24", color: "#000", boxShadow: "0 0 20px rgba(251,191,36,0.5)" },
    stepCircleDone: { background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#000" },
    stepCircleInactive: { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" },
    stepLabel: { fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", transition: "color 0.3s", textAlign: "center" },
    stepConnector: { flex: 1, height: 2, borderRadius: 2, margin: "16px 8px 0", transition: "background 0.5s" },
    card: { borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(8,10,22,0.9)", backdropFilter: "blur(32px)", boxShadow: "0 40px 120px -20px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.07)" },
    cardHeader: { position: "relative", padding: "32px 36px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" },
    cardHeaderGlow: { position: "absolute", top: 0, left: 0, right: 0, height: "100%", background: "linear-gradient(135deg,rgba(251,191,36,0.05) 0%,transparent 60%)", pointerEvents: "none" },
    cardHeaderInner: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 20 },
    preLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(251,191,36,0.7)", marginBottom: 10 },
    preLabelDot: { width: 6, height: 6, borderRadius: "50%", background: "#fbbf24", boxShadow: "0 0 8px rgba(251,191,36,0.8)" },
    cardTitle: { fontSize: 34, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 10 },
    cardSubtitle: { fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.38)", maxWidth: 520 },
    stepEmoji: { fontSize: 44, flexShrink: 0, opacity: 0.45, userSelect: "none" },
    progressTrack: { height: 3, background: "rgba(255,255,255,0.05)", marginLeft: -36, marginRight: -36 },
    progressFill: { height: "100%", background: "linear-gradient(90deg,#fbbf24,#f59e0b)", boxShadow: "0 0 12px rgba(251,191,36,0.6)", borderRadius: 2 },
    cardBody: { padding: "32px 36px" },
    errorBanner: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", color: "#fca5a5", fontSize: 13, overflow: "hidden" },
    errorDot: { width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0 },
    formGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 },
    fieldLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 },
    fieldLabelIcon: { fontSize: 14 },
    optionalTag: { marginLeft: "auto", fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", fontStyle: "italic" },
    fieldInput: { width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", transition: "border-color 0.2s,box-shadow 0.2s", boxSizing: "border-box" },
    textareaInput: { width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", transition: "border-color 0.2s,box-shadow 0.2s", resize: "none", minHeight: 110, boxSizing: "border-box", outline: "none" },
    tierGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 },
    tierCard: { position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start", padding: 28, borderRadius: 20, border: "1px solid", textAlign: "left", cursor: "pointer", transition: "all 0.3s", fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden" },
    tierCardSelected: { borderColor: "#fbbf24", background: "rgba(251,191,36,0.06)", boxShadow: "0 0 40px -8px rgba(251,191,36,0.25),inset 0 1px 0 rgba(251,191,36,0.15)" },
    tierCardUnselected: { borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" },
    tierCheckBadge: { position: "absolute", top: 16, right: 16, width: 26, height: 26, borderRadius: "50%", background: "#fbbf24", color: "#000", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(251,191,36,0.5)" },
    popularBadge: { position: "absolute", top: 16, right: 16, padding: "3px 10px", borderRadius: 999, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" },
    tierIconWrap: { fontSize: 30, marginBottom: 12 },
    tierIdLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 },
    tierName: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", textTransform: "uppercase", fontStyle: "italic" },
    tierPrice: { display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 },
    tierPriceAmount: { fontSize: 32, fontWeight: 800, color: "#fff" },
    tierPriceUnit: { fontSize: 13, color: "rgba(255,255,255,0.35)", fontStyle: "italic" },
    tierPitch: { fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 20 },
    tierBenefits: { display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: "auto" },
    tierBenefitItem: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.6)" },
    tierBenefitDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0, transition: "background 0.3s" },
    paymentGrid: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 },
    summaryCard: { padding: 28, borderRadius: 20, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column" },
    sectionLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 20 },
    summaryRows: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
    summaryDivider: { height: 1, background: "rgba(255,255,255,0.05)", margin: "10px 0" },
    termsNote: { marginTop: 20, padding: "12px 14px", borderRadius: 10, background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.08)", fontSize: 11, color: "rgba(251,191,36,0.4)", lineHeight: 1.6 },
    checkoutCard: { position: "relative", padding: 28, borderRadius: 20, border: "1px solid rgba(251,191,36,0.2)", background: "linear-gradient(145deg,rgba(251,191,36,0.08) 0%,rgba(245,158,11,0.04) 100%)", overflow: "hidden", display: "flex", flexDirection: "column" },
    checkoutGlow: { position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(251,191,36,0.12) 0%,transparent 70%)", pointerEvents: "none" },
    checkoutLabel: { fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#fbbf24", marginBottom: 8, fontStyle: "italic", position: "relative", zIndex: 1 },
    checkoutAmount: { display: "flex", alignItems: "baseline", gap: 2, marginBottom: 6, position: "relative", zIndex: 1 },
    checkoutRupee: { fontSize: 24, fontWeight: 800, color: "#fff" },
    checkoutNum: { fontSize: 58, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 },
    checkoutDecimal: { fontSize: 20, color: "#fbbf24", alignSelf: "flex-end", marginBottom: 6 },
    checkoutNote: { fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5, marginBottom: 16, position: "relative", zIndex: 1 },
    payStatusRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 12px", borderRadius: 8, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)" },
    payStatusSpinner: { width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(251,191,36,0.2)", borderTopColor: "#fbbf24", animation: "pay-spin 0.7s linear infinite", flexShrink: 0 },
    payStatusText: { fontSize: 11, color: "rgba(251,191,36,0.8)", fontWeight: 500 },
    checkoutFeatures: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, flex: 1, position: "relative", zIndex: 1 },
    checkoutFeatureItem: { display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.5)" },
    checkoutFeatureTick: { color: "#fbbf24", fontWeight: 700, fontSize: 13 },
    payBtn: { position: "relative", width: "100%", padding: "14px 20px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#000", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", transition: "all 0.3s", fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 8px 32px rgba(251,191,36,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, zIndex: 1 },
    payBtnSpinner: { width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#000", animation: "pay-spin 0.7s linear infinite" },
    securityRow: { display: "flex", justifyContent: "center", gap: 12, marginTop: 12, flexWrap: "wrap" },
    securityItem: { fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 500 },
    successState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, padding: "20px 0" },
    successIcon: { width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: 28, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 32px rgba(16,185,129,0.4)", animation: "success-pop 0.5s ease" },
    successTitle: { fontSize: 20, fontWeight: 800, color: "#fff" },
    successSub: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
    actions: { marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" },
    prevBtn: { background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 14, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif", transition: "color 0.2s" },
    nextBtn: { display: "flex", alignItems: "center", gap: 10, padding: "12px 28px", borderRadius: 14, border: "none", background: "#fff", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.25s", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" },
    skipLink: { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textDecoration: "none", transition: "color 0.2s" },
    loadingScreen: { position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#020510", fontFamily: "'Space Grotesk', sans-serif" },
    loadingOrb: { position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(251,191,36,0.08) 0%,transparent 70%)", filter: "blur(60px)" },
    loadingContent: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16, zIndex: 1 },
    loadingSpinner: { width: 36, height: 36, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.06)", borderTopColor: "#fbbf24", animation: "spin-slow 0.8s linear infinite" },
    loadingText: { color: "rgba(255,255,255,0.3)", fontSize: 13, letterSpacing: "0.05em" },
};
