import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { saveUserProfile, loadUserProfile } from './database.js';
import { updateUI, showNotification, showLoading, hideLoading } from './ui.js';

let currentUser = null;

export function getCurrentUser() {
    return currentUser;
}

export async function login(email, password) {
    showLoading();
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        await loadUserProfile(currentUser.uid);
        await updateUI();
        document.getElementById('appScreen').classList.add('active');
        document.getElementById('loginScreen').classList.remove('active');
        showNotification('Bem-vindo de volta!');
    } catch (error) {
        showNotification('Erro ao entrar: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

export async function register(name, email, password, confirmPassword, age, diabetesTime) {
    if (password !== confirmPassword) {
        showNotification('As senhas não coincidem!', 'error');
        return;
    }
    if (password.length < 6) {
        showNotification('A senha deve ter no mínimo 6 caracteres!', 'error');
        return;
    }
    
    showLoading();
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        await saveUserProfile(currentUser.uid, { name, email, age, diabetesTime });
        await loadUserProfile(currentUser.uid);
        document.getElementById('appScreen').classList.add('active');
        document.getElementById('registerScreen').classList.remove('active');
        showNotification('Conta criada com sucesso!');
    } catch (error) {
        showNotification('Erro ao cadastrar: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

export async function logout() {
    await signOut(auth);
    currentUser = null;
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('appScreen').classList.remove('active');
    showNotification('Desconectado');
}

export function initAuth(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserProfile(user.uid);
            await updateUI();
            document.getElementById('appScreen').classList.add('active');
            document.getElementById('loginScreen').classList.remove('active');
        }
        if (callback) callback(user);
    });
}
