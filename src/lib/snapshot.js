/* The page exactly as it was loaded, captured before the app draws anything. "Save updated app"
   writes a copy of it with the new prices in it. Imported first in main.jsx. */
export const PAGE = document.documentElement.cloneNode(true);
export const DOCTYPE = document.doctype ? new XMLSerializer().serializeToString(document.doctype) + "\n" : "";
