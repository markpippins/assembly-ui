// dev.js — spawns the appropriate dev servers for assembly-ui.
//
// MOCK mode: in-process mock fixture API on MOCK_API_PORT (default 33107)
//            + Vite dev server on PORT (default 3000).
// LIVE mode: Vite dev server only on PORT (default 4214); Vite proxies
//            /api → API_TARGET (assembly-srv:3107) and /nebula →
//            NEBULA_TARGET (nebula-srv:3101) per vite.config.ts.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ASSEMBLY_MODE, IS_MOCK_MODE } from "./runtime-config.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const children = [];
let shuttingDown = false;

function start(command, args, env = {}) {
  const child = spawn(command, args, { cwd: root, env: { ...process.env, ...env }, stdio: "inherit" });
  children.push(child);
  child.on("exit", code => {
    if (!shuttingDown) {
      shutdown();
      setTimeout(() => process.exit(process.exitCode || code || 0), 100);
    }
  });
  return child;
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

if (IS_MOCK_MODE) {
  const mockApiPort = process.env.MOCK_API_PORT || "33107";
  // Run server.js in API-only mode (serves the in-memory fixture surface only).
  start(process.execPath, ["server.js"], { ASSEMBLY_API_ONLY: "true", MOCK_API_PORT: mockApiPort });
  start(process.execPath, [viteBin], {});
  console.log(`[assembly] MOCK: Vite UI on http://localhost:${process.env.PORT || "3000"}, fixtures on http://localhost:${mockApiPort}`);
} else {
  start(process.execPath, [viteBin], []);
  console.log(`[assembly] LIVE: Vite UI on http://localhost:${process.env.PORT || "4214"} (proxied to backend)`);
}

console.log(`[assembly] Runtime mode: ${ASSEMBLY_MODE}`);
