/**
 * Extend the basic ActorSheet
 * @extends {ActorSheet}
 */


export class HoneyHeistActorSheet extends ActorSheet {
	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["honeyheist", "sheet", "actor"],
			template: "systems/honey-heist/templates/actor-sheet.html",
			width: 750,
			height: 625,
			scrollY: [ "hh-item-list" ],
            dragDrop: [{ dropSelector: null, dragSelector: '[draggable]' }],
			resizable: false
		});
	}

	/** @override */
	getData(options) {
		let baseData = super.getData(options);
		let sheetData = {};
		sheetData = baseData.data;  // needed to handle the new 0.8.x data depth
		sheetData.actor = this.actor.toObject(false);  // needed for actor.x handlebars
		sheetData.editable = this.options.editable;  // needed to fix TinyMCE due to missing editable parameter
		console.debug("Actor Sheet Data:", sheetData)
		return sheetData;
	}

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);

		html.find(".attribute-roll").click(async (ev) => {
			const roller = $(ev.currentTarget);
			const roll = new Roll(roller.data("roll"), this.actor.getRollData()).evaluate({ async: false });  // avoid deprecation warning, backwards compatible
			const parent = roller.parent("div");
			const label = parent.find("label").get(0).innerText;
			const select = parent.find("select").get(0);
			const attributeName = select.name;
			const option = select.options[roll.total - 1];

			await this.actor.update({ [attributeName]: option.value });

			// If you roll an 8 on a hat roll, you get two hats!
			if (attributeName === "data.hat" && roll.total === 9) {
				$(".hat2").show();
				roll.toMessage({
					user: game.user.id,  // avoid deprecation warning, backwards compatible
					speaker: ChatMessage.getSpeaker({ actor: this.actor }),
					content: `<h2>${label} Roll</h2><h3>${option.innerText} You get two hats!!</h3>`
				});
			} else {
				roll.toMessage({
					user: game.user.id,  // avoid deprecation warning, backwards compatible
					speaker: ChatMessage.getSpeaker({ actor: this.actor }),
					content: `<h2>${label} Roll</h2><h3>${option.innerText}</h3>`
				});
			}
		});

		html.find(".stat-button").click((ev) => {
			const isBearRoll = this._isBearRoll(ev.currentTarget);
			const updateValue = isBearRoll ? 1 : -1;
			this._updateStatsAsync(updateValue, null, isBearRoll).then((isEnd) => {

				if (!isEnd) {
					ChatMessage.create({
						content: isBearRoll
							? game.i18n.localize("HH.CriminalToBear")
							: game.i18n.localize("HH.BearToCriminal"),
						user: game.user.id,
						speaker: ChatMessage.getSpeaker({ actor: this.actor })
					});
				}
			});
		});

		html.find(".stat-roll-single, .stat-roll-double").click(async (ev) => {
			const isBearRoll = this._isBearRoll(ev.currentTarget);
			const roller = $(ev.currentTarget);
			const input = roller.siblings(".stat-value").get(0);
			const currentValue = parseInt(input.value);
			const roll = new Roll(roller.data("roll"), this.actor.getRollData()).evaluate({ async: false });  // avoid deprecation warning, backwards compatible
			const isSuccess = roll.total <= currentValue;
			const rollSuccess = isSuccess ? game.i18n.localize("HH.Success") : game.i18n.localize("HH.Failed");
			const actionMessage = isSuccess
				? game.i18n.localize("HH.GreedMessage")
				: game.i18n.localize("HH.FrustrationMessage");
			const chatMessage = isBearRoll
				? `${game.i18n.localize("HH.RollForBear")}: ${rollSuccess}. <p>${actionMessage}</p>`
				: `${game.i18n.localize("HH.RollForCriminal")}: ${rollSuccess}. <p>${actionMessage}</p?`;

			// FRUSTRATION: When the plan fails and you run into
			// difficulty, move one point from Criminal into Bear.
			// GREED: When the plan goes off without a hitch, move
			// one point from Bear into Criminal.
			const isEnd = await this._updateStatsAsync(isSuccess ? -1 : 1, roll, isBearRoll);

			if (!isEnd) {
				roll.toMessage({
					user: game.user.id,  // avoid deprecation warning, backwards compatible
					speaker: ChatMessage.getSpeaker({ actor: this.actor }),
					flavor: chatMessage
				});
			}
		});

		html.find(".add-item").click(async (ev) => {
			await this.actor.createEmbeddedDocuments("Item", [{type: "item", name: game.i18n.localize('HH.NewItemName')}]);
		});

		html.find(".item-edit").click(async (ev) => {
			const itemID = $(ev.currentTarget).parents("[data-item-id]")[0].dataset.itemId;
			const item = this.actor.items.get(itemID);
			if (item) { item.sheet.render(true); }
		});

		html.find(".item-delete").click(async (ev) => {
			const itemID = $(ev.currentTarget).parents("[data-item-id]")[0].dataset.itemId;
			const item = this.actor.items.get(itemID);

			new Dialog({
				title: `${game.i18n.localize("HH.ConfirmItemDelete")}: ${item.name}`,
				content: game.i18n.localize("HH.ConfirmItemDeleteText"),
				buttons: {
					yes: {
						icon: "<i class='fas fa-check'></i>",
						label: game.i18n.localize("Yes"),
						callback: async (html) => {
							await item.delete();
						}
					},
					no: {
						icon: "<i class='fas fa-times'></i>",
						label: game.i18n.localize("No")
					}
				},
				default: "no"
			}).render(true);
		});

		html.find(".item-roll").click(async (ev) => {
			const itemID = $(ev.currentTarget).parents("[data-item-id]")[0].dataset.itemId;
			const item = this.actor.items.get(itemID);
			const messageData = {
				speaker: ChatMessage.getSpeaker({actor: this.actor}),
				content: `
					<div class="honeyheist">
						<div class="chatItem flexrow">
							<div class="item-image" tabindex="0" aria-label="${item.name}" style="background-image: url('${item.img}')"></div>
							<h4>${item.name}</h4>
						</div>
			  		</div>
	  				<div>${item.getRollData().description}</div>`
			}

			await ChatMessage.create(messageData);
		})
	}

	async _updateStatsAsync(offset, roll, isBearRoll) {
		let bearStat = this.actor.system.stats.bear;
		let criminalStat = this.actor.system.stats.criminal;

		// These stat values should always be numbers, but sometimes 
		// they get returned as strings and I don't know why.
		if (typeof bearStat === "string") {
			bearStat = parseInt(bearStat);
		}

		if (typeof criminalStat === "string") {
			criminalStat = parseInt(criminalStat);
		}

		let endResult = (isBearRoll && bearStat === 6) || (!isBearRoll && criminalStat === 6);

		if (!endResult) {
			// Adjust the current values based on the given offset.
			bearStat += offset;
			criminalStat -= offset;

			// Only need to check one or the other stat value to make sure they're in the 0-6 range.
			if (bearStat >= 0 && bearStat <= 6) {
				// Set the new values in the sheet.
				await this.actor.update({ "system.stats.bear": bearStat });
				await this.actor.update({ "system.stats.criminal": criminalStat });

				// Check to see if either the bear or criminal stat has reached 6,
				// which means it's the end for this bear.
				if (bearStat === 6) {
					endResult = true;

					if (roll) {
						roll.toMessage({
							user: game.user.id,  // avoid deprecation warning, backwards compatible
							speaker: ChatMessage.getSpeaker({ actor: this.actor }),
							flavor: game.i18n.localize("HH.BearEndMessage")
						});
					} else {
						ChatMessage.create({
							user: game.user.id,  // avoid deprecation warning, backwards compatible
							speaker: ChatMessage.getSpeaker({ actor: this.actor }),
							content: game.i18n.localize("HH.BearEndMessage")
						});
					}
				} else if (criminalStat === 6) {
					endResult = true;

					if (roll) {
						roll.toMessage({
							user: game.user.id,  // avoid deprecation warning, backwards compatible
							speaker: ChatMessage.getSpeaker({ actor: this.actor }),
							flavor: game.i18n.localize("HH.CriminalEndMessage")
						});
					} else {
						ChatMessage.create({
							user: game.user.id,  // avoid deprecation warning, backwards compatible
							speaker: ChatMessage.getSpeaker({ actor: this.actor }),
							content: game.i18n.localize("HH.CriminalEndMessage")
						});
					}
				}
			}
		}

		return endResult;
	}

	_isBearRoll(element) {
		return element.parentElement.id === "stat-bear";
	}
}
