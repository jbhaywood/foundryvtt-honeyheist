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
			width: 500,
			height: 550
		});
	}

	/** @override */
	getData(options) {
		let baseData = super.getData(options);
		let sheetData = {};
		sheetData = baseData.data;  // needed to handle the new 0.8.x data depth
		if (isNewerVersion(game.data.version, "0.8.0")) {
			sheetData.actor = this.actor.data.toObject(false);  // needed for actor.x handlebars
			sheetData.editable = this.options.editable;  // needed to fix TinyMCE due to missing editable parameter
			return sheetData;
		} else {
			return baseData;
		}
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
			const isEnd = this._updateStatsAsync(updateValue, null, isBearRoll);

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
	}

	async _updateStatsAsync(offset, roll, isBearRoll) {
		let bearStat = this.actor.data.data.stats.bear;
		let criminalStat = this.actor.data.data.stats.criminal;

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
				await this.actor.update({ "data.stats.bear": bearStat });
				await this.actor.update({ "data.stats.criminal": criminalStat });

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
