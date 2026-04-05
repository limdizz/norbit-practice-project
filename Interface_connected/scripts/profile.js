document.addEventListener('DOMContentLoaded', function () {
    const userInfoDiv = document.getElementById('user-info');
    const bookingContainerCurrent = document.getElementById('booking-content-current');
    const bookingContainerArchive = document.getElementById('booking-content-archive');
    const clearBtn = document.getElementById('clear-history');
    const profileBookingsSection = document.getElementById('profile-bookings-section');

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userInfo = document.getElementById('user-info');
    const adminControls = document.getElementById('admin-controls');
    const isStaff = localStorage.getItem('isStaff') === 'true';


    // Для администратора скрываем блоки, связанные с бронированиями
    if (isStaff && profileBookingsSection) {
        profileBookingsSection.style.display = 'none';
    }

    if (!isLoggedIn) {
        if (userInfoDiv) userInfoDiv.innerHTML = '<p>Вы не авторизованы. <a href="log_in.html">Войти</a></p>';
        if (bookingContainerCurrent) bookingContainerCurrent.innerHTML = '';
        if (bookingContainerArchive) bookingContainerArchive.innerHTML = '';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }

    // Загружаем актуальные данные из API
    loadBookingsFromAPI(userData, bookingContainerCurrent, bookingContainerArchive, clearBtn);

    // Отображаем профиль пользователя
    renderUserProfile(userData, isStaff);
});

// Глобальная переменная для хранения актуальных бронирований
let currentBookings = [];

// Ключ для хранения маппинга изображений в localStorage
const ROOM_IMAGE_MAP_KEY = 'room_image_mapping';

// Загружаем сохраненный маппинг изображений
function loadRoomImageMapping() {
    const saved = localStorage.getItem(ROOM_IMAGE_MAP_KEY);
    return saved ? JSON.parse(saved) : {};
}

// Сохраняем маппинг изображений
function saveRoomImageMapping(mapping) {
    localStorage.setItem(ROOM_IMAGE_MAP_KEY, JSON.stringify(mapping));
}

// Функция для получения изображения помещения с синхронизацией
function getRoomImageWithSync(roomTypeId, roomId, roomName) {
    // Загружаем существующий маппинг
    let mapping = loadRoomImageMapping();

    // Если для этого помещения уже есть сохраненное изображение, возвращаем его
    if (mapping[roomId]) {
        return mapping[roomId];
    }

    // Коллекции изображений для каждого типа помещения
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

    const images = roomImageCollections[roomTypeId];
    if (!images || images.length === 0) {
        return 'img/rooms/default_room.jpg';
    }

    // Определяем индекс для этого помещения на основе имени (для согласованности)
    // Ищем номер в названии (например "Rehearsal Room 2" -> 2)
    let index = 0;
    const numberMatch = roomName.match(/\d+$/);
    if (numberMatch) {
        const num = parseInt(numberMatch[0], 10);
        // Индекс = (номер - 1) % количество изображений
        index = (num - 1) % images.length;
    } else {
        // Если нет номера, используем ID для определения индекса
        index = roomId % images.length;
    }

    const selectedImage = images[index];

    // Сохраняем в маппинг
    mapping[roomId] = selectedImage;
    saveRoomImageMapping(mapping);

    return selectedImage;
}

// Загрузка бронирований из API
async function loadBookingsFromAPI(userData, currentContainer, archiveContainer, clearBtn) {
    const userId = userData.userUid;

    if (!userId) return;

    try {
        const response = await fetch(`https://localhost:7123/api/BookingsAdvanced`);
        if (!response.ok) throw new Error('Ошибка загрузки бронирований');

        const allBookings = await response.json();

        // Фильтруем только бронирования текущего пользователя
        const userBookings = allBookings.filter(b => b.userUid === userId);

        // Преобразуем в формат для отображения
        const formattedBookings = await enrichBookingsWithDetails(userBookings, userData);

        currentBookings = formattedBookings;

        // Обновляем localStorage для обратной совместимости
        updateLocalStorage(userData, formattedBookings);

        // Отрисовываем бронирования
        renderBookings(formattedBookings, currentContainer, archiveContainer, clearBtn, userData);

    } catch (error) {
        console.error('Ошибка загрузки бронирований из API:', error);
        // Fallback на localStorage
        loadFromLocalStorage(userData, currentContainer, archiveContainer, clearBtn);
    }
}

