import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "ar" | "en";
export type BrightnessMode = "system" | "light" | "dark";

type Preferences = {
  language: AppLanguage;
  fontScale: number;
  brightness: BrightnessMode;
  lastBackupAt: number | null;
  reminderDays: number;
};

type PreferencesContextValue = Preferences & {
  setLanguage: (value: AppLanguage) => void;
  setFontScale: (value: number) => void;
  setBrightness: (value: BrightnessMode) => void;
  markBackupComplete: () => void;
  snoozeBackupReminder: () => void;
};

const KEY = "masroofi-app-preferences-v1";
const defaults: Preferences = { language: "ar", fontScale: 1, brightness: "system", lastBackupAt: null, reminderDays: 30 };
const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Preferences>(defaults);
  useEffect(() => { AsyncStorage.getItem(KEY).then((raw) => raw && setState({ ...defaults, ...JSON.parse(raw) })).catch(() => undefined); }, []);
  useEffect(() => { AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => undefined); }, [state]);
  const value = useMemo(() => ({
    ...state,
    setLanguage: (language: AppLanguage) => setState((current) => ({ ...current, language })),
    setFontScale: (fontScale: number) => setState((current) => ({ ...current, fontScale })),
    setBrightness: (brightness: BrightnessMode) => setState((current) => ({ ...current, brightness })),
    markBackupComplete: () => setState((current) => ({ ...current, lastBackupAt: Date.now() })),
    snoozeBackupReminder: () => setState((current) => ({ ...current, lastBackupAt: Date.now() })),
  }), [state]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useAppPreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("useAppPreferences must be used inside AppPreferencesProvider");
  return value;
}

export function shouldShowBackupReminder(lastBackupAt: number | null, reminderDays = 30) {
  return !lastBackupAt || Date.now() - lastBackupAt >= reminderDays * 24 * 60 * 60 * 1000;
}
