
import { login, register, logout, initAuth, getCurrentUser } from './auth.js';
import { saveGlucose, getRecords, deleteGlucose } from './database.js';
import { showNotification, updateUI, initFilters, switchTab, updateDailyTip, showLoading, hideLoading } from './ui.js';
import { initChart, updateChart, updateGoalProgress, generateHealthInsights, updateWeeklySummary } from './charts.js';

// Função global para deletar registro
window.deleteRecord = async function(id) {
    if (confirm('Tem certeza que deseja excluir esta medição?')) {
        await deleteGlucose(id);
        await updateUI();
        showNotification('Medição excluída!');
    }
};

// Exportar funções globais
window.login = login;
window.register = register;
window.logout = logout;
window.showRegister = () => {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('registerScreen').classList.add('active');
};
window.showLogin = () => {
    document.getElementById('registerScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
};

// Inicializar navegação
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
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
    } else {
        insulinGroup.style.display = 'none';
    }
});

// Export PDF
document.getElementById('exportPDFBtn')?.addEventListener('click', async () => {
    const records = getRecords();
    if (records.length === 0) {
        showNotification('Nenhum dado para exportar!', 'error');
        return;
    }
    
    showLoading();
    const user = getCurrentUser();
    const userProfile = await import('./database.js').then(m => m.loadUserProfile(user.uid));
    
    const pdfContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório DiabCare</title><style>body{font-family:'Inter',sans-serif;padding:40px}</style></head><body><h1>Relatório DiabCare</h1><p>Data: ${new Date().toLocaleString('pt-BR')}</p><table border="1"><tr><th>Data</th><th>Glicemia</th><th>Insulina</th></tr>${records.map(r => `<tr><td>${r.datetime}</td><td>${r.glucose} mg/dL</td><td>${r.insulin || '-'}</td></tr>`).join('')}</table></body></html>`;
    
    html2pdf().set({ margin: 0.5, filename: `diabcare_${new Date().toISOString().slice(0,19)}.pdf` }).from(pdfContent).save();
    hideLoading();
    showNotification('PDF gerado!');
});

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
    const user = getCurrentUser();
    if (!user) { showNotification('Faça login primeiro!', 'error'); return; }
    
    const datetime = document.getElementById('datetime').value;
    const glucose = parseInt(document.getElementById('glucose').value);
    const insulin = document.getElementById('insulin').value;
    const notes = document.getElementById('notes').value;
    
    if (!datetime || isNaN(glucose)) { showNotification('Preencha todos os campos!', 'error'); return; }
    if ((glucose > 140 || glucose < 70) && !insulin) { showNotification('Informe a insulina!', 'error'); return; }
    
    showLoading();
    try {
        await saveGlucose({ datetime: datetime.replace('T', ' '), glucose, insulin: insulin || null, notes: notes || '' });
        await updateUI();
        document.getElementById('glucoseForm').reset();
        document.getElementById('insulinGroup').style.display = 'none';
        switchTab('history');
        showNotification('Medição salva!');
    } catch (error) { showNotification('Erro ao salvar', 'error'); } finally { hideLoading(); }
});

// Data/hora atual
const now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
const datetimeInput = document.getElementById('datetime');
if (datetimeInput) datetimeInput.value = now.toISOString().slice(0, 16);

// Inicializar
updateDailyTip();
initFilters();
initChart();

// Observar atualizações de UI para gráficos
const observer = new MutationObserver(() => {
    updateChart();
    updateGoalProgress();
    generateHealthInsights();
    updateWeeklySummary();
});
observer.observe(document.getElementById('recordsList'), { childList: true, subtree: true });

// Iniciar autenticação
initAuth();
