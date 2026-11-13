/**
 * Choice lists for the character sheet dropdowns.
 *
 * These used to be stored on every actor via template.json. They are static
 * rules data, so they now live here and are no longer written into the world.
 * The order matters: the sheet's "roll" buttons pick the entry at index
 * (roll total - 1), counting "none" as index 0.
 */
export const HH = {
	descriptors: {
		none: "Roll",
		rookie: "Rookie",
		"washed-up": "Washed-up",
		retired: "Retired",
		unhinged: "Unhinged",
		slick: "Slick",
		incompetent: "Incompetent"
	},
	bearTypes: {
		none: "Roll",
		grizzly: "Grizzly (Terrify)",
		polar: "Polar (Swim)",
		panda: "Panda (Eat anything that looks like bamboo)",
		black: "Black (Climb)",
		sun: "Sun (Sense honey)",
		"honey-badger": "Honey Badger (Carnage)"
	},
	roles: {
		none: "Roll",
		muscle: "Muscle",
		brains: "Brains",
		driver: "Driver",
		hacker: "Hacker",
		thief: "Thief",
		face: "Face"
	},
	hats: {
		none: "Roll",
		tribly: "Tribly",
		top: "Top",
		bowler: "Bowler",
		"flat-cap": "Flat Cap",
		cowboy: "Cowboy",
		fez: "Fez",
		crown: "Crown",
		"roll-twice": "Roll Twice!"
	}
};

/** The two extra hats (rolled when "Roll Twice!" comes up) exclude "Roll Twice!" itself. */
HH.extraHats = Object.fromEntries(Object.entries(HH.hats).filter(([key]) => key !== "roll-twice"));

/** Which choice list belongs to which actor system field. */
export const FIELD_CHOICES = {
	descriptor: HH.descriptors,
	"bear-type": HH.bearTypes,
	role: HH.roles,
	hat: HH.hats,
	hat2a: HH.extraHats,
	hat2b: HH.extraHats
};
