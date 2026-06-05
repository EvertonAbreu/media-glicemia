// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, query, orderBy, where } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// Configuração do Firebase
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
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let allRecords = [];
let currentFilter = 'day';

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.background = type === 'success' ? '#28a745' : '#dc3545';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

async function saveUserProfile(userId, profileData) {
    await setDoc(doc(db, "users", userId), profileData);
}

async function loadUserProfile(userId) {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('userName').textContent = data.name;
        document.getElementById('diabetesTime').textContent = data.diabetesTime || 0;
    }
}

async function saveGlucose(record) {
    if (!currentUser) return;
    await addDoc(collection(db, "users", currentUser.uid, "glucose"), {
        ...record,
        createdAt: new Date().toISOString()
    });
}

async function loadGlucose() {
    if (!currentUser) return;
    const q = query(
        collection(db, "users", currentUser.uid, "glucose"),
        orderBy("datetime", "desc")
    );
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
    });
    allRecords = records;
    return records;
}

function filterRecordsByPeriod(records, period) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch(period) {
        case 'day':
            return records.filter(record => {
                const recordDate = new Date(record.datetime.split(' ')[0]);
                return recordDate >= today;
            });
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return records.filter(record => {
                const recordDate = new Date(record.datetime.split(' ')[0]);
                return recordDate >= weekAgo;
            });
        case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            return records.filter(record => {
                const recordDate = new Date(record.datetime.split(' ')[0]);
                return recordDate >= monthAgo;
            });
        default:
            return records;
    }
}

function updateStats(records) {
    const total = records.length;
    const avgGlucose = total > 0 ? (records.reduce((sum, r) => sum + r.glucose, 0) / total).toFixed(0) : 0;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('avgGlucose').textContent = avgGlucose;
}

function updateTable(records) {
    const recordsList = document.getElementById('recordsList');
    const filteredRecords = filterRecordsByPeriod(records, currentFilter);
    
    updateStats(filteredRecords);
    
    if (filteredRecords.length === 0) {
        recordsList.innerHTML = '<tr><td colspan="6" style="text-align: center;">📭 Nenhum registro neste período</td></tr>';
        return;
    }
    
    recordsList.innerHTML = filteredRecords.map(record => {
        let statusClass = '', statusText = '';
        if (record.glucose > 140) {
            statusClass = 'badge-high';
            statusText = 'Alta ⚠️';
        } else if (record.glucose < 70) {
            statusClass = 'badge-low';
            statusText = 'Baixa ⚠️';
        } else {
            statusClass = 'badge-normal';
            statusText = 'Normal ✓';
        }
        
        // Extrair dia da semana
        const dateStr = record.datetime.split(' ')[0];
        const date = new Date(dateStr);
        const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const weekday = weekdays[date.getDay()];
        
        return `
            <tr>
                <td>${record.datetime}</td>
                <td>${weekday}</td>
                <td><strong>${record.glucose}</strong> mg/dL</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${record.insulin ? record.insulin + ' U' : '-'}</td>
                <td>${record.notes || '-'}</td>
            </tr>
        `;
    }).join('');
}

