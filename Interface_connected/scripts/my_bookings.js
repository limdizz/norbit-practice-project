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
                // ДОБАВЛЕНО: отображение времени начала (b.time)
                detailsHTML = `
                    <p><strong>Дата:</strong> ${b.date}</p>
                    <p><strong>Время начала:</strong> ${b.time || 'Не указано'}</p>
                    <p><strong>Цена за час:</strong> ₽${b.pricePerHour}</p>
                    <p><strong>Длительность:</strong> ${b.hours} ч.</p>
                `;
            } else {
                // ▶ Старая система — инструменты
                detailsHTML = `
                    <p><strong>Период:</strong> ${b.startDate} – ${b.endDate}</p>
                    <p><strong>Цена за день:</strong> ₽${b.dailyPrice}</p>
                    <p><strong>Количество дней:</strong> ${b.days}</p>
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
            const deleteBtn = card.querySelector('.delete-booking');

            deleteBtn.addEventListener('click', async () => {
                if (!confirm('Вы точно хотите удалить это бронирование?')) return;

                const bookingId = b.bookingId;

                try {
                    // 1. Если пользователь авторизован, удаляем из БД
                    if (isLoggedIn && bookingId) {
                        const response = await fetch(`https://localhost:7123/api/BookingsAdvanced/${bookingId}`, {
                            method: 'DELETE'
                        });

                        if (!response.ok) {
                            throw new Error('Ошибка при удалении из базы данных');
                        }
                    }

                    // 2. Если успех (или гость), удаляем из LocalStorage
                    bookingHistory = bookingHistory.filter(x => String(x.bookingId) !== String(bookingId));
                    localStorage.setItem(storageKey, JSON.stringify(bookingHistory));

                    // 3. Обновляем UI
                    renderBookings();
                    updateClearButtonVisibility();
                    console.log(`Бронирование ${bookingId} удалено.`);

                } catch (error) {
                    console.error('Ошибка удаления:', error);
                    alert('Не удалось удалить бронирование. Попробуйте позже.');
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
        clearBtn.addEventListener('click', async () => {
            if (!confirm('Вы уверены, что хотите удалить ВСЮ историю бронирований? Это действие необратимо.')) return;

            try {
                // 1. Если авторизован, удаляем всё из БД по ID пользователя
                if (isLoggedIn) {
                    // Берем userUid из userData (убедитесь, что он там есть при логине)
                    const userUid = userData.userUid || userData.uid;

                    if (userUid) {
                        const response = await fetch(`https://localhost:7123/api/BookingsAdvanced/byUser/${userUid}`, {
                            method: 'DELETE'
                        });

                        if (!response.ok && response.status !== 404) {
                            // 404 игнорируем, если в базе пусто, а в сторадже есть мусор
                            throw new Error('Ошибка при очистке базы данных');
                        }
                    } else {
                        console.warn('User UID не найден, удаляем только локально.');
                    }
                }

                // 2. Очищаем LocalStorage
                bookingHistory = [];
                localStorage.removeItem(storageKey);

                // 3. Обновляем UI
                renderBookings();
                updateClearButtonVisibility();

                // Показываем заглушку
                bookingContainer.innerHTML = `
                    <div class="no-bookings">
                        <h2>История очищена</h2>
                        <a href="instruments_catalog.html" class="button">Перейти в каталог</a>
                    </div>
                `;

            } catch (error) {
                console.error('Ошибка полной очистки:', error);
                alert('Не удалось очистить историю на сервере.');
            }
        });
    }
});
