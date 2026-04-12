document.addEventListener('DOMContentLoaded', function () {
    console.log('Страница помещения загружается...');
    initializePage();
});

let currentRoom = null;
let roomEquipment = [];
let allEquipment = [];

// Занятые интервалы для текущего помещения (для отключения конфликтных слотов)
let roomBookings = [];
let roomBookingsLoaded = false;
let isUpdatingTimeSelect = false;
let roomBaseStatusHTML = '';

// Выбранное дополнительное оборудование
let selectedAdditionalEquipment = [];

function setRoomBookButtonState(enabled, statusText) {
    const btn = document.getElementById('book_button');
    if (!btn) return;

    if (!enabled) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        const statusEl = document.getElementById('room-status');
        if (statusEl) {
            statusEl.innerHTML = statusText || '<span style="color:#e44d26">Занято на выбранное время</span>';
        }
    } else {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        const statusEl = document.getElementById('room-status');
        if (statusEl) {
            statusEl.innerHTML = roomBaseStatusHTML || '';
        }
    }
}

function isRoomSelectionConflicting() {
    if (!roomBookingsLoaded) return false;
    if (!Array.isArray(roomBookings) || roomBookings.length === 0) return false;

    const dateStr = document.getElementById('booking_date')?.value;
    const timeStr = document.getElementById('booking_time')?.value;
    const hoursStr = document.getElementById('booking_hours')?.value;

    if (!dateStr || !timeStr || !hoursStr) return true;

    const [day, month, year] = dateStr.split('.').map(Number);
    const [bookingHour, bookingMinute] = timeStr.split(':').map(Number);
    const hours = parseInt(hoursStr);
    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return true;
    if (Number.isNaN(bookingHour) || Number.isNaN(bookingMinute)) return true;
    if (Number.isNaN(hours) || hours <= 0) return true;

    const startCandidate = new Date(year, month - 1, day, bookingHour, bookingMinute, 0);
    const endCandidate = new Date(startCandidate);
    endCandidate.setHours(startCandidate.getHours() + hours);

    if (startCandidate >= endCandidate) return true;

    return roomBookings.some(b => {
        const bStart = new Date(b.startTime ?? b.StartTime);
        const bEnd = new Date(b.endTime ?? b.EndTime);
        if (Number.isNaN(bStart.getTime()) || Number.isNaN(bEnd.getTime())) return false;
        return startCandidate < bEnd && endCandidate > bStart;
    });
}

function updateRoomBookButtonBySelection() {
    const dateStr = document.getElementById('booking_date')?.value;
    const timeStr = document.getElementById('booking_time')?.value;
    const hoursStr = document.getElementById('booking_hours')?.value;

    if (!dateStr || !timeStr || !hoursStr) {
        setRoomBookButtonState(false, 'Выберите дату и время');
        return;
    }

    const timeSelect = document.getElementById('booking_time');
    if (timeSelect && timeSelect.selectedOptions && timeSelect.selectedOptions.length > 0) {
        const opt = timeSelect.selectedOptions[0];
        if (opt && opt.disabled) {
            setRoomBookButtonState(false, 'Выбранное время занято');
            return;
        }
    }

    const conflicts = isRoomSelectionConflicting();
    if (conflicts) {
        setRoomBookButtonState(false, 'Занято на выбранное время');
    } else {
        setRoomBookButtonState(true);
    }
}

const roomTypesMap = {
    1: {
        name: "Лаунж-зона",
        price: 1000,
        desc: "Уютная зона отдыха с мягкой мебелью, баром и расслабляющей атмосферой. Идеально для перерывов между репетициями.",
        features: ["Мягкие диваны", "Wi-Fi", "Барная стойка", "TV", "Игровая приставка"]
    },
    2: {
        name: "Студия звукозаписи",
        price: 1000,
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

        updateBookingButton();
        calculatePrice();

        try {
            const bookingsResp = await fetch(`https://localhost:7123/api/BookingsAdvanced/byRoom/${currentRoom.id}`);
            if (bookingsResp.ok) {
                roomBookings = await bookingsResp.json();
                roomBookingsLoaded = true;
            }
        } catch (e) {
            console.warn('Не удалось загрузить бронирования для проверки слотов:', e);
        }

        // Загружаем оборудование помещения и дополнительное оборудование
        await loadRoomEquipment(roomId);
        await loadAllEquipment();

        const dateSelect = document.getElementById('booking_date');
        if (dateSelect && dateSelect.value) {
            updateTimeSelect(dateSelect.value);
        }

    } catch (error) {
        console.error('Ошибка:', error);
        showNotFound();
    }
}

