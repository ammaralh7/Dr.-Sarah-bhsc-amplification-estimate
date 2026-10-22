/* The smart reader for "Update prices": reads one company's price list whatever its layout, so a
   manufacturer changing its PDF, or a company added by hand, needs no new code.
   - Rows: every line with prices on it ($1,234 / 1,234 / 12.34, or a typed "Model  1415"). Words on the
     lines just above a prices-only line belong to it (a PDF row split over lines), and a words-only line
     before a run of rows is kept as its section ("Custom Price Entries").
   - Models: each row is matched to the app's models by their words: how the list worded them (RAW) or
     how the app shows them (name + style). All of a model's name words must be on the row; small typos
     are allowed. The most specific match wins, and a row that fits two different models equally is left
     alone rather than guessed. Rows worded the same way (Signia's "Pure 312" under each level) are
     matched in the list's own order. A bare model name prices all its styles when they share one price.
   - Which number is BHSC's price: the column ("last amount", "2nd from the left"…) that agrees with
     the prices the app already has; else the one saved for this company; else staff pick it once. */
import { MODELS, RAW, COLUMNS, BUILT_MFRS, modelKey, famStyle, tierFor } from "@/lib/pricing";

const AMOUNT = /\$\s?\d[\d,]*(?:\.\d{1,2})?|\b\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?\b|\b\d+\.\d{2}\b/g;
const toNum = (s) => parseFloat(String(s).replace(/[$,\s]/g, ""));
const round2 = (n) => Math.round(n * 100) / 100;
const keyOf = (m) => modelKey(m[0], m[1], m[2]);

/** Words of a text: "PureCharge&GO" → pure charge go, "RIC.R" → ric r. Common shorthand on manufacturer
    lists is spelled out (the same on both sides, so it only ever helps a match). */
const SHORT = { pwrpls: ["power", "plus"], pwrplus: ["power", "plus"], crosbicros: ["cros", "bi", "cros"], bicros: ["bi", "cros"], rechg: ["rechargeable"], rechargable: ["rechargeable"] };
export const tokens = (s) => String(s).replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).flatMap((t) => SHORT[t] || [t]);

// Warranty, discount and leftover "$" are not part of a row's words
const clean = (t) => t
  .replace(/\b\d+\s*(?:yrs?|years?|mos?|months?)\b(?:\s*\/\s*\d+\s*(?:yrs?|years?|mos?|months?)\b)*/gi, " ")
  .replace(/\bFIXED\b/g, " ").replace(/\b\d+(?:\.\d+)?\s*%/g, " ").replace(/\$/g, " ")
  .replace(/\s+/g, " ").replace(/^[\s,;:|·-]+|[\s,;:|·-]+$/g, "");

// Lines that carry a number but aren't products (account numbers, dates, page totals…)
const NOT_PRODUCT = /\b(account|number|date|created|page|phone|fax|total|subtotal|invoice #|order #|zip)\b/i;

function lev(a, b) {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
  }
  return d[b.length];
}
// a word is in a list of words: the same word, or (5+ letters) one letter off, e.g. "syletto" ≈ "styletto"
const inWords = (set, list, t) => set.has(t) || (t.length >= 5 && list.some((r) => r[0] === t[0] && Math.abs(r.length - t.length) <= 1 && lev(r, t) <= 1));
const words = (text) => { const list = [...new Set(tokens(text))]; return { list, set: new Set(list) }; };
const isNoise = (line) => !clean(line.replace(AMOUNT, " "));      // "FIXED", "$", "3 yr / 3 yr", "10%"

/** The rows of a pasted list: { own, section, amts, inline, own words, section words }.
    A row starts at a line with words; prices on the same line or on the next lines (with nothing but
    noise between) are its prices; words-only lines before them are part of its name ("X / Active Pro").
    A words-only row that never gets prices is a heading: it becomes the section of the rows after it. */
