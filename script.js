// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, query, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

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
let currentPeriodFilter = 'day';
let currentStatusFilter = 'all';
let searchTerm = '';

// Dicas do dia
const tips = [
    "Beba água regularmente para ajudar no controle glicêmico.",
    "Pratique exercícios físicos regularmente com orientação médica.",
    "Mantenha uma alimentação balanceada e rica em fibras.",
    "Monitore sua glicemia nos horários recomendados pelo médico.",
    "Nunca pule refeições para evitar hipoglicemia.",
    "Durma bem - o sono afeta diretamente os níveis de glicose.",
    "Mantenha seus medicamentos sempre organizados.",
    "Faça o acompanhamento regular com sua equipe de saúde."
];

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Atualizar dica do dia
function updateDailyTip() {
    const today = new Date().getDate();
    const tipIndex = today % tips.length;
    const tipElement = document.getElementById('dailyTip');
    if (tipElement) tipElement.textContent = tips[tipIndex];
}

// Perfil
async function saveUserProfile(userId, profileData) {
    await setDoc(doc(db, "users", userId), {
        ...profileData,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
    });
}

async function loadUserProfile(userId) {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('userName').textContent = data.name;
        document.getElementById('diabetesTime').textContent = data.diabetesTime || 0;
        document.getElementById('profileName').textContent = data.name;
        document.getElementById('profileEmail').textContent = data.email;
        document.getElementById('profileAge').textContent = data.age + ' anos';
        document.getElementById('profileDiabetesTime').textContent = data.diabetesTime + ' anos';
        
        const memberSince = data.createdAt ? new Date(data.createdAt).toLocaleDateString('pt-BR') : 'Recentemente';
        document.getElementById('memberSince').textContent = memberSince;
        document.getElementById('lastLogin').textContent = new Date().toLocaleDateString('pt-BR');
    }
}

// Medições
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
    document.getElementById('profileTotalReadings').textContent = records.length;
    return records;
}

