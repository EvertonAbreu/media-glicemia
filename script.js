let glucoseRecords = [];

function loadData() {
    const saved = localStorage.getItem('glucoseRecords');
    if (saved) {
        glucoseRecords = JSON.parse(saved);
    }
    updateUI();
    updateLastGlucose();
}

function saveData() {
    localStorage.setItem('glucoseRecords', JSON.stringify(glucoseRecords));
    updateUI();
    updateLastGlucose();
}

function updateLastGlucose() {
    if (glucoseRecords.length > 0) {
        const sorted = [...glucoseRecords].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
        const last = sorted[0];
        document.getElementById('currentGlucose').textContent = last.glucose;
    } else {
        document.getElementById('currentGlucose').textContent = '--';
    }
}

function getWeekday(date) {
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return weekdays[date.getDay()];
}

function getGlucoseStatus(glucose) {
    if (glucose > 140) return { text: 'Alta', class: 'status-high', emoji: '⚠️' };
    if (glucose < 70) return { text: 'Baixa', class: 'status-low', emoji: '⚠️' };
    return { text: 'Normal', class: 'status-normal', emoji: '✅' };
}

function updateStats() {
    const total = glucoseRecords.length;
    const avgGlucose = total > 0 ? (glucoseRecords.reduce((sum, record) => sum + record.glucose, 0) / total).toFixed(0) : 0;
    const uniqueDays = new Set(glucoseRecords.map(record => record.date.split('T')[0])).size;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('avgGlucose').textContent = avgGlucose;
    document.getElementById('uniqueDays').textContent = uniqueDays;
}

function updateRecordsList() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const activeFilter = document.querySelector('.chip.active')?.dataset.filter || 'all';
    
    let filteredRecords = glucoseRecords;
    
    if (searchTerm) {
        filteredRecords = filteredRecords.filter(record => 
            record.datetime.toLowerCase().includes(searchTerm)
        );
    }
    
    if (activeFilter !== 'all') {
        filteredRecords = filteredRecords.filter(record => {
            if (activeFilter === 'high') return record.glucose > 140;
            if (activeFilter === 'normal') return record.glucose >= 70 && record.glucose <= 140;
            if (activeFilter === 'low') return record.glucose < 70;
            return true;
        });
    }
    
    const recordsList = document.getElementById('recordsList');
    
    if (filteredRecords.length === 0) {
        recordsList.innerHTML = `
            <div class="empty-modern">
                <div class="empty-animation">📭</div>
                <p>Nenhuma medição registrada</p>
                <small>Comece adicionando sua primeira medição</small>
            </div>
        `;
        return;
    }
    
    filteredRecords.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    
    recordsList.innerHTML = filteredRecords.map(record => {
        const status = getGlucoseStatus(record.glucose);
        return `
            <div class="timeline-item">
                <div class="timeline-header">
                    <div class="timeline-date">
                        <span>📅</span>
                        <span>${record.datetime}</span>
                    </div>
                    <div class="timeline-badge ${status.class}">${status.emoji} ${status.text}</div>
                </div>
                <div class="timeline-body">
                    <div>
                        <span class="glucose-large">${record.glucose}</span>
                        <span style="font-size: 12px; color: #666;"> mg/dL</span>
                    </div>
                    ${record.insulin ? `<div class="insulin-pill">💉 ${record.insulin} U</div>` : ''}
                    <button class="delete-timeline" onclick="deleteRecord('${record.id}')">🗑️</button>
                </div>
                ${record.notes ? `<div class="timeline-footer">📝 ${record.notes}</div>` : ''}
            </div>
        `;
    }).join('');
}

function checkInsulinRequirement(glucose) {
    const insulinGroup = document.getElementById('insulinGroup');
    if (glucose > 140 || glucose < 70) {
        insulinGroup.style.display = 'flex';
        insulinGroup.classList.add('slide-down');
    } else {
        insulinGroup.style.display = 'none';
        document.getElementById('insulin').value = '';
    }
}

window.deleteRecord = function(id) {
    if (confirm('Excluir esta medição?')) {
        glucoseRecords = glucoseRecords.filter(record => record.id !== id);
        saveData();
        showNotification('Registro excluído!', 'success');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification-premium ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

function exportData() {
    if (glucoseRecords.length === 0) {
        showNotification('Sem dados para exportar!', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(glucoseRecords, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `diabcare_${new Date().toISOString().slice(0,19)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Dados exportados!', 'success');
}

function updateUI() {
    updateStats();
    updateRecordsList();
}

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

// Filter chips
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        updateRecordsList();
    });
});

// Search input
document.getElementById('searchInput')?.addEventListener('input', () => updateRecordsList());

// Export button
document.getElementById('exportBtn')?.addEventListener('click', exportData);

// Glucose input
document.getElementById('glucose')?.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
        checkInsulinRequirement(value);
    }
});

// Form submit
document.getElementById('glucoseForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const datetime = document.getElementById('datetime').value;
    const glucose = parseInt(document.getElementById('glucose').value);
    const insulin = document.getElementById('insulin').value;
    const notes = document.getElementById('notes').value;
    
    if (!datetime) {
        showNotification('Selecione data e hora!', 'error');
        return;
    }
    
    if (isNaN(glucose) || glucose < 20 || glucose > 600) {
        showNotification('Valor inválido (20-600 mg/dL)!', 'error');
        return;
    }
    
    if ((glucose > 140 || glucose < 70) && !insulin) {
        showNotification('Informe a insulina aplicada!', 'error');
        return;
    }
    
    const date = new Date(datetime);
    const weekday = getWeekday(date);
    const id = Date.now().toString();
    
    const newRecord = {
        id,
        datetime: datetime.replace('T', ' '),
        date: datetime.split('T')[0],
        weekday,
        glucose,
        insulin: insulin ? parseFloat(insulin) : null,
        notes: notes || ''
    };
    
    glucoseRecords.push(newRecord);
    saveData();
    
    document.getElementById('glucoseForm').reset();
    document.getElementById('insulinGroup').style.display = 'none';
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('datetime').value = now.toISOString().slice(0, 16);
    
    showNotification('Medição salva! 🎉', 'success');
});

loadData();

const now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
document.getElementById('datetime').value = now.toISOString().slice(0, 16);
