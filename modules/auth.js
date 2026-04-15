// modules/auth.js - Lógica de Autenticação
import { auth } from '../config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';

import { showToast, toggleLoading } from '../utils.js';
import { 
  screens, 
  authCards, 
  setCurrentUser, 
  refreshIcons 
} from './state.js';

export function initAuth(onUserLogin) {
  onAuthStateChanged(auth, async (user) => {
    setCurrentUser(user);
    if (user) {
      showScreen('app');
      document.getElementById('user-email').textContent = user.email;
      if (onUserLogin) await onUserLogin(user);
    } else {
      showScreen('auth');
      showAuthCard('register');
    }
    refreshIcons();
  });

  // Event Listeners
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading(true);
    try {
      await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value);
      showToast('Login realizado!', 'success');
    } catch (error) {
      showToast('Erro: ' + error.message, 'error');
    } finally { toggleLoading(false); }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    if (password !== document.getElementById('register-confirm').value) {
      return showToast('Senhas não coincidem!', 'error');
    }
    toggleLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      showToast('Conta criada!', 'success');
    } catch (error) {
      showToast('Erro: ' + error.message, 'error');
    } finally { toggleLoading(false); }
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth);
    showToast('Sessão encerrada', 'success');
  });

  document.getElementById('show-register').addEventListener('click', () => showAuthCard('register'));
  document.getElementById('show-login').addEventListener('click', () => showAuthCard('login'));
}

export function showScreen(screenName) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  if (screens[screenName]) screens[screenName].classList.add('active');
}

export function showAuthCard(cardName) {
  Object.values(authCards).forEach(c => { c.classList.add('hidden'); c.classList.remove('active'); });
  if (authCards[cardName]) {
    authCards[cardName].classList.remove('hidden');
    setTimeout(() => authCards[cardName].classList.add('active'), 10);
  }
}
