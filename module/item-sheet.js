/**
 * Extend the basic ItemSheet
 * @extends {ItemSheet}
 */

export class HoneyHeistItemSheet extends foundry.appv1.sheets.ItemSheet {
    /** @override */
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ["honeyheist", "sheet", "item"],
			template: "systems/honey-heist/templates/item-sheet.html",
			width: 550,
			height: 400
		});
	}

    /** @override */
	getData(options) {
		let baseData = super.getData(options);
		let sheetData = {};
		sheetData = baseData.data;  // needed to handle the new 0.8.x data depth
        sheetData.item = this.item.toObject(false);
		sheetData.editable = this.options.editable;  // needed to fix TinyMCE due to missing editable parameter
		console.debug("Item Sheet Data:", sheetData)
		return sheetData;
	}

    /** @override */
	activateListeners(html) {
		super.activateListeners(html);
    }
}