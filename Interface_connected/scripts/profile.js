document.addEventListener('DOMContentLoaded', function () {
    const userInfoDiv = document.getElementById('user-info');
    const bookingContainerCurrent = document.getElementById('booking-content-current');
    const bookingContainerArchive = document.getElementById('booking-content-archive');
    const clearBtn = document.getElementById('clear-history');
    const profileBookingsSection = document.getElementById('profile-bookings-section');
    const profileNotificationsSection = document.getElementById('profile-notifications-section');
    const notificationsContent = document.getElementById('notifications-content');
    const markAllNotificationsReadBtn = document.getElementById('mark-all-notifications-read-btn');
    const notificationsToggleBtn = document.getElementById('notifications-toggle-btn');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    const notificationsDropdownContent = document.getElementById('notifications-dropdown-content');
    const unreadBadge = document.getElementById('unread-badge');

    // Глобальные переменные для уведомлений
    window.notificationsDropdownContent = notificationsDropdownContent;
    window.unreadBadge = unreadBadge;

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userInfo = document.getElementById('user-info');
    const adminControls = document.getElementById('admin-controls');
    const isStaff = localStorage.getItem('isStaff') === 'true';
    const userId = userData.userUid || userData.uid;

    let currentNotifications = [];


    // Для администратора скрываем блоки, связанные с бронированиями
    if (isStaff && profileBookingsSection) {
        profileBookingsSection.style.display = 'none';
    }

    if (!isLoggedIn) {
        if (userInfoDiv) userInfoDiv.innerHTML = '<p>Вы не авторизованы. <a href="log_in.html">Войти</a></p>';
        if (bookingContainerCurrent) bookingContainerCurrent.innerHTML = '';
        if (bookingContainerArchive) bookingContainerArchive.innerHTML = '';
        if (clearBtn) clearBtn.style.display = 'none';
        if (profileNotificationsSection) profileNotificationsSection.style.display = 'none';
        if (notificationsToggleBtn) notificationsToggleBtn.style.display = 'none';
        return;
    }

    // Обработчик клика на кнопку колокольчика
    if (notificationsToggleBtn && notificationsDropdown) {
        notificationsToggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = notificationsDropdown.classList.contains('open');
            
            if (isOpen) {
                notificationsDropdown.classList.remove('open');
            } else {
                // Загружаем уведомления при открытии
                if (currentNotifications.length === 0 && userId) {
                    loadUserNotificationsForDropdown(userId);
                }
                notificationsDropdown.classList.add('open');
            }
        });
    }

    // Закрытие dropdown при клике вне его
    document.addEventListener('click', function(e) {
        if (notificationsDropdown && !notificationsDropdown.contains(e.target)) {
            notificationsDropdown.classList.remove('open');
        }
    });

    // Загружаем актуальные данные из API
    loadBookingsFromAPI(userData, bookingContainerCurrent, bookingContainerArchive, clearBtn);

    // Загружаем уведомления (только для обычных пользователей)
    if (!isStaff && userId) {
        if (profileNotificationsSection) {
            profileNotificationsSection.style.display = 'block';
        }
        if (markAllNotificationsReadBtn) {
            markAllNotificationsReadBtn.addEventListener('click', async () => {
                try {
                    const response = await fetch(`https://localhost:7123/api/Notifications/user/${userId}/mark-all-read`, {
                        method: 'PUT'
                    });
                    if (response.ok) {
                        await loadUserNotificationsForDropdown(userId);
                        if (profileNotificationsSection) {
                            await loadUserNotifications(userId);
                        }
                    }
                } catch (error) {
                    console.error('Ошибка:', error);
                    alert('Не удалось отметить уведомления как прочитанные');
                }
            });
        }
    }

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
        const response = await fetch(`https://localhost:7123/api/BookingsAdvanced/userHistory/${userId}`);
        if (!response.ok) throw new Error('Ошибка загрузки бронирований');
        const userBookings = await response.json();

        // Загружаем скидку пользователя
        let discountPercent = 0;
        try {
            const subResponse = await fetch(`https://localhost:7123/api/UserSubscriptionsAdvanced/active/${userId}`);
            if (subResponse.ok) {
                const activeSub = await subResponse.json();
                discountPercent = activeSub.plan?.discountPercentage || activeSub.discountPercentage || activeSub.Plan?.DiscountPercentage || 0;
                if (discountPercent > 0) {
                    localStorage.setItem('userDiscount', discountPercent);
                }
            } else if (subResponse.status === 404) {
                localStorage.setItem('userDiscount', '0');
                console.log('Активная подписка не найдена, скидка сброшена');
            }
        } catch (e) {
            console.warn("Не удалось получить скидку: ", e);
        }

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

