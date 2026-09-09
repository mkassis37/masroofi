import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Alert, Platform } from "react-native";
import type { FinancialEntry } from "./finance-context";
import { findCurrency } from "./currencies";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function money(value: number, symbol: string) {
  return `${value.toLocaleString("ar-SA", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${symbol}`;
}

function typeName(type: FinancialEntry["type"]) {
  return type === "debit" ? "مدين" : type === "credit" ? "دائن" : "تحويل";
}

function accountName(account: FinancialEntry["account"]) {
  return account === "cash" ? "نقدي" : "بنكي";
}

function reportHtml(title: string, subtitle: string, entries: FinancialEntry[], currencySymbol: string) {
  const income = entries.filter((e) => e.type === "debit").reduce((sum, e) => sum + e.amount, 0);
  const expense = entries.filter((e) => e.type === "credit").reduce((sum, e) => sum + e.amount, 0);
  const transfer = entries.filter((e) => e.type === "transfer").reduce((sum, e) => sum + e.amount, 0);
  const currencyTotals = entries.reduce<Record<string, number>>((totals, entry) => { const code = entry.currencyCode ?? "JOD"; totals[code] = (totals[code] ?? 0) + (entry.type === "debit" ? entry.amount : entry.type === "credit" ? -entry.amount : 0); return totals; }, {});
  const currencySummary = Object.entries(currencyTotals).map(([code, total]) => `<div class="currency-box"><span>${findCurrency(code).name} (${code})</span><strong>${money(total, findCurrency(code).symbol)}</strong></div>`).join("");
  const rows = entries.length ? entries.map((entry) => `<tr><td>${escapeHtml(entry.date)}</td><td>${typeName(entry.type)}</td><td>${accountName(entry.account)}</td><td>${escapeHtml(entry.note)}</td><td>${money(entry.amount, currencySymbol)}</td></tr>`).join("") : `<tr><td colspan="5" class="empty">لا توجد عمليات ضمن الفترة المحددة</td></tr>`;
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>
    @page { margin: 28px; size: A4 portrait; } body { font-family: Arial, sans-serif; color: #17212B; direction: rtl; } .brand { color: #0F9B8E; font-size: 14px; font-weight: bold; } h1 { color: #17365D; margin: 5px 0; font-size: 25px; } .subtitle { color: #667085; margin-bottom: 22px; } .summary { display: flex; gap: 10px; margin-bottom: 20px; } .box { flex: 1; background: #F2F7FA; border-radius: 10px; padding: 13px; text-align: right; } .box strong { display: block; font-size: 17px; margin-top: 6px; } .income strong { color: #0F9B8E; } .expense strong { color: #D95D55; } .transfer strong { color: #17365D; } table { width: 100%; border-collapse: collapse; font-size: 11px; } th { background: #17365D; color: white; padding: 9px; } td { border-bottom: 1px solid #D8E2EC; padding: 9px 6px; } .empty { text-align: center; color: #667085; padding: 30px; } footer { margin-top: 24px; color: #98A2B3; font-size: 10px; text-align: center; }
  .currency-summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 0 0 20px; } .currency-box { background: #FFFFFF; border: 1px solid #D8E2EC; border-radius: 9px; padding: 9px; } .currency-box span { color: #667085; display: block; font-size: 10px; } .currency-box strong { color: #17365D; display: block; font-size: 14px; margin-top: 4px; }
  </style></head><body><div class="brand">مصروفي · دفتر مالي شخصي</div><h1>${escapeHtml(title)}</h1><div class="subtitle">${escapeHtml(subtitle)}</div><div class="summary"><div class="box income">إجمالي المدين<strong>${money(income, currencySymbol)}</strong></div><div class="box expense">إجمالي الدائن<strong>${money(expense, currencySymbol)}</strong></div><div class="box transfer">إجمالي التحويلات<strong>${money(transfer, currencySymbol)}</strong></div></div><div class="currency-summary">${currencySummary}</div><table><thead><tr><th>التاريخ</th><th>النوع</th><th>الحساب</th><th>البيان</th><th>المبلغ</th></tr></thead><tbody>${rows}</tbody></table><footer>تم إنشاء التقرير من تطبيق مصروفي · ${new Date().toLocaleDateString("ar-SA")}</footer></body></html>`;
}

export async function generateAndSharePdf(title: string, subtitle: string, entries: FinancialEntry[], currencySymbol = "د.أ") {
  if (!entries.length) {
    Alert.alert("لا توجد بيانات", "لا توجد عمليات ضمن النطاق الذي اخترته.");
    return;
  }
  const html = reportHtml(title, subtitle, entries, currencySymbol);
  try {
    if (Platform.OS === "web") {
      await Print.printAsync({ html });
      return;
    }
    const result = await Print.printToFileAsync({ html, width: 595, height: 842, margins: { top: 28, bottom: 28, left: 28, right: 28 } });
    const permanentUri = `${FileSystem.documentDirectory}masroofi-${Date.now()}.pdf`;
    await FileSystem.moveAsync({ from: result.uri, to: permanentUri });
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("تم إنشاء التقرير", "تم حفظ ملف PDF داخل مستندات التطبيق، لكن المشاركة غير متاحة على هذا الجهاز.");
      return;
    }
    await Sharing.shareAsync(permanentUri, { mimeType: "application/pdf", dialogTitle: "مشاركة تقرير مصروفي", UTI: "com.adobe.pdf" });
  } catch {
    Alert.alert("تعذر إنشاء PDF", "حاول مرة أخرى، وتأكد من السماح بمشاركة الملفات.");
  }
}
