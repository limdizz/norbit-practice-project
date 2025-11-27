document.addEventListener('DOMContentLoaded', function () {
    initFilters();
    initSearch();
    loadRoomsFromApi();
    initPriceRange();
    initNavigation();
});

// Глобальная переменная для данных
let roomsData = [];

// Данные из SQL "room_type", так как API возвращает только ID
const roomTypesMap = {
    1: { name: "Лаунж-зона", price: 1000, desc: "Зона отдыха с мягкой мебелью" },
    2: { name: "Студия звукозаписи", price: 1000, desc: "Комната для записи вокала и инструментов" },
    3: { name: "Репетиционный зал", price: 750, desc: "Для подготовки к выступлениям" }
};

async function loadRoomsFromApi() {
    const productList = document.querySelector('.product-list');
    productList.innerHTML = '<p style="text-align:center;">Загрузка помещений...</p>';

    try {
        // Обращаемся к вашему контроллеру RoomsController
        const response = await fetch('https://localhost:7123/api/Rooms');

        if (!response.ok) {
            throw new Error('Ошибка сети: ' + response.status);
        }

        const data = await response.json();

        roomsData = data.map(item => {
            // Получаем данные о типе по ID (1, 2 или 3)
            const typeInfo = roomTypesMap[item.roomTypeId] || { name: "Неизвестно", price: 0, desc: "" };

            return {
                id: item.roomId,
                name: item.name,
                // Маппим данные из таблицы RoomTypes
                category: typeInfo.name,
                price: typeInfo.price,
                description: typeInfo.desc,
                // Свойство isFree приходит как boolean (true/false)
                isFree: item.isFree,
                // Заглушка для изображения в зависимости от типа
                image: getRoomImage(item.roomTypeId)
            };
        });

        // Обработка URL параметров (если перешли из футера)
        handleUrlParams();

        // Применяем фильтры
        applyFilters();

        // Обновляем ползунок цен
        updatePriceRange();

    } catch (error) {
        console.error('Ошибка при загрузке помещений:', error);
        productList.innerHTML = '<p style="text-align:center; color:red;">Не удалось загрузить список помещений.</p>';
    }
}

function getRoomImage(typeId) {
    // Возвращаем разные заглушки в зависимости от типа комнаты
    switch (typeId) {
        case 1: return "img/file_not_found.png"; // Лаунж
        case 2: return "img/file_not_found.png"; // Студия
        case 3: return "img/file_not_found.png"; // Репетиционная
        default: return "img/room_default.png";
    }
}

function initFilters() {
    const categorySelect = document.getElementById('categories');
    const availabilityCheckbox = document.querySelector('input[name="availability"]');

    if (categorySelect) categorySelect.addEventListener('change', applyFilters);
    if (availabilityCheckbox) availabilityCheckbox.addEventListener('change', applyFilters);
}

function initSearch() {
    const searchInput = document.getElementById('site-search');
    const searchButton = document.getElementById('search-button');

    if (!searchInput || !searchButton) return;

    searchInput.addEventListener('input', debounce(applyFilters, 300));

    searchButton.addEventListener('click', function (e) {
        e.preventDefault();
        applyFilters();
    });

    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyFilters();
        }
    });
}

function initPriceRange() {
    const priceContainer = document.getElementById('price-container');
    if (!priceContainer) return;

    const priceRange = document.createElement('input');
    priceRange.type = 'range';
    priceRange.min = 0;
    priceRange.max = 5000;
    priceRange.value = 5000;
    priceRange.id = 'price-range';

    const priceDisplay = document.createElement('span');
    priceDisplay.className = 'price-display';
    priceDisplay.textContent = `Загрузка...`;

    priceContainer.appendChild(priceRange);
    priceContainer.appendChild(priceDisplay);

    priceRange.addEventListener('input', function () {
        priceDisplay.textContent = `до ${this.value} ₽/час`;
        debounce(applyFilters, 300)();
    });
}

