/* Read an uploaded price list in the browser. Nothing is uploaded or stored:
   the file is turned into text (PDF text layer, spreadsheet cells) or, for scanned PDFs and
   photos, into page images, and only that goes to Claude for extraction. */
import * as pdfjs from "pdfjs-dist/legacy/build/pdf";
import workerCode from "pdfjs-dist/legacy/build/pdf.worker.min.js?raw";
import * as XLSX from "xlsx";

let workerReady = false;
function pdfWorker() {
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([workerCode], { type: "text/javascript" }));
    workerReady = true;
  }
}

async function pdfToContent(file, maxImages) {
  pdfWorker();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    // Rebuild lines from text items by their vertical position.
    const rows = new Map();
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5]);
      const key = [...rows.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      (rows.get(key) || rows.set(key, []).get(key)).push([it.transform[4], it.str]);
    }
    const lines = [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, cells]) => cells.sort((a, b) => a[0] - b[0]).map((c) => c[1].trim()).join("  "));
    pages.push(lines.join("\n"));
  }
  const text = pages.join("\n\n--- page ---\n\n");
  if (text.replace(/\s/g, "").length > 200) return { kind: "text", text, pages: doc.numPages };
  // Scanned PDF (no text layer): render pages as images.
  const blobs = [];
  for (let i = 1; i <= Math.min(doc.numPages, maxImages); i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
    blobs.push(await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.9)));
  }
  return { kind: "images", blobs, pages: doc.numPages, skipped: Math.max(0, doc.numPages - maxImages) };
}

function sheetToContent(buf) {
  const wb = XLSX.read(buf, { type: "array" });
  const text = wb.SheetNames.map((n) => `### Sheet: ${n}\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n], { blankrows: false })).join("\n\n");
  return { kind: "text", text, pages: wb.SheetNames.length };
}

export async function readPriceList(file, { maxImages = 5 } = {}) {
  const name = (file.name || "").toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return pdfToContent(file, maxImages);
  if (/\.(xlsx|xlsm|xls|csv|tsv|ods)$/.test(name)) return sheetToContent(new Uint8Array(await file.arrayBuffer()));
  if (file.type.startsWith("image/")) return { kind: "images", blobs: [file], pages: 1 };
  if (file.type.startsWith("text/")) return { kind: "text", text: await file.text(), pages: 1 };
  throw new Error("unsupported");
}

/* Split long text into pieces Claude can read in one call (the prompt cap is 64 KiB). */
export function chunks(text, size = 38000) {
  const out = [];
  for (let i = 0; i < text.length; i += size) {
    let end = Math.min(text.length, i + size);
    if (end < text.length) { const nl = text.lastIndexOf("\n", end); if (nl > i + size * 0.6) end = nl; }
    out.push(text.slice(i, end)); i = end - size;
  }
  return out;
}
