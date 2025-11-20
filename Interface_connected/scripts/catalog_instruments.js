document.addEventListener('DOMContentLoaded', function () {
    // Инициализация всех модулей
    initFilters();
    initSearch();
    // Загружаем данные с сервера вместо initInstrumentCards()
    loadInstrumentsFromApi();
    initPriceRange();
    initNavigation();
    handleUrlParams();
});

// Глобальная переменная для хранения данных
let instrumentsData = [];

const categoryTranslations = {
    "Electric Guitars": "Электрогитары",
    "Classical Guitars": "Классические гитары",
    "Microphones": "Микрофоны",
    "Synths": "Клавишные",
    "Bass Guitars": "Бас-гитары",     // На случай, если появятся
    "Drums": "Ударные установки"      // На случай, если появятся
};

async function loadInstrumentsFromApi() {
    const productList = document.querySelector('.product-list');
    productList.innerHTML = '<p style="text-align:center;">Загрузка инструментов...</p>';

    try {
        const response = await fetch('https://localhost:7123/api/Equipments');

        if (!response.ok) {
            throw new Error('Ошибка сети: ' + response.status);
        }

        const data = await response.json();

        instrumentsData = data.map(item => {
            // 1. Переводим категорию. Если перевода нет, оставляем как есть из БД
            const translatedCategory = categoryTranslations[item.category] || item.category;

            // 2. Определяем логику "Новизны" и "Состояния"
            // В вашей таблице current_condition это строки "good", "excellent", "unsignificant defects"
            // Нам нужно превратить их в красивые русские надписи
            let conditionRus = "Хорошее";
            let isNewBool = false;

            if (item.currentCondition === "excellent") conditionRus = "Отличное состояние";
            if (item.currentCondition === "good") conditionRus = "Хорошее состояние";
            if (item.currentCondition === "unsignificant defects") conditionRus = "Незначительные дефекты";
            if (item.currentCondition === "new") {
                conditionRus = "Новое";
                isNewBool = true;
            }
            if (item.currentCondition === "repairing") conditionRus = "В ремонте";

            return {
                id: item.equipmentId,
                name: item.name,
                price: item.rentalPrice || 0,
                category: translatedCategory, // Используем переведенную категорию
                condition: conditionRus,

                // Заглушки для полей, которых нет в БД
                image: item.imageUrl || "img/file_not_found.png",

                // 2. Цвет. Если в БД пусто, пишем "Не указан"
                color: item.color || "Не указан",

                // 3. Левша/Правша. Если пусто - считаем Правша
                handedness: item.handedness || "Правша",

                // 4. Новизна. Берем напрямую из БД (true/false)
                // Если в БД null, считаем false
                isNew: item.isNew === true,

                // Дополнительно сохраняем статус доступности из БД
                isRentable: item.isRentable
            };
        });

        // Фильтруем те, что в ремонте или недоступны (если нужно скрывать их)
        // instrumentsData = instrumentsData.filter(i => i.isRentable); 

        // 1. Заполняем фильтр (теперь там будут русские названия)
        populateCategoryOptions();

        // 2. Проверяем URL параметры
        handleUrlParams();

        checkHandednessVisibility();

        // 3. Применяем фильтры
        applyFilters();

        // 4. Обновляем цены
        updatePriceRange();

    } catch (error) {
        console.error('Ошибка при загрузке инструментов:', error);
        productList.innerHTML = '<p style="text-align:center; color:red;">Не удалось загрузить список инструментов.</p>';
    }
}

function populateCategoryOptions() {
    const categorySelect = document.getElementById('categories');
    if (!categorySelect) return;

    const currentValue = categorySelect.value;

    // Получаем уникальные категории (уже переведенные на русский)
    const uniqueCategories = [...new Set(instrumentsData.map(i => i.category))].filter(c => c);

    // Очищаем и добавляем "Все"
    categorySelect.innerHTML = '<option value="Все">Все категории</option>';

    uniqueCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    // Восстанавливаем выбор
    if (uniqueCategories.includes(currentValue)) {
        categorySelect.value = currentValue;
    }
}

