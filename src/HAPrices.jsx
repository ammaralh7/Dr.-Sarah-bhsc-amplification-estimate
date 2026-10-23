import { useMemo, useState } from "react";
import { NavBar, ThemeButton, SearchField, Pills } from "@/components/ios";
import { MODELS, MFRS, HAS_COSTS, POLICY } from "@/lib/pricing";

// Every hearing aid on the current lists with its tier and BHSC's net price (the "net price" /
// account price on the manufacturer's price list, per aid). One manufacturer at a time, each model
// once with its styles under it, in two columns on a computer. Searching looks across all four.
const usd = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const famGroup = (f) => (["ITE", "ITC", "CIC", "IIC", "CUSTOM"].includes(f) ? "Custom" : f === "ALL" ? null : f);
// "RIC · rechargeable" → "RIC rechargeable"; several styles read "miniRITE R, miniBTE R"
const styleText = (styles) => styles.map((x) => x.replace(/^All styles · one price per level$/, "All styles").replace(/ · /g, " ")).join(", ");
const byName = (list) => {
  const g = new Map();
  list.forEach((m) => { if (!g.has(m[1])) g.set(m[1], []); g.get(m[1]).push(m); });
  return [...g];
};

export default function HAPrices({ menu = null }) {
  const [q, setQ] = useState("");
  const [mfr, setMfr] = useState(MFRS[0]?.[0] || "");
  const [style, setStyle] = useState("all");
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searching = words.length > 0;
  const current = useMemo(() => MODELS.filter((m) => !m[5]), []);
  const styles = useMemo(() => [...new Set(current.filter((m) => m[0] === mfr).map((m) => famGroup(m[3])).filter(Boolean))], [current, mfr]);
  const st = styles.includes(style) ? style : "all";
  const rows = current.filter((m) => (searching
    ? words.every((w) => `${m[0]} ${m[1]} ${m[2]} tier ${m[4]}`.toLowerCase().includes(w))
    : m[0] === mfr && (st === "all" || famGroup(m[3]) === st)));
  const brands = searching ? MFRS.map(([n]) => n).filter((n) => rows.some((m) => m[0] === n)) : [mfr];

  return (
    <div className="min-h-screen pb-16">
      <NavBar wide compact title={`${POLICY.year} HA prices`} subtitle={HAS_COSTS ? `BHSC's net price for every hearing aid on the ${POLICY.year} lists` : `Every hearing aid on the ${POLICY.year} lists and its tier`} left={menu} right={<ThemeButton />} />
      <main className="mx-auto grid max-w-2xl grid-cols-1 gap-4 px-4 pt-3 lg:max-w-6xl">
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2.5 rounded-[12px] bg-card px-4 py-2.5">
          <div className="w-full sm:w-72"><SearchField value={q} onChange={setQ} placeholder="Search all models" /></div>
          <Pills label="Manufacturer" value={searching ? "" : mfr} onChange={(v) => { setMfr(v); setStyle("all"); setQ(""); }}
            options={MFRS.map(([n]) => ({ value: n, label: n }))} />
          {!searching && styles.length > 1 && (
            <Pills label="Style" value={st} onChange={setStyle}
              options={[{ value: "all", label: "All" }, ...styles.map((s) => ({ value: s, label: s }))]} />
          )}
        </div>

        <p className="-mb-1 px-1 text-[13px] text-label2">
          {HAS_COSTS ? "BHSC net price per aid, from the manufacturer's price list." : "Tiers only: BHSC's net prices are kept out of this copy of the app."}
          {" "}{rows.length} {rows.length === 1 ? "style" : "styles"}{searching ? ` matching “${q.trim()}”` : ""}.
        </p>

        {brands.map((b) => (
          <section key={b} aria-label={b} className="grid min-w-0 grid-cols-1 gap-1.5">
            {searching && <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.03em] text-label2">{b}</h2>}
            <div className="min-w-0 rounded-[12px] bg-card px-4 py-1 lg:columns-2 lg:gap-10">
              {byName(rows.filter((m) => m[0] === b)).map(([name, ms]) => <ModelRow key={name} name={name} ms={ms} />)}
            </div>
          </section>
        ))}
        {!rows.length && <p className="py-10 text-center text-[15px] text-label2">No models match “{q}”.</p>}
      </main>
    </div>
  );
}

/* One model: styles with the same tier and price share a line ("miniRITE R · miniBTE R"); a model
   with one such line is a single row, otherwise its name with a short line per price. */
function ModelRow({ name, ms }) {
  const lines = [];
  ms.forEach((m) => {
    const hit = lines.find((l) => l.tier === m[4] && l.cost === m[7]);
    if (hit) hit.styles.push(m[2]); else lines.push({ tier: m[4], cost: m[7], styles: [m[2]] });
  });
  const tail = (l) => (
    <>
      <span className="w-14 shrink-0 text-right text-[13px] text-label2">Tier {l.tier}</span>
      {HAS_COSTS && <span className="tnum w-[5.5rem] shrink-0 text-right font-semibold">{l.cost != null ? usd(l.cost) : "—"}</span>}
    </>
  );
  if (lines.length === 1) {
    const l = lines[0];
    return (
      <div className="flex min-w-0 break-inside-avoid items-baseline gap-3 border-b border-sep py-1.5 text-[14px]">
        <span className="min-w-0 flex-1 truncate" title={styleText(l.styles)}><span className="text-[15px] font-semibold">{name}</span> <span className="text-label2">· {styleText(l.styles)}</span></span>
        {tail(l)}
      </div>
    );
  }
  return (
    <div className="break-inside-avoid border-b border-sep py-1.5 text-[14px]">
      <div className="text-[15px] font-semibold">{name}</div>
      {lines.map((l) => (
        <div key={l.styles[0]} className="flex min-w-0 items-baseline gap-3 py-px pl-3">
          <span className="min-w-0 flex-1 truncate text-label2" title={styleText(l.styles)}>{styleText(l.styles)}</span>
          {tail(l)}
        </div>
      ))}
    </div>
  );
}
