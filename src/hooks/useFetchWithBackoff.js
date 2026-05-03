// src/hooks/useFetchWithBackoff.js
// ─────────────────────────────────────────────────────────────────────────────
// Exponential backoff wrapper for the real API fetchers (forex, macro, crypto).
//
// WHY THIS MATTERS:
//   CoinGecko free tier: 10-50 req/min.
//   If the API is down or rate-limited, naive fetch retries hammer the endpoint
//   and get the IP temporarily blocked.
//   This hook backs off: 2s → 4s → 8s → 16s → 32s, then gives up gracefully.
//
// USAGE in App.js (replace the loadRealData useEffect):
//
//   import { fetchWithBackoff } from "./hooks/useFetchWithBackoff";
//
//   useEffect(() => {
//     async function loadRealData() {
//       const [fx, mc, cr] = await Promise.all([
//         fetchWithBackoff(fetchForexRate,    { rate: 83.5,  source: "fallback" }),
//         fetchWithBackoff(fetchIndiaMacro,   { gdpGrowth: 6.5, gdpYear: "2024", source: "fallback" }),
//         fetchWithBackoff(fetchCryptoPrices, { btc: 67000, btcChange: 0, source: "fallback" }),
//       ]);
//       setForex(fx); setMacro(mc); setCrypto(cr);
//       btcChangeRef.current = cr.btcChange ?? 0;
//       setApiReady({
//         forex:  fx.source  !== "fallback",
//         macro:  mc.source  !== "fallback",
//         crypto: cr.source  !== "fallback",
//       });
//     }
//     loadRealData();
//     const iv = setInterval(loadRealData, 300_000);
//     return () => clearInterval(iv);
//   }, []);
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calls an async fetcher with exponential backoff on failure.
 *
 * @param {Function} fetcher      — async function that returns data or throws
 * @param {*}        fallback     — value to return if all retries fail
 * @param {object}   options
 * @param {number}   options.maxRetries  — default 4
 * @param {number}   options.baseDelay  — ms, default 2000
 * @returns {Promise<*>}
 */
export async function fetchWithBackoff(fetcher, fallback, options = {}) {
  const { maxRetries = 4, baseDelay = 2000 } = options;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const result = await fetcher();
      // If fetcher returns fallback source, treat as soft failure and retry
      if (result?.source === "fallback" && attempt < maxRetries) {
        throw new Error("Soft fallback — retrying");
      }
      return result;
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        console.warn(`[PulseCart] ${fetcher.name} failed after ${maxRetries} retries:`, err.message);
        return fallback;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1); // 2s, 4s, 8s, 16s
      console.info(`[PulseCart] ${fetcher.name} retry ${attempt}/${maxRetries} in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  return fallback;
}

/**
 * Simple one-shot fetch with timeout.
 * Use this for individual API calls when you need timeout control.
 *
 * @param {string}  url
 * @param {number}  timeoutMs  — default 8000
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
