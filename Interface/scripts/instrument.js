document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница инструмента загружается...');
    
    // Инициализация страницы
    initializePage();
    
    // Слушаем изменения URL (при нажатии назад/вперед)
    window.addEventListener('popstate', function() {
        console.log('Обнаружено изменение истории браузера');
        initializePage();
    });
});

function initializePage() {
    loadInstrumentData();
    initDateSelects();
    initBookingButton();
    initNavigation();
    initPriceCalculation();
}

// База данных инструментов (должна совпадать с catalog_instruments.js)
const instrumentsDatabase = {
    1: {
        id: 1,
        name: "Fender Jaguar",
        price: 2800,
        image: "https://bxuiiaeu1l.a.trbcdn.net/898/8p5/b4b/5kw/kcw/gwo/scw/wg8/8/8988p5b4b5kwkcwgwoscwwg88.jpg",
        category: "Электрогитары",
        description: "Легендарная электрогитара Fender Jaguar с уникальным звучанием и стильным дизайном. Идеальна для альтернативного рока и инди-музыки.",
        features: ["22 лада", "Два сингловых звукоснимателя", "Тремоло система", "Корпус из ольхи"],
        condition: "Отличное состояние",
        color: "Санбёрст",
        handedness: "Правша",
        isNew: false
    },
    2: {
        id: 2,
        name: "Fender Jazzmaster",
        price: 3000,
        image: "https://bxuiiaeu1l.a.trbcdn.net/8hw/nq5/7kq/9cs/4ww/gks/wcs/wg4/4/8hwnq57kq9cs4wwgkswcswg44.jpg",
        category: "Электрогитары",
        description: "Fender Jazzmaster - классика для джазовых и рок-гитаристов. Уникальная форма корпуса и богатый звук.",
        features: ["21 лад", "Два сингловых звукоснимателя", "Фиксированный бридж", "Корпус из ясеня"],
        condition: "Новое",
        color: "Белый",
        handedness: "Правша",
        isNew: true
    },
    3: {
        id: 3,
        name: "Fender Stratocaster",
        price: 2000,
        image: "https://86gvdq3w04.a.trbcdn.net/212/4a3/aqo/x5w/4kg/gks/0gg/sgo/w/2124a3aqox5w4kggks0ggsgow.jpg",
        category: "Электрогитары",
        description: "Самая узнаваемая электрогитара в мире. Fender Stratocaster предлагает универсальное звучание для любого стиля.",
        features: ["21 лад", "Три сингловых звукоснимателя", "Тремоло система", "Корпус из ольхи"],
        condition: "Отличное состояние",
        color: "Чёрный",
        handedness: "Правша",
        isNew: false
    }
};

// 1. Загрузка данных инструмента из URL параметров
function loadInstrumentData() {
    const instrumentId = getInstrumentIdFromURL();
    console.log('Загружаем инструмент с ID:', instrumentId, 'из URL:', window.location.href);
    
    const instrument = instrumentsDatabase[instrumentId];
    localStorage.setItem('lastInstrumentId', instrumentId);
    if (instrument) {
        renderInstrumentDetails(instrument);
        updatePageTitle(instrument.name);
        updateBookingButton(instrument.id);
        
        // Добавляем в историю браузера
        addToBrowserHistory(instrumentId);
    } else {
        showInstrumentNotFound();
    }
}

function getInstrumentIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    let instrumentId = id ? parseInt(id) : null;

    // Если ID нет в URL, пробуем взять из localStorage
    if (!instrumentId || !instrumentsDatabase[instrumentId]) {
        const savedId = localStorage.getItem('lastInstrumentId');
        if (savedId && instrumentsDatabase[savedId]) {
            console.log('Восстанавливаем ID инструмента из localStorage:', savedId);
            instrumentId = parseInt(savedId);
        } else {
            console.warn('Инструмент не найден, показываем первый инструмент');
            instrumentId = 1;
        }
    }

    return instrumentId;
}

