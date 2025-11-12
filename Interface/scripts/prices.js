document.addEventListener("DOMContentLoaded", function () {
    const instrumentPrices = [
        { name: "Электрогитары от", price: 600, unit: "в сутки" },
        { name: "Классические гитары от", price: 300, unit: "в сутки" },
        { name: "Микрофоны от", price: 185, unit: "в сутки" },
        { name: "Синтезаторы от", price: 1800, unit: "в сутки" },
        { name: "Бас-гитары от", price: 380, unit: "в сутки" },
        { name: "Ударные установки Pearl Export", price: 2000, unit: "в сутки" }
    ];

    const roomPrices = [
        { name: "Репетиционный зал (1 час)", price: 750 },
        { name: "Студия звукозаписи (1 час)", price: 1000 },
        { name: "Лаунж-зона (1 час)", price: 1000 },
    ];

    const instrumentsContainer = document.getElementById("instrument-prices");
    const roomsContainer = document.getElementById("room-prices");

    function renderPrices(data, container) {
        data.forEach(item => {
            const div = document.createElement("div");
            div.className = "price-card";
            div.innerHTML = `
                        <h3>${item.name}</h3>
                        <p class="price">₽${item.price.toLocaleString("ru-RU")} ${item.unit ? " / " + item.unit : ""}</p>
                    `;
            container.appendChild(div);
        });
    }

    renderPrices(instrumentPrices, instrumentsContainer);
    renderPrices(roomPrices, roomsContainer);
});