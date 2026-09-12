import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { FinanceProvider, useFinance } from "@/lib/finance-context";
import {
  AppPreferencesProvider,
  useAppPreferences,
} from "@/lib/app-preferences";
import { AppLock } from "@/components/app-lock";
import { CloudPreferencesSync } from "@/components/cloud-preferences-sync";
import { UpdateChecker } from "@/components/update-checker";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import {
  initManusRuntime,
  subscribeSafeAreaInsets,
} from "@/lib/_core/manus-runtime";

if (Platform.OS !== "web") {
  void SplashScreen.preventAutoHideAsync();
  SplashScreen.setOptions({ duration: 700, fade: true });
}

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

function NativeSplashController() {
  const { hydrated } = useAppPreferences();
  const { loading } = useFinance();

  useEffect(() => {
    if (Platform.OS !== "web" && hydrated && !loading) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [hydrated, loading]);

  return null;
}

function LanguageTransition({ children }: { children: React.ReactNode }) {
  const { language } = useAppPreferences();
  const previousLanguage = useRef(language);
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (previousLanguage.current === language) return;
    previousLanguage.current = language;
    opacity.value = 0.86;
    translateX.value = language === "en" ? -12 : 12;
    const timing = { duration: 280, easing: Easing.out(Easing.cubic) };
    opacity.value = withTiming(1, timing);
    translateX.value = withTiming(0, timing);
  }, [language, opacity, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.languageTransition, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = {
  languageTransition: { flex: 1 } as const,
};

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? {
      insets: initialInsets,
      frame: initialFrame,
    };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {/* Default to hiding native headers so raw route segments don't appear (e.g. "(tabs)", "products/[id]"). */}
          {/* If a screen needs the native header, explicitly enable it and set a human title via Stack.Screen options. */}
          {/* in order for ios apps tab switching to work properly, use presentation: "fullScreenModal" for login page, whenever you decide to use presentation: "modal*/}
          <NativeSplashController />
          <CloudPreferencesSync />
          <UpdateChecker />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="oauth/callback" />
          </Stack>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <AppPreferencesProvider>
        <ThemeProvider>
          <FinanceProvider>
            <AppLock>
              <SafeAreaProvider initialMetrics={providerInitialMetrics}>
                <SafeAreaFrameContext.Provider value={frame}>
                  <SafeAreaInsetsContext.Provider value={insets}>
                    <LanguageTransition>{content}</LanguageTransition>
                  </SafeAreaInsetsContext.Provider>
                </SafeAreaFrameContext.Provider>
              </SafeAreaProvider>
            </AppLock>
          </FinanceProvider>
        </ThemeProvider>
      </AppPreferencesProvider>
    );
  }

  return (
    <AppPreferencesProvider>
      <ThemeProvider>
        <FinanceProvider>
          <AppLock>
            <SafeAreaProvider initialMetrics={providerInitialMetrics}>
              <LanguageTransition>{content}</LanguageTransition>
            </SafeAreaProvider>
          </AppLock>
        </FinanceProvider>
      </ThemeProvider>
    </AppPreferencesProvider>
  );
}
