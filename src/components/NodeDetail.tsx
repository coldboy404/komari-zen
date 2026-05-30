/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React from "react";
import { VPSNode } from "../types";
import { translations, Lang, type Messages } from "../lib/i18n";
import type { LiveRecord } from "@/types/LiveData";
import { LatencyProbePanel } from "@/components/detail/LatencyProbePanel";
import { HistoryRangeSelector } from "@/components/detail/HistoryRangeSelector";
import { useLoadRecords } from "@/hooks/useLoadRecords";
import { useRecordSettings } from "@/hooks/useRecordSettings";
import {
  buildMetricHistory,
  loadTotalsFromNode,
} from "@/lib/recordTransform";
import {
  formatChartOffsetLabel,
} from "@/lib/timeRangePresets";
import {
  formatBytesPerSec,
  formatKbps,
  formatPercent,
  formatTrafficGb,
  formatNodeTraffic,
  getTrafficTypeLabel,
  pickSpeedScale,
  scaleSpeedValue,
  formatSpeedAxisMax,
  formatStoragePair,
} from "@/lib/formatUnits";
import { Flag } from "@/components/Flag";
import { OsIcon } from "@/components/OsIcon";
import { NodeTags } from "@/components/NodeTags";
import { parseNodeTags } from "@/lib/parseNodeTags";
import { useChartScrub } from "@/hooks/useChartScrub";
import { zenType } from "@/lib/typography";

interface NodeDetailProps {
  node: VPSNode;
  lang: Lang;
  theme: "light" | "dark";
  recentRecords?: LiveRecord[];
}

