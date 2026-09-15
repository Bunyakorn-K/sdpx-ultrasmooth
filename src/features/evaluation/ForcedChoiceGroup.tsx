"use client";

import { useRef } from "react";

// PRD §9.1 / §7.5 — exact 6-point forced-choice labels, no neutral option
// (D1). FR-A11Y-01/02: proper WAI-ARIA radiogroup pattern with text labels,
// roving tabindex, and arrow-key navigation (not just visual styling).
const OPTIONS = [
  { value: 1, label: "ซ้ายดีกว่ามาก" },
  { value: 2, label: "ซ้ายดีกว่า" },
  { value: 3, label: "ซ้ายดีกว่าเล็กน้อย" },
  { value: 4, label: "ขวาดีกว่าเล็กน้อย" },
  { value: 5, label: "ขวาดีกว่า" },
  { value: 6, label: "ขวาดีกว่ามาก" },
] as const;

export function ForcedChoiceGroup({
  value,
  onChange,
  label = "เปรียบเทียบผลงานสองฝั่ง",
}: {
  value: number | null;
  onChange: (value: number) => void;
  label?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = OPTIONS.findIndex((option) => option.value === value);

  function focusAndSelect(index: number) {
    const clamped = (index + OPTIONS.length) % OPTIONS.length;
    refs.current[clamped]?.focus();
    onChange(OPTIONS[clamped].value);
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusAndSelect(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusAndSelect(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        event.preventDefault();
        focusAndSelect(OPTIONS.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {OPTIONS.map((option, index) => {
        const isSelected = option.value === value;
        const isTabbable = selectedIndex === -1 ? index === 0 : isSelected;

        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isTabbable ? 0 : -1}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onClick={() => onChange(option.value)}
            className={`min-h-[44px] rounded-lg border px-2 py-2 text-xs font-medium transition-colors sm:text-sm ${
              isSelected
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-black/12 bg-white text-zinc-700 hover:border-indigo-400 dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-300"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
