// modules/api.js - Lógica de Persistência (Firestore) e Backup
import { db } from '../config.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

import { showToast, toggleLoading } from '../utils.js';
import { 
  appState, 
  currentUser, 
  currentMonth, 
  updateAppState, 
  getMonthRange, 
  getYearMonthKey 
} from './state.js';
import { renderAll, setModalMode } from './ui-render.js';
import { updateDashboard } from './dashboard.js';
import { validateForm } from './validation.js';

export async function loadInitialData() {
  if (!currentUser) return;
  toggleLoading(true);
  try {
    const [snapFixas, snapMetas] = await Promise.all([
      getDocs(query(collection(db, 'fixas'), where('userId', '==', currentUser.uid))),
      getDocs(query(collection(db, 'metas'), where('userId', '==', currentUser.uid)))
    ]);
    
    updateAppState({
      fixas: snapFixas.docs.map(d => ({ id: d.id, ...d.data() })),
      metas: snapMetas.docs.map(d => ({ id: d.id, ...d.data() }))
    });
    
    await loadMonthData(false);
  } catch (error) {
    showToast('Erro inicial: ' + error.message, 'error');
  } finally { toggleLoading(false); }
}

export async function loadMonthData(showLoader = true) {
  if (!currentUser) return;
  if (showLoader) toggleLoading(true);
  
  const { startDate, endDate } = getMonthRange(currentMonth);
  const monthKey = getYearMonthKey();
  
  try {
    const [snapRec, snapVar, snapInv, snapPagos] = await Promise.all([
      getDocs(query(collection(db, 'receitas'), where('userId', '==', currentUser.uid), where('data', '>=', startDate), where('data', '<=', endDate))),
      getDocs(query(collection(db, 'variaveis'), where('userId', '==', currentUser.uid), where('data', '>=', startDate), where('data', '<=', endDate))),
      getDocs(query(collection(db, 'investimentos'), where('userId', '==', currentUser.uid), where('data', '>=', startDate), where('data', '<=', endDate))),
      getDocs(query(collection(db, 'pagamentos_fixas'), where('userId', '==', currentUser.uid), where('mesReferencia', '==', monthKey)))
    ]);

    updateAppState({
      receitas: snapRec.docs.map(d => ({ id: d.id, ...d.data() })),
      variaveis: snapVar.docs.map(d => ({ id: d.id, ...d.data() })),
      investimentos: snapInv.docs.map(d => ({ id: d.id, ...d.data() })),
      pagamentosFixas: snapPagos.docs.map(d => d.data().fixaId)
    });

    renderAll();
    await updateDashboard();
  } catch (error) {
    showToast('Erro mensal: ' + error.message, 'error');
  } finally { if (showLoader) toggleLoading(false); }
}

// ==================== GLOBAL FUNCTIONS (DEBT) ====================
// TODO: Migrar window.startEdit, window.deleteItem e window.toggleFixa
// para addEventListeners dentro do ui-render.js para evitar poluição do objeto global window.

window.startEdit = (col, id) => {
  const item = appState[col].find(i => i.id === id);
  if (!item) return;

  appState.editingItem = { id, collection: col };
  
  // Define o modal em modo de edição (Centralizado no ui-render.js)
  setModalMode(col, 'edit');

  if (col === 'receitas') {
    document.getElementById('receita-desc').value = item.descricao;
    document.getElementById('receita-valor').value = item.valor;
    document.getElementById('receita-data').value = item.data;
    document.getElementById('receita-tipo').value = item.tipo;
    document.getElementById('modal-receita').classList.add('active');
  } else if (col === 'fixas') {
    document.getElementById('fixa-nome').value = item.nome;
    document.getElementById('fixa-valor').value = item.valor;
    document.getElementById('fixa-vencimento').value = item.vencimento;
    document.getElementById('modal-fixa').classList.add('active');
  } else if (col === 'variaveis') {
    document.getElementById('variavel-desc').value = item.descricao;
    document.getElementById('variavel-valor').value = item.valor;
    document.getElementById('variavel-categoria').value = item.categoria;
    document.getElementById('variavel-data').value = item.data;
    document.getElementById('modal-variavel').classList.add('active');
  }
};

window.deleteItem = async (col, id) => {
  if (!confirm('Excluir este item?')) return;
  toggleLoading(true);
  try {
    await deleteDoc(doc(db, col, id));
    if (col === 'fixas' || col === 'metas') await loadInitialData();
    else await loadMonthData(false);
    showToast('Excluído!', 'success');
  } catch (error) { showToast('Erro: ' + error.message, 'error'); }
  finally { toggleLoading(false); }
};

