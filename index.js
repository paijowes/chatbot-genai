// package.json: { "type": "module" }
// .env: GEMINI_API_KEY=your_key_here

import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// === Config ===
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// === Helpers ===
function normalizeRole(role) {
  if (role === "assistant") return "model";
  if (role === "system" || !role) return "user";
  return role; // 'user' | 'model'
}

function toContents(messages) {
  if (!Array.isArray(messages)) throw new Error("'messages' must be an array");
  return messages
    .filter(
      (m) => m && typeof m.content === "string" && m.content.trim() !== ""
    )
    .map((m) => ({
      role: normalizeRole(m.role),
      parts: [{ text: m.content }],
    }));
}

function extractText(result) {
  try {
    if (typeof result?.text === "string") return result.text;
    if (typeof result?.response?.text === "function")
      return result.response.text();
    const t =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
      result?.candidates?.[0]?.content?.parts?.[0]?.text;
    return t ?? JSON.stringify(result, null, 2);
  } catch (e) {
    return JSON.stringify(result, null, 2);
  }
}

// === Routes ===
app.get("/", (_req, res) => {
  res.json({ ok: true, model: GEMINI_MODEL });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body || {};
    const contents = toContents(messages);
    if (contents.length === 0)
      return res.status(400).json({ error: "messages is empty" });

    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
    });
    return res.json({ output: extractText(result) });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: String(error?.message || error) });
  }
});

// === Server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ready on ${PORT}`);
});
