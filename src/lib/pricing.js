import data from "@/data/pricing.json";

// [mfr, name, style label, family, tier, older(0/1), nySHIP(0/1), updated(0/1)]
// BASE is the built-in list (from the price lists in the repo). MODELS is the live list:
// BASE plus any updates saved from the Price lists tab. It is mutated in place so that
// a chosen model's index stays valid: updates replace rows, new models are appended.
const BASE = data.models.map((m) => [...m, 0]);
export const MODELS = BASE.map((m) => [...m]);

/* BHSC 2026 tier bands on invoice cost per unit (below $210 → tier 1). */
export const BANDS = [[210, 1], [301, 2], [380, 3], [460, 4], [551, 5], [652, 6], [763, 7], [901, 8], [1011, 9], [1201, 10], [1361, 11]];
export const tierFor = (cost) => BANDS.reduce((t, [lo, n]) => (cost >= lo ? n : t), 1);
export const FAMILIES = ["RIC", "BTE", "ITE", "ITC", "CIC", "IIC", "CUSTOM", "ALL"];
export const modelKey = (mfr, name, style) =>
  `${mfr}-${name}-${style}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180) || "model";

/** Rebuild MODELS from BASE + saved update documents ({mfr, model, style, fam, invoice, tier}). */
export function applyUpdates(docs) {
  MODELS.length = 0;
  BASE.forEach((m) => MODELS.push([...m]));
  const index = new Map(MODELS.map((m, i) => [modelKey(m[0], m[1], m[2]), i]));
  for (const d of docs) {
    if (!d || !d.mfr || !d.model || !FAMILIES.includes(d.fam)) continue;
    const row = [String(d.mfr), String(d.model), String(d.style || d.fam), d.fam, Number(d.tier) || tierFor(Number(d.invoice) || 0), 0, 0, 1];
    const at = index.get(modelKey(row[0], row[1], row[2]));
    if (at != null) MODELS[at] = row; else { index.set(modelKey(row[0], row[1], row[2]), MODELS.length); MODELS.push(row); }
  }
}
export const findModel = (mfr, name, style) => MODELS.findIndex((m) => modelKey(m[0], m[1], m[2]) === modelKey(mfr, name, style));
export const ADDONS = data.addons;
export const TIERS = {1:[410,800],2:[515,1025],3:[615,1230],4:[760,1515],5:[900,1790],6:[1055,2210],7:[1230,2465],8:[1395,2780],9:[1650,3300],10:[1870,3850],11:[2015,4025]};
export const FEES = { fit: [595, 845], ship: 25, molds: [0, 115, 215] };
export const MFRS = [["ReSound", "var(--resound)"], ["Phonak", "var(--phonak)"], ["Oticon", "var(--oticon)"], ["Starkey", "var(--starkey)"]];
export const STYLES = [["RIC", "Receiver in canal"], ["BTE", "Behind the ear"], ["ITE", "In the ear"], ["ITC", "In the canal"], ["CIC", "Completely in canal"], ["IIC", "Invisible in canal"]];
const CODES = { CIC: ["V5254","V5258"], IIC: ["V5254","V5258"], ITC: ["V5255","V5259"], ITE: ["V5256","V5260"], BTE: ["V5257","V5261"], RIC: ["V5257","V5261"] };

export const money = (n) => "$" + n.toLocaleString("en-US");
export const fits = (fam, st) => fam === st || fam === "ALL" || (fam === "CUSTOM" && ["ITE","ITC","CIC","IIC"].includes(st));
export const isCros = (m) => /CROS/i.test(m[1]);
export const styleAvailable = (mfr, st) => MODELS.some((m) => m[0] === mfr && fits(m[3], st));
export const modelsFor = (mfr, st) => MODELS.map((m, i) => [m, i]).filter(([m]) => m[0] === mfr && fits(m[3], st));

export function billingCode(s) {
  const m = s.model == null ? null : MODELS[s.model];
  if (!m || !s.style) return "";
  if (isCros(m)) return s.n === 2 ? "V5211–V5221 (CROS/BiCROS)" : "V5171–V5181 (CROS/BiCROS)";
  return CODES[s.style][s.n === 2 ? 1 : 0];
}

export function quoteLines(s) {
  const m = s.model == null ? null : MODELS[s.model];
  if (!m || !s.n) return [];
  const k = s.n === 2 ? 1 : 0;
  const out = [{ label: `${s.n === 2 ? "Hearing aids (pair)" : "Hearing aid"} · Tier ${m[4]}`, sub: `${m[0]} ${m[1]} · ${m[2]}`, amount: TIERS[m[4]][k] }];
  if (s.incl === "all") {
    out.push({ label: "Fitting, orientation & dispense", sub: s.n === 2 ? "Two aids" : "One aid", amount: FEES.fit[k] });
    out.push({ label: "Shipping & handling", sub: "", amount: FEES.ship });
  }
  if (s.molds) out.push({ label: s.molds === 2 ? "Earmolds (two)" : "Earmold (one)", sub: "", amount: FEES.molds[s.molds] });
  (ADDONS[s.mfr] || []).forEach(([nm, p]) => { if (s.addons.includes(nm)) out.push({ label: nm, sub: "Add-on", amount: p }); });
  return out;
}
export const quoteTotal = (s) => quoteLines(s).reduce((a, l) => a + l.amount, 0);
