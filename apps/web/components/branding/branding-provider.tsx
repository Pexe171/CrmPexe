"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Branding = {
  workspaceId: string | null;
  name: string;
  brandName: string;
  brandLogoUrl: string | null;
  brandPrimaryColor: string | null;
  brandSecondaryColor: string | null;
  customDomain: string | null;
  locale: string;
};

const defaultBranding: Branding = {
  workspaceId: null,
  name: "CrmPexe",
  brandName: "CrmPexe",
  brandLogoUrl: null,
  brandPrimaryColor: null,
  brandSecondaryColor: null,
  customDomain: null,
  locale: "pt-BR"
};

const BrandingContext = createContext<Branding>(defaultBranding);

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const applyCssVariable = (key: string, value: string | null) => {
  if (!value) return;
  document.documentElement.style.setProperty(key, value);
};

const normalizeHex = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("#")) return null;
  const hex = trimmed.slice(1);
  if (hex.length === 3) {
    return `#${hex.split("").map((part) => part + part).join("")}`;
  }
  if (hex.length === 6) {
    return `#${hex}`;
  }
  return null;
};

const resolveTextColor = (value: string | null) => {
  if (!value) return null;
  const normalized = normalizeHex(value);
  if (!normalized) return null;
  const intValue = parseInt(normalized.slice(1), 16);
  const r = (intValue >> 16) & 255;
  const g = (intValue >> 8) & 255;
  const b = intValue & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0f172a" : "#f8fafc";
};

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding>(defaultBranding);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/workspaces/current`, {
          credentials: "include"
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          id: string;
          name: string;
          brandName: string | null;
          brandLogoUrl: string | null;
          brandPrimaryColor: string | null;
          brandSecondaryColor: string | null;
          customDomain: string | null;
          locale: string;
        };

        const nextBranding: Branding = {
          workspaceId: data.id,
          name: data.name,
          brandName: data.brandName ?? data.name ?? defaultBranding.brandName,
          brandLogoUrl: data.brandLogoUrl ?? null,
          brandPrimaryColor: data.brandPrimaryColor ?? null,
          brandSecondaryColor: data.brandSecondaryColor ?? null,
          customDomain: data.customDomain ?? null,
          locale: data.locale ?? defaultBranding.locale
        };

        setBranding(nextBranding);

        if (typeof document !== "undefined") {
          if (nextBranding.brandPrimaryColor) {
            applyCssVariable("--brand-primary", nextBranding.brandPrimaryColor);
            applyCssVariable("--brand-primary-hover", nextBranding.brandPrimaryColor);
            const textColor = resolveTextColor(nextBranding.brandPrimaryColor);
            if (textColor) {
              applyCssVariable("--brand-primary-text", textColor);
            }
          }
          applyCssVariable("--brand-secondary", nextBranding.brandSecondaryColor);
        }

        if (nextBranding.brandName) {
          document.title = nextBranding.brandName;
        }
      } catch (error) {
        console.error("Falha ao carregar branding do workspace.", error);
      }
    };

    void fetchBranding();
  }, []);

  const value = useMemo(() => branding, [branding]);

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
