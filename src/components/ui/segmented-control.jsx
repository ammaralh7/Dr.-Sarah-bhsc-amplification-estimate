/* Segmented control — 21st.dev #23552 (@ddoemonn), as ported in Biladi Ops (sc.*):
   a track with an inset well and a thumb that slides between segments on the
   spring {520, 34, .45}, starting from wherever it is (interruptible). The
   buttons stay the hit targets under the thumb. Reduced motion: it jumps. */
import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { springEase, reduceMotion } from "@/lib/motion";

export function SegmentedControl({ options, value, onChange, className, itemClassName, label }) {
  const track = useRef(null), thumb = useRef(null), at = useRef(null), anim = useRef(null);
  useLayoutEffect(() => {
    const t = track.current, p = thumb.current;
    if (!t || !p) return;
    const place = (animate) => {
      const on = t.querySelector('[data-on="true"]');
      if (!on) { p.style.opacity = "0"; at.current = null; return; }
      const to = { x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight };
      let from = at.current;
      if (anim.current) { const m = new DOMMatrixReadOnly(getComputedStyle(p).transform); from = { ...to, x: m.m41, y: m.m42, w: p.offsetWidth }; anim.current.cancel(); anim.current = null; }
      Object.assign(p.style, { width: to.w + "px", height: to.h + "px", transform: `translate(${to.x}px,${to.y}px)`, opacity: "1" });
      at.current = to;
      if (!animate || !from || !p.animate || reduceMotion() || (Math.abs(from.x - to.x) < 0.5 && Math.abs(from.y - to.y) < 0.5)) return;
      const s = springEase(520, 34, 0.45);
      anim.current = p.animate(
        [{ transform: `translate(${from.x}px,${from.y}px)`, width: from.w + "px", height: from.h + "px" },
         { transform: `translate(${to.x}px,${to.y}px)`, width: to.w + "px", height: to.h + "px" }],
        { duration: s.duration, easing: s.easing });
      anim.current.onfinish = () => { anim.current = null; };
    };
    place(true);
    const ro = window.ResizeObserver ? new ResizeObserver(() => place(false)) : null;
    ro && ro.observe(t);
    return () => ro && ro.disconnect();
  }, [value, options.length]);
  return (
    <div ref={track} role="radiogroup" aria-label={label}
      className={cn("relative flex w-full flex-wrap rounded-[10px] bg-fill p-[2px]", className)}>
      <span ref={thumb} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 rounded-[8px] bg-[var(--thumb)] opacity-0 shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.04)]" />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} data-on={on} disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn("relative z-[1] flex min-h-[44px] flex-1 basis-[4.5rem] flex-col items-center justify-center rounded-[8px] px-3 py-1 text-[15px] tracking-[-0.01em] text-label transition-[font-weight] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint disabled:cursor-not-allowed disabled:opacity-30",
              on ? "font-semibold" : "font-medium", itemClassName)}>
            <span>{o.label}</span>
            {o.hint && <span className="text-[12px] font-normal text-label2">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
