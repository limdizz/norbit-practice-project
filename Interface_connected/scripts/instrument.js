document.addEventListener('DOMContentLoaded', function () {
    console.log('Страница инструмента загружается...');

    // Инициализация страницы
    initializePage();

    // Слушаем изменения URL
    window.addEventListener('popstate', function () {
        console.log('Обнаружено изменение истории браузера');
        initializePage();
    });
});

// Глобальная переменная для хранения текущего загруженного инструмента
let currentInstrument = null;

// Словари для перевода (как в каталоге)
const categoryTranslations = {
    "Electric Guitars": "Электрогитары",
    "Classical Guitars": "Классические гитары",
    "Microphones": "Микрофоны",
    "Synths": "Клавишные",
    "Bass Guitars": "Бас-гитары",
    "Drums": "Ударные установки"
};

const colorTranslations = {
    "natural": "Натуральный",
    "sunburst": "Санбёрст",
    "black": "Чёрный",
    "white": "Белый",
    "red": "Красный",
    "blue": "Синий",
    "green": "Зелёный",
    "yellow": "Жёлтый",
    "brown": "Коричневый",
    "gray": "Серый",
    "purple": "Фиолетовый",
    "pink": "Розовый",
    "orange": "Оранжевый",
    "silver": "Серебряный",
    "gold": "Золотой"
};

function initializePage() {
    loadInstrumentData();
    initDateSelects();
    initNavigation();
    // initPriceCalculation и initBookingButton вызываются внутри loadInstrumentData после загрузки данных
}

// 1. Загрузка данных инструмента из API
async function loadInstrumentData() {
    const instrumentId = getInstrumentIdFromURL();
    console.log('Загружаем инструмент с ID:', instrumentId);

    if (!instrumentId) {
        showInstrumentNotFound();
        return;
    }

    try {
        // Запрос к API
        const response = await fetch(`https://localhost:7123/api/Equipments/${instrumentId}`);

        if (!response.ok) {
            throw new Error('Инструмент не найден');
        }

        const apiData = await response.json();

        // Преобразуем данные из формата БД в формат для UI
        currentInstrument = mapApiDataToUi(apiData);

        // Рендерим страницу
        renderInstrumentDetails(currentInstrument);
        updatePageTitle(currentInstrument.name);

        // Инициализируем зависимые элементы
        updateBookingButton();
        initPriceCalculation(); // Запускаем расчет цены только когда данные есть

        // История браузера
        addToBrowserHistory(instrumentId);

    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showInstrumentNotFound();
    }
}

// Функция преобразования данных из БД (C#) в формат JS
function mapApiDataToUi(item) {
    // Перевод категории
    const translatedCategory = categoryTranslations[item.category] || item.category;
    const translatedColor = colorTranslations[item.color?.toLowerCase()] || item.color || "Не указан";
    const translatedHandedness = item.handedness === "lefty" ? "Левша" :
        item.handedness === "righty" ? "Правша" : "Универсальный";
    // Перевод состояния
    let translatedCondition = "Хорошее";

    if (item.currentCondition === "excellent") translatedCondition = "Отличное состояние";
    if (item.currentCondition === "good") translatedCondition = "Хорошее состояние";
    if (item.currentCondition === "unsignificant defects") translatedCondition = "Незначительные дефекты";
    if (item.currentCondition === "repairing") translatedCondition = "В ремонте";

    // Заглушка для характеристик (features), так как их нет в этой таблице БД
    // Можно распарсить description или оставить стандартные
    const featuresList = [
        item.color ? `Цвет: ${translatedColor}` : "Цвет не указан",
        item.handedness ? `Ориентация: ${item.handedness}` : "Универсальный",
        item.isRentable ? "Доступен для аренды" : "Временно недоступен"
    ];

    return {
        id: item.equipmentId,
        name: item.name,
        price: item.rentalPrice || 0,
        image: item.imageUrl || "img/file_not_found.png",
        category: translatedCategory,
        description: item.description || "Описание отсутствует",
        features: featuresList,
        condition: translatedCondition,
        color: translatedColor || "Не указан",
        handedness: translatedHandedness || "Правша",
        isRentable: item.isRentable
    };
}

function getInstrumentIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    return id ? parseInt(id) : null;
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
    // 1. Картинка
    const img = document.getElementById('inst-image');
    if (img) {
        img.src = instrument.image;
        img.alt = instrument.name;
    }

    // 2. Текстовые данные
    setText('inst-category', instrument.category);
    setText('inst-name', instrument.name);
    // setText('inst-desc', instrument.description);

    // Цена в блоке справа
    const priceDisplay = document.getElementById('inst-price-display');
    if (priceDisplay) {
        priceDisplay.textContent = `${instrument.price} ₽ / сутки`;
    }

    // 3. Характеристики (список)
    // const featuresList = document.getElementById('inst-features');
    // if (featuresList && instrument.features) {
    //     featuresList.innerHTML = instrument.features
    //         .map(f => `<li>${f}</li>`)
    //         .join('');
    // }

    // 4. Дополнительные детали (Цвет, Состояние)
    const extraInfo = document.getElementById('inst-details-extra');
    if (extraInfo) {
        extraInfo.innerHTML = `
            <p><strong>Состояние:</strong> ${instrument.condition}</p>
            <p><strong>Цвет:</strong> ${instrument.color}</p>
            <p><strong>Ориентация:</strong> ${instrument.handedness}</p>
        `;
    }

    // 5. Статус доступности
    const statusEl = document.getElementById('inst-status');
    const btn = document.getElementById('book_button');

    if (statusEl) {
        if (instrument.isRentable === false) { // Если API вернул false
            statusEl.innerHTML = '<span style="color:red">Временно недоступен</span>';
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        } else {
            statusEl.innerHTML = '<span style="color:green">В наличии</span>';
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        }
    }
}

// Вспомогательная функция (добавьте её, если нет)
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// 5. Очистка динамических элементов
function clearDynamicElements() {
    const elementsToRemove = ['.instrument-details', '.price-calculator'];
    elementsToRemove.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) element.remove();
    });
}

// 8. Инициализация селектов дат
function initDateSelects() {
    const startDateSelect = document.getElementById('start_date');
    const endDateSelect = document.getElementById('end_date');

    if (startDateSelect && endDateSelect) {
        populateDateSelects(startDateSelect, endDateSelect);

        startDateSelect.addEventListener('change', function () {
            updateEndDateOptions(this.value);
            updatePriceCalculation();
        });

        endDateSelect.addEventListener('change', function () {
            updatePriceCalculation();
        });

        console.log('Селекты дат инициализированы');
    }
}

// 9. Заполнение селектов
function populateDateSelects(startSelect, endSelect) {
    const today = new Date();
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';

    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = formatDate(date);
        const startOption = document.createElement('option');
        startOption.value = dateString;
        startOption.textContent = dateString;
        startSelect.appendChild(startOption);
    }

    updateEndDateOptions(formatDate(today));

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    startSelect.value = formatDate(today);
    endSelect.value = formatDate(tomorrow);
}

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
    // ВАЖНО: Используем глобальную переменную currentInstrument вместо поиска в базе
    if (!currentInstrument) return;

    const startDate = document.getElementById('start_date')?.value;
    const endDate = document.getElementById('end_date')?.value;

    if (!startDate || !endDate) return;

    const days = calculateDaysDifference(startDate, endDate);
    const totalPrice = days * currentInstrument.price;

    const daysCountElement = document.getElementById('days-count');
    const totalPriceElement = document.getElementById('total-price');

    if (daysCountElement && totalPriceElement) {
        daysCountElement.textContent = days;
        totalPriceElement.textContent = `₽${totalPrice}`;
    }
}

