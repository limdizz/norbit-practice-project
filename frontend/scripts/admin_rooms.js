document.addEventListener('DOMContentLoaded', function () {
    updateHeaderState();
    loadRooms();

    document.getElementById('add-room-form').addEventListener('submit', createRoom);
    document.getElementById('add-room-btn').addEventListener('click', function () {
        document.getElementById('add-room-modal').style.display = 'block';
    });
});

async function loadRooms() {
    try {
        const response = await fetch('https://localhost:7123/api/Rooms');
        if (!response.ok) throw new Error('Ошибка сети');

        const rooms = await response.json();
        displayRooms(rooms);
    } catch (error) {
        console.error('Ошибка при загрузке помещений:', error);
        document.getElementById('rooms-section').style.display = 'none';
        document.getElementById('access-message').innerHTML = '<p style="color: red;">Не удалось загрузить список помещений.</p>';
        document.getElementById('access-message').style.display = 'block';
    }
}

function displayRooms(rooms) {
    const tbody = document.getElementById('rooms-tbody');
    tbody.innerHTML = '';

    if (rooms.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Помещения не найдены</td></tr>`;
        document.getElementById('rooms-section').style.display = 'block';
        return;
    }

    // Маппинг типов помещений
    const roomTypeMap = {
        1: 'Лаунж-зона',
        2: 'Студия звукозаписи',
        3: 'Репетиционный зал'
    };

    rooms.forEach(room => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${room.roomId}</td>
            <td>${room.name || 'Без названия'}</td>
            <td>${roomTypeMap[room.roomTypeId] || 'Неизвестно'}</td>
            <td>${room.isFree ? 'Да' : 'Нет'}</td>
            <td>
                <button onclick="editRoom(${room.roomId})">Редактировать</button>
                <button onclick="deleteRoom(${room.roomId})" style="background-color: #f44336;">Удалить</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('rooms-section').style.display = 'block';
}

async function createRoom(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const roomData = {
        name: formData.get('name'),
        roomTypeId: parseInt(formData.get('roomTypeId')),
        isFree: formData.get('isFree') === 'on'
    };

    try {
        const response = await fetch('https://localhost:7123/api/Rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(roomData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка при добавлении помещения');
        }

        // Сброс формы и скрытие модального окна
        event.target.reset();
        document.getElementById('add-room-modal').style.display = 'none';

        // Обновление списка
        loadRooms();

        alert('Помещение успешно добавлено!');
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось добавить помещение: ' + error.message);
    }
}

async function deleteRoom(id) {
    if (!confirm('Вы уверены, что хотите удалить это помещение?')) return;

    try {
        const response = await fetch(`https://localhost:7123/api/Rooms/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Ошибка сети');

        loadRooms();
        alert('Помещение успешно удалено!');
    } catch (error) {
        console.error('Ошибка при удалении:', error);
        alert('Не удалось удалить помещение.');
    }
}

async function editRoom(id) {
    try {
        const response = await fetch(`https://localhost:7123/api/Rooms/${id}`);
        if (!response.ok) throw new Error('Помещение не найдено');

        const room = await response.json();

        const modalHtml = `
            <div id="edit-room-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: white; padding: 20px; border-radius: 8px; width: 400px; max-width: 90vw;">
                    <h3 style="margin-top: 0;">Редактировать помещение</h3>
                    <form id="edit-room-form">
                        <div style="margin-bottom: 10px;">
                            <label for="edit-name" style="display: inline-block; width: 130px;">Название:</label>
                            <input type="text" id="edit-name" name="name" value="${escapeHtml(room.name || '')}" required style="width: 200px; padding: 5px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label for="edit-roomTypeId" style="display: inline-block; width: 130px;">Тип помещения:</label>
                            <select id="edit-roomTypeId" name="roomTypeId" style="width: 200px; padding: 5px;">
                                <option value="1" ${room.roomTypeId === 1 ? 'selected' : ''}>Лаунж-зона</option>
                                <option value="2" ${room.roomTypeId === 2 ? 'selected' : ''}>Студия звукозаписи</option>
                                <option value="3" ${room.roomTypeId === 3 ? 'selected' : ''}>Репетиционный зал</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label for="edit-isFree" style="display: inline-block; width: 130px;">Свободно:</label>
                            <input type="checkbox" id="edit-isFree" name="isFree" ${room.isFree ? 'checked' : ''}>
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

        const modal = document.getElementById('edit-room-modal');
        const form = document.getElementById('edit-room-form');
        const cancelButton = document.getElementById('cancel-edit');

        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const name = formData.get('name')?.trim();
            const roomTypeIdValue = formData.get('roomTypeId');
            const roomTypeId = parseInt(roomTypeIdValue);
            const isFree = formData.get('isFree') === 'on'; 

            // Валидация
            if (!name) {
                alert('Введите название помещения.');
                return;
            }
            if (isNaN(roomTypeId) || roomTypeId < 1 || roomTypeId > 3) {
                alert('Выберите корректный тип помещения.');
                return;
            }

            const updatedData = {
                Name: name,
                RoomTypeId: roomTypeId,
                IsFree: isFree  // отправляем явно как true/false
            };

            try {
                const response = await fetch(`https://localhost:7123/api/Rooms/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedData)
                });

                if (!response.ok) {
                    // Попробуем прочитать детали ошибки
                    let errorMessage = 'Ошибка при обновлении';

                    try {
                        const errorData = await response.json();

                        if (errorData.errors) {
                            // Это стандартная ошибка валидации ASP.NET
                            const allErrors = Object.values(errorData.errors).flat();
                            errorMessage = allErrors.join('\n');
                        } else if (errorData.title) {
                            errorMessage = errorData.title;
                        } else if (errorData.message) {
                            errorMessage = errorData.message;
                        }
                    } catch (parseError) {
                        // Если не JSON — используем статус
                        errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
                    }

                    throw new Error(errorMessage);
                }

                document.body.removeChild(modal);
                loadRooms();
                alert('Помещение успешно обновлено!');
            } catch (err) {
                console.error('Ошибка:', err);
                alert('Не удалось обновить помещение:\n' + err.message);
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки помещения:', error);
        alert('Не удалось загрузить данные помещения.');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}