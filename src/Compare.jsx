import { useState } from "react";
import { ArrowRight, Copy, Plus, RotateCcw, X } from "lucide-react";
import { NavBar, NavButton, ThemeButton, Group, Row, Capsule, ChoiceRow } from "@/components/ios";
import { EarOrder, blankEar } from "@/components/order";
import { UndoPill } from "@/components/ui/undo-pill";
import { FEES, money, quoteLines, quoteTotal, earModel } from "@/lib/pricing";
import { cn } from "@/lib/utils";

// Compare up to four hearing aids for one patient, side by side, at patient prices.
const LETTERS = "ABCD";
const COLS = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" };
const blank = () => ({ n: 2, incl: "all", molds: 0, opts: [blankEar(), blankEar()] });

export default function Compare({ menu = null, onUse }) {
  const [c, setC] = useState(blank);
  const [toast, setToast] = useState(0);
  const [fallback, setFallback] = useState("");
  const set = (patch) => setC((p) => ({ ...p, ...patch }));
  const setOpt = (i, patch) => setC((p) => ({ ...p, opts: p.opts.map((e, j) => (j === i ? { ...e, ...patch } : e)) }));
  const order = (e) => ({ n: c.n, same: true, ears: [e, e], incl: c.incl, molds: c.molds, addons: [] });
  const totals = c.opts.map((e) => (earModel(e) ? quoteTotal(order(e)) : null));
  const priced = totals.filter((t) => t != null);
  const low = priced.length ? Math.min(...priced) : null;
  const k = c.n === 2 ? 1 : 0;
  const reset = () => { setC(blank()); setFallback(""); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const text = [
    "Buffalo Hearing & Speech Center — hearing aid price comparison", `Date: ${date}`,
    `${c.n === 2 ? "Two aids" : "One aid"} · ${c.incl === "all" ? "fitting, orientation & dispense and shipping included" : "hearing aid only"}${c.molds ? ` · ${c.molds === 2 ? "two earmolds" : "one earmold"}` : ""}`, "",
    ...c.opts.map((e, i) => {
      const m = earModel(e);
      return m ? `Option ${LETTERS[i]}: ${m[0]} ${m[1]} (${m[2]}) · Tier ${m[4]} — ${money(totals[i])}` : null;
    }).filter(Boolean),
    "", "Includes up to 4 follow-up visits in the first year.",
  ].join("\n");
  const copy = () => { try { navigator.clipboard.writeText(text).then(() => setToast((t) => t + 1), () => setFallback(text)); } catch { setFallback(text); } };

  return (
    <div className="min-h-screen pb-16">
      <NavBar wide title="Compare prices" shortTitle="Compare" subtitle="Side by side for the patient"
        left={<>{menu}<NavButton onClick={reset}><RotateCcw className="h-[18px] w-[18px]" strokeWidth={2.4} />New</NavButton></>}
        right={<ThemeButton />} />

      <main className="mx-auto grid max-w-2xl grid-cols-1 gap-7 px-4 pt-4 lg:max-w-6xl">
        <div className="lg:w-[calc(50%-1.25rem)]">
          <Group header="For this patient" footer="Applies to every option below. Everything adds fitting, orientation & dispense and shipping.">
            <ChoiceRow label="Hearing aids" value={c.n} onChange={(v) => set({ n: +v })}
            options={[{ value: 1, label: "One aid" }, { value: 2, label: "Two aids" }]} />
            <ChoiceRow label="Included" value={c.incl} onChange={(v) => set({ incl: v })}
            options={[{ value: "all", label: "Everything" }, { value: "aid", label: "Aid only" }]} />
            <ChoiceRow label="Earmolds" value={c.molds} onChange={(v) => set({ molds: +v })} last
            options={[{ value: 0, label: "None" }, { value: 1, label: `One · ${money(FEES.molds[1])}` }, { value: 2, label: `Two · ${money(FEES.molds[2])}` }]} />
          </Group>
        </div>

        <div className={cn("grid grid-cols-1 gap-8 sm:grid-cols-2 lg:gap-6", COLS[c.opts.length])}>
          {c.opts.map((e, i) => {
            const m = earModel(e), t = totals[i];
            const lines = m ? quoteLines(order(e)) : [];
            const best = t != null && priced.length > 1 && t === low;
            return (
              <section key={i} aria-label={`Option ${LETTERS[i]}`} className="grid min-w-0 content-start gap-4">
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="inline-flex items-center gap-2 text-[17px] font-semibold">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-tint text-[14px] text-tint-ink">{LETTERS[i]}</span>Option {LETTERS[i]}
                  </span>
                  {c.opts.length > 2 && (
                    <button type="button" aria-label={`Remove option ${LETTERS[i]}`} onClick={() => setC((p) => ({ ...p, opts: p.opts.filter((_, j) => j !== i) }))}
                      className="press grid h-8 w-8 place-items-center rounded-full text-label2 hover:bg-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint">
                      <X className="h-[18px] w-[18px]" strokeWidth={2.2} />
                    </button>
                  )}
                </div>

                <EarOrder compact e={e} k={k} onChange={(patch) => setOpt(i, patch)} />

                {m ? (
                  <div className="grid gap-3">
                    <div className="px-1">
                      <div className="tnum text-[34px] font-bold leading-none tracking-[-0.03em]">{money(t)}</div>
                      <div className={cn("mt-2 inline-flex rounded-full px-2.5 py-1 text-[13px] font-semibold", best ? "bg-tint-soft text-tint" : "bg-fill text-label2")}>
                        {priced.length < 2 ? `Tier ${m[4]}` : best ? "Lowest price" : `+${money(t - low)} more`}
                      </div>
                    </div>
                    <Group>
                      {lines.map((l, j) => (
                        <Row key={`${l.label}-${j}`} last={j === lines.length - 1}>
                          <span className="min-w-0 flex-1 text-[15px] leading-snug">{l.label}</span>
                          <span className="tnum shrink-0 text-[15px]">{money(l.amount)}</span>
                        </Row>
                      ))}
                    </Group>
                    {onUse && (
                      <Capsule variant="tinted" className="h-10 justify-self-start px-4 text-[15px]" onClick={() => onUse({ n: c.n, incl: c.incl, molds: c.molds, ear: e })}>
                        Use in estimate<ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                      </Capsule>
                    )}
                  </div>
                ) : (
                  <p className="rounded-[12px] bg-card px-4 py-6 text-center text-[15px] text-label2">Choose a hearing aid to see its price.</p>
                )}
              </section>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {c.opts.length < 4 && (
            <Capsule variant="tinted" onClick={() => setC((p) => ({ ...p, opts: [...p.opts, blankEar()] }))}>
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} />Add option
            </Capsule>
          )}
          <Capsule onClick={copy} disabled={!priced.length}><Copy className="h-[18px] w-[18px]" strokeWidth={2.4} />Copy comparison</Capsule>
        </div>
        {fallback && (
          <div className="grid grid-cols-1 gap-2">
            <p className="text-[13px] text-label2">Copying isn’t allowed here. Select the text below and copy it.</p>
            <textarea readOnly value={fallback} onFocus={(ev) => ev.target.select()} autoFocus className="h-44 w-full rounded-[12px] bg-card p-3 text-[15px] text-label outline-none" />
          </div>
        )}
        <p className="-mt-3 text-[13px] text-label2">Patient prices from the BHSC 2026 tier pricing. Accessories aren’t included; add them in the estimate.</p>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4">
        <UndoPill open={toast > 0} label="Comparison copied" duration={4} undoLabel="OK" onUndo={() => setToast(0)} onExpire={() => setToast(0)} />
      </div>
    </div>
  );
}