function mapApiDataToUi(item) {
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
        price: typeInfo.price,
        description: typeInfo.desc,
        features: typeInfo.features,
        isFree: item.isFree,
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

// === НОВЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С ОБОРУДОВАНИЕМ ===

/**
 * Загружает оборудование, которое входит в комплект помещения (из таблицы room_equipment)
 */
async function loadRoomEquipment(roomId) {
    try {
        // Используем новый эндпоинт с фильтрацией
        const response = await fetch(`https://localhost:7123/api/RoomEquipments/byRoom/${roomId}`);

        if (!response.ok) {
            console.warn('Не удалось загрузить оборудование помещения, статус:', response.status);
            roomEquipment = [];
            renderRoomEquipmentList();
            return;
        }

        const roomEquipmentLinks = await response.json();
        console.log('Загружены связи RoomEquipment для комнаты', roomId, ':', roomEquipmentLinks);

        if (!roomEquipmentLinks || roomEquipmentLinks.length === 0) {
            roomEquipment = [];
            renderRoomEquipmentList();
            return;
        }

        // Получаем детали оборудования по ID
        const equipmentPromises = roomEquipmentLinks.map(async (link) => {
            try {
                const eqResponse = await fetch(`https://localhost:7123/api/Equipments/${link.equipmentId}`);
                if (eqResponse.ok) {
                    const equipment = await eqResponse.json();
                    equipment.quantity = link.quantity || 1;
                    return equipment;
                }
            } catch (e) {
                console.warn(`Не удалось загрузить оборудование ID=${link.equipmentId}`, e);
            }
            return null;
        });

        const equipmentDetails = await Promise.all(equipmentPromises);
        roomEquipment = equipmentDetails.filter(eq => eq !== null);

        console.log('Загружено оборудование помещения:', roomEquipment);
        renderRoomEquipmentList();

    } catch (error) {
        console.error('Ошибка при загрузке оборудования помещения:', error);
        roomEquipment = [];
        renderRoomEquipmentList();
    }
}

/**
 * Отображает список оборудования, входящего в комплект
 */
function renderRoomEquipmentList() {
    const equipmentList = document.getElementById('room-equipment');
    if (!equipmentList) return;

    if (!roomEquipment || roomEquipment.length === 0) {
        equipmentList.innerHTML = '<li>Нет оборудования в комплекте</li>';
        return;
    }

    equipmentList.innerHTML = roomEquipment
        .map(eq => `<li>${escapeHtml(eq.name)} — ${eq.category || ''}</li>`)
        .join('');
}

/**
 * Загружает всё доступное оборудование для дополнительной аренды
 */
async function loadAllEquipment() {
    try {
        const response = await fetch('https://localhost:7123/api/Equipments');
        if (!response.ok) throw new Error('Ошибка загрузки оборудования');

        const allEq = await response.json();

        // Исключаем оборудование, которое уже есть в комплекте
        const roomEquipmentIds = roomEquipment.map(eq => eq.equipmentId);
        allEquipment = allEq.filter(eq =>
            eq.isRentable && !roomEquipmentIds.includes(eq.equipmentId)
        );

        renderAdditionalEquipmentList();

    } catch (error) {
        console.error('Ошибка при загрузке списка оборудования:', error);
        allEquipment = [];
    }
}

/**
 * Отображает список дополнительного оборудования с чекбоксами
 */
function renderAdditionalEquipmentList() {
    const container = document.getElementById('additional-equipment-container');
    if (!container) return;

    if (!allEquipment || allEquipment.length === 0) {
        container.innerHTML = '<p class="no-equipment">Нет доступного дополнительного оборудования</p>';
        return;
    }

    container.innerHTML = `
        <h4>Дополнительное оборудование (за отдельную плату):</h4>
        <div class="additional-equipment-list">
            ${allEquipment.map(eq => `
                <label class="equipment-checkbox">
                    <input type="checkbox" 
                           data-id="${eq.equipmentId}" 
                           data-name="${escapeHtml(eq.name)}"
                           data-price="${eq.rentalPrice}"
                           data-category="${escapeHtml(eq.category || '')}">
                    <span>${escapeHtml(eq.name)}</span>
                    <span class="equipment-price">+${eq.rentalPrice} ₽</span>
                </label>
            `).join('')}
        </div>
    `;

    // Добавляем обработчики для чекбоксов
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateSelectedEquipment();
            calculatePrice();
        });
    });
}

