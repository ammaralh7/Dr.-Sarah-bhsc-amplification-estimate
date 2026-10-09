/* Manufacturer → style → model for one hearing aid (or one ear), shared by the Estimate and
   Compare prices tabs. Manufacturer and style are buttons; the model is a search box that opens
   the matching list right under it. k: 0/1 shows the one-aid/pair price on each model, null the
   per-ear price (different aid in each ear). side 0/1 adds the right (red) / left (blue) ear dot.
   compact: fewer buttons per row, for the narrow Compare columns. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Group } from "@/components/ios";
import { MODELS, TIERS, MFRS, STYLES, money, fits, isCros, styleAvailable, modelsFor, modelKey, earModel, earPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const blankEar = () => ({ mfr: null, style: null, model: null, mkey: null });

export function EarOrder({ title, side, e, k, onChange, compact = false, wide = false }) {
  const sel = earModel(e);
  const price = (m) => (k == null ? earPrice(m[4]) : TIERS[m[4]][k]);
  return (
    <Group header={side == null ? title : <span className="inline-flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-full", side === 0 ? "bg-[#ff3b30]" : "bg-[#0a84ff]")} />{title}</span>}
      footer={sel && sel[5] ? "Older price list — confirm the cost with the manufacturer before ordering." : null}>
      {(() => {
        const mfr = (
          <Choices label="Manufacturer" value={e.mfr} cols={compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}
            options={MFRS.map(([name, color]) => ({ value: name, label: name, dot: color }))}
            onChange={(v) => onChange({ mfr: v, model: null, mkey: null, style: e.style && styleAvailable(v, e.style) ? e.style : null })} />
        );
        const style = (
          <Choices label="Style" value={e.style} cols={compact ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-6"}
            options={STYLES.map(([st, long]) => ({ value: st, label: st, title: long, disabled: !e.mfr || !styleAvailable(e.mfr, st) }))}
            onChange={(st) => onChange({ style: st, ...(e.model != null && fits(MODELS[e.model][3], st) ? {} : { model: null, mkey: null }) })} />
        );
        const styleHint = e.style ? STYLES.find(([st]) => st === e.style)?.[1] : !e.mfr ? "Choose the manufacturer first" : null;
        // wide (one full-width card on a computer): manufacturer and style side by side, one row
        return wide ? (
          <div className="bg-card pl-4">
            <div className="hairline grid min-w-0 grid-cols-1 gap-3 py-2.5 pr-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)] lg:gap-6">
              <Sub label="Manufacturer">{mfr}</Sub>
              <Sub label="Style" hint={styleHint}>{style}</Sub>
            </div>
          </div>
        ) : (
          <>
            <Field label="Manufacturer">{mfr}</Field>
            <Field label="Style" hint={styleHint}>{style}</Field>
          </>
        );
      })()}
      <Field label="Model" last>
        <ModelPicker e={e} price={price} perEar={k == null}
          onPick={(i) => { const m = MODELS[i]; onChange({ model: i, mkey: modelKey(m[0], m[1], m[2]) }); }} />
      </Field>
    </Group>
  );
}

/* A labelled block inside a grouped list (label above its controls). */
function Field({ label, hint, last, children }) {
  return (
    <div className="bg-card pl-4">
      <div className={cn("min-w-0 py-2.5 pr-4", !last && "hairline")}><Sub label={label} hint={hint}>{children}</Sub></div>
    </div>
  );
}
function Sub({ label, hint, children }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.03em] text-label2">{label}</span>
        {hint && <span className="truncate text-[12px] text-label2">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* A row of buttons, one of which can be picked (radio group). */
function Choices({ label, value, options, onChange, cols }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2", cols)}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} disabled={o.disabled} title={o.title} onClick={() => onChange(o.value)}
            className={cn("press inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-[9px] px-3 text-[15px] font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint disabled:cursor-not-allowed disabled:opacity-30",
              on ? "bg-tint-soft text-tint shadow-[inset_0_0_0_2px_var(--tint)]" : "bg-fill text-label enabled:hover:bg-fill2")}>
            {o.dot && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: o.dot }} />}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* Model: a search box; the matching models open right under it (no overlay to get clipped).
   Arrow keys move, Enter picks, Escape closes. */
