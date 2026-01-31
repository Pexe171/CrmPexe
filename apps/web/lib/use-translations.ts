"use client";

import { useBranding } from "@/components/branding/branding-provider";
import { getMessage, type Locale } from "./i18n";

export const useTranslations = () => {
  const { locale } = useBranding();

  const t = (key: string) => getMessage(key, (locale as Locale) ?? "pt-BR");

  return { t, locale };
};
