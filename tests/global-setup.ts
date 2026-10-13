import { rm } from "node:fs/promises";

import { startStub } from "./stub-llm";

// Start every run from an empty database. (Runs after the web server config is read but the
// server only touches the file on first request.) Also starts the stand-in for OpenRouter.
export default async function globalSetup() {
  await rm(".e2e", { recursive: true, force: true });
  return await startStub();
}
