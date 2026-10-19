import { spawn } from "node:child_process";

// Bind fixture authentication to the local development server by default.
const child = spawn("node", ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, ENABLE_DEV_AUTH: process.env.ENABLE_DEV_AUTH ?? "1" },
});
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", () => { console.error("Could not start the development server."); process.exit(1); });
