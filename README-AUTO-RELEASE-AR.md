# Masroofi — Auto Release

هذه النسخة تجعل عملية الإصدار تلقائية.

## ماذا تفعل؟
عند كل Push إلى فرع `main`:

1. GitHub Actions يفحص المشروع.
2. يبني Android APK عبر Expo EAS.
3. ينشئ رقم إصدار تلقائيًا بصيغة مثل `v2026.10.13.123`.
4. ينشئ Tag تلقائيًا — لا تحتاج لإنشائه بنفسك.
5. ينشئ GitHub Release.
6. يرفع ملف APK و SHA256SUMS.txt.
7. يجعل الإصدار الجديد Latest.

## المطلوب منك
بعد استبدال ملف workflow القديم بهذا الملف:
- Commit
- Push origin

وبعد ذلك، كل Push جديد إلى main سيحاول إصدار نسخة جديدة تلقائيًا.

## Secrets المطلوبة
يجب أن تكون موجودة في:
GitHub Repository → Settings → Secrets and variables → Actions

- EXPO_TOKEN
- EAS_PROJECT_ID

ملاحظة: لن يتم إنشاء Release إذا فشل فحص المشروع أو بناء EAS؛ وهذا مقصود حتى لا يتم نشر APK معطوب.
