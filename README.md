# Appointment Booking API

API مصغّر لحجز المواعيد: NestJS + PostgreSQL + Prisma + Socket.IO + OpenAPI (Swagger UI).
يمنع الحجز المزدوج تحت الطلبات المتزامنة، ويدعم الإلغاء والتحديثات اللحظية.

## المتطلبات
- Node.js 20+ و npm
- PostgreSQL 14+ (قاعدتان: للتشغيل وللاختبارات)

## التثبيت
```bash
npm install
cp .env.example .env            # عدّل DATABASE_URL
npm run prisma:generate
```

## متغيرات البيئة
| المتغير | الوصف |
|---|---|
| `DATABASE_URL` | رابط PostgreSQL |
| `PORT` | منفذ الخادم (افتراضي 3000) |

## الترحيلات وseed والتشغيل
```bash
createdb booking                 # أو أنشئها بأي طريقة
npm run prisma:migrate           # prisma migrate deploy
npm run db:seed                  # 8 مواعيد ثابتة بمعرّفات 00000000-0000-4000-8000-00000000000{1..8}
npm run start:dev                # أو: npm run build && npm run start:prod
```

## الروابط
- `GET /slots`، `POST /bookings`، `DELETE /bookings/{bookingId}`
- Swagger UI: http://localhost:3000/docs
- OpenAPI JSON: http://localhost:3000/openapi.json

## الاختبارات (PostgreSQL حقيقي)
```bash
createdb booking_test
cp .env.test.example .env.test   # قاعدة منفصلة! تُفرَّغ جداولها عند كل اختبار
npm run test:e2e
```
`test/global-setup.ts` ينفّذ `prisma migrate deploy` على قاعدة الاختبار، وكل اختبار يفرّغ الجداول ويعيد إنشاء موعدين، فالاختبارات قابلة للتكرار.
اختبار التزامن يرسل 10 طلبات `Promise.all` على نفس الموعد فعليًا إلى PostgreSQL: المتوقع 201 واحد و9×409 وسجل نشط واحد. كذلك يغطي الاختبارات: نجاح الحجز، الإلغاء وإعادة الحجز، تكرار الإلغاء، الأخطاء، وتقليم المسافات.

## Socket.IO (اختبار دون واجهة)
الخادم نفسه، namespace `/` والمسار `/socket.io`، بدون مصادقة. الأحداث تُرسل للجميع مرة واحدة بعد نجاح الكتابة:

| الحدث | الحمولة |
|---|---|
| `slot.booked` | `{"slotId","bookingId","available":false}` |
| `slot.released` | `{"slotId","bookingId","available":true}` |

لا أحداث للطلبات المرفوضة أو لتكرار الإلغاء، ولا بيانات عملاء.
```bash
# طرفية 1
npm run socket:listen
# طرفية 2
./scripts/demo-requests.sh                         # حجزان متزامنان => حدث slot.booked واحد
curl -X DELETE http://localhost:3000/bookings/<bookingId>   # => slot.released
```

## آلية منع التعارض وأهم القرارات
- **قيد فريد جزئي في PostgreSQL**: `CREATE UNIQUE INDEX ... ON "Booking"("slotId") WHERE status = 'active'` (في ملف الترحيل). القاعدة نفسها تضمن حجزًا نشطًا واحدًا لكل موعد مهما كان عدد النسخ من الخادم؛ الطلب الخاسر يحصل على خطأ `P2002` يُحوَّل إلى `409 SLOT_UNAVAILABLE`. لا أقفال ولا انتظار.
- اخترته بدل `SELECT ... FOR UPDATE` لأنه أبسط وأصعب كسرًا (لا يعتمد على انضباط الكود)، وبدل فحص-ثم-إدخال لأنه عرضة للسباق.
- **حجوزات منفصلة عن المواعيد**: الإلغاء يغيّر `status` فقط، فيبقى الحجز الملغى قابلًا للوصول ويمكن حجز جديد لنفس الموعد.
- **الإلغاء ذري ومتكرر الأمان**: `UPDATE ... WHERE id = ? AND status = 'active'`؛ يُرسل `slot.released` فقط عندما يتغير سجل فعلًا (count = 1).
- الأحداث تُرسل بعد اكتمال `await` للكتابة (أي بعد commit).
- **الأخطاء**: فلتر عام يوحّد الصيغة `{"error":{"code","message"}}` ويخفي التفاصيل الداخلية؛ JSON غير الصالح يعطي 400 `VALIDATION_ERROR`.
- `configureApp` مشترك بين `main.ts` والاختبارات لضمان تطابق السلوك والتوثيق.
- ملاحظة: القيد الجزئي غير معبَّر عنه في `schema.prisma`، فقد يقترح `prisma migrate dev` حذفه؛ لا توافق على ذلك.

### تحسينات ممكنة
اختبارات Socket.IO آلية، `Retry-After`/rate limiting، تقسيم النتائج، Docker وCI، تحقق من تداخل المواعيد، وحدات اختبار للخدمات.

## الوقت الفعلي والأجزاء الناقصة
- **الوقت الفعلي**: لم يُسجّل زمن التنفيذ بدقة.
- **الأجزاء الناقصة أو القيود المعروفة**:
  - لم تُنفّذ مصادقة أو صلاحيات للمستخدمين؛ Socket.IO ومسارات API متاحة دون مصادقة حاليًا.
  - لا توجد حاليًا واجهة أمامية أو لوحة إدارة؛ المشروع API وعميل Socket.IO تجريبي عبر الطرفية فقط.
  - لا يتوفر تنفيذ آلي لاختبارات Socket.IO، ولا يوجد Docker Compose أو CI في المستودع حاليًا.
  - لا يوجد rate limiting أو `Retry-After` أو تقسيم للصفحات.
  - لا توجد تحقق آلي من تداخل فترات المواعيد، أو اختبارات وحدات منفصلة للخدمات.
  - القيد الفريد الجزئي مكتوب في migration ولا يُصوَّر كاملًا داخل `schema.prisma`؛ تجنب تطبيق تغييرات قد يحاول Prisma حذف القيد بسببها.

## إفصاح AI
تمت صياغة الهيكل الأولي للمشروع بمساعدة Claude (Anthropic)، ثم رُوجِعَت الملفات والمسارات والإعدادات وتعرّفت إلى آلية الحجز والحجوزات المتزامنة وتجهيز الاختبارات. المراجعة والاختبار تشمل تشغيل اختبارات PostgreSQL الحقيقية واختبار سيناريو التعارض، مع مراجعة إعدادات Prisma والتوثيق. أنا مسؤول عن فهم الكود وشرحه وتعديله في المقابلة.
