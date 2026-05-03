document.addEventListener('DOMContentLoaded', function () {
    // Инициализация всех модулей
    initFilters();
    initSearch();
    loadInstrumentsFromApi();
    initPriceRange();
    handleUrlParams();
    initDateFilter();
    setupAddInstrumentButton();
});

// Глобальная переменная для хранения данных
let instrumentsData = [];

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

async function loadInstrumentsFromApi() {
    const productList = document.querySelector('.product-list');
    productList.innerHTML = '<p style="text-align:center;">Загрузка инструментов...</p>';

    try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const userId = userData.userUid || userData.uid || userData.id;

        if (userId) {
            try {
                const subResponse = await fetch(`https://localhost:7123/api/UserSubscriptionsAdvanced/active/${userId}`);
                if (subResponse.ok) {
                    const activeSub = await subResponse.json();
                    const discount = activeSub.plan?.discountPercentage ||
                        activeSub.discountPercentage ||
                        activeSub.Plan?.DiscountPercentage || 0;
                    localStorage.setItem('userDiscount', discount);
                    console.log('Скидка загружена:', discount);
                } else if (subResponse.status === 404) {
                    localStorage.setItem('userDiscount', '0');
                    console.log('Активная подписка не найдена, скидка сброшена');
                }
            } catch (e) {
                console.warn("Не удалось получить скидку: ", e);
            }
        }
        const response = await fetch('https://localhost:7123/api/Equipments');

        if (!response.ok) {
            throw new Error('Ошибка сети: ' + response.status);
        }

        const data = await response.json();

        instrumentsData = data.map(item => {
            const translatedCategory = categoryTranslations[item.category] || item.category;
            const translatedColor = colorTranslations[item.color?.toLowerCase()] || item.color || "Не указан";
            const translatedHandedness = item.handedness === "lefty" ? "Левша" :
                item.handedness === "righty" ? "Правша" : "";

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
                color: translatedColor || "Не указан",
                handedness: translatedHandedness || "Правша",
                isRentable: item.isRentable
            };
        });

        populateCategoryOptions();
        populateColorOptions();
        handleUrlParams();
        checkHandednessVisibility();
        applyFilters();
        updatePriceRange();

        const repairingFilter = document.getElementById('repairing-filter');
        const isStaff = localStorage.getItem('isStaff') === 'true';

        if (isStaff) {
            repairingFilter.style.display = 'block';
        } else {
            repairingFilter.style.display = 'none';
        }

    } catch (error) {
        console.error('Ошибка при загрузке инструментов:', error);
        productList.innerHTML = '<p style="text-align:center; color:red;">Не удалось загрузить список инструментов.</p>';
    }
}

function populateCategoryOptions() {
    const categorySelect = document.getElementById('categories');
    if (!categorySelect) return;

    const currentValue = categorySelect.value;
    const uniqueCategories = [...new Set(instrumentsData.map(i => i.category))].filter(c => c);

    categorySelect.innerHTML = '<option value="Все">Все категории</option>';

    uniqueCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    if (uniqueCategories.includes(currentValue)) {
        categorySelect.value = currentValue;
    }
}

function populateColorOptions() {
    const colorSelect = document.getElementById('colors');
    if (!colorSelect) return;

    const currentValue = colorSelect.value;
    const uniqueColors = [...new Set(instrumentsData.map(i => i.color))].filter(c => c);
    uniqueColors.sort();

    colorSelect.innerHTML = '<option value="Все">Все цвета</option>';

    uniqueColors.forEach(color => {
        const option = document.createElement('option');
        option.value = color;
        option.textContent = color;
        colorSelect.appendChild(option);
    });

    if (uniqueColors.includes(currentValue)) {
        colorSelect.value = currentValue;
    }
}

function checkHandednessVisibility() {
    const categorySelect = document.getElementById('categories');
    const handednessContainer = document.getElementById('handedness-container');

    if (!categorySelect || !handednessContainer) return;

    const selectedCategory = categorySelect.value;

    const guitarCategories = [
        "Электрогитары",
        "Классические гитары",
        "Бас-гитары",
        "Акустические гитары"
    ];

    if (guitarCategories.includes(selectedCategory)) {
        handednessContainer.style.display = 'block';
    } else {
        handednessContainer.style.display = 'none';

        const checkboxes = document.querySelectorAll('input[name="handedness"]');
        let changed = false;
        checkboxes.forEach(cb => {
            if (cb.checked) {
                cb.checked = false;
                changed = true;
            }
        });

        if (changed) {
            applyFilters();
        }
    }
}

