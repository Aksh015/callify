"use client";

import styles from "./dashboard.module.css";
import {
  Bot,
  Home,
  CalendarDays,
  BarChart3,
  Settings,
  LogOut,
  Hotel,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type UserProfile = {
  user: { name: string; email: string; avatar: string | null };
  profile: { plan: string | null; plan_status: string | null };
  hotel: { name: string; city: string } | null;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isActive = (path: string) =>
    pathname === path ? styles.active : "";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/auth/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setProfile(data);
      })
      .catch(() => router.push("/auth/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const hotelName = profile?.hotel?.name ?? null;
  const hotelCity = profile?.hotel?.city ?? null;
  const planLabel = profile?.profile?.plan
    ? profile.profile.plan.charAt(0).toUpperCase() + profile.profile.plan.slice(1)
    : null;

  return (
    <div className={styles.layoutWrapper}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        {/* Brand / Hotel Identity */}
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarBrand}>
            <div className={styles.brandIconWrap}>
              <Hotel size={18} className={styles.brandIcon} />
            </div>
            <div className={styles.brandText}>
              {loading ? (
                <div className={styles.brandNameSkeleton} />
              ) : hotelName ? (
                <>
                  <span className={styles.brandName} title={hotelName}>
                    {hotelName}
                  </span>
                  {hotelCity && (
                    <span className={styles.brandSub}>{hotelCity}</span>
                  )}
                </>
              ) : (
                <span className={styles.brandName}>My Hotel</span>
              )}
            </div>
          </div>

          {/* Callify badge */}
          <div className={styles.callifyBadge}>
            <Bot size={11} />
            <span>Callify AI</span>
            {planLabel && <span className={styles.planPill}>{planLabel}</span>}
          </div>
        </div>

        {/* Nav */}
        <nav className={styles.sidebarNav}>
          <Link
            href="/dashboard"
            className={`${styles.navItem} ${isActive("/dashboard")}`}
          >
            <Home size={18} />
            <span>Overview</span>
          </Link>
          <Link
            href="/dashboard/reservations"
            className={`${styles.navItem} ${isActive("/dashboard/reservations")}`}
          >
            <CalendarDays size={18} />
            <span>Reservations</span>
          </Link>
          <Link
            href="/dashboard/inventory"
            className={`${styles.navItem} ${isActive("/dashboard/inventory")}`}
          >
            <Hotel size={18} />
            <span>Room Inventory</span>
          </Link>
          <Link
            href="/dashboard/analytics"
            className={`${styles.navItem} ${isActive("/dashboard/analytics")}`}
          >
            <BarChart3 size={18} />
            <span>Call Analytics</span>
          </Link>
          <Link
            href="/dashboard/settings"
            className={`${styles.navItem} ${isActive("/dashboard/settings")}`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </Link>
        </nav>

        {/* Footer — user info + logout */}
        <div className={styles.sidebarFooter}>
          {profile && (
            <div className={styles.userCard}>
              {profile.user.avatar ? (
                <img
                  src={profile.user.avatar}
                  alt={profile.user.name}
                  className={styles.userAvatar}
                />
              ) : (
                <div className={styles.userAvatarFallback}>
                  {profile.user.name?.charAt(0).toUpperCase() ?? "U"}
                </div>
              )}
              <div className={styles.userInfo}>
                <span className={styles.userName}>{profile.user.name}</span>
                <span className={styles.userEmail}>{profile.user.email}</span>
              </div>
            </div>
          )}
          <button className={styles.logoutBtn} onClick={() => void handleLogout()}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className={styles.mainContent}>
        {/* Top bar with hotel name context */}
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <span className={styles.topBarBreadcrumb}>
              {hotelName ? (
                <>
                  <span className={styles.topBarHotel}>{hotelName}</span>
                  <span className={styles.topBarSep}>›</span>
                </>
              ) : null}
              <span className={styles.topBarPage}>
                {pathname === "/dashboard"
                  ? "Overview"
                  : pathname.split("/").pop()?.replace("-", " ").replace(/^\w/, (c) => c.toUpperCase())}
              </span>
            </span>
          </div>
          {planLabel && (
            <div className={styles.topBarPlan}>
              <div className={styles.topBarPlanDot} />
              {planLabel} Plan · Active
            </div>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