function checkHandednessVisibility() {
    const categorySelect = document.getElementById('categories');
    const handednessContainer = document.getElementById('handedness-container');

    if (!categorySelect || !handednessContainer) return;

    const selectedCategory = categorySelect.value;

    // Список категорий, для которых актуален этот фильтр
    const guitarCategories = [
        "Электрогитары",
        "Классические гитары",
        "Бас-гитары",
        "Акустические гитары"
    ];

    // Проверяем, входит ли выбранная категория в список гитар
    if (guitarCategories.includes(selectedCategory)) {
        // Показываем
        handednessContainer.style.display = 'block';
    } else {
        // Скрываем
        handednessContainer.style.display = 'none';

        // ВАЖНО: Сбрасываем галочки, чтобы скрытый фильтр не влиял на поиск
        const checkboxes = document.querySelectorAll('input[name="handedness"]');
        let changed = false;
        checkboxes.forEach(cb => {
            if (cb.checked) {
                cb.checked = false;
                changed = true;
            }
        });

        // Если были убраны галочки, нужно перезапустить фильтрацию
        if (changed) {
            applyFilters();
        }
    }
}

// 1. Инициализация фильтров
function initFilters() {
    const categorySelect = document.getElementById('categories');
    const colorSelect = document.getElementById('colors');

    if (categorySelect) {
        categorySelect.addEventListener('change', function () {
            // Сначала проверяем видимость блока handedness
            checkHandednessVisibility();
            // Потом применяем фильтры
            applyFilters();
        });
    }
    if (colorSelect) colorSelect.addEventListener('change', applyFilters);

    document.querySelectorAll('input[name="current_status"]').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });

    document.querySelectorAll('input[name="handedness"]').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
}

// ---- 2. Инициализация поиска ----
function initSearch() {
    const searchInput = document.getElementById('site-search');
    const searchButton = document.getElementById('search-button');

    if (!searchInput || !searchButton) return;

    const debouncedApply = debounce(applyFilters, 300);

    searchInput.addEventListener('input', function () {
        debouncedApply();
    });

    searchButton.addEventListener('click', function (e) {
        e.preventDefault();
        applyFilters();
    });

    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyFilters();
        }
    });
}

// ---- 4. Инициализация диапазона цен ----
function initPriceRange() {
    const priceContainer = document.getElementById('price-container');
    if (!priceContainer) return;

    // Создаем элементы, но max значение обновим позже
    const priceRange = document.createElement('input');
    priceRange.type = 'range';
    priceRange.min = 1;
    priceRange.max = 10000; // Временное значение
    priceRange.value = 10000;
    priceRange.id = 'price-range';

    const priceDisplay = document.createElement('span');
    priceDisplay.className = 'price-display';
    priceDisplay.textContent = `Загрузка...`;

    priceContainer.appendChild(priceRange);
    priceContainer.appendChild(priceDisplay);

    const debouncedApply = debounce(applyFilters, 300);

    priceRange.addEventListener('input', function () {
        priceDisplay.textContent = `до ${this.value} ₽`;
        debouncedApply();
    });
}

// Функция обновления слайдера после получения данных
function updatePriceRange() {
    const priceRange = document.getElementById('price-range');
    const priceDisplay = document.querySelector('.price-display');

    if (priceRange && instrumentsData.length > 0) {
        const maxPriceValue = Math.max(...instrumentsData.map(i => i.price), 1000);
        priceRange.max = maxPriceValue;
        priceRange.value = maxPriceValue;
        priceDisplay.textContent = `до ${priceRange.value} ₽`;
    }
}

