let glucoseRecords = [];

function loadData() {
    const saved = localStorage.getItem('glucoseRecords');
    if (saved) {
        glucoseRecords = JSON.parse(saved);
    }
    updateUI();
}

function saveData() {
    localStorage.setItem('glucoseRecords', JSON.stringify(glucoseRecords));
    updateUI();
}

function getWeekday(date) {
    const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return weekdays[date.getDay()];
}

function getGlucoseStatus(glucose) {
    if (glucose > 140) return { text: 'Alta ⚠️', class: 'status-high' };
    if (glucose < 70) return { text: 'Baixa ⚠️', class: 'status-low' };
    return { text: 'Normal ✓', class: 'status-normal' };
}

function updateStats() {
    const total = glucoseRecords.length;
    const avgGlucose = total > 0 ? (glucoseRecords.reduce((sum, record) => sum + record.glucose, 0) / total).toFixed(1) : 0;
    const uniqueDays = new Set(glucoseRecords.map(record => record.date.split('T')[0])).size;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('avgGlucose').textContent = avgGlucose;
    document.getElementById('uniqueDays').textContent = uniqueDays;
}

function updateTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;
    
    let filteredRecords = glucoseRecords;
    
    if (searchTerm) {
        filteredRecords = filteredRecords.filter(record => 
            record.datetime.toLowerCase().includes(searchTerm)
        );
    }
    
    if (statusFilter !== 'all') {
        filteredRecords = filteredRecords.filter(record => {
            if (statusFilter === 'high') return record.glucose > 140;
            if (statusFilter === 'normal') return record.glucose >= 70 && record.glucose <= 140;
            if (statusFilter === 'low') return record.glucose < 70;
            return true;
        });
    }
    
    const tbody = document.getElementById('recordsBody');
    
    if (filteredRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum registro encontrado</td></tr>';
        return;
    }
    
    filteredRecords.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    
    tbody.innerHTML = filteredRecords.map(record => {
        const status = getGlucoseStatus(record.glucose);
        return `
            <tr>
                <td>${record.datetime}</td>
                <td>${record.weekday}</td>
                <td><strong>${record.glucose}</strong> mg/dL</td>
                <td><span class="status ${status.class}">${status.text}</span></td>
                <td>${record.insulin ? record.insulin + ' U' : '-'}</td>
                <td>${record.notes || '-'}</td>
                <td><button class="delete-btn" onclick="deleteRecord('${record.id}')">🗑️</button></td>
            </tr>
        `;
    }).join('');
}

function checkInsulinRequirement(glucose) {
    const insulinGroup = document.getElementById('insulinGroup');
    if (glucose > 140 || glucose < 70) {
        insulinGroup.style.display = 'block';
    } else {
        insulinGroup.style.display = 'none';
        document.getElementById('insulin').value = '';
    }
}

window.deleteRecord = function(id) {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
        glucoseRecords = glucoseRecords.filter(record => record.id !== id);
        saveData();
        showNotification('Registro excluído com sucesso!', 'success');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function exportData() {
    if (glucoseRecords.length === 0) {
        showNotification('Não há dados para exportar!', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(glucoseRecords, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `diabcare_export_${new Date().toISOString().slice(0,19)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Dados exportados com sucesso!', 'success');
}

function updateUI() {
    updateStats();
    updateTable();
}

document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterStatus').value = 'all';
    updateTable();
});

document.getElementById('exportBtn').addEventListener('click', exportData);

document.getElementById('glucose').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
        checkInsulinRequirement(value);
    }
});

document.getElementById('glucoseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const datetime = document.getElementById('datetime').value;
    const glucose = parseInt(document.getElementById('glucose').value);
    const insulin = document.getElementById('insulin').value;
    const notes = document.getElementById('notes').value;
    
    if (!datetime) {
        showNotification('Por favor, selecione data e hora!', 'error');
        return;
    }
    
    if (isNaN(glucose) || glucose < 20 || glucose > 600) {
        showNotification('Por favor, insira um valor de glicemia válido (20-600 mg/dL)!', 'error');
        return;
    }
    
    if ((glucose > 140 || glucose < 70) && !insulin) {
        showNotification('Para glicemia alta ou baixa, é obrigatório informar a quantidade de insulina aplicada!', 'error');
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
    
    showNotification('Medição salva com sucesso!', 'success');
});

loadData();

const now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
document.getElementById('datetime').value = now.toISOString().slice(0, 16);
