/* "Print contract": BHSC's Hearing Aid Fitting, Orientation and Purchase Agreement (src/assets/
   purchase-agreement.pdf) with page 2 filled in from the estimate: III. Supplies and Accessories and the
   Patient Charges Summary, plus the billing code boxes at the top of page 2, and page 1 sections I (fitting and dispense) and II
   (hearing aid table, Tier #, Total Hearing Aid(s)). Serial numbers and warranty dates are left blank. The rest of the
   form is left for staff and the patient to fill by hand.
   The PDF is optional, like costs.json: a copy built without it hides the button. Positions are in PDF
   points from the top-left of page 2 (612 × 792), measured on the 1/13/26 form. */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { FEES, POLICY, dispenseFee, quoteParts, billingBoxes, earsInUse, earModel, mixed } from "@/lib/pricing";

const FILES = import.meta.glob("../assets/purchase-agreement.pdf", { eager: true, query: "?url", import: "default" });
export const CONTRACT_URL = Object.values(FILES)[0] || null;

const H = 792, INK = rgb(0, 0, 0);
const BOX = { mold1: 36, mold2: 288, other: 36, fit595: 255.1, fit845: 324.1 };
const BASE = { molds: 403, other: 462.5, fit: 563 };              // baselines of the checkbox rows
// Top of page 2: billing code boxes (x of the box, baseline of its row) and the L / R letters to circle
const MONO = { CIC: 130.6, ITC: 146.5, ITE: 162.5, BTE: 178.5 }, BIN_X = 327.1, LR = { L: 117.5, R: 156.3 };
const CROS_MONO_Y = { ITE: 249.9, ITC: 265.8, BTE: 281.8 };
const CROS_BIN_Y = { "ITE/ITE": 265.8, "ITE/ITC": 281.8, "ITE/BTE": 297.8, "ITC/ITC": 313.7, "ITC/BTE": 329.7, "BTE/BTE": 345.6 };
// Page 1: section I lines/boxes, section II table rows and columns
const P1 = { mono: 425.5, bin: 512.6, dispX: 360.1, disp: { V5241: 468.7, V5200: 484.6, V5160: 554.6, V5240: 570.5 } };
const ROWS = [661.2, 680.2, 701], COL = { ear: 46, mfr: 76, model: 192, battery: 422 };
const battery = (m) => {
  const t = `${m[1]} ${m[2]}`;
  if (/rechargeable|sphere/i.test(t) || /(^|[\s-])R$/.test(m[1]) || /\sR$/.test(m[2])) return "Rechargeable";
  if (/\b312\b/.test(t)) return "312";
  if (/size 13|(^|[\s.-])13\b/.test(t)) return "13";
  if (/10 battery|\.10\b/.test(t)) return "10";
  return "";
};
// Fees printed on the 1/13/26 form: [page, x of "$", right edge, baseline, printed amount, current amount, bold].
// When BHSC's fee differs (Update prices → BHSC prices & fees), the printed amount is covered and the current one
// printed in its place, as for the earmolds; with the 2026 fees nothing is covered.
const PRINTED = () => [
  [0, 66.0, 90.0, 425.5, 595, FEES.fit[0], true], [0, 264.0, 282.0, 453.1, 55, POLICY.codes[2]], [0, 263.7, 287.7, 468.7, 160, POLICY.codes[1]],
  [0, 540.1, 564.1, 468.7, 250, dispenseFee(0)], [0, 264.0, 288.0, 484.6, 130, POLICY.codes[0]], [0, 540.1, 564.1, 484.6, 250, dispenseFee(0)],
  [0, 66.0, 90.0, 512.6, 845, FEES.fit[1], true], [0, 273.5, 291.5, 539.0, 55, POLICY.codes[2]], [0, 272.7, 296.7, 554.6, 160, POLICY.codes[1]],
  [0, 540.1, 564.1, 554.6, 500, dispenseFee(1)], [0, 273.0, 297.0, 570.5, 130, POLICY.codes[0]], [0, 540.1, 564.1, 570.5, 500, dispenseFee(1)],
  [1, 268.6, 294.5, 563.0, 595, FEES.fit[0]], [1, 337.6, 363.5, 563.0, 845, FEES.fit[1]],
];
const num = (v) => v.toLocaleString("en-US", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });

