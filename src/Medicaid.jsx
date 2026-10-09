import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Copy, Plus, RotateCcw, Search, Info } from "lucide-react";
import { NavBar, NavButton, ThemeButton, Section, Tile, Group, Row, SearchField, Sheet, SheetPinned, PriceBar, Capsule, Checkmark } from "@/components/ios";
import { AccessorySheet, AddonsStep } from "@/components/addons";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { UndoPill } from "@/components/ui/undo-pill";
import { BlurFade } from "@/components/ui/blur-fade";
import { money, fits, isCros, MFRS, STYLES } from "@/lib/pricing";
import MED from "@/data/medicaid.json";

/* NY Medicaid estimate: hearing aids at the Medicaid rate (capped at $330 per aid — anything above
   was left out when the data was built), times two for a pair, plus any add-ons at their Medicaid price
   (Phonak only; the ReSound and Starkey lists have none, so the step is skipped). No fitting, dispensing or earmold fees. */
const MODELS = MED.models;   // [mfr, name, style label, family, rate, warranty ("" when the list gives none)]
const accFor = (mfr) => (MED.addons || {})[mfr] || [];   // [[name, Medicaid price, warranty], …]
const hasAddons = (s) => accFor(s.mfr).length > 0;
/* "3 years · $0 loss & damage deductible" -> { term: "3 years", extra: "$0 loss & damage deductible" } */
const warrantyOf = (m) => { const [term = "", ...rest] = (m[5] || "").split(" · "); return { term, extra: rest.join(" · ") }; };
const BRANDS = MFRS.filter(([n]) => MODELS.some((m) => m[0] === n));
const CODES = { CIC: ["V5254", "V5258"], IIC: ["V5254", "V5258"], ITC: ["V5255", "V5259"], ITE: ["V5256", "V5260"], BTE: ["V5257", "V5261"], RIC: ["V5257", "V5261"] };
const ORDER = ["mfr", "n", "style", "model", "addons"];
const LABELS = { mfr: "Manufacturer", n: "Hearing aids", style: "Style", model: "Model", addons: "Add-ons" };
const blank = () => ({ mfr: null, n: null, style: null, model: null, addons: [], addonsDone: false, name: "", caseNo: "", code: "" });
const styleAvail = (mfr, st) => MODELS.some((m) => m[0] === mfr && fits(m[3], st));
const answer = (s, key) => ({
  mfr: s.mfr, n: s.n && (s.n === 2 ? "Two aids" : "One aid"), style: s.style, model: s.model != null && MODELS[s.model][1],
  addons: !s.addonsDone ? null : s.addons.length ? `${s.addons.length} add-on${s.addons.length > 1 ? "s" : ""}` : "No add-ons",
})[key];
const isDone = (s, key) => ({ mfr: !!s.mfr, n: !!s.n, style: !!s.style, model: s.model != null, addons: s.addonsDone || (!!s.mfr && !hasAddons(s)) })[key];
const code = (s) => {
  const m = s.model == null ? null : MODELS[s.model];
  if (!m || !s.style) return "";
  if (isCros(m)) return s.n === 2 ? "V5211–V5221 (CROS/BiCROS)" : "V5171–V5181 (CROS/BiCROS)";
  return CODES[s.style][s.n === 2 ? 1 : 0];
};
function lines(s) {
  const m = s.model == null ? null : MODELS[s.model];
  if (!m || !s.n) return [];
  const out = [{ label: s.n === 2 ? "Hearing aids (pair) · Medicaid rate" : "Hearing aid · Medicaid rate", sub: `${m[0]} ${m[1]} · ${money(m[4])} per aid`, amount: m[4] * s.n }];
  accFor(s.mfr).forEach(([nm, p]) => { if (s.addons.includes(nm)) out.push({ label: nm, sub: "Add-on · Medicaid price", amount: p }); });
  return out;
}
const total = (s) => lines(s).reduce((a, l) => a + l.amount, 0);

