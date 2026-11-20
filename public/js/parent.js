// =====================================================================
// Родительская страница: PIN-доступ, прогресс, инсайты, переписка.
// Сервер: /api/parent/* (комок qamqor_parent после верного PIN).
// =====================================================================

const SECTION_NAMES = {
  hub: "Главная",
  library: "Библиотека",
  reader: "Чтение книги",
  adapter: "ИИ-адаптер уроков",
  board: "ИИ-доска",
  todo: "Дробитель задач",
  schedule: "План и история",
  aac: "Карточки AAC",
};
const SECTION_ICONS = {
  hub: "🏠",
  library: "📚",
  reader: "📖",
  adapter: "✨",
  board: "🎨",
  todo: "🪜",
  schedule: "🗓️",
  aac: "💬",
};

function el(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return iso;
  }
}

function fmtTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

function showPin() {
  el("pin-screen").classList.remove("hidden");
  el("pin-screen").classList.add("flex");
  el("parent-main").classList.add("hidden");
  const inp = el("pin-input");
  if (inp) { inp.value = ""; setTimeout(() => inp.focus(), 60); }
}

function showMain() {
  el("pin-screen").classList.add("hidden");
  el("pin-screen").classList.remove("flex");
  el("parent-main").classList.remove("hidden");
}

async function parentLogin() {
  const pin = el("pin-input").value.trim();
  if (!pin) return;
  el("pin-error").classList.add("hidden");
  try {
    const res = await fetch("/api/parent/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      showMain();
      await loadAllData();
    } else {
      el("pin-error").classList.remove("hidden");
      el("pin-input").value = "";
      el("pin-input").focus();
    }
  } catch (e) {
    el("pin-error").classList.remove("hidden");
  }
}

async function parentLogout() {
  try { await fetch("/api/parent/logout", { method: "POST" }); } catch (e) {}
  showPin();
}

async function loadAllData() {
  await Promise.all([loadStats(), loadChat()]);
  // инсайты подгружаем по кнопке (дорогой LLM-вызов)
}

async function loadStats() {
  try {
    const res = await fetch("/api/parent/stats");
    if (res.status === 401) { showPin(); return; }
    if (!res.ok) return;
    const d = await res.json();
    const m = d.messages || {};
    el("stat-messages").textContent = m.total != null ? m.total : 0;
    el("stat-days").textContent = m.activeDays != null ? m.activeDays : 0;
    el("stat-last").textContent = fmtDateTime(m.lastAt);
    const sections = (d.sections || []).filter((s) => s.count > 0);
    el("stat-sections").textContent = sections.length;

    const list = el("usage-list");
    if (!sections.length) {
      list.innerHTML = '<p style="color: var(--text-muted);">Пока нет данных — откройте разделы на странице ребёнка.</p>';
      return;
    }
    const max = Math.max(...sections.map((s) => s.count));
    list.innerHTML = sections.map((s) => {
      const name = SECTION_NAMES[s.section] || s.section;
      const icon = SECTION_ICONS[s.section] || "🧩";
      const w = Math.max(6, Math.round((s.count / max) * 100));
      return `
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between gap-2">
            <span>${icon} ${escapeHtml(name)}</span>
            <span class="text-[11px] font-bold" style="color: var(--text-muted);">×${s.count} · ${fmtTime(s.last_at)}</span>
          </div>
          <div class="h-2 rounded-full bento-soft overflow-hidden">
            <div class="h-full rounded-full" style="width: ${w}%; background: var(--sage);"></div>
          </div>
        </div>`;
    }).join("");
  } catch (e) { /* сеть недоступна */ }
}

async function loadChat() {
  try {
    const res = await fetch("/api/parent/messages");
    if (res.status === 401) { showPin(); return; }
    if (!res.ok) return;
    const d = await res.json();
    const items = d.items || [];
    el("chat-count").textContent = items.length + " сообщений";
    const box = el("chat-list");
    if (!items.length) {
      box.innerHTML = '<p class="text-sm" style="color: var(--text-muted);">Пока нет сообщений — ребёнок ещё не общался с другом.</p>';
      return;
    }
    box.innerHTML = items.map((m) => {
      const isChild = m.role === "child";
      return `
        <div class="flex flex-col gap-0.5 ${isChild ? "items-end" : "items-start"}">
          <div class="chat-bubble ${isChild ? "chat-child" : "chat-friend"}">
            <span class="break-words min-w-0">${escapeHtml(m.text)}</span>
          </div>
          <time class="text-[10px] font-bold px-1" style="color: var(--text-muted);">${isChild ? "Ребёнок · " : "Твой друг · "}${fmtTime(m.created_at)}</time>
        </div>`;
    }).join("");
    box.scrollTop = box.scrollHeight;
  } catch (e) { /* сеть недоступна */ }
}

