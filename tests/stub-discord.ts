import http from "node:http";

/** A stand-in for the Discord subscription service (the virgue-discord repo), so nothing here reaches Discord. */
export const DISCORD_STUB_PORT = Number(process.env.E2E_PORT ?? 3200) + 101;
export const DISCORD_STUB_URL = `http://127.0.0.1:${DISCORD_STUB_PORT}`;
export const DISCORD_STUB_SECRET = "e2e-announce-secret";

/** The one handle the stand-in treats as subscribed. */
export const SUBSCRIBED_HANDLE = "e2e_handle";

export const STATS = {
  subscribers: 128,
  invites: 41,
  wall: [
    { name: "Top Inviter", avatar: "https://cdn.discordapp.com/embed/avatars/0.png", invites: 12, rank: "Gold" },
    { name: "Second Inviter", avatar: "https://cdn.discordapp.com/embed/avatars/1.png", invites: 1, rank: "Bronze" },
    // An avatar from anywhere else is not shown.
    { name: "Odd Avatar", avatar: "https://example.com/a.png", invites: 3, rank: "" },
    { avatar: "https://cdn.discordapp.com/embed/avatars/2.png", invites: 9 },
  ],
  drops: [
    { title: "Inventory icon pack", description: "Forty icons.", at: "2026-10-01T10:00:00.000Z" },
    { title: "HUD starter kit", at: "2026-09-12T10:00:00.000Z" },
  ],
  rewards: [
    { title: "5% voucher", cost: 3, detail: "Off your next order." },
    { title: "Icon recolour", cost: 4, detail: "One icon set in your palette." },
    { title: "25% voucher", cost: 10, detail: "Off your next order." },
  ],
};

export type FollowUpCall = {
  key: string;
  discord: string;
  name?: string;
  about?: string;
  work: { title: string; url: string; image?: string };
};

/** Reward codes the stand-in knows: one good, one spent on another brief. */
export const GOOD_CODE = "VG-GOOD-2345";
export const TAKEN_CODE = "VG-USED-2345";

export function startDiscordStub() {
  const followUps: FollowUpCall[] = [];
  const codeCalls: { code: string; brief: string; claim?: boolean }[] = [];
  const paidCalls: { key: string; discord: string }[] = [];
  const paidKeys = new Set<string>();
  const server = http.createServer((req, res) => {
    const json = (status: number, data: unknown) => res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(data));
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      if (req.method === "GET" && req.url === "/api/stats") return json(200, STATS);
      // For the tests only: every follow-up the site asked for.
      if (req.method === "GET" && req.url === "/follow-ups") return json(200, followUps);
      if (req.method === "GET" && req.url === "/codes") return json(200, codeCalls);
      if (req.method === "GET" && req.url === "/paid") return json(200, paidCalls);
      if (req.method !== "POST" || req.headers.authorization !== `Bearer ${DISCORD_STUB_SECRET}`) return json(401, { error: "Unauthorized" });
      if (req.url === "/api/announce") return json(200, { sent: 0 });
      if (req.url === "/api/followup") {
        const call = JSON.parse(body) as FollowUpCall;
        followUps.push(call);
        return json(200, call.discord === SUBSCRIBED_HANDLE ? { sent: true } : { sent: false, reason: "not subscribed" });
      }
      if (req.url === "/api/voucher") {
        const call = JSON.parse(body) as { code: string; brief: string; claim?: boolean };
        codeCalls.push(call);
        const code = call.code.toUpperCase();
        if (code === TAKEN_CODE) return json(200, { valid: false, reason: "taken" });
        if (code !== GOOD_CODE) return json(200, { valid: false, reason: "unknown" });
        return json(200, { valid: true, code, title: "15% voucher", kind: "voucher", detail: "15% off one commission, up to £75 off.", percent: 15, cap: 75, claimed: Boolean(call.claim) });
      }
      if (req.url === "/api/paid") {
        const call = JSON.parse(body) as { key: string; discord: string };
        paidCalls.push(call);
        if (call.discord !== SUBSCRIBED_HANDLE) return json(200, { given: false, reason: "unknown" });
        if (paidKeys.has(call.key)) return json(200, { given: false, reason: "already given" });
        paidKeys.add(call.key);
        return json(200, { given: true, points: 2, have: 2, told: true });
      }
      json(404, { error: "Not found" });
    });
  });
  return new Promise<() => Promise<void>>((resolve) => {
    server.listen(DISCORD_STUB_PORT, "127.0.0.1", () => resolve(() => new Promise<void>((done) => server.close(() => done()))));
  });
}