/**
 * Обновляет список выбранного дополнительного оборудования
 */
function updateSelectedEquipment() {
    selectedAdditionalEquipment = [];

    document.querySelectorAll('#additional-equipment-container input[type="checkbox"]:checked').forEach(checkbox => {
        selectedAdditionalEquipment.push({
            equipmentId: parseInt(checkbox.dataset.id),
            name: checkbox.dataset.name,
            price: parseFloat(checkbox.dataset.price),
            category: checkbox.dataset.category
        });
    });
}

/**
 * Возвращает общую стоимость дополнительного оборудования
 */
function getAdditionalEquipmentTotal() {
    return selectedAdditionalEquipment.reduce((sum, eq) => sum + eq.price, 0);
}

function initDateSelect() {
    const dateSelect = document.getElementById('booking_date');
    if (!dateSelect) return;

    dateSelect.innerHTML = '';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dateString = `${day}.${month}.${date.getFullYear()}`;

        const option = document.createElement('option');
        option.value = dateString;
        option.textContent = dateString;

        if (i === 0) {
            option.selected = true;
        }

        dateSelect.appendChild(option);
    }

    dateSelect.addEventListener('change', function () {
        updateTimeSelect(this.value);
    });

    updateTimeSelect(dateSelect.value);
}

function initTimeSelect() {
    const timeSelect = document.getElementById('booking_time');
    if (timeSelect) {
        timeSelect.addEventListener('change', function () {
            if (isUpdatingTimeSelect) return;
            validateDuration();
            calculatePrice();

            const dateSelect = document.getElementById('booking_date');
            if (dateSelect && dateSelect.value) {
                isUpdatingTimeSelect = true;
                updateTimeSelect(dateSelect.value);
                isUpdatingTimeSelect = false;
            }
        });
    }
}

