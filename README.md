# Gestão Financeira Pessoal Mensal

Sistema web completo de Gestão Financeira Pessoal com integração ao Firebase (Firestore + Authentication).

## 🚀 Funcionalidades

- **Dashboard Completo**: Visão geral das finanças com gráficos e termômetro financeiro
- **Receitas**: Cadastro de receitas fixas e extras
- **Despesas Fixas**: Contas essenciais com status de pagamento
- **Despesas Variáveis**: Gastos do dia a dia com categorias e alertas
- **Metas e Wishlist**: Acompanhamento de objetivos financeiros
- **Investimentos**: Controle de aplicações mensais
- **Backup**: Exportar e importar dados
- **Multi-usuário**: Dados separados por usuário
- **Dark Mode**: Interface moderna e elegante
- **Responsivo**: Funciona em celular e PC

## 📁 Estrutura do Projeto

```
/workspace
├── index.html      # Estrutura HTML
├── style.css       # Estilos CSS
├── script.js       # Lógica JavaScript
├── config.js       # Configuração do Firebase
└── README.md       # Este arquivo
```

## 🔧 Configuração do Firebase

### 1. Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Siga o assistente de configuração

### 2. Ativar Authentication

1. No menu lateral, vá em **Authentication**
2. Clique em "Get Started"
3. Na aba "Sign-in method", ative **Email/Password**

### 3. Criar Banco Firestore

1. No menu lateral, vá em **Firestore Database**
2. Clique em "Create database"
3. Escolha **Start in test mode** (para desenvolvimento)
4. Selecione uma região próxima

### 4. Obter Credenciais

1. Vá em **Project Settings** (ícone de engrenagem)
2. Role até "Your apps" e clique no ícone **Web** (`</>`)
3. Registre o app com um nome
4. Copie o `firebaseConfig` gerado

### 5. Configurar config.js

O arquivo `config.js` já está configurado com as credenciais do Firebase. Se precisar alterar, edite o arquivo diretamente.

## ▶️ Como Rodar Localmente

### Opção 1: VS Code Live Server (Recomendado)

1. Instale a extensão **Live Server** no VS Code
2. Abra o projeto no VS Code
3. Clique com botão direito em `index.html`
4. Selecione "Open with Live Server"

### Opção 2: Python HTTP Server

```bash
# Python 3
python -m http.server 8000

# Acesse http://localhost:8000
```

### Opção 3: Node.js http-server

```bash
npm install -g http-server
http-server
```

## 🌐 Deploy no GitHub Pages

### Passo 1: Preparar Repositório

```bash
git init
git add .
git commit -m "Initial commit"
```

### Passo 2: Enviar para GitHub

```bash
git remote add origin https://github.com/SEU_USUARIO/seu-repo.git
git branch -M main
git push -u origin main
```

### Passo 3: Configurar GitHub Pages

1. Vá em **Settings** do repositório no GitHub
2. Clique em **Pages** no menu lateral
3. Em "Source", selecione:
   - Branch: `main`
   - Folder: `/ (root)`
4. Clique em **Save**

### Passo 4: Acessar Aplicação

Após alguns minutos, acesse:
```
https://SEU_USUARIO.github.io/seu-repo/
```

## 📊 Regras de Segurança do Firestore

Para produção, configure estas regras no Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{document} {
      allow read, write: if request.auth != null && 
                           request.auth.uid == resource.data.userId;
    }
  }
}
```

## 🎯 Uso da Aplicação

1. **Criar Conta**: Clique em "Criar conta" e preencha email/senha
2. **Login**: Use suas credenciais para acessar
3. **Dashboard**: Veja resumo financeiro, gráficos e saúde financeira
4. **Navegação**: Use o menu inferior para acessar cada módulo
5. **Adicionar Itens**: Clique nos botões "+" em cada seção
6. **Filtrar Mês**: Use as setas no dashboard para navegar entre meses
7. **Backup**: Exporte seus dados periodicamente

## ⚠️ Alertas Inteligentes

- **Gastos Variáveis > 20% da Renda**: Alerta vermelho aparece
- **Saldo Negativo**: Mensagem de atenção no dashboard
- **Saldo Positivo**: Mensagem de incentivo ao investimento

## 🔒 Segurança

- Dados isolados por usuário (userId)
- Senhas criptografadas pelo Firebase Auth
- HTTPS obrigatório em produção
- Validação de campos no frontend

## 📱 Responsividade

- Menu horizontal com scroll no mobile
- Cards empilhados em telas pequenas
- Modais adaptáveis
- Touch-friendly

## 🛠️ Tecnologias

- HTML5 semântico
- CSS3 moderno (Grid, Flexbox, Variáveis)
- JavaScript ES6+ (módulos, async/await)
- Firebase v9 (modular)
- Chart.js (gráficos)
- Font Awesome (ícones)
- Google Fonts (Inter)

## 📝 Licença

Uso livre para fins pessoais e educacionais.
