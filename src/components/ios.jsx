/* iOS building blocks for the Amplification Estimate, drawn from Apple's Human Interface
   Guidelines: large-title navigation bar, selection tiles (Apple Store configurator),
   bottom sheet, grouped inset lists, switches, search field and the frosted price bar. */
import { useEffect, useId, useState } from "react";
import { Check, ChevronsUpDown, Moon, Search, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BlurFade } from "@/components/ui/blur-fade";
import { Drawer, DrawerContent } from "@/components/ui/bottom-sheet";
import logo from "@/assets/bhsc-logo.png";

export const BHSC_LOGO = logo;

/* ── Navigation bar: large title that condenses into a frosted bar on scroll ── */
export function NavBar({ title, shortTitle, subtitle, left, right, wide }) {
  const [small, setSmall] = useState(false);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => { setSmall(window.scrollY > 44); setSolid(window.scrollY > 2); };
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <>
      <div className={cn("fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow] duration-200", solid ? "material shadow-[0_0.5px_0_var(--sep)]" : "bg-transparent")}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className={cn("mx-auto flex h-11 max-w-2xl items-center justify-between gap-3 px-4", wide === true ? "lg:max-w-6xl" : wide)}>
          <div className="flex min-w-[88px] items-center">{left}</div>
          <div className={cn("truncate text-[17px] font-semibold transition-opacity duration-200", small ? "opacity-100" : "opacity-0")} aria-hidden={!small}>{shortTitle || title}</div>
          <div className="flex min-w-[88px] items-center justify-end">{right}</div>
        </div>
      </div>
      <header className={cn("mx-auto max-w-2xl px-4 pb-2 pt-[calc(3.25rem+env(safe-area-inset-top,0px))]", wide === true ? "lg:max-w-6xl" : wide)}>
        <img src={logo} alt="BHSC — Buffalo Hearing & Speech Center. Nurture · Educate · Communicate"
          className="bhsc-logo mb-3 block h-auto w-[112px] select-none" draggable="false" />
        <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-label2">{subtitle}</p>}
      </header>
    </>
  );
}

export function NavButton({ className, ...props }) {
  return <button type="button" className={cn("press -mx-2 inline-flex h-11 items-center gap-1 rounded-full px-2 text-[17px] text-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint", className)} {...props} />;
}

/* Sun / crescent: remembered on this device only; the page works without storage. */
export function ThemeButton() {
  const read = () => {
    try { const v = localStorage.getItem("bhsc-theme"); if (v === "light" || v === "dark") return v; } catch {}
    const t = document.documentElement.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("bhsc-theme", theme); } catch {}
  }, [theme]);
  const dark = theme === "dark";
  return (
    <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="press relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-fill text-label focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint">
      <Sun className={cn("absolute h-[18px] w-[18px] transition-all duration-300", dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0")} strokeWidth={2.2} />
      <Moon className={cn("absolute h-[17px] w-[17px] transition-all duration-300", dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100")} strokeWidth={2.2} fill="currentColor" />
    </button>
  );
}

/* ── Section: Apple Store headline — bold question, quiet helper, same line.
      Arrives with Blur Fade (21st.dev #1079, components/ui/blur-fade.tsx). ── */
export function Section({ id, title, lead, children, sectionRef }) {
  return (
    <BlurFade className="min-w-0">
      <section id={id} ref={sectionRef} className="min-w-0 scroll-mt-[calc(8.5rem+env(safe-area-inset-top,0px))] scroll-mb-32">
        <h2 className="mb-3 text-[20px] font-semibold leading-tight tracking-[-0.015em]">
          {title}{lead && <> <span className="text-label2">{lead}</span></>}
        </h2>
        {children}
      </section>
    </BlurFade>
  );
}

/* ── Selection tile (Apple Store configurator): hairline border, 2px tint ring when chosen ── */
export function Tile({ selected, disabled, onClick, children, className, ...props }) {
  return (
    <button type="button" role="radio" aria-checked={!!selected} disabled={disabled} onClick={onClick}
      className={cn("press relative flex min-h-[64px] w-full flex-col items-start justify-center rounded-[14px] bg-card px-4 py-3.5 text-left",
        selected ? "shadow-[0_0_0_2px_var(--tint)]" : "shadow-[0_0_0_1px_var(--sep)] hover:shadow-[0_0_0_1px_var(--label3)]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-tint-soft disabled:cursor-not-allowed disabled:opacity-35", className)}
      {...props}>
      {children}
    </button>
  );
}

/* ── Grouped inset list (Settings) ── */
export function Group({ header, footer, children, className }) {
  return (
    <div className={className}>
      {header && <div className="mb-1.5 px-4 text-[13px] uppercase tracking-[0.02em] text-label2">{header}</div>}
      <div className="overflow-hidden rounded-[12px] bg-card">{children}</div>
      {footer && <div className="mt-1.5 px-4 text-[13px] leading-snug text-label2">{footer}</div>}
    </div>
  );
}
export function Row({ children, className, last, as: As = "div", ...props }) {
  return (
    <As className={cn("relative flex min-h-[44px] w-full items-center gap-3 bg-card pl-4 text-left", className)} {...props}>
      <div className={cn("flex min-h-[44px] min-w-0 flex-1 items-center gap-3 py-2.5 pr-4", !last && "hairline")}>{children}</div>
    </As>
  );
}

/* ── Dropdown row: a native <select> inside a list row, so iPhone/iPad show their own wheel picker ── */
export function SelectRow({ label, value, onChange, placeholder = "Choose", disabled, last, stacked, children }) {
  const id = useId();
  const empty = value == null || value === "";
  // stacked: small label above a full-width dropdown, for narrow columns (Compare prices)
  if (stacked) return (
    <Row last={last} className={disabled ? "opacity-40" : ""}>
      <span className="flex min-w-0 flex-1 flex-col">
        <label htmlFor={id} className="text-[13px] text-label2">{label}</label>
        <span className="relative flex min-w-0 items-center">
          <select id={id} value={empty ? "" : String(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)}
            className={cn("w-0 min-w-0 flex-1 cursor-pointer appearance-none truncate rounded-[6px] bg-transparent py-0.5 pr-6 text-[17px] outline-none focus-visible:ring-2 focus-visible:ring-tint disabled:cursor-not-allowed",
              empty ? "text-label3" : "text-label")}>
            <option value="" disabled>{placeholder}</option>
            {children}
          </select>
          <ChevronsUpDown className="pointer-events-none absolute right-0 h-4 w-4 text-label3" strokeWidth={2.2} />
        </span>
      </span>
    </Row>
  );
  return (
    <Row last={last} className={disabled ? "opacity-40" : ""}>
      <label htmlFor={id} className="w-[7.5rem] shrink-0 text-[17px]">{label}</label>
      <span className="relative flex min-w-0 flex-1 items-center">
        <select id={id} value={empty ? "" : String(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)}
          className={cn("w-0 min-w-0 flex-1 cursor-pointer appearance-none truncate rounded-[6px] bg-transparent py-1 pr-6 text-right text-[17px] outline-none [text-align-last:right] focus-visible:ring-2 focus-visible:ring-tint disabled:cursor-not-allowed",
            empty ? "text-label3" : "text-label2")}>
          <option value="" disabled>{placeholder}</option>
          {children}
        </select>
        <ChevronsUpDown className="pointer-events-none absolute right-0 h-4 w-4 text-label3" strokeWidth={2.2} />
      </span>
    </Row>
  );
}

/* ── Text field row (label on the left, entry on the right) ── */
export function FieldRow({ label, value, onChange, last, ...props }) {
  const id = useId();
  return (
    <Row last={last}>
      <label htmlFor={id} className="w-[7.5rem] shrink-0 text-[17px]">{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off"
        className="w-0 min-w-0 flex-1 bg-transparent text-right text-[17px] text-label outline-none placeholder:text-label3" {...props} />
    </Row>
  );
}

/* ── Switch (iOS), as ported in Biladi Ops (21st.dev #21948): pill thumb, tint when on ── */
export function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint focus-visible:ring-offset-2",
        checked ? "bg-tint" : "bg-fill2")}>
      <span className={cn("absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)] transition-transform duration-300",
        checked ? "translate-x-[20px]" : "translate-x-0")} style={{ transitionTimingFunction: "cubic-bezier(.3,1.3,.5,1)" }} />
    </button>
  );
}