// 13. Обновление кнопки бронирования
function updateBookingButton() {
    // Ищем кнопку
    const bookButton = document.getElementById('book_button') || document.querySelector('.card_item');

    if (bookButton) {
        // Клонируем, чтобы удалить старые EventListener'ы
        const newBookButton = bookButton.cloneNode(true);
        bookButton.parentNode.replaceChild(newBookButton, bookButton);

        newBookButton.addEventListener('click', function (e) {
            e.preventDefault();
            handleBooking();
        });

        // Добавляем ID, если его не было, для удобства
        if (!newBookButton.id) newBookButton.id = 'book_button';
    }
}

// 14. Обработка бронирования
function handleBooking() {
    // Используем currentInstrument
    if (!currentInstrument) {
        alert("Ошибка: Инструмент не загружен");
        return;
    }

    const startDate = document.getElementById('start_date')?.value;
    const endDate = document.getElementById('end_date')?.value;

    if (!startDate || !endDate) {
        alert('Пожалуйста, выберите даты бронирования');
        return;
    }

    const days = calculateDaysDifference(startDate, endDate);
    const totalPrice = days * currentInstrument.price;

    const bookingData = {
        bookingId: 'ORD' + Date.now(),
        instrumentId: currentInstrument.id,
        instrumentName: currentInstrument.name,
        instrumentImage: currentInstrument.image,
        startDate,
        endDate,
        days,
        totalPrice,
        dailyPrice: currentInstrument.price,
        bookingDate: new Date().toISOString()
    };

    saveBookingData(bookingData);

    sessionStorage.setItem('currentBooking', JSON.stringify(bookingData));

    // Переход на страницу заказа
    window.location.href = 'order.html';
}

function saveBookingData(bookingData) {
    // 1. Получаем данные текущего пользователя
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userEmail = userData.email;

    if (!userEmail) {
        alert("Ошибка: Пользователь не определен. Пожалуйста, войдите в систему.");
        return;
    }

    // 2. Формируем УНИКАЛЬНЫЙ ключ
    const storageKey = `bookingHistory_${userEmail}`;

    // 3. Загружаем историю ЭТОГО пользователя
    let bookingHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');

    // 4. Добавляем новое бронирование
    bookingHistory.push({
        ...bookingData,
        bookingId: Date.now()
    });

    // 5. Сохраняем обратно под УНИКАЛЬНЫМ ключом
    localStorage.setItem(storageKey, JSON.stringify(bookingHistory));
}

// Вспомогательные функции навигации и дат
function initNavigation() {
    const menuItems = document.querySelectorAll('.menu__item, .footer_menu__item');
    menuItems.forEach(item => {
        item.addEventListener('click', function (e) {
            // Если у ссылки есть href и он не #, даем браузеру перейти самому
            const href = this.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('javascript')) {
                return;
            }
            e.preventDefault();
            const page = this.textContent.trim().toLowerCase();
            navigateToPage(page);
        });
    });
}

function navigateToPage(page) {
    const pageMap = {
        'главная': 'index.html',
        'бронирование': 'index.html',
        'мои бронирования': 'my_bookings.html',
        'абонементы': 'subscription_plans.html',
        'цены': 'prices.html',
        'контакты': 'contacts.html',
        'профиль': 'profile.html',
        'каталог инструментов': 'instruments_catalog.html'
    };
    const url = pageMap[page] || 'index.html';
    window.location.href = url;
}

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
    return days > 0 ? days : 1;
}

function updatePageTitle(instrumentName) {
    document.title = `${instrumentName} - Аренда | Музыкальная студия`;
}

function showInstrumentNotFound() {
    const main = document.querySelector('.main') || document.body;
    main.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <h2>Инструмент не найден</h2>
            <p>Возможно, он был удален или ссылка некорректна.</p>
            <button onclick="location.href='instruments_catalog.html'" 
                    style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Вернуться в каталог
            </button>
        </div>
    `;
}