/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { VPSNode } from "../types";
import { translations, Lang, formatMsg } from "../lib/i18n";
import { formatKbps, formatNodeTraffic, getTrafficTypeLabel } from "@/lib/formatUnits";
import { formatNodeBilling, type BillingLabels } from "@/lib/billingDisplay";
import {
  ALL_NODE_GROUP,
  allGroupsLabel,
  collectNodeGroups,
} from "@/lib/nodeGroups";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import { useViewMode } from "@/hooks/useViewMode";
import { useRecordSettings } from "@/hooks/useRecordSettings";
import { Flag } from "@/components/Flag";
import { OsIcon } from "@/components/OsIcon";
import { NodeTags } from "@/components/NodeTags";
import { PublicRemarkButton } from "@/components/PublicRemarkButton";
import { LatencyHistoryBlocks } from "@/components/LatencyHistoryBlocks";
import { zenType, zenTouch } from "@/lib/typography";

interface NodeTableProps {
  nodes: VPSNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: VPSNode) => void;
  lang: Lang;
  theme: "light" | "dark";
}

type SortField =
  | "default"
  | "status"
  | "name"
  | "os"
  | "cpu"
  | "mem"
  | "disk"
  | "latency"
  | "days";

type SortOrder = "asc" | "desc";

/** Maps the admin config option string to the internal sort field. */
const SORT_FIELD_MAP: Record<string, SortField> = {
  Default: "default",
  Name: "name",
  CPU: "cpu",
  Memory: "mem",
  Disk: "disk",
  Latency: "latency",
  Expiry: "days",
  Status: "status",
  OS: "os",
};

function getOSDetails(os: string, arch: string) {
  const upperOS = os.toUpperCase();
  let osKey = "";
  if (upperOS.includes("DEBIAN")) {
    osKey = "DEBIAN";
  } else if (upperOS.includes("UBUNTU")) {
    osKey = "UBUNTU";
  } else if (upperOS.includes("CENTOS")) {
    osKey = "CENTOS";
  } else if (upperOS.includes("ALPINE")) {
    osKey = "ALPINE";
  } else if (upperOS.includes("ROCKY")) {
    osKey = "ROCKY";
  } else if (upperOS.includes("ORACLE")) {
    osKey = "ORACLE";
  } else if (upperOS.includes("REDHAT") || upperOS.includes("RHEL")) {
    osKey = "RHEL";
  } else if (upperOS.includes("WINDOWS")) {
    osKey = "WINDOWS";
  } else if (upperOS.includes("MACOS")) {
    osKey = "MACOS";
  } else {
    osKey = os.split(/[\s,._-]+/)[0].toUpperCase();
    if (!osKey) osKey = "LINUX";
  }

  let archKey = arch.toUpperCase();
  if (archKey === "AARCH64") archKey = "ARM64";
  if (archKey === "X86_64") archKey = "AMD64";

  return { text: `${osKey} ${archKey}` };
}