function renderInsightsThinking() {
  el("insights-body").innerHTML = `
    <div class="flex flex-col items-center gap-3 py-6">
      <div class="insights-spinner"></div>
      <p class="text-sm font-bold text-center" style="color: var(--text-muted);">Аналитик думает… это может занять до минуты</p>
    </div>`;
}

function renderInsightsNoData(msg) {
  el("insights-body").innerHTML = `
    <div class="flex flex-col items-center gap-2 py-6 text-center">
      <span class="text-3xl">🦉</span>
      <p class="text-sm font-bold max-w-sm" style="color: var(--text-muted);">${escapeHtml(msg)}</p>
    </div>`;
}

async function refreshInsights() {
  el("btn-insights").disabled = true;
  renderInsightsThinking();
  try {
    const res = await fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: "ru" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      renderInsightsNoData(data.error === "no utterances" ? "Пока нет ни одной реплики — как только ребёнок пообщается с «Твой друг», здесь появится анализ." : "Не удалось получить анализ. Попробуйте позже.");
      return;
    }
    renderInsightsData(data);
  } catch (e) {
    renderInsightsNoData("Не удалось получить анализ. Попробуйте позже.");
  } finally {
    el("btn-insights").disabled = false;
  }
}

function renderInsightsData(d) {
  const badge = d.source === "ai"
    ? '<span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold pill-sage">ИИ-анализ</span>'
    : d.source === "offline"
    ? '<span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold" style="background: var(--sky-soft); color: var(--sky);">Демо-анализ (офлайн-режим)</span>'
    : '<span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold" style="background: var(--amber-soft); color: #92610C;">Упрощённый анализ (ИИ сейчас перегружен)</span>';
  const count = `<span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold bento-soft">${d.count || 0} фраз проанализировано</span>`;

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
      ${emo.positive ? `<div class="rounded-2xl p-3" style="background: var(--sage-soft);"><div class="text-[11px] font-extrabold mb-0.5" style="color: var(--sage);">💚 Радует</div><p class="text-sm font-semibold leading-snug">${escapeHtml(emo.positive)}</p></div>` : ""}
      ${emo.concern ? `<div class="rounded-2xl p-3" style="background: var(--amber-soft);"><div class="text-[11px] font-extrabold mb-0.5" style="color: #92610C;">🧡 Стоит обратить внимание</div><p class="text-sm font-semibold leading-snug">${escapeHtml(emo.concern)}</p></div>` : ""}
    </div>`;

  const moments = (d.key_moments || []).map((m) => `
    <div class="flex items-start gap-2.5 px-1">
      <span class="mt-1.5 w-2 h-2 rounded-full shrink-0" style="background: var(--sky);"></span>
      <p class="text-sm font-semibold leading-relaxed">«${escapeHtml(m)}»</p>
    </div>`).join("");

  const forParent = (d.for_parent || []).map((p) => `
    <div class="bento-soft rounded-2xl p-3 flex items-start gap-2.5">
      <span class="text-lg leading-none">${p.icon}</span>
      <p class="text-sm font-semibold leading-snug">${escapeHtml(p.text)}</p>
    </div>`).join("");

  el("insights-body").innerHTML = `
    <div class="flex flex-wrap items-center gap-2">${badge}${count}</div>
    ${d.summary ? `<p class="text-sm font-bold leading-relaxed">${escapeHtml(d.summary)}</p>` : ""}
    ${topics ? `<div><h3 class="text-xs font-extrabold uppercase tracking-wide mb-2" style="color: var(--text-muted);">О чём говорит ребёнок</h3><div class="grid grid-cols-1 gap-2">${topics}</div></div>` : ""}
    ${emo.positive || emo.concern ? `<div><h3 class="text-xs font-extrabold uppercase tracking-wide mb-2" style="color: var(--text-muted);">Эмоции</h3>${emotions}</div>` : ""}
    ${moments ? `<div><h3 class="text-xs font-extrabold uppercase tracking-wide mb-2" style="color: var(--text-muted);">Ключевые моменты</h3><div class="flex flex-col gap-2">${moments}</div></div>` : ""}
    ${forParent ? `<div><h3 class="text-xs font-extrabold uppercase tracking-wide mb-2" style="color: var(--text-muted);">Что сделать родителю</h3><div class="flex flex-col gap-2">${forParent}</div></div>` : ""}
  `;
}

// Bootstrap
(async function init() {
  try {
    const res = await fetch("/api/parent/stats");
    if (res.status === 401) { showPin(); return; }
    showMain();
    await loadAllData();
  } catch (e) {
    showPin();
  }
})();
