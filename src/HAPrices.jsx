import { useMemo, useState } from "react";
import { NavBar, ThemeButton, Group, Row, Switch, SearchField } from "@/components/ios";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MODELS, TIERS, FEES, MFRS, HAS_COSTS, money } from "@/lib/pricing";

// Every hearing aid on the 2026 lists: BHSC cost, tier, and the patient price for one aid and for two.
export default function HAPrices({ menu = null }) {
  const [q, setQ] = useState("");
  const [mfr, setMfr] = useState("All");
  const [costOn, setShowCost] = useState(true);
  const showCost = HAS_COSTS && costOn;
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const groups = useMemo(() => MFRS.map(([name]) => name).filter((name) => mfr === "All" || mfr === name).map((name) => [
    name,
    MODELS.filter((m) => m[0] === name && !m[5] && words.every((w) => `${m[1]} ${m[2]} tier ${m[4]}`.toLowerCase().includes(w))),
  ]).filter(([, rows]) => rows.length), [mfr, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = groups.reduce((a, [, r]) => a + r.length, 0);

  return (
    <div className="min-h-screen pb-16">
      <NavBar wide="lg:max-w-4xl" title="2026 HA prices" subtitle="Every hearing aid, its tier and price" left={menu} right={<ThemeButton />} />
      <main className="mx-auto grid max-w-2xl grid-cols-1 gap-7 px-4 pt-4 lg:max-w-4xl">
        <div className="grid gap-3">
          <SearchField value={q} onChange={setQ} placeholder="Search models, styles or “tier 5”" />
          <SegmentedControl label="Manufacturer" value={mfr} onValueChange={setMfr}
            options={["All", ...MFRS.map(([n]) => n)].map((n) => ({ value: n, label: n }))} />
          {HAS_COSTS && (
            <Group>
              <Row last>
                <span className="flex-1 text-[17px]">Show BHSC cost</span>
                <Switch label="Show BHSC cost" checked={costOn} onChange={setShowCost} />
              </Row>
            </Group>
          )}
        </div>

        <TierTable />

        {groups.map(([name, rows]) => (
          <Group key={name} header={`${name} · ${rows.length} model${rows.length === 1 ? "" : "s"}`}>
            <div className="hairline hidden grid-cols-[1fr_auto] gap-3 bg-card px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.02em] text-label2 sm:grid">
              <span>Model</span>
              <span className={`grid ${showCost ? "grid-cols-3" : "grid-cols-2"} gap-3 text-right [&>*]:w-[4.75rem]`}>
                {showCost && <span>BHSC cost</span>}<span>One aid</span><span>Two aids</span>
              </span>
            </div>
            {rows.map((m, j) => (
              <Row key={`${m[1]}-${m[2]}-${j}`} last={j === rows.length - 1}>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] leading-snug">{m[1]}</span>
                    <span className="block text-[13px] text-label2">{m[2]} · Tier {m[4]}</span>
                  </span>
                  <span className={`tnum grid shrink-0 ${showCost ? "grid-cols-3" : "grid-cols-2"} gap-3 text-[15px] sm:text-right sm:[&>*]:w-[4.75rem]`}>
                    {showCost && <Price label="BHSC cost" muted>{m[7] ? money(m[7]) : "—"}</Price>}
                    <Price label="One aid">{money(TIERS[m[4]][0])}</Price>
                    <Price label="Two aids">{money(TIERS[m[4]][1])}</Price>
                  </span>
                </div>
              </Row>
            ))}
          </Group>
        ))}
        {!count && <p className="py-10 text-center text-[15px] text-label2">No models match “{q}”.</p>}
      </main>
    </div>
  );
}

const Price = ({ label, muted, children }) => (
  <span className={muted ? "text-label2" : ""}><span className="block text-[11px] text-label2 sm:hidden">{label}</span>{children}</span>
);

/* BHSC 2026 tier prices and fees, for reference. */
function TierTable() {
  return (
    <Group header="2026 tier prices" footer={`Fitting, orientation & dispense ${money(FEES.fit[0])} one aid / ${money(FEES.fit[1])} two · Shipping ${money(FEES.ship)} · Earmolds ${money(FEES.molds[1])} one / ${money(FEES.molds[2])} two`}>
      <div className="hairline grid grid-cols-3 bg-card px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.02em] text-label2">
        <span>Tier</span><span className="text-right">One aid</span><span className="text-right">Two aids</span>
      </div>
      {Object.entries(TIERS).map(([t, [one, two]], j, a) => (
        <div key={t} className={`tnum grid grid-cols-3 bg-card px-4 py-2 text-[15px] ${j < a.length - 1 ? "hairline" : ""}`}>
          <span>Tier {t}</span><span className="text-right">{money(one)}</span><span className="text-right">{money(two)}</span>
        </div>
      ))}
    </Group>
  );
}