function ModelPicker({ e, price, perEar, onPick }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const box = useRef(null), input = useRef(null), listRef = useRef(null);
  const ready = !!(e.mfr && e.style);
  const all = useMemo(() => (ready ? modelsFor(e.mfr, e.style) : []), [ready, e.mfr, e.style]);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const match = all.filter(([m]) => words.every((w) => `${m[1]} ${m[2]} tier ${m[4]}`.toLowerCase().includes(w)));
  const cur = match.filter(([m]) => !m[5]), old = match.filter(([m]) => m[5]);
  const flat = [...cur, ...old];
  const sel = earModel(e);

  useEffect(() => { if (!ready) setOpen(false); }, [ready]);
  useEffect(() => { setHi(0); }, [q, open]);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const away = (ev) => { if (!box.current?.contains(ev.target)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  useEffect(() => { listRef.current?.querySelector(`[data-i="${hi}"]`)?.scrollIntoView({ block: "nearest" }); }, [hi]);

  const pick = (i) => { onPick(i); setOpen(false); setQ(""); };
  const key = (ev) => {
    if (ev.key === "ArrowDown") { ev.preventDefault(); setHi((h) => Math.min(h + 1, flat.length - 1)); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (ev.key === "Enter") { ev.preventDefault(); if (flat[hi]) pick(flat[hi][1]); }
    else if (ev.key === "Escape") { setOpen(false); setQ(""); }
  };
  let n = -1;
  const rows = (items) => items.map(([m, i]) => {
    n += 1; const at = n;
    return (
      <button key={i} type="button" role="option" aria-selected={e.model === i} data-i={at} onMouseEnter={() => setHi(at)} onClick={() => pick(i)}
        className={cn("flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left", at === hi ? "bg-fill" : "")}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{m[1]}{isCros(m) && <span className="ml-1.5 rounded bg-fill2 px-1 text-[11px] font-semibold text-label2">CROS</span>}</span>
          <span className="block truncate text-[13px] text-label2">{m[2]} · Tier {m[4]}</span>
        </span>
        <span className="tnum shrink-0 text-[15px] text-label2">{money(price(m))}</span>
        <span className="w-4 shrink-0">{e.model === i && <Check className="h-4 w-4 text-tint" strokeWidth={2.6} />}</span>
      </button>
    );
  });

  return (
    <div ref={box} className="grid min-w-0 grid-cols-1 gap-2">
      {!open ? (
        <button type="button" disabled={!ready} onClick={() => setOpen(true)} aria-haspopup="listbox" aria-label={sel ? `Model: ${sel[1]}. Change` : "Choose a model"}
          className="press flex h-10 w-full min-w-0 items-center gap-3 rounded-[9px] bg-fill px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint enabled:hover:bg-fill2 disabled:cursor-not-allowed disabled:opacity-40">
          {sel ? (
            <>
              <span className="min-w-0 flex-1 truncate text-[15px]"><span className="font-semibold">{sel[1]}</span><span className="text-label2"> · {sel[2]} · Tier {sel[4]}</span></span>
              <span className="tnum shrink-0 text-[15px] font-semibold">{money(price(sel))}{perEar ? <span className="font-normal text-label2"> / ear</span> : null}</span>
            </>
          ) : (
            <>
              <Search className="h-[18px] w-[18px] shrink-0 text-label2" strokeWidth={2.2} />
              <span className="flex-1 text-[15px] text-label2">{ready ? `Search ${all.length} ${e.mfr} ${e.style} models` : "Choose the manufacturer and style first"}</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-label3" strokeWidth={2.4} />
        </button>
      ) : (
        <>
          <label className="flex h-10 items-center gap-2 rounded-[9px] bg-fill px-3 shadow-[inset_0_0_0_2px_var(--tint)]">
            <Search className="h-[18px] w-[18px] shrink-0 text-tint" strokeWidth={2.4} />
            <input ref={input} value={q} onChange={(ev) => setQ(ev.target.value)} onKeyDown={key} placeholder={`Search ${e.mfr} ${e.style} models`}
              role="combobox" aria-expanded="true" aria-label="Search models" autoComplete="off"
              className="h-full w-0 min-w-0 flex-1 bg-transparent text-[15px] text-label outline-none placeholder:text-label2" />
            <span className="shrink-0 text-[13px] text-label2">{match.length} of {all.length}</span>
          </label>
          <div ref={listRef} role="listbox" aria-label="Models" className="max-h-[340px] overflow-y-auto overscroll-contain rounded-[10px] bg-bg p-1">
            {cur.length > 0 && old.length > 0 && <div className="px-3 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-[0.02em] text-label2">Current price lists</div>}
            {rows(cur)}
            {old.length > 0 && <div className="px-3 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-[0.02em] text-label2">Older price lists</div>}
            {rows(old)}
            {!flat.length && <p className="px-3 py-6 text-center text-[15px] text-label2">No models match “{q}”.</p>}
          </div>
        </>
      )}
    </div>
  );
}
