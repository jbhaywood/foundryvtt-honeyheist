/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the HoneyHeist system.
 * @extends {Actor}
 */
export class DefinitelyWizardsActor extends Actor {
    /** @override */
    // getRollData() {
    //  const data = super.getRollData();
    //  return data;
    // }
    // /** @override */
    // prepareData() {
    //  super.prepareData();
    //  const actorData = this.data;
    // }


    async updateStat(isWizard, offset) {
        console.log("Update stat");

        let wizardStat = this.system.stats.wizard;
        let wildStat = this.system.stats.wild;


        // These stat values should always be numbers, but sometimes
        // they get returned as strings and I don't know why.
        if (typeof wizardStat === "string") {
            wizardStat = parseInt(wizardStat);
        }

        if (typeof wildStat === "string") {
            wildStat = parseInt(wildStat);
        }

        if (isWizard) {
            wizardStat += offset;
        } else {
            wildStat += offset;
        }

        if (wildStat >= 0 && wildStat <= 7) {
            // Set the new values in the sheet.
            await this.update({ "system.stats.wizard": wizardStat });
            await this.update({ "system.stats.wild": wildStat });

            console.log(this.system.stats.wizard);
            console.log(this.system.stats.wild);

            // Check to see if either the bear or criminal stat has reached 6,
            // which means it's the end for this bear.
            if (wildStat >= 7) {
                ChatMessage.create({
                    user: game.user.id,  // avoid deprecation warning, backwards compatible
                    speaker: ChatMessage.getSpeaker({ actor: this }),
                    content: game.i18n.localize("DW.EndGame")
                });
            }
        }
    }

    async resetStat(isWizard) {
        let wizardStat = this.system.stats.wizard;
        let wildStat = this.system.stats.wild;

        if (typeof wizardStat === "string") {
            wizardStat = parseInt(wizardStat);
        }

        if (typeof wildStat === "string") {
            wildStat = parseInt(wildStat);
        }

        if (isWizard) {
            wizardStat = 2;
        } else {
            wildStat = 2;
        }

        await this.update({ "system.stats.wizard": wizardStat });
        await this.update({ "system.stats.wild": wildStat });
    }
}
