import data from "@/data/pricing.json";

// [mfr, name, style label, family, tier, older(0/1), nySHIP(0/1), BHSC cost]
// Built from the price lists in the repo by build/build_web.py; rebuild to update prices.
export const modelKey = (mfr, name, style) =>
  `${mfr}-${name}-${style}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180) || "model";

// BHSC cost per model lives in data/costs.json (confidential). It is optional: a public copy of the
// app leaves the file out and still builds; the 2026 HA prices tab then hides the cost column.
const COSTS = Object.values(import.meta.glob("../data/costs.json", { eager: true, import: "default" }))[0] || {};
export const HAS_COSTS = Object.keys(COSTS).length > 0;
export const MODELS = data.models.map((m) => [...m, COSTS[modelKey(m[0], m[1], m[2])] ?? null]);

/* BHSC 2026 tier bands on invoice cost per unit (below $210 → tier 1). */
export const BANDS = [[210, 1], [301, 2], [380, 3], [460, 4], [551, 5], [652, 6], [763, 7], [901, 8], [1011, 9], [1201, 10], [1361, 11]];
export const tierFor = (cost) => BANDS.reduce((t, [lo, n]) => (cost >= lo ? n : t), 1);
export const FAMILIES = ["RIC", "BTE", "ITE", "ITC", "CIC", "IIC", "CUSTOM", "ALL"];

export const findModel = (mfr, name, style) => MODELS.findIndex((m) => modelKey(m[0], m[1], m[2]) === modelKey(mfr, name, style));
export const ADDONS = data.addons;
export const TIERS = {1:[410,800],2:[515,1025],3:[615,1230],4:[760,1515],5:[900,1790],6:[1055,2210],7:[1230,2465],8:[1395,2780],9:[1650,3300],10:[1870,3850],11:[2015,4025]};
export const FEES = { fit: [595, 845], ship: 25, molds: [0, 115, 215] };
export const MFRS = [["ReSound", "var(--resound)"], ["Phonak", "var(--phonak)"], ["Oticon", "var(--oticon)"], ["Starkey", "var(--starkey)"]];
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

/* Accessories: patient price = BHSC cost × 1.2, to the cent. */
export const ACCESSORY_MARKUP = 1.2;
export const accessoryPrice = (cost) => Math.round(cost * ACCESSORY_MARKUP * 100) / 100;

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
/* CROS/BiCROS (a CROS on one ear, a hearing aid on the other): the 2026 tier pricing prices it as a
   monaural CROS plus a monaural hearing aid. */
export const crosPair = (s) => mixed(s) && earsInUse(s).some((e) => { const m = earModel(e); return m && isCros(m); });
const earAmount = (s, m) => (crosPair(s) ? TIERS[m[4]][0] : earPrice(m[4]));
export const orderReady = (s) => !!s.n && earsInUse(s).every((e) => earModel(e));
export const orderMfrs = (s) => [...new Set(earsInUse(s).map((e) => e.mfr).filter(Boolean))];
export const accessoriesFor = (s) => orderMfrs(s).flatMap((mfr) => ADDONS[mfr] || []);

export function billingCode(s) {
  if (!orderReady(s)) return "";
  const ears = earsInUse(s), ms = ears.map(earModel);
  if (ms.some(isCros)) return s.n === 2 ? "V5211–V5221 (CROS/BiCROS)" : "V5171–V5181 (CROS/BiCROS)";
  if (s.n === 1) return CODES[ears[0].style][0];
  if (!mixed(s) || ears[0].style === ears[1].style || CODES[ears[0].style][1] === CODES[ears[1].style][1]) return CODES[ears[0].style][1];
  return `${CODES[ears[0].style][0]} + ${CODES[ears[1].style][0]}`;
}

export function quoteLines(s) {
  if (!orderReady(s)) return [];
  const k = s.n === 2 ? 1 : 0;
  const out = [];
  if (mixed(s)) {
    s.ears.forEach((e, i) => { const m = earModel(e); out.push({ label: `${EAR_NAMES[i]} · Tier ${m[4]}`, sub: `${m[0]} ${m[1]} · ${m[2]}`, amount: earAmount(s, m) }); });
  } else {
    const m = earModel(s.ears[0]);
    out.push({ label: `${s.n === 2 ? "Hearing aids (pair)" : "Hearing aid"} · Tier ${m[4]}`, sub: `${m[0]} ${m[1]} · ${m[2]}`, amount: TIERS[m[4]][k] });
  }
  if (s.incl === "all") {
    out.push({ label: "Fitting, orientation & dispense", sub: s.n === 2 ? "Two aids" : "One aid", amount: FEES.fit[k] });
    out.push({ label: "Shipping & handling", sub: "", amount: FEES.ship });
  }
  if (s.molds) out.push({ label: s.molds === 2 ? "Earmolds (two)" : "Earmold (one)", sub: "", amount: FEES.molds[s.molds] });
  s.addons.forEach((a) => out.push({ label: a.name, sub: a.custom ? `Accessory · cost ${money(a.cost)} × 1.2` : "Accessory", amount: a.price }));
  return out;
}
export const quoteTotal = (s) => Math.round(quoteLines(s).reduce((a, l) => a + l.amount, 0) * 100) / 100;

/* Returns — BHSC "Private Pay & Non-MCD Insurance Hearing Aid Return Process" (effective 10/29/2024).
   Full return: BHSC keeps 5% of the hearing aid charge, 5% of each service code (fitting/dispense)
   and a service fee of $200 (one aid) or $300 (two). One side of a pair: no penalty — the order is
   simply re-priced as one aid. Shipping, earmolds and accessories aren't covered by the policy. */
export const RETURN_KEEP = 0.05;
export const SERVICE_FEE = [200, 300];
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
  let back;
  if (mode === "all") {
    const keepAid = r2(aidPaid * RETURN_KEEP), keepFit = r2(fitPaid * RETURN_KEEP), fee = SERVICE_FEE[k];
    rows.push({ label: s.n === 2 ? "Hearing aids paid" : "Hearing aid paid", amount: aidPaid });
    if (fitPaid) rows.push({ label: "Fitting, orientation & dispense paid", amount: fitPaid });
    rows.push({ label: "BHSC keeps 5% of the hearing aid charge", amount: -keepAid });
    if (fitPaid) rows.push({ label: "BHSC keeps 5% of the fitting & dispense charge", amount: -keepFit });
    rows.push({ label: `Service fee · ${s.n === 2 ? "two aids" : "one aid"} returned`, amount: -fee });
    back = r2(aidPaid + fitPaid - keepAid - keepFit - fee);
  } else {
    // Keep one aid: re-price as a single aid, no service fee and no 5%.
    const kept = mode === "one" ? ears[0] : mode === "right" ? ears[1] : ears[0];
    const aidBack = r2(aidPaid - TIERS[kept[4]][0]);
    const fitBack = fitPaid ? FEES.fit[1] - FEES.fit[0] : 0;
    rows.push({ label: "Hearing aid returned", sub: `Pair re-priced as one ${kept[1]} (Tier ${kept[4]}, ${money(TIERS[kept[4]][0])})`, amount: aidBack });
    if (fitBack) rows.push({ label: "Fitting & dispense", sub: `Two-aid fee re-priced as one aid`, amount: fitBack });
    rows.push({ label: "Service fee and 5%", sub: "Not charged — one side of a pair", amount: 0 });
    back = r2(aidBack + fitBack);
  }
  return { rows, refund: Math.max(0, back), other, fee: mode === "all" ? SERVICE_FEE[k] : 0 };
}