function updatePriceRange() {
    const priceRange = document.getElementById('price-range');
    const priceDisplay = document.querySelector('.price-display');

    if (priceRange && roomsData.length > 0) {
        const maxPriceValue = Math.max(...roomsData.map(i => i.price), 1500);
        priceRange.max = maxPriceValue;
        priceRange.value = maxPriceValue;
        priceDisplay.textContent = `до ${priceRange.value} ₽/час`;
    }
}

function applyFilters() {
    const categoryEl = document.getElementById('categories');
    const searchEl = document.getElementById('site-search');
    const priceRangeEl = document.getElementById('price-range');
    const availabilityEl = document.querySelector('input[name="availability"]');

    const selectedCategory = categoryEl ? categoryEl.value : "Все";
    const searchTerm = (searchEl ? searchEl.value : '').trim().toLowerCase();
    const maxPrice = priceRangeEl ? parseInt(priceRangeEl.value, 10) : Infinity;
    const onlyFree = availabilityEl ? availabilityEl.checked : false;

    const filteredRooms = roomsData.filter(room => {
        // Категория
        if (selectedCategory !== "Все" && room.category !== selectedCategory) {
            return false;
        }

        // Поиск по имени
        if (searchTerm && !room.name.toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Цена
        if (room.price > maxPrice) {
            return false;
        }

        // Доступность (isFree)
        if (onlyFree && !room.isFree) {
            return false;
        }

        return true;
    });

    renderRooms(filteredRooms);
}

function renderRooms(rooms) {
    const productList = document.querySelector('.product-list');
    if (!productList) return;

    productList.innerHTML = '';

    if (rooms.length === 0) {
        productList.innerHTML = '<p style="text-align:center; padding:20px; width:100%;">Помещения не найдены по заданным параметрам.</p>';
        return;
    }

    rooms.forEach(room => {
        const card = createRoomCard(room);
        productList.appendChild(card);
    });
}

function createRoomCard(room) {
    const cardContainer = document.createElement('div');
    cardContainer.className = 'instrument-card';
    cardContainer.style.cssText = `
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 15px;
                margin: 10px;
                text-align: center;
                background: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                cursor: pointer;
                transition: transform 0.2s;
                display: inline-block;
                vertical-align: top;
                width: 200px;
                height: 320px;
            `;

    const statusColor = room.isFree ? '#4CAF50' : '#F44336';
    const statusText = room.isFree ? 'Свободно' : 'Занято';

    cardContainer.innerHTML = `
                <img src="${room.image}" alt="${room.name}" 
                     style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; background: #eee;">
                
                <h3 style="margin: 10px 0 5px 0; font-size: 1.1em;">${room.name}</h3>
                
                <div style="color: #666; font-size: 0.9em; margin-bottom: 5px; font-weight:bold;">
                    ${room.category}
                </div>

                <div style="margin-bottom: 10px;">
                    <span style="background: ${statusColor}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.8em;">
                        ${statusText}
                    </span>
                </div>

                <p style="font-size: 0.75em; color: #888; height: 40px; overflow: hidden; margin-bottom:10px;">
                    ${room.description}
                </p>

                <a href="room.html?id=${room.id}" 
                   style="color: #e44d26; font-weight: bold; font-size: 1.1em; text-decoration: none;">
                    ${room.price} ₽/час
                </a>
            `;

    cardContainer.addEventListener('click', function (e) {
        // Если кликнули НЕ по ссылке (цене), то переходим скриптом
        if (e.target.tagName !== 'A') {
            window.location.href = `room.html?id=${room.id}`;
        }
    });

    return cardContainer;
}

function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');

    const categorySelect = document.getElementById('categories');
    if (!categorySelect || !type) return;

    const map = {
        'recording': 'Студия звукозаписи',
        'rehearsal': 'Репетиционный зал',
        'lounge': 'Лаунж-зона'
    };

    const target = map[type];
    if (target) {
        categorySelect.value = target;
    }
}

function initNavigation() {
    // Стандартная навигация, аналогично instruments.js
    const menuItems = document.querySelectorAll('.menu__item, .footer_menu__item');
    menuItems.forEach(item => {
        // Если у ссылки есть href, браузер сам перейдет, 
        // JS нужен только если мы хотим SPA поведение или кастомные действия
    });
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}