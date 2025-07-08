// Arquivo: js/main.js

import { CONFIG } from './config.js';
import { DOMElements } from './dom.js';
import { Utils, getLang, setLang, t, updateVisitorCount, ThemeManager } from './utils.js';
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
}

function main() {
    // 1. Configurar o idioma
    const lang = getLang();
    setLang(lang);
    document.documentElement.lang = lang;

    // 2. Inicializar o gerenciador de temas
    ThemeManager.init();

    // 3. Traduzir a página e popular elementos dinâmicos
    translatePage();

    // 4. Restaurar estado salvo (se houver)
    const savedTotalPoints = localStorage.getItem('totalPoints');
    if (savedTotalPoints) {
        DOMElements.totalPoints.value = savedTotalPoints;
    }

    // 5. Inicializar os módulos
    TimeCalculator.populateDropdowns();
    TimeCalculator.reset();
    PointsCalculator.init();

    // 6. Adicionar os listeners principais
    addEventListeners();

    // 7. Definir o estado inicial da UI
    showTab('timeCalculatorTabContent');

    // 8. Configurar tarefas em segundo plano
    // Este atualiza o tempo do jogo a cada segundo
    setInterval(() => {
        if (!document.getElementById('timeCalculatorTabContent').classList.contains('hidden')) {
            TimeCalculator.calculateCurrentGameTime();
        }
    }, 1000);

    // **AQUI ESTÁ A MUDANÇA PARA ATUALIZAÇÃO EM TEMPO REAL**
    // 1. Chama a função imediatamente ao carregar a página.
    updateVisitorCount();
    // 2. E depois, configura para chamar a mesma função a cada 15 segundos.
    setInterval(updateVisitorCount, 15000); // 15000 milissegundos = 15 segundos
}

document.addEventListener('DOMContentLoaded', main);