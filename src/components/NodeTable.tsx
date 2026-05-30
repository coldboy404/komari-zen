/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useMemo, useEffect } from "react";
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
import { zenType } from "@/lib/typography";

interface NodeTableProps {
  nodes: VPSNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: VPSNode) => void;
  lang: Lang;
  theme: "light" | "dark";
}

type SortField =
  | "status"
  | "name"
  | "os"
  | "cpu"
  | "mem"
  | "disk"
  | "latency"
  | "days";

type SortOrder = "asc" | "desc";

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
  const [activeGroup, setActiveGroup] = useState<string>(ALL_NODE_GROUP);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState<boolean>(false);

  const t = translations[lang];
  const { showExpiryTime, defaultViewMode } = useThemeSettings();
  const { viewMode, effectiveViewMode, setViewMode } = useViewMode(defaultViewMode);
  const { recordEnabled } = useRecordSettings();

  React.useEffect(() => {
    if (!recordEnabled && sortField === "latency") {
      setSortField("name");
    }
  }, [recordEnabled, sortField]);

  const getFieldLabel = (field: SortField) => {
    switch (field) {
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
    { value: "name", label: t.name },
    { value: "cpu", label: t.cpu },
    { value: "mem", label: t.mem },
    { value: "disk", label: t.disk },
    ...(recordEnabled ? [{ value: "latency" as SortField, label: t.ping }] : []),
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
    if (!showExpiryTime && sortField === "days") {
      setSortField("name");
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

  // Sorting
  const sortedNodes = useMemo(() => {
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
    (recordEnabled ? 1 : 0) +
    (showExpiryTime ? 1 : 0) +
    7;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc"); // Default to desc for performance metrics
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return " ·";
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  // Styling helpers
  const textPrimary = theme === "dark" ? "text-neutral-300" : "text-neutral-700";
  const textMuted = theme === "dark" ? "text-neutral-500" : "text-neutral-500";
  const borderBottomClass = theme === "dark" ? "border-neutral-800" : "border-neutral-200";

  return (
    <div className={`space-y-8 font-sans ${zenType.body} ${theme === "dark" ? "text-neutral-300" : "text-neutral-700"}`}>
      {/* Tab Filter, Search, and View Mode switch row */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-baseline justify-between py-2">
        {/* Category switcher tabs — groups from API node.group */}
        {showGroupTabs ? (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <button
              onClick={() => setActiveGroup(ALL_NODE_GROUP)}
              className={`cursor-pointer font-sans ${zenType.caption} zen-track-tight uppercase transition-all ${
                activeGroup === ALL_NODE_GROUP
                  ? `${textPrimary} font-black`
                  : `${textMuted} hover:text-emerald-500`
              }`}
            >
              {allGroupsLabel(lang)}
            </button>
            {nodeGroups.map((group) => {
              const isActive = activeGroup === group;
              return (
                <button
                  key={group}
                  onClick={() => setActiveGroup(group)}
                  className={`cursor-pointer font-sans ${zenType.caption} zen-track-tight uppercase transition-all ${
                    isActive
                      ? `${textPrimary} font-black`
                      : `${textMuted} hover:text-emerald-500`
                  }`}
                >
                  {group}
                </button>
              );
            })}
          </div>
        ) : (
          <div />
        )}

        {/* View Mode Switching & Search wrapper */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 font-mono">
          {/* View Mode Switches */}
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

          {/* Search bar input */}
          <div className="flex items-center gap-2">
            <span className={`${zenType.label} ${textMuted} shrink-0 leading-none tracking-[0.2em] uppercase`}>{t.search}:</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="..."
              className={`border-b ${borderBottomClass} bg-transparent py-2 md:py-1 px-1 outline-none transition-all font-mono ${zenType.body} placeholder-neutral-550 tracking-wider w-40 uppercase ${textPrimary}`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className={`text-neutral-400 hover:text-red-400 font-mono ${zenType.caption} cursor-pointer`}
              >
                [X]
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nodes Counter Info */}
      <div className={`${zenType.label} tracking-[0.25em] ${textMuted} flex flex-wrap justify-between items-center sm:items-baseline gap-y-2 uppercase font-mono`}>
        <span>
          {t.matchingInstances}: {sortedNodes.length} / {nodes.length}
        </span>
        <div className="flex items-center gap-2 relative z-30">
          <span>{t.sort}:</span>
          <div className="relative inline-block text-left">
            <button
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
              className={`cursor-pointer select-none bg-transparent hover:text-emerald-500 font-bold border-b border-dashed ${theme === "dark" ? "border-neutral-800" : "border-neutral-300"} pb-0.5 flex items-center gap-1 uppercase transition-colors`}
            >
              {getFieldLabel(sortField)} ({sortOrder === "asc" ? t.sortAsc : t.sortDesc})
            </button>
            {isSortMenuOpen && (
              <>
                {/* Backdrop to close click */}
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsSortMenuOpen(false)} />
                {/* Dropdown Options */}
                <div className={`absolute right-0 mt-2 w-44 z-50 border rounded-sm shadow-md overflow-hidden ${
                  theme === "dark" 
                    ? "bg-zen-surface border-neutral-800 text-neutral-300" 
                    : "bg-zen-surface border-neutral-200 text-neutral-700"
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
                            if (isCurrent) {
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                            } else {
                              setSortField(opt.value);
                              setSortOrder("desc"); // Default to desc for performance trends
                            }
                            setIsSortMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 md:py-1.5 ${zenType.caption} tracking-wider uppercase font-mono transition-colors flex items-center justify-between ${
                            theme === "dark" 
                              ? isCurrent ? "bg-neutral-800 text-neutral-300 font-bold" : "hover:bg-neutral-800/50 hover:text-neutral-300"
                              : isCurrent ? "bg-neutral-100 text-neutral-700 font-bold" : "hover:bg-neutral-50 hover:text-neutral-700"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isCurrent && (
                            <span className={`text-emerald-500 ${zenType.micro}`}>
                              {sortOrder === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Footer toggle button */}
                  <div className={`border-t p-1 ${theme === "dark" ? "border-neutral-800 bg-zen-surface" : "border-neutral-100 bg-neutral-50"}`}>
                    <button
                      onClick={() => {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        setIsSortMenuOpen(false);
                      }}
                      className={`w-full text-center px-1 py-1 text-[8.5px] uppercase font-bold tracking-widest text-[#10b981] hover:underline transition-all`}
                    >
                      [ {sortOrder === "asc" ? t.setSortDescending : t.setSortAscending} ]
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
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
                {recordEnabled && (
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
                        : "text-amber-500 font-bold" 
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
                        : "text-amber-500 font-bold" 
                      : textPrimary;

                  const cpuFilledDots = Math.round((node.cpuUsage / 100) * 8);
                  const memFilledDots = Math.round((memPercent / 100) * 8);
                  const diskPercent = (node.diskUsed / node.diskTotal) * 100;
                  const diskColor =
                    diskPercent > 80
                      ? theme === "dark" 
                        ? "text-rose-400 font-bold" 
                        : "text-rose-500 font-bold" 
                      : diskPercent > 50 
                      ? theme === "dark" 
                        ? "text-amber-400 font-bold" 
                        : "text-amber-500 font-bold" 
                      : textPrimary;
                  const diskFilledDots = Math.round((diskPercent / 100) * 8);
 
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
                              {"·".repeat(Math.max(0, 8 - cpuFilledDots))}
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
                              {"·".repeat(Math.max(0, 8 - memFilledDots))}
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
                              {"·".repeat(Math.max(0, 8 - diskFilledDots))}
                              {"]"}
                            </span>
                          </span>
                        ) : (
                          "---"
                        )}
                      </td>

                      {/* Ping Latency */}
                      {recordEnabled && (
                      <td className="py-3 px-2">
                        {node.online && node.latency > 0 ? (
                          <span className={`font-bold ${textPrimary}`}>
                            {node.latency >= 100
                              ? node.latency.toFixed(0)
                              : node.latency.toFixed(1)}
                            ms
                          </span>
                        ) : (
                          <span className={textMuted}>—</span>
                        )}
                      </td>
                      )}

                      {/* Bandwidth Speed */}
                      <td className="py-3 px-2">
                        {node.online ? (
                          <span className={`font-bold ${textPrimary}`}>
                            ↓{formatSpeed(node.netSpeedIn)} ↑{formatSpeed(node.netSpeedOut)}
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
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-4">
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
                    : "text-amber-500 font-bold" 
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
                    : "text-amber-500 font-bold" 
                  : textPrimary;

              // Simple ASCII textual micro progress indicator
              const filledDots = Math.round((node.cpuUsage / 100) * 8);

              const memFilledDots = Math.round((memPercent / 100) * 8);

              const diskPercent = (node.diskUsed / node.diskTotal) * 100;
              const diskColor =
                diskPercent > 80
                  ? theme === "dark" 
                    ? "text-rose-400 font-bold" 
                    : "text-rose-500 font-bold" 
                  : diskPercent > 50 
                  ? theme === "dark" 
                    ? "text-amber-400 font-bold" 
                    : "text-amber-500 font-bold" 
                  : textPrimary;
              const diskFilledDots = Math.round((diskPercent / 100) * 8);

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
                      className={`min-w-0 flex-1 truncate font-sans ${zenType.body} font-bold uppercase tracking-tight ${textPrimary}`}
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
                            {"·".repeat(Math.max(0, 8 - filledDots))}
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
                            {"·".repeat(Math.max(0, 8 - memFilledDots))}
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
                            {"·".repeat(Math.max(0, 8 - diskFilledDots))}
                            {"]"}
                          </span>
                        </span>
                      ) : (
                        <span>---</span>
                      )}
                    </div>
                    {recordEnabled && (
                    <div className="flex justify-between">
                      <span>{t.ping}:</span>
                      {node.online && node.latency > 0 ? (
                        <span className={`font-bold ${textPrimary}`}>
                          {node.latency >= 100
                            ? node.latency.toFixed(0)
                            : node.latency.toFixed(1)}
                          ms
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                    )}
                    <div className="flex justify-between">
                      <span>{t.bandwidth}:</span>
                      {node.online ? (
                        <span className={`font-bold ${textPrimary}`}>
                          ↓{formatSpeed(node.netSpeedIn)} ↑{formatSpeed(node.netSpeedOut)}
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