function updateTimeSelect(selectedDate) {
    const timeSelect = document.getElementById('booking_time');
    if (!timeSelect) return;

    const now = new Date();
    const [day, month, year] = selectedDate.split('.').map(Number);
    const selectedDateObj = new Date(year, month - 1, day);
    const isToday = isSameDate(selectedDateObj, now);
    const startHour = 10;
    const endHour = 20;
    const closingHour = 21;

    const bookBtn = document.getElementById('book_button');
    const preserveValue = timeSelect.value;

    function buildTimeOptions({ disableConflicts }) {
        timeSelect.innerHTML = '';

        let firstEnabledValue = null;
        let selectedValue = null;

        for (let hour = startHour; hour <= endHour; hour++) {
            if (isToday && hour <= now.getHours()) {
                continue;
            }

            const hourString = String(hour).padStart(2, '0') + ':00';
            const option = document.createElement('option');
            option.value = hourString;
            option.textContent = hourString;

            const rawSelectedDuration = parseInt(document.getElementById('booking_hours')?.value) || 1;
            const maxHoursForThisStart = Math.min(Math.max(closingHour - hour, 1), 5);
            const durationForThisStart = Math.min(rawSelectedDuration, maxHoursForThisStart);

            let disabledByConflict = false;
            if (disableConflicts && roomBookingsLoaded && Array.isArray(roomBookings) && roomBookings.length > 0) {
                const startCandidate = new Date(year, month - 1, day, hour, 0, 0, 0);
                const endCandidate = new Date(startCandidate);
                endCandidate.setHours(endCandidate.getHours() + durationForThisStart);

                disabledByConflict = roomBookings.some(b => {
                    const bStart = new Date(b.startTime ?? b.StartTime);
                    const bEnd = new Date(b.endTime ?? b.EndTime);
                    if (Number.isNaN(bStart.getTime()) || Number.isNaN(bEnd.getTime())) return false;
                    return startCandidate < bEnd && endCandidate > bStart;
                });
            }

            if (disabledByConflict) {
                option.disabled = true;
                option.textContent = `${hourString} (занято)`;
            } else {
                if (firstEnabledValue === null) firstEnabledValue = hourString;
                if (preserveValue && preserveValue === hourString) selectedValue = hourString;
            }

            timeSelect.appendChild(option);
        }

        if (firstEnabledValue === null) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = isToday ? 'На сегодня времени нет' : 'На выбранную дату нет свободных слотов';
            option.disabled = true;
            option.selected = true;
            timeSelect.appendChild(option);

            if (bookBtn) {
                bookBtn.disabled = true;
                bookBtn.style.opacity = '0.5';
                bookBtn.style.cursor = 'not-allowed';
            }
            return false;
        }

        if (selectedValue) {
            timeSelect.value = selectedValue;
        } else {
            timeSelect.value = firstEnabledValue;
        }

        if (bookBtn) {
            bookBtn.disabled = false;
            bookBtn.style.opacity = '1';
            bookBtn.style.cursor = 'pointer';
        }

        return true;
    }

    if (!buildTimeOptions({ disableConflicts: false })) return;
    validateDuration();

    const chosenAfterPass1 = timeSelect.value;
    const success = buildTimeOptions({ disableConflicts: true });
    if (!success) return;

    if (timeSelect.value !== chosenAfterPass1) {
        validateDuration();
        const chosenAfterPass2 = timeSelect.value;
        buildTimeOptions({ disableConflicts: true });
        timeSelect.value = chosenAfterPass2;
        validateDuration();
    }

    updateRoomBookButtonBySelection();
}

function isSameDate(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
}

function initDurationSelect() {
    const hoursSelect = document.getElementById('booking_hours');
    if (hoursSelect) {
        hoursSelect.addEventListener('change', function () {
            if (isUpdatingTimeSelect) return;
            validateDuration();
            calculatePrice();

            const dateSelect = document.getElementById('booking_date');
            if (dateSelect && dateSelect.value) {
                isUpdatingTimeSelect = true;
                updateTimeSelect(dateSelect.value);
                isUpdatingTimeSelect = false;
            }
        });

        validateDuration();
    }
}

function validateDuration() {
    const dateStr = document.getElementById('booking_date').value;
    const timeStr = document.getElementById('booking_time').value;
    const hoursSelect = document.getElementById('booking_hours');

    if (!dateStr || !timeStr || !hoursSelect) return;

    const [day, month, year] = dateStr.split('.').map(Number);
    const [bookingHour, bookingMinute] = timeStr.split(':').map(Number);

    const closingHour = 21;
    let maxHours = closingHour - bookingHour;

    if (bookingMinute > 0) {
        maxHours--;
    }

    maxHours = Math.min(maxHours, 5);
    maxHours = Math.max(maxHours, 1);

    updateHoursOptions(maxHours, parseInt(hoursSelect.value));
    updateRoomBookButtonBySelection();
}

