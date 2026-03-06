import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OnboardingsAdminPage() {
    let submissions: Array<{
        id: string;
        businessName: string;
        ownerName: string;
        email: string;
        phone: string;
        city: string;
        category: string;
        tier: string;
        provisionedNumber: string;
        dashboardUrl: string | null;
        createdAt: Date;
    }> = [];

    let dbUnavailable = false;

    try {
        submissions = await prisma.onboardingSubmission.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
            select: {
                id: true,
                businessName: true,
                ownerName: true,
                email: true,
                phone: true,
                city: true,
                category: true,
                tier: true,
                provisionedNumber: true,
                dashboardUrl: true,
                createdAt: true,
            },
        });
    } catch {
        dbUnavailable = true;
    }

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold">Onboarding Admin</h1>
                        <p className="mt-1 text-sm text-slate-400">
                            Latest onboarding submissions saved from the setup wizard.
                        </p>
                    </div>
                    <Link href="/onboarding" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10">
                        New Onboarding
                    </Link>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                    {dbUnavailable && (
                        <div className="border-b border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-200">
                            Database connection is not available yet. Configure `DATABASE_URL` and run Prisma migration to load records.
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-white/5 text-slate-300">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Business</th>
                                    <th className="px-4 py-3 font-medium">Owner</th>
                                    <th className="px-4 py-3 font-medium">Category</th>
                                    <th className="px-4 py-3 font-medium">Tier</th>
                                    <th className="px-4 py-3 font-medium">Provisioned Number</th>
                                    <th className="px-4 py-3 font-medium">Dashboard</th>
                                    <th className="px-4 py-3 font-medium">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((item) => (
                                    <tr key={item.id} className="border-t border-white/10">
                                        <td className="px-4 py-3">
                                            <p className="font-medium">{item.businessName}</p>
                                            <p className="text-xs text-slate-400">{item.city}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p>{item.ownerName}</p>
                                            <p className="text-xs text-slate-400">{item.email}</p>
                                        </td>
                                        <td className="px-4 py-3 capitalize">{item.category}</td>
                                        <td className="px-4 py-3">{item.tier.replace("TIER_", "Tier ")}</td>
                                        <td className="px-4 py-3">{item.provisionedNumber}</td>
                                        <td className="px-4 py-3">
                                            {item.dashboardUrl ? (
                                                <a
                                                    href={item.dashboardUrl}
                                                    className="text-cyan-300 hover:text-cyan-200"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Open
                                                </a>
                                            ) : (
                                                <span className="text-slate-500">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-300">
                                            {item.createdAt.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {submissions.length === 0 && (
                        <div className="p-8 text-center text-sm text-slate-400">
                            No onboarding submissions yet.
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
