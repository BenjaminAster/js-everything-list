
import * as FS from "node:fs/promises";

const { jsInterfaces, jsMixins, jsAttributes, jsFunctions } = await (await fetch("https://benjaminaster.com/webindex/index/javascript.json")).json();

const map = /** @type {Map<string, any>} */ (new Map());

for (const interfaceOrMixin of [...jsInterfaces, ...jsMixins]) {
	map.set(interfaceOrMixin.name, {
		static: [],
		...(interfaceOrMixin.isNamespace ? {} : { prototype: [] }),
	});
}

// await FS.writeFile("./map.json", JSON.stringify(Object.fromEntries(map), null, "\t"));

for (const attribute of jsAttributes) {
	let info = map.get(attribute.interface);
	if (attribute.static) info.static.push(attribute.name);
	if (!attribute.static || attribute.const) info.prototype?.push(attribute.name);
}

for (const func of jsFunctions) {
	let info = map.get(func.interface);
	// if (func.name === "abort") console.log(func, info);
	if (func.static) info.static.push(func.name + "()");
	else info.prototype?.push(func.name + "()");
}

const list = [];

// await FS.writeFile("./map.json", JSON.stringify(Object.fromEntries(map), null, "\t"));

for (const interfaceInfo of jsInterfaces) {
	// const prototype = [
	// 	...(map.get(interfaceInfo.name)?.prototype ?? []),
	// 	...(interfaceInfo.includes ?? []).map()
	// ];
	let prototypeMembers;
	let staticMembers = [];
	// console.log("interface info", interfaceInfo);
	for (const part of [
		map.get(interfaceInfo.name),
		...(interfaceInfo.includes ?? []).map(mixin => map.get(mixin)).filter(Boolean)
	]) {
		// console.log(part);
		if (part.prototype) (prototypeMembers ??= []).push(...part.prototype);
		if (part.static) staticMembers.push(...part.static);
	}
	prototypeMembers?.sort();
	staticMembers?.sort();
	list.push({
		name: interfaceInfo.name,
		...(prototypeMembers ? { prototype: prototypeMembers } : {}),
		static: staticMembers,
	});
}

// await FS.writeFile("./a.json", JSON.stringify(list, null, "\t"));

let stringArray = [];

const globalScopeNames = new Set([
	"Window",
	"WorkerGlobalScope",
	"SharedWorkerGlobalScope",
	"DedicatedWorkerGlobalScope",
	"ServiceWorkerGlobalScope",
]);

let globalScopeStringArray = [];

for (const item of list) {
	const isGlobalScopeItem = globalScopeNames.has(item.name);
	if (isGlobalScopeItem) {
		for (const prototypeItem of item.prototype) {
			globalScopeStringArray.push([prototypeItem]);
		}
	} else {
		stringArray.push([item.name]);
		let itemList = [];
		for (const staticItem of item.static) {
			itemList.push([item.name, staticItem]);
		}
		if (item.prototype) {
			itemList.push([item.name, "prototype"]);
			for (const prototypeItem of item.prototype) {
				itemList.push([item.name, "prototype", prototypeItem]);
			}
		}
		itemList.sort(([a], [b]) => a > b ? 1 : -1);
		stringArray.push(...itemList);
	}
}

globalScopeStringArray.sort(([a], [b]) => a > b ? 1 : -1);

await FS.writeFile("./in-specifications.json", JSON.stringify([...stringArray, ...globalScopeStringArray], null, "\t"));

export { };