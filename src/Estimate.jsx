import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Copy, Plus, RotateCcw, Search, TriangleAlert } from "lucide-react";
import { NavBar, NavButton, ThemeButton, Section, Tile, Group, Row, Switch, SearchField, Sheet, PriceBar, Capsule, Checkmark } from "@/components/ios";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { RingPill } from "@/components/ui/ring-pill";
import { MODELS, ADDONS, TIERS, FEES, MFRS, STYLES, money, fits, isCros, styleAvailable, modelsFor, billingCode, quoteLines, quoteTotal, modelKey, findModel } from "@/lib/pricing";

// Six questions, then the estimate. Accessories and patient details are optional extras on the estimate.
const blank = () => ({ mkey: null, mfr: null, n: null, style: null, model: null, incl: null, molds: null, addons: [], addonsDone: false, name: "", caseNo: "", code: "" });
const ORDER = ["mfr", "n", "style", "model", "incl", "molds", "addons"];
const LABELS = { mfr: "Manufacturer", n: "Hearing aids", style: "Style", model: "Model", incl: "Included", molds: "Earmolds", addons: "Add-ons" };
function answer(s, key) {
  const m = s.model == null ? null : MODELS[s.model];
  return {
    mfr: s.mfr, n: s.n && (s.n === 2 ? "Two aids" : "One aid"), style: s.style, model: m && m[1],
    incl: s.incl && (s.incl === "all" ? "Everything" : "Aid only"),
    molds: s.molds == null ? null : ["No earmolds", "1 earmold", "2 earmolds"][s.molds],
    addons: !s.addonsDone ? null : s.addons.length ? `${s.addons.length} add-on${s.addons.length > 1 ? "s" : ""}` : "No add-ons",
  }[key];
}
const hasAddons = (s) => (ADDONS[s.mfr] || []).length > 0;
// Add-ons is skipped for brands with no accessories on their price list.
const isDone = (s, key) => ({ mfr: !!s.mfr, n: !!s.n, style: !!s.style, model: s.model != null, incl: !!s.incl, molds: s.molds != null, addons: s.addonsDone || (!!s.mfr && !hasAddons(s)) })[key];

