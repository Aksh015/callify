"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";

type BusinessCategory = "doctor" | "hotel";
type Tier = 1 | 2 | 3 | 4;

type BusinessDetails = {
    businessName: string;
    ownerName: string;
    email: string;
    phone: string;
    category: BusinessCategory;
    city: string;
};

type IntegrationConfig = {
    messagingProvider: string;
    messagingToken: string;
    whatsappNumber: string;
    whatsappApiKey: string;
    emailFrom: string;
    emailApiKey: string;
    enableDashboard: boolean;
    customMcpTools: string;
};

const steps = ["Business", "KB Upload", "Tier", "Config", "Payment", "Provisioned"];

const tierText: Record<Tier, string> = {
    1: "KB + number provisioning only",
    2: "Tier 1 + messaging, WhatsApp, email config",
    3: "Tier 2 + hosted dashboard link provisioning",
    4: "Tier 3 baseline + optional modules + MCP customization",
};

function createBusinessSlug(name: string) {
    return (
        name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-") || "business"
    );
}

export default function OnboardingPage() {
    const [step, setStep] = useState(0);
    const [tier, setTier] = useState<Tier | null>(null);
    const [knowledgeBaseId, setKnowledgeBaseId] = useState("");
    const [provisionedNumber, setProvisionedNumber] = useState("");
    const [persistedDashboardUrl, setPersistedDashboardUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [kbTestQuery, setKbTestQuery] = useState("");
    const [kbTestResponse, setKbTestResponse] = useState("");
    const [kbTestLoading, setKbTestLoading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [errors, setErrors] = useState<string[]>([]);

    const [business, setBusiness] = useState<BusinessDetails>({
        businessName: "",
        ownerName: "",
        email: "",
        phone: "",
        category: "doctor",
        city: "",
    });

    const [config, setConfig] = useState<IntegrationConfig>({
        messagingProvider: "",
        messagingToken: "",
        whatsappNumber: "",
        whatsappApiKey: "",
        emailFrom: "",
        emailApiKey: "",
        enableDashboard: false,
        customMcpTools: "",
    });

    const dashboardUrl = useMemo(() => {
        const slug = createBusinessSlug(business.businessName);
        return `https://${slug}.mydomain.in`;
    }, [business.businessName]);

    const validateBusinessStep = () => {
        const currentErrors: string[] = [];
        if (!business.businessName.trim()) currentErrors.push("Business name is required.");
        if (!business.ownerName.trim()) currentErrors.push("Owner name is required.");
        if (!business.email.trim()) currentErrors.push("Email is required.");
        if (!business.phone.trim()) currentErrors.push("Phone is required.");
        if (!business.city.trim()) currentErrors.push("City is required.");
        setErrors(currentErrors);
        return currentErrors.length === 0;
    };

    const validateKbStep = () => {
        const currentErrors: string[] = [];
        if (uploadedFiles.length === 0) currentErrors.push("Please upload at least one KB file.");
        if (uploadedFiles.length > 5) currentErrors.push("You can upload up to 5 files only.");

        uploadedFiles.forEach((file) => {
            if (file.size > 10 * 1024 * 1024) {
                currentErrors.push(`${file.name} is larger than 10MB.`);
            }
        });

        setErrors(currentErrors);
        return currentErrors.length === 0;
    };

    const validateTierStep = () => {
        const currentErrors: string[] = [];
        if (!tier) currentErrors.push("Please choose one tier.");
        setErrors(currentErrors);
        return currentErrors.length === 0;
    };

    const validateConfigStep = () => {
        if (!tier) return false;

        const currentErrors: string[] = [];
        const needsTier2Fields = tier === 2 || tier === 3;

        if (needsTier2Fields) {
            if (!config.messagingProvider.trim()) currentErrors.push("Messaging provider is required.");
            if (!config.messagingToken.trim()) currentErrors.push("Messaging token is required.");
            if (!config.whatsappNumber.trim()) currentErrors.push("WhatsApp number is required.");
            if (!config.whatsappApiKey.trim()) currentErrors.push("WhatsApp API key is required.");
            if (!config.emailFrom.trim()) currentErrors.push("Email from address is required.");
            if (!config.emailApiKey.trim()) currentErrors.push("Email API key is required.");
        }

        if (tier === 4 && config.customMcpTools.trim().length < 20) {
            currentErrors.push("For Tier 4, add MCP customization text (20+ chars).");
        }

        setErrors(currentErrors);
        return currentErrors.length === 0;
    };

    const submitOnboarding = async () => {
        if (!tier) return;

        setIsSubmitting(true);
        setErrors([]);

        try {
            const formData = new FormData();
            formData.append("business", JSON.stringify(business));
            formData.append("tier", String(tier));
            formData.append("integrationConfig", JSON.stringify(config));
            uploadedFiles.forEach((file) => formData.append("kbFiles", file));

            const response = await fetch("/api/onboarding", {
                method: "POST",
                body: formData,
            });

            const data = (await response.json()) as {
                error?: string;
                knowledgeBaseId?: string;
                provisionedNumber?: string;
                dashboardUrl?: string | null;
            };

            if (!response.ok) {
                throw new Error(data.error || "Failed to complete onboarding.");
            }

            setKnowledgeBaseId(data.knowledgeBaseId || "");
            setProvisionedNumber(data.provisionedNumber || "");
            setPersistedDashboardUrl(data.dashboardUrl || null);
            setStep(5);
        } catch (error) {
            setErrors([
                error instanceof Error
                    ? error.message
                    : "Failed to save onboarding. Please try again.",
            ]);
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextStep = async () => {
        const validators: Record<number, () => boolean> = {
            0: validateBusinessStep,
            1: validateKbStep,
            2: validateTierStep,
            3: validateConfigStep,
            4: () => true,
        };

        const isValid = validators[step]?.() ?? true;
        if (!isValid) return;

        if (step === 4) {
            await submitOnboarding();
            return;
        }

        setErrors([]);
        setStep((prev) => Math.min(prev + 1, 5));
    };

    const previousStep = () => {
        setErrors([]);
        setStep((prev) => Math.max(prev - 1, 0));
    };

    const onUploadChange = (files: FileList | null) => {
        if (!files) return;
        setUploadedFiles(Array.from(files));
    };

    const resetFlow = () => {
        setStep(0);
        setKnowledgeBaseId("");
        setProvisionedNumber("");
        setPersistedDashboardUrl(null);
        setKbTestQuery("");
        setKbTestResponse("");
        setTier(null);
        setUploadedFiles([]);
        setErrors([]);
    };

    const runKbTest = async () => {
        if (!knowledgeBaseId || !kbTestQuery.trim()) return;
        setKbTestLoading(true);
        setKbTestResponse("");

        try {
            const response = await fetch("/api/runtime/turn", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    utterance: kbTestQuery,
                    languageCode: "en-IN",
                    context: {
                        knowledgeBaseId,
                        businessInfo: {
                            name: business.businessName,
                            openingHours: "9 AM - 10 PM",
                        },
                    },
                }),
            });

            const data = (await response.json()) as { responseText?: string; error?: string };
            if (!response.ok) {
                throw new Error(data.error || "Failed to run KB test.");
            }

            setKbTestResponse(data.responseText || "No response generated.");
        } catch (error) {
            setKbTestResponse(error instanceof Error ? error.message : "Failed to run KB test.");
        } finally {
            setKbTestLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
            <div className="mx-auto max-w-6xl">
                <div className="mb-6 flex items-center justify-between">
                    <Link href="/" className="text-sm text-cyan-300 transition hover:text-cyan-200">
                        ← Back to Home
                    </Link>
                    <p className="text-sm text-slate-400">
                        Step {step + 1} of {steps.length}
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
                >
                    <h1 className="text-3xl font-semibold">VoiceDesk Onboarding</h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Complete setup and provision your AI customer care number.
                    </p>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3 md:grid-cols-6">
                        {steps.map((item, idx) => (
                            <div
                                key={item}
                                className={`rounded px-2 py-1 text-center text-xs ${idx <= step ? "bg-cyan-400/20 text-cyan-200" : "bg-white/5 text-slate-400"
                                    }`}
                            >
                                {item}
                            </div>
                        ))}
                    </div>

                    {errors.length > 0 && (
                        <div className="mt-5 rounded-xl border border-rose-300/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                            <ul className="space-y-1">
                                {errors.map((error) => (
                                    <li key={error}>• {error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="mt-6">
                        {step === 0 && (
                            <section className="grid gap-4 md:grid-cols-2">
                                <Field label="Business Name" value={business.businessName} onChange={(v) => setBusiness((p) => ({ ...p, businessName: v }))} />
                                <Field label="Owner Name" value={business.ownerName} onChange={(v) => setBusiness((p) => ({ ...p, ownerName: v }))} />
                                <Field label="Email" type="email" value={business.email} onChange={(v) => setBusiness((p) => ({ ...p, email: v }))} />
                                <Field label="Phone" value={business.phone} onChange={(v) => setBusiness((p) => ({ ...p, phone: v }))} />
                                <Field label="City" value={business.city} onChange={(v) => setBusiness((p) => ({ ...p, city: v }))} />
                                <label className="space-y-2">
                                    <span className="text-sm text-slate-300">Category</span>
                                    <select
                                        value={business.category}
                                        onChange={(e) => setBusiness((p) => ({ ...p, category: e.target.value as BusinessCategory }))}
                                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
                                    >
                                        <option value="doctor">Doctor</option>
                                        <option value="hotel">Hotel</option>
                                    </select>
                                </label>
                            </section>
                        )}

                        {step === 1 && (
                            <section>
                                <h2 className="text-xl font-semibold">Upload Knowledge Base</h2>
                                <p className="mt-2 text-sm text-slate-400">Upload PDFs/TXT/CSV (up to 5 files, 10MB each).</p>
                                <div className="mt-4 rounded-xl border border-dashed border-white/20 p-5">
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.txt,.csv"
                                        onChange={(e) => onUploadChange(e.target.files)}
                                        className="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:text-slate-900"
                                    />
                                </div>
                                {uploadedFiles.length > 0 && (
                                    <ul className="mt-3 space-y-1 text-sm text-slate-300">
                                        {uploadedFiles.map((f) => (
                                            <li key={f.name}>• {f.name} ({(f.size / (1024 * 1024)).toFixed(2)} MB)</li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        )}

                        {step === 2 && (
                            <section>
                                <h2 className="text-xl font-semibold">Choose Tier</h2>
                                <div className="mt-4 grid gap-3">
                                    {[1, 2, 3, 4].map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setTier(value as Tier)}
                                            className={`rounded-xl border p-4 text-left ${tier === value ? "border-cyan-300 bg-cyan-400/15" : "border-white/10 bg-white/[0.02]"
                                                }`}
                                        >
                                            <p className="font-medium">Tier {value}</p>
                                            <p className="mt-1 text-sm text-slate-300">{tierText[value as Tier]}</p>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {step === 3 && tier && (
                            <section className="space-y-4">
                                <h2 className="text-xl font-semibold">Tier Configuration</h2>
                                {(tier === 2 || tier === 3) && (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Messaging Provider" value={config.messagingProvider} onChange={(v) => setConfig((p) => ({ ...p, messagingProvider: v }))} />
                                        <Field label="Messaging Token" value={config.messagingToken} onChange={(v) => setConfig((p) => ({ ...p, messagingToken: v }))} />
                                        <Field label="WhatsApp Number" value={config.whatsappNumber} onChange={(v) => setConfig((p) => ({ ...p, whatsappNumber: v }))} />
                                        <Field label="WhatsApp API Key" value={config.whatsappApiKey} onChange={(v) => setConfig((p) => ({ ...p, whatsappApiKey: v }))} />
                                        <Field label="Email From" value={config.emailFrom} onChange={(v) => setConfig((p) => ({ ...p, emailFrom: v }))} />
                                        <Field label="Email API Key" value={config.emailApiKey} onChange={(v) => setConfig((p) => ({ ...p, emailApiKey: v }))} />
                                    </div>
                                )}

                                {tier === 4 && (
                                    <div className="space-y-3 rounded-xl border border-white/10 p-4">
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={config.enableDashboard}
                                                onChange={(e) => setConfig((p) => ({ ...p, enableDashboard: e.target.checked }))}
                                            />
                                            Enable Dashboard
                                        </label>
                                        <label className="space-y-2 block">
                                            <span className="text-sm text-slate-300">MCP Tool Customization</span>
                                            <textarea
                                                value={config.customMcpTools}
                                                onChange={(e) => setConfig((p) => ({ ...p, customMcpTools: e.target.value }))}
                                                className="h-24 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
                                            />
                                        </label>
                                    </div>
                                )}
                            </section>
                        )}

                        {step === 4 && (
                            <section>
                                <h2 className="text-xl font-semibold">Payment (placeholder)</h2>
                                <p className="mt-2 text-sm text-slate-400">Cashfree sandbox integration will be implemented in final payment step.</p>
                            </section>
                        )}

                        {step === 5 && (
                            <section className="space-y-4">
                                <h2 className="text-2xl font-semibold text-emerald-300">Provisioning Complete</h2>
                                <p className="text-sm text-slate-300">Your Tier setup is saved and number is provisioned.</p>
                                <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-4">
                                    <p className="text-sm">Issued Number</p>
                                    <p className="text-3xl font-semibold">{provisionedNumber}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 p-4 text-sm">
                                    <p>Knowledge Base ID: {knowledgeBaseId || "-"}</p>
                                    {(tier === 3 || (tier === 4 && config.enableDashboard)) && (
                                        <p>
                                            Dashboard URL: <a href={persistedDashboardUrl || dashboardUrl} className="text-cyan-300">{persistedDashboardUrl || dashboardUrl}</a>
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/5 p-4">
                                    <p className="text-sm font-medium text-cyan-200">Tier-1 KB Test</p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Ask a question from uploaded PDF/TXT KB and test MCP `search_knowledge` instantly.
                                    </p>
                                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                        <input
                                            value={kbTestQuery}
                                            onChange={(event) => setKbTestQuery(event.target.value)}
                                            placeholder="Example: what is refund policy?"
                                            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={runKbTest}
                                            disabled={kbTestLoading || !knowledgeBaseId}
                                            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
                                        >
                                            {kbTestLoading ? "Testing..." : "Test Query"}
                                        </button>
                                    </div>
                                    {kbTestResponse && (
                                        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-200">
                                            {kbTestResponse}
                                        </div>
                                    )}
                                </div>

                                <button onClick={resetFlow} className="rounded-lg bg-cyan-400 px-4 py-2 text-slate-900">Onboard Another</button>
                            </section>
                        )}
                    </div>

                    {step < 5 && (
                        <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
                            <button
                                type="button"
                                onClick={previousStep}
                                disabled={step === 0 || isSubmitting}
                                className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                onClick={nextStep}
                                disabled={isSubmitting}
                                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-900 disabled:opacity-60"
                            >
                                {step === 4 ? (isSubmitting ? "Saving..." : "Complete Setup") : "Continue"}
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </main>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
}) {
    return (
        <label className="space-y-2">
            <span className="text-sm text-slate-300">{label}</span>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            />
        </label>
    );
}
