document.addEventListener('DOMContentLoaded', function () {
    // Инициализация всех модулей
    initFilters();
    initSearch();
    initInstrumentCards();
    initPriceRange();
    initNavigation();
    handleUrlParams();
});

// Данные инструментов (в реальном приложении будут приходить с API)
const instrumentsData = [
    {
        id: 1,
        name: "Fender Jaguar",
        price: 2800,
        category: "Электрогитары",
        image: "https://bxuiiaeu1l.a.trbcdn.net/898/8p5/b4b/5kw/kcw/gwo/scw/wg8/8/8988p5b4b5kwkcwgwoscwwg88.jpg",
        condition: "Отличное состояние",
        color: "Санбёрст",
        handedness: "Правша",
        isNew: false
    },
    {
        id: 2,
        name: "Fender Jazzmaster",
        price: 3000,
        category: "Электрогитары",
        image: "https://bxuiiaeu1l.a.trbcdn.net/8hw/nq5/7kq/9cs/4ww/gks/wcs/wg4/4/8hwnq57kq9cs4wwgkswcswg44.jpg",
        condition: "Новое",
        color: "Белый",
        handedness: "Правша",
        isNew: true
    },
    {
        id: 3,
        name: "Fender Stratocaster",
        price: 2000,
        category: "Электрогитары",
        image: "https://86gvdq3w04.a.trbcdn.net/212/4a3/aqo/x5w/4kg/gks/0gg/sgo/w/2124a3aqox5w4kggks0ggsgow.jpg",
        condition: "Отличное состояние",
        color: "Чёрный",
        handedness: "Правша",
        isNew: false
    }
];

// 1. Инициализация фильтров
function initFilters() {
    const categorySelect = document.getElementById('categories');
    const colorSelect = document.getElementById('colors');

    categorySelect.addEventListener('change', applyFilters);
    colorSelect.addEventListener('change', applyFilters);

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

// ---- 3. Инициализация карточек инструментов (первоначальный рендер) ----
function initInstrumentCards() {
    // Рендерим все элементы при загрузке (позже фильтры будут обновлять)
    renderInstruments(instrumentsData);
}

// ---- 4. Инициализация диапазона цен ----
function initPriceRange() {
    const priceContainer = document.getElementById('price-container');

    const maxPriceValue = Math.max(...instrumentsData.map(i => i.price), 1000);
    // Создаём input range динамически
    const priceRange = document.createElement('input');
    priceRange.type = 'range';
    priceRange.min = 1;
    priceRange.max = maxPriceValue;
    priceRange.value = maxPriceValue;
    priceRange.id = 'price-range';

    const priceDisplay = document.createElement('span');
    priceDisplay.className = 'price-display';
    priceDisplay.textContent = `до ${priceRange.value} ₽`;

    priceContainer.appendChild(priceRange);
    priceContainer.appendChild(priceDisplay);

    const debouncedApply = debounce(applyFilters, 300);

    priceRange.addEventListener('input', function () {
        priceDisplay.textContent = `до ${this.value} ₽`;
        debouncedApply();
    });
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
    const selectedCategory = document.getElementById('categories').value;
    const selectedColor = document.getElementById('colors').value;
    const searchTerm = (document.getElementById('site-search').value || '').trim().toLowerCase();
    const priceRangeEl = document.getElementById('price-range');
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
        if (searchTerm && !instrument.name.toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Цена
        if (instrument.price > maxPrice) {
            return false;
        }

        // Состояние
        if (excellentCondition && instrument.condition !== "Отличное состояние") {
            return false;
        }
        if (newCondition && !instrument.isNew) {
            return false;
        }

        // Удобство (левша/правша)
        if (leftyChecked && rightyChecked) {
            // оба выбраны — ничего не фильтруем
        } else if (leftyChecked && instrument.handedness !== "Левша") {
            return false;
        } else if (rightyChecked && instrument.handedness !== "Правша") {
            return false;
        }

        return true;
    });

    renderInstruments(filteredInstruments);
}

// ---- 7. Рендеринг инструментов (чисто в .product-list) ----
function renderInstruments(instruments) {
    const productList = document.querySelector('.product-list');
    productList.innerHTML = ''; // простая и надёжная очистка

    if (instruments.length === 0) {
        const noResults = document.createElement('p');
        noResults.className = 'no-results';
        noResults.textContent = 'Инструменты не найдены. Попробуйте изменить фильтры.';
        noResults.style.cssText = 'text-align: center; padding: 20px; color: #666;';
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
    `;

    cardContainer.innerHTML = `
        <img src="${instrument.image}" 
             alt="${instrument.name}" 
             style="width: 100px; height: 300px; object-fit: cover; border-radius: 4px;">
        <h3 style="margin: 10px 0 5px 0; color: #333; font-size: 1em;">${instrument.name}</h3>
        <div style="color: #666; font-size: 0.8em; margin-bottom: 8px;">
            <span class="condition-badge" style="background: ${instrument.isNew ? '#4CAF50' : '#2196F3'}; 
                   color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75em;">
                ${instrument.condition}
            </span>
        </div>
        <div style="color: #888; font-size: 0.75em; margin-bottom: 5px;">
            ${instrument.color} • ${instrument.handedness}
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
        // если клик по ссылке — пусть открывает ссылку; иначе навигация
        if (e.target.tagName.toLowerCase() === 'a') return;
        window.location.href = `instrument.html?id=${instrument.id}`;
    });

    cardContainer.addEventListener('click', function () {
        window.location.href = `instrument.html?id=${instrument.id}`;
    });

    return cardContainer;
}

// ---- 9. Навигация между страницами ----
function navigateToPage(page) {
    const pageMap = {
        'главная': 'index_auth.html',
        'бронирование': 'index_auth.html',
        'мои бронирования': 'my_bookings.html',
        'абонементы': 'subscription_plans.html',
        'цены': 'prices.html',
        'контакты': 'contacts.html',
        'профиль': 'profile.html',
        'каталог инструментов': 'catalog_instruments.html',
        'электрогитары': 'catalog.html?category=electroguitars',
        'классические гитары': 'catalog.html?category=classicguitars',
        'бас-гитары': 'catalog.html?category=bassguitars',
        'синтезаторы': 'catalog.html?category=synthesizers',
        'ударные установки': 'catalog.html?category=drums',
        'микрофоны': 'catalog.html?category=microphones',
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
        const categoryMap = {
            'electroguitars': 'Электрогитары',
            'classicguitars': 'Классические гитары',
            'bassguitars': 'Бас-гитары',
            'synthesizers': 'Синтезаторы',
            'drums': 'Ударные установки',
            'microphones': 'Микрофоны'
        };

        if (categoryMap[category]) {
            document.getElementById('categories').value = categoryMap[category];
            applyFilters();
        }
    }
}

// Инициализация обработки URL параметров
document.addEventListener('DOMContentLoaded', handleUrlParams);