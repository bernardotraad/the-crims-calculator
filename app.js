// app.js - Módulo principal da aplicação The Crims Calculator

// Objeto global da aplicação para encapsular todos os módulos
const App = {};

// --- Módulo de Configurações Globais ---
App.Config = {
    REAL_HOURS_PER_GAME_DAY: 6, // 6 horas reais = 1 dia de jogo
    GAME_HOURS_PER_REAL_HOUR: 24 / 6, // 4 horas de jogo por hora real
    GAME_MINUTES_PER_REAL_MINUTE: (24 / 6) * (60 / 60), // 4 minutos de jogo por minuto real
    DEFAULT_ROUND_START_DATE: new Date(2025, 6, 2, 12, 0), // 2 de Julho de 2025, 12:00 (Mês é 0-indexado)
    ROUND_DURATION_GAME_DAYS: 52 // Duração padrão da rodada no jogo em dias
};

// --- Módulo de Funções Utilitárias ---
App.Utils = {
    /**
     * Formata um objeto Date para o formato de input datetime-local (YYYY-MM-DDTHH:MM).
     * @param {Date} date - O objeto Date a ser formatado.
     * @returns {string} A string da data formatada.
     */
    formatDateForInput: function(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    },

    /**
     * Limpa o conteúdo de elementos HTML especificados por seus IDs.
     * @param {string[]} elementIds - Um array de IDs de elementos a serem limpos.
     */
    clearMessages: function(elementIds) {
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '';
        });
    },

    /**
     * Obtém o valor de um elemento input numérico e o converte para inteiro.
     * @param {string} id - O ID do elemento input.
     * @returns {number} O valor inteiro do input.
     */
    getInputValueAsInt: function(id) {
        return parseInt(document.getElementById(id).value);
    },

    /**
     * Define o valor de um elemento input.
     * @param {string} id - O ID do elemento input.
     * @param {string|number} value - O valor a ser definido.
     */
    setInputValue: function(id, value) {
        document.getElementById(id).value = value;
    }
};

// --- Módulo de Lógica da Interface do Usuário (UI) ---
App.UI = {
    /**
     * Inicializa os event listeners para os botões de navegação e cálculo.
     */
    init: function() {
        // Event listeners para os botões de aba
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (event) => {
                App.UI.showTab(event.target.dataset.tabId);
            });
        });

        // Event listeners para a Calculadora de Tempo
        document.getElementById('calculateTimeButton').addEventListener('click', App.TimeCalculator.calculateTime);
        document.getElementById('resetTimeCalculatorButton').addEventListener('click', App.TimeCalculator.resetTimeCalculator);
        document.getElementById('roundStartDate').addEventListener('change', () => {
            App.TimeCalculator.calculateCurrentGameTime();
            App.TimeCalculator.calculateCurrentRoundEndDate();
        });

        // Event listeners para a Calculadora de Pontos
        document.getElementById('calculatePointsButton').addEventListener('click', App.PointsCalculator.calculatePoints);
        document.getElementById('resetPointsCalculatorButton').addEventListener('click', App.PointsCalculator.resetPointsCalculator);
    },

    /**
     * Alterna a visibilidade das abas e ativa o botão correspondente.
     * @param {string} tabId - O ID do conteúdo da aba a ser exibido.
     */
    showTab: function(tabId) {
        // Esconde todos os conteúdos das abas
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Desativa todos os botões de aba
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });

        // Ativa a aba e o botão selecionados
        document.getElementById(tabId).classList.add('active');
        document.querySelector(`.tab-button[data-tab-id="${tabId}"]`).classList.add('active');

        // Recalcula o tempo atual do jogo ao mudar para a aba da calculadora de tempo
        if (tabId === 'timeCalculatorTabContent') {
            App.TimeCalculator.calculateCurrentGameTime();
            App.TimeCalculator.calculateCurrentRoundEndDate();
        }
        // Limpa as mensagens ao trocar de aba
        App.Utils.clearMessages(['errorMessage', 'result', 'localTimeResult', 'pointsErrorMessage', 'pointsResult']);
    }
};

