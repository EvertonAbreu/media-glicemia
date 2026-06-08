import { getRecords } from './database.js';

let glucoseChart = null;
let homeGlucoseChart = null;

// Gráfico da página de estatísticas
export function initChart() {
    const ctx = document.getElementById('glucoseChart')?.getContext('2d');
    if (!ctx || glucoseChart) return;
    
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
                fill: true,
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }, {
                label: 'Meta Superior (140)',
                data: [],
                borderColor: '#ff8787',
                borderDash: [8, 4],
                fill: false,
                pointRadius: 0,
                borderWidth: 2
            }, {
                label: 'Meta Inferior (70)',
                data: [],
                borderColor: '#ff6b6b',
                borderDash: [8, 4],
                fill: false,
                pointRadius: 0,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: { 
                        font: { size: 11, family: "'Inter', sans-serif" },
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltip: { 
                    mode: 'index', 
                    intersect: false,
                    backgroundColor: '#1a1a2e',
                    titleFont: { size: 12, family: "'Inter', sans-serif" },
                    bodyFont: { size: 11, family: "'Inter', sans-serif" },
                    padding: 10,
                    cornerRadius: 8
                }
            },
            scales: { 
                y: { 
                    min: 0, 
                    max: 300, 
                    title: { display: true, text: 'mg/dL', font: { size: 11 } },
                    grid: { color: '#e9ecef' }
                },
                x: {
                    ticks: { font: { size: 10 } },
                    grid: { display: false }
                }
            },
            elements: {
                line: {
                    tension: 0.4
                }
            }
        }
    });
}

// Gráfico da página inicial (resumido)
export function initHomeChart() {
    const ctx = document.getElementById('homeGlucoseChart')?.getContext('2d');
    if (!ctx || homeGlucoseChart) return;
    
    homeGlucoseChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Glicemia',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102,126,234,0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: { 
                    mode: 'index', 
                    intersect: false,
                    backgroundColor: '#1a1a2e',
                    titleFont: { size: 11 },
                    bodyFont: { size: 10 },
                    cornerRadius: 8
                }
            },
            scales: { 
                y: { 
                    min: 0, 
                    max: 300, 
                    title: { display: false },
                    grid: { color: '#e9ecef' }
                },
                x: {
                    ticks: { font: { size: 9 } },
                    grid: { display: false }
                }
            }
        }
    });
}

// Atualizar gráfico da página de estatísticas
export function updateChart() {
    if (!glucoseChart) return;
    
    const records = getRecords();
    const last30Days = records.slice(0, 30).reverse();
    const labels = last30Days.map(r => {
        const date = r.datetime.split(' ')[0];
        const d = new Date(date);
        return `${d.getDate()}/${d.getMonth()+1}`;
    });
    const data = last30Days.map(r => r.glucose);
    
    glucoseChart.data.labels = labels;
    glucoseChart.data.datasets[0].data = data;
    glucoseChart.data.datasets[1].data = labels.map(() => 140);
    glucoseChart.data.datasets[2].data = labels.map(() => 70);
    glucoseChart.update();
}

// Atualizar gráfico da página inicial
export function updateHomeChart() {
    if (!homeGlucoseChart) return;
    
    const records = getRecords();
    const last7Days = records.slice(0, 7).reverse();
    const labels = last7Days.map(r => {
        const date = r.datetime.split(' ')[0];
        const d = new Date(date);
        const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return weekdays[d.getDay()];
    });
    const data = last7Days.map(r => r.glucose);
    
    homeGlucoseChart.data.labels = labels;
    homeGlucoseChart.data.datasets[0].data = data;
    homeGlucoseChart.update();
}

// Calcular meta de controle
export function updateGoalProgress() {
    const records = getRecords();
    const last30Days = records.slice(0, 30);
    const inTarget = last30Days.filter(r => r.glucose >= 70 && r.glucose <= 140).length;
    const percentage = last30Days.length > 0 ? (inTarget / last30Days.length) * 100 : 0;
    
    const progressBar = document.getElementById('goalProgress');
    const goalText = document.getElementById('goalText');
    
    if (progressBar) {
        progressBar.style.width = percentage + '%';
        if (percentage > 0 && percentage < 100) {
            progressBar.innerHTML = `${Math.round(percentage)}%`;
        } else if (percentage >= 100) {
            progressBar.innerHTML = '✓';
        }
    }
    
    if (goalText) {
        if (percentage >= 80) {
            goalText.innerHTML = '🎉 Excelente! ' + Math.round(percentage) + '% das medições na meta!';
            goalText.style.color = '#28a745';
        } else if (percentage >= 60) {
            goalText.innerHTML = '👍 Bom trabalho! ' + Math.round(percentage) + '% na meta. Continue assim!';
            goalText.style.color = '#ffc107';
        } else if (percentage > 0) {
            goalText.innerHTML = '⚠️ Atenção! Apenas ' + Math.round(percentage) + '% na meta. Consulte seu médico.';
            goalText.style.color = '#dc3545';
        } else {
            goalText.innerHTML = '📊 Adicione medições para acompanhar sua meta!';
            goalText.style.color = '#6c757d';
        }
    }
}

