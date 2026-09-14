import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { getLockEnabled, setLockEnabled } from "@/components/app-lock";
import { formatMoney, useFinance } from "@/lib/finance-context";
import { CURRENCIES } from "@/lib/currencies";
import {
  useAppPreferences,
  type BrightnessMode,
  type NumberStyle,
} from "@/lib/app-preferences";
import { useThemeContext } from "@/lib/theme-provider";
import { localizedCurrencyName } from "@/lib/i18n";
import { formatDigits } from "@/lib/number-format";
import { CloudSync } from "@/components/cloud-sync";
import { OtaUpdatePanel } from "@/components/ota-update-panel";

type Panel =
  | "accounts"
  | "appearance"
  | "backup"
  | "rollover"
  | "about"
  | "updates"
  | "google"
  | "currency"
  | null;

export default function SettingsScreen() {
  const {
    accounts,
    bankAccounts,
    accountBalances,
    openingCash,
    openingBank,
    setOpeningBalances,
    addBankAccount,
    renameBankAccount,
    deleteBankAccount,
    cashBalance,
    bankBalance,
    currency,
    setCurrency,
    createBackup,
    restoreBackup,
    categories,
    addCategory,
    deleteCategory,
    yearlyRollovers,
    rolloverYear,
  } = useFinance();
  const {
    language,
    fontScale,
    brightness,
    numberStyle,
    setLanguage,
    setFontScale,
    setBrightness,
    setNumberStyle,
    markBackupComplete,
    autoUpdateChecks,
    setAutoUpdateChecks,
  } = useAppPreferences();
  const { setColorScheme } = useThemeContext();
  const [panel, setPanel] = useState<Panel>(null);
  const [cash, setCash] = useState(String(openingCash));
  const [bank, setBank] = useState(String(openingBank));
  const [bankName, setBankName] = useState("");
  const [bankOpening, setBankOpening] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [currencyQuery, setCurrencyQuery] = useState("");
  const [lockEnabled, setLockEnabledState] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("#0F9B8E");
  const [categoryIcon, setCategoryIcon] = useState("●");
  const [rolloverYearValue, setRolloverYearValue] = useState(
    String(new Date().getFullYear()),
  );
  const isEn = language === "en";
  const t = (ar: string, en: string) => (isEn ? en : ar);
  const scale = fontScale;
  useEffect(() => {
    getLockEnabled()
      .then(setLockEnabledState)
      .catch(() => undefined);
  }, []);
  const filteredCurrencies = useMemo(
    () =>
      CURRENCIES.filter((item) =>
        `${item.name} ${item.code} ${item.symbol}`
          .toLowerCase()
          .includes(currencyQuery.toLowerCase()),
      ),
    [currencyQuery],
  );
  const saveBalances = () => {
    setOpeningBalances(Number(cash) || 0, Number(bank) || 0);
    Alert.alert(
      t("تم الحفظ", "Saved"),
      t("تم تحديث الأرصدة الافتتاحية.", "Opening balances updated."),
    );
  };
  const addBank = () => {
    const amount = Number(bankOpening.replace(",", ".")) || 0;
    if (!bankName.trim())
      return Alert.alert(t("اكتب اسم البنك", "Enter bank name"));
    addBankAccount(bankName, amount);
    setBankName("");
    setBankOpening("");
    Alert.alert(t("تمت الإضافة", "Added"), bankName.trim());
  };
  const rename = (id: string) => {
    if (!editingName.trim()) return;
    renameBankAccount(id, editingName);
    setEditingId(null);
  };
  const removeBank = (id: string, name: string) =>
    Alert.alert(
      t("حذف الحساب؟", "Delete account?"),
      t(
        `سيتم حذف حساب ${name} فقط إذا لم توجد عمليات مرتبطة به.`,
        `Account ${name} can only be deleted when unused.`,
      ),
      [
        { text: t("إلغاء", "Cancel"), style: "cancel" },
        {
          text: t("حذف", "Delete"),
          style: "destructive",
          onPress: () => {
            if (!deleteBankAccount(id))
              Alert.alert(
                t("تعذر الحذف", "Cannot delete"),
                t(
                  "الحساب أساسي أو توجد عمليات مرتبطة به.",
                  "The account is protected or has linked entries.",
                ),
              );
          },
        },
      ],
    );
  const saveCategory = () => {
    if (!categoryName.trim())
      return Alert.alert(t("اكتب اسم التصنيف", "Enter category name"));
    addCategory(categoryName, categoryColor, categoryIcon);
    setCategoryName("");
  };
  const doBackup = async () => {
    await createBackup();
    markBackupComplete();
  };
  const doRollover = () => {
    const year = Number(rolloverYearValue);
    if (!Number.isInteger(year) || year < 2000)
      return Alert.alert(t("سنة غير صحيحة", "Invalid year"));
    rolloverYear(year);
    Alert.alert(
      t("تم ترحيل الرصيد", "Balance carried forward"),
      t(
        `تم حفظ رصيد ${year}: ${formatMoney(cashBalance + bankBalance, currency.symbol, language, numberStyle)}.`,
        `The ${year} balance was saved.`,
      ),
    );
  };
  const modalTitle =
    panel === "accounts"
      ? t("الحسابات والبنوك", "Accounts & banks")
      : panel === "appearance"
        ? t("المظهر واللغة", "Appearance & language")
        : panel === "backup"
          ? t("النسخ والحماية", "Backup & security")
          : panel === "rollover"
            ? t("ترحيل سنة جديدة", "New year rollover")
            : panel === "google"
              ? t("ربط حساب Google", "Connect Google")
              : panel === "currency"
                ? t("اختيار العملة", "Choose currency")
                : panel === "updates"
                  ? t("نسخة التطبيق والتحديثات", "App version & updates")
                  : t("عن التطبيق", "About");
  return (
    <ScreenContainer className="px-5 pt-5">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text style={[styles.eyebrow, { fontSize: 14 * scale }]}>
          {t("تحكم بسيط وواضح", "Simple controls")}
        </Text>
        <Text style={[styles.title, { fontSize: 30 * scale }]}>
          {t("الإعدادات", "Settings")}
        </Text>
        <View style={styles.help}>
          <Text style={[styles.helpTitle, { fontSize: 15 * scale }]}>
            {t("كل خيار في نافذته الخاصة", "Every option has its own window")}
          </Text>
          <Text style={[styles.helpText, { fontSize: 12 * scale }]}>
            {t(
              "اضغط على أي بطاقة لفتح الإعدادات المتعلقة بها دون ازدحام الشاشة.",
              "Tap a card to open its focused settings window.",
            )}
          </Text>
        </View>
        <View style={styles.grid}>
          <SettingTile
            title={t("الحسابات والبنوك", "Accounts & banks")}
            subtitle={t(
              "إضافة البنوك وتعديل الأرصدة",
              "Add banks and edit balances",
            )}
            icon="▣"
            onPress={() => setPanel("accounts")}
            scale={scale}
          />
          <SettingTile
            title={t("المظهر واللغة", "Appearance & language")}
            subtitle={t(
              "حجم الخط والإضاءة والعربية/English",
              "Font, brightness and language",
            )}
            icon="◐"
            onPress={() => setPanel("appearance")}
            scale={scale}
          />
          <SettingTile
            title={t("العملة", "Currency")}
            subtitle={`${currency.name} · ${currency.code}`}
            icon="د"
            onPress={() => setPanel("currency")}
            scale={scale}
          />
          <SettingTile
            title={t("النسخ والحماية", "Backup & security")}
            subtitle={t(
              "نسخة يدوية وقفل التطبيق",
              "Manual backup and app lock",
            )}
            icon="✓"
            onPress={() => setPanel("backup")}
            scale={scale}
          />
          <SettingTile
            title={t("ترحيل السنة", "Year rollover")}
            subtitle={t(
              "حفظ بيان الرصيد المدور",
              "Save carried-forward balance",
            )}
            icon="↻"
            onPress={() => setPanel("rollover")}
            scale={scale}
          />
          <SettingTile
            title={t("ربط Google", "Connect Google")}
            subtitle={t("ربط اختياري للحساب", "Optional account link")}
            icon="G"
            onPress={() => setPanel("google")}
            scale={scale}
          />
          <SettingTile
            title={t("تصنيفات المصروفات", "Expense categories")}
            subtitle={t("ألوان وأيقونات مخصصة", "Custom colors and icons")}
            icon="✦"
            onPress={() => setPanel("accounts")}
            scale={scale}
          />
          <SettingTile
            title={t("نسخة التطبيق والتحديثات", "App version & updates")}
            subtitle={t(
              "نسخة التطبيق وفحص OTA اليدوي",
              "App version and manual OTA check",
            )}
            icon="↻"
            onPress={() => setPanel("updates")}
            scale={scale}
          />
          <SettingTile
            title={t("عن مصروفي", "About Masroofi")}
            subtitle={t("الإصدار واسم المصمم", "Version and designer")}
            icon="i"
            onPress={() => setPanel("about")}
            scale={scale}
          />
        </View>
      </ScrollView>
      <Modal
        visible={panel !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPanel(null)}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: 22 * scale }]}>
                {modalTitle}
              </Text>
              <Pressable onPress={() => setPanel(null)}>
                <Text style={styles.close}>{t("إغلاق", "Close")}</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {panel === "accounts" && (
                <AccountsPanel
                  accounts={accounts}
                  bankAccounts={bankAccounts}
                  accountBalances={accountBalances}
                  cash={cash}
                  bank={bank}
                  setCash={setCash}
                  setBank={setBank}
                  saveBalances={saveBalances}
                  bankName={bankName}
                  setBankName={setBankName}
                  bankOpening={bankOpening}
                  setBankOpening={setBankOpening}
                  addBank={addBank}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  editingName={editingName}
                  setEditingName={setEditingName}
                  rename={rename}
                  removeBank={removeBank}
                  categories={categories}
                  categoryName={categoryName}
                  setCategoryName={setCategoryName}
                  categoryColor={categoryColor}
                  setCategoryColor={setCategoryColor}
                  categoryIcon={categoryIcon}
                  setCategoryIcon={setCategoryIcon}
                  saveCategory={saveCategory}
                  deleteCategory={deleteCategory}
                  currency={currency}
                  language={language}
                  numberStyle={numberStyle}
                  t={t}
                  scale={scale}
                />
              )}{" "}
              {panel === "appearance" && (
                <AppearancePanel
                  language={language}
                  setLanguage={setLanguage}
                  numberStyle={numberStyle}
                  setNumberStyle={setNumberStyle}
                  fontScale={fontScale}
                  setFontScale={setFontScale}
                  brightness={brightness}
                  setBrightness={(mode: BrightnessMode) => {
                    setBrightness(mode);
                    setColorScheme(mode === "dark" ? "dark" : "light");
                  }}
                  t={t}
                  scale={scale}
                />
              )}{" "}
              {panel === "currency" && (
                <CurrencyPanel
                  isEn={isEn}
                  items={filteredCurrencies}
                  onSelect={(code: string) => {
                    setCurrency(code);
                    setPanel(null);
                    setCurrencyQuery("");
                  }}
                  query={currencyQuery}
                  setQuery={setCurrencyQuery}
                  t={t}
                  scale={scale}
                />
              )}{" "}
              {panel === "backup" && (
                <BackupPanel
                  lockEnabled={lockEnabled}
                  setLock={async (next: boolean) => {
                    await setLockEnabled(next);
                    setLockEnabledState(next);
                  }}
                  onBackup={doBackup}
                  onRestore={restoreBackup}
                  t={t}
                  scale={scale}
                />
              )}{" "}
              {panel === "rollover" && (
                <View>
                  <Text style={styles.panelText}>
                    {t(
                      "احفظ رصيد نهاية السنة كبيان مدور قبل بدء السنة الجديدة.",
                      "Save the year-end balance before starting a new year.",
                    )}
                  </Text>
                  <TextInput
                    value={rolloverYearValue}
                    onChangeText={setRolloverYearValue}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                  <Text style={styles.balancePreview}>
                    {formatMoney(
                      cashBalance + bankBalance,
                      currency.symbol,
                      language,
                      numberStyle,
                    )}
                  </Text>
                  <Pressable onPress={doRollover} style={styles.primary}>
                    <Text style={styles.primaryText}>
                      {t("حفظ الرصيد المدور", "Save carried-forward balance")}
                    </Text>
                  </Pressable>
                  {yearlyRollovers.map((item) => (
                    <Text key={item.id} style={styles.history}>
                      {formatDigits(item.year, numberStyle)}:{" "}
                      {formatMoney(
                        item.totalBalance,
                        currency.symbol,
                        language,
                        numberStyle,
                      )}
                    </Text>
                  ))}
                </View>
              )}{" "}
              {panel === "google" && (
                <View>
                  <Text style={styles.panelText}>
                    {t(
                      "يمكنك ربط حسابك ومزامنة إعدادات اللغة وشكل الأرقام مع إبقاء النسخ اليدوي متاحًا.",
                      "Connect your account and sync language and number settings while keeping manual backups available.",
                    )}
                  </Text>
                  <CloudSync />
                </View>
              )}{" "}
              {panel === "updates" && (
                <OtaUpdatePanel
                  t={t}
                  scale={scale}
                  autoUpdateChecks={autoUpdateChecks}
                  setAutoUpdateChecks={setAutoUpdateChecks}
                />
              )}{" "}
              {panel === "about" && (
                <View>
                  <Text style={styles.aboutName}>مصروفي</Text>
                  <Text style={styles.panelText}>
                    {t(
                      "دفتر مالي يومي لإدارة النقد والبنوك والمصروفات.",
                      "A daily ledger for cash, banks and expenses.",
                    )}
                  </Text>
                  <Text style={styles.history}>
                    {t("رقم الإصدار: 1.0.0", "Version: 1.0.0")}
                  </Text>
                  <Text style={styles.history}>
                    {t("المصمم: فريق مصروفي", "Designer: Masroofi Team")}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

function SettingTile({
  title,
  subtitle,
  icon,
  onPress,
  scale,
}: {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
  scale: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.72 }]}
    >
      <View style={styles.tileIcon}>
        <Text style={styles.tileIconText}>{icon}</Text>
      </View>
      <View style={styles.tileCopy}>
        <Text style={[styles.tileTitle, { fontSize: 15 * scale }]}>
          {title}
        </Text>
        <Text style={[styles.tileSubtitle, { fontSize: 11 * scale }]}>
          {subtitle}
        </Text>
      </View>
      <Text style={styles.chevron}>‹</Text>
    </Pressable>
  );
}

