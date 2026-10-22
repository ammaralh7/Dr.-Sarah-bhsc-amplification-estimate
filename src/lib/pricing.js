import data from "@/data/pricing.json";

// [mfr, name, style label, family, tier, older(0/1), nySHIP(0/1), BHSC cost]
// Built from the price lists in the repo by build/build_web.py; rebuild to update prices.
export const modelKey = (mfr, name, style) =>
  `${mfr}-${name}-${style}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180) || "model";

// Prices saved with "Update prices" travel inside the page as <script type="application/json" id="bhsc-data">
// and replace the built-in ones (models, BHSC costs, list dates, admin PIN).
export const SAVED = (() => {
  try { const el = document.getElementById("bhsc-data"); return el ? JSON.parse(el.textContent) : null; } catch { return null; }
})();

// BHSC cost per model lives in data/costs.json (confidential). It is optional: a public copy of the
// app leaves the file out and still builds; the 2026 HA prices tab then hides the cost column.
const BUILT_COSTS = Object.values(import.meta.glob("../data/costs.json", { eager: true, import: "default" }))[0] || {};
const COSTS = SAVED?.costs || BUILT_COSTS;
export const HAS_COSTS = Object.keys(COSTS).length > 0;
export const MODELS = (SAVED?.models || data.models).map((m) => [...m.slice(0, 7), COSTS[modelKey(m[0], m[1], m[2])] ?? null]);
// How each current model is written on its manufacturer's price list ("model|style"), for matching a pasted list
export const RAW = { ...(SAVED?.raw || data.raw || {}) };
export const PRICES_UPDATED = SAVED?.updated || null;

/* BHSC's own pricing (the yearly tier sheet, fees and return rules). Staff change it in Update prices →
   BHSC prices & fees; a saved copy of the app carries its values (SAVED.pricing), otherwise these 2026
   defaults apply. TIERS, BANDS and FEES are filled in place from it, so every screen reads the current
   values. bands = lowest BHSC cost (invoice, per aid) for each tier; anything below the first is tier 1.
   codes = V5020, V5011 and 92594 charges inside the fitting fee; the dispense code is the rest. */
export const DEFAULT_POLICY = {
  year: "2026",
  tiers: [[410, 800], [515, 1025], [615, 1230], [760, 1515], [900, 1790], [1055, 2210], [1230, 2465], [1395, 2780], [1650, 3300], [1870, 3850], [2015, 4025]],
  bands: [210, 301, 380, 460, 551, 652, 763, 901, 1011, 1201, 1361],
  fit: [595, 845], ship: 25, molds: [115, 215], codes: [130, 160, 55],
  markup: 1.2, laceFrom: 7, visits: 4, returnKeep: 0.05, serviceFee: [200, 300],
};
export const POLICY = {};
export const TIERS = {};
export const BANDS = [];
export const FEES = { fit: [], ship: 0, molds: [] };
export function applyPolicy(p) {
  Object.assign(POLICY, JSON.parse(JSON.stringify({ ...DEFAULT_POLICY, ...p })));
  Object.keys(TIERS).forEach((k) => delete TIERS[k]);
  POLICY.tiers.forEach((t, i) => { TIERS[i + 1] = t; });
  BANDS.length = 0;
  POLICY.bands.forEach((lo, i) => BANDS.push([lo, i + 1]));
  Object.assign(FEES, { fit: POLICY.fit, ship: POLICY.ship, molds: [0, ...POLICY.molds] });
}
applyPolicy(SAVED?.pricing || {});
export const pct = (f) => `${Math.round(f * 1000) / 10}%`;
export const tierFor = (cost) => BANDS.reduce((t, [lo, n]) => (cost >= lo ? n : t), 1);
export const FAMILIES = ["RIC", "BTE", "ITE", "ITC", "CIC", "IIC", "CUSTOM", "ALL"];
// Style shown for a model added by hand without one
export const famStyle = (fam) => ({ ALL: "All styles · one price per level", CUSTOM: "Custom · ITE / ITC / CIC / IIC" })[fam] || fam;

export const findModel = (mfr, name, style) => MODELS.findIndex((m) => modelKey(m[0], m[1], m[2]) === modelKey(mfr, name, style));
export const ADDONS = JSON.parse(JSON.stringify(SAVED?.addons || data.addons));
export const PRICE_LISTS = { ...(SAVED?.lists || data.lists || {}) };
// Which number on each company's list is BHSC's price, when staff had to pick it (Update prices)
export const COLUMNS = { ...(SAVED?.columns || {}) };
export const BUILT_MFRS = ["ReSound", "Phonak", "Oticon", "Starkey", "Signia"];
// Companies added with "Update prices" come after the built-in ones, with a plain grey dot
export const MFRS = [...BUILT_MFRS.map((n) => [n, `var(--${n.toLowerCase()})`]),
  ...(SAVED?.mfrs || []).filter((n) => !BUILT_MFRS.includes(n)).map((n) => [n, "var(--label3)"])];
export const STYLES = [["RIC", "Receiver in canal"], ["BTE", "Behind the ear"], ["ITE", "In the ear"], ["ITC", "In the canal"], ["CIC", "Completely in canal"], ["IIC", "Invisible in canal"]];
const CODES = { CIC: ["V5254","V5258"], IIC: ["V5254","V5258"], ITC: ["V5255","V5259"], ITE: ["V5256","V5260"], BTE: ["V5257","V5261"], RIC: ["V5257","V5261"] };

// Whole dollars as before; cents only when there are any (accessories are cost × 1.2).
export const money = (n) => "$" + (Math.round(n * 100) % 100
  ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : Math.round(n).toLocaleString("en-US"));
export const fits = (fam, st) => fam === st || fam === "ALL" || (fam === "CUSTOM" && ["ITE","ITC","CIC","IIC"].includes(st));
export const isCros = (m) => /CROS/i.test(m[1]);
export const styleAvailable = (mfr, st) => MODELS.some((m) => m[0] === mfr && fits(m[3], st));
export const modelsFor = (mfr, st) => MODELS.map((m, i) => [m, i]).filter(([m]) => m[0] === mfr && fits(m[3], st));

/* Included with every price: up to 4 follow-up visits in the first year (2026 tier pricing). Tiers 7–11
   also include the LACE AI program (BHSC handover: "LACE AI is included in tiers 7–11"). Both in POLICY. */
export const hasLace = (tiers) => tiers.some((t) => t >= POLICY.laceFrom);
export const includedText = (tiers) => `Includes up to ${POLICY.visits} follow-up visits in the first year${hasLace(tiers) ? " and the LACE AI program" : ""}.`;

/* Accessories: patient price = BHSC cost × the markup (1.2 in 2026), to the cent. */
export const accessoryPrice = (cost) => Math.round(cost * POLICY.markup * 100) / 100;

/* Two different aids (one per ear). Not yet confirmed with BHSC — change here once it is:
   "halfPair" = each ear is half its tier's two-aid price; "single" = each ear at its tier's one-aid price. */
export const MIXED_RULE = "halfPair";
export const MIXED_CONFIRMED = false;
export const earPrice = (tier) => (MIXED_RULE === "single" ? TIERS[tier][0] : TIERS[tier][1] / 2);

/* An order: s.n aids; s.ears[0] is the aid (or the right ear), s.ears[1] the left ear when s.same is false. */
export const EAR_NAMES = ["Right ear", "Left ear"];
export const mixed = (s) => s.n === 2 && !s.same;
export const earsInUse = (s) => (mixed(s) ? s.ears : s.ears.slice(0, 1));
export const earModel = (e) => (e && e.model != null ? MODELS[e.model] : null);
/* CROS/BiCROS (a CROS on one ear, a hearing aid on the other): the tier pricing prices it as a
   monaural CROS plus a monaural hearing aid. */
export const crosPair = (s) => mixed(s) && earsInUse(s).some((e) => { const m = earModel(e); return m && isCros(m); });
const earAmount = (s, m) => (crosPair(s) ? TIERS[m[4]][0] : earPrice(m[4]));
export const orderReady = (s) => !!s.n && earsInUse(s).every((e) => earModel(e));
export const orderMfrs = (s) => [...new Set(earsInUse(s).map((e) => e.mfr).filter(Boolean))];
export const accessoriesFor = (s) => orderMfrs(s).flatMap((mfr) => ADDONS[mfr] || []);

/* Billing codes as on BHSC's purchase agreement (page 2). Hearing aids: CIC/IIC → CIC, RIC → BTE.
   CROS/BiCROS: ITE, ITC (CIC/IIC too) or BTE (RIC too) per side; binaural systems by the two sides. */
const BILL_FAM = { CIC: "CIC", IIC: "CIC", ITC: "ITC", ITE: "ITE", BTE: "BTE", RIC: "BTE" };
const CROS_FAM = { ITE: "ITE", ITC: "ITC", CIC: "ITC", IIC: "ITC", BTE: "BTE", RIC: "BTE" };
export const CROS_MONO = { ITE: "V5171", ITC: "V5172", BTE: "V5181" };
export const CROS_BIN = { "ITE/ITE": "V5211", "ITE/ITC": "V5212", "ITE/BTE": "V5213", "ITC/ITC": "V5214", "ITC/BTE": "V5215", "BTE/BTE": "V5221" };
const CROS_ORDER = ["ITE", "ITC", "BTE"];
const crosPairKey = (a, b) => [a, b].sort((x, y) => CROS_ORDER.indexOf(x) - CROS_ORDER.indexOf(y)).join("/");

/** Which boxes to tick: { mono: [{ fam, ear }], bin, crosMono, crosBin } (ear "R" / "L" / null). */
export function billingBoxes(s) {
  if (!orderReady(s)) return null;
  const ears = earsInUse(s), ms = ears.map(earModel), out = { mono: [], bin: null, crosMono: null, crosBin: null };
  if (ms.some(isCros)) {
    if (s.n === 1) out.crosMono = CROS_FAM[ears[0].style];
    else out.crosBin = crosPairKey(CROS_FAM[ears[0].style], CROS_FAM[(mixed(s) ? ears[1] : ears[0]).style]);
  } else if (s.n === 1) out.mono.push({ fam: BILL_FAM[ears[0].style], ear: s.aidEar || null });
  else if (!mixed(s) || BILL_FAM[ears[0].style] === BILL_FAM[ears[1].style]) out.bin = BILL_FAM[ears[0].style];
  else out.mono.push({ fam: BILL_FAM[ears[0].style], ear: "R" }, { fam: BILL_FAM[ears[1].style], ear: "L" });
  return out;
}

export function billingCode(s) {
  const b = billingBoxes(s);
  if (!b) return "";
  if (b.crosMono) return `${CROS_MONO[b.crosMono]} (CROS)`;
  if (b.crosBin) return `${CROS_BIN[b.crosBin]} (BiCROS ${b.crosBin})`;
  if (b.bin) return CODES[b.bin][1];
  return b.mono.map((m) => `${CODES[m.fam][0]}${m.ear ? ` ${m.ear}` : ""}`).join(" + ");
}

export function quoteLines(s) {
  if (!orderReady(s)) return [];
  const k = s.n === 2 ? 1 : 0;
  const out = [];
  if (mixed(s)) {
    s.ears.forEach((e, i) => { const m = earModel(e); out.push({ label: `${EAR_NAMES[i]} · Tier ${m[4]}`, sub: `${m[0]} ${m[1]} · ${m[2]}`, amount: earAmount(s, m) }); });
  } else {
    const m = earModel(s.ears[0]);
    out.push({ label: `${s.n === 2 ? "Hearing aids (pair)" : `Hearing aid${s.aidEar ? ` (${s.aidEar === "L" ? "left" : "right"} ear)` : ""}`} · Tier ${m[4]}`, sub: `${m[0]} ${m[1]} · ${m[2]}`, amount: TIERS[m[4]][k] });
  }
  if (s.incl === "all") {
    out.push({ label: "Fitting, orientation & dispense", sub: s.n === 2 ? "Two aids" : "One aid", amount: FEES.fit[k] });
    out.push({ label: "Shipping & handling", sub: "", amount: FEES.ship });
  }
  if (s.molds) out.push({ label: s.molds === 2 ? "Earmolds (two)" : s.n === 2 ? `Earmold (${s.moldEar === "L" ? "left" : "right"} ear)` : "Earmold (one)", sub: "", amount: FEES.molds[s.molds] });
  // Patient-facing: never show BHSC cost here (the estimate is copied for patients).
  s.addons.forEach((a) => out.push({ label: a.name, sub: "Accessory", amount: a.price }));
  return out;
}
export const quoteTotal = (s) => Math.round(quoteLines(s).reduce((a, l) => a + l.amount, 0) * 100) / 100;

/* The estimate split the way BHSC's purchase agreement adds it up (page 2, Patient Charges Summary). */
export function quoteParts(s) {
  if (!orderReady(s)) return null;
  const k = s.n === 2 ? 1 : 0;
  const aids = mixed(s) ? s.ears.reduce((a, e) => a + earAmount(s, earModel(e)), 0) : TIERS[earModel(s.ears[0])[4]][k];
  const fit = s.incl === "all" ? FEES.fit[k] : 0, ship = s.incl === "all" ? FEES.ship : 0;
  const molds = FEES.molds[s.molds] || 0, acc = s.addons.reduce((a, x) => a + x.price, 0);
  return { aids, fit, ship, molds, acc, supplies: r2(molds + acc), total: r2(aids + fit + ship + molds + acc) };
}

/* Returns — BHSC "Private Pay & Non-MCD Insurance Hearing Aid Return Process" (effective 10/29/2024).
   Full return: the patient gets back the total paid minus what BHSC keeps: 5% of the hearing aid
   charge, 5% of each service code (92641/92594, V5011, V5020, dispense = the fitting fee) and a
   service fee of $200 (one aid) or $300 (two). One side of a pair: no penalty — the order is
   simply re-priced as one aid. The % and fees are in POLICY (returnKeep, serviceFee). */
/* The fitting, orientation & dispense fee by code (BHSC Hearing Aid Fitting, Orientation and Purchase
   Agreement): $595 one aid / $845 two = these three (POLICY.codes) + the dispense code ($250 / $500). */
export const FIT_CODES = [["V5020", "Conformity evaluation"], ["V5011", "Fitting, orientation & checking"], ["92594", "Electroacoustic evaluation"]];
const DISPENSE = [[["V5241", "Monaural dispense"], ["V5200", "Contralateral monaural dispense"]], [["V5160", "Binaural dispense"], ["V5240", "Contralateral binaural dispense"]]];
export const dispenseFee = (k) => r2(POLICY.fit[k] - POLICY.codes.reduce((a, c) => a + c, 0));
const r2 = (n) => Math.round(n * 100) / 100;

/** mode: "all" | "one" (same pair) | "right" | "left" (different aid per ear). */
export function refund(s, mode = "all") {
  if (!orderReady(s)) return null;
  const k = s.n === 2 ? 1 : 0;
  const ears = earsInUse(s).map(earModel);
  const aidPaid = mixed(s) ? ears.reduce((a, m) => a + earAmount(s, m), 0) : TIERS[ears[0][4]][k];
  const fitPaid = s.incl === "all" ? FEES.fit[k] : 0;
  const other = (s.incl === "all" ? FEES.ship : 0) + (FEES.molds[s.molds] || 0) + s.addons.reduce((a, x) => a + x.price, 0);
  const rows = [];
  let back, math = null;
  if (mode === "all") {
    // 5% of each fitting/dispense code (adds up to 5% of the fitting fee) and 5% of the hearing aids
    const disp = DISPENSE[k][ears.some(isCros) ? 1 : 0];
    const keep = POLICY.returnKeep;
    const codes = fitPaid ? [...FIT_CODES.map(([code, name], i) => [code, name, POLICY.codes[i]]), [disp[0], disp[1], dispenseFee(k)]].map(([code, name, charge]) => ({ code, name, charge, keep: r2(charge * keep) })) : [];
    const keepAid = r2(aidPaid * keep), keepFit = r2(codes.reduce((a, c) => a + c.keep, 0)), fee = POLICY.serviceFee[k];
    // The patient gets back everything they paid except what BHSC keeps (matches BHSC's own worksheet).
    rows.push({ label: s.n === 2 ? "Hearing aids paid" : "Hearing aid paid", amount: aidPaid });
    if (fitPaid) rows.push({ label: "Fitting, orientation & dispense paid", amount: fitPaid });
    const extras = [s.incl === "all" && "shipping & handling", s.molds && (s.molds === 2 ? "earmolds" : "earmold"), s.addons.length && (s.addons.length > 1 ? "accessories" : "accessory")].filter(Boolean);
    if (other) rows.push({ label: `${extras.join(", ").replace(/^./, (c) => c.toUpperCase())} paid`, amount: r2(other) });
    rows.push({ label: `BHSC keeps ${pct(keep)} of the hearing aid charge`, amount: -keepAid });
    if (fitPaid) rows.push({ label: `BHSC keeps ${pct(keep)} of the fitting & dispense charge`, amount: -keepFit });
    rows.push({ label: `Service fee · ${s.n === 2 ? "two aids" : "one aid"} returned`, amount: -fee });
    back = r2(aidPaid + fitPaid + other - keepAid - keepFit - fee);
    math = { codes, keepFit, aidPaid, keepAid, keep5: r2(keepFit + keepAid), fee, kept: r2(keepFit + keepAid + fee), paid: r2(aidPaid + fitPaid + other) };
  } else {
    // Keep one aid: re-price as a single aid, no service fee and no 5%.
    const kept = mode === "one" ? ears[0] : mode === "right" ? ears[1] : ears[0];
    const aidBack = r2(aidPaid - TIERS[kept[4]][0]);
    const fitBack = fitPaid ? FEES.fit[1] - FEES.fit[0] : 0;
    rows.push({ label: "Hearing aid returned", sub: `Pair re-priced as one ${kept[1]} (Tier ${kept[4]}, ${money(TIERS[kept[4]][0])})`, amount: aidBack });
    if (fitBack) rows.push({ label: "Fitting & dispense", sub: `Two-aid fee re-priced as one aid`, amount: fitBack });
    rows.push({ label: `Service fee and ${pct(POLICY.returnKeep)}`, sub: "Not charged — one side of a pair", amount: 0 });
    back = r2(aidBack + fitBack);
  }
  return { rows, refund: Math.max(0, back), other, math, fee: mode === "all" ? POLICY.serviceFee[k] : 0 };
}
