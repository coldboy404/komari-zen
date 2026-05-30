/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React from "react";
import { createPortal } from "react-dom";
import { MessageSquareText } from "lucide-react";
import { zenType } from "@/lib/typography";

interface PublicRemarkButtonProps {
  publicRemark?: string;
  privateRemark?: string;
  publicLabel: string;
  privateLabel: string;
  theme: "light" | "dark";
  size?: "sm" | "md";
  className?: string;
}

const VIEWPORT_PAD = 8;

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

function RemarkSection({
  label,
  text,
  theme,
  withTopGap,
}: {
  label: string;
  text: string;
  theme: "light" | "dark";
  withTopGap?: boolean;
}) {
  return (
    <div className={withTopGap ? "mt-3 pt-3 border-t border-neutral-500/15" : ""}>
      <div
        className={`mb-1.5 ${zenType.label} font-bold uppercase tracking-[0.2em] ${
          theme === "dark" ? "text-neutral-500" : "text-neutral-400"
        }`}
      >
        {label}
      </div>
      <p className="whitespace-pre-wrap break-words normal-case">{text}</p>
    </div>
  );
}

export function PublicRemarkButton({
  publicRemark = "",
  privateRemark = "",
  publicLabel,
  privateLabel,
  theme,
  size = "sm",
  className = "",
}: PublicRemarkButtonProps) {
  const publicText = publicRemark.trim();
  const privateText = privateRemark.trim();
  if (!publicText && !privateText) return null;

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0 });
  const [visible, setVisible] = React.useState(false);

  const iconSize = size === "sm" ? 13 : 15;

  const panelClass =
    theme === "dark"
      ? "border border-neutral-800/50 bg-zen-surface/95 text-neutral-300 shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
      : "border border-neutral-300/25 bg-zen-surface/95 text-neutral-600 shadow-[0_4px_14px_rgba(0,0,0,0.06)]";

  const buttonClass =
    theme === "dark"
      ? "text-neutral-500 hover:text-emerald-400 focus-visible:text-emerald-400"
      : "text-neutral-400 hover:text-emerald-600 focus-visible:text-emerald-600";

  const ariaLabel = [publicText && publicLabel, privateText && privateLabel]
    .filter(Boolean)
    .join(" / ");

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
  }, [open, publicText, privateText, reposition]);

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
  const togglePanel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        title={ariaLabel}
        className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm p-0.5 transition-colors focus:outline-none ${buttonClass} ${className}`.trim()}
        onClick={togglePanel}
        onMouseEnter={showPanel}
        onMouseLeave={hidePanel}
        onFocus={showPanel}
        onBlur={hidePanel}
      >
        <MessageSquareText size={iconSize} strokeWidth={2} />
      </button>
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
            className={`max-w-[min(320px,calc(100vw-16px))] rounded-sm px-3 py-2 font-mono ${zenType.caption} leading-relaxed tracking-wide ${panelClass}`}
            onMouseEnter={showPanel}
            onMouseLeave={hidePanel}
            onClick={(e) => e.stopPropagation()}
          >
            {publicText ? (
              <RemarkSection label={publicLabel} text={publicText} theme={theme} />
            ) : null}
            {privateText ? (
              <RemarkSection
                label={privateLabel}
                text={privateText}
                theme={theme}
                withTopGap={!!publicText}
              />
            ) : null}
          </div>,
          document.body,
        )}
    </>
  );
}
