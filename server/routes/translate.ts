import { Router } from "express";
import { requireService } from "../lib/supabase.js";

export const translateRouter = Router();

// EN → SW translation via LibreTranslate free API
async function libreTranslate(text: string): Promise<string> {
  const res = await fetch("https://libretranslate.com/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source: "en", target: "sw" }),
  });
  if (!res.ok) throw new Error("Translation failed");
  const data = await res.json();
  return data.translatedText;
}

translateRouter.post("/", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text required" });
    }
    const translated = await libreTranslate(text);
    res.json({ translated });
  } catch (err) {
    console.error("translate error:", err);
    res.status(500).json({ error: "Translation service unavailable" });
  }
});
