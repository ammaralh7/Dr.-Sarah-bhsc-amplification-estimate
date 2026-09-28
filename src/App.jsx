import { useEffect, useState } from "react";
import { FileText, PanelLeft, ReceiptText, ShieldPlus } from "lucide-react";
import Estimate from "@/Estimate";
import PriceLists from "@/PriceLists";
import Medicaid from "@/Medicaid";
import { NavBar, ThemeButton, BHSC_LOGO } from "@/components/ios";
import { usePriceStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Drawer as SideDrawer } from "@/components/ui/side-drawer";
import { BlurFade } from "@/components/ui/blur-fade";

const TABS = [["estimate", "Estimate", ReceiptText], ["medicaid", "Medicaid", ShieldPlus], ["prices", "Price lists", FileText]];

export default function App() {
  const [tab, setTab] = useState("estimate");
  const [open, setOpen] = useState(false);
  const store = usePriceStore();
  const [sample, setSample] = useState(null);
  useEffect(() => { window.claude?.use?.("sample").then((s) => setSample(() => s), () => {}); }, []);
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
      {/* Sidebar: 21st.dev #23558 drawer (components/ui/side-drawer.tsx). It springs in from the left;
          drag its header back, tap outside, press Escape or pick a tab to close it. */}
      <SideDrawer open={open} onOpenChange={setOpen} side="left" width={280} title="Amplification" description="Buffalo Hearing & Speech Center"
        className="pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)]">
        <img src={BHSC_LOGO} alt="BHSC" className="bhsc-logo mb-4 ml-1 mt-1 block h-auto w-[104px]" draggable="false" />
        <nav aria-label="Sections" className="flex flex-col gap-1">
          {tabs.map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => go(id)} aria-current={tab === id ? "page" : undefined}
              className={cn("press flex items-center gap-3 rounded-[10px] px-3 py-3 text-[17px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint",
                tab === id ? "bg-tint-soft text-tint" : "text-label hover:bg-fill")}>
              <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={tab === id ? 2.3 : 1.9} />{label}
            </button>
          ))}
        </nav>
      </SideDrawer>

      <div hidden={tab !== "estimate"}><Estimate version={store.version} menu={menu} /></div>
      <div hidden={tab !== "medicaid"}><Medicaid menu={menu} /></div>
      {tab === "prices" && store.hosted && (
        <div className="min-h-screen pb-16">
          <NavBar title="Price lists" subtitle="Upload a new list or add a model" right={<ThemeButton />} left={menu} />
          <BlurFade key="prices"><PriceLists store={store} sample={sample} /></BlurFade>
        </div>
      )}
    </>
  );
}
