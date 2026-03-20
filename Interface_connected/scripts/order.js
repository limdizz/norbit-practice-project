document.addEventListener('DOMContentLoaded', function () {
    console.log('Страница заказа загружена. Заполняем данные...');

    // 1. Получаем данные пользователя из localStorage
    const userDataString = localStorage.getItem('userData');
    let userData = { firstName: 'Гость', lastName: 'Гость' }; // По умолчанию

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
    const confirmBtn = document.getElementById('confirm-booking-btn');

    // 4. Заполняем поля пользователя
    if (lastNameInput) {
        lastNameInput.value = userData.lastName;
    }
    if (firstNameInput) {
        firstNameInput.value = userData.firstName;
    }

    // 5. Заполняем детали заказа
    if (bookingData) {
        // Заголовок заказа
        if (orderTitle) {
            orderTitle.textContent = `Заказ`;
        }

        // Название (для помещений и инструментов)
        const nameText = bookingData.instrumentName || bookingData.itemName || 'Неизвестно';

        if (orderInstrument) {
            // Проверяем тип объекта
            if (bookingData.itemType === 'Room') {
                orderInstrument.textContent = `Бронирование помещения: ${nameText}`;
            } else {
                orderInstrument.textContent = `Аренда инструмента: ${nameText}`;
            }
        }

        // Даты и время 
        if (orderDates) {
            if (bookingData.itemType === 'Room') {
                // ЛОГИКА ДЛЯ ПОМЕЩЕНИЙ
                // Выводим конкретную дату и количество часов
                orderDates.textContent = `Дата: ${bookingData.date}, Время: ${bookingData.time}, Длительность: ${bookingData.hours} ч.`;
            } else {
                // ЛОГИКА ДЛЯ ИНСТРУМЕНТОВ 
                orderDates.textContent = `Срок бронирования: ${bookingData.startDate} - ${bookingData.endDate}`;
            }
        }

        // Цена
        if (orderTotal) {
            orderTotal.textContent = `Итого: ₽${bookingData.totalPrice}`;
        }
    } else {
        // Ошибка, если данных нет
        if (orderInstrument) orderInstrument.textContent = 'Ошибка: Детали заказа не найдены.';
        if (orderTotal) orderTotal.textContent = 'Итого: ₽0';
    }

    // 6. Подтверждение бронирования (фактическая запись в БД)
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

            try {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Сохранение...';

                const response = await fetch('https://localhost:7123/api/BookingsAdvanced', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(pendingRequest)
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`HTTP ${response.status}: ${text}`);
                }

                const result = await response.json();
                const bookingId = result.bookingUid;
                const orderId = generateOrderId(bookingId);

                // Обновляем sessionStorage текущего заказа
                currentBooking.bookingId = bookingId;
                currentBooking.orderId = orderId;
                currentBooking.bookingDate = new Date().toISOString();
                sessionStorage.setItem('currentBooking', JSON.stringify(currentBooking));

                // Сохраняем в LocalStorage (для отображения в профиле/списке)
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                const userEmail = userData.email;
                if (!userEmail) {
                    // На всякий случай: если нет email, пропускаем локальное сохранение
                    console.warn('userData.email не найден, локальная история не обновится.');
                } else {
                    const storageKey = `bookingHistory_${userEmail}`;
                    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
                    history.push(currentBooking);
                    localStorage.setItem(storageKey, JSON.stringify(history));
                }

                // Очищаем pending-запрос
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