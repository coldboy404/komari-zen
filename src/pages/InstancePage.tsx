/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { useLayoutEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { NodeDetail } from "@/components/NodeDetail";
import { useNodeRecent } from "@/hooks/useNodeRecent";
import { translations } from "@/lib/i18n";
import { zenType, zenTouch } from "@/lib/typography";
import type { AppOutletContext } from "@/layouts/AppLayout";

export default function InstancePage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { nodes, lang, theme } = useOutletContext<AppOutletContext>();
  const t = translations[lang];

  const node = nodes.find((n) => n.id === uuid);
  const { records: recentRecords } = useNodeRecent(
    uuid ?? null,
    !!node?.online,
  );

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [uuid]);

  const textMutedClass =
    theme === "dark" ? "text-neutral-500/85" : "text-neutral-500";

  return (
    <section className="space-y-3 pt-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono pb-1.5 border-b border-transparent">
        <button
          type="button"
          onClick={() => navigate("/")}
          className={`group font-sans ${zenType.data} font-bold tracking-wider transition-all duration-200 ${zenTouch.btn} px-3.5 rounded-full ${
            theme === "dark"
              ? "hover:bg-zen-surface text-neutral-400 hover:text-neutral-200"
              : "hover:bg-neutral-200/50 text-neutral-500 hover:text-neutral-800"
          } flex items-center gap-1.5 select-none active:scale-95 cursor-pointer`}
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          {t.backToList}
        </button>
        <div className={`hidden sm:block ${zenType.caption} ${textMutedClass} tracking-widest uppercase`}>
          {t.activeFocus}:{" "}
          <span
            className={`font-mono font-black ${theme === "dark" ? "text-neutral-300" : "text-emerald-700"}`}
          >
            {uuid ? uuid.toUpperCase() : "NULL"}
          </span>
        </div>
      </div>

      {node ? (
        <NodeDetail
          node={node}
          lang={lang}
          theme={theme}
          recentRecords={recentRecords}
        />
      ) : (
        <div
          className={`py-12 text-center ${textMutedClass} uppercase zen-track-tight ${zenType.data} leading-relaxed font-mono space-y-4`}
        >
          <p>{t.selectVpsInput}</p>
          <Link
            to="/"
            className="inline-block text-emerald-500 hover:underline normal-case tracking-normal"
          >
            {t.backToList}
          </Link>
        </div>
      )}
    </section>
  );
}
