import { useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { useAppPreferences } from "@/lib/app-preferences";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { compareCloudPreferences } from "@/lib/cloud-preferences";

export function CloudPreferencesSync() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { language, numberStyle, updatedAt, hydrated, applySyncedPreferences } = useAppPreferences();
  const { t } = useI18n();
  const remote = trpc.cloud.getPreferences.useQuery(undefined, {
    enabled: isAuthenticated && hydrated,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const { data: remoteData, isFetched: remoteIsFetched, refetch: refetchRemote } = remote;
  const { mutate: savePreferences } = trpc.cloud.savePreferences.useMutation();
  const initialSyncResolved = useRef(false);
  const promptKey = useRef<string | null>(null);
  const lastUploaded = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      initialSyncResolved.current = false;
      promptKey.current = null;
      lastUploaded.current = null;
    }
  }, [isAuthenticated]);

  const saveSnapshot = useCallback((nextUpdatedAt: number, nextLanguage = language, nextNumberStyle = numberStyle) => {
    if (lastUploaded.current === nextUpdatedAt) return;
    lastUploaded.current = nextUpdatedAt;
    savePreferences({ language: nextLanguage, numberStyle: nextNumberStyle, updatedAt: nextUpdatedAt, expectedUpdatedAt: remoteData?.updatedAt ?? 0 }, { onSuccess: (result) => { if (result.conflict) { initialSyncResolved.current = false; promptKey.current = null; refetchRemote().catch(() => undefined); } } });
  }, [language, numberStyle, remoteData?.updatedAt, refetchRemote, savePreferences]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !hydrated || !remoteIsFetched || initialSyncResolved.current) return;
    const cloudPreferences = remoteData;
    if (!cloudPreferences) {
      initialSyncResolved.current = true;
      if (updatedAt > 0) saveSnapshot(updatedAt);
      return;
    }

    const comparison = compareCloudPreferences({ language, numberStyle, updatedAt }, cloudPreferences);
    if (comparison === "same") {
      initialSyncResolved.current = true;
      lastUploaded.current = updatedAt;
      return;
    }

    const key = `${cloudPreferences.updatedAt}:${updatedAt}:${cloudPreferences.language}:${cloudPreferences.numberStyle}`;
    if (promptKey.current === key) return;
    promptKey.current = key;
    const cloudIsNewer = comparison === "cloud-newer";
    const useCloud = () => {
      initialSyncResolved.current = true;
      lastUploaded.current = cloudPreferences.updatedAt;
      applySyncedPreferences(cloudPreferences.language, cloudPreferences.numberStyle, cloudPreferences.updatedAt);
    };
    const keepLocal = () => {
      const nextUpdatedAt = Math.max(Date.now(), cloudPreferences.updatedAt + 1);
      initialSyncResolved.current = true;
      applySyncedPreferences(language, numberStyle, nextUpdatedAt);
      saveSnapshot(nextUpdatedAt);
    };

    Alert.alert(
      cloudIsNewer ? t("إعدادات سحابية أحدث", "Newer cloud settings") : t("إعدادات الجهاز أحدث", "Newer device settings"),
      cloudIsNewer
        ? t("توجد لغة وشكل أرقام أحدث محفوظان في حسابك. هل تريد استخدامهما على هذا الجهاز؟", "Newer language and number settings are saved in your account. Use them on this device?")
        : t("توجد إعدادات أحدث على هذا الجهاز. هل تريد تحديث حسابك بها؟", "Newer settings are saved on this device. Update your account with them?"),
      [
        { text: t("استخدام السحابة", "Use cloud"), onPress: cloudIsNewer ? useCloud : keepLocal },
        { text: t("الإبقاء على الجهاز", "Keep device"), style: "cancel", onPress: cloudIsNewer ? keepLocal : useCloud },
      ],
    );
  }, [applySyncedPreferences, authLoading, hydrated, isAuthenticated, language, numberStyle, remoteData, remoteIsFetched, saveSnapshot, t, updatedAt]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !hydrated || !initialSyncResolved.current || updatedAt <= 0) return;
    saveSnapshot(updatedAt);
  }, [authLoading, hydrated, isAuthenticated, language, numberStyle, saveSnapshot, updatedAt]);

  return null;
}
