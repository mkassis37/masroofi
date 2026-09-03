import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";
import { useFinance } from "@/lib/finance-context";

export function CloudSync() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { getBackupPayload, restorePayload } = useFinance();
  const cloud = trpc.cloud.get.useQuery(undefined, { enabled: isAuthenticated });
  const save = trpc.cloud.save.useMutation({ onSuccess: () => Alert.alert("تم الحفظ السحابي", "أصبحت نسخة بياناتك مرتبطة بحسابك."), onError: () => Alert.alert("تعذر الحفظ", "تحقق من الاتصال وحاول مرة أخرى.") });
  const [busy, setBusy] = useState(false);
  const upload = async () => { setBusy(true); try { await save.mutateAsync({ payload: getBackupPayload() }); } finally { setBusy(false); } };
  const download = () => { const payload = cloud.data?.payload; if (!payload) return Alert.alert("لا توجد نسخة سحابية", "احفظ نسخة من هذا الجهاز أولًا."); Alert.alert("استعادة النسخة السحابية؟", "سيتم استبدال البيانات المحلية بالنسخة المحفوظة في حسابك.", [{ text: "إلغاء", style: "cancel" }, { text: "استعادة", style: "destructive", onPress: () => { if (restorePayload(payload)) Alert.alert("تمت الاستعادة", "تم تنزيل بياناتك من الحساب."); else Alert.alert("ملف غير صالح", "تعذر التحقق من النسخة السحابية."); } }]); };
  if (authLoading) return null;
  return <View style={styles.card}><Text style={styles.title}>الحفظ على الجهاز والبريد</Text>{!isAuthenticated ? <><Text style={styles.text}>بياناتك محفوظة على الجهاز. سجّل الدخول اختياريًا لربط نسخة مشفرة بحسابك والوصول إليها من أجهزتك.</Text><Pressable onPress={() => startOAuthLogin()} style={styles.button}><Text style={styles.buttonText}>تسجيل الدخول بالبريد</Text></Pressable></> : <><Text style={styles.text}>مرتبط بالحساب: {user?.email ?? user?.name ?? "حسابك"}</Text><View style={styles.row}><Pressable disabled={busy} onPress={upload} style={styles.button}><Text style={styles.buttonText}>{busy ? "جارٍ الحفظ…" : "حفظ نسخة سحابية"}</Text></Pressable><Pressable disabled={!cloud.data} onPress={download} style={[styles.button, !cloud.data && styles.disabled]}><Text style={styles.buttonText}>استعادة السحابة</Text></Pressable></View><Text style={styles.status}>{cloud.isFetching ? "جارٍ فحص النسخة…" : cloud.data ? `آخر نسخة: ${new Date(cloud.data.updatedAt).toLocaleDateString("ar-JO")}` : "لا توجد نسخة محفوظة"}</Text></>}</View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 17, marginTop: 14 }, title: { color: "#17212B", fontSize: 15, fontWeight: "800", textAlign: "right" }, text: { color: "#667085", textAlign: "right", fontSize: 12, lineHeight: 19, marginTop: 7 }, button: { flex: 1, backgroundColor: "#17365D", borderRadius: 11, padding: 11, alignItems: "center", marginTop: 12 }, buttonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" }, row: { flexDirection: "row-reverse", gap: 8 }, disabled: { backgroundColor: "#98A2B3" }, status: { color: "#0F9B8E", textAlign: "right", fontSize: 11, marginTop: 8 } });
