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

// Funções de navegação entre telas
window.showRegister = function() {
    console.log("Abrindo tela de cadastro");
    const loginScreen = document.getElementById('loginScreen');
    const registerScreen = document.getElementById('registerScreen');
    if (loginScreen) loginScreen.classList.remove('active');
    if (registerScreen) registerScreen.classList.add('active');
};

window.showLogin = function() {
    console.log("Abrindo tela de login");
    const loginScreen = document.getElementById('loginScreen');
    const registerScreen = document.getElementById('registerScreen');
    if (registerScreen) registerScreen.classList.remove('active');
    if (loginScreen) loginScreen.classList.add('active');
};

// Inicializar navegação das abas
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

// ============================================================
// EXPORT PDF - VERSÃO SIMPLIFICADA (FUNCIONAL)
// ============================================================
const exportBtn = document.getElementById('exportPDFBtn');
if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
        const records = getRecords();
        if (records.length === 0) {
            showNotification('Nenhum dado para exportar!', 'error');
            return;
        }
        
        showLoading();
        
        // Função para formatar data
        function formatDateTime(datetime) {
            try {
                if (!datetime) return '-';
                if (datetime.includes(' ')) {
                    const [date, time] = datetime.split(' ');
                    const [year, month, day] = date.split('-');
                    const [hours, minutes] = time.split(':');
                    return `${day}/${month}/${year} ${hours}:${minutes}`;
                }
                if (datetime.includes('T')) {
                    const d = new Date(datetime);
                    return d.toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
                return datetime;
            } catch {
                return datetime || '-';
            }
        }

        function getGlucoseStatus(value) {
            if (value < 70) return 'Baixa';
            if (value <= 140) return 'Normal';
            return 'Alta';
        }

        function getStatusClass(value) {
            if (value < 70) return 'status-low';
            if (value <= 140) return 'status-normal';
            return 'status-high';
        }

        function translateMealType(meal) {
            const types = {
                'jejum': 'Jejum',
                'pre-refeicao': 'Pré-refeição',
                'pos-refeicao-1h': 'Pós-refeição (1h)',
                'pos-refeicao-2h': 'Pós-refeição (2h)'
            };
            return types[meal] || meal || '-';
        }

        // Gerar o HTML do relatório
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Relatório DiabCare</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    padding: 40px; 
                    color: #2d3748;
                    background: #f7fafc;
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    border-radius: 12px;
                    margin-bottom: 30px;
                }
                .header h1 { font-size: 28px; font-weight: 700; }
                .header p { opacity: 0.9; font-size: 14px; margin-top: 5px; }
                .summary {
                    display: flex;
                    gap: 15px;
                    margin-bottom: 30px;
                    flex-wrap: wrap;
                }
                .summary-box {
                    background: white;
                    padding: 15px 25px;
                    border-radius: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    flex: 1;
                    min-width: 120px;
                    text-align: center;
                }
                .summary-box .number {
                    font-size: 24px;
                    font-weight: 700;
                    color: #667eea;
                }
                .summary-box .label {
                    font-size: 12px;
                    color: #718096;
                    margin-top: 4px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                th { 
                    background: #667eea; 
                    color: white; 
                    padding: 12px 15px;
                    text-align: left;
                    font-weight: 600;
                    font-size: 13px;
                }
                td { 
                    border-bottom: 1px solid #e2e8f0; 
                    padding: 10px 15px;
                    font-size: 13px;
                }
                tr:last-child td { border-bottom: none; }
                .status-badge {
                    display: inline-block;
                    padding: 2px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .status-low { background: #fed7d7; color: #c53030; }
                .status-normal { background: #c6f6d5; color: #276749; }
                .status-high { background: #feebc8; color: #c05621; }
                .footer { 
                    margin-top: 30px; 
                    text-align: center; 
                    color: #a0aec0; 
                    font-size: 12px;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🩸 DiabCare - Relatório de Glicemia</h1>
                <p>Gerado em: ${new Date().toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>
            </div>
            
            <div class="summary">
                <div class="summary-box">
                    <div class="number">${records.length}</div>
                    <div class="label">Total de Medições</div>
                </div>
                <div class="summary-box">
                    <div class="number">${Math.round(records.reduce((acc, r) => acc + r.glucose, 0) / records.length)}</div>
                    <div class="label">Média (mg/dL)</div>
                </div>
                <div class="summary-box">
                    <div class="number">${records.filter(r => r.glucose >= 70 && r.glucose <= 140).length}</div>
                    <div class="label">Dentro da Meta</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Data/Hora</th>
                        <th>Glicemia</th>
                        <th>Status</th>
                        <th>Insulina</th>
                        <th>Refeição</th>
                        <th>Exercício</th>
                        <th>Observações</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => `
                        <tr>
                            <td>${formatDateTime(r.datetime)}</td>
                            <td><strong>${r.glucose}</strong> mg/dL</td>
                            <td><span class="status-badge ${getStatusClass(r.glucose)}">${getGlucoseStatus(r.glucose)}</span></td>
                            <td>${r.insulin ? r.insulin + ' U' : '-'}</td>
                            <td>${translateMealType(r.mealType)}</td>
                            <td>${r.exercise ? r.exercise.charAt(0).toUpperCase() + r.exercise.slice(1) : '-'}</td>
                            <td>${r.notes || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <p>Relatório gerado pelo DiabCare - Sistema de Controle de Diabetes</p>
                <p style="margin-top: 5px;">Este relatório contém informações pessoais. Mantenha em local seguro.</p>
            </div>
        </body>
        </html>`;

        try {
            // MÉTODO 1: Tentar com html2pdf usando elemento DOM
            const container = document.createElement('div');
            container.innerHTML = htmlContent;
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '0';
            container.style.width = '1100px';
            container.style.background = 'white';
            container.style.padding = '20px';
            document.body.appendChild(container);

            const opt = {
                margin: 0.5,
                filename: `diabcare_${new Date().toISOString().slice(0, 10)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true,
                    logging: false,
                    width: 1100
                },
                jsPDF: { 
                    unit: 'in', 
                    format: 'a4', 
                    orientation: 'landscape' 
                }
            };

            await html2pdf().set(opt).from(container).save();
            document.body.removeChild(container);
            showNotification('PDF gerado com sucesso!');
            
        } catch (error) {
            console.error('Erro ao gerar PDF com html2pdf:', error);
            
            // MÉTODO 2: Fallback - abrir em nova janela para impressão
            try {
                const printWindow = window.open('', '_blank', 'width=1100,height=800');
                if (printWindow) {
                    printWindow.document.write(htmlContent);
                    printWindow.document.close();
                    printWindow.focus();
                    
                    // Aguardar carregamento e abrir impressão
                    setTimeout(() => {
                        printWindow.print();
                    }, 500);
                    
                    showNotification('Use "Salvar como PDF" na janela de impressão');
                } else {
                    // MÉTODO 3: Fallback final - criar link para download
                    const blob = new Blob([htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `diabcare_${new Date().toISOString().slice(0, 10)}.html`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    showNotification('Arquivo HTML baixado. Abra e imprima como PDF.', 'info');
                }
            } catch (fallbackError) {
                console.error('Erro no fallback:', fallbackError);
                showNotification('Erro ao gerar PDF. Tente usar Chrome.', 'error');
            }
        } finally {
            hideLoading();
        }
    });
}

// ============================================================
// FORMULÁRIOS
// ============================================================

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

// ============================================================
// INICIALIZAÇÃO
// ============================================================
async function initializeApp() {
    console.log("Inicializando aplicação...");
    updateDailyTip();
    initFilters();
    initChart();
    initHomeChart();
    
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
    
    initAuth();
}

initializeApp();
