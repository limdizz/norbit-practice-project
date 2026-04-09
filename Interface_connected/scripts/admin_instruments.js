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

        event.target.reset();
        document.getElementById('add-instrument-modal').style.display = 'none';
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

async function editInstrument(id) {
    try {
        const response = await fetch(`https://localhost:7123/api/Equipments/${id}`);
        if (!response.ok) throw new Error('Инструмент не найден');

        const instrument = await response.json();

        const modalHtml = `
            <div id="edit-instrument-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: white; padding: 20px; border-radius: 8px; width: 500px; max-width: 90vw; max-height: 85vh; overflow-y: auto;">
                    <h3 style="margin-top: 0;">Редактировать инструмент</h3>
                    <form id="edit-instrument-form">
                        <div style="margin-bottom: 10px;">
                            <label for="edit-name" style="display: inline-block; width: 130px;">Название:</label>
                            <input type="text" id="edit-name" name="name" value="${escapeHtml(instrument.name)}" required style="width: 280px; padding: 5px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label for="edit-category" style="display: inline-block; width: 130px;">Категория:</label>
                            <select id="edit-category" name="category" style="width: 280px; padding: 5px;">
                                <option value="Electric Guitars" ${instrument.category === 'Electric Guitars' ? 'selected' : ''}>Электрогитары</option>
                                <option value="Classical Guitars" ${instrument.category === 'Classical Guitars' ? 'selected' : ''}>Классические гитары</option>
                                <option value="Synths" ${instrument.category === 'Synths' ? 'selected' : ''}>Синтезаторы</option>
                                <option value="Microphones" ${instrument.category === 'Microphones' ? 'selected' : ''}>Микрофоны</option>
                                <option value="Bass Guitars" ${instrument.category === 'Bass Guitars' ? 'selected' : ''}>Бас-гитары</option>
                                <option value="Drums" ${instrument.category === 'Drums' ? 'selected' : ''}>Ударные установки</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label for="edit-rentalPrice" style="display: inline-block; width: 130px;">Цена за час (₽):</label>
                            <input type="number" id="edit-rentalPrice" name="rentalPrice" value="${instrument.rentalPrice}" min="0" step="0.01" required style="width: 280px; padding: 5px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label for="edit-description" style="display: inline-block; width: 130px; vertical-align: top;">Описание:</label>
                            <textarea id="edit-description" name="description" rows="3" style="width: 280px; padding: 5px; vertical-align: top;">${escapeHtml(instrument.description || '')}</textarea>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label for="edit-imageUrl" style="display: inline-block; width: 130px;">Ссылка на изображение:</label>
                            <input type="url" id="edit-imageUrl" name="imageUrl" value="${escapeHtml(instrument.imageUrl || '')}" style="width: 280px; padding: 5px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label for="edit-color" style="display: inline-block; width: 130px;">Цвет:</label>
                            <input type="text" id="edit-color" name="color" value="${escapeHtml(instrument.color || '')}" style="width: 280px; padding: 5px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label for="edit-currentCondition" style="display: inline-block; width: 130px;">Состояние:</label>
                            <select id="edit-currentCondition" name="currentCondition" style="width: 280px; padding: 5px;">
                                <option value="excellent" ${instrument.currentCondition === 'excellent' ? 'selected' : ''}>Отличное состояние</option>
                                <option value="good" ${instrument.currentCondition === 'good' ? 'selected' : ''}>Хорошее состояние</option>
                                <option value="unsignificant defects" ${instrument.currentCondition === 'unsignificant defects' ? 'selected' : ''}>Незначительные дефекты</option>
                                <option value="repairing" ${instrument.currentCondition === 'repairing' ? 'selected' : ''}>В ремонте</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label for="edit-handedness" style="display: inline-block; width: 130px;">Ориентация:</label>
                            <select id="edit-handedness" name="handedness" style="width: 280px; padding: 5px;">
                                <option value="righty" ${instrument.handedness === 'righty' ? 'selected' : ''}>Правша</option>
                                <option value="lefty" ${instrument.handedness === 'lefty' ? 'selected' : ''}>Левша</option>
                                <option value="" ${!instrument.handedness ? 'selected' : ''}>Не применимо</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label for="edit-isRentable" style="display: inline-block; width: 130px;">Доступен для аренды:</label>
                            <input type="checkbox" id="edit-isRentable" name="isRentable" ${instrument.isRentable ? 'checked' : ''}>
                        </div>
                        <div style="margin-top: 15px; text-align: right;">
                            <button type="button" id="cancel-edit" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Отмена</button>
                            <button type="submit" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Сохранить</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('edit-instrument-modal');
        const form = document.getElementById('edit-instrument-form');
        const cancelButton = document.getElementById('cancel-edit');

        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const updatedData = {
                equipmentId: id,
                name: formData.get('name'),
                category: formData.get('category'),
                rentalPrice: parseFloat(formData.get('rentalPrice')),
                description: formData.get('description') || null,
                imageUrl: formData.get('imageUrl') || null,
                color: formData.get('color') || null,
                currentCondition: formData.get('currentCondition'),
                handedness: formData.get('handedness') || null,
                isRentable: formData.get('isRentable') === 'on'
            };

            try {
                const response = await fetch(`https://localhost:7123/api/Equipments/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Ошибка при обновлении');
                }

                document.body.removeChild(modal);
                loadInstruments();
                alert('Инструмент успешно обновлён!');
            } catch (err) {
                console.error('Ошибка:', err);
                alert('Не удалось обновить инструмент: ' + err.message);
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки инструмента:', error);
        alert('Не удалось загрузить данные инструмента.');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}