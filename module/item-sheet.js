const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Honey Heist item sheet (ApplicationV2).
 * @extends {ItemSheetV2}
 */
export class HoneyHeistItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["honeyheist", "sheet", "item"],
		position: { width: 550, height: 400 },
		form: { submitOnChange: true }
	};

	/** @override */
	static PARTS = {
		sheet: { template: "systems/honey-heist/templates/item-sheet.html" }
	};

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		const item = this.item;
		const TextEditor = foundry.applications.ux.TextEditor.implementation;
		return Object.assign(context, {
			item,
			system: item.system,
			source: item.toObject(),
			systemFields: item.system.schema.fields,
			editable: this.isEditable,
			enrichedDescription: await TextEditor.enrichHTML(item.system.description, {
				relativeTo: item,
				rollData: item.getRollData(),
				secrets: item.isOwner
			})
		});
	}
}
