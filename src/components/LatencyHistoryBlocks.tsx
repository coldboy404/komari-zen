import React from "react";
import { createPortal } from "react-dom";
import type { LatencyColorConfig, LatencySample } from "@/lib/latencyDisplay";
import {
  computeLatencyMean,
  formatLatencyDelta,
  formatLatencyMs,
  formatLatencyTooltipTime,
  latencyBlockColor,
  METRIC_BAR_SEGMENTS,
  LATENCY_HISTORY_LEN,
  padLatencyHistory,
} from "@/lib/latencyDisplay";
import { zenType } from "@/lib/typography";

interface LatencyHistoryBlocksProps {
  samples: LatencySample[];
  currentMs: number;
  theme: "light" | "dark";
  textPrimary: string;
  colorConfig: LatencyColorConfig;
  /** Extra classes on the outer wrapper (e.g. card row alignment). */
  className?: string;
}

const VIEWPORT_PAD = 8;

function computeTooltipCoords(
  trigger: HTMLElement,
  panel: HTMLElement,
): { top: number; left: number } {
  const tr = trigger.getBoundingClientRect();
  const pw = panel.offsetWidth;
  const ph = panel.offsetHeight;
  const gap = 6;

  let left = tr.left + tr.width / 2 - pw / 2;
  let top = tr.top - ph - gap;

  if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
  if (left + pw > window.innerWidth - VIEWPORT_PAD) {
    left = window.innerWidth - VIEWPORT_PAD - pw;
  }

  if (top < VIEWPORT_PAD) {
    top = tr.bottom + gap;
  }
  if (top + ph > window.innerHeight - VIEWPORT_PAD) {
    top = Math.max(VIEWPORT_PAD, tr.top - ph - gap);
  }

  return { top, left };
}

type LatencyBlockProps = {
  sample: LatencySample;
  theme: "light" | "dark";
  colorConfig: LatencyColorConfig;
  mean: number | null;
};

const SLOT_WIDTH_CH = METRIC_BAR_SEGMENTS / LATENCY_HISTORY_LEN;
/** Horizontal squeeze — 20 glyphs in the same width as 10 full ■ blocks. */
const BLOCK_SCALE_X = SLOT_WIDTH_CH;

function LatencyBlock({
  sample,
  theme,
  colorConfig,
  mean,
}: LatencyBlockProps) {
  const hasData = sample.ms > 0 && sample.t > 0;
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0 });
  const [visible, setVisible] = React.useState(false);

  const tipText = React.useMemo(() => {
    if (!hasData) return "";
    let tip = `${formatLatencyTooltipTime(sample.t)} · ${formatLatencyMs(sample.ms)}`;
    if (colorConfig.mode === "MeanDelta" && mean != null && mean > 0) {
      tip += ` (${formatLatencyDelta(sample.ms - mean)})`;
    }
    return tip;
  }, [hasData, sample.t, sample.ms, colorConfig.mode, mean]);

  const panelClass =
    theme === "dark"
      ? "border border-neutral-800/50 bg-zen-surface/95 text-neutral-300 shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
      : "border border-neutral-300/25 bg-zen-surface/95 text-neutral-600 shadow-[0_4px_14px_rgba(0,0,0,0.06)]";

  const reposition = React.useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    setCoords(computeTooltipCoords(trigger, panel));
    setVisible(true);
  }, []);

  React.useLayoutEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    reposition();
  }, [open, tipText, reposition]);

  React.useEffect(() => {
    if (!open) return;
    const onReflow = () => reposition();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, reposition]);

  React.useEffect(() => {
    if (!pinned) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setPinned(false);
      setOpen(false);
    };
    document.addEventListener("click", onDoc, true);
    return () => document.removeEventListener("click", onDoc, true);
  }, [pinned]);

  const showPanel = () => setOpen(true);
  const hidePanel = () => {
    if (!pinned) setOpen(false);
  };

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasData) return;
    setPinned((prev) => {
      const next = !prev;
      setOpen(next);
      return next;
    });
  };

  const colorClass = hasData
    ? latencyBlockColor(sample.ms, theme, colorConfig, mean)
    : "";

  return (
    <>
      <span
        ref={triggerRef}
        role={hasData ? "button" : undefined}
        tabIndex={hasData ? 0 : undefined}
        aria-label={hasData ? tipText : undefined}
        className={`inline-block shrink-0 text-center leading-none ${hasData ? `cursor-pointer ${colorClass}` : "cursor-default"}`}
        style={{ width: `${SLOT_WIDTH_CH}ch` }}
        onMouseEnter={hasData ? showPanel : undefined}
        onMouseLeave={hasData ? hidePanel : undefined}
        onFocus={hasData ? showPanel : undefined}
        onBlur={hasData ? hidePanel : undefined}
        onClick={onClick}
      >
        <span
          aria-hidden
          className="inline-block origin-bottom leading-none"
          style={{ transform: `scaleX(${BLOCK_SCALE_X})` }}
        >
          {hasData ? "■" : "·"}
        </span>
      </span>
      {hasData &&
        open &&
        createPortal(
          <div
            ref={panelRef}
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              zIndex: 9999,
              opacity: visible ? 1 : 0,
              pointerEvents: pinned ? "auto" : "none",
            }}
            className={`whitespace-nowrap rounded-sm px-2 py-1 font-mono ${zenType.caption} tracking-wide ${panelClass}`}
            onMouseEnter={showPanel}
            onMouseLeave={hidePanel}
            onClick={(e) => e.stopPropagation()}
          >
            {tipText}
          </div>,
          document.body,
        )}
    </>
  );
}

export function LatencyHistoryBlocks({
  samples,
  currentMs,
  theme,
  textPrimary,
  colorConfig,
  className = "",
}: LatencyHistoryBlocksProps) {
  const blocks = padLatencyHistory(samples);
  const mean = computeLatencyMean(blocks);
  const valueColor =
    currentMs > 0
      ? latencyBlockColor(currentMs, theme, colorConfig, mean)
      : textPrimary;
  const valueLabel = formatLatencyMs(currentMs);

  return (
    <span className={`inline-flex items-baseline font-mono ${className}`}>
      <span className={`font-bold ${valueColor}`}>{valueLabel}</span>
      <span className="ml-1 font-mono text-neutral-500/30">
        {"["}
        <span
          className="inline-flex items-baseline"
          style={{ width: `${METRIC_BAR_SEGMENTS}ch` }}
        >
          {blocks.map((sample, i) => (
            <React.Fragment key={`${sample.t}-${i}`}>
              <LatencyBlock
                sample={sample}
                theme={theme}
                colorConfig={colorConfig}
                mean={mean}
              />
            </React.Fragment>
          ))}
        </span>
        {"]"}
      </span>
    </span>
  );
}
