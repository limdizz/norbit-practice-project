document.addEventListener('DOMContentLoaded', function () {
    console.log('Загрузка истории бронирований...');

    const bookingContainer = document.getElementById('booking-content');
    const clearBtn = document.getElementById('clear-history');

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    const userEmail = userData.email;
    const storageKey = userEmail ? `bookingHistory_${userEmail}` : 'bookingHistory_guest';

    let bookingHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');

    if (!isLoggedIn) {
        bookingContainer.innerHTML = `
            <div class="no-bookings">
                <h2>Вы не авторизованы</h2>
                <p>Пожалуйста, войдите, чтобы просмотреть ваши бронирования.</p>
                <a href="log_in.html" class="button">Войти</a>
            </div>
        `;
        return;
    }

    if (!Array.isArray(bookingHistory)) {
        bookingHistory = [];
    }

    // --- ЕСЛИ НЕТ БРОНИРОВАНИЙ ---
    if (bookingHistory.length === 0) {
        bookingContainer.innerHTML = `
            <div class="no-bookings">
                <h2>У вас пока нет бронирований</h2>
                <p>Перейдите в каталог и выберите инструмент или помещение.</p>
                <a href="instruments_catalog.html" class="button">Перейти в каталог</a>
            </div>
        `;
        return;
    }

    // --- РЕНДЕР КАРТОЧЕК ДЛЯ ОБОИХ ТИПОВ ---
    function renderBookings() {
        bookingContainer.innerHTML = '';

        bookingHistory.forEach(b => {
            const name = b.itemName || b.instrumentName || 'Без названия';
            const image = b.image || b.instrumentImage || 'img/no-image.png';

            let detailsHTML = '';

            if (b.itemType === 'Room') {
                // ▶ Новая система — помещения
                detailsHTML = `
                    <p><strong>Дата:</strong> ${b.date}</p>
                    <p><strong>Длительность:</strong> ${b.hours} ч.</p>
                    <p><strong>Цена за час:</strong> ₽${b.pricePerHour}</p>
                `;
            } else {
                // ▶ Старая система — инструменты
                detailsHTML = `
                    <p><strong>Период:</strong> ${b.startDate} – ${b.endDate} (${b.days} дн.)</p>
                    <p><strong>Цена за день:</strong> ₽${b.dailyPrice}</p>
                `;
            }

            const card = document.createElement('div');
            card.className = 'booking-card';
            card.dataset.id = String(b.bookingId);

            card.innerHTML = `
                <button class="delete-booking" title="Отменить бронирование" 
                        style="position:absolute; top:8px; right:8px;">✖</button>

                <img src="${image}" alt="${name}" class="booking-img">

                <div class="booking-info">
                    <h3>${name}</h3>
                    <p style="font-size:0.85em;color:#777;">ID: ${b.bookingId}</p>
                    <p><strong>Оформлено:</strong> ${new Date(b.bookingDate).toLocaleString('ru-RU')}</p>

                    ${detailsHTML}

                    <p style="margin-top:10px;font-size:1.1em;">
                        <strong>Итого:</strong>
                        <span style="color:#e44d26">₽${b.totalPrice}</span>
                    </p>
                </div>
            `;

            bookingContainer.appendChild(card);

            // --- Удаление бронирования ---
            card.querySelector('.delete-booking').addEventListener('click', () => {
                if (confirm('Отменить это бронирование?')) {
                    bookingHistory = bookingHistory.filter(x => String(x.bookingId) !== String(b.bookingId));
                    localStorage.setItem(storageKey, JSON.stringify(bookingHistory));
                    renderBookings();
                    updateClearButtonVisibility();
                }
            });
        });
    }

    renderBookings();

    // --- ПОКАЗАТЬ ИЛИ СКРЫТЬ КНОПКУ "ОЧИСТИТЬ" ---
    function updateClearButtonVisibility() {
        if (!clearBtn) return;
        clearBtn.style.display = bookingHistory.length > 0 ? 'inline-block' : 'none';
    }

    updateClearButtonVisibility();

    // --- ОЧИСТКА ВСЕЙ ИСТОРИИ ---
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Удалить всю историю бронирований?')) {
                bookingHistory = [];
                localStorage.removeItem(storageKey);
                renderBookings();
                updateClearButtonVisibility();

                bookingContainer.innerHTML = `
                    <div class="no-bookings">
                        <h2>У вас больше нет бронирований</h2>
                        <a href="instruments_catalog.html" class="button">Перейти в каталог</a>
                    </div>
                `;
            }
        });
    }
});