function AccountsPanel(props: any) {
  const {
    accounts,
    bankAccounts,
    accountBalances,
    cash,
    bank,
    setCash,
    setBank,
    saveBalances,
    bankName,
    setBankName,
    bankOpening,
    setBankOpening,
    addBank,
    editingId,
    setEditingId,
    editingName,
    setEditingName,
    rename,
    removeBank,
    categories,
    categoryName,
    setCategoryName,
    categoryColor,
    setCategoryColor,
    categoryIcon,
    setCategoryIcon,
    saveCategory,
    deleteCategory,
    currency,
    language,
    numberStyle,
    t,
    scale,
  } = props;
  return (
    <View>
      <Text style={styles.panelSection}>
        {t("الأرصدة الافتتاحية", "Opening balances")}
      </Text>
      <TextInput
        value={cash}
        onChangeText={setCash}
        placeholder={t("رصيد النقد", "Cash balance")}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      <TextInput
        value={bank}
        onChangeText={setBank}
        placeholder={t("رصيد البنك الأساسي", "Main bank balance")}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      <Pressable onPress={saveBalances} style={styles.primary}>
        <Text style={styles.primaryText}>
          {t("حفظ الأرصدة", "Save balances")}
        </Text>
      </Pressable>
      <Text style={styles.panelSection}>{t("إضافة بنك", "Add bank")}</Text>
      <TextInput
        value={bankName}
        onChangeText={setBankName}
        placeholder={t("اسم البنك", "Bank name")}
        style={styles.input}
      />
      <TextInput
        value={bankOpening}
        onChangeText={setBankOpening}
        placeholder={t("الرصيد الافتتاحي", "Opening balance")}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      <Pressable onPress={addBank} style={styles.primary}>
        <Text style={styles.primaryText}>
          {t("إضافة الحساب", "Add account")}
        </Text>
      </Pressable>
      <Text style={styles.panelSection}>
        {t("الحسابات البنكية", "Bank accounts")}
      </Text>
      {bankAccounts.map((account: any) => (
        <View key={account.id} style={styles.rowLine}>
          {editingId === account.id ? (
            <>
              <TextInput
                value={editingName}
                onChangeText={setEditingName}
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
              />
              <Pressable onPress={() => rename(account.id)}>
                <Text style={styles.action}>{t("حفظ", "Save")}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.rowName}>
                {account.name} ·{" "}
                {formatMoney(
                  accountBalances[account.id] ?? 0,
                  currency.symbol,
                  language,
                  numberStyle,
                )}
              </Text>
              <Pressable
                onPress={() => {
                  setEditingId(account.id);
                  setEditingName(account.name);
                }}
              >
                <Text style={styles.action}>{t("تعديل", "Edit")}</Text>
              </Pressable>
              <Pressable onPress={() => removeBank(account.id, account.name)}>
                <Text style={styles.delete}>{t("حذف", "Delete")}</Text>
              </Pressable>
            </>
          )}
        </View>
      ))}
      <Text style={styles.panelSection}>
        {t("تصنيفات المصروفات", "Expense categories")}
      </Text>
      <TextInput
        value={categoryName}
        onChangeText={setCategoryName}
        placeholder={t("اسم التصنيف", "Category name")}
        style={styles.input}
      />
      <View style={styles.choices}>
        {["#0F9B8E", "#3B82F6", "#C88A16", "#8B5CF6", "#D95D55"].map(
          (color) => (
            <Pressable
              key={color}
              onPress={() => setCategoryColor(color)}
              style={[
                styles.dot,
                { backgroundColor: color },
                categoryColor === color && styles.dotActive,
              ]}
            />
          ),
        )}
      </View>
      <View style={styles.choices}>
        {["●", "◆", "▣", "✦", "★", "◉", "▲"].map((icon) => (
          <Pressable
            key={icon}
            onPress={() => setCategoryIcon(icon)}
            style={[
              styles.iconChoice,
              categoryIcon === icon && styles.iconActive,
            ]}
          >
            <Text>{icon}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={saveCategory} style={styles.primary}>
        <Text style={styles.primaryText}>
          {t("إضافة التصنيف", "Add category")}
        </Text>
      </Pressable>
      {categories.map((category: any) => (
        <View key={category.id} style={styles.rowLine}>
          <Text style={styles.rowName}>
            {category.icon} {category.name}
          </Text>
          {![
            "food",
            "transport",
            "bills",
            "shopping",
            "health",
            "other",
          ].includes(category.id) && (
            <Pressable onPress={() => deleteCategory(category.id)}>
              <Text style={styles.delete}>{t("حذف", "Delete")}</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}
function AppearancePanel({
  language,
  setLanguage,
  numberStyle,
  setNumberStyle,
  fontScale,
  setFontScale,
  brightness,
  setBrightness,
  t,
  scale,
}: any) {
  return (
    <View>
      <Text style={styles.panelSection}>{t("اللغة", "Language")}</Text>
      <View style={styles.choices}>
        <Pressable
          onPress={() => setLanguage("ar")}
          style={[
            styles.choiceButton,
            language === "ar" && styles.choiceActive,
          ]}
        >
          <Text>العربية</Text>
        </Pressable>
        <Pressable
          onPress={() => setLanguage("en")}
          style={[
            styles.choiceButton,
            language === "en" && styles.choiceActive,
          ]}
        >
          <Text>English</Text>
        </Pressable>
      </View>
      <Text style={styles.panelSection}>
        {t("شكل الأرقام", "Number style")}
      </Text>
      <View style={styles.choices}>
        <Pressable
          onPress={() => setNumberStyle("arabic-indic")}
          style={[
            styles.choiceButton,
            numberStyle === "arabic-indic" && styles.choiceActive,
          ]}
        >
          <Text>{t("عربية هندية ١٢٣", "Arabic-Indic ١٢٣")}</Text>
        </Pressable>
        <Pressable
          onPress={() => setNumberStyle("western")}
          style={[
            styles.choiceButton,
            numberStyle === "western" && styles.choiceActive,
          ]}
        >
          <Text>{t("غربية 123", "Western 123")}</Text>
        </Pressable>
      </View>
      <Text style={styles.panelSection}>{t("حجم الخط", "Font size")}</Text>
      <View style={styles.choices}>
        {[0.9, 1, 1.15].map((value) => (
          <Pressable
            key={value}
            onPress={() => setFontScale(value)}
            style={[
              styles.choiceButton,
              fontScale === value && styles.choiceActive,
            ]}
          >
            <Text style={{ fontSize: 14 * value }}>
              {value === 0.9
                ? t("صغير", "Small")
                : value === 1
                  ? t("قياسي", "Standard")
                  : t("كبير", "Large")}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.panelSection}>{t("الإضاءة", "Brightness")}</Text>
      <View style={styles.choices}>
        {(
          [
            ["system", "تلقائي"],
            ["light", "فاتح"],
            ["dark", "داكن"],
          ] as [BrightnessMode, string][]
        ).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setBrightness(value)}
            style={[
              styles.choiceButton,
              brightness === value && styles.choiceActive,
            ]}
          >
            <Text>
              {t(
                label,
                value === "system"
                  ? "System"
                  : value === "light"
                    ? "Light"
                    : "Dark",
              )}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function CurrencyPanel({ items, onSelect, query, setQuery, t, isEn }: any) {
  return (
    <View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t("ابحث بالاسم أو الرمز", "Search currency")}
        style={styles.input}
      />
      {items.map((item: any) => (
        <Pressable
          key={item.code}
          onPress={() => onSelect(item.code)}
          style={styles.currencyRow}
        >
          <Text style={styles.rowName}>
            {localizedCurrencyName(item.code, item.name, isEn ? "en" : "ar")}
          </Text>
          <Text style={styles.action}>
            {item.code} {item.symbol}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
function BackupPanel({ lockEnabled, setLock, onBackup, onRestore, t }: any) {
  return (
    <View>
      <View style={styles.switchRow}>
        <Text style={styles.rowName}>
          {t("قفل التطبيق بالبصمة أو الجهاز", "Device lock")}
        </Text>
        <Switch value={lockEnabled} onValueChange={setLock} />
      </View>
      <Pressable onPress={onBackup} style={styles.primary}>
        <Text style={styles.primaryText}>
          {t("إنشاء ومشاركة نسخة يدوية", "Create manual backup")}
        </Text>
      </Pressable>
      <Pressable
        onPress={onRestore}
        style={[styles.primary, { backgroundColor: "#0F9B8E" }]}
      >
        <Text style={styles.primaryText}>
          {t("استعادة نسخة JSON", "Restore JSON backup")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: "#0F9B8E", fontWeight: "700", textAlign: "right" },
  title: {
    color: "#17212B",
    fontWeight: "800",
    textAlign: "right",
    marginTop: 4,
    marginBottom: 17,
  },
  help: {
    backgroundColor: "#E1F5F1",
    padding: 17,
    borderRadius: 18,
    alignItems: "flex-end",
    marginBottom: 16,
  },
  helpTitle: { color: "#0F6E66", fontWeight: "800" },
  helpText: {
    color: "#347D76",
    textAlign: "right",
    lineHeight: 20,
    marginTop: 5,
  },
  grid: { gap: 10 },
  tile: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E1F5F1",
    alignItems: "center",
    justifyContent: "center",
  },
  tileIconText: { color: "#0F9B8E", fontWeight: "900", fontSize: 19 },
  tileCopy: { flex: 1 },
  tileTitle: { color: "#17212B", fontWeight: "800", textAlign: "right" },
  tileSubtitle: { color: "#667085", textAlign: "right", marginTop: 3 },
  chevron: { color: "#98A2B3", fontSize: 24 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,.38)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#F6F8FB",
    maxHeight: "92%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: { color: "#17212B", fontWeight: "800" },
  close: { color: "#0F9B8E", fontWeight: "800" },
  panelSection: {
    color: "#17212B",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE5EE",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 9,
    textAlign: "right",
    color: "#17212B",
  },
  primary: {
    backgroundColor: "#17365D",
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    marginBottom: 9,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  rowLine: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 11,
    borderRadius: 11,
    marginBottom: 6,
  },
  rowName: { flex: 1, color: "#17212B", fontWeight: "700", textAlign: "right" },
  action: { color: "#0F9B8E", fontWeight: "800" },
  delete: { color: "#D95D55", fontWeight: "800" },
  choices: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  choiceButton: {
    backgroundColor: "#E8EDF3",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  choiceActive: {
    backgroundColor: "#D7F1ED",
    borderWidth: 1,
    borderColor: "#0F9B8E",
  },
  dot: { width: 29, height: 29, borderRadius: 15 },
  dotActive: { borderWidth: 3, borderColor: "#17212B" },
  iconChoice: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: "#E8EDF3",
    alignItems: "center",
    justifyContent: "center",
  },
  iconActive: {
    borderWidth: 1,
    borderColor: "#0F9B8E",
    backgroundColor: "#D7F1ED",
  },
  currencyRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 11,
    marginBottom: 6,
  },
  panelText: {
    color: "#667085",
    textAlign: "right",
    lineHeight: 22,
    marginBottom: 15,
  },
  balancePreview: {
    color: "#0F9B8E",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "right",
    marginVertical: 14,
  },
  history: { color: "#667085", textAlign: "right", marginTop: 8 },
  switchRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  aboutName: {
    color: "#17365D",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 10,
  },
});
