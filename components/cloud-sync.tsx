import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";
import { useFinance } from "@/lib/finance-context";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/number-format";

export function CloudSync() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { getBackupPayload, restorePayload } = useFinance();
  const { t, language, numberStyle } = useI18n();
  const cloud = trpc.cloud.get.useQuery(undefined, { enabled: isAuthenticated });
  const save = trpc.cloud.save.useMutation({ onSuccess: () => Alert.alert(t("تم الحفظ السحابي", "Cloud copy saved"), t("أصبحت نسخة بياناتك مرتبطة بحسابك.", "Your data copy is now linked to your account.")), onError: () => Alert.alert(t("تعذر الحفظ", "Save failed"), t("تحقق من الاتصال وحاول مرة أخرى.", "Check your connection and try again.")) });
  const [busy, setBusy] = useState(false);
  const upload = async () => { setBusy(true); try { await save.mutateAsync({ payload: getBackupPayload() }); } finally { setBusy(false); } };
  const download = () => { const payload = cloud.data?.payload; if (!payload) return Alert.alert(t("لا توجد نسخة سحابية", "No cloud copy"), t("احفظ نسخة من هذا الجهاز أولًا.", "Save a copy from this device first.")); Alert.alert(t("استعادة النسخة السحابية؟", "Restore cloud copy?"), t("سيتم استبدال البيانات المحلية بالنسخة المحفوظة في حسابك.", "Local data will be replaced by the copy saved in your account."), [{ text: t("إلغاء", "Cancel"), style: "cancel" }, { text: t("استعادة", "Restore"), style: "destructive", onPress: () => { if (restorePayload(payload)) Alert.alert(t("تمت الاستعادة", "Restored"), t("تم تنزيل بياناتك من الحساب.", "Your data was downloaded from the account.")); else Alert.alert(t("ملف غير صالح", "Invalid copy"), t("تعذر التحقق من النسخة السحابية.", "The cloud copy could not be verified.")); } }]); };
  if (authLoading) return null;
  return <View style={styles.card}><Text style={styles.title}>{t("الحفظ على الجهاز والبريد", "Device and email storage")}</Text>{!isAuthenticated ? <><Text style={styles.text}>{t("بياناتك محفوظة على الجهاز. سجّل الدخول اختياريًا لربط نسخة مشفرة بحسابك والوصول إليها من أجهزتك.", "Your data is stored on this device. Sign in optionally to link an encrypted copy to your account and access it from your devices.")}</Text><Pressable onPress={() => startOAuthLogin()} style={styles.button}><Text style={styles.buttonText}>{t("تسجيل الدخول بالبريد", "Sign in with email")}</Text></Pressable></> : <><Text style={styles.text}>{t("مرتبط بالحساب", "Linked account")}: {user?.email ?? user?.name ?? t("حسابك", "your account")}</Text><View style={styles.row}><Pressable disabled={busy} onPress={upload} style={styles.button}><Text style={styles.buttonText}>{busy ? t("جارٍ الحفظ…", "Saving…") : t("حفظ نسخة سحابية", "Save cloud copy")}</Text></Pressable><Pressable disabled={!cloud.data} onPress={download} style={[styles.button, !cloud.data && styles.disabled]}><Text style={styles.buttonText}>{t("استعادة السحابة", "Restore cloud")}</Text></Pressable></View><Text style={styles.status}>{cloud.isFetching ? t("جارٍ فحص النسخة…", "Checking copy…") : cloud.data ? `${t("آخر نسخة", "Last copy")}: ${formatDate(cloud.data.updatedAt, language, numberStyle)}` : t("لا توجد نسخة محفوظة", "No saved copy")}</Text></>}</View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 17, marginTop: 14 }, title: { color: "#17212B", fontSize: 15, fontWeight: "800", textAlign: "right" }, text: { color: "#667085", textAlign: "right", fontSize: 12, lineHeight: 19, marginTop: 7 }, button: { flex: 1, backgroundColor: "#17365D", borderRadius: 11, padding: 11, alignItems: "center", marginTop: 12 }, buttonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" }, row: { flexDirection: "row-reverse", gap: 8 }, disabled: { backgroundColor: "#98A2B3" }, status: { color: "#0F9B8E", textAlign: "right", fontSize: 11, marginTop: 8 } });
