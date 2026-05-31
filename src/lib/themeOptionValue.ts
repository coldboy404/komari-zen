const THEME_OPTION_VALUE_MAP: Record<string, string> = {
  首位: "First",
  保持: "Keep",
  末尾: "Last",
  卡片: "Card",
  列表: "List",
  默认: "Default",
  名称: "Name",
  处理器: "CPU",
  内存: "Memory",
  硬盘: "Disk",
  延迟: "Latency",
  到期: "Expiry",
  状态: "Status",
  系统: "OS",
  升序: "Ascending",
  降序: "Descending",
  固定: "Fixed",
  均值偏移: "MeanDelta",
  暖色: "Warm",
  红色: "Red",
  黄色: "Yellow",
  绿色: "Green",
  蓝色: "Blue",
  紫色: "Purple",
  黑白: "Mono",
  等宽: "MapleMonoCN",
  游梦: "Yomeng",
  自定义: "Custom",
};

/** Machine value from Chinese select labels, bilingual labels like "卡片 Card", or legacy "Card". */
export function parseThemeSelectOption(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const lastSpace = trimmed.lastIndexOf(" ");
  const token = lastSpace === -1 ? trimmed : trimmed.slice(lastSpace + 1).trim();
  return (THEME_OPTION_VALUE_MAP[token] ?? token) || fallback;
}
