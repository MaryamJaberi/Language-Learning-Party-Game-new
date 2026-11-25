# تصویر کارت‌ها و دیکشنری تصویری با Canva

همهٔ تصویرهای نهایی با Canva ساخته می‌شوند. طرح‌های SVG در `src/visual` فقط جای خالی را پر می‌کنند تا تصویر Canva آن کارت ساخته شود.

## ۱. موقعیت هر کارت

```
npx tsx scripts/card-images/buildSituations.ts   # → data/card-images/situations.json
python3 scripts/card-images/build_plan.py         # → data/card-images/plan.json
```

- `buildSituations.ts` برای هر کارت می‌نویسد کجاست، چه کسی به چه کسی می‌گوید و با چه حالی.
  - منبع: قاعده‌های `src/visual/autoScene.ts` و صحنه‌های دست‌نوشتهٔ `src/visual/curatedScenes.ts`.
  - مثال: «You should see a doctor» → سام نگران دست روی شانهٔ یوسفِ سرفه‌کننده گذاشته است.
- `build_plan.py` از این موقعیت و توصیف شخصیت‌های فامیل پرامپت Canva را می‌سازد.
- ترتیب ساخت: اول ۱۸۸ واژهٔ دیکشنری (`d_…`)، بعد کارت‌ها از سطح پایین به بالا، آخر کارت‌های بازی الگو (`pat_…`).
- اشیا، خوراکی‌ها، حیوان‌ها و مکان‌ها رنگ واقعی دارند و صورت کارتونی ندارند. سیب آبی یاد نمی‌دهد.
- اگر برای یک کارت هیچ قاعده‌ای پیدا نشود (`genericSituation: true`)، پرامپت باز قبلی می‌ماند تا خود Canva موقعیت بسازد.
- ردیف‌هایی که `done` هستند هرگز دوباره ساخته نمی‌شوند.

## ۲. ساختن یک دسته (حدود ۱۰ تصویر)

1. ده ردیف `todo` اول `plan.json` را بردار. برای هر کدام `generate-image` با همان `prompt` و `PORTRAIT_3_4` بزن.
2. با `get-generate-image-job` نتیجه را بگیر و شناسهٔ media را نگه دار.
3. تصویر را نگاه کن. اگر نوشته دارد یا معنی را نمی‌رساند، دوباره بساز.
4. طرح کمکی «Plain image sheet» (`DAHbdxZmOzo`) را با `open_transaction` باز کن.
   - برای هر تصویر یک صفحهٔ ۹۰۰×۱۲۰۰ با زمینهٔ `#FBF5EA` و عنوانِ شناسه اضافه کن.
   - `insert_fill` تمام‌صفحه بزن، commit کن و آن صفحه‌ها را `jpg` با کیفیت ۹۲ export کن.
5. فایل `ids.txt` بساز (`شناسه mediaId` به ترتیب صفحه) و `urls.txt` (آدرس‌های export). بعد اجرا کن:
   `python3 scripts/card-images/ingest_sheet.py ids.txt urls.txt`
6. بعد `npm test` و `npm run build`. سپس commit و push روی شاخهٔ PR.

اپ تصویر را خودش پیدا می‌کند:
- کارت‌ها از `manifest.json` با conceptId یا id کارت الگو.
- دیکشنری با `d_<id>`.