// Обогащение бронирований дополнительными данными
async function enrichBookingsWithDetails(bookings, userData) {
    // Загружаем инструменты и помещения для получения названий и картинок
    let instruments = [];
    let rooms = [];

    try {
        const [instrResponse, roomsResponse] = await Promise.all([
            fetch('https://localhost:7123/api/Equipments'),
            fetch('https://localhost:7123/api/Rooms')
        ]);

        if (instrResponse.ok) instruments = await instrResponse.json();
        if (roomsResponse.ok) rooms = await roomsResponse.json();
    } catch (error) {
        console.error('Ошибка загрузки справочников:', error);
    }

    return bookings.map(booking => {
        const startDate = booking.startTime ? new Date(booking.startTime) : null;
        const endDate = booking.endTime ? new Date(booking.endTime) : null;

        let itemName = 'Неизвестно';
        let itemType = booking.roomId ? 'Room' : 'Instrument';
        let imageUrl = 'img/no-image.png';
        let roomTypeId = null;

        if (booking.roomId) {
            const room = rooms.find(r => r.roomId === booking.roomId);
            itemName = room?.name || `Помещение #${booking.roomId}`;
            roomTypeId = room?.roomTypeId;
            // Получаем картинку с синхронизацией
            imageUrl = roomTypeId ? getRoomImageWithSync(roomTypeId, booking.roomId, itemName) : 'img/rooms/default_room.jpg';
        } else if (booking.instrumentId) {
            const instrument = instruments.find(i => i.equipmentId === booking.instrumentId);
            itemName = instrument?.name || `Инструмент #${booking.instrumentId}`;
            imageUrl = instrument?.imageUrl || 'img/instruments/default_instrument.jpg';
        }

        // Расчет стоимости
        let totalPrice = 0;
        let dailyPrice = 600;
        let pricePerHour = 1000;
        let days = 1;
        let hours = 1;

        if (startDate && endDate) {
            const diffMs = endDate - startDate;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

            if (booking.roomId) {
                hours = diffHours;
                totalPrice = pricePerHour * hours;
            } else {
                days = diffDays;
                totalPrice = dailyPrice * days;
            }
        }

        return {
            bookingId: booking.bookingUid,
            itemType: itemType,
            itemName: itemName,
            startDate: startDate ? formatDate(startDate) : '',
            endDate: endDate ? formatDate(endDate) : '',
            startTime: startDate ? formatTime(startDate) : '',
            endTime: endDate ? formatTime(endDate) : '',
            date: startDate ? formatDate(startDate) : '',
            time: startDate ? formatTime(startDate) : '',
            hours: hours,
            days: days,
            dailyPrice: dailyPrice,
            pricePerHour: pricePerHour,
            totalPrice: totalPrice,
            status: booking.status,
            bookingDate: booking.creationDate || new Date().toISOString(),
            image: imageUrl,
            orderId: booking.bookingUid.substring(0, 4).toUpperCase()
        };
    });
}