// ---- 5. Навигация ----
function initNavigation() {
    const menuItems = document.querySelectorAll('.menu__item');
    menuItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const page = this.textContent.trim().toLowerCase();
            navigateToPage(page);
        });
    });

    const footerItems = document.querySelectorAll('.footer_menu__item');
    footerItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const page = this.textContent.trim().toLowerCase();
            navigateToPage(page);
        });
    });
}

// ---- 6. Основная функция применения фильтров ----
function applyFilters() {
    const categoryEl = document.getElementById('categories');
    const colorEl = document.getElementById('colors');
    const searchEl = document.getElementById('site-search');
    const priceRangeEl = document.getElementById('price-range');

    const selectedCategory = categoryEl ? categoryEl.value : "Все";
    const selectedColor = colorEl ? colorEl.value : "Все";
    const searchTerm = (searchEl ? searchEl.value : '').trim().toLowerCase();
    const maxPrice = priceRangeEl ? parseInt(priceRangeEl.value, 10) : Infinity;

    const excellentCondition = !!document.querySelector('input[value="excellent"]') && document.querySelector('input[value="excellent"]').checked;
    const newCondition = !!document.querySelector('input[value="new"]') && document.querySelector('input[value="new"]').checked;

    const leftyChecked = !!document.querySelector('input[value="lefty"]') && document.querySelector('input[value="lefty"]').checked;
    const rightyChecked = !!document.querySelector('input[value="righty"]') && document.querySelector('input[value="righty"]').checked;

    const filteredInstruments = instrumentsData.filter(instrument => {
        // Категория
        if (selectedCategory && selectedCategory !== "Все" && instrument.category !== selectedCategory) {
            return false;
        }

        // Цвет
        if (selectedColor && selectedColor !== "Все" && instrument.color !== selectedColor) {
            return false;
        }

        // Поиск
        if (searchTerm && instrument.name && !instrument.name.toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Цена
        if (instrument.price > maxPrice) {
            return false;
        }

        // Состояние (Маппинг API условий на фильтры)
        if (excellentCondition && instrument.condition !== "Отличное состояние" && instrument.condition !== "Хорошее") {
            return false;
        }
        if (newCondition && !instrument.isNew) {
            return false;
        }

        // Удобство (левша/правша)
        if (leftyChecked && rightyChecked) {
            // оба выбраны
        } else if (leftyChecked && instrument.handedness !== "Левша") {
            return false;
        } else if (rightyChecked && instrument.handedness !== "Правша") {
            return false;
        }

        return true;
    });

    renderInstruments(filteredInstruments);
}

// ---- 7. Рендеринг инструментов ----
function renderInstruments(instruments) {
    const productList = document.querySelector('.product-list');
    if (!productList) return;

    productList.innerHTML = '';

    if (instruments.length === 0) {
        const noResults = document.createElement('p');
        noResults.className = 'no-results';
        noResults.textContent = 'Инструменты не найдены. Попробуйте изменить фильтры.';
        noResults.style.cssText = 'text-align: center; padding: 20px; color: #666; width: 100%;';
        productList.appendChild(noResults);
        return;
    }

    instruments.forEach(instrument => {
        const instrumentCard = createInstrumentCard(instrument);
        productList.appendChild(instrumentCard);
    });
}

// ---- 8. Создание карточки инструмента ----
function createInstrumentCard(instrument) {
    const cardContainer = document.createElement('div');
    cardContainer.className = 'instrument-card';
    cardContainer.style.cssText = `
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        margin: 10px;
        text-align: center;
        background: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        display: inline-block;
        vertical-align: top;
        width: 150px;
        height: 275px;
    `;

    // Используем заглушку, если картинки нет
    const imgSrc = instrument.image || 'img/file_not_found.png';

    const guitarCategories = [
        "Электрогитары",
        "Классические гитары",
        "Бас-гитары",
        "Акустические гитары"
    ];

    // Начинаем с цвета
    let detailsText = instrument.color;

    // Если категория относится к гитарам, добавляем ориентацию
    if (guitarCategories.includes(instrument.category)) {
        detailsText += ` • ${instrument.handedness}`;
    }

    cardContainer.innerHTML = `
        <img src="${imgSrc}" 
             alt="${instrument.name}" 
             style="width: 100px; height: 150px; object-fit: contain; border-radius: 4px;">
        <h3 style="margin: 10px 0 5px 0; color: #333; font-size: 1em;">${instrument.name}</h3>
        <div style="color: #666; font-size: 0.8em; margin-bottom: 8px;">
            <span class="condition-badge" style="background: ${instrument.isNew ? '#4CAF50' : '#2196F3'}; 
                  color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75em;">
                ${instrument.condition}
            </span>
        </div>
        <div style="color: #888; font-size: 0.75em; margin-bottom: 5px;">
            ${detailsText}
        </div>
        <a href="instrument.html?id=${instrument.id}" 
           style="color: #e44d26; font-weight: bold; font-size: 1em; text-decoration: none;">
            ₽${instrument.price}
        </a>
    `;

    cardContainer.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    });

    cardContainer.addEventListener('mouseleave', function () {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });

    cardContainer.addEventListener('click', function (e) {
        if (e.target.tagName.toLowerCase() === 'a') return;
        window.location.href = `instrument.html?id=${instrument.id}`;
    });

    return cardContainer;
}

