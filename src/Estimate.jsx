import { useEffect, useState } from "react";
import { Copy, MinusCircle, Plus, RotateCcw, TriangleAlert } from "lucide-react";
import { NavBar, NavButton, ThemeButton, Group, Row, Switch, Sheet, PriceBar, Capsule, SelectRow, FieldRow } from "@/components/ios";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { UndoPill } from "@/components/ui/undo-pill";
import { EarOrder, blankEar } from "@/components/order";
import { cn } from "@/lib/utils";
import {
  MODELS, ADDONS, TIERS, FEES, MFRS, STYLES, money, fits, isCros, styleAvailable, modelsFor, billingCode, quoteLines, quoteTotal, modelKey,
  EAR_NAMES, mixed, earsInUse, earModel, orderReady, orderMfrs, accessoriesFor, accessoryPrice, earPrice, MIXED_CONFIRMED, refund, crosPair,
} from "@/lib/pricing";

// One page: the whole order is dropdowns; the estimate below updates as it is filled in.
const blank = () => ({ n: null, same: true, ears: [blankEar(), blankEar()], incl: "all", molds: 0, addons: [], name: "", caseNo: "", code: "" });

export default function Estimate({ menu = null, seed = null }) {
  const [s, setS] = useState(blank);
  const [toast, setToast] = useState(0);
  const [accOpen, setAccOpen] = useState(false);
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

  const extras = (
    <>
      <Group header="Options">
        <SelectRow label="Included" value={s.incl} onChange={(v) => set({ incl: v })}>
          <option value="all">Everything (fitting + shipping)</option>
          <option value="aid">Aid only</option>
        </SelectRow>
        <SelectRow label="Earmolds" value={s.molds} onChange={(v) => set({ molds: +v })} last>
          <option value="0">None</option>
          <option value="1">One · {money(FEES.molds[1])}</option>
          <option value="2">Two · {money(FEES.molds[2])}</option>
        </SelectRow>
      </Group>

      <Group header="Accessories" footer="Patient price is BHSC cost × 1.2.">
        {s.addons.map((a, j) => (
          <Row key={a.name}>
            <button type="button" aria-label={`Remove ${a.name}`} onClick={() => set({ addons: s.addons.filter((x) => x.name !== a.name) })}
              className="press -ml-1 shrink-0 rounded-full text-[#ff3b30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint">
              <MinusCircle className="h-[22px] w-[22px]" strokeWidth={2} />
            </button>
            <span className="min-w-0 flex-1 truncate text-[17px]">{a.name}</span>
            <span className="tnum shrink-0 text-[17px] text-label2">{money(a.price)}</span>
          </Row>
        ))}
        <Row as="button" type="button" last onClick={() => setAccOpen(true)} className="active:bg-fill">
          <Plus className="h-5 w-5 shrink-0 text-tint" strokeWidth={2.4} />
          <span className="flex-1 text-[17px] text-tint">Add accessory</span>
        </Row>
      </Group>
    </>
  );

  return (
    <div className="min-h-screen pb-36 lg:pb-16">
      <NavBar wide title="Amplification Estimate" shortTitle="Estimate" subtitle="Buffalo Hearing & Speech Center"
        left={<>{menu}<NavButton onClick={reset}><RotateCcw className="h-[18px] w-[18px]" strokeWidth={2.4} />New</NavButton></>}
        right={<ThemeButton />} />

      <main className="mx-auto grid max-w-2xl grid-cols-1 gap-7 px-4 pt-4 lg:max-w-6xl lg:grid-cols-2 lg:items-start lg:gap-x-10">
        {/* Different aids: the Right / Left ear cards sit side by side across the page on a computer. */}
        <div className={cn("grid min-w-0 grid-cols-1 gap-7", twoEars && "lg:col-span-2")}>
        <div className={cn(twoEars && "lg:w-[calc(50%-1.25rem)]")}>
          <Group header="Order">
            <SelectRow label="Hearing aids" value={s.n} onChange={(v) => set({ n: +v, code: "" })} last={s.n !== 2}>
              <option value="1">One aid</option>
              <option value="2">Two aids</option>
            </SelectRow>
            {s.n === 2 && (
              <Row last>
                <span className="flex-1 text-[17px]">Same aid in both ears</span>
                <Switch label="Same aid in both ears" checked={s.same}
                  onChange={(on) => setS((p) => ({ ...p, same: on, code: "", ears: on ? p.ears : [p.ears[0], { ...p.ears[0] }] }))} />
              </Row>
            )}
          </Group>
        </div>
        {twoEars ? (
          <div className="grid grid-cols-1 gap-7 lg:grid-cols-2 lg:gap-10">
            {[0, 1].map((i) => <EarOrder key={i} side={i} title={EAR_NAMES[i]} e={s.ears[i]} k={null} onChange={(patch) => setEar(i, patch)} />)}
          </div>
        ) : (
          <EarOrder title={s.n === 2 ? "Hearing aids · both ears" : "Hearing aid"} e={s.ears[0]} k={k} onChange={(patch) => setEar(0, patch)} />
        )}
        {!twoEars && extras}
       </div>
       {twoEars && <div className="grid min-w-0 grid-cols-1 gap-7">{extras}</div>}
        <section className="grid min-w-0 grid-cols-1 gap-10 border-t border-sep pt-7 lg:border-t-0 lg:pt-0">
          {ready ? (
            <>
              <Receipt s={s} set={set} onCopy={() => setToast((t) => t + 1)} onReset={reset} />
              <Refund s={s} />
            </>
          ) : (
            <p className="rounded-[12px] bg-card px-4 py-6 text-center text-[15px] text-label2">
              {!s.n ? "Choose one aid or two, then the model, to see the estimate." : twoEars ? "Choose a model for each ear to see the estimate." : "Choose the model to see the estimate."}
            </p>
          )}
        </section>
      </main>

      <PriceBar className="lg:hidden" label={names.length ? `${names.join(" + ")} · ${s.n === 2 ? (twoEars ? "two aids" : "pair") : "one aid"}` : "Estimate"}
        amount={ready ? money(quoteTotal(s)) : "—"} />

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
  const notes = [];
  if (crosPair(s)) notes.push("CROS/BiCROS — priced as a one-aid CROS plus a one-aid hearing aid, per the 2026 tier pricing.");
  else if (mixed(s) && !MIXED_CONFIRMED) notes.push("Different aid in each ear — mixed-pair pricing isn’t confirmed yet. Check the total before quoting.");
  if (s.n === 2 && !mixed(s) && ms.some(isCros)) notes.push("A CROS transmitter goes on one ear. For a CROS/BiCROS, turn off “Same aid in both ears” and choose the hearing aid for the other ear.");
  if (ms.some((m) => m[5])) notes.push("Older price list — confirm the cost with the manufacturer before ordering.");
  if (ms.some((m) => m[6])) notes.push("NY SHIP program — SHIP includes free shipping, so check whether the $25 applies.");
  if (ms.some(isCros)) notes.push("CROS/BiCROS — bill with contralateral routing codes when dispensed with a hearing aid on the same date.");
  const what = s.n === 2 ? (mixed(s) ? "Two aids, one per ear" : "Pair") : "One aid";
  const text = [
    "Buffalo Hearing & Speech Center — amplification estimate", `Date: ${date}`,
    s.name ? `Patient: ${s.name}` : null, s.caseNo ? `Case #: ${s.caseNo}` : null, `Billing code: ${code}`, "",
    ...lines.map((l) => `${l.label}${l.sub ? ` (${l.sub})` : ""}: ${money(l.amount)}`),
    `TOTAL: ${money(total)}`, "", "Includes up to 4 follow-up visits in the first year.",
  ].filter((x) => x != null).join("\n");
  const copy = () => { try { navigator.clipboard.writeText(text).then(onCopy, () => setFallback(text)); } catch { setFallback(text); } };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-label2">Estimate</div>
        <div className="tnum mt-1 text-[52px] font-bold leading-none tracking-[-0.035em]">{money(total)}</div>
        <p className="mt-2 text-[15px] text-label2">{what} · {date}</p>
      </div>

      <Group>
        {lines.map((l, j) => (
          <Row key={`${l.label}-${j}`}>
            <span className="min-w-0 flex-1"><span className="block text-[17px]">{l.label}</span>{l.sub && <span className="block truncate text-[13px] text-label2">{l.sub}</span>}</span>
            <span className="tnum shrink-0 text-[17px]">{money(l.amount)}</span>
          </Row>
        ))}
        <Row last>
          <span className="flex-1 text-[17px] font-semibold">Total</span>
          <span className="tnum text-[17px] font-semibold">{money(total)}</span>
        </Row>
      </Group>

      <Group header="Patient (optional, never saved)" footer={`Includes up to 4 follow-up visits in the first year.${ms.some((m) => m[4] >= 7) ? " LACE AI included." : ""}`}>
        <FieldRow label="Name" value={s.name} onChange={(v) => set({ name: v })} placeholder="Optional" />
        <FieldRow label="Case #" value={s.caseNo} onChange={(v) => set({ caseNo: v })} placeholder="Optional" inputMode="numeric" />
        <FieldRow label="Billing code" value={code} onChange={(v) => set({ code: v })} last />
      </Group>

      {notes.map((n) => (
        <div key={n} className="flex gap-2.5 rounded-[12px] bg-warn px-4 py-3 text-[15px] text-warn-ink"><TriangleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0" />{n}</div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Capsule onClick={copy}><Copy className="h-[18px] w-[18px]" strokeWidth={2.4} />Copy estimate</Capsule>
        <Capsule variant="tinted" onClick={onReset}><RotateCcw className="h-[18px] w-[18px]" strokeWidth={2.4} />New patient</Capsule>
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
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div>
        <h2 className="text-[20px] font-semibold leading-tight tracking-[-0.015em]">Refund if returned</h2>
        <p className="mt-1 text-[15px] text-label2">BHSC return policy · private pay & non-Medicaid insurance</p>
      </div>
      {modes.length > 1 && <SegmentedControl label="What is returned" value={cur} onValueChange={setMode} options={modes.map(([value, label]) => ({ value, label }))} />}
      <Group footer={cur === "all"
        ? `Superbill: RETURN and RETSERVFEE (billing enters ${money(r.fee)}). Essential Plan patients pay the ${money(r.fee)} service fee at the front desk at the time of return.`
        : "One side of a pair can be returned with no penalty. Use RETURN on the superbill; no RETSERVFEE."}>
        {r.rows.map((l) => (
          <Row key={l.label}>
            <span className="min-w-0 flex-1"><span className="block text-[17px]">{l.label}</span>{l.sub && <span className="block text-[13px] text-label2">{l.sub}</span>}</span>
            <span className={`tnum shrink-0 text-[17px] ${l.amount < 0 ? "text-label2" : ""}`}>{l.amount < 0 ? `−${money(-l.amount)}` : money(l.amount)}</span>
          </Row>
        ))}
        <Row last>
          <span className="flex-1 text-[17px] font-semibold">Refund to patient</span>
          <span className="tnum text-[17px] font-semibold text-tint">{money(r.refund)}</span>
        </Row>
      </Group>
      <ul className="grid list-disc gap-1.5 pl-5 text-[13px] leading-snug text-label2">
        {r.other > 0 && <li>Shipping, earmolds and accessories ({money(r.other)}) aren’t covered by the return policy. Check with billing.</li>}
        <li>If insurance paid for any codes, billing returns 100% of the insurance payment to the insurance. The refund comes out of what the patient paid.</li>
        <li>Exchanges: no service fee and no 5%. The patient pays only the difference in hearing aid price. A second exchange is treated as a return plus a new sale.</li>
        <li>Not for TruHearing / Start Hearing programs or Medicaid. Billing completes the return worksheet.</li>
      </ul>
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