const MiniLineChart = ({
  data,
  data2,
  color = "#10b981",
  color2 = "#8b5cf6",
  maxVal = 100,
  unit = "%",
  unitMode = "percent",
  title,
  subMetrics,
  theme,
  label1 = "VALUE",
  label2,
  timeRange = 24,
  messages,
  decimals,
  hasData = true,
  valueFormatter,
}: {
  data: number[];
  data2?: number[];
  color?: string;
  color2?: string;
  maxVal?: number;
  unit?: string;
  unitMode?: "percent" | "speed" | "count";
  title: string;
  subMetrics?: React.ReactNode;
  theme: "light" | "dark";
  label1?: string;
  label2?: string;
  timeRange?: number;
  messages: Messages;
  decimals?: boolean;
  hasData?: boolean;
  valueFormatter?: (value: number) => string;
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const rawMax = Math.max(maxVal, ...data, ...(data2 ?? []), 0.001);
  const speedScale =
    unitMode === "speed" ? pickSpeedScale(rawMax) : null;
  const chartData =
    unitMode === "speed" && speedScale
      ? data.map((v) => scaleSpeedValue(v, speedScale))
      : data;
  const chartData2 =
    data2 && unitMode === "speed" && speedScale
      ? data2.map((v) => scaleSpeedValue(v, speedScale))
      : data2;
  const chartMax =
    unitMode === "speed" && speedScale
      ? scaleSpeedValue(rawMax, speedScale) * 1.15
      : rawMax;

  const formatDisplay = (v: number) => {
    if (valueFormatter) return valueFormatter(v);
    if (unitMode === "speed") return formatBytesPerSec(v);
    if (unitMode === "percent") return formatPercent(v);
    return String(Math.round(v));
  };

  const axisMaxLabel =
    unitMode === "speed"
      ? formatSpeedAxisMax(rawMax)
      : `${chartMax.toFixed(0)}${unit}`;

  const showDecimals = decimals ?? unitMode === "percent";

  const width = 500;
  const height = 120;
  const paddingX = 16;
  const paddingY = 15;
  const chartWidth = width - paddingX * 2; // 468
  const chartHeight = height - paddingY * 2; // 90
  const maxValSafe = chartMax <= 0 ? 1 : chartMax;

  const denominator = Math.max(1, chartData.length - 1);

  const scrubConfig = React.useMemo(
    () => ({
      width,
      paddingX,
      chartWidth,
      dataLength: chartData.length,
    }),
    [chartData.length, chartWidth],
  );

  const {
    hoveredIndex,
    onMouseMove,
    onMouseLeave,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  } = useChartScrub(containerRef, scrubConfig);

  const points1 = chartData.map((val, i) => {
    const x = paddingX + (i / denominator) * chartWidth;
    const y = height - paddingY - (Math.max(0, Math.min(maxValSafe, val)) / maxValSafe) * chartHeight;
    return { x, y, val };
  });

  const denominator2 = chartData2 ? Math.max(1, chartData2.length - 1) : 1;
  const points2 = chartData2
    ? chartData2.map((val, i) => {
        const x = paddingX + (i / denominator2) * chartWidth;
        const y = height - paddingY - (Math.max(0, Math.min(maxValSafe, val)) / maxValSafe) * chartHeight;
        return { x, y, val };
      })
    : null;

  // Generate SVG path coordinate string.
  const pathD = points1.length > 0 ? `M ${points1[0].x} ${points1[0].y} ` + points1.map(p => `L ${p.x} ${p.y}`).join(" ") : "";
  const areaD = points1.length > 0 ? `${pathD} L ${points1[points1.length - 1].x} ${height - paddingY} L ${points1[0].x} ${height - paddingY} Z` : "";

  const pathD2 = points2 && points2.length > 0 ? `M ${points2[0].x} ${points2[0].y} ` + points2.map(p => `L ${p.x} ${p.y}`).join(" ") : "";
  const areaD2 = points2 && points2.length > 0 ? `${pathD2} L ${points2[points2.length - 1].x} ${height - paddingY} L ${points2[0].x} ${height - paddingY} Z` : "";

  // Grid lines
  const gridLines = [0.25, 0.5, 0.75, 1];

  const strokeColor = theme === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)";
  const labelColor = theme === "dark" ? "text-neutral-500 font-mono" : "text-neutral-500 font-mono";

  const isHovering = hoveredIndex !== null;
  const activeIdx = hoveredIndex !== null ? hoveredIndex : chartData.length - 1;

  const displayVal1 = data[activeIdx] ?? 0;
  const displayVal2 = data2 ? (data2[activeIdx] ?? 0) : null;

  const activeX = points1[activeIdx]?.x ?? 0;
  const activeY1 = points1[activeIdx]?.y ?? 0;
  const activeY2 = points2 && points2[activeIdx] ? points2[activeIdx].y : 0;
  const minY = points2 && points2[activeIdx] ? Math.min(activeY1, activeY2) : activeY1;

  const safeId = title.replace(/[^a-zA-Z0-9]/g, "_");

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="group py-2 flex flex-col space-y-3 cursor-crosshair"
    >
      <div className="flex items-center gap-3 select-none">
        <span className={`shrink-0 font-bold tracking-wider uppercase ${zenType.section} ${theme === "dark" ? "text-neutral-400" : "text-neutral-500"} font-mono`}>{title}</span>
        <span className="h-px flex-1 bg-zen-line" aria-hidden />
        <div className={`shrink-0 flex items-center justify-end gap-2 sm:gap-3 ${zenType.data} font-mono select-none font-bold`}>
          {isHovering && (
            <span className={`${zenType.label} text-[#f59e0b] bg-[#f59e0b]/15 px-1 py-0.5 rounded tracking-wide uppercase font-black`}>
              {formatChartOffsetLabel(
                chartData.length - 1 - activeIdx,
                timeRange,
                chartData.length,
                messages,
              )}
            </span>
          )}
          <span style={{ color }}>● {formatDisplay(displayVal1)}</span>
          {displayVal2 !== null && (
            <span style={{ color: color2 }}>● {formatDisplay(displayVal2)}</span>
          )}
        </div>
      </div>

      <div className="relative pointer-events-none">
        {!hasData ? (
          <div
            className={`h-28 sm:h-32 md:h-24 flex items-center justify-center ${zenType.caption} uppercase tracking-widest font-mono ${theme === "dark" ? "text-neutral-600" : "text-neutral-400"}`}
          >
            {messages.noHistory}
          </div>
        ) : (
        <>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-28 sm:h-32 md:h-24 overflow-visible">
          <defs>
            <linearGradient id={`grad-${safeId}-1`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
            {data2 && (
              <linearGradient id={`grad-${safeId}-2`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color2} stopOpacity="0.15" />
                <stop offset="100%" stopColor={color2} stopOpacity="0.0" />
              </linearGradient>
            )}
          </defs>

          {/* Grid lines */}
          {gridLines.map((ratio, index) => {
            const h = height - paddingY - ratio * chartHeight;
            return (
              <line
                key={index}
                x1="0"
                y1={h}
                x2={width}
                y2={h}
                stroke={strokeColor}
                strokeDasharray="2,4"
              />
            );
          })}
          {/* Vertical Grid ticks */}
          {Array.from({ length: 5 }).map((_, i) => {
            const x = paddingX + (i / 4) * chartWidth;
            return (
              <line
                key={i}
                x1={x}
                y1={paddingY}
                x2={x}
                y2={height - paddingY}
                stroke={strokeColor}
                strokeDasharray="2,4"
              />
            );
          })}

          {/* Area 2 */}
          {areaD2 && (
            <path d={areaD2} fill={`url(#grad-${safeId}-2)`} />
          )}
          {/* Line 2 */}
          {pathD2 && (
            <path
              d={pathD2}
              stroke={color2}
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="opacity-80"
            />
          )}

          {/* Area 1 */}
          {areaD && (
            <path d={areaD} fill={`url(#grad-${safeId}-1)`} />
          )}
          {/* Line 1 */}
          {pathD && (
            <path
              d={pathD}
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}

          {/* Vertical tracker crosshair line on hover */}
          {isHovering && (
            <line
              x1={activeX}
              y1={paddingY}
              x2={activeX}
              y2={height - paddingY}
              stroke={theme === "dark" ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.45)"}
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          )}

          {/* Bullet points: Active / Hover state */}
          {points1.length > 0 && (
            <g>
              <circle cx={activeX} cy={activeY1} r={isHovering ? "4" : "3"} fill={color} />
              {!isHovering && (
                <circle cx={points1[points1.length - 1].x} cy={points1[points1.length - 1].y} r="6" fill="none" stroke={color} strokeWidth="1" className="animate-pulse" />
              )}
            </g>
          )}

          {points2 && points2.length > 0 && (
            <g>
              <circle cx={activeX} cy={activeY2} r={isHovering ? "4" : "3"} fill={color2} />
            </g>
          )}
        </svg>

        {isHovering && (
          <div
            className={`absolute z-10 pointer-events-none px-2 py-1.5 rounded shadow-lg border ${zenType.caption} font-mono flex flex-col gap-0.5 select-none max-w-[min(280px,calc(100vw-2rem))] ${
              theme === "dark"
                ? "bg-zen-surface border-neutral-800 text-neutral-100"
                : "bg-zen-surface border-neutral-200 text-neutral-800"
            }`}
            style={{
              left: `${(activeX / width) * 100}%`,
              top: `${(minY / height) * 100}%`,
              transform:
                activeX / width > 0.55
                  ? "translate(-102%, -125%)"
                  : "translate(8%, -125%)",
            }}
          >
            <div className="flex items-center gap-4 whitespace-nowrap justify-between">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: color }}></span>
                <span>{label1}:</span>
              </span>
              <span className="font-bold" style={{ color }}>{formatDisplay(displayVal1)}</span>
            </div>
            {displayVal2 !== null && (
              <div className="flex items-center gap-4 whitespace-nowrap justify-between">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: color2 }}></span>
                  <span>{label2 || "VALUE 2"}:</span>
                </span>
                <span className="font-bold" style={{ color: color2 }}>{formatDisplay(displayVal2)}</span>
              </div>
            )}
          </div>
        )}

        <div className={`absolute top-0.5 left-1 ${zenType.micro} leading-none ${labelColor} pointer-events-none select-none`}>
          MAX: {axisMaxLabel}
        </div>
        <div className={`absolute bottom-0.5 left-1 ${zenType.micro} leading-none ${labelColor} pointer-events-none select-none`}>
          MIN: {unitMode === "speed" ? "0" : `0${unit}`}
        </div>
        </>
        )}
      </div>

      {subMetrics && <div className="pt-1.5">{subMetrics}</div>}
    </div>
  );
};


