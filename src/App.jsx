import { useState } from "react";
import { Columns3, PanelLeft, ReceiptText, RefreshCw, Tags } from "lucide-react";
import Estimate from "@/Estimate";
import HAPrices from "@/HAPrices";
import Compare from "@/Compare";
import UpdatePrices from "@/UpdatePrices";
import { BHSC_LOGO } from "@/components/ios";
import { cn } from "@/lib/utils";
import { MFRS, PRICE_LISTS, PRICES_UPDATED, HAS_COSTS } from "@/lib/pricing";
import { Drawer as SideDrawer } from "@/components/ui/side-drawer";
import { BlurFade } from "@/components/ui/blur-fade";

// The Medicaid tab (Medicaid.jsx) is off for now at BHSC's request; add it back here to bring it back.
// "Update prices" (admin PIN) saves a copy of the page with new prices built in; it needs BHSC's costs,
// so a copy built without them (the public one) doesn't have it.
const TABS = [["estimate", "Estimate", ReceiptText], ["compare", "Compare prices", Columns3], ["haprices", "2026 HA prices", Tags],
  ...(HAS_COSTS ? [["update", "Update prices", RefreshCw]] : [])];

export default function App() {
  const [tab, setTab] = useState("estimate");
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(null);
  // bumped after new prices are saved, so the other tabs start over with them
  const [version, setVersion] = useState(0);
  const [updated, setUpdated] = useState(PRICES_UPDATED);
  const go = (t) => { setTab(t); setOpen(false); window.scrollTo(0, 0); };

  const menu = (
    <button type="button" onClick={() => setOpen(true)} aria-label="Show sidebar" aria-expanded={open}
      className="press -ml-2 mr-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint">
      <PanelLeft className="h-[22px] w-[22px]" strokeWidth={2} />
    </button>
  );

  return (
    <>
      {/* Sidebar: 21st.dev #23558 drawer (components/ui/side-drawer.tsx). It springs in from the left;
          drag its header back, tap outside, press Escape or pick a tab to close it. */}
      <SideDrawer open={open} onOpenChange={setOpen} side="left" width={280} title="Amplification" description="Buffalo Hearing & Speech Center"
        className="pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)]">
        <img src={BHSC_LOGO} alt="BHSC" className="bhsc-logo mb-4 ml-1 mt-1 block h-auto w-[104px]" draggable="false" />
        <nav aria-label="Sections" className="flex flex-col gap-1">
          {TABS.map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => go(id)} aria-current={tab === id ? "page" : undefined}
              className={cn("press flex items-center gap-3 rounded-[10px] px-3 py-3 text-[17px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint",
                tab === id ? "bg-tint-soft text-tint" : "text-label hover:bg-fill")}>
              <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={tab === id ? 2.3 : 1.9} />{label}
            </button>
          ))}
        </nav>
      </SideDrawer>

      <div hidden={tab !== "estimate"}><Estimate key={version} menu={menu} seed={seed} /></div>
      {/* Compare stays mounted so the options are still there after a trip to the estimate */}
      <div hidden={tab !== "compare"}><Compare key={version} menu={menu} onUse={(pick) => { setSeed({ ...pick }); go("estimate"); }} /></div>
      {tab === "haprices" && <BlurFade key={`haprices-${version}`}><HAPrices menu={menu} /></BlurFade>}
      {HAS_COSTS && <div hidden={tab !== "update"}><UpdatePrices menu={menu} onSaved={(d) => { setSeed(null); setUpdated(d.updated); setVersion((v) => v + 1); }} /></div>}
      {/* Version line: which price lists this copy uses and when it was built */}
      <footer className="mx-auto max-w-2xl px-4 pb-28 pt-2 text-[12px] leading-snug text-label3 lg:max-w-6xl lg:pb-6">
        BHSC Amplification Estimate · 2026 tier pricing · Price lists: {MFRS.map(([m]) => `${m} ${PRICE_LISTS[m] || "2026"}`).join(", ")}{updated ? ` · Prices updated ${updated}` : ""} · Built {__BUILD_DATE__}
      </footer>
    </>
  );
}
