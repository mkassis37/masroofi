# دليل إعداد EXPO_TOKEN وEAS_PROJECT_ID لبناء APK

هذا الدليل يشرح إعداد مستودع **مصروفي** (`mkassis37/masroofi`) حتى يستطيع GitHub Actions تشغيل EAS وبناء ملف APK ورفعه إلى GitHub Releases دون وضع بيانات الدخول داخل الشيفرة.

## قبل البدء

تحتاج إلى حساب Expo/EAS وحساب GitHub لديه صلاحية الإدارة على المستودع. لا ترسل `EXPO_TOKEN` أو أي كلمة مرور أو رمز تحقق داخل المحادثة، ولا تضع الرمز في `README.md` أو ملفات المشروع أو رسائل الالتزام.

في هذا المشروع، يستخدم ملف Workflow الاسمين التاليين:

| الاسم | الغرض | هل هو سري؟ |
|---|---|---|
| `EXPO_TOKEN` | مصادقة GitHub Actions مع حساب Expo/EAS لتشغيل البناء | نعم، يجب حمايته مثل كلمة المرور |
| `EAS_PROJECT_ID` | تحديد مشروع مصروفي داخل EAS | ليس كلمة مرور، لكن يُفضّل تخزينه في GitHub Secrets لتوحيد إعداد Workflow |

## 1. إنشاء حساب Expo أو تسجيل الدخول