function initFilters() {
    const categorySelect = document.getElementById('categories');
    const conditionSelect = document.getElementById('condition')
    const colorSelect = document.getElementById('colors');

    if (categorySelect) {
        categorySelect.addEventListener('change', function () {
            checkHandednessVisibility();
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

function initPriceRange() {
    const priceContainer = document.getElementById('price-container');
    if (!priceContainer) return;

    const priceRange = document.createElement('input');
    priceRange.type = 'range';
    priceRange.min = 1;
    priceRange.max = 10000;
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

let availabilityFilter = { enabled: false, date: null, availableIds: [] };

function initDateFilter() {
    const dateInput = document.getElementById('availability-date');
    const clearButton = document.getElementById('clear-date-filter');

    if (!dateInput) return;

    dateInput.addEventListener('change', async function () {
        if (this.value) {
            const selectedDate = new Date(this.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                alert('Нельзя выбрать прошедшую дату');
                this.value = '';
                availabilityFilter.enabled = false;
                if (clearButton) clearButton.style.display = 'none';
                applyFilters();
                return;
            }

            // Показываем индикатор загрузки
            const productList = document.querySelector('.product-list');
            if (productList) {
                productList.innerHTML = '<p style="text-align:center;">Проверка доступности...</p>';
            }

            availabilityFilter.enabled = true;
            availabilityFilter.date = this.value;

            await loadAvailableInstruments(this.value);
        } else {
            availabilityFilter.enabled = false;
            availabilityFilter.date = null;
            availabilityFilter.availableIds = [];
            if (clearButton) clearButton.style.display = 'none';
            applyFilters();
        }
    });

    if (clearButton) {
        clearButton.addEventListener('click', function () {
            dateInput.value = '';
            availabilityFilter.enabled = false;
            availabilityFilter.date = null;
            availabilityFilter.availableIds = [];
            clearButton.style.display = 'none';
            applyFilters();
        });
    }
}

async function loadAvailableInstruments(date) {
    try {
        const response = await fetch(`https://localhost:7123/api/BookingsAdvanced/available-ids?date=${date}&type=instrument`);
        if (!response.ok) throw new Error('Ошибка загрузки');

        const data = await response.json();
        availabilityFilter.availableIds = data.availableIds || [];

        console.log(`Доступно инструментов на ${date}: ${availabilityFilter.availableIds.length}`);

        const clearButton = document.getElementById('clear-date-filter');
        if (clearButton) clearButton.style.display = 'inline-block';

        // Применяем фильтры
        applyFilters();

    } catch (error) {
        console.error('Ошибка при загрузке доступных инструментов:', error);
        alert('Не удалось загрузить информацию о доступности');
        availabilityFilter.enabled = false;
        const clearButton = document.getElementById('clear-date-filter');
        if (clearButton) clearButton.style.display = 'none';
    }
}

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
        if (selectedCategory && selectedCategory !== "Все" && instrument.category !== selectedCategory) {
            return false;
        }

        if (selectedColor && selectedColor !== "Все" && instrument.color !== selectedColor) {
            return false;
        }

        if (searchTerm && instrument.name && !instrument.name.toLowerCase().includes(searchTerm)) {
            return false;
        }

        if (instrument.price > maxPrice) {
            return false;
        }

        if (repairingCondition) {
            if (instrument.condition !== "В ремонте") {
                return false;
            }
        } else {
            if (instrument.condition === "В ремонте") {
                return false;
            }
        }

        if (selectedCondition && selectedCondition !== "Все") {
            const conditionMap = {
                'excellent': 'Отличное состояние',
                'good': 'Хорошее состояние',
                'unsignificant defects': 'Незначительные дефекты',
            };

            const targetCondition = conditionMap[selectedCondition];
            if (targetCondition && instrument.condition !== targetCondition) {
                return false;
            }
        }

        if (leftyChecked && rightyChecked) {
            // оба выбраны
        } else if (leftyChecked && instrument.handedness !== "Левша") {
            return false;
        } else if (rightyChecked && instrument.handedness !== "Правша") {
            return false;
        }

        // Добавьте эту проверку
        if (availabilityFilter.enabled && availabilityFilter.availableIds.length > 0) {
            if (!availabilityFilter.availableIds.includes(instrument.id)) {
                return false;
            }
        }

        return true;
    });

    renderInstruments(filteredInstruments);
    addAvailabilityFilterInfo();
}

function addAvailabilityFilterInfo() {
    const productList = document.querySelector('.product-list');
    if (!productList) return;

    // Удаляем старое сообщение, если есть
    const oldInfo = document.querySelector('.availability-filter-info');
    if (oldInfo) oldInfo.remove();

    if (availabilityFilter.enabled && availabilityFilter.date) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'availability-filter-info';
        infoDiv.style.cssText = 'margin-bottom: 15px; padding: 10px; background: #e3f2fd; border-radius: 8px; text-align: center;';
        infoDiv.innerHTML = `📅 <strong>Фильтр по дате:</strong> показаны только инструменты, свободные на <strong>${formatDateForDisplay(availabilityFilter.date)}</strong>`;
        productList.parentNode.insertBefore(infoDiv, productList);
    }
}

function formatDateForDisplay(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
}

async function applySubscriptionDiscount(userId, currentTotal) {
    // Защита: если userId undefined, попробуем вытащить альтернативные поля
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const actualUserId = userId || userData.userUid || userData.uid || userData.id;

    if (!actualUserId) return { total: currentTotal, discount: 0 };

    try {
        const response = await fetch(`https://localhost:7123/api/UserSubscriptionsAdvanced/active/${actualUserId}`);
        if (!response.ok) return { total: currentTotal, discount: 0 };

        const activeSub = await response.json();
        console.log('Активная подписка:', activeSub);

        // Учитываем разные форматы ответа C# API
        let discountPercent = 0;

        // Пытаемся найти процент скидки в разных полях
        if (activeSub.plan) {
            discountPercent = activeSub.plan.discountPercentage ||
                activeSub.plan.DiscountPercentage || 0;
        }
        if (discountPercent === 0) {
            discountPercent = activeSub.discountPercentage ||
                activeSub.DiscountPercentage || 0;
        }
        if (discountPercent === 0 && activeSub.Plan) {
            discountPercent = activeSub.Plan.discountPercentage ||
                activeSub.Plan.DiscountPercentage || 0;
        }

        console.log('Процент скидки:', discountPercent);

        // Сохраняем скидку в localStorage для использования на других страницах
        if (discountPercent > 0) {
            localStorage.setItem('userDiscount', discountPercent);
        }

        const discountedTotal = currentTotal * (1 - discountPercent / 100);
        return { total: discountedTotal, discount: discountPercent };
    } catch (e) {
        console.error("Ошибка проверки скидки:", e);
    }
    return { total: currentTotal, discount: 0 };
}

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

    const isStaff = localStorage.getItem('isStaff') === 'true';
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    addCard.style.display = (isLoggedIn && isStaff) ? 'block' : 'none';

    addCard.addEventListener('click', function (e) {
        e.preventDefault();
        showAddInstrumentForm();
    });

    productList.appendChild(addCard);
}

