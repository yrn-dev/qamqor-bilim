/**
 * Qamqor Bilim — сервер: статика фронтенда + ИИ-эндпоинты (gemma4).
 *
 *   GET  /api/health   — статус и модель
 *   POST /api/adapter  — ИИ-адаптер урока «1 в 4» (Diffit + LittleLit + PECS + Quiz)
 *   POST /api/todo     — умный дробитель задач
 */
require("dotenv").config({ quiet: true });
const path = require("path");
const express = require("express");
const { chatJSON, config } = require("./llm");
const { adapterSystem, adapterUser, topicTextSystem, topicTextUser, todoSystem, todoUser, analystSystem, analystUser, friendSystem, friendUser } = require("./prompts");
const db = require("./db");
const { localAdapterFallback, localTodoFallback } = require("./fallback");

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json({ limit: "200kb" }));

// ---------- validation / normalization ----------

// Уровень сложности -> количество шагов (те же значения, что в прототипе)
const LEVEL_TARGETS = { 1: 3, 2: 5, 3: 7 };

function str(v, max = 4000) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function normalizeAdapter(d, title, text, lang) {
  if (!d || typeof d !== "object") throw new Error("bad shape");
  const simple = (Array.isArray(d.simple) ? d.simple : [])
    .map((s) => str(s, 400))
    .filter(Boolean)
    .slice(0, 5);
  const steps = (Array.isArray(d.steps) ? d.steps : [])
    .map((st) => ({
      icon: str(st?.icon, 4) || "✨",
      title: str(st?.title, 60),
      text: str(st?.text, 200),
    }))
    .filter((st) => st.title || st.text)
    .slice(0, 6);
  const pecs = (Array.isArray(d.pecs) ? d.pecs : [])
    .map((p) => ({ icon: str(p?.icon, 4) || "📚", word: str(p?.word, 60), desc: str(p?.desc, 120) }))
    .filter((p) => p.word)
    .slice(0, 4);
  const q = d.quiz || {};
  const options = (Array.isArray(q.options) ? q.options : [])
    .map((o) => str(o, 160))
    .filter(Boolean)
    .slice(0, 3);
  let correct = Number(q.correct);
  if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) correct = 0;
  return {
    title: str(d.title, 120) || title,
    simple,
    steps,
    pecs,
    quiz: { q: str(q.q, 240), options, correct },
  };
}

function normalizeTodo(d, target, lang) {
  if (!d || typeof d !== "object") throw new Error("bad shape");
  let steps = [];
  if (Array.isArray(d.steps)) {
    steps = d.steps.map((s) => str(s, 160)).filter(Boolean);
  } else {
    // key-value формат: step_1, step_2, ...
    for (let i = 1; i <= target; i++) {
      const v = str(d["step_" + i], 160);
      if (v) steps.push(v);
    }
  }
  if (!steps.length) throw new Error("empty steps");
  const pool = PAD_STEPS[lang] || PAD_STEPS.ru;
  let i = 0;
  while (steps.length < target && i < pool.length) {
    steps.push(pool[i]);
    i++;
  }
  return { steps: steps.slice(0, target) };
}

// Спокойные «запасные» шаги на случай, если LLM вернёт меньше, чем просили
const PAD_STEPS = {
  ru: [
    "Сделать короткую паузу и выдохнуть",
    "Взять воды и попить",
    "Посмотреть на следующий шаг",
    "Продолжить спокойно и не спеша",
    "Собрать свои вещи на место",
    "Похвалить себя за старание",
  ],
  kk: [
    "Қысқа үзіліс алып, тыныс алу",
    "Суды ішіп алу",
    "Келесі қадамға қарау",
    "Байсалды жалғастыру",
    "Заттарды жинау",
    "Өзіңді жүректен мақтау",
  ],
};

// ---------- API ----------

app.get("/api/health", (req, res) => {
  res.json({ ok: true, model: config.model, llmConfigured: Boolean(config.apiKey) });
});

app.post("/api/adapter", async (req, res) => {
  const title = str(req.body?.title, 200).trim();
  const text = str(req.body?.text, 8000).trim();
  const lang = req.body?.lang === "kk" ? "kk" : "ru";
  if (!text && !title) return res.status(400).json({ error: "text or title required" });

  try {
    let sourceText = text;
    if (!sourceText) {
      // Режим «только тема»: ИИ сам пишет учебный абзац по теме, потом адаптирует его
      const gen = await chatJSON(topicTextSystem(lang), topicTextUser(title), { attempts: 1 });
      sourceText = str(gen?.text, 4000).trim();
      if (!sourceText) throw new Error("topic text generation returned empty");
    }
    const raw = await chatJSON(adapterSystem(lang), adapterUser(title, sourceText));
    res.json({ ...normalizeAdapter(raw, title, sourceText, lang), source: "ai" });
  } catch (err) {
    console.warn("[adapter] LLM failed, using local fallback:", err.message);
    // Фолбэк без LLM: по теме — короткая заглушка-абзац, чтобы адаптер отработал на правилах
    const stub =
      text ||
      (lang === "kk"
        ? `Бүгінгі тақырып — «${title}». Бұл қызықты әрі маңызды тақырып.`
        : `Сегодня тема урока — «${title}». Это важная и интересная тема.`);
    res.json({ ...localAdapterFallback(title || "Текст", stub, lang), source: "fallback" });
  }
});

