/* Copy text to the clipboard. Browsers block the Clipboard API on a plain-http page (a common way to
   host on an internal network), so fall back to the older copy command, which still works there.
   Resolves true when the text was copied. */
export async function copyText(text) {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    Object.assign(ta.style, { position: "fixed", top: "0", left: "0", opacity: "0" });
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch { return false; }
}