export default function Estimate({ version = 0, menu = null }) {
  const [s, setS] = useState(blank);
  const [toast, setToast] = useState(0);
  const refs = useRef({});
  const firstOpen = ORDER.findIndex((key) => !isDone(s, key));
  const finished = firstOpen === -1;
  const shown = finished ? ORDER.length : firstOpen + 1;
  const set = (patch) => setS((p) => ({ ...p, ...patch }));
  // Prices can change under us (Price lists tab): keep the chosen model by its key.
  useEffect(() => {
    setS((p) => {
      if (p.model == null || !p.mkey) return p;
      const m = MODELS[p.model];
      if (m && modelKey(m[0], m[1], m[2]) === p.mkey) return { ...p };
      const i = MODELS.findIndex((x) => modelKey(x[0], x[1], x[2]) === p.mkey);
      return { ...p, model: i >= 0 ? i : null };
    });
  }, [version]);
  const R = (key) => (el) => (refs.current[key] = el);
  const jump = (key) => refs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Bring each new question (then the estimate) into view, scrolling only as far as needed.
  const prevShown = useRef(shown), wasFinished = useRef(finished);
  useEffect(() => {
    const key = finished && !wasFinished.current ? "estimate" : shown > prevShown.current ? ORDER[shown - 1] : null;
    if (key) requestAnimationFrame(() => {
      // Scroll just enough to show the new question above the price bar (and below the pinned answers).
      const el = refs.current[key]; if (!el) return;
      const r = el.getBoundingClientRect(), bottomRoom = 150, topRoom = 150;
      const down = r.bottom - (window.innerHeight - bottomRoom);
      const dy = down > 0 ? Math.min(down, r.top - topRoom) : r.top < topRoom ? r.top - topRoom : 0;
      if (dy) window.scrollBy({ top: dy, behavior: "smooth" });
    });
    prevShown.current = shown; wasFinished.current = finished;
  }, [shown, finished]);

  const reset = () => { setS(blank()); prevShown.current = 1; wasFinished.current = false; window.scrollTo({ top: 0, behavior: "smooth" }); };
  const m = s.model == null ? null : MODELS[s.model];
  const k = s.n === 2 ? 1 : 0;

  return (
    <div className="min-h-screen pb-36">
      <NavBar title="Amplification Estimate" shortTitle="Estimate" subtitle="Buffalo Hearing & Speech Center"
        left={<>{menu}<NavButton onClick={reset}><RotateCcw className="h-[18px] w-[18px]" strokeWidth={2.4} />New</NavButton></>}
        right={<ThemeButton />} />

      <Selections s={s} onJump={jump} />

      <main className="mx-auto grid max-w-2xl grid-cols-1 gap-8 px-4 pt-4">
        <Section id="mfr" sectionRef={R("mfr")} title="Manufacturer">
          <div role="radiogroup" className="grid grid-cols-2 gap-2.5">
            {MFRS.map(([name, color]) => (
              <Tile key={name} selected={s.mfr === name} className="min-h-[56px] flex-row items-center justify-start gap-2.5"
                onClick={() => set({ mfr: name, model: null, addons: [], addonsDone: false, style: s.style && styleAvailable(name, s.style) ? s.style : null })}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                <span className="text-[17px] font-semibold">{name}</span>
              </Tile>
            ))}
          </div>
        </Section>

        {shown > 1 && (
          <Section id="n" sectionRef={R("n")} title="One aid or two?">
            <SegmentedControl label="One aid or two" value={s.n ? String(s.n) : null} onChange={(v) => set({ n: +v })}
              options={[{ value: "1", label: "One aid" }, { value: "2", label: "Two aids" }]} />
          </Section>
        )}

        {shown > 2 && (
          <Section id="style" sectionRef={R("style")} title="Style">
            <SegmentedControl label="Style" itemClassName="basis-[30%]" value={s.style}
              onChange={(st) => set({ style: st, model: s.model != null && fits(MODELS[s.model][3], st) ? s.model : null })}
              options={STYLES.map(([st]) => ({ value: st, label: st, disabled: !styleAvailable(s.mfr, st) }))} />
          </Section>
        )}

        {shown > 3 && (
          <Section id="model" sectionRef={R("model")} title="Model">
            <ModelPicker s={s} onPick={(i) => set({ model: i, mkey: modelKey(MODELS[i][0], MODELS[i][1], MODELS[i][2]), code: "" })} />
          </Section>
        )}

        {shown > 4 && (
          <Section id="incl" sectionRef={R("incl")} title="Included">
            <SegmentedControl label="What's included" value={s.incl} onChange={(v) => set({ incl: v })}
              options={[{ value: "all", label: "Everything", hint: `fitting + shipping` }, { value: "aid", label: "Aid only", hint: "tier price" }]} />
          </Section>
        )}

        {shown > 5 && (
          <Section id="molds" sectionRef={R("molds")} title="Earmolds">
            <SegmentedControl label="Earmolds" value={s.molds == null ? null : String(s.molds)} onChange={(v) => set({ molds: +v })}
              options={[{ value: "0", label: "None" }, { value: "1", label: "One", hint: "$115" }, { value: "2", label: "Two", hint: "$215" }]} />
          </Section>
        )}

        {shown > 6 && hasAddons(s) && (
          <Section id="addons" sectionRef={R("addons")} title="Add-ons">
            <AddonsStep s={s} set={set} />
          </Section>
        )}

        {finished && (
          <section ref={R("estimate")} className="arrive min-w-0 scroll-mt-[calc(8.5rem+env(safe-area-inset-top,0px))] border-t border-sep pt-7">
            <Receipt s={s} set={set} onCopy={() => setToast((t) => t + 1)} onReset={reset} />
          </section>
        )}
      </main>

      <PriceBar label={m ? `${m[0]} ${m[1]} · ${s.n === 2 ? "pair" : "one aid"}` : "Estimate"} amount={m ? money(quoteTotal(s)) : "—"}
        action={finished ? <Capsule onClick={() => jump("estimate")}>Review</Capsule> : null} />

      {toast > 0 && <RingPill key={toast} label="Estimate copied" onDone={() => setToast(0)} />}
    </div>
  );
}

