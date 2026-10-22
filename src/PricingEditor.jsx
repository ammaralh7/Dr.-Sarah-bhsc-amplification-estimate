import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Minus, Plus, TriangleAlert } from "lucide-react";
import { Capsule } from "@/components/ios";
import { POLICY, DEFAULT_POLICY, MODELS, HAS_COSTS, money } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/* Update prices → BHSC prices & fees: the yearly tier sheet (patient price per tier and the BHSC cost
   that puts a hearing aid in each tier), the fees and the return rules, all on one page. Staff type the
   new values; "Use these prices" stages them for the review screen, where nothing is saved until
   "Save updated app". Values are edited as text and checked before they can be used. */
const card = "rounded-[12px] bg-card";
const cell = "h-9 w-full rounded-[8px] bg-fill px-2 text-right text-[15px] tnum text-label outline-none focus:ring-2 focus:ring-tint";
const toForm = (p) => ({
  year: p.year, tiers: p.tiers.map(([a, b]) => [String(a), String(b)]), bands: p.bands.map(String),
  fit: p.fit.map(String), ship: String(p.ship), molds: p.molds.map(String), codes: p.codes.map(String),
  markup: String(p.markup), laceFrom: String(p.laceFrom), visits: String(p.visits),
  returnKeep: String(Math.round(p.returnKeep * 1000) / 10), serviceFee: p.serviceFee.map(String),
});
const n = (v) => { const x = parseFloat(String(v).replace(/[$,%\s]/g, "")); return Number.isFinite(x) ? Math.round(x * 100) / 100 : NaN; };

/** Turn the form into a policy, with the problems that stop it being used. */
function parse(f) {
  const p = {
    year: f.year.trim(), tiers: f.tiers.map(([a, b]) => [n(a), n(b)]), bands: f.bands.map(n),
    fit: f.fit.map(n), ship: n(f.ship), molds: f.molds.map(n), codes: f.codes.map(n),
    markup: n(f.markup), laceFrom: Math.round(n(f.laceFrom)), visits: Math.round(n(f.visits)),
    returnKeep: n(f.returnKeep) / 100, serviceFee: f.serviceFee.map(n),
  };
  const errs = [];
  if (!p.year) errs.push("Enter the year of the tier pricing.");
  if (p.tiers.some(([a, b]) => !(a > 0) || !(b > 0))) errs.push("Every tier needs a one-aid and a two-aid patient price.");
  if (p.bands.some((b) => !(b >= 0))) errs.push("Every tier needs the BHSC cost it starts at.");
  else if (p.bands.some((b, i) => i && b <= p.bands[i - 1])) errs.push("The BHSC cost each tier starts at must go up from tier to tier.");
  if (p.fit.some((x) => !(x > 0))) errs.push("Enter the fitting, orientation & dispense fee for one and two aids.");
  if ([p.ship, ...p.molds, ...p.serviceFee].some((x) => !(x >= 0))) errs.push("Shipping, earmold and service fees can be 0 but not empty.");
  if (p.codes.some((x) => !(x >= 0))) errs.push("Enter the three fitting code charges.");
  else if (p.codes.reduce((a, c) => a + c, 0) > Math.min(...p.fit)) errs.push("The fitting codes add up to more than the fitting fee; the dispense code would be below $0.");
  if (!(p.markup >= 1)) errs.push("The accessory markup must be 1 or more (1.2 = cost + 20%).");
  if (!(p.laceFrom >= 1)) errs.push("Enter the tier LACE AI starts at.");
  if (!(p.visits >= 0)) errs.push("Enter how many follow-up visits are included.");
  if (!(p.returnKeep >= 0 && p.returnKeep < 1)) errs.push("The share BHSC keeps on a return is a percent below 100.");
  return { p, errs };
}