// --- Módulo da Calculadora de Tempo ---
App.TimeCalculator = {
    /**
     * Calcula e exibe o tempo atual no jogo The Crims.
     * @returns {boolean} True se o cálculo foi bem-sucedido, false caso contrário.
     */
    calculateCurrentGameTime: function() {
        const roundStartDateInput = document.getElementById('roundStartDate').value;

        if (!roundStartDateInput) {
            App.Utils.setInputValue('currentDay', '');
            App.Utils.setInputValue('currentHour', '');
            App.Utils.setInputValue('currentMinute', '');
            return false;
        }

        const roundStartDate = new Date(roundStartDateInput);
        const now = new Date();

        const diffMs = now.getTime() - roundStartDate.getTime();

        // Se a data de início da rodada for no futuro
        if (diffMs < 0) {
            App.Utils.setInputValue('currentDay', 1);
            App.Utils.setInputValue('currentHour', 0);
            App.Utils.setInputValue('currentMinute', 0);
            return false;
        }

        const diffRealMinutes = diffMs / (1000 * 60);
        const diffGameMinutes = diffRealMinutes * App.Config.GAME_MINUTES_PER_REAL_MINUTE;

        const gameDays = Math.floor(diffGameMinutes / (24 * 60));
        const remainingMinutesGame = diffGameMinutes % (24 * 60);
        const gameHours = Math.floor(remainingMinutesGame / 60);
        const gameMinutes = Math.floor(remainingMinutesGame % 60);

        const currentDayGame = gameDays + 1; // Jogo começa no Dia 1
        const currentHourGame = gameHours;
        const currentMinuteGame = gameMinutes;

        App.Utils.setInputValue('currentDay', currentDayGame);
        App.Utils.setInputValue('currentHour', currentHourGame);
        App.Utils.setInputValue('currentMinute', currentMinuteGame);

        return true;
    },

    /**
     * Calcula e exibe a data e hora de fim da rodada atual na vida real.
     */
    calculateCurrentRoundEndDate: function() {
        const roundStartDateInput = document.getElementById('roundStartDate').value;
        const currentRoundEndDateInput = document.getElementById('currentRoundEndDate');

        if (!roundStartDateInput) {
            currentRoundEndDateInput.value = '';
            return;
        }

        const roundStartDate = new Date(roundStartDateInput);
        // Calcula a data de fim: Data de Início + (52 dias de jogo * 6 horas reais/dia de jogo)
        const endDateMs = roundStartDate.getTime() + (App.Config.ROUND_DURATION_GAME_DAYS * App.Config.REAL_HOURS_PER_GAME_DAY * 60 * 60 * 1000);
        const currentRoundEndDate = new Date(endDateMs);

        currentRoundEndDateInput.value = App.Utils.formatDateForInput(currentRoundEndDate);
    },

    /**
     * Calcula o tempo real necessário para atingir um tempo desejado no jogo.
     */
    calculateTime: function() {
        App.Utils.clearMessages(['result', 'localTimeResult', 'errorMessage']);

        const isCurrentTimeCalculated = App.TimeCalculator.calculateCurrentGameTime();
        if (!isCurrentTimeCalculated) {
            document.getElementById('errorMessage').textContent = 'Por favor, insira uma Data/Hora de Início da Rodada válida e no passado.';
            return;
        }

        const currentDay = App.Utils.getInputValueAsInt('currentDay');
        const currentHour = App.Utils.getInputValueAsInt('currentHour');
        const currentMinute = App.Utils.getInputValueAsInt('currentMinute');

        const targetDay = App.Utils.getInputValueAsInt('targetDay');
        const targetHour = App.Utils.getInputValueAsInt('targetHour');
        const targetMinute = App.Utils.getInputValueAsInt('targetMinute');

        // Validação de inputs
        if (isNaN(targetDay) || isNaN(targetHour) || isNaN(targetMinute)) {
            document.getElementById('errorMessage').textContent = 'Por favor, preencha os campos de "Tempo Desejado" com números válidos.';
            return;
        }
        if (targetDay < 1) {
            document.getElementById('errorMessage').textContent = 'O Dia desejado deve ser no mínimo 1.';
            return;
        }
        if (targetHour < 0 || targetHour > 23) {
            document.getElementById('errorMessage').textContent = 'A Hora desejada deve estar entre 0 e 23.';
            return;
        }
        if (targetMinute < 0 || targetMinute > 59) {
            document.getElementById('errorMessage').textContent = 'O Minuto desejado deve estar entre 0 e 59.';
            return;
        }

        // Converte todos os tempos para minutos totais no jogo
        const currentTotalMinutesGame = (currentDay * 24 * 60) + (currentHour * 60) + currentMinute;
        const targetTotalMinutesGame = (targetDay * 24 * 60) + (targetHour * 60) + targetMinute;

        // Verifica se o tempo desejado é no futuro
        if (targetTotalMinutesGame < currentTotalMinutesGame) {
            document.getElementById('errorMessage').textContent = 'O tempo desejado deve ser no futuro em relação ao tempo atual do jogo.';
            return;
        }

        const differenceMinutesGame = targetTotalMinutesGame - currentTotalMinutesGame;
        const differenceRealSeconds = differenceMinutesGame * (60 / App.Config.GAME_MINUTES_PER_REAL_MINUTE);

        // Converte segundos reais para horas, minutos e segundos
        const realHours = Math.floor(differenceRealSeconds / 3600);
        const remainingSecondsAfterHours = differenceRealSeconds % 3600;
        const realMinutes = Math.floor(remainingSecondsAfterHours / 60);
        const realSeconds = Math.floor(remainingSecondsAfterHours % 60);

        let resultText = 'Tempo real necessário: ';
        if (realHours > 0) {
            resultText += `${realHours} hora${realHours !== 1 ? 's' : ''}`;
        }
        if (realMinutes > 0) {
            if (realHours > 0) resultText += ', ';
            resultText += `${realMinutes} minuto${realMinutes !== 1 ? 's' : ''}`;
        }
        if (realSeconds > 0) {
            if (realHours > 0 || realMinutes > 0) resultText += ' e ';
            resultText += `${realSeconds} segundo${realSeconds !== 1 ? 's' : ''}`;
        }
        if (realHours === 0 && realMinutes === 0 && realSeconds === 0) {
            resultText = 'O tempo atual e o tempo desejado são os mesmos.';
        }

        document.getElementById('result').textContent = resultText;

        // Calcula e exibe a hora local prevista
        const now = new Date();
        const targetRealLifeTimeMs = now.getTime() + (differenceRealSeconds * 1000);
        const targetRealLifeDate = new Date(targetRealLifeTimeMs);

        document.getElementById('localTimeResult').textContent = `Hora local prevista: ${targetRealLifeDate.toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'medium' })}`;
    },

    /**
     * Redefine os campos da calculadora de tempo para os valores padrão.
     */
    resetTimeCalculator: function() {
        App.Utils.setInputValue('roundStartDate', App.Utils.formatDateForInput(App.Config.DEFAULT_ROUND_START_DATE));
        App.TimeCalculator.calculateCurrentRoundEndDate(); // Calcula a data de fim da rodada ao redefinir

        // Define o tempo desejado para o tempo atual do jogo
        App.TimeCalculator.calculateCurrentGameTime(); // Garante que o tempo atual esteja atualizado
        App.Utils.setInputValue('targetDay', App.Utils.getInputValueAsInt('currentDay'));
        App.Utils.setInputValue('targetHour', App.Utils.getInputValueAsInt('currentHour'));
        App.Utils.setInputValue('targetMinute', App.Utils.getInputValueAsInt('currentMinute'));

        App.Utils.clearMessages(['result', 'localTimeResult', 'errorMessage']);
    }
};

