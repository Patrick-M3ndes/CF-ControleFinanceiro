// modules/dashboard.js - Lógica dos Gráficos e Cálculos de Saúde Financeira
import { 
  appState, 
  chartInstance, 
  setChartInstance 
} from './state.js';
import { formatCurrency } from '../utils.js';

export async function updateDashboard() {
  const totalEntradas = appState.receitas.reduce((sum, r) => sum + r.valor, 0);
  const totalFixas = appState.fixas.reduce((sum, f) => sum + f.valor, 0);
  const totalVariaveis = appState.variaveis.reduce((sum, v) => sum + v.valor, 0);
  const totalInv = appState.investimentos.reduce((sum, i) => sum + i.valor, 0);
  
  const totalSaidas = totalFixas + totalVariaveis;
  const saldo = totalEntradas - totalSaidas;

  document.getElementById('total-entradas').textContent = formatCurrency(totalEntradas);
  document.getElementById('total-saidas').textContent = formatCurrency(totalSaidas);
  document.getElementById('saldo-restante').textContent = formatCurrency(saldo);
  document.getElementById('custo-vida').textContent = formatCurrency(totalFixas);
  document.getElementById('gastos-variaveis').textContent = formatCurrency(totalVariaveis);
  document.getElementById('investido-mes').textContent = formatCurrency(totalInv);

  const thermometer = document.getElementById('thermometer-fill');
  const msg = document.getElementById('financial-message');
  
  // Lógica de Saúde Financeira
  let status = 'alerta';
  let message = 'Equilíbrio delicado. Monitore seus gastos.';
  let percentage = 50;

  if (totalEntradas > 0) {
    const savingsRate = (saldo / totalEntradas) * 100;
    percentage = Math.max(0, Math.min(100, (savingsRate + 50))); 

    if (savingsRate >= 20) {
      status = 'ideal';
      message = 'Saúde excelente! Você está poupando mais de 20% da renda.';
    } else if (savingsRate < 0) {
      status = 'critico';
      message = 'Atenção! Suas despesas superaram sua renda este mês.';
    }
  }

  if (thermometer) thermometer.style.width = `${percentage}%`;
  if (msg) {
    msg.className = `financial-message ${status}`;
    msg.textContent = message;
  }

  updateChart(totalFixas, totalVariaveis);
}

export function updateChart(fixas, variaveis) {
  const chartEl = document.getElementById('expenses-chart');
  if (!chartEl) return;
  
  const ctx = chartEl.getContext('2d');
  if (chartInstance) chartInstance.destroy();
  
  const newInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Fixas', 'Variáveis'],
      datasets: [{ data: [fixas, variaveis], backgroundColor: ['#ff4b5c', '#ffb74d'], borderWidth: 0 }]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      cutout: '75%', 
      plugins: { 
        legend: { 
          position: 'bottom', 
          labels: { color: '#94a3b8' } 
        } 
      } 
    }
  });
  
  setChartInstance(newInstance);
}
