/* "Print contract": BHSC's Hearing Aid Fitting, Orientation and Purchase Agreement (src/assets/
   purchase-agreement.pdf) with page 2 filled in from the estimate: III. Supplies and Accessories and the
   Patient Charges Summary. The rest of the form is left for staff and the patient to fill by hand.
   The PDF is optional, like costs.json: a copy built without it hides the button. Positions are in PDF
   points from the top-left of page 2 (612 × 792), measured on the 1/13/26 form. */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { quoteParts } from "@/lib/pricing";

const FILES = import.meta.glob("../assets/purchase-agreement.pdf", { eager: true, query: "?url", import: "default" });
export const CONTRACT_URL = Object.values(FILES)[0] || null;

const H = 792, INK = rgb(0.06, 0.16, 0.46);
const BOX = { mold1: 36, mold2: 288, other: 36, fit595: 255.1, fit845: 324.1 };
const BASE = { molds: 403, other: 462.5, fit: 563 };              // baselines of the checkbox rows
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

  // III. Supplies and Accessories
  if (s.molds === 1) tick(BOX.mold1, BASE.molds);
  if (s.molds === 2) tick(BOX.mold2, BASE.molds);
  if (s.addons.length) {
    tick(BOX.other, BASE.other);
    const one = s.addons.length === 1 || s.addons.every((a) => a.price === s.addons[0].price);
    text(s.addons.map((a) => a.name).join(", "), 220, 461, 105, 10);
    if (one) text(num(s.addons[0].price), 384, 461, 50);
    text(String(s.addons.length), 449, 461, 11, 10);
    text(num(q.acc), 507, 461, 46);
  }
  text(num(q.supplies), 250, 489, 86);

  // Patient Charges Summary
  if (s.incl === "all") tick(s.n === 2 ? BOX.fit845 : BOX.fit595, BASE.fit);
  text(num(q.aids), 264, 589.5, 84);
  text(num(q.supplies), 264, 617, 84);
  text(num(q.total), 227, 727, 94);

  return new Blob([await pdf.save()], { type: "application/pdf" });
}
