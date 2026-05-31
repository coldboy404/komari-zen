/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { Suspense, lazy } from "react";
import { Outlet, useMatch } from "react-router-dom";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { useKomariNodes } from "@/hooks/useKomariNodes";
import { useKomariVersion } from "@/hooks/useKomariVersion";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import { useSiteMeta } from "@/hooks/useSiteMeta";
import { useThemePreference } from "@/hooks/useThemePreference";
import { useLangPreference } from "@/hooks/useLangPreference";
import { translations } from "@/lib/i18n";
import { zenType } from "@/lib/typography";
import { sanitizeFooterHtml } from "@/lib/sanitizeHtml";

const NodeDistributionMap = lazy(() =>
  import("@/components/NodeDistributionMap").then((m) => ({
    default: m.NodeDistributionMap,
  })),
);

export function AppLayout() {
  useSiteMeta();
  const { nodes, isLoading, error } = useKomariNodes();
  const { theme, preference: themePreference, setPreference: setThemePreference } =
    useThemePreference();
  const { lang, setPreference: setLangPreference } = useLangPreference();
  const { customFooterHtml, showNodeMap } = useThemeSettings();
  const komariVersion = useKomariVersion();
  const themeVersion = __THEME_VERSION__;
  const t = translations[lang];

  const isDetail = Boolean(useMatch({ path: "/instance/:uuid", end: true }));

  const textMutedClass =
    theme === "dark" ? "text-neutral-500/85" : "text-neutral-500";
  const bgClass = "bg-zen-bg text-zen-fg";

  if (isLoading) {
    return (
      <div
        className={`min-h-screen px-4 pt-4 pb-5 sm:px-6 sm:pt-6 sm:pb-6 md:px-12 md:pt-12 md:pb-8 antialiased ${bgClass}`}
      >
        <div className="mx-auto w-full max-w-[1600px] @container">
          <DashboardSkeleton theme={theme} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center gap-3 font-mono text-sm p-8 ${bgClass}`}
      >
        <span className="text-red-400">
          {t.errorLoadNodes} {error}
        </span>
        <span className={`${zenType.caption} ${textMutedClass}`}>{t.errorCheckEnv}</span>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen px-4 pt-4 pb-5 sm:px-6 sm:pt-6 sm:pb-6 md:px-12 md:pt-12 md:pb-8 select-none antialiased transition-colors duration-300 ${bgClass}`}
    >
      <div className="mx-auto w-full max-w-[1600px] @container">
        <div
          className={isDetail ? "space-y-4 md:space-y-5" : "space-y-10 md:space-y-16 lg:space-y-20"}
        >
          <ConsoleHeader
            nodes={nodes}
          lang={lang}
          setLangPreference={setLangPreference}
            theme={theme}
            themePreference={themePreference}
            setThemePreference={setThemePreference}
            view={isDetail ? "detail" : "dashboard"}
          />

          {isDetail ? (
            <main className="space-y-4 md:space-y-5">
              <Outlet context={{ nodes, lang, theme }} />
            </main>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {showNodeMap ? (
                <Suspense fallback={null}>
                  <NodeDistributionMap
                    nodes={nodes}
                    theme={theme}
                    lang={lang}
                  />
                </Suspense>
              ) : null}

              <main>
                <Outlet context={{ nodes, lang, theme }} />
              </main>
            </div>
          )}
        </div>

        <footer
          className={`mt-6 md:mt-7 pt-5 sm:pt-6 md:pt-8 border-t ${theme === "dark" ? "border-neutral-900" : "border-neutral-200"} text-center ${textMutedClass} leading-relaxed`}
        >
          <div className={`${zenType.caption} sm:text-xs tracking-wide font-mono`}>
            <div className="sm:hidden whitespace-nowrap">
              <a
                href="https://github.com/komari-monitor/komari"
                target="_blank"
                rel="noopener noreferrer"
                className={`${theme === "dark" ? "text-neutral-400" : "text-neutral-600"} font-semibold hover:text-emerald-500 underline-offset-2 hover:underline transition-colors`}
              >
                Komari
              </a>
              {komariVersion ? (
                <span className="ml-1 font-normal opacity-70">v{komariVersion}</span>
              ) : null}
              <span className="mx-2 opacity-40">·</span>
              <a
                href="https://github.com/qwer-xyz/komari-zen"
                target="_blank"
                rel="noopener noreferrer"
                className={`${theme === "dark" ? "text-neutral-400" : "text-neutral-600"} font-semibold hover:text-emerald-500 underline-offset-2 hover:underline transition-colors`}
              >
                Zen
              </a>
              <span className="ml-1 font-normal opacity-70">v{themeVersion}</span>
            </div>
            <div className="hidden sm:block">
              Powered by{" "}
              <a
                href="https://github.com/komari-monitor/komari"
                target="_blank"
                rel="noopener noreferrer"
                className={`${theme === "dark" ? "text-neutral-400" : "text-neutral-600"} font-semibold hover:text-emerald-500 underline-offset-2 hover:underline transition-colors`}
              >
                Komari Monitor
              </a>
              {komariVersion ? (
                <span className="ml-1 font-normal opacity-70">v{komariVersion}</span>
              ) : null}
              <span className="ml-4 md:ml-6">Theme by</span>{" "}
              <a
                href="https://github.com/qwer-xyz/komari-zen"
                target="_blank"
                rel="noopener noreferrer"
                className={`${theme === "dark" ? "text-neutral-400" : "text-neutral-600"} font-semibold hover:text-emerald-500 underline-offset-2 hover:underline transition-colors`}
              >
                Komari Zen
              </a>
              <span className="ml-1 font-normal opacity-70">v{themeVersion}</span>
            </div>
          </div>
          {customFooterHtml.trim() ? (
            <div
              className={`mt-2 text-center ${zenType.caption} sm:text-xs leading-relaxed [&_a]:underline [&_a]:hover:text-emerald-500`}
              dangerouslySetInnerHTML={{
                __html: sanitizeFooterHtml(customFooterHtml),
              }}
            />
          ) : null}
        </footer>
      </div>
    </div>
  );
}

export type AppOutletContext = {
  nodes: ReturnType<typeof useKomariNodes>["nodes"];
  lang: ReturnType<typeof useLangPreference>["lang"];
  theme: ReturnType<typeof useThemePreference>["theme"];
};
