
{
	Object.groupBy ??= function (array, callback) {
		let /** @type {any} */ obj = {};
		let item;
		for (let i = 0; i < array.length; ++i) {
			item = array[i];
			(obj[callback(item, i)] ??= []).push(item);
		}
		return obj;
	};

	Promise.withResolvers ??= function () {
		let resolve, reject;
		let promise = new Promise((res, rej) => (resolve = res, reject = rej));
		return { promise, resolve, reject };
	};
}

import iteration from "./global-object-iteration.js";

let /** @type {Worker} */ dedicatedWorker;
let /** @type {SharedWorker} */ sharedWorker;
let /** @type {ServiceWorker} */ serviceWorker;

const OL = document.querySelector("ol#main");
const contextSelect = document.querySelector("select#context-select");
const copyAllButton = document.querySelector("button#copy");
const downloadButton = document.querySelector("button#download");

window.addEventListener("error", (event) => {
	const error = [event.message, ...(event.error.stack.split("\n").slice(event.error.stack.startsWith("@") ? 0 : 1))].join("\n");
	window.alert(error);
});

const browserName = await (async () => {
	if (navigator.userAgentData?.brands?.some(({ brand }) => brand === "Chromium")) {
		if (window.__gg__ && window.gmaSdk) return "Google Go";
		if (window.DataTransfer?.prototype?.SetURLAndTitle) return "Vivaldi";
		if (await window.ImageDecoder?.isTypeSupported?.("image/jxl")) return "Thorium";
		let name = navigator.userAgentData.brands.find(({ brand }) => !/(Chromium)|(\W*Not\W*A\W*Brand\W*)/i.test(brand))?.brand;
		if (name) return name;
	}
	{
		const name = navigator.userAgent.split("/").at(-2).split(" ").at(-1);
		if (name) return name;
	}
	return "unknown";
})();

let /** @type {string[]} */ list = [];

copyAllButton.addEventListener("click", async () => {
	await navigator.clipboard.writeText(list.join("\n"));
});

downloadButton.addEventListener("click", async () => {
	const blob = new Blob([list.join("\n")], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${browserName.toLowerCase().replace(" ", "-")}-${contextSelect.value}.txt`;
	a.click();
});

{
	const update = async () => {
		switch (contextSelect.value) {
			case "main-thread": {
				// alert(2)
				console.time("global object iteration");
				list = await iteration({ indent: true });
				console.timeEnd("global object iteration");
				// alert(3)
				break;
			}
			case "dedicated-worker": {
				if (!dedicatedWorker) {
					dedicatedWorker = new Worker(import.meta.resolve("./global-object-iteration.js"), { type: "module" });
				}
				const { promise, resolve } = Promise.withResolvers();
				const listener = ({ data }) => {
					if (data.command !== "response:list") return;
					resolve(data.list);
					dedicatedWorker.removeEventListener("message", listener);
				}
				dedicatedWorker.addEventListener("message", listener);
				dedicatedWorker.postMessage({ command: "request:list" });
				list = await promise;
				break
			} case "shared-worker": {
				if (!sharedWorker) {
					sharedWorker = new SharedWorker(import.meta.resolve("./global-object-iteration.js"), { type: "module" });
					sharedWorker.port.start();
				}
				const { promise, resolve } = Promise.withResolvers();
				const listener = ({ data }) => {
					if (data.command !== "response:list") return;
					resolve(data.list);
					sharedWorker.port.removeEventListener("message", listener);
				}
				sharedWorker.port.addEventListener("message", listener);
				sharedWorker.port.postMessage({ command: "request:list" });
				list = await promise;
				break
			} case "service-worker": {
				if (!serviceWorker) {
					navigator.serviceWorker.register(import.meta.resolve("./global-object-iteration.js"), { type: "module", scope: location.href, updateViaCache: "none" });
					serviceWorker = (await navigator.serviceWorker.ready).active;
				}
				const { promise, resolve } = Promise.withResolvers();
				const listener = ({ data }) => {
					if (data.command !== "response:list") return;
					resolve(data.list);
					navigator.serviceWorker.removeEventListener("message", listener);
				}
				navigator.serviceWorker.addEventListener("message", listener);
				serviceWorker.postMessage({ command: "request:list" });
				list = await promise;
				break;
			}
		}
		// alert(4)
		OL.innerHTML = "";
		// OL.textContent = JSON.stringify(list, null, "\t");
		// alert(5)
		for (const string of list) {
			const LI = document.createElement("li");
			LI.textContent = string;
			OL.append(LI);
		}
	}

	contextSelect.addEventListener("change", update);
	update();
}

export { };
