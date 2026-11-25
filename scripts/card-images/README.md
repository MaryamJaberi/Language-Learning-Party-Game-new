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

روش اصلی «اسکچ → Canva» است. طرح کدی هر کارت اسکچ می‌شود و Canva آن را زیبا بازکشی می‌کند. چیدمان، حالت چهره‌ها و ژست‌ها از اسکچ می‌آید.

1. اجرا کن: `python3 scripts/card-images/next_batch.py 10`
   - اسکچ PNG ردیف‌های بعدی را در `/tmp/dour-sketches` می‌کشد.
   - برای هر ردیف یک خط JSON چاپ می‌کند: `sketch`، `aspectRatio`، `page` و `prompt`.
2. برای هر ردیفی که اسکچ دارد:
   - `create-upload-url` بزن.
   - PNG را با `curl -X POST -H "Content-Type: application/octet-stream" --data-binary @file URL` بفرست. پاسخ `mediaId` است.
   - `generate-image` بزن با `prompt` و `aspectRatio` همان خط، و `imageReferences: [{type: MEDIA, id: mediaId}]`.
   - ردیفی که اسکچ ندارد، فقط با `prompt` ساخته می‌شود.
3. با `get-generate-image-job` نتیجه را بگیر و تصویر را نگاه کن. اگر یکی از این‌ها درست نیست، دوباره بساز:
   - نوشته، عدد یا نشانهٔ صدا دارد.
   - معنی کارت را نمی‌رساند.
   - چهره‌ها عکس‌گونه‌اند.
   - رنگ شیء غیرواقعی است.
4. طرح کمکی «Plain image sheet» (`DAHbdxZmOzo`) را با `open_transaction` باز کن.
   - برای هر تصویر یک صفحه به اندازهٔ `page` همان ردیف بساز: ۱۲۰۰×۸۰۰ برای صحنه، ۹۰۰×۹۰۰ برای واژه. زمینه `#FBF5EA` و عنوان صفحه شناسهٔ ردیف باشد.
   - `insert_fill` تمام‌صفحه بزن، commit کن و آن صفحه‌ها را `jpg` با کیفیت ۹۲ export کن.
5. فایل `ids.txt` بساز، هر خط `شناسه mediaId sketch` به ترتیب صفحه، و `urls.txt` با آدرس‌های export. بعد:
   `python3 scripts/card-images/ingest_sheet.py ids.txt urls.txt`
   - اندازهٔ ذخیره: صحنه ۷۲۰×۴۸۰ و واژه ۴۸۰×۴۸۰، WebP، هر کدام حدود ۱۰ تا ۲۵ کیلوبایت.
   - اندازهٔ هر تصویر در manifest ثبت می‌شود تا اپ نسبت درست را نشان دهد.
6. اجرا کن: `npm test` و `npm run build`. بعد commit و push روی شاخهٔ PR.

اپ تصویر را خودش پیدا می‌کند:
- کارت‌ها از `manifest.json` با conceptId یا id کارت الگو.
- دیکشنری با `d_<id>`.
- تا تصویر Canva نیامده، همان طرح کدی نشان داده می‌شود.
