import { getRecords, loadGlucose, deleteGlucose, setRecords } from './database.js';
import { getCurrentUser } from './auth.js';

let currentPeriodFilter = 'day';
let currentStatusFilter = 'all';
let searchTerm = '';

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

export function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';
}

export function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

export function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

export function updateDailyTip() {
    const today = new Date().getDate();
    const tipIndex = today % tips.length;
    const tipElement = document.getElementById('dailyTip');
    if (tipElement) tipElement.textContent = tips[tipIndex];
}

function filterRecordsByPeriod(records, period) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch(period) {
        case 'day':
            return records.filter(r => new Date(r.datetime.split(' ')[0]) >= today);
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return records.filter(r => new Date(r.datetime.split(' ')[0]) >= weekAgo);
        case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            return records.filter(r => new Date(r.datetime.split(' ')[0]) >= monthAgo);
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
    return records.filter(r => r.datetime.toLowerCase().includes(search.toLowerCase()));
}

function updateStats(records) {
    const total = records.length;
    const avg = total > 0 ? (records.reduce((sum, r) => sum + r.glucose, 0) / total).toFixed(0) : 0;
    
    const totalCountElem = document.getElementById('totalCount');
    const avgGlucoseElem = document.getElementById('avgGlucose');
    
    if (totalCountElem) totalCountElem.textContent = total;
    if (avgGlucoseElem) avgGlucoseElem.textContent = avg;
}

export async function updateTable() {
    const records = getRecords();
    let filtered = filterRecordsByPeriod(records, currentPeriodFilter);
    filtered = filterRecordsByStatus(filtered, currentStatusFilter);
    filtered = filterRecordsBySearch(filtered, searchTerm);
    
    updateStats(filtered);
    
    const tbody = document.getElementById('recordsList');
    if (!tbody) return;
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">📭 Nenhum registro encontrado</td</tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(record => {
        let statusClass = '', statusText = '';
        if (record.glucose > 140) { statusClass = 'badge-high'; statusText = 'Alta'; }
        else if (record.glucose < 70) { statusClass = 'badge-low'; statusText = 'Baixa'; }
        else { statusClass = 'badge-normal'; statusText = 'Normal'; }
        
        const date = new Date(record.datetime.split(' ')[0]);
        const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        
        return `
            <tr>
                <td>${record.datetime}</td>
                <td>${weekdays[date.getDay()]}</td>
                <td><strong>${record.glucose}</strong> mg/dL</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${record.insulin ? record.insulin + ' U' : '-'}</td>
                <td>${record.notes ? record.notes.substring(0, 15) : '-'}</td>
                <td><button class="delete-btn" onclick="window.deleteRecord('${record.id}')">🗑️</button></td>
            </tr>
        `;
    }).join('');
}

export async function updateUI() {
    const records = await loadGlucose();
    await updateTable();
    
    const currentGlucoseElem = document.getElementById('currentGlucose');
    if (currentGlucoseElem) {
        if (records.length > 0) {
            currentGlucoseElem.textContent = records[0].glucose;
        } else {
            currentGlucoseElem.textContent = '--';
        }
    }
}

export function initFilters() {
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
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            updateTable();
        });
    }
}

export function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const targetTab = document.getElementById(`${tabId}Screen`);
    if (targetTab) targetTab.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const targetNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (targetNav) targetNav.classList.add('active');
}