window.toggleFixa = async (fixaId, isPago) => {
  toggleLoading(true);
  const monthKey = getYearMonthKey();
  try {
    if (isPago) {
      const q = query(collection(db, 'pagamentos_fixas'), where('userId', '==', currentUser.uid), where('mesReferencia', '==', monthKey), where('fixaId', '==', fixaId));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'pagamentos_fixas', d.id))));
    } else {
      await addDoc(collection(db, 'pagamentos_fixas'), { userId: currentUser.uid, fixaId, mesReferencia: monthKey, dataPagamento: serverTimestamp() });
    }
    await loadMonthData(false);
  } catch (error) { showToast('Erro: ' + error.message, 'error'); }
  finally { toggleLoading(false); }
};
// =================================================================

export function setupForms() {
  const handleForm = (formId, modalId, col, dataFn) => {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      toggleLoading(true);
      try {
        const data = { ...dataFn(), userId: currentUser.uid };
        
        // Validação de dados
        const result = validateForm(data, col);
        if (!result.isValid) {
          showToast(result.message, 'error');
          toggleLoading(false);
          return;
        }

        // Sanitização de dados (Limpeza de espaços em branco)
        if (data.descricao) data.descricao = data.descricao.trim();
        if (data.nome) data.nome = data.nome.trim();
        
        if (appState.editingItem.id && appState.editingItem.collection === col) {
          // MODO EDIÇÃO (UPDATE)
          await updateDoc(doc(db, col, appState.editingItem.id), data);
          appState.editingItem = { id: null, collection: null };
        } else {
          // MODO NOVO (ADD)
          data.createdAt = serverTimestamp();
          await addDoc(collection(db, col), data);
        }

        document.getElementById(modalId).classList.remove('active');
        e.target.reset();
        
        if (col === 'fixas' || col === 'metas') await loadInitialData();
        else await loadMonthData(false);
        
        showToast('Salvo com sucesso!', 'success');
      } catch (error) { 
        console.error('Erro Firestore (api.js):', error);
        showToast('Erro ao salvar: ' + error.message, 'error'); 
      } finally { 
        toggleLoading(false); 
      }
    });
  };

  handleForm('form-receita', 'modal-receita', 'receitas', () => ({
    descricao: document.getElementById('receita-desc').value,
    valor: parseFloat(document.getElementById('receita-valor').value),
    data: document.getElementById('receita-data').value,
    tipo: document.getElementById('receita-tipo').value
  }));

  handleForm('form-fixa', 'modal-fixa', 'fixas', () => ({
    nome: document.getElementById('fixa-nome').value,
    valor: parseFloat(document.getElementById('fixa-valor').value),
    vencimento: document.getElementById('fixa-vencimento').value
  }));

  handleForm('form-variavel', 'modal-variavel', 'variaveis', () => ({
    descricao: document.getElementById('variavel-desc').value,
    valor: parseFloat(document.getElementById('variavel-valor').value),
    categoria: document.getElementById('variavel-categoria').value,
    data: document.getElementById('variavel-data').value
  }));

  handleForm('form-meta', 'modal-meta', 'metas', () => ({
    nome: document.getElementById('meta-nome').value,
    valor: parseFloat(document.getElementById('meta-valor').value),
    guardado: parseFloat(document.getElementById('meta-guardado').value) || 0,
    economia: parseFloat(document.getElementById('meta-economia').value) || 0
  }));

  handleForm('form-investimento', 'modal-investimento', 'investimentos', () => ({
    descricao: document.getElementById('invest-desc').value,
    valor: parseFloat(document.getElementById('invest-valor').value),
    tipo: document.getElementById('invest-tipo').value,
    data: document.getElementById('invest-data').value
  }));
}

export function setupBackupHandlers() {
  const exportBtn = document.getElementById('export-data');
  const importBtn = document.getElementById('import-data');

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      toggleLoading(true);
      try {
        const data = {};
        const cols = ['receitas', 'fixas', 'variaveis', 'metas', 'investimentos'];
        for (const c of cols) {
          const s = await getDocs(query(collection(db, c), where('userId', '==', currentUser.uid)));
          data[c] = s.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        const blob = new Blob([JSON.stringify({ exportDate: new Date(), data }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        showToast('Backup concluído!', 'success');
      } catch (error) { showToast('Erro: ' + error.message, 'error'); }
      finally { toggleLoading(false); }
    });
  }

  if (importBtn) {
    importBtn.addEventListener('click', async () => {
      const file = document.getElementById('import-file').files[0];
      if (!file) return showToast('Selecione um arquivo!', 'error');
      toggleLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backup = JSON.parse(e.target.result);
          if (!backup.data) throw new Error('JSON inválido');
          let count = 0;
          for (const [col, items] of Object.entries(backup.data)) {
            if (!Array.isArray(items)) continue;
            for (const item of items) {
              const { id, ...d } = item;
              if (d.valor) { d.userId = currentUser.uid; await addDoc(collection(db, col), d); count++; }
            }
          }
          showToast(`${count} itens importados!`, 'success');
          await loadInitialData();
        } catch (err) { showToast('Erro na importação', 'error'); }
        finally { toggleLoading(false); }
      };
      reader.readAsText(file);
    });
  }
}
