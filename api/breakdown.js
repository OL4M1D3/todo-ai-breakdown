// Vercel serverless function: calls Groq to split a task into subtasks.
// The API key is read from the GROQ_API_KEY environment variable (never in frontend code).

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b"; // change here (or via env var) if Groq retires the model
const MAX_TASK_LENGTH = 200;
const MAX_SUBTASKS = 10;
const LIMIT_PER_MINUTE = 10;

// Best-effort rate limit (resets when the serverless instance restarts).
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT_PER_MINUTE;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });

  const ip = (req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ error: "Too many requests. Wait a minute and try again." });

  const task = typeof req.body?.task === "string" ? req.body.task.trim().slice(0, MAX_TASK_LENGTH) : "";
  if (!task) return res.status(400).json({ error: "Enter a task first." });
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: "Server is missing GROQ_API_KEY." });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Break the user's task into 4-7 small, actionable subtasks. Reply with only JSON in this form: {"subtasks": ["...", "..."]}. Each subtask is a short phrase.`,
          },
          { role: "user", content: task },
        ],
      }),
    });
    if (!response.ok) {
      console.error("Groq error", response.status, await response.text()); // shows in your terminal / Vercel logs
      return res.status(502).json({ error: "The AI service returned an error. Try again." });
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    const subtasks = (Array.isArray(parsed.subtasks) ? parsed.subtasks : [])
      .filter((s) => typeof s === "string" && s.trim())
      .map((s) => s.trim().slice(0, 120))
      .slice(0, MAX_SUBTASKS);

    if (!subtasks.length) return res.status(502).json({ error: "The AI gave no usable subtasks. Try rewording the task." });
    return res.status(200).json({ subtasks });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong. Try again." });
  }
}