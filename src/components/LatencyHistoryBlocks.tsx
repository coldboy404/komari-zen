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
  metricWidgetClass,
  LATENCY_HISTORY_LEN,
  padLatencyHistory,
} from "@/lib/latencyDisplay";
import { zenType } from "@/lib/typography";
import { zenInteractive, zenPopover } from "@/lib/zenSemantics";
import { zenMotion } from "@/lib/zenMotion";

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

  const panelClass = zenPopover;

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
        className={`inline-flex shrink-0 items-end justify-center overflow-hidden leading-none ${
          hasData ? `cursor-pointer ${colorClass}` : "cursor-default text-zen-fg-faint/80"
        }`}
        style={{ width: `${SLOT_WIDTH_CH}ch`, height: "1em" }}
        onMouseEnter={hasData ? showPanel : undefined}
        onMouseLeave={hasData ? hidePanel : undefined}
        onFocus={hasData ? showPanel : undefined}
        onBlur={hasData ? hidePanel : undefined}
        onClick={onClick}
      >
        {hasData ? (
          <span
            aria-hidden
            className="block w-full rounded-[0.5px] bg-current"
            style={{ height: "0.52em" }}
          />
        ) : (
          <span aria-hidden className="text-[0.65em] leading-none">
            ·
          </span>
        )}
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
              pointerEvents: pinned ? "auto" : "none",
            }}
            className={`whitespace-nowrap rounded-sm px-2 py-1 font-mono ${zenType.caption} tracking-wide ${panelClass} ${zenMotion.popover} ${visible ? zenMotion.popoverVisible : ""}`}
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
    <span className={`${metricWidgetClass} ${className}`.trim()}>
      <span className={`text-right font-bold ${valueColor}`}>{valueLabel}</span>
      <span className={`whitespace-nowrap ${zenInteractive.separator}`}>
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
