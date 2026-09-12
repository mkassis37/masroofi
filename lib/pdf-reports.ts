import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Alert, Platform } from "react-native";
import type { FinancialEntry } from "./finance-context";
import { findCurrency } from "./currencies";
import { localizedCurrencyName, translate } from "./i18n";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function money(value: number, symbol: string) {
  return `${value.toLocaleString("ar-SA", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${symbol}`;
}

function typeName(type: FinancialEntry["type"], language: "ar" | "en") {
  return type === "debit" ? translate("مدين", language, "Debit") : type === "credit" ? translate("دائن", language, "Credit") : translate("تحويل", language, "Transfer");
}

function accountName(account: FinancialEntry["account"], language: "ar" | "en") {
  return account === "cash" ? translate("نقدي", language, "Cash") : translate("بنكي", language, "Bank");
}

function reportHtml(title: string, subtitle: string, entries: FinancialEntry[], currencySymbol: string, language: "ar" | "en") {
  const income = entries.filter((e) => e.type === "debit").reduce((sum, e) => sum + e.amount, 0);
  const expense = entries.filter((e) => e.type === "credit").reduce((sum, e) => sum + e.amount, 0);
  const transfer = entries.filter((e) => e.type === "transfer").reduce((sum, e) => sum + e.amount, 0);
  const currencyTotals = entries.reduce<Record<string, number>>((totals, entry) => { const code = entry.currencyCode ?? "JOD"; totals[code] = (totals[code] ?? 0) + (entry.type === "debit" ? entry.amount : entry.type === "credit" ? -entry.amount : 0); return totals; }, {});
  const currencySummary = Object.entries(currencyTotals).map(([code, total]) => `<div class="currency-box"><span>${localizedCurrencyName(code, findCurrency(code).name, language)} (${code})</span><strong>${money(total, findCurrency(code).symbol)}</strong></div>`).join("");
  const rows = entries.length ? entries.map((entry) => `<tr><td>${escapeHtml(entry.date)}</td><td>${typeName(entry.type, language)}</td><td>${accountName(entry.account, language)}</td><td>${escapeHtml(entry.note)}</td><td>${money(entry.amount, currencySymbol)}</td></tr>`).join("") : `<tr><td colspan="5" class="empty">${translate("لا توجد عمليات ضمن الفترة المحددة", language, "No transactions in the selected period")}</td></tr>`;
  const isEn = language === "en";
  const direction = isEn ? "ltr" : "rtl";
  const tr = (ar: string, en: string) => translate(ar, language, en);
  return `<!DOCTYPE html><html lang="${isEn ? "en" : "ar"}" dir="${direction}"><head><meta charset="UTF-8"><style>
    @page { margin: 28px; size: A4 portrait; } body { font-family: Arial, sans-serif; color: #17212B; direction: ${direction}; } .brand { color: #0F9B8E; font-size: 14px; font-weight: bold; } h1 { color: #17365D; margin: 5px 0; font-size: 25px; } .subtitle { color: #667085; margin-bottom: 22px; } .summary { display: flex; gap: 10px; margin-bottom: 20px; } .box { flex: 1; background: #F2F7FA; border-radius: 10px; padding: 13px; text-align: right; } .box strong { display: block; font-size: 17px; margin-top: 6px; } .income strong { color: #0F9B8E; } .expense strong { color: #D95D55; } .transfer strong { color: #17365D; } table { width: 100%; border-collapse: collapse; font-size: 11px; } th { background: #17365D; color: white; padding: 9px; } td { border-bottom: 1px solid #D8E2EC; padding: 9px 6px; } .empty { text-align: center; color: #667085; padding: 30px; } footer { margin-top: 24px; color: #98A2B3; font-size: 10px; text-align: center; }
  .currency-summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 0 0 20px; } .currency-box { background: #FFFFFF; border: 1px solid #D8E2EC; border-radius: 9px; padding: 9px; } .currency-box span { color: #667085; display: block; font-size: 10px; } .currency-box strong { color: #17365D; display: block; font-size: 14px; margin-top: 4px; }
  </style></head><body><div class="brand">${tr("مصروفي · دفتر مالي شخصي", "Masroofi · Personal finance ledger")}</div><h1>${escapeHtml(title)}</h1><div class="subtitle">${escapeHtml(subtitle)}</div><div class="summary"><div class="box income">${tr("إجمالي المدين", "Total debit")}<strong>${money(income, currencySymbol)}</strong></div><div class="box expense">${tr("إجمالي الدائن", "Total credit")}<strong>${money(expense, currencySymbol)}</strong></div><div class="box transfer">${tr("إجمالي التحويلات", "Total transfers")}<strong>${money(transfer, currencySymbol)}</strong></div></div><div class="currency-summary">${currencySummary}</div><table><thead><tr><th>${tr("التاريخ", "Date")}</th><th>${tr("النوع", "Type")}</th><th>${tr("الحساب", "Account")}</th><th>${tr("البيان", "Description")}</th><th>${tr("المبلغ", "Amount")}</th></tr></thead><tbody>${rows}</tbody></table><footer>${tr("تم إنشاء التقرير من تطبيق مصروفي", "Report generated by Masroofi")} · ${new Date().toLocaleDateString(isEn ? "en-US" : "ar-SA")}</footer></body></html>`;
}

export async function generateAndSharePdf(title: string, subtitle: string, entries: FinancialEntry[], currencySymbol = "د.أ", language: "ar" | "en" = "ar") {
  if (!entries.length) {
    Alert.alert(translate("لا توجد بيانات", language, "No data"), translate("لا توجد عمليات ضمن النطاق الذي اخترته.", language, "No transactions in the selected range."));
    return;
  }
  const html = reportHtml(title, subtitle, entries, currencySymbol, language);
  try {
    if (Platform.OS === "web") {
      await Print.printAsync({ html });
      return;
    }
    const result = await Print.printToFileAsync({ html, width: 595, height: 842, margins: { top: 28, bottom: 28, left: 28, right: 28 } });
    const permanentUri = `${FileSystem.documentDirectory}masroofi-${Date.now()}.pdf`;
    await FileSystem.moveAsync({ from: result.uri, to: permanentUri });
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(translate("تم إنشاء التقرير", language, "Report created"), translate("تم حفظ ملف PDF داخل مستندات التطبيق، لكن المشاركة غير متاحة على هذا الجهاز.", language, "The PDF was saved in the app documents, but sharing is unavailable on this device."));
      return;
    }
    await Sharing.shareAsync(permanentUri, { mimeType: "application/pdf", dialogTitle: translate("مشاركة تقرير مصروفي", language, "Share Masroofi report"), UTI: "com.adobe.pdf" });
  } catch {
    Alert.alert(translate("تعذر إنشاء PDF", language, "Could not create PDF"), translate("حاول مرة أخرى، وتأكد من السماح بمشاركة الملفات.", language, "Try again and make sure file sharing is allowed."));
  }
}
