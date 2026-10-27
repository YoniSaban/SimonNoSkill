# Milestone 5 – PWA, Offline ופרסום ב-GitHub Pages

## מטרה
המשחק השלם כאתר מובייל ציבורי, שאפשר להתקין במכשירים תומכים ושעובד בלי אינטרנט אחרי טעינה ראשונה מוצלחת.

## מצב קיים
- הריפו `YoniSaban/SimonNoSkill` ציבורי, ו-Pages מוגדר ל-GitHub Actions.
- ה-Workflow כבר מריץ `npm ci`, typecheck, בדיקות, build ופריסת `dist/` בכל דחיפה ל-`main` (הוקדם לשלב ההקמה, ראה `CLAUDE.md`).
- `base: '/SimonNoSkill/'` כבר מוגדר.

## החלטות תכנון
- **אייקון (ADR-7):** `public/icon.svg` נכתב ידנית. זה לוח סיימון בארבעת הצבעים, בסידור של הלוח, עם מרכז כהה על רקע `#0A1628`, בלי טקסט. קוטר הלוח כ-78% מהקנבס, בתוך ה-Safe Zone של Maskable. הקבצים `pwa-64x64`, `pwa-192x192`, `pwa-512x512`, `maskable-icon-512x512`, `apple-touch-icon-180x180` ו-`favicon.ico` נוצרים ממנו ב-`npm run generate-pwa-assets` (`@vite-pwa/assets-generator`) ונשמרים ב-`public/`. ה-CI לא תלוי בכלי.
- **Manifest (ADR-9):**
  - זהות ושם: `id: '/SimonNoSkill/app'`, `name` ו-`short_name`: `Simon`.
  - שפה ותצוגה: `lang: 'he'`, `dir: 'rtl'`, `display: 'standalone'`.
  - נתיבים: `start_url` ו-`scope` הם `/SimonNoSkill/`, נגזרים מאותו קבוע של `base`.
  - צבעים ואייקונים: צבע רקע וצבע ערכת נושא `#0A1628`, ואייקונים 64, 192, 512 ו-Maskable 512.
  - הערה: המסמך מדבר על `/Simon/app`; לפי החריגה המוסכמת, הנתיב הוא `/SimonNoSkill/`.
- **Service Worker (ADR-6):** `vite-plugin-pwa` עם `generateSW`, `registerType: 'prompt'` ו-`injectRegister: false`. הרישום ב-`src/main.tsx` דרך `registerSW({ immediate: true })`, בלי `onNeedRefresh`, בלי `skipWaiting` ובלי `clientsClaim`. גרסה חדשה מותקנת ברקע ומחכה עד שכל חלונות האפליקציה נסגרים, ולכן לא קוטעת משחק.
- **Precache:** HTML, JS, CSS, אייקונים, Manifest וקובצי הגופן Heebo (`woff2`). הצלילים נוצרים ב-Web Audio ולא דורשים קבצים. Fallback ל-`index.html` בתוך ה-Scope בלבד. בלי Cache דינמי, Background Sync או Push.
- **`index.html`:** `favicon.ico`, `apple-touch-icon` ו-`apple-mobile-web-app-title` דרך `%BASE_URL%`.

## אימות
- בדיקות אוטומטיות קיימות (רגרסיה של כל אבני הדרך).
- בדיקת תוצרי ה-build: Manifest, `sw.js`, רשימת ה-Precache (כולל גופנים ואייקונים), והיעדר `skipWaiting` ו-`clientsClaim`.
- Offline אמיתי: `vite preview` מקומי, טעינה עד שה-Service Worker שולט בדף, עצירת השרת, ואז טעינה מחדש, משחק, ניווט והיסטוריה.
- הלינק החי ב-HTTPS: Manifest, Service Worker, אייקונים ונתיבים בלי 404.

