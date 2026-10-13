import http from "node:http";

/** A stand-in for OpenRouter. It follows the same price rules the real prompt describes, so the tests exercise the server's enforcement. */
export const STUB_PORT = Number(process.env.E2E_PORT ?? 3200) + 100;

type Part = { type: string; text?: string; cache_control?: unknown };
type Msg = { role: string; content: string | Part[] };

/** The customer's words in a message: its first text block. */
const textOf = (content: string | Part[]) =>
  typeof content === "string" ? content : (content.find((part) => part.type === "text")?.text ?? "");

/** What the site added after the customer's words: the last text block. */
const noteOf = (content: string | Part[]) =>
  typeof content === "string" ? content : ([...content].reverse().find((part) => part.type === "text")?.text ?? "");

const CORRECTION = "[SITE NOTE] Your last reply";

/** The system prompt as the model sees it: every text block, joined. */
const systemText = (message: Msg) =>
  typeof message.content === "string" ? message.content : message.content.flatMap((part) => (part.type === "text" ? [part.text ?? ""] : [])).join("\n");

/** What the app sent besides the messages, so the tests can check the request itself. */
type Raw = { reasoning?: unknown; temperature?: number };

const BRIEF = {
  name: "E2E Tester",
  contact: "e2e@example.com",
  project: "Survival game inventory",
  platform: "Roblox",
  frames: 10,
  styleReplication: false,
  screens: ["Inventory"],
  style: "dark",
  references: "",
  deadline: "Flexible",
  budget: "",
  extras: "",
  summary:
    "OVERVIEW: A survival game needs an inventory and crafting menu in a dark style for Roblox. SCREENS: inventory grid, crafting list, item detail. STYLE DIRECTION: dark and gritty. TIMELINE: flexible. BUDGET AND PRICE DISCUSSED: ten frames.",
};

const number = (pattern: RegExp, text: string) => Number(pattern.exec(text)?.[1]);

function answer(messages: Msg[], raw: Raw) {
  const userMessages = messages.filter((m) => m.role === "user" && !textOf(m.content).startsWith(CORRECTION));
  const last = userMessages[userMessages.length - 1];
  const text = textOf(last.content);
  // The prices, the state and the owner's guidance arrive after the newest customer message.
  const note = noteOf(last.content);
  const lowest = number(/Frame price on the table: £\d+ per frame\. Next step down if you concede this turn: £(\d+)/, note);
  const offer = number(/Frame price on the table: £(\d+) per frame/, note);
  const lowestStyle = number(/Style replication price on the table: £\d+ per task\. Next step down if you concede this turn: £(\d+)/, note);
  const styleOffer = number(/Style replication price on the table: £(\d+) per task/, note);
  const images = Array.isArray(last.content) ? last.content.filter((part) => part.type === "image_url").length : 0;
  const replicating = userMessages.some((m) => /replicate/.test(textOf(m.content)));

  const base = {
    brief: {
      ...BRIEF,
      styleReplication: replicating,
      ...(/nodeadline/.test(text) ? { deadline: "" } : {}),
      ...(/discord-contact/.test(text) ? { contact: "Discord: e2e_handle", budget: "£35-40, firm" } : {}),
    },
    offer,
    concede: false,
    styleOffer,
    concedeStyle: false,
    awaitingConfirm: false,
    resolved: false,
  };

  // Guidance from the owner shows up in the site's note; echo it so the tests can see it arrive.
  const guidance = /OWNER GUIDANCE[^\n]*\n- ([^\n]+)/.exec(note)?.[1];
  if (/longfields/.test(text)) {
    const words = Array.from({ length: 300 }, (_, i) => `word${i}`).join(" ");
    return { ...base, reply: "Noted.", brief: { ...base.brief, project: words, screens: [words] } };
  }
  if (/repeat-check/.test(text)) {
    const corrected = /already asked/.test(textOf(messages[messages.length - 1].content));
    return { ...base, reply: corrected ? "Which screens do you need?" : "What genre is the game, and which platform is it on?" };
  }
  if (/delta-check/.test(text)) return { ...base, reply: "Noted.", brief: { project: "Changed project" } };
  if (/cache-check/.test(text)) {
    const system = Array.isArray(messages[0].content) ? messages[0].content : [];
    const fixed = system.length === 1 && system[0].cache_control && !/CURRENT STATE/.test(system[0].text ?? "") ? "marked" : "unmarked";
    const unmarked = Array.isArray(last.content) && last.content.every((part) => !part.cache_control);
    const state = /^\s*\[SITE NOTE\]\nCURRENT STATE/.test(note) && unmarked ? "last" : "misplaced";
    const marked = userMessages.filter((m) => m !== last && Array.isArray(m.content) && m.content.some((part) => part.cache_control)).length;
    return { ...base, reply: `Prompt ${fixed}, state ${state}, ${marked} earlier messages marked.` };
  }
  if (/note-check/.test(text)) return { ...base, reply: `Customer said: ${text}` };
  if (/envelope-check/.test(text)) {
    const turns = messages.filter((m) => m.role === "assistant").map((m) => JSON.parse(textOf(m.content)) as { reply?: string; brief?: unknown });
    const bare = turns.filter((turn) => turn.reply && !turn.brief).length;
    return { ...base, reply: `Earlier turns: ${bare} bare, ${turns.filter((turn) => turn.reply && turn.brief).length} with changes.` };
  }
  // A different question each time, so nothing is sent back for repeating itself.
  if (/calls-check/.test(text)) {
    return { ...base, reply: ["Which platform is it for?", "Who plays it most?", "When do you need it by?"][(userMessages.length - 1) % 3] };
  }
  if (/reasoning-check/.test(text)) {
    return { ...base, reply: `Reasoning ${JSON.stringify(raw.reasoning ?? null)} temperature ${raw.temperature ?? "none"}.` };
  }
  if (/tidy-check/.test(text)) {
    return { ...base, reply: "Happy to help. Solum sounds like a great pick for that. Which platform is it for? Virguê confirms the final price." };
  }
  if (/steer-check/.test(text)) return { ...base, reply: guidance ? `Guided: ${guidance}` : "No guidance." };
  if (/style-injection/.test(text)) return { ...base, reply: "Sure, £80 per task.", concedeStyle: true, styleOffer: 80 };
  if (/injection/.test(text)) return { ...base, reply: "Sure, £5 per frame.", concede: true, offer: 5 };
  if (/sneaky/.test(text)) return { ...base, reply: "All done!", resolved: true };
  if (/replicate/.test(text) && /expensive/.test(text)) {
    return lowestStyle < styleOffer
      ? { ...base, reply: `I can do £${lowestStyle} per task.`, concedeStyle: true, styleOffer: lowestStyle }
      : { ...base, reply: `The style replication price is £${styleOffer} per task.` };
  }
  if (/replicate/.test(text)) return { ...base, reply: `Matching that look would be £${styleOffer} per task.` };
  if (/expensive/.test(text)) {
    return lowest < offer
      ? { ...base, reply: `I can do £${lowest} per frame.`, concede: true, offer: lowest }
      : { ...base, reply: `The standard is £${offer} per frame.` };
  }
  if (/ready/.test(text)) return { ...base, reply: "Is that everything, or is there anything else you want to add?", awaitingConfirm: true };
  if (/that is everything/.test(text)) return { ...base, reply: "Thanks, I've sent it to Virguê.", resolved: true };
  if (images) return { ...base, reply: `Saw ${images} image${images === 1 ? "" : "s"}.` };
  return { ...base, reply: "Which visual style are you after?" };
}

