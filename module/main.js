import { DefinitelyWizardsActor } from "./actor.js";
import { DefinitelyWizardsActorSheet } from "./actor-sheet.js";
import { DefinitelyWizardsItemSheet } from "./item-sheet.js";
import * as Chat from "./chat.js"

Hooks.once("init", async function () {
	console.log(`DefinitelyWizards: Initializing`);

	// Define custom Entity classes
	if (isNewerVersion(game.data.version, "0.8.0")) {
		CONFIG.Actor.documentClass = DefinitelyWizardsActor;
	} else {
		CONFIG.Actor.entityClass = DefinitelyWizardsActor;
	}

	// Register sheet application classes
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("definitelywizards", DefinitelyWizardsActorSheet, { label: "Definitely Wizards Character Sheet (Default)", makeDefault: true });

	Items.unregisterSheet("core", ItemSheet);
	Items.registerSheet("definitelywizards", DefinitelyWizardsItemSheet, { label: "Definitely Wizards Item Sheet (Default)", makeDefault: true });

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
		Organizer: "/systems/definitely-wizards/resources/roll-tables/fvtt-RollTable-Organizer.json",
		Setting: "/systems/definitely-wizards/resources/roll-tables/fvtt-RollTable-Setting.json",
		Location: "/systems/definitely-wizards/resources/roll-tables/fvtt-RollTable-Location.json",
		Prize: "/systems/definitely-wizards/resources/roll-tables/fvtt-RollTable-Prize.json",
		Security: "/systems/definitely-wizards/resources/roll-tables/fvtt-RollTable-Security.json",
		Twist: "/systems/definitely-wizards/resources/roll-tables/fvtt-RollTable-Twist.json"
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

Hooks.on("renderDefinitelyWizardsActorSheet", (ev) => {
	// Color a stat red if it's value is six.
	const root = ev.element[0];
	const wizardStatElement = root.querySelector("#stat-wizard .stat-value");
	const wildStatElement = root.querySelector("#stat-wild .stat-value");
	const classElement = root.querySelector(".attribute select[name='system.player-class']");
	const prop1Element = root.querySelector(".attribute select[name='system.prop-1']");
	const prop2Element = root.querySelector(".attribute select[name='system.prop-2']");
	let wizardVal = parseInt(wizardStatElement.value, 10);
	let wildVal = parseInt(wildStatElement.value, 10);
	let classValue = classElement.value;
	let prop1Value = prop1Element.value;
	let prop2Value = prop2Element.value;

	if (classValue === "custom") {
		$(root.querySelector(".customClass")).show();
	} else {
		$(root.querySelector(".customClass")).hide();
	}

	if (prop1Value === "custom") {
		$(root.querySelector(".customProp1")).show();
	} else {
		$(root.querySelector(".customProp1")).hide();
	}

	if (prop2Value === "custom") {
		$(root.querySelector(".customProp2")).show();
	} else {
		$(root.querySelector(".customProp2")).hide();
	}

	if (wizardVal === 6) {
		wizardStatElement.classList.add("error-red");
	} else if (wildVal === 6) {
		wildStatElement.classList.add("error-red");
	}
});


Hooks.on("renderChatLog", (app, html, data) => Chat.addChatListeners(html));