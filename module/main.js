import { HoneyHeistActor } from "./actor.js";
import { HoneyHeistActorSheet } from "./actor-sheet.js";

Hooks.once("init", async function() {
	console.log(`HoneyHeist: Initializing`);

	// Define custom Entity classes
	CONFIG.Actor.entityClass = HoneyHeistActor;

	// Register sheet application classes
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("honeyheist", HoneyHeistActorSheet, { makeDefault: true });

	Handlebars.registerHelper("removeProperty", function(obj, property) {
		delete obj[property];
		return obj;
	});

	// CONFIG.debug.hooks = true;
});

Hooks.once("ready", async function() {
	// Make sure all roll tables are always present.
	const existingRollTables = [];
	const rollTablesToAdd = [];
	const rollTables = {
		Organizer : "/systems/honey-heist/resources/roll-tables/fvtt-RollTable-Organizer.json",
		Setting   : "/systems/honey-heist/resources/roll-tables/fvtt-RollTable-Setting.json",
		Location  : "/systems/honey-heist/resources/roll-tables/fvtt-RollTable-Location.json",
		Prize     : "/systems/honey-heist/resources/roll-tables/fvtt-RollTable-Prize.json"
	};

	for (const entity of RollTable.collection.entities) {
		existingRollTables.push(entity.name);
	}

	for (let [ key, value ] of Object.entries(rollTables)) {
		if (existingRollTables.indexOf(key) === -1) {
			const rollTable = await $.getJSON(value).then();
			rollTablesToAdd.push(rollTable);
		}
	}

	RollTable.create(rollTablesToAdd);
});

Hooks.on("renderHoneyHeistActorSheet", (ev) => {
	// Color a stat red if it's value is six.
	const bearStat = $("#stat-bear").find(".stat-value").get(0);
	const criminalStat = $("#stat-criminal").find(".stat-value").get(0);
	let bearVal = parseInt(bearStat.value, 10);
	let criminalVal = parseInt(criminalStat.value, 10);

	if (bearVal === 6) {
		$("#stat-bear").children().addClass("error-red");
	} else if (criminalVal === 6) {
		$("#stat-criminal").children().addClass("error-red");
	}

	// Show the extra hat options if the initial hat stat is 'roll-twice'.
	if ($("#hat-roll").val() === "roll-twice") {
		$(".hat2").show();
	} else {
		$(".hat2").hide();
	}
});
