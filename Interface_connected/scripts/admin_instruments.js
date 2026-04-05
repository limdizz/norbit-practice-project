document.addEventListener('DOMContentLoaded', function () {
    updateHeaderState();
    loadInstruments();

    document.getElementById('add-instrument-form').addEventListener('submit', createInstrument);
    document.getElementById('add-instrument-btn').addEventListener('click', function () {
        document.getElementById('add-instrument-modal').style.display = 'block';
    });
});

async function loadInstruments() {
    try {
        const response = await fetch('https://localhost:7123/api/Equipments');
        if (!response.ok) throw new Error('Ошибка сети');

        const instruments = await response.json();
        displayInstruments(instruments);
    } catch (error) {
        console.error('Ошибка при загрузке инструментов:', error);
        document.getElementById('instruments-section').style.display = 'none';
        document.getElementById('access-message').innerHTML = '<p style="color: red;">Не удалось загрузить список инструментов.</p>';
        document.getElementById('access-message').style.display = 'block';
    }
}

function displayInstruments(instruments) {
    const tbody = document.getElementById('instruments-tbody');
    tbody.innerHTML = '';

    if (instruments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Инструменты не найдены</td></tr>`;
        document.getElementById('instruments-section').style.display = 'block';
        return;
    }

    instruments.forEach(instrument => {
        const row = document.createElement('tr');

        // Маппинг состояния для отображения
        const conditionMap = {
            'excellent': 'Отличное состояние',
            'good': 'Хорошее состояние',
            'unsignificant defects': 'Незначительные дефекты',
            'repairing': 'В ремонте'
        };

        row.innerHTML = `
            <td>${instrument.equipmentId}</td>
            <td>${instrument.name}</td>
            <td>${instrument.category}</td>
            <td>${instrument.rentalPrice} ₽</td>
            <td>${conditionMap[instrument.currentCondition] || instrument.currentCondition}</td>
            <td>
                <button onclick="editInstrument(${instrument.equipmentId})">Редактировать</button>
                <button onclick="deleteInstrument(${instrument.equipmentId})" style="background-color: #f44336;">Удалить</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('instruments-section').style.display = 'block';
}

async function createInstrument(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const instrumentData = {
        name: formData.get('name'),
        category: formData.get('category'),
        rentalPrice: parseFloat(formData.get('rentalPrice')),
        description: formData.get('description'),
        imageUrl: formData.get('imageUrl'),
        color: formData.get('color'),
        currentCondition: formData.get('currentCondition'),
        handedness: formData.get('handedness') || null,
        isRentable: formData.get('isRentable') === 'on'
    };

    try {
        const response = await fetch('https://localhost:7123/api/Equipments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(instrumentData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка при добавлении инструмента');
        }

        // Сброс формы и скрытие модального окна
        event.target.reset();
        document.getElementById('add-instrument-modal').style.display = 'none';

        // Обновление списка
        loadInstruments();

        alert('Инструмент успешно добавлен!');
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось добавить инструмент: ' + error.message);
    }
}

async function deleteInstrument(id) {
    if (!confirm('Вы уверены, что хотите удалить этот инструмент?')) return;

    try {
        const response = await fetch(`https://localhost:7123/api/Equipments/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Ошибка сети');

        loadInstruments();
        alert('Инструмент успешно удален!');
    } catch (error) {
        console.error('Ошибка при удалении:', error);
        alert('Не удалось удалить инструмент.');
    }
}

function editInstrument(id) {
    alert('Функция редактирования временно недоступна. Используйте прямое редактирование через API или базу данных.');
    // В будущем здесь будет реализовано окно редактирования
}