document.addEventListener('DOMContentLoaded', function () {
    initFilters();
    initSearch();
    initSorting();
    loadRoomsFromApi();
    initPriceRange();
    initNavigation();
    initDateFilter();
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
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const userId = userData.userUid || userData.uid || userData.id;

        if (userId) {
            try {
                const subResponse = await fetch(`https://localhost:7123/api/UserSubscriptionsAdvanced/active/${userId}`);
                if (subResponse.ok) {
                    const activeSub = await subResponse.json();
                    // Учитываем разные форматы ответа C# API
                    const discount = activeSub.plan?.discountPercentage ||
                        activeSub.discountPercentage ||
                        activeSub.Plan?.DiscountPercentage || 0;
                    localStorage.setItem('userDiscount', discount);
                    console.log('Скидка загружена:', discount);
                } else if (subResponse.status === 404) {
                    localStorage.setItem('userDiscount', '0');
                    console.log('Активная подписка не найдена, скидка сброшена');
                }
            } catch (e) {
                console.warn("Не удалось получить скидку: ", e);
            }
        }
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
            const roomName = item.name || 'Без названия';

            return {
                id: item.roomId,
                name: roomName || 'Без названия',
                category: typeInfo.name,
                price: typeInfo.price,
                description: typeInfo.desc,
                isFree: item.isFree,
                image: getRoomImageByTypeAndName(item.roomTypeId, roomName),
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

function getRoomImageByTypeAndName(typeId, roomName) {
    const images = roomImageCollections[typeId];

    if (!images || images.length === 0) {
        return 'img/rooms/default_room.jpg';
    }

    // Ищем номер в названии (например "Lounge 1", "Studio 2", "Rehearsal Room 3")
    let index = 0;
    const numberMatch = roomName.match(/\d+$/);
    if (numberMatch) {
        const num = parseInt(numberMatch[0], 10);
        // Индекс = (номер - 1) % количество изображений
        index = (num - 1) % images.length;
    } else {
        // Если нет номера, используем первый индекс
        index = 0;
    }

    return images[index];
}

function getRoomImage(roomTypeId, roomName) {
    return getRoomImageByTypeAndName(roomTypeId, roomName);
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

    searchButton.addEventListener('mouseenter', function () {
        this.style.color = 'black';
        this.style.backgroundColor = 'white';
        this.style.transition = '0.3s';
    });

    searchButton.addEventListener('mouseleave', function () {
        this.style.backgroundColor = 'black';
        this.style.color = 'white';
        this.style.transition = '0.3s';
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



let availabilityFilter = { enabled: false, date: null, availableIds: [] };

function initDateFilter() {
    const dateInput = document.getElementById('availability-date');
    const startTimeSelect = document.getElementById('start-time');
    const endTimeSelect = document.getElementById('end-time');
    const clearButton = document.getElementById('clear-date-filter');

    if (!dateInput) return;

    // Функция проверки валидности времени
    function validateTime(startTime, endTime) {
        if (!startTime || !endTime) return true;
        return startTime < endTime;
    }

    // Функция обновления доступных опций времени
    function updateTimeOptions() {
        if (!startTimeSelect || !endTimeSelect) return;

        const startHour = parseInt(startTimeSelect.value.split(':')[0]);
        const endHour = parseInt(endTimeSelect.value.split(':')[0]);

        // Обновляем опции для end-time (минимальное значение = start-time + 1 час)
        Array.from(endTimeSelect.options).forEach(option => {
            const optionHour = parseInt(option.value.split(':')[0]);
            if (optionHour <= startHour) {
                option.disabled = true;
                option.style.color = '#ccc';
            } else {
                option.disabled = false;
                option.style.color = '';
            }
        });

        // Если текущий end-time меньше start-time, устанавливаем корректное значение
        if (endHour <= startHour) {
            const nextHour = startHour + 1;
            const nextHourStr = `${nextHour.toString().padStart(2, '0')}:00`;
            if (Array.from(endTimeSelect.options).some(opt => opt.value === nextHourStr)) {
                endTimeSelect.value = nextHourStr;
            }
        }
    }

    async function applyAvailabilityFilter() {
        if (!dateInput.value || !startTimeSelect?.value || !endTimeSelect?.value) {
            availabilityFilter.enabled = false;
            availabilityFilter.date = null;
            availabilityFilter.startTime = null;
            availabilityFilter.endTime = null;
            availabilityFilter.availableIds = [];
            if (clearButton) clearButton.style.display = 'none';
            applyFilters();
            return;
        }

        const selectedDate = new Date(dateInput.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            alert('Нельзя выбрать прошедшую дату');
            dateInput.value = '';
            availabilityFilter.enabled = false;
            if (clearButton) clearButton.style.display = 'none';
            applyFilters();
            return;
        }

        const startTime = startTimeSelect.value;
        const endTime = endTimeSelect.value;

        if (!validateTime(startTime, endTime)) {
            alert('Время начала должно быть раньше времени окончания');
            return;
        }

        const productList = document.querySelector('.product-list');
        if (productList) {
            productList.innerHTML = '<p style="text-align:center;">Проверка доступности...</p>';
        }

        availabilityFilter.enabled = true;
        availabilityFilter.date = dateInput.value;
        availabilityFilter.startTime = startTime;
        availabilityFilter.endTime = endTime;

        await loadAvailableRoomSlots(dateInput.value, startTime, endTime);
    }

    // Слушаем изменения
    dateInput.addEventListener('change', applyAvailabilityFilter);
    if (startTimeSelect) {
        startTimeSelect.addEventListener('change', () => {
            updateTimeOptions();
            applyAvailabilityFilter();
        });
    }
    if (endTimeSelect) {
        endTimeSelect.addEventListener('change', applyAvailabilityFilter);
    }

    if (clearButton) {
        clearButton.addEventListener('click', function () {
            dateInput.value = '';
            if (startTimeSelect) startTimeSelect.value = '10:00';
            if (endTimeSelect) endTimeSelect.value = '20:00';
            availabilityFilter.enabled = false;
            availabilityFilter.date = null;
            availabilityFilter.startTime = null;
            availabilityFilter.endTime = null;
            availabilityFilter.availableIds = [];
            clearButton.style.display = 'none';
            updateTimeOptions();
            applyFilters();
        });
    }

    // Инициализация
    updateTimeOptions();
}

async function loadAvailableRoomSlots(date, startTime, endTime) {
    try {
        const response = await fetch(
            `https://localhost:7123/api/BookingsAdvanced/available-room-slots?date=${date}&startTime=${startTime}&endTime=${endTime}`
        );
        if (!response.ok) throw new Error('Ошибка загрузки');

        const data = await response.json();
        availabilityFilter.availableIds = data.availableRoomIds || [];

        console.log(`Доступно помещений на ${date} с ${startTime} до ${endTime}: ${availabilityFilter.availableIds.length}`);

        const clearButton = document.getElementById('clear-date-filter');
        if (clearButton && availabilityFilter.enabled) {
            clearButton.style.display = 'inline-block';
        }

        applyFilters();

    } catch (error) {
        console.error('Ошибка при загрузке доступных помещений:', error);
        alert('Не удалось загрузить информацию о доступности');
        availabilityFilter.enabled = false;
        const clearButton = document.getElementById('clear-date-filter');
        if (clearButton) clearButton.style.display = 'none';
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

        if (availabilityFilter.enabled && availabilityFilter.availableIds.length > 0) {
            if (!availabilityFilter.availableIds.includes(room.id)) {
                return false;
            }
        }

        return true;
    });

    renderRooms(filteredRooms);
    addAvailabilityFilterInfo();

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

function addAvailabilityFilterInfo() {
    const productList = document.querySelector('.product-list');
    if (!productList) return;

    const oldInfo = document.querySelector('.availability-filter-info');
    if (oldInfo) oldInfo.remove();

    if (availabilityFilter.enabled && availabilityFilter.date) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'availability-filter-info';
        infoDiv.style.cssText = 'margin-bottom: 15px; padding: 10px; background: #fafafa; border-radius: 8px; text-align: center;';
        infoDiv.innerHTML = ` <strong>Фильтр по дате и времени:</strong> показаны только помещения, свободные <strong>${formatDateForDisplay(availabilityFilter.date)} с ${availabilityFilter.startTime} до ${availabilityFilter.endTime}</strong>`;
        productList.parentNode.insertBefore(infoDiv, productList);
    }
}

function formatDateForDisplay(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
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

    // Добавляем карточку для добавления нового помещения
    const addCard = document.createElement('div');
    addCard.className = 'instrument-card';
    addCard.style.cssText = `
        border: 1px solid #ddd;
        border-radius: 8px;
        font-family: Inter;
        padding: 15px;
        margin: 10px;
        text-align: center;
        background: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        display: inline-block;
        vertical-align: top;
        width: 200px;
        height: 320px;
        background-color: #f8f9fa;
        flex: 0 0 auto;
    `;

    addCard.innerHTML = `
        <div style="width: 100px; height: 150px; display: flex; align-items: center; justify-content: center; margin: 0 auto; background-color: #e9ecef; border-radius: 4px;">
            <span style="font-size: 48px; color: #6c757d;">+</span>
        </div>
        <h3 style="margin: 10px 0 5px 0; color: #333; font-size: 1em;">Добавить помещение</h3>
        <div style="color: #666; font-size: 0.8em; margin-bottom: 8px;">
            <span class="condition-badge" style="background: black; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75em;">
                Новое
            </span>
        </div>
        <div style="color: #888; font-size: 0.75em; margin-bottom: 5px;">
            Нажмите для добавления
        </div>
        <div style="color: black; font-weight: bold; font-size: 1em;">
            ₽0
        </div>
    `;

    // Показываем карточку только для сотрудников (staff)
    const isStaff = localStorage.getItem('isStaff') === 'true';
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    addCard.style.display = (isLoggedIn && isStaff) ? 'block' : 'none';

    // Добавляем обработчик клика
    addCard.addEventListener('click', function (e) {
        e.preventDefault();
        showAddRoomForm();
    });

    addCard.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    });

    addCard.addEventListener('mouseleave', function () {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });

    productList.appendChild(addCard);
}

function createRoomCard(room) {
    const discountPercent = parseInt(localStorage.getItem('userDiscount') || '0');
    console.log(`createRoomCard: room=${room.name}, userDiscount=${discountPercent}`);
    let priceDisplayHtml = `${room.price} ₽/час`;

    if (discountPercent > 0) {
        const discountedPrice = Math.round(room.price * (1 - discountPercent / 100));
        priceDisplayHtml = `
            <span style="text-decoration: line-through; color: #888; font-size: 0.8em;">${room.price} ₽</span>
            <span style="color: black;">${discountedPrice} ₽/час</span>
            <div style="color: black; font-size: 0.75em; font-weight: normal; margin-top: 2px;">Скидка ${discountPercent}%</div>
        `;
    }

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
        position: relative;
    `;

    const statusColor = room.isFree ? '#000' : '#F44336';
    const statusText = room.isFree ? 'Свободно' : 'Занято';

    // Получаем статус staff
    const isStaff = localStorage.getItem('isStaff') === 'true';
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    // Крестик (виден только staff)
    const deleteButtonHtml = (isLoggedIn && isStaff) ? `
        <button class="delete-room" data-id="${room.id}"
                style="position: absolute; top: 8px; right: 8px; width: 22px; height: 22px;
                       background: rgba(255,0,0,0.7); color: white; border: none; border-radius: 50%;
                       font-size: 14px; font-weight: bold; cursor: pointer; z-index: 10;">
            ×
        </button>
    ` : '';

    cardContainer.innerHTML = `
        ${deleteButtonHtml}
        <div style="position: relative; height: 120px; overflow: hidden; border-radius: 4px; background: #f5f5f5;">
            <img src="${room.image}" alt="${room.name}" 
                 style="width: 100%; height: 100%; object-fit: cover;"
                 onerror="this.src='img/room_default.png'">
            <div style="position: absolute; top: 8px; right: 8px; background: ${statusColor}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.75em; font-weight: bold; z-index: 1;">
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
               style="color: black; font-weight: bold; font-size: 1.1em; text-decoration: none; display: block; padding: 8px 0;">
                ${priceDisplayHtml}
            </a>
            <small style="color: #888; font-size: 0.8em;">Нажмите для бронирования</small>
        </div>
    `;

    // Обработчик клика по карточке
    cardContainer.addEventListener('click', function (e) {
        if (e.target.tagName !== 'A' && !e.target.classList.contains('delete-room')) {
            sessionStorage.setItem('selectedRoomImage', room.image);
            window.location.href = `room.html?id=${room.id}`;
        }
    });

    cardContainer.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    });

    cardContainer.addEventListener('mouseleave', function () {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });

    // Обработчик удаления
    const deleteBtn = cardContainer.querySelector('.delete-room');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function (e) {
            e.stopPropagation(); // Не срабатывает переход по карточке

            if (!confirm(`Вы действительно хотите удалить помещение "${room.name}"?`)) return;

            try {
                const response = await fetch(`https://localhost:7123/api/Rooms/${room.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Ошибка при удалении: ${response.status}`);
                }

                // Удаляем карточку из DOM
                cardContainer.remove();

                // Обновим глобальные данные
                roomsData = roomsData.filter(r => r.id !== room.id);

                alert('Помещение успешно удалено.');
            } catch (error) {
                console.error('Ошибка удаления:', error);
                alert('Не удалось удалить помещение.');
            }
        });
    }

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

