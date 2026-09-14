import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useEffect, useRef } from "react";
import { Alert, AppState, Platform } from "react-native";

import { useI18n } from "@/lib/i18n";
import { useAppPreferences } from "@/lib/app-preferences";
import {
  fetchLatestRelease,
  getAvailableUpdate,
  type AvailableUpdate,
} from "@/lib/github-releases";

const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;

function getInstalledVersion() {
  return Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "1.0.0";
}

async function openUpdateLink(update: AvailableUpdate) {
  const url = update.downloadUrl ?? update.releaseUrl;
  await Linking.openURL(url);
}

export function UpdateChecker() {
  const { language } = useI18n();
  const { autoUpdateChecks } = useAppPreferences();
  const lastCheckAt = useRef(0);
  const isChecking = useRef(false);
  const alertedVersion = useRef<string | null>(null);

  useEffect(() => {
    const checkForUpdate = async () => {
      if (
        Platform.OS === "web" ||
        !autoUpdateChecks ||
        isChecking.current ||
        Date.now() - lastCheckAt.current < CHECK_INTERVAL_MS
      )
        return;
      isChecking.current = true;

      try {
        const release = await fetchLatestRelease();
        lastCheckAt.current = Date.now();
        const update = getAvailableUpdate(release, getInstalledVersion());
        if (!update || alertedVersion.current === update.version) return;
        alertedVersion.current = update.version;

        const title =
          language === "en"
            ? "A new Masroofi update is available"
            : "يتوفر تحديث جديد لمصروفي";
        const message =
          language === "en"
            ? `Version ${update.version} is available. Open GitHub to download the latest APK.`
            : `الإصدار ${update.version} متوفر الآن. افتح GitHub لتنزيل أحدث نسخة من التطبيق.`;
        const updateLabel = language === "en" ? "Update now" : "تحديث الآن";
        const laterLabel = language === "en" ? "Later" : "لاحقًا";

        Alert.alert(title, message, [
          { text: laterLabel, style: "cancel" },
          {
            text: updateLabel,
            onPress: () => {
              void openUpdateLink(update).catch(() => undefined);
            },
          },
        ]);
      } catch {
        lastCheckAt.current = 0;
        // Update checks are best-effort and must never block the financial ledger.
      } finally {
        isChecking.current = false;
      }
    };

    void checkForUpdate();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkForUpdate();
    });

    return () => subscription.remove();
  }, [language, autoUpdateChecks]);

  if (Platform.OS === "web") return null;
  return null;
}
