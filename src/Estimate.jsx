import { useEffect, useRef, useState } from "react";
import { Copy, Plus, RotateCcw, TriangleAlert, X } from "lucide-react";
import { NavBar, NavButton, ThemeButton, Group, Row, Switch, Sheet, PriceBar, Capsule, Pills, FieldRow } from "@/components/ios";
import { UndoPill } from "@/components/ui/undo-pill";
import { EarOrder, blankEar } from "@/components/order";
import { cn } from "@/lib/utils";
import {
  MODELS, ADDONS, TIERS, FEES, MFRS, STYLES, money, fits, isCros, styleAvailable, modelsFor, billingCode, quoteLines, quoteTotal, modelKey,
  EAR_NAMES, mixed, earsInUse, earModel, orderReady, orderMfrs, accessoriesFor, accessoryPrice, earPrice, MIXED_CONFIRMED, refund, crosPair,
} from "@/lib/pricing";

// One page, laid out for a computer: the order at the top, the estimate and refund under it, updating as it is filled in.
const blank = () => ({ n: null, same: true, ears: [blankEar(), blankEar()], incl: "all", molds: 0, addons: [], notes: "", caseNo: "", code: "" });

export default function Estimate({ menu = null, seed = null }) {
  const [s, setS] = useState(blank);
  const [toast, setToast] = useState(0);
  const [accOpen, setAccOpen] = useState(false);
  const estimateRef = useRef(null);
  const set = (patch) => setS((p) => ({ ...p, ...patch }));
  const setEar = (i, patch) => setS((p) => ({ ...p, code: "", ears: p.ears.map((e, j) => (j === i ? { ...e, ...patch } : e)) }));

  // "Use in estimate" from Compare prices: start a new estimate with that hearing aid.
  useEffect(() => {
    if (!seed) return;
    setS({ ...blank(), n: seed.n, incl: seed.incl, molds: seed.molds, ears: [{ ...seed.ear }, { ...seed.ear }] });
    window.scrollTo(0, 0);
  }, [seed]);

  const reset = () => { setS(blank()); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const ready = orderReady(s);
  const k = s.n === 2 ? 1 : 0;
  const names = earsInUse(s).map(earModel).filter(Boolean).map((m) => m[1]);
  const twoEars = mixed(s);
  const accList = accessoriesFor(s);

  return (
    <div className="min-h-screen pb-36 lg:pb-10">
      <NavBar wide compact title="Amplification Estimate" shortTitle="Estimate" subtitle="Buffalo Hearing & Speech Center"
        left={<>{menu}<NavButton onClick={reset}><RotateCcw className="h-[18px] w-[18px]" strokeWidth={2.4} />New</NavButton></>}
        right={<ThemeButton />} />

      {/* Compact, top to bottom at full width: one bar for the order options, the hearing aid(s)
          (Right | Left ear side by side when they differ), accessories, then the estimate and refund. */}
      <main className="mx-auto grid max-w-2xl grid-cols-1 gap-4 px-4 pt-3 lg:max-w-6xl">
        <div role="group" aria-label="Order" className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2.5 rounded-[12px] bg-card px-4 py-2.5">
          <Pills label="Hearing aids" value={s.n} onChange={(v) => set({ n: +v, code: "" })}
            options={[{ value: 1, label: "One aid" }, { value: 2, label: "Two aids" }]} />
          {s.n === 2 && (
            <label className="flex cursor-pointer items-center gap-2.5 text-[15px]">
              <Switch label="Same aid in both ears" checked={s.same}
                onChange={(on) => setS((p) => ({ ...p, same: on, code: "", ears: on ? p.ears : [p.ears[0], { ...p.ears[0] }] }))} />
              Same aid in both ears
            </label>
          )}
          <Pills label="Included" value={s.incl} onChange={(v) => set({ incl: v })}
            options={[{ value: "all", label: "Everything", title: "Hearing aid + fitting, orientation & dispense + shipping" }, { value: "aid", label: "Aid only" }]} />
          <Pills label="Earmolds" value={s.molds} onChange={(v) => set({ molds: +v })}
            options={[{ value: 0, label: "None" }, { value: 1, label: `One · ${money(FEES.molds[1])}` }, { value: 2, label: `Two · ${money(FEES.molds[2])}` }]} />
        </div>

        {twoEars ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            {[0, 1].map((i) => <EarOrder key={i} side={i} title={EAR_NAMES[i]} e={s.ears[i]} k={null} onChange={(patch) => setEar(i, patch)} />)}
          </div>
        ) : (
          <EarOrder wide title={s.n === 2 ? "Hearing aids · both ears" : "Hearing aid"} e={s.ears[0]} k={k} onChange={(patch) => setEar(0, patch)} />
        )}

        <div role="group" aria-label="Accessories" className="flex min-w-0 flex-wrap items-center gap-2 rounded-[12px] bg-card px-4 py-2">
          <span className="mr-1 shrink-0 text-[12px] font-semibold uppercase tracking-[0.03em] text-label2">Accessories</span>
          {s.addons.map((a) => (
            <span key={a.name} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-fill pl-3 pr-1 text-[14px]">
              {a.name}<span className="tnum text-label2">{money(a.price)}</span>
              <button type="button" aria-label={`Remove ${a.name}`} onClick={() => set({ addons: s.addons.filter((x) => x.name !== a.name) })}
                className="press grid h-6 w-6 place-items-center rounded-full text-label2 hover:bg-fill2 hover:text-label focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint">
                <X className="h-3.5 w-3.5" strokeWidth={2.6} />
              </button>
            </span>
          ))}
          <button type="button" onClick={() => setAccOpen(true)}
            className="press inline-flex h-8 items-center gap-1 rounded-full px-2 text-[14px] font-semibold text-tint hover:bg-tint-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint">
            <Plus className="h-4 w-4" strokeWidth={2.6} />Add accessory
          </button>
          <span className="ml-auto text-[12px] text-label2">Patient prices</span>
        </div>

        <section ref={estimateRef} aria-label="Estimate and refund"
          className="grid min-w-0 scroll-mt-[calc(3.5rem+env(safe-area-inset-top,0px))] grid-cols-1 gap-8 border-t border-sep pt-4 lg:grid-cols-2 lg:items-start lg:gap-6">
          {ready ? (
            <>
              <Receipt s={s} set={set} onCopy={() => setToast((t) => t + 1)} onReset={reset} />
              <Refund s={s} />
            </>
          ) : (
            <p className="rounded-[12px] bg-card px-4 py-4 text-center text-[15px] text-label2 lg:col-span-2">
              {!s.n ? "Choose one aid or two, then the hearing aid, to see the estimate and refund." : twoEars ? "Choose a hearing aid for each ear to see the estimate and refund." : "Choose the hearing aid to see the estimate and refund."}
            </p>
          )}
        </section>
      </main>

      {/* Phones only: on a computer the estimate total is already on screen */}
      <PriceBar wide className="lg:hidden" label={names.length ? `${names.join(" + ")} · ${s.n === 2 ? (twoEars ? "two aids" : "pair") : "one aid"}` : "Estimate"}
        amount={ready ? money(quoteTotal(s)) : "—"}
        action={ready ? <Capsule onClick={() => estimateRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>Review</Capsule> : null} />

      <AccessorySheet open={accOpen} onClose={() => setAccOpen(false)} s={s} set={set} list={accList} mfrs={orderMfrs(s)} />
      {/* Copy confirmation: Undo Pill (21st.dev #29941, components/ui/undo-pill.tsx); OK closes it early */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4 lg:bottom-8">
        <UndoPill open={toast > 0} label="Estimate copied" duration={4} undoLabel="OK" onUndo={() => setToast(0)} onExpire={() => setToast(0)} />
      </div>
    </div>
  );
}

function Receipt({ s, set, onCopy, onReset }) {
  const ms = earsInUse(s).map(earModel);
  const lines = quoteLines(s);
  const total = quoteTotal(s);
  const code = s.code || billingCode(s);
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const [fallback, setFallback] = useState("");
  const warnings = [];
  if (crosPair(s)) warnings.push("CROS/BiCROS — priced as a one-aid CROS plus a one-aid hearing aid, per the 2026 tier pricing.");
  else if (mixed(s) && !MIXED_CONFIRMED) warnings.push("Different aid in each ear — mixed-pair pricing isn’t confirmed yet. Check the total before quoting.");
  if (s.n === 2 && !mixed(s) && ms.some(isCros)) warnings.push("A CROS transmitter goes on one ear. For a CROS/BiCROS, turn off “Same aid in both ears” and choose the hearing aid for the other ear.");
  if (ms.some((m) => m[5])) warnings.push("Older price list — confirm the cost with the manufacturer before ordering.");
  if (ms.some((m) => m[6])) warnings.push("NY SHIP program — SHIP includes free shipping, so check whether the $25 applies.");
  if (ms.some(isCros)) warnings.push("CROS/BiCROS — bill with contralateral routing codes when dispensed with a hearing aid on the same date.");
  const what = s.n === 2 ? (mixed(s) ? "Two aids, one per ear" : "Pair") : "One aid";
  const text = [
    "Buffalo Hearing & Speech Center — amplification estimate", `Date: ${date}`,
    s.caseNo ? `Case #: ${s.caseNo}` : null, `Billing code: ${code}`, s.notes.trim() ? `Notes: ${s.notes.trim()}` : null, "",
    ...lines.map((l) => `${l.label}${l.sub ? ` (${l.sub})` : ""}: ${money(l.amount)}`),
    `TOTAL: ${money(total)}`, "", "Includes up to 4 follow-up visits in the first year.",
  ].filter((x) => x != null).join("\n");
  const copy = () => { try { navigator.clipboard.writeText(text).then(onCopy, () => setFallback(text)); } catch { setFallback(text); } };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3">
      <div className="flex min-w-0 items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-label2">Estimate</div>
          <div className="tnum text-[36px] font-bold leading-none tracking-[-0.03em]">{money(total)}</div>
        </div>
        <p className="shrink-0 pb-1 text-[13px] text-label2">{what} · {date}</p>
      </div>

      <Group>
        {lines.map((l, j) => (
          <Row dense key={`${l.label}-${j}`}>
            <span className="min-w-0 flex-1 truncate text-[15px]">{l.label}{l.sub && <span className="text-[13px] text-label2"> · {l.sub}</span>}</span>
            <span className="tnum shrink-0 text-[15px]">{money(l.amount)}</span>
          </Row>
        ))}
        <Row dense last>
          <span className="flex-1 text-[15px] font-semibold">Total</span>
          <span className="tnum text-[15px] font-semibold">{money(total)}</span>
        </Row>
      </Group>

      <Group header="Notes & billing (never saved)" footer="Includes up to 4 follow-up visits in the first year.">
        <div className="bg-card pl-4">
          <div className="hairline grid min-h-[36px] grid-cols-2 items-center gap-4 py-1 pr-4">
            <label className="flex min-w-0 items-center gap-3 text-[15px]"><span className="shrink-0">Case #</span>
              <input value={s.caseNo} onChange={(e) => set({ caseNo: e.target.value })} placeholder="Optional" inputMode="numeric" autoComplete="off" aria-label="Case #"
                className="w-0 min-w-0 flex-1 bg-transparent text-right text-[15px] text-label outline-none placeholder:text-label3" /></label>
            <label className="flex min-w-0 items-center gap-3 text-[15px]"><span className="shrink-0">Billing code</span>
              <input value={code} onChange={(e) => set({ code: e.target.value })} autoComplete="off" aria-label="Billing code"
                className="w-0 min-w-0 flex-1 bg-transparent text-right text-[15px] text-label outline-none placeholder:text-label3" /></label>
          </div>
        </div>
        <div className="bg-card pl-4">
          <div className="flex min-w-0 items-start gap-3 py-2 pr-4">
            <label htmlFor="estimate-notes" className="shrink-0 text-[15px] leading-snug">Notes</label>
            <textarea id="estimate-notes" value={s.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Optional" rows={2}
              className="min-h-[2.75rem] w-0 min-w-0 flex-1 resize-y bg-transparent text-[15px] leading-snug text-label outline-none [field-sizing:content] placeholder:text-label3" />
          </div>
        </div>
      </Group>

      {warnings.map((n) => (
        <div key={n} className="flex gap-2 rounded-[10px] bg-warn px-3 py-2 text-[14px] leading-snug text-warn-ink"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{n}</div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Capsule className="h-10 px-4 text-[15px]" onClick={copy}><Copy className="h-4 w-4" strokeWidth={2.4} />Copy estimate</Capsule>
        <Capsule className="h-10 px-4 text-[15px]" variant="tinted" onClick={onReset}><RotateCcw className="h-4 w-4" strokeWidth={2.4} />New patient</Capsule>
      </div>
      {fallback && (
        <div className="grid gap-2">
          <p className="text-[13px] text-label2">Copying isn’t allowed here. Select the text below and copy it.</p>
          <textarea readOnly value={fallback} onFocus={(e) => e.target.select()} autoFocus className="h-44 w-full rounded-[12px] bg-card p-3 text-[15px] text-label outline-none" />
        </div>
      )}
    </div>
  );
}

/* Refund if the patient returns the aids — BHSC return policy (private pay & non-Medicaid insurance). */
function Refund({ s }) {
  const modes = s.n !== 2 ? [["all", "Return the aid"]]
    : mixed(s) ? [["all", "Return both"], ["right", "Return right"], ["left", "Return left"]]
    : [["all", "Return both"], ["one", "Return one side"]];
  const [mode, setMode] = useState("all");
  const cur = modes.some(([v]) => v === mode) ? mode : "all";
  const r = refund(s, cur);
  if (!r) return null;
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold leading-tight">Refund if returned</h2>
          <p className="text-[13px] text-label2">BHSC return policy · private pay & non-Medicaid insurance</p>
        </div>
        {modes.length > 1 && <Pills aria="What is returned" value={cur} onChange={setMode} options={modes.map(([value, label]) => ({ value, label }))} />}
      </div>
      <Group footer={cur === "all"
        ? `Superbill: RETURN and RETSERVFEE (billing enters ${money(r.fee)}). Essential Plan patients pay the ${money(r.fee)} service fee at the front desk at the time of return.`
        : "One side of a pair can be returned with no penalty. Use RETURN on the superbill; no RETSERVFEE."}>
        {r.rows.map((l) => (
          <Row dense key={l.label}>
            <span className="min-w-0 flex-1 text-[15px]">{l.label}{l.sub && <span className="block text-[12px] text-label2">{l.sub}</span>}</span>
            <span className={`tnum shrink-0 text-[15px] ${l.amount < 0 ? "text-label2" : ""}`}>{l.amount < 0 ? `−${money(-l.amount)}` : money(l.amount)}</span>
          </Row>
        ))}
        <Row dense last>
          <span className="flex-1 text-[15px] font-semibold">Refund to patient</span>
          <span className="tnum text-[15px] font-semibold text-tint">{money(r.refund)}</span>
        </Row>
      </Group>
      <details className="group text-[12px] leading-snug text-label2">
        <summary className="cursor-pointer select-none px-4 font-semibold text-tint marker:content-none">
          <span className="group-open:hidden">More about returns{r.other > 0 ? " (shipping, earmolds, accessories, insurance)" : " (insurance, exchanges)"}</span>
          <span className="hidden group-open:inline">Hide</span>
        </summary>
      <ul className="mt-1.5 grid list-disc gap-1 pl-5">
        {r.other > 0 && <li>Shipping, earmolds and accessories ({money(r.other)}) aren’t covered by the return policy. Check with billing.</li>}
        <li>If insurance paid for any codes, billing returns 100% of the insurance payment to the insurance. The refund comes out of what the patient paid.</li>
        <li>Exchanges: no service fee and no 5%. The patient pays only the difference in hearing aid price. A second exchange is treated as a return plus a new sale.</li>
        <li>Not for TruHearing / Start Hearing programs or Medicaid. Billing completes the return worksheet.</li>
      </ul>
      </details>
    </div>
  );
}

/* Accessories: the manufacturer's list (switches) plus any other accessory typed in with its BHSC cost. */
function AccessorySheet({ open, onClose, s, set, list, mfrs }) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const has = (nm) => s.addons.some((a) => a.name === nm);
  const toggle = (nm, p, on) => set({ addons: on ? [...s.addons, { name: nm, price: p }] : s.addons.filter((a) => a.name !== nm) });
  const c = parseFloat(String(cost).replace(/[$,\s]/g, ""));
  const ok = name.trim() && c > 0 && !has(name.trim());
  const add = () => {
    if (!ok) return;
    set({ addons: [...s.addons, { name: name.trim(), cost: c, price: accessoryPrice(c), custom: true }] });
    setName(""); setCost("");
  };
  const sum = s.addons.reduce((a, x) => a + x.price, 0);
  return (
    <Sheet open={open} onClose={onClose} title="Accessories">
      <div className="grid grid-cols-1 gap-6 pb-2">
        {mfrs.map((mfr) => {
          const items = ADDONS[mfr] || [];
          return items.length ? (
            <Group key={mfr} header={`${mfr} accessories`}>
              {items.map(([nm, p], j) => (
                <Row key={nm} last={j === items.length - 1}>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[17px]">{nm}</span><span className="tnum block text-[13px] text-label2">{money(p)}</span></span>
                  <Switch checked={has(nm)} onChange={(on) => toggle(nm, p, on)} label={nm} />
                </Row>
              ))}
            </Group>
          ) : null;
        })}
        {!list.length && (
          <p className="px-4 text-[15px] text-label2">{mfrs.length ? `No accessory list for ${mfrs.join(" or ")} yet.` : "Choose a manufacturer to see its accessories."} Add one below with its BHSC cost.</p>
        )}

        <Group header="Other accessory" footer={c > 0 ? `Patient price ${money(accessoryPrice(c))} (cost ${money(c)} × 1.2)` : "Enter BHSC’s cost; the patient price is cost × 1.2."}>
          <FieldRow label="Name" value={name} onChange={setName} placeholder="e.g. TV Streamer" />
          <FieldRow label="BHSC cost" value={cost} onChange={setCost} placeholder="$0.00" inputMode="decimal" last
            onKeyDown={(e) => e.key === "Enter" && add()} />
        </Group>
        <Capsule onClick={add} disabled={!ok} className="justify-self-start"><Plus className="h-[18px] w-[18px]" strokeWidth={2.4} />Add accessory</Capsule>

        {s.addons.length > 0 && <p className="px-4 text-[13px] text-label2">{s.addons.length} added · {money(sum)}. Close this sheet when you’re done.</p>}
      </div>
    </Sheet>
  );
}