export default function Medicaid({ menu = null }) {
  const [s, setS] = useState(blank);
  const [toast, setToast] = useState(0);
  const refs = useRef({});
  const firstOpen = ORDER.findIndex((k) => !isDone(s, k));
  const finished = firstOpen === -1;
  const shown = finished ? ORDER.length : firstOpen + 1;
  const set = (patch) => setS((p) => ({ ...p, ...patch }));
  const R = (key) => (el) => (refs.current[key] = el);
  const jump = (key) => refs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  const prevShown = useRef(shown), wasFinished = useRef(finished);
  useEffect(() => {
    const key = finished && !wasFinished.current ? "estimate" : shown > prevShown.current ? ORDER[shown - 1] : null;
    if (key) requestAnimationFrame(() => {
      const el = refs.current[key]; if (!el) return;
      const r = el.getBoundingClientRect(), down = r.bottom - (window.innerHeight - 150);
      const dy = down > 0 ? Math.min(down, r.top - 150) : r.top < 150 ? r.top - 150 : 0;
      if (dy) window.scrollBy({ top: dy, behavior: "smooth" });
    });
    prevShown.current = shown; wasFinished.current = finished;
  }, [shown, finished]);
  const reset = () => { setS(blank()); prevShown.current = 1; wasFinished.current = false; window.scrollTo({ top: 0, behavior: "smooth" }); };
  const m = s.model == null ? null : MODELS[s.model];
  const chips = ORDER.map((k) => [k, answer(s, k)]).filter(([, v]) => v);

  return (
    <div className="min-h-screen pb-36">
      <NavBar title="Medicaid Estimate" shortTitle="Medicaid" subtitle={`NY Medicaid rates · up to ${money(MED.cap)} per aid`}
        left={<>{menu}<NavButton onClick={reset}><RotateCcw className="h-[18px] w-[18px]" strokeWidth={2.4} />New</NavButton></>}
        right={<ThemeButton />} />

      {chips.length > 0 && (
        <div className="material sticky top-[calc(2.75rem+env(safe-area-inset-top,0px))] z-30 shadow-[0_0.5px_0_var(--sep)]">
          <div className="mx-auto flex max-w-2xl flex-wrap gap-1.5 px-4 py-2" aria-label="Your selections">
            {chips.map(([k, v]) => (
              <button key={k} type="button" onClick={() => jump(k)} aria-label={`${LABELS[k]}: ${v}. Edit`}
                className="press inline-flex max-w-full items-center rounded-full bg-fill px-2.5 py-1 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint">
                <span className="truncate">{v}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="mx-auto grid max-w-2xl grid-cols-1 gap-8 px-4 pt-4">
        <Section id="mfr" sectionRef={R("mfr")} title="Manufacturer">
          <div role="radiogroup" className="grid grid-cols-2 gap-2.5">
            {BRANDS.map(([name, color]) => (
              <Tile key={name} selected={s.mfr === name} className="min-h-[56px] flex-row items-center justify-start gap-2.5"
                onClick={() => set({ mfr: name, model: null, addons: [], addonsDone: false, style: s.style && styleAvail(name, s.style) ? s.style : null })}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                <span className="text-[17px] font-semibold">{name}</span>
              </Tile>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-label2">No Oticon Medicaid price list has been added yet.</p>
        </Section>

        {shown > 1 && (
          <Section id="n" sectionRef={R("n")} title="One aid or two?">
            <SegmentedControl label="One aid or two" value={s.n ? String(s.n) : null} onValueChange={(v) => set({ n: +v })}
              options={[{ value: "1", label: "One aid" }, { value: "2", label: "Two aids" }]} />
          </Section>
        )}

        {shown > 2 && (
          <Section id="style" sectionRef={R("style")} title="Style">
            <SegmentedControl label="Style" value={s.style}
              onValueChange={(st) => set({ style: st, model: s.model != null && fits(MODELS[s.model][3], st) ? s.model : null })}
              options={STYLES.map(([st]) => ({ value: st, label: st, disabled: !styleAvail(s.mfr, st) }))} />
          </Section>
        )}

        {shown > 3 && (
          <Section id="model" sectionRef={R("model")} title="Model">
            <Picker s={s} onPick={(i) => set({ model: i, code: "" })} />
          </Section>
        )}

        {shown > 4 && hasAddons(s) && (
          <Section id="addons" sectionRef={R("addons")} title="Add-ons">
            <AddonsStep s={s} set={set} acc={accFor(s.mfr)} header={`${MED.sources[s.mfr]} · Medicaid prices`} />
          </Section>
        )}


        {finished && (
          <BlurFade className="min-w-0"><section ref={R("estimate")} className="min-w-0 scroll-mt-[calc(8.5rem+env(safe-area-inset-top,0px))] border-t border-sep pt-7">
            <Receipt s={s} set={set} onCopy={() => setToast((t) => t + 1)} onReset={reset} />
          </section></BlurFade>
        )}
      </main>

      <PriceBar label={m ? `Medicaid · ${m[0]} ${m[1]} · ${s.n === 2 ? "pair" : "one aid"}` : "Medicaid estimate"} amount={m && s.n ? money(total(s)) : "—"}
        action={finished ? <Capsule onClick={() => jump("estimate")}>Review</Capsule> : null} />
      {/* Copy confirmation: Undo Pill (21st.dev #29941, components/ui/undo-pill.tsx); OK closes it early */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4">
        <UndoPill open={toast > 0} label="Estimate copied" duration={4} undoLabel="OK" onUndo={() => setToast(0)} onExpire={() => setToast(0)} />
      </div>
    </div>
  );
}

function Picker({ s, onPick }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef(null);
  const all = useMemo(() => MODELS.map((mm, i) => [mm, i]).filter(([mm]) => mm[0] === s.mfr && fits(mm[3], s.style)), [s.mfr, s.style]);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = all.filter(([mm]) => words.every((w) => `${mm[1]} ${mm[2]}`.toLowerCase().includes(w)));
  const sel = s.model == null ? null : MODELS[s.model];
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 350); }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className="press flex min-h-[56px] w-full items-center gap-3 rounded-[14px] bg-card px-4 py-2.5 text-left shadow-[0_0_0_1px_var(--sep)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-tint-soft">
        {sel ? (
          <>
            <span className="min-w-0 flex-1"><span className="block truncate text-[17px] font-semibold">{sel[1]}</span><span className="block truncate text-[13px] text-label2">{sel[2]} · Medicaid rate</span></span>
            <span className="tnum shrink-0 text-[17px] font-semibold">{money(sel[4])}</span>
          </>
        ) : (
          <><Search className="h-5 w-5 text-tint" strokeWidth={2.4} /><span className="flex-1 text-[17px] text-label2">Choose a model</span></>
        )}
        <ChevronRight className="h-5 w-5 shrink-0 text-label3" />
      </button>
      <Sheet open={open} onClose={() => { setOpen(false); setQ(""); }} title={`${s.mfr} ${s.style} · Medicaid`}>
        <SheetPinned><SearchField inputRef={input} value={q} onChange={setQ} placeholder="Search models" /></SheetPinned>
        <div className="grid grid-cols-1 gap-6 pb-2">
          {list.length ? (
            <Group header={MED.sources[s.mfr]} footer={`Price per aid. Models over ${money(MED.cap)} aren't listed.`}>
              {list.map(([mm, i], j) => (
                <Row key={i} as="button" type="button" last={j === list.length - 1} onClick={() => { onPick(i); setOpen(false); setQ(""); }} className="active:bg-fill">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px]">{mm[1]}{isCros(mm) && <span className="ml-1.5 rounded bg-fill px-1 text-[11px] font-semibold text-label2">CROS</span>}</span>
                    <span className="block truncate text-[13px] text-label2">{mm[2]}</span>
                  </span>
                  <span className="tnum shrink-0 text-[15px] text-label2">{money(mm[4])}</span>
                  <span className="w-5 shrink-0">{s.model === i && <Checkmark />}</span>
                </Row>
              ))}
            </Group>
          ) : <p className="py-10 text-center text-[15px] text-label2">{q ? `No results for “${q}”` : "No Medicaid models in this style."}</p>}
        </div>
      </Sheet>
    </>
  );
}

function Receipt({ s, set, onCopy, onReset }) {
  const m = MODELS[s.model];
  const ls = lines(s), t = total(s), billing = s.code || code(s);
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const [fallback, setFallback] = useState("");
  const w = warrantyOf(m);
  const each = s.n === 2 ? "each aid" : "";
  const acc = accFor(m[0]);
  const picked = acc.filter(([nm]) => s.addons.includes(nm));
  const [accOpen, setAccOpen] = useState(false);
  const notes = [];
  if (m[0] === "ReSound") notes.push("ReSound Medicaid orders include free shipping and handling. Mention NY MEDIC when placing custom or BTE orders.");
  if (isCros(m)) notes.push("CROS/BiCROS: bill with contralateral routing codes when dispensed with a hearing aid on the same date.");
  const text = [
    "Buffalo Hearing & Speech Center — NY Medicaid amplification estimate", `Date: ${date}`,
    s.name && `Patient: ${s.name}`, s.caseNo && `Medicaid ID: ${s.caseNo}`, `Billing code: ${billing}`, "",
    ...ls.map((l) => `${l.label} (${l.sub}): ${money(l.amount)}`), `TOTAL: ${money(t)}`, "",
    w.term ? `Warranty: ${[w.term, w.extra, each].filter(Boolean).join(", ")}` : `Warranty: not listed on the ${m[0]} Medicaid list; confirm with ${m[0]}`,
    ...picked.map(([nm, , aw]) => `Warranty, ${nm}: ${aw || "not listed"}`),
  ].filter(Boolean).join("\n");
  const copy = () => { try { navigator.clipboard.writeText(text).then(onCopy, () => setFallback(text)); } catch { setFallback(text); } };
  const field = (key, label, props = {}) => (
    <Row last={key === "code"}>
      <label htmlFor={`m-${key}`} className="w-[7rem] shrink-0 text-[17px]">{label}</label>
      <input id={`m-${key}`} value={key === "code" ? billing : s[key]} onChange={(e) => set({ [key]: e.target.value })} autoComplete="off"
        className="w-0 min-w-0 flex-1 bg-transparent text-right text-[17px] text-label outline-none placeholder:text-label3" {...props} />
    </Row>
  );
  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-label2">Medicaid estimate</div>
        <div className="tnum mt-1 text-[52px] font-bold leading-none tracking-[-0.035em]">{money(t)}</div>
        <p className="mt-2 text-[15px] text-label2">{s.n === 2 ? "Pair" : "One aid"} · {date}</p>
      </div>
      <Group>
        {ls.map((l) => (
          <Row key={l.label}>
            <span className="min-w-0 flex-1"><span className="block text-[17px]">{l.label}</span><span className="block truncate text-[13px] text-label2">{l.sub}</span></span>
            <span className="tnum shrink-0 text-[17px]">{money(l.amount)}</span>
          </Row>
        ))}
        {acc.length > 0 && (
          <Row as="button" type="button" onClick={() => setAccOpen(true)} className="active:bg-fill">
            <Plus className="h-5 w-5 shrink-0 text-tint" strokeWidth={2.4} />
            <span className="flex-1 text-[17px] text-tint">{s.addons.length ? "Edit accessories" : "Add accessories"}</span>
          </Row>
        )}
        <Row last><span className="flex-1 text-[17px] font-semibold">Total</span><span className="tnum text-[17px] font-semibold">{money(t)}</span></Row>
      </Group>
      <Group header="Manufacturer warranty" footer={w.term ? `From the ${MED.sources[m[0]]}.` : `${m[0]}'s Medicaid list doesn't give a warranty for this model. Confirm it with ${m[0]}.`}>
        <Row last={picked.length === 0}>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px]">{s.n === 2 ? "Hearing aids" : "Hearing aid"}</span>
            {(w.extra || each) && <span className="block text-[13px] text-label2">{[w.extra, each].filter(Boolean).join(" · ")}</span>}
          </span>
          <span className={w.term ? "shrink-0 text-[17px] font-semibold" : "shrink-0 text-[17px] text-label2"}>{w.term || "Not listed"}</span>
        </Row>
        {picked.map(([nm, , aw], j) => (
          <Row key={nm} last={j === picked.length - 1}>
            <span className="min-w-0 flex-1"><span className="block truncate text-[17px]">{nm}</span><span className="block text-[13px] text-label2">Add-on</span></span>
            <span className={aw ? "shrink-0 text-[17px] font-semibold" : "shrink-0 text-[17px] text-label2"}>{aw || "Not listed"}</span>
          </Row>
        ))}
      </Group>
      <Group header="Patient (optional, never saved)">
        {field("name", "Name", { placeholder: "Optional" })}
        {field("caseNo", "Medicaid ID", { placeholder: "Optional" })}
        {field("code", "Billing code")}
      </Group>
      {notes.map((n) => (
        <div key={n} className="flex gap-2.5 rounded-[12px] bg-tint-soft px-4 py-3 text-[15px] text-label"><Info className="mt-0.5 h-[18px] w-[18px] shrink-0 text-tint" />{n}</div>
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
      <AccessorySheet open={accOpen} onClose={() => setAccOpen(false)} s={s} set={set} acc={acc} header={`${MED.sources[m[0]]} · Medicaid prices`} />
    </div>
  );
}