export function NodeTable({
  nodes,
  selectedNodeId,
  onSelectNode,
  lang,
  theme,
}: NodeTableProps) {
  const t = translations[lang];
  const {
    showExpiryTime,
    defaultViewMode,
    defaultSortField,
    defaultSortOrder,
    showLatency,
    latencyColorConfig,
  } = useThemeSettings();
  const { recordEnabled } = useRecordSettings();
  const latencyVisible = recordEnabled && showLatency;

  const mappedDefaultSort = SORT_FIELD_MAP[defaultSortField] ?? "default";
  const initialSortField: SortField =
    mappedDefaultSort === "latency" && !latencyVisible ? "default" : mappedDefaultSort;
  const initialSortOrder: SortOrder =
    defaultSortOrder === "Descending" ? "desc" : "asc";

  const [activeGroup, setActiveGroup] = useState<string>(ALL_NODE_GROUP);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>(initialSortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState<boolean>(false);
  const userSortedRef = React.useRef(false);
  const groupScrollRef = useRef<HTMLDivElement>(null);

  const { viewMode, effectiveViewMode, setViewMode } = useViewMode(defaultViewMode);

  // Apply admin-configured default until the user manually changes the sort.
  React.useEffect(() => {
    if (userSortedRef.current) return;
    setSortField(initialSortField);
    setSortOrder(initialSortOrder);
  }, [initialSortField, initialSortOrder]);

  React.useEffect(() => {
    if (!latencyVisible && sortField === "latency") {
      setSortField("default");
    }
  }, [latencyVisible, sortField]);

  const getFieldLabel = (field: SortField) => {
    switch (field) {
      case "default":
        return t.sortDefault;
      case "status":
        return t.status;
      case "name":
        return t.name;
      case "os":
        return t.os;
      case "cpu":
        return t.cpu;
      case "mem":
        return t.mem;
      case "disk":
        return t.disk;
      case "latency":
        return t.ping;
      case "days":
        return t.expiry;
      default:
        return String(field).toUpperCase();
    }
  };

  const sortOptions: { value: SortField; label: string }[] = [
    { value: "default", label: t.sortDefault },
    { value: "name", label: t.name },
    { value: "cpu", label: t.cpu },
    { value: "mem", label: t.mem },
    { value: "disk", label: t.disk },
    ...(latencyVisible ? [{ value: "latency" as SortField, label: t.ping }] : []),
    ...(showExpiryTime ? [{ value: "days" as SortField, label: t.expiry }] : []),
    { value: "os", label: t.os },
    { value: "status", label: t.status },
  ];

  const formatSpeed = (kbps: number) => formatKbps(kbps);

  const trafficTypeLabels = {
    sum: t.trafficTypeSum,
    max: t.trafficTypeMax,
    min: t.trafficTypeMin,
    up: t.trafficTypeUp,
    down: t.trafficTypeDown,
  };

  const billingLabels: BillingLabels = {
    unitDays: t.unitDays,
    billingFree: t.billingFree,
    billingExpired: t.billingExpired,
    billingLongTerm: t.billingLongTerm,
    billingNoInfo: t.billingNoInfo,
    billingHidden: t.billingHidden,
    billingMonthly: t.billingMonthly,
    billingQuarterly: t.billingQuarterly,
    billingSemiAnnual: t.billingSemiAnnual,
    billingAnnual: t.billingAnnual,
    billingBiennial: t.billingBiennial,
    billingTriennial: t.billingTriennial,
    billingQuinquennial: t.billingQuinquennial,
    billingOnce: t.billingOnce,
    billingCycleDays: t.billingCycleDays,
  };

  const renderBilling = (node: VPSNode) => {
    const billing = formatNodeBilling(
      {
        price: node.price,
        currency: node.currency,
        billingCycle: node.billingCycle,
        expiredAt: node.expiredAt,
      },
      billingLabels,
    );
    const urgentClass = billing.isExpired
      ? "text-rose-500 font-bold"
      : billing.isUrgent
        ? "text-rose-500 font-bold animate-pulse"
        : "";
    return (
      <span className={`${textPrimary} font-bold ${urgentClass}`}>
        {billing.text}
      </span>
    );
  };

  const trafficTypeBadgeClass =
    theme === "dark"
      ? "bg-neutral-800/80 text-neutral-400 border border-neutral-700/60"
      : "bg-neutral-100 text-neutral-500 border border-neutral-200/80";

  const renderTrafficValue = (node: VPSNode) => (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className="truncate">{formatNodeTraffic(node)}</span>
      {node.bandwidthTotal > 0 && (
        <span
          className={`inline-flex shrink-0 px-1 py-px rounded-sm ${zenType.micro} font-bold tracking-wide leading-none ${trafficTypeBadgeClass}`}
        >
          {getTrafficTypeLabel(node.trafficLimitType, trafficTypeLabels)}
        </span>
      )}
    </span>
  );

  const nodeGroups = useMemo(() => collectNodeGroups(nodes), [nodes]);
  const showGroupTabs = nodeGroups.length >= 1;

  useEffect(() => {
    if (
      activeGroup !== ALL_NODE_GROUP &&
      !nodeGroups.includes(activeGroup)
    ) {
      setActiveGroup(ALL_NODE_GROUP);
    }
  }, [activeGroup, nodeGroups]);

  useEffect(() => {
    const scroller = groupScrollRef.current;
    if (!scroller) return;
    const activeChip = scroller.querySelector<HTMLElement>("[data-group-active='true']");
    activeChip?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeGroup, nodeGroups.length]);

  useEffect(() => {
    if (!showExpiryTime && sortField === "days") {
      setSortField("default");
    }
  }, [showExpiryTime, sortField]);

  // Filter & Search
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const matchGroup =
        activeGroup === ALL_NODE_GROUP || node.nodeGroup === activeGroup;
      const lowerSearch = searchTerm.toLowerCase();
      const matchSearch =
        node.name.toLowerCase().includes(lowerSearch) ||
        node.location.toLowerCase().includes(lowerSearch) ||
        node.os.toLowerCase().includes(lowerSearch) ||
        node.provider.toLowerCase().includes(lowerSearch) ||
        node.tags.toLowerCase().includes(lowerSearch) ||
        node.publicRemark.toLowerCase().includes(lowerSearch) ||
        node.privateRemark.toLowerCase().includes(lowerSearch);
      return matchGroup && matchSearch;
    });
  }, [nodes, activeGroup, searchTerm]);

  // Sorting — "default" keeps the order returned by the Komari backend
  // (already weighted + offline-positioned upstream in useKomariNodes).
  const sortedNodes = useMemo(() => {
    if (sortField === "default") return filteredNodes;
    return [...filteredNodes].sort((a, b) => {
      // Offline/down nodes are automatically grouped/forced at the bottom
      if (a.online !== b.online) {
        return a.online ? -1 : 1;
      }

      let valA: any = "";
      let valB: any = "";

      if (sortField === "status") {
        valA = a.online ? 1 : 0;
        valB = b.online ? 1 : 0;
      } else if (sortField === "name") {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortField === "os") {
        valA = a.os.toLowerCase();
        valB = b.os.toLowerCase();
      } else if (sortField === "cpu") {
        valA = a.online ? a.cpuUsage : -1;
        valB = b.online ? b.cpuUsage : -1;
      } else if (sortField === "mem") {
        valA = a.online ? a.memoryUsed / a.memoryTotal : -1;
        valB = b.online ? b.memoryUsed / b.memoryTotal : -1;
      } else if (sortField === "disk") {
        valA = a.online ? a.diskUsed / a.diskTotal : -1;
        valB = b.online ? b.diskUsed / b.diskTotal : -1;
      } else if (sortField === "latency") {
        valA = a.online ? a.latency : 99999;
        valB = b.online ? b.latency : 99999;
      } else if (sortField === "days") {
        valA = formatNodeBilling(
          {
            price: a.price,
            currency: a.currency,
            billingCycle: a.billingCycle,
            expiredAt: a.expiredAt,
          },
          billingLabels,
        ).daysRemaining;
        valB = formatNodeBilling(
          {
            price: b.price,
            currency: b.currency,
            billingCycle: b.billingCycle,
            expiredAt: b.expiredAt,
          },
          billingLabels,
        ).daysRemaining;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredNodes, sortField, sortOrder, billingLabels]);

  const listColSpan =
    (latencyVisible ? 1 : 0) +
    (showExpiryTime ? 1 : 0) +
    7;

  const handleSort = (field: SortField) => {
    userSortedRef.current = true;
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc"); // Default to desc for performance metrics
    }
  };

  const getSortOrderIcon = (order: SortOrder) => (order === "asc" ? "▲" : "▼");

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return " ·";
    return ` ${getSortOrderIcon(sortOrder)}`;
  };

  // Styling helpers
  const textPrimary = theme === "dark" ? "text-neutral-300" : "text-neutral-700";
  const textMuted = theme === "dark" ? "text-neutral-400 font-medium" : "text-neutral-600 font-medium";
  const borderBottomClass = "border-zen-line-strong";
  const toolbarPanelClass =
    theme === "dark"
      ? "border-neutral-700/55 bg-zen-elevate/15"
      : "border-zen-line-strong bg-zen-elevate/20";
  const groupChipIdle =
    theme === "dark"
      ? "border border-neutral-600/90 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
      : "border border-neutral-400/90 text-neutral-500 hover:border-neutral-500 hover:text-neutral-700";
  const groupChipActive =
    theme === "dark"
      ? "border border-neutral-600 bg-neutral-700 text-neutral-100 shadow-sm"
      : "border border-neutral-700 bg-neutral-800 text-neutral-50 shadow-sm";
  const segmentTrackClass =
    theme === "dark"
      ? "border border-neutral-600/90 bg-neutral-900/50"
      : "border border-neutral-400/85 bg-neutral-200/45";
  const segmentActiveClass =
    theme === "dark"
      ? "bg-neutral-700 text-neutral-100 shadow-sm"
      : "bg-zen-surface text-neutral-800 shadow-sm";

  const renderGroupChip = (label: string, value: string, isActive: boolean) => (
    <button
      type="button"
      data-group-active={isActive ? "true" : undefined}
      onClick={() => setActiveGroup(value)}
      className={`shrink-0 snap-start cursor-pointer rounded-full px-3.5 py-1.5 font-mono ${zenType.caption} zen-track-tight transition-colors ${
        isActive ? `${groupChipActive} font-black` : `${groupChipIdle} font-bold`
      }`}
    >
      {label}
    </button>
  );

  const renderGroupTextTab = (label: string, value: string, isActive: boolean) => (
    <button
      type="button"
      onClick={() => setActiveGroup(value)}
      className={`cursor-pointer font-sans ${zenType.caption} zen-track-tight transition-all ${
        isActive ? `${textPrimary} font-black` : `${textMuted} hover:text-emerald-500`
      }`}
    >
      {label}
    </button>
  );

  const renderDesktopGroupTabs = () => {
    const items: React.ReactNode[] = [
      renderGroupTextTab(allGroupsLabel(lang), ALL_NODE_GROUP, activeGroup === ALL_NODE_GROUP),
    ];
    for (const group of nodeGroups) {
      items.push(
        <span
          key={`sep-${group}`}
          className={`select-none font-mono font-light ${zenType.caption} ${
            theme === "dark" ? "text-neutral-600" : "text-neutral-400/70"
          }`}
          aria-hidden
        >
          {" / "}
        </span>,
      );
      items.push(
        <React.Fragment key={group}>
          {renderGroupTextTab(group, group, activeGroup === group)}
        </React.Fragment>,
      );
    }
    return (
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2 min-w-0">{items}</div>
    );
  };

  const renderStatsBar = (mobileFooter: boolean) => (
    <div
      className={`${zenType.label} tracking-[0.2em] ${textMuted} flex flex-wrap justify-between items-center gap-x-4 gap-y-2 uppercase font-mono ${
        mobileFooter ? "pt-3 border-t border-zen-line-strong" : "sm:items-baseline tracking-[0.25em]"
      }`}
    >
      <span>
        {t.matchingInstances}: {sortedNodes.length} / {nodes.length}
      </span>
      <div className="flex items-center gap-2 relative z-30">
        <span>{t.sort}:</span>
        <div className="relative inline-block text-left">
          <button
            type="button"
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            className={`cursor-pointer select-none font-bold flex items-center gap-1 uppercase leading-none ${textPrimary}`}
          >
            {getFieldLabel(sortField)}
            {sortField !== "default" ? (
              <span
                className="normal-case tracking-normal opacity-75"
                aria-label={sortOrder === "asc" ? t.sortAsc : t.sortDesc}
              >
                {getSortOrderIcon(sortOrder)}
              </span>
            ) : null}
          </button>
          {isSortMenuOpen && (
            <>
              <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsSortMenuOpen(false)} />
              <div className={`absolute right-0 top-full z-50 w-44 border overflow-hidden ${
                theme === "dark"
                  ? "bg-zen-bg border-neutral-800 text-neutral-300"
                  : "bg-zen-bg border-neutral-200 text-neutral-700"
              }`}>
                <div className={`px-2.5 py-1.5 border-b ${zenType.micro} zen-track-tight font-bold ${
                  theme === "dark" ? "border-neutral-800 text-neutral-500" : "border-neutral-100 text-neutral-400"
                }`}>
                  {t.selectSortMetric}
                </div>
                <div className="py-1">
                  {sortOptions.map((opt) => {
                    const isCurrent = sortField === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          userSortedRef.current = true;
                          if (opt.value === "default") {
                            setSortField("default");
                          } else if (isCurrent) {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortField(opt.value);
                            setSortOrder("desc");
                          }
                          setIsSortMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 md:py-1.5 ${zenType.caption} tracking-wider uppercase font-mono transition-colors flex items-center justify-between ${
                          isCurrent
                            ? "bg-neutral-500/12 text-emerald-600 dark:text-emerald-400 font-bold"
                            : "hover:bg-neutral-500/10"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isCurrent && opt.value !== "default" && (
                          <span className={`text-emerald-500 ${zenType.micro}`}>
                            {getSortOrderIcon(sortOrder)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="border-t p-1 border-neutral-500/15">
                  <button
                    onClick={() => {
                      userSortedRef.current = true;
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      setIsSortMenuOpen(false);
                    }}
                    aria-label={sortOrder === "asc" ? t.setSortDescending : t.setSortAscending}
                    className={`w-full text-center px-1 py-1 ${zenType.caption} uppercase font-bold tracking-widest text-[#10b981] hover:underline transition-all`}
                  >
                    [ {getSortOrderIcon(sortOrder === "asc" ? "desc" : "asc")} ]
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderViewModeButton = (mode: "list" | "card", label: string) => {
    const isActive = viewMode === mode;
    return (
      <button
        type="button"
        onClick={() => setViewMode(mode)}
        className={`${zenTouch.btn} cursor-pointer rounded-full px-3.5 py-1 font-mono ${zenType.caption} zen-track-tight transition-colors ${
          isActive ? `${segmentActiveClass} font-black` : `${textMuted} font-bold hover:text-emerald-600 dark:hover:text-emerald-400`
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className={`w-full space-y-6 lg:space-y-8 font-sans ${zenType.body} ${theme === "dark" ? "text-neutral-300" : "text-neutral-700"}`}>
      {/* Mobile toolbar card */}
      <div
        className={`space-y-4 lg:hidden rounded-xl border p-4 ${toolbarPanelClass}`}
      >
        {showGroupTabs ? (
          <div className="relative min-w-0">
            <div
              className={`pointer-events-none absolute inset-y-0 left-0 z-[1] w-3 bg-gradient-to-r ${
                theme === "dark" ? "from-zen-bg/95" : "from-zen-bg/90"
              } to-transparent`}
              aria-hidden
            />
            <div
              className={`pointer-events-none absolute inset-y-0 right-0 z-[1] w-5 bg-gradient-to-l ${
                theme === "dark" ? "from-zen-bg/95" : "from-zen-bg/90"
              } to-transparent`}
              aria-hidden
            />
            <div
              ref={groupScrollRef}
              className="overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex w-max gap-2 py-0.5 pr-3">
                {renderGroupChip(allGroupsLabel(lang), ALL_NODE_GROUP, activeGroup === ALL_NODE_GROUP)}
                {nodeGroups.map((group) => renderGroupChip(group, group, activeGroup === group))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 font-mono">
          <div className="flex items-center justify-between gap-3">
            <span className={`${zenType.label} ${textMuted} shrink-0 tracking-[0.18em] uppercase`}>
              {t.viewMode}
            </span>
            <div className={`inline-flex rounded-full p-0.5 ${segmentTrackClass}`}>
              {renderViewModeButton("list", t.list)}
              {renderViewModeButton("card", t.card)}
            </div>
          </div>
          <div className="relative flex min-w-0 items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.search}
              aria-label={t.search}
              className={`w-full min-w-0 rounded-md border border-zen-line-strong bg-zen-elevate/15 px-3 py-2 outline-none transition-all font-mono ${zenType.body} tracking-wide uppercase ${textPrimary} placeholder:text-neutral-400/60`}
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className={`absolute right-2 text-neutral-400 hover:text-red-400 font-mono ${zenType.caption} cursor-pointer`}
                aria-label="Clear"
              >
                [X]
              </button>
            ) : null}
          </div>
        </div>

        {renderStatsBar(true)}
      </div>

      {/* Desktop toolbar — original layout */}
      <div className="hidden lg:flex flex-col gap-8">
        <div className="flex flex-row items-baseline justify-between py-2">
          {showGroupTabs ? renderDesktopGroupTabs() : <div />}

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 font-mono">
            <div className={`flex items-center gap-3 ${zenType.caption} tracking-[0.2em] uppercase`}>
              <span className={`${textMuted} shrink-0 leading-none`}>{t.viewMode}:</span>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center leading-none cursor-pointer py-0 transition-colors ${
                  viewMode === "list" ? `${textPrimary} font-bold` : `${textMuted} hover:text-[#10b981]`
                }`}
              >
                [ {t.list} ]
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`inline-flex items-center leading-none cursor-pointer py-0 transition-colors ${
                  viewMode === "card" ? `${textPrimary} font-bold` : `${textMuted} hover:text-[#10b981]`
                }`}
              >
                [ {t.card} ]
              </button>
            </div>

            <div className="flex items-baseline gap-2">
              <span className={`${zenType.label} ${textMuted} shrink-0 leading-none tracking-[0.2em] uppercase`}>
                {t.search}:
              </span>
              <div
                className={`inline-flex items-center gap-1 border-b ${borderBottomClass}`}
              >
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="..."
                  className={`min-w-0 w-40 border-0 bg-transparent py-1 pl-1 pr-0 outline-none transition-all font-mono ${zenType.body} placeholder-neutral-550 tracking-wider uppercase ${textPrimary}`}
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className={`shrink-0 py-1 leading-none text-neutral-400 hover:text-red-400 font-mono ${zenType.caption} cursor-pointer`}
                  >
                    [X]
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {renderStatsBar(false)}
      </div>

      {/* VIEW STATE 1: HIGH-DENSITY BULLET-ALIGNED LIST VIEW */}
      {effectiveViewMode === "list" ? (
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1100px] text-left select-none border-collapse">
            <thead>
              <tr className={`${textMuted} ${zenType.caption} zen-track-tight uppercase border-b ${borderBottomClass} whitespace-nowrap`}>
                <th className="py-4 px-2 font-black cursor-pointer hover:text-[#10b981] whitespace-nowrap" onClick={() => handleSort("name")}>
                  {t.name} {getSortIndicator("name")}
                </th>
                <th className="py-4 px-2 font-black cursor-pointer hover:text-[#10b981] whitespace-nowrap" onClick={() => handleSort("os")}>
                  {t.os} {getSortIndicator("os")}
                </th>
                <th className="py-4 px-2 font-black cursor-pointer hover:text-[#10b981] whitespace-nowrap" onClick={() => handleSort("cpu")}>
                  {t.cpu} {getSortIndicator("cpu")}
                </th>
                <th className="py-4 px-2 font-black cursor-pointer hover:text-[#10b981] whitespace-nowrap" onClick={() => handleSort("mem")} >
                  {t.mem} {getSortIndicator("mem")}
                </th>
                <th className="py-4 px-2 font-black cursor-pointer hover:text-[#10b981] whitespace-nowrap" onClick={() => handleSort("disk")}>
                  {t.diskspace} {getSortIndicator("disk")}
                </th>
                {latencyVisible && (
                <th className="py-4 px-2 font-black cursor-pointer hover:text-[#10b981] whitespace-nowrap" onClick={() => handleSort("latency")}>
                  {t.ping} {getSortIndicator("latency")}
                </th>
                )}
                <th className="py-4 px-2 font-black whitespace-nowrap">
                  {t.bandwidth}
                </th>
                <th className="py-4 px-2 font-black whitespace-nowrap">
                  {t.traffic}
                </th>
                {showExpiryTime && (
                  <th className="py-4 px-2 font-black cursor-pointer hover:text-[#10b981] whitespace-nowrap" onClick={() => handleSort("days")}>
                    {t.expiry} {getSortIndicator("days")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className={`${zenType.data} font-mono whitespace-nowrap`}>
              {sortedNodes.length === 0 ? (
                <tr>
                  <td colSpan={listColSpan} className={`py-16 text-center ${textMuted} italic uppercase tracking-[0.2em] font-sans`}>
                     {t.noInstances}
                  </td>
                </tr>
              ) : (
                sortedNodes.map((node) => {
                  const cpuColor =
                    node.cpuUsage > 75
                      ? theme === "dark" 
                        ? "text-rose-400 font-bold" 
                        : "text-rose-500 font-bold" 
                      : node.cpuUsage > 40 
                      ? theme === "dark" 
                        ? "text-amber-400 font-bold" 
                        : "text-amber-600 font-bold" 
                      : textPrimary;

                  const memPercent = (node.memoryUsed / node.memoryTotal) * 100;
                  const memColor =
                    memPercent > 80
                      ? theme === "dark" 
                        ? "text-rose-400 font-bold" 
                        : "text-rose-500 font-bold" 
                      : memPercent > 50 
                      ? theme === "dark" 
                        ? "text-amber-400 font-bold" 
                        : "text-amber-600 font-bold" 
                      : textPrimary;

                  const cpuFilledDots = Math.round((node.cpuUsage / 100) * 10);
                  const memFilledDots = Math.round((memPercent / 100) * 10);
                  const diskPercent = (node.diskUsed / node.diskTotal) * 100;
                  const diskColor =
                    diskPercent > 80
                      ? theme === "dark" 
                        ? "text-rose-400 font-bold" 
                        : "text-rose-500 font-bold" 
                      : diskPercent > 50 
                      ? theme === "dark" 
                        ? "text-amber-400 font-bold" 
                        : "text-amber-600 font-bold" 
                      : textPrimary;
                  const diskFilledDots = Math.round((diskPercent / 100) * 10);
 
                  return (
                    <tr
                      key={node.id}
                      onClick={() => onSelectNode(node)}
                      className={`cursor-pointer transition-colors group border-b border-zen-line hover:bg-zen-elevate ${
                        !node.online ? "opacity-35 grayscale contrast-75 saturate-50 select-none" : ""
                      }`}
                    >
                      {/* Identification */}
                      <td className={`py-3 px-2 font-sans font-black ${textPrimary}`}>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <Flag flag={node.flag} className="w-4 h-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate max-w-[240px] md:max-w-[200px]" title={node.name}>
                              {node.name}
                            </span>
                            <PublicRemarkButton
                              publicRemark={node.publicRemark}
                              privateRemark={node.privateRemark}
                              theme={theme}
                              publicLabel={t.publicRemark}
                              privateLabel={t.privateRemark}
                              className="shrink-0 ml-auto"
                            />
                          </div>
                          <NodeTags
                            tags={node.tags}
                            theme={theme}
                            size="sm"
                            maxVisible={2}
                          />
                        </div>
                      </td>
 
                      {/* OS Specific */}
                      <td className={`py-3 px-2 ${textMuted} ${zenType.data} whitespace-nowrap`}>
                        {(() => {
                          const osDetails = getOSDetails(node.os, node.arch);
                          return (
                            <span className="flex items-center gap-2 inline-flex">
                              <OsIcon os={node.os} />
                              <span>{osDetails.text}</span>
                            </span>
                          );
                        })()}
                      </td>
 
                      {/* CPU Live Load */}
                      <td className="py-3 px-2">
                        {node.online ? (
                          <span className={textPrimary}>
                            <span className={`font-bold ${cpuColor}`}>{node.cpuUsage.toFixed(1)}%</span>
                            <span className="text-neutral-500/30 ml-1 font-mono">
                              {"["}
                              <span className={cpuColor}>{"■".repeat(cpuFilledDots)}</span>
                              {"·".repeat(Math.max(0, 10 - cpuFilledDots))}
                              {"]"}
                            </span>
                          </span>
                        ) : (
                          "---"
                        )}
                      </td>
 
                      {/* Memory Usage */}
                      <td className="py-3 px-2">
                        {node.online ? (
                          <span className={textPrimary}>
                            <span className={`font-bold ${memColor}`}>{memPercent.toFixed(1)}%</span>
                            <span className="text-neutral-500/30 ml-1.5 font-mono">
                              {"["}
                              <span className={memColor}>{"■".repeat(memFilledDots)}</span>
                              {"·".repeat(Math.max(0, 10 - memFilledDots))}
                              {"]"}
                            </span>
                          </span>
                        ) : (
                          "---"
                        )}
                      </td>
 
                      {/* Root Disk Usage */}
                      <td className={`py-3 px-2`}>
                        {node.online ? (
                          <span className={textPrimary}>
                            <span className={`font-bold ${diskColor}`}>{diskPercent.toFixed(1)}%</span>
                            <span className="text-neutral-500/30 ml-1.5 font-mono">
                              {"["}
                              <span className={diskColor}>{"■".repeat(diskFilledDots)}</span>
                              {"·".repeat(Math.max(0, 10 - diskFilledDots))}
                              {"]"}
                            </span>
                          </span>
                        ) : (
                          "---"
                        )}
                      </td>

                      {/* Ping Latency */}
                      {latencyVisible && (
                      <td className="py-3 px-2">
                        {node.online && node.latency > 0 ? (
                          <LatencyHistoryBlocks
                            samples={node.latencyHistory}
                            currentMs={node.latency}
                            theme={theme}
                            textPrimary={textPrimary}
                            colorConfig={latencyColorConfig}
                          />
                        ) : (
                          <span className={textMuted}>—</span>
                        )}
                      </td>
                      )}

                      {/* Bandwidth Speed */}
                      <td className="py-3 px-2">
                        {node.online ? (
                          <span className={`inline-flex items-baseline gap-x-2 font-bold ${textPrimary}`}>
                            <span>↓ {formatSpeed(node.netSpeedIn)}</span>
                            <span>↑ {formatSpeed(node.netSpeedOut)}</span>
                          </span>
                        ) : (
                          "---"
                        )}
                      </td>
 
                      {/* Traffic Quantity */}
                      <td className="py-3 px-2">
                        {node.online ? (
                          <span className={`font-bold ${textPrimary}`}>
                            {renderTrafficValue(node)}
                          </span>
                        ) : (
                          "---"
                        )}
                      </td>

                      {showExpiryTime && (
                        <td className={`py-3 px-2 ${zenType.data} font-bold`}>
                          {renderBilling(node)}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* VIEW STATE 2: CARD GRID VIEW (Fully localized with zero mixed layouts) */
        <div className="grid grid-cols-1 items-start gap-4 pt-4 @min-[640px]:grid-cols-2 @min-[901px]:grid-cols-3 @min-[1300px]:grid-cols-4 @min-[1600px]:grid-cols-5">
          {sortedNodes.length === 0 ? (
            <div className={`col-span-full py-16 text-center ${textMuted} italic uppercase tracking-[0.2em] font-sans`}>
              {t.noInstances}
            </div>
          ) : (
            sortedNodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const cpuColor =
                node.cpuUsage > 75
                  ? theme === "dark" 
                    ? "text-rose-400 font-bold" 
                    : "text-rose-500 font-bold" 
                  : node.cpuUsage > 40 
                  ? theme === "dark" 
                    ? "text-amber-400 font-bold" 
                    : "text-amber-600 font-bold" 
                  : textPrimary;

              const memPercent = (node.memoryUsed / node.memoryTotal) * 100;
              const memColor =
                memPercent > 80
                  ? theme === "dark" 
                    ? "text-rose-400 font-bold" 
                    : "text-rose-500 font-bold" 
                  : memPercent > 50 
                  ? theme === "dark" 
                    ? "text-amber-400 font-bold" 
                    : "text-amber-600 font-bold" 
                  : textPrimary;

              // Simple ASCII textual micro progress indicator
              const filledDots = Math.round((node.cpuUsage / 100) * 10);

              const memFilledDots = Math.round((memPercent / 100) * 10);

              const diskPercent = (node.diskUsed / node.diskTotal) * 100;
              const diskColor =
                diskPercent > 80
                  ? theme === "dark" 
                    ? "text-rose-400 font-bold" 
                    : "text-rose-500 font-bold" 
                  : diskPercent > 50 
                  ? theme === "dark" 
                    ? "text-amber-400 font-bold" 
                    : "text-amber-600 font-bold" 
                  : textPrimary;
              const diskFilledDots = Math.round((diskPercent / 100) * 10);

              return (
                <div
                  key={node.id}
                  onClick={() => onSelectNode(node)}
                  className={`cursor-pointer group flex flex-col gap-3 transition-all duration-200 p-4 sm:p-5 rounded-xl border border-zen-line bg-zen-elevate shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-zen-line-strong hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)] ${!node.online ? "opacity-35 grayscale contrast-75 saturate-50 select-none" : ""}`}
                >
                  {/* Card header：标签与标题同一行，不额外占高 */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Flag flag={node.flag} className="w-5 h-5 shrink-0" />
                    <h4
                      className={`min-w-0 flex-1 truncate font-sans ${zenType.body} font-bold tracking-tight ${textPrimary}`}
                      title={node.name}
                    >
                      {node.name}
                    </h4>
                    <NodeTags
                      tags={node.tags}
                      theme={theme}
                      size="sm"
                      maxVisible={2}
                      className="shrink-0"
                    />
                    <PublicRemarkButton
                      publicRemark={node.publicRemark}
                      privateRemark={node.privateRemark}
                      theme={theme}
                      publicLabel={t.publicRemark}
                      privateLabel={t.privateRemark}
                      className="shrink-0"
                    />
                  </div>

                  {/* Fully Localized pure text metric layout with pure language alignment */}
                  <div className={`space-y-2 font-mono ${zenType.data} leading-relaxed uppercase ${textMuted}`}>
                    <div className="flex justify-between">
                      <span>{t.os}:</span>
                      <span className={`font-bold ${textPrimary} flex items-center gap-2`}>
                        {(() => {
                          const osDetails = getOSDetails(node.os, node.arch);
                          return (
                            <>
                              <OsIcon os={node.os} />
                              <span>{osDetails.text}</span>
                            </>
                          );
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.cpu}:</span>
                      {node.online ? (
                        <span className={textPrimary}>
                          <span className={`font-bold ${cpuColor}`}>{node.cpuUsage.toFixed(1)}%</span>
                          <span className="text-neutral-500/30 ml-1 font-mono">
                            {"["}
                            <span className={cpuColor}>{"■".repeat(filledDots)}</span>
                            {"·".repeat(Math.max(0, 10 - filledDots))}
                            {"]"}
                          </span>
                        </span>
                      ) : (
                        <span>---</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span>{t.mem}:</span>
                      {node.online ? (
                        <span className={textPrimary}>
                          <span className={`font-bold ${memColor}`}>{memPercent.toFixed(1)}%</span>
                          <span className="text-neutral-500/30 ml-1.5 font-mono">
                            {"["}
                            <span className={memColor}>{"■".repeat(memFilledDots)}</span>
                            {"·".repeat(Math.max(0, 10 - memFilledDots))}
                            {"]"}
                          </span>
                        </span>
                      ) : (
                        <span>---</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span>{t.diskspace}:</span>
                      {node.online ? (
                        <span className={textPrimary}>
                          <span className={`font-bold ${diskColor}`}>{diskPercent.toFixed(1)}%</span>
                          <span className="text-neutral-500/30 ml-1.5 font-mono">
                            {"["}
                            <span className={diskColor}>{"■".repeat(diskFilledDots)}</span>
                            {"·".repeat(Math.max(0, 10 - diskFilledDots))}
                            {"]"}
                          </span>
                        </span>
                      ) : (
                        <span>---</span>
                      )}
                    </div>
                    {latencyVisible && (
                    <div className="flex justify-between">
                      <span>{t.ping}:</span>
                      {node.online && node.latency > 0 ? (
                        <LatencyHistoryBlocks
                          samples={node.latencyHistory}
                          currentMs={node.latency}
                          theme={theme}
                          textPrimary={textPrimary}
                          colorConfig={latencyColorConfig}
                        />
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                    )}
                    <div className="flex justify-between">
                      <span>{t.bandwidth}:</span>
                      {node.online ? (
                        <span className={`inline-flex items-baseline gap-x-2 font-bold ${textPrimary}`}>
                          <span>↓ {formatSpeed(node.netSpeedIn)}</span>
                          <span>↑ {formatSpeed(node.netSpeedOut)}</span>
                        </span>
                      ) : (
                        <span>---</span>
                      )}
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="shrink-0">{t.traffic}:</span>
                      {node.online ? (
                        <span className={`font-bold ${textPrimary} min-w-0 text-right`}>
                          {renderTrafficValue(node)}
                        </span>
                      ) : (
                        <span>---</span>
                      )}
                    </div>
                    {showExpiryTime && (
                      <div className="flex justify-between gap-2">
                        <span className="shrink-0">{t.expiry}:</span>
                        <span className="min-w-0 text-right">{renderBilling(node)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