/* Pinned under the nav bar: every answer so far; tap one to go back to it. */
function Selections({ s, onJump }) {
  const items = ORDER.map((key) => [key, answer(s, key)]).filter(([, v]) => v);
  if (!items.length) return null;
  return (
    <div className="material sticky top-[calc(2.75rem+env(safe-area-inset-top,0px))] z-30 shadow-[0_0.5px_0_var(--sep)]">
      <div className="mx-auto flex max-w-2xl flex-wrap gap-1.5 px-4 py-2" aria-label="Your selections">
        {items.map(([key, v]) => (
          <button key={key} type="button" onClick={() => onJump(key)} aria-label={`${LABELS[key]}: ${v}. Edit`}
            className="press inline-flex max-w-full items-center rounded-full bg-fill px-2.5 py-1 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint">
            <span className="truncate">{v}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ModelPicker({ s, onPick }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef(null);
  const k = s.n === 2 ? 1 : 0;
  const all = useMemo(() => modelsFor(s.mfr, s.style), [s.mfr, s.style]);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = all.filter(([mm]) => words.every((w) => `${mm[1]} ${mm[2]}`.toLowerCase().includes(w)));
  const cur = list.filter(([mm]) => !mm[5]), old = list.filter(([mm]) => mm[5]);
  const sel = s.model == null ? null : MODELS[s.model];
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 350); }, [open]);
  const rows = (items) => items.map(([mm, i], j) => (
    <Row key={i} as="button" type="button" last={j === items.length - 1} onClick={() => { onPick(i); setOpen(false); setQ(""); }} className="active:bg-fill">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px]">{mm[1]}{isCros(mm) && <span className="ml-1.5 rounded bg-fill px-1 text-[11px] font-semibold text-label2">CROS</span>}</span>
        <span className="block truncate text-[13px] text-label2">{mm[2]} · Tier {mm[4]}</span>
      </span>
      <span className="tnum shrink-0 text-[15px] text-label2">{money(TIERS[mm[4]][k])}</span>
      <span className="w-5 shrink-0">{s.model === i && <Checkmark />}</span>
    </Row>
  ));
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className="press flex min-h-[56px] w-full items-center gap-3 rounded-[14px] bg-card px-4 py-2.5 text-left shadow-[0_0_0_1px_var(--sep)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-tint-soft">
        {sel ? (
          <>
            <span className="min-w-0 flex-1"><span className="block truncate text-[17px] font-semibold">{sel[1]}</span><span className="block truncate text-[13px] text-label2">{sel[2]} · Tier {sel[4]}{sel[5] ? " · older list" : ""}</span></span>
            <span className="tnum shrink-0 text-[17px] font-semibold">{money(TIERS[sel[4]][k])}</span>
          </>
        ) : (
          <>
            <Search className="h-5 w-5 text-tint" strokeWidth={2.4} />
            <span className="flex-1 text-[17px] text-label2">Choose a model</span>
          </>
        )}
        <ChevronRight className="h-5 w-5 shrink-0 text-label3" />
      </button>
      <Sheet open={open} onClose={() => { setOpen(false); setQ(""); }} title={`${s.mfr} ${s.style}`}>
        <div className="px-4 pb-3"><SearchField inputRef={input} value={q} onChange={setQ} placeholder="Search models" /></div>
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          {cur.length > 0 && <Group header="Current price lists">{rows(cur)}</Group>}
          {old.length > 0 && <Group header="Older price lists" footer="Confirm the cost with the manufacturer before ordering.">{rows(old)}</Group>}
          {!list.length && <p className="py-10 text-center text-[15px] text-label2">No results for “{q}”</p>}
        </div>
      </Sheet>
    </>
  );
}

