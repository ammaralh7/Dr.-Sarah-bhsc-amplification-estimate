import { useEffect, useState } from "react";
import { FileText, PanelLeft, ReceiptText, ShieldPlus } from "lucide-react";
import Estimate from "@/Estimate";
import PriceLists from "@/PriceLists";
import Medicaid from "@/Medicaid";
import { NavBar, ThemeButton, BHSC_LOGO } from "@/components/ios";
import { usePriceStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const TABS = [["estimate", "Estimate", ReceiptText], ["medicaid", "Medicaid", ShieldPlus], ["prices", "Price lists", FileText]];

export default function App() {
  const [tab, setTab] = useState("estimate");
  const [open, setOpen] = useState(false);
  const store = usePriceStore();
  const [sample, setSample] = useState(null);
  useEffect(() => { window.claude?.use?.("sample").then((s) => setSample(() => s), () => {}); }, []);
  useEffect(() => {
    if (!open) return;
    const key = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  const go = (t) => { setTab(t); setOpen(false); window.scrollTo(0, 0); };
  // Price lists saves to claude.ai's shared storage, so it only shows in the clinic's claude.ai version
  const tabs = TABS.filter(([id]) => id !== "prices" || store.hosted);

  const menu = (
    <button type="button" onClick={() => setOpen(true)} aria-label="Show sidebar" aria-expanded={open}
      className="press -ml-2 mr-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint">
      <PanelLeft className="h-[22px] w-[22px]" strokeWidth={2} />
    </button>
  );

  return (
    <>
      {/* Hidden sidebar: slides in over the page from the sidebar button, away on a tab or outside tap */}
      <div className={cn("fixed inset-0 z-[60] bg-black/30 transition-opacity duration-300", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={() => setOpen(false)} aria-hidden="true" />
      <nav aria-label="Sections" aria-hidden={!open} inert={!open ? "" : undefined}
        className={cn("drawer fixed bottom-0 left-0 top-0 z-[61] flex w-[280px] max-w-[85vw] flex-col gap-1 bg-bg px-3",
          open ? "translate-x-0 shadow-[0_0_40px_rgba(0,0,0,0.25)]" : "invisible -translate-x-full")}
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="mb-4 flex items-center justify-between px-2">
          <div>
            <img src={BHSC_LOGO} alt="BHSC" className="bhsc-logo block h-auto w-[104px]" draggable="false" />
            <div className="mt-2 text-[15px] font-semibold tracking-[-0.01em] text-label2">Amplification</div>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Hide sidebar"
            className="press inline-flex h-11 w-11 items-center justify-center rounded-full text-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint">
            <PanelLeft className="h-[22px] w-[22px]" strokeWidth={2} />
          </button>
        </div>
        {tabs.map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => go(id)} aria-current={tab === id ? "page" : undefined}
            className={cn("press flex items-center gap-3 rounded-[10px] px-3 py-3 text-[17px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint",
              tab === id ? "bg-tint-soft text-tint" : "text-label hover:bg-fill")}>
            <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={tab === id ? 2.3 : 1.9} />{label}
          </button>
        ))}
      </nav>

      <div hidden={tab !== "estimate"}><Estimate version={store.version} menu={menu} /></div>
      <div hidden={tab !== "medicaid"}><Medicaid menu={menu} /></div>
      {tab === "prices" && store.hosted && (
        <div className="min-h-screen pb-16">
          <NavBar title="Price lists" subtitle="Upload a new list or add a model" right={<ThemeButton />} left={menu} />
          <div key="prices" className="arrive"><PriceLists store={store} sample={sample} /></div>
        </div>
      )}
    </>
  );
}
