/* Shared price updates: the `models` collection in this artifact's database.
   Everyone with the link reads it; only editors write it (see the rules in the publish call). */
import { useEffect, useState } from "react";
import { applyUpdates } from "@/lib/pricing";

export function usePriceStore() {
  // hosted: running on claude.ai, where the shared storage exists (false on GitHub Pages or a local copy)
  const [state, setState] = useState({ db: null, docs: [], version: 0, canWrite: null, ready: false, hosted: false });
  useEffect(() => {
    let unsub = null, dead = false;
    (async () => {
      const claude = typeof window !== "undefined" ? window.claude : null;
      if (!claude || typeof claude.use !== "function") { setState((s) => ({ ...s, ready: true })); return; }
      setState((s) => ({ ...s, hosted: true }));
      const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
      if (dead) return;
      let canWrite = null;
      try { canWrite = user ? await user.canEdit() : null; } catch { canWrite = null; }
      if (!db) { setState((s) => ({ ...s, ready: true, canWrite })); return; }
      unsub = db.collection("models").onSnapshot(
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          applyUpdates(docs);
          setState((s) => ({ ...s, db, docs, version: s.version + 1, canWrite, ready: true }));
        },
        () => setState((s) => ({ ...s, db: null, ready: true })),
      );
      setState((s) => ({ ...s, db, canWrite }));
    })();
    return () => { dead = true; unsub && unsub(); };
  }, []);
  return state;
}
