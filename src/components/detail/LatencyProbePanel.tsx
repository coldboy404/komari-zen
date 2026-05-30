import React from "react";
import { usePingRecords } from "@/hooks/usePingRecords";
import { useChartScrub } from "@/hooks/useChartScrub";
import {
  buildPingChartRows,
  buildProbeSeriesFromRows,
  cutPeakValues,
  downsampleSeries,
  downsampleSeriesAvg,
  groupPingRecordsByTime,
  interpolateNullsLinear,
  smoothSeriesTriangular,
  taskColor,
  taskPingVolatility,
} from "@/lib/recordTransform";
import { formatMsg, translations, type Lang } from "@/lib/i18n";
import { formatChartPointTime, hoursToChartLength } from "@/lib/timeRangePresets";
import { zenType, zenTouch } from "@/lib/typography";
import type { PingTaskInfo } from "@/types/records";

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
    if (taskKeys.length > 0 && rows.length > 0) {
      rows = interpolateNullsLinear(rows, taskKeys, {
        maxGapMultiplier: 6,
        minCapMs: 2 * 60_000,
        maxCapMs: 30 * 60_000,
      });
    }
    return rows;
  }, [anchors, grouped, tasks, peakClipping]);

  const targetLen = hoursToChartLength(hours);

  const displayDataMap = React.useMemo(() => {
    const map: Record<string, number[]> = {};
    // Bucket averaging already smooths in proportion to how much we decimate, so
    // the extra moving average only needs to deburr. Keep it minimal on dense
    // ranges (high decimation) to avoid blurring genuine medium-scale features.
    const decimation = chartRows.length / Math.max(1, targetLen);
    const maRadius = decimation >= 8 ? 1 : 2;
    tasks.forEach((task) => {
      const raw = buildProbeSeriesFromRows(chartRows, task.id);
      if (peakClipping) {
        // Spikes were already removed (Hampel) when building chartRows; here we
        // anti-alias via bucket averaging and finish with a light triangular MA.
        map[String(task.id)] = smoothSeriesTriangular(
          downsampleSeriesAvg(raw, targetLen),
          maRadius,
        );
      } else {
        map[String(task.id)] = downsampleSeries(raw, targetLen);
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
      if (d) max = Math.max(max, ...d);
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
      const val = displayDataMap[id]?.[activeIdx] ?? 0;
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
          const val = displayDataMap[id]?.[activeIdx] ?? 0;
          return { task, id, val, color: taskColor(idx) };
        })
        .sort((a, b) => a.val - b.val),
    [activeProbesList, displayDataMap, activeIdx],
  );

  const formatProbeMs = (val: number) =>
    `${val >= 100 ? val.toFixed(0) : val.toFixed(1)} ms`;

  const strokeColor =
    theme === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)";
  const labelColor =
    theme === "dark" ? "text-neutral-500 font-mono" : "text-neutral-400 font-mono";

  if (tasks.length === 0 && !isLoading) {
    return (
      <div
        className={`py-12 text-center ${zenType.data} uppercase tracking-widest font-mono ${theme === "dark" ? "text-neutral-500" : "text-neutral-400"}`}
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
            className={`font-extrabold tracking-wider uppercase ${zenType.body} ${theme === "dark" ? "text-neutral-300" : "text-neutral-700"} font-mono shrink-0`}
          >
            {t.pingLatencyDetection}
          </span>
          <div className={`flex flex-wrap items-center justify-end gap-x-3.5 gap-y-1 ${zenType.caption} font-mono select-none font-bold shrink-0`}>
            <button
              type="button"
              onClick={() => setPeakClipping(!peakClipping)}
              className={`${zenTouch.btn} transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                peakClipping
                  ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                  : "text-neutral-400 dark:text-neutral-500 font-semibold hover:text-neutral-600 dark:hover:text-neutral-300"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${peakClipping ? "bg-emerald-500 animate-pulse" : "bg-neutral-300 dark:bg-neutral-700"}`}
              />
              <span>{t.pingSmooth}</span>
            </button>
            <span
              className={`${theme === "dark" ? "text-neutral-500" : "text-neutral-400"}`}
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
                    const x = paddingX + (i / denominator) * chartWidth;
                    const y =
                      height -
                      paddingY -
                      (Math.max(0, Math.min(maxLatencyVal, val)) / maxLatencyVal) *
                        chartHeight;
                    return { x, y, val };
                  });
                  const pathD =
                    points.length > 0
                      ? `M ${points[0].x} ${points[0].y} ` +
                        points.map((p) => `L ${p.x} ${p.y}`).join(" ")
                      : "";
                  const selected = selectedProbes.includes(id);
                  const dimmed =
                    selectedProbes.length > 0 && !selected;

                  return (
                    <g key={id}>
                      {selected && points.length > 0 && (
                        <path
                          d={`${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`}
                          fill={color}
                          fillOpacity={0.03}
                        />
                      )}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={color}
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={dimmed ? 0.2 : selectedProbes.length === 0 ? 0.85 : 1}
                        className="transition-all duration-300"
                      />
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
                    const val = displayDataMap[id]?.[activeIdx] ?? 0;
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
                  className={`absolute z-10 min-w-[8.5rem] max-w-[min(11rem,calc(100vw-2.5rem))] rounded-md border px-2.5 py-2 shadow-lg pointer-events-none ${zenType.caption} font-mono select-none ${
                    theme === "dark"
                      ? "border-neutral-800/80 bg-zen-surface/95 text-neutral-200"
                      : "border-neutral-200/90 bg-zen-surface/95 text-neutral-800"
                  }`}
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
                      className={`mb-1.5 tabular-nums ${zenType.label} ${
                        theme === "dark" ? "text-neutral-500" : "text-neutral-400"
                      }`}
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
                          className={`min-w-0 flex-1 truncate normal-case ${
                            theme === "dark" ? "text-neutral-400" : "text-neutral-600"
                          }`}
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
                className={`${zenType.label} zen-track-tight uppercase font-bold font-mono ${theme === "dark" ? "text-neutral-500" : "text-neutral-450"}`}
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

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onToggleProbe(id)}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-1.5 ${zenTouch.btn} px-1 ${zenType.caption} w-full transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]"
                          : isChartActive
                            ? "text-neutral-750 dark:text-neutral-250 bg-transparent hover:bg-neutral-500/[0.03]"
                            : "text-neutral-400 dark:text-neutral-500 opacity-25"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span
                          className="w-1 h-1 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className={`truncate text-left font-sans font-medium ${zenType.caption}`}>
                          {task.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono pl-2 sm:pl-0">
                        <span style={{ color: isChartActive ? color : "inherit" }}>
                          {avg >= 100 ? avg.toFixed(0) : avg.toFixed(1)}ms
                        </span>
                        <span
                          className={`border-l pl-1 border-neutral-400/10 ${lossVal > 0 ? "text-amber-600 dark:text-amber-500" : "text-neutral-500 dark:text-neutral-400"}`}
                        >
                          {lossVal.toFixed(1)}%
                        </span>
                        {volatility !== null ? (
                          <span
                            className={`border-l pl-1 border-neutral-400/10 ${
                              volatility > 0.3
                                ? "text-orange-600 dark:text-orange-400"
                                : "text-neutral-500 dark:text-neutral-400"
                            }`}
                            title={t.pingVolatility}
                          >
                            {volatility.toFixed(2)}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedProbes.length > 0 && (
                <button
                  type="button"
                  onClick={() => onToggleProbe("CLEAR_ALL")}
                  className={`font-bold tracking-wider underline cursor-pointer hover:text-emerald-500 transition-colors uppercase ${zenType.label}`}
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
