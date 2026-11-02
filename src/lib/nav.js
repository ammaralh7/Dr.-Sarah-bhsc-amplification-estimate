/* Moving between the app's pages (and Update prices' steps) through the browser's own history, so the
   ‹ back arrow, the browser's back button and a phone's back swipe all do the same thing. The address
   never changes, so it works the same from a web server or a shared folder (file://). If the browser
   won't keep history here, the app keeps its own list and the back arrow still works. */
import { useEffect, useState } from "react";

const START = { tab: "estimate", depth: 0 };
const ours = (s) => (s && s.bhsc && typeof s.bhsc.depth === "number" ? s.bhsc : null);
let cur = ours(window.history.state) || START;
let native = true;
try { if (!ours(window.history.state)) window.history.replaceState({ ...(window.history.state || {}), bhsc: cur }, ""); } catch { native = false; }

const trail = [];            // the entries before this one (known since the page was opened)
trail[cur.depth] = cur;
const subs = new Set();
const set = (e) => { cur = e; trail[e.depth] = e; subs.forEach((f) => f(e)); };
window.addEventListener("popstate", (ev) => { if (native) set(ours(ev.state) || START); });

/** Go to a page (and step): { tab, step? }. Going to where you already are does nothing. */
export function navTo(entry) {
  if (entry.tab === cur.tab && (entry.step || null) === (cur.step || null)) return;
  const e = { ...entry, depth: cur.depth + 1 };
  if (native) { try { window.history.pushState({ bhsc: e }, ""); } catch { native = false; } }
  set(e);
}
/** One step back, like the browser's back button. */
export function navBack() {
  if (!cur.depth) return;
  if (native) window.history.back();
  else set(trail[cur.depth - 1] || START);
}
/** The entry the back arrow goes to (null on the first screen, or when it isn't known after a reload). */
export const previous = () => (cur.depth ? trail[cur.depth - 1] || null : null);

/** The current entry; re-renders when it changes. */
export function useNav() {
  const [e, setE] = useState(cur);
  useEffect(() => { subs.add(setE); setE(cur); return () => { subs.delete(setE); }; }, []);
  return e;
}