app.post("/api/todo", async (req, res) => {
  const task = str(req.body?.task, 500);
  const level = [1, 2, 3].includes(req.body?.level) ? req.body.level : 2;
  const target = LEVEL_TARGETS[level];
  const lang = req.body?.lang === "kk" ? "kk" : "ru";
  if (!task.trim()) return res.status(400).json({ error: "task required" });

  try {
    const raw = await chatJSON(todoSystem(lang, target), todoUser(task));
    res.json({ ...normalizeTodo(raw, target, lang), source: "ai" });
  } catch (err) {
    console.warn("[todo] LLM failed, using local fallback:", err.message);
    res.json({ ...localTodoFallback(task, level, lang), source: "fallback" });
  }
});

// ---------- Голосовая память ребёнка: реплики + ИИ-аналитик ----------

function normalizeInsights(d) {
  if (!d || typeof d !== "object") throw new Error("bad shape");
  const topics = (Array.isArray(d.topics) ? d.topics : [])
    .map((t) => ({ icon: str(t?.icon, 4) || "💬", title: str(t?.title, 60), count: Math.max(0, parseInt(t?.count, 10) || 1), note: str(t?.note, 300) }))
    .filter((t) => t.title)
    .slice(0, 4);
  const moments = (Array.isArray(d.key_moments) ? d.key_moments : [])
    .map((m) => str(m, 400))
    .filter(Boolean)
    .slice(0, 5);
  const forParent = (Array.isArray(d.for_parent) ? d.for_parent : [])
    .map((p) => ({ icon: str(p?.icon, 4) || "💛", text: str(p?.text, 300) }))
    .filter((p) => p.text)
    .slice(0, 3);
  const emotions = d.emotions && typeof d.emotions === "object" ? d.emotions : {};
  return {
    summary: str(d.summary, 500),
    topics,
    emotions: { positive: str(emotions.positive, 400), concern: str(emotions.concern, 400) },
    key_moments: moments,
    for_parent: forParent,
  };
}

// Локальный фолбэк аналитика (без LLM): простые подсчёты + последние реплики
function localInsightsFallback(utterances, lang) {
  const lower = utterances.map((u) => u.text.toLowerCase());
  const kw = [
    { title: lang === "kk" ? "Оқу және кітап" : "Чтение и книги", icon: "📚", re: /(книг|читат|оқу|кітап|книг|страниц)/ },
    { title: lang === "kk" ? "Мектеп және сабақ" : "Школа и уроки", icon: "🏫", re: /(школ|урок|сабак|мектеп|домашн|сабақ|уроки)/ },
    { title: lang === "kk" ? "Дружба и игра" : "Друзья и игра", icon: "🤝", re: /(друг|друзья|дос|ойна|игр|play|friend)/ },
    { title: lang === "kk" ? "Настроение" : "Настроение", icon: "💛", re: /(груст|плохо|устал|бош|күйзеліс|рад|весел|сәтті|happy|sad)/ },
    { title: lang === "kk" ? "Еда" : "Еда", icon: "🍎", re: /(хочу есть|голод|тамақ|ас|ед)/ },
  ];
  const topics = kw
    .map((k) => ({ icon: k.icon, title: k.title, count: lower.filter((t) => k.re.test(t)).length, note: "" }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  return {
    summary: lang === "kk"
      ? "Бұл уақыттағы сөздерінің қысқаша талдауы (ІІ қосылмаған кездегі нұсқа)."
      : "Краткий анализ сказанного (режим без ИИ — подключите модель для подробного анализа).",
    topics,
    emotions: {
      positive: lang === "kk" ? "—" : "—",
      concern: lang === "kk" ? "—" : "—",
    },
    key_moments: utterances.slice(-5).reverse().map((u) => u.text),
    for_parent: [
      { icon: "💬", text: lang === "kk" ? "Балаңыздың сөздеріне уақыт бөліп тыңдап көріңіз." : "Выделите время и спокойно выслушайте ребёнка о том, о чём он говорит чаще всего." },
    ],
  };
}

app.get("/api/utterances", (req, res) => {
  const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 50, 200));
  res.json({ items: db.recentUtterances(limit), total: db.countUtterances() });
});

app.post("/api/utterances", (req, res) => {
  const text = str(req.body?.text, 500).trim();
  const lang = req.body?.lang === "kk" ? "kk" : "ru";
  if (!text) return res.status(400).json({ error: "text required" });
  const id = db.addUtterance(text, lang);
  res.json({ ok: true, id, total: db.countUtterances() });
});

