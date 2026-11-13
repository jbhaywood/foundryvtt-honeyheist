import { HoneyHeistActor } from "./actor.js";
import { HoneyHeistActorSheet } from "./actor-sheet.js";
import { HoneyHeistItemSheet } from "./item-sheet.js";
import { HoneyHeistCharacterData, HoneyHeistItemData } from "./data.js";

const SYSTEM_ID = "honey-heist";

Hooks.once("init", () => {
	console.log("HoneyHeist: Initializing");

	// Document classes and data models (these replace template.json).
	CONFIG.Actor.documentClass = HoneyHeistActor;
	CONFIG.Actor.dataModels.character = HoneyHeistCharacterData;
	CONFIG.Item.dataModels.item = HoneyHeistItemData;

	// Register our sheets as the defaults.
	const { DocumentSheetConfig } = foundry.applications.apps;
	DocumentSheetConfig.registerSheet(foundry.documents.Actor, "honeyheist", HoneyHeistActorSheet, {
		types: ["character"],
		label: "Honey Heist Character Sheet (Default)",
		makeDefault: true
	});
	DocumentSheetConfig.registerSheet(foundry.documents.Item, "honeyheist", HoneyHeistItemSheet, {
		types: ["item"],
		label: "Honey Heist Item Sheet (Default)",
		makeDefault: true
	});
});

Hooks.once("ready", async () => {
	// Make sure all roll tables are always present. Only a GM may create them.
	if (!game.user.isGM) return;

	const rollTables = {
		Organizer: "fvtt-RollTable-Organizer.json",
		Setting: "fvtt-RollTable-Setting.json",
		Location: "fvtt-RollTable-Location.json",
		Prize: "fvtt-RollTable-Prize.json",
		Security: "fvtt-RollTable-Security.json",
		Twist: "fvtt-RollTable-Twist.json"
	};

	const existing = new Set(game.tables.map((table) => table.name));
	const toAdd = [];
	for (const [name, file] of Object.entries(rollTables)) {
		if (existing.has(name)) continue;
		const url = foundry.utils.getRoute(`systems/${SYSTEM_ID}/resources/roll-tables/${file}`);
		toAdd.push(await foundry.utils.fetchJsonWithTimeout(url));
	}

	if (toAdd.length) await foundry.documents.RollTable.createDocuments(toAdd);
});
