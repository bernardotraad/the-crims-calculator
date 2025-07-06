import { DOMElements } from './dom.js';
import { CONFIG } from './config.js';
import { Utils, t, currentLang } from './utils.js';

export const TimeCalculator = {
    populateDropdowns: () => {
        for (let i = 1; i <= 52; i++) { DOMElements.targetDay.add(new Option(i, i)); }
        for (let i = 0; i <= 23; i++) { DOMElements.targetHour.add(new Option(String(i).padStart(2, '0'), i)); }
        for (let i = 0; i <= 59; i++) { DOMElements.targetMinute.add(new Option(String(i).padStart(2, '0'), i)); }
    },

    calculateCurrentGameTime: () => {
        if (!DOMElements.roundStartDate.value) return false;
        const roundStart = new Date(DOMElements.roundStartDate.value);
        const now = new Date();
        const diffMs = now.getTime() - roundStart.getTime();

        if (diffMs < 0) {
            [DOMElements.currentDay.value, DOMElements.currentHour.value, DOMElements.currentMinute.value] = [1, 0, 0];
            return false;
        }

        const diffGameMinutes = (diffMs / 60000) * CONFIG.GAME_MINUTES_PER_REAL_MINUTE;
        const gameDays = Math.floor(diffGameMinutes / 1440);
        const remainingMinutes = diffGameMinutes % 1440;
        const gameHours = Math.floor(remainingMinutes / 60);
        const gameMinutes = Math.floor(remainingMinutes % 60);

        Utils.setInputValue(DOMElements.currentDay, gameDays + 1);
        Utils.setInputValue(DOMElements.currentHour, gameHours);
        Utils.setInputValue(DOMElements.currentMinute, gameMinutes);
        return true;
    },

    calculateCurrentRoundEndDate: () => {
        if (!DOMElements.roundStartDate.value) return;
        const roundStart = new Date(DOMElements.roundStartDate.value);
        const endDateMs = roundStart.getTime() + (CONFIG.ROUND_DURATION_GAME_DAYS * CONFIG.REAL_HOURS_PER_GAME_DAY * 3600000);
        Utils.setInputValue(DOMElements.currentRoundEndDate, Utils.formatDateForInput(new Date(endDateMs)));
    },

    calculateRealTime: () => {
        Utils.clearMessages(DOMElements.result, DOMElements.localTimeResult, DOMElements.errorMessage);

        if (!TimeCalculator.calculateCurrentGameTime()) {
            DOMElements.errorMessage.textContent = t('errorInvalidStart');
            return;
        }

        const [currentDay, currentHour, currentMinute] = [DOMElements.currentDay, DOMElements.currentHour, DOMElements.currentMinute].map(Utils.getInputValueAsInt);
        const [targetDay, targetHour, targetMinute] = [DOMElements.targetDay, DOMElements.targetHour, DOMElements.targetMinute].map(Utils.getInputValueAsInt);

        if ([targetDay, targetHour, targetMinute].some(isNaN)) {
            DOMElements.errorMessage.textContent = t('errorFillFields');
            return;
        }

        const currentTotalMinutes = (currentDay * 1440) + (currentHour * 60) + currentMinute;
        const targetTotalMinutes = (targetDay * 1440) + (targetHour * 60) + targetMinute;

        if (targetTotalMinutes < currentTotalMinutes) {
            DOMElements.errorMessage.textContent = t('errorFutureTime');
            return;
        }

        const diffGameMinutes = targetTotalMinutes - currentTotalMinutes;
        if (diffGameMinutes === 0) {
            DOMElements.result.textContent = t('timeIsSame');
            return;
        }

        const diffRealSeconds = diffGameMinutes * (60 / CONFIG.GAME_MINUTES_PER_REAL_MINUTE);
        const hours = Math.floor(diffRealSeconds / 3600);
        const minutes = Math.floor((diffRealSeconds % 3600) / 60);

        const pr = new Intl.PluralRules(currentLang);
        const hourKey = `hour_${pr.select(hours)}`;
        const minuteKey = `minute_${pr.select(minutes)}`;
        const resultParts = [];
        if (hours > 0) resultParts.push(`${hours} ${t(hourKey)}`);
        if (minutes > 0) resultParts.push(`${minutes} ${t(minuteKey)}`);

        DOMElements.result.textContent = `${t('realTimeNeeded')}: ${resultParts.join(` ${t('and')} `)}`;
        const targetRealDate = new Date(new Date().getTime() + diffRealSeconds * 1000);
        DOMElements.localTimeResult.textContent = `${t('localTimePrefix')}: ${targetRealDate.toLocaleString(currentLang, { dateStyle: 'long', timeStyle: 'short' })}`;
    },

    reset: () => {
        const savedStartDate = localStorage.getItem('roundStartDate');
        if (savedStartDate) {
            DOMElements.roundStartDate.value = savedStartDate;
        } else {
            Utils.setInputValue(DOMElements.roundStartDate, Utils.formatDateForInput(CONFIG.DEFAULT_ROUND_START_DATE));
        }
        TimeCalculator.calculateCurrentRoundEndDate();
        TimeCalculator.calculateCurrentGameTime();
        DOMElements.targetDay.value = localStorage.getItem('targetDay') || DOMElements.currentDay.value;
        DOMElements.targetHour.value = localStorage.getItem('targetHour') || DOMElements.currentHour.value;
        DOMElements.targetMinute.value = localStorage.getItem('targetMinute') || DOMElements.currentMinute.value;
        Utils.clearMessages(DOMElements.result, DOMElements.localTimeResult, DOMElements.errorMessage);
    }
};