function showAddRoomForm() {
    // Создаем модальное окно добавления
    const modalHtml = `
    <div id="add-room-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; font-family: Inter;">
        <div style="background: white; padding: 20px; border-radius: 8px; width: 400px; max-width: 90vw;">
            <h3 style="margin-top: 0;">Добавить новое помещение</h3>
            <form id="add-room-form">
                <div style="margin-bottom: 10px;">
                    <label for="new-name" style="display: inline-block; width: 120px">Название:</label>
                    <input type="text" id="new-name" name="name" required style="width: 200px; padding: 5px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label for="new-roomTypeId" style="display: inline-block; width: 120px;">Тип помещения:</label>
                    <select id="new-roomTypeId" name="roomTypeId" required style="width: 200px; padding: 5px;">
                        <option value="1">Лаунж-зона</option>
                        <option value="2">Студия звукозаписи</option>
                        <option value="3">Репетиционный зал</option>
                    </select>
                </div>
                <div style="margin-bottom: 10px;">
                    <label for="new-isFree" style="display: inline-block; width: 120px;">Свободно для аренды:</label>
                    <input type="checkbox" id="new-isFree" name="isFree" checked>
                </div>
                <div style="margin-top: 15px; text-align: right;">
                    <button type="button" id="cancel-add">Отмена</button>
                    <button type="submit" id="submit-add">Сохранить</button>
                </div>
            </form>
        </div>
    </div>`;

    // Вставляем модальное окно в body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Настраиваем кнопки
    const modal = document.getElementById('add-room-modal');
    const form = document.getElementById('add-room-form');
    const cancelButton = document.getElementById('cancel-add');

    cancelButton.addEventListener('click', function () {
        document.body.removeChild(modal);
    });

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData(form);
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
                const text = await response.text();
                try {
                    const error = JSON.parse(text);
                    throw new Error(error.message || error.error || 'Ошибка при добавлении помещения');
                } catch (e) {
                    throw new Error(`Ошибка сервера: ${response.status} - ${text}`);
                }
            }

            // Удаляем модальное окно
            document.body.removeChild(modal);

            // Обновление списка
            loadRoomsFromApi();

            alert('Помещение успешно добавлено!');
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось добавить помещение: ' + error.message);
        }
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