export function NodeDetail({
  node,
  lang,
  theme,
  recentRecords = [],
}: NodeDetailProps) {
  const t = translations[lang];
  const { recordEnabled, loadPresets, pingPresets } = useRecordSettings();

  const [selectedLoadHours, setSelectedLoadHours] = React.useState(
    () => loadPresets[0] ?? 1,
  );
  const [selectedPingHours, setSelectedPingHours] = React.useState(
    () => pingPresets[0] ?? 1,
  );
  const [isPingLoading, setIsPingLoading] = React.useState(false);
  const [subSection, setSubSection] = React.useState<"metrics" | "latency">(
    "metrics",
  );
  const [selectedProbes, setSelectedProbes] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (loadPresets.length === 0) return;
    if (!loadPresets.includes(selectedLoadHours)) {
      setSelectedLoadHours(loadPresets[0]);
    }
  }, [loadPresets, selectedLoadHours]);

  React.useEffect(() => {
    if (pingPresets.length === 0) return;
    if (!pingPresets.includes(selectedPingHours)) {
      setSelectedPingHours(pingPresets[0]);
    }
  }, [pingPresets, selectedPingHours]);

  const loadHours = recordEnabled && node.online ? selectedLoadHours : 0;
  const {
    records: loadRecords,
    isLoading: isLoadLoading,
  } = useLoadRecords(node.id, loadHours);

  const handleToggleProbe = (id: string) => {
    if (id === "CLEAR_ALL") {
      setSelectedProbes([]);
      return;
    }
    setSelectedProbes((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleLoadRangeChange = (newHours: number) => {
    if (newHours === selectedLoadHours || isLoadLoading) return;
    setSelectedLoadHours(newHours);
  };

  const handlePingRangeChange = (newHours: number) => {
    if (newHours === selectedPingHours || isPingLoading) return;
    setSelectedPingHours(newHours);
  };

  const activePresets =
    subSection === "metrics" ? loadPresets : pingPresets;
  const activeHours =
    subSection === "metrics" ? selectedLoadHours : selectedPingHours;
  const activeRangeLoading =
    subSection === "metrics" ? isLoadLoading : isPingLoading;
  const handleActiveRangeChange =
    subSection === "metrics" ? handleLoadRangeChange : handlePingRangeChange;

  // Helper to format speeds (node fields are KB/s)
  const formatSpeed = (kbps: number) => formatKbps(kbps);

  const renderProgressBar = (percent: number, colorClass: string) => {
    const totalSegments = 32;
    return (
      <div className="flex items-center justify-between gap-[3px] w-full my-2 select-none">
        {Array.from({ length: totalSegments }).map((_, i) => {
          const isActive = (i / totalSegments) * 100 < percent;
          return (
            <div
              key={i}
              className="flex-1 flex items-center justify-center"
              style={{ height: "4px" }}
            >
              {isActive ? (
                <div className={`w-full h-full rounded-[1px] transition-all duration-300 ${colorClass}`} />
              ) : (
                <div className={`w-[2px] h-[2px] rounded-full transition-all duration-300 ${
                  theme === "dark" ? "bg-neutral-800" : "bg-neutral-300/60"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const memPercent = node.online ? (node.memoryUsed / node.memoryTotal) * 100 : 0;
  const diskPercent = node.online ? (node.diskUsed / node.diskTotal) * 100 : 0;

  // Design accent variables
  const textPrimary = theme === "dark" ? "text-neutral-300" : "text-neutral-700";
  const textMuted = theme === "dark" ? "text-neutral-500" : "text-neutral-500";
  const textBody = theme === "dark" ? "text-neutral-300" : "text-neutral-700";
  const textSecondary = theme === "dark" ? "text-neutral-400" : "text-neutral-600";

  const SectionHeading = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-3">
      <span
        className={`shrink-0 font-bold ${zenType.section} zen-track-tight uppercase ${textSecondary} font-mono`}
      >
        {children}
      </span>
      <span className="h-px flex-1 bg-zen-line" aria-hidden />
    </div>
  );

  const loadTotals = loadTotalsFromNode(node);

  const buildHistory = (metric: Parameters<typeof buildMetricHistory>[0]) =>
    buildMetricHistory(
      metric,
      selectedLoadHours,
      loadTotals,
      loadRecords,
      recentRecords,
    );

  const cpuHist = buildHistory("cpu");
  const memHist = buildHistory("mem");
  const swapHist = buildHistory("swap");
  const diskHist = buildHistory("disk");
  const netInHist = buildHistory("netin");
  const netOutHist = buildHistory("netout");
  const tcpHist = buildHistory("tcp");
  const udpHist = buildHistory("udp");
  const procHist = buildHistory("processes");

  const displayedCpuHistory = cpuHist.values;
  const displayedMemHistory = memHist.values;
  const displayedSwapHistory = swapHist.values;
  const displayedDiskHistory = diskHist.values;
  const displayedNetInHistory = netInHist.values;
  const displayedNetOutHistory = netOutHist.values;
  const displayedTcpHistory = tcpHist.values;
  const displayedUdpHistory = udpHist.values;
  const displayedProcessesHistory = procHist.values;

  const netRawMax = Math.max(
    ...displayedNetInHistory,
    ...displayedNetOutHistory,
    node.netSpeedIn * 1024,
    node.netSpeedOut * 1024,
    1,
  );

  const hasTags = parseNodeTags(node.tags).length > 0;
  const publicRemarkText = node.publicRemark.trim();
  const privateRemarkText = node.privateRemark.trim();
  const hasPublicRemark = publicRemarkText.length > 0;
  const hasPrivateRemark = privateRemarkText.length > 0;
  const showNodeMeta = hasTags || hasPublicRemark || hasPrivateRemark;

  return (
    <div className={`font-sans ${zenType.body} select-none space-y-6 md:space-y-8 pt-1 pb-4`}>
      {/* Title block - Pure Typography */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-y-2">
        <div>
          <span className={`${zenType.section} zen-track-tight uppercase ${textMuted} block mb-1 font-mono`}>
            {t.detailedReport}
          </span>
          <h2 className={`font-black ${textPrimary} text-xl sm:text-2xl tracking-tight uppercase flex items-center gap-3`}>
            <Flag flag={node.flag} className="w-6 h-6 shrink-0" />
            {node.name}
          </h2>
        </div>
        <div>
          {node.online ? (
            <span className="text-[#10b981] font-black text-sm tracking-widest uppercase font-mono">
              {t.hostOnline}
            </span>
          ) : (
            <span className="text-red-500 font-black text-sm tracking-widest uppercase font-mono">
              {t.connectionOffline}
            </span>
          )}
        </div>
      </div>

      {showNodeMeta ? (
        <div className="space-y-2.5">
          {hasTags ? (
            <NodeTags tags={node.tags} theme={theme} size="md" maxVisible={99} />
          ) : null}
          {hasPublicRemark ? (
            <div
              className={`font-mono ${zenType.data} leading-relaxed ${
                theme === "dark" ? "text-neutral-400" : "text-neutral-600"
              }`}
            >
              <span
                className={`mb-1 block ${zenType.label} font-bold uppercase zen-track-tight ${
                  theme === "dark" ? "text-neutral-500" : "text-neutral-400"
                }`}
              >
                {t.publicRemark}
              </span>
              <p className={`whitespace-pre-wrap break-words ${textPrimary}`}>
                {publicRemarkText}
              </p>
            </div>
          ) : null}
          {hasPrivateRemark ? (
            <div
              className={`font-mono ${zenType.data} leading-relaxed ${
                theme === "dark" ? "text-neutral-400" : "text-neutral-600"
              }`}
            >
              <span
                className={`mb-1 block ${zenType.label} font-bold uppercase zen-track-tight ${
                  theme === "dark" ? "text-neutral-500" : "text-neutral-400"
                }`}
              >
                {t.privateRemark}
              </span>
              <p className={`whitespace-pre-wrap break-words ${textPrimary}`}>
                {privateRemarkText}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {node.online ? (
        <>
          {/* Main 2x2 Mono Section Grid */}
          <div className="grid grid-cols-1 gap-x-16 gap-y-8 md:grid-cols-2 pt-2">
            {/* Column 1: Hardware Specifications */}
            <div className="space-y-4">
              <SectionHeading>{t.hardwareSpec}</SectionHeading>
              <div className={`grid grid-cols-2 gap-y-3 ${zenType.data} font-mono border-b pb-6 border-transparent`}>
                <span className={textMuted}>{t.lblCpuVendor}</span>
                <span className={`font-bold ${textPrimary}`}>{node.cpuVendor}</span>

                <span className={textMuted}>{t.lblCpuCores}</span>
                <span className={`font-bold ${textPrimary}`}>{node.cpuCores} {t.lblCpuThreads}</span>

                <span className={textMuted}>{t.lblArch}</span>
                <span className={`font-bold ${textPrimary}`}>{node.arch}</span>

                <span className={textMuted}>{t.lblSystemOs}</span>
                <span className={`font-bold ${textPrimary} flex items-center gap-2`}>
                  <OsIcon os={node.os} />
                  {node.os}
                </span>

                <span className={textMuted}>{t.lblUptimeSec}</span>
                <span className={`font-bold ${textPrimary}`}>{node.uptime}</span>
              </div>
            </div>

            {/* Column 2: System Loads & Memory */}
            <div className="space-y-4">
              <SectionHeading>{t.capacityLoads}</SectionHeading>
              <div className="space-y-4">
                <div>
                  <div className={`flex justify-between ${zenType.data} ${textSecondary} mb-1.5 tracking-wider font-mono`}>
                    <span>{t.lblCpuLoadUtil}</span>
                    <span className={`font-black ${textPrimary} font-mono text-xs`}>{node.cpuUsage.toFixed(1)}%</span>
                  </div>
                  {renderProgressBar(node.cpuUsage, "bg-emerald-500/40")}
                  <div className={`${zenType.caption} ${textMuted} mt-1.5 font-mono`}>
                    {t.lblLoadAvg} [{node.load5}]
                  </div>
                </div>

                <div>
                  <div className={`flex justify-between ${zenType.data} ${textSecondary} mb-1.5 tracking-wider font-mono`}>
                    <span>{t.lblMemoryAllocated}</span>
                    <span className={`font-black ${textPrimary} font-mono text-xs`}>
                      {formatStoragePair(node.memoryUsed, node.memoryTotal)}
                    </span>
                  </div>
                  {renderProgressBar(memPercent, "bg-blue-500/40")}
                  <div className={`${zenType.caption} ${textMuted} mt-1.5 font-mono`}>
                    SWAP: {formatStoragePair(node.swapUsed, node.swapTotal)}
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Disk */}
            <div className="space-y-4 pt-4">
              <SectionHeading>{t.storageFs}</SectionHeading>
              <div className="space-y-4">
                <div>
                  <div className={`flex justify-between ${zenType.data} ${textSecondary} mb-1.5 tracking-wider font-mono`}>
                    <span className="font-bold">{t.lblDisk}</span>
                    <span className={`font-black ${textPrimary} text-xs`}>
                      {node.diskUsed.toFixed(1)} GB / {node.diskTotal.toFixed(1)} GB
                    </span>
                  </div>
                  {renderProgressBar(diskPercent, "bg-amber-500/40")}
                </div>
              </div>
            </div>

            {/* Column 4: Network Throughput and Speeds */}
            <div className="space-y-4 pt-4">
              <SectionHeading>{t.networkIo}</SectionHeading>
              <div className="grid grid-cols-2 gap-x-8 font-mono">
                {/* RX Block */}
                <div className="space-y-3">
                  <div className={`${zenType.caption} font-bold uppercase tracking-wider ${textSecondary} flex items-center gap-1.5`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t.lblInboundRx}
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-baseline">
                      <span className={`${textMuted} ${zenType.caption} uppercase font-bold tracking-wider`}>{t.lblCurrentSpeed}</span>
                      <span className={`font-black text-xs ${textPrimary}`}>{formatSpeed(node.netSpeedIn)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className={`${textMuted} ${zenType.caption} uppercase font-bold tracking-wider`}>{t.lblDownloaded}</span>
                      <span className={`font-bold ${textPrimary}`}>{formatTrafficGb(node.bandwidthUsedIn)}</span>
                    </div>
                  </div>
                </div>

                {/* TX Block */}
                <div className="space-y-3">
                  <div className={`${zenType.caption} font-bold uppercase tracking-wider ${textSecondary} flex items-center gap-1.5`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    {t.lblOutboundTx}
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-baseline">
                      <span className={`${textMuted} ${zenType.caption} uppercase font-bold tracking-wider`}>{t.lblCurrentSpeed}</span>
                      <span className={`font-black text-xs ${textPrimary}`}>{formatSpeed(node.netSpeedOut)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className={`${textMuted} ${zenType.caption} uppercase font-bold tracking-wider`}>{t.lblUploaded}</span>
                      <span className={`font-bold ${textPrimary}`}>{formatTrafficGb(node.bandwidthUsedOut)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {node.bandwidthTotal > 0 && (
                <div className={`flex justify-between items-baseline pt-2 mt-1 border-t border-neutral-500/10 ${zenType.caption} font-mono`}>
                  <span className={`${textMuted} uppercase font-bold tracking-wider`}>
                    {getTrafficTypeLabel(node.trafficLimitType, {
                      sum: t.trafficTypeSum,
                      max: t.trafficTypeMax,
                      min: t.trafficTypeMin,
                      up: t.trafficTypeUp,
                      down: t.trafficTypeDown,
                    })}
                  </span>
                  <span className={`font-bold ${textPrimary}`}>{formatNodeTraffic(node)}</span>
                </div>
              )}
            </div>
          </div>

          {/* [05] UNIFIED DYNAMIC HARDWARE TIMESERIES & SYSTEM PROCESS TELEMETRY / LATENCY MONITORING */}
          {recordEnabled && (
          <div className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3">
              <div className="flex justify-center md:justify-start min-w-0">
                <span className={`font-bold ${zenType.section} zen-track-tight uppercase ${textSecondary} font-mono`}>
                  {subSection === "metrics"
                    ? t.sectionResourceMonitoring
                    : t.sectionLatencyDetect}
                </span>
              </div>

              <div className={`flex flex-wrap items-center justify-center gap-2 ${zenType.caption} select-none shrink-0`}>
                <button
                  type="button"
                  onClick={() => setSubSection("metrics")}
                  className={`relative zen-touch-btn px-1 cursor-pointer uppercase tracking-widest font-black transition-all duration-250 ${
                    subSection === "metrics"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  {t.tabMetrics}
                  {subSection === "metrics" && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-emerald-500 rounded-full" />
                  )}
                </button>
                <span className={`text-neutral-300 dark:text-neutral-800 font-light ${zenType.caption} select-none`}>/</span>
                <button
                  type="button"
                  onClick={() => setSubSection("latency")}
                  className={`relative zen-touch-btn px-1 cursor-pointer uppercase tracking-widest font-black transition-all duration-250 ${
                    subSection === "latency"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  {t.tabLatency}
                  {subSection === "latency" && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-emerald-500 rounded-full" />
                  )}
                </button>
              </div>

              <div className="flex justify-center md:justify-end min-w-0">
                <HistoryRangeSelector
                  presets={activePresets}
                  value={activeHours}
                  onChange={handleActiveRangeChange}
                  disabled={activeRangeLoading}
                  theme={theme}
                  messages={t}
                />
              </div>
            </div>

            <div className="relative">
              {subSection === "metrics" && isLoadLoading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center select-none bg-transparent pointer-events-none">
                  <div className={`px-4 py-2.5 ${zenType.caption} uppercase font-bold zen-track-tight font-mono flex items-center gap-2.5 border rounded-sm shadow-sm ${
                    theme === "dark"
                      ? "bg-zen-surface/95 border-neutral-800 text-emerald-500"
                      : "bg-zen-surface/95 border-neutral-200/80 text-emerald-600"
                  }`}>
                    <svg className="animate-spin h-3.5 w-3.5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t.loadingData}</span>
                  </div>
                </div>
              )}

              {subSection === "latency" && isPingLoading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center select-none bg-transparent pointer-events-none">
                  <div className={`px-4 py-2.5 ${zenType.caption} uppercase font-bold zen-track-tight font-mono flex items-center gap-2.5 border rounded-sm shadow-sm ${
                    theme === "dark"
                      ? "bg-zen-surface/95 border-neutral-800 text-emerald-500"
                      : "bg-zen-surface/95 border-neutral-200/80 text-emerald-600"
                  }`}>
                    <svg className="animate-spin h-3.5 w-3.5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t.loadingData}</span>
                  </div>
                </div>
              )}

              {subSection === "metrics" ? (
                <>
                  {/* Sub-grid of 4 charts */}
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-300 ${isLoadLoading ? "blur-[1.5px] opacity-40 select-none pointer-events-none" : ""}`}>
                    {/* Chart 1: CPU Utilisation */}
                    <MiniLineChart
                      data={displayedCpuHistory}
                      color="#10b981"
                      maxVal={100}
                      unitMode="percent"
                      title={t.cpu}
                      label1="CPU"
                      theme={theme}
                      timeRange={selectedLoadHours}
                      messages={t}
                      hasData={cpuHist.hasData}
                      subMetrics={
                        <div className={`flex justify-between items-center ${zenType.caption} font-mono ${textMuted}`}>
                          <span>{t.lblLoadAvgShort} [{node.load5}]</span>
                          <span>{node.cpuCores} {t.lblCpuCores}</span>
                        </div>
                      }
                    />

                    {/* Chart 2: Memory & SWAP */}
                    <MiniLineChart
                      data={displayedMemHistory}
                      data2={displayedSwapHistory}
                      color="#3b82f6"
                      color2="#8b5cf6"
                      maxVal={100}
                      unitMode="percent"
                      title={t.lblMemoryUsage}
                      label1="RAM"
                      label2="SWAP"
                      theme={theme}
                      timeRange={selectedLoadHours}
                      messages={t}
                      hasData={memHist.hasData || swapHist.hasData}
                      subMetrics={
                        <div className={`grid grid-cols-2 ${zenType.caption} font-mono leading-tight`}>
                          <div className="flex justify-between pr-4 border-r border-neutral-500/10">
                            <span className={textMuted}>RAM:</span>
                            <span className={textPrimary}>{formatStoragePair(node.memoryUsed, node.memoryTotal)}</span>
                          </div>
                          <div className="flex justify-between pl-4">
                            <span className={textMuted}>SWAP:</span>
                            <span className={textPrimary}>{formatStoragePair(node.swapUsed, node.swapTotal)}</span>
                          </div>
                        </div>
                      }
                    />

                    {/* Chart 3: Disk Partition Map */}
                    <MiniLineChart
                      data={displayedDiskHistory}
                      color="#f59e0b"
                      maxVal={100}
                      unitMode="percent"
                      title={t.lblDiskCoverage}
                      label1={t.lblDiskUsedShort}
                      theme={theme}
                      timeRange={selectedLoadHours}
                      messages={t}
                      hasData={diskHist.hasData}
                      subMetrics={
                        <div className={`${zenType.caption} font-mono ${textMuted}`}>
                          <span>{t.lblUsedTotal} </span>
                          <span className={textPrimary}>
                            {node.diskUsed.toFixed(1)} / {node.diskTotal.toFixed(0)} GB
                          </span>
                        </div>
                      }
                    />

                    {/* Chart 4: Network Traffic speeds */}
                    <MiniLineChart
                      data={displayedNetInHistory}
                      data2={displayedNetOutHistory}
                      color="#14b8a6"
                      color2="#f43f5e"
                      maxVal={netRawMax}
                      unitMode="speed"
                      title={t.lblNetworkSpeedRxTx}
                      label1="RX"
                      label2="TX"
                      theme={theme}
                      timeRange={selectedLoadHours}
                      messages={t}
                      hasData={netInHist.hasData || netOutHist.hasData}
                      subMetrics={
                        <div className={`grid grid-cols-2 ${zenType.caption} font-mono leading-tight`}>
                          <div className="flex justify-between pr-4 border-r border-neutral-500/10">
                            <span className={textMuted}>RX:</span>
                            <span className="text-[#14b8a6] font-bold">{formatSpeed(node.netSpeedIn)}</span>
                          </div>
                          <div className="flex justify-between pl-4">
                            <span className={textMuted}>TX:</span>
                            <span className="text-[#f43f5e] font-bold">{formatSpeed(node.netSpeedOut)}</span>
                          </div>
                        </div>
                      }
                    />
                  </div>

                  {/* Integrated connection & processes flow metrics */}
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 transition-all duration-300 ${isLoadLoading ? "blur-[1.5px] opacity-40 select-none pointer-events-none" : ""}`}>
                    {/* Chart 5: Network Connections TCP/UDP */}
                    <MiniLineChart
                      data={displayedTcpHistory}
                      data2={displayedUdpHistory}
                      color="#10b981"
                      color2="#8b5cf6"
                      maxVal={Math.max(120, ...displayedTcpHistory, ...displayedUdpHistory, 10)}
                      unitMode="count"
                      title={t.lblNetworkConnections}
                      label1="TCP"
                      label2="UDP"
                      theme={theme}
                      timeRange={selectedLoadHours}
                      messages={t}
                      hasData={tcpHist.hasData || udpHist.hasData}
                      subMetrics={
                        <div className={`grid grid-cols-2 ${zenType.caption} font-mono leading-tight`}>
                          <div className="flex justify-between pr-4 border-r border-neutral-500/10">
                            <span className={textMuted}>TCP:</span>
                            <span className="text-[#10b981] font-bold">{node.tcpConnections ?? 0} {t.unitConnections}</span>
                          </div>
                          <div className="flex justify-between pl-4">
                            <span className={textMuted}>UDP:</span>
                            <span className="text-[#8b5cf6] font-bold">{node.udpConnections ?? 0} {t.unitConnections}</span>
                          </div>
                        </div>
                      }
                    />

                    {/* Chart 6: Active Processes Count */}
                    <MiniLineChart
                      data={displayedProcessesHistory}
                      color="#f59e0b"
                      maxVal={Math.max(200, ...displayedProcessesHistory, 10)}
                      unitMode="count"
                      title={t.lblProcessCount}
                      label1={t.lblActiveProc}
                      theme={theme}
                      timeRange={selectedLoadHours}
                      messages={t}
                      hasData={procHist.hasData}
                      subMetrics={
                        <div className={`flex justify-between items-center ${zenType.caption} font-mono ${textMuted}`}>
                          <span>{t.lblActiveProcesses} <span className="text-[#f59e0b] font-bold">{node.processesCount ?? 0}</span></span>
                          <span>{t.lblStatusOk}</span>
                        </div>
                      }
                    />
                  </div>
                </>
              ) : (
                <div className={`transition-all duration-350 min-h-52 sm:min-h-56 md:min-h-60 ${isPingLoading ? "blur-[1.5px] opacity-40 select-none pointer-events-none" : ""}`}>
                <LatencyProbePanel
                  uuid={node.id}
                  hours={selectedPingHours}
                  onLoadingChange={setIsPingLoading}
                  selectedProbes={selectedProbes}
                  onToggleProbe={handleToggleProbe}
                  lang={lang}
                  theme={theme}
                />
                </div>
              )}
            </div>
          </div>
          )}
        </>
      ) : (
        <div className="py-20 text-center text-red-500 flex flex-col items-center justify-center space-y-4 font-sans select-none">
          <span className="text-base font-extrabold tracking-widest text-red-500 uppercase">{t.vpsHostOffline}</span>
          <p className={`max-w-md ${textSecondary} ${zenType.data} uppercase tracking-wider leading-relaxed`}>
            {t.hostOfflineWarning}
          </p>
          <div className={`${zenType.caption} tracking-wider ${textMuted} uppercase font-mono`}>
            {t.msgNodeOfflineAwaiting}
          </div>
        </div>
      )}
    </div>
  );
}
