/* "Update prices": reading a pasted manufacturer price list, working out what changed, the admin PIN,
   and saving an updated copy of the app. The list readers follow build/build_data.py, which built the
   app's prices from the same lists, so a pasted list lines up with the models the app already has. */
import { MODELS, RAW, PRICE_LISTS, SAVED, modelKey, tierFor } from "@/lib/pricing";
import { sha256 } from "@/lib/sha256";
import { PAGE, DOCTYPE } from "@/lib/snapshot";

const toNum = (s) => parseFloat(String(s).replace(/[$,\s]/g, ""));
const words = (s) => s.replace(/\b([a-z])([a-z]*)/gi, (_, a, b) => a.toUpperCase() + b.toLowerCase());

/* Each reader returns { rows: [{ model, style, fam, cost, line }], other: [lines it couldn't use] }.
   model/style are written the way the price list writes them (as stored in RAW). */
function readOticon(text) {
  const rows = [], other = [], seen = new Set();
  let sec = null;
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.replace(/\s+/g, " ").trim();
    if (!l) continue;
    if (/Price Entries/i.test(l)) { sec = l.split(" ")[0]; continue; }
    const m = l.match(/^(.*?) \$([\d.,]+) \$([\d.,]+)$/);
    if (!m) continue;
    const left = m[1], cost = toNum(m[3]);
    let model, style, fam;
    if (sec === "Accessory") { if (!left.startsWith("CROS")) continue; model = "Oticon " + left; style = "CROS transmitter"; fam = "RIC"; }
    else if (sec === "Custom") { model = left; style = "Custom (ITE/ITC/CIC/IIC)"; fam = "CUSTOM"; }
    else if (sec === "NXT") { if (/Binaural/.test(left) || !/(Left|Right)$/.test(left)) continue; model = "Zeal 1"; style = "nxtCIC R (per ear)"; fam = "CIC"; }
    else {
      const mm = left.match(/^(.*? \d) (miniRITE|miniBTE|BTE|Power Plus)\s*(.*)$/);
      if (!mm) { other.push(l); continue; }
      model = mm[1]; fam = mm[2] === "miniRITE" ? "RIC" : "BTE"; style = `${mm[2]} ${mm[3]}`.trim();
    }
    const k = `${model}|${fam}|${style}`;
    if (seen.has(k)) continue;
    seen.add(k);
    rows.push({ model, style, fam, cost, line: l });
  }
  return { rows, other };
}

const STARKEY_FAM = { RIC: "RIC", MRIC: "RIC", BTE: "BTE", CIC: "CIC", IIC: "IIC", ITC: "ITC", ITE: "ITE", HS: "ITE" };
function readStarkey(text) {
  const rows = [], other = [];
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.replace(/\s+/g, " ").trim();
    const m = l.match(/^(OMEGA AI|EDGE AI|EVOLV AI|G SERIES AI|GENESIS AI|SIGNATURE|[A-Z][A-Z ]*? AI) (\S+(?: nw)?) (\S+)(?: (STD|PWRPLS))? \$[\d,.]+ \$[\d,.]+ \$([\d,.]+)/);
    if (!m) { if ((l.match(/\$/g) || []).length >= 3) other.push(l); continue; }
    const [, family, tech, st, gain, cost] = m;
    const fam = STARKEY_FAM[st.split(".")[0]];
    if (!fam) { other.push(l); continue; }
    const model = `${words(family).replace(/ Ai\b/, " AI")} ${tech === "crosbicros" ? "CROS/BiCROS" : tech.replace(" nw", " NW")}`;
    rows.push({ model, style: st + (gain === "PWRPLS" ? " Power Plus" : ""), fam, cost: toNum(cost), line: l });
  }
  return { rows, other };
}

function readPhonak(text) {
  const rows = [], other = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    // Cells copied from Excel are tab-separated: Product, List Price, Net Price
    let cells = raw.split("\t").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) { const m = raw.trim().match(/^(.+?)\s+\$?([\d,]+(?:\.\d+)?)\s+\$?([\d,]+(?:\.\d+)?)\s*$/); if (m) cells = [m[1], m[2], m[3]]; }
    const nums = cells.slice(1).map(toNum).filter((n) => !Number.isNaN(n));
    if (!cells[0] || !nums.length) continue;
    const name = cells[0].replace("Phonak Virto", "Virto"), cost = nums[nums.length > 1 ? 1 : 0];
    let fam, style;
    if (name.startsWith("Audeo")) { fam = "RIC"; style = "RIC"; }
    else if (/^CROS [A-Z](-R)?$/.test(name)) { fam = "RIC"; style = "CROS (RIC)"; }
    else if (/^(Naida|Sky)/.test(name)) { fam = "BTE"; style = "BTE"; }
    else if (name.startsWith("Virto")) { fam = "CUSTOM"; style = "Custom (ITE/ITC/CIC/IIC)"; }
    else { other.push(raw.trim()); continue; }
    rows.push({ model: name, style, fam, cost, line: raw.trim() });
  }
  return { rows, other };
}

// ReSound's list is a scanned image, so its prices are typed in: one "Model  price" per line
function readResound(text) {
  const rows = [], other = [];
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l) continue;
    const m = l.match(/^(.+?)\s+\$?([\d,]+(?:\.\d+)?)$/);
    if (!m) { other.push(l); continue; }
    rows.push({ model: m[1], style: "All styles (one price per level)", fam: "ALL", cost: toNum(m[2]), line: l });
  }
  return { rows, other };
}

const READERS = { Oticon: readOticon, Starkey: readStarkey, Phonak: readPhonak, ReSound: readResound };

