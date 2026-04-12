// config.js - Firebase v9 Modular via CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAv9TDFXJCyLfOd0NXmbATRMDTSiaSZHHU",
  authDomain: "controle-financeiro-ac968.firebaseapp.com",
  projectId: "controle-financeiro-ac968",
  storageBucket: "controle-financeiro-ac968.firebasestorage.app",
  messagingSenderId: "627854378922",
  appId: "1:627854378922:web:37f81d9855ae08073c8dd3",
  measurementId: "G-W2XPSEBS42"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Exporta para uso no script.js
export { auth, db };
