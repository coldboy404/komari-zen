/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React from "react";
import { createPortal } from "react-dom";
import { parseNodeTags, type ParsedNodeTag } from "@/lib/parseNodeTags";
import {
  getTagOverflowTextClass,
  getTagSeparatorClass,
  getTagTextClass,
} from "@/lib/tagColorStyles";

interface NodeTagsProps {
  tags: string;
  theme: "light" | "dark";
  size?: "sm" | "md";
  /** 最多展示几个，超出折叠为 +N；默认 2 */
  maxVisible?: number;
  className?: string;
}

const SIZE_CLASS = {
  sm: "zen-type-caption md:text-[9px] md:tracking-[0.06em]",
  md: "zen-type-data md:text-[10px] md:tracking-[0.08em]",
} as const;

const VIEWPORT_PAD = 8;

function TagSeparator({ theme }: { theme: "light" | "dark" }) {
  return (
    <span
      className={`select-none font-mono font-light ${getTagSeparatorClass(theme)}`}
      aria-hidden
    >
      /
    </span>
  );
}

function TagLabel({
  text,
  color,
  index,
  theme,
  sizeClass,
}: {
  text: string;
  color: ParsedNodeTag["color"];
  index: number;
  theme: "light" | "dark";
  sizeClass: string;
}) {
  return (
    <span
      title={text}
      className={`shrink-0 font-mono font-semibold uppercase leading-none ${sizeClass} ${getTagTextClass(color, index, theme)}`}
    >
      {text}
    </span>
  );
}

function TagList({
  items,
  theme,
  sizeClass,
  startIndex = 0,
}: {
  items: ParsedNodeTag[];
  theme: "light" | "dark";
  sizeClass: string;
  startIndex?: number;
}) {
  return (
    <>
      {items.map(({ text, color }, index) => (
        <React.Fragment key={`${startIndex + index}-${text}`}>
          {index > 0 ? <TagSeparator theme={theme} /> : null}
          <TagLabel
            text={text}
            color={color}
            index={startIndex + index}
            theme={theme}
            sizeClass={sizeClass}
          />
        </React.Fragment>
      ))}
    </>
  );
}

function computePopoverCoords(
  trigger: HTMLElement,
  panel: HTMLElement,
): { top: number; left: number } {
  const tr = trigger.getBoundingClientRect();
  const pw = panel.offsetWidth;
  const ph = panel.offsetHeight;
  const gap = 6;

  let left = tr.right - pw;
  let top = tr.top - ph - gap;

  if (left < VIEWPORT_PAD) {
    left = VIEWPORT_PAD;
  }
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

function TagOverflow({
  hidden,
  hiddenCount,
  theme,
  sizeClass,
  startIndex,
}: {
  hidden: ParsedNodeTag[];
  hiddenCount: number;
  theme: "light" | "dark";
  sizeClass: string;
  startIndex: number;
}) {
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0 });
  const [visible, setVisible] = React.useState(false);

  const panelClass =
    theme === "dark"
      ? "border border-neutral-800/50 bg-zen-surface/95 text-neutral-300 shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
      : "border border-neutral-300/25 bg-zen-surface/95 text-neutral-600 shadow-[0_4px_14px_rgba(0,0,0,0.06)]";

  const reposition = React.useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    setCoords(computePopoverCoords(trigger, panel));
    setVisible(true);
  }, []);

  React.useLayoutEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    reposition();
  }, [open, hidden, reposition]);

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

  const showPanel = () => setOpen(true);
  const hidePanel = () => setOpen(false);

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex shrink-0 items-center"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={showPanel}
        onMouseLeave={hidePanel}
        onFocus={showPanel}
        onBlur={hidePanel}
      >
        <TagSeparator theme={theme} />
        <span
          className={`cursor-default font-mono font-semibold uppercase leading-none ${sizeClass} ${getTagOverflowTextClass(theme)} transition-colors`}
        >
          +{hiddenCount}
        </span>
      </span>
      {open &&
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
            }}
            className={`inline-flex max-w-[min(320px,calc(100vw-16px))] flex-wrap items-center gap-x-1 rounded-sm px-2 py-1 font-mono ${panelClass}`}
            onMouseEnter={showPanel}
            onMouseLeave={hidePanel}
          >
            <TagList
              items={hidden}
              theme={theme}
              sizeClass={sizeClass}
              startIndex={startIndex}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

export const NodeTags = React.memo(
  ({
    tags,
    theme,
    size = "sm",
    maxVisible = 2,
    className = "",
  }: NodeTagsProps) => {
    const parsed = parseNodeTags(tags);
    if (parsed.length === 0) {
      return null;
    }

    const sizeClass = SIZE_CLASS[size];
    const limit = maxVisible > 0 ? maxVisible : parsed.length;
    const visible = parsed.slice(0, limit);
    const hidden = parsed.slice(limit);
    const hiddenCount = hidden.length;

    return (
      <div
        className={`flex min-w-0 flex-row flex-wrap items-center gap-x-1 gap-y-0 ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        <TagList items={visible} theme={theme} sizeClass={sizeClass} />
        {hiddenCount > 0 ? (
          <TagOverflow
            hidden={hidden}
            hiddenCount={hiddenCount}
            theme={theme}
            sizeClass={sizeClass}
            startIndex={limit}
          />
        ) : null}
      </div>
    );
  },
);

NodeTags.displayName = "NodeTags";
