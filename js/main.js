import { CONFIG } from './config.js';
import { DOMElements } from './dom.js';
import { Utils, getLang, setLang, t, updateVisitorCount } from './utils.js';
import { TimeCalculator } from './time-calculator.js';
import { PointsCalculator } from './points-calculator.js';

function translatePage() {
    document.querySelectorAll('[data-i18n-key]').forEach(el => {
        const key = el.dataset.i18nKey;
        el.innerHTML = t(key);
    });

    DOMElements.playerClass.innerHTML = '';
    CONFIG.CLASS_IDS.forEach(id => {
        DOMElements.playerClass.add(new Option(t(id), id));
    });
}

function showTab(tabId) {
    DOMElements.tabContents.forEach(content => content.classList.add('hidden'));
    DOMElements.tabs.forEach(tab => tab.classList.remove('active'));

    document.getElementById(tabId).classList.remove('hidden');
    document.querySelector(`.tab-button[data-tab-id="${tabId}"]`).classList.add('active');

    Utils.clearMessages(DOMElements.errorMessage, DOMElements.result, DOMElements.localTimeResult, DOMElements.pointsErrorMessage);
}

function addEventListeners() {
    DOMElements.tabs.forEach(tab => tab.addEventListener('click', () => showTab(tab.dataset.tabId)));

    // Event Listeners da Calculadora de Tempo
    DOMElements.calculateTimeButton.addEventListener('click', TimeCalculator.calculateRealTime);
    DOMElements.resetTimeCalculatorButton.addEventListener('click', TimeCalculator.reset);
    DOMElements.roundStartDate.addEventListener('change', () => {
        localStorage.setItem('roundStartDate', DOMElements.roundStartDate.value);
        TimeCalculator.calculateCurrentGameTime();
        TimeCalculator.calculateCurrentRoundEndDate();
    });
    DOMElements.targetDay.addEventListener('change', () => localStorage.setItem('targetDay', DOMElements.targetDay.value));
    DOMElements.targetHour.addEventListener('change', () => localStorage.setItem('targetHour', DOMElements.targetHour.value));
    DOMElements.targetMinute.addEventListener('change', () => localStorage.setItem('targetMinute', DOMElements.targetMinute.value));

    // A inicialização dos listeners da calculadora de pontos já é feita no PointsCalculator.init()
}

function main() {
    // 1. Configurar o idioma
    const lang = getLang();
    setLang(lang);
    document.documentElement.lang = lang;

    // 2. Traduzir a página e popular elementos dinâmicos
    translatePage();

    // 3. Restaurar estado salvo (se houver)
    const savedTotalPoints = localStorage.getItem('totalPoints');
    if (savedTotalPoints) {
        DOMElements.totalPoints.value = savedTotalPoints;
    }

    // 4. Inicializar os módulos
    TimeCalculator.populateDropdowns();
    TimeCalculator.reset();
    PointsCalculator.init(); // Constrói a UI e adiciona seus próprios listeners

    // 5. Adicionar os listeners principais
    addEventListeners();

    // 6. Definir o estado inicial da UI
    showTab('timeCalculatorTabContent');

    // 7. Configurar tarefas em segundo plano
    setInterval(() => {
        if (!document.getElementById('timeCalculatorTabContent').classList.contains('hidden')) {
            TimeCalculator.calculateCurrentGameTime();
        }
    }, 1000);

    updateVisitorCount();
}

document.addEventListener('DOMContentLoaded', main);