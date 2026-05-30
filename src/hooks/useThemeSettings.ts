import { usePublicInfo } from "@/contexts/PublicInfoContext";

import type { NodeViewMode } from "@/hooks/useViewMode";
import { parseDefaultViewMode } from "@/hooks/useViewMode";
import {
  latencyColorConfigFromTheme,
  type LatencyColorConfig,
} from "@/lib/latencyDisplay";

export type ThemeSettings = {
  offlineServerPosition: string;
  showExpiryTime: boolean;
  customFooterHtml: string;
  defaultViewMode: NodeViewMode;
  defaultSortField: string;
  defaultSortOrder: string;
  showLatency: boolean;
  latencyColorConfig: LatencyColorConfig;
};

export function useThemeSettings(): ThemeSettings {
  const { publicInfo } = usePublicInfo();
  const raw = (publicInfo?.theme_settings ?? {}) as Record<string, unknown>;

  return {
    offlineServerPosition: (raw.offlineServerPosition as string | undefined) ?? "Last",
    showExpiryTime: raw.showExpiryTime !== false,
    customFooterHtml: (raw.customFooterHtml as string | undefined) ?? "",
    defaultViewMode: parseDefaultViewMode(raw.defaultViewMode),
    defaultSortField: (raw.defaultSortField as string | undefined) ?? "Default",
    defaultSortOrder: (raw.defaultSortOrder as string | undefined) ?? "Ascending",
    showLatency: raw.showLatency !== false,
    latencyColorConfig: latencyColorConfigFromTheme(raw),
  };
}
