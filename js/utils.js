// Arquivo: js/utils.js

import { i18n } from './config.js';

export let currentLang = 'en';

export const setLang = (lang) => {
    currentLang = lang;
};

export const getLang = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const forcedLang = urlParams.get('lang');
    if (forcedLang && i18n[forcedLang]) {
        return forcedLang;
    }
    const userLang = navigator.language || navigator.userLanguage;
    return userLang.startsWith('pt') ? 'pt' : 'en';
};

export const t = (key) => i18n[currentLang]?.[key] || i18n['en'][key];

export const Utils = {
    formatDateForInput: (date) => {
        const pad = (num) => String(num).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    },
    clearMessages: (...elements) => {
        elements.forEach(el => { if (el) el.textContent = ''; });
    },
    getInputValueAsInt: (element) => parseInt(element.value, 10),
    setInputValue: (element, value) => { element.value = value; }
};

function getOrCreateVisitorId() {
    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
        visitorId = 'visitor-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('visitorId', visitorId);
    }
    return visitorId;
}

export async function updateVisitorCount() {
    try {
        const visitorId = getOrCreateVisitorId();

        // **MUDANÇA PRINCIPAL AQUI**
        // Enviamos o ID diretamente na URL, sem corpo, usando GET.
        const response = await fetch(`/.netlify/functions/visitor-counter?visitorId=${visitorId}`);

        const data = await response.json();

        document.getElementById('online-count').textContent = data.online;
        document.getElementById('daily-count').textContent = data.last24h;
    } catch (error) {
        console.error("Error fetching visitor count:", error);
        document.getElementById('visitor-counter').style.display = 'none';
    }
}