/* Manufacturer → style → model for one hearing aid (or one ear), shared by the Estimate and
   Compare prices tabs. k: 0/1 shows the one-aid/pair price on each model, null the per-ear price
   (different aid in each ear). side 0/1 adds the right (red) / left (blue) ear dot to the title.
   stacked: labels above the dropdowns, for narrow columns. */
import { Group, SelectRow } from "@/components/ios";
import { MODELS, TIERS, MFRS, STYLES, money, fits, styleAvailable, modelsFor, modelKey, earModel, earPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const blankEar = () => ({ mfr: null, style: null, model: null, mkey: null });

export function EarOrder({ title, side, e, k, onChange, stacked = false }) {
  const list = e.mfr && e.style ? modelsFor(e.mfr, e.style) : [];
  const cur = list.filter(([m]) => !m[5]), old = list.filter(([m]) => m[5]);
  const dup = new Set(list.map(([m]) => m[1]).filter((n, i, a) => a.indexOf(n) !== i));
  const price = (m) => (k == null ? earPrice(m[4]) : TIERS[m[4]][k]);
  const opt = ([m, i]) => <option key={i} value={i}>{m[1]}{dup.has(m[1]) ? ` (${m[2]})` : ""} · Tier {m[4]} · {money(price(m))}</option>;
  const sel = earModel(e);
  const footer = !sel ? null : stacked
    ? (sel[5] ? "Older price list — confirm the cost with the manufacturer." : null)
    : `${sel[2]} · Tier ${sel[4]} · ${money(price(sel))}${k == null ? " for this ear" : k ? " for the pair" : ""}${sel[5] ? " · older price list, confirm the cost with the manufacturer" : ""}`;
  return (
    <Group header={side == null ? title : <span className="inline-flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-full", side === 0 ? "bg-[#ff3b30]" : "bg-[#0a84ff]")} />{title}</span>}
      footer={footer}>
      <SelectRow stacked={stacked} label="Manufacturer" value={e.mfr}
        onChange={(v) => onChange({ mfr: v, model: null, mkey: null, style: e.style && styleAvailable(v, e.style) ? e.style : null })}>
        {MFRS.map(([name]) => <option key={name} value={name}>{name}</option>)}
      </SelectRow>
      <SelectRow stacked={stacked} label="Style" value={e.style} disabled={!e.mfr}
        onChange={(st) => onChange({ style: st, ...(e.model != null && fits(MODELS[e.model][3], st) ? {} : { model: null, mkey: null }) })}>
        {STYLES.map(([st, long]) => <option key={st} value={st} disabled={!!e.mfr && !styleAvailable(e.mfr, st)}>{st} · {long}</option>)}
      </SelectRow>
      <SelectRow stacked={stacked} label="Model" value={e.model} disabled={!list.length} last placeholder={e.mfr && e.style ? "Choose" : "Pick brand and style"}
        onChange={(v) => { const m = MODELS[+v]; onChange({ model: +v, mkey: modelKey(m[0], m[1], m[2]) }); }}>
        {old.length ? <><optgroup label="Current price lists">{cur.map(opt)}</optgroup><optgroup label="Older price lists">{old.map(opt)}</optgroup></> : cur.map(opt)}
      </SelectRow>
    </Group>
  );
}
