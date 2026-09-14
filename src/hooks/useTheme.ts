/**
 * Hook: UI theme (visual palette).
 *
 * Single source of truth for the `ui_theme` class on <html> + its
 * localStorage persistence, so it can be controlled from more than one
 * place (Settings' Appearance card, the sidebar's quick switcher) without
 * duplicating the class-manipulation logic. A custom event keeps every
 * mounted instance of this hook in sync — e.g. changing theme from the
 * sidebar while Settings' own dropdown is also on screen.
 */
import { useState, useCallback, useEffect } from 'react';

export const THEME_OPTIONS = [
  { value: 'theme-default', label: 'Default (Teal/Navy)' },
  { value: 'theme-grayscale', label: 'Grayscale' },
  { value: 'theme-indigo', label: 'Indigo' },
] as const;

const THEME_CLASSES = THEME_OPTIONS.map((t) => t.value);
const STORAGE_KEY = 'ui_theme';
const THEME_EVENT = 'ui_theme_change';

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || 'theme-default');

  useEffect(() => {
    const onThemeChange = (e: Event) => setTheme((e as CustomEvent<string>).detail);
    window.addEventListener(THEME_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_EVENT, onThemeChange);
  }, []);

  const applyTheme = useCallback((value: string) => {
    const root = document.documentElement;
    root.classList.remove(...THEME_CLASSES);
    root.classList.add(value);
    localStorage.setItem(STORAGE_KEY, value);
    setTheme(value);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: value }));
  }, []);

  return { theme, applyTheme };
}