export async function contractBlob(s) {
  const q = quoteParts(s);
  const pdf = await PDFDocument.load(await (await fetch(CONTRACT_URL)).arrayBuffer());
  const page = pdf.getPage(1);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const text = (t, x, baseline, max, size = 11) => {
    let sz = size;
    while (max && sz > 6.5 && font.widthOfTextAtSize(t, sz) > max) sz -= 0.5;
    page.drawText(t, { x, y: H - baseline, size: sz, font, color: INK });
  };
  const tick = (x0, baseline) =>
    page.drawSvgPath("M 2 5.6 L 4.7 8.6 L 9.6 1.2", { x: x0, y: H - (baseline - 10), borderColor: INK, borderWidth: 1.6 });

  // The form prints earmolds at $100 / $200; BHSC charges FEES.molds ($115 / $215). Cover the printed
  // prices and print the current ones in the form's own font, so the ticked box matches the totals.
  const times = await pdf.embedFont(StandardFonts.TimesRoman);
  [[178.8, 1], [435.5, 2]].forEach(([x, n]) => {
    page.drawRectangle({ x: x - 0.5, y: H - 406, width: 26, height: 14, color: rgb(1, 1, 1) });
    page.drawText(`$${FEES.molds[n]}`, { x, y: H - 403, size: 12, font: times, color: rgb(0, 0, 0) });
  });

  const timesBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  PRINTED().forEach(([pg, x0, x1, baseline, printed, now, isBold]) => {
    if (now === printed) return;
    const f = isBold ? timesBold : times, t = `$${num(now)}`, room = x1 - x0 + 3;
    let sz = 12;
    while (sz > 7 && f.widthOfTextAtSize(t, sz) > room) sz -= 0.5;
    const pp = pdf.getPage(pg);
    pp.drawRectangle({ x: x0 - 0.5, y: H - baseline - 3, width: x1 - x0 + 1.5, height: 14, color: rgb(1, 1, 1) });
    pp.drawText(t, { x: x0, y: H - baseline, size: sz, font: f, color: INK });
  });

  // Top of page 2: the hearing aid billing code
  const bb = billingBoxes(s);
  bb.mono.forEach((m) => {
    tick(36, MONO[m.fam]);
    if (m.ear) page.drawEllipse({ x: LR[m.ear], y: H - (MONO[m.fam] - 4.3), xScale: 6.5, yScale: 7.5, borderColor: INK, borderWidth: 1 });
  });
  if (bb.bin) tick(BIN_X, MONO[bb.bin]);
  if (bb.crosMono) tick(36, CROS_MONO_Y[bb.crosMono]);
  if (bb.crosBin) tick(360.1, CROS_BIN_Y[bb.crosBin]);

  // III. Supplies and Accessories
  if (s.molds === 1) tick(BOX.mold1, BASE.molds);
  if (s.molds === 2) tick(BOX.mold2, BASE.molds);
  if (s.addons.length) {
    tick(BOX.other, BASE.other);
    if (s.addons.length === 1) {
      text(s.addons[0].name, 220, 461, 105, 10);
      text(num(s.addons[0].price), 384, 461, 50);
    } else {
      // Several accessories: the form has one line, so list each with its price beside the section heading
      text(s.addons.map((a) => `${a.name} $${num(a.price)}`).join("  ·  "), 195, 373, 385, 9.5);
      text(`${s.addons.length} accessories (listed above)`, 220, 461, 105, 9);
      text("see above", 384, 461, 50, 9);
    }
    text(String(s.addons.length), 449, 461, 11, 10);
    text(num(q.acc), 507, 461, 46);
  }
  text(num(q.supplies), 250, 489, 86);

  // Patient Charges Summary
  if (s.incl === "all") tick(s.n === 2 ? BOX.fit845 : BOX.fit595, BASE.fit);
  text(num(q.aids), 264, 589.5, 84);
  text(num(q.supplies), 264, 617, 84);
  // Total Charges upon Dispense: larger and bold so it stands out
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText(num(q.total), { x: 227, y: H - 728, size: 15, font: bold, color: INK });

  // Page 1 — I. Fitting, Orientation & Dispense Fees (only when the fitting is part of the order)
  const p1 = pdf.getPage(0);
  const text1 = (t, x, baseline, max, size = 10) => {
    let sz = size;
    while (max && sz > 6.5 && font.widthOfTextAtSize(t, sz) > max) sz -= 0.5;
    p1.drawText(t, { x, y: H - baseline, size: sz, font, color: INK });
  };
  const tick1 = (x0, baseline) =>
    p1.drawSvgPath("M 2 5.6 L 4.7 8.6 L 9.6 1.2", { x: x0, y: H - (baseline - 10), borderColor: INK, borderWidth: 1.6 });
  if (s.incl === "all") {
    tick1(44, s.n === 2 ? P1.bin : P1.mono);
    tick1(P1.dispX, P1.disp[bb.crosMono ? "V5200" : bb.crosBin ? "V5240" : s.n === 2 ? "V5160" : "V5241"]);
  }

  // II. Hearing Aid(s): one row per ear; serial number and warranty expiration left blank
  const ears = earsInUse(s);
  const rows = s.n === 1 ? [[s.aidEar || "", ears[0]]] : [["R", ears[0]], ["L", mixed(s) ? ears[1] : ears[0]]];
  rows.forEach(([ear, e], i) => {
    const m = earModel(e);
    // the battery has its own column, so leave it out of the model text
    const style = (["ALL", "CUSTOM"].includes(m[3]) ? e.style : m[2]).replace(/\s*·\s*(rechargeable|312 battery|10 battery|size 13)\b/gi, "");
    text1(ear, COL.ear, ROWS[i], 20);
    text1(m[0], COL.mfr, ROWS[i], 108);
    text1(`${m[1]} · ${style}`, COL.model, ROWS[i], 105);
    text1(battery(m), COL.battery, ROWS[i], 70);
  });
  const tiers = rows.map(([ear, e]) => [ear, earModel(e)[4]]);
  tick1(116.7, 762.4);
  text1(tiers[1] && tiers[1][1] !== tiers[0][1] ? tiers.map(([ear, t]) => `${ear} ${t}`).join(" · ") : String(tiers[0][1]), 171, 761, 120, 11);
  text1(num(q.aids), 450, 761, 92, 11);

  return new Blob([await pdf.save()], { type: "application/pdf" });
}