async function deleteGlucose(recordId) {
    if (!currentUser) return;
    await deleteDoc(doc(db, "users", currentUser.uid, "glucose", recordId));
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

function filterRecordsByStatus(records, status) {
    if (status === 'all') return records;
    if (status === 'high') return records.filter(r => r.glucose > 140);
    if (status === 'normal') return records.filter(r => r.glucose >= 70 && r.glucose <= 140);
    if (status === 'low') return records.filter(r => r.glucose < 70);
    return records;
}

function filterRecordsBySearch(records, search) {
    if (!search) return records;
    return records.filter(record => 
        record.datetime.toLowerCase().includes(search.toLowerCase())
    );
}

function updateStats(records) {
    const total = records.length;
    const avgGlucose = total > 0 ? (records.reduce((sum, r) => sum + r.glucose, 0) / total).toFixed(0) : 0;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('avgGlucose').textContent = avgGlucose;
}

async function updateTable() {
    let filtered = filterRecordsByPeriod(allRecords, currentPeriodFilter);
    filtered = filterRecordsByStatus(filtered, currentStatusFilter);
    filtered = filterRecordsBySearch(filtered, searchTerm);
    
    updateStats(filtered);
    
    const recordsList = document.getElementById('recordsList');
    if (filtered.length === 0) {
        recordsList.innerHTML = '<tr><td colspan="7" class="empty-state">📭 Nenhum registro encontrado</td></tr>';
        return;
    }
    
    recordsList.innerHTML = filtered.map(record => {
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
        const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const weekday = weekdays[date.getDay()];
        
        return `
            <tr>
                <td>${record.datetime}</td>
                <td>${weekday}</td>
                <td><strong>${record.glucose}</strong> mg/dL</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${record.insulin ? record.insulin + ' U' : '-'}</td>
                <td>${record.notes ? record.notes.substring(0, 20) : '-'}</td>
                <td><button class="delete-btn" onclick="deleteRecord('${record.id}')">🗑️</button></td>
            </tr>
        `;
    }).join('');
}

window.deleteRecord = async function(id) {
    if (confirm('Tem certeza que deseja excluir esta medição?')) {
        await deleteGlucose(id);
        await updateUI();
        showNotification('Medição excluída!');
    }
}

async function exportToPDF() {
    if (allRecords.length === 0) {
        showNotification('Nenhum dado para exportar!', 'error');
        return;
    }
    
    showLoading();
    
    let filtered = filterRecordsByPeriod(allRecords, currentPeriodFilter);
    filtered = filterRecordsByStatus(filtered, currentStatusFilter);
    filtered = filterRecordsBySearch(filtered, searchTerm);
    
    const periodText = {
        'day': 'Hoje', 'week': 'Esta Semana', 'month': 'Este Mês', 'all': 'Todo Período'
    }[currentPeriodFilter];
    
    const userProfile = await getDoc(doc(db, "users", currentUser.uid));
    const userName = userProfile.exists() ? userProfile.data().name : 'Usuário';
    
    const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Relatório DiabCare</title>
            <style>
                body { font-family: 'Inter', sans-serif; padding: 40px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #667eea; padding-bottom: 20px; }
                .logo { font-size: 2em; }
                h1 { color: #667eea; }
                .info { margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background: #667eea; color: white; }
                .badge-high { background: #fee; color: #c00; }
                .badge-low { background: #ffe6e6; color: #ff6b6b; }
                .badge-normal { background: #e6f7e6; color: #28a745; }
                .footer { margin-top: 30px; text-align: center; font-size: 0.8em; color: #999; }
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
                <p><strong>Total de medições:</strong> ${filtered.length}</p>
                <p><strong>Média de glicemia:</strong> ${(filtered.reduce((sum, r) => sum + r.glucose, 0) / filtered.length).toFixed(0)} mg/dL</p>
            </div>
            <table>
                <thead><tr><th>Data/Hora</th><th>Glicemia</th><th>Status</th><th>Insulina</th><th>Observações</th></tr></thead>
                <tbody>${filtered.map(record => {
                    let statusText = record.glucose > 140 ? 'Alta' : (record.glucose < 70 ? 'Baixa' : 'Normal');
                    return `<tr><td>${record.datetime}</td><td>${record.glucose} mg/dL</td><td>${statusText}</td><td>${record.insulin ? record.insulin + ' U' : '-'}</td><td>${record.notes || '-'}</td></tr>`;
                }).join('')}</tbody>
            </table>
            <div class="footer"><p>Relatório gerado pelo DiabCare - Sistema de Controle de Diabetes</p></div>
        </body>
        </html>
    `;
    
    const opt = { margin: [0.5, 0.5, 0.5, 0.5], filename: `diabcare_${new Date().toISOString().slice(0,19)}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } };
    
    try {
        html2pdf().set(opt).from(pdfContent).save();
        showNotification('PDF gerado com sucesso!');
    } catch (error) {
        showNotification('Erro ao gerar PDF', 'error');
    } finally {
        hideLoading();
    }
}

async function updateUI() {
    if (!currentUser) return;
    await loadGlucose();
    await updateTable();
    
    if (allRecords.length > 0) {
        document.getElementById('currentGlucose').textContent = allRecords[0].glucose;
    }
}

// Navegação por abas
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`${tabId}Screen`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[data-tab="${tabId}"]`).classList.add('active');
}

// Eventos de filtro
document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPeriodFilter = btn.dataset.filter;
        updateTable();
    });
});

document.querySelectorAll('.status-chip').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.status-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStatusFilter = btn.dataset.status;
        updateTable();
    });
});

document.getElementById('searchInput')?.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    updateTable();
});

// Insulin increment/decrement
document.querySelector('.insulin-dec')?.addEventListener('click', () => {
    const input = document.getElementById('insulin');
    const value = parseFloat(input.value) || 0;
    if (value > 0) input.value = value - 0.5;
});

document.querySelector('.insulin-inc')?.addEventListener('click', () => {
    const input = document.getElementById('insulin');
    const value = parseFloat(input.value) || 0;
    input.value = value + 0.5;
});

// Mostrar campo de insulina
document.getElementById('glucose')?.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    const insulinGroup = document.getElementById('insulinGroup');
    if (!isNaN(value) && (value > 140 || value < 70)) {
        insulinGroup.style.display = 'block';
        insulinGroup.classList.add('slide-down');
    } else {
        insulinGroup.style.display = 'none';
    }
});

// Funções de autenticação
window.login = async function(email, password) {
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

// Navegação
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        switchTab(item.dataset.tab);
    });
});

// Export PDF
document.getElementById('exportPDFBtn')?.addEventListener('click', exportToPDF);

// Formulário de Login
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    login(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
});

// Formulário de Cadastro
document.getElementById('registerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    register(
        document.getElementById('regName').value,
        document.getElementById('regEmail').value,
        document.getElementById('regPassword').value,
        document.getElementById('regConfirmPassword').value,
        document.getElementById('regAge').value,
        document.getElementById('regDiabetesTime').value
    );
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
        switchTab('history');
        
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('datetime').value = now.toISOString().slice(0, 16);
        showNotification('Medição salva com sucesso!');
    } catch (error) {
        showNotification('Erro ao salvar', 'error');
    } finally {
        hideLoading();
    }
});

// Data/hora atual
const now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
const datetimeInput = document.getElementById('datetime');
if (datetimeInput) datetimeInput.value = now.toISOString().slice(0, 16);

// Dica do dia
updateDailyTip();

// Verificar autenticação
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadUserProfile(user.uid);
        await updateUI();
        document.getElementById('appScreen').classList.add('active');
        document.getElementById('loginScreen').classList.remove('active');
    }
// Adicione ao seu script.js

// Variáveis para gráficos
let glucoseChart = null;

// Inicializar gráfico
function initChart() {
    const ctx = document.getElementById('glucoseChart')?.getContext('2d');
    if (!ctx) return;
    
    // Carregar Chart.js
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.onload = () => {
        glucoseChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Glicemia (mg/dL)',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102,126,234,0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Meta Superior (140)',
                    data: [],
                    borderColor: '#ff8787',
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }, {
                    label: 'Meta Inferior (70)',
                    data: [],
                    borderColor: '#ff6b6b',
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: { min: 0, max: 300, title: { display: true, text: 'mg/dL' } }
                }
            }
        });
    };
    document.head.appendChild(script);
}

// Atualizar gráfico com dados
function updateChart(records) {
    if (!glucoseChart) return;
    
    const last30Days = records.slice(0, 30).reverse();
    const labels = last30Days.map(r => r.datetime.split(' ')[0]);
    const data = last30Days.map(r => r.glucose);
    
    glucoseChart.data.labels = labels;
    glucoseChart.data.datasets[0].data = data;
    glucoseChart.data.datasets[1].data = labels.map(() => 140);
    glucoseChart.data.datasets[2].data = labels.map(() => 70);
    glucoseChart.update();
}

// Calcular meta de controle
function updateGoalProgress(records) {
    const last30Days = records.slice(0, 30);
    const inTarget = last30Days.filter(r => r.glucose >= 70 && r.glucose <= 140).length;
    const percentage = last30Days.length > 0 ? (inTarget / last30Days.length) * 100 : 0;
    
    document.getElementById('goalProgress').style.width = percentage + '%';
    const goalText = document.getElementById('goalText');
    
    if (percentage >= 80) {
        goalText.innerHTML = '🎉 Excelente! Você está no caminho certo!';
        goalText.style.color = '#28a745';
    } else if (percentage >= 60) {
        goalText.innerHTML = '👍 Bom trabalho! Continue assim!';
        goalText.style.color = '#ffc107';
    } else {
        goalText.innerHTML = '⚠️ Atenção! Consulte seu médico para ajustes.';
        goalText.style.color = '#dc3545';
    }
}

// Gerar insights de saúde
function generateHealthInsights(records) {
    const insights = [];
    const last7Days = records.slice(0, 7);
    const avgGlucose = last7Days.reduce((sum, r) => sum + r.glucose, 0) / last7Days.length;
    
    // Insight 1: Média da semana
    if (avgGlucose > 140) {
        insights.push('Sua glicemia média está acima do ideal. Considere revisar alimentação e medicação.');
    } else if (avgGlucose < 70) {
        insights.push('Sua glicemia média está baixa. Mantenha lanches por perto e evite pular refeições.');
    } else {
        insights.push('Ótimo! Sua glicemia média está dentro da meta.');
    }
    
    // Insight 2: Horários críticos
    const morningReadings = records.filter(r => r.datetime.includes('06:') || r.datetime.includes('07:') || r.datetime.includes('08:'));
    const morningAvg = morningReadings.length > 0 ? morningReadings.reduce((sum, r) => sum + r.glucose, 0) / morningReadings.length : 0;
    
    if (morningAvg > 140) {
        insights.push('⚠️ Atenção aos horários da manhã. Considere ajustar medicação noturna.');
    }
    
    // Insight 3: Variação
    const values = records.slice(0, 30).map(r => r.glucose);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const variation = max - min;
    
    if (variation > 100) {
        insights.push('📊 Grande variação glicêmica detectada. Procure manter horários regulares de alimentação.');
    }
    
    // Insight 4: Última medição
    if (records.length > 0 && records[0].glucose > 180) {
        insights.push('🚨 Última medição muito alta. Verifique se a insulina foi aplicada corretamente.');
    }
    
    const insightsList = document.getElementById('healthInsights');
    if (insightsList) {
        insightsList.innerHTML = insights.map(i => `<li>${i}</li>`).join('');
    }
}

// Resumo semanal
function updateWeeklySummary(records) {
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const summary = {};
    
    weekdays.forEach(day => { summary[day] = { count: 0, sum: 0 }; });
    
    records.forEach(record => {
        const date = new Date(record.datetime.split(' ')[0]);
        const dayName = weekdays[date.getDay()];
        summary[dayName].count++;
        summary[dayName].sum += record.glucose;
    });
    
    const weeklyDiv = document.getElementById('weeklySummary');
    if (weeklyDiv) {
        weeklyDiv.innerHTML = weekdays.map(day => {
            const avg = summary[day].count > 0 ? (summary[day].sum / summary[day].count).toFixed(0) : '-';
            let status = '';
            if (avg > 140) status = '🔴 Alta';
            else if (avg < 70) status = '🟡 Baixa';
            else if (avg !== '-') status = '🟢 Normal';
            
            return `
                <div class="day-summary">
                    <span class="day-name">${day}</span>
                    <span class="day-glucose">${avg !== '-' ? avg + ' mg/dL' : 'Sem dados'}</span>
                    <span class="day-status">${status}</span>
                </div>
            `;
        }).join('');
    }
}

// Dicas personalizadas baseadas nos dados
function getPersonalizedTip(records) {
    if (records.length === 0) return tips[0];
    
    const lastReading = records[0].glucose;
    
    if (lastReading > 180) {
        return "⚠️ Glicemia alta! Beba água, faça uma caminhada leve e verifique se a insulina foi aplicada corretamente.";
    } else if (lastReading < 70) {
        return "🍬 Glicemia baixa! Consuma 15g de carboidrato rápido (suco, mel, açúcar) e meça novamente em 15 minutos.";
    } else if (lastReading >= 70 && lastReading <= 140) {
        const goodTips = [
            "Excelente controle! Continue monitorando regularmente.",
            "Parabéns! Mantenha a alimentação balanceada.",
            "Ótimo resultado! Não se esqueça de manter os exercícios."
        ];
        return goodTips[Math.floor(Math.random() * goodTips.length)];
    }
    
    return tips[Math.floor(Math.random() * tips.length)];
}
});
