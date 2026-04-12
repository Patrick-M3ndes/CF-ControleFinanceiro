// script.js - Lógica principal do Controle Financeiro
import { auth, db } from './config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

import { 
  formatCurrency, 
  formatDate, 
  capitalizeFirst, 
  escapeHtml, 
  showToast, 
  toggleLoading 
} from './utils.js';

// State
let currentUser = null;
let currentMonth = new Date();
let chartInstance = null;

// DOM Elements
const screens = {
  login: document.getElementById('login-screen'),
  register: document.getElementById('register-screen'),
  app: document.getElementById('app-screen')
};

// ==================== AUTHENTICATION ====================

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    showScreen('app');
    document.getElementById('user-email').textContent = user.email;
    await loadAllData();
  } else {
    showScreen('login');
  }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  toggleLoading(true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast('Login realizado com sucesso!', 'success');
  } catch (error) {
    showToast('Erro no login: ' + error.message, 'error');
  } finally {
    toggleLoading(false);
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;
  
  if (password !== confirm) {
    showToast('As senhas não coincidem!', 'error');
    return;
  }
  
  toggleLoading(true);
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    showToast('Conta criada com sucesso!', 'success');
  } catch (error) {
    showToast('Erro ao criar conta: ' + error.message, 'error');
  } finally {
    toggleLoading(false);
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  signOut(auth);
  showToast('Logout realizado!', 'success');
});

document.getElementById('show-register').addEventListener('click', (e) => {
  e.preventDefault();
  showScreen('register');
});

document.getElementById('show-login').addEventListener('click', (e) => {
  e.preventDefault();
  showScreen('login');
});

function showScreen(screenName) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[screenName].classList.add('active');
}

// ==================== NAVIGATION ====================

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const tabId = btn.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
  });
});

// ==================== MONTH NAVIGATION ====================

document.getElementById('prev-month').addEventListener('click', async () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  updateMonthDisplay();
  await loadAllData();
});

document.getElementById('next-month').addEventListener('click', async () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  updateMonthDisplay();
  await loadAllData();
});

function updateMonthDisplay() {
  const options = { year: 'numeric', month: 'long' };
  document.getElementById('current-month-display').textContent = currentMonth.toLocaleDateString('pt-BR', options);
}

function getMonthRange(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
  return { startDate, endDate };
}

