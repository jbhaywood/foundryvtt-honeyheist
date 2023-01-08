import { HoneyHeistActor } from "./actor.js";
import { HoneyHeistActorSheet } from "./actor-sheet.js";
import { HoneyHeistItemSheet } from "./item-sheet.js";

Hooks.once("init", async function () {
	console.log(`HoneyHeist: Initializing`);

	// Define custom Entity classes
	if (isNewerVersion(game.data.version, "0.8.0")) {
		CONFIG.Actor.documentClass = HoneyHeistActor;
	} else {
		CONFIG.Actor.entityClass = HoneyHeistActor;
	}

	// Register sheet application classes
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("honeyheist", HoneyHeistActorSheet, { label: "Honey Heist Character Sheet (Default)", makeDefault: true });

	Items.unregisterSheet("core", ItemSheet);
	Items.registerSheet("honeyheist", HoneyHeistItemSheet, { label: "Honey Heist Item Sheet (Default)", makeDefault: true });

	Handlebars.registerHelper("removeProperty", function (obj, property) {
		delete obj[property];
		return obj;
	});

	// CONFIG.debug.hooks = true;
});

Hooks.once("ready", async function () {
	// Make sure all roll tables are always present.
	const existingRollTables = [];
	const rollTablesToAdd = [];
	const rollTables = {
		Organizer: "/systems/honey-heist/resources/roll-tables/fvtt-RollTable-Organizer.json",
		Setting: "/systems/honey-heist/resources/roll-tables/fvtt-RollTable-Setting.json",
		Location: "/systems/honey-heist/resources/roll-tables/fvtt-RollTable-Location.json",
		Prize: "/systems/honey-heist/resources/roll-tables/fvtt-RollTable-Prize.json",
		Security: "/systems/honey-heist/resources/roll-tables/fvtt-RollTable-Security.json",
		Twist: "/systems/honey-heist/resources/roll-tables/fvtt-RollTable-Twist.json"
	};

	if (isNewerVersion(game.data.version, "0.8.0")) {
		for (const document of game.collections.get("RollTable").contents) {
			existingRollTables.push(document.name);
		}
	} else {
		for (const document of RollTable.collection.entities) {
			existingRollTables.push(document.name);
		}
	}

	for (let [key, value] of Object.entries(rollTables)) {
		if (existingRollTables.indexOf(key) === -1) {
			const rollTable = await $.getJSON(value).then();
			rollTablesToAdd.push(rollTable);
		}
	}

	RollTable.create(rollTablesToAdd);
});

Hooks.on("renderHoneyHeistActorSheet", (ev) => {
	// Color a stat red if it's value is six.
	const root = ev.element[0];
	const bearStatElement = root.querySelector("#stat-bear .stat-value");
	const criminalStatElement = root.querySelector("#stat-criminal .stat-value");
	let bearVal = parseInt(bearStatElement.value, 10);
	let criminalVal = parseInt(criminalStatElement.value, 10);

	if (bearVal === 6) {
		bearStatElement.classList.add("error-red");
	} else if (criminalVal === 6) {
		criminalStatElement.classList.add("error-red");
	}

	// Show the extra hat options if the initial hat stat is 'roll-twice'.
	const hatRollElement = root.querySelector("#hat-roll");
	if (hatRollElement.value === "roll-twice") {
		for (const elem of root.querySelectorAll(".hat2")) {
			elem.style.display = "";
		}
	} else {
		for (const elem of root.querySelectorAll(".hat2")) {
			elem.style.display = "none";
		}
	}
});
