import { useEffect, useRef, useState } from "react";
import { FileUp, Plus, Undo2, TriangleAlert } from "lucide-react";
import { Section, Group, Row, Switch, Capsule, Tile } from "@/components/ios";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import { MODELS, TIERS, FAMILIES, MFRS, money, tierFor, modelKey } from "@/lib/pricing";
import { readPriceList, chunks } from "@/lib/docread";

const FAM_LABEL = { RIC: "RIC", BTE: "BTE", ITE: "ITE", ITC: "ITC", CIC: "CIC", IIC: "IIC", CUSTOM: "Custom", ALL: "All styles" };

function instructions(names) {
  return `You are reading a hearing aid manufacturer's price list for Buffalo Hearing & Speech Center (BHSC).
Extract every HEARING AID row (CROS/BiCROS transmitters count as hearing aids).
Skip accessories, chargers, remotes, streamers, Roger/TV devices, earmolds, domes, receivers, tubes, shells, parts, repairs, warranties and binaural bundle rows.

For each hearing aid give:
- "mfr": the manufacturer (ReSound, Phonak, Oticon, Starkey, or the brand name printed on the list)
- "model": the product name as printed, including its technology level (e.g. "Audeo I90-R", "Intent 1", "Omega AI 24", "Vivia 9")
- "style": the style/form factor as printed, short (e.g. "miniRITE R", "RIC.312", "BTE", "All styles")
- "fam": exactly one of RIC, BTE, ITE, ITC, CIC, IIC, CUSTOM, ALL. miniRITE/RIC/mRIC → RIC; miniBTE/BTE/Power Plus → BTE; ITE/half shell/HS → ITE; custom products sold in any custom style (e.g. Oticon Own, Phonak Virto) → CUSTOM; one price for every style → ALL
- "cost": BHSC's own cost per unit in US dollars as a number — the NET / invoice / account / dealer price BHSC pays. NEVER the MSRP, list or retail price.

Use these existing model names when the same product appears, so rows match: ${names}

Reply with only a JSON array, e.g. [{"mfr":"Phonak","model":"Audeo I90-R","style":"RIC","fam":"RIC","cost":1000.00}]. Reply [] if the document has no hearing aid prices.`;
}

function compare(r) {
  const cost = Math.round(Number(r.cost) * 100) / 100;
  const tier = tierFor(cost);
  const key = modelKey(r.mfr, r.model, r.style);
  let idx = MODELS.findIndex((m) => modelKey(m[0], m[1], m[2]) === key);
  if (idx < 0) idx = MODELS.findIndex((m) => m[0].toLowerCase() === String(r.mfr).toLowerCase() && m[1].toLowerCase() === String(r.model).toLowerCase() && m[3] === r.fam);
  const old = idx >= 0 ? MODELS[idx] : null;
  return { mfr: String(r.mfr), model: String(r.model), style: old ? old[2] : String(r.style || FAM_LABEL[r.fam]), fam: r.fam, cost, tier,
    status: !old ? "new" : old[4] !== tier ? "changed" : "same", oldTier: old ? old[4] : null };
}

export default function PriceLists({ store, sample }) {
  const { db, docs, canWrite, ready } = store;
  const recent = [...docs].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 25);
  const editable = !!db && canWrite !== false;

  return (
    <div className="mx-auto grid min-w-0 max-w-2xl grid-cols-1 gap-8 px-4 pt-4">
      {!ready ? <p className="text-[15px] text-label2">Loading…</p>
        : !db ? (
          <Group footer="Price updates are saved to this page's shared storage, which isn't available in this view. Open the page from claude.ai to update prices.">
            <Row last><span className="flex-1 text-[17px] text-label2">Updating prices isn't available here</span></Row>
          </Group>
        ) : !editable ? (
          <Group footer="Only editors of this page can update prices. Ask the page owner to make you an editor.">
            <Row last><span className="flex-1 text-[17px] text-label2">You can view price updates</span></Row>
          </Group>
        ) : (
          <>
            {sample && <Upload db={db} sample={sample} />}
            <AddByHand db={db} />
          </>
        )}

      {db && (
        <Section id="changes" title="Recent changes">
          {recent.length ? (
            <Group footer={`${docs.length} update${docs.length === 1 ? "" : "s"} in use. Undo returns a model to the built-in price list, or removes a model that was added.`}>
              {recent.map((d, j) => (
                <Row key={d.id} last={j === recent.length - 1}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px]">{d.mfr} {d.model}</span>
                    <span className="block truncate text-[13px] text-label2">{d.style} · Tier {d.tier}{d.prevTier ? ` (was ${d.prevTier})` : " · new"} · {d.source || "added by hand"}</span>
                  </span>
                  {editable && (
                    <button type="button" onClick={() => db.doc(`models/${d.id}`).delete().catch(() => {})}
                      className="inline-flex shrink-0 items-center gap-1 text-[15px] text-tint"><Undo2 className="h-4 w-4" />Undo</button>
                  )}
                </Row>
              ))}
            </Group>
          ) : <p className="text-[15px] text-label2">No changes yet. The built-in price lists are in use.</p>}
        </Section>
      )}
    </div>
  );
}