// --- Módulo da Calculadora de Pontos ---
App.PointsCalculator = {
    // Percentagens otimizadas para cada classe com base nas suas vantagens e desvantagens no jogo.
    // A soma das percentagens para cada classe deve ser 1.0 (100%).
    CLASS_DISTRIBUTIONS: {
        assassino: { // Hitman - Foco em combate e sobrevivência em confronto.
            Força: 0.50,
            Tolerância: 0.30,
            Inteligência: 0.15,
            Carisma: 0.05
        },
        cafetao: { // Pimp - Foco em gerenciamento de pessoal e proteção.
            Carisma: 0.40,
            Inteligência: 0.25,
            Tolerância: 0.25,
            Força: 0.10
        },
        corretor: { // Broker - Foco em transações financeiras e influência no mercado.
            Inteligência: 0.45,
            Carisma: 0.35,
            Tolerância: 0.15,
            Força: 0.05
        },
        empresario: { // Businessman - Foco em negócios e investimentos.
            Inteligência: 0.45,
            Carisma: 0.35,
            Tolerância: 0.15,
            Força: 0.05
        },
        ladrao: { // Robber - Foco em roubos e agilidade.
            Inteligência: 0.40,
            Tolerância: 0.35,
            Força: 0.20,
            Carisma: 0.05
        },
        traficante: { // Dealer - Foco em comércio de drogas e rede de contatos.
            Inteligência: 0.38,
            Tolerância: 0.28,
            Carisma: 0.28,
            Força: 0.06
        }
    },

    /**
     * Calcula a distribuição de pontos de atributo com base na classe e total de pontos.
     */
    calculatePoints: function() {
        App.Utils.clearMessages(['pointsResult', 'pointsErrorMessage']);

        const totalPoints = App.Utils.getInputValueAsInt('totalPoints');
        const playerClass = document.getElementById('playerClass').value;
        const pointsResultDiv = document.getElementById('pointsResult');
        const pointsErrorDiv = document.getElementById('pointsErrorMessage');

        if (isNaN(totalPoints) || totalPoints < 0) {
            pointsErrorDiv.textContent = 'Por favor, insira um total de pontos válido (número positivo).';
            return;
        }

        const percentages = App.PointsCalculator.CLASS_DISTRIBUTIONS[playerClass];

        if (!percentages) {
            pointsErrorDiv.textContent = 'Classe de jogador inválida selecionada.';
            return;
        }

        // Obtém o nome da classe para exibição
        const classNameDisplay = document.getElementById('playerClass').options[document.getElementById('playerClass').selectedIndex].text;

        let resultHtml = `
            <p class="text-xl font-bold mb-4">Distribuição para ${classNameDisplay} (${totalPoints} pontos):</p>
        `;

        for (const attribute in percentages) {
            const points = Math.round(totalPoints * percentages[attribute]);
            resultHtml += `
                <div class="attribute-result">
                    <span class="attribute-label">${attribute}:</span>
                    <span class="attribute-value">${points} pontos (${(percentages[attribute] * 100).toFixed(0)}%)</span>
                </div>
            `;
        }
        pointsResultDiv.innerHTML = resultHtml;
    },

    /**
     * Redefine os campos da calculadora de pontos para os valores padrão.
     */
    resetPointsCalculator: function() {
        App.Utils.setInputValue('totalPoints', 10000);
        App.Utils.setInputValue('playerClass', 'assassino'); // Padrão para Assassino (primeiro na lista alfabética)
        App.Utils.clearMessages(['pointsResult', 'pointsErrorMessage']);
    }
};

// --- Inicialização da Aplicação ---
// Esta função é chamada quando todo o DOM é carregado.
App.init = function() {
    App.UI.init(); // Inicializa os event listeners da UI
    App.TimeCalculator.resetTimeCalculator(); // Configura os padrões da Calculadora de Tempo
    App.PointsCalculator.resetPointsCalculator(); // Configura os padrões da Calculadora de Pontos
    App.UI.showTab('timeCalculatorTabContent'); // Mostra a aba da calculadora de tempo por padrão

    // Configura intervalos para atualização em tempo real
    setInterval(App.TimeCalculator.calculateCurrentGameTime, 1000); // Atualiza o tempo do jogo a cada segundo
    setInterval(App.TimeCalculator.calculateCurrentRoundEndDate, 60 * 1000); // Atualiza a data de fim da rodada a cada minuto
};

document.addEventListener('DOMContentLoaded', App.init);