async function enrichBookingsWithDetails(bookings, userData) {
    let instruments = [];
    let rooms = [];
    let roomTypes = [];

    // Загружаем дополнительное оборудование для бронирований
    let bookingEquipments = [];

    try {
        const [instrResponse, roomsResponse, roomTypesResponse, bookingEquipResponse] = await Promise.all([
            fetch('https://localhost:7123/api/Equipments'),
            fetch('https://localhost:7123/api/Rooms'),
            fetch('https://localhost:7123/api/RoomTypes'),
            fetch('https://localhost:7123/api/BookingEquipments')
        ]);

        if (instrResponse.ok) instruments = await instrResponse.json();
        if (roomsResponse.ok) rooms = await roomsResponse.json();
        if (roomTypesResponse.ok) roomTypes = await roomTypesResponse.json();
        if (bookingEquipResponse.ok) bookingEquipments = await bookingEquipResponse.json();
    } catch (error) {
        console.error('Ошибка загрузки справочников:', error);
    }

    // Группируем оборудование по bookingUid
    const equipmentByBooking = {};
    bookingEquipments.forEach(eq => {
        if (!equipmentByBooking[eq.bookingUid]) {
            equipmentByBooking[eq.bookingUid] = [];
        }
        const equipment = instruments.find(i => i.equipmentId === eq.equipmentId);
        if (equipment) {
            // Проверяем, не добавлено ли уже это оборудование (защита от дублирования)
            const alreadyExists = equipmentByBooking[eq.bookingUid].some(e => e.id === equipment.equipmentId);
            if (!alreadyExists) {
                equipmentByBooking[eq.bookingUid].push({
                    id: equipment.equipmentId,
                    name: equipment.name,
                    price: equipment.rentalPrice || 0
                });
            }
        }
    });

    const roomTypePriceMap = {};
    roomTypes.forEach(type => {
        roomTypePriceMap[type.roomTypeId] = type.rentalPricePerHour || 0;
    });

    return bookings.map(booking => {
        const startDate = booking.startTime ? new Date(booking.startTime) : null;
        const endDate = booking.endTime ? new Date(booking.endTime) : null;

        let hours = 0;
        let days = 0;
        if (startDate && endDate) {
            const diffMs = endDate - startDate;
            hours = Math.ceil(diffMs / (1000 * 60 * 60));
            days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }

        let roomName = '';
        let instrName = '';
        let roomImg = '';
        let instrImg = '';
        let originalTotal = 0;

        let pricePerHour = 0;
        let dailyPrice = 0;

        // Получаем дополнительное оборудование для этого бронирования ТОЛЬКО из одного источника
        const extraEquipment = equipmentByBooking[booking.bookingUid] || [];

        // 1. Обработка помещения
        if (booking.roomId) {
            const room = rooms.find(r => r.roomId === booking.roomId);
            if (room) {
                roomName = room.name || `Помещение #${room.roomId}`;
                pricePerHour = roomTypePriceMap[room.roomTypeId] || 1000;
                originalTotal += pricePerHour * hours;
                roomImg = getRoomImageWithSync(room.roomTypeId, room.roomId, roomName);
            }
        }

        // 2. Обработка инструмента (если арендован ТОЛЬКО инструмент, НЕ как дополнительное оборудование)
        // ВАЖНО: instrumentId не должен дублироваться с extraEquipment
        if (booking.instrumentId) {
            // Проверяем, не является ли этот инструмент уже добавленным как дополнительное оборудование
            const isInstrumentInExtra = extraEquipment.some(eq => eq.id === booking.instrumentId);
            if (!isInstrumentInExtra) {
                const instr = instruments.find(i => i.equipmentId === booking.instrumentId);
                if (instr) {
                    instrName = instr.name || `Инструмент #${instr.equipmentId}`;
                    dailyPrice = instr.rentalPrice || 600;
                    originalTotal += dailyPrice * days;
                    instrImg = instr.imageUrl;
                }
            }
        }

        // 3. Добавляем стоимость дополнительного оборудования (только если оно не было учтено как instrumentId)
        let equipmentTotal = 0;
        const equipmentList = [];
        for (const eq of extraEquipment) {
            // Проверяем, не является ли это оборудование основным инструментом бронирования
            if (booking.instrumentId !== eq.id) {
                equipmentTotal += eq.price;
                equipmentList.push({
                    name: eq.name,
                    price: eq.price
                });
            }
        }
        originalTotal += equipmentTotal;

        // Формируем название и итоговую цену
        let combinedName = '';
        if (roomName && instrName) {
            combinedName = `${roomName} + ${instrName}`;
        } else if (roomName) {
            combinedName = roomName;
        } else if (instrName) {
            combinedName = instrName;
        } else {
            combinedName = "Услуга";
        }

        // Добавляем информацию о дополнительном оборудовании в название (если есть)
        if (equipmentList.length > 0) {
            const eqNames = equipmentList.map(eq => eq.name).join(', ');
            combinedName += ` + оборудование (${eqNames})`;
        }

        const finalImage = roomImg || instrImg || 'img/no-image.png';

        let finalPrice = (booking.totalSum !== undefined && booking.totalSum !== null && booking.totalSum > 0)
            ? booking.totalSum
            : originalTotal;

        // Рассчитываем скидку ТОЛЬКО если она была применена
        let appliedDiscountPercent = 0;
        if (booking.subscriptionUsed === true && originalTotal > finalPrice && originalTotal > 0) {
            const rawDiscount = (1 - (finalPrice / originalTotal)) * 100;
            appliedDiscountPercent = Math.round(rawDiscount);
            
            // Дополнительная проверка: скидка не должна превышать 30% (если максимальная скидка в системе 15-20%)
            // Это поможет отловить дублирование
            if (appliedDiscountPercent > 30) {
                console.warn(`[WARNING] Подозрительно высокая скидка ${appliedDiscountPercent}% для ${combinedName}, original=${originalTotal}, final=${finalPrice}`);
                // Если скидка подозрительно высокая, возможно, это из-за дублирования
                // Пробуем пересчитать без оборудования
                const recalculatedTotal = originalTotal - equipmentTotal;
                if (recalculatedTotal > 0 && recalculatedTotal > finalPrice) {
                    const recalculatedDiscount = Math.round((1 - (finalPrice / recalculatedTotal)) * 100);
                    if (recalculatedDiscount <= 20) {
                        appliedDiscountPercent = recalculatedDiscount;
                    }
                }
            }
        }

        // Логирование для отладки
        if (equipmentList.length > 0) {
            console.log(`[DEBUG] Бронирование ${combinedName}: original=${originalTotal}, final=${finalPrice}, discount=${appliedDiscountPercent}%, subscriptionUsed=${booking.subscriptionUsed}`);
        }

        return {
            bookingId: booking.bookingUid,
            orderId: booking.bookingUid ? booking.bookingUid.substring(0, 4).toUpperCase() : 'N/A',
            itemType: booking.roomId ? 'Room' : 'Instrument',
            itemName: combinedName,
            image: finalImage,
            totalPrice: finalPrice,
            originalTotal: originalTotal,
            discountPercent: appliedDiscountPercent,
            subscriptionUsed: booking.subscriptionUsed || false,
            status: booking.status,

            // Дополнительное оборудование
            extraEquipment: equipmentList,
            equipmentTotal: equipmentTotal,

            pricePerHour: pricePerHour,
            dailyPrice: dailyPrice,

            date: startDate ? formatDate(startDate) : '',
            time: startDate ? formatTime(startDate) : '',
            startDate: startDate ? formatDate(startDate) : '',
            endDate: endDate ? formatDate(endDate) : '',
            startTime: startDate ? formatTime(startDate) : '',
            endTime: endDate ? formatTime(endDate) : '',
            hours: hours,
            days: days,
            bookingDate: booking.creationDate || new Date().toISOString()
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
        originalTotal: b.originalTotal,
        discountPercent: b.discountPercent,
        status: b.status,
        bookingDate: b.bookingDate,
        image: b.image,
        extraEquipment: b.extraEquipment,
        equipmentTotal: b.equipmentTotal
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
        if (b.status === 'cancelled') return false;
        if (b.status === 'completed') return false;
        if (b.status === 'in progress') {
            const endMs = getBookingEndMs(b);
            if (endMs === null) return true;
            return endMs > Date.now();
        }
        const endMs = getBookingEndMs(b);
        if (endMs === null) return true;
        return endMs > Date.now();
    }

    // Разделяем на текущие и архивные
    const currentItems = [];
    const archiveItems = [];

    bookings.forEach(b => {
        const endMs = getBookingEndMs(b);
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

            // Добавляем блок с дополнительным оборудованием
            let equipmentHTML = '';
            if (b.extraEquipment && b.extraEquipment.length > 0) {
                equipmentHTML = `
                    <div style="margin-top: 8px; padding-top: 5px; border-top: 1px solid #eee;">
                        <strong>Дополнительное оборудование:</strong>
                        <ul style="margin: 5px 0 0 0; padding-left: 20px; list-style: none;">
                            ${b.extraEquipment.map(eq => `
                                <li style="display: flex; justify-content: space-between; font-size: 0.85em;">
                                    <span>${escapeHtml(eq.name)}</span>
                                    <span style="color: #e44d26;">+${eq.price} ₽</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }

            const statusText = b.status === 'in progress' ? 'Активно' :
                b.status === 'completed' ? 'Завершено' :
                    b.status === 'cancelled' ? 'Отменено' : 'Неизвестно';
            const statusClass = b.status === 'in progress' ? 'status-active' :
                b.status === 'completed' ? 'status-completed' :
                    b.status === 'cancelled' ? 'status-cancelled' : '';

            // Формируем отображение цены с учётом оборудования
            let priceHtml = '';
            if (b.discountPercent > 0) {
                let totalWithEquipment = b.originalTotal;
                priceHtml = `
                    <span style="color:#888; text-decoration:line-through; margin-right:8px;">₽${totalWithEquipment}</span>
                    <span style="color:#e44d26">₽${b.totalPrice}</span>
                    <span style="color:#4CAF50; font-size:0.85em; display:block;">✓ Абонемент −${b.discountPercent}%</span>
                `;
            } else {
                priceHtml = `<span style="color:#e44d26">₽${b.totalPrice}</span>`;
            }

            card.innerHTML = `
                ${b.status !== 'cancelled' && b.status !== 'completed' ?
                    `<button class="delete-booking" title="Отменить бронирование">✖</button>` : ''}
                <img src="${image}" alt="${name}" onerror="this.src='img/no-image.png'">
                <div class="booking-info">
                    <h4>${escapeHtml(name)}</h4>
                    <p style="font-size: 0.85em; color: #777;">ID: ${b.bookingId.substring(0, 8)}...</p>
                    <p><strong>Статус:</strong> <span class="status-badge ${statusClass}">${statusText}</span></p>
                    <p><strong>Оформлено:</strong> ${new Date(b.bookingDate).toLocaleString('ru-RU')}</p>
                    ${detailsHTML}
                    ${equipmentHTML}
                    <p style="margin-top: 10px; font-size: 1.1em;">
                        <strong>Итого:</strong> ${priceHtml}
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
    const titleElement = document.getElementById('profile-title');

    if (!userInfoDiv) return;

    if (titleElement) {
        titleElement.textContent = isStaff
            ? 'Профиль администратора'
            : 'Профиль пользователя';
    }

    let userHTML = `
        <p><strong>Имя:</strong> ${userData.firstName || 'Пользователь'}</p>
        <p><strong>Фамилия:</strong> ${userData.lastName || 'Пользователь'}</p>
        <p><strong>Email:</strong> ${userData.email || 'Не указан'}</p>
    `;

    userHTML += `
    <hr>
    <p><strong>Режим:</strong> ${isStaff ? 'Администратор' : 'Пользователь'}</p>
`;

    if (isStaff) {
        userHTML += `
            <a href="admin_subscription_plans.html" class="button">Управление абонементами</a>
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
            const discountPercent = sub.discountPercentage || 0;

            if (discountPercent > 0) {
                localStorage.setItem('userDiscount', discountPercent);
            }

            const discountInfo = discountPercent > 0
                ? `<p><strong>Скидка:</strong> <span style="color: #4CAF50; font-weight: bold;">${discountPercent}%</span> на все бронирования</p>`
                : '';

            userHTML += `
                <div style="margin-top: 20px; padding: 15px; border: 1px solid #4CAF50; border-radius: 8px; background-color: #f9fff9;">
                    <h3 style="color: #2E7D32; margin-top:0;">Ваш абонемент: ${planName}</h3>
                    <p><strong>Статус:</strong> <span style="color: #4CAF50; font-weight: bold;">АКТИВЕН</span></p>
                    <p><strong>Осталось сеансов:</strong> ${sessions}</p>
                    <p><strong>Действует до:</strong> ${validDate}</p>
                    ${discountInfo}
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

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================
// Функции для работы с уведомлениями
// ============================================

// Загрузка уведомлений пользователя
async function loadUserNotifications(userUid) {
    const notificationsContent = document.getElementById('notifications-content');
    if (!notificationsContent) return;

    try {
        const response = await fetch(`https://localhost:7123/api/Notifications/user/${userUid}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить уведомления');
        }

        const notifications = await response.json();
        renderNotifications(notifications);
    } catch (error) {
        console.error('Ошибка загрузки уведомлений:', error);
        notificationsContent.innerHTML = `
            <div class="booking-card">
                <p style="color: #999; text-align: center;">Не удалось загрузить уведомления</p>
            </div>
        `;
    }
}

// Отрисовка уведомлений
function renderNotifications(notifications) {
    const notificationsContent = document.getElementById('notifications-content');
    if (!notificationsContent) return;

    if (notifications.length === 0) {
        notificationsContent.innerHTML = `
            <div class="booking-card">
                <p style="color: #999; text-align: center;">Уведомлений нет</p>
            </div>
        `;
        return;
    }

    notificationsContent.innerHTML = notifications.map(notification => {
        const typeClass = `notification-type-${notification.notificationType}`;
        const typeLabel = getNotificationTypeLabel(notification.notificationType);
        const timeAgo = getTimeAgo(notification.createdAt);
        const unreadClass = notification.isRead ? '' : 'unread-notification';

        return `
            <div class="booking-card ${unreadClass}" style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                        <span class="status-badge ${typeClass}" style="margin-bottom: 8px; display: inline-block;">
                            ${typeLabel}
                        </span>
                        <h4 style="margin: 8px 0 5px 0;">${escapeHtml(notification.title)}</h4>
                        <p style="margin: 0 0 8px 0; color: #666; line-height: 1.4;">
                            ${escapeHtml(notification.message)}
                        </p>
                        <p style="margin: 0; font-size: 0.85em; color: #999;">
                            ${timeAgo}
                        </p>
                    </div>
                    ${!notification.isRead ? `
                        <button onclick="markNotificationAsRead('${notification.notificationId}')" 
                                style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">
                            Прочитано
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Метка типа уведомления
function getNotificationTypeLabel(type) {
    const labels = {
        'new_booking': 'Новое бронирование',
        'booking_rescheduled': 'Перенос бронирования',
        'booking_cancelled': 'Отмена бронирования'
    };
    return labels[type] || type;
}

// Форматирование времени
function getTimeAgo(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU');
}

// Отметить уведомление как прочитанное (глобальная функция)
window.markNotificationAsRead = async function (notificationId) {
    try {
        const response = await fetch(`https://localhost:7123/api/Notifications/${notificationId}/read`, {
            method: 'PUT'
        });

        if (response.ok) {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const userUid = userData.userUid || userData.uid;
            if (userUid) {
                await loadUserNotificationsForDropdown(userUid);
                const profileNotificationsSection = document.getElementById('profile-notifications-section');
                if (profileNotificationsSection && profileNotificationsSection.style.display !== 'none') {
                    await loadUserNotifications(userUid);
                }
            }
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось обновить статус уведомления');
    }
};

// Загрузка уведомлений для dropdown (короткая версия)
async function loadUserNotificationsForDropdown(userUid) {
    try {
        const response = await fetch(`https://localhost:7123/api/Notifications/user/${userUid}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить уведомления');
        }

        currentNotifications = await response.json();
        renderNotificationsDropdown(currentNotifications);
        updateUnreadBadge(currentNotifications);
    } catch (error) {
        console.error('Ошибка загрузки уведомлений:', error);
        if (window.notificationsDropdownContent) {
            window.notificationsDropdownContent.innerHTML = `
                <p style="color: #999; text-align: center;">Не удалось загрузить уведомления</p>
            `;
        }
    }
}

// Отрисовка уведомлений в dropdown
function renderNotificationsDropdown(notifications) {
    if (!window.notificationsDropdownContent) return;

    if (notifications.length === 0) {
        window.notificationsDropdownContent.innerHTML = `
            <p style="color: #999; text-align: center; padding: 20px;">Уведомлений нет</p>
        `;
        return;
    }

    const unreadCount = notifications.filter(n => !n.isRead).length;
    
    let html = `
        <div class="dropdown-header">
            <h4>🔔 Уведомления ${unreadCount > 0 ? `<span style="color: #f44336;">(${unreadCount})</span>` : ''}</h4>
            ${unreadCount > 0 ? `<span class="mark-all-read-link" onclick="event.stopPropagation(); markAllNotificationsRead()">Все прочитано</span>` : ''}
        </div>
    `;

    html += notifications.slice(0, 10).map(notification => {
        const typeClass = `type-${notification.notificationType}`;
        const typeLabel = getNotificationTypeLabel(notification.notificationType);
        const timeAgo = getTimeAgo(notification.createdAt);
        const unreadClass = notification.isRead ? '' : 'unread';

        return `
            <div class="notification-dropdown-item ${unreadClass}" data-id="${notification.notificationId}">
                <span class="notification-type-badge ${typeClass}">${typeLabel}</span>
                <div class="notification-title-small">${escapeHtml(notification.title)}</div>
                <div class="notification-message-small">${escapeHtml(notification.message)}</div>
                <div class="notification-time-small">${timeAgo}</div>
                ${!notification.isRead ? `
                    <button class="notification-mark-read-btn" onclick="event.stopPropagation(); window.markNotificationAsRead('${notification.notificationId}')">
                        Прочитано
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');

    if (notifications.length > 10) {
        html += `<p style="text-align: center; color: #999; font-size: 0.85em; padding: 10px;">Показано 10 из ${notifications.length}</p>`;
    }

    window.notificationsDropdownContent.innerHTML = html;
}

// Обновление бейджа непрочитанных
function updateUnreadBadge(notifications) {
    if (!window.unreadBadge) return;
    
    const unreadCount = notifications.filter(n => !n.isRead).length;
    if (unreadCount > 0) {
        unreadBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        unreadBadge.style.display = 'inline-block';
    } else {
        unreadBadge.style.display = 'none';
    }
}

// Отметить все как прочитанные (для dropdown)
window.markAllNotificationsRead = async function() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userUid = userData.userUid || userData.uid;
    if (!userUid) return;

    try {
        const response = await fetch(`https://localhost:7123/api/Notifications/user/${userUid}/mark-all-read`, {
            method: 'PUT'
        });
        if (response.ok) {
            await loadUserNotificationsForDropdown(userUid);
            const profileNotificationsSection = document.getElementById('profile-notifications-section');
            if (profileNotificationsSection && profileNotificationsSection.style.display !== 'none') {
                await loadUserNotifications(userUid);
            }
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
};