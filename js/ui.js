
import { getRecords, loadGlucose, deleteGlucose } from './database.js';

let currentPeriodFilter = 'day';
let currentStatusFilter = 'all';
let searchTerm = '';

const tips = [
    "Beba água regularmente para ajudar no controle glicêmico.",
    "Pratique exercícios físicos regularmente.",
    "Mantenha uma alimentação balanceada.",
    "Monitore sua glicemia nos horários recomendados.",
    "Nunca pule refeições para evitar hipoglicemia."
];

export function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

export function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

export function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

export function updateDailyTip() {
    const tipIndex = new Date().getDate() % tips.length;
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
    document.getElementById('totalCount').textContent = total;
    document.getElementById('avgGlucose').textContent = avg;
}

export async function updateTable() {
    const records = getRecords();
    let filtered = filterRecordsByPeriod(records, currentPeriodFilter);
    filtered = filterRecordsByStatus(filtered, currentStatusFilter);
    filtered = filterRecordsBySearch(filtered, searchTerm);
    
    updateStats(filtered);
    
    const tbody = document.getElementById('recordsList');
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
    await loadGlucose();
    await updateTable();
    
    const records = getRecords();
    if (records.length > 0) {
        document.getElementById('currentGlucose').textContent = records[0].glucose;
    } else {
        document.getElementById('currentGlucose').textContent = '--';
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
    
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        updateTable();
    });
}

export function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`${tabId}Screen`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[data-tab="${tabId}"]`).classList.add('active');
}