function updateHoursOptions(maxHours, currentValue) {
    const hoursSelect = document.getElementById('booking_hours');
    if (!hoursSelect) return;

    const oldValue = currentValue || parseInt(hoursSelect.value);
    hoursSelect.innerHTML = '';

    for (let i = 1; i <= maxHours; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} час${getHoursTextEnding(i)}`;
        hoursSelect.appendChild(option);
    }

    if (oldValue <= maxHours) {
        hoursSelect.value = oldValue;
    } else {
        hoursSelect.value = maxHours;
    }
}

function getHoursTextEnding(hours) {
    if (hours === 1) return '';
    if (hours >= 2 && hours <= 4) return 'а';
    return 'ов';
}

function calculatePrice() {
    if (!currentRoom) return;

    const hoursSelect = document.getElementById('booking_hours');
    const hours = hoursSelect ? parseInt(hoursSelect.value) : 1;

    const roomTotal = hours * currentRoom.price;
    const equipmentTotal = getAdditionalEquipmentTotal();
    const total = roomTotal + equipmentTotal;

    const totalEl = document.getElementById('total-price');
    if (totalEl) {
        totalEl.textContent = `${total} ₽`;
    }

    // Обновляем отображение цены за час
    const priceDisplay = document.getElementById('room-price-display');
    if (priceDisplay) {
        priceDisplay.textContent = `${currentRoom.price} ₽ / час`;
    }
}

function updateBookingButton() {
    const btn = document.getElementById('book_button');
    if (btn) {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', handleBooking);
    }
}

async function handleBooking() {
    if (!currentRoom) return;

    const dateStr = document.getElementById('booking_date').value;
    const timeStr = document.getElementById('booking_time').value;
    const hoursSelect = document.getElementById('booking_hours');
    const hours = parseInt(hoursSelect.value);

    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userUid = userData.userUid || userData.uid;

    if (!userData.email) {
        alert("Пожалуйста, войдите в систему для бронирования.");
        window.location.href = 'log_in.html';
        return;
    }

    const [day, month, year] = dateStr.split('.').map(Number);
    const [bookingHour, bookingMinute] = timeStr.split(':').map(Number);

    const startTime = new Date(year, month - 1, day, bookingHour, bookingMinute, 0);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + hours);

    if (startTime < new Date()) {
        alert("Нельзя забронировать помещение на прошедшее время.");
        return;
    }

    // Создаём уникальный массив ID оборудования
    const selectedEquipmentIds = [...new Set(selectedAdditionalEquipment.map(eq => eq.equipmentId))];

    const bookingRequest = {
        UserUid: userUid,
        RoomId: currentRoom.id,
        InstrumentId: null,
        StartTime: startTime.toISOString(),
        EndTime: endTime.toISOString(),
        SelectedEquipment: selectedEquipmentIds // Добавляем уникальные ID выбранного оборудования
    };

    const displayData = {
        bookingId: null,
        orderId: null,
        itemId: currentRoom.id,
        instrumentName: currentRoom.name,
        itemName: currentRoom.name,
        itemType: 'Room',
        image: currentRoom.image,
        date: dateStr,
        time: timeStr,
        hours: hours,
        pricePerHour: currentRoom.price,
        roomTotal: hours * currentRoom.price,
        equipmentTotal: getAdditionalEquipmentTotal(),
        totalPrice: (hours * currentRoom.price) + getAdditionalEquipmentTotal(),
        selectedEquipment: selectedAdditionalEquipment,
        bookingDate: new Date().toISOString()
    };

    sessionStorage.setItem('pendingBookingRequest', JSON.stringify(bookingRequest));
    sessionStorage.setItem('currentBooking', JSON.stringify(displayData));
    window.location.href = 'order.html';
}

function renderRoomDetails(room) {
    const img = document.getElementById('room-image');
    if (img) {
        img.src = room.image;
        img.alt = room.name;
    }

    setText('room-category', room.category);
    setText('room-name', room.name);
    setText('room-desc', room.description);
    setText('room-price-display', `${room.price} ₽ / час`);

    const featuresList = document.getElementById('room-features');
    if (featuresList) {
        featuresList.innerHTML = room.features
            .map(f => `<li>${escapeHtml(f)}</li>`)
            .join('');
    }

    const statusEl = document.getElementById('room-status');
    const btn = document.getElementById('book_button');
    if (statusEl) {
        if (!room.isFree) {
            statusEl.innerHTML = '<span style="color:red">Временно занято</span>';
            roomBaseStatusHTML = statusEl.innerHTML;

            if (btn) {
                btn.disabled = true;
                btn.style.background = '#ccc';
            }
        } else {
            statusEl.innerHTML = '<span style="color:green">Свободно для бронирования</span>';
            roomBaseStatusHTML = statusEl.innerHTML;
        }
    }
}

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

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}