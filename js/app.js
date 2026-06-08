import { login, register, logout, initAuth, getCurrentUser } from './auth.js';
import { saveGlucose, getRecords, deleteGlucose } from './database.js';
import { showNotification, updateUI, initFilters, switchTab, updateDailyTip, showLoading, hideLoading } from './ui.js';
import { initChart, updateChart, updateGoalProgress, generateHealthInsights, updateWeeklySummary, initHomeChart, updateHomeChart } from './charts.js';

// Função global para deletar registro
window.deleteRecord = async function(id) {
    if (confirm('Tem certeza que deseja excluir esta medição?')) {
        await deleteGlucose(id);
        await updateUI();
        await updateChart();
        await updateHomeChart();
        await updateGoalProgress();
        await generateHealthInsights();
        await updateWeeklySummary();
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
const insulinDec = document.querySelector('.insulin-dec');
const insulinInc = document.querySelector('.insulin-inc');
const insulinInput = document.getElementById('insulin');

if (insulinDec) {
    insulinDec.addEventListener('click', () => {
        const value = parseFloat(insulinInput?.value) || 0;
        if (value > 0 && insulinInput) insulinInput.value = value - 0.5;
    });
}

if (insulinInc) {
    insulinInc.addEventListener('click', () => {
        const value = parseFloat(insulinInput?.value) || 0;
        if (insulinInput) insulinInput.value = value + 0.5;
    });
}

// Mostrar campo de insulina
const glucoseInput = document.getElementById('glucose');
if (glucoseInput) {
    glucoseInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        const insulinGroup = document.getElementById('insulinGroup');
        if (insulinGroup) {
            if (!isNaN(value) && (value > 140 || value < 70)) {
                insulinGroup.style.display = 'block';
                insulinGroup.classList.add('slide-down');
            } else {
                insulinGroup.style.display = 'none';
            }
        }
    });
}

// Export PDF
const exportBtn = document.getElementById('exportPDFBtn');
if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
        const records = getRecords();
        if (records.length === 0) {
            showNotification('Nenhum dado para exportar!', 'error');
            return;
        }
        
        showLoading();
        
        const pdfContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório DiabCare</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 40px; }
                    h1 { color: #667eea; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background: #667eea; color: white; }
                    .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <h1>🩸 DiabCare - Relatório de Glicemia</h1>
                <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                <table>
                    <thead><tr><th>Data/Hora</th><th>Glicemia</th><th>Insulina</th><th>Observações</th></tr></thead>
                    <tbody>
                        ${records.map(r => `<tr><td>${r.datetime}${'</td><td>'}${r.glucose} mg/dL${'</td><td>'}${r.insulin || '-'}${'</td><td>'}${r.notes || '-'}${'</td></tr>'`).join('')}
                    </tbody>
                </table>
                <div class="footer">Relatório gerado pelo DiabCare - Sistema de Controle de Diabetes</div>
            </body>
            </html>
        `;
        
        const opt = {
            margin: 0.5,
            filename: `diabcare_${new Date().toISOString().slice(0, 19)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
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
    });
}

// Formulário de Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        login(
            document.getElementById('loginEmail').value,
            document.getElementById('loginPassword').value
        );
    });
}

// Formulário de Cadastro
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
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
}

// Formulário de Medição
const glucoseForm = document.getElementById('glucoseForm');
if (glucoseForm) {
    glucoseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = getCurrentUser();
        if (!user) {
            showNotification('Faça login primeiro!', 'error');
            return;
        }
        
        const datetime = document.getElementById('datetime').value;
        const glucose = parseInt(document.getElementById('glucose').value);
        const insulin = document.getElementById('insulin').value;
        const mealType = document.getElementById('mealType')?.value || '';
        const exercise = document.querySelector('input[name="exercise"]:checked')?.value || '';
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
                mealType,
                exercise,
                notes: notes || ''
            });
            
            await updateUI();
            await updateChart();
            await updateHomeChart();
            await updateGoalProgress();
            await generateHealthInsights();
            await updateWeeklySummary();
            
            glucoseForm.reset();
            const insulinGroup = document.getElementById('insulinGroup');
            if (insulinGroup) insulinGroup.style.display = 'none';
            switchTab('history');
            
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            const datetimeInput = document.getElementById('datetime');
            if (datetimeInput) datetimeInput.value = now.toISOString().slice(0, 16);
            
            showNotification('Medição salva com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            showNotification('Erro ao salvar medição', 'error');
        } finally {
            hideLoading();
        }
    });
}

// Data/hora atual
const now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
const datetimeInput = document.getElementById('datetime');
if (datetimeInput) datetimeInput.value = now.toISOString().slice(0, 16);

// Inicializar tudo
async function initializeApp() {
    updateDailyTip();
    initFilters();
    initChart();
    initHomeChart();
    
    // Observar atualizações de UI para gráficos
    const observer = new MutationObserver(() => {
        const records = getRecords();
        if (records.length > 0) {
            updateChart();
            updateHomeChart();
            updateGoalProgress();
            generateHealthInsights();
            updateWeeklySummary();
        }
    });
    
    const recordsList = document.getElementById('recordsList');
    if (recordsList) {
        observer.observe(recordsList, { childList: true, subtree: true });
    }
    
    // Iniciar autenticação
    initAuth();
}

// Executar inicialização
initializeApp();