export function rowsOf(text) {
  const out = [];
  let cur = null, section = "";
  // typed lists ("Sensia 9  1415") have no formatted prices; on a real price list a name ending in a
  // number ("Pure 312") is a name, not a price
  const typedList = !(String(text).match(AMOUNT) || []).length;
  const close = () => {
    if (!cur) return;
    if (cur.amts.length) { if (!NOT_PRODUCT.test(cur.own)) out.push({ ...cur, section }); }
    else section = cur.own;
    cur = null;
  };
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/\t+/g, "  ").trim();
    if (!line) continue;
    // a number alone on its line ("860", "$ 860") is a price of the row above
    const amts = /^\$?\s?\d[\d,]*(?:\.\d+)?\s*\$?$/.test(line) ? [toNum(line)] : (line.match(AMOUNT) || []).map(toNum);
    if (amts.length === 1 && /^\$?\s?\d[\d,]*(?:\.\d+)?\s*\$?$/.test(line)) { if (cur) cur.amts.push(amts[0]); continue; }
    if (isNoise(line)) { if (cur && amts.length) cur.amts.push(...amts); continue; }
    if (!amts.length) {
      // typed "Model  1415": a price at the end of a line with words
      const typed = line.match(/^(.*[a-z].*?)\s+\$?(\d{2,}(?:\.\d+)?)$/i);
      if (typedList && typed && +typed[2] >= 50 && !NOT_PRODUCT.test(typed[1])) { close(); out.push({ own: clean(typed[1]), section, amts: [+typed[2]], inline: true }); continue; }
      // more words for a row that has no prices yet (a name split over lines), else a new row
      if (cur && !cur.amts.length) cur.own = clean(`${cur.own} ${line}`);
      else { close(); cur = { own: clean(line), amts: [], inline: false }; }
      continue;
    }
    // words and prices on one line
    const own = clean(line.replace(AMOUNT, " "));
    if (cur && !cur.amts.length && /^[A-Z0-9]{1,4}$/.test(cur.own)) { cur.own = clean(`${cur.own} ${own}`); cur.amts = amts; cur.inline = true; continue; }
    close();
    cur = { own, amts, inline: true };
  }
  close();
  return out.map((r) => ({ ...r, w: words(r.own), s: words(r.section) }));
}

/* The ways a model can be named on a list. order = its row number for lists stored by row (Signia). */
function unitsFor(mfr) {
  const mine = MODELS.filter((m) => m[0] === mfr), units = [], byRaw = new Map();
  // the company's own name is implied on its list ("Oticon CROS PX" is listed as "CROS PX")
  const brand = new Set(tokens(mfr)), named = (t) => { const n = t.filter((w) => !brand.has(w)); return n.length ? n : t; };
  mine.forEach((m) => { const r = RAW[keyOf(m)]; if (r && !m[5]) { if (!byRaw.has(r)) byRaw.set(r, []); byRaw.get(r).push(m); } });
  for (const [r, ms] of byRaw) {
    const row = r.match(/^(\d+)\|(.*)$/);
    if (row) units.push({ name: named(tokens(row[2])), style: [], order: +row[1], models: ms, list: true });
    else { const [n, st = ""] = r.split("|"); units.push({ name: named(tokens(n)), style: tokens(st), models: ms, list: true }); }
  }
  mine.forEach((m) => units.push({ name: named(tokens(m[1])), style: tokens(m[2]).filter((t) => !["all", "styles", "one", "price", "per", "level"].includes(t)), models: [m] }));
  const byName = new Map();
  mine.filter((m) => !m[5]).forEach((m) => { if (!byName.has(m[1])) byName.set(m[1], []); byName.get(m[1]).push(m); });
  for (const [n, ms] of byName) if (ms.length > 1 && new Set(ms.map((m) => m[7])).size === 1) units.push({ name: named(tokens(n)), style: [], models: ms });
  return units.filter((u) => u.name.length).map((u, id) => ({ ...u, id }));
}

const sameModels = (a, b) => a.length === b.length && a.every((m) => b.includes(m));

/** Match each row to a unit: { unit, score }, null when nothing fits, "unclear" when two fit equally.
    A model's name words must be on the row itself; its style words count fully on the row and half in
    the section heading above it. When two rows fit the same model, the closer fit keeps it. */
