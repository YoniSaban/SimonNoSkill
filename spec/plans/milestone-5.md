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
- [ ] Workflow ב-Actions עובר בדיקות ו-Build ומפרסם אוטומטית אחרי Push.
- [ ] האתר נטען ב-HTTPS, ונכסים וניווט עובדים תחת נתיב הפרויקט בלי 404.
- [ ] Manifest ו-Service Worker תקינים; אפשרות התקנה בדפדפן או במכשיר תומך.
- [ ] אחרי טעינה מלאה ו-Precache, בלי אינטרנט: פתיחה מחדש, משחק, צלילים, ניווט והיסטוריה.
- [ ] עדכון גרסה לא מרענן ולא מפסיק משחק פעיל.
- [ ] רגרסיה: עשרה שלבים, כישלון ראשון, קונפטי בניצחון בלבד, השהיה וחידוש, עשר תוצאות ומחיקה מאושרת; תצוגת טלפון אנכית בעברית וב-RTL.

## תוצאות בנייה
_יתעדכן בסוף הבנייה._
