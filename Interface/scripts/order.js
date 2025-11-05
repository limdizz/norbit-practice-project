document.addEventListener('DOMContentLoaded', function() {
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
        // Можно попробовать загрузить из localStorage как резервный вариант
        const lastBookingString = localStorage.getItem('lastBooking');
        if (lastBookingString) {
            console.warn('Загружаем резервные данные из localStorage');
            bookingData = JSON.parse(lastBookingString);
        }
    }

    // 3. Находим элементы на странице
    const lastNameInput = document.querySelector('input[placeholder="Иванов"]');
    const firstNameInput = document.querySelector('input[placeholder="Иван"]');
    
    // Элементы, которые нужно найти (добавьте им ID в HTML)
    const orderTitle = document.getElementById('order-title');
    const orderInstrument = document.getElementById('order-instrument');
    const orderDates = document.getElementById('order-dates');
    const orderTotal = document.getElementById('order-total');

    // 4. Заполняем поля пользователя
    if (lastNameInput) {
        lastNameInput.value = userData.lastName;
    }
    if (firstNameInput) {
        firstNameInput.value = userData.firstName;
    }

    // 5. Заполняем детали заказа
    if (bookingData) {
        if (orderTitle) {
            orderTitle.textContent = `Заказ №${bookingData.bookingId}`;
        }
        if (orderInstrument) {
            orderInstrument.textContent = `Аренда инструмента: ${bookingData.instrumentName}`;
        }
        if (orderDates) {
            orderDates.textContent = `Срок бронирования: ${bookingData.startDate} - ${bookingData.endDate}`;
        }
        if (orderTotal) {
            orderTotal.textContent = `Итого: ₽${bookingData.totalPrice}`;
        }
    } else {
        // Если данные о бронировании так и не нашлись
        if (orderInstrument) {
            orderInstrument.textContent = 'Ошибка: Детали заказа не найдены.';
        }
        if (orderTotal) {
            orderTotal.textContent = 'Итого: ₽0';
        }
    }
    
    // 6. (Опционально) Очищаем sessionStorage после использования,
    // чтобы этот заказ не показался снова при обновлении
    // sessionStorage.removeItem('currentBooking');
});