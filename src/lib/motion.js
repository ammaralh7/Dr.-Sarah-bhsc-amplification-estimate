/* Springs — ported from the Biladi Ops shell (apps/ops/js/core.js, "SPRINGS").
   The 21st.dev picks are written against framer-motion springs {stiffness, damping, mass};
   springEase bakes one into a CSS linear() easing + duration for the Web Animations API. */
const CACHE = new Map();
function sim(k, c, m) {
  const dt = 1 / 480, xs = [0];
  let x = 0, v = 0, t = 0, calm = 0;
  while (t < 3) {
    const a = (-k * (x - 1) - c * v) / m;
    v += a * dt; x += v * dt; t += dt; xs.push(x);
    if (Math.abs(x - 1) < 0.0006 && Math.abs(v) < 0.02) { if (++calm > 24) break; } else calm = 0;
  }
  return { xs, dt, dur: t };
}
export function springEase(k = 100, c = 10, m = 1) {
  const key = `${k}|${c}|${m}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const { xs, dt, dur } = sim(k, c, m);
  const n = Math.min(64, Math.max(20, Math.round(dur * 70)));
  const stops = [];
  for (let i = 0; i <= n; i++) stops.push(Number(xs[Math.min(xs.length - 1, Math.round((dur * i / n) / dt))].toFixed(4)));
  stops[0] = 0; stops[n] = 1;
  const out = { easing: `linear(${stops.join(", ")})`, duration: Math.round(dur * 1000) };
  CACHE.set(key, out);
  return out;
}
export const reduceMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
