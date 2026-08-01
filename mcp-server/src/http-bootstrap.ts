import { register } from "tsconfig-paths";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");

register({
  baseUrl: repoRoot,
  paths: {
    "@/*": ["frontend/src/*"],
    "@shared/*": ["shared/src/*"],
  },
});

await import("./http.js");
