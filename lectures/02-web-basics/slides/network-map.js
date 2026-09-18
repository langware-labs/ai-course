/* "The internet is a network of computers" — interactive map (Konva).
 *
 * Home: you in the middle, five real apps around you. Pick one and the stage
 * becomes that app's real chain of machines: packets fly hop by hop, the card
 * says who is the client and who is the server at every step, and hovering any
 * machine shows its job. The chains follow the companies' own engineering
 * write-ups and help pages, simplified for 8th grade — sources in
 * network-map.sources.md.
 *
 * Needs: Konva (global) and #netStage, #netTip, #netCard, #netChips, #netRoles.
 * Call window.__networkMap.show() when the section becomes visible.
 */
(function () {
  'use strict';

  const INK = '#1E1814', LINE = '#D9C6A8', REQ = '#E4572E', RES = '#1F8A83', PUSH = '#7A4FB8';
  const ROLE = { client: { color: '#E4572E', label: 'לקוח' }, server: { color: '#1F8A83', label: 'שרת' }, both: { color: '#7A4FB8', label: 'גם וגם' } };
  const LOGO = slug => `https://cdn.jsdelivr.net/npm/simple-icons@13/icons/${slug}.svg`;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 24×24 stroke icons for machines that aren't a brand.
  const ICON = {
    laptop: 'M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16',
    phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M12 18h.01',
    server: 'M4 3h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M4 13h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z M6 7h.01 M6 17h.01',
    database: 'M3 5a9 3 0 1 0 18 0a9 3 0 1 0 -18 0 M3 5v14a9 3 0 0 0 18 0V5 M3 12a9 3 0 0 0 18 0',
    cloud: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 1 0 8a4 4 0 1 1 0-8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 7a2 2 0 1 1 0 4a2 2 0 1 1 0-4 M21 15l-3.1-3.1a2 2 0 0 0-2.8 0L6 21',
    gauge: 'M12 14l4-4 M3.34 19a10 10 0 1 1 17.32 0',
    cars: 'M5 17h14v-5l-2-5H7l-2 5z M5 12h14 M7.5 17v2 M16.5 17v2 M8 14.5h.01 M16 14.5h.01',
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z M4 19.5V21h16',
    split: 'M16 3h5v5 M8 3H3v5 M12 22v-8.3a4 4 0 0 0-1.17-2.83L3 3 M21 3l-7.83 7.87',
    route: 'M6 19a3 3 0 1 1 0-6h12a3 3 0 1 0 0-6H9 M6 5a2 2 0 1 1 0 .01 M18 19a2 2 0 1 1 0 .01',
    pencil: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z',
    search: 'M11 3a8 8 0 1 1 0 16a8 8 0 1 1 0-16 M21 21l-4.3-4.3',
    bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0',
    film: 'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M7 3v18 M17 3v18 M3 7.5h4 M3 12h18 M3 16.5h4 M17 7.5h4 M17 16.5h4',
    shield: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    gamepad: 'M6 11h4 M8 9v4 M15 12h.01 M18 10h.01 M17.32 5H6.68a4 4 0 0 0-3.98 3.59l-.9 7.18A2.5 2.5 0 0 0 4.28 18.6c.94 0 1.8-.52 2.24-1.35L7.5 15h9l.98 2.25c.44.83 1.3 1.35 2.24 1.35a2.5 2.5 0 0 0 2.48-2.83l-.9-7.18A4 4 0 0 0 17.32 5z',
    ranking: 'M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3',
    queue: 'M3 5h18 M3 12h18 M3 19h18 M17 3l3 2-3 2',
    save: 'M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M17 21v-7H7v7 M7 3v4h7'
  };

  /* ── The apps ─────────────────────────────────────────────────────────────
   * nodes: x/y are 0..1 on the stage. "You" sit on the right and the chain grows
   *   leftwards, the way Hebrew reads. copies: drawn as a stack — the same server
   *   running as many copies. role: shown in the tooltip and the roles view.
   * steps: one card each. hops play in order; an array of hops plays together.
   *   A hop is [from, to, 'req'|'res'|'push', label] — `push` is the one a nobody
   *   asked for (a notification waking a phone), drawn in its own colour so it
   *   cannot be read as an answer. pick: a load balancer choosing one copy before
   *   forwarding. badge: a status chip left on a node (WhatsApp ticks).
   */
  const APPS = [];
  const app = def => APPS.push(def);

  app({
    id: 'youtube', name: 'YouTube', logo: 'youtube', color: '#FF0000',
    teaser: 'לוחצים על סרטון — ושש קבוצות של מחשבים עובדות בשבילכם.',
    nodes: [
      { id: 'you', label: 'אתם', sub: 'הדפדפן או האפליקציה', icon: 'phone', role: 'client', x: .95, y: .5,
        gives: 'שום דבר — רק מבקשים ומציגים', asks: 'את ה-DNS, את השער של Google ואת שרת הווידאו' },
      { id: 'dns', label: 'DNS', sub: 'ספר הטלפונים של האינטרנט', icon: 'book', role: 'server', x: .72, y: .08,
        gives: 'את הכתובת של שער Google הקרוב אליכם', asks: 'אף אחד במפה שלנו' },
      { id: 'gfe', label: 'השער של Google', sub: 'מאזן עומסים', icon: 'split', role: 'both', x: .68, y: .5,
        gives: 'מקבל כל בקשה ובוחר מחשב פנוי שיענה', asks: 'את שרתי YouTube — מעביר אליהם את הבקשה' },
      { id: 'web', label: 'שרתי האתר', sub: 'שולחים את האפליקציה', logo: 'youtube', copies: 3, color: '#FF0000', role: 'server', x: .38, y: .15,
        gives: 'HTML ו-JavaScript: הכפתורים, הנגן, העיצוב', asks: 'אף אחד במפה שלנו' },
      { id: 'api', label: 'שרתי המידע', sub: 'API של סרטונים', logo: 'youtube', copies: 3, color: '#CC0000', role: 'both', x: .38, y: .56,
        gives: 'שם הסרטון, צפיות, המלצות — וקישור לשרת הווידאו', asks: 'את מסד הנתונים' },
      { id: 'db', label: 'מסד הנתונים', sub: 'אלפי עותקים של MySQL', icon: 'database', copies: 3, role: 'server', x: .06, y: .56,
        gives: 'כל המידע על כל סרטון', asks: 'אף אחד במפה שלנו' },
      { id: 'ggc', label: 'שרת הווידאו הקרוב', sub: 'אצל ספקית האינטרנט', icon: 'film', color: '#B8461F', role: 'both', x: .72, y: .95,
        gives: 'את הסרטון עצמו, בחתיכות קטנות', asks: 'את מחסן הסרטונים, כשחסר לו סרטון' },
      { id: 'store', label: 'מחסן הסרטונים', sub: 'חוות השרתים של Google', icon: 'cloud', copies: 3, role: 'server', x: .3, y: .95,
        gives: 'כל הסרטונים, בכמה עותקים', asks: 'אף אחד במפה שלנו' }
    ],
    steps: [
      { title: 'איפה נמצא YouTube?', hops: [['you', 'dns', 'req', 'איפה youtube.com?'], ['dns', 'you', 'res', 'כאן, קרוב אליכם']],
        text: 'קודם כול הטלפון (<b class="r-client">לקוח</b>) שואל את ה-DNS — <b class="r-server">שרת</b> שעובד כמו ספר טלפונים — מה הכתובת של YouTube. התשובה תלויה במקום שבו אתם נמצאים: מקבלים כניסה קרובה.' },
      { title: 'מביאים את האפליקציה', pick: ['gfe', 'web'],
        hops: [['you', 'gfe', 'req', 'תנו לי את YouTube'], ['gfe', 'web', 'req', 'בקשה'], ['web', 'gfe', 'res', 'HTML + JS'], ['gfe', 'you', 'res', 'האפליקציה']],
        text: 'הבקשה מגיעה ל<b>שער של Google</b> — מאזן עומסים. לשרתי האתר יש הרבה עותקים, והשער בוחר עותק פנוי. השער הוא <b class="r-both">גם וגם</b>: שרת בשבילכם, ולקוח של שרתי האתר.' },
      { title: 'מבקשים מידע על הסרטון', pick: ['gfe', 'api'],
        hops: [['you', 'gfe', 'req', 'מה בסרטון הזה?'], ['gfe', 'api', 'req', 'בקשה'], ['api', 'db', 'req', 'שם, צפיות, לייקים'], ['db', 'api', 'res', 'הנה'], ['api', 'gfe', 'res', 'מידע + קישור'], ['gfe', 'you', 'res', 'מידע + קישור']],
        text: 'עכשיו האפליקציה מבקשת מידע. שרת המידע הוא <b class="r-both">גם וגם</b>: הוא עונה לכם, אבל קודם הופך ל<b class="r-client">לקוח</b> של מסד הנתונים. בתשובה יש גם קישור לשרת הווידאו.' },
      { title: 'הסרטון מגיע בחתיכות',
        hops: [['you', 'ggc', 'req', 'חתיכה 1'], ['ggc', 'you', 'res', '▶ כמה שניות'], ['you', 'ggc', 'req', 'חתיכה 2'], ['ggc', 'you', 'res', '▶ עוד כמה']],
        text: 'הסרטון לא מגיע מרחוק, אלא משרת של Google שנמצא <b>אצל ספקית האינטרנט שלכם</b>. הנגן מבקש חתיכה אחרי חתיכה, ובוחר איכות לפי מהירות האינטרנט.' },
      { title: 'ואם לשרת הקרוב אין את הסרטון?',
        hops: [['ggc', 'store', 'req', 'חסר לי סרטון'], ['store', 'ggc', 'res', 'קבל עותק'], ['ggc', 'you', 'res', '▶ חתיכה']],
        text: 'שרת הווידאו הופך ל<b class="r-client">לקוח</b> ומביא עותק ממחסן הסרטונים. מעכשיו הסרטון שמור אצלו, והשכנים שלכם יקבלו אותו מהר.' }
    ],
    fact: 'בשביל סרטון אחד עבדו בשבילכם שישה סוגים של מחשבים — ושלושה מהם היו <b class="r-both">גם וגם</b>. וואו: לפי Google, השרתים שבתוך ספקיות האינטרנט שולחים 70%–90% מהתוכן. וב-2019 הועלו ל-YouTube יותר מ-500 שעות וידאו בכל דקה.'
  });

  app({
    id: 'whatsapp', name: 'WhatsApp', logo: 'whatsapp', color: '#25D366',
    teaser: 'לקוח → שרת → לקוח. ומה בעצם אומרים ✓, ✓✓ ו-✓✓ הכחולים?',
    nodes: [
      { id: 'you', label: 'הטלפון שלכם', sub: 'שולחים הודעה', icon: 'phone', role: 'client', x: .95, y: .38,
        gives: 'שום דבר — שולח הודעות ומקבל אישורים', asks: 'את שרת WhatsApp' },
      { id: 'wa', label: 'שרת WhatsApp', sub: 'מעביר הודעות נעולות', logo: 'whatsapp', color: '#25D366', copies: 2, role: 'both', x: .5, y: .38,
        gives: 'מעביר הודעות ואישורים, ושומר הודעה עד שהיא נמסרת', asks: 'את שירות ההתראות — כדי להעיר טלפון' },
      { id: 'push', label: 'שירות ההתראות', sub: 'של Apple או של Google', icon: 'bell', role: 'server', x: .28, y: .92,
        gives: 'מקפיץ התראה בטלפון, גם כשהאפליקציה סגורה', asks: 'אף אחד במפה שלנו' },
      { id: 'friend', label: 'הטלפון של נועה', sub: 'מקבלת את ההודעה', icon: 'phone', role: 'client', x: .05, y: .38,
        gives: 'שום דבר — מקבל הודעות ושולח אישורים', asks: 'את שרת WhatsApp: "יש לי הודעות?"' }
    ],
    steps: [
      { title: 'שולחים הודעה נעולה', hops: [['you', 'wa', 'req', '🔒 מגיעה לאימון?']],
        text: 'הטלפון שלכם (<b class="r-client">לקוח</b>) נועל את ההודעה בהצפנה ושולח אותה ל<b class="r-server">שרת</b>. רק הטלפון של נועה יכול לפתוח את המנעול — גם WhatsApp לא יכולה לקרוא.' },
      { title: '✓ אחד: השרת קיבל', hops: [['wa', 'you', 'res', 'קיבלתי']], badge: ['you', '✓', '#8E8E8E'],
        text: 'השרת עונה "קיבלתי", ומופיע <b>✓ אחד אפור</b>. המשמעות: ההודעה אצל השרת, אבל עוד לא אצל נועה.' },
      { title: 'נועה לא מחוברת — מעירים את הטלפון', hops: [['wa', 'push', 'req', 'תעירו את נועה'], ['push', 'friend', 'push', '🔔 הודעה חדשה']],
        text: 'הטלפון של נועה בכיס, והאפליקציה סגורה. השרת שומר את ההודעה, והופך ל<b class="r-client">לקוח</b> של שירות ההתראות של Apple או Google: "תעירו את הטלפון שלה". שימו לב לחץ הסגול: ההתראה מגיעה לטלפון <b>בלי שהוא ביקש כלום</b> — זו לא תשובה לבקשה.' },
      { title: 'הטלפון של נועה מבקש את ההודעה', hops: [['friend', 'wa', 'req', 'יש לי הודעות?'], ['wa', 'friend', 'res', '🔒 ההודעה']],
        text: 'גם הטלפון של נועה הוא <b class="r-client">לקוח</b>: הוא פונה לשרת ומוריד את ההודעה, ורק בו פותחים את המנעול. אחרי שההודעה נמסרה, השרת מוחק אותה.' },
      { title: '✓✓ אפורים: נמסר', hops: [['friend', 'wa', 'req', 'נמסר'], ['wa', 'you', 'res', 'נמסר']], badge: ['you', '✓✓', '#8E8E8E'],
        text: 'הטלפון של נועה שולח לבד אישור "נמסר", והשרת מעביר אותו אליכם: <b>✓✓ אפורים</b>. ההודעה כבר בטלפון שלה, אבל היא עוד לא קראה.' },
      { title: '✓✓ כחולים: נקרא', hops: [['friend', 'wa', 'req', 'נקרא'], ['wa', 'you', 'res', 'נקרא']], badge: ['you', '✓✓', '#34B7F1'],
        text: 'נועה פתחה את הצ\'אט. עוד אישור יוצא מהטלפון שלה, עובר דרך השרת ומגיע אליכם: <b style="color:#1E9BD7">✓✓ כחולים</b>.' }
    ],
    fact: 'לקוח → שרת → לקוח, ושלושה אישורים חוזרים באותה דרך. השרת היה <b class="r-both">גם וגם</b>: הוא עונה לטלפונים, וגם פונה בעצמו לשירות ההתראות. וואו: ב-2020 עברו ב-WhatsApp בערך 100 מיליארד הודעות ביום. וכבר ב-2012 שרת אחד החזיק יותר מ-2 מיליון טלפונים מחוברים בבת אחת.'
  });

  app({
    id: 'waze', name: 'Waze', logo: 'waze', color: '#33CCFF',
    teaser: 'איך Waze יודע שיש פקק? כי כל נהג הוא גם מקור מידע.',
    nodes: [
      { id: 'you', label: 'אתם ברכב', sub: 'Waze בטלפון', icon: 'phone', role: 'client', x: .95, y: .5,
        gives: 'שום דבר — אבל שולחים מיקום ומהירות', asks: 'את החיפוש, את שרת הניווט ואת שרתי התנועה' },
      { id: 'drivers', label: 'נהגים אחרים', sub: 'עוד המון טלפונים בדרך', icon: 'cars', copies: 3, role: 'client', x: .95, y: .08,
        gives: 'שום דבר — אבל כל הזמן שולחים מיקום ומהירות', asks: 'את שרתי התנועה' },
      { id: 'traffic', label: 'שרתי התנועה', sub: 'מגלים איפה יש פקק', icon: 'gauge', copies: 2, color: '#0A8FBF', role: 'both', x: .55, y: .08,
        gives: 'כמה מהר נוסעים בכל כביש עכשיו, ודיווחים', asks: 'שולחים דיווחים גם ל-Google Maps' },
      { id: 'route', label: 'שרת הניווט', sub: 'מסלול וזמן הגעה', logo: 'waze', color: '#33CCFF', copies: 2, role: 'both', x: .55, y: .5,
        gives: 'המסלול המהיר וזמן ההגעה', asks: 'את שרתי התנועה ואת המפה' },
      { id: 'map', label: 'המפה של Waze', sub: 'כל כביש, נתיב ופנייה', icon: 'route', role: 'server', x: .07, y: .5,
        gives: 'כבישים ופניות — מפה של Waze עצמה, לא של Google', asks: 'אף אחד במפה שלנו' },
      { id: 'editors', label: 'עורכי מפה מתנדבים', sub: 'במחשב בבית', icon: 'pencil', copies: 3, role: 'client', x: .07, y: .08,
        gives: 'שום דבר — שולחים תיקונים למפה', asks: 'את המפה של Waze' },
      { id: 'search', label: 'חיפוש מקומות', sub: 'כתובות ועסקים', icon: 'search', role: 'both', x: .55, y: .95,
        gives: 'תוצאות חיפוש', asks: 'את המקומות של Google Maps' },
      { id: 'gmaps', label: 'Google Maps', sub: 'מקומות ועסקים', logo: 'googlemaps', color: '#4285F4', role: 'server', x: .07, y: .95,
        gives: 'מידע על מקומות ועסקים — ומקבל מ-Waze דיווחים על תאונות', asks: 'אף אחד במפה שלנו' }
    ],
    steps: [
      { title: 'כל הנהגים מדווחים — גם בלי ללחוץ', hops: [[['drivers', 'traffic', 'req', '📍 90 קמ״ש'], ['you', 'traffic', 'req', '📍 30 קמ״ש']], ['drivers', 'traffic', 'req', '🚓 משטרה']],
        text: 'כל טלפון עם Waze (<b class="r-client">לקוח</b>) שולח כל הזמן מיקום ומהירות. שרתי התנועה משווים את זה למהירות הרגילה בכביש: אם כולם זוחלים, יש פקק. נהגים גם מדווחים בלחיצה: משטרה, תאונה, מפגע.' },
      { title: 'מתנדבים מתקנים את המפה', hops: [['editors', 'map', 'req', '✏️ כביש חדש'], ['map', 'editors', 'res', 'עודכן ✓']],
        text: 'ל-Waze יש מפה משלה, ומתנדבים מעדכנים אותה: מוסיפים כבישים, פניות ושינויים. המחשב של כל מתנדב הוא <b class="r-client">לקוח</b>, והמפה היא <b class="r-server">שרת</b>.' },
      { title: 'מחפשים לאן לנסוע', hops: [['you', 'search', 'req', 'בית ספר רמות'], ['search', 'gmaps', 'req', 'מקומות?'], ['gmaps', 'search', 'res', 'המקומות'], ['search', 'you', 'res', 'תוצאות']],
        text: 'החיפוש משלב מקומות של Waze עם מקומות של <b>Google Maps</b> — Google קנתה את Waze ב-2013. החיפוש הוא <b class="r-both">גם וגם</b>: הוא עונה לכם, ושואל את Google.' },
      { title: 'שרת הניווט מחשב מסלול', hops: [['you', 'route', 'req', 'מסלול לבית הספר?'], [['route', 'traffic', 'req', 'מהירויות עכשיו'], ['route', 'map', 'req', 'כבישים']], [['traffic', 'route', 'res', 'איילון פקוק'], ['map', 'route', 'res', 'כבישים ופניות']], ['route', 'you', 'res', 'מסלול · 12 דק׳']],
        text: 'שרת הניווט הוא <b class="r-both">גם וגם</b>: הוא <b class="r-client">לקוח</b> של שרתי התנועה ושל המפה, ומחבר הכול למסלול. לחלקים של הדרך שתגיעו אליהם רק מאוחר יותר, הוא משתמש גם במהירויות מהעבר, באותה שעה ובאותו יום.' },
      { title: 'בזמן הנסיעה', hops: [['you', 'traffic', 'req', '📍 מיקום'], ['traffic', 'you', 'res', '⚠️ תאונה לפניכם'], ['traffic', 'gmaps', 'req', 'דיווח על תאונה']],
        text: 'אתם ממשיכים לשלוח מיקום ומקבלים התראות. דיווחים של נהגי Waze מופיעים גם ב-Google Maps: כאן שרתי התנועה הם <b class="r-client">לקוח</b> שמוסר מידע.' }
    ],
    fact: 'אתם בבת אחת <b class="r-client">לקוח</b> שמבקש מסלול, ומקור מידע שעוזר לכל שאר הנהגים. וואו: Waze נולדה בישראל, ו-Google קנתה אותה ב-2013 בכ-1.1 מיליארד דולר. מתנדבים עושים במפה שלה יותר מ-20 מיליון עריכות בחודש.'
  });

  app({
    id: 'instagram', name: 'Instagram', logo: 'instagram', color: '#E4405F',
    teaser: 'פותחים את הפיד, עושים לייק, מעלים תמונה — מה קורה מאחורי הקלעים?',
    nodes: [
      { id: 'you', label: 'אתם', sub: 'אפליקציית Instagram', icon: 'phone', role: 'client', x: .95, y: .5,
        gives: 'שום דבר — מבקשים, מעלים ועושים לייק', asks: 'את שרת הקצה של Meta ואת שרת התמונות הקרוב' },
      { id: 'edge', label: 'שרת קצה של Meta', sub: 'מאזן עומסים קרוב אליכם', icon: 'split', copies: 2, color: '#0866FF', role: 'both', x: .7, y: .5,
        gives: 'מקבל את הבקשה ובוחר שרת פנוי', asks: 'את שרתי Instagram' },
      { id: 'app', label: 'שרתי Instagram', sub: 'Python + Django', logo: 'instagram', color: '#E4405F', copies: 3, role: 'both', x: .42, y: .5,
        gives: 'הפיד, הלייקים והפוסטים שלכם', asks: 'את מסדי הנתונים, את דירוג הפיד ואת עובדי הרקע' },
      { id: 'rank', label: 'דירוג הפיד', sub: 'מחליט מה יופיע ראשון', icon: 'ranking', role: 'server', x: .12, y: .12,
        gives: 'סדר הפוסטים: מה הכי סביר שתאהבו', asks: 'אף אחד במפה שלנו' },
      { id: 'db', label: 'מסדי הנתונים', sub: 'עותקים בכמה מקומות בעולם', icon: 'database', copies: 3, role: 'server', x: .12, y: .5,
        gives: 'מי עוקב אחרי מי, פוסטים, כיתובים ולייקים', asks: 'אף אחד במפה שלנו' },
      { id: 'jobs', label: 'עובדי רקע', sub: 'משימות שלא חייבות לקרות מיד', icon: 'queue', copies: 2, role: 'both', x: .3, y: .92,
        gives: 'מפיצים פוסט חדש לעוקבים ושולחים התראות', asks: 'את שירות ההתראות' },
      { id: 'push', label: 'שירות ההתראות', sub: 'של Apple או של Google', icon: 'bell', role: 'server', x: .05, y: .92,
        gives: 'מקפיץ "נועה העלתה תמונה" בטלפונים', asks: 'אף אחד במפה שלנו' },
      { id: 'cdn', label: 'שרת תמונות קרוב', sub: 'אצל ספקית האינטרנט', icon: 'image', color: '#B8461F', role: 'both', x: .82, y: .95,
        gives: 'את התמונות והסרטונים עצמם, מהר', asks: 'את אחסון התמונות, כשחסרה לו תמונה' },
      { id: 'store', label: 'אחסון התמונות', sub: 'כל קובץ בכמה גדלים', icon: 'cloud', copies: 3, role: 'server', x: .55, y: .95,
        gives: 'כל תמונה וסרטון שאי-פעם הועלו', asks: 'אף אחד במפה שלנו' }
    ],
    steps: [
      { title: 'פותחים את הפיד', pick: ['edge', 'app'],
        hops: [['you', 'edge', 'req', 'הפיד שלי'], ['edge', 'app', 'req', 'בקשה'], [['app', 'db', 'req', 'אחרי מי עוקבים?'], ['app', 'rank', 'req', 'מה קודם?']], [['db', 'app', 'res', 'פוסטים'], ['rank', 'app', 'res', 'הסדר']], ['app', 'edge', 'res', 'פוסטים + קישורים'], ['edge', 'you', 'res', 'הפיד']],
        text: 'הבקשה מגיעה לשרת קצה של Meta — מאזן עומסים — שבוחר שרת Instagram פנוי. שרת Instagram הוא <b class="r-both">גם וגם</b>: הוא <b class="r-client">לקוח</b> של מסדי הנתונים ושל דירוג הפיד, שבוחר מתוך מאות פוסטים מה להראות לכם קודם.' },
      { title: 'התמונות מגיעות משרת קרוב', hops: [[['you', 'cdn', 'req', 'תמונה 1'], ['you', 'cdn', 'req', 'תמונה 2']], [['cdn', 'you', 'res', '🖼️'], ['cdn', 'you', 'res', '🖼️']]],
        text: 'בפיד יש רק קישורים לתמונות. את התמונות עצמן הטלפון מביא משרת תמונות שנמצא קרוב אליכם, לפעמים ממש אצל ספקית האינטרנט — ככה הגלילה מהירה.' },
      { title: 'ואם חסרה תמונה?', hops: [['cdn', 'store', 'req', 'חסרה לי תמונה'], ['store', 'cdn', 'res', 'קבל'], ['cdn', 'you', 'res', '🖼️']],
        text: 'שרת התמונות הופך ל<b class="r-client">לקוח</b> של אחסון התמונות, מביא עותק, ושומר אותו אצלו בשביל הבא בתור.' },
      { title: 'עושים לייק', hops: [['you', 'edge', 'req', '❤️ לייק'], ['edge', 'app', 'req', 'לייק'], ['app', 'db', 'req', 'שמרו לייק'], ['db', 'app', 'res', 'נשמר ✓'], ['app', 'edge', 'res', '✓'], ['edge', 'you', 'res', '✓']],
        text: 'הלייק נשמר במסד הנתונים, ומשם מועתק למקומות נוספים בעולם. ככה גם אם חוות שרתים אחת נופלת — הלייק שלכם לא הולך לאיבוד.' },
      { title: 'מעלים תמונה חדשה', hops: [['you', 'edge', 'req', '📷 פוסט חדש'], ['edge', 'app', 'req', 'פוסט'], ['app', 'store', 'req', 'שמרו בכמה גדלים'], ['store', 'app', 'res', 'נשמר'], ['app', 'edge', 'res', 'פורסם ✓'], ['edge', 'you', 'res', 'פורסם ✓'], ['app', 'jobs', 'req', 'ספרו לעוקבים'], ['jobs', 'push', 'req', '🔔 תודיעו לנועה']],
        text: 'התמונה נשמרת בכמה גדלים — לטלפון קטן, למסך גדול, לאינטרנט איטי. ואחר כך, ברקע, עובדי הרקע (<b class="r-both">גם וגם</b>) מפיצים את הפוסט לעוקבים ומבקשים משירות ההתראות להודיע להם.' }
    ],
    fact: 'כמעט כל שרת כאן היה <b class="r-both">גם וגם</b> — שרת למי שפונה אליו, ולקוח של מישהו אחר. וואו: ב-2011 כל Instagram רצה על כ-25 שרתי אפליקציה שכורים. היום היא רצה בחוות השרתים של Meta, ומדרגת לכל משתמש מאות פוסטים בכל פעם שהוא פותח את הפיד.'
  });

  app({
    id: 'roblox', name: 'Roblox', logo: 'roblox', color: '#2B2D31',
    teaser: 'לוחצים Play — מי בוחר את השרת, ומי מחליט מה באמת קרה במשחק?',
    nodes: [
      { id: 'you', label: 'אתם', sub: 'אפליקציית Roblox', icon: 'gamepad', role: 'client', x: .95, y: .5,
        gives: 'שום דבר — מציגים את העולם ושולחים לחיצות', asks: 'את שרתי Roblox, את שירות ההתאמה ואת שרת המשחק' },
      { id: 'web', label: 'שרתי Roblox', sub: 'חשבון, משחקים, מטבעות', logo: 'roblox', color: '#2B2D31', copies: 2, role: 'server', x: .66, y: .08,
        gives: 'כניסה לחשבון ורשימת המשחקים', asks: 'אף אחד במפה שלנו' },
      { id: 'match', label: 'שירות ההתאמה', sub: 'בוחר לכם שרת', icon: 'users', role: 'server', x: .66, y: .5,
        gives: 'שרת משחק קרוב ומתאים', asks: 'אף אחד במפה שלנו' },
      { id: 'game', label: 'שרת המשחק', sub: 'מרכז נתונים קרוב', icon: 'server', copies: 2, color: '#00A2FF', role: 'both', x: .35, y: .5,
        gives: 'מריץ את המשחק ומחליט מה באמת קרה', asks: 'את שמירת ההתקדמות ואת סינון הצ\'אט' },
      { id: 'players', label: 'שחקנים אחרים', sub: 'באותו שרת', icon: 'gamepad', copies: 3, role: 'client', x: .66, y: .95,
        gives: 'שום דבר — גם הם שולחים לחיצות', asks: 'את שרת המשחק' },
      { id: 'save', label: 'שמירת התקדמות', sub: 'DataStore', icon: 'save', copies: 2, role: 'server', x: .06, y: .12,
        gives: 'שומר ומחזיר את ההתקדמות של כל שחקן', asks: 'אף אחד במפה שלנו' },
      { id: 'filter', label: 'סינון צ\'אט', sub: 'בודק כל הודעה', icon: 'shield', copies: 2, role: 'server', x: .06, y: .88,
        gives: 'בודק שהודעה בטוחה לפני שמישהו רואה אותה', asks: 'אף אחד במפה שלנו' }
    ],
    steps: [
      { title: 'נכנסים ל-Roblox', hops: [['you', 'web', 'req', 'התחברות + משחקים'], ['web', 'you', 'res', 'הנה המשחקים']],
        text: 'האפליקציה (<b class="r-client">לקוח</b>) מתחברת לשרתי Roblox (<b class="r-server">שרת</b>) ומקבלת את החשבון שלכם ואת רשימת המשחקים.' },
      { title: 'לוחצים Play — מחפשים שרת', hops: [['you', 'match', 'req', 'Play! איפה משחקים?'], ['match', 'you', 'res', 'שרת קרוב + כרטיס']],
        text: 'שירות ההתאמה בודק איזה שרת משחק קרוב אליכם, כמה זמן לוקח לבקשה להגיע אליו, ואם יש בו מקום — ובוחר את הכי מתאים. ל-Roblox יש מרכזי נתונים בערך בעשרים וארבעה מקומות בעולם.' },
      { title: 'מצטרפים — והעולם מגיע', hops: [['you', 'game', 'req', 'אני נכנס'], ['game', 'save', 'req', 'מה ההתקדמות שלו?'], ['save', 'game', 'res', 'שלב 12, 340 מטבעות'], ['game', 'you', 'res', 'העולם + ההתקדמות']],
        text: 'שרת המשחק הוא <b class="r-both">גם וגם</b>: הוא שולח לכם את העולם, אבל קודם הופך ל<b class="r-client">לקוח</b> של שירות שמירת ההתקדמות, כדי לדעת איפה עצרתם.' },
      { title: 'השרת הוא השופט', hops: [[['you', 'game', 'req', '⬆ קפצתי'], ['players', 'game', 'req', '🏃 רץ']], [['game', 'you', 'res', 'מה קרה'], ['game', 'players', 'res', 'מה קרה']]],
        text: 'המכשירים שולחים רק מה השחקן עשה. שרת המשחק קובע מה באמת קרה ושולח לכולם את אותה תמונה — ככה קשה לרמות, וכולם רואים את אותו עולם.' },
      { title: 'צ\'אט עובר סינון', hops: [['you', 'game', 'req', '💬 היי'], ['game', 'filter', 'req', 'זה בטוח?'], ['filter', 'game', 'res', 'בטוח ✓'], ['game', 'players', 'res', '💬 היי']],
        text: 'לפני שמישהו רואה הודעה, שרת המשחק (<b class="r-client">לקוח</b>) שולח אותה לשירות הסינון (<b class="r-server">שרת</b>). רק הודעה שעברה בדיקה מגיעה לשחקנים.' },
      { title: 'שומרים התקדמות', hops: [['game', 'save', 'req', 'שמרו: שלב 13'], ['save', 'game', 'res', 'נשמר ✓']],
        text: 'עליתם שלב? שרת המשחק שומר את ההתקדמות, כדי שמחר תמשיכו מאותה נקודה — גם ממכשיר אחר.' }
    ],
    fact: 'שרת המשחק היה <b class="r-both">גם וגם</b>: שופט ושרת בשביל השחקנים, ולקוח של שמירת ההתקדמות ושל סינון הצ\'אט. וואו: ביוני 2025 שיחקו ב-Roblox יותר מ-30 מיליון שחקנים בבת אחת, ובכל יום עוברות בה מיליארדי הודעות צ\'אט — כולן דרך סינון.'
  });

  const APP = Object.fromEntries(APPS.map(a => [a.id, a]));
  const flatHops = step => step.hops.flatMap(h => Array.isArray(h[0]) ? h : [h]);

  /* ── State ───────────────────────────────────────────────────────────────── */
  const state = { app: null, step: 0, roles: true };  // the roles view is the point of the slide — on by default
  let stage, layer, bg, nodes = {}, edges = [], playToken = 0, ambientTimer = null, idleAnim = null, wired = false;
  const logoImages = {};
  const listeners = [];
  const $ = id => document.getElementById(id);
  const current = () => APP[state.app] || null;
  const emit = () => listeners.forEach(fn => { try { fn(publicState()); } catch (e) {} });

  const labelOf = (a, id) => a.nodes.find(n => n.id === id).label;

  function publicState() {
    const a = current();
    if (!a) return { example: null };
    const step = a.steps[state.step];
    const label = id => labelOf(a, id);
    return {
      example: a.id, step: state.step + 1, steps: a.steps.length + 1, title: step ? step.title : 'מה למדנו',
      // The summary card has no hops — an empty list, not a sentinel string.
      hops: step ? flatHops(step).map(([f, t, k, l]) => ({ from: label(f), to: label(t), kind: k === 'req' ? 'request' : k === 'push' ? 'push (nobody asked)' : 'response', label: l })) : []
    };
  }

  /* ── Logos: simple-icons SVG painted white ───────────────────────────────── */
  function loadLogo(slug) {
    if (!logoImages[slug]) {
      logoImages[slug] = fetch(LOGO(slug)).then(r => r.ok ? r.text() : Promise.reject())
        .then(svg => new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg fill="#ffffff" '));
        })).catch(() => null);
    }
    return logoImages[slug];
  }

  /* ── Scenes ──────────────────────────────────────────────────────────────── */
  function homeScene() {
    const list = [{ id: 'you', label: 'אתם', sub: 'הטלפון או המחשב שלכם', icon: 'laptop', role: 'client', x: .5, y: .5, big: true,
      gives: 'שום דבר — אתם רק מבקשים', asks: APPS.map(a => a.name).join(', ') }];
    APPS.forEach((a, i) => {
      const t = (-90 + i * 360 / APPS.length) * Math.PI / 180;
      list.push({ id: 'app:' + a.id, app: a.id, label: a.name, sub: a.teaser, logo: a.logo, color: a.color, x: .5 + Math.cos(t) * .36, y: .48 + Math.sin(t) * .44, home: true });
    });
    return { nodes: list, links: APPS.map(a => ['you', 'app:' + a.id]) };
  }
  function appScene(a) {
    const seen = new Set(), links = [];
    a.steps.forEach(s => flatHops(s).forEach(([f, t]) => {
      const key = [f, t].sort().join('|');
      if (!seen.has(key)) { seen.add(key); links.push([f, t]); }
    }));
    return { nodes: a.nodes, links };
  }
  const radius = n => n.big ? 40 : n.home ? 34 : 26;

  function build() {
    const host = $('netStage');
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    if (!stage) {
      stage = new Konva.Stage({ container: host, width: w, height: h });
      bg = new Konva.Layer({ listening: false });
      layer = new Konva.Layer();
      stage.add(bg, layer);
    } else stage.size({ width: w, height: h });
    bg.destroyChildren();
    bg.add(new Konva.Shape({
      sceneFunc(ctx) {
        ctx.fillStyle = '#E6D6BC';
        for (let x = 13; x < w; x += 26) for (let y = 13; y < h; y += 26) { ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill(); }
      }
    }));
    bg.batchDraw();
    drawScene(false);
  }

  // Node centers keep room for the name and subtitle under each circle.
  function place(n) {
    const w = stage.width(), h = stage.height();
    const px = Math.min(96, w * 0.1), top = 56, bottom = 70;
    return { x: px + n.x * (w - 2 * px), y: top + n.y * (h - top - bottom) };
  }

  function drawScene(animate) {
    playToken++;
    stopAmbient();
    hideTip();
    layer.destroyChildren();
    nodes = {};
    edges = [];
    const a = current();
    const scene = a ? appScene(a) : homeScene();
    const pos = Object.fromEntries(scene.nodes.map(n => [n.id, place(n)]));

    scene.links.forEach(([f, t]) => {
      const p = pos[f], q = pos[t];
      const line = new Konva.Line({ points: [p.x, p.y, q.x, q.y], stroke: LINE, strokeWidth: 2, dash: [2, 7], lineCap: 'round', listening: false });
      layer.add(line);
      edges.push({ key: [f, t].sort().join('|'), line });
    });

    scene.nodes.forEach((n, i) => {
      const p = pos[n.id], r = radius(n);
      const g = new Konva.Group({ x: p.x, y: p.y });
      const halo = new Konva.Circle({ radius: r + 10, fill: n.color || INK, opacity: 0.07 });
      g.add(halo);
      for (let c = (n.copies || 1) - 1; c > 0; c--) {
        g.add(new Konva.Circle({ radius: r, x: -c * 8, y: -c * 6, fill: n.color || '#3A3028', opacity: c === 1 ? 0.55 : 0.3, stroke: '#FBF3E7', strokeWidth: 2 }));
      }
      const ring = new Konva.Circle({ radius: r + 5, stroke: n.role ? ROLE[n.role].color : 'transparent', strokeWidth: 3, opacity: 0 });
      const base = new Konva.Circle({ radius: r, fill: n.big ? REQ : (n.color || '#3A3028'), stroke: '#FBF3E7', strokeWidth: 2,
        shadowColor: INK, shadowBlur: 14, shadowOpacity: 0.2, shadowOffsetY: 5 });
      g.add(ring, base);
      const size = n.big ? 32 : n.home ? 30 : 22;
      if (n.logo) {
        loadLogo(n.logo).then(img => {
          if (!g.getLayer()) return;
          g.add(img
            ? new Konva.Image({ image: img, width: size, height: size, x: -size / 2, y: -size / 2, listening: false })
            : new Konva.Text({ text: n.label.slice(0, 1), fontSize: 20, fontStyle: 'bold', fill: '#fff', width: r * 2, x: -r, y: -11, align: 'center', listening: false }));
          layer.batchDraw();
        });
      } else {
        const s = size / 24;
        g.add(new Konva.Path({ data: ICON[n.icon], stroke: '#fff', strokeWidth: 2, lineCap: 'round', lineJoin: 'round', scaleX: s, scaleY: s, x: -12 * s, y: -12 * s, listening: false }));
      }
      const name = new Konva.Text({ text: n.label, fontFamily: 'Rubik, sans-serif', direction: 'rtl', fontSize: n.big || n.home ? 15 : 13, fontStyle: n.big || n.home ? 'bold' : '600',
        fill: INK, width: 150, x: -75, y: r + 8, align: 'center', lineHeight: 1.15, listening: false });
      g.add(name);
      if (n.sub && !n.home) g.add(new Konva.Text({ text: n.sub, fontFamily: 'Rubik, sans-serif', direction: 'rtl', fontSize: 11.5, fill: '#8E7B62', width: 150, x: -75,
        y: r + 10 + name.height(), align: 'center', lineHeight: 1.15, listening: false }));
      const badge = new Konva.Label({ x: r - 6, y: -r - 10, visible: false, listening: false });
      badge.add(new Konva.Tag({ fill: '#fff', cornerRadius: 999, stroke: '#E0D0B7', strokeWidth: 1, shadowColor: INK, shadowBlur: 6, shadowOpacity: 0.15 }));
      badge.add(new Konva.Text({ text: '', fontFamily: 'Rubik, sans-serif', direction: 'rtl', fontSize: 15, fontStyle: 'bold', padding: 6, fill: '#8E8E8E' }));
      g.add(badge);

      g.on('mouseenter', () => { $('netStage').style.cursor = 'pointer'; showTip(n, g); bump(g); });
      g.on('mouseleave', () => { $('netStage').style.cursor = ''; hideTip(); });
      g.on('click tap', () => { if (n.app) select(n.app); else showTip(n, g); });
      layer.add(g);
      nodes[n.id] = { g, ring, base, halo, badge };

      if (animate && !REDUCED) {
        g.opacity(0); g.scale({ x: 0.6, y: 0.6 });
        g.to({ opacity: 1, scaleX: 1, scaleY: 1, duration: 0.45, delay: 0.035 * i, easing: Konva.Easings.BackEaseOut });
      }
    });
    if (animate && !REDUCED) edges.forEach(e => { e.line.opacity(0); e.line.to({ opacity: 1, duration: 0.5, delay: 0.25 }); });

    applyRoles();
    if (!a) startAmbient();
    layer.batchDraw();
  }

  /* ── Look ────────────────────────────────────────────────────────────────── */
  function applyRoles() {
    Object.values(nodes).forEach(({ ring }) => ring.opacity(state.roles ? 1 : 0));
    document.querySelector('.net-legend')?.classList.toggle('on', state.roles);
    layer && layer.batchDraw();
  }

  function highlight() {
    const a = current(), step = a && a.steps[state.step];
    const active = new Set(), lines = new Set();
    if (step) flatHops(step).forEach(([f, t]) => { active.add(f); active.add(t); lines.add([f, t].sort().join('|')); });
    Object.entries(nodes).forEach(([id, { g }]) => g.to({ opacity: !step || active.has(id) ? 1 : 0.3, duration: 0.25 }));
    edges.forEach(e => {
      const on = lines.has(e.key);
      e.line.stroke(on ? '#9C7B57' : LINE); e.line.strokeWidth(on ? 3 : 2); e.line.dash(on ? [] : [2, 7]);
      e.line.to({ opacity: !step || on ? 1 : 0.5, duration: 0.25 });
    });
  }

  function bump(g) {
    if (REDUCED) return;
    g.to({ scaleX: 1.07, scaleY: 1.07, duration: 0.12, onFinish: () => g.to({ scaleX: 1, scaleY: 1, duration: 0.18 }) });
  }

  function showBadge([id, text, color], animate) {
    const b = nodes[id] && nodes[id].badge;
    if (!b) return;
    b.getText().text(text); b.getText().fill(color); b.visible(true);
    if (animate && !REDUCED) { b.scale({ x: 0.3, y: 0.3 }); b.to({ scaleX: 1, scaleY: 1, duration: 0.35, easing: Konva.Easings.BackEaseOut }); }
    layer.batchDraw();
  }
  // Badges show what the earlier steps reached (the ticks so far).
  function restoreBadges() {
    Object.values(nodes).forEach(({ badge }) => badge.visible(false));
    current().steps.slice(0, state.step).forEach(s => s.badge && showBadge(s.badge, false));
  }

  /* ── Packets ─────────────────────────────────────────────────────────────── */
  function packet([from, to, kind, label], token) {
    return new Promise(resolve => {
      if (!nodes[from] || !nodes[to]) return resolve(true);
      const color = kind === 'req' ? REQ : kind === 'push' ? PUSH : RES;
      const a = nodes[from].g.position(), b = nodes[to].g.position();
      const g = new Konva.Group({ x: a.x, y: a.y, listening: false, name: 'packet' });
      g.add(new Konva.Circle({ radius: 7, fill: color, shadowColor: color, shadowBlur: 14, shadowOpacity: 0.9 }));
      if (label) {
        const tag = new Konva.Label({ y: -14 });
        tag.add(new Konva.Tag({ fill: color, cornerRadius: 999, pointerDirection: 'down', pointerWidth: 8, pointerHeight: 5 }));
        tag.add(new Konva.Text({ text: label, fontFamily: 'Rubik, sans-serif', direction: 'rtl', fontSize: 13, fontStyle: '600', padding: 6, fill: '#fff' }));
        tag.offsetX(tag.width() / 2);
        g.add(tag);
      }
      layer.add(g);
      const land = () => {
        if (token !== playToken) { g.destroy(); return resolve(false); }
        bump(nodes[to].g);
        if (label) trace(from, to, kind, label, color);
        g.to({ opacity: 0, duration: 0.18, onFinish: () => { g.destroy(); resolve(token === playToken); } });
      };
      if (REDUCED) { g.position(b); setTimeout(land, 700); return; }
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      g.to({ x: b.x, y: b.y, duration: Math.min(1.6, 0.6 + d / 800), easing: Konva.Easings.EaseInOut, onFinish: land });
    });
  }

  /* Every hop that already happened leaves a numbered chip on its line: when the
   * packets are gone, the whole exchange is still on the map, in order. */
  let traceCount = 0;
  function trace(from, to, kind, label, color) {
    const a = nodes[from].g.position(), b = nodes[to].g.position();
    const t = 0.5 + (kind === 'req' ? -0.06 : 0.06);
    const away = kind === 'req' ? -13 : 13;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const g = new Konva.Group({ x: a.x + dx * t - dy / len * away, y: a.y + dy * t + dx / len * away, listening: false, name: 'trace', opacity: 0 });
    const tag = new Konva.Label();
    tag.add(new Konva.Tag({ fill: '#FBF3E7', stroke: color, strokeWidth: 1.5, cornerRadius: 999 }));
    tag.add(new Konva.Text({ text: ++traceCount + '. ' + label, fontFamily: 'Rubik, sans-serif', direction: 'rtl', fontSize: 11.5, fontStyle: '600', padding: 4, fill: color }));
    tag.offsetX(tag.width() / 2); tag.offsetY(tag.height() / 2);
    g.add(tag);
    layer.add(g);
    g.to({ opacity: 1, duration: 0.25 });
  }
  function clearTrace() { traceCount = 0; layer.find('.trace').forEach(t => t.destroy()); }

  // A load balancer glances at the copies of a server, then forwards to a free one.
  async function flashCopies(id, token) {
    const n = nodes[id];
    if (!n || REDUCED) return token === playToken;
    for (let i = 0; i < 2; i++) {
      await new Promise(r => n.base.to({ stroke: '#7A4FB8', strokeWidth: 6, duration: 0.16,
        onFinish: () => n.base.to({ stroke: '#FBF3E7', strokeWidth: 2, duration: 0.16, onFinish: r }) }));
    }
    return token === playToken;
  }

  async function play() {
    const a = current();
    if (!a) return;
    const token = ++playToken;
    layer.find('.packet').forEach(p => p.destroy());
    clearTrace();
    highlight();
    restoreBadges();
    const step = a.steps[state.step];
    if (!step) return;
    let done = 0;
    for (const hop of step.hops) {
      if (step.pick && hop[0] === step.pick[0] && hop[1] === step.pick[1] && !(await flashCopies(step.pick[1], token))) return;
      renderCard(done);
      const ok = Array.isArray(hop[0])
        ? (await Promise.all(hop.map(h => packet(h, token)))).every(Boolean)
        : await packet(hop, token);
      if (!ok) return;
      done += Array.isArray(hop[0]) ? hop.length : 1;
      renderCard(done);
      await new Promise(r => setTimeout(r, 110));
      if (token !== playToken) return;
    }
    if (step.badge) showBadge(step.badge, true);
  }

  /* Home screen life: quiet packets between you and the apps. */
  function startAmbient() {
    stopAmbient();
    if (REDUCED) return;
    const token = playToken;
    ambientTimer = setInterval(() => {
      if (current() || document.hidden || token !== playToken) return;
      const id = 'app:' + APPS[Math.floor(Math.random() * APPS.length)].id;
      packet(['you', id, 'req', ''], token).then(ok => ok && packet([id, 'you', 'res', ''], token));
    }, 850);
    idleAnim = new Konva.Animation(frame => {
      const t = frame.time / 1000;
      Object.values(nodes).forEach(({ halo }, i) => halo.opacity(0.06 + 0.06 * Math.sin(t * 1.5 + i)));
    }, layer);
    idleAnim.start();
  }
  function stopAmbient() { clearInterval(ambientTimer); ambientTimer = null; if (idleAnim) { idleAnim.stop(); idleAnim = null; } }

  /* ── Tooltip ─────────────────────────────────────────────────────────────── */
  function showTip(n, g) {
    const tip = $('netTip');
    const role = r => `<span class="net-role" style="--c:${ROLE[r].color}">${ROLE[r].label}</span>`;
    tip.innerHTML = n.home
      ? `<div class="net-tip-head"><b>${n.label}</b></div><div class="net-tip-row">${n.sub}</div><div class="net-tip-sub" style="margin-top:8px">לחצו כדי לראות את כל הדרך</div>`
      : `<div class="net-tip-head"><b>${n.label}</b>${role(n.role)}</div><div class="net-tip-sub">${n.sub || ''}</div>` +
        `<div class="net-tip-row"><span>מה הוא נותן</span>${n.gives}</div><div class="net-tip-row"><span>את מי הוא שואל</span>${n.asks}</div>` +
        (n.copies ? `<div class="net-tip-row"><span>למה יש כמה עיגולים?</span>יש הרבה עותקים של המחשב הזה. אם אחד עמוס או מתקלקל — אחר עונה.</div>` : '');
    tip.hidden = false;
    const p = g.position(), host = $('netStage');
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let top = p.y - th - 46;
    if (top < 6) top = p.y + 70;
    tip.style.left = Math.max(6, Math.min(p.x - tw / 2, host.clientWidth - tw - 6)) + 'px';
    tip.style.top = Math.max(6, Math.min(top, host.clientHeight - th - 6)) + 'px';
  }
  function hideTip() { const t = $('netTip'); if (t) t.hidden = true; }

  /* ── Card & chips ────────────────────────────────────────────────────────── */
  const mask = slug => `-webkit-mask-image:url(${LOGO(slug)});mask-image:url(${LOGO(slug)})`;
  function renderChips() {
    $('netChips').innerHTML = APPS.map(a =>
      `<button class="net-chip${state.app === a.id ? ' on' : ''}" data-app="${a.id}" style="--brand:${a.color}"><i style="${mask(a.logo)}"></i>${a.name}</button>`).join('');
  }

  const hopList = (a, step, done) => {
    if (!step) return '';
    const label = id => labelOf(a, id);
    return '<ol class="net-hops">' + flatHops(step).map(([f, t, k, l], i) =>
      `<li class="${k}${i < done ? ' done' : i === done ? ' now' : ''}"><span class="who">${label(f)} ← ${label(t)}</span><span class="what">${l}</span></li>`).join('') + '</ol>';
  };

  function renderCard(hopsDone = -1) {
    const card = $('netCard'), a = current();
    if (!a) {
      card.innerHTML = `<div class="net-card-kicker">איך משחקים</div><h3>בחרו אפליקציה</h3>
        <p>לחצו על אחת האפליקציות — במפה או למעלה — ותראו את כל המחשבים שעובדים בשבילכם, בקשה אחרי תשובה.</p>
        <div class="net-flow"><span class="ask">מי שמבקש</span><span class="reply">מי שעונה</span></div>
        <p class="net-card-hint">עברו עם העכבר על כל עיגול: הוא <b class="r-client">לקוח</b>, <b class="r-server">שרת</b> — או <b class="r-both">גם וגם</b>?</p>`;
      return;
    }
    const total = a.steps.length + 1, step = a.steps[state.step];
    card.innerHTML = `<div class="net-card-kicker" style="--brand:${a.color}"><i style="${mask(a.logo)}"></i>${a.name} · שלב ${state.step + 1} מתוך ${total}
        <button class="net-home" data-nav="home">→ כל האפליקציות</button></div>
      <h3>${step ? step.title : 'מה למדנו'}</h3>
      <p>${step ? step.text : a.fact}</p>
      ${hopList(a, step, hopsDone)}
      <div class="net-dots">${Array.from({ length: total }, (_, i) => `<span class="${i === state.step ? 'on' : i < state.step ? 'done' : ''}"></span>`).join('')}</div>
      <div class="net-card-nav">
        <button data-nav="prev" ${state.step === 0 ? 'disabled' : ''}>→ הקודם</button>
        ${step ? '<button data-nav="replay" title="שוב">↺</button>' : ''}
        <button data-nav="next" class="primary">${step ? 'הבא ←' : 'לאפליקציה הבאה ←'}</button>
      </div>`;
  }

  function select(id) {
    state.app = id; state.step = 0;
    renderChips(); renderCard();
    drawScene(true);
    const token = playToken;
    setTimeout(() => { if (token === playToken) play(); }, REDUCED ? 0 : 550);
    emit();
  }
  function home() {
    state.app = null; state.step = 0;
    renderChips(); renderCard(); drawScene(true); emit();
  }
  function go(step) {
    state.step = Math.max(0, Math.min(step, current().steps.length));
    renderCard(); play(); emit();
  }

  function wire() {
    $('netChips').addEventListener('click', e => { const b = e.target.closest('[data-app]'); if (b) select(b.dataset.app); });
    $('netCard').addEventListener('click', e => {
      const b = e.target.closest('[data-nav]'), a = current();
      if (!b) return;
      if (b.dataset.nav === 'home') return home();
      if (!a) return;
      if (b.dataset.nav === 'prev') go(state.step - 1);
      else if (b.dataset.nav === 'replay') play();
      else if (state.step >= a.steps.length) select(APPS[(APPS.indexOf(a) + 1) % APPS.length].id);
      else go(state.step + 1);
    });
    $('netRoles').addEventListener('change', e => { state.roles = e.target.checked; applyRoles(); });
    let t = null;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (stage && $('netStage').offsetParent) { build(); if (current()) { highlight(); restoreBadges(); } } }, 150); });
  }

  window.__networkMap = {
    show() {
      if (typeof Konva === 'undefined' || !$('netStage')) return;
      if (!wired) { wire(); wired = true; renderChips(); renderCard(); }
      requestAnimationFrame(() => { build(); if (current()) play(); });
    },
    hide() { playToken++; stopAmbient(); hideTip(); },
    state: publicState,
    onChange(fn) { listeners.push(fn); }
  };
})();
