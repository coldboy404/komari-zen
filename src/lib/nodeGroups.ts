import type { Lang } from "./i18n/types";
import { translations } from "./i18n";

/** Sentinel for the "show all groups" filter tab — not a real node group name. */
export const ALL_NODE_GROUP = "__all__";

export function collectNodeGroups(
  nodes: { nodeGroup?: string }[],
): string[] {
  const set = new Set<string>();
  for (const node of nodes) {
    const g = node.nodeGroup?.trim();
    if (g) set.add(g);
  }
  return Array.from(set).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

export function allGroupsLabel(lang: Lang): string {
  return translations[lang].lblAllGroups;
}
