document.addEventListener('DOMContentLoaded', function () {
    initFilters();
    initSearch();
    initSorting();
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

function naturalCompare(a, b) {
    const ax = [], bx = [];

    // Разбиваем строки на числовые и текстовые части
    a.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
        ax.push([$1 || Infinity, $2 || ""]);
    });

    b.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
        bx.push([$1 || Infinity, $2 || ""]);
    });

    while (ax.length && bx.length) {
        const an = ax.shift();
        const bn = bx.shift();
        const nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1], 'ru');
        if (nn) return nn;
    }

    return ax.length - bx.length;
}

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
        console.log('Получены данные:', data);

        if (!Array.isArray(data)) {
            throw new Error('API вернул не массив данных');
        }

        roomsData = data.map(item => {
            // Получаем данные о типе по ID (1, 2 или 3)
            const typeInfo = roomTypesMap[item.roomTypeId] || { name: "Неизвестно", price: 0, desc: "" };

            return {
                id: item.roomId,
                name: item.name || 'Без названия',
                category: typeInfo.name,
                price: typeInfo.price,
                description: typeInfo.desc,
                isFree: item.isFree,
                image: getRoomImage(item.roomTypeId),
                roomTypeId: item.roomTypeId
            };
        });

        roomsData.sort((a, b) => {
            // Сначала по типу комнаты
            if (a.roomTypeId !== b.roomTypeId) {
                return a.roomTypeId - b.roomTypeId;
            }
            // Затем по имени с натуральной сортировкой
            return naturalCompare(a.name, b.name);
        });

        console.log('Обработанные данные:', roomsData);

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

const roomImageCollections = {
    1: [ // Лаунж-зона
        "img/rooms/lounge/lounge.jpeg",
        "img/rooms/lounge/lounge_2.jpeg",
        "img/rooms/lounge/lounge_3.jpeg"
    ],
    2: [ // Студия звукозаписи
        "img/rooms/studios/studio.jpeg",
        "img/rooms/studios/studio_2.jpeg",
        "img/rooms/studios/studio_3.jpeg",
    ],
    3: [ // Репетиционный зал
        "img/rooms/rehearsal_rooms/rehearsal_room.jpeg",
        "img/rooms/rehearsal_rooms/rehearsal_room_2.jpeg",
        "img/rooms/rehearsal_rooms/rehearsal_room_3.jpeg"
    ]
};

// Счетчики для каждого типа комнат
let roomCounters = {
    1: 0, // Лаунж-зона
    2: 0, // Студия
    3: 0  // Репетиционный зал
};

function getRoomImage(typeId) {
    const images = roomImageCollections[typeId];

    if (!images || images.length === 0) {
        return getDefaultImage(typeId);
    }

    // Получаем текущий счетчик для этого типа
    const currentIndex = roomCounters[typeId] || 0;

    // Выбираем изображение по порядку
    const selectedImage = images[currentIndex % images.length];

    // Увеличиваем счетчик для следующей комнаты этого типа
    roomCounters[typeId] = currentIndex + 1;

    return selectedImage;
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

function initSorting() {
    const sortContainer = document.getElementById('sort-container');
    if (!sortContainer) {
        // Создаем контейнер, если его нет
        const filterSection = document.querySelector('.filters-section');
        if (filterSection) {
            sortContainer = document.createElement('div');
            sortContainer.id = 'sort-container';
            sortContainer.style.cssText = 'margin: 15px 0; text-align: right;';
            filterSection.appendChild(sortContainer);
        } else {
            return;
        }
    }

    sortContainer.innerHTML = `
        <select id="sort-select" style="padding:5px 10px; border-radius:4px; border:1px solid #ddd;">
            <option value="name-asc">По имени (А-Я)</option>
            <option value="name-desc">По имени (Я-А)</option>
            <option value="price-asc">По цене (возр.)</option>
            <option value="price-desc">По цене (убыв.)</option>
            <option value="category">По категории</option>
        </select>
    `;

    document.getElementById('sort-select').addEventListener('change', applyFilters);
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

    const sortSelect = document.getElementById('sort-select');
    const sortValue = sortSelect ? sortSelect.value : 'name-asc';

    // СОРТИРОВКА
    let sortedRooms = [...filteredRooms];

    switch (sortValue) {
        case 'name-asc':
            sortedRooms.sort((a, b) => naturalCompare(a.name, b.name));
            break;
        case 'name-desc':
            sortedRooms.sort((a, b) => naturalCompare(b.name, a.name));
            break;
        case 'price-asc':
            sortedRooms.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            sortedRooms.sort((a, b) => b.price - a.price);
            break;
        case 'category':
            sortedRooms.sort((a, b) => {
                const catOrder = { "Лаунж-зона": 1, "Студия звукозаписи": 2, "Репетиционный зал": 3 };
                const catA = catOrder[a.category] || 99;
                const catB = catOrder[b.category] || 99;
                return catA - catB || naturalCompare(a.name, b.name);
            });
            break;
    }

    renderRooms(sortedRooms);
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
        <div style="position: relative; height: 120px; overflow: hidden; border-radius: 4px; background: #f5f5f5;">
            <img src="${room.image}" alt="${room.name}" 
                 style="width: 100%; height: 100%; object-fit: cover;"
                 onerror="this.src='img/room_default.png'">
            <div style="position: absolute; top: 8px; right: 8px; background: ${statusColor}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.75em; font-weight: bold;">
                ${statusText}
            </div>
        </div>
        
        <h3 style="margin: 10px 0 5px 0; font-size: 1.1em; height: 40px; overflow: hidden;">${room.name}</h3>
        
        <div style="color: #666; font-size: 0.9em; margin-bottom: 5px; font-weight:bold;">
            ${room.category}
        </div>

        <p style="font-size: 0.75em; color: #666; height: 40px; overflow: hidden; margin-bottom:10px; line-height:1.4;">
            ${room.description}
        </p>

        <div style="margin-top: auto;">
            <a href="room.html?id=${room.id}" 
               style="color: #e44d26; font-weight: bold; font-size: 1.1em; text-decoration: none; display: block; padding: 8px 0;">
                ${room.price} ₽/час
            </a>
            <small style="color: #888; font-size: 0.8em;">Нажмите для бронирования</small>
        </div>
    `;

    cardContainer.addEventListener('click', function (e) {
        if (e.target.tagName !== 'A') {
            // Сохраняем выбранное изображение
            sessionStorage.setItem('selectedRoomImage', room.image);
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
        'lounge': 'Лаунж-зона',
        'recording': 'Студия звукозаписи',
        'rehearsal': 'Репетиционный зал'
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