// src/seedFirebase.js
// ─────────────────────────────────────────────────────────────────────────────
// Seeds Firebase Realtime Database with initial dashboard data.
//
// KEY SAFETY FEATURE:
//   Checks if data already exists before writing.
//   seedDatabase() will ONLY write if the "dashboard/seeded" flag is absent.
//   This means it runs exactly once per Firebase project — never overwrites live data.
//
// To force a re-seed (e.g. after schema change):
//   1. Go to Firebase Console → Realtime Database
//   2. Delete the "dashboard" node
//   3. Reload the app — seed runs again automatically
// ─────────────────────────────────────────────────────────────────────────────

import { db, ref, set, get, child } from "./firebase";
import { genGMVSeries, genKPIs } from "./data/mockData";

// ── One-time seed guard ───────────────────────────────────────────────────────
let seedAttempted = false; // prevents double-seed on React StrictMode double-invoke

export async function seedDatabase() {
  if (seedAttempted) return;
  seedAttempted = true;

  try {
    const dbRef    = ref(db);
    const snapshot = await get(child(dbRef, "dashboard/seeded"));

    if (snapshot.exists()) {
      // Data already seeded — do nothing, just update live counters
      await updateLiveCounters();
      return;
    }

    // First run — write all seed data
    await writeSeedData();
    await updateLiveCounters();

    console.log("[PulseCart] Firebase seeded successfully.");
  } catch (err) {
    console.error("[PulseCart] Firebase seed error:", err.message);
    // App continues — Firebase failures are non-fatal
    // Fallback: App.js genKPIs() and genGMVSeries() will still render
  }
}

// ── Write all seed data ───────────────────────────────────────────────────────
async function writeSeedData() {
  const kpis      = genKPIs();
  const gmvSeries = genGMVSeries();

  // Convert GMV array to object keyed by index (Firebase doesn't store arrays)
  const gmvObj = {};
  gmvSeries.forEach((item, i) => { gmvObj[`day_${String(i).padStart(3, "0")}`] = item; });

  await set(ref(db, "dashboard"), {
    seeded: true,
    seededAt: new Date().toISOString(),
    version: "2.0",

    kpis: {
      gmv:           kpis.gmv,
      netRevenue:    kpis.netRevenue,
      aov:           kpis.aov,
      convRate:      kpis.convRate,
      cartAbandRate: kpis.cartAbandRate,
      returnRate:    kpis.returnRate,
      ltv:           kpis.ltv,
      invTurnover:   kpis.invTurnover,
    },

    gmvSeries: gmvObj,

    live: {
      gmv:    287430,
      orders: 142,
      users:  4821,
      updatedAt: Date.now(),
    },
  });
}

// ── Update live counters only ─────────────────────────────────────────────────
// Called on every app load after first seed.
// Simulates a small realistic drift from the last stored value.
async function updateLiveCounters() {
  try {
    const snap = await get(child(ref(db), "dashboard/live"));
    const prev = snap.exists() ? snap.val() : { gmv: 287430, orders: 142, users: 4821 };

    // ±1.5% drift — simulates intra-session activity since last visit
    const drift = () => 1 + (Math.random() * 0.03 - 0.015);

    await set(ref(db, "dashboard/live"), {
      gmv:    Math.round(Math.max(100000, prev.gmv    * drift())),
      orders: Math.round(Math.max(10,     prev.orders * drift())),
      users:  Math.round(Math.max(500,    prev.users  * drift())),
      updatedAt: Date.now(),
    });
  } catch {
    // Non-fatal — live counters are cosmetic
  }
}
