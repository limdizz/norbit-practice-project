document.addEventListener("DOMContentLoaded", function () {
    const instrumentPrices = [
        { name: "Электрогитары от", price: 600, unit: "сутки" },
        { name: "Классические гитары от", price: 300, unit: "сутки" },
        { name: "Микрофоны от", price: 185, unit: "сутки" },
        { name: "Синтезаторы от", price: 1800, unit: "сутки" },
        { name: "Бас-гитары от", price: 380, unit: "сутки" },
        { name: "Ударные установки от", price: 2000, unit: "сутки" }
    ];

    const roomPrices = [
        { name: "Репетиционный зал", price: 750, unit: "час" },
        { name: "Студия звукозаписи", price: 1000, unit: "час" },
        { name: "Лаунж-зона", price: 1000, unit: "час" },
    ];

    const instrumentsContainer = document.getElementById("instrument-prices");
    const roomsContainer = document.getElementById("room-prices");

    function renderPrices(data, container) {
        data.forEach(item => {
            const div = document.createElement("div");
            div.className = "price-card";
            div.innerHTML = `
                        <h3>${item.name}</h3>
                        <p class="price">₽${item.price} ${item.unit ? " / " + item.unit : ""}</p>
                    `;
            container.appendChild(div);
        });
    }

    renderPrices(instrumentPrices, instrumentsContainer);
    renderPrices(roomPrices, roomsContainer);
});