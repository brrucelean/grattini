import { useState, useCallback } from "react";
import { ACHIEVEMENTS } from "../data/achievements.js";
import { AudioEngine } from "../audio.js";

export function useMeta() {
  const [achievements, setAchievements] = useState(() => {
    try { return JSON.parse(localStorage.getItem('grattini_achievements') || '{}'); } catch { return {}; }
  });
  const [activeCedola, setActiveCedola] = useState(() => {
    try { return JSON.parse(localStorage.getItem('grattini_cedola') || 'null'); } catch { return null; }
  });
  const [pendingCedoleOffer, setPendingCedoleOffer] = useState(null);
  const [achievementToast, setAchievementToast] = useState(null);
  const [showTrophies, setShowTrophies] = useState(false);
  const [showReliquie, setShowReliquie] = useState(false);
  const [discoveredRelics, setDiscoveredRelics] = useState(() => {
    try { return JSON.parse(localStorage.getItem('grattini_relics_discovered') || '[]'); } catch { return []; }
  });
  const [enabledRelics, setEnabledRelics] = useState(() => {
    try { return JSON.parse(localStorage.getItem('grattini_relics_enabled') || '[]'); } catch { return []; }
  });
  const [showAllTimeStats, setShowAllTimeStats] = useState(false);

  const unlockAchievement = useCallback((id) => {
    setAchievements(prev => {
      if (prev[id]) return prev; // already unlocked
      const updated = { ...prev, [id]: { unlockedAt: Date.now() } };
      try { localStorage.setItem('grattini_achievements', JSON.stringify(updated)); } catch {}
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach) {
        AudioEngine.achievementJingle();
        setAchievementToast(ach);
        setTimeout(() => setAchievementToast(null), 3000);
      }
      return updated;
    });
  }, []);

  const updateAllTimeStats = useCallback((runStats) => {
    try {
      const existing = JSON.parse(localStorage.getItem('grattini_alltime') || '{}');
      const updated = {
        totalRuns: (existing.totalRuns || 0) + 1,
        totalWins: (existing.totalWins || 0) + (runStats._isWin ? 1 : 0),
        totalMoneyEarned: (existing.totalMoneyEarned || 0) + (runStats.moneyEarned || 0),
        totalCardsScratched: (existing.totalCardsScratched || 0) + (runStats.cardsScratched || 0),
      };
      localStorage.setItem('grattini_alltime', JSON.stringify(updated));
    } catch {}
  }, []);

  return {
    achievements, setAchievements,
    activeCedola, setActiveCedola,
    pendingCedoleOffer, setPendingCedoleOffer,
    achievementToast, setAchievementToast,
    showTrophies, setShowTrophies,
    showReliquie, setShowReliquie,
    discoveredRelics, setDiscoveredRelics,
    enabledRelics, setEnabledRelics,
    showAllTimeStats, setShowAllTimeStats,
    unlockAchievement,
    updateAllTimeStats,
  };
}
