const consequencesRoll = "1d6";

export async function rollConsequences(actorID, isWizardRoll) {
    const template = "systems/definitely-wizards/templates/chat/consequences-roll-chat.hbs";
    const actor = game.actors.get(actorID);
    const roll = new Roll(consequencesRoll, actor.getRollData()).evaluate({ async: false });  // avoid deprecation warning, backwards compatible

    let resultMessage = "";

    if(roll.total <= 2) {
        if (isWizardRoll) {
            resultMessage = game.i18n.localize("DW.WizardDudConsequence");
        } else {
            resultMessage = game.i18n.localize("DW.WildDudConsequence");
        }
    } else if(roll.total <= 4) {
        if (isWizardRoll) {
            resultMessage = game.i18n.localize("DW.WizardMinorFailConsequence");
        } else {
            resultMessage = game.i18n.localize("DW.WildMinorFailConsequence");
        }

        actor.updateStat(false, 1);

    } else if(roll.total <= 5) {
        if (isWizardRoll) {
            resultMessage = game.i18n.localize("DW.WizardCriticalFailConsequence");
        } else {
            resultMessage = game.i18n.localize("DW.WildCriticalFailConsequence");
        }

        actor.updateStat(false, 1);
    }

    let templateData = {
        isWizardRoll: isWizardRoll,
        resultMessage: resultMessage,
        diceFormula: roll.formula,
        diceTotal: roll.total,
        owner: actor.id
    };

    ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({actor: actor}),
        content: await renderTemplate(template, templateData)
    });

}
