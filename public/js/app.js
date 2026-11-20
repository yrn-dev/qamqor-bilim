// =====================================================================
// APPLICATION STATE & INTERACTIVE ENGINE
// Split from the original single-file prototype (qamqor_bilim.html)
// AI calls (adapter, todo) go to the local backend: /api/adapter, /api/todo
// =====================================================================
    /**
     * 5. CENTRALIZED APPLICATION STATE
     */
    const state = {
      lang: "ru",                 // Default: Russian ('ru' | 'kk')
      profile: "standard",        // 'standard' | 'dyslexia' | 'asd' | 'adhd' | 'vision'
      view: "hub",                // 'hub' | 'library' | 'reader' | 'adapter' | 'todo' | 'schedule' | 'aac'

      // Book Reader State
      bookId: "baikonur",
      bookPage: 0,
      bookMode: "normal",         // 'normal' | 'simple'
      bookSyllables: false,
      readingRuler: false,
      rulerLineIndex: 0,
      readerSize: 20,
      speechRate: 0.9,
      isSpeaking: false,
      spokenWordIndex: -1,
      speechTimer: null,
      selectedWord: null,

      // AI Lesson Adapter State
      adapterData: null,
      adapterQuizAnswer: null,
      adapterPresetKey: null,    // ключ последнего загруженного пресета (water|silk)

      // Magic ToDo State
      todoTaskTitle: "",
      todoLevel: 2,
      todoSteps: [],
      todoChecked: [],

      // Visual Schedule State
      scheduleDone: [false, false, false],

      // AAC Sentence Strip State
      aacPhrase: []
    };

    /**
     * 5.5. UI ICON SET (stroke SVG, lucide-style) + helpers
     * Функциональные элементы интерфейса — линейные SVG-иконки;
     * контент (книги, AAC, истории) — дружелюбные эмодзи.
     */
    const ICON_PATHS = {
      home: '<path d="M3 9.5 12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22v-8h6v8"/>',
      book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
      sparkles: '<path d="M12 4l1.8 5.4a1.8 1.8 0 0 0 1.1 1.1L20.3 12l-5.4 1.8a1.8 1.8 0 0 0-1.1 1.1L12 20.3l-1.8-5.4a1.8 1.8 0 0 0-1.1-1.1L3.7 12l5.4-1.8a1.8 1.8 0 0 0 1.1-1.1z"/><path d="M19 3v4"/><path d="M17 5h4"/>',
      ladder: '<path d="M8 3v18"/><path d="M16 3v18"/><path d="M8 7.5h8"/><path d="M8 12h8"/><path d="M8 16.5h8"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 10.5h18"/>',
      message: '<path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8z"/>',
      star: '<path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.58l-5.9 3.1 1.13-6.58L2.45 9.44l6.6-.96z"/>',
      puzzle: '<path d="M10 4.5a2.5 2.5 0 0 1 5 0V7h3a2 2 0 0 1 2 2v3h-2.5a2.5 2.5 0 0 0 0 5H20v3a2 2 0 0 1-2 2h-3v-2.5a2.5 2.5 0 0 0-5 0V20H7a2 2 0 0 1-2-2v-3H2.5a2.5 2.5 0 0 1 0-5H5V7a2 2 0 0 1 2-2h3z"/>',
      zap: '<path d="M13 2L3 14h7l-1 8 11-12h-7l1-8z"/>',
      eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
      speaker: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9.5 9.5 0 0 1 0 13"/>',
      pause: '<path d="M10 4v16"/><path d="M14 4v16"/>',
      type: '<path d="M4 7V5h16v2"/><path d="M12 5v14"/><path d="M9 19h6"/>',
      ruler: '<path d="M21.3 8.7l-6-6a1 1 0 0 0-1.4 0L2.7 13.9a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0l12.2-12.2a1 1 0 0 0 0-1.4z"/><path d="M7.5 10.5l2 2"/><path d="M10.5 7.5l2 2"/><path d="M13.5 4.5l2 2"/>',
      checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 5-5.5"/>',
      circle: '<circle cx="12" cy="12" r="9"/>',
      chevronDown: '<path d="M6 9l6 6 6-6"/>',
      x: '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
      pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      video: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>'
    };

    function icon(name, cls = "w-5 h-5", sw = 2) {
      const paths = ICON_PATHS[name] || "";
      return `<svg class="qi-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
    }

    const NAV_ICONS = { hub: "home", library: "book", adapter: "sparkles", board: "pen", todo: "ladder", schedule: "calendar", aac: "message" };
    const PROFILE_ICONS = { standard: "star", dyslexia: "book", asd: "puzzle", adhd: "zap", vision: "eye" };

    // Снимаем ведущий emoji с метки (иконку уже рисует SVG)
    function stripLeadingEmoji(s) {
      return String(s).replace(/^\s*(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})\uFE0F?\s*/u, "");
    }

    /**
     * 7. CORE UTILITIES: SYLLABIFICATION, TOAST, BREATHING MODAL, SPEECH ENGINE
     */
    const VOWEL_RE = /[аәеёиоөуұүыіэюяАӘЕЁИОӨУҰҮЫІЭЮЯ]/;
    function splitSyllables(word) {
      if (!word || word.length < 4) return word;
      const m = word.match(/^([^a-zA-Zа-яА-ЯәғқңөұүһіӘҒҚҢӨҰҮҺІ]*)(.*?)([^a-zA-Zа-яА-ЯәғқңөұүһіӘҒҚҢӨҰҮҺІ]*)$/);
      if (!m || m[2].length < 4) return word;
      const [, pre, core, suf] = m;
      const chars = Array.from(core);
      const vowels = [];
      chars.forEach((c, i) => { if (VOWEL_RE.test(c)) vowels.push(i); });
      if (vowels.length <= 1) return word;

      const cuts = new Set();
      for (let i = 0; i < vowels.length - 1; i++) {
        const gap = vowels[i + 1] - vowels[i] - 1;
        if (gap === 0) cuts.add(vowels[i + 1]);
        else if (gap === 1) cuts.add(vowels[i] + 1);
        else cuts.add(vowels[i] + 2);
      }
      let res = "";
      chars.forEach((c, i) => {
        if (cuts.has(i) && i > 0) res += "·";
        res += c;
      });
      return pre + res + suf;
    }

    function showToast(msg, icon = "✨") {
      const el = document.getElementById("status-toast");
      document.getElementById("status-toast-text").textContent = msg;
      document.getElementById("status-toast-icon").textContent = icon;
      el.classList.remove("opacity-0", "pointer-events-none", "translate-y-2");
      el.classList.add("opacity-100", "translate-y-0");
      clearTimeout(el._t);
      el._t = setTimeout(() => {
        el.classList.add("opacity-0", "pointer-events-none", "translate-y-2");
        el.classList.remove("opacity-100", "translate-y-0");
      }, 3000);
    }

    function playSoftTone(freq = 523.25) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.34);
      } catch (e) {}
    }

    // Speech Synthesis with Karaoke Word-by-Word Highlighting
    function stopAllSpeech() {
      state.isSpeaking = false;
      state.spokenWordIndex = -1;
      clearInterval(state.speechTimer);
      if ("speechSynthesis" in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
      updateReaderSpeakUI();
      if (state.view === "reader") renderBookPage();
    }

    function speakPhraseSimple(text, rate = 0.85) {
      stopAllSpeech();
      if (!("speechSynthesis" in window)) return;
      try {
        const u = new SpeechSynthesisUtterance(text.replace(/·/g, ""));
        u.lang = state.lang === "kk" ? "kk-KZ" : "ru-RU";
        u.rate = rate;
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }

    function toggleBookReadAloud() {
      if (state.isSpeaking) {
        stopAllSpeech();
        return;
      }
      const book = BOOKS_DATA.find(b => b.id === state.bookId)[state.lang];
      const pageObj = book.pages[state.bookPage];
      const paragraphs = state.bookMode === "simple" ? pageObj.simple : pageObj.normal;
      const fullText = paragraphs.join(" ");
      const words = fullText.split(/\s+/).filter(Boolean);
      if (!words.length) return;

      state.isSpeaking = true;
      state.spokenWordIndex = 0;
      updateReaderSpeakUI();
      renderBookPage();

      let idx = 0;
      const stepMs = Math.round(410 / state.speechRate);
      state.speechTimer = setInterval(() => {
        idx++;
        if (idx < words.length) {
          state.spokenWordIndex = idx;
          renderBookPage();
        } else {
          stopAllSpeech();
        }
      }, stepMs);

      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(fullText);
          utter.lang = state.lang === "kk" ? "kk-KZ" : "ru-RU";
          utter.rate = state.speechRate;

          let charStarts = [];
          let pos = 0;
          words.forEach((w, wIdx) => {
            charStarts.push({ pos, wIdx });
            pos += w.length + 1;
          });

          utter.onboundary = (ev) => {
            if (ev.name === "word") {
              clearInterval(state.speechTimer);
              let matched = 0;
              for (let i = 0; i < charStarts.length; i++) {
                if (ev.charIndex >= charStarts[i].pos) matched = charStarts[i].wIdx;
              }
              state.spokenWordIndex = matched;
              renderBookPage();
            }
          };

          utter.onend = () => stopAllSpeech();
          utter.onerror = () => {};
          window.speechSynthesis.speak(utter);
        } catch (e) {}
      }
    }

    function updateReaderSpeakUI() {
      const t = UI_STRINGS[state.lang];
      const iconEl = document.getElementById("book-speak-icon");
      const lblEl = document.getElementById("ui-book-speak-lbl");
      const stopEl = document.getElementById("btn-book-stop");
      if (!iconEl || !lblEl) return;
      if (state.isSpeaking) {
        iconEl.innerHTML = icon("pause", "w-5 h-5", 2.5);
        lblEl.textContent = t.bookPause;
        stopEl.classList.remove("hidden");
      } else {
        iconEl.innerHTML = icon("speaker", "w-5 h-5");
        lblEl.textContent = t.bookSpeak;
        stopEl.classList.add("hidden");
      }
    }

    /**
     * 8. ACCESSIBILITY PROFILES & NAVIGATION
     */
    function setAccessibilityProfile(prof) {
      stopAllSpeech();
      state.profile = prof;
      document.body.classList.remove(
        "profile-standard",
        "profile-dyslexia",
        "profile-asd",
        "profile-adhd",
        "profile-vision"
      );
      document.body.classList.add(`profile-${prof}`);

      if (prof === "dyslexia") {
        state.bookSyllables = true;
        state.readingRuler = true;
        state.readerSize = 22;
      } else if (prof === "adhd") {
        state.readingRuler = true;
        state.rulerLineIndex = 0;
      } else if (prof === "vision") {
        state.readerSize = 25;
      } else if (prof === "standard") {
        state.bookSyllables = false;
        state.readingRuler = false;
        state.readerSize = 20;
      }

      document.documentElement.style.setProperty("--reader-size", `${state.readerSize}px`);
      showToast(UI_STRINGS[state.lang].profiles[prof], "🎯");
      renderAll();
    }

    function setLanguage(lang) {
      stopAllSpeech();
      state.lang = lang;
      state.selectedWord = null;
      loadAdapterPreset("water", true);
      selectTodoPreset("math", true);
      renderAll();
    }

    function navigateView(viewName) {
      stopAllSpeech();
      state.view = viewName;
      ["hub", "library", "reader", "adapter", "board", "todo", "schedule", "aac"].forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.toggle("hidden", v !== viewName);
      });
      if (viewName !== "board") stopBoardCamera();
      if (viewName === "board") requestAnimationFrame(() => {
        boardCanvasSize(true);
        initBoardPointerDrawing();
      });
      window.scrollTo({ top: 0, behavior: state.profile === "asd" ? "auto" : "smooth" });
      renderAll();
      trackUsage(viewName);
    }

    // Статистика использования разделов (для родительской страницы)
    function trackUsage(section) {
      if (!section || section === "hub") return;
      try {
        fetch("/api/usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section })
        }).catch(() => {});
      } catch (e) {}
    }

    // Calm Break Breathing Modal
    let breatheInterval = null;
    function openCalmBreakModal() {
      stopAllSpeech();
      const modal = document.getElementById("calm-break-modal");
      modal.classList.remove("hidden");
      let inhale = true;
      const phaseEl = document.getElementById("breathe-phase-text");
      phaseEl.textContent = UI_STRINGS[state.lang].breatheIn;
      clearInterval(breatheInterval);
      breatheInterval = setInterval(() => {
        inhale = !inhale;
        phaseEl.textContent = inhale ? UI_STRINGS[state.lang].breatheIn : UI_STRINGS[state.lang].breatheOut;
      }, 2500);
    }

    function closeCalmBreakModal() {
      clearInterval(breatheInterval);
      document.getElementById("calm-break-modal").classList.add("hidden");
    }

    function openProfilePicker() {
      renderHeaderAndNav();
      document.getElementById("profile-picker-modal").classList.remove("hidden");
    }
    function closeProfilePicker() {
      document.getElementById("profile-picker-modal").classList.add("hidden");
    }
    function pickProfile(key) {
      closeProfilePicker();
      setAccessibilityProfile(key);
    }

    /**
     * 9. BOOK LIBRARY & INTERACTIVE READER ACTIONS
     */
    function openReaderWithBook(bookId) {
      stopAllSpeech();
      state.bookId = bookId;
      state.bookPage = 0;
      state.rulerLineIndex = 0;
      state.selectedWord = null;
      navigateView("reader");
    }

    function setBookMode(mode) {
      stopAllSpeech();
      state.bookMode = mode;
      state.rulerLineIndex = 0;
      renderBookPage();
      renderReaderToolbar();
    }

    function toggleBookSyllables() {
      state.bookSyllables = !state.bookSyllables;
      renderBookPage();
      renderReaderToolbar();
      renderWordHelperCard();
    }

    function toggleReadingRuler() {
      state.readingRuler = !state.readingRuler;
      state.rulerLineIndex = 0;
      renderBookPage();
      renderReaderToolbar();
    }

    function stepReadingRuler(delta) {
      const book = BOOKS_DATA.find(b => b.id === state.bookId)[state.lang];
      const lines = state.bookMode === "simple" ? book.pages[state.bookPage].simple : book.pages[state.bookPage].normal;
      state.rulerLineIndex = (state.rulerLineIndex + delta + lines.length) % lines.length;
      renderBookPage();
    }

    function setBookSpeechRate(rate) {
      state.speechRate = rate;
      if (state.isSpeaking) {
        stopAllSpeech();
        toggleBookReadAloud();
      }
      renderReaderToolbar();
    }

    function adjustReaderSize(delta) {
      state.readerSize = Math.min(30, Math.max(16, state.readerSize + delta));
      document.documentElement.style.setProperty("--reader-size", `${state.readerSize}px`);
      renderReaderToolbar();
    }

    function turnBookPage(delta) {
      stopAllSpeech();
      const book = BOOKS_DATA.find(b => b.id === state.bookId)[state.lang];
      const next = state.bookPage + delta;
      if (next < 0) return;
      if (next >= book.pages.length) {
        playSoftTone(659.25);
        showToast(UI_STRINGS[state.lang].pageFinish, "🌟");
        navigateView("library");
        return;
      }
      state.bookPage = next;
      state.rulerLineIndex = 0;
      state.selectedWord = null;
      playSoftTone(523.25);
      renderBookPage();
      renderWordHelperCard();
    }

    function handleWordClick(rawWord) {
      stopAllSpeech();
      const clean = rawWord.replace(/[.,!?;:()«»"—–-]/g, "");
      if (!clean) return;
      state.selectedWord = clean;
      playSoftTone(587.33);
      renderBookPage();
      renderWordHelperCard();
      speakPhraseSimple(clean, 0.72);
    }

    function getChildFriendlyWordExplanation(word) {
      const lower = word.toLowerCase();
      if (WORD_GLOSSARY[lower]) return WORD_GLOSSARY[lower];
      // Partial stem match in glossary
      for (const [key, val] of Object.entries(WORD_GLOSSARY)) {
        if (lower.startsWith(key.slice(0, 5)) && key.length >= 5) return val;
      }
      if (state.lang === "kk") {
        return `«${word}» — бұл сөйлемдегі маңызды сөз. Төмендегі батырманы басып, оның баяу айтылуын тыңдай аласың.`;
      }
      return `«${word}» — важное слово из этого предложения. Нажми кнопку ниже, чтобы послушать, как оно звучит медленно и чётко.`;
    }

    /**
     * 10. AI LESSON ADAPTER "1 IN 4" (GEMINI API + BUILT-IN FALLBACK)
     */
    function loadAdapterPreset(key, silent = false) {
      const preset = ADAPTER_PRESETS[key][state.lang];
      document.getElementById("adapter-input-title").value = preset.title;
      document.getElementById("adapter-input-text").value = preset.text;
      state.adapterPresetKey = key;
      state.adapterData = preset;
      state.adapterQuizAnswer = null;
      if (!silent) renderAdapterOutput();
    }

    async function runLessonAdapterAI() {
      const titleVal = document.getElementById("adapter-input-title").value.trim();
      const textVal = document.getElementById("adapter-input-text").value.trim();
      if (!textVal && !titleVal) {
        showToast(state.lang === "ru" ? "Введите тему или текст урока" : "Тақырып немесе мәтін енгізіңіз", "⚠️");
        return;
      }

      const btn = document.getElementById("btn-generate-4in1");
      const spinner = document.getElementById("adapter-spinner");
      btn.disabled = true;
      spinner.classList.remove("hidden");

      // Если в поле остался стартовый учебный абзац из пресета, а пользователь
      // ввёл свою тему — адаптируем по теме, а не по чужому параграфу.
      // (Сравнение нормализованное и со всеми пресетами — не зависит от порядка кликов)
      let sendText = textVal;
      if (sendText && titleVal) {
        const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
        const l10nPresets = Object.values(ADAPTER_PRESETS).map((p) => p[state.lang]).filter(Boolean);
        const matched = l10nPresets.find((p) => norm(p.text) === norm(textVal));
        const titleIsPreset = l10nPresets.some((p) => norm(p.title) === norm(titleVal));
        if (matched && !titleIsPreset) {
          sendText = "";
          // убираем старый текст из поля, чтобы поведение было прозрачным
          document.getElementById("adapter-input-text").value = "";
        }
      }

      let parsed = null;
      try {
        const res = await fetch("/api/adapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: titleVal, text: sendText, lang: state.lang })
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        parsed = await res.json();
      } catch (e) {
        // Сервер сам отвечает локальным фолбэком при сбое LLM; сюда попадаем только при потере сети
        showToast(state.lang === "ru" ? "Соединение с сервером потеряно" : "Серверге байланыс жоқ", "⚠️");
        btn.disabled = false;
        spinner.classList.add("hidden");
        return;
      }

      state.adapterData = parsed;
      state.adapterQuizAnswer = null;
      btn.disabled = false;
      spinner.classList.add("hidden");
      playSoftTone(659.25);
      showToast(state.lang === "ru" ? "Урок адаптирован в 4 формата!" : "Сабақ 4 форматқа бейімделді!", "✨");
      renderAdapterOutput();
    }

    /**
     * 11. SMART TASK BREAKER (GOBLIN TOOLS MAGIC TODO)
     */
    function selectTodoPreset(key, silent = false) {
      const p = TODO_PRESETS[key][state.lang];
      state.todoTaskTitle = p.title;
      document.getElementById("todo-custom-input").value = p.title;
      state.todoSteps = [...p[state.todoLevel]];
      state.todoChecked = state.todoSteps.map(() => false);
      if (!silent) renderTodoSteps();
    }

    function setTodoLevel(lvl) {
      state.todoLevel = lvl;
      renderTodoToolbar();
      // Re-run breakdown on current task
      const curTitle = document.getElementById("todo-custom-input").value.trim();
      for (const key of Object.keys(TODO_PRESETS)) {
        if (TODO_PRESETS[key][state.lang].title === curTitle) {
          selectTodoPreset(key);
          return;
        }
      }
      runTaskBreakerAI();
    }

    async function runTaskBreakerAI() {
      const taskText = document.getElementById("todo-custom-input").value.trim();
      if (!taskText) {
        showToast(state.lang === "ru" ? "Напишите задание" : "Тапсырманы жазыңыз", "⚠️");
        return;
      }

      // Check if matches preset first
      for (const key of Object.keys(TODO_PRESETS)) {
        if (TODO_PRESETS[key][state.lang].title.toLowerCase() === taskText.toLowerCase()) {
          selectTodoPreset(key);
          return;
        }
      }

      const btn = document.getElementById("btn-break-task");
      const spinner = document.getElementById("todo-spinner");
      btn.disabled = true;
      spinner.classList.remove("hidden");

      let stepsArr = null;
      try {
        const res = await fetch("/api/todo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: taskText, level: state.todoLevel, lang: state.lang })
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.steps)) stepsArr = data.steps;
        }
      } catch (e) {}

      if (!stepsArr || !Array.isArray(stepsArr)) {
        const isKK = state.lang === "kk";
        stepsArr = isKK
          ? [
              `Жұмыс орнын дайындау: «${taskText}»`,
              "Қажетті құралдарды үстелге қою",
              "Бірінші кішкентай бөлігін орындау",
              "Терең тыныс алып, 1 минут демалу",
              "Қалған бөлігін байсалды аяқтау"
            ]
          : [
              `Подготовить рабочее место для: «${taskText}»`,
              "Положить рядом всё необходимое",
              "Сделать самую первую маленькую часть",
              "Сделать спокойный вдох и выдох",
              "Завершить оставшуюся часть без спешки"
            ];
      }

      state.todoTaskTitle = taskText;
      state.todoSteps = stepsArr;
      state.todoChecked = stepsArr.map(() => false);
      btn.disabled = false;
      spinner.classList.add("hidden");
      playSoftTone(587.33);
      renderTodoSteps();
    }

    function toggleTodoStep(idx) {
      state.todoChecked[idx] = !state.todoChecked[idx];
      if (state.todoChecked[idx]) playSoftTone(659.25);
      renderTodoSteps();
    }

    /**
     * 12. VISUAL SCHEDULE, SOCIAL STORY & AAC SENTENCE BUILDER
     */
    function toggleScheduleCard(idx) {
      state.scheduleDone[idx] = !state.scheduleDone[idx];
      if (state.scheduleDone[idx]) playSoftTone(587.33);
      renderScheduleView();
    }

    function speakSocialStoryText() {
      const items = SCHEDULE_DATA[state.lang].story;
      const text = items.map(i => `${i.title}. ${i.text}`).join(" ");
      speakPhraseSimple(text, state.speechRate);
    }

    function addAACCard(pictoId) {
      const item = AAC_PICTOGRAMS.find(p => p.id === pictoId);
      if (!item) return;
      state.aacPhrase.push(item);
      playSoftTone(523.25);
      speakPhraseSimple(item[state.lang], 0.9);
      renderAACView();
    }

    function backspaceAAC() {
      state.aacPhrase.pop();
      renderAACView();
    }

    function clearAAC() {
      state.aacPhrase = [];
      renderAACView();
    }

    function speakAACSentence() {
      if (!state.aacPhrase.length) {
        showToast(UI_STRINGS[state.lang].aacPlaceholder, "💬");
        return;
      }
      const sentence = state.aacPhrase.map(p => p[state.lang]).join(" ");
      speakPhraseSimple(sentence, 0.88);
    }

    /**
     * 13. COMPLETE RENDERING PIPELINE
     */
    function renderAll() {
      renderHeaderAndNav();
      renderHubAndLibrary();
      renderReaderToolbar();
      renderBookPage();
      renderWordHelperCard();
      renderAdapterOutput();
      renderTodoToolbar();
      renderTodoSteps();
      renderScheduleView();
      renderAACView();
      renderBoard();
      renderAssistant();
      applyScrollFades();
    }

    // Правое затухание у скроллируемых рядов шапки, если контент не влезает
    function applyScrollFades() {
      ["profile-selector-bar", "top-nav-pills"].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const overflow = el.scrollWidth > el.clientWidth + 4;
        const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
        el.classList.toggle("fade-edge", overflow && !atEnd);
      });
    }
    window.addEventListener("resize", applyScrollFades);
    window.addEventListener("load", applyScrollFades);

    function renderHeaderAndNav() {
      const t = UI_STRINGS[state.lang];
      document.getElementById("ui-brand-badge").textContent = t.brandBadge;
      document.getElementById("ui-break-btn").textContent = t.breakBtn;

      // Заголовок раздела в топбаре (ПК)
      document.getElementById("ui-view-title").textContent =
        t.nav[state.view === "reader" ? "library" : state.view] || t.nav.hub;

      // Подписи секций сайдбара
      document.getElementById("ui-sidebar-profiles-lbl").textContent = t.sidebarProfilesLbl;
      document.getElementById("ui-sidebar-nav-lbl").textContent = t.sidebarNavLbl;

      // Language Switcher Buttons (мобайл-хедер + сайдбар)
      const mRu = document.getElementById("lang-btn-ru");
      const mKk = document.getElementById("lang-btn-kk");
      if (mRu) mRu.className = `tactile-btn px-1.5 sm:px-2.5 py-1.5 rounded-2xl text-[11px] sm:text-xs font-extrabold ${state.lang === "ru" ? "btn-sage shadow-sm" : "opacity-75"}`;
      if (mKk) mKk.className = `tactile-btn px-1.5 sm:px-2.5 py-1.5 rounded-2xl text-[11px] sm:text-xs font-extrabold ${state.lang === "kk" ? "btn-sage shadow-sm" : "opacity-75"}`;
      const sRu = document.getElementById("lang-btn-ru-sb");
      const sKk = document.getElementById("lang-btn-kk-sb");
      if (sRu) sRu.className = `tactile-btn flex-1 py-1.5 rounded-xl text-xs font-extrabold text-center ${state.lang === "ru" ? "btn-sage shadow-sm" : "opacity-75"}`;
      if (sKk) sKk.className = `tactile-btn flex-1 py-1.5 rounded-xl text-xs font-extrabold text-center ${state.lang === "kk" ? "btn-sage shadow-sm" : "opacity-75"}`;

      // Режимы ребёнка в сайдбаре (PC-app: вертикальный список)
      const profBar = document.getElementById("sidebar-profiles");
      profBar.innerHTML = Object.entries(t.profiles).map(([key, label]) => {
        const active = state.profile === key;
        return `
          <button onclick="setAccessibilityProfile('${key}')"
            class="tactile-btn w-full px-3 py-2 rounded-xl border-2 flex items-center gap-2.5 text-left ${
              active ? "pill-sage border-transparent shadow-sm" : "bento-soft border-transparent hover:opacity-90"
            }">
            <span class="w-9 h-9 rounded-lg ${active ? "bg-white/25" : "bento-soft"} flex items-center justify-center shrink-0">
              ${icon(PROFILE_ICONS[key] || "star", "w-5 h-5", 2.2)}
            </span>
            <span class="text-sm font-extrabold truncate">${stripLeadingEmoji(label)}</span>
          </button>
        `;
      }).join("");

      // Mobile profile picker: compact button (слева) + шторка со всеми режимами
      document.getElementById("profile-picker-icon").innerHTML = icon(PROFILE_ICONS[state.profile] || "star", "w-5 h-5", 2.2);
      document.getElementById("profile-picker-chevron").innerHTML = icon("chevronDown", "w-4 h-4", 2.4);
      document.getElementById("profile-picker-label").textContent = t.profileShort[state.profile] || t.profiles[state.profile];
      document.getElementById("ui-picker-title").textContent = t.profilePickerTitle;
      document.getElementById("ui-picker-hint").textContent = t.profilePickerHint;
      document.getElementById("profile-picker-list").innerHTML = Object.entries(t.profiles)
        .map(([key, label]) => {
          const active = state.profile === key;
          return `
            <button onclick="pickProfile('${key}')"
              class="tactile-btn w-full px-3.5 py-3 rounded-2xl border-2 flex items-center gap-3 text-left ${
                active ? "pill-sage border-transparent shadow-sm" : "bento-soft border-transparent"
              }">
              <span class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-white/25" : "bento-soft"}">
                ${icon(PROFILE_ICONS[key] || "star", "w-5 h-5", 2.2)}
              </span>
              <span class="flex flex-col min-w-0 flex-1">
                <span class="text-sm font-extrabold leading-tight">${stripLeadingEmoji(label)}</span>
                <span class="text-xs font-semibold leading-snug" style="color: ${active ? "var(--sage)" : "var(--text-muted)"};">${t.profileDesc[key]}</span>
              </span>
              ${active ? icon("checkCircle", "w-5 h-5", 2.2) : ""}
            </button>
          `;
        })
        .join("");

      // Навигация: вертикальный список в сайдбаре (ПК) + таб-бар внизу (мобайл)
      const sideNav = document.getElementById("sidebar-nav");
      sideNav.innerHTML = Object.entries(t.nav).map(([vKey, label]) => {
        const active = state.view === vKey || (vKey === "library" && state.view === "reader");
        return `
          <button onclick="navigateView('${vKey}')"
            class="tactile-btn w-full px-3 py-2 rounded-xl border-2 flex items-center gap-2.5 text-left ${
              active ? "pill-amber border-transparent shadow-sm" : "bento-soft border-transparent hover:opacity-90"
            }">
            <span class="w-9 h-9 rounded-lg ${active ? "bg-white/25" : "bento-soft"} flex items-center justify-center shrink-0">
              ${icon(NAV_ICONS[vKey] || "home", "w-5 h-5", 2.2)}
            </span>
            <span class="text-sm font-extrabold truncate">${stripLeadingEmoji(label)}</span>
          </button>
        `;
      }).join("");

      const tabGrid = document.getElementById("bottom-tab-grid");
      tabGrid.innerHTML = Object.entries(t.nav).map(([vKey]) => {
        const active = state.view === vKey || (vKey === "library" && state.view === "reader");
        return `
          <button onclick="navigateView('${vKey}')" class="tactile-btn flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 min-w-0 flex-1 ${active ? "pill-amber" : ""}" aria-label="${t.nav[vKey]}">
            ${icon(NAV_ICONS[vKey] || "home", "w-6 h-6", active ? 2.4 : 2)}
            <span class="text-[9px] sm:text-[10px] font-extrabold leading-none max-w-full truncate">${t.navShort[vKey]}</span>
          </button>
        `;
      }).join("");

      // Modal strings
      document.getElementById("ui-modal-break-title").textContent = t.modalBreakTitle;
      document.getElementById("ui-modal-break-desc").textContent = t.modalBreakDesc;
      document.getElementById("ui-modal-break-close").textContent = t.modalBreakClose;
    }

    function renderHubAndLibrary() {
      const t = UI_STRINGS[state.lang];
      document.getElementById("ui-hub-welcome").textContent = t.hubWelcome;
      document.getElementById("ui-hub-desc").textContent = t.hubDesc;
      document.getElementById("ui-hub-quick-read").textContent = t.hubQuickRead;

      document.getElementById("ui-cell1-title").textContent = t.cell1Title;
      document.getElementById("ui-cell1-all-btn").textContent = t.cell1AllBtn;
      document.getElementById("ui-cell1-desc").textContent = t.cell1Desc;
      document.getElementById("ui-cell2-title").textContent = t.cell2Title;
      document.getElementById("ui-cell2-desc").textContent = t.cell2Desc;
      document.getElementById("ui-cell2-cta").textContent = t.cell2Cta;
      document.getElementById("ui-cell3-title").textContent = t.cell3Title;
      document.getElementById("ui-cell3-desc").textContent = t.cell3Desc;
      document.getElementById("ui-cell3-cta").textContent = t.cell3Cta;
      document.getElementById("ui-cell4-title").textContent = t.cell4Title;
      document.getElementById("ui-cell4-desc").textContent = t.cell4Desc;
      document.getElementById("ui-cell4-cta").textContent = t.cell4Cta;
      document.getElementById("ui-cell5-title").textContent = t.cell5Title;
      document.getElementById("ui-cell5-desc").textContent = t.cell5Desc;
      document.getElementById("ui-cell5-cta").textContent = t.cell5Cta;
      document.getElementById("ui-cell6-title").textContent = t.cell6Title;
      document.getElementById("ui-cell6-desc").textContent = t.cell6Desc;
      document.getElementById("ui-cell6-cta").textContent = t.cell6Cta;

      document.getElementById("ui-lib-title").textContent = t.libTitle;
      document.getElementById("ui-lib-sub").textContent = t.libSub;
      ["1", "2", "3", "4", "5", "6"].forEach(n => {
        const el = document.getElementById(`ui-back-hub-${n}`);
        if (el) el.textContent = t.backHub;
      });

      // Render 4 Books inside Hub Cell 1
      const hubGrid = document.getElementById("hub-books-grid");
      hubGrid.innerHTML = BOOKS_DATA.map(book => {
        const loc = book[state.lang];
        return `
          <button onclick="openReaderWithBook('${book.id}')"
            class="tactile-btn bento-soft p-3.5 text-left flex flex-col justify-between gap-2.5 border-2 border-transparent hover:border-current transition-all">
            <div class="relative w-full aspect-[3/4] rounded-2xl overflow-hidden">
              ${getBookCoverHTML(book.id, false)}
            </div>
            <div>
              <span class="text-[11px] font-extrabold pill-${book.accent} px-2.5 py-0.5 rounded-full">
                ${loc.tag}
              </span>
              <h3 class="font-nunito font-black text-sm sm:text-base mt-1.5 leading-snug">
                ${loc.title}
              </h3>
            </div>
          </button>
        `;
      }).join("");

      // Render Full Bookshelf Grid in Library View
      const libGrid = document.getElementById("full-library-grid");
      libGrid.innerHTML = BOOKS_DATA.map(book => {
        const loc = book[state.lang];
        return `
          <div class="bento-card bento-card-interactive p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div class="flex flex-col gap-3">
              <div class="relative w-full max-w-[260px] sm:max-w-[280px] mx-auto aspect-[3/4] rounded-3xl overflow-hidden border-2" style="border-color: var(--border-card);">
                ${getBookCoverHTML(book.id, true)}
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="px-3 py-1 rounded-full text-xs font-extrabold pill-${book.accent}">
                  ${loc.tag}
                </span>
                <span class="text-xs font-bold" style="color: var(--text-muted);">
                  ${t.pagesCount(loc.pages.length)}
                </span>
              </div>
              <h2 class="font-nunito font-black text-xl leading-snug">${loc.title}</h2>
              <p class="text-sm leading-relaxed" style="color: var(--text-muted);">${loc.summary}</p>
            </div>
            <button onclick="openReaderWithBook('${book.id}')" class="tactile-btn w-full py-3.5 rounded-2xl btn-sage font-nunito font-extrabold text-base">
              ${t.readBookBtn}
            </button>
          </div>
        `;
      }).join("");
    }

    function renderReaderToolbar() {
      const t = UI_STRINGS[state.lang];
      document.getElementById("ui-reader-back").textContent = t.readerBack;
      document.getElementById("btn-book-normal").innerHTML = `${icon("book", "w-4 h-4")}<span>${stripLeadingEmoji(t.bookNormal)}</span>`;
      document.getElementById("btn-book-simple").innerHTML = `${icon("sparkles", "w-4 h-4")}<span>${stripLeadingEmoji(t.bookSimple)}</span>`;

      document.getElementById("btn-book-normal").className = `tactile-btn px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 whitespace-nowrap ${
        state.bookMode === "normal" ? "btn-sage shadow-sm" : "opacity-80"
      }`;
      document.getElementById("btn-book-simple").className = `tactile-btn px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 ${
        state.bookMode === "simple" ? "btn-amber shadow-sm" : "opacity-80"
      }`;

      document.getElementById("rate-btn-0.7").textContent = t.rateSlow;
      document.getElementById("rate-btn-0.9").textContent = t.rateCalm;
      document.getElementById("rate-btn-1.1").textContent = t.rateNorm;
      [0.7, 0.9, 1.1].forEach(r => {
        const el = document.getElementById(`rate-btn-${r}`);
        el.className = `px-3 py-1.5 rounded-xl text-xs font-extrabold ${state.speechRate === r ? "btn-sage" : "opacity-75"}`;
      });

      document.getElementById("ui-book-syl-lbl").textContent = t.bookSyl;
      document.getElementById("ui-book-ruler-lbl").textContent = t.bookRuler;
      document.getElementById("ui-ruler-hint").innerHTML = `${icon("ruler", "w-4 h-4")}<span>${stripLeadingEmoji(t.rulerHint)}</span>`;
      document.getElementById("ui-reader-size-badge").textContent = `${state.readerSize}px`;

      document.getElementById("btn-book-syllables").className = `tactile-btn px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 border-2 ${
        state.bookSyllables ? "pill-plum border-current" : "bento-soft border-transparent"
      }`;
      document.getElementById("btn-book-ruler").className = `tactile-btn px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 border-2 ${
        state.readingRuler ? "pill-amber border-current" : "bento-soft border-transparent"
      }`;
      document.getElementById("ruler-nav-bar").classList.toggle("hidden", !state.readingRuler);

      document.getElementById("ui-child-support-lbl").textContent = t.childSupportLbl;
      document.getElementById("ui-sup-read").textContent = t.supRead;
      document.getElementById("ui-sup-simple").textContent = t.supSimple;
      document.getElementById("ui-sup-syllables").textContent = t.supSyllables;
      document.getElementById("ui-sup-break").textContent = t.supBreak;
      updateReaderSpeakUI();
    }

    function renderBookPage() {
      const t = UI_STRINGS[state.lang];
      const bookObj = BOOKS_DATA.find(b => b.id === state.bookId) || BOOKS_DATA[0];
      const book = bookObj[state.lang];
      const totalPages = book.pages.length;
      const curPage = book.pages[state.bookPage];

      document.getElementById("reader-book-tag").textContent = book.tag;
      document.getElementById("reader-page-counter").textContent = t.pageOf(state.bookPage + 1, totalPages);
      document.getElementById("reader-book-title").textContent = state.bookSyllables
        ? book.title.split(/\s+/).map(splitSyllables).join(" ")
        : book.title;
      document.getElementById("reader-book-illustration").innerHTML = `
        <div class="relative w-full max-w-[240px] sm:max-w-[280px] mx-auto aspect-[3/4] rounded-2xl overflow-hidden shadow-md">
          ${getBookCoverHTML(bookObj.id, true)}
        </div>
      `;

      const paragraphs = state.bookMode === "simple" ? curPage.simple : curPage.normal;
      const textContainer = document.getElementById("reader-book-text");
      textContainer.classList.toggle("reading-ruler-on", state.readingRuler);

      let wordCursor = 0;
      textContainer.innerHTML = paragraphs.map((line, lineIdx) => {
        const tokens = line.split(/\s+/).filter(Boolean);
        const wordsHtml = tokens.map(raw => {
          const wIdx = wordCursor++;
          const clean = raw.replace(/[.,!?;:()«»"—–-]/g, "");
          const isSpoken = state.isSpeaking && state.spokenWordIndex === wIdx;
          const isSelected = state.selectedWord && clean.toLowerCase() === state.selectedWord.toLowerCase();
          const shown = state.bookSyllables ? splitSyllables(raw) : raw;

          const cls = ["book-word"];
          if (isSpoken) cls.push("word-spoken");
          else if (isSelected) cls.push("word-selected");

          const escaped = raw.replace(/'/g, "\\'");
          return `<span onclick="event.stopPropagation(); handleWordClick('${escaped}')" class="${cls.join(" ")}">${shown}</span>`;
        }).join(" ");

        const activeRuler = state.readingRuler && state.rulerLineIndex === lineIdx ? "ruler-active" : "";
        return `<div onclick="if(state.readingRuler){ state.rulerLineIndex=${lineIdx}; renderBookPage(); }" class="reader-line-block ${activeRuler}">${wordsHtml}</div>`;
      }).join("");

      // Page Turn Controls
      const prevBtn = document.getElementById("btn-page-prev");
      const nextBtn = document.getElementById("btn-page-next");
      prevBtn.textContent = t.pagePrev;
      prevBtn.disabled = state.bookPage === 0;
      prevBtn.style.opacity = state.bookPage === 0 ? "0.45" : "1";
      nextBtn.textContent = state.bookPage === totalPages - 1 ? t.pageFinish : t.pageNext;

      document.getElementById("page-dots-indicator").innerHTML = book.pages.map((_, idx) => `
        <span class="w-3 h-3 rounded-full ${idx === state.bookPage ? "btn-sage" : "bento-soft"}"></span>
      `).join("");
    }

    function renderWordHelperCard() {
      const t = UI_STRINGS[state.lang];
      document.getElementById("ui-word-helper-title").textContent = t.wordHelperTitle;
      document.getElementById("ui-word-helper-sub").textContent = t.wordHelperSub;

      const card = document.getElementById("word-helper-card");
      if (!state.selectedWord) {
        card.innerHTML = `
          <div class="text-center py-4 flex flex-col items-center gap-3">
            <span class="text-4xl">👆</span>
            <p class="text-sm leading-relaxed" style="color: var(--text-muted);">
              ${t.wordHelperEmpty}
            </p>
          </div>
        `;
        return;
      }

      const word = state.selectedWord;
      const syllables = splitSyllables(word);
      const explanation = getChildFriendlyWordExplanation(word);
      const escaped = word.replace(/'/g, "\\'");

      card.innerHTML = `
        <div class="flex flex-col gap-3">
          <div>
            <span class="text-xs font-extrabold uppercase" style="color: var(--text-muted);">${t.wordSyllablesLbl}</span>
            <div class="font-nunito font-black text-2xl mt-0.5" style="color: var(--sky);">
              ${syllables}
            </div>
          </div>
          <p class="text-sm leading-relaxed">
            ${explanation}
          </p>
          <button onclick="speakPhraseSimple('${escaped}', 0.72)" class="tactile-btn w-full py-3 rounded-2xl btn-sky font-nunito font-extrabold text-sm flex items-center justify-center gap-2">
            <span>${t.wordListenBtn}</span>
          </button>
        </div>
      `;
    }

    function renderAdapterOutput() {
      const t = UI_STRINGS[state.lang];
      document.getElementById("ui-adp-title").textContent = t.adpTitle;
      document.getElementById("ui-adp-sub").textContent = t.adpSub;
      document.getElementById("ui-adp-presets-lbl").textContent = t.adpPresetsLbl;
      document.getElementById("ui-adp-run-btn").textContent = t.adpRunBtn;
      ["water", "silk"].forEach((k) => {
        const el = document.getElementById(`adp-preset-${k}`);
        if (el) el.textContent = ADAPTER_PRESETS[k][state.lang].title;
      });

      const grid = document.getElementById("adapter-output-grid");
      const d = state.adapterData;
      if (!d) return;

      const isKK = state.lang === "kk";
      const quizAnswered = state.adapterQuizAnswer !== null;
      const quizCorrect = state.adapterQuizAnswer === d.quiz.correct;

      grid.innerHTML = `
        <!-- Format 1: Simplified Text (Diffit) -->
        <div class="bento-card p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="px-3 py-1 rounded-full text-xs font-extrabold pill-sage">1. Diffit • ${isKK ? "Жеңіл мәтін (ЗПР)" : "Лёгкий текст (ЗПР)"}</span>
            <button onclick="speakPhraseSimple('${d.simple.join(" ").replace(/'/g, "\\'")}', 0.85)" class="tactile-btn px-3 py-2 rounded-xl bento-soft text-xs font-extrabold flex items-center justify-center">${icon("speaker", "w-4 h-4")}</button>
          </div>
          <div class="space-y-2 text-base leading-relaxed">
            ${d.simple.map(s => `<p class="p-3 rounded-2xl bento-soft">${s}</p>`).join("")}
          </div>
        </div>

        <!-- Format 2: Step-by-Step Micro Cards (LittleLit AI) -->
        <div class="bento-card p-5 flex flex-col gap-3">
          <span class="self-start px-3 py-1 rounded-full text-xs font-extrabold pill-sky">2. LittleLit AI • ${isKK ? "Микро-қадамдар" : "Микро-шаги"}</span>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            ${d.steps.map(st => `
              <div class="p-3.5 rounded-2xl bento-soft">
                <div class="font-nunito font-black text-sm">${st.icon} ${st.title}</div>
                <p class="text-xs mt-1 leading-relaxed" style="color: var(--text-muted);">${st.text}</p>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Format 3: Visual PECS Cards (Boardmaker) -->
        <div class="bento-card p-5 flex flex-col gap-3">
          <span class="self-start px-3 py-1 rounded-full text-xs font-extrabold pill-amber">3. Boardmaker • ${isKK ? "PECS карточкалары" : "Карточки PECS"}</span>
          <div class="grid grid-cols-3 gap-2.5">
            ${d.pecs.map(pc => `
              <button onclick="speakPhraseSimple('${pc.word}. ${pc.desc}', 0.85)" class="tactile-btn p-3 rounded-2xl bento-soft text-center flex flex-col items-center gap-1">
                <span class="text-3xl">${pc.icon}</span>
                <span class="font-nunito font-black text-sm">${pc.word}</span>
                <span class="text-[11px]" style="color: var(--text-muted);">${pc.desc}</span>
              </button>
            `).join("")}
          </div>
        </div>

        <!-- Format 4: Gentle Self-Check Quiz -->
        <div class="bento-card p-5 flex flex-col gap-3">
          <span class="self-start px-3 py-1 rounded-full text-xs font-extrabold pill-plum">4. MagicSchool • ${isKK ? "Жұмсақ тексеру" : "Добрый вопрос"}</span>
          <p class="font-nunito font-extrabold text-base">${d.quiz.q}</p>
          <div class="space-y-2">
            ${d.quiz.options.map((opt, idx) => {
              let cls = "bento-soft";
              if (quizAnswered && state.adapterQuizAnswer === idx) {
                cls = idx === d.quiz.correct ? "btn-sage" : "btn-amber";
              }
              return `
                <button onclick="state.adapterQuizAnswer=${idx}; playSoftTone(587.33); renderAdapterOutput();"
                  class="tactile-btn w-full px-4 py-2.5 rounded-2xl text-left text-sm font-bold ${cls}">
                  ${opt}
                </button>
              `;
            }).join("")}
          </div>
          ${quizAnswered ? `<p class="text-xs font-extrabold" style="color: var(--sage);">${quizCorrect ? (isKK ? "🌟 Тамаша! Дұрыс жауап!" : "🌟 Отлично! Всё верно!") : (isKK ? "💡 Тағы бір рет байқап көр!" : "💡 Попробуй ещё раз — подсказка в тексте!")}</p>` : ""}
        </div>
      `;
    }

    function renderTodoToolbar() {
      const t = UI_STRINGS[state.lang];
      document.getElementById("ui-todo-title").textContent = t.todoTitle;
      document.getElementById("ui-todo-sub").textContent = t.todoSub;
      document.getElementById("ui-todo-presets-lbl").textContent = t.todoPresetsLbl;
      ["math", "bag", "poem"].forEach((k) => {
        const el = document.getElementById(`todo-preset-${k}`);
        if (el) el.textContent = TODO_PRESETS[k][state.lang].title;
      });
      document.getElementById("ui-todo-spice-lbl").textContent = t.todoSpiceLbl;
      document.getElementById("ui-todo-run-btn").textContent = t.todoRunBtn;

      [1, 2, 3].forEach(lvl => {
        const el = document.getElementById(`todo-lvl-${lvl}`);
        el.className = `px-3 py-1.5 rounded-xl text-xs font-extrabold ${state.todoLevel === lvl ? "btn-amber" : "opacity-75"}`;
      });
    }

    function renderTodoSteps() {
      const t = UI_STRINGS[state.lang];
      document.getElementById("todo-active-task-title").textContent = state.todoTaskTitle;
      const doneCount = state.todoChecked.filter(Boolean).length;
      const total = state.todoSteps.length;
      document.getElementById("todo-progress-text").textContent = t.todoDoneCount(doneCount, total);
      const pct = total ? Math.round((doneCount / total) * 100) : 0;
      document.getElementById("todo-progress-bar").style.width = `${pct}%`;

      const listEl = document.getElementById("todo-steps-list");
      listEl.innerHTML = state.todoSteps.map((step, idx) => {
        const checked = state.todoChecked[idx];
        return `
          <button onclick="toggleTodoStep(${idx})"
            class="tactile-btn w-full p-4 rounded-2xl text-left flex items-center gap-3.5 border-2 ${
              checked ? "pill-sage border-current opacity-85" : "bento-soft border-transparent"
            }">
            <span class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${checked ? "btn-sage" : "bento-soft"}">
              ${icon(checked ? "checkCircle" : "circle", "w-4 h-4", checked ? 2.4 : 2)}
            </span>
            <span class="font-nunito font-extrabold text-base ${checked ? "line-through" : ""}">
              ${idx + 1}. ${step}
            </span>
          </button>
        `;
      }).join("");

      const cel = document.getElementById("todo-celebration");
      document.getElementById("ui-todo-done-title").textContent = t.todoDoneTitle;
      document.getElementById("ui-todo-done-sub").textContent = t.todoDoneSub;
      cel.classList.toggle("hidden", !(total > 0 && doneCount === total));
    }

    function renderScheduleView() {
      const t = UI_STRINGS[state.lang];
      document.getElementById("ui-sch-title").textContent = t.schTitle;
      document.getElementById("ui-sch-sub").textContent = t.schSub;
      document.getElementById("ui-sch-board-title").textContent = t.schBoardTitle;
      document.getElementById("ui-sch-tap-hint").textContent = t.schTapHint;
      document.getElementById("ui-soc-title").textContent = t.socTitle;
      document.getElementById("ui-soc-listen").textContent = t.socListen;

      const data = SCHEDULE_DATA[state.lang];
      document.getElementById("visual-schedule-cards").innerHTML = data.cards.map((c, idx) => {
        const done = state.scheduleDone[idx];
        return `
          <button onclick="toggleScheduleCard(${idx})"
            class="tactile-btn p-5 rounded-3xl text-left flex flex-col justify-between gap-3 border-2 ${
              done ? "pill-sage border-current" : "bento-soft border-transparent"
            }">
            <div class="flex items-center justify-between">
              <span class="px-3 py-1 rounded-full text-xs font-black btn-sage">${idx + 1}. ${t.schStages[idx]}</span>
              <span class="w-7 h-7 rounded-full flex items-center justify-center ${done ? "btn-sage" : "bento-soft"}">
                ${icon(done ? "checkCircle" : "circle", "w-4 h-4", done ? 2.4 : 2)}
              </span>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-3xl">${c.icon}</span>
              <div>
                <div class="font-nunito font-black text-base">${c.title}</div>
                <p class="text-xs mt-1 leading-relaxed" style="color: var(--text-muted);">${c.desc}</p>
              </div>
            </div>
          </button>
        `;
      }).join("");

      document.getElementById("social-story-grid").innerHTML = data.story.map(s => `
        <div class="bento-soft p-5 flex flex-col gap-2">
          <span class="text-4xl">${s.icon}</span>
          <h3 class="font-nunito font-black text-base">${s.title}</h3>
          <p class="text-sm leading-relaxed" style="color: var(--text-muted);">${s.text}</p>
        </div>
      `).join("");
    }

    function renderAACView() {
      const t = UI_STRINGS[state.lang];
      document.getElementById("ui-aac-page-title").textContent = t.aacPageTitle;
      document.getElementById("ui-aac-page-sub").textContent = t.aacPageSub;
      document.getElementById("ui-aac-strip-lbl").textContent = t.aacStripLbl;
      document.getElementById("ui-aac-del").textContent = t.aacDel;
      document.getElementById("ui-aac-clear").textContent = t.aacClear;
      document.getElementById("ui-aac-speak-btn").textContent = t.aacSpeakBtn;

      const strip = document.getElementById("aac-sentence-strip");
      if (!state.aacPhrase.length) {
        strip.innerHTML = `<span class="text-sm font-bold px-2" style="color: var(--text-muted);">${t.aacPlaceholder}</span>`;
      } else {
        strip.innerHTML = state.aacPhrase.map(p => `
          <span class="px-3.5 py-2 rounded-2xl pill-${p.color} font-nunito font-black text-sm sm:text-base flex items-center gap-1.5 border" style="border-color: currentColor;">
            <span class="text-xl">${p.icon}</span>
            <span>${p[state.lang]}</span>
          </span>
        `).join("");
      }

      document.getElementById("aac-cards-grid").innerHTML = AAC_PICTOGRAMS.map(p => `
        <button onclick="addAACCard('${p.id}')"
          class="tactile-btn bento-card bento-card-interactive p-5 flex flex-col items-center justify-center text-center gap-2.5">
          <span class="w-16 h-16 rounded-3xl pill-${p.color} flex items-center justify-center text-4xl">
            ${p.icon}
          </span>
          <span class="font-nunito font-black text-base sm:text-lg leading-tight">
            ${p[state.lang]}
          </span>
        </button>
      `).join("");
    }

    // Шапка: тень при прокрутке + точный отступ для липкой панели помощника слов
    const _headerEl = document.querySelector("header");
    function _syncHeaderOffset() {
      if (_headerEl) document.documentElement.style.setProperty("--header-offset", `${_headerEl.offsetHeight + 16}px`);
    }
    window.addEventListener("scroll", () => {
      if (_headerEl) _headerEl.classList.toggle("header-scrolled", window.scrollY > 6);
    }, { passive: true });
    window.addEventListener("resize", _syncHeaderOffset);

    // =====================================================================
    // AI DRAWING BOARD: камера + MediaPipe Hands.
    // Логика: большой палец (tip 4) и указательный (tip 8) соприкасаются
    // (pinch) — рисуем штрих; разведены — курсор движется, штриха нет.
    // Если камера или ИИ-модель недоступны — рисовать можно мышью/пальцем.
    // =====================================================================

    const board = {
      color: "#2E7D6B",
      size: 8,
      camOn: false,
      landmarker: null,
      loadPromise: null,
      rafId: null,
      stream: null,
      lastPinch: false,
      lastPoint: null,
      prevX: null,
      prevY: null,
      statusKey: ""
    };

    function boardEl(id) { return document.getElementById(id); }

    function renderBoard() {
      const t = UI_STRINGS[state.lang];
      const set = (id, v) => { const el = boardEl(id); if (el) el.textContent = v; };
      set("ui-board-title", t.boardTitle);
      set("ui-board-sub", t.boardSub);
      set("ui-board-color-lbl", t.boardColorLbl);
      set("ui-board-size-lbl", t.boardSizeLbl);
      set("ui-board-clear", t.boardClear);
      set("board-cam-btn-lbl", board.camOn ? t.boardStopCam : t.boardStartCam);
      document.querySelectorAll(".board-swatch").forEach(b => {
        const active = String(b.dataset.boardColor).toLowerCase() === board.color.toLowerCase();
        b.style.borderColor = active ? "var(--amber)" : "transparent";
      });
      document.querySelectorAll(".board-size-btn").forEach(b => {
        const active = parseInt(b.dataset.boardSize, 10) === board.size;
        b.style.background = active ? "var(--amber)" : "";
        b.style.color = active ? "#ffffff" : "";
      });
      if (!board.camOn) setBoardStatus("off", t.boardCamOff, "#94A3B8");
    }

    function setBoardStatus(key, text, color) {
      if (board.statusKey === key) return;
      board.statusKey = key;
      const el = boardEl("board-status");
      if (el) { el.textContent = text; el.style.color = color || "#ffffff"; }
    }

    function setBoardColor(color) { board.color = color; renderBoard(); }
    function setBoardSize(size) { board.size = size; renderBoard(); }

    function boardDpr() { return Math.min(window.devicePixelRatio || 1, 2); }

    function boardCanvasSize(preserve = true) {
      const c = boardEl("board-canvas");
      if (!c) return;
      const rect = c.getBoundingClientRect();
      if (rect.width < 10) return;
      let old = null;
      if (preserve && c.width > 10) {
        old = document.createElement("canvas");
        old.width = c.width;
        old.height = c.height;
        old.getContext("2d").drawImage(c, 0, 0);
      }
      c.width = Math.round(rect.width * boardDpr());
      c.height = Math.round(rect.height * boardDpr());
      const ctx = c.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (old) ctx.drawImage(old, 0, 0, c.width, c.height);
      else { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, c.width, c.height); }
    }

    function clearBoardCanvas() {
      const c = boardEl("board-canvas");
      if (!c) return;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, c.width, c.height);
    }

    function loadBoardVision() {
      if (board.loadPromise) return board.loadPromise;
      board.loadPromise = (async () => {
        const mod = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs");
        const fileset = await mod.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        board.landmarker = await mod.HandLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          numHands: 1,
          runningMode: "VIDEO"
        });
        return board.landmarker;
      })();
      return board.loadPromise;
    }

    async function startBoardCamera() {
      const video = boardEl("board-video");
      if (!video) return;
      const t = UI_STRINGS[state.lang];
      setBoardStatus("loading", t.boardLoading, "#FBBF24");
      try {
        board.stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false
        });
      } catch (e) {
        board.camOn = false;
        setBoardStatus("mouse", t.boardMouseMode, "#FCA5A5");
        renderBoard();
        return;
      }
      video.srcObject = board.stream;
      await video.play().catch(() => {});
      board.camOn = true;
      renderBoard();
      requestAnimationFrame(() => {
        boardCanvasSize(true);
        const hc = boardEl("board-hand-canvas");
        if (hc) { hc.width = video.videoWidth || 640; hc.height = video.videoHeight || 480; }
      });
      try {
        await loadBoardVision();
      } catch (e) {
        setBoardStatus("mouse", t.boardMouseMode, "#FCA5A5");
        return;
      }
      board.rafId = requestAnimationFrame(boardLoop);
    }

    function stopBoardCamera() {
      if (board.rafId) { cancelAnimationFrame(board.rafId); board.rafId = null; }
      if (board.stream) { board.stream.getTracks().forEach(tr => tr.stop()); board.stream = null; }
      const video = boardEl("board-video");
      if (video) video.srcObject = null;
      const hc = boardEl("board-hand-canvas");
      if (hc) hc.getContext("2d").clearRect(0, 0, hc.width, hc.height);
      const cur = boardEl("board-cursor");
      if (cur) cur.classList.add("hidden");
      board.lastPinch = false;
      board.lastPoint = null;
      board.prevX = null;
      board.prevY = null;
      if (board.camOn) {
        board.camOn = false;
        const t = UI_STRINGS[state.lang];
        setBoardStatus("off", t.boardCamOff, "#94A3B8");
        renderBoard();
      }
    }

    function toggleBoardCamera() {
      if (board.camOn) stopBoardCamera();
      else startBoardCamera();
    }

    function boardLoop() {
      if (!board.camOn) return;
      board.rafId = requestAnimationFrame(boardLoop);
      const video = boardEl("board-video");
      if (!video || video.readyState < 2 || !board.landmarker) return;

      let res = null;
      try {
        res = board.landmarker.detectForVideo(video, performance.now());
      } catch (e) {
        return;
      }

      const t = UI_STRINGS[state.lang];
      const hc = boardEl("board-hand-canvas");
      const ctxH = hc.getContext("2d");
      ctxH.clearRect(0, 0, hc.width, hc.height);
      const cur = boardEl("board-cursor");

      const hands = res && res.landmarks ? res.landmarks : null;
      if (!hands || !hands.length) {
        board.lastPinch = false;
        board.lastPoint = null;
        board.prevX = null;
        board.prevY = null;
        cur.classList.add("hidden");
        setBoardStatus("nohand", t.boardNoHand, "#E2E8F0");
        return;
      }

      const lm = hands[0];
      // Ладонь (5..17) — масштаб; кончики: большой 4, указательный 8
      const palm = Math.hypot(lm[5].x - lm[17].x, lm[5].y - lm[17].y) || 0.001;
      const pinchDist = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
      const pinching = pinchDist < 0.30 * palm;

      // Оверлей: точки пальцев + линия между ними
      const px = (l) => l.x * hc.width;
      const py = (l) => l.y * hc.height;
      ctxH.lineWidth = 3;
      ctxH.beginPath();
      ctxH.moveTo(px(lm[4]), py(lm[4]));
      ctxH.lineTo(px(lm[8]), py(lm[8]));
      ctxH.strokeStyle = pinching ? "rgba(46,125,107,0.9)" : "rgba(255,255,255,0.5)";
      ctxH.stroke();
      [4, 8].forEach((idx) => {
        ctxH.beginPath();
        ctxH.arc(px(lm[idx]), py(lm[idx]), pinching ? 9 : 6, 0, Math.PI * 2);
        ctxH.fillStyle = pinching ? "rgba(46,125,107,0.95)" : "rgba(255,255,255,0.85)";
        ctxH.fill();
      });

      // Курсор на холсте (зеркало: x инвертируется)
      const c = boardEl("board-canvas");
      const mx = (1 - lm[8].x) * c.clientWidth;
      const my = lm[8].y * c.clientHeight;
      if (!board.lastPoint) board.lastPoint = { x: mx, y: my };
      board.lastPoint.x += (mx - board.lastPoint.x) * 0.45;
      board.lastPoint.y += (my - board.lastPoint.y) * 0.45;
      const sx = board.lastPoint.x * (c.width / c.clientWidth);
      const sy = board.lastPoint.y * (c.height / c.clientHeight);

      cur.classList.remove("hidden");
      cur.style.left = board.lastPoint.x + "px";
      cur.style.top = board.lastPoint.y + "px";

      if (pinching) {
        if (board.lastPinch && board.prevX != null) {
          const ctx = c.getContext("2d");
          ctx.strokeStyle = board.color;
          ctx.lineWidth = board.size * boardDpr();
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(board.prevX, board.prevY);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
        board.lastPinch = true;
        board.prevX = sx;
        board.prevY = sy;
        setBoardStatus("drawing", t.boardDrawing, "#4ADE80");
      } else {
        board.lastPinch = false;
        board.prevX = null;
        board.prevY = null;
        setBoardStatus("pinch", t.boardPinchHint, "#FBBF24");
      }
    }

    // Фолбэк: мышь/тач — холст всегда рисует (работает и без камеры)
    function initBoardPointerDrawing() {
      const c = boardEl("board-canvas");
      if (!c || c.dataset.pointerBound) return;
      c.dataset.pointerBound = "1";
      let drawing = false;
      let last = null;
      const pos = (e) => {
        const r = c.getBoundingClientRect();
        return {
          x: (e.clientX - r.left) * (c.width / r.width),
          y: (e.clientY - r.top) * (c.height / r.height)
        };
      };
      c.addEventListener("pointerdown", (e) => {
        drawing = true;
        last = pos(e);
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
      });
      c.addEventListener("pointermove", (e) => {
        if (!drawing) return;
        const p = pos(e);
        const ctx = c.getContext("2d");
        ctx.strokeStyle = board.color;
        ctx.lineWidth = board.size * boardDpr();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last = p;
      });
      ["pointerup", "pointercancel", "pointerleave"].forEach((ev) =>
        c.addEventListener(ev, () => { drawing = false; last = null; })
      );
    }

    window.addEventListener("resize", () => {
      if (board.camOn) boardCanvasSize(true);
    });

    // =====================================================================
    // ГОЛОСОВЫЙ АССИСТЕНТ (маскот Qamqor):
    //  - плавающая кнопка в правом нижнем углу
    //  - клик -> панель: STT (Web Speech API, ru-RU / kk-KZ) речи ребёнка
    //  - это чат «Твой друг»: ребёнок пишет или диктует, ИИ отвечает поддержкой
    //  - все реплики сохраняются в SQLite (POST /api/chat)
    //  - «Родительский взгляд» -> POST /api/insights (ИИ-агент аналитик)
    // =====================================================================

    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    const assistant = {
      open: false,
      recording: false,
      sr: null,
      finalText: "",
      micError: false,
      history: [],        // {id, role: 'child'|'friend', text, created_at}
      busy: false,        // ожидание ответа ИИ
      lastFriendText: ""  // последний ответ друга (для TTS)
    };

    function renderAssistant() {
      const t = UI_STRINGS[state.lang];
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set("ui-assistant-name", t.assistantName);
      set("ui-assistant-sub", t.assistantSub);
      set("ui-assistant-mic", assistant.recording ? t.assistantMicRec : t.assistantMic);
      set("ui-assistant-mic-hint", assistant.micError ? t.assistantMicError : t.assistantMicHint);
      set("ui-assistant-fallback-hint", t.assistantFallbackHint);
      set("ui-assistant-save-text", t.assistantSaveText);
      set("ui-assistant-memory", t.assistantMemory);
      set("ui-assistant-insights", t.assistantInsights);
      set("ui-insights-title", t.insightsTitle);
      set("ui-insights-sub", t.insightsSub);
      set("ui-insights-close", t.insightsClose);
      const ph = document.getElementById("assistant-chat-input");
      if (ph) ph.placeholder = t.chatPlaceholder;
      const sendBtn = document.getElementById("assistant-send-btn");
      if (sendBtn) sendBtn.classList.toggle("hidden", assistant.recording);

      const micBtn = document.getElementById("assistant-mic-btn");
      if (micBtn) micBtn.classList.toggle("is-recording", assistant.recording);
      // Браузер без STT -> текстовый фолбэк
      const fallback = document.getElementById("assistant-fallback");
      if (fallback) fallback.classList.toggle("hidden", !!SpeechRecognitionImpl);
      if (!SpeechRecognitionImpl) fallback.classList.add("flex");
      const micRow = document.getElementById("assistant-mic-btn");
      if (micRow && !SpeechRecognitionImpl) micRow.classList.add("hidden");
    }

    function assistantTimeLabel(iso) {
      try {
        const d = new Date(iso);
        return d.toLocaleTimeString(state.lang === "kk" ? "kk" : "ru", { hour: "2-digit", minute: "2-digit" });
      } catch (e) {
        return "";
      }
    }

    async function loadChat() {
      try {
        const res = await fetch("/api/messages?limit=30");
        if (!res.ok) return;
        const data = await res.json();
        assistant.history = data.items || [];
        const total = data.total || 0;
        const badge = document.getElementById("assistant-fab-badge");
        if (badge) {
          badge.textContent = total > 99 ? "99+" : String(total);
          badge.classList.toggle("hidden", total === 0);
        }
        renderChat();
      } catch (e) {
        /* сеть недоступна — молча */
      }
    }

    function renderChat() {
      const t = UI_STRINGS[state.lang];
      const box = document.getElementById("assistant-chat");
      if (!box) return;
      const items = assistant.history;
      if (!items.length) {
        box.innerHTML = `<div class="chat-bubble chat-friend">${escapeHtml(t.chatEmpty)}</div>`;
        return;
      }
      box.innerHTML = items.map((m) => {
        if (m.role === "child") {
          return `<div class="chat-bubble chat-child">${escapeHtml(m.text)}</div>`;
        }
        return `<div class="chat-bubble chat-friend">
          <span class="break-words">${escapeHtml(m.text)}</span>
          <button onclick="speakChatMessage(${m.id})" class="chat-speak-btn" aria-label="${t.chatReadAloud}" title="${t.chatReadAloud}">🔊</button>
        </div>`;
      }).join("");
      box.scrollTop = box.scrollHeight;
    }

    function speakChatMessage(id) {
      const m = assistant.history.find((x) => x.id === id);
      if (m) speakPhraseSimple(m.text, 0.9);
    }

    function assistantChatKeydown(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        sendChatFromInput();
      }
    }

    function sendChatFromInput() {
      const input = document.getElementById("assistant-chat-input");
      if (!input) return;
      const text = input.value.trim();
      if (!text || assistant.busy) return;
      input.value = "";
      sendChat(text);
    }

    async function sendChat(text) {
      text = String(text || "").trim().slice(0, 500);
      if (!text || assistant.busy) return;
      assistant.busy = true;
      const sendBtn = document.getElementById("assistant-send-btn");
      if (sendBtn) sendBtn.disabled = true;

      // Оптимистично: сначала показываем реплику ребёнка и «думает…»
      assistant.history.push({ id: 0, role: "child", text, created_at: new Date().toISOString() });
      renderChat();
      const box = document.getElementById("assistant-chat");
      let thinking = null;
      if (box) {
        thinking = document.createElement("div");
        thinking.id = "assistant-thinking";
        thinking.className = "chat-bubble chat-friend chat-thinking";
        thinking.textContent = UI_STRINGS[state.lang].chatThinking;
        box.appendChild(thinking);
        box.scrollTop = box.scrollHeight;
      }
      const removeThinking = () => { if (thinking) { thinking.remove(); thinking = null; } };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang: state.lang })
        });
        const data = await res.json().catch(() => ({}));
        removeThinking();
        const t = UI_STRINGS[state.lang];
        const reply = res.ok && data && data.friend
          ? data.friend
          : (state.lang === "ru" ? "Мне пока не удалось ответить — попробуй ещё разок 💛" : "Мен жауап бере алмадым — қайталап көр 💛");
        assistant.history.push({ id: Date.now(), role: "friend", text: reply, created_at: new Date().toISOString() });
        assistant.lastFriendText = reply;
        renderChat();
        // TTS — читаем ответ друга голосом (как и весь голосовой слой приложения)
        speakPhraseSimple(reply, 0.92);
      } catch (e) {
        removeThinking();
        assistant.history.push({
          id: Date.now(), role: "friend",
          text: state.lang === "ru" ? "Мне пока не удалось ответить — попробуй ещё разок 💛" : "Мен жауап бере алмадым — қайталап көр 💛",
          created_at: new Date().toISOString()
        });
        renderChat();
      }
      assistant.busy = false;
      if (sendBtn) sendBtn.disabled = false;
    }

    function toggleAssistant(force) {
      assistant.open = typeof force === "boolean" ? force : !assistant.open;
      const panel = document.getElementById("assistant-panel");
      if (panel) panel.classList.toggle("hidden", !assistant.open);
      const fab = document.getElementById("assistant-fab");
      if (fab) fab.classList.toggle("is-active", assistant.open);
      if (assistant.open) loadChat();
    }

    function toggleAssistantMic() {
      if (assistant.recording) {
        try { assistant.sr && assistant.sr.stop(); } catch (e) {}
        return;
      }
      if (!SpeechRecognitionImpl) return;
      const rec = new SpeechRecognitionImpl();
      rec.lang = state.lang === "kk" ? "kk-KZ" : "ru-RU";
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 1;
      assistant.sr = rec;
      assistant.finalText = "";
      assistant.micError = false;

      const live = document.getElementById("assistant-live");
      const renderLive = (txt) => {
        if (!live) return;
        live.classList.remove("hidden");
        live.textContent = txt || "\u00A0";
      };

      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) assistant.finalText += r[0].transcript.trim() + " ";
          else interim += r[0].transcript;
        }
        renderLive((assistant.finalText + " " + interim).trim());
      };
      rec.onend = () => {
        assistant.recording = false;
        const text = assistant.finalText.trim();
        if (text) sendChat(text);
        else renderAssistant();
      };
      rec.onerror = (e) => {
        assistant.recording = false;
        if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
          assistant.micError = true;
        }
        renderAssistant();
      };
      try {
        rec.start();
        assistant.recording = true;
        renderAssistant();
        renderLive("\u00A0");
      } catch (e) {
        assistant.recording = false;
        renderAssistant();
      }
    }

    // ---------- Родительский взгляд (ИИ-агент аналитик) ----------

    function openInsightsModal() {
      stopAllSpeech();
      const modal = document.getElementById("insights-modal");
      if (modal) modal.classList.remove("hidden");
      renderInsightsThinking();
      fetchInsights();
    }

    function closeInsightsModal() {
      const modal = document.getElementById("insights-modal");
      if (modal) modal.classList.add("hidden");
    }

    function renderInsightsThinking() {
      const t = UI_STRINGS[state.lang];
      const box = document.getElementById("insights-content");
      if (box) {
        box.innerHTML = `
          <div class="flex flex-col items-center gap-3 py-8">
            <div class="insights-spinner"></div>
            <p class="text-sm font-bold text-center" style="color: var(--text-muted);">${t.insightsThinking}</p>
          </div>`;
      }
    }

    function renderInsightsNoData(msg) {
      const box = document.getElementById("insights-content");
      if (!box) return;
      box.innerHTML = `
        <div class="flex flex-col items-center gap-3 py-8 text-center">
          <span class="text-4xl">🦉</span>
          <p class="text-sm font-bold max-w-sm" style="color: var(--text-muted);">${msg}</p>
        </div>`;
    }

    async function fetchInsights() {
      const t = UI_STRINGS[state.lang];
      try {
        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang: state.lang })
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === "no utterances") renderInsightsNoData(t.insightsNoData);
          else renderInsightsNoData(t.insightsError);
          return;
        }
        renderInsightsData(data);
      } catch (e) {
        renderInsightsNoData(t.insightsError);
      }
    }

    function renderInsightsData(d) {
      const t = UI_STRINGS[state.lang];
      const badge = d.source === "ai"
        ? `<span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold pill-sage">${t.insightsAiBadge}</span>`
        : `<span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold" style="background: var(--amber-soft, #FDF1DC); color: #92610C;">${t.insightsFallbackBadge}</span>`;
      const count = `<span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold bento-soft">${d.count || 0} ${t.insightsPhrasesCount}</span>`;

      const topics = (d.topics || []).map((tp) => `
        <div class="bento-soft rounded-2xl p-3 flex items-start gap-2.5">
          <span class="text-xl leading-none">${tp.icon}</span>
          <div class="min-w-0">
            <div class="text-sm font-extrabold flex items-center gap-2">
              ${escapeHtml(tp.title)}
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bento-card" style="border: 1.5px solid var(--border-card);">×${tp.count}</span>
            </div>
            ${tp.note ? `<p class="text-xs mt-0.5 leading-snug" style="color: var(--text-muted);">${escapeHtml(tp.note)}</p>` : ""}
          </div>
        </div>`).join("");

      const emo = d.emotions || {};
      const emotions = `
        <div class="flex flex-col gap-2">
          ${emo.positive ? `<div class="rounded-2xl p-3" style="background: var(--sage-soft);"><div class="text-[11px] font-extrabold mb-0.5" style="color: var(--sage);">💚 ${t.insightsPosLbl}</div><p class="text-sm font-semibold leading-snug">${escapeHtml(emo.positive)}</p></div>` : ""}
          ${emo.concern ? `<div class="rounded-2xl p-3" style="background: var(--amber-soft, #FDF1DC);"><div class="text-[11px] font-extrabold mb-0.5" style="color: #92610C;">🧡 ${t.insightsConcernLbl}</div><p class="text-sm font-semibold leading-snug">${escapeHtml(emo.concern)}</p></div>` : ""}
        </div>`;

      const moments = (d.key_moments || []).map((m) => `
        <div class="flex items-start gap-2.5 px-1">
          <span class="mt-1 w-2 h-2 rounded-full shrink-0" style="background: var(--sky);"></span>
          <p class="text-sm font-semibold leading-relaxed" style="color: var(--text-main);">«${escapeHtml(m)}»</p>
        </div>`).join("");

      const forParent = (d.for_parent || []).map((p) => `
        <div class="bento-soft rounded-2xl p-3 flex items-start gap-2.5">
          <span class="text-lg leading-none">${p.icon}</span>
          <p class="text-sm font-semibold leading-snug">${escapeHtml(p.text)}</p>
        </div>`).join("");

      document.getElementById("insights-content").innerHTML = `
        <div class="flex flex-wrap items-center gap-2">${badge}${count}</div>
        ${d.summary ? `<p class="text-sm font-bold leading-relaxed" style="color: var(--text-main);">${escapeHtml(d.summary)}</p>` : ""}
        ${topics ? `<div><h3 class="text-xs font-extrabold uppercase tracking-wide mb-2" style="color: var(--text-muted);">${t.insightsTopics}</h3><div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${topics}</div></div>` : ""}
        ${emo.positive || emo.concern ? `<div><h3 class="text-xs font-extrabold uppercase tracking-wide mb-2" style="color: var(--text-muted);">${t.insightsEmotions}</h3>${emotions}</div>` : ""}
        ${moments ? `<div><h3 class="text-xs font-extrabold uppercase tracking-wide mb-2" style="color: var(--text-muted);">${t.insightsKeyMoments}</h3><div class="flex flex-col gap-2">${moments}</div></div>` : ""}
        ${forParent ? `<div><h3 class="text-xs font-extrabold uppercase tracking-wide mb-2" style="color: var(--text-muted);">${t.insightsForParent}</h3><div class="flex flex-col gap-2">${forParent}</div></div>` : ""}
      `;
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[c]));
    }

    // Bootstrap Application
    window.addEventListener("DOMContentLoaded", () => {
      loadAdapterPreset("water", true);
      selectTodoPreset("math", true);
      renderAll();
      _syncHeaderOffset();
      // Fade-затухание исчезает, когда ряд доскроллен до конца
      ["profile-selector-bar", "top-nav-pills"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("scroll", applyScrollFades, { passive: true });
      });
    });
