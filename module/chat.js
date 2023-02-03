import * as Dice from "./dice.js"

export function addChatListeners(html) {
    html.on('click', 'button.rollConsequences', rollConsequences);
}

function rollConsequences(event) {
    const card = event.currentTarget.closest(".skill-roll");
    console.log(card.dataset);
    const actorID = card.dataset.ownerId;
    const isWizardRoll = card.dataset.iswizardroll;

    Dice.rollConsequences(actorID, isWizardRoll);

}