import { i18n } from './config.js';

export let currentLang = 'en';

export function getLang() {
    return localStorage.getItem('language') || (navigator.language.startsWith('pt') ? 'pt' : 'en');
}

export function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('language', lang);
}

export function t(key) {
    return i18n[currentLang][key] || key;
}

export const Utils = {
    getInputValueAsInt: (element) => parseInt(element.value, 10),
    setInputValue: (element, value) => { element.value = value; },
    formatDateForInput: (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    },
    clearMessages: (...elements) => elements.forEach(el => { el.textContent = ''; })
};

export async function updateVisitorCount() {
    try {
        const response = await fetch('/.netlify/functions/visitor-counter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'increment'
            })
        });

        if (response.ok) {
            const data = await response.json();
            
            // Update the UI with the visitor counts
            const onlineCountEl = document.getElementById('online-count');
            const dailyCountEl = document.getElementById('daily-count');
            
            if (onlineCountEl && data.online !== undefined) {
                onlineCountEl.textContent = data.online;
            }
            
            if (dailyCountEl && data.daily !== undefined) {
                dailyCountEl.textContent = data.daily;
            }
        } else {
            console.warn('Failed to update visitor count:', response.status);
        }
    } catch (error) {
        console.warn('Error updating visitor count:', error);
        // Silently fail - don't show error to user for this non-critical feature
    }
}

// Theme management
export const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.setTheme(savedTheme);
        this.createToggleButton();
    },

    setTheme(theme) {
        const body = document.body;
        const isDark = theme === 'dark';
        
        body.classList.toggle('dark', isDark);
        body.classList.toggle('light', !isDark);
        
        localStorage.setItem('theme', theme);
        this.updateToggleButton(theme);
    },

    toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    },

    createToggleButton() {
        const header = document.querySelector('header');
        const toggleButton = document.createElement('button');
        toggleButton.id = 'theme-toggle';
        toggleButton.className = 'absolute top-0 right-0 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 light:bg-gray-200 light:hover:bg-gray-300 transition-colors duration-200';
        toggleButton.innerHTML = `
            <svg class="w-5 h-5 theme-icon-sun hidden" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>
            </svg>
            <svg class="w-5 h-5 theme-icon-moon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
            </svg>
        `;
        
        toggleButton.addEventListener('click', () => this.toggleTheme());
        header.appendChild(toggleButton);
    },

    updateToggleButton(theme) {
        const sunIcon = document.querySelector('.theme-icon-sun');
        const moonIcon = document.querySelector('.theme-icon-moon');
        
        if (sunIcon && moonIcon) {
            if (theme === 'dark') {
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            } else {
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            }
        }
    }
};