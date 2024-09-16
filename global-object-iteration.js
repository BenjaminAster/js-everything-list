
const sort = (/** @type {any[]} */ array) => {
	const { string, number, symbol } = Object.groupBy(array, (item) => typeof item);
	return [...(string?.toSorted() ?? []), ...(number?.toSorted((a, b) => a - b) ?? []), ...(symbol ?? [])];
};

const noop = () => { };

const toString = (/** @type {string | symbol} */ value) => typeof value === "symbol" ? value.description : value;

const pathToString = (/** @type {(string | symbol)[]} */ path) => {
	let string = "\t".repeat(path.length - 1) + toString(path[0]);
	for (const key of path.slice(1)) {
		string += typeof key === "string"
			? `.${key}`
			: typeof key === "symbol"
				? `[${key.description}]`
				: `[${key}]`;
	}
	return string;
};

let /** @type {Set<string>} */ inSpecifications;

let /** @type {Set<string>} */ inECMAScript;

export const init = async ({ readFileFunction }) => {
	inSpecifications = new Set(
		JSON.parse(await readFileFunction(import.meta.resolve("./in-specifications.json"))).map(
			item => "\t".repeat(item.length - 1) + item.join(".")
		)
	);

	inECMAScript = new Set((await readFileFunction(import.meta.resolve("./ecmascript-globals.txt"))).split("\n"));
};

// console.log([...inSpecifications].join("\n"));

const recursiveAdd = (/** @type {any} */ object, /** @type {any} */ path = [], excludeStandardized = false) => {
	let /** @type {string[]} */ list = [];
	if (path.length > 9) {
		console.log("path > 9", object, path);
		return [];
	}
	$loop: for (let key of sort(/** @type {any} */(Reflect.ownKeys(object)).map(
		key => key.match?.(/^\d+$/) ? +key : key
	))) {
		if (
			(
				key === "constructor"
				||
				(typeof object === "function" && ["length", "name", "arguments", "caller"].includes(key))
			)
			&&
			object !== Function.prototype
		) {
			continue $loop;
		}
		let stringified = pathToString([...path, key]);
		// if (inSpecifications.has(stringified)) continue $loop;
		let item;
		$outer: {
			$inner: {
				if (
					key === Symbol.species
					|| (typeof key === "symbol" && key.description === "owner_symbol")
					|| (object === Function.prototype && key === "constructor")
				) break $inner;
				try {
					item = object[key];
					if (typeof item === "function" && !item?.prototype && key !== "prototype") stringified += "()";
				} catch {
					break $inner;
				}
				break $outer;
			}

			if (!excludeStandardized || !inSpecifications.has(stringified)) list.push(stringified);
			continue $loop;
		}
		// console.log(item, typeof item);
		if (!excludeStandardized || (!inSpecifications.has(stringified) && typeof key !== "symbol")) list.push(stringified);
		try {
			if (typeof item === "object" && item instanceof Promise) item.catch(noop);
		} catch { }
		if (((typeof item === "object" && item !== null) || typeof item === "function") && item !== globalThis) {
			list.push(...recursiveAdd(item, [...path, key], excludeStandardized));
		}
	}
	return list;
};

const getList = async ({ excludeStandardized = false } = {}) => {
	let /** @type {string[]} */ list = [];
	for (let name of sort(Object.getOwnPropertyNames(globalThis))) {
		// document.body.innerHTML += pathToString([key]) + "<br>"

		if (excludeStandardized && inECMAScript.has(name)) continue;

		let item = globalThis[name];
		let stringified = name;

		// let stringified = pathToString([key]);
		if (typeof item === "function") {
			if (item?.prototype) {
				// if (inSpecifications.has(key)) continue;
				// console.log(key);
				// let temp = item?.prototype
				let temp = item;
				let /** @type {string[]} */ inheritanceArray = [];
				// let name = ""
				while ((temp = Object.getPrototypeOf(temp)) && temp.name) {
					// while ((temp = Object.getPrototypeOf(temp)) && (name = temp[Symbol.toStringTag] || temp.toString?.())) {
					inheritanceArray.push(temp.name);
					// inheritanceArray.push(name)
				}
				if (inheritanceArray.length) stringified += ` /* extends ${inheritanceArray.join(" -> ")} */`;
			} else {
				stringified = (name += "()");
				// if (inSpecifications.has(key)) continue;
				// console.log(key);
			}
		} else {
			// if (inSpecifications.has(key)) continue;
			// console.log(key);
		}
		if (!excludeStandardized || !inSpecifications.has(name)) list.push(stringified);
		$: if (((typeof item === "object" && item !== null) || typeof item === "function") && item !== globalThis) {
			if (typeof item === "object") {
				const prototype = Object.getPrototypeOf(item);
				const prototypeName = prototype?.[Symbol.toStringTag];
				if (prototypeName && prototypeName !== name && (prototypeName in globalThis)) {
					break $;
				}
			}

			list.push(...recursiveAdd(item, [name], excludeStandardized));
		}
		if (globalThis.window?.document?.documentElement && globalThis.Window) { // executing in main thread
			await new Promise(globalThis.queueMicrotask);
		}
	}
	return list;
};

export default getList;

const send = async (/** @type {Function} */ postMessageFunc) => {
	postMessageFunc({ command: "response:list", list: await getList() });
};

if (globalThis.SharedWorkerGlobalScope) {
	globalThis.addEventListener("connect", ({ ports: [port] }) => {
		port.start();
		port.addEventListener("message", async () => {
			send(port.postMessage.bind(port));
		});
	});
} else if (globalThis.WorkerGlobalScope) {
	globalThis.addEventListener("message", async ({ source }) => {
		send(globalThis.postMessage?.bind(globalThis) ?? source.postMessage.bind(source));
	});
}
