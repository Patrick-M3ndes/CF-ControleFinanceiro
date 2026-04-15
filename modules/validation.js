// modules/validation.js - Sistema de validação de dados para o Controle Financeiro

/**
 * Valida os dados do formulário antes de enviar para o Firestore
 * @param {Object} data - Dados capturados do formulário
 * @param {string} type - Tipo da coleção (receitas, fixas, variaveis, metas, investimentos)
 * @returns {Object} { isValid: boolean, message: string|null }
 */
export function validateForm(data, type) {
  // 1. Validação de Descrição/Nome (Obrigatório)
  const description = data.descricao || data.nome;
  if (!description || description.trim() === '') {
    return { isValid: false, message: 'A descrição/nome é obrigatória.' };
  }

  // 2. Validação de Valor (Vazio ou Zero)
  if (data.valor === undefined || data.valor === null || isNaN(data.valor) || data.valor === 0) {
    return { isValid: false, message: 'O valor deve ser maior que zero.' };
  }

  // 3. Validação de Valor Negativo
  if (data.valor < 0) {
    return { isValid: false, message: 'Não são permitidos valores negativos.' };
  }

  // 4. Validação de Data (Apenas para coleções específicas)
  const collectionsWithDate = ['receitas', 'variaveis', 'investimentos'];
  if (collectionsWithDate.includes(type)) {
    if (!data.data || data.data === '') {
      return { isValid: false, message: 'Selecione uma data válida.' };
    }
  }

  // 5. Validação Específica para Metas
  if (type === 'metas') {
    const valorAlvo = data.valor;
    const valorGuardado = data.guardado || 0;
    
    if (valorAlvo <= valorGuardado) {
      return { isValid: false, message: 'O valor alvo da meta deve ser maior que o valor já guardado.' };
    }
  }

  // Se passou por todas as regras
  return { isValid: true };
}
