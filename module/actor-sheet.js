import { FIELD_CHOICES, HH } from "./config.js";

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const TextEditor = () => foundry.applications.ux.TextEditor.implementation;

const loc = (key) => game.i18n.localize(key);

/**
 * Honey Heist character sheet (ApplicationV2).
 * @extends {ActorSheetV2}
 */
export class HoneyHeistActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["honeyheist", "sheet", "actor"],
		position: { width: 750, height: 625 },
		window: { resizable: false },
		form: { submitOnChange: true },
		dragDrop: [{ dragSelector: "[data-item-id][draggable]", dropSelector: null }],
		actions: {
			moveStat: HoneyHeistActorSheet.#onMoveStat,
			rollStat: HoneyHeistActorSheet.#onRollStat,
			rollAttribute: HoneyHeistActorSheet.#onRollAttribute,
			addItem: HoneyHeistActorSheet.#onAddItem,
			editItem: HoneyHeistActorSheet.#onEditItem,
			deleteItem: HoneyHeistActorSheet.#onDeleteItem,
			rollItem: HoneyHeistActorSheet.#onRollItem
		}
	};

	/** @override */
	static PARTS = {
		sheet: {
			template: "systems/honey-heist/templates/actor-sheet.html",
			scrollable: [".hh-item-list"]
		}
	};

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		const actor = this.actor;
		const system = actor.system;
		const enrich = TextEditor().enrichHTML.bind(TextEditor());

		const items = [];
		for (const item of actor.items.contents.sort((a, b) => a.sort - b.sort)) {
			items.push({
				id: item.id,
				name: item.name,
				img: item.img,
				description: await enrich(item.system.description, { relativeTo: item, secrets: item.isOwner })
			});
		}

		return Object.assign(context, {
			actor,
			system,
			source: actor.toObject(),
			systemFields: system.schema.fields,
			editable: this.isEditable,
			enrichedBiography: await enrich(system.biography, {
				relativeTo: actor,
				rollData: actor.getRollData(),
				secrets: actor.isOwner
			}),
			items,
			choices: {
				descriptor: HH.descriptors,
				bearType: HH.bearTypes,
				role: HH.roles,
				hat: HH.hats,
				extraHats: HH.extraHats
			},
			values: {
				descriptor: system.descriptor,
				bearType: system["bear-type"],
				role: system.role,
				hat: system.hat,
				hat2a: system.hat2a,
				hat2b: system.hat2b
			},
			// A stat of six means the end for this bear; colour it red.
			bearEnd: system.stats.bear === 6,
			criminalEnd: system.stats.bear !== 6 && system.stats.criminal === 6,
			// Show the extra hat options only if the hat roll came up "Roll Twice!".
			showHat2: system.hat === "roll-twice"
		});
	}

	/* -------------------------------------------- */
	/*  Actions                                     */
	/* -------------------------------------------- */

	/** Move one point between Bear and Criminal without rolling. */
	static async #onMoveStat(event, target) {
		const isBearRoll = target.dataset.stat === "bear";
		const isEnd = await this.#updateStats(isBearRoll ? 1 : -1, null, isBearRoll);
		if (!isEnd) {
			await ChatMessage.create({
				content: isBearRoll ? loc("HH.CriminalToBear") : loc("HH.BearToCriminal"),
				speaker: ChatMessage.getSpeaker({ actor: this.actor })
			});
		}
	}

	/** Roll 1d6 (or 2d6kl) against the Bear or Criminal stat. */
	static async #onRollStat(event, target) {
		const isBearRoll = target.dataset.stat === "bear";
		const currentValue = Number(this.actor.system.stats[isBearRoll ? "bear" : "criminal"]);
		const roll = new Roll(target.dataset.roll, this.actor.getRollData());
		await roll.evaluate();

		const isSuccess = roll.total <= currentValue;
		const rollSuccess = isSuccess ? loc("HH.Success") : loc("HH.Failed");
		const actionMessage = isSuccess ? loc("HH.GreedMessage") : loc("HH.FrustrationMessage");
		const flavor = `${loc(isBearRoll ? "HH.RollForBear" : "HH.RollForCriminal")}: ${rollSuccess}. <p>${actionMessage}</p>`;

		// FRUSTRATION: When the plan fails and you run into difficulty,
		// move one point from Criminal into Bear.
		// GREED: When the plan goes off without a hitch,
		// move one point from Bear into Criminal.
		const isEnd = await this.#updateStats(isSuccess ? -1 : 1, roll, isBearRoll);
		if (!isEnd) {
			await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor });
		}
	}

	/** Roll for one of the attribute dropdowns (descriptor, bear type, role, hat, extra hats). */
	static async #onRollAttribute(event, target) {
		const field = target.dataset.field;
		const choices = FIELD_CHOICES[field];
		if (!choices) return;

		const roll = new Roll(target.dataset.roll, this.actor.getRollData());
		await roll.evaluate();

		// Index 0 is the "Roll" placeholder, so a total of N picks the Nth entry after it.
		const key = Object.keys(choices)[roll.total - 1];
		if (key === undefined) return;
		const optionLabel = choices[key];
		const label = target.closest(".attribute")?.querySelector("label")?.textContent?.trim() ?? field;

		await this.actor.update({ [`system.${field}`]: key });

		// If you roll an 8 on a hat roll, you get two hats!
		const twoHats = field === "hat" && key === "roll-twice";
		await roll.toMessage({
			speaker: ChatMessage.getSpeaker({ actor: this.actor }),
			content: `<h2>${label} Roll</h2><h3>${optionLabel}${twoHats ? " You get two hats!!" : ""}</h3>`
		});
	}

	static async #onAddItem() {
		const [item] = await this.actor.createEmbeddedDocuments("Item", [{ type: "item", name: loc("HH.NewItemName") }]);
		await item?.sheet.render({ force: true });
	}

	static async #onEditItem(event, target) {
		const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
		await item?.sheet.render({ force: true });
	}

	static async #onDeleteItem(event, target) {
		const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
		if (!item) return;
		const confirmed = await DialogV2.confirm({
			window: { title: `${loc("HH.ConfirmItemDelete")}: ${item.name}` },
			content: `<p>${loc("HH.ConfirmItemDeleteText")}</p>`,
			rejectClose: false,
			modal: true
		});
		if (confirmed) await item.delete();
	}

	/** Post the item (image, name and description) to chat. */
	static async #onRollItem(event, target) {
		const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
		if (!item) return;
		const name = Handlebars.escapeExpression(item.name);
		const img = Handlebars.escapeExpression(item.img);
		await ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor: this.actor }),
			content: `
				<div class="honeyheist">
					<div class="chatItem flexrow">
						<div class="item-image" tabindex="0" aria-label="${name}" style="background-image: url('${img}')"></div>
						<h4>${name}</h4>
					</div>
				</div>
				<div>${item.system.description}</div>`
		});
	}

	/* -------------------------------------------- */
	/*  Helpers                                     */
	/* -------------------------------------------- */

	/**
	 * Shift a point between Bear and Criminal.
	 * @param {number} offset       Added to Bear, subtracted from Criminal.
	 * @param {Roll|null} roll      The roll that caused the shift, if any.
	 * @param {boolean} isBearRoll  Whether the Bear stat was the one in play.
	 * @returns {Promise<boolean>}  True if this ended the bear's story.
	 */
	async #updateStats(offset, roll, isBearRoll) {
		let bearStat = Number(this.actor.system.stats.bear);
		let criminalStat = Number(this.actor.system.stats.criminal);

		let endResult = (isBearRoll && bearStat === 6) || (!isBearRoll && criminalStat === 6);
		if (endResult) return endResult;

		// Adjust the current values based on the given offset.
		bearStat += offset;
		criminalStat -= offset;

		// Only need to check one of the stats to make sure they're in the 0-6 range.
		if (bearStat < 0 || bearStat > 6) return endResult;

		await this.actor.update({ "system.stats.bear": bearStat, "system.stats.criminal": criminalStat });

		// If either stat has reached 6, it's the end for this bear.
		let endMessage = null;
		if (bearStat === 6) endMessage = loc("HH.BearEndMessage");
		else if (criminalStat === 6) endMessage = loc("HH.CriminalEndMessage");

		if (endMessage) {
			endResult = true;
			const speaker = ChatMessage.getSpeaker({ actor: this.actor });
			if (roll) await roll.toMessage({ speaker, flavor: endMessage });
			else await ChatMessage.create({ speaker, content: endMessage });
		}

		return endResult;
	}
}