// Gerar insights de saúde
export function generateHealthInsights() {
    const records = getRecords();
    const insights = [];
    
    if (records.length === 0) {
        const insightsList = document.getElementById('healthInsights');
        if (insightsList) insightsList.innerHTML = '<li>✨ Adicione medições para receber insights personalizados!</li>';
        return;
    }
    
    const last7Days = records.slice(0, 7);
    const avgGlucose = last7Days.reduce((sum, r) => sum + r.glucose, 0) / last7Days.length;
    
    if (avgGlucose > 140) {
        insights.push('📈 Sua glicemia média está acima do ideal (140 mg/dL). Considere rever alimentação e medicação.');
    } else if (avgGlucose < 70) {
        insights.push('📉 Sua glicemia média está baixa. Mantenha lanches por perto e não pule refeições.');
    } else {
        insights.push('✅ Ótimo! Sua glicemia média está dentro da faixa ideal (70-140 mg/dL).');
    }
    
    const values = records.slice(0, 30).map(r => r.glucose);
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max - min > 100) {
        insights.push('📊 Grande variação glicêmica detectada. Procure manter horários regulares de alimentação e medicação.');
    }
    
    const highReadings = records.filter(r => r.glucose > 180).length;
    if (highReadings > 3) {
        insights.push(`⚠️ Você teve ${highReadings} medições acima de 180 mg/dL. Consulte seu médico para ajustes.`);
    }
    
    const lowReadings = records.filter(r => r.glucose < 70).length;
    if (lowReadings > 2) {
        insights.push(`🍬 ${lowReadings} medições baixas detectadas. Mantenha sempre um lanche rápido por perto.`);
    }
    
    if (records.length > 0 && records[0].glucose > 180) {
        insights.push('🚨 Última medição muito alta! Verifique se a insulina foi aplicada corretamente e beba água.');
    } else if (records.length > 0 && records[0].glucose < 70) {
        insights.push('🍯 Última medição baixa! Consuma 15g de carboidrato rápido e meça novamente em 15 minutos.');
    }
    
    const insightsList = document.getElementById('healthInsights');
    if (insightsList) {
        insightsList.innerHTML = insights.map(i => `<li>${i}</li>`).join('');
    }
}

// Resumo semanal
export function updateWeeklySummary() {
    const records = getRecords();
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const summary = {};
    weekdays.forEach(day => { summary[day] = { count: 0, sum: 0, readings: [] }; });
    
    records.forEach(record => {
        const date = new Date(record.datetime.split(' ')[0]);
        const dayName = weekdays[date.getDay()];
        summary[dayName].count++;
        summary[dayName].sum += record.glucose;
        summary[dayName].readings.push(record.glucose);
    });
    
    const weeklyDiv = document.getElementById('weeklySummary');
    if (weeklyDiv) {
        weeklyDiv.innerHTML = weekdays.map(day => {
            const avg = summary[day].count > 0 ? (summary[day].sum / summary[day].count).toFixed(0) : '-';
            let status = '';
            let statusIcon = '';
            if (avg > 140) { status = '🔴 Alta'; statusIcon = '⚠️'; }
            else if (avg < 70) { status = '🟡 Baixa'; statusIcon = '⚠️'; }
            else if (avg !== '-') { status = '🟢 Normal'; statusIcon = '✅'; }
            
            const bestReading = summary[day].readings.length > 0 ? Math.min(...summary[day].readings) : '-';
            const worstReading = summary[day].readings.length > 0 ? Math.max(...summary[day].readings) : '-';
            
            return `
                <div class="day-summary">
                    <span class="day-name">${day}</span>
                    <div style="flex:1">
                        <div><strong>${avg !== '-' ? avg + ' mg/dL' : 'Sem dados'}</strong> ${statusIcon}</div>
                        ${avg !== '-' ? `<small style="font-size: 10px; color: #999;">📊 ${bestReading} - ${worstReading}</small>` : ''}
                    </div>
                    <span class="day-status">${status}</span>
                </div>
            `;
        }).join('');
    }
}