function getYearMonthKey() {
  return `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
}

// ==================== DATA LOADING ====================

async function loadAllData() {
  if (!currentUser) return;
  
  toggleLoading(true);
  const { startDate, endDate } = getMonthRange(currentMonth);
  
  try {
    await Promise.all([
      loadReceitas(startDate, endDate),
      loadFixas(),
      loadVariaveis(startDate, endDate),
      loadMetas(),
      loadInvestimentos(startDate, endDate)
    ]);
    
    await updateDashboard();
  } catch (error) {
    showToast('Erro ao carregar dados: ' + error.message, 'error');
  } finally {
    toggleLoading(false);
  }
}

// ==================== RECEITAS ====================

async function loadReceitas(startDate, endDate) {
  const q = query(
    collection(db, 'receitas'),
    where('userId', '==', currentUser.uid),
    where('data', '>=', startDate),
    where('data', '<=', endDate)
  );
  
  const snapshot = await getDocs(q);
  const receitas = [];
  snapshot.forEach(doc => receitas.push({ id: doc.id, ...doc.data() }));
  
  const container = document.getElementById('receitas-list');
  
  if (receitas.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-arrow-up"></i><p>Nenhuma receita cadastrada</p></div>';
    return;
  }
  
  container.innerHTML = receitas.map(r => `
    <div class="transaction-item entrada">
      <div class="item-info">
        <h4>${escapeHtml(r.descricao)}</h4>
        <p>${formatDate(r.data)} • ${r.tipo === 'fixa' ? 'Fixa' : 'Extra'}</p>
      </div>
      <span class="item-value positivo">+${formatCurrency(r.valor)}</span>
      <div class="item-actions">
        <button class="btn-action delete" onclick="deleteReceita('${r.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

document.getElementById('add-receita-btn').addEventListener('click', () => {
  openModal('modal-receita');
  document.getElementById('receita-data').valueAsDate = new Date();
});

document.getElementById('form-receita').addEventListener('submit', async (e) => {
  e.preventDefault();
  toggleLoading(true);
  
  try {
    await addDoc(collection(db, 'receitas'), {
      userId: currentUser.uid,
      descricao: document.getElementById('receita-desc').value,
      valor: parseFloat(document.getElementById('receita-valor').value),
      data: document.getElementById('receita-data').value,
      tipo: document.getElementById('receita-tipo').value,
      createdAt: serverTimestamp()
    });
    
    closeModal('modal-receita');
    e.target.reset();
    await loadAllData();
    showToast('Receita adicionada!', 'success');
  } catch (error) {
    showToast('Erro ao salvar: ' + error.message, 'error');
  } finally {
    toggleLoading(false);
  }
});

window.deleteReceita = async (id) => {
  if (confirm('Tem certeza que deseja excluir?')) {
    toggleLoading(true);
    try {
      await deleteDoc(doc(db, 'receitas', id));
      await loadAllData();
      showToast('Receita excluída!', 'success');
    } catch (error) {
      showToast('Erro ao excluir: ' + error.message, 'error');
    } finally {
      toggleLoading(false);
    }
  }
};

// ==================== DESPESAS FIXAS ====================

async function loadFixas() {
  // 1. Carrega todas as despesas fixas do usuário
  const qFixas = query(collection(db, 'fixas'), where('userId', '==', currentUser.uid));
  const snapFixas = await getDocs(qFixas);
  const allFixas = snapFixas.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // 2. Carrega os pagamentos realizados NESTE mês
  const monthKey = getYearMonthKey();
  const qPagos = query(
    collection(db, 'pagamentos_fixas'), 
    where('userId', '==', currentUser.uid),
    where('mesReferencia', '==', monthKey)
  );
  const snapPagos = await getDocs(qPagos);
  const idsPagos = snapPagos.docs.map(doc => doc.data().fixaId);
  
  const container = document.getElementById('fixas-list');
  const totalElement = document.getElementById('fixed-total');
  
  const total = allFixas.reduce((sum, f) => sum + parseFloat(f.valor), 0);
  totalElement.textContent = formatCurrency(total);
  
  if (allFixas.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-home"></i><p>Nenhuma despesa fixa cadastrada</p></div>';
    return;
  }
  
  container.innerHTML = allFixas.map(f => {
    const isPago = idsPagos.includes(f.id);
    return `
      <div class="transaction-item ${isPago ? 'pago' : 'pendente'}">
        <div class="item-info">
          <h4>${escapeHtml(f.nome)}</h4>
          <p>Vence dia ${f.vencimento} • ${isPago ? 'Pago' : 'Pendente'}</p>
        </div>
        <span class="item-value negativo">-${formatCurrency(f.valor)}</span>
        <div class="item-actions">
          <button class="btn-action toggle" onclick="toggleFixaStatus('${f.id}', ${isPago})" title="Marcar como ${isPago ? 'pendente' : 'pago'}">
            <i class="fas ${isPago ? 'fa-undo' : 'fa-check'}"></i>
          </button>
          <button class="btn-action delete" onclick="deleteFixa('${f.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('add-fixa-btn').addEventListener('click', () => {
  openModal('modal-fixa');
});

document.getElementById('form-fixa').addEventListener('submit', async (e) => {
  e.preventDefault();
  toggleLoading(true);
  
  try {
    await addDoc(collection(db, 'fixas'), {
      userId: currentUser.uid,
      nome: document.getElementById('fixa-nome').value,
      valor: parseFloat(document.getElementById('fixa-valor').value),
      vencimento: document.getElementById('fixa-vencimento').value,
      createdAt: serverTimestamp()
    });
    
    closeModal('modal-fixa');
    e.target.reset();
    await loadAllData();
    showToast('Despesa fixa adicionada!', 'success');
  } catch (error) {
    showToast('Erro ao salvar: ' + error.message, 'error');
  } finally {
    toggleLoading(false);
  }
});

window.toggleFixaStatus = async (fixaId, isPago) => {
  toggleLoading(true);
  const monthKey = getYearMonthKey();
  
  try {
    if (isPago) {
      // Remover registro de pagamento
      const q = query(
        collection(db, 'pagamentos_fixas'), 
        where('userId', '==', currentUser.uid),
        where('mesReferencia', '==', monthKey),
        where('fixaId', '==', fixaId)
      );
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'pagamentos_fixas', d.id)));
      await Promise.all(deletePromises);
      showToast('Status alterado para pendente', 'success');
    } else {
      // Adicionar registro de pagamento
      await addDoc(collection(db, 'pagamentos_fixas'), {
        userId: currentUser.uid,
        fixaId: fixaId,
        mesReferencia: monthKey,
        dataPagamento: serverTimestamp()
      });
      showToast('Pagamento registrado!', 'success');
    }
    await loadAllData();
  } catch (error) {
    showToast('Erro ao atualizar status: ' + error.message, 'error');
  } finally {
    toggleLoading(false);
  }
};

window.deleteFixa = async (id) => {
  if (confirm('Tem certeza que deseja excluir? (Isso removerá a despesa de todos os meses)')) {
    toggleLoading(true);
    try {
      // 1. Deletar a despesa fixa
      await deleteDoc(doc(db, 'fixas', id));
      
      // 2. Opcional: Limpar histórico de pagamentos dela
      const q = query(collection(db, 'pagamentos_fixas'), where('fixaId', '==', id));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'pagamentos_fixas', d.id)));
      await Promise.all(deletePromises);
      
      await loadAllData();
      showToast('Despesa fixa excluída!', 'success');
    } catch (error) {
      showToast('Erro ao excluir: ' + error.message, 'error');
    } finally {
      toggleLoading(false);
    }
  }
};

// ==================== DESPESAS VARIÁVEIS ====================

async function loadVariaveis(startDate, endDate) {
  const q = query(
    collection(db, 'variaveis'),
    where('userId', '==', currentUser.uid),
    where('data', '>=', startDate),
    where('data', '<=', endDate)
  );
  
  const snapshot = await getDocs(q);
  const variaveis = [];
  snapshot.forEach(doc => variaveis.push({ id: doc.id, ...doc.data() }));
  
  const container = document.getElementById('variaveis-list');
  const alertBox = document.getElementById('variaveis-alert');
  
  const totalVariavel = variaveis.reduce((sum, v) => sum + parseFloat(v.valor), 0);
  
  // Get total income for the month for the alert
  const receitasQ = query(
    collection(db, 'receitas'),
    where('userId', '==', currentUser.uid),
    where('data', '>=', startDate),
    where('data', '<=', endDate)
  );
  const receitasSnapshot = await getDocs(receitasQ);
  const totalReceitas = receitasSnapshot.docs.reduce((sum, doc) => sum + doc.data().valor, 0);
  
  if (totalReceitas > 0 && totalVariavel > (totalReceitas * 0.2)) {
    alertBox.classList.remove('hidden');
  } else {
    alertBox.classList.add('hidden');
  }
  
  const categoryIcons = {
    alimentacao: '🍔',
    transporte: '🚗',
    lazer: '🎉',
    saude: '💊',
    compras: '🛍️',
    outros: '📦'
  };
  
  if (variaveis.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-cart"></i><p>Nenhuma despesa variável cadastrada</p></div>';
    return;
  }
  
  container.innerHTML = variaveis.map(v => `
    <div class="transaction-item saida">
      <div class="item-info">
        <h4>${categoryIcons[v.categoria] || '📦'} ${escapeHtml(v.descricao)}</h4>
        <p>${formatDate(v.data)} • ${capitalizeFirst(v.categoria)}</p>
      </div>
      <span class="item-value negativo">-${formatCurrency(v.valor)}</span>
      <div class="item-actions">
        <button class="btn-action delete" onclick="deleteVariavel('${v.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

document.getElementById('add-variavel-btn').addEventListener('click', () => {
  openModal('modal-variavel');
  document.getElementById('variavel-data').valueAsDate = new Date();
});

document.getElementById('form-variavel').addEventListener('submit', async (e) => {
  e.preventDefault();
  toggleLoading(true);
  
  try {
    await addDoc(collection(db, 'variaveis'), {
      userId: currentUser.uid,
      descricao: document.getElementById('variavel-desc').value,
      valor: parseFloat(document.getElementById('variavel-valor').value),
      categoria: document.getElementById('variavel-categoria').value,
      data: document.getElementById('variavel-data').value,
      createdAt: serverTimestamp()
    });
    
    closeModal('modal-variavel');
    e.target.reset();
    await loadAllData();
    showToast('Despesa variável adicionada!', 'success');
  } catch (error) {
    showToast('Erro ao salvar: ' + error.message, 'error');
  } finally {
    toggleLoading(false);
  }
});

window.deleteVariavel = async (id) => {
  if (confirm('Tem certeza que deseja excluir?')) {
    toggleLoading(true);
    try {
      await deleteDoc(doc(db, 'variaveis', id));
      await loadAllData();
      showToast('Despesa variável excluída!', 'success');
    } catch (error) {
      showToast('Erro ao excluir: ' + error.message, 'error');
    } finally {
      toggleLoading(false);
    }
  }
};

// ==================== METAS ====================

async function loadMetas() {
  const q = query(
    collection(db, 'metas'),
    where('userId', '==', currentUser.uid)
  );
  
  const snapshot = await getDocs(q);
  const metas = [];
  snapshot.forEach(doc => metas.push({ id: doc.id, ...doc.data() }));
  
  const container = document.getElementById('metas-list');
  
  if (metas.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-bullseye"></i><p>Nenhuma meta cadastrada</p></div>';
    return;
  }
  
  container.innerHTML = metas.map(m => {
    const percentage = Math.min(100, (m.guardado / m.valor) * 100);
    const remaining = m.valor - m.guardado;
    let calculation = '';
    
    if (m.economia && m.economia > 0) {
      const months = Math.ceil(remaining / m.economia);
      calculation = `<p class="goal-calculation">Se economizar ${formatCurrency(m.economia)}/mês, alcança em ${months} meses</p>`;
    }
    
    return `
      <div class="goal-item">
        <div class="goal-header">
          <h4>${escapeHtml(m.nome)}</h4>
          <div class="item-actions">
            <button class="btn-action delete" onclick="deleteMeta('${m.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="goal-progress">
          <div class="goal-progress-bar" style="width: ${percentage}%"></div>
        </div>
        <div class="goal-info">
          <span>${formatCurrency(m.guardado)} guardado</span>
          <span>${formatCurrency(m.valor)} total</span>
        </div>
        ${calculation}
      </div>
    `;
  }).join('');
}

document.getElementById('add-meta-btn').addEventListener('click', () => {
  openModal('modal-meta');
});

document.getElementById('form-meta').addEventListener('submit', async (e) => {
  e.preventDefault();
  toggleLoading(true);
  
  try {
    await addDoc(collection(db, 'metas'), {
      userId: currentUser.uid,
      nome: document.getElementById('meta-nome').value,
      valor: parseFloat(document.getElementById('meta-valor').value),
      guardado: parseFloat(document.getElementById('meta-guardado').value) || 0,
      economia: parseFloat(document.getElementById('meta-economia').value) || null,
      createdAt: serverTimestamp()
    });
    
    closeModal('modal-meta');
    e.target.reset();
    await loadAllData();
    showToast('Meta adicionada!', 'success');
  } catch (error) {
    showToast('Erro ao salvar: ' + error.message, 'error');
  } finally {
    toggleLoading(false);
  }
});

window.deleteMeta = async (id) => {
  if (confirm('Tem certeza que deseja excluir?')) {
    toggleLoading(true);
    try {
      await deleteDoc(doc(db, 'metas', id));
      await loadAllData();
      showToast('Meta excluída!', 'success');
    } catch (error) {
      showToast('Erro ao excluir: ' + error.message, 'error');
    } finally {
      toggleLoading(false);
    }
  }
};

// ==================== INVESTIMENTOS ====================

async function loadInvestimentos(startDate, endDate) {
  const q = query(
    collection(db, 'investimentos'),
    where('userId', '==', currentUser.uid),
    where('data', '>=', startDate),
    where('data', '<=', endDate)
  );
  
  const snapshot = await getDocs(q);
  const investimentos = [];
  snapshot.forEach(doc => investimentos.push({ id: doc.id, ...doc.data() }));
  
  const container = document.getElementById('investimentos-list');
  const totalElement = document.getElementById('total-investido');
  
  const total = investimentos.reduce((sum, i) => sum + parseFloat(i.valor), 0);
  totalElement.textContent = formatCurrency(total);
  
  const typeLabels = {
    reserva: 'Reserva de Emergência',
    'renda-fixa': 'Renda Fixa',
    acoes: 'Ações',
    fundos: 'Fundos Imobiliários',
    outros: 'Outros'
  };
  
  if (investimentos.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>Nenhum investimento cadastrado</p></div>';
    return;
  }
  
  container.innerHTML = investimentos.map(i => `
    <div class="investment-item">
      <div class="item-info">
        <h4>${escapeHtml(i.descricao)}</h4>
        <p>${formatDate(i.data)} • ${typeLabels[i.tipo] || i.tipo}</p>
      </div>
      <span class="item-value positivo">${formatCurrency(i.valor)}</span>
      <div class="item-actions">
        <button class="btn-action delete" onclick="deleteInvestimento('${i.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

document.getElementById('add-investimento-btn').addEventListener('click', () => {
  openModal('modal-investimento');
  document.getElementById('invest-data').valueAsDate = new Date();
});

document.getElementById('form-investimento').addEventListener('submit', async (e) => {
  e.preventDefault();
  toggleLoading(true);
  
  try {
    await addDoc(collection(db, 'investimentos'), {
      userId: currentUser.uid,
      descricao: document.getElementById('invest-desc').value,
      valor: parseFloat(document.getElementById('invest-valor').value),
      tipo: document.getElementById('invest-tipo').value,
      data: document.getElementById('invest-data').value,
      createdAt: serverTimestamp()
    });
    
    closeModal('modal-investimento');
    e.target.reset();
    await loadAllData();
    showToast('Investimento adicionado!', 'success');
  } catch (error) {
    showToast('Erro ao salvar: ' + error.message, 'error');
  } finally {
    toggleLoading(false);
  }
});

window.deleteInvestimento = async (id) => {
  if (confirm('Tem certeza que deseja excluir?')) {
    toggleLoading(true);
    try {
      await deleteDoc(doc(db, 'investimentos', id));
      await loadAllData();
      showToast('Investimento excluído!', 'success');
    } catch (error) {
      showToast('Erro ao excluir: ' + error.message, 'error');
    } finally {
      toggleLoading(false);
    }
  }
};

// ==================== DASHBOARD ====================

async function updateDashboard() {
  if (!currentUser) return;
  
  const { startDate, endDate } = getMonthRange(currentMonth);
  
  const [receitasSnap, fixasSnap, variaveisSnap, investimentosSnap] = await Promise.all([
    getDocs(query(collection(db, 'receitas'), where('userId', '==', currentUser.uid), where('data', '>=', startDate), where('data', '<=', endDate))),
    getDocs(query(collection(db, 'fixas'), where('userId', '==', currentUser.uid))),
    getDocs(query(collection(db, 'variaveis'), where('userId', '==', currentUser.uid), where('data', '>=', startDate), where('data', '<=', endDate))),
    getDocs(query(collection(db, 'investimentos'), where('userId', '==', currentUser.uid), where('data', '>=', startDate), where('data', '<=', endDate)))
  ]);
  
  const totalEntradas = receitasSnap.docs.reduce((sum, doc) => sum + doc.data().valor, 0);
  const totalFixas = fixasSnap.docs.reduce((sum, doc) => sum + doc.data().valor, 0);
  const totalVariaveis = variaveisSnap.docs.reduce((sum, doc) => sum + doc.data().valor, 0);
  const totalInvestimentos = investimentosSnap.docs.reduce((sum, doc) => sum + doc.data().valor, 0);
  const totalSaidas = totalFixas + totalVariaveis;
  const saldo = totalEntradas - totalSaidas;
  
  document.getElementById('total-entradas').textContent = formatCurrency(totalEntradas);
  document.getElementById('total-saidas').textContent = formatCurrency(totalSaidas);
  document.getElementById('saldo-restante').textContent = formatCurrency(saldo);
  document.getElementById('custo-vida').textContent = formatCurrency(totalFixas);
  document.getElementById('gastos-variaveis').textContent = formatCurrency(totalVariaveis);
  document.getElementById('investido-mes').textContent = formatCurrency(totalInvestimentos);
  
  const thermometerFill = document.getElementById('thermometer-fill');
  const financialMessage = document.getElementById('financial-message');
  
  let percentage = 0;
  if (totalEntradas > 0) {
    percentage = ((totalEntradas - totalSaidas) / totalEntradas) * 100 + 50;
    percentage = Math.max(0, Math.min(100, percentage));
  }
  
  thermometerFill.style.width = `${percentage}%`;
  
  if (saldo >= 0) {
    financialMessage.className = 'financial-message positive';
    financialMessage.textContent = 'Você está indo bem, continue assim! Que tal investir ou aplicar em uma meta?';
  } else {
    financialMessage.className = 'financial-message negative';
    financialMessage.textContent = 'Atenção! Seus gastos estão maiores que sua renda. Reveja suas despesas.';
  }
  
  updateChart(totalFixas, totalVariaveis);
}

function updateChart(fixas, variaveis) {
  const ctx = document.getElementById('expenses-chart').getContext('2d');
  
  if (chartInstance) {
    chartInstance.destroy();
  }
  
  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Despesas Fixas', 'Despesas Variáveis'],
      datasets: [{
        data: [fixas, variaveis],
        backgroundColor: ['#ef4444', '#f59e0b'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#a0aec0',
            padding: 20
          }
        }
      }
    }
  });
}

// ==================== BACKUP ====================

document.getElementById('export-data').addEventListener('click', async () => {
  if (!currentUser) return;
  toggleLoading(true);
  
  try {
    const collections = ['receitas', 'fixas', 'variaveis', 'metas', 'investimentos'];
    const backup = { userId: currentUser.uid, exportDate: new Date().toISOString(), data: {} };
    
    for (const col of collections) {
      const q = query(collection(db, col), where('userId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      backup.data[col] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-financeiro-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Backup exportado com sucesso!', 'success');
  } catch (error) {
    showToast('Erro no backup: ' + error.message, 'error');
  } finally {
    toggleLoading(false);
  }
});

document.getElementById('import-data').addEventListener('click', async () => {
  const fileInput = document.getElementById('import-file');
  const file = fileInput.files[0];
  
  if (!file) {
    showToast('Selecione um arquivo JSON!', 'error');
    return;
  }
  
  toggleLoading(true);
  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const backup = JSON.parse(e.target.result);
      
      if (!backup.data) {
        showToast('Arquivo inválido!', 'error');
        return;
      }
      
      let imported = 0;
      for (const [collectionName, items] of Object.entries(backup.data)) {
        for (const item of items) {
          const { id, ...data } = item;
          data.userId = currentUser.uid;
          await addDoc(collection(db, collectionName), data);
          imported++;
        }
      }
      
      showToast(`${imported} itens importados com sucesso!`, 'success');
      await loadAllData();
    };
    reader.readAsText(file);
  } catch (error) {
    showToast('Erro ao importar: ' + error.message, 'error');
  } finally {
    toggleLoading(false);
  }
});

// ==================== MODALS ====================

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.modal').classList.remove('active');
  });
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
});

// Initialize
updateMonthDisplay();