// 3. Добавление в историю браузера
function addToBrowserHistory(instrumentId) {
    const newUrl = `instrument.html?id=${instrumentId}`;
    if (!window.location.href.includes(`id=${instrumentId}`)) {
        window.history.pushState({ instrumentId }, '', newUrl);
        console.log('Добавлено новое состояние в историю:', newUrl);
    }
}

// 4. Рендеринг деталей инструмента
function renderInstrumentDetails(instrument) {
    console.log('Рендерим инструмент:', instrument.name);
    
    // Очищаем старые динамические элементы
    clearDynamicElements();

    // Обновляем изображение
    const instrumentImage = document.querySelector('.instrument_card img');
    if (instrumentImage) {
        instrumentImage.src = instrument.image;
        instrumentImage.alt = instrument.name;
        console.log('Изображение обновлено');
    }

    // Обновляем название и цену
    const instrumentNameElements = document.querySelectorAll('.instrument_card h2');
    if (instrumentNameElements.length >= 2) {
        // Первый h2 - цена
        instrumentNameElements[0].textContent = `₽${instrument.price}`;
        // Второй h2 - название
        instrumentNameElements[1].textContent = instrument.name;
        console.log('Название и цена обновлены');
    }

    // Добавляем дополнительную информацию
    addInstrumentDetails(instrument);
}

// 5. Очистка динамических элементов
function clearDynamicElements() {
    const elementsToRemove = [
        '.instrument-details',
        '.price-calculator'
    ];
    
    elementsToRemove.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.remove();
            console.log('Удален элемент:', selector);
        }
    });
}

// 6. Добавление дополнительной информации об инструменте
function addInstrumentDetails(instrument) {
    const instrumentCard = document.querySelector('.instrument_card');
    
    // Создаем контейнер для деталей
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'instrument-details';
    detailsContainer.style.cssText = `
        margin: 20px 0;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #007bff;
    `;

    detailsContainer.innerHTML = `
        <h3 style="margin-top: 0; color: #333;">Описание</h3>
        <p style="color: #666; line-height: 1.5;">${instrument.description}</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
            <div>
                <h4 style="margin: 0 0 8px 0; color: #333;">Характеристики</h4>
                <ul style="color: #666; margin: 0; padding-left: 20px;">
                    ${instrument.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
            </div>
            <div>
                <h4 style="margin: 0 0 8px 0; color: #333;">Детали</h4>
                <div style="color: #666;">
                    <p><strong>Состояние:</strong> ${instrument.condition}</p>
                    <p><strong>Цвет:</strong> ${instrument.color}</p>
                    <p><strong>Для:</strong> ${instrument.handedness}</p>
                    <p><strong>Категория:</strong> ${instrument.category}</p>
                </div>
            </div>
        </div>
    `;

    // Вставляем детали после изображения
    const instrumentImage = document.querySelector('.instrument_card img');
    instrumentImage.parentNode.insertBefore(detailsContainer, instrumentImage.nextSibling);

    // Добавляем калькулятор стоимости
    addPriceCalculator(instrument.price);
}

// 7. Добавление калькулятора стоимости
function addPriceCalculator(dailyPrice) {
    const instrumentCard = document.querySelector('.instrument_card');

    const calculator = document.createElement('div');
    calculator.className = 'price-calculator';
    calculator.style.cssText = `
        margin: 20px 0;
        padding: 15px;
        background: #e8f5e8;
        border-radius: 8px;
        border: 1px solid #4CAF50;
    `;

    calculator.innerHTML = `
        <h3 style="margin-top: 0; color: #2e7d32;">Калькулятор стоимости</h3>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <span style="color: #666;">Стоимость за день:</span>
            <strong style="color: #e44d26;">₽${dailyPrice}</strong>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #666;">Количество дней:</span>
            <strong id="days-count" style="color: #2e7d32;">1</strong>
        </div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ccc;">
            <strong style="color: #333;">Итоговая стоимость: </strong>
            <span id="total-price" style="color: #e44d26; font-size: 1.2em; font-weight: bold;">₽${dailyPrice}</span>
        </div>
    `;

    // Вставляем калькулятор перед кнопкой бронирования
    const bookButton = document.querySelector('.card_item');
    instrumentCard.insertBefore(calculator, bookButton);

    console.log('Калькулятор стоимости добавлен');
}

