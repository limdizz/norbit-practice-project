document.addEventListener('DOMContentLoaded', function () {
    // Инициализация всех модулей
    initFilters();
    initSearch();
    loadInstrumentsFromApi();
    initPriceRange();
    handleUrlParams();
    setupAddInstrumentButton();
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
            const translatedColor = colorTranslations[item.color?.toLowerCase()] || item.color || "Не указан";
            const translatedHandedness = item.handedness === "lefty" ? "Левша" :
                item.handedness === "righty" ? "Правша" : "";
            // 2. Определяем логику "Новизны" и "Состояния"
            let translatedCondition = "Хорошее";

            if (item.currentCondition === "excellent") translatedCondition = "Отличное состояние";
            if (item.currentCondition === "good") translatedCondition = "Хорошее состояние";
            if (item.currentCondition === "unsignificant defects") translatedCondition = "Незначительные дефекты";
            if (item.currentCondition === "repairing") translatedCondition = "В ремонте";

            return {
                id: item.equipmentId,
                name: item.name,
                price: item.rentalPrice || 0,
                category: translatedCategory,
                condition: translatedCondition,

                image: item.imageUrl || "img/file_not_found.png",

                // 2. Цвет. Если в БД пусто, пишем "Не указан"
                color: translatedColor || "Не указан",

                // 3. Левша/Правша. Если пусто - считаем Правша
                handedness: translatedHandedness || "Правша",

                // Дополнительно сохраняем статус доступности из БД
                isRentable: item.isRentable
            };
        });

        // 1. Заполняем фильтр 
        populateCategoryOptions();

        populateColorOptions();

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