// Форматирование даты
function formatDate(date) {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

// Форматирование времени
function formatTime(date) {
    if (!date) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Обновление localStorage для обратной совместимости
function updateLocalStorage(userData, bookings) {
    const userEmail = userData.email;
    const storageKey = userEmail ? `bookingHistory_${userEmail}` : 'bookingHistory_guest';

    const localStorageBookings = bookings.map(b => ({
        bookingId: b.bookingId,
        orderId: b.orderId,
        itemType: b.itemType,
        itemName: b.itemName,
        instrumentName: b.itemName,
        startDate: b.startDate,
        endDate: b.endDate,
        startTime: b.startTime,
        endTime: b.endTime,
        date: b.date,
        time: b.time,
        hours: b.hours,
        days: b.days,
        dailyPrice: b.dailyPrice,
        pricePerHour: b.pricePerHour,
        totalPrice: b.totalPrice,
        status: b.status,
        bookingDate: b.bookingDate,
        image: b.image
    }));

    localStorage.setItem(storageKey, JSON.stringify(localStorageBookings));
}

// Рендеринг бронирований
function renderBookings(bookings, currentContainer, archiveContainer, clearBtn, userData) {
    if (!currentContainer || !archiveContainer) return;

    currentContainer.innerHTML = '';
    archiveContainer.innerHTML = '';

    if (!bookings.length) {
        currentContainer.innerHTML = `
            <div class="no-bookings">
                <p>У вас нет бронирований.</p>
                <a href="index.html" class="button">Перейти в каталог</a>
            </div>`;
        archiveContainer.innerHTML = `
            <div class="no-bookings">
                <p>Архив пуст.</p>
            </div>`;
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }

    if (clearBtn) clearBtn.style.display = 'inline-block';

    const nowMs = Date.now();

    function getBookingEndMs(b) {
        if (b.itemType === 'Room') {
            if (!b.date || !b.time || !b.hours) return null;
            const [day, month, year] = b.date.split('.').map(Number);
            const [hour, minute] = b.time.split(':').map(Number);
            const end = new Date(year, month - 1, day, hour, minute, 0);
            end.setHours(end.getHours() + (b.hours || 1));
            return end.getTime();
        } else {
            if (!b.endDate) return null;
            const [day, month, year] = b.endDate.split('.').map(Number);
            const end = new Date(year, month - 1, day, 23, 59, 59);
            return end.getTime();
        }
    }

    function isActiveBooking(b) {
        // Если статус отменен - всегда в архив
        if (b.status === 'cancelled') return false;

        // Если статус завершен - в архив
        if (b.status === 'completed') return false;

        // Если статус in progress - проверяем по дате
        if (b.status === 'in progress') {
            const endMs = getBookingEndMs(b);
            if (endMs === null) return true;
            return endMs > Date.now();
        }

        // Для бронирований без статуса (старые данные) - проверяем по дате
        const endMs = getBookingEndMs(b);
        if (endMs === null) return true;
        return endMs > Date.now();
    }

    // Разделяем на текущие и архивные
    const currentItems = [];
    const archiveItems = [];

    bookings.forEach(b => {
        const endMs = getBookingEndMs(b);
        // Активные: статус "in progress" или дата окончания еще не прошла
        if (isActiveBooking(b)) {
            currentItems.push(b);
        } else {
            archiveItems.push(b);
        }
    });

    if (currentItems.length === 0) {
        currentContainer.innerHTML = `
            <div class="no-bookings">
                <p>Текущих бронирований нет.</p>
            </div>`;
    }

    if (archiveItems.length === 0) {
        archiveContainer.innerHTML = `
            <div class="no-bookings">
                <p>Архив пока пуст.</p>
            </div>`;
    }

    function renderCards(list, container, isArchive = false) {
        list.forEach(b => {
            const card = document.createElement('div');
            card.className = 'booking-card';
            card.dataset.id = b.bookingId;

            const name = b.itemName || 'Без названия';
            const image = b.image || 'img/no-image.png';

            let detailsHTML = '';

            if (b.itemType === 'Room') {
                detailsHTML = `
                    <p><strong>Номер заказа:</strong> ${b.orderId}</p>
                    <p><strong>Дата:</strong> ${b.date || b.startDate}</p>
                    <p><strong>Время начала:</strong> ${b.time || b.startTime || 'Не указано'}</p>
                    <p><strong>Длительность:</strong> ${b.hours} ч.</p>
                    <p><strong>Цена за час:</strong> ₽${b.pricePerHour}</p>
                `;
            } else {
                detailsHTML = `
                    <p><strong>Номер заказа:</strong> ${b.orderId}</p>
                    <p><strong>Период:</strong> ${b.startDate} – ${b.endDate}</p>
                    <p><strong>Длительность:</strong> ${b.days} дн.</p>
                    <p><strong>Цена за день:</strong> ₽${b.dailyPrice}</p>
                `;
            }

            const statusText = b.status === 'in progress' ? 'Активно' :
                b.status === 'completed' ? 'Завершено' :
                    b.status === 'cancelled' ? 'Отменено' : 'Неизвестно';
            const statusClass = b.status === 'in progress' ? 'status-active' :
                b.status === 'completed' ? 'status-completed' :
                    b.status === 'cancelled' ? 'status-cancelled' : '';

            card.innerHTML = `
                ${b.status !== 'cancelled' && b.status !== 'completed' ?
                    `<button class="delete-booking" title="Отменить бронирование">✖</button>` : ''}
                <img src="${image}" alt="${name}" onerror="this.src='img/no-image.png'">
                <div class="booking-info">
                    <h4>${name}</h4>
                    <p style="font-size: 0.85em; color: #777;">ID: ${b.bookingId.substring(0, 8)}...</p>
                    <p><strong>Статус:</strong> <span class="status-badge ${statusClass}">${statusText}</span></p>
                    <p><strong>Оформлено:</strong> ${new Date(b.bookingDate).toLocaleString('ru-RU')}</p>
                    ${detailsHTML}
                    <p style="margin-top: 10px; font-size: 1.1em;">
                        <strong>Итого:</strong> 
                        <span style="color:#e44d26">₽${b.totalPrice}</span>
                    </p>
                </div>`;

            container.appendChild(card);

            // Обработчик отмены (только для активных бронирований)
            const deleteBtn = card.querySelector('.delete-booking');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm('Вы точно хотите отменить это бронирование?')) return;

                    try {
                        const response = await fetch(`https://localhost:7123/api/BookingsAdvanced/${b.bookingId}/cancel`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ staffUserUid: userData.userUid })
                        });

                        if (response.ok) {
                            alert('Бронирование отменено');
                            // Перезагружаем данные
                            await loadBookingsFromAPI(userData, currentContainer, archiveContainer, clearBtn);
                        } else {
                            throw new Error('Ошибка отмены');
                        }
                    } catch (error) {
                        console.error('Ошибка отмены:', error);
                        alert('Не удалось отменить бронирование');
                    }
                });
            }
        });
    }

    renderCards(currentItems, currentContainer, false);
    renderCards(archiveItems, archiveContainer, true);
}

