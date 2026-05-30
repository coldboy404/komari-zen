/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { NodeTable } from "@/components/NodeTable";
import { translations } from "@/lib/i18n";
import { zenType } from "@/lib/typography";
import type { AppOutletContext } from "@/layouts/AppLayout";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { nodes, lang, theme } = useOutletContext<AppOutletContext>();
  const t = translations[lang];

  const textMutedClass =
    theme === "dark" ? "text-neutral-500/85" : "text-neutral-500";

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-end text-neutral-400 font-mono">
        <span
          className={`${zenType.label} ${textMutedClass} tracking-widest hidden sm:inline uppercase`}
        >
          {t.clickForDiag}
        </span>
      </div>
      <NodeTable
        nodes={nodes}
        selectedNodeId={null}
        onSelectNode={(node) => navigate(`/instance/${node.id}`)}
        lang={lang}
        theme={theme}
      />
    </section>
  );
}
