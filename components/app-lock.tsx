import { useEffect, useRef, useState } from "react";
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
  if (Platform.OS !== "web") await SecureStore.setItemAsync(LOCK_KEY, String(enabled));
}

async function authenticate(language: "ar" | "en") {
  if (Platform.OS === "web") return true;
  const [hardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
  if (!hardware || !enrolled) return true;
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: language === "en" ? "Unlock Masroofi" : "افتح مصروفي", promptSubtitle: language === "en" ? "Verify your identity to access your financial data" : "تحقق من هويتك للوصول إلى بياناتك المالية", fallbackLabel: language === "en" ? "Use device passcode" : "استخدام رمز الجهاز" });
  return result.success;
}

export function AppLock({ children }: { children: React.ReactNode }) {
  const { language } = useAppPreferences();
  const [locked, setLocked] = useState(false);
  const backgroundAt = useRef<number | null>(null);
  const check = async () => { if (await getLockEnabled()) setLocked(!(await authenticate(language))); };
  useEffect(() => { check().catch(() => undefined); const sub = AppState.addEventListener("change", (state) => { if (state === "background") backgroundAt.current = Date.now(); if (state === "active" && backgroundAt.current && Date.now() - backgroundAt.current > 60_000) check().catch(() => undefined); }); return () => sub.remove(); }, []);
  if (!locked) return <>{children}</>;
  return <View style={styles.container}><Text style={styles.icon}>م</Text><Text style={styles.title}>{language === "en" ? "Masroofi is locked" : "مصروفي مقفل"}</Text><Text style={styles.text}>{language === "en" ? "Your financial data is protected. Use biometrics or your device passcode to continue." : "بياناتك المالية محمية. استخدم بصمة الإصبع أو رمز الجهاز للمتابعة."}</Text><Pressable onPress={() => check().catch(() => undefined)} style={styles.button}><Text style={styles.buttonText}>{language === "en" ? "Unlock app" : "فتح التطبيق"}</Text></Pressable></View>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: "#F6F8FB", alignItems: "center", justifyContent: "center", padding: 28 }, icon: { backgroundColor: "#17365D", color: "#FFFFFF", width: 74, height: 74, borderRadius: 24, textAlign: "center", textAlignVertical: "center", fontSize: 42, fontWeight: "800", overflow: "hidden" }, title: { color: "#17212B", fontSize: 25, fontWeight: "800", marginTop: 20 }, text: { color: "#667085", textAlign: "center", lineHeight: 22, marginTop: 9 }, button: { backgroundColor: "#0F9B8E", paddingHorizontal: 30, paddingVertical: 14, borderRadius: 13, marginTop: 22 }, buttonText: { color: "#FFFFFF", fontWeight: "800" } });
