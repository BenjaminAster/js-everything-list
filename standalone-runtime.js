
/* 
node --experimental-detect-module standalone-runtime.js
bun run standalone-runtime.js
deno run --allow-read --allow-write=. standalone-runtime.js
*/

import { writeFile } from "node:fs/promises";
import getList from "./global-object-iteration.js";

const list = await getList({ indent: true });

await writeFile(new URL(
	`./${globalThis.Bun ? "bun" : globalThis.Deno ? "deno" : "nodejs"}.txt`,
	import.meta.url,
), list.join("\n"), { encoding: "utf-8" });
