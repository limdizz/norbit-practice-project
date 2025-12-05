document.addEventListener('DOMContentLoaded', function () {
    console.log('Страница помещения загружается...');
    initializePage();
});

let currentRoom = null;

// Данные типов помещений (так как API возвращает только RoomTypeId)
// Эти данные должны совпадать с SQL таблицей RoomType
const roomTypesMap = {
    1: {
        name: "Лаунж-зона",
        price: 1000,
        desc: "Уютная зона отдыха с мягкой мебелью, баром и расслабляющей атмосферой. Идеально для перерывов между репетициями.",
        features: ["Мягкие диваны", "Wi-Fi", "Барная стойка", "TV", "Игровая приставка"]
    },
    2: {
        name: "Студия звукозаписи",
        price: 1000, // Цена может отличаться, проверьте БД
        desc: "Профессионально акустически подготовленное помещение для записи вокала и инструментов. Топовое оборудование.",
        features: ["Звукоизоляция", "Микрофонный парк", "Мониторная линия", "Кондиционер"]
    },
    3: {
        name: "Репетиционный зал",
        price: 750,
        desc: "Просторный зал для репетиций музыкальных групп. Полный комплект бэклайна.",
        features: ["Ударная установка", "Гитарные стеки", "Линия вокала", "Зеркала"]
    }
};

function initializePage() {
    loadRoomData();
    initDateSelect();
    initTimeSelect();
    initDurationSelect();
    initNavigation();
}

// 1. Загрузка данных
async function loadRoomData() {
    const roomId = getRoomIdFromURL();
    console.log('Загружаем помещение ID:', roomId);

    if (!roomId) {
        showNotFound();
        return;
    }

    try {
        const response = await fetch(`https://localhost:7123/api/Rooms/${roomId}`);
        if (!response.ok) throw new Error('Помещение не найдено');

        const apiData = await response.json();
        currentRoom = mapApiDataToUi(apiData);

        renderRoomDetails(currentRoom);
        updatePageTitle(currentRoom.name);

        // Обновляем кнопку и цену
        updateBookingButton();
        calculatePrice();

    } catch (error) {
        console.error('Ошибка:', error);
        showNotFound();
    }
}

// 2. Маппинг данных
function mapApiDataToUi(item) {
    // Получаем статические данные по TypeId
    const typeInfo = roomTypesMap[item.roomTypeId] || {
        name: "Помещение", price: 0, desc: "Нет описания", features: []
    };

    const savedImage = sessionStorage.getItem('selectedRoomImage');
    sessionStorage.removeItem('selectedRoomImage');

    return {
        id: item.roomId,
        name: item.name,
        typeId: item.roomTypeId,
        category: typeInfo.name,
        price: typeInfo.price, // Цена за час
        description: typeInfo.desc,
        features: typeInfo.features,
        isFree: item.isFree,
        // Выбор картинки заглушки
        image: savedImage || getRoomImage(item.roomTypeId)
    };
}

function getRoomImage(typeId) {
    switch (typeId) {
        case 1: return "img/rooms/lounge/lounge.jpeg";
        case 2: return "img/rooms/studios/studio.jpeg";
        case 3: return "img/rooms/rehearsal_rooms/rehearsal_room.jpeg";
        default: return "img/file_not_found.png";
    }
}

function getRoomIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    return id ? parseInt(id) : null;
}

// 3. Рендеринг (заполнение HTML)
function renderRoomDetails(room) {
    // Картинка
    const img = document.getElementById('room-image');
    if (img) {
        img.src = room.image;
        img.alt = room.name;
    }

    // Тексты
    setText('room-category', room.category);
    setText('room-name', room.name);
    setText('room-desc', room.description);
    setText('room-price-display', `${room.price} ₽ / час`);

    // Характеристики
    const featuresList = document.getElementById('room-features');
    if (featuresList) {
        featuresList.innerHTML = room.features
            .map(f => `<li>${f}</li>`)
            .join('');
    }

    // Статус
    const statusEl = document.getElementById('room-status');
    const btn = document.getElementById('book_button');
    if (statusEl) {
        if (!room.isFree) {
            statusEl.innerHTML = '<span style="color:red">Временно занято</span>';
            // Можно заблокировать кнопку, если логика API запрещает бронь занятых
            if (btn) {
                // btn.disabled = true; 
                // btn.style.background = '#ccc';
            }
        } else {
            statusEl.innerHTML = '<span style="color:green">Свободно для бронирования</span>';
        }
    }
}

// 4. Логика выбора даты (только Start Date, так как бронь часовая)
function initDateSelect() {
    const dateSelect = document.getElementById('booking_date');
    if (!dateSelect) return;

    dateSelect.innerHTML = '';
    const today = new Date();

    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dateString = `${day}.${month}.${date.getFullYear()}`;

        const option = document.createElement('option');
        option.value = dateString;
        option.textContent = dateString;
        dateSelect.appendChild(option);
    }
}