/* How the app shows a style (same as label() in build/build_web.py). */
export function styleLabel(mfr, model, style, fam) {
  if (mfr === "Oticon") return style.startsWith("Custom") ? "Custom · ITE / ITC / CIC / IIC" : style;
  if (mfr === "Starkey") return style.replace("MRIC", "mini RIC").replace("HS.", "Half shell.").replace(".R", " · rechargeable")
    .replace(".312", " · 312 battery").replace(".10", " · 10 battery").replace(".13", " · size 13");
  if (mfr === "Phonak") return { RIC: "RIC", BTE: "BTE", "CROS (RIC)": "CROS · RIC" }[style] || (fam === "CUSTOM" ? "Custom · ITE / ITC / CIC / IIC" : style);
  return "All styles · one price per level";
}

const round2 = (n) => Math.round(n * 100) / 100;

/** Compare a pasted list with the app's current prices for one manufacturer. */
export function readPriceList(mfr, text) {
  const { rows, other } = READERS[mfr](text);
  const byRaw = new Map(Object.entries(RAW).filter(([k]) => MODELS.some((m) => m[0] === mfr && modelKey(m[0], m[1], m[2]) === k)).map(([k, r]) => [r, k]));
  const rowsByKey = new Map(MODELS.map((m) => [modelKey(m[0], m[1], m[2]), m]));
  const found = new Set(), changes = [], added = [];
  for (const r of rows) {
    const raw = `${r.model}|${r.style}`, label = styleLabel(mfr, r.model, r.style, r.fam), k = modelKey(mfr, r.model, label);
    // a model added by hand, or one from an older list, has no list wording yet: match it by name and style
    const key = byRaw.get(raw) || (rowsByKey.has(k) && !RAW[k] ? k : null);
    if (key) {
      if (found.has(key)) continue;
      found.add(key);
      const m = rowsByKey.get(key);
      if (m[7] == null || Math.abs(m[7] - r.cost) >= 0.005 || m[5])
        changes.push({ type: "price", key, mfr, name: m[1], style: m[2], fam: m[3], raw, older: !!m[5], oldCost: m[7], newCost: round2(r.cost), oldTier: m[4], newTier: tierFor(r.cost) });
    } else {
      if (rowsByKey.has(k) || added.some((a) => a.key === k)) continue;
      added.push({ type: "new", key: k, mfr, name: r.model, style: label, fam: r.fam, raw, newCost: round2(r.cost), newTier: tierFor(r.cost), add: true });
    }
  }
  const current = MODELS.filter((m) => m[0] === mfr && !m[5]);
  const missing = current.filter((m) => !found.has(modelKey(m[0], m[1], m[2])))
    .map((m) => ({ type: "missing", key: modelKey(m[0], m[1], m[2]), mfr, name: m[1], style: m[2], fam: m[3], oldCost: m[7], oldTier: m[4], remove: false }));
  return { read: rows.length, matched: found.size, total: current.length, changes, added, missing, other };
}

/* ── Admin PIN (scrambled with a salt; starts as 0000 until changed) ── */
const DEFAULT_PIN = { salt: "bhsc", hash: sha256("bhsc:0000") };
const STATE = { pin: SAVED?.pin || null };
export const pinRecord = () => STATE.pin || DEFAULT_PIN;
export const checkPin = (pin, rec = pinRecord()) => sha256(`${rec.salt}:${pin}`) === rec.hash;
export function makePin(pin) {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
  return { salt, hash: sha256(`${salt}:${pin}`) };
}

/* ── Saving: the updated prices go into a copy of this page ── */
const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** The app's data after applying the staged changes (also used to update the open page). */
export function nextData({ changes, pin, brands }) {
  const apply = new Map(changes.filter((c) => c.type === "price").map((c) => [c.key, c]));
  const drop = new Set(changes.filter((c) => c.type === "missing" && c.remove).map((c) => c.key));
  const models = [], costs = {}, raw = { ...RAW };
  for (const m of MODELS) {
    const key = modelKey(m[0], m[1], m[2]);
    if (drop.has(key)) { delete raw[key]; continue; }
    const c = apply.get(key), cost = c ? c.newCost : m[7];
    models.push([m[0], m[1], m[2], m[3], c ? c.newTier : m[4], c ? 0 : m[5], m[6]]);
    if (cost != null) costs[key] = cost;
    if (c?.raw && !raw[key]) raw[key] = c.raw;
  }
  for (const c of changes.filter((x) => x.type === "new" && x.add)) {
    models.push([c.mfr, c.name, c.style, c.fam, c.newTier, 0, 0]);
    costs[c.key] = c.newCost;
    if (c.raw) raw[c.key] = c.raw;
  }
  const lists = { ...PRICE_LISTS };
  brands.forEach((b) => { lists[b] = today(); });
  return { v: 1, updated: today(), lists, models, costs, raw, pin: pin || STATE.pin || undefined };
}

/** A copy of this page (as loaded) with `data` built in, replacing an earlier saved block if there is one. */
export function savedPage(data) {
  const root = PAGE.cloneNode(true), head = root.querySelector("head");
  let el = root.querySelector("#bhsc-data");
  if (!el) {
    el = document.createElement("script");
    el.type = "application/json";
    el.id = "bhsc-data";
    head.insertBefore(el, head.firstChild);
  }
  el.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
  return DOCTYPE + root.outerHTML;
}

export function downloadPage(html, name = "BHSC-Amplification-Estimate.html") {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Load new data into the open page (so the other tabs show the new prices right away). */
export function useData(data) {
  MODELS.length = 0;
  data.models.forEach((m) => MODELS.push([...m, data.costs[modelKey(m[0], m[1], m[2])] ?? null]));
  Object.keys(RAW).forEach((k) => delete RAW[k]);
  Object.assign(RAW, data.raw);
  Object.assign(PRICE_LISTS, data.lists);
  if (data.pin) STATE.pin = data.pin;
}
