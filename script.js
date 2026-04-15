// script.js - Ponto de Entrada (Entry Point)
import { initAuth } from './modules/auth.js';
import { 
  loadInitialData, 
  loadMonthData, 
  setupForms, 
  setupBackupHandlers 
} from './modules/api.js';
import { 
  appState,
  currentMonth, 
  setCurrentMonth, 
  updateMonthDisplay, 
  refreshIcons 
} from './modules/state.js';
import { setModalMode } from './modules/ui-render.js';

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  // Inicializa a autenticação e passa o que fazer quando o usuário logar
  initAuth(async (user) => {
    await loadInitialData();
  });

  // Inicializa handlers de formulários e backup
  setupForms();
  setupBackupHandlers();

  // Configura Navegação por Abas
  setupNavigation();

  // Configura Seleção de Mês
  setupMonthSelector();

  // Configura Modais
  setupModals();

  // Estado Inicial da UI
  updateMonthDisplay();
  refreshIcons();
});

// ==================== NAVIGATION ====================

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      const tabId = `tab-${btn.dataset.tab}`;
      const tabContent = document.getElementById(tabId);
      if (tabContent) tabContent.classList.add('active');
      refreshIcons();
    });
  });
}

// ==================== MONTH SELECTION ====================

function setupMonthSelector() {
  document.getElementById('prev-month').addEventListener('click', async () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    updateMonthDisplay();
    await loadMonthData();
  });

  document.getElementById('next-month').addEventListener('click', async () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    updateMonthDisplay();
    await loadMonthData();
  });
}

// ==================== MODALS ====================

function setupModals() {
  const openModal = (id) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('active');
    
    // Auto-preenche a data se for um modal de transação
    const dateInputId = id.replace('modal-', '') + '-data';
    const dateInput = document.getElementById(dateInputId);
    if (dateInput) dateInput.valueAsDate = new Date();
    
    refreshIcons();
  };

  // Botões de Abrir Modal
  const modalTriggers = [
    { btn: 'add-receita-btn', modal: 'modal-receita' },
    { btn: 'add-fixa-btn', modal: 'modal-fixa' },
    { btn: 'add-variavel-btn', modal: 'modal-variavel' },
    { btn: 'add-meta-btn', modal: 'modal-meta' },
    { btn: 'add-investimento-btn', modal: 'modal-investimento' }
  ];

  modalTriggers.forEach(t => {
    const btn = document.getElementById(t.btn);
    if (btn) btn.addEventListener('click', () => openModal(t.modal));
  });

  // Fechar Modais (no X ou clicando fora)
  document.querySelectorAll('.modal-close, .modal').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el || el.classList.contains('modal-close')) {
        const modal = el.closest('.modal');
        modal.classList.remove('active');
        
        // Limpa estado de edição ao fechar (Acesso direto para performance)
        appState.editingItem = { id: null, collection: null };

        // Restaura títulos originais (Centralizado no ui-render.js)
        const type = modal.id.replace('modal-', '');
        setModalMode(type, 'new');
      }
    });
  });
}
