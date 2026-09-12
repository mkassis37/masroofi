import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/lib/i18n";

export default function TabLayout() {
  const colors = useColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.tint,
      headerShown: false,
      tabBarButton: HapticTab,
      tabBarStyle: { paddingTop: 8, paddingBottom: bottomPadding, height: 56 + bottomPadding, backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 0.5 },
      tabBarLabelStyle: { fontFamily: "System", fontSize: 11 },
    }}>
      <Tabs.Screen name="index" options={{ title: t("ملخص"), tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} /> }} />
      <Tabs.Screen name="entries" options={{ title: t("الدفتر"), tabBarIcon: ({ color }) => <IconSymbol size={24} name="receipt.fill" color={color} /> }} />
      <Tabs.Screen name="reports" options={{ title: t("التقارير"), tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: t("الإعدادات"), tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} /> }} />
    </Tabs>
  );
}