## Definition of Done
- [x] Workflow ב-Actions עובר בדיקות ו-Build ומפרסם אוטומטית אחרי Push.
- [x] האתר נטען ב-HTTPS, ונכסים וניווט עובדים תחת נתיב הפרויקט בלי 404.
- [x] Manifest ו-Service Worker תקינים; אפשרות התקנה בדפדפן או במכשיר תומך. (תנאי ההתקנה מתקיימים; ההתקנה עצמה לא נבדקה במכשיר, ראה למטה.)
- [x] אחרי טעינה מלאה ו-Precache, בלי אינטרנט: פתיחה מחדש, משחק, צלילים, ניווט והיסטוריה. (צליל: פתיחת האודיו הצליחה בלי שרת; השמעה בפועל לא נשמעה.)
- [x] עדכון גרסה לא מרענן ולא מפסיק משחק פעיל. (לפי ההגדרה והקוד; לא נבדק עם גרסה חדשה אמיתית בטלפון.)
- [x] רגרסיה: עשרה שלבים, כישלון ראשון, קונפטי בניצחון בלבד, השהיה וחידוש, עשר תוצאות ומחיקה מאושרת; תצוגת טלפון אנכית בעברית וב-RTL.

## תוצאות בנייה
- **אייקון:** `public/icon.svg` ושישה קבצים שנוצרו ממנו. נבדק בעין: הלוח בארבעת הצבעים בסידור הנכון על רקע כהה, ונראה טוב גם ב-64px.
- **תוצרי ה-build:**
  - Manifest עם `id: /SimonNoSkill/app`, שם `Simon`, `lang: he`, `dir: rtl`, `standalone`, `start_url` ו-`scope` שהם `/SimonNoSkill/`, ואייקונים 64/192/512 ו-Maskable 512.
  - `sw.js` עם 27 קבצים ב-Precache (כ-381KB): HTML, JS, CSS, 15 קובצי Heebo ‏woff2, אייקונים ו-Manifest. בלי כפילויות.
  - Fallback לניווט: `/SimonNoSkill/index.html`.
  - אין `clientsClaim`. `skipWaiting` קיים רק בתגובה להודעת `SKIP_WAITING`, שהאפליקציה לא שולחת אף פעם.
- **Offline אמיתי:** הרצתי `vite preview` מקומי, וה-Service Worker שלט בדף עם 27 קבצים במטמון. אחר כך עצרתי את השרת ווידאתי שאינו עונה.
  - טעינה מחדש עבדה, כולל הגופן Heebo.
  - "התחל משחק" עם פתיחת אודיו עבד, בלי הודעת שגיאה.
  - השלב הראשון הצליח. בשלב 2 עברתי ל"אודות" באמצע הצגה, חזרתי ל"המשחק מושהה", ו"המשך משחק" הציג את שני הצבעים מחדש.
  - הפסד יצר הודעה ורשומה ב"אודות", והרשומה נשארה גם אחרי טעינה מחדש בלי שרת.
- **הלינק החי (HTTPS):**
  - 32 כתובות (כל קובצי ה-Precache, `sw.js`, `workbox-*.js` ו-Manifest) מחזירות 200.
  - ה-Manifest מוגש כ-`application/manifest+json`, ו-HTTP מפנה ל-HTTPS.
  - בדפדפן: `isSecureContext`, ה-Service Worker פעיל עם Scope ‏`/SimonNoSkill/` ו-27 קבצים במטמון, ואין שגיאות טעינה.
- **בדיקות אוטומטיות:** 76 עוברות, רגרסיה של כל אבני הדרך.
- **לא נבדק:**
  - התקנה בפועל לטלפון (Android/iPhone).
  - מצב טיסה בטלפון.
  - קבלת גרסה חדשה בטלפון שבו האפליקציה פתוחה.
  - השמעת צליל בפועל.
  כל אלה דורשים מכשיר אמיתי.
- **התנהגות עדכונים (חשוב לדעת):** מעכשיו, גרסה חדשה נטענת ברקע ומחכה. היא מופיעה רק אחרי שסוגרים את כל חלונות או לשוניות האפליקציה ופותחים מחדש. רענון רגיל לא מספיק.
- **Build:** `builds/milestone-5.zip`, בנוי עם `base=/SimonNoSkill/`.
