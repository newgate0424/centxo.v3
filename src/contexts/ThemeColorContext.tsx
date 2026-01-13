'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

interface ThemeColors {
  primary: string;
  background: string;
}

interface ThemeColorContextType {
  colors: ThemeColors;
  setPrimaryColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  resetColors: () => void;
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(undefined);

// Helper to convert hex to hsl
function hexToHSL(H: string) {
  let r = 0, g = 0, b = 0;
  if (H.length === 4) {
    r = parseInt("0x" + H[1] + H[1]);
    g = parseInt("0x" + H[2] + H[2]);
    b = parseInt("0x" + H[3] + H[3]);
  } else if (H.length === 7) {
    r = parseInt("0x" + H[1] + H[2]);
    g = parseInt("0x" + H[3] + H[4]);
    b = parseInt("0x" + H[5] + H[6]);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  let cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin,
    h = 0,
    s = 0,
    l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return `${h} ${s}% ${l}%`;
}

// Default colors
const DEFAULT_PRIMARY = '#3b82f6'; // blue-500
const DEFAULT_BG_LIGHT = '#f8fafc'; // slate-50
const DEFAULT_BG_DARK = '#0f172a'; // slate-900

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme } = useTheme();

  // State for raw hex values
  const [primaryColor, setPrimaryColorState] = useState<string>(DEFAULT_PRIMARY);
  const [lightBg, setLightBg] = useState<string>(DEFAULT_BG_LIGHT);
  const [darkBg, setDarkBg] = useState<string>(DEFAULT_BG_DARK);

  // Load saved colors on mount
  useEffect(() => {
    const savedPrimary = localStorage.getItem('theme-primary');
    const savedLightBg = localStorage.getItem('theme-background-light');
    const savedDarkBg = localStorage.getItem('theme-background-dark');

    if (savedPrimary) setPrimaryColorState(savedPrimary);
    if (savedLightBg) setLightBg(savedLightBg);
    if (savedDarkBg) setDarkBg(savedDarkBg);
  }, []);

  // Update CSS variables when colors or theme changes
  useEffect(() => {
    const root = document.documentElement;

    // Apply Primary Color
    if (primaryColor) {
      const hsl = hexToHSL(primaryColor);
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--ring', hsl);
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
    }

    // Apply Background Color based on current theme
    const isDark = resolvedTheme === 'dark';
    const currentBg = isDark ? darkBg : lightBg;

    if (currentBg) {
      const hsl = hexToHSL(currentBg);
      root.style.setProperty('--background', hsl);
    } else {
      root.style.removeProperty('--background');
    }

  }, [primaryColor, lightBg, darkBg, resolvedTheme]);

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color);
    localStorage.setItem('theme-primary', color);
  };

  const setBackgroundColor = (color: string) => {
    const isDark = resolvedTheme === 'dark';
    if (isDark) {
      setDarkBg(color);
      localStorage.setItem('theme-background-dark', color);
    } else {
      setLightBg(color);
      localStorage.setItem('theme-background-light', color);
    }
  };

  const resetColors = () => {
    setPrimaryColorState(DEFAULT_PRIMARY);
    setLightBg(DEFAULT_BG_LIGHT);
    setDarkBg(DEFAULT_BG_DARK);

    localStorage.removeItem('theme-primary');
    localStorage.removeItem('theme-background-light');
    localStorage.removeItem('theme-background-dark');

    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--ring');
    document.documentElement.style.removeProperty('--background');
  };

  // Determine current active background for the context consumer
  const activeBackground = resolvedTheme === 'dark' ? darkBg : lightBg;

  return (
    <ThemeColorContext.Provider value={{
      colors: { primary: primaryColor, background: activeBackground },
      setPrimaryColor,
      setBackgroundColor,
      resetColors
    }}>
      {children}
    </ThemeColorContext.Provider>
  );
}

export function useThemeColor() {
  const context = useContext(ThemeColorContext);
  if (context === undefined) {
    throw new Error('useThemeColor must be used within a ThemeColorProvider');
  }
  return context;
}
