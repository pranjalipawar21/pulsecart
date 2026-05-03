// src/hooks/useVisibilityTicker.js
// ─────────────────────────────────────────────────────────────────────────────
// Custom hook: pauses the live ticker interval when the browser tab is hidden.
//
// WHY THIS MATTERS:
//   The App.js ticker fires every 1800ms and hits CoinGecko every 54s.
//   If the user leaves the tab open for hours (very common for dashboards),
//   this runs thousands of unnecessary API calls and keeps React re-rendering
//   in the background — draining CPU, battery, and CoinGecko rate limit.
//
// USAGE in App.js:
//   Replace the useEffect ticker block with:
//
//   import { useVisibilityTicker } from "./hooks/useVisibilityTicker";
//
//   useVisibilityTicker({
//     interval: 1800,
//     onTick: async (tickRef, setCrypto, setLiveGMV, setLiveOrders,
//                    setLiveUsers, setOrders, setActivity,
//                    setCategories, setChannels, btcChangeRef) => {
//       // paste your existing ticker body here
//     },
//     deps: [],
//   });
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";

/**
 * @param {object}   options
 * @param {number}   options.interval   — ms between ticks (default 1800)
 * @param {Function} options.onTick     — async tick callback, receives tickRef
 * @param {Array}    options.deps       — useEffect dependency array
 */
export function useVisibilityTicker({ interval = 1800, onTick, deps = [] }) {
  const tickRef    = useRef(0);
  const timerRef   = useRef(null);
  const pausedRef  = useRef(false);

  useEffect(() => {
    function start() {
      if (timerRef.current) return; // already running
      timerRef.current = setInterval(async () => {
        if (!pausedRef.current) {
          tickRef.current++;
          await onTick(tickRef);
        }
      }, interval);
    }

    function stop() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        pausedRef.current = true;   // pause ticks but keep interval alive
        // After 5 min hidden, stop interval entirely to save resources
        pausedRef.current = true;
        if (!timerRef._hiddenTimer) {
          timerRef._hiddenTimer = setTimeout(() => {
            stop();
            timerRef._hiddenTimer = null;
          }, 5 * 60 * 1000);
        }
      } else {
        // Tab is visible again
        pausedRef.current = false;
        if (timerRef._hiddenTimer) {
          clearTimeout(timerRef._hiddenTimer);
          timerRef._hiddenTimer = null;
        }
        if (!timerRef.current) {
          start(); // restart if it was stopped
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timerRef._hiddenTimer) clearTimeout(timerRef._hiddenTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return tickRef;
}
