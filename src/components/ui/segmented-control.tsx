// 21st.dev URL: https://21st.dev/@ddoemonn/components/segmented-control
// Component ID: 23552
// "Segmented Control" — the 21st.dev source; its motion is unchanged (the CELL spring,
// the sliding thumb with the colour mask, keyboard arrows, reduced motion). Changes for this app:
//   1. value can be null (a step not answered yet): no segment looks picked and the thumb is hidden;
//      the first pick places the thumb without sliding in from the left.
//   2. Optional second line per option (hint), drawn in both label layers.
//   3. Touch size: 44px-tall segments, 15px text, full width.
//   4. Colours use the app's tokens: logo-blue thumb with white text, iOS fill track.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";

const CELL = {
  type: "spring",
  stiffness: 520,
  damping: 34,
  mass: 0.45,
} as const;

const SEG =
  "flex min-h-[44px] flex-col items-center justify-center px-2 py-1 text-center text-[15px] font-medium leading-[20px] tracking-[-0.01em] whitespace-nowrap";
const HINT = "text-[12px] font-normal leading-[16px]";

export type SegmentedOption = {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
};

export type SegmentedControlProps = {
  options: SegmentedOption[];
  label: string;
  value?: string | null;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

export function SegmentedControl({
  options,
  label,
  value,
  defaultValue,
  onValueChange,
  className = "",
}: SegmentedControlProps) {
  const count = Math.max(1, options.length);
  const template = `repeat(${count}, minmax(0, 1fr))`;

  const [internal, setInternal] = useState(
    () => defaultValue ?? options[0]?.value ?? "",
  );
  const [hovered, setHovered] = useState(-1);

  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const found = options.findIndex((o) => o.value === current);
  const shown = found >= 0;
  const index = shown ? found : 0;
  const firstEnabled = Math.max(0, options.findIndex((o) => !o.disabled));

  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const emit = useRef(onValueChange);
  emit.current = onValueChange;

  const reduced = useReducedMotion();
  const pos = useMotionValue(index);
  const thumbX = useTransform(pos, (v) => `${v * 100}%`);
  const maskX = useTransform(pos, (v) => `${v * -100}%`);
  const wasShown = useRef(shown);

  useEffect(() => {
    if (!shown) {
      wasShown.current = false;
      return;
    }
    if (reduced || !wasShown.current) {
      wasShown.current = true;
      pos.set(index);
      return;
    }
    const controls = animate(pos, index, CELL);
    return () => controls.stop();
  }, [index, shown, reduced, pos]);

  const select = useCallback(
    (next: string) => {
      if (!controlled) setInternal(next);
      if (next !== current) emit.current?.(next);
    },
    [controlled, current],
  );

  const seek = useCallback(
    (from: number, dir: number) => {
      let i = from;
      for (let k = 0; k < count; k++) {
        i = (i + dir + count) % count;
        if (!options[i]?.disabled) return i;
      }
      return from;
    },
    [count, options],
  );

  const go = useCallback(
    (i: number) => {
      const option = options[i];
      if (!option || option.disabled) return;
      buttons.current[i]?.focus();
      select(option.value);
    },
    [options, select],
  );

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      go(seek(i, 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      go(seek(i, -1));
    } else if (e.key === "Home") {
      e.preventDefault();
      go(seek(count - 1, 1));
    } else if (e.key === "End") {
      e.preventDefault();
      go(seek(0, -1));
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`relative block w-full select-none rounded-[10px] bg-fill p-[2px] ${className}`}
    >
      <div
        className="relative grid"
        style={{ gridTemplateColumns: template, touchAction: "manipulation" }}
      >
        {options.map((option, i) => (
          <span
            key={option.value}
            aria-hidden
            className={`${SEG} pointer-events-none ${
              option.disabled
                ? "text-label3"
                : hovered === i && !(shown && i === index)
                  ? "text-tint"
                  : "text-label"
            }`}
          >
            <span>{option.label}</span>
            {option.hint && <span className={`${HINT} text-label2`}>{option.hint}</span>}
          </span>
        ))}

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden rounded-[8px] bg-tint shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]"
          style={{ width: `${100 / count}%`, x: thumbX, opacity: shown ? 1 : 0 }}
          initial={false}
        >
          <motion.div
            className="absolute inset-0"
            style={{ x: maskX }}
            initial={false}
          >
            <div
              className="absolute inset-y-0 left-0 grid"
              style={{
                width: `${count * 100}%`,
                gridTemplateColumns: template,
              }}
            >
              {options.map((option) => (
                <span
                  key={option.value}
                  className={`${SEG} font-semibold text-tint-ink`}
                >
                  <span>{option.label}</span>
                  {option.hint && <span className={`${HINT} opacity-80`}>{option.hint}</span>}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: template }}
          onPointerLeave={() => setHovered(-1)}
        >
          {options.map((option, i) => (
            <button
              key={option.value}
              ref={(node) => {
                buttons.current[i] = node;
              }}
              type="button"
              role="radio"
              aria-checked={shown && i === index}
              aria-disabled={option.disabled || undefined}
              tabIndex={i === (shown ? index : firstEnabled) ? 0 : -1}
              onClick={() => !option.disabled && select(option.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              onPointerEnter={() => !option.disabled && setHovered(i)}
              className="cursor-default rounded-[8px] outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--tint)] aria-disabled:cursor-not-allowed"
            >
              <span className="sr-only">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SegmentedControl;