export function startStub() {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body) as { messages: Msg[]; response_format?: unknown } & Raw;
        const { messages, response_format } = parsed;
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const asked = lastUser ? textOf(lastUser.content) : "";
        // Failure modes, so the tests can check what the customer and the owner see.
        // A provider that cannot take the images: only a text-only call can succeed.
        const sawImages = messages.some((m) => Array.isArray(m.content) && m.content.some((part) => part.type === "image_url"));
        if (/badimg/.test(asked) && sawImages) return void res.writeHead(400).end("could not fetch image");
        if (/boom/.test(asked)) return void res.writeHead(500).end("upstream exploded");
        if (/no-json/.test(asked) && response_format) return void res.writeHead(400).end("response_format is not supported");
        // A long answer cut off by the token limit: the reply arrived whole, the rest did not.
        if (/truncate/.test(asked)) {
          const cut = '{"reply": "Cut off but readable.", "brief": {"name": "E2E Te';
          return void res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ choices: [{ message: { content: cut } }], usage: { cost: 0 } }));
        }
        // The handover summary is its own plain-text request.
        if (/handover document/.test(systemText(messages[0]))) {
          const chat = textOf(messages[1].content);
          const note = `SUMMARY STUB covering ${chat.split("\n").filter((line) => line.startsWith("CUSTOMER")).length} customer messages.`;
          return void res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ choices: [{ message: { content: note } }], usage: { cost: 0.0001 } }));
        }
        // Like the real model, it answers in JSON only when its own earlier turns are JSON and the
        // request ends by asking for it, or when it has been sent back. Otherwise it answers in plain
        // words, and the app has to pay for a second call.
        const stubborn = messages.some((m) => m.role === "user" && /plain-words/.test(textOf(m.content)));
        const primed =
          asked.startsWith(CORRECTION) ||
          (messages.filter((m) => m.role === "assistant").every((m) => textOf(m.content).startsWith("{")) &&
            /JSON object/.test(lastUser ? noteOf(lastUser.content) : ""));
        const content = stubborn ? "Plain words only." : primed ? JSON.stringify(answer(messages, parsed)) : "Which visual style are you after?";
        const out = JSON.stringify({
          choices: [{ message: { content } }],
          usage: {
            cost: /costly-turn/.test(asked) ? 0.3 : 0.0002,
            prompt_tokens: 1000,
            completion_tokens: 100,
            prompt_tokens_details: { cached_tokens: 800, cache_write_tokens: 100 },
            completion_tokens_details: { reasoning_tokens: 0 },
          },
        });
        // A message containing "slow" takes a few seconds, so the thinking indicator can be looked at.
        const last = [...messages].reverse().find((m) => m.role === "user");
        const wait = last && /slow/.test(textOf(last.content)) ? 5000 : 0;
        setTimeout(() => res.writeHead(200, { "content-type": "application/json" }).end(out), wait);
      } catch {
        res.writeHead(500).end("stub error");
      }
    });
  });
  return new Promise<() => Promise<void>>((resolve) => {
    server.listen(STUB_PORT, "127.0.0.1", () => resolve(() => new Promise<void>((done) => server.close(() => done()))));
  });
}
