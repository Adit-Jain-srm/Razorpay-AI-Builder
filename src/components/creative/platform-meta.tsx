"use client";

import {
  GoogleLogo,
  type Icon,
  LinkedinLogo,
  MetaLogo,
  Newspaper,
  TiktokLogo,
  XLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";

import type { AdPlatform } from "@/lib/research/standard-models";
import { platformDisplayName } from "@/lib/creative";

interface PlatformMeta {
  label: string;
  Icon: Icon;
}

const META: Record<AdPlatform, PlatformMeta> = {
  google: { label: "Google Ads", Icon: GoogleLogo },
  meta: { label: "Meta", Icon: MetaLogo },
  tiktok: { label: "TikTok", Icon: TiktokLogo },
  taboola: { label: "Taboola", Icon: Newspaper },
  linkedin: { label: "LinkedIn", Icon: LinkedinLogo },
  youtube: { label: "YouTube", Icon: YoutubeLogo },
  x: { label: "X", Icon: XLogo },
};

export function getPlatformMeta(platform: AdPlatform): PlatformMeta {
  return META[platform] ?? { label: platformDisplayName(platform), Icon: Newspaper };
}

export function PlatformIcon({ platform, className }: { platform: AdPlatform; className?: string }) {
  const { Icon } = getPlatformMeta(platform);
  return <Icon weight="duotone" className={className} />;
}