// ---- 9. Навигация между страницами ----
function navigateToPage(page) {
    // Ваша логика навигации осталась без изменений
    const pageMap = {
        'главная': 'index_auth.html',
        'бронирование': 'index_auth.html',
        'мои бронирования': 'my_bookings.html',
        'абонементы': 'subscription_plans.html',
        'цены': 'prices.html',
        'контакты': 'contacts.html',
        'профиль': 'profile.html',
        'каталог инструментов': 'catalog_instruments.html',
        'электрогитары': 'catalog_instruments.html?category=electroguitars',
        'классические гитары': 'catalog_instruments.html?category=classicguitars',
        'бас-гитары': 'catalog_instruments.html?category=bassguitars',
        'синтезаторы': 'catalog_instruments.html?category=synths',
        'ударные установки': 'catalog_instruments.html?category=drums',
        'микрофоны': 'catalog_instruments.html?category=microphones',
        'помещения': 'rooms.html',
        'студия звукозаписи': 'rooms.html?type=recording',
        'репетиционные залы': 'rooms.html?type=rehearsal',
        'лаунж-зоны': 'rooms.html?type=lounge',
        'студия': 'about.html',
        'о нас': 'about.html',
        'новости': 'news.html',
        'отзывы': 'reviews.html'
    };

    const url = pageMap[page] || 'index.html';
    window.location.href = url;
}

// ---- 10. debounce ----
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ---- 11. URL параметры (категория) ----
function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');

    if (category) {
        const categorySelect = document.getElementById('categories');
        if (!categorySelect) return;

        // Маппинг: "ссылка в футере" -> "Русское название в фильтре"
        const categoryMap = {
            'electroguitars': 'Электрогитары',
            'classicguitars': 'Классические гитары',
            'bassguitars': 'Бас-гитары',
            'synths': 'Клавишные',
            'drums': 'Ударные установки',
            'microphones': 'Микрофоны'
        };

        const targetCategory = categoryMap[category];

        if (targetCategory) {
            // Проверяем, есть ли такая категория в списке (она могла не загрузиться из БД)
            // Для этого ищем option с таким value
            const optionExists = Array.from(categorySelect.options).some(opt => opt.value === targetCategory);

            if (optionExists) {
                categorySelect.value = targetCategory;

                // Если мы перешли на гитары, нужно сразу показать фильтр правша/левша
                checkHandednessVisibility();

                // Принудительно запускаем фильтрацию
                applyFilters();
            }
        }
    }
}