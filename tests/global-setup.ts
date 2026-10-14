import { rm } from "node:fs/promises";

import { startDiscordStub } from "./stub-discord";
import { startStub } from "./stub-llm";

// Start every run from an empty database. (Runs after the web server config is read but the
// server only touches the file on first request.) Also starts the stand-ins for OpenRouter and
// for the Discord subscription service.
export default async function globalSetup() {
  await rm(".e2e", { recursive: true, force: true });
  const stops = [await startStub(), await startDiscordStub()];
  return async () => {
    for (const stop of stops) await stop();
  };
}