/* ── Search field (iOS) ── */
export function SearchField({ value, onChange, placeholder, inputRef }) {
  return (
    <label className="flex h-9 items-center gap-1.5 rounded-[10px] bg-fill px-2 text-label2">
      <Search className="h-4 w-4 shrink-0" strokeWidth={2.4} />
      <input ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type="search" autoComplete="off"
        className="h-full w-full bg-transparent text-[17px] text-label outline-none placeholder:text-label2 [&::-webkit-search-cancel-button]:hidden" />
      {value && <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="grid h-5 w-5 place-items-center rounded-full bg-label3 text-card"><X className="h-3 w-3" strokeWidth={3} /></button>}
    </label>
  );
}

/* ── Bottom sheet: 21st.dev #31360 (components/ui/bottom-sheet.tsx, Base UI Drawer).
      Swipe down, the close button, the backdrop or Escape all close it. Sized as a large
      iOS sheet that floats above the home indicator and never runs past the screen edge. ── */
export function Sheet({ open, onClose, title, children, footer }) {
  return (
    <Drawer open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DrawerContent title={title}
        className="bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] h-[85dvh] max-h-[85dvh] w-[min(calc(100vw-1rem),42rem)]">
        {children}
        {footer}
      </DrawerContent>
    </Drawer>
  );
}

/* Sheet top row that stays put while the list under it scrolls (the search field). */
export function SheetPinned({ children }) {
  return <div className="sticky -top-4 z-10 -mx-5 -mt-4 bg-bg px-5 pb-3 pt-4">{children}</div>;
}

/* ── Frosted price bar (Apple Store bag bar) ── */
export function PriceBar({ label, amount, action, className }) {
  return (
    <div className={cn("material fixed bottom-0 inset-x-0 z-30 shadow-[0_-0.5px_0_var(--sep)]", className)} style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] text-label2">{label}</div>
          <div className="tnum text-[22px] font-semibold leading-tight tracking-[-0.02em]">{amount}</div>
        </div>
        {action}
      </div>
    </div>
  );
}

export function Capsule({ className, variant = "fill", ...props }) {
  return (
    <button type="button"
      className={cn("press inline-flex h-[44px] items-center justify-center gap-2 rounded-full px-5 text-[17px] font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-tint-soft disabled:opacity-40",
        variant === "fill" && "bg-tint text-tint-ink", variant === "tinted" && "bg-tint-soft text-tint", variant === "plain" && "text-tint", className)}
      {...props} />
  );
}

export const Checkmark = ({ className }) => <Check className={cn("h-5 w-5 text-tint", className)} strokeWidth={2.6} />;
