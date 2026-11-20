/**
 * SQLite (встроенный node:sqlite, без внешних зависимостей).
 * Хранилище реплик ребёнка — база для ИИ-агента «Аналитик речи».
 * Файл: data/qamqor.db (в .gitignore).
 */
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, "qamqor.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS utterances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    lang TEXT NOT NULL DEFAULT 'ru',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX IF NOT EXISTS idx_utterances_created ON utterances (created_at);

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL DEFAULT 'child',  -- 'child' | 'friend'
    text TEXT NOT NULL,
    lang TEXT NOT NULL DEFAULT 'ru',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at);

  CREATE TABLE IF NOT EXISTS usage (
    section TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    last_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

// ---- messages (чат «Твой друг») ----
const stmtMsgInsert = db.prepare(
  "INSERT INTO messages (role, text, lang) VALUES (?, ?, ?)"
);
const stmtMsgRecent = db.prepare(
  "SELECT id, role, text, lang, created_at FROM messages ORDER BY id ASC LIMIT ?"
);
const stmtMsgCount = db.prepare("SELECT COUNT(*) AS c FROM messages");
const stmtMsgChildCount = db.prepare(
  "SELECT COUNT(*) AS c FROM messages WHERE role = 'child'"
);
const stmtMsgLastAt = db.prepare(
  "SELECT created_at AS at FROM messages WHERE role = 'child' ORDER BY id DESC LIMIT 1"
);
const stmtMsgDays = db.prepare(
  "SELECT COUNT(DISTINCT substr(created_at, 1, 10)) AS d FROM messages WHERE role = 'child'"
);

function addMessage(role, text, lang = "ru") {
  const l = lang === "kk" ? "kk" : "ru";
  const info = stmtMsgInsert.run(role === "friend" ? "friend" : "child", text, l);
  return Number(info.lastInsertRowid);
}

function recentMessages(limit = 50) {
  return stmtMsgRecent.all(Math.max(1, Math.min(limit, 500)));
}

function countMessages() {
  return Number(stmtMsgCount.get().c);
}

function messageStats() {
  return {
    total: Number(stmtMsgCount.get().c),
    child: Number(stmtMsgChildCount.get().c),
    lastAt: stmtMsgLastAt.get()?.at || null,
    activeDays: Number(stmtMsgDays.get().d),
  };
}

// ---- usage (статистика разделов) ----
const stmtUsageInc = db.prepare(
  `INSERT INTO usage (section, count, last_at)
   VALUES (?, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
   ON CONFLICT(section) DO UPDATE SET
     count = count + 1,
     last_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
);
const stmtUsageAll = db.prepare(
  "SELECT section, count, last_at FROM usage ORDER BY count DESC"
);

function addUsage(section) {
  stmtUsageInc.run(String(section).slice(0, 40));
}

function getUsage() {
  return stmtUsageAll.all();
}

const stmtInsert = db.prepare("INSERT INTO utterances (text, lang) VALUES (?, ?)");
const stmtRecent = db.prepare(
  "SELECT id, text, lang, created_at FROM utterances ORDER BY id DESC LIMIT ?"
);
const stmtAll = db.prepare("SELECT id, text, lang, created_at FROM utterances ORDER BY id ASC");
const stmtCount = db.prepare("SELECT COUNT(*) AS c FROM utterances");
const stmtDeleteAll = db.prepare("DELETE FROM utterances");

function addUtterance(text, lang = "ru") {
  const info = stmtInsert.run(text, lang === "kk" ? "kk" : "ru");
  return Number(info.lastInsertRowid);
}

function recentUtterances(limit = 50) {
  return stmtRecent.all(Math.max(1, Math.min(limit, 200)));
}

function allUtterances() {
  return stmtAll.all();
}

function countUtterances() {
  return Number(stmtCount.get().c);
}

function clearUtterances() {
  return Number(stmtDeleteAll.run().changes);
}

module.exports = {
  addUtterance, recentUtterances, allUtterances, countUtterances, clearUtterances,
  addMessage, recentMessages, countMessages, messageStats,
  addUsage, getUsage,
};
