"use client";

import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const stats = [
  { label: "Average Setup Time", value: "4 min", icon: "⚡" },
  { label: "Onboarding Steps", value: "3 only", icon: "🎯" },
  { label: "Payment to Dashboard", value: "Instant", icon: "🚀" },
];

const features = [
  {
    title: "Voice + Action",
    desc: "Callers speak naturally, Callify maps requests to business actions through MCP tools.",
    icon: "🎙️",
  },
  {
    title: "Tiered Growth",
    desc: "Start with KB answering, unlock messaging, dashboard operations, and custom automation.",
    icon: "📈",
  },
  {
    title: "AWS-Ready",
    desc: "Designed for AWS-native scaling with dedicated tenant numbers and hosted business dashboard links.",
    icon: "☁️",
  },
];

const howItWorks = [
  { step: "01", title: "Upload Knowledge Base", desc: "Drop your PDFs, docs, or type your business info. Our AI learns everything about your business in seconds." },
  { step: "02", title: "Get Your AI Number", desc: "Receive a dedicated business phone number. Your AI receptionist is ready to take calls immediately." },
  { step: "03", title: "Calls Handled Automatically", desc: "Every incoming call is answered professionally. Appointments booked, queries resolved, customers delighted." },
];

const testimonials = [
  { name: "Dr. Priya Sharma", role: "Clinic Owner, Mumbai", quote: "Callify handles 80% of my patient calls. Appointment bookings happen automatically while I focus on patients." },
  { name: "Rajesh Patel", role: "Hotel Manager, Ahmedabad", quote: "Our guests get instant responses about room availability and bookings. It's like having a 24/7 front desk." },
  { name: "Sneha Iyer", role: "Salon Owner, Bangalore", quote: "Setup took 5 minutes. Now my customers book appointments by just calling. Revenue up 30% in the first month." },
];