export default function PricingEditor({ start = POLICY, onBack, onUse }) {
  const [f, setF] = useState(() => toForm(start));
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const setArr = (k, i, v) => setF((x) => ({ ...x, [k]: x[k].map((y, j) => (j === i ? v : y)) }));
  const setTier = (i, j, v) => setF((x) => ({ ...x, tiers: x.tiers.map((t, k) => (k === i ? t.map((y, m) => (m === j ? v : y)) : t)) }));
  const { p, errs } = useMemo(() => parse(f), [f]);
  const changed = JSON.stringify(p) !== JSON.stringify({ ...DEFAULT_POLICY, ...start });
  const disp = p.fit.map((x) => Math.round((x - p.codes.reduce((a, c) => a + c, 0)) * 100) / 100);
  const sample = Math.min(6, p.tiers.length);
  const moves = useMemo(() => (errs.length ? 0 : MODELS.filter((m) => m[7] != null && !m[5]).filter((m) => p.bands.reduce((t, lo, i) => (m[7] >= lo ? i + 1 : t), 1) !== m[4]).length), [p, errs]);
  const addTier = () => setF((x) => ({ ...x, tiers: [...x.tiers, ["", ""]], bands: [...x.bands, ""] }));
  const dropTier = () => setF((x) => (x.tiers.length > 1 ? { ...x, tiers: x.tiers.slice(0, -1), bands: x.bands.slice(0, -1) } : x));

  const field = (label, value, onChange, opts = {}) => (
    <label className="flex items-center justify-between gap-3 border-b border-sep py-2 text-[15px] last:border-0">
      <span className="min-w-0">{label}{opts.hint && <span className="block text-[12px] text-label2">{opts.hint}</span>}</span>
      <span className="flex shrink-0 items-center gap-1 text-label2">{opts.pre}<input aria-label={opts.aria || label} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={cn(cell, "w-24")} />{opts.post}</span>
    </label>
  );
  const pair = (label, k, opts = {}) => (
    <div className="flex items-center justify-between gap-3 border-b border-sep py-2 text-[15px] last:border-0">
      <span className="min-w-0">{label}{opts.hint && <span className="block text-[12px] text-label2">{opts.hint}</span>}</span>
      <span className="flex shrink-0 items-center gap-2 text-[12px] text-label2">
        {["One aid", "Two aids"].map((t, i) => (
          <label key={t} className="grid gap-0.5 text-center">{t}
            <span className="flex items-center gap-1">$<input aria-label={`${label} · ${t.toLowerCase()}`} inputMode="decimal" value={f[k][i]} onChange={(e) => setArr(k, i, e.target.value)} className={cn(cell, "w-20")} /></span>
          </label>
        ))}
      </span>
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[15px] font-semibold text-tint"><ArrowLeft className="h-4 w-4" strokeWidth={2.4} />Back</button>
        <span className="text-[13px] text-label2">Change only what BHSC changed; everything else stays as it is.</span>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section aria-label="Tier pricing" className={cn(card, "grid content-start gap-3 p-5")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[18px] font-semibold">Tier pricing</h2>
            <label className="flex items-center gap-2 text-[14px] text-label2">Year
              <input aria-label="Year" value={f.year} onChange={(e) => set({ year: e.target.value })} className={cn(cell, "w-20 text-center")} />
            </label>
          </div>
          <table className="w-full border-collapse text-[14px]">
            <thead><tr className="text-left text-[12px] font-semibold uppercase tracking-[0.03em] text-label2">
              <th className="pb-1.5 pr-2">Tier</th><th className="pb-1.5 pr-2">BHSC cost from</th><th className="pb-1.5 pr-2">Patient · one aid</th><th className="pb-1.5">Two aids</th>
            </tr></thead>
            <tbody>
              {f.tiers.map((t, i) => (
                <tr key={i} className="border-t border-sep">
                  <td className="whitespace-nowrap py-1.5 pr-2 font-semibold">{i + 1}{i + 1 >= p.laceFrom && <span className="ml-1.5 whitespace-nowrap rounded-full bg-tint-soft px-1.5 py-0.5 text-[11px] text-tint">LACE AI</span>}</td>
                  <td className="py-1.5 pr-2"><span className="flex items-center gap-1 text-label2">$<input aria-label={`Tier ${i + 1} · BHSC cost from`} inputMode="decimal" value={f.bands[i]} onChange={(e) => setArr("bands", i, e.target.value)} className={cell} /></span></td>
                  <td className="py-1.5 pr-2"><span className="flex items-center gap-1 text-label2">$<input aria-label={`Tier ${i + 1} · one aid`} inputMode="decimal" value={t[0]} onChange={(e) => setTier(i, 0, e.target.value)} className={cell} /></span></td>
                  <td className="py-1.5"><span className="flex items-center gap-1 text-label2">$<input aria-label={`Tier ${i + 1} · two aids`} inputMode="decimal" value={t[1]} onChange={(e) => setTier(i, 1, e.target.value)} className={cell} /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-2">
            <Capsule variant="tinted" className="h-9 px-3 text-[14px]" onClick={addTier}><Plus className="h-4 w-4" strokeWidth={2.4} />Add a tier</Capsule>
            <Capsule variant="plain" className="h-9 px-3 text-[14px]" disabled={f.tiers.length <= 1} onClick={dropTier}><Minus className="h-4 w-4" strokeWidth={2.4} />Remove the last tier</Capsule>
          </div>
          <p className="text-[12px] leading-snug text-label2">A hearing aid’s tier comes from BHSC’s cost for it (the net/invoice price per aid): the highest tier whose “BHSC cost from” it reaches. Anything below tier 1’s goes in tier 1.</p>
        </section>

        <div className="grid content-start gap-4">
          <section aria-label="Fees" className={cn(card, "px-5 py-3")}>
            <h2 className="pb-1 text-[18px] font-semibold">Fees</h2>
            {pair("Fitting, orientation & dispense", "fit")}
            {field("Shipping & handling", f.ship, (v) => set({ ship: v }), { pre: "$" })}
            {pair("Earmolds", "molds", { hint: "One earmold / two earmolds" })}
            {field("Accessory price", f.markup, (v) => set({ markup: v }), { pre: "BHSC cost ×", hint: "1.2 = cost + 20%" })}
          </section>
          <section aria-label="Included" className={cn(card, "px-5 py-3")}>
            <h2 className="pb-1 text-[18px] font-semibold">Included with every hearing aid</h2>
            {field("Follow-up visits in the first year", f.visits, (v) => set({ visits: v }), { aria: "Follow-up visits" })}
            {field("LACE AI program from tier", f.laceFrom, (v) => set({ laceFrom: v }), { aria: "LACE AI from tier" })}
          </section>
          <section aria-label="Fitting codes and returns" className={cn(card, "px-5 py-3")}>
            <h2 className="pb-1 text-[18px] font-semibold">Fitting codes & returns</h2>
            {field("V5020 Conformity evaluation", f.codes[0], (v) => setArr("codes", 0, v), { pre: "$" })}
            {field("V5011 Fitting, orientation & checking", f.codes[1], (v) => setArr("codes", 1, v), { pre: "$" })}
            {field("92594 Electroacoustic evaluation", f.codes[2], (v) => setArr("codes", 2, v), { pre: "$" })}
            <div className="flex justify-between border-b border-sep py-2 text-[15px] text-label2"><span>Dispense code (the rest of the fitting fee)</span><span className="tnum">{disp.every((d) => d >= 0) ? `${money(disp[0])} / ${money(disp[1])}` : "—"}</span></div>
            {field("On a return, BHSC keeps", f.returnKeep, (v) => set({ returnKeep: v }), { post: "%", hint: "of the hearing aid and fitting charges" })}
            {pair("Return service fee", "serviceFee")}
          </section>
        </div>
      </div>

      <div className={cn(card, "flex flex-wrap items-center gap-4 p-5")}>
        <div className="min-w-0 flex-1 basis-80 text-[14px] leading-snug text-label2">
          {errs.length ? (
            <ul className="grid gap-1 text-warn-ink">{errs.map((e) => <li key={e} className="flex gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{e}</li>)}</ul>
          ) : (
            <>
              <b className="text-[15px] text-label">Example: a tier {sample} pair with fitting & shipping is {money(p.tiers[sample - 1][1] + p.fit[1] + p.ship)}.</b><br />
              {HAS_COSTS ? (moves ? `${moves} hearing aids move to a different tier with these cost bands.` : "No hearing aid changes tier.")
                : "This copy has no BHSC prices built in, so hearing aids keep their tiers; patient prices follow the new tier table."}
            </>
          )}
        </div>
        <Capsule disabled={!!errs.length || !changed} onClick={() => onUse(p)}>Use these prices<ArrowRight className="h-4 w-4" strokeWidth={2.4} /></Capsule>
      </div>
    </>
  );
}