// 8. Инициализация селектов дат
function initDateSelects() {
    const startDateSelect = document.getElementById('start_date');
    const endDateSelect = document.getElementById('end_date');

    if (startDateSelect && endDateSelect) {
        // Заполняем даты на 30 дней вперед
        populateDateSelects(startDateSelect, endDateSelect);

        // Обновляем конечные даты при изменении начальной
        startDateSelect.addEventListener('change', function() {
            updateEndDateOptions(this.value);
            updatePriceCalculation();
        });

        endDateSelect.addEventListener('change', function() {
            updatePriceCalculation();
        });
        
        console.log('Селекты дат инициализированы');
    }
}

// 9. Заполнение селектов датами
function populateDateSelects(startSelect, endSelect) {
    const today = new Date();
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';

    for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        
        const dateString = formatDate(date);
        const option = document.createElement('option');
        option.value = dateString;
        option.textContent = dateString;

        startSelect.appendChild(option.cloneNode(true));
        
        // Для конечной даты начинаем со следующего дня
        if (i > 0) {
            endSelect.appendChild(option);
        }
    }

    // Устанавливаем начальные значения
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    startSelect.value = formatDate(today);
    endSelect.value = formatDate(tomorrow);
}

// 10. Обновление опций конечной даты
function updateEndDateOptions(selectedStartDate) {
    const endDateSelect = document.getElementById('end_date');
    const startDate = parseDate(selectedStartDate);
    
    if (!endDateSelect) return;

    endDateSelect.innerHTML = '';

    for (let i = 1; i <= 30; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dateString = formatDate(date);
        const option = document.createElement('option');
        option.value = dateString;
        option.textContent = dateString;

        endDateSelect.appendChild(option);
    }

    // Устанавливаем первую доступную дату
    if (endDateSelect.options.length > 0) {
        endDateSelect.value = endDateSelect.options[0].value;
    }
}

// 11. Инициализация расчета цены
function initPriceCalculation() {
    updatePriceCalculation();
}

// 12. Обновление расчета стоимости
function updatePriceCalculation() {
    const instrumentId = getInstrumentIdFromURL();
    const instrument = instrumentsDatabase[instrumentId];
    
    if (!instrument) return;

    const startDate = document.getElementById('start_date')?.value;
    const endDate = document.getElementById('end_date')?.value;
    
    if (!startDate || !endDate) return;

    const days = calculateDaysDifference(startDate, endDate);
    const totalPrice = days * instrument.price;

    // Обновляем отображение
    const daysCountElement = document.getElementById('days-count');
    const totalPriceElement = document.getElementById('total-price');

    if (daysCountElement && totalPriceElement) {
        daysCountElement.textContent = days;
        totalPriceElement.textContent = `₽${totalPrice}`;
    }
}

// 13. Обновление кнопки бронирования
function updateBookingButton(instrumentId) {
    const bookButton = document.querySelector('.card_item');
    if (bookButton) {
        // Удаляем старый обработчик, если есть
        const newBookButton = bookButton.cloneNode(true);
        bookButton.parentNode.replaceChild(newBookButton, bookButton);
        
        // Добавляем новый обработчик
        newBookButton.addEventListener('click', function(e) {
            e.preventDefault();
            handleBooking(instrumentId);
        });
        
        console.log('Кнопка бронирования обновлена');
    }
}

