// dev.js — spawns the Vite dev server for assembly-ui.
//
// assembly-ui is live-only: Vite proxies /api → API_TARGET (assembly-srv:3107)
// and /nebula → NEBULA_TARGET (nebula-srv:3101) per vite.config.ts.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

start(process.execPath, [viteBin], []);
console.log(`[assembly] LIVE: Vite UI on http://localhost:${process.env.PORT || "4214"} (proxied to backend)`);
