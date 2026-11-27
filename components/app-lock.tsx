import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useAppPreferences } from "@/lib/app-preferences";

const LOCK_KEY = "masroofi-lock-enabled";

export async function getLockEnabled() {
  if (Platform.OS === "web") return false;
  return (await SecureStore.getItemAsync(LOCK_KEY)) === "true";
}

export async function setLockEnabled(enabled: boolean) {
  if (Platform.OS !== "web")
    await SecureStore.setItemAsync(LOCK_KEY, String(enabled));
}

export async function canUseDeviceAuthentication() {
  if (Platform.OS === "web") return false;
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hardware && enrolled;
}

async function authenticate(language: "ar" | "en") {
  if (Platform.OS === "web") return false;
  try {
    const available = await canUseDeviceAuthentication();
    if (!available) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: language === "en" ? "Unlock Masroofi" : "افتح مصروفي",
      promptSubtitle:
        language === "en"
          ? "Verify your identity to access your financial data"
          : "تحقق من هويتك للوصول إلى بياناتك المالية",
      fallbackLabel: language === "en" ? "Use device passcode" : "استخدام رمز الجهاز",
    });
    return result.success;
  } catch (error) {
    console.error("Masroofi: device authentication failed", error);
    return false;
  }
}

export function AppLock({ children }: { children: React.ReactNode }) {
  const { language } = useAppPreferences();
  const [locked, setLocked] = useState(true);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  const backgrounded = useRef(false);
  const mounted = useRef(true);

  const check = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    try {
      const enabled = await getLockEnabled();
      if (!enabled) {
        if (mounted.current) setLocked(false);
        return;
      }
      if (mounted.current) setLocked(true);
      const success = await authenticate(language);
      if (mounted.current) setLocked(!success);
    } catch (error) {
      console.error("Masroofi: could not verify app lock state", error);
      if (mounted.current) setLocked(true);
    } finally {
      if (mounted.current) {
        checkingRef.current = false;
        setChecking(false);
        setReady(true);
      }
    }
  }, [language]);

  useEffect(() => {
    mounted.current = true;
    void check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        backgrounded.current = true;
        // Hide financial screens immediately while the app is not in the foreground.
        if (mounted.current) setLocked(true);
      } else if (state === "active" && backgrounded.current) {
        backgrounded.current = false;
        void check();
      }
    });
    return () => {
      mounted.current = false;
      sub.remove();
    };
  }, [check]);

  if (!ready || locked) {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>م</Text>
        <Text style={styles.title}>
          {language === "en" ? "Masroofi is locked" : "مصروفي مقفل"}
        </Text>
        <Text style={styles.text}>
          {language === "en"
            ? "Your financial data is protected. Verify your identity to continue."
            : "بياناتك المالية محمية. تحقق من هويتك للمتابعة."}
        </Text>
        {ready && (
          <Pressable
            disabled={checking}
            onPress={() => void check()}
            style={[styles.button, checking && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {checking
                ? language === "en" ? "Checking…" : "جارٍ التحقق…"
                : language === "en" ? "Unlock app" : "فتح التطبيق"}
            </Text>
          </Pressable>
        )}
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F8FB", alignItems: "center", justifyContent: "center", padding: 28 },
  icon: { backgroundColor: "#17365D", color: "#FFFFFF", width: 74, height: 74, borderRadius: 24, textAlign: "center", textAlignVertical: "center", fontSize: 42, fontWeight: "800", overflow: "hidden" },
  title: { color: "#17212B", fontSize: 25, fontWeight: "800", marginTop: 20 },
  text: { color: "#667085", textAlign: "center", lineHeight: 22, marginTop: 9 },
  button: { backgroundColor: "#0F9B8E", paddingHorizontal: 30, paddingVertical: 14, borderRadius: 13, marginTop: 22 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
});
