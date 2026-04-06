document.addEventListener("DOMContentLoaded", function () {
    const instrumentsContainer = document.getElementById("instrument-prices");
    const roomsContainer = document.getElementById("room-prices");
    const editButtonContainer = document.querySelector(".main--prices");

    // Храним кастомные карточки отдельно
    let customCards = JSON.parse(localStorage.getItem("customPriceCards") || "[]");
    let isEditing = false;
    let editBtn = null; // <-- Сохраняем ссылку на кнопку

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const isStaff = localStorage.getItem('isStaff') === 'true';

    // --- Кнопка "Редактировать" ---
    if (isLoggedIn && isStaff) {
        editBtn = document.createElement("button");
        editBtn.textContent = "Редактировать цены";
        editBtn.className = "price-edit-btn"; // <-- уникальный класс
        editBtn.onclick = toggleEditMode;
        editButtonContainer.appendChild(editBtn);
    }

    // --- Остальной код без изменений ---
    async function loadBasePrices() {
        try {
            const [instrumentRes, roomRes] = await Promise.all([
                fetch("https://localhost:7123/api/Equipments"),
                fetch("https://localhost:7123/api/Rooms")
            ]);

            const instruments = await instrumentRes.json();
            const rooms = await roomRes.json();

            const instrumentMinPrices = getMinPricesByCategory(instruments);
            const roomMinPrices = getRoomTypeMinPrices(rooms);

            renderDynamicPrices(instrumentMinPrices, roomMinPrices);
        } catch (error) {
            console.error("Ошибка загрузки цен из API:", error);
            const defaults = getDefaultPrices();
            renderDynamicPrices(defaults.instruments, defaults.rooms);
        }
    }

    function getMinPricesByCategory(instruments) {
        const categories = {};
        const categoryMap = {
            "Electric Guitars": "Электрогитары",
            "Classical Guitars": "Классические гитары",
            "Microphones": "Микрофоны",
            "Synths": "Синтезаторы",
            "Bass Guitars": "Бас-гитары",
            "Drums": "Ударные установки"
        };

        instruments.forEach(item => {
            const name = categoryMap[item.category] || item.category;
            const price = item.rentalPrice;
            if (!categories[name] || price < categories[name]) {
                categories[name] = price;
            }
        });

        return Object.entries(categories).map(([name, price]) => ({
            name: `${name} от`,
            price,
            unit: "сутки",
            source: "base"
        }));
    }

    function getRoomTypeMinPrices(rooms) {
        const typeMap = { 1: "Лаунж-зона", 2: "Студия звукозаписи", 3: "Репетиционный зал" };
        const basePrices = { "Лаунж-зона": 1000, "Студия звукозаписи": 1000, "Репетиционный зал": 750 };
        const prices = {};

        rooms.forEach(room => {
            const typeName = typeMap[room.roomTypeId];
            if (!typeName) return;
            if (!prices[typeName] || room.roomId) {
                prices[typeName] = basePrices[typeName] || 500;
            }
        });

        return Object.entries(prices).map(([name, price]) => ({
            name,
            price,
            unit: "час",
            source: "base"
        }));
    }

    function getDefaultPrices() {
        return {
            instruments: [
                { name: "Электрогитары от", price: 600, unit: "сутки", source: "base" },
                { name: "Классические гитары от", price: 300, unit: "сутки", source: "base" },
                { name: "Микрофоны от", price: 185, unit: "сутки", source: "base" },
                { name: "Синтезаторы от", price: 1800, unit: "сутки", source: "base" },
                { name: "Бас-гитары от", price: 380, unit: "сутки", source: "base" },
                { name: "Ударные установки от", price: 2000, unit: "сутки", source: "base" }
            ],
            rooms: [
                { name: "Репетиционный зал", price: 750, unit: "час", source: "base" },
                { name: "Студия звукозаписи", price: 1000, unit: "час", source: "base" },
                { name: "Лаунж-зона", price: 1000, unit: "час", source: "base" }
            ]
        };
    }

    // --- Основной рендеринг ---
    function renderDynamicPrices(baseInstruments, baseRooms) {
        instrumentsContainer.innerHTML = "";
        roomsContainer.innerHTML = "";

        // Показываем базовые карточки
        [...baseInstruments].forEach(item => {
            const card = createCardElement(item, "instrument", false);
            instrumentsContainer.appendChild(card);
        });

        [...baseRooms].forEach(item => {
            const card = createCardElement(item, "room", false);
            roomsContainer.appendChild(card);
        });

        // Показываем кастомные карточки (если есть)
        customCards.forEach((card, index) => {
            const el = createCardElement(card, card.type, true, index);
            if (card.type === "instrument") {
                instrumentsContainer.appendChild(el);
            } else {
                roomsContainer.appendChild(el);
            }
        });

        // В режиме редактирования добавляем кнопку "Добавить"
        if (isEditing) {
            const addInstBtn = createAddButton("instrument");
            const addRoomBtn = createAddButton("room");
            instrumentsContainer.appendChild(addInstBtn);
            roomsContainer.appendChild(addRoomBtn);
        }
    }

    function createCardElement(data, type, isCustom, index = null) {
        const div = document.createElement("div");
        div.className = "price-card";
        div.dataset.custom = isCustom;
        div.dataset.index = index;
        div.dataset.type = type;

        if (isEditing && isCustom) {
            div.innerHTML = `
                <input type="text" value="${data.name}" class="edit-name" style="width:100%; padding:5px; margin-bottom:5px;">
                <input type="number" value="${data.price}" class="edit-price" style="width:80px; padding:5px;">
                <select class="edit-unit" style="padding:5px;">
                    <option value="час" ${data.unit === "час" ? "selected" : ""}>час</option>
                    <option value="сутки" ${data.unit === "сутки" ? "selected" : ""}>сутки</option>
                </select>
                <button class="delete-custom" style="color:red; background:none; border:none; font-size:18px; cursor:pointer;">×</button>
            `;
            div.querySelector(".delete-custom").onclick = () => removeCustomCard(index);
        } else {
            div.innerHTML = `
                <h3>${data.name}</h3>
                <p class="price">₽${data.price} / ${data.unit}</p>
                ${isCustom ? '<span style="font-size:0.8em; color:#999;">(кастомная)</span>' : ''}
            `;
        }

        return div;
    }

    function createAddButton(type) {
        const btn = document.createElement("div");
        btn.className = "price-card add-card";
        btn.style.cssText = "display:flex; align-items:center; justify-content:center; cursor:pointer; background:#f0f0f0; border:2px dashed #ccc;";
        btn.innerHTML = `<span style="font-size:24px; color:#888;">+</span>`;
        btn.onclick = () => addNewCustomCard(type);
        return btn;
    }

    function addNewCustomCard(type) {
        const newItem = {
            name: "Новая позиция",
            price: 100,
            unit: type === "room" ? "час" : "сутки",
            type,
            source: "custom"
        };
        customCards.push(newItem);
        saveCustomCards();
        exitEditMode();
        reloadPrices();
    }

    function removeCustomCard(index) {
        if (confirm("Удалить эту кастомную карточку?")) {
            customCards.splice(index, 1);
            saveCustomCards();
            exitEditMode();
            reloadPrices();
        }
    }

    function saveCustomCards() {
        localStorage.setItem("customPriceCards", JSON.stringify(customCards));
    }

    function reloadPrices() {
        loadBasePrices();
    }

    function toggleEditMode() {
        isEditing = !isEditing;

        if (editBtn) {
            if (isEditing) {
                editBtn.textContent = "Сохранить изменения";
                editBtn.onclick = saveAndExitEditMode;
            } else {
                editBtn.textContent = "Редактировать цены";
                editBtn.onclick = toggleEditMode;
            }
        }

        reloadPrices();
    }

    function saveAndExitEditMode() {
        // Обновляем кастомные карточки из формы
        const customEls = document.querySelectorAll(".price-card[data-custom='true']");
        const updatedCustom = [];

        customEls.forEach((el) => {
            const name = el.querySelector(".edit-name")?.value || "Новая позиция";
            const price = parseFloat(el.querySelector(".edit-price")?.value) || 0;
            const unit = el.querySelector(".edit-unit")?.value || "сутки";
            const type = el.dataset.type;

            updatedCustom.push({ name, price, unit, type, source: "custom" });
        });

        customCards = updatedCustom;
        saveCustomCards();

        exitEditMode();
        reloadPrices();
    }

    function exitEditMode() {
        isEditing = false;
        if (editBtn) {
            editBtn.textContent = "Редактировать цены";
            editBtn.onclick = toggleEditMode;
        }
    }

    // --- Инициализация ---
    loadBasePrices();
});