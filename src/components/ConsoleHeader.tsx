/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect, useRef } from "react";
import { Settings } from "lucide-react";
import { VPSNode } from "../types";
import { translations, Lang, getLangMenuLabel, LANG_MENU_OPTIONS } from "../lib/i18n";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import type { ThemePreference } from "@/hooks/useThemePreference";
import { formatTrafficGb, resolveTrafficUsedGb } from "@/lib/formatUnits";
import { zenType, zenTouch } from "@/lib/typography";

function MobileMetricHero({
  label,
  value,
  suffix,
  textMuted,
  textPrimary,
  textUnit,
}: {
  label: string;
  value: string;
  suffix?: string;
  textMuted: string;
  textPrimary: string;
  textUnit: string;
}) {
  return (
    <div className="min-w-0 flex flex-col items-center gap-1 px-0.5 text-center">
      <span
        className={`${zenType.label} zen-track-tight ${textMuted} font-mono uppercase line-clamp-2 leading-tight w-full`}
      >
        {label}
      </span>
      <div className="flex max-w-full items-baseline justify-center gap-0.5">
        <span
          className={`text-[clamp(1.375rem,6.8vw,2rem)] font-black ${textPrimary} leading-none tracking-tighter`}
        >
          {value}
        </span>
        {suffix ? (
          <span
            className={`text-[clamp(0.5625rem,2.6vw,0.6875rem)] ${textUnit} shrink-0 font-mono font-medium leading-none`}
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface ConsoleHeaderProps {
  nodes: VPSNode[];
  lang: Lang;
  setLangPreference: (l: Lang) => void;
  theme: "light" | "dark";
  themePreference: ThemePreference;
  setThemePreference: (t: ThemePreference) => void;
  view?: "dashboard" | "detail";
}

export function ConsoleHeader({
  nodes,
  lang,
  setLangPreference,
  theme,
  themePreference,
  setThemePreference,
  view = "dashboard",
}: ConsoleHeaderProps) {
  const [localTime, setLocalTime] = useState<string>("");
  const [timeZone, setTimeZone] = useState<string>("");
  const [langOpen, setLangOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];
  const { publicInfo } = usePublicInfo();
  const siteName = (publicInfo?.sitename || "Komari").toUpperCase();
  const siteDescription = publicInfo?.description?.trim();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimeZone(tz);
      setLocalTime(
        now.toLocaleString(undefined, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!langOpen) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (
        langMenuRef.current &&
        !langMenuRef.current.contains(e.target as Node)
      ) {
        setLangOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [langOpen]);

  const totalOnline = nodes.filter((n) => n.online).length;
  const totalNodes = nodes.length;

  const totalUsedIn = nodes.reduce((sum, n) => sum + n.bandwidthUsedIn, 0);
  const totalUsedOut = nodes.reduce((sum, n) => sum + n.bandwidthUsedOut, 0);
  const totalBillableUsed = nodes.reduce(
    (sum, n) =>
      sum +
      resolveTrafficUsedGb(
        n.bandwidthUsedIn,
        n.bandwidthUsedOut,
        n.trafficLimitType,
      ),
    0,
  );

  const totalCores = nodes.reduce((sum, n) => sum + n.cpuCores, 0);
  const totalMemory = nodes.reduce((sum, n) => sum + n.memoryTotal, 0);
  const totalDisk = nodes.reduce((sum, n) => sum + n.diskTotal, 0);

  const totalMemoryUsed = nodes.reduce((sum, n) => sum + n.memoryUsed, 0);
  const totalDiskUsed = nodes.reduce((sum, n) => sum + n.diskUsed, 0);

  const avgMemoryPercent = totalMemory > 0 ? (totalMemoryUsed / totalMemory) * 100 : 0;
  const avgDiskPercent = totalDisk > 0 ? (totalDiskUsed / totalDisk) * 100 : 0;

  const onlineNodes = nodes.filter((n) => n.online);
  const avgCpuUsage = onlineNodes.length
    ? onlineNodes.reduce((sum, n) => sum + n.cpuUsage, 0) / onlineNodes.length
    : 0;

  const totalRxSpeed = nodes.reduce((sum, n) => sum + (n.online ? n.netSpeedIn : 0), 0);
  const totalTxSpeed = nodes.reduce((sum, n) => sum + (n.online ? n.netSpeedOut : 0), 0);
  const totalRealtimeSpeed = totalRxSpeed + totalTxSpeed; // in KB/s

  const isTB = totalBillableUsed >= 1024;
  const formattedBandwidth = isTB
    ? (totalBillableUsed / 1024).toFixed(2)
    : totalBillableUsed.toFixed(1);
  const bandwidthUnit = isTB ? "TB" : "GB";

  // Format speed value and unit separately for the big text metric
  let speedVal = "0.0";
  let speedUnit = "KB/s";
  if (totalRealtimeSpeed >= 1024 * 1024) {
    speedVal = (totalRealtimeSpeed / (1024 * 1024)).toFixed(2);
    speedUnit = "GB/s";
  } else if (totalRealtimeSpeed >= 1024) {
    speedVal = (totalRealtimeSpeed / 1024).toFixed(1);
    speedUnit = "MB/s";
  } else {
    speedVal = totalRealtimeSpeed.toFixed(0);
    speedUnit = "KB/s";
  }

  // Calculate unique location regions
  const totalRegions = new Set(nodes.map((n) => n.location).filter(Boolean)).size;

  // Accent colors according to light/dark themes
  const textPrimary = theme === "dark" ? "text-neutral-300" : "text-neutral-700";
  const textMuted = theme === "dark" ? "text-neutral-500" : "text-neutral-500";
  const textUnit = theme === "dark" ? "text-neutral-400" : "text-neutral-400";
  const btnHoverColor = "hover:text-emerald-500 dark:hover:text-amber-400";

  const adminEntryLink = (className = "") => (
    <a
      href="/admin"
      aria-label={t.controlWorkspace}
      title={t.controlWorkspace}
      className={`inline-flex shrink-0 items-center justify-center ${zenTouch.btn} cursor-pointer transition-colors ${btnHoverColor} ${textPrimary} ${className}`}
    >
      <Settings size={15} strokeWidth={2.25} aria-hidden />
    </a>
  );

  const settingsControls = (options?: { compact?: boolean }) => {
    const compact = options?.compact ?? false;
    const rootClass = compact
      ? `flex flex-col items-end gap-1.5 font-mono ${zenType.label} tracking-wide text-neutral-500`
      : `flex md:justify-end items-center gap-x-6 gap-y-3 flex-wrap font-mono ${zenType.data} tracking-widest text-neutral-500`;

    return (
      <div className={rootClass}>
        <div className="flex items-center gap-2">
          <div ref={langMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((open) => !open)}
              className={`cursor-pointer transition-colors hover:text-emerald-500 font-bold flex items-center gap-1 ${textPrimary}`}
              aria-expanded={langOpen}
              aria-haspopup="listbox"
            >
              <span>{getLangMenuLabel(lang)}</span>
              <span className={`${zenType.label} opacity-70`}>{langOpen ? "▴" : "▾"}</span>
            </button>
            {langOpen ? (
              <div
                role="listbox"
                className={`absolute right-0 top-full mt-1.5 z-[100] min-w-[9.5rem] py-1 border shadow-lg rounded-sm ${
                  theme === "dark"
                    ? "bg-neutral-900 border-neutral-700"
                    : "bg-white border-neutral-200"
                }`}
              >
                {LANG_MENU_OPTIONS.map((opt) => {
                  const selected = lang === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => {
                        setLangPreference(opt.value);
                        setLangOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-1.5 cursor-pointer transition-colors hover:text-emerald-500 ${
                        selected
                          ? `${textPrimary} font-extrabold`
                          : "text-neutral-500 font-bold"
                      }`}
                    >
                      {opt.label[lang]}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {!compact ? (
            <span className="text-neutral-800 font-bold block select-none">/</span>
          ) : null}
        </div>

        <div className={`flex items-center ${compact ? "gap-1.5 justify-end flex-wrap" : "gap-3"}`}>
          <button
            onClick={() => setThemePreference("auto")}
            className={`cursor-pointer transition-all hover:text-emerald-400 font-extrabold ${
              themePreference === "auto"
                ? `${textPrimary} underline underline-offset-4`
                : "text-neutral-500"
            }`}
          >
            {t.themeAuto}
          </button>
          <span className="text-neutral-700">·</span>
          <button
            onClick={() => setThemePreference("dark")}
            className={`cursor-pointer transition-all hover:text-emerald-400 font-extrabold ${
              themePreference === "dark"
                ? `${textPrimary} underline underline-offset-4`
                : "text-neutral-500"
            }`}
          >
            {t.themeDark}
          </button>
          <span className="text-neutral-700">·</span>
          <button
            onClick={() => setThemePreference("light")}
            className={`cursor-pointer transition-all hover:text-emerald-400 font-extrabold ${
              themePreference === "light"
                ? `${textPrimary} underline underline-offset-4`
                : "text-neutral-500"
            }`}
          >
            {t.themeLight}
          </button>
          <span className="text-neutral-700">·</span>
          {adminEntryLink(compact ? "p-0.5" : "p-1")}
        </div>
      </div>
    );
  };

  return (
    <header className={`font-sans ${zenType.body} uppercase select-none`}>
      {/* 1. Responsive Top Bar with absolute vertical alignment (items-center) */}
      <div className="border-b border-dashed border-neutral-200/60 dark:border-neutral-800/70 pb-8 md:pb-10">
        <div className="md:hidden space-y-1">
          <h1 className={`text-3xl font-black tracking-tight ${textPrimary} select-none break-words`}>
            {siteName}
          </h1>
          {siteDescription ? (
            <p className={`${zenType.caption} ${textMuted} font-mono normal-case tracking-wide break-words leading-relaxed`}>
              {siteDescription}
            </p>
          ) : null}
        </div>

        <div
          className={`md:hidden flex items-start justify-between gap-4 mt-3 ${langOpen ? "relative z-50" : ""}`}
        >
          <div className="flex min-w-0 flex-1 flex-col text-left font-mono">
            <span className={`${zenType.label} block ${textMuted} mb-1 zen-track-tight`}>
              {t.localTime}
            </span>
            <span className={`${textPrimary} text-sm font-bold tracking-widest select-all`}>
              {localTime || t.loading}
            </span>
            {timeZone ? (
              <span className={`${zenType.label} mt-0.5 ${textMuted} tracking-wider normal-case`}>
                {timeZone}
              </span>
            ) : null}
          </div>
          <div className="shrink-0 pt-0.5">{settingsControls({ compact: true })}</div>
        </div>

        <div className="hidden md:grid md:grid-cols-3 gap-6 items-center">
        {/* Left: App Logo/Branding (Single Word KOMARI) */}
        <div className="text-left min-w-0">
          <h1 className={`text-3xl font-black tracking-tight ${textPrimary} select-none break-words`}>
            {siteName}
          </h1>
          {siteDescription ? (
            <p className={`${zenType.caption} mt-1 max-w-md ${textMuted} font-mono normal-case tracking-wide break-words leading-relaxed`}>
              {siteDescription}
            </p>
          ) : null}
        </div>

        {/* Middle: Local timezone clock */}
        <div className="flex flex-col items-center text-center font-mono">
          <span className={`${zenType.label} block ${textMuted} mb-1 zen-track-tight`}>
            {t.localTime}
          </span>
          <span className={`${textPrimary} text-sm font-bold tracking-widest select-all`}>
            {localTime || t.loading}
          </span>
          {timeZone ? (
            <span className={`${zenType.label} mt-0.5 ${textMuted} tracking-wider normal-case`}>
              {timeZone}
            </span>
          ) : null}
        </div>

        {/* Right: Modern Menu Controls (with localized Dark/Light options) */}
        <div className={langOpen ? "relative z-50" : ""}>{settingsControls()}</div>
        </div>
      </div>

      {/* 2. RESTRUCTURED HIGH-DENSITY BALANCED TELEMETRY CHANNELS */}
      {view !== "detail" && (
        <>
          {/* Mobile: three hero metrics in one row */}
          <div className="grid grid-cols-3 gap-1.5 pt-6 md:hidden">
            <MobileMetricHero
              label={t.lblClusterNodeStatus}
              value={String(totalOnline)}
              suffix={`/${totalNodes}`}
              textMuted={textMuted}
              textPrimary={textPrimary}
              textUnit={textUnit}
            />
            <MobileMetricHero
              label={t.lblCpuAvg}
              value={avgCpuUsage.toFixed(1)}
              suffix="%"
              textMuted={textMuted}
              textPrimary={textPrimary}
              textUnit={textUnit}
            />
            <MobileMetricHero
              label={t.lblNetworkThroughput}
              value={speedVal}
              suffix={speedUnit}
              textMuted={textMuted}
              textPrimary={textPrimary}
              textUnit={textUnit}
            />
          </div>

          {/* Mobile: detail rows stacked */}
          <div
            className={`md:hidden pt-4 space-y-1.5 ${zenType.data} font-mono leading-relaxed tracking-wider`}
          >
            <div className="flex justify-between gap-3 py-0.5">
              <span className={`${textMuted} shrink-0`}>{t.lblOnlineNodes}:</span>
              <span className="font-bold text-[#10b981] text-right">{totalOnline}</span>
            </div>
            <div className="flex justify-between gap-3 py-0.5">
              <span className={`${textMuted} shrink-0`}>{t.lblOfflineNodes}:</span>
              <span
                className={`font-bold text-right ${totalNodes - totalOnline > 0 ? "text-red-500" : textPrimary}`}
              >
                {totalNodes - totalOnline}
              </span>
            </div>
            <div className="flex justify-between gap-3 py-0.5">
              <span className={`${textMuted} shrink-0`}>{t.lblTotalRegions}:</span>
              <span className={`font-bold text-right ${textPrimary}`}>{totalRegions}</span>
            </div>
            <div className="flex justify-between gap-3 py-0.5">
              <span className={`${textMuted} shrink-0`}>{t.lblCores}:</span>
              <span className={`font-bold text-right ${textPrimary}`}>
                {totalCores} {t.lblThreads}
              </span>
            </div>
            <div className="flex justify-between gap-3 py-0.5">
              <span className={`${textMuted} shrink-0`}>{t.lblMemory}:</span>
              <span className={`font-bold text-right ${textPrimary}`}>
                {totalMemoryUsed.toFixed(1)}/{totalMemory.toFixed(0)} GB ({avgMemoryPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between gap-3 py-0.5">
              <span className={`${textMuted} shrink-0`}>{t.lblDisk}:</span>
              <span className={`font-bold text-right ${textPrimary}`}>
                {totalDiskUsed.toFixed(0)}/{totalDisk.toFixed(0)} GB ({avgDiskPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between gap-3 py-0.5">
              <span className={`${textMuted} shrink-0`}>{t.cumulativeBandwidth}:</span>
              <span className={`font-bold text-right ${textPrimary}`}>
                {formattedBandwidth} {bandwidthUnit}
              </span>
            </div>
            <div className="flex justify-between gap-3 py-0.5">
              <span className={`${textMuted} shrink-0`}>{t.lblInboundRxShort || "INBOUND (RX)"}:</span>
              <span className={`font-bold text-right ${textPrimary}`}>{formatTrafficGb(totalUsedIn)}</span>
            </div>
            <div className="flex justify-between gap-3 py-0.5">
              <span className={`${textMuted} shrink-0`}>{t.lblOutboundTxShort || "OUTBOUND (TX)"}:</span>
              <span className={`font-bold text-right ${textPrimary}`}>{formatTrafficGb(totalUsedOut)}</span>
            </div>
          </div>

          {/* Desktop: three columns with hero + details each */}
          <div className="hidden md:grid md:grid-cols-3 gap-8 md:gap-16 pt-8 md:pt-10">
          {/* Metric 1: Cluster Nodes Status */}
          <div className="flex flex-col justify-start space-y-4">
            <div className={`${zenType.section} zen-track-tight ${textMuted} font-mono uppercase`}>
              {t.lblClusterNodeStatus}
            </div>
            <div className="space-y-3">
              <div className="h-14 sm:h-16 md:h-20 lg:h-24 flex items-end">
                <div className="flex items-baseline gap-1 md:gap-2">
                  <span className={`text-5xl sm:text-6xl md:text-7xl lg:text-[4.75rem] xl:text-[5.5rem] font-black ${textPrimary} tracking-tighter leading-none`}>
                    {totalOnline}
                  </span>
                  <span className={`text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] ${textUnit} font-light font-sans select-none pb-0.5`}>
                    /{totalNodes}
                  </span>
                </div>
              </div>
              {/* Added clean structured detailed list below counts to cleanly fill empty space */}
              <div className={`grid grid-cols-1 gap-y-1.5 ${zenType.data} font-mono leading-relaxed tracking-wider`}>
                <div className="flex justify-between py-0.5">
                  <span className={textMuted}>{t.lblOnlineNodes}:</span>
                  <span className="font-bold text-[#10b981]">{totalOnline}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className={textMuted}>{t.lblOfflineNodes}:</span>
                  <span className={`font-bold ${totalNodes - totalOnline > 0 ? "text-red-500" : textPrimary}`}>
                    {totalNodes - totalOnline}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className={textMuted}>{t.lblTotalRegions}:</span>
                  <span className={`font-bold ${textPrimary}`}>{totalRegions}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Metric 2: Average CPU usage across online nodes */}
          <div className="flex flex-col justify-start space-y-4">
            <div className={`${zenType.section} zen-track-tight ${textMuted} font-mono uppercase`}>
              {t.lblCpuAvg}
            </div>
            <div className="space-y-3">
              <div className="h-14 sm:h-16 md:h-20 lg:h-24 flex items-end">
                <div className="flex items-baseline gap-1 md:gap-2 select-none">
                  <span className={`text-5xl sm:text-6xl md:text-7xl lg:text-[4.75rem] xl:text-[5.5rem] font-black ${textPrimary} tracking-tighter leading-none`}>
                    {avgCpuUsage.toFixed(1)}
                  </span>
                  <span className={`text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] ${textUnit} font-medium font-mono select-none pb-0.5`}>
                    %
                  </span>
                </div>
              </div>
              <div className={`grid grid-cols-1 gap-y-1.5 ${zenType.data} font-mono leading-relaxed tracking-wider`}>
                <div className="flex justify-between py-0.5">
                  <span className={textMuted}>{t.lblCores}:</span>
                  <span className={`font-bold ${textPrimary}`}>
                    {totalCores}{" "}
                    {t.lblThreads}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className={textMuted}>{t.lblMemory}:</span>
                  <span className={`font-bold ${textPrimary}`}>
                    {totalMemoryUsed.toFixed(1)}/{totalMemory.toFixed(0)} GB ({avgMemoryPercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className={textMuted}>{t.lblDisk}:</span>
                  <span className={`font-bold ${textPrimary}`}>
                    {totalDiskUsed.toFixed(0)}/{totalDisk.toFixed(0)} GB ({avgDiskPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Metric 3: Global Networks & Rates */}
          <div className="flex flex-col justify-start space-y-4">
            <div className={`${zenType.section} zen-track-tight ${textMuted} font-mono uppercase`}>
              {t.lblNetworkThroughput}
            </div>
            <div className="space-y-3">
              <div className="h-14 sm:h-16 md:h-20 lg:h-24 flex items-end">
                <div className="flex items-baseline gap-1 md:gap-2 select-none">
                  <span className={`text-5xl sm:text-6xl md:text-7xl lg:text-[4.75rem] xl:text-[5.5rem] font-black ${textPrimary} tracking-tighter leading-none`}>
                    {speedVal}
                  </span>
                  <span className={`text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] ${textUnit} font-black font-mono select-none pb-0.5`}>
                    {speedUnit}
                  </span>
                </div>
              </div>
              <div className={`grid grid-cols-1 gap-y-1.5 ${zenType.data} font-mono leading-relaxed tracking-wider`}>
                <div className="flex justify-between py-0.5">
                  <span className={textMuted}>{t.cumulativeBandwidth}:</span>
                  <span className={`font-bold ${textPrimary}`}>{formattedBandwidth} {bandwidthUnit}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className={textMuted}>{t.lblInboundRxShort || "INBOUND (RX)"}:</span>
                  <span className={`font-bold ${textPrimary}`}>{formatTrafficGb(totalUsedIn)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className={textMuted}>{t.lblOutboundTxShort || "OUTBOUND (TX)"}:</span>
                  <span className={`font-bold ${textPrimary}`}>{formatTrafficGb(totalUsedOut)}</span>
                </div>
              </div>
            </div>
          </div>
          </div>
        </>
      )}

    </header>
  );
}