function createInstrumentCard(instrument) {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const discountPercent = parseInt(localStorage.getItem('userDiscount') || '0');
    console.log(`createInstrumentCard: instrument=${instrument.name}, userDiscount=${discountPercent}`);

    // Базовый HTML для цены
    let priceHtml = `
        <div style="color: black; font-weight: bold; font-size: 1em;">
            ₽${instrument.price}
        </div>`;

    // Если есть скидка, показываем две цены
    if (discountPercent > 0) {
        const discountedPrice = Math.round(instrument.price * (1 - discountPercent / 100));
        priceHtml = `
        <div style="display: flex; gap: 8px; justify-content: center; align-items: center; margin-top: 5px;">
            <span style="text-decoration: line-through; color: #888; font-size: 0.9em; font-weight: normal;">₽${instrument.price}</span>
            <span style="color: #e44d26; font-weight: bold; font-size: 1.1em;">₽${discountedPrice}</span>
        </div>
        <div style="color: #4CAF50; font-size: 0.7em; margin-top: 2px;">Скидка ${discountPercent}%</div>
    `;
    }

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
        position: relative;
    `;

    const isStaff = localStorage.getItem('isStaff') === 'true';
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    const deleteButtonHtml = (isLoggedIn && isStaff) ? `
        <button class="delete-instrument" data-id="${instrument.id}"
                style="position: absolute; top: 8px; right: 8px; width: 22px; height: 22px;
                       background: rgba(255,0,0,0.7); color: white; border: none; border-radius: 50%;
                       font-size: 14px; font-weight: bold; cursor: pointer; z-index: 10;">
            ×
        </button>
    ` : '';

    let conditionColor = '#2196F3';

    switch (instrument.condition) {
        case 'Отличное состояние':
            conditionColor = '#128816ff';
            break;
        case 'Хорошее состояние':
            conditionColor = '#07ce0eff';
            break;
        case 'Незначительные дефекты':
            conditionColor = '#FFC107';
            break;
        case 'В ремонте':
            conditionColor = '#F44336';
            break;
    }

    const guitarCategories = [
        "Электрогитары",
        "Классические гитары",
        "Бас-гитары",
        "Акустические гитары"
    ];

    let detailsText = instrument.color;
    if (guitarCategories.includes(instrument.category)) {
        detailsText += ` • ${instrument.handedness}`;
    }

    const imgSrc = instrument.image || 'img/file_not_found.png';

    cardContainer.innerHTML = `
        ${deleteButtonHtml}
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
        ${priceHtml}
    `;

    cardContainer.addEventListener('click', function (e) {
        if (e.target.tagName.toLowerCase() !== 'a' && !e.target.classList.contains('delete-instrument')) {
            window.location.href = `instrument.html?id=${instrument.id}`;
        }
    });

    cardContainer.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    });

    cardContainer.addEventListener('mouseleave', function () {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });

    const deleteBtn = cardContainer.querySelector('.delete-instrument');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function (e) {
            e.stopPropagation();

            if (!confirm(`Вы действительно хотите удалить инструмент "${instrument.name}"?`)) return;

            try {
                const response = await fetch(`https://localhost:7123/api/Equipments/${instrument.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Ошибка при удалении: ${response.status}`);
                }

                cardContainer.remove();
                instrumentsData = instrumentsData.filter(i => i.id !== instrument.id);

                alert('Инструмент успешно удалён.');
            } catch (error) {
                console.error('Ошибка удаления:', error);
                alert('Не удалось удалить инструмент.');
            }
        });
    }

    return cardContainer;
}

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

