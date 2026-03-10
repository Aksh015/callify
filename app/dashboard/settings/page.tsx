"use client";
import styles from './settings.module.css';
import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

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

type RoomConfig = {
    id: string;
    type: string;
    basePrice: string;
    total: string;
    capacity: string;
};

export default function SettingsPage() {
  const [plan, setPlan] = useState<string>("starter");
  const [businessId, setBusinessId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  
  const [rooms, setRooms] = useState<RoomConfig[]>([]);
  const [roomsSaving, setRoomsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.profile?.plan) {
          setPlan(data.profile.plan);
          setBusinessId(data.profile.business_id);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));

    fetch('/api/dashboard/inventory')
      .then(r => r.json())
      .then(data => {
         if (data.roomTypes) {
             setRooms(data.roomTypes.map((r: any, i: number) => ({
                 id: String(i),
                 type: r.type,
                 basePrice: String(r.basePrice),
                 total: String(r.total),
                 capacity: "2" // default capacity presentation
             })));
         }
      })
      .catch(console.error);
  }, []);

  async function handleSaveRooms() {
      setRoomsSaving(true);
      try {
          const res = await fetch('/api/dashboard/inventory', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rooms })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to save rooms");
          alert("Room configuration updated successfully!");
      } catch (err: any) {
          alert(err.message || "Failed to save");
      } finally {
          setRoomsSaving(false);
      }
  }

  async function handleUpgrade() {
      setUpgrading(true);
      try {
          if (!businessId) throw new Error("Hotel profile not found. Please log in again.");

          // 1. Initiate 1-Rupee Checkout
          const checkoutRes = await fetch("/api/billing/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ businessId, tier: 2, isUpgrade: true }),
          });
          const checkoutData = await checkoutRes.json();
          if (!checkoutRes.ok || !checkoutData.paymentSessionId) {
              throw new Error(checkoutData.error || "Failed to initiate upgrade.");
          }

          // 2. Load SDK & Trigger Modal
          const cashfree = await loadCashfreeSDK();
          const result = await cashfree.checkout({
              paymentSessionId: checkoutData.paymentSessionId,
              redirectTarget: "_modal",
          });

          if (result.error) throw new Error(result.error.message || "Payment cancelled.");

          // 3. Verify Payment & Tell Server to Upgrade to Tier 2
          const verifyRes = await fetch("/api/billing/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: checkoutData.orderId, businessId, tier: 2 }),
          });
          const verifyData = await verifyRes.json();
          
          if (!verifyRes.ok || verifyData.status !== "SUCCESS") {
              throw new Error(verifyData.error || "Payment verification failed.");
          }

          // Success - Hard Reload to fetch updated plan
          alert("Successfully upgraded to the Pro Plan!");
          window.location.reload();
      } catch (err: any) {
          alert(err?.message || "An error occurred during upgrade.");
      } finally {
          setUpgrading(false);
      }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Account & AI Settings</h1>
        <p>Manage your hotel configuration, API keys, and AI behavior.</p>
      </header>

      <div className={styles.settingsGrid}>
        <div className={`glass-panel ${styles.settingsCard}`}>
          <h2>Property Details</h2>
          <div className={styles.inputGroup}>
            <label>Hotel Name</label>
            <input type="text" className={styles.input} defaultValue="Sunset Oasis Hotel" />
          </div>
          <div className={styles.inputGroup}>
            <label>Support Phone Number</label>
            <input type="tel" className={styles.input} defaultValue="+91 9328010328" />
          </div>
          <div className={styles.inputGroup}>
            <label>Timezone</label>
            <select className={styles.input} defaultValue="America/New_York">
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </select>
          </div>
          <button className="btn-primary" style={{ marginTop: '1rem' }}>Save Details</button>
        </div>

        <div className={`glass-panel ${styles.settingsCard} ${plan === 'starter' ? styles.lockedCard : ''}`} style={{ position: 'relative', overflow: 'hidden' }}>
          <h2>Integrations & PMS API Keys</h2>
          
          {plan === 'starter' && !loading && (
            <div className={styles.lockedOverlay}>
              <Lock size={32} style={{ color: "var(--accent-cyan)", marginBottom: "1rem" }} />
              <h3 style={{ color: "#fff", marginBottom: "0.5rem" }}>Pro Feature</h3>
              <p style={{ color: "var(--text-muted)", textAlign: "center", marginBottom: "1.5rem", maxWidth: "80%" }}>
                Upgrade to the Pro Plan to connect payment gateways and your Property Management System (PMS).
              </p>
              <button 
                className="btn-primary" 
                onClick={handleUpgrade}
                disabled={upgrading}
              >
                {upgrading ? "Loading Secure Checkout..." : "Unlock for ₹1"}
              </button>
            </div>
          )}

          <div style={{ opacity: plan === 'starter' && !loading ? 0.3 : 1, pointerEvents: plan === 'starter' && !loading ? 'none' : 'auto' }}>
            <div className={styles.inputGroup}>
              <label>Cashfree/Stripe Secret Key</label>
              <input type="password" className={styles.input} defaultValue={plan === 'pro' ? "cfsk_ma_test_..." : ""} />
              <small style={{ color: "var(--text-muted)", marginTop: "4px" }}>Active: Sandbox Mode</small>
            </div>
            <div className={styles.inputGroup}>
              <label>WhatsApp API Token (For Payment Links)</label>
              <input type="password" className={styles.input} placeholder="E.g., EAAH..." />
              <small style={{ color: "var(--text-muted)", marginTop: "4px", display: "block" }}>Used to send payment WhatsApp messages.</small>
            </div>
            <div className={styles.inputGroup}>
              <label>WhatsApp Phone Number ID</label>
              <input type="text" className={styles.input} placeholder="10234567890123" />
            </div>
            <div className={styles.inputGroup}>
              <label>PMS API Key (e.g., Cloudbeds)</label>
              <input type="password" className={styles.input} placeholder="Enter your Property Management System Token" />
            </div>
            <button className="btn-primary" style={{ marginTop: '1rem' }}>Update API Keys</button>
          </div>
        </div>

        <div className={`glass-panel ${styles.settingsCard}`} style={{ gridColumn: '1 / -1' }}>
          <h2>Room Categories & Pricing</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            Manage the types of rooms you offer. These flow directly into your live dashboard and Voice AI.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rooms.map((room, index) => (
                <div key={room.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ flex: 2 }}>
                        <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Room Type</label>
                        <input value={room.type} onChange={(e) => {
                            const newRooms = [...rooms];
                            newRooms[index].type = e.target.value;
                            setRooms(newRooms);
                        }} className={styles.input} placeholder="e.g. Deluxe Suite" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Price/Night (₹)</label>
                        <input type="number" value={room.basePrice} onChange={(e) => {
                            const newRooms = [...rooms];
                            newRooms[index].basePrice = e.target.value;
                            setRooms(newRooms);
                        }} className={styles.input} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Total Count</label>
                        <input type="number" value={room.total} onChange={(e) => {
                            const newRooms = [...rooms];
                            newRooms[index].total = e.target.value;
                            setRooms(newRooms);
                        }} className={styles.input} />
                    </div>
                    <button onClick={() => setRooms(rooms.filter(r => r.id !== room.id))} style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", background: "transparent", padding: "10px", borderRadius: 8, cursor: "pointer", marginTop: 18 }}>✕</button>
                </div>
            ))}
            <button onClick={() => setRooms([...rooms, { id: Date.now().toString(), type: "", basePrice: "", total: "1", capacity: "2" }])} style={{ background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)", color: "#fff", padding: "10px", borderRadius: 8, cursor: "pointer", marginTop: 8 }}>+ Add Another Room Type</button>
          </div>
          <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={handleSaveRooms} disabled={roomsSaving}>
              {roomsSaving ? "Saving..." : "Save Room Configuration"}
          </button>
        </div>

        <div className={`glass-panel ${styles.settingsCard}`} style={{ gridColumn: '1 / -1' }}>
          <h2>AI Knowledge Base Management</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            Upload PDFs containing your hotel policies, restaurant menus, and local area recommendations. Callify AI will parse this data to answer guest inquiries in real-time.
          </p>
          <div className={styles.inputGroup}>
            <input type="file" className={styles.fileInput} accept=".pdf,.txt" />
          </div>
          <button className="btn-secondary">Upload Document to Vector Store</button>
          
          <div style={{ marginTop: "2rem", borderTop: "1px solid var(--panel-border)", paddingTop: "1rem" }}>
            <h3 style={{ fontSize: "1rem", color: "#fff", marginBottom: "0.5rem" }}>Uploaded Documents:</h3>
            <ul style={{ color: "var(--accent-cyan)", listStyle: "inside" }}>
              <li>Sunset_Oasis_Policies_2025.pdf (Active)</li>
              <li>Spa_Menu_Pricing.pdf (Active)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
