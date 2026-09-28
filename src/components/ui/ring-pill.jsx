/* Ring pill — 21st.dev #29941 "Undo Pill" (@arihantcodes), as ported in Biladi Ops (up.*):
   a pill toast with a draining ring and a seconds digit. Enters on the spring
   {500, 30} from y 16 / scale .95; hover or focus pauses the timer; each
   frame's credit is clamped to 100 ms. Reduced motion: fades only. */
import { useEffect, useRef, useState } from "react";
import { springEase, reduceMotion } from "@/lib/motion";

const R = 10, C = 2 * Math.PI * R;
export function RingPill({ label, seconds = 4, onDone }) {
  const node = useRef(null), arc = useRef(null);
  const [shown, setShown] = useState(Math.ceil(seconds));
  useEffect(() => {
    const n = node.current;
    if (n && n.animate) {
      if (reduceMotion()) n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
      else { const s = springEase(500, 30, 1); n.animate([{ opacity: 0, transform: "translateY(16px) scale(.95)" }, { opacity: 1, transform: "none" }], s); }
    }
    let elapsed = 0, last = performance.now(), raf = 0, paused = false;
    const pause = (v) => () => { paused = v; };
    n.addEventListener("pointerenter", pause(true)); n.addEventListener("pointerleave", pause(false));
    const tick = (now) => {
      if (!paused) elapsed += Math.min(100, now - last);
      last = now;
      const left = Math.max(0, seconds * 1000 - elapsed);
      if (arc.current) arc.current.style.strokeDashoffset = String(C * (1 - left / (seconds * 1000)));
      setShown(Math.ceil(left / 1000));
      if (left <= 0) {
        const out = n.animate ? n.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(6px)" }], { duration: 160, fill: "forwards" }) : null;
        out ? (out.onfinish = onDone) : onDone();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4">
      <div ref={node} role="status" aria-live="polite"
        className="material pointer-events-auto inline-flex max-w-full items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-[15px] font-semibold text-label shadow-[0_8px_30px_rgba(0,0,0,0.18),0_0_0_0.5px_var(--sep)]">
        <span className="relative inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center">
          <svg viewBox="0 0 26 26" className="absolute inset-0 h-[26px] w-[26px] -rotate-90">
            <circle cx="13" cy="13" r={R} fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
            <circle ref={arc} cx="13" cy="13" r={R} fill="none" stroke="var(--tint)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={C.toFixed(3)} strokeDashoffset="0" />
          </svg>
          <span className="tnum text-[11px] font-bold">{shown}</span>
        </span>
        <span className="truncate">{label}</span>
      </div>
    </div>
  );
}
