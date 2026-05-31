/** Machine value from bilingual select label "卡片 Card", or legacy "Card". */
export function parseThemeSelectOption(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) return trimmed;
  const token = trimmed.slice(lastSpace + 1).trim();
  return token || fallback;
}
