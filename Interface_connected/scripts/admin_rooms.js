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

function editRoom(id) {
    alert('Функция редактирования временно недоступна. Используйте прямое редактирование через API или базу данных.');
    // В будущем здесь будет реализовано окно редактирования
}