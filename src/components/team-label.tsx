import Image from "next/image";
import type { ReactNode } from "react";

type TeamLabelProps = {
  name: ReactNode;
  flagCode?: string | null;
  align?: "left" | "right";
  className?: string;
};

const flagImageCodes: Record<string, string> = {
  "GB-ENG": "gb-eng",
  "GB-SCT": "gb-sct"
};

export function TeamLabel({
  name,
  flagCode,
  align = "left",
  className = ""
}: TeamLabelProps) {
  const flagImageSrc = getFlagImageSrc(flagCode);

  return (
    <span
      className={[
        "inline-flex min-w-0 items-center gap-2",
        align === "right" ? "justify-end text-right" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {flagImageSrc ? (
        <Image
          alt=""
          aria-hidden="true"
          className="h-[1em] w-[1.5em] shrink-0 rounded-[2px] border border-black/10 object-cover"
          height={16}
          src={flagImageSrc}
          unoptimized
          width={24}
        />
      ) : null}
      <span className="min-w-0">{name}</span>
    </span>
  );
}

export function formatTeamOptionLabel(name: string, flagCode?: string | null) {
  void flagCode;
  return name;
}

export function getFlagImageSrc(flagCode?: string | null) {
  if (!flagCode) {
    return null;
  }

  const normalizedFlagCode = flagCode.toUpperCase();
  const imageCode = flagImageCodes[normalizedFlagCode];

  if (imageCode) {
    return `https://flagcdn.com/${imageCode}.svg`;
  }

  if (!/^[A-Z]{2}$/.test(normalizedFlagCode)) {
    return null;
  }

  return `https://flagcdn.com/${normalizedFlagCode.toLowerCase()}.svg`;
}
