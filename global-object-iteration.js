
const sort = (/** @type {any[]} */ array) => {
	const { string, number, symbol } = Object.groupBy(array, (item) => typeof item);
	return [...(string?.toSorted() ?? []), ...(number?.toSorted((a, b) => a - b) ?? []), ...(symbol ?? [])];
};

const noop = () => { };

const toString = (/** @type {string | symbol} */ value) => typeof value === "symbol" ? value.description : value;

const pathToString = (/** @type {(string | symbol)[]} */ path, /** @type {boolean} */ indent = false) => {
	let string = (indent ? "\t".repeat(path.length - 1) : "") + toString(path[0]);
	for (const key of path.slice(1)) {
		string += typeof key === "string"
			? `.${key}`
			: typeof key === "symbol"
				? `[${key.description}]`
				: `[${key}]`;
	}
	return string;
};

const allKeys = (/** @type {any} */ object) => {
	let set = new Set([
		...Object.getOwnPropertyNames(object),
		...Object.getOwnPropertySymbols(object),
		...Object.entries(Object.getOwnPropertyDescriptors(object)).map(([key]) => key),
		...Reflect.ownKeys(object),
	]);
	for (const key in object) set.add(key);
	return sort([...set]);
};

const recursiveAdd = (/** @type {any} */ object, /** @type {any} */ path = [], /** @type {boolean} */ indent = false) => {
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
		let stringified = pathToString([...path, key], indent);
		let item;
		$outer: {
			$inner: {
				if (key === Symbol.species || (typeof key === "symbol" && key.description === "owner_symbol") || (object === Function.prototype && key === "constructor")) break $inner;
				try {
					item = object[key];
					if (typeof item === "function" && !item?.prototype && key !== "prototype") stringified += "()";
				} catch {
					break $inner;
				}
				break $outer;
			}

			list.push(stringified);
			continue $loop;
		}
		list.push(stringified)
		try {
			if (typeof item === "object" && item instanceof Promise) item.catch(noop);
		} catch { }
		if (((typeof item === "object" && item !== null) || typeof item === "function") && item !== globalThis) {
			list.push(...recursiveAdd(item, [...path, key], indent));
		}
	}
	return list;
};

const getList = async ({ indent = false } = {}) => {
	let /** @type {string[]} */ list = [];
	for (const key of sort(Reflect.ownKeys(globalThis))) {
		// document.body.innerHTML += pathToString([key]) + "<br>"
		let item = globalThis[key];
		let stringified = pathToString([key], false);
		if (typeof item === "function") {
			if (item?.prototype) {
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
				stringified += "()";
			}
		}
		list.push(stringified);
		$: if (((typeof item === "object" && item !== null) || typeof item === "function") && item !== globalThis) {
			if (typeof item === "object") {
				const prototype = Object.getPrototypeOf(item);
				const prototypeName = prototype?.[Symbol.toStringTag];
				if (prototypeName && prototypeName !== key && (prototypeName in globalThis)) {
					break $;
				}
			}

			list.push(...recursiveAdd(item, [key], indent));
		}
		if (globalThis.window?.document?.documentElement && globalThis.Window) { // executing in main thread
			await new Promise(globalThis.queueMicrotask);
		}
	}
	return list;
};

export default getList;

const send = async (/** @type {Function} */ postMessageFunc) => {
	postMessageFunc({ command: "response:list", list: await getList({ indent: true }) });
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



