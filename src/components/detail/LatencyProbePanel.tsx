import React from "react";
import { usePingRecords } from "@/hooks/usePingRecords";
import { useChartScrub } from "@/hooks/useChartScrub";
import {
  buildPingChartRows,
  buildProbeSeriesNullableFromRows,
  cutPeakValues,
  downsampleSeriesAvgNullable,
  downsampleSeriesNullable,
  groupPingRecordsByTime,
  smoothSeriesTriangularNullable,
  taskColor,
  taskPingVolatility,
} from "@/lib/recordTransform";
import { formatMsg, translations, type Lang } from "@/lib/i18n";
import { formatChartPointTime, hoursToChartLength } from "@/lib/timeRangePresets";
import { zenType, zenTouch } from "@/lib/typography";
import { zenFill, zenPopover, zenText } from "@/lib/zenSemantics";
import type { PingTaskInfo } from "@/types/records";

type ProbeChartPoint = { x: number; y: number; val: number };

/** SVG path that breaks across null / missing samples instead of dropping to zero. */
function buildProbeLinePath(pts: (ProbeChartPoint | null)[]): string {
  let d = "";
  let started = false;
  for (const p of pts) {
    if (!p) {
      started = false;
      continue;
    }
    d += started ? ` L ${p.x} ${p.y}` : `M ${p.x} ${p.y}`;
    started = true;
  }
  return d.trim();
}

interface LatencyProbePanelProps {
  uuid: string;
  hours: number;
  onLoadingChange?: (loading: boolean) => void;
  selectedProbes: string[];
  onToggleProbe: (id: string) => void;
  lang: Lang;
  theme: "light" | "dark";
}

