/* Add-ons, shared by the Estimate and Medicaid tabs. Each passes its own accessories as
   `acc`: [[name, price, …], …] (Estimate: BHSC add-on prices; Medicaid: the list's Medicaid prices). */
import { useState } from "react";
import { Group, Row, Sheet, Switch } from "@/components/ios";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { money } from "@/lib/pricing";

/* Accessories list (iOS switches) in a bottom sheet — used by the Add-ons step and the estimate. */
export function AccessorySheet({ open, onClose, s, set, acc, header }) {
  const toggle = (nm, on) => set({ addons: on ? [...s.addons, nm] : s.addons.filter((x) => x !== nm) });
  const sum = acc.filter(([nm]) => s.addons.includes(nm)).reduce((a, [, p]) => a + p, 0);
  return (
    <Sheet open={open} onClose={onClose} title="Accessories">
      <div className="grid grid-cols-1 gap-4 pb-2">
        <Group header={header} footer={s.addons.length ? `${s.addons.length} added · ${money(sum)}` : "Close this sheet when you're done."}>
          {acc.map(([nm, p], j) => (
            <Row key={nm} last={j === acc.length - 1}>
              <span className="min-w-0 flex-1"><span className="block truncate text-[17px]">{nm}</span><span className="tnum block text-[13px] text-label2">{money(p)}</span></span>
              <Switch checked={s.addons.includes(nm)} onChange={(on) => toggle(nm, on)} label={nm} />
            </Row>
          ))}
        </Group>
      </div>
    </Sheet>
  );
}

/* The Add-ons question: None, or pick accessories in the sheet (closing it answers the step). */
export function AddonsStep({ s, set, acc, header }) {
  const [open, setOpen] = useState(false);
  const value = !s.addonsDone ? null : s.addons.length ? "add" : "none";
  const sum = acc.filter(([nm]) => s.addons.includes(nm)).reduce((a, [, p]) => a + p, 0);
  return (
    <div className="grid grid-cols-1 gap-3">
      <SegmentedControl label="Add-ons" value={value}
        onValueChange={(v) => (v === "none" ? set({ addons: [], addonsDone: true }) : setOpen(true))}
        options={[{ value: "none", label: "None" }, { value: "add", label: "Add accessories", hint: "chargers, Roger, TV" }]} />
      {s.addons.length > 0 && (
        <button type="button" onClick={() => setOpen(true)} className="text-left text-[15px] text-label2">
          {s.addons.join(", ")} · <span className="tnum">{money(sum)}</span> · <span className="text-tint">Edit</span>
        </button>
      )}
      <AccessorySheet open={open} onClose={() => { setOpen(false); set({ addonsDone: true }); }} s={s} set={set} acc={acc} header={header} />
    </div>
  );
}