افتح [expo.dev](https://expo.dev) وأنشئ حسابًا أو سجّل الدخول بالحساب الذي سيملك مشروع EAS. استخدم الحساب نفسه مستقبلًا عند إنشاء الرمز وربط المشروع؛ فالحساب الذي لا يملك المشروع أو لا يملك صلاحية الوصول إليه قد يفشل في البناء.

يمكن تثبيت EAS CLI على جهازك، أو تشغيله مؤقتًا باستخدام `npx`:

```bash
npx eas-cli@latest --version
```

لا تحتاج إلى وضع كلمة مرور Expo في GitHub Actions؛ سير العمل يستخدم رمز الوصول الشخصي فقط.

## 2. إنشاء EXPO_TOKEN

1. افتح صفحة [Expo Access Tokens](https://expo.dev/settings/access-tokens).
2. اضغط **Create token**.
3. اكتب اسمًا واضحًا مثل `masroofi-github-actions`.
4. امنح الرمز أقل صلاحية تسمح بتشغيل EAS Build وEAS Update وفق الخيارات التي يعرضها حسابك.
5. اضغط إنشاء وانسخ الرمز فورًا؛ غالبًا لن تستطيع عرض القيمة الكاملة مرة أخرى.

تعامل مع الرمز كأنه كلمة مرور. إذا ظهر في سجل طرفية أو تم رفعه إلى GitHub بالخطأ، ألغِه فورًا من صفحة Access Tokens وأنشئ رمزًا جديدًا.

لا تختبر الرمز بهذه الطريقة لأنها قد تضعه في سجل الطرفية أو سجل CI:

```bash
# لا تستخدم هذا الأسلوب في سجل مشترك أو ملف محفوظ
EXPO_TOKEN=ضع_الرمز_هنا npx eas-cli@latest build
```

للاختبار المحلي الآمن نسبيًا، أدخله في متغير جلسة الطرفية دون كتابته في ملف:

```bash
read -s EXPO_TOKEN
export EXPO_TOKEN
npx eas-cli@latest whoami
```

بعد انتهاء الاختبار، امسحه من الجلسة:

```bash
unset EXPO_TOKEN
```

## 3. الحصول على EAS_PROJECT_ID

`EAS_PROJECT_ID` هو معرّف UUID لمشروع EAS، وليس اسم المستودع ولا اسم تطبيق GitHub. احصل عليه بإحدى الطرق التالية.

### الطريقة الأولى: من لوحة EAS

1. افتح [لوحة مشاريع Expo](https://expo.dev/accounts).
2. اختر الحساب أو المنظمة المالكة للمشروع.
3. افتح مشروع **مصروفي**.
4. انسخ قيمة **Project ID** من صفحة المشروع أو من عنوان URL إذا ظهرت فيه.

### الطريقة الثانية: من EAS CLI

من مجلد المشروع شغّل:

```bash
npx eas-cli@latest project:info
```

إذا طلب CLI تسجيل الدخول، سجّل الدخول محليًا باستخدام حساب Expo المالك للمشروع:

```bash
npx eas-cli@latest login
npx eas-cli@latest project:info
```

إذا لم يكن المشروع مرتبطًا بمشروع EAS بعد، شغّل التهيئة محليًا:

```bash
npx eas-cli@latest init
```

وافق على إنشاء أو ربط مشروع EAS باسم مصروفي، ثم أعد تنفيذ `project:info`. لا تنشئ مشروعًا ثانيًا إذا كان لمصروفي مشروع EAS موجود بالفعل؛ استخدم المعرّف الموجود حتى تعمل قناة OTA والبناء الأصلي على المشروع نفسه.

في إعداد مصروفي الحالي، يُقرأ المعرّف من متغير البيئة `EAS_PROJECT_ID`، ثم يُستخدم لإنشاء:

```text
https://u.expo.dev/EAS_PROJECT_ID
```

ويُمرّر أيضًا إلى `extra.eas.projectId`. لذلك يجب أن تكون قيمة GitHub Secret مطابقة تمامًا لمعرّف مشروع EAS الصحيح.

## 4. إضافة القيم إلى GitHub Secrets

1. افتح مستودع المشروع: [github.com/mkassis37/masroofi](https://github.com/mkassis37/masroofi).
2. افتح تبويب **Settings**.
3. من القائمة الجانبية اختر **Secrets and variables** ثم **Actions**.
4. في قسم **Repository secrets** اضغط **New repository secret**.
5. أنشئ السر الأول:

   - **Name:** `EXPO_TOKEN`
   - **Secret:** الصق رمز Expo الذي أنشأته، دون مسافات أو علامات اقتباس.

6. أنشئ السر الثاني:

   - **Name:** `EAS_PROJECT_ID`
   - **Secret:** الصق UUID لمشروع EAS الخاص بمصروفي.

7. لا تضف القيم إلى **Variables** بدل **Secrets**؛ استخدم Repository secrets كما هو موضح. بعد الحفظ لن تستطيع GitHub عرض قيمة السر كاملة مرة أخرى.

يحتوي Workflow الحالي على هذا النمط:

```yaml
env:
  EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
  EAS_PROJECT_ID: ${{ secrets.EAS_PROJECT_ID }}
```

لا تعدّل أسماء الأسرار إلى أسماء أخرى إلا إذا عدّلت Workflow نفسه أيضًا.

## 5. تشغيل بناء APK للتجربة

بعد حفظ السرّين، شغّل البناء بإحدى الطريقتين.

### تشغيل يدوي من GitHub Actions

1. افتح تبويب **Actions** في المستودع.
2. اختر Workflow باسم **Android Release**.
3. اضغط **Run workflow**.
4. اختر الفرع `main` ثم اضغط **Run workflow**.
5. انتظر حتى تنتهي خطوات تثبيت الحزم، فحص TypeScript، البناء عبر EAS، وتنزيل APK.
6. بعد النجاح افتح تبويب **Releases** ونزّل الملف الذي يحمل امتداد `.apk`.

### التشغيل بدفع tag

من جهازك بعد التأكد من أن الفرع محدث:

```bash
git checkout main
git pull origin main
git tag v1.0.1
git push origin v1.0.1
```

سيبدأ Workflow لأن ملفه يراقب tags التي تبدأ بـ `v`. استخدم رقمًا جديدًا في كل إصدار، مثل `v1.0.2`، ولا تعِد استخدام tag منشور.

> ملاحظة مهمة: في إعداد المشروع الحالي، Workflow يطلق ملف EAS بالـ profile `preview` وبنوع APK، ثم يرفعه إلى GitHub Release. هذا مناسب للتجربة على هاتف Android. ملف `production` في `eas.json` مهيأ حاليًا كـ AAB للنشر في Google Play، وليس هو مسار APK التجريبي.

## 6. التحقق من نجاح البناء

تحقق من العناصر التالية بعد انتهاء Workflow:

| الفحص | النتيجة المتوقعة |
|---|---|
| `EXPO_TOKEN` | لا يظهر في سجل Actions؛ يظهر مخفيًا إن طُبع بالخطأ |
| `EAS_PROJECT_ID` | يمرّر إلى إعداد Expo دون خطأ project not configured |
| TypeScript | خطوة `pnpm check` ناجحة |
| EAS Build | يظهر بناء Android بحالة finished |
| GitHub Release | يظهر Release بنفس tag ويحتوي APK |
| الهاتف | يثبت APK بعد موافقة Android على التثبيت من المصدر المناسب |

لا تشارك ملف APK إذا كان الإصدار مخصصًا للاختبار ويحتوي إعدادات غير مناسبة للإنتاج. جرّبه أولًا على هاتفك، وتحقق من فتح التطبيق، الأيقونة، التخزين المحلي، القفل، التقارير، وفحص OTA.

## 7. الأخطاء الشائعة وحلولها

### `Not authenticated` أو `Invalid token`

ألغِ `EXPO_TOKEN` القديم وأنشئ رمزًا جديدًا، ثم حدّث GitHub Secret بالاسم نفسه. لا تغيّر الاسم إلى `EXPO_ACCESS_TOKEN` إلا إذا عدّلت Workflow.

### `EAS project not configured`

تحقق من أن `EAS_PROJECT_ID` هو UUID الصحيح لمشروع مصروفي، وأن Workflow يمرره في البيئة. إذا لم يكن المشروع مرتبطًا، شغّل `npx eas-cli@latest init` محليًا بالحساب الصحيح.

### `You don't have permission`

سجّل الدخول بالحساب الذي يملك مشروع EAS أو أضف الحساب إلى المنظمة بصلاحية مناسبة. وجود صلاحية على GitHub وحده لا يمنح صلاحية على Expo.

### `No finished APK artifact found`

انتظر انتهاء EAS Build ثم أعد تشغيل خطوة التنزيل أو Workflow. إذا كان البناء يستخدم profile مختلفًا، تحقق من أن Workflow يبحث عن آخر بناء Android المكتمل وأن الناتج APK وليس AAB.

### فشل OTA بعد بناء APK

تأكد من أن `updates.url` و`runtimeVersion` والقناة في APK تطابق قناة EAS التي تنشر إليها. تغييرات native لا تصل عبر OTA؛ أعد بناء APK عند تغيير Expo SDK أو الحزم الأصلية أو الصلاحيات.

## 8. ما الذي يبقى يدويًا؟

لا يثبت Android ملف APK بصمت من داخل التطبيق. بعد ظهور Release، يحتاج المستخدم إلى تنزيل APK والموافقة على تثبيته. أما تغييرات JavaScript والأصول غير الأصلية المتوافقة مع `runtimeVersion` فيمكن نشرها عبر EAS Update دون تنزيل APK كامل، مع استمرار التطبيق في طلب موافقة المستخدم قبل تنزيلها وتطبيقها حسب إعداداته.

## مراجع رسمية

[1]: https://docs.expo.dev/accounts/programmatic-access/ "Expo programmatic access"
[2]: https://docs.expo.dev/build/building-on-ci/ "Expo trigger builds from CI"
[3]: https://docs.expo.dev/tutorial/eas/configure-development-build/ "Expo configure a development build in cloud"
[4]: https://docs.expo.dev/eas-update/github-actions/ "Expo GitHub Actions for EAS Update"
