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
        price: 1500, // Цена может отличаться, проверьте БД
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
        image: getRoomImage(item.roomTypeId)
    };
}

function getRoomImage(typeId) {
    switch (typeId) {
        case 1: return "img/file_not_found.png";
        case 2: return "img/file_not_found.png";
        case 3: return "img/file_not_found.png";
        default: return "img/room_default.png";
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

function handleBooking() {
    if (!currentRoom) return;

    const date = document.getElementById('booking_date').value;
    const hoursSelect = document.getElementById('booking_hours');
    const hours = hoursSelect.value; // Получаем значение часов
    const total = parseInt(document.getElementById('total-price').textContent);

    // 1. Получаем данные пользователя для уникального ключа истории
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userEmail = userData.email;

    if (!userEmail) {
        alert("Пожалуйста, войдите в систему для бронирования.");
        window.location.href = 'log_in.html';
        return;
    }

    // 2. Формируем объект бронирования
    // Добавляем поле instrumentName, чтобы order.js мог его прочитать по старой логике,
    // или используем itemName и дорабатываем order.js (сделаем второй вариант ниже)
    const bookingData = {
        bookingId: 'ROOM-' + Date.now(),
        itemId: currentRoom.id,
        // Сохраняем имя, цену и картинку
        instrumentName: currentRoom.name, // Используем этот ключ для совместимости с order.js
        itemName: currentRoom.name,       // Дублируем для ясности
        itemType: 'Room',                 // МЕТКА: Это помещение
        image: currentRoom.image,

        // Специфичные поля для комнат
        date: date,
        hours: hours,

        // Общие поля цены
        totalPrice: total,
        pricePerHour: currentRoom.price,

        bookingDate: new Date().toISOString()
    };

    // 3. Сохраняем текущее бронирование для страницы order.html
    sessionStorage.setItem('currentBooking', JSON.stringify(bookingData));

    // 4. Сохраняем в историю пользователя (изолированно)
    const storageKey = `bookingHistory_${userEmail}`;
    let history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    history.push(bookingData);
    localStorage.setItem(storageKey, JSON.stringify(history));

    // 5. Переход на страницу заказа
    window.location.href = 'order.html';
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
            // Логика перехода, если используете SPA, иначе браузер сам перейдет
            if (href) window.location.href = href;
        });
    });
}