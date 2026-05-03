document.addEventListener('DOMContentLoaded', async function () {
    console.log('Страница заказа загружена. Заполняем данные...');

    // 1. Получаем данные пользователя из localStorage
    const userDataString = localStorage.getItem('userData');
    let userData = { firstName: 'Гость', lastName: 'Гость' };

    if (userDataString) {
        try {
            userData = JSON.parse(userDataString);
            console.log('Данные пользователя загружены:', userData);
        } catch (error) {
            console.error('Ошибка парсинга данных пользователя:', error);
        }
    } else {
        console.warn('Данные пользователя не найдены в localStorage.');
    }

    // 2. Получаем данные бронирования из sessionStorage
    const bookingDataString = sessionStorage.getItem('currentBooking');
    let bookingData = null;

    if (bookingDataString) {
        try {
            bookingData = JSON.parse(bookingDataString);
            console.log('Данные бронирования загружены:', bookingData);
        } catch (error) {
            console.error('Ошибка парсинга данных бронирования:', error);
        }
    } else {
        console.error('Данные о бронировании не найдены в sessionStorage!');

        const lastBookingString = localStorage.getItem('lastBooking');
        if (lastBookingString) {
            console.warn('Загружаем резервные данные из localStorage');
            bookingData = JSON.parse(lastBookingString);
        }
    }

    // 3. Находим элементы на странице
    const lastNameInput = document.querySelector('.register_placeholder_ln');
    const firstNameInput = document.querySelector('.register_placeholder_fn');

    const orderTitle = document.getElementById('order-title');
    const orderInstrument = document.getElementById('order-instrument');
    const orderDates = document.getElementById('order-dates');
    const orderTotal = document.getElementById('order-total');
    const additionalEquipmentContainer = document.getElementById('additional-equipment-list');
    const confirmBtn = document.getElementById('confirm-booking-btn');

    async function applySubscriptionDiscount(userId, currentTotal) {
        try {
            const response = await fetch(`https://localhost:7123/api/UserSubscriptionsAdvanced/active/${userId}`);
            if (!response.ok) return { total: currentTotal, discount: 0 };

            const activeSub = await response.json();
            const discountPercent = activeSub.plan?.discountPercentage || activeSub.discountPercentage || 0;

            if (discountPercent > 0) {
                const discountedTotal = currentTotal * (1 - discountPercent / 100);
                return { total: discountedTotal, discount: discountPercent };
            }
        } catch (e) {
            console.error("Ошибка проверки скидки:", e);
        }
        return { total: currentTotal, discount: 0 };
    }

    // 4. Заполняем поля пользователя
    if (lastNameInput) {
        lastNameInput.value = userData.lastName || '';
    }
    if (firstNameInput) {
        firstNameInput.value = userData.firstName || '';
    }

    // 5. Заполняем детали заказа и отображаем оборудование
    if (bookingData) {
        if (orderTitle) {
            orderTitle.textContent = `Заказ`;
        }

        const nameText = bookingData.instrumentName || bookingData.itemName || 'Неизвестно';

        if (orderInstrument) {
            if (bookingData.itemType === 'Room') {
                orderInstrument.textContent = `Бронирование помещения: ${nameText}`;
            } else {
                orderInstrument.textContent = `Аренда инструмента: ${nameText}`;
            }
        }

        // Отображаем даты и время
        if (orderDates) {
            if (bookingData.itemType === 'Room') {
                orderDates.textContent = `Дата: ${bookingData.date}, Начало: ${bookingData.time}, Длительность: ${bookingData.hours} ч.`;
            } else {
                orderDates.textContent = `Срок бронирования: ${bookingData.startDate} - ${bookingData.endDate}`;
            }
        }

        // Отображаем дополнительное оборудование (если есть)
        if (additionalEquipmentContainer && bookingData.selectedEquipment && bookingData.selectedEquipment.length > 0) {
            let equipmentHtml = '<h4>Дополнительное оборудование:</h4><ul class="order-equipment-list">';
            bookingData.selectedEquipment.forEach(eq => {
                equipmentHtml += `
                    <li>
                        <span>${escapeHtml(eq.name)}</span>
                        <span class="equipment-price">+${eq.price} ₽</span>
                    </li>
                `;
            });
            equipmentHtml += '</ul>';
            additionalEquipmentContainer.innerHTML = equipmentHtml;
            additionalEquipmentContainer.style.display = 'block';
        } else if (additionalEquipmentContainer) {
            additionalEquipmentContainer.style.display = 'none';
        }

        // Отображаем цену
        if (orderTotal) {
            const userId = userData.userUid || userData.uid || userData.id;

            // Если данные уже содержат скидку (пришли из room.js/instrument.js), используем их напрямую
            let discount = bookingData.discountPercent || 0;
            let total = bookingData.totalPrice;
            let originalTotal = bookingData.originalTotal || total;

            // Если скидка неизвестна, запрашиваем абонемент
            if (discount === 0) {
                const discountResult = await applySubscriptionDiscount(userId, bookingData.totalPrice);
                discount = discountResult.discount;
                total = discountResult.total;
                originalTotal = bookingData.totalPrice;
            }

            let itemsHtml = '';
            const hasDiscount = discount > 0;

            if (bookingData.itemType === 'Room') {
                const roomBase = bookingData.hours * bookingData.pricePerHour;
                const roomOriginal = hasDiscount
                    ? Math.round(roomBase / (1 - discount / 100))
                    : roomBase;
                if (hasDiscount) {
                    itemsHtml += `Аренда помещения: <span style="text-decoration:line-through;color:#888;">${roomOriginal} ₽</span> <b>${roomBase} ₽</b><br>`;
                } else {
                    itemsHtml += `Аренда помещения: ${roomBase} ₽<br>`;
                }
                if (bookingData.equipmentTotal > 0) {
                    const eqDiscounted = hasDiscount
                        ? Math.round(bookingData.equipmentTotal * (1 - discount / 100))
                        : bookingData.equipmentTotal;
                    if (hasDiscount) {
                        itemsHtml += `Доп. оборудование: <span style="text-decoration:line-through;color:#888;">${bookingData.equipmentTotal} ₽</span> <b>${eqDiscounted} ₽</b><br>`;
                    } else {
                        itemsHtml += `Доп. оборудование: +${bookingData.equipmentTotal} ₽<br>`;
                    }
                }
            } else {
                const instrumentTotal = bookingData.totalPrice;
                if (hasDiscount) {
                    itemsHtml += `Аренда инструмента: <span style="text-decoration:line-through;color:#888;">${originalTotal} ₽</span> <b>${instrumentTotal} ₽</b><br>`;
                } else {
                    itemsHtml += `Аренда инструмента: ${instrumentTotal} ₽<br>`;
                }
            }

            if (hasDiscount) {
                orderTotal.innerHTML = `
                    <div style="margin-bottom: 10px; font-size: 0.9em; color: #666;">
                        ${itemsHtml}
                    </div>
                    <div style="border-top: 1px solid #eee; padding-top: 10px;">
                        <div style="color: #888; font-size: 0.95em;">Старая цена: ${originalTotal} ₽</div>
                        <div style="font-size: 1.4em; margin-top: 5px;">
                            <strong>К оплате: <span style="color: #e44d26;">${Math.round(total)} ₽</span></strong>
                        </div>
                        <div style="color: #4CAF50; font-size: 0.85em; margin-top: 5px;">
                            ✓ Применен абонемент (скидка ${discount}%)
                        </div>
                    </div>
                `;
            } else {
                orderTotal.innerHTML = `${itemsHtml}<br><strong>Итого: ${bookingData.totalPrice} ₽</strong>`;
            }
        }
    }

    // 6. Подтверждение бронирования
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async function () {
            const pendingRequestString = sessionStorage.getItem('pendingBookingRequest');
            const bookingDataStringNow = sessionStorage.getItem('currentBooking');

            if (!pendingRequestString || !bookingDataStringNow) {
                alert('Нет данных для подтверждения. Попробуйте снова оформить бронирование.');
                return;
            }

            let pendingRequest = null;
            let currentBooking = null;
            try {
                pendingRequest = JSON.parse(pendingRequestString);
                currentBooking = JSON.parse(bookingDataStringNow);
            } catch (e) {
                alert('Ошибка данных бронирования. Попробуйте снова.');
                return;
            }

            // Получаем ID выбранного оборудования из currentBooking
            const selectedEquipmentIds = (currentBooking.selectedEquipment || []).map(eq => eq.equipmentId);

            // Проверяем активный абонемент и рассчитываем итог со скидкой
            const userId = userData.userUid || userData.uid || userData.id;
            let finalTotal = currentBooking.totalPrice;
            let discountPercent = currentBooking.discountPercent || 0;

            // Если скидка ещё не применена в данных бронирования, запрашиваем абонемент
            if (discountPercent === 0) {
                const discountResult = await applySubscriptionDiscount(userId, currentBooking.totalPrice);
                finalTotal = discountResult.total;
                discountPercent = discountResult.discount;
            }

            // Сохраняем финальную сумму и скидку в данные бронирования
            currentBooking.originalTotal = currentBooking.originalTotal || currentBooking.totalPrice;
            currentBooking.totalPrice = Math.round(finalTotal);
            currentBooking.discountPercent = discountPercent;

            // Добавляем ID оборудования в запрос
            if (selectedEquipmentIds.length > 0) {
                pendingRequest.SelectedEquipment = selectedEquipmentIds;
            }

            try {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Сохранение...';

                // 1. Создаём бронирование (отправляем оригинальные данные, сервер сам применит скидку)
                const response = await fetch('https://localhost:7123/api/BookingsAdvanced', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        UserUid: pendingRequest.UserUid,
                        RoomId: pendingRequest.RoomId,
                        InstrumentId: pendingRequest.InstrumentId,
                        StartTime: pendingRequest.StartTime,
                        EndTime: pendingRequest.EndTime,
                        SelectedEquipment: pendingRequest.SelectedEquipment
                    })
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`HTTP ${response.status}: ${text}`);
                }

                const result = await response.json();
                console.log('Ответ сервера:', result);
                const bookingUid = result.bookingUid || result.BookingUid;
                console.log('BookingUid для оборудования:', bookingUid);

                // 2. Если есть дополнительное оборудование, создаём записи в booking_equipment
                if (selectedEquipmentIds.length > 0 && bookingUid) {
                    // Фильтруем только уникальные ID
                    const uniqueEquipmentIds = [...new Set(selectedEquipmentIds)];

                    const equipmentPromises = uniqueEquipmentIds.map(equipmentId =>
                        fetch('https://localhost:7123/api/BookingEquipments', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                BookingUid: bookingUid,
                                EquipmentId: equipmentId
                            })
                        })
                    );

                    const equipmentResults = await Promise.all(equipmentPromises);
                    const failed = equipmentResults.filter(r => !r.ok);
                    if (failed.length > 0) {
                        console.warn(`Не удалось сохранить ${failed.length} из ${uniqueEquipmentIds.length} позиций оборудования`);
                    }
                }

                const orderId = generateOrderId(bookingUid);

                // Обновляем данные бронирования
                currentBooking.bookingId = bookingUid;
                currentBooking.orderId = orderId;
                currentBooking.bookingDate = new Date().toISOString();
                sessionStorage.setItem('currentBooking', JSON.stringify(currentBooking));

                // Сохраняем в историю пользователя
                const userEmail = userData.email;
                if (userEmail) {
                    const storageKey = `bookingHistory_${userEmail}`;
                    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
                    history.push(currentBooking);
                    localStorage.setItem(storageKey, JSON.stringify(history));
                }

                // Очищаем временные данные
                sessionStorage.removeItem('pendingBookingRequest');

                // Переход на страницу подтверждения
                window.location.href = 'booking_confirmed.html';
            } catch (e) {
                console.error('Ошибка при подтверждении бронирования:', e);
                alert(`Не удалось подтвердить бронирование: ${e?.message || e}`);
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Подтвердить бронирование';
            }
        });
    }
});

function generateOrderId(bookingUuid) {
    const cleanUuid = String(bookingUuid).replace(/-/g, '');
    const shortId = cleanUuid.substring(0, 4).toUpperCase();
    return `${shortId}`;
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