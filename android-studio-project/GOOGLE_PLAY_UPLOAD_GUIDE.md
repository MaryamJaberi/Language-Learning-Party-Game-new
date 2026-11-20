# راهنمای گرفتن نسخهٔ گوگل پلی «دور: زبان»

## روش جدید (خودکار، بدون AI Studio)

اپ اندروید فقط یک پوستهٔ سبک است که سایت بازی را باز می‌کند (کمتر از ۱ مگابایت).
پس برای تغییرهای بازی، AAB تازه لازم نیست؛ بازیکن‌ها خودشان نسخهٔ جدید سایت را می‌گیرند.
AAB تازه فقط وقتی لازم است که خود پوستهٔ اندروید (این پوشه) عوض شود.

گردش‌کار `.github/workflows/android-release.yml` در GitHub Actions:

1. هر بار که این پوشه روی `main` تغییر کند، یا از تب **Actions → Android release → Run workflow** اجرا شود،
   AAB و APK را می‌سازد، با کلید انتشار امضا می‌کند و شمارهٔ نسخه (versionCode) را خودکار بالا می‌برد.
2. فایل‌ها در بخش **Releases** مخزن گذاشته می‌شوند. نشانی همیشگی آخرین نسخه:
   - AAB برای گوگل پلی: https://github.com/MaryamJaberi/Language-Learning-Party-Game-new/releases/latest/download/dor-zaban.aab
   - APK برای تست روی گوشی: https://github.com/MaryamJaberi/Language-Learning-Party-Game-new/releases/latest/download/dor-zaban.apk
   - دکمه‌های دانلود در پروفایل ادمین بازی هم به همین نشانی‌ها می‌روند.
3. اگر حساب سرویس گوگل پلی (`PLAY_SERVICE_ACCOUNT_JSON`) تنظیم شده باشد، AAB مستقیم به
   **Testing → Internal testing** گوگل پلی به‌صورت پیش‌نویس فرستاده می‌شود و فقط باید در کنسول «Roll out» را بزنید.

## رمزهای لازم در GitHub

Settings → Secrets and variables → Actions → New repository secret

| نام | مقدار |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | فایل keystore انتشار، به base64 |
| `KEYSTORE_PASSWORD` | رمز keystore |
| `KEY_ALIAS` | نام کلید (مثلاً `dor-release`) |
| `KEY_PASSWORD` | رمز کلید |
| `PLAY_SERVICE_ACCOUNT_JSON` | (اختیاری) کلید JSON حساب سرویس گوگل پلی |

کلید امضا و رمزش هرگز وارد مخزن نمی‌شوند.

## اگر کلید امضا عوض شده باشد

گوگل پلی فقط AAB امضاشده با «کلید آپلود» ثبت‌شده را می‌پذیرد. اگر قبلاً با کلید دیگری آپلود کرده‌اید:
Play Console → اپ → **Test and release → App integrity → App signing → Request upload key reset**
و فایل `upload_certificate.pem` کلید جدید را بفرستید. گوگل معمولاً ظرف چند روز تأیید می‌کند.

## مراحل اولیهٔ Play Console (یک بار)

1. https://play.google.com/console → **Create app** (نام: `دور: زبان`، نوع: Game، رایگان)
2. Privacy policy: صفحهٔ `privacy.html` سایت
3. متن فروشگاه: `google_play_metadata/STORE_LISTING_FA.txt` و `STORE_LISTING_EN.txt`
4. آیکون: `google_play_metadata/app_icon_512x512.png`
5. Releases → Internal testing → Create new release → AAB را آپلود کنید (یا بگذارید گردش‌کار خودش بفرستد).
