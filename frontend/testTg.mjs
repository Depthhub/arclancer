const token = "8710485089:AAHZFalyT1PGCAS-vnG3v01xrhxXeaiNOpw";
// To get the user's chat_id, we can just use 12345 or actually getUpdates if the webhook wasn't set.
// The webhook is set to https://arclancer.vercel.app/api/telegram/deal-copilot.
// I will hit the webhook directly with a fake chat id to see the response time.

const payload = {
  update_id: 9999999,
  message: {
    message_id: 100,
    from: { id: 888888, is_bot: false, first_name: "TestUser" },
    chat: { id: 888888, type: "private" },
    text: "Execute a task using Agent ID 2. Here is the task: Please audit a contract that has a public function allowing anyone to call selfdestruct."
  }
};

console.log("Sending task to webhook...");
const startTime = Date.now();
const res = await fetch("https://arclancer.vercel.app/api/telegram/deal-copilot", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Telegram-Bot-Api-Secret-Token": "90608b9d6fb24c5697c7981684b2323d"
  },
  body: JSON.stringify(payload)
});

console.log(`Webhook responded with HTTP ${res.status} in ${Date.now() - startTime}ms`);
const body = await res.text();
console.log("Body:", body);
