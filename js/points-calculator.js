import { DOMElements } from './dom.js';
import { CONFIG, CLASS_DISTRIBUTIONS } from './config.js';
import { Utils, t, currentLang } from './utils.js';

export const PointsCalculator = {
    init: () => {
        PointsCalculator.buildDistributionUI();
        PointsCalculator.loadPreset();
        DOMElements.playerClass.addEventListener('change', PointsCalculator.loadPreset);
        DOMElements.totalPoints.addEventListener('input', () => {
            localStorage.setItem('totalPoints', DOMElements.totalPoints.value);
            PointsCalculator.updateDistribution();
        });
        DOMElements.pointsDistributionSection.addEventListener('input', PointsCalculator.updateDistribution);
        DOMElements.copyPointsButton.addEventListener('click', PointsCalculator.copyToClipboard);
        DOMElements.resetPointsCalculatorButton.addEventListener('click', PointsCalculator.loadPreset);
    },

    buildDistributionUI: () => {
        let html = '';
        CONFIG.ATTRIBUTES_IDS.forEach(attrId => {
            html += `
                <div class="grid grid-cols-12 gap-x-2 sm:gap-x-3 items-center">
                    <label class="col-span-5 sm:col-span-4 font-semibold text-slate-200 text-sm sm:text-base truncate" data-i18n-key="${attrId}">${t(attrId)}</label>
                    <span id="points-for-${attrId}" class="col-span-3 sm:col-span-4 text-green-400 font-bold text-sm sm:text-base text-right">0</span>
                    <div class="col-span-4 sm:col-span-4 flex items-center">
                        <input type="number" id="percent-for-${attrId}" data-attr="${attrId}" class="w-full bg-gray-700 border border-gray-600 rounded-lg p-1.5 text-center" min="0" max="100">
                        <span class="ml-2">%</span>
                    </div>
                </div>
            `;
        });
        html += `<div class="grid grid-cols-12 gap-2 items-center pt-2 border-t border-gray-600">
                       <label class="col-span-7 font-bold text-slate-200" data-i18n-key="totalPercent">${t('totalPercent')}</label>
                       <span id="total-percent" class="col-span-5 font-bold text-center">100%</span>
                     </div>`;
        DOMElements.pointsDistributionSection.innerHTML = html;
    },

    updateDistribution: () => {
        const totalPoints = Utils.getInputValueAsInt(DOMElements.totalPoints) || 0;
        let totalPercent = 0;
        document.querySelectorAll('#pointsDistributionSection input').forEach(input => {
            const attrId = input.dataset.attr;
            const percent = parseFloat(input.value) / 100 || 0;
            totalPercent += percent;
            const points = Math.round(totalPoints * percent);
            document.getElementById(`points-for-${attrId}`).textContent = points.toLocaleString(currentLang);
        });

        const totalPercentEl = document.getElementById('total-percent');
        totalPercentEl.textContent = `${(totalPercent * 100).toFixed(0)}%`;
        totalPercentEl.classList.toggle('text-red-500', Math.round(totalPercent * 100) !== 100);
        totalPercentEl.classList.toggle('text-green-600', Math.round(totalPercent * 100) === 100);
        DOMElements.pointsErrorMessage.textContent = Math.round(totalPercent * 100) !== 100 ? t('errorPercentSum') : '';
    },

    loadPreset: () => {
        const selectedClass = DOMElements.playerClass.value;
        const preset = CLASS_DISTRIBUTIONS[selectedClass];
        for (const attrId in preset) {
            const input = document.getElementById(`percent-for-${attrId}`);
            if (input) input.value = (preset[attrId] * 100).toFixed(0);
        }
        PointsCalculator.updateDistribution();
    },

    copyToClipboard: () => {
        let textToCopy = `${t('buildWith')} ${DOMElements.totalPoints.value} ${t('points')}:\n`;
        document.querySelectorAll('#pointsDistributionSection input').forEach(input => {
            const attrId = input.dataset.attr;
            const points = document.getElementById(`points-for-${attrId}`).textContent;
            const percent = input.value;
            textToCopy += `${t(attrId)}: ${points} ${t('points')} (${percent}%)\n`;
        });
        navigator.clipboard.writeText(textToCopy).then(() => {
            DOMElements.copyPointsButton.textContent = t('copied');
            setTimeout(() => { DOMElements.copyPointsButton.textContent = t('copyBuild'); }, 2000);
        });
    }
};