function Receipt({ s, set, onCopy, onReset }) {
  const m = MODELS[s.model];
  const lines = quoteLines(s);
  const total = quoteTotal(s);
  const code = s.code || billingCode(s);
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const [fallback, setFallback] = useState("");
  const [accOpen, setAccOpen] = useState(false);
  const acc = ADDONS[s.mfr] || [];
  const notes = [];
  if (m[5]) notes.push("Older price list — confirm the cost with the manufacturer before ordering.");
  if (m[6]) notes.push("NY SHIP program — SHIP includes free shipping, so check whether the $25 applies.");
  if (isCros(m)) notes.push("CROS/BiCROS — bill with contralateral routing codes when dispensed with a hearing aid on the same date.");
  const text = [
    "Buffalo Hearing & Speech Center — amplification estimate", `Date: ${date}`,
    s.name && `Patient: ${s.name}`, s.caseNo && `Case #: ${s.caseNo}`, `Billing code: ${code}`, "",
    ...lines.map((l) => `${l.label}${l.sub ? ` (${l.sub})` : ""}: ${money(l.amount)}`),
    `TOTAL: ${money(total)}`, "", "Includes up to 4 follow-up visits in the first year.",
  ].filter(Boolean).join("\n");
  const copy = () => { try { navigator.clipboard.writeText(text).then(onCopy, () => setFallback(text)); } catch { setFallback(text); } };
  const field = (key, label, props = {}) => (
    <Row last={key === "code"}>
      <label htmlFor={`p-${key}`} className="w-[7rem] shrink-0 text-[17px]">{label}</label>
      <input id={`p-${key}`} value={key === "code" ? code : s[key]} onChange={(e) => set({ [key]: e.target.value })} autoComplete="off"
        className="w-0 min-w-0 flex-1 bg-transparent text-right text-[17px] text-label outline-none placeholder:text-label3" {...props} />
    </Row>
  );

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-label2">Estimate</div>
        <div className="tnum mt-1 text-[52px] font-bold leading-none tracking-[-0.035em]">{money(total)}</div>
        <p className="mt-2 text-[15px] text-label2">{s.n === 2 ? "Pair" : "One aid"} · {date}</p>
      </div>

      <Group>
        {lines.map((l) => (
          <Row key={l.label}>
            <span className="min-w-0 flex-1"><span className="block text-[17px]">{l.label}</span>{l.sub && <span className="block truncate text-[13px] text-label2">{l.sub}</span>}</span>
            <span className="tnum shrink-0 text-[17px]">{money(l.amount)}</span>
          </Row>
        ))}
        {acc.length > 0 && (
          <Row as="button" type="button" onClick={() => setAccOpen(true)} className="active:bg-fill">
            <Plus className="h-5 w-5 shrink-0 text-tint" strokeWidth={2.4} />
            <span className="flex-1 text-[17px] text-tint">{s.addons.length ? "Edit accessories" : "Add accessories"}</span>
          </Row>
        )}
        <Row last>
          <span className="flex-1 text-[17px] font-semibold">Total</span>
          <span className="tnum text-[17px] font-semibold">{money(total)}</span>
        </Row>
      </Group>

      <Group header="Patient (optional, never saved)" footer={`Includes up to 4 follow-up visits in the first year.${m[4] >= 7 ? " LACE AI included." : ""}`}>
        {field("name", "Name", { placeholder: "Optional" })}
        {field("caseNo", "Case #", { placeholder: "Optional", inputMode: "numeric" })}
        {field("code", "Billing code")}
      </Group>

      {notes.map((n) => (
        <div key={n} className="flex gap-2.5 rounded-[12px] bg-warn px-4 py-3 text-[15px] text-warn-ink"><TriangleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0" />{n}</div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Capsule onClick={copy}><Copy className="h-[18px] w-[18px]" strokeWidth={2.4} />Copy estimate</Capsule>
        <Capsule variant="tinted" onClick={onReset}><RotateCcw className="h-[18px] w-[18px]" strokeWidth={2.4} />New patient</Capsule>
      </div>
      {fallback && (
        <div className="grid grid-cols-1 gap-2">
          <p className="text-[13px] text-label2">Copying isn’t allowed here. Select the text below and copy it.</p>
          <textarea readOnly value={fallback} onFocus={(e) => e.target.select()} autoFocus className="h-44 w-full rounded-[12px] bg-card p-3 text-[15px] text-label outline-none" />
        </div>
      )}

      <AccessorySheet open={accOpen} onClose={() => setAccOpen(false)} s={s} set={set} />
    </div>
  );
}

/* Accessories list (iOS switches) in a bottom sheet — used by the Add-ons step and the estimate. */
function AccessorySheet({ open, onClose, s, set }) {
  const acc = ADDONS[s.mfr] || [];
  const toggle = (nm, on) => set({ addons: on ? [...s.addons, nm] : s.addons.filter((x) => x !== nm) });
  const sum = acc.filter(([nm]) => s.addons.includes(nm)).reduce((a, [, p]) => a + p, 0);
  return (
    <Sheet open={open} onClose={onClose} title="Accessories">
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <Group footer={s.addons.length ? `${s.addons.length} added · ${money(sum)}` : "Tap Done when finished."}>
          {acc.map(([nm, p], j) => (
            <Row key={nm} last={j === acc.length - 1}>
              <span className="min-w-0 flex-1"><span className="block truncate text-[17px]">{nm}</span><span className="tnum block text-[13px] text-label2">{money(p)}</span></span>
              <Switch checked={s.addons.includes(nm)} onChange={(on) => toggle(nm, on)} label={nm} />
            </Row>
          ))}
        </Group>
      </div>
    </Sheet>
  );
}

/* The last question: None, or pick accessories in the sheet (Done answers the step). */
function AddonsStep({ s, set }) {
  const [open, setOpen] = useState(false);
  const acc = ADDONS[s.mfr] || [];
  const value = !s.addonsDone ? null : s.addons.length ? "add" : "none";
  const sum = acc.filter(([nm]) => s.addons.includes(nm)).reduce((a, [, p]) => a + p, 0);
  return (
    <div className="grid grid-cols-1 gap-3">
      <SegmentedControl label="Add-ons" value={value}
        onChange={(v) => (v === "none" ? set({ addons: [], addonsDone: true }) : setOpen(true))}
        options={[{ value: "none", label: "None" }, { value: "add", label: "Add accessories", hint: "chargers, Roger, TV" }]} />
      {s.addons.length > 0 && (
        <button type="button" onClick={() => setOpen(true)} className="text-left text-[15px] text-label2">
          {s.addons.join(", ")} · <span className="tnum">{money(sum)}</span> · <span className="text-tint">Edit</span>
        </button>
      )}
      <AccessorySheet open={open} onClose={() => { setOpen(false); set({ addonsDone: true }); }} s={s} set={set} />
    </div>
  );
}