app.delete("/api/utterances", (req, res) => {
  res.json({ ok: true, deleted: db.clearUtterances() });
});

app.post("/api/insights", async (req, res) => {
  const lang = req.body?.lang === "kk" ? "kk" : "ru";
  const utterances = db.allUtterances();
  if (!utterances.length) return res.status(400).json({ error: "no utterances" });
  try {
    const raw = await chatJSON(analystSystem(lang), analystUser(utterances, lang), { attempts: 1, timeoutMs: 45000 });
    res.json({ ...normalizeInsights(raw), source: "ai", count: utterances.length });
  } catch (err) {
    console.warn("[insights] LLM failed, using local fallback:", err.message);
    res.json({ ...localInsightsFallback(utterances, lang), source: "fallback", count: utterances.length });
  }
});

// ---------- «Твой друг»: чат ребёнка с ИИ-другом ----------

const CHAT_SECTIONS = ["hub", "library", "reader", "adapter", "board", "todo", "schedule", "aac"];

app.get("/api/messages", (req, res) => {
  const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 30, 200));
  res.json({ items: db.recentMessages(limit), total: db.countMessages() });
});

app.post("/api/usage", (req, res) => {
  const section = CHAT_SECTIONS.includes(req.body?.section) ? req.body.section : null;
  if (!section) return res.status(400).json({ error: "unknown section" });
  db.addUsage(section);
  res.json({ ok: true, section });
});

app.post("/api/chat", async (req, res) => {
  const text = str(req.body?.text, 500).trim();
  const lang = req.body?.lang === "kk" ? "kk" : "ru";
  if (!text) return res.status(400).json({ error: "text required" });

  db.addMessage("child", text, lang);
  // Двойная запись в старую таблицу — чтобы «Аналитик речи» видел те же реплики
  db.addUtterance(text, lang);
  const history = db.recentMessages(11);

  try {
    const raw = await chatJSON(friendSystem(lang), friendUser(history.slice(0, -1), text), {
      attempts: 1,
      timeoutMs: 45000,
    });
    const reply = str(raw?.reply, 600).trim() || (lang === "kk" ? "Мен сені тыңдап отырмын 💛" : "Я тебя слушаю 💛");
    db.addMessage("friend", reply, lang);
    res.json({ child: text, friend: reply, source: "ai" });
  } catch (err) {
    console.warn("[chat] LLM failed, using local reply:", err.message);
    const fallbackReply =
      lang === "kk"
        ? "Мен сені тыңдап отырмын. Баяу әрі мұқият айт — мен қасыңдамын 💛"
        : "Я тебя слушаю. Расскажи спокойно, по чуть-чуть — я рядом 💛";
    db.addMessage("friend", fallbackReply, lang);
    res.json({ child: text, friend: fallbackReply, source: "fallback" });
  }
});

// ---------- Родительская страница (PIN-доступ) ----------

const PARENT_PIN = String(process.env.PARENT_PIN || "2025").trim();
const PARENT_COOKIE = "qamqor_parent=ok";

function isParent(req) {
  const raw = req.headers.cookie || "";
  return raw.split(";").some((c) => c.trim() === PARENT_COOKIE);
}

app.post("/api/parent/login", (req, res) => {
  const pin = String(req.body?.pin ?? "").trim();
  if (!pin || pin !== PARENT_PIN) return res.status(401).json({ error: "bad pin" });
  res.setHeader(
    "Set-Cookie",
    `${PARENT_COOKIE}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
  );
  res.json({ ok: true });
});

app.post("/api/parent/logout", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    `qamqor_parent=; Path=/; HttpOnly; Max-Age=0`
  );
  res.json({ ok: true });
});

app.get("/api/parent/messages", (req, res) => {
  if (!isParent(req)) return res.status(401).json({ error: "unauthorized" });
  res.json({ items: db.recentMessages(300), stats: db.messageStats() });
});

app.get("/api/parent/stats", (req, res) => {
  if (!isParent(req)) return res.status(401).json({ error: "unauthorized" });
  res.json({
    messages: db.messageStats(),
    sections: db.getUsage(),
    utterances: db.countUtterances(),
  });
});

// ---------- static frontend ----------

// Локальное семейное приложение: файлы всегда свежие, без кэша браузера,
// чтобы обновлённый код гарантированно доходил до экрана после каждого перезапуска.
app.use((req, res, next) => {
  if (req.method === "GET" && req.path.startsWith("/") && !req.path.startsWith("/api/")) {
    res.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    res.set("Pragma", "no-cache");
  }
  next();
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.listen(PORT, () => {
  console.log(`Qamqor Bilim: http://localhost:${PORT}`);
  console.log(`LLM: ${config.model} @ ${config.baseUrl} (key: ${config.apiKey ? "set" : "MISSING — fallback only"})`);
});
