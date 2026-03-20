document.addEventListener('DOMContentLoaded', function () {
    console.log('Страница помещения загружается...');
    initializePage();
});

let currentRoom = null;

// Занятые интервалы для текущего помещения (для отключения конфликтных слотов)
let roomBookings = [];
let roomBookingsLoaded = false;
let isUpdatingTimeSelect = false;
let roomBaseStatusHTML = '';

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
            // Возвращаем исходный статус помещения (свободно/временно занято)
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

    // Если текущий выбранный option отключен — сразу блокируем кнопку
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

        // Загружаем бронирования для отключения занятых слотов по времени
        try {
            const bookingsResp = await fetch(`https://localhost:7123/api/BookingsAdvanced/byRoom/${currentRoom.id}`);
            if (bookingsResp.ok) {
                roomBookings = await bookingsResp.json();
                roomBookingsLoaded = true;
            }
        } catch (e) {
            console.warn('Не удалось загрузить бронирования для проверки слотов:', e);
        }

        const dateSelect = document.getElementById('booking_date');
        if (dateSelect && dateSelect.value) {
            updateTimeSelect(dateSelect.value);
        }

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
    const endHour = 20; // Закрывается в 21:00
    const closingHour = 21;

    const bookBtn = document.getElementById('book_button');
    const preserveValue = timeSelect.value;

    // Быстро строим список вариантов, выбираем валидный вариант и подгоняем booking_hours
    function buildTimeOptions({ disableConflicts }) {
        timeSelect.innerHTML = '';

        let firstEnabledValue = null;
        let selectedValue = null;

        for (let hour = startHour; hour <= endHour; hour++) {
            if (isToday && hour <= now.getHours()) {
                continue; // Паст-слоты не показываем
            }

            const hourString = String(hour).padStart(2, '0') + ':00';
            const option = document.createElement('option');
            option.value = hourString;
            option.textContent = hourString;

            // Длительность для проверки конфликтов: учитываем ограничение по закрытию для конкретного часа
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

        // Если все слоты недоступны
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

        // Включаем кнопку, пока не проверили длительность/конфликты
        if (bookBtn) {
            bookBtn.disabled = false;
            bookBtn.style.opacity = '1';
            bookBtn.style.cursor = 'pointer';
        }

        return true;
    }

    // Пасс 1: без конфликтов (чтобы booking_hours точно соответствовали выбранному времени)
    if (!buildTimeOptions({ disableConflicts: false })) return;
    validateDuration();

    // Пасс 2: с отключением конфликтных слотов
    const chosenAfterPass1 = timeSelect.value;
    const success = buildTimeOptions({ disableConflicts: true });
    if (!success) return;

    // Если после отключения конфликтов выбранное время поменялось — пересчитаем booking_hours
    if (timeSelect.value !== chosenAfterPass1) {
        validateDuration();

        // Пасс 3: пересобираем конфликты с учётом обновлённой booking_hours
        const chosenAfterPass2 = timeSelect.value;
        buildTimeOptions({ disableConflicts: true });
        timeSelect.value = chosenAfterPass2;
        validateDuration();
    }

    // Финальная проверка: выключаем кнопку, если выбранный интервал конфликтный
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

        // Инициализируем валидацию при загрузке
        validateDuration();
    }
}

function validateDuration() {
    const dateStr = document.getElementById('booking_date').value;
    const timeStr = document.getElementById('booking_time').value;
    const hoursSelect = document.getElementById('booking_hours');

    if (!dateStr || !timeStr || !hoursSelect) return;

    // Парсим выбранное время
    const [day, month, year] = dateStr.split('.').map(Number);
    const [bookingHour, bookingMinute] = timeStr.split(':').map(Number);

    // Время закрытия студии (21:00)
    const closingHour = 21;

    // Максимально доступная длительность
    let maxHours = closingHour - bookingHour;

    // Если минуты начального времени больше 0, уменьшаем на 1 час
    if (bookingMinute > 0) {
        maxHours--;
    }

    // Ограничиваем максимум 5 часами (по умолчанию из select)
    maxHours = Math.min(maxHours, 5);

    // Ограничиваем минимум 1 часом
    maxHours = Math.max(maxHours, 1);

    // Обновляем опции в select
    updateHoursOptions(maxHours, parseInt(hoursSelect.value));

    // После пересчета длительности обновляем доступность кнопки
    updateRoomBookButtonBySelection();
}

function updateHoursOptions(maxHours, currentValue) {
    const hoursSelect = document.getElementById('booking_hours');
    if (!hoursSelect) return;

    // Сохраняем текущее значение
    const oldValue = currentValue || parseInt(hoursSelect.value);

    // Очищаем опции
    hoursSelect.innerHTML = '';

    // Создаем новые опции от 1 до maxHours
    for (let i = 1; i <= maxHours; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} час${getHoursTextEnding(i)}`;
        hoursSelect.appendChild(option);
    }

    // Устанавливаем значение: если старое значение в пределах, оставляем его
    if (oldValue <= maxHours) {
        hoursSelect.value = oldValue;
    } else {
        hoursSelect.value = maxHours;
    }
}

// Функция для правильного окончания слова "час"
function getHoursTextEnding(hours) {
    if (hours === 1) return '';
    if (hours >= 2 && hours <= 4) return 'а';
    return 'ов';
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
        window.location.href = 'log_in.html';
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
        InstrumentId: null,
        StartTime: startTime.toISOString(),
        EndTime: endTime.toISOString(),
    };

    // Двухшаговое бронирование:
    // 1) Здесь сохраняем pending-заявку в sessionStorage и переходим на order.html
    // 2) Фактический POST в БД выполняем только после нажатия "Подтвердить бронирование" на order.html

    const displayData = {
        // bookingId/orderId будут известны только после POST на order.html
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
        totalPrice: parseInt(document.getElementById('total-price').textContent),
        bookingDate: new Date().toISOString()
    };

    sessionStorage.setItem('pendingBookingRequest', JSON.stringify(bookingRequest));
    sessionStorage.setItem('currentBooking', JSON.stringify(displayData));
    window.location.href = 'order.html';
}

function generateOrderId(bookingUuid) {
    const cleanUuid = bookingUuid.replace(/-/g, '');
    const shortId = cleanUuid.substring(0, 4).toUpperCase();
    return `${shortId}`;
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