function initTimeSelect() {
    const timeSelect = document.getElementById('booking_time');
    if (!timeSelect) return;

    timeSelect.innerHTML = '';

    // Генерируем слоты времени с 10:00 до 22:00 (можно настроить под себя)
    const startHour = 10;
    const endHour = 22;

    for (let i = startHour; i <= endHour; i++) {
        const hourString = String(i).padStart(2, '0') + ':00';

        const option = document.createElement('option');
        option.value = hourString; // Значение, например "14:00"
        option.textContent = hourString;

        timeSelect.appendChild(option);
    }
}

function initDurationSelect() {
    const hoursSelect = document.getElementById('booking_hours');
    if (hoursSelect) {
        hoursSelect.addEventListener('change', calculatePrice);
    }
}

// 5. Калькулятор цены
function calculatePrice() {
    if (!currentRoom) return;

    const hoursSelect = document.getElementById('booking_hours');
    const hours = hoursSelect ? parseInt(hoursSelect.value) : 1;

    const total = hours * currentRoom.price;

    const totalEl = document.getElementById('total-price');
    if (totalEl) {
        totalEl.textContent = `${total} ₽`;
    }
}

// 6. Бронирование
function updateBookingButton() {
    const btn = document.getElementById('book_button');
    if (btn) {
        // Удаляем старые листенеры через клонирование
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', handleBooking);
    }
}

async function handleBooking() {
    if (!currentRoom) return;

    // 1. Сбор данных из формы
    const dateStr = document.getElementById('booking_date').value; // "DD.MM.YYYY"
    const timeStr = document.getElementById('booking_time').value; // "HH:00"
    const hoursSelect = document.getElementById('booking_hours');
    const hours = parseInt(hoursSelect.value);

    // Получение данных пользователя
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userUid = userData.userUid || userData.uid;

    if (!userData.email) {
        alert("Пожалуйста, войдите в систему для бронирования.");
        window.location.href = 'log_in.html'; // Убедитесь, что путь верный
        return;
    }

    // 2. Парсинг даты и времени для создания объекта Date
    const [day, month, year] = dateStr.split('.').map(Number);
    const [bookingHour, bookingMinute] = timeStr.split(':').map(Number);

    // Создаем дату начала (месяц в JS начинается с 0, поэтому month - 1)
    const startTime = new Date(year, month - 1, day, bookingHour, bookingMinute, 0);

    // Рассчитываем дату окончания
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + hours);

    // Валидация: Нельзя забронировать на прошедшее время
    if (startTime < new Date()) {
        alert("Нельзя забронировать помещение на прошедшее время.");
        return;
    }

    const bookingRequest = {
        UserUid: userUid,
        RoomId: currentRoom.id,
        StartTime: startTime.toISOString(),
        EndTime: endTime.toISOString(),
        // Статус и StaffUid заполняются на сервере
    };

    try {
        const response = await fetch('https://localhost:7123/api/BookingsAdvanced', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingRequest)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка сервера: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('Бронь создана:', result);

        // 4. Сохранение данных для отображения (frontend history)
        const displayData = {
            bookingId: result.bookingUid,
            itemId: currentRoom.id,
            instrumentName: currentRoom.name,
            itemName: currentRoom.name,
            itemType: 'Room',
            image: currentRoom.image,

            // Сохраняем красивые строки для вывода
            date: dateStr,
            time: timeStr, // Добавили время для отображения
            hours: hours,
            pricePerHour: currentRoom.price,
            totalPrice: parseInt(document.getElementById('total-price').textContent),
            bookingDate: new Date().toISOString()
        };

        // Сохраняем в SessionStorage для страницы "Заказ"
        sessionStorage.setItem('currentBooking', JSON.stringify(displayData));

        // Сохраняем в историю пользователя
        const storageKey = `bookingHistory_${userData.email}`;
        let history = JSON.parse(localStorage.getItem(storageKey) || '[]');
        history.push(displayData);
        localStorage.setItem(storageKey, JSON.stringify(history));

        // Переход
        window.location.href = 'order.html';

    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при бронировании. Проверьте соединение или авторизацию.');
    }
}

// Вспомогательные функции
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function updatePageTitle(name) {
    document.title = `${name} - Бронирование помещения`;
}

function showNotFound() {
    document.querySelector('.main').innerHTML = '<h2 style="text-align:center; margin-top:50px;">Помещение не найдено</h2>';
}

function initNavigation() {
    const menuItems = document.querySelectorAll('.menu__item, .footer_menu__item');
    menuItems.forEach(item => {
        item.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('javascript')) return;
            e.preventDefault();
            if (href) window.location.href = href;
        });
    });
}