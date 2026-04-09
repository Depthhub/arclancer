const key = "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";
const model = "google/gemma-4-26b-a4b-it";

const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${key}`
  },
  body: JSON.stringify({
    model,
    messages: [{ role: "user", content: "hello" }],
    max_tokens: 2048
  })
});

const body = await res.text();
console.log(res.status, body);