async function exportToPDF() {
    if (allRecords.length === 0) {
        showNotification('Nenhum dado para exportar!', 'error');
        return;
    }
    
    showLoading();
    
    const filteredRecords = filterRecordsByPeriod(allRecords, currentFilter);
    const periodText = {
        'day': 'Hoje',
        'week': 'Esta Semana',
        'month': 'Este Mês',
        'all': 'Todo Período'
    }[currentFilter];
    
    const userProfile = await getDoc(doc(db, "users", currentUser.uid));
    const userName = userProfile.exists() ? userProfile.data().name : 'Usuário';
    
    const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Relatório DiabCare</title>
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    padding: 40px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #667eea;
                    padding-bottom: 20px;
                }
                .logo {
                    font-size: 2em;
                }
                h1 {
                    color: #667eea;
                }
                .info {
                    margin-bottom: 20px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 10px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 10px;
                    text-align: left;
                }
                th {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .badge {
                    padding: 3px 8px;
                    border-radius: 12px;
                    font-size: 0.8em;
                }
                .badge-high { background: #fee; color: #c00; }
                .badge-low { background: #ffe6e6; color: #ff6b6b; }
                .badge-normal { background: #e6f7e6; color: #28a745; }
                .footer {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 0.8em;
                    color: #999;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">🩸</div>
                <h1>DiabCare - Relatório de Glicemia</h1>
                <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            
            <div class="info">
                <p><strong>Paciente:</strong> ${userName}</p>
                <p><strong>Período:</strong> ${periodText}</p>
                <p><strong>Total de medições:</strong> ${filteredRecords.length}</p>
                <p><strong>Média de glicemia:</strong> ${(filteredRecords.reduce((sum, r) => sum + r.glucose, 0) / filteredRecords.length).toFixed(0)} mg/dL</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Data/Hora</th>
                        <th>Dia</th>
                        <th>Glicemia</th>
                        <th>Status</th>
                        <th>Insulina</th>
                        <th>Observações</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredRecords.map(record => {
                        let statusClass = '', statusText = '';
                        if (record.glucose > 140) {
                            statusClass = 'badge-high';
                            statusText = 'Alta';
                        } else if (record.glucose < 70) {
                            statusClass = 'badge-low';
                            statusText = 'Baixa';
                        } else {
                            statusClass = 'badge-normal';
                            statusText = 'Normal';
                        }
                        
                        const dateStr = record.datetime.split(' ')[0];
                        const date = new Date(dateStr);
                        const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                        const weekday = weekdays[date.getDay()];
                        
                        return `
                            <tr>
                                <td>${record.datetime}</td>
                                <td>${weekday}</td>
                                <td><strong>${record.glucose}</strong> mg/dL</td>
                                <td><span class="badge ${statusClass}">${statusText}</span></td>
                                <td>${record.insulin ? record.insulin + ' U' : '-'}</td>
                                <td>${record.notes || '-'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <p>Relatório gerado pelo DiabCare - Sistema de Controle de Diabetes</p>
            </div>
        </body>
        </html>
    `;
    
    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `diabcare_relatorio_${new Date().toISOString().slice(0,19)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, letterRendering: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    try {
        html2pdf().set(opt).from(pdfContent).save();
        showNotification('PDF gerado com sucesso!');
    } catch (error) {
        showNotification('Erro ao gerar PDF: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function updateUI() {
    if (!currentUser) return;
    await loadGlucose();
    updateTable(allRecords);
    
    if (allRecords.length > 0) {
        document.getElementById('currentGlucose').textContent = allRecords[0].glucose;
    } else {
        document.getElementById('currentGlucose').textContent = '--';
    }
}

// Eventos de filtro
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        updateTable(allRecords);
    });
});

// Evento para mostrar campo de insulina
document.getElementById('glucose')?.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    const insulinGroup = document.getElementById('insulinGroup');
    if (!isNaN(value) && (value > 140 || value < 70)) {
        insulinGroup.style.display = 'block';
    } else {
        insulinGroup.style.display = 'none';
    }
});

// Funções globais
window.login = async function(email, password) {
    showLoading();
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        await loadUserProfile(currentUser.uid);
        await updateUI();
        document.getElementById('appScreen').classList.add('active');
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('registerScreen').classList.remove('active');
        showNotification('Bem-vindo de volta!');
    } catch (error) {
        showNotification('Erro ao entrar: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.register = async function(name, email, password, confirmPassword, age, diabetesTime) {
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
        document.getElementById('loginScreen').classList.remove('active');
        showNotification('Conta criada com sucesso!');
    } catch (error) {
        showNotification('Erro ao cadastrar: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.logout = async function() {
    await signOut(auth);
    currentUser = null;
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('appScreen').classList.remove('active');
    showNotification('Desconectado');
};

window.showRegister = function() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('registerScreen').classList.add('active');
};

window.showLogin = function() {
    document.getElementById('registerScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
};

// Export PDF
document.getElementById('exportPDFBtn')?.addEventListener('click', exportToPDF);

// Formulário de Login
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    login(email, password);
});

// Formulário de Cadastro
document.getElementById('registerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const age = document.getElementById('regAge').value;
    const diabetesTime = document.getElementById('regDiabetesTime').value;
    register(name, email, password, confirmPassword, age, diabetesTime);
});

// Formulário de Medição
document.getElementById('glucoseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
        showNotification('Faça login primeiro!', 'error');
        return;
    }
    
    const datetime = document.getElementById('datetime').value;
    const glucose = parseInt(document.getElementById('glucose').value);
    const insulin = document.getElementById('insulin').value;
    const notes = document.getElementById('notes').value;
    
    if (!datetime || isNaN(glucose)) {
        showNotification('Preencha todos os campos!', 'error');
        return;
    }
    
    if (glucose < 20 || glucose > 600) {
        showNotification('Valor de glicemia inválido (20-600 mg/dL)!', 'error');
        return;
    }
    
    if ((glucose > 140 || glucose < 70) && !insulin) {
        showNotification('Para glicemia alterada, informe a insulina!', 'error');
        return;
    }
    
    showLoading();
    try {
        await saveGlucose({
            datetime: datetime.replace('T', ' '),
            glucose,
            insulin: insulin || null,
            notes: notes || ''
        });
        
        await updateUI();
        document.getElementById('glucoseForm').reset();
        document.getElementById('insulinGroup').style.display = 'none';
        
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('datetime').value = now.toISOString().slice(0, 16);
        showNotification('Medição salva com sucesso!');
    } catch (error) {
        showNotification('Erro ao salvar: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
});

// Data/hora atual
const now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
const datetimeInput = document.getElementById('datetime');
if (datetimeInput) {
    datetimeInput.value = now.toISOString().slice(0, 16);
}

// Verificar estado de autenticação
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadUserProfile(user.uid);
        await updateUI();
        document.getElementById('appScreen').classList.add('active');
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('registerScreen').classList.remove('active');
    }
});
