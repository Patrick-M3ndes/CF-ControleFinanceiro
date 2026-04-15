// modules/ui-render.js - Lógica de Renderização do DOM
import { 
  appState, 
  refreshIcons 
} from './state.js';
import { 
  formatCurrency, 
  formatDate, 
  capitalizeFirst, 
  escapeHtml 
} from '../utils.js';

export function renderAll() {
  renderReceitas();
  renderFixas();
  renderVariaveis();
  renderMetas();
  renderInvestimentos();
  refreshIcons();
}

export function renderReceitas() {
  const container = document.getElementById('receitas-list');
  if (appState.receitas.length === 0) {
    container.innerHTML = '<div class="empty-state"><i data-lucide="info"></i><p>Sem receitas</p></div>';
    return;
  }
  container.innerHTML = appState.receitas.map(r => `
    <div class="transaction-item entrada">
      <div class="item-info">
        <h4>${escapeHtml(r.descricao)}</h4>
        <p>${formatDate(r.data)} • ${escapeHtml(r.tipo === 'fixa' ? 'Fixa' : 'Extra')}</p>
      </div>
      <span class="item-value positivo">+${formatCurrency(r.valor)}</span>
      <div class="item-actions">
        <button class="btn-action edit" onclick="window.startEdit('receitas', '${r.id}')"><i data-lucide="edit-2"></i></button>
        <button class="btn-action delete" onclick="window.deleteItem('receitas', '${r.id}')"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
  `).join('');
}

export function renderFixas() {
  const container = document.getElementById('fixas-list');
  const total = appState.fixas.reduce((sum, f) => sum + f.valor, 0);
  document.getElementById('fixed-total').textContent = formatCurrency(total);

  if (appState.fixas.length === 0) {
    container.innerHTML = '<div class="empty-state"><i data-lucide="home"></i><p>Sem fixas</p></div>';
    return;
  }

  container.innerHTML = appState.fixas.map(f => {
    const isPago = appState.pagamentosFixas.includes(f.id);
    return `
      <div class="transaction-item ${isPago ? 'pago' : 'pendente'}">
        <div class="item-info">
          <h4>${escapeHtml(f.nome)}</h4>
          <p>Dia ${escapeHtml(String(f.vencimento))} • ${isPago ? 'Pago' : 'Pendente'}</p>
        </div>
        <span class="item-value negativo">-${formatCurrency(f.valor)}</span>
        <div class="item-actions">
          <button class="btn-action toggle" onclick="window.toggleFixa('${f.id}', ${isPago})"><i data-lucide="${isPago ? 'rotate-ccw' : 'check'}"></i></button>
          <button class="btn-action edit" onclick="window.startEdit('fixas', '${f.id}')"><i data-lucide="edit-2"></i></button>
          <button class="btn-action delete" onclick="window.deleteItem('fixas', '${f.id}')"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

export function renderVariaveis() {
  const container = document.getElementById('variaveis-list');
  const total = appState.variaveis.reduce((sum, v) => sum + v.valor, 0);
  
  // Alerta de 20% das receitas
  const totalRec = appState.receitas.reduce((sum, r) => sum + r.valor, 0);
  const alertEl = document.getElementById('variaveis-alert');
  if (alertEl) {
    alertEl.classList.toggle('hidden', totalRec === 0 || total <= (totalRec * 0.2));
  }

  if (appState.variaveis.length === 0) {
    container.innerHTML = '<div class="empty-state"><i data-lucide="shopping-bag"></i><p>Sem variáveis</p></div>';
    return;
  }

  const icons = { alimentacao: 'utensils', transporte: 'car', lazer: 'party-popper', saude: 'pill', compras: 'shopping-cart', outros: 'package' };
  container.innerHTML = appState.variaveis.map(v => `
    <div class="transaction-item saida">
      <div class="item-info">
        <h4><i data-lucide="${icons[v.categoria] || 'package'}" class="small-icon"></i>${escapeHtml(v.descricao)}</h4>
        <p>${formatDate(v.data)} • ${escapeHtml(capitalizeFirst(v.categoria))}</p>
      </div>
      <span class="item-value negativo">-${formatCurrency(v.valor)}</span>
      <div class="item-actions">
        <button class="btn-action edit" onclick="window.startEdit('variaveis', '${v.id}')"><i data-lucide="edit-2"></i></button>
        <button class="btn-action delete" onclick="window.deleteItem('variaveis', '${v.id}')"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
  `).join('');
}

export function renderMetas() {
  const container = document.getElementById('metas-list');
  if (appState.metas.length === 0) {
    container.innerHTML = '<div class="empty-state"><i data-lucide="target"></i><p>Sem metas</p></div>';
    return;
  }
  container.innerHTML = appState.metas.map(m => {
    const progress = Math.min(100, (m.guardado / m.valor) * 100);
    const remaining = m.valor - m.guardado;
    let calculation = '';
    if (m.economia && m.economia > 0 && remaining > 0) {
      const months = Math.ceil(remaining / m.economia);
      calculation = `<p class="goal-calculation">Faltam aprox. ${months} meses</p>`;
    }
    return `
      <div class="goal-item">
        <div class="goal-header">
          <h4>${escapeHtml(m.nome)}</h4>
          <button class="btn-action delete" onclick="window.deleteItem('metas', '${m.id}')"><i data-lucide="trash-2"></i></button>
        </div>
        <div class="goal-progress"><div class="goal-progress-bar" style="width: ${progress}%"></div></div>
        <div class="goal-info"><span>${formatCurrency(m.guardado)}</span><span>Meta: ${formatCurrency(m.valor)}</span></div>
        ${calculation}
      </div>
    `;
  }).join('');
}

export function renderInvestimentos() {
  const container = document.getElementById('investimentos-list');
  const total = appState.investimentos.reduce((sum, i) => sum + i.valor, 0);
  const totalEl = document.getElementById('total-investido');
  if (totalEl) totalEl.textContent = formatCurrency(total);

  if (appState.investimentos.length === 0) {
    container.innerHTML = '<div class="empty-state"><i data-lucide="bar-chart-3"></i><p>Sem investimentos</p></div>';
    return;
  }
  container.innerHTML = appState.investimentos.map(i => `
    <div class="investment-item">
      <div class="item-info">
        <h4>${escapeHtml(i.descricao)}</h4>
        <p>${formatDate(i.data)} • ${escapeHtml(i.tipo)}</p>
      </div>
      <span class="item-value positivo">${formatCurrency(i.valor)}</span>
      <button class="btn-action delete" onclick="window.deleteItem('investimentos', '${i.id}')"><i data-lucide="trash-2"></i></button>
    </div>
  `).join('');
}
