import { C, MAX_ITEMS } from "../data/theme.js";
import { CARD_TYPES, CARD_BALANCE } from "../data/cards.js";
import { ITEM_DEFS, GRATTATORE_DEFS } from "../data/items.js";
import { generateCard } from "../utils/card.js";
import { hasRelic } from "../utils/hasRelic.js";

export function useShopHandlers({ player, updatePlayer, addLog, setGameStats, setCardSelectMode, setScreen, effectiveFortune, unlockAchievement }) {
  const handleBuyCard = (cardId) => {
    const type = CARD_TYPES.find(t => t.id === cardId);
    if (!type || player.money < type.cost) return;
    const riggedBonus = (cardId === "doppioOnulla" && hasRelic(player, "riggedDice")) ? 0.15 : 0;
    const card = {...generateCard(cardId, effectiveFortune, riggedBonus), owned: true};
    updatePlayer(p => ({...p, money: p.money - type.cost, scratchCards: [...p.scratchCards, card]}));
    setGameStats(s => ({...s, moneySpent: (s.moneySpent || 0) + type.cost}));
    addLog(`Comprato: ${type.name} (€${type.cost})`, C.green);
  };

  const handleBuyItem = (itemId) => {
    // Prestito del Broker — speciale
    if (itemId === "__brokerLoan__") {
      updatePlayer(p => ({...p, money: p.money + 50, brokerLoan: 80}));
      addLog("🤝 Il Broker ti allunga €50. \"Ci vediamo dal boss, amico.\"", C.gold);
      return;
    }
    const item = ITEM_DEFS[itemId];
    if (!item) return;
    const discount = player.shopDiscountMeta || 0;
    const finalCost = Math.max(1, Math.round(item.cost * (1 - discount)));
    if (player.money < finalCost) return;
    if (player.items.length >= MAX_ITEMS) { addLog("Zaino pieno! Usa o butta un oggetto.", C.red); return; }
    updatePlayer(p => ({...p, money: p.money - finalCost, items: [...p.items, itemId]}));
    setGameStats(s => ({...s, moneySpent: (s.moneySpent || 0) + finalCost}));
    addLog(`Comprato: ${item.emoji} ${item.name} (€${finalCost}${discount>0?` [-${Math.round(discount*100)}%]`:""})`, C.green);
  };

  const handleBuyGrattatore = (gratId) => {
    const def = GRATTATORE_DEFS[gratId];
    if (!def || player.money < def.cost) return;
    const newGrat = { id: gratId, name: def.name, emoji: def.emoji, effect: def.effect, value: def.value, usesLeft: def.maxUses };
    updatePlayer(p => ({...p, money: p.money - def.cost, grattatori: [...p.grattatori, newGrat]}));
    addLog(`Comprato grattatore: ${def.emoji} ${def.name} (€${def.cost})`, C.cyan);
  };

  const handleSlotResult = ({ type, amount, isTriple7 }) => {
    if (type === "pay") {
      updatePlayer(p => ({...p, money: p.money - amount}));
      addLog(`🎰 Inserisci €${amount} nella slot machine...`, C.dim);
      // Track slot play
      setGameStats(s => {
        const newCount = (s.slotPlays || 0) + 1;
        if (newCount >= 5) unlockAchievement("gambler");
        return {...s, slotPlays: newCount};
      });
    } else if (type === "win") {
      updatePlayer(p => ({...p, money: p.money + amount}));
      if (amount >= 100) {
        addLog(`🎆 SUPER JACKPOT! +€${amount}! Il tabaccaio impallidisce.`, C.gold);
        unlockAchievement("triple7");
      } else if (amount >= 50) addLog(`🎉 JACKPOT! +€${amount}! Le monete cascano!`, C.gold);
      else addLog(`✨ Piccola vincita: +€${amount}.`, C.green);
    }
  };

  const handleShopScratch = () => {
    if (player.scratchCards.length === 0) return;
    setCardSelectMode(true);
    setScreen("selectCard");
  };

  return { handleBuyCard, handleBuyItem, handleBuyGrattatore, handleSlotResult, handleShopScratch };
}
