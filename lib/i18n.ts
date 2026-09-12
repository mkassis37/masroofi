import { useMemo } from "react";
import { useAppPreferences } from "@/lib/app-preferences";

export type I18nValue = string | { ar: string; en: string };

const dictionary: Record<string, string> = {
  "نقدي": "Cash",
  "بنكي": "Bank",
  "مدين · دخل": "Debit · Income",
  "دائن · مصروف": "Credit · Expense",
  "تحويل بين الحسابات": "Transfer between accounts",
  "سبب التحويل": "Transfer reason",
  "المبلغ المحوّل": "Transfer amount",
  "تأكيد التحويل": "Confirm transfer",
  "إضافة حركة": "Add transaction",
  "إضافة حركة جديدة": "Add new transaction",
  "نوع العملية": "Transaction type",
  "الحساب": "Account",
  "من الحساب": "From account",
  "إلى الحساب": "To account",
  "العملة": "Currency",
  "المبلغ": "Amount",
  "تصنيف المصروف": "Expense category",
  "البيان": "Description",
  "تاريخ العملية": "Transaction date",
  "حفظ العملية": "Save transaction",
  "إغلاق": "Close",
  "الرصيد غير كافٍ": "Insufficient balance",
  "المبلغ غير صحيح": "Invalid amount",
  "اكتب مبلغًا أكبر من صفر.": "Enter an amount greater than zero.",
  "أكمل البيان": "Complete the description",
  "اكتب وصفًا مختصرًا للعملية.": "Enter a short description for the transaction.",
  "اختر حسابين مختلفين": "Choose two different accounts",
  "حساب المصدر والوجهة يجب أن يكونا مختلفين.": "The source and destination accounts must be different.",
  "السجل المالي": "Financial ledger",
  "الدفتر": "Ledger",
  "ملخص": "Summary",
  "التقارير": "Reports",
  "الإعدادات": "Settings",
  "ابحث عن البيان أو التاريخ": "Search description or date",
  "البحث عن البيان": "Search description",
  "مسح": "Clear",
  "الكل": "All",
  "مدين": "Debit",
  "دائن": "Credit",
  "تحويل": "Transfer",
  "تصفية حسب العملة": "Filter by currency",
  "استخراج السجل": "Export ledger",
  "لا توجد نتائج": "No results",
  "اكتب جزءًا من البيان للبحث داخل السجل.": "Type part of a description to search the ledger.",
  "تعديل العملية": "Edit transaction",
  "التاريخ": "Date",
  "التصنيف": "Category",
  "حفظ التعديل": "Save changes",
  "حذف العملية؟": "Delete transaction?",
  "لن يمكن التراجع عن هذا الإجراء.": "This action cannot be undone.",
  "إلغاء": "Cancel",
  "حذف": "Delete",
  "تعديل": "Edit",
  "صورة أوضح لأموالك": "A clearer view of your money",
  "هذا الشهر": "This month",
  "هذه السنة": "This year",
  "إنشاء ومشاركة PDF": "Create and share PDF",
  "للشهر": "for the month",
  "للسنة": "for the year",
  "الدخل / مدين": "Income / Debit",
  "المصروف / دائن": "Expense / Credit",
  "توزيع المصروفات": "Expense distribution",
  "مصروف نقدي": "Cash expenses",
  "مصروف بنكي": "Bank expenses",
  "نسبة كل تصنيف": "Category share",
  "لا توجد مصروفات مصنفة في هذه الفترة.": "No categorized expenses in this period.",
  "صافي الفترة": "Period net",
  "المدين ناقص الدائن، دون احتساب التحويلات بين الحسابات.": "Debit minus credit, excluding transfers between accounts.",
  "دفتر مالي شخصي": "Personal finance ledger",
  "ملخصك اليومي": "Your daily summary",
  "تذكير النسخة الاحتياطية": "Backup reminder",
  "احفظ نسخة يدوية من سجلاتك حتى لا تضيع بياناتك.": "Save a manual copy of your records to prevent data loss.",
  "إنشاء نسخة الآن": "Create backup now",
  "تذكيري لاحقًا": "Remind me later",
  "الرصيد الإجمالي": "Total balance",
  "النقد + البنك": "Cash + bank",
  "النقد المتوفر": "Available cash",
  "في البنك": "In bank",
  "أرصدة العملات": "Currency balances",
  "مدين أو دائن · نقدي أو بنكي": "Debit or credit · cash or bank",
  "اختر المصدر والوجهة وتابع الرصيد المتبقي": "Choose source and destination and track the remaining balance",
  "آخر العمليات": "Recent transactions",
  "عملية": "transactions",
  "دفتر": "Ledger",
  "لا توجد عمليات بعد": "No transactions yet",
  "ابدأ بتسجيل أول دخل أو مصروف لتظهر الأرصدة هنا.": "Add your first income or expense to see balances here.",
  "أكمل البيان والتاريخ بصيغة YYYY-MM-DD.": "Complete the description and date in YYYY-MM-DD format.",
};

export function translate(ar: string, language: "ar" | "en", en?: string) {
  if (language === "ar") return ar;
  return en ?? dictionary[ar] ?? ar;
}

export function localizedCurrencyName(code: string, arabicName: string, language: "ar" | "en") {
  if (language === "ar") return arabicName;
  try {
    const value = new Intl.DisplayNames(["en"], { type: "currency" }).of(code);
    return value || code;
  } catch {
    return code;
  }
}

export function useI18n() {
  const { language, numberStyle } = useAppPreferences();
  return useMemo(() => ({
    language,
    numberStyle,
    isEn: language === "en",
    direction: language === "en" ? "ltr" as const : "rtl" as const,
    textAlign: language === "en" ? "left" as const : "right" as const,
    t: (ar: string, en?: string) => translate(ar, language, en),
    currencyName: (code: string, arabicName: string) => localizedCurrencyName(code, arabicName, language),
  }), [language, numberStyle]);
}