function Upload({ db, sample }) {
  const input = useRef(null);
  const ctl = useRef(null);
  const [phase, setPhase] = useState("idle"); // idle | reading | asking | review | saving | done | error
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState([]);
  const [pick, setPick] = useState(new Set());
  const [file, setFile] = useState("");
  const [limits, setLimits] = useState(null);
  useEffect(() => { sample.limits().then(setLimits, () => setLimits(null)); }, [sample]);

  const start = async (f) => {
    if (!f) return;
    setFile(f.name); setRows([]); setMsg(""); setPhase("reading");
    ctl.current = new AbortController();
    try {
      const content = await readPriceList(f, { maxImages: limits?.images?.maxCount || 5 });
      setPhase("asking");
      const names = [...new Set(MODELS.map((m) => `${m[0]} ${m[1]}`))].slice(0, 400).join("; ");
      let found = [];
      if (content.kind === "text") {
        const parts = chunks(content.text);
        for (let i = 0; i < parts.length; i++) {
          setMsg(parts.length > 1 ? `Reading part ${i + 1} of ${parts.length}…` : "");
          const out = await sample.json(`${instructions(names)}\n\n--- PRICE LIST (${f.name}) ---\n${parts[i]}`, { signal: ctl.current.signal });
          if (Array.isArray(out)) found = found.concat(out);
        }
      } else {
        if (!limits?.images) throw { code: "images_unavailable" };
        const out = await sample.json(`${instructions(names)}\n\nThe price list is in the attached image(s) (${f.name}).`, { images: content.blobs, signal: ctl.current.signal });
        if (Array.isArray(out)) found = out;
        if (content.skipped) setMsg(`Only the first ${content.blobs.length} pages were read. Upload the rest separately.`);
      }
      const clean = found.filter((r) => r && r.mfr && r.model && FAMILIES.includes(r.fam) && Number(r.cost) > 0).map(compare);
      const seen = new Set();
      const uniq = clean.filter((r) => { const k = modelKey(r.mfr, r.model, r.style); if (seen.has(k)) return false; seen.add(k); return true; });
      setRows(uniq);
      setPick(new Set(uniq.map((r, i) => (r.status !== "same" ? i : -1)).filter((i) => i >= 0)));
      setPhase("review");
    } catch (e) {
      const code = e?.code || (e?.message === "unsupported" ? "unsupported" : "read");
      if (code === "cancelled") { setPhase("idle"); return; }
      setMsg({
        unsupported: "That file type can't be read. Use a PDF, Excel or CSV file, or a photo of the price list.",
        read: "The file couldn't be opened. Try saving it again as a PDF or Excel file.",
        not_granted: "Reading documents needs your permission. Allow it when asked, then upload again.",
        sampling_disabled: "Document reading isn't available on this account. Use Add or update a model below.",
        images_unavailable: "This view can't read scanned pages or photos. Upload a PDF with text, or an Excel file.",
        rate_limited: "Too many requests right now. Try again in a minute.",
        prompt_too_large: "That document is too large to read at once. Split it into smaller files.",
        invalid_json: "The price list couldn't be turned into rows. Try again, or upload a clearer copy.",
      }[code] || "Something went wrong reading the document. Try again.");
      setPhase("error");
    } finally { if (input.current) input.current.value = ""; }
  };

  const apply = async () => {
    setPhase("saving");
    const chosen = rows.filter((_, i) => pick.has(i));
    try {
      for (const r of chosen) {
        await db.doc(`models/${modelKey(r.mfr, r.model, r.style)}`).set({
          mfr: r.mfr, model: r.model, style: r.style, fam: r.fam, invoice: r.cost, tier: r.tier,
          prevTier: r.oldTier, source: file, updatedAt: new Date().toISOString(),
        });
      }
      setMsg(`${chosen.length} model${chosen.length === 1 ? "" : "s"} updated. The Estimate tab uses the new prices now.`);
      setPhase("done"); setRows([]);
    } catch (e) {
      setMsg(e?.code === "quota_exceeded" ? "Storage is full. Undo some older changes, then try again." : "Some changes couldn't be saved. Check Recent changes and try again.");
      setPhase("error");
    }
  };

  const counts = { new: rows.filter((r) => r.status === "new").length, changed: rows.filter((r) => r.status === "changed").length, same: rows.filter((r) => r.status === "same").length };
  const busy = phase === "reading" || phase === "asking" || phase === "saving";

  return (
    <Section id="upload" title="Upload a price list">
      <p className="-mt-2 mb-4 text-[15px] text-label2">PDF, Excel or CSV, or a photo of the list. The system reads the hearing aids and their BHSC cost, and you choose what to apply. The file isn't stored.</p>
      <input ref={input} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.xlsm,.csv,.tsv,.ods,image/*" onChange={(e) => start(e.target.files?.[0])} />
      {!busy && phase !== "review" && (
        <button type="button" onClick={() => input.current?.click()}
          className="press flex w-full flex-col items-center gap-2 rounded-[14px] border-2 border-dashed border-sep bg-card px-4 py-8 text-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-tint-soft">
          <FileUp className="h-8 w-8 text-tint" strokeWidth={1.8} />
          <span className="text-[17px] font-semibold text-tint">Choose a file</span>
          <span className="text-[13px] text-label2">The newest list from ReSound, Phonak, Oticon, Starkey or another brand</span>
        </button>
      )}
      {busy && (
        <Group>
          <Row last>
            <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-fill2 border-t-tint" />
            <span className="min-w-0 flex-1"><span className="block truncate text-[17px]">{file}</span>
              <span className="block text-[13px] text-label2">{phase === "reading" ? "Opening the file…" : phase === "saving" ? "Saving…" : msg || "The system is reading the price list… this can take a minute."}</span></span>
            {phase === "asking" && <button type="button" onClick={() => ctl.current?.abort()} className="text-[15px] text-tint">Stop</button>}
          </Row>
        </Group>
      )}
      {(phase === "error" || phase === "done") && msg && (
        <div className={cn("mt-3 flex gap-2.5 rounded-[12px] px-4 py-3 text-[15px]", phase === "error" ? "bg-warn text-warn-ink" : "bg-tint-soft text-tint")}>
          {phase === "error" && <TriangleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0" />}{msg}
        </div>
      )}
      {phase === "review" && (
        <div className="grid min-w-0 grid-cols-1 gap-4">
          <div className="min-w-0"><p className="truncate text-[15px] font-semibold">{file}</p><p className="text-[15px] text-label2">{rows.length} hearing aids found · {counts.new} new · {counts.changed} tier change{counts.changed === 1 ? "" : "s"} · {counts.same} unchanged</p></div>
          {msg && <p className="text-[13px] text-warn-ink">{msg}</p>}
          {rows.length ? (
            <Group footer="Tiers come from the BHSC cost bands. A cost change that stays in the same tier doesn't change the patient price.">
              {rows.map((r, i) => (
                <Row key={i} last={i === rows.length - 1}>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5"><span className="min-w-0 truncate text-[17px]">{r.mfr} {r.model}</span>
                      <span className={cn("shrink-0 rounded px-1.5 text-[11px] font-semibold", r.status === "new" ? "bg-tint-soft text-tint" : r.status === "changed" ? "bg-warn text-warn-ink" : "bg-fill text-label2")}>
                        {r.status === "new" ? "NEW" : r.status === "changed" ? "TIER CHANGE" : "SAME"}</span></span>
                    <span className="block text-[13px] text-label2">{r.style} · cost {money(Math.round(r.cost))} · Tier {r.oldTier && r.oldTier !== r.tier ? `${r.oldTier} → ` : ""}{r.tier} · pair {money(TIERS[r.tier][1])}</span>
                  </span>
                  <Switch checked={pick.has(i)} onChange={(on) => setPick((p) => { const n = new Set(p); on ? n.add(i) : n.delete(i); return n; })} label={`Apply ${r.model}`} />
                </Row>
              ))}
            </Group>
          ) : <p className="text-[15px] text-label2">No hearing aid prices were found in this file.</p>}
          <div className="flex flex-wrap gap-2">
            {rows.length > 0 && <Capsule disabled={!pick.size} onClick={apply}>Apply {pick.size} change{pick.size === 1 ? "" : "s"}</Capsule>}
            <Capsule variant="plain" onClick={() => { setPhase("idle"); setRows([]); }}>Cancel</Capsule>
          </div>
        </div>
      )}
    </Section>
  );
}

function AddByHand({ db }) {
  const blank = { mfr: "Phonak", model: "", style: "", fam: "RIC", cost: "" };
  const [f, setF] = useState(blank);
  const [msg, setMsg] = useState("");
  const cost = Number(f.cost);
  const tier = cost > 0 ? tierFor(cost) : null;
  const save = async (e) => {
    e.preventDefault();
    if (!f.model.trim() || !(cost > 0)) { setMsg("Enter the model name and BHSC's cost."); return; }
    const r = compare({ ...f, model: f.model.trim(), style: f.style.trim() || FAM_LABEL[f.fam], cost });
    try {
      await db.doc(`models/${modelKey(r.mfr, r.model, r.style)}`).set({ mfr: r.mfr, model: r.model, style: r.style, fam: r.fam, invoice: r.cost, tier: r.tier, prevTier: r.oldTier, source: "added by hand", updatedAt: new Date().toISOString() });
      setMsg(`${r.mfr} ${r.model} saved at tier ${r.tier}.`); setF({ ...blank, mfr: f.mfr });
    } catch { setMsg("It couldn't be saved. Try again."); }
  };
  const row = (key, label, props = {}) => (
    <Row>
      <label htmlFor={`a-${key}`} className="w-[7rem] shrink-0 text-[17px]">{label}</label>
      <input id={`a-${key}`} value={f[key]} onChange={(e) => setF((p) => ({ ...p, [key]: e.target.value }))} autoComplete="off"
        className="w-0 min-w-0 flex-1 bg-transparent text-right text-[17px] text-label outline-none placeholder:text-label3" {...props} />
    </Row>
  );
  return (
    <Section id="add" title="Add or update a model">
      <form className="grid min-w-0 grid-cols-1 gap-4" onSubmit={save}>
        <SegmentedControl label="Manufacturer" value={f.mfr} onChange={(v) => setF((p) => ({ ...p, mfr: v }))} options={MFRS.map(([n]) => ({ value: n, label: n }))} itemClassName="basis-[22%] text-[14px]" />
        <Group footer={tier ? `Tier ${tier} · one aid ${money(TIERS[tier][0])} · pair ${money(TIERS[tier][1])}` : "The tier is worked out from the cost."}>
          {row("model", "Model", { placeholder: "e.g. Audeo I90-R" })}
          {row("style", "Style", { placeholder: FAM_LABEL[f.fam] })}
          {row("cost", "BHSC cost", { placeholder: "$ per unit", inputMode: "decimal" })}
          <Row last>
            <span className="w-[7rem] shrink-0 text-[17px]">Fits</span>
            <select value={f.fam} onChange={(e) => setF((p) => ({ ...p, fam: e.target.value }))} aria-label="Style family"
              className="min-w-0 flex-1 appearance-none bg-transparent text-right text-[17px] text-tint outline-none">
              {FAMILIES.map((x) => <option key={x} value={x}>{FAM_LABEL[x]}</option>)}
            </select>
          </Row>
        </Group>
        <div className="flex flex-wrap items-center gap-3">
          <Capsule type="submit"><Plus className="h-[18px] w-[18px]" strokeWidth={2.6} />Save model</Capsule>
          {msg && <span className="text-[15px] text-label2">{msg}</span>}
        </div>
      </form>
    </Section>
  );
}
