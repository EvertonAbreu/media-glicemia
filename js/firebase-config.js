
// Importar os SDKs do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// Configuração do Firebase - Substitua com seus dados se necessário
const firebaseConfig = {
    apiKey: "AIzaSyCelgv6HUBqAKkQeKBNDdaP5kakx9-pCZs",
    authDomain: "diabcare-ff19f.firebaseapp.com",
    projectId: "diabcare-ff19f",
    storageBucket: "diabcare-ff19f.firebasestorage.app",
    messagingSenderId: "667128255049",
    appId: "1:667128255049:web:861eeec8a96169e380a598"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar serviços para uso em outros arquivos
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
