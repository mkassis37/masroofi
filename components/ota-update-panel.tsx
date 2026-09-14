import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";

type Translator = (ar: string, en: string) => string;

export function OtaUpdatePanel({
  t,
  scale,
  autoGitHubChecks,
  setAutoGitHubChecks,
  autoOtaChecks,
  setAutoOtaChecks,
}: {
  t: Translator;
  scale: number;
  autoGitHubChecks: boolean;
  setAutoGitHubChecks: (value: boolean) => void;
  autoOtaChecks: boolean;
  setAutoOtaChecks: (value: boolean) => void;
}) {
  const [checking, setChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<
    "idle" | "current" | "available" | "unavailable" | "error"
  >("idle");

  const appVersion =
    Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "1.0.0";
  const otaVersion =
    Updates.updateId ?? t("مدمج داخل التطبيق", "Embedded in app");
  const channel = Updates.channel ?? t("غير محددة", "Not configured");
  const runtimeVersion =
    Updates.runtimeVersion ?? t("غير متاحة", "Not available");
  const updateMode = Updates.isEmbeddedLaunch
    ? t("النسخة المدمجة", "Embedded version")
    : t("نسخة OTA", "OTA version");
  const statusLabel = useMemo(() => {
    if (status === "current") return t("التطبيق محدث", "App is up to date");
    if (status === "available") return t("يتوفر تحديث", "Update available");
    if (status === "unavailable")
      return t("الفحص غير متاح حاليًا", "Check unavailable");
    if (status === "error") return t("تعذر إكمال الفحص", "Check failed");
    return t("لم يتم الفحص بعد", "Not checked yet");
  }, [status, t]);

  const checkNow = async () => {
    if (checking) return;
    if (!Updates.isEnabled) {
      setStatus("unavailable");
      setLastCheckedAt(new Date());
      Alert.alert(
        t("الفحص غير متاح", "Check unavailable"),
        t(
          "يحتاج فحص OTA إلى نسخة Android أو iOS مبنية عبر EAS، وليس Expo Go أو نسخة التطوير.",
          "OTA checks require an EAS Android or iOS build, not Expo Go or development mode.",
        ),
      );
      return;
    }

    setChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      setLastCheckedAt(new Date());
      if (result.isAvailable) {
        setStatus("available");
        Alert.alert(
          t("يتوفر تحديث OTA", "OTA update available"),
          t(
            "يمكن تنزيل التحديث وإعادة تشغيل التطبيق لتطبيق التغييرات.",
            "Download the update and restart the app to apply the changes.",
          ),
          [
            { text: t("لاحقًا", "Later"), style: "cancel" },
            {
              text: t("تنزيل وتطبيق", "Download and apply"),
              onPress: () => {
                void Updates.fetchUpdateAsync()
                  .then(() => Updates.reloadAsync())
                  .catch(() =>
                    Alert.alert(
                      t("تعذر التنزيل", "Download failed"),
                      t(
                        "سيستمر التطبيق بالنسخة الحالية. حاول لاحقًا.",
                        "The current version will remain active. Try again later.",
                      ),
                    ),
                  );
              },
            },
          ],
        );
      } else {
        setStatus("current");
      }
    } catch {
      setLastCheckedAt(new Date());
      setStatus("error");
      Alert.alert(
        t("تعذر الفحص", "Check failed"),
        t(
          "تحقق من الاتصال وحاول مرة أخرى.",
          "Check your connection and try again.",
        ),
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <View>
      <Text
        style={{
          color: "#667085",
          textAlign: "right",
          lineHeight: 22,
          marginBottom: 15,
          fontSize: 13 * scale,
        }}
      >
        {t(
          "اعرض نسخة التطبيق الحالية وافحص تحديثات OTA للأكواد والأصول غير الأصلية.",
          "View the current app version and check OTA updates for JavaScript and assets.",
        )}
      </Text>
      <View
        style={{
          flexDirection: "row-reverse",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          padding: 13,
          marginBottom: 9,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "#17212B",
              fontWeight: "800",
              textAlign: "right",
              fontSize: 14 * scale,
            }}
          >
            {t("فحص تحديثات GitHub تلقائيًا", "Automatic GitHub checks")}
          </Text>
          <Text
            style={{
              color: "#667085",
              textAlign: "right",
              lineHeight: 20,
              marginTop: 3,
              fontSize: 12 * scale,
            }}
          >
            {t(
              "افحص إصدارات APK الجديدة عند تشغيل التطبيق وعودته للمقدمة.",
              "Check for new APK releases when the app starts or returns to the foreground.",
            )}
          </Text>
        </View>
        <Switch value={autoGitHubChecks} onValueChange={setAutoGitHubChecks} />
      </View>
      <View
        style={{
          flexDirection: "row-reverse",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          padding: 13,
          marginBottom: 9,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "#17212B",
              fontWeight: "800",
              textAlign: "right",
              fontSize: 14 * scale,
            }}
          >
            {t("فحص تحديثات OTA تلقائيًا", "Automatic OTA checks")}
          </Text>
          <Text
            style={{
              color: "#667085",
              textAlign: "right",
              lineHeight: 20,
              marginTop: 3,
              fontSize: 12 * scale,
            }}
          >
            {t(
              "افحص تحديثات الأكواد والأصول غير الأصلية تلقائيًا.",
              "Check JavaScript and asset updates automatically.",
            )}
          </Text>
        </View>
        <Switch value={autoOtaChecks} onValueChange={setAutoOtaChecks} />
      </View>
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          padding: 13,
          marginBottom: 9,
        }}
      >
        <InfoRow label={t("نسخة التطبيق", "App version")} value={appVersion} />
        <InfoRow
          label={t("نسخة OTA الحالية", "Current OTA update")}
          value={otaVersion}
          compact
        />
        <InfoRow label={t("نوع النسخة", "Launch type")} value={updateMode} />
        <InfoRow label={t("قناة التحديث", "Update channel")} value={channel} />
        <InfoRow
          label={t("إصدار التشغيل", "Runtime version")}
          value={runtimeVersion}
        />
        <InfoRow label={t("الحالة", "Status")} value={statusLabel} />
        {lastCheckedAt && (
          <InfoRow
            label={t("آخر فحص", "Last check")}
            value={lastCheckedAt.toLocaleString()}
          />
        )}
      </View>
      <Pressable
        onPress={() => void checkNow()}
        disabled={checking}
        style={({ pressed }) => [
          {
            backgroundColor: "#17365D",
            borderRadius: 12,
            padding: 13,
            alignItems: "center",
            marginBottom: 9,
          },
          pressed && { opacity: 0.78 },
          checking && { opacity: 0.6 },
        ]}
      >
        {checking ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "800",
              fontSize: 14 * scale,
            }}
          >
            {t("التحقق من التحديثات", "Check for updates")}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function InfoRow({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        gap: 10,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: "#667085", textAlign: "right", flex: 1 }}>
        {label}
      </Text>
      <Text
        style={{
          color: "#17212B",
          fontWeight: "800",
          textAlign: "right",
          flex: compact ? 2 : 1,
        }}
        numberOfLines={compact ? 1 : 2}
      >
        {value}
      </Text>
    </View>
  );
}
