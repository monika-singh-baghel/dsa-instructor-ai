require("dotenv").config();

const express = require("express");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_INSTRUCTION = `
You are DSA Instructor AI, a patient and beginner-friendly Data Structures and Algorithms teacher.
Your target student is a beginner preparing for coding interviews and placements.

For every DSA/coding question, structure the answer with these sections when relevant:
1. Simple idea
2. Intuition
3. Approach
4. Step-by-step explanation
5. C++ solution
6. Dry run with a small example
7. Time complexity
8. Space complexity
9. Common mistakes
10. One short follow-up practice question

Prefer C++ unless the user asks for another language.
Start with the easiest understandable approach, then give an optimized approach when useful.
Do not assume advanced DSA knowledge. Explain unfamiliar terms briefly.
If the question is not related to DSA/coding, politely say that this instructor is specialized for DSA and coding.
Use Markdown formatting and readable code blocks.
`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithRetry(ai, contents) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.4,
          maxOutputTokens: 5000
        }
      });
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.code;
      if (status !== 503 && status !== 429) throw error;
      if (attempt < 3) await sleep(attempt * 2500);
    }
  }
  throw lastError;
}

app.get("/api/config", (req, res) => {
  res.json({ model: MODEL });
});

app.post("/api/ask", async (req, res) => {
  const question = String(req.body?.question || "").trim();

  if (!question) {
    return res.status(400).json({ error: "Please enter a DSA question." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is missing. Create a .env file from .env.example and add your Gemini API key."
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await generateWithRetry(ai, question);
    res.json({ answer: response.text || "Gemini returned an empty response." });
  } catch (error) {
    console.error("Gemini error:", error);
    const status = error?.status || 500;
    let message = "Something went wrong while contacting Gemini.";
    if (status === 503) {
      message = "Gemini is temporarily experiencing high demand. Please try again in a little while.";
    } else if (status === 429) {
      message = "Gemini request limit was reached. Please wait a little and try again.";
    } else if (status === 401 || status === 403) {
      message = "Gemini API key was rejected. Check the key in your .env file.";
    }
    res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\nDSA Instructor AI running at http://localhost:${PORT}`);
  console.log(`Model: ${MODEL}`);
});