export function LatencyProbePanel({
  uuid,
  hours,
  onLoadingChange,
  selectedProbes,
  onToggleProbe,
  lang,
  theme,
}: LatencyProbePanelProps) {
  const t = translations[lang];
  const [peakClipping, setPeakClipping] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const { data, isLoading } = usePingRecords(uuid, hours);

  React.useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);
  const tasks: PingTaskInfo[] = data?.tasks ?? [];
  const records = data?.records ?? [];

  const { anchors, grouped } = React.useMemo(
    () => groupPingRecordsByTime(records, tasks),
    [records, tasks],
  );

  const chartRows = React.useMemo(() => {
    let rows = buildPingChartRows(anchors, grouped, tasks);
    const taskKeys = tasks.map((task) => String(task.id));
    if (peakClipping && taskKeys.length > 0) {
      rows = cutPeakValues(rows, taskKeys);
    }
    return rows;
  }, [anchors, grouped, tasks, peakClipping]);

  const targetLen = hoursToChartLength(hours);

  const displayDataMap = React.useMemo(() => {
    const map: Record<string, (number | null)[]> = {};
    // Bucket averaging already smooths in proportion to how much we decimate, so
    // the extra moving average only needs to deburr. Keep it minimal on dense
    // ranges (high decimation) to avoid blurring genuine medium-scale features.
    const decimation = chartRows.length / Math.max(1, targetLen);
    const maRadius = decimation >= 8 ? 1 : 2;
    tasks.forEach((task) => {
      const raw = buildProbeSeriesNullableFromRows(chartRows, task.id);
      if (peakClipping) {
        map[String(task.id)] = smoothSeriesTriangularNullable(
          downsampleSeriesAvgNullable(raw, targetLen),
          maRadius,
        );
      } else {
        map[String(task.id)] = downsampleSeriesNullable(raw, targetLen);
      }
    });
    return map;
  }, [tasks, chartRows, targetLen, peakClipping]);

  // Volatility is computed from the full-resolution raw samples (independent of
  // the smoothing toggle and downsampling) so the value stays accurate.
  const rawValuesByTask = React.useMemo(() => {
    const map: Record<string, number[]> = {};
    tasks.forEach((task) => {
      map[String(task.id)] = [];
    });
    for (const rec of records) {
      const key = String(rec.task_id);
      if (map[key] && typeof rec.value === "number" && rec.value > 0) {
        map[key].push(rec.value);
      }
    }
    return map;
  }, [tasks, records]);

  const activeProbeIds =
    selectedProbes.length > 0
      ? selectedProbes
      : tasks.map((task) => String(task.id));

  const activeProbesList = tasks.filter((task) =>
    activeProbeIds.includes(String(task.id)),
  );

  const maxLatencyVal = React.useMemo(() => {
    let max = 50;
    activeProbeIds.forEach((id) => {
      const d = displayDataMap[id];
      if (!d) return;
      for (const v of d) {
        if (v != null && Number.isFinite(v)) max = Math.max(max, v);
      }
    });
    return Math.ceil((max * 1.15) / 10) * 10;
  }, [activeProbeIds, displayDataMap]);

  const dataLength =
    activeProbesList.length > 0
      ? (displayDataMap[String(activeProbesList[0].id)]?.length ?? 0)
      : 0;
  const denominator = Math.max(1, dataLength - 1);

  const width = 1000;
  const height = 240;
  const paddingX = 24;
  const paddingY = 24;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const scrubConfig = React.useMemo(
    () => ({ width, paddingX, chartWidth, dataLength }),
    [chartWidth, dataLength],
  );

  const {
    hoveredIndex,
    onMouseMove,
    onMouseLeave,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  } = useChartScrub(containerRef, scrubConfig);

  const activeIdx = hoveredIndex !== null ? hoveredIndex : dataLength - 1;
  const isHovering = hoveredIndex !== null;
  const activeX = paddingX + (activeIdx / denominator) * chartWidth;

  const sourceRowIdx = React.useMemo(() => {
    if (chartRows.length <= 1 || dataLength <= 1) return 0;
    const pos = (activeIdx / (dataLength - 1)) * (chartRows.length - 1);
    return Math.min(chartRows.length - 1, Math.round(pos));
  }, [activeIdx, chartRows.length, dataLength]);

  const activeTimeLabel = React.useMemo(() => {
    const iso = chartRows[sourceRowIdx]?.time;
    if (!iso) return "";
    return formatChartPointTime(iso, hours);
  }, [chartRows, sourceRowIdx, hours]);

  const focusY = React.useMemo(() => {
    let y = height - paddingY;
    activeProbesList.forEach((task) => {
      const id = String(task.id);
      const val = displayDataMap[id]?.[activeIdx];
      if (val == null || !Number.isFinite(val)) return;
      const pointY =
        height -
        paddingY -
        (Math.max(0, Math.min(maxLatencyVal, val)) / maxLatencyVal) * chartHeight;
      y = Math.min(y, pointY);
    });
    return y;
  }, [activeProbesList, displayDataMap, activeIdx, maxLatencyVal, chartHeight]);

  const crosshairRatio = activeX / width;
  const tooltipOnLeft = crosshairRatio > 0.55;

  const probeSnapshot = React.useMemo(
    () =>
      activeProbesList
        .map((task, idx) => {
          const id = String(task.id);
          const val = displayDataMap[id]?.[activeIdx];
          if (val == null || !Number.isFinite(val)) return null;
          return { task, id, val, color: taskColor(idx) };
        })
        .filter((row): row is NonNullable<typeof row> => row != null)
        .sort((a, b) => a.val - b.val),
    [activeProbesList, displayDataMap, activeIdx],
  );

  const formatProbeMs = (val: number) =>
    `${val >= 100 ? val.toFixed(0) : val.toFixed(1)} ms`;

  const strokeColor =
    theme === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)";
  const labelColor = `${zenText.subtle} font-mono`;

  if (tasks.length === 0 && !isLoading) {
    return (
      <div
        className={`py-12 text-center ${zenType.data} uppercase tracking-widest font-mono ${zenText.faint}`}
      >
        {t.pingNoTasks}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative py-4 px-4 -mx-4 flex flex-col space-y-4 bg-transparent overflow-visible">
        <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-2 select-none w-full">
          <span
            className={`font-extrabold tracking-wider uppercase ${zenType.body} ${zenText.primary} font-mono shrink-0`}
          >
            {t.pingLatencyDetection}
          </span>
          <div className={`flex flex-wrap items-center justify-end gap-x-3.5 gap-y-1 ${zenType.caption} font-mono select-none font-bold shrink-0`}>
            <button
              type="button"
              onClick={() => setPeakClipping(!peakClipping)}
              className={`${zenTouch.btn} transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                peakClipping
                  ? "text-zen-accent font-extrabold"
                  : `${zenText.faint} font-semibold hover:text-zen-fg-strong`
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${peakClipping ? "bg-zen-accent animate-pulse" : zenFill.track}`}
              />
              <span>{t.pingSmooth}</span>
            </button>
            <span
              className={zenText.subtle}
            >
              {formatMsg(t.pingActiveProbes, { count: activeProbesList.length })}
            </span>
          </div>
        </div>

        {!isLoading && (
          <>
            <div
              ref={containerRef}
              onMouseMove={onMouseMove}
              onMouseLeave={onMouseLeave}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              className="relative overflow-visible cursor-crosshair touch-none"
            >
              <svg
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                className="w-full h-52 sm:h-56 md:h-60 overflow-visible"
              >
                {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
                  <line
                    key={i}
                    x1={paddingX}
                    y1={paddingY + r * chartHeight}
                    x2={width - paddingX}
                    y2={paddingY + r * chartHeight}
                    stroke={strokeColor}
                    strokeDasharray="2 2"
                    strokeWidth={1}
                  />
                ))}

                {activeProbesList.map((task, idx) => {
                  const id = String(task.id);
                  const seriesData = displayDataMap[id];
                  if (!seriesData) return null;
                  const color = taskColor(idx);
                  const points = seriesData.map((val, i) => {
                    if (val == null || !Number.isFinite(val)) return null;
                    const x = paddingX + (i / denominator) * chartWidth;
                    const y =
                      height -
                      paddingY -
                      (Math.max(0, Math.min(maxLatencyVal, val)) / maxLatencyVal) *
                        chartHeight;
                    return { x, y, val };
                  });
                  const pathD = buildProbeLinePath(points);
                  const selected = selectedProbes.includes(id);
                  const dimmed =
                    selectedProbes.length > 0 && !selected;

                  return (
                    <g key={id}>
                      {pathD ? (
                      <path
                        d={pathD}
                        fill="none"
                        stroke={color}
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={dimmed ? 0.38 : selectedProbes.length === 0 ? 0.85 : 1}
                        className="transition-all duration-300"
                      />
                      ) : null}
                    </g>
                  );
                })}

                {isHovering && (
                  <line
                    x1={activeX}
                    y1={paddingY}
                    x2={activeX}
                    y2={height - paddingY}
                    stroke={
                      theme === "dark"
                        ? "rgba(255, 255, 255, 0.15)"
                        : "rgba(0, 0, 0, 0.15)"
                    }
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                )}

                {isHovering &&
                  activeProbesList.map((task, idx) => {
                    const id = String(task.id);
                    const val = displayDataMap[id]?.[activeIdx];
                    if (val == null || !Number.isFinite(val)) return null;
                    const color = taskColor(idx);
                    const y =
                      height -
                      paddingY -
                      (Math.max(0, Math.min(maxLatencyVal, val)) / maxLatencyVal) *
                        chartHeight;
                    return (
                      <circle
                        key={`focus-${id}`}
                        cx={activeX}
                        cy={y}
                        r={4}
                        fill={color}
                      />
                    );
                  })}
              </svg>

              {isHovering && probeSnapshot.length > 0 && (
                <div
                  className={`absolute z-10 min-w-[8.5rem] max-w-[min(11rem,calc(100vw-2.5rem))] rounded-md px-2.5 py-2 pointer-events-none ${zenType.caption} font-mono select-none ${zenPopover}`}
                  style={{
                    left: `${crosshairRatio * 100}%`,
                    top: `${(focusY / height) * 100}%`,
                    transform: tooltipOnLeft
                      ? "translate(calc(-100% - 10px), -0.5rem)"
                      : "translate(10px, -0.5rem)",
                  }}
                >
                  {activeTimeLabel ? (
                    <div
                      className={`mb-1.5 tabular-nums ${zenType.label} ${zenText.subtle}`}
                    >
                      {activeTimeLabel}
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-1">
                    {probeSnapshot.map(({ task, id, val, color }) => (
                      <div
                        key={id}
                        className="flex items-center gap-1.5 min-w-0"
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span
                          className={`min-w-0 flex-1 truncate normal-case ${zenText.secondary}`}
                        >
                          {task.name}
                        </span>
                        <span
                          className="shrink-0 font-bold tabular-nums"
                          style={{ color }}
                        >
                          {formatProbeMs(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={`absolute top-0.5 left-1 ${zenType.micro} leading-none ${labelColor} pointer-events-none select-none`}
              >
                MAX: {maxLatencyVal.toFixed(0)} ms
              </div>
              <div
                className={`absolute bottom-0.5 left-1 ${zenType.micro} leading-none ${labelColor} pointer-events-none select-none`}
              >
                MIN: 0 ms
              </div>
            </div>

            <div className="space-y-2 pt-1 select-none">
              <div
                className={`${zenType.label} zen-track-tight uppercase font-bold font-mono ${zenText.subtle}`}
              >
                {t.pingProbeFilter}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 sm:gap-x-6 gap-y-2.5 pt-1.5 font-mono">
                {tasks.map((task, idx) => {
                  const id = String(task.id);
                  const color = taskColor(idx);
                  const isSelected = selectedProbes.includes(id);
                  const isChartActive =
                    selectedProbes.length === 0 || isSelected;
                  const avg = task.avg ?? task.latest ?? 0;
                  const lossVal = task.loss ?? 0;
                  const volatility = taskPingVolatility(
                    task,
                    rawValuesByTask[id],
                  );

                  const metricsTitle = `${avg >= 100 ? avg.toFixed(0) : avg.toFixed(1)}ms · ${lossVal.toFixed(1)}%${
                    volatility !== null ? ` · ${volatility.toFixed(2)}` : ""
                  }`;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onToggleProbe(id)}
                      title={`${task.name} — ${metricsTitle}`}
                      className={`flex items-center gap-1.5 min-w-0 w-full ${zenTouch.btn} transition-all duration-200 cursor-pointer rounded-md ${
                        isSelected
                          ? "text-zen-accent font-extrabold border border-zen-accent/55 bg-zen-accent/12 dark:bg-zen-accent/18 px-2 py-1 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                          : isChartActive
                            ? `${zenText.primary} bg-transparent px-1 hover:bg-zen-fill-muted/8`
                            : `${zenText.muted} px-1 hover:text-zen-fg-strong hover:bg-zen-fill-muted/8`
                      } ${zenType.caption}`}
                    >
                      <span
                        className={`rounded-full shrink-0 transition-all duration-200 ${
                          isSelected ? "w-1.5 h-1.5 ring-2 ring-zen-accent/40" : "w-1 h-1"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                      <span
                        className={`shrink-0 whitespace-nowrap text-left font-sans ${zenType.caption} ${
                          isSelected ? "font-bold" : "font-medium"
                        }`}
                      >
                        {task.name}
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate text-right font-mono tabular-nums ${
                          isSelected ? "font-extrabold" : isChartActive ? "font-bold" : ""
                        }`}
                      >
                        <span style={{ color: isChartActive ? color : undefined }}>
                          {avg >= 100 ? avg.toFixed(0) : avg.toFixed(1)}ms
                        </span>
                        <span
                          className={`${lossVal > 0 ? "text-zen-warning" : zenText.subtle}`}
                        >
                          {" · "}
                          {lossVal.toFixed(1)}%
                        </span>
                        {volatility !== null ? (
                          <span
                            className={
                              volatility > 0.3 ? "text-zen-warning" : zenText.subtle
                            }
                            title={t.pingVolatility}
                          >
                            {" · "}
                            {volatility.toFixed(2)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedProbes.length > 0 && (
                <button
                  type="button"
                  onClick={() => onToggleProbe("CLEAR_ALL")}
                  className={`font-bold tracking-wider underline cursor-pointer hover:text-zen-accent transition-colors uppercase ${zenType.label}`}
                >
                  {t.pingShowAll}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