const plans = [
  {
    name: "Starter",
    tier: "Tier 1",
    price: "₹5",
    period: "/call",
    subtitle: "KB + AI Number",
    popular: false,
    features: [
      "AI call answering from knowledge base",
      "One dedicated business number",
      "Any business category support",
    ],
  },
  {
    name: "Connect",
    tier: "Tier 2",
    price: "₹5",
    period: "/call",
    subtitle: "Comms Integrations",
    popular: true,
    features: [
      "Everything in Starter",
      "Email + WhatsApp + Message config",
      "MCP tools for outbound notifications",
    ],
  },
  {
    name: "Ops",
    tier: "Tier 3",
    price: "₹5",
    period: "/call",
    subtitle: "Dashboard Included",
    popular: false,
    features: [
      "Everything in Connect",
      "Hosted dashboard at business.mydomain.in",
      "Business operations on Callify AWS backend",
    ],
  },
  {
    name: "Custom",
    tier: "Tier 4",
    price: "₹5",
    period: "/call",
    subtitle: "Custom MCP + Self-hosted LLM",
    popular: false,
    features: [
      "Everything in Ops",
      "Client-managed MCP tool customization",
      "Advanced AWS deployment profile",
    ],
  },
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#07060b] text-white">
      {/* Ambient glow backgrounds */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-8%] top-[-5%] h-[600px] w-[600px] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute right-[-5%] top-[10%] h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[30%] h-[400px] w-[400px] rounded-full bg-amber-500/8 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#07060b]/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold">
              C
            </div>
            <span className="text-lg font-semibold tracking-tight">Callify</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm text-white/50 transition hover:text-white">How it Works</a>
            <a href="#features" className="text-sm text-white/50 transition hover:text-white">Features</a>
            <a href="#plans" className="text-sm text-white/50 transition hover:text-white">Pricing</a>
            <Link href="/demo" className="text-sm text-white/50 transition hover:text-white">Demo</Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden text-sm text-white/40 sm:block">{user.email}</span>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-medium transition hover:shadow-lg hover:shadow-violet-500/25"
                >
                  Dashboard
                </Link>
                <button
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    setUser(null);
                    router.refresh();
                  }}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm text-white/50 transition hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-medium transition hover:shadow-lg hover:shadow-violet-500/25"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-20 lg:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400" />
            </span>
            AI-Powered Voice Infrastructure
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mt-8 text-5xl font-bold leading-[1.1] tracking-tight sm:text-7xl"
          >
            Your Business Deserves an
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-amber-300 bg-clip-text text-transparent">
              {" "}AI Receptionist
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/50"
          >
            Set up in minutes. Every call answered professionally. Appointments booked automatically.
            Knowledge base queries handled 24/7. No coding required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/onboarding"
              className="group relative rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/30"
            >
              Start Free Setup
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/demo"
              className="rounded-full border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Try Live Demo
            </Link>
          </motion.div>
        </div>

        {/* Live Setup Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7 }}
          className="mx-auto mt-16 max-w-lg"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl shadow-violet-500/5 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <p className="text-sm font-medium text-white/70">Live Setup Preview</p>
            </div>
            <div className="space-y-2.5">
              <InfoRow label="Business" value="Sunrise Clinic" />
              <InfoRow label="Category" value="Healthcare" />
              <InfoRow label="Tier" value="Connect • ₹5/call" />
              <InfoRow label="Status" value="✓ Active" highlight />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center"
            >
              <p className="text-3xl">{item.icon}</p>
              <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
              <p className="mt-1 text-sm text-white/40">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-violet-400">Simple Process</p>
          <h2 className="mt-3 text-4xl font-bold">How It Works</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/40">Three steps from zero to a fully operational AI receptionist for your business.</p>
        </motion.div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {howItWorks.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8"
            >
              <span className="text-5xl font-black text-violet-500/20">{item.step}</span>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/40">{item.desc}</p>
              {i < howItWorks.length - 1 && (
                <div className="absolute -right-4 top-1/2 hidden text-white/10 md:block">→</div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-amber-400">Capabilities</p>
          <h2 className="mt-3 text-4xl font-bold">Built for Scale</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/40">From single-location clinics to multi-branch hotel chains — Callify grows with you.</p>
        </motion.div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {features.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition hover:border-violet-500/20 hover:bg-violet-500/[0.03]"
            >
              <span className="text-3xl">{item.icon}</span>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/40">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">Testimonials</p>
          <h2 className="mt-3 text-4xl font-bold">Trusted by Businesses</h2>
        </motion.div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8"
            >
              <p className="text-sm leading-relaxed text-white/50">"{t.quote}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 text-sm font-bold text-violet-300">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-white/30">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="mx-auto max-w-7xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-violet-400">Pricing</p>
          <h2 className="mt-3 text-4xl font-bold">Simple, Transparent Pricing</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/40">
            Choose the plan that fits your business. Upgrade anytime as you grow.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`relative rounded-2xl border p-8 transition hover:-translate-y-1 ${plan.popular
                  ? "border-violet-500/30 bg-violet-500/[0.06] shadow-lg shadow-violet-500/10"
                  : "border-white/[0.06] bg-white/[0.02]"
                }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1 text-xs font-semibold">
                  Most Popular
                </div>
              )}
              <p className="text-xs font-medium uppercase tracking-wider text-white/30">{plan.tier}</p>
              <p className="mt-1 text-xl font-bold">{plan.name}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-sm text-white/30">{plan.period}</span>
              </div>
              <p className="mt-1 text-xs text-white/30">{plan.subtitle}</p>
              <div className="my-6 h-px bg-white/[0.06]" />
              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/50">
                    <span className="mt-0.5 text-violet-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/onboarding"
                className={`mt-8 block rounded-full py-2.5 text-center text-sm font-medium transition ${plan.popular
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-violet-500/25"
                    : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
              >
                Get Started
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent p-12 text-center sm:p-16"
        >
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to Automate Your Customer Calls?</h2>
          <p className="mx-auto mt-4 max-w-lg text-white/40">Join businesses across India that trust Callify to handle their customer interactions professionally, 24/7.</p>
          <Link
            href="/onboarding"
            className="mt-8 inline-flex rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-10 py-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/30"
          >
            Start Your 3-Step Setup →
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold">
              C
            </div>
            <span className="text-sm font-medium text-white/50">Callify</span>
          </div>
          <p className="text-sm text-white/25">© 2026 Callify • AI Voice Infrastructure for Business</p>
          <div className="flex gap-6">
            <Link href="/demo" className="text-sm text-white/30 transition hover:text-white/60">Demo</Link>
            <a href="#plans" className="text-sm text-white/30 transition hover:text-white/60">Pricing</a>
            <Link href="/auth/login" className="text-sm text-white/30 transition hover:text-white/60">Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5">
      <span className="text-sm text-white/30">{label}</span>
      <span className={`text-sm font-medium ${highlight ? "text-emerald-400" : "text-white/80"}`}>{value}</span>
    </div>
  );
}
