
import { getRecords } from './database.js';

let glucoseChart = null;

export function initChart() {
    const ctx = document.getElementById('glucoseChart')?.getContext('2d');
    if (!ctx) return;
    
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
            plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
            scales: { y: { min: 0, max: 300, title: { display: true, text: 'mg/dL' } } }
        }
    });
}

export function updateChart() {
    if (!glucoseChart) return;
    
    const records = getRecords();
    const last30Days = records.slice(0, 30).reverse();
    const labels = last30Days.map(r => r.datetime.split(' ')[0]);
    const data = last30Days.map(r => r.glucose);
    
    glucoseChart.data.labels = labels;
    glucoseChart.data.datasets[0].data = data;
    glucoseChart.data.datasets[1].data = labels.map(() => 140);
    glucoseChart.data.datasets[2].data = labels.map(() => 70);
    glucoseChart.update();
}

export function updateGoalProgress() {
    const records = getRecords();
    const last30Days = records.slice(0, 30);
    const inTarget = last30Days.filter(r => r.glucose >= 70 && r.glucose <= 140).length;
    const percentage = last30Days.length > 0 ? (inTarget / last30Days.length) * 100 : 0;
    
    const progressBar = document.getElementById('goalProgress');
    const goalText = document.getElementById('goalText');
    
    if (progressBar) progressBar.style.width = percentage + '%';
    
    if (goalText) {
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
}

export function generateHealthInsights() {
    const records = getRecords();
    const insights = [];
    const last7Days = records.slice(0, 7);
    const avgGlucose = last7Days.length > 0 ? last7Days.reduce((sum, r) => sum + r.glucose, 0) / last7Days.length : 0;
    
    if (avgGlucose > 140) insights.push('Sua glicemia média está acima do ideal. Considere revisar alimentação e medicação.');
    else if (avgGlucose < 70) insights.push('Sua glicemia média está baixa. Mantenha lanches por perto.');
    else insights.push('Ótimo! Sua glicemia média está dentro da meta.');
    
    const values = records.slice(0, 30).map(r => r.glucose);
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max - min > 100) insights.push('📊 Grande variação glicêmica detectada. Procure manter horários regulares.');
    
    const insightsList = document.getElementById('healthInsights');
    if (insightsList) {
        insightsList.innerHTML = insights.map(i => `<li>${i}</li>`).join('');
    }
}

export function updateWeeklySummary() {
    const records = getRecords();
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
            
            return `<div class="day-summary"><span class="day-name">${day}</span><span class="day-glucose">${avg !== '-' ? avg + ' mg/dL' : 'Sem dados'}</span><span class="day-status">${status}</span></div>`;
        }).join('');
    }
}
