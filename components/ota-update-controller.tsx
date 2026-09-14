import * as Updates from "expo-updates";
import { useEffect, useRef } from "react";
import { Alert, AppState, Platform } from "react-native";

import { useI18n } from "@/lib/i18n";

const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;

export function OtaUpdateController() {
  const { language } = useI18n();
  const isChecking = useRef(false);
  const lastCheckAt = useRef(0);
  const alertedUpdateId = useRef<string | null>(null);

  useEffect(() => {
    const checkForOtaUpdate = async () => {
      if (
        Platform.OS === "web" ||
        !Updates.isEnabled ||
        isChecking.current ||
        Date.now() - lastCheckAt.current < CHECK_INTERVAL_MS
      ) {
        return;
      }

      isChecking.current = true;
      try {
        const result = await Updates.checkForUpdateAsync();
        lastCheckAt.current = Date.now();
        if (!result.isAvailable) return;

        const updateId = result.manifest?.id ?? "ota-update";
        if (alertedUpdateId.current === updateId) return;
        alertedUpdateId.current = updateId;

        const title =
          language === "en"
            ? "A software update is ready"
            : "يتوفر تحديث برمجي";
        const message =
          language === "en"
            ? "A small update is available. Download it now and restart Masroofi to apply it."
            : "يتوفر تحديث صغير للتطبيق. نزّله الآن ثم أعد تشغيل مصروفي لتطبيقه.";
        const laterLabel = language === "en" ? "Later" : "لاحقًا";
        const updateLabel = language === "en" ? "Update now" : "تحديث الآن";

        Alert.alert(title, message, [
          { text: laterLabel, style: "cancel" },
          {
            text: updateLabel,
            onPress: () => {
              void Updates.fetchUpdateAsync()
                .then(() => Updates.reloadAsync())
                .catch(() => {
                  const errorTitle =
                    language === "en"
                      ? "Update unavailable"
                      : "تعذر تنزيل التحديث";
                  const errorMessage =
                    language === "en"
                      ? "Masroofi will keep using the current version. Please try again later."
                      : "سيستمر مصروفي بالنسخة الحالية. حاول مرة أخرى لاحقًا.";
                  Alert.alert(errorTitle, errorMessage);
                });
            },
          },
        ]);
      } catch {
        lastCheckAt.current = 0;
        // OTA checks are best-effort and must never block the ledger.
      } finally {
        isChecking.current = false;
      }
    };

    void checkForOtaUpdate();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkForOtaUpdate();
    });

    return () => subscription.remove();
  }, [language]);

  return null;
}