function matchRows(rows, units) {
  let lastOrder = 0;
  const usedOrder = new Set();
  const res = rows.map((row) => {
    let best = [], top = -Infinity;
    for (const u of units) {
      if (!u.name.every((t) => inWords(row.w.set, row.w.list, t))) continue;
      let hit = 0, miss = 0;
      for (const t of u.style) { if (inWords(row.w.set, row.w.list, t)) hit += 1; else if (inWords(row.s.set, row.s.list, t)) hit += 0.5; else miss += 1; }
      // the list's own wording is trusted over the app's names for the same row
      const score = u.name.length * 2 + hit - 0.5 * miss + (u.list ? 2 : 0);
      if (score > top + 1e-9) { top = score; best = [u]; } else if (Math.abs(score - top) < 1e-9) best.push(u);
    }
    if (!best.length) return null;
    // the same models reached two ways (list wording / app wording) are one match
    const distinct = best.filter((u, i) => best.findIndex((v) => sameModels(v.models, u.models)) === i);
    if (distinct.length === 1) return { unit: distinct[0], score: top };
    // rows worded alike: take the next one in the list's own order
    if (distinct.every((u) => u.order)) {
      const next = distinct.filter((u) => !usedOrder.has(u.order)).sort((a, b) => a.order - b.order);
      const pick = next.find((u) => u.order > lastOrder) || next[0];
      if (pick) { usedOrder.add(pick.order); lastOrder = pick.order; return { unit: pick, score: top }; }
    }
    return "unclear";
  });
  // one row per model: the best-fitting row keeps it (first on a tie)
  const keep = new Map();
  res.forEach((r, i) => { if (r && r !== "unclear") r.unit.models.forEach((m) => { const k = keyOf(m), b = keep.get(k); if (!b || r.score > res[b].score + 1e-9) keep.set(k, i); }); });
  return res.map((r, i) => (r && r !== "unclear" && !r.unit.models.some((m) => keep.get(keyOf(m)) === i) ? "dup" : r));
}

/* Column headings, when the list has them: "List Price · Discount · Level 1", "Product · List Price · Net
   Price", "MSRP · Invoice"… The BHSC price is the net-type heading, counted among the price headings. */
const LISTISH = /\b(list|msrp|retail|unit|suggested|srp)\b/i, NETISH = /\b(net|invoice|level\s*1|account|cost|dealer|your|bhsc|customer|contract)\b/i;
function headerRule(text) {
  for (const line of String(text).split(/\r?\n/).slice(0, 400)) {
    if ((line.match(AMOUNT) || []).length) continue;
    // split headings on tabs, 2+ spaces or the word boundaries between known heading words
    const heads = line.split(/\t|\s{2,}|(?=\b(?:list|msrp|retail|unit|net|invoice|level\s*1|account|cost|dealer|discount)\b)/i).map((h) => h.trim()).filter(Boolean);
    const priced = heads.filter((h) => LISTISH.test(h) || NETISH.test(h));
    if (priced.length < 2 || !priced.some((h) => NETISH.test(h)) || !priced.some((h) => LISTISH.test(h))) continue;
    const i = priced.findIndex((h) => NETISH.test(h) && !LISTISH.test(h));
    if (i >= 0) return { from: "L", i };
  }
  return null;
}

const pickAmt = (amts, rule) => (rule.from === "R" ? amts[amts.length - 1 - rule.i] : amts[rule.i]);
export const ruleName = (r) => (r.from === "R" ? (r.i === 0 ? "the last price on each line" : `price ${r.i + 1} from the right`) : r.i === 0 ? "the first price on each line" : `price ${r.i + 1} from the left`);

/* Type of a new model from its words */
export function guessType(text) {
  const w = new Set(tokens(text));
  if (w.has("iic")) return "IIC";
  if (w.has("cic")) return "CIC";
  if (w.has("itc")) return "ITC";
  if (w.has("ite") || w.has("hs") || (w.has("half") && w.has("shell"))) return "ITE";
  if (["ric", "rite", "mric", "receiver"].some((t) => w.has(t))) return "RIC";
  if (w.has("bte")) return "BTE";
  if (w.has("custom") || w.has("customs")) return "CUSTOM";
  return "ALL";
}

/**
 * Read one company's list. rule (optional) = { from: "L" | "R", i } picked by staff.
 * Returns the usual result plus { smart: true, rule, needsColumn, sample, unclear }.
 */
