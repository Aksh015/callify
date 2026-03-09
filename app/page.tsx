"use client";
import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { Bot, CalendarDays, BarChart3, LogIn, LogOut, LayoutDashboard } from 'lucide-react';

type AuthUser = { email: string; name: string; avatar: string | null } | null;
type AuthProfile = { plan: string | null; plan_status: string | null } | null;

export default function Home() {
  const [user, setUser] = useState<AuthUser>(null);
  const [profile, setProfile] = useState<AuthProfile>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setProfile(data.profile ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setProfile(null);
  }

  return (
    <div className={styles.wrapper}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <Bot className={styles.logoIcon} />
          <span>Callify AI</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#">Overview</a>
          <a href="#">Reservations</a>
          <a href="#">Knowledge Base</a>
        </div>
        <div className={styles.navAuth}>
          {loading ? null : user ? (
            <>
              {profile?.plan_status === 'active' && (
                <button className="btn-primary" onClick={() => window.location.href='/dashboard'}>
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>
              )}
              <button className="btn-secondary" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => window.location.href='/auth/login'} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogIn size={16} />
              Sign In
            </button>
          )}
        </div>
      </nav>

      <main className="container">
        <header className={styles.heroSection}>
          <h1 className={styles.title}>The Future of Hotel Guest Experience</h1>
          <p className={styles.subtitle}>
            Your 24/7 AI Voice Receptionist. Accept reservations, handle complex FAQs, and seamlessly process payments natively through voice.
          </p>
          <div className={styles.ctaGroup}>
            <button className="btn-primary" onClick={() => window.location.href='/onboarding'}>Start Onboarding</button>
            <button className="btn-secondary" onClick={() => window.location.href='/demo'}>Try AI Demo</button>
          </div>
        </header>

        <section className={styles.features}>
          <div className={`glass-panel ${styles.featureCard}`}>
            <div className={styles.featureIcon}><CalendarDays size={28} /></div>
            <h3>Real-Time Room Inventory</h3>
            <p>Callify checks available rooms and executes live bookings directly to your property management system.</p>
          </div>
          
          <div className={`glass-panel ${styles.featureCard}`}>
            <div className={styles.featureIcon}><Bot size={28} /></div>
            <h3>Intelligent Concierge</h3>
            <p>Upload your hotel's PDF knowledge base and the AI flawlessly answers guest questions dynamically.</p>
          </div>

          <div className={`glass-panel ${styles.featureCard}`}>
            <div className={styles.featureIcon}><BarChart3 size={28} /></div>
            <h3>Call Analytics</h3>
            <p>Understand your peak booking hours, conversion rate, and automatically track standard inquiries.</p>
          </div>
        </section>
        
        <section className={styles.pricingSection}>
          <div className={styles.pricingHeader}>
            <h2>Simple, transparent pricing</h2>
            <p>Pick the plan that fits your property. Upgrade anytime.</p>
          </div>
          
          <div className={styles.pricingGrid}>
            <div className={`glass-panel ${styles.priceCard}`}>
              <div className={styles.tierName}>Starter</div>
              <div className={styles.price}>₹6<span>/mo</span></div>
              <ul className={styles.priceFeatures}>
                <li>AI Voice Receptionist</li>
                <li>Room Availability via Call</li>
                <li>Hotel Info &amp; FAQ Handling</li>
                <li>Basic Dashboard</li>
                <li>Email Support</li>
              </ul>
              <button className="btn-secondary" onClick={() => window.location.href='/onboarding'}>Get Started</button>
            </div>

            <div className={`${styles.priceCard} ${styles.priceCardPrimary}`}>
              <div className={styles.tierName}>Pro</div>
              <div className={styles.price}>₹7<span>/mo</span></div>
              <ul className={styles.priceFeatures}>
                <li>Everything in Starter</li>
                <li>Online Payment &amp; Room Reservation</li>
                <li>Secure IVR Payments (Cashfree)</li>
                <li>Full Analytics Dashboard</li>
                <li>Priority Support</li>
              </ul>
              <button className="btn-primary" onClick={() => window.location.href='/onboarding'}>Go Pro</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