// Fallback на localStorage
function loadFromLocalStorage(userData, currentContainer, archiveContainer, clearBtn) {
    const userEmail = userData.email;
    const storageKey = userEmail ? `bookingHistory_${userEmail}` : 'bookingHistory_guest';
    const localStorageBookings = JSON.parse(localStorage.getItem(storageKey) || '[]');

    currentBookings = localStorageBookings;
    renderBookings(localStorageBookings, currentContainer, archiveContainer, clearBtn, userData);
}

// Рендеринг профиля пользователя
async function renderUserProfile(userData, isStaff) {
    const userInfoDiv = document.getElementById('user-info');
    const userId = userData.userUid || userData.uid;

    if (!userInfoDiv) return;

    let userHTML = `
        <p><strong>Имя:</strong> ${userData.firstName || 'Пользователь'}</p>
        <p><strong>Фамилия:</strong> ${userData.lastName || 'Пользователь'}</p>
        <p><strong>Email:</strong> ${userData.email || 'Не указан'}</p>
    `;

    if (isStaff) {
        userHTML += `
            <hr>
            <p><strong>Режим:</strong> Администратор</p>
            <a href="admin_bookings.html" class="button">Управление бронированиями</a>
            <a href="admin_instruments.html" class="button">Управление инструментами</a>
            <a href="admin_rooms.html" class="button">Управление помещениями</a>
            <br><a href="log_out.html" class="button logout" style="margin-top:20px;">Выйти</a>
        `;
        userInfoDiv.innerHTML = userHTML;
        return;
    }

    try {
        const response = await fetch(`https://localhost:7123/api/UserSubscriptionsAdvanced/active/${userId}`);

        if (response.ok) {
            const sub = await response.json();
            const validDateRaw = sub.validUntil || sub.ValidUntil;
            const validDate = new Date(validDateRaw).toLocaleDateString('ru-RU');
            const sessions = sub.sessionsRemaining !== undefined ? sub.sessionsRemaining : sub.SessionsRemaining;
            const planName = sub.planName || sub.PlanName || (sub.plan ? (sub.plan.planName || sub.plan.PlanName) : 'Тариф');

            userHTML += `
                <div style="margin-top: 20px; padding: 15px; border: 1px solid #4CAF50; border-radius: 8px; background-color: #f9fff9;">
                    <h3 style="color: #2E7D32; margin-top:0;">Ваш абонемент: ${planName}</h3>
                    <p><strong>Статус:</strong> <span style="color: #4CAF50; font-weight: bold;">АКТИВЕН</span></p>
                    <p><strong>Осталось сеансов:</strong> ${sessions}</p>
                    <p><strong>Действует до:</strong> ${validDate}</p>
                    
                    <button id="cancel-sub-btn" class="button logout" style="background:#dc3545; margin-top: 10px;">
                        Отменить подписку
                    </button>
                </div>
            `;
        } else {
            userHTML += `
                <hr>
                <p>У вас нет активного абонемента.</p>
                <a href="subscription_plans.html" class="button">Купить абонемент</a>
            `;
        }
    } catch (e) {
        console.error("Ошибка загрузки профиля", e);
        userHTML += `<p style="color:red">Не удалось загрузить данные подписки.</p>`;
    }

    userHTML += `<br><a href="log_out.html" class="button logout" style="margin-top:20px;">Выйти</a>`;
    userInfoDiv.innerHTML = userHTML;

    const cancelBtn = document.getElementById('cancel-sub-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => cancelSubscription(userId));
    }
}

async function cancelSubscription(userId) {
    if (!confirm('Вы уверены, что хотите отменить подписку?')) return;

    try {
        const response = await fetch(`https://localhost:7123/api/UserSubscriptionsAdvanced/cancel/${userId}`, {
            method: 'POST'
        });

        if (response.ok) {
            alert('Подписка успешно отменена.');
            window.location.reload();
        } else {
            const msg = await response.text();
            alert('Ошибка: ' + msg);
        }
    } catch (error) {
        console.error(error);
        alert('Ошибка соединения.');
    }
}