const { HTMLField, NumberField, ObjectField, StringField, SchemaField } = foundry.data.fields;

const DEFAULT_BIOGRAPHY = "<p>It’s Honeycon. You are going to undertake the greatest heist the world has ever seen. Two Things – </p><p>One: You have a complex plan that requires precise timing.</p><p>Two: You are a GODDAMN BEAR.</p><p>You're not a talking bear, per se, but you can sort of mangle human speech through your bear mouth, maybe?</p>";

/** Replaces the "character" entry of the old template.json. */
export class HoneyHeistCharacterData extends foundry.abstract.TypeDataModel {
	/** @override */
	static defineSchema() {
		const stat = () => new NumberField({ required: true, nullable: false, integer: true, min: 0, max: 6, initial: 3 });
		const choice = () => new StringField({ required: true, blank: true, initial: "" });
		return {
			biography: new HTMLField({ required: true, blank: true, initial: DEFAULT_BIOGRAPHY }),
			stats: new SchemaField({
				bear: stat(),
				criminal: stat()
			}),
			descriptor: choice(),
			// Hyphenated key kept as-is so existing actors keep their data.
			"bear-type": choice(),
			role: choice(),
			hat: choice(),
			hat2a: choice(),
			hat2b: choice()
		};
	}
}

/** Replaces the "item" entry of the old template.json. */
export class HoneyHeistItemData extends foundry.abstract.TypeDataModel {
	/** @override */
	static defineSchema() {
		return {
			description: new HTMLField({ required: true, blank: true, initial: "" }),
			quantity: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 1 }),
			weight: new NumberField({ required: true, nullable: false, min: 0, initial: 0 }),
			attributes: new ObjectField()
		};
	}
}
