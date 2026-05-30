import React from "react";
import type { Messages } from "@/lib/i18n";
import { formatPreserveHoursLabel } from "@/lib/timeRangePresets";
import { zenType, zenTouch } from "@/lib/typography";

interface HistoryRangeSelectorProps {
  presets: number[];
  value: number;
  onChange: (hours: number) => void;
  disabled?: boolean;
  theme: "light" | "dark";
  messages: Messages;
  showLive?: boolean;
  isLive?: boolean;
  onLive?: () => void;
  liveLabel?: string;
}

export function HistoryRangeSelector({
  presets,
  value,
  onChange,
  disabled = false,
  theme,
  messages,
  showLive = false,
  isLive = false,
  onLive,
  liveLabel = "LIVE",
}: HistoryRangeSelectorProps) {
  if (presets.length === 0 && !showLive) return null;

  return (
    <div className="max-w-full overflow-x-auto">
      <div className={`flex flex-nowrap items-center gap-3 sm:gap-6 font-mono ${zenType.caption} shrink-0 select-none`}>
        {showLive && (
          <button
            type="button"
            onClick={() => onLive?.()}
            className={`relative px-1.5 ${zenTouch.btn} cursor-pointer uppercase tracking-widest font-black transition-all duration-250 whitespace-nowrap inline-flex items-center gap-1.5 ${
              isLive
                ? "text-emerald-600 dark:text-emerald-400"
                : theme === "dark"
                  ? "text-neutral-500 hover:text-neutral-300"
                  : "text-neutral-400 hover:text-neutral-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-neutral-400 dark:bg-neutral-600"}`}
            />
            {liveLabel}
            {isLive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-emerald-500 rounded-full" />
            )}
          </button>
        )}
        {presets.map((h) => {
          const isActive = !isLive && value === h;
          const label = formatPreserveHoursLabel(h, messages);
          return (
            <button
              key={h}
              type="button"
              onClick={() => {
                if ((h !== value || isLive) && !disabled) onChange(h);
              }}
              disabled={disabled}
              className={`relative px-1.5 ${zenTouch.btn} cursor-pointer uppercase tracking-widest font-black transition-all duration-250 whitespace-nowrap ${
                isActive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : theme === "dark"
                    ? "text-neutral-500 hover:text-neutral-300 disabled:opacity-50"
                    : "text-neutral-400 hover:text-neutral-700 disabled:opacity-50"
              }`}
            >
              {label}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-emerald-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
