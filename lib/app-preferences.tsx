import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AppLanguage = "ar" | "en";
export type BrightnessMode = "system" | "light" | "dark";
export type { NumberStyle } from "./number-format";
import type { NumberStyle } from "./number-format";

type Preferences = {
  language: AppLanguage;
  fontScale: number;
  brightness: BrightnessMode;
  numberStyle: NumberStyle;
  lastBackupAt: number | null;
  reminderDays: number;
  autoUpdateChecks: boolean;
  updatedAt: number;
};

type PreferencesContextValue = Preferences & {
  hydrated: boolean;
  setLanguage: (value: AppLanguage) => void;
  setFontScale: (value: number) => void;
  setBrightness: (value: BrightnessMode) => void;
  setNumberStyle: (value: NumberStyle) => void;
  applySyncedPreferences: (
    language: AppLanguage,
    numberStyle: NumberStyle,
    updatedAt: number,
  ) => void;
  markBackupComplete: () => void;
  snoozeBackupReminder: () => void;
  setAutoUpdateChecks: (value: boolean) => void;
};

const KEY = "masroofi-app-preferences-v1";
const defaults: Preferences = {
  language: "ar",
  fontScale: 1,
  brightness: "system",
  numberStyle: "arabic-indic",
  lastBackupAt: null,
  reminderDays: 30,
  autoUpdateChecks: true,
  updatedAt: 0,
};
const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function AppPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<Preferences>(defaults);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const saved = JSON.parse(raw) as Partial<Preferences>;
          setState({ ...defaults, ...saved });
        } catch {
          // Ignore malformed local preferences and keep safe defaults.
        }
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);
  useEffect(() => {
    if (hydrated)
      AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => undefined);
  }, [hydrated, state]);
  const updateLocal = <T extends Partial<Preferences>>(patch: T) =>
    setState((current) => ({ ...current, ...patch }));
  const touchSynced = <T extends Partial<Preferences>>(patch: T) =>
    setState((current) => ({ ...current, ...patch, updatedAt: Date.now() }));
  const value = useMemo(
    () => ({
      ...state,
      hydrated,
      setLanguage: (language: AppLanguage) =>
        state.language === language ? undefined : touchSynced({ language }),
      setFontScale: (fontScale: number) => updateLocal({ fontScale }),
      setBrightness: (brightness: BrightnessMode) =>
        updateLocal({ brightness }),
      setNumberStyle: (numberStyle: NumberStyle) =>
        state.numberStyle === numberStyle
          ? undefined
          : touchSynced({ numberStyle }),
      applySyncedPreferences: (
        language: AppLanguage,
        numberStyle: NumberStyle,
        updatedAt: number,
      ) =>
        setState((current) => ({
          ...current,
          language,
          numberStyle,
          updatedAt,
        })),
      markBackupComplete: () =>
        setState((current) => ({ ...current, lastBackupAt: Date.now() })),
      snoozeBackupReminder: () =>
        setState((current) => ({ ...current, lastBackupAt: Date.now() })),
      setAutoUpdateChecks: (autoUpdateChecks: boolean) =>
        updateLocal({ autoUpdateChecks }),
    }),
    [hydrated, state],
  );
  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const value = useContext(PreferencesContext);
  if (!value)
    throw new Error(
      "useAppPreferences must be used inside AppPreferencesProvider",
    );
  return value;
}

export function shouldShowBackupReminder(
  lastBackupAt: number | null,
  reminderDays = 30,
) {
  return (
    !lastBackupAt ||
    Date.now() - lastBackupAt >= reminderDays * 24 * 60 * 60 * 1000
  );
}
