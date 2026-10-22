import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ClipboardPaste, Download, KeyRound, Lock, Plus, TriangleAlert } from "lucide-react";
import { NavBar, ThemeButton, SearchField, Pills, Capsule } from "@/components/ios";
import { MODELS, MFRS, PRICE_LISTS, TIERS, FAMILIES, HAS_COSTS, famStyle, modelKey, money, tierFor } from "@/lib/pricing";
import { readPriceList, pastes, styleLabel, checkPin, makePin, nextData, savedPage, downloadPage, useData } from "@/lib/priceupdate";
import { cn } from "@/lib/utils";

/* Update prices (admin PIN): paste a manufacturer's new price list or change/add a model by hand, review
   every change with its tier and patient prices, then save an updated copy of the app for IT to swap in.
   Nothing changes until "Save updated app". */
const FILE = "BHSC-Amplification-Estimate.html";
const usd = (n) => (n == null ? "—" : "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const patient = (t) => `${money(TIERS[t][0])} / ${money(TIERS[t][1])}`;
const FAM_LABEL = { CUSTOM: "Custom (in the ear)", ALL: "All styles" };
const HOW = {
  ReSound: "ReSound’s price list is a scanned image, so type the prices instead: one model and its BHSC price per line, e.g. “Sensia 9  1415”. Only the models you type are changed.",
  Signia: "Open Signia’s price list (PDF), press Ctrl+A then Ctrl+C, click in the box and press Ctrl+V. The Level 1 price is used; the accessory pages are skipped. You can also type one model and its price per line, e.g. “Pure Charge&Go 7AX  1090”.",
  Phonak: "Open the BHSC pricing spreadsheet from Phonak, select the Product, List Price and Net Price columns, copy (Ctrl+C) and paste here (Ctrl+V).",
  Oticon: "Open Oticon’s price list (PDF), press Ctrl+A then Ctrl+C, click in the box and press Ctrl+V. The Net Price is used.",
  Starkey: "Open Starkey’s account price report (PDF), press Ctrl+A then Ctrl+C, click in the box and press Ctrl+V. The account price is used.",
};
const howTo = (mfr) => HOW[mfr] || `Type the ${mfr} prices: one model and its BHSC price per line, e.g. “Model name  1200”. Every style of that model gets the new price; a name the app doesn’t have is added as a new model.`;
const EXAMPLE = { ReSound: "Sensia 9  1415\nVivia 7  930" };
const NEW = "+new";
const input = "h-10 w-full rounded-[10px] bg-fill px-3 text-[15px] text-label outline-none placeholder:text-label3 focus:ring-2 focus:ring-tint";
const card = "rounded-[12px] bg-card";
// what saving would change (a model missing from a new list only counts once it is set to Remove)
const counts = (c) => c.type === "price" || (c.type === "new" && c.add) || (c.type === "missing" && c.remove);

export default function UpdatePrices({ menu = null, onSaved }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("choose");
  const [staged, setStaged] = useState([]);
  const [brands, setBrands] = useState([]);
  const [pin, setPin] = useState(null);
  const [done, setDone] = useState(false);
  const go = (s) => { setStep(s); setDone(false); window.scrollTo(0, 0); };
  const stage = (items, mfr) => {
    setStaged((p) => [...p.filter((c) => !items.some((x) => x.key === c.key)), ...items]);
    if (mfr) setBrands((b) => (b.includes(mfr) ? b : [...b, mfr]));
  };
  const pending = staged.filter(counts).length + (pin ? 1 : 0);

  // Leaving with unsaved changes asks first
  useEffect(() => {
    if (!pending) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  const save = () => {
    const data = nextData({ changes: staged, pin, brands });
    downloadPage(savedPage(data), FILE);
    useData(data);
    setStaged([]); setBrands([]); setPin(null); setDone(true);
    onSaved?.(data);
  };

  const steps = [["choose", "Choose"], ["edit", "Paste or edit"], ["review", "Review & save"]];
  const at = step === "paste" || step === "edit" ? 1 : step === "review" ? 2 : 0;

  return (
    <div className="min-h-screen pb-16">
      <NavBar wide compact title="Update prices" subtitle="Keep the hearing aid prices current" left={menu} right={<ThemeButton />} />
      <main className="mx-auto grid max-w-2xl grid-cols-1 gap-4 px-4 pt-3 lg:max-w-6xl">
        {!open ? <Unlock onOpen={() => setOpen(true)} /> : (
          <>
            {step !== "pin" && !done && (
              <ol aria-label="Steps" className="flex flex-wrap items-center gap-1.5 text-[14px]">
                {steps.map(([id, label], i) => (
                  <li key={id} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-label3">›</span>}
                    <span aria-current={i === at ? "step" : undefined}
                      className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-semibold", i === at ? "bg-tint-soft text-tint" : i < at ? "bg-fill text-label2" : "bg-fill text-label3")}>
                      <span className={cn("grid h-5 w-5 place-items-center rounded-full text-[12px]", i === at ? "bg-tint text-tint-ink" : "bg-fill2")}>
                        {i < at ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                      </span>{label}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {done ? <Saved onDone={() => go("choose")} /> : step === "choose" ? (
              <Choose pending={pending} go={go} />
            ) : step === "paste" ? (
              <Paste onBack={() => go("choose")} onUse={(items, mfr) => { stage(items, mfr); go("review"); }} />
            ) : step === "edit" ? (
              <Edit count={staged.filter(counts).length} onBack={() => go("choose")} onStage={(items) => stage(items)} onReview={() => go("review")} />
            ) : step === "pin" ? (
              <ChangePin onBack={() => go("choose")} onSet={(p) => { setPin(p); go("review"); }} />
            ) : (
              <Review staged={staged} setStaged={setStaged} pin={pin} onDropPin={() => setPin(null)} onMore={() => go("choose")} onSave={save} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ── Admin PIN ── */
function Unlock({ onOpen }) {
  const [v, setV] = useState("");
  const [bad, setBad] = useState(false);
  const submit = (e) => { e.preventDefault(); if (checkPin(v)) onOpen(); else { setBad(true); setV(""); } };
  return (
    <form onSubmit={submit} className={cn(card, "mx-auto mt-6 grid w-full max-w-sm gap-3 p-6 text-center")}>
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-tint-soft text-tint"><Lock className="h-6 w-6" strokeWidth={2.2} /></span>
      <h2 className="text-[20px] font-semibold">Admin PIN</h2>
      <p className="-mt-2 text-[14px] text-label2">Enter the admin PIN to update prices.</p>
      <input type="password" inputMode="numeric" autoComplete="off" autoFocus aria-label="Admin PIN" value={v}
        onChange={(e) => { setV(e.target.value); setBad(false); }} className={cn(input, "h-12 text-center text-[22px] tracking-[0.3em]")} />
      {bad && <p role="alert" className="text-[14px] font-semibold text-bad">That PIN isn’t right.</p>}
      <Capsule type="submit" disabled={!v}>Unlock</Capsule>
      <p className="text-[12px] text-label3">Forgot the PIN? IT can reset it.</p>
    </form>
  );
}

function ChangePin({ onBack, onSet }) {
  const [f, setF] = useState({ cur: "", a: "", b: "" });
  const [err, setErr] = useState("");
  const set = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); setErr(""); };
  const submit = (e) => {
    e.preventDefault();
    if (!checkPin(f.cur)) return setErr("The current PIN isn’t right.");
    if (f.a.length < 4) return setErr("Use at least 4 characters.");
    if (f.a !== f.b) return setErr("The new PINs don’t match.");
    onSet(makePin(f.a));
  };
  const field = (k, label) => (
    <label className="grid gap-1 text-left text-[13px] font-semibold text-label2">{label}
      <input type="password" autoComplete="off" value={f[k]} onChange={set(k)} className={cn(input, "text-[17px] tracking-[0.2em]")} />
    </label>
  );
  return (
    <form onSubmit={submit} className={cn(card, "mx-auto mt-2 grid w-full max-w-sm gap-3 p-6")}>
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-tint-soft text-tint"><KeyRound className="h-6 w-6" strokeWidth={2.2} /></span>
      <h2 className="text-center text-[20px] font-semibold">Change admin PIN</h2>
      {field("cur", "Current PIN")}{field("a", "New PIN")}{field("b", "New PIN again")}
      {err && <p role="alert" className="text-[14px] font-semibold text-bad">{err}</p>}
      <Capsule type="submit" disabled={!f.cur || !f.a || !f.b}>Continue</Capsule>
      <button type="button" onClick={onBack} className="text-[15px] text-tint">Cancel</button>
      <p className="text-[12px] leading-snug text-label3">The new PIN is saved in the updated app file on the next screen.</p>
    </form>
  );
}

/* ── Step 1: choose ── */
function Choose({ pending, go }) {
  return (
    <>
      {pending > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[12px] bg-tint-soft px-4 py-3 text-[15px]">
          <span className="font-semibold text-tint">{pending} {pending === 1 ? "change" : "changes"} waiting to be saved.</span>
          <Capsule variant="fill" className="ml-auto h-9 px-4 text-[15px]" onClick={() => go("review")}>Review & save<ArrowRight className="h-4 w-4" strokeWidth={2.4} /></Capsule>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className={cn(card, "grid content-start gap-3 p-6 shadow-[0_0_0_2px_var(--tint)]")}>
          <span className="justify-self-start rounded-full bg-tint-soft px-2.5 py-0.5 text-[12px] font-semibold text-tint">Easiest</span>
          <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-tint-soft text-tint"><ClipboardPaste className="h-5 w-5" strokeWidth={2.2} /></span>
          <h2 className="text-[20px] font-semibold">Paste a new price list</h2>
          <p className="text-[15px] leading-relaxed text-label2">Open the manufacturer’s new price list (PDF or Excel), press <b className="text-label">Ctrl+A</b> then <b className="text-label">Ctrl+C</b>, and paste it here. The app finds every hearing aid and its new BHSC price for you.</p>
          <Capsule className="mt-1 justify-self-start" onClick={() => go("paste")}>Paste a price list</Capsule>
        </section>
        <section className={cn(card, "grid content-start gap-3 p-6")}>
          <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-tint-soft text-tint"><Plus className="h-5 w-5" strokeWidth={2.4} /></span>
          <h2 className="text-[20px] font-semibold">Add or edit a model</h2>
          <p className="text-[15px] leading-relaxed text-label2">A new hearing aid came out, or one price changed. Search for it and type the new BHSC price — the tier and patient prices are worked out automatically.</p>
          <Capsule variant="tinted" className="mt-1 justify-self-start" onClick={() => go("edit")}>Add or edit</Capsule>
        </section>
      </div>
      <p className="px-1 text-[13px] leading-snug text-label2">
        Prices in use now: {MFRS.map(([m]) => `${m} ${PRICE_LISTS[m] || "2026"}`).join(" · ")}. Tiers and patient prices always follow the BHSC 2026 tier sheet.
      </p>
      <button type="button" onClick={() => go("pin")} className="press inline-flex items-center gap-1.5 justify-self-start px-1 text-[15px] font-semibold text-tint">
        <KeyRound className="h-4 w-4" strokeWidth={2.4} />Change admin PIN
      </button>
    </>
  );
}

/* ── Step 2a: paste a list ── */
function Paste({ onBack, onUse }) {
  const [mfr, setMfr] = useState("Oticon");
  const [text, setText] = useState("");
  const r = useMemo(() => (text.trim() ? readPriceList(mfr, text) : null), [mfr, text]);
  const typed = r ? !!r.typed : !pastes(mfr);
  const tierMoves = r ? r.changes.filter((c) => c.newTier !== c.oldTier).length : 0;
  const missing = r && !typed ? r.missing : [];
  const found = r && (r.changes.length || r.added.length || missing.length);
  const lowMatch = r && !typed && r.read > 0 && r.matched < r.total / 2;
  const line = (ok, n, children, warn) => (
    <li className="flex items-start gap-2.5">
      <span className={cn("mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-bold", warn ? "bg-warn text-warn-ink" : ok ? "bg-ok text-ok-ink" : "bg-tint-soft text-tint")}>
        {warn ? "!" : ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : "+"}
      </span>
      <span><b className="tnum">{n}</b> {children}</span>
    </li>
  );
  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2.5 rounded-[12px] bg-card px-4 py-2.5">
        <Pills label="Manufacturer" value={mfr} onChange={setMfr} options={MFRS.map(([n]) => ({ value: n, label: n }))} />
        <button type="button" onClick={onBack} className="ml-auto inline-flex items-center gap-1 text-[15px] font-semibold text-tint"><ArrowLeft className="h-4 w-4" strokeWidth={2.4} />Back</button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 content-start gap-2">
          <p className="px-1 text-[14px] leading-snug text-label2">{howTo(mfr)}</p>
          <textarea aria-label={`${mfr} price list`} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
            placeholder={typed ? EXAMPLE[mfr] || "Model name  1200" : `Paste the ${mfr} price list here`}
            className="h-[460px] w-full resize-y rounded-[12px] bg-card p-4 font-mono text-[13px] leading-relaxed text-label outline-none shadow-[0_0_0_1px_var(--sep)] focus:shadow-[0_0_0_2px_var(--tint)]" />
        </div>
        <aside aria-label="What the app found" className={cn(card, "grid content-start gap-3 self-start p-5")}>
          <h2 className="text-[18px] font-semibold">What the app found</h2>
          {!r ? <p className="text-[14px] text-label2">Paste the list on the left and the results show here.</p> : !r.read ? (
            <p className="flex gap-2 rounded-[10px] bg-warn px-3 py-2 text-[14px] leading-snug text-warn-ink"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />No {mfr} hearing aids found in this text. Check that the manufacturer above matches the list.</p>
          ) : (
            <>
              <ul className="grid gap-2.5 text-[15px]">
                {line(true, r.read, `hearing aid ${r.read === 1 ? "line" : "lines"} read`)}
                {!typed && line(!lowMatch, `${r.matched} of ${r.total}`, `${mfr} styles matched`, lowMatch)}
                {line(!r.changes.length, r.changes.length, <>{r.changes.length === 1 ? "price" : "prices"} changed{tierMoves > 0 && <span className="text-label2"> ({tierMoves} {tierMoves === 1 ? "moves" : "move"} to a new tier)</span>}</>, r.changes.length > 0)}
                {line(!r.added.length, r.added.length, `new ${r.added.length === 1 ? "model" : "models"} not in the app yet`)}
                {!typed && line(!missing.length, missing.length, `${missing.length === 1 ? "model" : "models"} missing from the new list`, missing.length > 0)}
              </ul>
              {!HAS_COSTS && r.changes.length > 0 && <p className="text-[13px] leading-snug text-label2">This copy has no BHSC prices built in, so every price on the list counts as new. The tier on the next screen shows whether the patient price changes.</p>}
              {lowMatch && <p className="text-[13px] leading-snug text-warn-ink">Most models weren’t found. Is this the full {mfr} list, copied with Ctrl+A?</p>}
              {missing.length > 0 && <p className="text-[13px] leading-snug text-label2">Missing models stay in the app unless you choose to remove them on the next screen.</p>}
            </>
          )}
          <p className="text-[13px] leading-snug text-label2">Only the BHSC price is used. Nothing changes until you review and save.</p>
          <Capsule className="justify-self-start" disabled={!found} onClick={() => onUse([...r.changes, ...r.added, ...missing], mfr)}>
            {r && r.read && !found ? "No changes found" : "Review changes"}<ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </Capsule>
        </aside>
      </div>
    </>
  );
}

/* ── Step 2b: change one model's price, or add a model by hand ── */
const price = (v) => { const n = parseFloat(String(v).replace(/[$,\s]/g, "")); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null; };

function Edit({ count, onBack, onStage, onReview }) {
  const [q, setQ] = useState("");
  const [pick, setPick] = useState(null);
  const [cost, setCost] = useState("");
  const [nm, setNm] = useState({ mfr: "Oticon", company: "", name: "", style: "", fam: "RIC", cost: "" });
  const [note, setNote] = useState("");
  const costRef = useRef(null);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hits = words.length ? MODELS.filter((m) => words.every((w) => `${m[0]} ${m[1]} ${m[2]}`.toLowerCase().includes(w)))
    .sort((a, b) => a[5] - b[5]).slice(0, 12) : [];
  const c = price(cost), nc = price(nm.cost);
  // a new company typed with the same name as one the app has (any capitals) goes to that one
  const company = nm.company.trim(), known = MFRS.find(([n]) => n.toLowerCase() === company.toLowerCase());
  const nmfr = nm.mfr === NEW ? (known ? known[0] : company) : nm.mfr;
  // shown the way the app shows that manufacturer's styles, so the next pasted list finds it
  const nstyle = !nm.style.trim() ? famStyle(nm.fam) : nmfr === "Starkey" ? styleLabel("Starkey", "", nm.style.trim()) : nm.style.trim();
  const nkey = modelKey(nmfr, nm.name.trim(), nstyle);
  const exists = nm.name.trim() && MODELS.some((m) => modelKey(m[0], m[1], m[2]) === nkey);
  const flash = (t) => { setNote(t); setTimeout(() => setNote(""), 4000); };

  const setPrice = () => {
    const m = pick;
    onStage([{ type: "price", key: modelKey(m[0], m[1], m[2]), mfr: m[0], name: m[1], style: m[2], fam: m[3], older: !!m[5], oldCost: m[7], newCost: c, oldTier: m[4], newTier: tierFor(c) }]);
    flash(`${m[1]} · ${m[2]}: new price added to the changes.`);
    setPick(null); setCost(""); setQ("");
  };
  const addModel = () => {
    onStage([{ type: "new", key: nkey, mfr: nmfr, name: nm.name.trim(), style: nstyle, fam: nm.fam, autoStyle: !nm.style.trim(), newCost: nc, newTier: tierFor(nc), add: true }]);
    flash(`${nm.name.trim()} added to the changes.`);
    setNm((p) => ({ ...p, name: "", style: "", cost: "" }));
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-1">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[15px] font-semibold text-tint"><ArrowLeft className="h-4 w-4" strokeWidth={2.4} />Back</button>
        <Capsule className="h-10 px-4 text-[15px]" disabled={!count} onClick={onReview}>
          Review & save{count > 0 && ` (${count})`}<ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </Capsule>
      </div>
      {note && <p role="status" className="flex items-center gap-2 rounded-[10px] bg-ok px-3 py-2 text-[14px] font-semibold text-ok-ink"><Check className="h-4 w-4" strokeWidth={3} />{note}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section aria-label="Change a price" className={cn(card, "grid content-start gap-3 p-5")}>
          <h2 className="text-[18px] font-semibold">Change a price</h2>
          <SearchField value={q} onChange={(v) => { setQ(v); setPick(null); }} placeholder="Search, e.g. Intent 2 or Omega 24" />
          {!words.length && <p className="text-[14px] leading-snug text-label2">Type part of the model’s name to find it, then enter its new BHSC price. The tier and patient prices update by themselves.</p>}
          {words.length > 0 && !hits.length && <p className="text-[14px] text-label2">No models match. To add a new one, use “Add a new model”.</p>}
          {hits.length > 0 && !pick && (
            <ul className="-mx-1 grid">
              {hits.map((m) => (
                <li key={modelKey(m[0], m[1], m[2])}>
                  <button type="button" onClick={() => { setPick(m); setCost(""); setTimeout(() => costRef.current?.focus(), 0); }}
                    className="press flex w-full items-baseline gap-3 rounded-[8px] px-2 py-1.5 text-left text-[14px] hover:bg-fill">
                    <span className="min-w-0 flex-1 truncate"><b className="text-[15px]">{m[1]}</b> <span className="text-label2">· {m[2]} · {m[0]}{m[5] ? " · older list" : ""}</span></span>
                    <span className="shrink-0 text-[13px] text-label2">Tier {m[4]}</span>
                    <span className="tnum w-[5.5rem] shrink-0 text-right font-semibold">{usd(m[7])}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pick && (
            <div className="grid gap-3 rounded-[10px] bg-fill p-4">
              <div className="text-[15px]"><b>{pick[0]} {pick[1]}</b> <span className="text-label2">· {pick[2]}</span></div>
              <div className="text-[14px] text-label2">Now: <b className="tnum text-label">{usd(pick[7])}</b> · Tier {pick[4]} · patients pay {patient(pick[4])}</div>
              <label className="grid gap-1 text-[13px] font-semibold text-label2">New BHSC price (per aid)
                <input ref={costRef} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="$0.00" className={cn(input, "bg-card")} />
              </label>
              {c && <div className="text-[14px]">New: Tier <b>{tierFor(c)}</b>{tierFor(c) !== pick[4] && <span className="text-warn-ink"> (was {pick[4]})</span>} · patients pay <b>{patient(tierFor(c))}</b></div>}
              <div className="flex gap-2">
                <Capsule className="h-10 px-4 text-[15px]" disabled={!c} onClick={setPrice}>Use this price</Capsule>
                <Capsule variant="plain" className="h-10 px-3 text-[15px]" onClick={() => setPick(null)}>Cancel</Capsule>
              </div>
            </div>
          )}
        </section>

        <section aria-label="Add a new model" className={cn(card, "grid content-start gap-3 p-5")}>
          <h2 className="text-[18px] font-semibold">Add a new model</h2>
          <Pills label="Manufacturer" value={nm.mfr} onChange={(v) => setNm((p) => ({ ...p, mfr: v }))}
            options={[...MFRS.map(([n]) => ({ value: n, label: n })), { value: NEW, label: "+ New company", title: "A manufacturer the app doesn’t have yet" }]} />
          {nm.mfr === NEW && (
            <label className="grid gap-1 text-[13px] font-semibold text-label2">Company name
              <input value={nm.company} onChange={(e) => setNm((p) => ({ ...p, company: e.target.value }))} placeholder="e.g. Widex" autoFocus className={input} />
              <span className="font-normal text-label3">{known ? `${known[0]} is already in the app; the model is added there.` : "The company gets its own button everywhere in the app once you save."}</span>
            </label>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-[13px] font-semibold text-label2">Model name
              <input value={nm.name} onChange={(e) => setNm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Intent 5" className={input} />
            </label>
            <label className="grid gap-1 text-[13px] font-semibold text-label2">Style (as on the price list)
              <input value={nm.style} onChange={(e) => setNm((p) => ({ ...p, style: e.target.value }))} placeholder="e.g. miniRITE R" className={input} />
            </label>
          </div>
          <Pills label="Type" value={nm.fam} onChange={(v) => setNm((p) => ({ ...p, fam: v }))}
            options={FAMILIES.map((f) => ({ value: f, label: FAM_LABEL[f] || f, title: f === "CUSTOM" ? "ITE, ITC, CIC and IIC" : f === "ALL" ? "One price for every style" : undefined }))} />
          <label className="grid gap-1 text-[13px] font-semibold text-label2">BHSC price (per aid)
            <input inputMode="decimal" value={nm.cost} onChange={(e) => setNm((p) => ({ ...p, cost: e.target.value }))} placeholder="$0.00" className={input} />
          </label>
          {nc && <div className="text-[14px]">Tier <b>{tierFor(nc)}</b> · patients pay <b>{patient(tierFor(nc))}</b> (one aid / two aids)</div>}
          {exists && <p className="text-[13px] text-warn-ink">This model is already in the app — change its price on the left.</p>}
          <Capsule className="h-10 justify-self-start px-4 text-[15px]" disabled={!nm.name.trim() || !nc || exists || !nmfr} onClick={addModel}><Plus className="h-4 w-4" strokeWidth={2.4} />Add model</Capsule>
          <p className="text-[12px] leading-snug text-label3">“Type” decides where it shows when choosing a hearing aid and which billing code the contract uses.</p>
        </section>
      </div>
    </>
  );
}

/* ── Step 3: review & save ── */
function Review({ staged, setStaged, pin, onDropPin, onMore, onSave }) {
  const drop = (key) => setStaged((p) => p.filter((c) => c.key !== key));
  const patch = (key, v) => setStaged((p) => p.map((c) => (c.key === key ? { ...c, ...v } : c)));
  // a new model's style follows its type unless one was typed in
  const setType = (c, fam) => patch(c.key, c.autoStyle ? { fam, style: famStyle(fam), key: modelKey(c.mfr, c.name, famStyle(fam)) } : { fam });
  const prices = staged.filter((c) => c.type === "price"), added = staged.filter((c) => c.type === "new"), missing = staged.filter((c) => c.type === "missing");
  const tierMoves = prices.filter((c) => c.newTier !== c.oldTier).length;
  const removed = missing.filter((c) => c.remove).length;
  const chip = (n, label, cls) => <span className={cn("inline-flex h-9 items-center gap-1 rounded-full bg-card px-3.5 text-[15px] shadow-[0_0_0_1px_var(--sep)]", cls)}><b className="tnum">{n}</b>{label}</span>;
  const head = "whitespace-nowrap px-4 pb-2 pt-3 text-[12px] font-semibold uppercase tracking-[0.03em] text-label2";
  const cell = "border-t border-sep px-4 py-2.5 align-middle";
  const nameCell = (c) => <td className={cell}><b className="text-[15px]">{c.name}</b> <span className="text-[14px] text-label2">· {c.style}</span><div className="text-[12px] text-label3">{c.mfr}{c.older ? " · was on an older list" : ""}</div></td>;
  const empty = !staged.length && !pin, none = !staged.some(counts) && !pin;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {chip(prices.length, prices.length === 1 ? " price change" : " price changes")}
        {chip(tierMoves, tierMoves === 1 ? " tier change" : " tier changes", tierMoves && "text-warn-ink")}
        {chip(added.filter((c) => c.add).length, added.filter((c) => c.add).length === 1 ? " new model" : " new models", "text-tint")}
        {chip(removed, " removed")}
      </div>

      {empty ? <p className={cn(card, "px-4 py-8 text-center text-[15px] text-label2")}>No changes yet. Paste a price list or edit a model first.</p> : (
        <div className={cn(card, "overflow-x-auto")}>
          <table className="w-full min-w-[760px] border-collapse text-left text-[14px]">
            <thead><tr>
              <th className={head}>Model</th><th className={head}>BHSC price</th><th className={head}>Tier</th>
              <th className={cn(head, "text-right")}>Patient price · one aid / two aids</th><th className={head}><span className="sr-only">Action</span></th>
            </tr></thead>
            <tbody>
              {prices.map((c) => {
                const moved = c.newTier !== c.oldTier;
                return (
                  <tr key={c.key}>
                    {nameCell(c)}
                    <td className={cn(cell, "tnum whitespace-nowrap")}><s className="text-label3">{usd(c.oldCost)}</s> <span className="text-label3">→</span> <b className="text-[15px]">{usd(c.newCost)}</b></td>
                    <td className={cell}><span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-semibold", moved ? "bg-warn text-warn-ink" : "bg-fill text-label2")}>{moved ? `Tier ${c.oldTier} → Tier ${c.newTier}` : `Stays Tier ${c.newTier}`}</span></td>
                    <td className={cn(cell, "tnum whitespace-nowrap text-right")}>{moved ? <><s className="text-label3">{patient(c.oldTier)}</s> → <b>{patient(c.newTier)}</b></> : <span className="text-label2">{patient(c.newTier)} (no change)</span>}</td>
                    <td className={cn(cell, "text-right")}><button type="button" onClick={() => drop(c.key)} className="font-semibold text-tint">Undo</button></td>
                  </tr>
                );
              })}
              {added.length > 0 && <tr><td colSpan={5} className={cn(head, "border-t border-sep pt-4")}>New models</td></tr>}
              {added.map((c) => (
                <tr key={c.key} className={cn(!c.add && "opacity-50")}>
                  <td className={cell}><b className="text-[15px]">{c.name}</b> <span className="text-[14px] text-label2">· {c.style}</span>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[12px] text-label3">
                      {MFRS.some(([n]) => n === c.mfr) ? c.mfr : <b className="text-tint">New company: {c.mfr}</b>} · Type
                      <Pills aria={`Type for ${c.name}`} value={c.fam} onChange={(v) => setType(c, v)}
                        options={FAMILIES.map((f) => ({ value: f, label: FAM_LABEL[f] || f }))} className="[&_button]:h-6 [&_button]:px-1.5 [&_button]:text-[12px]" />
                    </div>
                  </td>
                  <td className={cn(cell, "tnum")}><b className="text-[15px]">{usd(c.newCost)}</b></td>
                  <td className={cell}><span className="whitespace-nowrap rounded-full bg-tint-soft px-2.5 py-1 text-[13px] font-semibold text-tint">Tier {c.newTier}</span></td>
                  <td className={cn(cell, "tnum whitespace-nowrap text-right")}>{patient(c.newTier)}</td>
                  <td className={cn(cell, "text-right")}>
                    <label className="inline-flex items-center gap-2 font-semibold text-tint">
                      <input type="checkbox" checked={c.add} onChange={(e) => patch(c.key, { add: e.target.checked })} className="h-4 w-4 accent-[var(--tint)]" />Add
                    </label>
                  </td>
                </tr>
              ))}
              {missing.length > 0 && <tr><td colSpan={5} className={cn(head, "border-t border-sep pt-4")}>Not on the new list <span className="normal-case tracking-normal text-label3">— kept unless you remove them</span></td></tr>}
              {missing.map((c) => (
                <tr key={c.key} className={cn(c.remove && "opacity-60")}>
                  {nameCell(c)}
                  <td className={cn(cell, "tnum")}>{usd(c.oldCost)}</td>
                  <td className={cell}><span className="text-[13px] text-label2">Tier {c.oldTier}</span></td>
                  <td className={cn(cell, "tnum text-right text-label2")}>{patient(c.oldTier)}</td>
                  <td className={cn(cell, "text-right")}>
                    <Pills aria={`Keep or remove ${c.name}`} value={c.remove ? "remove" : "keep"} onChange={(v) => patch(c.key, { remove: v === "remove" })}
                      options={[{ value: "keep", label: "Keep" }, { value: "remove", label: "Remove" }]} className="justify-end [&_[role=radiogroup]]:flex-nowrap [&_button]:h-7 [&_button]:text-[13px]" />
                  </td>
                </tr>
              ))}
              {pin && (
                <tr><td colSpan={4} className={cn(cell, "text-[15px]")}><KeyRound className="mr-2 inline h-4 w-4 text-tint" strokeWidth={2.4} /><b>Admin PIN</b> <span className="text-label2">changes to the new PIN</span></td>
                  <td className={cn(cell, "text-right")}><button type="button" onClick={onDropPin} className="font-semibold text-tint">Undo</button></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className={cn(card, "flex flex-wrap items-center gap-4 p-5")}>
        <div className="min-w-0 flex-1 basis-80 text-[14px] leading-snug text-label2">
          <b className="text-[15px] text-label">Nothing changes until you save.</b><br />
          Saving downloads an updated copy of the app — <b className="text-label">{FILE}</b> — with the new prices. Give it to IT to replace the current file.
        </div>
        <Capsule variant="tinted" onClick={onMore}><Plus className="h-[18px] w-[18px]" strokeWidth={2.4} />More changes</Capsule>
        <Capsule disabled={none} onClick={onSave}><Download className="h-[18px] w-[18px]" strokeWidth={2.4} />Save updated app</Capsule>
      </div>
    </>
  );
}

function Saved({ onDone }) {
  return (
    <div className={cn(card, "mx-auto mt-2 grid w-full max-w-xl gap-3 p-6 text-center")}>
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ok text-ok-ink"><Check className="h-6 w-6" strokeWidth={3} /></span>
      <h2 className="text-[20px] font-semibold">Updated app saved</h2>
      <p className="text-[15px] leading-relaxed text-label2">
        <b className="text-label">{FILE}</b> is in your Downloads folder. Give it to IT to replace the current file, so everyone gets the new prices.
        This window already uses the new prices.
      </p>
      <Capsule variant="tinted" className="justify-self-center" onClick={onDone}>Done</Capsule>
    </div>
  );
}
