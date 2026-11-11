import { secrets } from "base44:runtime";

const API = "https://api.telegram.org";
const CHUNK = 3800;

async function call(token, method, body = {}) {
  const response = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!payload.ok) throw new Error(payload.description || "Telegram refused the request");
  return payload.result;
}

// The report goes to the owner's own chat — the most recent chat that started the bot.
async function ownerChat(token) {
  const updates = await call(token, "getUpdates", { limit: 100, allowed_updates: ["message"] });
  for (let i = updates.length - 1; i >= 0; i -= 1) {
    const id = updates[i]?.message?.chat?.id;
    if (id) return id;
  }
  return null;
}

export async function sendReport(text) {
  const token = secrets.get("TELEGRAM_BOT_TOKEN");
  if (!token) return { ok: false, reason: "no-token" };

  let chatId = null;
  try {
    chatId = await ownerChat(token);
  } catch (error) {
    return { ok: false, reason: "bot", message: String(error.message || "") };
  }
  if (!chatId) return { ok: false, reason: "no-chat" };

  const pieces = [];
  for (let start = 0; start < text.length; start += CHUNK) pieces.push(text.slice(start, start + CHUNK));
  try {
    for (const piece of pieces) {
      await call(token, "sendMessage", { chat_id: chatId, text: piece, disable_web_page_preview: true });
    }
  } catch (error) {
    return { ok: false, reason: "bot", message: String(error.message || "") };
  }
  return { ok: true, messages: pieces.length };
}