// 14. Обработка бронирования
function handleBooking(instrumentId) {
    const instrument = instrumentsDatabase[instrumentId];
    const startDate = document.getElementById('start_date')?.value;
    const endDate = document.getElementById('end_date')?.value;
    
    if (!instrument || !startDate || !endDate) {
        alert('Пожалуйста, выберите даты бронирования');
        return;
    }

    const days = calculateDaysDifference(startDate, endDate);
    const totalPrice = days * instrument.price;

    // Сохраняем данные бронирования
    const bookingData = {
        instrumentId: instrumentId,
        instrumentName: instrument.name,
        instrumentImage: instrument.image,
        startDate: startDate,
        endDate: endDate,
        days: days,
        totalPrice: totalPrice,
        dailyPrice: instrument.price,
        bookingDate: new Date().toISOString(),
        bookingId: 'ORD' + Date.now()
    };

    console.log('Сохранение данных бронирования:', bookingData);
    
    // Сохраняем в sessionStorage и localStorage
    sessionStorage.setItem('currentBooking', JSON.stringify(bookingData));
    localStorage.setItem('lastBooking', JSON.stringify(bookingData));
    
    console.log('Данные сохранены в sessionStorage и localStorage');

    // Переходим на страницу заказа
    window.location.href = 'order.html';
}
// 15. Сохранение данных бронирования
function saveBookingData(bookingData) {
    try {
        // Сохраняем в sessionStorage для текущей сессии
        sessionStorage.setItem('currentBooking', JSON.stringify(bookingData));
        
        // Сохраняем в историю бронирований в localStorage
        let bookingHistory = JSON.parse(localStorage.getItem('bookingHistory') || '[]');
        bookingHistory.push({
            ...bookingData,
            bookingId: Date.now() // Уникальный ID бронирования
        });
        localStorage.setItem('bookingHistory', JSON.stringify(bookingHistory));
        
        console.log('Данные бронирования сохранены:', bookingData);
    } catch (error) {
        console.error('Ошибка при сохранении данных бронирования:', error);
    }
}

// 16. Инициализация навигации
function initNavigation() {
    // Обработчики для header меню
    const menuItems = document.querySelectorAll('.menu__item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.textContent.trim().toLowerCase();
            navigateToPage(page);
        });
    });

    // Обработчики для footer меню
    const footerItems = document.querySelectorAll('.footer_menu__item');
    footerItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.textContent.trim().toLowerCase();
            navigateToPage(page);
        });
    });
    
    console.log('Навигация инициализирована');
}

// 17. Навигация между страницами
function navigateToPage(page) {
    const pageMap = {
        'главная': 'index.html',
        'бронирование': 'booking.html',
        'мои бронирования': 'my-bookings.html',
        'абонементы': 'subscriptions.html',
        'цены': 'pricing.html',
        'контакты': 'contacts.html',
        'профиль': 'profile.html',
        'каталог инструментов': 'catalog.html'
    };

    const url = pageMap[page] || 'index.html';
    window.location.href = url;
}

// 18. Вспомогательные функции
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function parseDate(dateString) {
    const [day, month, year] = dateString.split('.').map(Number);
    return new Date(year, month - 1, day);
}

function calculateDaysDifference(startDateStr, endDateStr) {
    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);
    
    const difference = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(difference / (1000 * 3600 * 24));
    return days > 0 ? days : 1; // Минимум 1 день
}

function updatePageTitle(instrumentName) {
    document.title = `${instrumentName} - Аренда | Музыкальная студия`;
}

function showInstrumentNotFound() {
    const main = document.querySelector('.main');
    if (main) {
        main.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h2>Инструмент не найден</h2>
                <p>Извините, запрашиваемый инструмент не существует.</p>
                <button onclick="location.href='catalog.html'" 
                        style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Вернуться в каталог
                </button>
            </div>
        `;
    }
}

// 19. Инициализация кнопки бронирования (отдельная функция)
function initBookingButton() {
    const bookButton = document.querySelector('.card_item');
    if (bookButton) {
        // Убираем встроенный onclick и добавляем наш обработчик
        bookButton.removeAttribute('onclick');
        console.log('Кнопка бронирования инициализирована');
    }
}

function saveBookingData(bookingData) {
    try {
        // Сохраняем в sessionStorage
        sessionStorage.setItem('currentBooking', JSON.stringify(bookingData));
        
        // Дублируем в localStorage для надежности
        localStorage.setItem('lastBooking', JSON.stringify(bookingData));
        
        console.log('Данные бронирования сохранены:', bookingData);
    } catch (error) {
        console.error('Ошибка при сохранении данных бронирования:', error);
    }
}