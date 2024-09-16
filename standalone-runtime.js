
/* 
node --experimental-detect-module standalone-runtime.js
bun run standalone-runtime.js
deno run --allow-read --allow-write=. standalone-runtime.js
*/

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import getList, { init } from "./global-object-iteration.js";

await init({ readFileFunction: async (url) => await readFile(fileURLToPath(url), "utf8") });

const list = await getList({ excludeStandardized: process.argv.includes("--exclude-standardized") });

await writeFile(new URL(
	`./${globalThis.Bun ? "bun" : globalThis.Deno ? "deno" : "nodejs"}.txt`,
	import.meta.url,
), list.join("\n"), { encoding: "utf-8" });
