// utils.js - Funções de utilidade para o Controle Financeiro Premium

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(dateString) {
  const [year, month, day] = dateString.split('-');
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('pt-BR');
}

export function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Ícones Lucide para Toasts
  const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
  
  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  
  // Inicializa o ícone do novo toast
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        'stroke-width': 2.5
      }
    });
  }
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

export function toggleLoading(show) {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.classList.toggle('active', show);
  }
}
