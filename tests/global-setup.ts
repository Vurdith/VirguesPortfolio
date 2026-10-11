import { rm } from "node:fs/promises";

// Start every run from an empty database. (Runs after the web server config is read but the
// server only touches the file on first request.)
export default async function globalSetup() {
  await rm(".e2e", { recursive: true, force: true });
}