export function readSmart(mfr, text, picked) {
  const rows = rowsOf(text), units = unitsFor(mfr), matches = matchRows(rows, units);
  const mine = MODELS.filter((m) => m[0] === mfr);
  // which amount is BHSC's price
  let rule = null, auto = false;
  const width = Math.max(0, ...rows.map((r) => r.amts.length));
  const typedLike = rows.length > 0 && rows.every((r) => r.inline && r.amts.length === 1);
  if (typedLike) { rule = { from: "R", i: 0 }; auto = true; }
  else if (width > 0) {
    const known = rows.map((r, i) => [r, matches[i] && matches[i].unit]).filter(([, u]) => u && u.models[0][7] != null && u.models.every((m) => m[7] === u.models[0][7]));
    // the column whose prices equal the app's on most rows; on a list where every price moved (a yearly
    // increase), the column whose prices are closest to the app's (list prices are far higher)
    let bestHits = 0, bestOff = Infinity, near = null;
    for (const from of ["R", "L"]) for (let i = 0; i < width; i++) {
      const offs = known.map(([r, u]) => { const a = pickAmt(r.amts, { from, i }); return a == null ? Infinity : Math.abs(a / u.models[0][7] - 1); });
      const hits = offs.filter((o) => o < 0.00001).length;
      if (hits > bestHits) { bestHits = hits; rule = { from, i }; }
      const sorted = offs.filter((o) => o < Infinity).sort((x, y) => x - y), med = sorted.length >= known.length / 2 ? sorted[Math.floor(sorted.length / 2)] : Infinity;
      if (med < bestOff - 1e-9) { bestOff = med; near = { from, i }; }
    }
    auto = !!rule && bestHits >= Math.max(1, known.length / 2);
    if (!auto && near && bestOff < 0.25 && known.length >= 3) { rule = near; auto = true; }
    // no BHSC prices to compare (a copy built without them): BHSC's price is the column that puts most
    // models in the tier they're in now (list prices, about twice as high, land tiers above)
    if (!auto) {
      const tiered = rows.map((r, i) => [r, matches[i] && matches[i].unit]).filter(([, u]) => u && u.models.every((m) => m[4] === u.models[0][4]));
      let bestT = 0, tRule = null;
      for (const from of ["R", "L"]) for (let i = 0; i < width; i++) {
        const hits = tiered.filter(([r, u]) => { const a = pickAmt(r.amts, { from, i }); return a != null && tierFor(a) === u.models[0][4]; }).length;
        if (hits > bestT) { bestT = hits; tRule = { from, i }; }
      }
      if (tiered.length >= 3 && bestT >= tiered.length * 0.6) { rule = tRule; auto = "tiers"; }
    }
    // the app's prices can't tell (a new company, or a copy without BHSC prices): staff's pick, the
    // column saved for this company, the list's own headings, then (built-in companies) the last price
    if (!auto) rule = picked || COLUMNS[mfr] || headerRule(text) || (BUILT_MFRS.includes(mfr) ? { from: "R", i: 0 } : null);
  }
  if (picked) { rule = picked; auto = false; }   // staff's pick always wins
  const sample = rows.find((r) => r.amts.length > 1) || null;
  const result = { smart: true, rule, auto, needsColumn: !rule && rows.length > 0, sample, read: rows.length };

  const found = new Set(), changes = [], added = [];
  let unclear = 0;
  rows.forEach((r, idx) => {
    if (matches[idx] === "dup") return;
    if (matches[idx] === "unclear") { unclear++; return; }
    const u = matches[idx] && matches[idx].unit;
    const cost = rule ? pickAmt(r.amts, rule) : null;
    if (u) {
      for (const m of u.models) {
        const key = keyOf(m);
        if (found.has(key)) continue;
        found.add(key);
        if (cost == null) continue;
        if (m[7] == null || Math.abs(m[7] - cost) >= 0.005 || m[5])
          changes.push({ type: "price", key, mfr, name: m[1], style: m[2], fam: m[3], older: !!m[5], oldCost: m[7], newCost: round2(cost), oldTier: m[4], newTier: tierFor(cost) });
      }
      return;
    }
    if (cost == null || cost < 50 || cost > 25000 || !/[a-z]{2}/i.test(r.own)) return;
    const name = r.own.slice(0, 80), fam = guessType(`${r.own} ${r.section}`), style = famStyle(fam), key = modelKey(mfr, name, style);
    if (added.some((a) => a.key === key) || mine.some((m) => keyOf(m) === key)) return;
    // a list for a new company, or typed lines, are meant as new models; on a known company's list,
    // a line the app doesn't have is often an accessory, so it waits for a tick
    const add = !mine.length || typedLike;
    added.push({ type: "new", key, mfr, name, style, fam, autoStyle: true, quiet: !add, newCost: round2(cost), newTier: tierFor(cost), add });
  });
  const current = mine.filter((m) => !m[5]);
  const partial = found.size < current.length / 2;
  const missing = partial ? [] : current.filter((m) => !found.has(keyOf(m)))
    .map((m) => ({ type: "missing", key: keyOf(m), mfr, name: m[1], style: m[2], fam: m[3], oldCost: m[7], oldTier: m[4], remove: false }));
  return { ...result, matched: found.size, total: current.length, changes, added, missing, other: [], unclear, typed: partial };
}