function populateColorOptions() {
    const colorSelect = document.getElementById('colors');
    if (!colorSelect) return;

    // Сохраняем текущий выбор пользователя
    const currentValue = colorSelect.value;

    // Получаем список уникальных цветов из загруженных данных
    const uniqueColors = [...new Set(instrumentsData.map(i => i.color))].filter(c => c);

    // Сортируем цвета по алфавиту для красоты
    uniqueColors.sort();

    // Очищаем селект и добавляем опцию "Все"
    colorSelect.innerHTML = '<option value="Все">Все цвета</option>';

    // Создаем опции
    uniqueColors.forEach(color => {
        const option = document.createElement('option');
        option.value = color;
        option.textContent = color;
        colorSelect.appendChild(option);
    });

    // Восстанавливаем выбор, если такой цвет всё еще существует в списке
    if (uniqueColors.includes(currentValue)) {
        colorSelect.value = currentValue;
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
    const conditionSelect = document.getElementById('condition')
    const colorSelect = document.getElementById('colors');

    if (categorySelect) {
        categorySelect.addEventListener('change', function () {
            // Сначала проверяем видимость блока handedness
            checkHandednessVisibility();
            // Потом применяем фильтры
            applyFilters();
        });
    }

    if (conditionSelect) conditionSelect.addEventListener('change', applyFilters)
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

// ---- 6. Основная функция применения фильтров ----
function applyFilters() {
    const categoryEl = document.getElementById('categories');
    const colorEl = document.getElementById('colors');
    const conditionEl = document.getElementById('condition');
    const searchEl = document.getElementById('site-search');
    const priceRangeEl = document.getElementById('price-range');

    const selectedCategory = categoryEl ? categoryEl.value : "Все";
    const selectedCondition = conditionEl ? conditionEl.value : "Все";
    const selectedColor = colorEl ? colorEl.value : "Все";
    const searchTerm = (searchEl ? searchEl.value : '').trim().toLowerCase();
    const maxPrice = priceRangeEl ? parseInt(priceRangeEl.value, 10) : Infinity;

    const repairingCondition = !!document.querySelector('input[value="repairing"]') && document.querySelector('input[value="repairing"]').checked;

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

        if (repairingCondition) {
            // Если галочка "в ремонте" стоит - показываем ТОЛЬКО инструменты в ремонте
            if (instrument.condition !== "В ремонте") {
                return false;
            }
        } else {
            // Если галочки нет - СКРЫВАЕМ инструменты в ремонте (по умолчанию)
            if (instrument.condition === "В ремонте") {
                return false;
            }
        }

        // Состояние
        if (selectedCondition && selectedCondition !== "Все") {
            // Маппинг значений из select в русские названия состояний
            const conditionMap = {
                'excellent': 'Отличное состояние',
                'good': 'Хорошее состояние',
                'unsignificant defects': 'Незначительные дефекты',
                // 'repairing': 'В ремонте'
            };

            const targetCondition = conditionMap[selectedCondition];
            if (targetCondition && instrument.condition !== targetCondition) {
                return false;
            }
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

    // Добавляем карточку для добавления нового инструмента
    const addCard = document.createElement('div');
    addCard.className = 'instrument-card';
    addCard.style.cssText = `
        border: 1px solid #ddd;
        border-radius: 8px;
        font-family: Inter;
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
        background-color: #f8f9fa;
        flex: 0 0 auto;
    `;

    addCard.innerHTML = `
        <div style="width: 100px; height: 150px; display: flex; align-items: center; justify-content: center; margin: 0 auto; background-color: #e9ecef; border-radius: 4px;">
            <span style="font-size: 48px; color: #6c757d;">+</span>
        </div>
        <h3 style="margin: 10px 0 5px 0; color: #333; font-size: 1em;">Добавить инструмент</h3>
        <div style="color: #666; font-size: 0.8em; margin-bottom: 8px;">
            <span class="condition-badge" style="background: #2196F3; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75em;">
                Новый
            </span>
        </div>
        <div style="color: #888; font-size: 0.75em; margin-bottom: 5px;">
            Нажмите для добавления
        </div>
        <div style="color: black; font-weight: bold; font-size: 1em;">
            ₽0
        </div>
    `;

    // Показываем карточку только для сотрудников
    const isStaff = localStorage.getItem('isStaff') === 'true';
    addCard.style.display = isStaff ? 'block' : 'none';

    // Добавляем обработчик клика
    addCard.addEventListener('click', function (e) {
        e.preventDefault();
        showAddInstrumentForm();
    });

    productList.appendChild(addCard);
}

// ---- 8. Создание карточки инструмента ----
function createInstrumentCard(instrument) {
    const cardContainer = document.createElement('div');
    cardContainer.className = 'instrument-card';
    cardContainer.style.cssText = `
        border: 1px solid #ddd;
        border-radius: 8px;
        font-family: Inter;
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

    let conditionColor = '#2196F3'; // Синий по умолчанию

    switch (instrument.condition) {
        case 'Отличное состояние':
            conditionColor = '#128816ff'; // Зеленый
            break;
        case 'Хорошее состояние':
            conditionColor = '#07ce0eff'; // Зеленый
            break;
        case 'Незначительные дефекты':
            conditionColor = '#FFC107'; // Желтый (янтарный)
            break;
        case 'В ремонте':
            conditionColor = '#F44336'; // Красный
            break;
        default:
            conditionColor = '#2196F3'
    }
    // ---------------------------------------

    cardContainer.innerHTML = `
        <img src="${imgSrc}" 
             alt="${instrument.name}" 
             style="width: 100px; height: 150px; object-fit: contain; border-radius: 4px;">
        <h3 style="margin: 10px 0 5px 0; color: #333; font-size: 1em;">${instrument.name}</h3>
        <div style="color: #666; font-size: 0.8em; margin-bottom: 8px;">
            <span class="condition-badge" style="background: ${conditionColor}; 
                  color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75em;">
                ${instrument.condition}
            </span>
        </div>
        <div style="color: #888; font-size: 0.75em; margin-bottom: 5px;">
            ${detailsText}
        </div>
        <a href="instrument.html?id=${instrument.id}" 
           style="color: black; font-weight: bold; font-size: 1em; text-decoration: none;">
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
            // Проверяем, есть ли такая категория в списке
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

function setupAddInstrumentButton() {
    // Находим кнопку и блок управления
    const addButton = document.getElementById('add-instrument-btn');
    const controls = document.querySelector('.controls');

    if (!addButton || !controls) return;

    // Скрываем отдельную кнопку, так как добавление теперь через карточку
    addButton.style.display = 'none';
}

function showAddInstrumentForm() {
    // Создаем модальное окно добавления
    const modalHtml = `
    <div id="add-instrument-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div style="background: white; padding: 20px; border-radius: 8px; width: 400px; max-width: 90vw;">
            <h3 style="margin-top: 0;">Добавить новый инструмент</h3>
            <form id="add-instrument-form">
                <div style="margin-bottom: 10px;">
                    <label for="new-name" style="display: inline-block; width: 120px;">Название:</label>
                    <input type="text" id="new-name" name="name" required style="width: 200px; padding: 5px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label for="new-category" style="display: inline-block; width: 120px;">Категория:</label>
                    <select id="new-category" name="category" required style="width: 200px; padding: 5px;">
                        <option value="Электрогитары">Электрогитары</option>
                        <option value="Классические гитары">Классические гитары</option>
                        <option value="Синтезаторы">Синтезаторы</option>
                        <option value="Ударные установки">Ударные установки</option>
                        <option value="Микрофоны">Микрофоны</option>
                        <option value="Бас-гитары">Бас-гитары</option>
                    </select>
                </div>
                <div style="margin-bottom: 10px;">
                    <label for="new-rentalPrice" style="display: inline-block; width: 120px;">Цена за час (₽):</label>
                    <input type="number" id="new-rentalPrice" name="rentalPrice" min="0" step="0.01" required style="width: 200px; padding: 5px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label for="new-description" style="display: inline-block; width: 120px; vertical-align: top;">Описание:</label>
                    <textarea id="new-description" name="description" rows="3" style="width: 200px; padding: 5px; vertical-align: top;"></textarea>
                </div>
                <div style="margin-bottom: 10px;">
                    <label for="new-imageUrl" style="display: inline-block; width: 120px;">Ссылка на изображение:</label>
                    <input type="url" id="new-imageUrl" name="imageUrl" style="width: 200px; padding: 5px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label for="new-color" style="display: inline-block; width: 120px;">Цвет:</label>
                    <input type="text" id="new-color" name="color" style="width: 200px; padding: 5px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label for="new-currentCondition" style="display: inline-block; width: 120px;">Состояние:</label>
                    <select id="new-currentCondition" name="currentCondition" style="width: 200px; padding: 5px;">
                        <option value="excellent">Отличное состояние</option>
                        <option value="good">Хорошее состояние</option>
                        <option value="unsignificant defects">Незначительные дефекты</option>
                        <option value="repairing">В ремонте</option>
                    </select>
                </div>
                <div style="margin-bottom: 10px;">
                    <label for="new-handedness" style="display: inline-block; width: 120px;">Ориентация:</label>
                    <select id="new-handedness" name="handedness" style="width: 200px; padding: 5px;">
                        <option value="righty">Правша</option>
                        <option value="lefty">Левша</option>
                        <option value="">Не применимо</option>
                    </select>
                </div>
                <div style="margin-bottom: 10px;">
                    <label for="new-isRentable" style="display: inline-block; width: 120px;">Доступен для аренды:</label>
                    <input type="checkbox" id="new-isRentable" name="isRentable" checked>
                </div>
                <div style="margin-top: 15px; text-align: right;">
                    <button type="button" id="cancel-add" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Отмена</button>
                    <button type="submit" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Сохранить</button>
                </div>
            </form>
        </div>
    </div>`;

    // Вставляем модальное окно в body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Настраиваем кнопки
    const modal = document.getElementById('add-instrument-modal');
    const form = document.getElementById('add-instrument-form');
    const cancelButton = document.getElementById('cancel-add');

    cancelButton.addEventListener('click', function () {
        document.body.removeChild(modal);
    });

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData(form);
        const instrumentData = {
            name: formData.get('name'),
            category: formData.get('category'),
            rentalPrice: parseFloat(formData.get('rentalPrice')),
            description: formData.get('description'),
            imageUrl: formData.get('imageUrl'),
            color: formData.get('color'),
            currentCondition: formData.get('currentCondition'),
            handedness: formData.get('handedness') || null,
            isRentable: formData.get('isRentable') === 'on'
        };

        try {
            const response = await fetch('https://localhost:7123/api/Equipments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(instrumentData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка при добавлении инструмента');
            }

            // Удаляем модальное окно
            document.body.removeChild(modal);

            // Обновление списка
            loadInstrumentsFromApi();

            alert('Инструмент успешно добавлен!');
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось добавить инструмент: ' + error.message);
        }
    });
}