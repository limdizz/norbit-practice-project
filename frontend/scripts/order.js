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
    const orderLastname = document.getElementById('order-lastname');
    const orderFirstname = document.getElementById('order-firstname');

    const orderTitle = document.getElementById('order-title');
    const invoiceItemsBody = document.getElementById('invoice-items-body');
    const subtotalAmount = document.getElementById('subtotal-amount');
    const discountRow = document.getElementById('invoice-discount-row');
    const discountAmount = document.getElementById('discount-amount');
    const orderTotal = document.getElementById('order-total');
    const additionalEquipmentContainer = document.getElementById('additional-equipment-list');
    const confirmBtn = document.getElementById('confirm-booking-btn');

    // Устанавливаем текущую дату
    const invoiceDate = document.getElementById('invoice-date');
    if (invoiceDate) {
        const now = new Date();
        invoiceDate.textContent = now.toLocaleDateString('ru-RU');
    }

    async function applySubscriptionDiscount(userId, currentTotal) {
        try {
            const response = await fetch(`https://localhost:7123/api/UserSubscriptionsAdvanced/active/${userId}`);
            if (!response.ok) return { total: currentTotal, discount: 0 };

            const activeSub = await response.json();
            const discountPercent = activeSub.plan?.discountPercentage || activeSub.discountPercentage || 0;

            if (discountPercent > 0) {
                // Используем целочисленную арифметику для избежания float-ошибок
                const discountAmount = Math.round(currentTotal * discountPercent / 100);
                const discountedTotal = currentTotal - discountAmount;
                return { total: discountedTotal, discount: discountPercent };
            }
        } catch (e) {
            console.error("Ошибка проверки скидки:", e);
        }
        return { total: currentTotal, discount: 0 };
    }

    // 4. Заполняем поля пользователя
    if (orderLastname) {
        orderLastname.textContent = userData.lastName || 'Гость';
    }
    if (orderFirstname) {
        orderFirstname.textContent = userData.firstName || 'Гость';
    }

    // 5. Заполняем детали заказа и отображаем оборудование
    if (bookingData) {
        if (orderTitle) {
            orderTitle.textContent = bookingData.orderId;
        }

        // Заполняем таблицу позиций
        if (invoiceItemsBody) {
            invoiceItemsBody.innerHTML = ''; // Очищаем перед заполнением
            let rowNumber = 1;
            let subtotal = 0;

            // Основная позиция (помещение или инструмент)
            const nameText = bookingData.instrumentName || bookingData.itemName || 'Неизвестно';
            let mainItemName = '';
            let mainItemQty = '';
            let mainItemPrice = '';
            let mainItemTotal = 0;

            if (bookingData.itemType === 'Room') {
                mainItemName = `Помещение: ${nameText}`;
                mainItemQty = `${bookingData.date}, ${bookingData.time} <br>(${bookingData.hours} ч.)`;
                // Используем originalPricePerHour напрямую (оригинальная цена за час из room.js)
                const originalPricePerHour = bookingData.originalPricePerHour || bookingData.pricePerHour;
                mainItemPrice = `${Math.round(originalPricePerHour)} ₽/ч`;
                mainItemTotal = originalPricePerHour * bookingData.hours;
            } else {
                mainItemName = `Инструмент: ${nameText}`;
                // Используем originalDailyPrice напрямую (оригинальная цена за сутки из instrument.js)
                const originalDailyPrice = bookingData.originalDailyPrice || bookingData.dailyPrice || bookingData.pricePerHour;
                const days = bookingData.days || 1;
                mainItemQty = `${bookingData.startDate} - ${bookingData.endDate} <br>(${days} дн.)`;
                mainItemPrice = `${originalDailyPrice} ₽/сут`;
                mainItemTotal = originalDailyPrice * days;
            }

            subtotal += mainItemTotal;

            let mainRowHtml = `
                <tr>
                    <td class="col-num">${rowNumber}</td>
                    <td class="col-name">${escapeHtml(mainItemName)}</td>
                    <td class="col-qty">${mainItemQty}</td>
                    <td class="col-price">${mainItemPrice}</td>
                    <td class="col-total">${mainItemTotal} ₽</td>
                </tr>
            `;
            invoiceItemsBody.innerHTML += mainRowHtml;
            rowNumber++;

            // Дополнительное оборудование
            if (bookingData.selectedEquipment && bookingData.selectedEquipment.length > 0) {
                bookingData.selectedEquipment.forEach(eq => {
                    subtotal += eq.price;
                    invoiceItemsBody.innerHTML += `
                        <tr>
                            <td class="col-num">${rowNumber}</td>
                            <td class="col-name">${escapeHtml(eq.name)}</td>
                            <td class="col-qty">1</td>
                            <td class="col-price">${eq.price} ₽</td>
                            <td class="col-total">${eq.price} ₽</td>
                        </tr>
                    `;
                    rowNumber++;
                });
            }

            // Сохраняем подытог для расчёта скидки
            bookingData.subtotal = subtotal;
        }

        // Отображаем цену с полным расчётом
        if (orderTotal) {
            const userId = userData.userUid || userData.uid || userData.id;

            // 1. Сначала рассчитываем исходную цену (до скидки) — используем originalTotal из room.js/instrument.js
            let originalPrice = bookingData.originalTotal || bookingData.subtotal || 0;
            if (originalPrice === 0) {
                // Если originalTotal не рассчитан, используем subtotal
                originalPrice = bookingData.subtotal || bookingData.totalPrice;
            }

            // 2. Проверяем абонемент и получаем скидку
            const discountResult = await applySubscriptionDiscount(userId, originalPrice);
            const discountPercent = discountResult.discount;
            const finalPrice = discountResult.total;

            // 3. Обновляем подытог (исходная цена)
            if (subtotalAmount) {
                subtotalAmount.textContent = `${Math.round(originalPrice)} ₽`;
            }

            // 4. Обновляем строку скидки
            if (discountPercent > 0) {
                discountRow.style.display = 'flex';
                if (discountAmount) {
                    const discountValue = originalPrice - finalPrice;
                    discountAmount.textContent = `-${Math.round(discountValue)} ₽ (${discountPercent}%)`;
                }
            }

            // 5. Обновляем итог (цена после скидки)
            if (orderTotal) {
                orderTotal.textContent = `${Math.round(finalPrice)} ₽`;
            }
        }

    }// 6. Подтверждение бронирования
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