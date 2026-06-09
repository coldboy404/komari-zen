import { parseOptionalHex } from "./parseColor";
import { normalizePresetId } from "./resolveScheme";
import type { ColorPresetId, ColorSchemeOverrides } from "./tokens";
import { parseThemeSelectOption } from "@/lib/themeOptionValue";

export type ColorSchemeSettings = {
  presetId: ColorPresetId;
  overrides: ColorSchemeOverrides;
};

const BACKGROUND_COLOR_OPTIONS: Record<string, string> = {
  Warm: "#dad8ca",
  Red: "#f6ecec",
  Yellow: "#f5f0e4",
  Green: "#e8f0ea",
  Blue: "#e6eef6",
  Purple: "#efeaf4",
  Mono: "#f8fafc",
  WarmDark: "#1c1b19",
  RedDark: "#1a1214",
  YellowDark: "#1a1810",
  GreenDark: "#101814",
  BlueDark: "#101620",
  PurpleDark: "#16101e",
  MonoDark: "#070a0f",
};

const SURFACE_COLOR_OPTIONS: Record<string, string> = {
  Paper: "#f4f0e3",
  White: "#ffffff",
  Warm: "#ede8d8",
  Red: "#fff1f1",
  Yellow: "#fff7df",
  Green: "#eef8f1",
  Blue: "#eff6ff",
  Purple: "#f7f0ff",
  Graphite: "#23211f",
  Charcoal: "#18181b",
  Slate: "#1e293b",
  Ink: "#111827",
};

const ACCENT_COLOR_OPTIONS: Record<string, string> = {
  Amber: "#a16207",
  Red: "#dc2626",
  Orange: "#ea580c",
  Yellow: "#ca8a04",
  Green: "#16a34a",
  Cyan: "#0891b2",
  Blue: "#2563eb",
  Purple: "#9333ea",
  Pink: "#db2777",
  Zinc: "#52525b",
};

function parseColorOption(
  raw: unknown,
  options: Record<string, string>,
): string | undefined {
  const parsedHex = parseOptionalHex(raw);
  if (parsedHex) return parsedHex;
  const option = parseThemeSelectOption(raw, "");
  return options[option];
}

function parseBackgroundColor(raw: unknown): string | undefined {
  return parseColorOption(raw, BACKGROUND_COLOR_OPTIONS);
}

function parseSurfaceColor(raw: unknown): string | undefined {
  return parseColorOption(raw, SURFACE_COLOR_OPTIONS);
}

function parseAccentColor(raw: unknown): string | undefined {
  return parseColorOption(raw, ACCENT_COLOR_OPTIONS);
}

function parseOptionalBackgroundImage(
  backgroundRaw: unknown,
  imageRaw: unknown,
): string | undefined {
  const backgroundMode = parseThemeSelectOption(backgroundRaw, "");
  const candidate = backgroundMode === "CustomImage" ? imageRaw : backgroundRaw;
  if (typeof candidate !== "string") return undefined;
  const value = candidate.trim();
  if (!value || parseOptionalHex(value)) return undefined;
  if (BACKGROUND_COLOR_OPTIONS[parseThemeSelectOption(value, "")]) return undefined;

  return value;
}

export function colorSchemeFromTheme(
  raw: Record<string, unknown>,
): ColorSchemeSettings {
  const presetRaw = parseThemeSelectOption(raw.colorPreset, "Warm");
  return {
    presetId: normalizePresetId(presetRaw),
    overrides: {
      bgLight: parseBackgroundColor(raw.customBgLight),
      bgDark: parseBackgroundColor(raw.customBgDark),
      bgImageLight: parseOptionalBackgroundImage(
        raw.customBgLight,
        raw.customBgLightImage,
      ),
      bgImageDark: parseOptionalBackgroundImage(
        raw.customBgDark,
        raw.customBgDarkImage,
      ),
      surfaceLight: parseSurfaceColor(raw.customSurfaceLight),
      surfaceDark: parseSurfaceColor(raw.customSurfaceDark),
      accentLight: parseAccentColor(raw.customAccentLight),
      accentDark: parseAccentColor(raw.customAccentDark),
    },
  };
}
