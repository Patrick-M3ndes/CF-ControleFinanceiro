// modules/state.js - Gestão de Estado Centralizada

export let currentUser = null;
export let currentMonth = new Date();
export let chartInstance = null;

// Cache em memória para evitar leituras excessivas (Escalabilidade)
export const appState = {
  fixas: [],
  metas: [],
  receitas: [],
  variaveis: [],
  investimentos: [],
  pagamentosFixas: [], // IDs das fixas pagas no mês atual
  editingItem: { id: null, collection: null } // Controla o estado de edição
};

export const screens = {
  auth: document.getElementById('auth-container'),
  app: document.getElementById('app-screen')
};

export const authCards = {
  login: document.getElementById('login-card'),
  register: document.getElementById('register-card')
};

// Funções para atualizar o estado com segurança
export function setCurrentUser(user) {
  currentUser = user;
}

export function setCurrentMonth(date) {
  currentMonth = date;
}

export function setChartInstance(instance) {
  chartInstance = instance;
}

export function updateAppState(newData) {
  Object.assign(appState, newData);
}

export function updateMonthDisplay() {
  const options = { year: 'numeric', month: 'long' };
  document.getElementById('current-month-display').textContent = currentMonth.toLocaleDateString('pt-BR', options);
}

export function getMonthRange(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    startDate: new Date(year, month, 1).toISOString().split('T')[0],
    endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
  };
}

export function getYearMonthKey() {
  return `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
}

export function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: { 'stroke-width': 2, 'class': 'lucide-icon' }
    });
  }
}
