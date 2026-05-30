import React from "react";

export type ChartScrubConfig = {
  width: number;
  paddingX: number;
  chartWidth: number;
  dataLength: number;
};

export function indexFromClientX(
  clientX: number,
  svgEl: SVGSVGElement,
  config: ChartScrubConfig,
): number {
  const { width, paddingX, chartWidth, dataLength } = config;
  if (dataLength <= 0) return 0;

  const svgRect = svgEl.getBoundingClientRect();
  const x = clientX - svgRect.left;
  const svgX = (x / svgRect.width) * width;
  const chartRatio = (svgX - paddingX) / chartWidth;
  return Math.max(
    0,
    Math.min(dataLength - 1, Math.round(chartRatio * (dataLength - 1))),
  );
}

export function useChartScrub(
  containerRef: React.RefObject<HTMLElement | null>,
  config: ChartScrubConfig,
) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const updateFromClientX = React.useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container || config.dataLength === 0) return;
      const svgEl = container.querySelector("svg");
      if (!svgEl) return;
      setHoveredIndex(indexFromClientX(clientX, svgEl, config));
    },
    [containerRef, config],
  );

  const onMouseMove = React.useCallback(
    (e: React.MouseEvent) => updateFromClientX(e.clientX),
    [updateFromClientX],
  );

  const onMouseLeave = React.useCallback(() => setHoveredIndex(null), []);

  const onTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      if (e.touches[0]) updateFromClientX(e.touches[0].clientX);
    },
    [updateFromClientX],
  );

  const onTouchMove = React.useCallback(
    (e: React.TouchEvent) => {
      if (e.touches[0]) updateFromClientX(e.touches[0].clientX);
    },
    [updateFromClientX],
  );

  const onTouchEnd = React.useCallback(() => setHoveredIndex(null), []);

  return {
    hoveredIndex,
    setHoveredIndex,
    onMouseMove,
    onMouseLeave,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
