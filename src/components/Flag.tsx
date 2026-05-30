/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React from "react";

interface FlagProps {
  flag: string;
  className?: string;
}

const getCountryCodeFromFlagEmoji = (emoji: string): string | null => {
  const chars = Array.from(emoji);

  if (chars.length !== 2) {
    return null;
  }

  const codePoint1 = chars[0].codePointAt(0)!;
  const codePoint2 = chars[1].codePointAt(0)!;
  const REGIONAL_INDICATOR_START = 0x1f1e6;
  const ASCII_ALPHA_START = 0x41;

  if (
    codePoint1 >= REGIONAL_INDICATOR_START &&
    codePoint1 <= 0x1f1ff &&
    codePoint2 >= REGIONAL_INDICATOR_START &&
    codePoint2 <= 0x1f1ff
  ) {
    const letter1 = String.fromCodePoint(
      codePoint1 - REGIONAL_INDICATOR_START + ASCII_ALPHA_START,
    );
    const letter2 = String.fromCodePoint(
      codePoint2 - REGIONAL_INDICATOR_START + ASCII_ALPHA_START,
    );
    return `${letter1}${letter2}`;
  }

  return null;
};

function resolveFlagFileName(flag: string): string {
  const countryCodeFromEmoji = getCountryCodeFromFlagEmoji(flag);

  if (countryCodeFromEmoji) {
    return countryCodeFromEmoji;
  }

  if (flag && flag.length === 2 && /^[a-zA-Z]{2}$/.test(flag)) {
    return flag.toUpperCase();
  }

  if (flag === "🇺🇳" || flag === "🌐") {
    return "UN";
  }

  return "UN";
}

export const Flag = React.memo(({ flag, className = "w-4 h-4" }: FlagProps) => {
  const resolvedFlagFileName = resolveFlagFileName(flag);
  const imgSrc = `/assets/flags/${resolvedFlagFileName}.svg`;
  const altText = `地区旗帜: ${resolvedFlagFileName}`;

  return (
    <span
      className={`inline-flex shrink-0 items-center self-center ${className}`}
      aria-label={altText}
    >
      <img
        src={imgSrc}
        alt={altText}
        className="h-full w-full object-contain"
      />
    </span>
  );
});

Flag.displayName = "Flag";
