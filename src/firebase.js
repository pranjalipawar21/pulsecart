// src/firebase.js
// ─────────────────────────────────────────────────────────────────────────────
// Firebase initialisation — PulseCart
//
// SECURITY NOTES:
//   1. These keys are safe to expose in client-side JS for Firebase Realtime DB
//      because security is enforced by Firebase Database Rules, NOT by hiding keys.
//   2. Set your rules in Firebase Console → Realtime Database → Rules:
//      { "rules": { ".read": true, ".write": true } }  ← dev only
//      Lock down to authenticated users before production.
//   3. Never put Firebase Admin SDK credentials here (those belong server-side only).
//   4. Add your .env values in .env.local — CRA reads REACT_APP_ prefix automatically.
//      Then replace the hardcoded strings below with process.env.REACT_APP_* values.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, onValue, set, get, child } from "firebase/database";

// ── Firebase config ───────────────────────────────────────────────────────────
// To use .env.local instead (recommended for production):
//   REACT_APP_FIREBASE_API_KEY=...
//   REACT_APP_FIREBASE_AUTH_DOMAIN=...
//   REACT_APP_FIREBASE_DATABASE_URL=...
//   REACT_APP_FIREBASE_PROJECT_ID=...
//   REACT_APP_FIREBASE_STORAGE_BUCKET=...
//   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
//   REACT_APP_FIREBASE_APP_ID=...
const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY            || "YOUR_API_KEY",
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN        || "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       process.env.REACT_APP_FIREBASE_DATABASE_URL       || "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID         || "YOUR_PROJECT_ID",
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET     || "YOUR_PROJECT.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID|| "YOUR_SENDER_ID",
  appId:             process.env.REACT_APP_FIREBASE_APP_ID             || "YOUR_APP_ID",
};

// ── Singleton init — safe to call multiple times (HMR-safe) ──────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db  = getDatabase(app);

export { db, ref, onValue, set, get, child };
export default app;
