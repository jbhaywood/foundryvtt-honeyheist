/**
 * Extend the basic ActorSheet
 * @extends {ActorSheet}
 */


export class DefinitelyWizardsActorSheet extends ActorSheet {
	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["definitelywizards", "sheet", "actor"],
			template: "systems/definitely-wizards/templates/actor-sheet.html",
			width: 750,
			height: 625,
			scrollY: [ "dw-item-list" ],
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

		html.find(".attribute-select").change(async (ev) => {
			console.log(ev);
			const select = ev.target;

			/*if(select.name === "system.player-class") {
				let newValue = select.value;
				if(newValue === "custom") {
					$(".customClass").show();
				} else {
					$(".customClass").hide();
				}
			}*/
		});

		html.find(".attribute-roll").click(async (ev) => {
			const roller = $(ev.currentTarget);
			const roll = new Roll(roller.data("roll"), this.actor.getRollData()).evaluate({ async: false });  // avoid deprecation warning, backwards compatible
			const parent = roller.parent("div");
			const label = parent.find("label").get(0).innerText;
			const select = parent.find("select").get(0);
			const attributeName = select.name;
			const option = select.options[roll.total - 1];

			await this.actor.update({ [attributeName]: option.value });

			if(attributeName === "data.player-class" && roll.total === 12) {
				$(".customClass").show();
			}

			roll.toMessage({
				user: game.user.id,  // avoid deprecation warning, backwards compatible
				speaker: ChatMessage.getSpeaker({ actor: this.actor }),
				content: `<h2>${label} Roll</h2><h3>${option.innerText}</h3>`
			});
		});

		html.find(".stat-button-plus").click((ev) => {
			const isWizardRoll = this._isWizardRoll(ev.currentTarget);
			this._updateStatsAsync(1, null, isWizardRoll);
		});

		html.find(".stat-button-minus").click((ev) => {
			const isWizardRoll = this._isWizardRoll(ev.currentTarget);
			this._updateStatsAsync(-1, null, isWizardRoll);
		});

		html.find(".stat-button-reset").click((ev) => {
			const isWizardRoll = this._isWizardRoll(ev.currentTarget);
			this._resetStatAsync(isWizardRoll);
		});

		html.find(".stat-roll-single, .stat-roll-double").click(async (ev) => {
			console.log(ev);
			const isWizardRoll = this._isWizardRoll(ev.currentTarget);
			const roller = $(ev.currentTarget);
			const input = roller.siblings(".stat-value").get(0);
			const currentValue = parseInt(input.value);
			const roll = new Roll(roller.data("roll"), this.actor.getRollData()).evaluate({ async: false });  // avoid deprecation warning, backwards compatible
			const isSuccess = roll.total <= currentValue;
			const rollSuccess = isSuccess ? game.i18n.localize("DW.Success") : game.i18n.localize("DW.Failed");

			if(isSuccess) {
				const chatMessage = isWizardRoll 
				? `${game.i18n.localize("DW.RollForWizard")}: ${rollSuccess}. <p>${game.i18n.localize("DW.WizardSuccessMessage")}</p>` 
				: `${game.i18n.localize("DW.RollForWild")}: ${rollSuccess}. <p>${game.i18n.localize("DW.WildSuccessMessage")}</p?`;

				var isEnd = false;

				if (isWizardRoll) {
					isEnd = await this._updateStatsAsync(1, roll, isWizardRoll);
				}

				if (!isEnd) {
					roll.toMessage({
						user: game.user.id,  // avoid deprecation warning, backwards compatible
						speaker: ChatMessage.getSpeaker({ actor: this.actor }),
						flavor: chatMessage
					});
				}
			} else {
				const chatMessage = isWizardRoll 
				? `${game.i18n.localize("DW.RollForWizard")}: ${rollSuccess}. <p>${game.i18n.localize("DW.WizardFailMessage")}</p>` 
				: `${game.i18n.localize("DW.RollForWild")}: ${rollSuccess}. <p>${game.i18n.localize("DW.WildFailMessage")}</p?`;

				roll.toMessage({
					user: game.user.id,  // avoid deprecation warning, backwards compatible
					speaker: ChatMessage.getSpeaker({ actor: this.actor }),
					flavor: chatMessage
				});
			}

		});

		html.find(".add-item").click(async (ev) => {
			let item = await this.actor.createEmbeddedDocuments("Item", [{type: "item", name: game.i18n.localize('DW.NewItemName')}]);
			await item[0].sheet.render(true);
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
				title: `${game.i18n.localize("DW.ConfirmItemDelete")}: ${item.name}`,
				content: game.i18n.localize("DW.ConfirmItemDeleteText"),
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

	async _resetStatAsync(isWizardRoll) {
		let wizardStat = this.actor.system.stats.wizard;
		let wildStat = this.actor.system.stats.wild;

		if (typeof wizardStat === "string") {
			wizardStat = parseInt(wizardStat);
		}

		if (typeof wildStat === "string") {
			wildStat = parseInt(wildStat);
		}

		if (isWizardRoll) {
			wizardStat = 2;
		} else {
			wildStat = 2;
		}

		await this.actor.update({ "system.stats.wizard": wizardStat });
		await this.actor.update({ "system.stats.wild": wildStat });

		return true;
	}

	async _updateStatsAsync(offset, roll, isWizardRoll) {
		console.log("update stats");
		let wizardStat = this.actor.system.stats.wizard;
		let wildStat = this.actor.system.stats.wild;

		// These stat values should always be numbers, but sometimes 
		// they get returned as strings and I don't know why.
		if (typeof wizardStat === "string") {
			wizardStat = parseInt(wizardStat);
		}

		if (typeof wildStat === "string") {
			wildStat = parseInt(wildStat);
		}

		let endResult = (isWizardRoll && wizardStat === 7) || (!isWizardRoll && wildStat === 7);

		if (isWizardRoll) {
			wizardStat += offset;
		} else {
			wildStat += offset;
		}

		if (wizardStat >= 0 && wizardStat <= 7) {
			// Set the new values in the sheet.
			await this.actor.update({ "system.stats.wizard": wizardStat });
			await this.actor.update({ "system.stats.wild": wildStat });

			console.log(this.actor.system.stats.wizard);

			// Check to see if either the bear or criminal stat has reached 6,
			// which means it's the end for this bear.
			if (wizardStat === 7) {
				endResult = true;

				if (roll) {
					roll.toMessage({
						user: game.user.id,  // avoid deprecation warning, backwards compatible
						speaker: ChatMessage.getSpeaker({ actor: this.actor }),
						flavor: game.i18n.localize("DW.BearEndMessage")
					});
				} else {
					ChatMessage.create({
						user: game.user.id,  // avoid deprecation warning, backwards compatible
						speaker: ChatMessage.getSpeaker({ actor: this.actor }),
						content: game.i18n.localize("DW.BearEndMessage")
					});
				}
			} else if (wildStat === 7) {
				endResult = true;

				if (roll) {
					roll.toMessage({
						user: game.user.id,  // avoid deprecation warning, backwards compatible
						speaker: ChatMessage.getSpeaker({ actor: this.actor }),
						flavor: game.i18n.localize("DW.CriminalEndMessage")
					});
				} else {
					ChatMessage.create({
						user: game.user.id,  // avoid deprecation warning, backwards compatible
						speaker: ChatMessage.getSpeaker({ actor: this.actor }),
						content: game.i18n.localize("DW.CriminalEndMessage")
					});
				}
			}
		}

		return endResult;
	}

	_isWizardRoll(element) {
		return element.parentElement.id === "stat-wizard";
	}
}
