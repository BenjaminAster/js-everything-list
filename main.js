
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

// // Audio Worklet
// if (window.AudioWorklet && window.OfflineAudioContext) {
// 	new OfflineAudioContext({ length: 1, sampleRate: 10_000 }).audioWorklet.addModule(import.meta.resolve("./audio-worklet.js"));
// }

let /** @type {Worker} */ dedicatedWorker;
let /** @type {SharedWorker} */ sharedWorker;
let /** @type {ServiceWorker} */ serviceWorker;

// console.log(Object.entries(import.meta))

const OL = document.querySelector("ol#main");
const contextSelect = document.querySelector("select#context-select");
const copyAllButton = document.querySelector("button#copy-all");

window.addEventListener("error", (event) => {
	const error = [event.message, ...(event.error.stack.split("\n").slice(event.error.stack.startsWith("@") ? 0 : 1))].join("\n");
	window.alert(error);
});

// alert(1)

copyAllButton.addEventListener("click", async () => {
	await navigator.clipboard.writeText((await iteration({ indent: true })).join("\n"));
});

{
	const update = async () => {
		let /** @type {string[]} */ list = [];
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