function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');

    if (category) {
        const categorySelect = document.getElementById('categories');
        if (!categorySelect) return;

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
            const optionExists = Array.from(categorySelect.options).some(opt => opt.value === targetCategory);

            if (optionExists) {
                categorySelect.value = targetCategory;
                checkHandednessVisibility();
                applyFilters();
            }
        }
    }
}

function setupAddInstrumentButton() {
    const addButton = document.getElementById('add-instrument-btn');
    const controls = document.querySelector('.controls');

    if (!addButton || !controls) return;

    addButton.style.display = 'none';
}

function showAddInstrumentForm() {
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

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('add-instrument-modal');
    const form = document.getElementById('add-instrument-form');
    const cancelButton = document.getElementById('cancel-add');

    cancelButton.addEventListener('click', () => {
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
            imageUrl: formData.get('imageUrl') || null,
            color: formData.get('color'),
            currentCondition: formData.get('currentCondition'),
            handedness: formData.get('handedness') || null,
            isRentable: formData.get('isRentable') === 'on'
        };

        try {
            const response = await fetch('https://localhost:7123/api/Equipments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(instrumentData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка при добавлении');
            }

            document.body.removeChild(modal);
            loadInstrumentsFromApi();
            alert('Инструмент успешно добавлен!');
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось добавить инструмент: ' + error.message);
        }
    });
}