import { usePublicInfo } from "@/contexts/PublicInfoContext";

import type { NodeViewMode } from "@/hooks/useViewMode";
import { parseDefaultViewMode } from "@/hooks/useViewMode";
import { parseThemeSelectOption } from "@/lib/themeOptionValue";
import {
  colorSchemeFromTheme,
  type ColorSchemeSettings,
} from "@/lib/colorScheme";
import {
  fontSchemeFromTheme,
  type FontSchemeSettings,
} from "@/lib/fontScheme";
import {
  latencyColorConfigFromTheme,
  type LatencyColorConfig,
} from "@/lib/latencyDisplay";

export type ThemeSettings = {
  showLogo: boolean;
  customLogoUrl: string;
  logoShape: LogoShape;
  offlineServerPosition: string;
  showExpiryTime: boolean;
  showAutoRenewal: boolean;
  customFooterHtml: string;
  defaultViewMode: NodeViewMode;
  defaultSortField: string;
  defaultSortOrder: string;
  showLatency: boolean;
  showNodeMap: boolean;
  latencyColorConfig: LatencyColorConfig;
  colorScheme: ColorSchemeSettings;
  fontScheme: FontSchemeSettings;
};

export type LogoShape = "Circle" | "RoundedSquare" | "Square";

function parseLogoShape(raw: unknown): LogoShape {
  const shape = parseThemeSelectOption(raw, "RoundedSquare");
  if (shape === "Circle" || shape === "Square") return shape;
  return "RoundedSquare";
}

export function useThemeSettings(): ThemeSettings {
  const { publicInfo } = usePublicInfo();
  const raw = (publicInfo?.theme_settings ?? {}) as Record<string, unknown>;

  return {
    showLogo: raw.showLogo === true,
    customLogoUrl:
      typeof raw.customLogoUrl === "string" ? raw.customLogoUrl.trim() : "",
    logoShape: parseLogoShape(raw.logoShape),
    offlineServerPosition: parseThemeSelectOption(
      raw.offlineServerPosition,
      "Last",
    ),
    showExpiryTime: raw.showExpiryTime !== false,
    showAutoRenewal: raw.showAutoRenewal !== false,
    customFooterHtml: (raw.customFooterHtml as string | undefined) ?? "",
    defaultViewMode: parseDefaultViewMode(raw.defaultViewMode),
    defaultSortField: parseThemeSelectOption(raw.defaultSortField, "Default"),
    defaultSortOrder: parseThemeSelectOption(raw.defaultSortOrder, "Ascending"),
    showLatency: raw.showLatency !== false,
    showNodeMap: raw.showNodeMap !== false,
    latencyColorConfig: latencyColorConfigFromTheme(raw),
    colorScheme: colorSchemeFromTheme(raw),
    fontScheme: fontSchemeFromTheme(raw),
  };
}
