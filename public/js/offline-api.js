/**
 * Офлайн (демо) режим: заменяет /api/* API локальной реализацией прямо в браузере.
 * Для статического хостинга (GitHub Pages и т.п.), где нет Node.js-сервера.
 *
 * — Адаптер «1 в 4» и дробитель задач: встроенные правила (порт с server/fallback.js)
 * — «Твой друг»: тёплые предопределённые ответы по ключевым словам
 * — Переписка, статистика, родительская страница: localStorage браузера
 * Форматы ответов 1-в-1 как у реального сервера (server/index.js).
 */
(function () {
  if (window.__QAMQOR_OFFLINE_API__) return;
  window.__QAMQOR_OFFLINE_API__ = true;

  var LS_PREFIX = "qamqor_demo_";
  var PARENT_PIN = "2025";
  var now = function () { return new Date().toISOString(); };

  var store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(LS_PREFIX + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch (e) { /* приватный режим — работаем волатильно */ }
    }
  };

  // ---------- Адаптер «1 в 4»: локальные правила (порт с server/fallback.js) ----------
  function localAdapter(title, text, lang) {
    var kk = lang === "kk";
    var sentences = text.split(/[.!?]+/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 3);
    var simple = sentences.length ? sentences : [text];
    var steps = [
      { icon: "📖", title: kk ? "Оқу" : "Чтение", text: kk ? "Бастапқы сөйлемді мұқият оқу" : "Прочитать первое предложение внимательно" },
      { icon: "🧠", title: kk ? "Түсіну" : "Понимание", text: kk ? "Негізгі ойды айту" : "Сказать главную мысль своими словами" },
      { icon: "✍️", title: kk ? "Жазу" : "Запись", text: kk ? "Ең маңызды сөзді жазу" : "Записать самое важное слово" },
      { icon: "⭐", title: kk ? "Мақтау" : "Похвала", text: kk ? "Өзіңді мақта: «Супер!»" : "Похвалить себя: «Супер!»" }
    ];
    var words = text.split(/\s+/).map(function (w) { return w.replace(/[.,;:!?«»()"']/g, ""); }).filter(function (w) { return w.length > 3; }).slice(0, 3);
    var pecs = (words.length ? words : [kk ? "мәтін" : "текст", kk ? "тақырып" : "тема", kk ? "ой" : "мысль"]).map(function (w, i) {
      return { icon: ["📚", "✨", "💡"][i] || "📚", word: w, desc: kk ? "Мәтіндегі маңызды сөз" : "Важное слово из текста" };
    });
    var quiz = {
      q: kk ? "«" + title + "» тақырыбында не турды?" : "О чём был текст «" + title + "»?",
      options: [
        sentences[0] || text,
        kk ? "Шоу мен қвидан турды" : "Об игре и приключениях",
        kk ? "Ойын туралы болатын" : "О космическом полёте"
      ],
      correct: 0
    };
    return { title: title, simple: simple, steps: steps, pecs: pecs, quiz: quiz };
  }

  // ---------- Дробитель задач: локальные шаги (порт с server/fallback.js) ----------
  function localTodo(task, level, lang) {
    if (lang === "kk") {
      if (level === 1) return { steps: ["Басталу", task + " бойынша бір оңай әрекет", "Аяқталды, мақтау!"] };
      if (level === 2) return { steps: ["Орынға отыру", task + " — 1-ші қадам", "Керек заттарды жинау", task + " — 2-ші қадам", "Аяқтау және мақтау"] };
      return { steps: ["Орынға отырып, тыныштық", "Тапсырманы ашу", "Бірінші оңай қадам", "1 минуттық демалыс", "Екінші қадам", "Үшінші қадам", "Аяқтау: «Дайын!»"] };
    }
    if (level === 1) return { steps: ["Начать", "Сделать один лёгкий шаг по: " + task, "Завершить и похвалить себя"] };
    if (level === 2) return { steps: ["Садиться на место", task + " — шаг 1", "Подготовить нужные вещи", task + " — шаг 2", "Завершить и похвалить себя"] };
    return { steps: ["Устроиться и выдохнуть", "Открыть задачу: " + task, "Первый лёгкий шаг", "Отдых 1 минуту", "Второй шаг", "Третий шаг", "Финал: «Готово! Молодец!»"] };
  }

  // ---------- «Твой друг» (демо): тёплые ответы по ключевым словам ----------
  var FRIEND_RULES = [
    {
      re: /(привет|здравств|добрый|салем|сәлем|hi|hello)/i,
      ru: "Привет! Я Твой друг. Расскажи, как ты сегодня? 💛",
      kk: "Сәлем! Мен сенің досың. Бүгін қалайсың? 💛"
    },
    {
      re: /(грустн|обид|обижа|плака|одинок|плохо|страшн|боюсь|болады|ауыр|қайғы|мұң|үркі)/i,
      ru: "Мне жаль, что тебе сейчас непросто. Твои чувства важны, и я тебя слушаю. Расскажи ещё немного — а ещё: в школе или дома есть человек, с которым можно поговорить об этом? Если очень тяжело — позвони на 150, это бесплатно и в любое время, там выслушают.",
      kk: "Сенің қазір қиын екеніне өкінемін. Сенің сезімің маңызды, мен тыңдап отырмын. Тағы сәл айтып бер — мектепте немесе үйде бұл туралы ақылдасатын адам бар ма? Егер өте ауыр болса — 150 нөміріне қоңырау шал, ол тегін және кез келген уақытта, сол жерде естіп қояды."
    },
    {
      re: /(рад|весел|класс|здорово|супер|отлично|круто|сәтті|кушак|рақмет|спасибо|thanks)/i,
      ru: "Как же здорово, что у тебя всё хорошо! Я за тебя рад. Расскажи, что было самого классного? 🌟",
      kk: "Барлығы жақсы екеніне қуаныштымын! Сенімен бірге қуаныштымын. Ең керісі не болды? 🌟"
    },
    {
      re: /(устал|утом|выгор|трудно|сложно|қиын|шұғыл)/i,
      ru: "Звучит так, что ты устал. Давай сделаем паузу: глубоко подышим, попьём воды. А потом расскажешь мне ещё — я рядом 💛",
      kk: "Сен шаршаған секілсің. Кішкене үзіліс алайық: терең дем аламыз, су ішеміз. сосын маған тағы айтып бер — мен жаныңдамын 💛"
    }
  ];
  var FRIEND_GENERIC = {
    ru: [
      "Расскажи ещё об этом. Я тебя слушаю 💛",
      "Понял тебя. А как ты себя при этом чувствуешь?",
      "Спасибо, что делишься со мной. Что было дальше?",
      "Я рядом. Давай поговорим об этом спокойно, по чуть-чуть."
    ],
    kk: [
      "Бұл туралы тағы айтып бер. Мен сені тыңдап отырмын 💛",
      "Түсіндім. Ал содан кейін өзін қалай сезіндің?",
      "Бөліскенің үшін рақмет. Содан не болды?",
      "Мен жаныңдамын. Бұл туралы баяу әрі бейбіт сөйлесейік."
    ]
  };
  var genericIdx = 0;
  function demoFriend(text, lang) {
    var t = String(text || "");
    for (var i = 0; i < FRIEND_RULES.length; i++) {
      if (FRIEND_RULES[i].re.test(t)) return lang === "kk" ? FRIEND_RULES[i].kk : FRIEND_RULES[i].ru;
    }
    var g = FRIEND_GENERIC[lang] || FRIEND_GENERIC.ru;
    return g[genericIdx++ % g.length];
  }

  // ---------- Хранилище переписки ----------
  function getMessages() { return store.get("messages", []); }
  function addMessage(role, text) {
    var items = getMessages();
    items.push({ role: role, text: text, created_at: now() });
    if (items.length > 300) items.splice(0, items.length - 300);
    store.set("messages", items);
    return items;
  }
  function recentMessages(limit) {
    var all = getMessages();
    return all.slice(Math.max(0, all.length - limit)); // последние, по возрастанию
  }

  // ---------- Статистика разделов ----------
  function getUsage() { return store.get("usage", {}); }

  // ---------- Локальный «аналитик» (упрощённый порт серверного) ----------
  function localInsights(utterances, lang) {
    var lower = utterances.map(function (u) { return u.toLowerCase(); });
    var kw = [
      { title: lang === "kk" ? "Оқу және кітап" : "Чтение и книги", icon: "📚", re: /(книг|читат|оқу|кітап|страниц)/ },
      { title: lang === "kk" ? "Мектеп және сабақ" : "Школа и уроки", icon: "🏫", re: /(школ|урок|сабак|мектеп|домашн|контрольн)/ },
      { title: lang === "kk" ? "Достық және ойнau" : "Друзья и игра", icon: "🤝", re: /(друг|друзья|дос|ойна|игр|play|friend)/ },
      { title: lang === "kk" ? "Күй-күйзеліс" : "Настроение", icon: "💛", re: /(груст|плохо|устал|бош|күйзеліс|рад|весел|сәтті|happy|sad|обид|обижа)/ },
      { title: lang === "kk" ? "Тамақ" : "Еда", icon: "🍎", re: /(хочу есть|голод|тамақ|ас|ед)/ }
    ];
    var topics = kw
      .map(function (k) {
        return { icon: k.icon, title: k.title, count: lower.filter(function (t) { return k.re.test(t); }).length, note: "" };
      })
      .filter(function (t) { return t.count > 0; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 3);
    return {
      summary: lang === "kk"
        ? "Бұл — офлайн-демо нұсқасындағы қысқаша талдау. Толық ИИ-анализ — серверлік нұсқада."
        : "Это краткий офлайн-анализ (демо-режим). Подробный анализ на ИИ доступен в полной версии с сервером.",
      topics: topics,
      emotions: {
        positive: lang === "kk" ? "—" : "—",
        concern: /груст|обид|обижа|страшн|одинок|ауыр|қайғы/.test(lower.join(" "))
          ? (lang === "kk" ? "Балаңыз сөздерінде мұң байқалды — оны баяу, бейбіт тыңдап көріңіз." : "В словах ребёнка проскальзывает печаль — выделите время и спокойно выслушайте его.")
          : (lang === "kk" ? "—" : "—")
      },
      key_moments: utterances.slice(-5).reverse(),
      for_parent: [
        { icon: "💬", text: lang === "kk" ? "Балаңыздың сөздеріне уақыт бөліп тыңдап көріңіз." : "Выделите время и спокойно выслушайте ребёнка о том, о чём он говорит чаще всего." }
      ]
    };
  }

  // ---------- Маршрутизация ----------
  function result(status, data) { return { status: status, data: data }; }

  function handleApi(path, init) {
    var method = ((init && init.method) || "GET").toUpperCase();
    var body = {};
    if (init && init.body) { try { body = JSON.parse(init.body); } catch (e) { /* пустое тело */ } }
    var lang = body.lang === "kk" ? "kk" : "ru";

    if (path === "/api/health") {
      return Promise.resolve(result(200, { ok: true, model: "demo-offline", llmConfigured: false }));
    }

    if (path === "/api/adapter" && method === "POST") {
      var title = String(body.title || "").trim();
      var text = String(body.text || "").trim();
      if (!title && !text) return Promise.resolve(result(400, { error: "text or title required" }));
      var src = text || (lang === "kk"
        ? "Бүгінгі тақырып — «" + title + "». Бұл қызықты әрі маңызды тақырып."
        : "Сегодня тема урока — «" + title + "». Это важная и интересная тема.");
      return Promise.resolve(result(200, {
        title: title, simple: localAdapter(title || "Текст", src, lang).simple,
        steps: localAdapter(title || "Текст", src, lang).steps,
        pecs: localAdapter(title || "Текст", src, lang).pecs,
        quiz: localAdapter(title || "Текст", src, lang).quiz,
        source: "offline"
      }));
    }

    if (path === "/api/todo" && method === "POST") {
      var task = String(body.task || "").trim();
      if (!task) return Promise.resolve(result(400, { error: "task required" }));
      var level = [1, 2, 3].indexOf(body.level) >= 0 ? body.level : 2;
      return Promise.resolve(result(200, { steps: localTodo(task, level, lang).steps, source: "offline" }));
    }

    if (path === "/api/usage" && method === "POST") {
      var u = getUsage();
      u[body.section] = (u[body.section] || 0) + 1;
      store.set("usage", u);
      return Promise.resolve(result(200, { ok: true, section: body.section }));
    }

    if (path === "/api/messages" && method === "GET") {
      var qs = path.split("?")[1] || "";
      var limitParam = (qs.match(/limit=(\d+)/) || [])[1];
      var limit = Math.max(1, Math.min(parseInt(limitParam, 10) || 30, 200));
      var all = getMessages();
      return Promise.resolve(result(200, { items: recentMessages(limit), total: all.length }));
    }

    if (path === "/api/chat" && method === "POST") {
      var text2 = String(body.text || "").trim();
      if (!text2) return Promise.resolve(result(400, { error: "text required" }));
      addMessage("child", text2);
      var reply = demoFriend(text2, lang);
      addMessage("friend", reply);
      return Promise.resolve(result(200, { child: text2, friend: reply, source: "offline" }));
    }

    if (path === "/api/insights" && method === "POST") {
      var childTexts = getMessages().filter(function (m) { return m.role === "child"; }).map(function (m) { return m.text; });
      if (!childTexts.length) return Promise.resolve(result(400, { error: "no utterances" }));
      return Promise.resolve(result(200, {
        summary: localInsights(childTexts, lang).summary,
        topics: localInsights(childTexts, lang).topics,
        emotions: localInsights(childTexts, lang).emotions,
        key_moments: localInsights(childTexts, lang).key_moments,
        for_parent: localInsights(childTexts, lang).for_parent,
        source: "offline",
        count: childTexts.length
      }));
    }

    // ---------- Родительская страница ----------
    function parentAuthed() {
      if (store.get("parent_auth", false)) return true;
      return (document.cookie || "").indexOf("qamqor_parent=ok") >= 0;
    }
    if (path === "/api/parent/login" && method === "POST") {
      if (String(body.pin || "").trim() !== PARENT_PIN) return Promise.resolve(result(401, { error: "bad pin" }));
      store.set("parent_auth", true);
      document.cookie = "qamqor_parent=ok; Path=/; Max-Age=604800";
      return Promise.resolve(result(200, { ok: true }));
    }
    if (path === "/api/parent/logout" && method === "POST") {
      store.set("parent_auth", false);
      document.cookie = "qamqor_parent=; Path=/; Max-Age=0";
      return Promise.resolve(result(200, { ok: true }));
    }
    if ((path === "/api/parent/stats" || path === "/api/parent/messages") && method === "GET") {
      if (!parentAuthed()) return Promise.resolve(result(401, { error: "unauthorized" }));
      var msgs = getMessages();
      var childMsgs = msgs.filter(function (m) { return m.role === "child"; });
      var daySet = {};
      childMsgs.forEach(function (m) { var d = String(m.created_at || "").slice(0, 10); if (d) daySet[d] = true; });
      var stats = {
        total: msgs.length,
        child: childMsgs.length,
        lastAt: childMsgs.length ? childMsgs[childMsgs.length - 1].created_at : null,
        activeDays: Object.keys(daySet).length
      };
      var uAll = getUsage();
      var sections = Object.keys(uAll).filter(function (s) { return uAll[s] > 0; })
        .map(function (s) { return { section: s, count: uAll[s], last_at: stats.lastAt }; })
        .sort(function (a, b) { return b.count - a.count; });
      if (path === "/api/parent/stats") {
        return Promise.resolve(result(200, { messages: stats, sections: sections, utterances: childMsgs.length }));
      }
      return Promise.resolve(result(200, { items: msgs, stats: stats }));
    }

    return Promise.resolve(result(404, { error: "not found" }));
  }

  // ---------- Перехват fetch ----------
  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var path = url;
    try { path = new URL(url, location.origin).pathname; } catch (e) { /* относительный — как есть */ }
    if (path.indexOf("/api/") === 0) {
      return handleApi(path, init).then(function (r) {
        return new Response(JSON.stringify(r.data), {
          status: r.status,
          headers: { "Content-Type": "application/json" }
        });
      });
    }
    return nativeFetch ? nativeFetch(input, init) : Promise.reject(new Error("network unavailable (offline demo)"));
  };
})();
