document.addEventListener('DOMContentLoaded', function () {
    const userInfoDiv = document.getElementById('user-info');
    const bookingContainer = document.getElementById('booking-content');
    const clearBtn = document.getElementById('clear-history');

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    // 1. Определяем уникальный ключ хранилища для пользователя
    const userEmail = userData.email;
    const storageKey = userEmail ? `bookingHistory_${userEmail}` : 'bookingHistory_guest';

    let bookingHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');

    // Подписка тоже по уникальному ключу
    const subscriptionKey = userEmail ? `subscription_${userEmail}` : 'subscription_guest';
    const subscription = JSON.parse(localStorage.getItem(subscriptionKey) || 'null');

    if (!isLoggedIn) {
        if (userInfoDiv) userInfoDiv.innerHTML = '<p>Вы не авторизованы. <a href="log_in.html">Войти</a></p>';
        if (bookingContainer) bookingContainer.innerHTML = '';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }

    // 2. Отображение данных пользователя (если есть блок userInfoDiv)
    if (userInfoDiv) {
        let userHTML = `
            <p><strong>Имя:</strong> ${userData.firstName || ''}</p>
            <p><strong>Фамилия:</strong> ${userData.lastName || ''}</p>
            <p><strong>Email:</strong> ${userData.email || ''}</p>
        `;

        if (subscription) {
            userHTML += `
                <hr>
                <h3>Ваш абонемент</h3>
                <p><strong>План:</strong> ${subscription.plan}</p>
                <p><strong>Стоимость:</strong> ₽${subscription.price} / месяц</p>
                <p><strong>Дата оформления:</strong> ${subscription.startDate}</p>
                <button id="cancel-subscription" class="button logout" style="background:#dc3545;">Отменить абонемент</button>
            `;
        } else {
            userHTML += `
                <hr>
                <p>У вас нет активного абонемента.</p>
                <a href="subscription_plans.html" class="button">Выбрать абонемент</a>
            `;
        }

        userHTML += `<a href="log_out.html" class="button logout">Выйти</a>`;
        userInfoDiv.innerHTML = userHTML;

        // Логика отмены подписки
        const cancelBtn = document.getElementById('cancel-subscription');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (confirm('Вы уверены, что хотите отменить абонемент?')) {
                    localStorage.removeItem(subscriptionKey);
                    alert('Абонемент успешно отменён.');
                    location.reload();
                }
            });
        }
    }

    function updateClearButtonVisibility() {
        if (!clearBtn) return;
        clearBtn.style.display = bookingHistory.length > 0 ? 'inline-block' : 'none';
    }

    // 3. ===== ОТОБРАЖЕНИЕ БРОНИРОВАНИЙ (УНИВЕРСАЛЬНОЕ) =====
    function renderBookings() {
        if (!bookingContainer) return;

        bookingContainer.innerHTML = '';

        if (!bookingHistory.length) {
            bookingContainer.innerHTML = `
                    <div class="no-bookings">
                        <p>У вас нет активных бронирований.</p>
                        <a href="index.html" class="button">Перейти в каталог</a>
                    </div>`;
            if (clearBtn) clearBtn.style.display = 'none';
            return;
        }

        if (clearBtn) clearBtn.style.display = 'inline-block';

        bookingHistory.forEach(b => {
            const card = document.createElement('div');
            card.className = 'booking-card';
            card.dataset.id = b.bookingId;

            // --- ЛОГИКА ОПРЕДЕЛЕНИЯ ТИПА (Помещение или Инструмент) ---

            // Универсальные поля (имя и картинка могут называться по-разному в старых и новых версиях)
            const name = b.itemName || b.instrumentName || 'Без названия';
            const image = b.image || b.instrumentImage || 'img/no-image.png';

            const pricePerHour = b.pricePerHour || b.price || 0;

            let detailsHTML = '';

            if (b.itemType === 'Room') {
                // ▶ Новая система — помещения
                // ДОБАВЛЕНО: отображение времени начала (b.time)
                detailsHTML = `
                    <p><strong>Номер заказа:</strong> ${b.orderId}</p>
                    <p><strong>Дата:</strong> ${b.date}</p>
                    <p><strong>Время начала:</strong> ${b.time || 'Не указано'}</p>
                    <p><strong>Длительность:</strong> ${b.hours} ч.</p>
                    <p><strong>Цена за час:</strong> ₽${b.pricePerHour}</p>
                `;
            } else {
                // ШАБЛОН ДЛЯ ИНСТРУМЕНТА (Старый)
                detailsHTML = `
                <p><strong>Номер заказа:</strong> ${b.orderId}</p>
                    <p><strong>Период:</strong> ${b.startDate} – ${b.endDate}</p>
                    <p><strong>Длительность:</strong> ${b.days} дн.</p>
                    <p><strong>Цена за день:</strong> ₽${b.dailyPrice}</p>
                `;
            }

            // Формируем HTML карточки
            card.innerHTML = `
                    <button class="delete-booking" title="Отменить бронирование">✖</button>
                    <img src="${image}" alt="${name}">
                    <div class="booking-info">
                        <h4>${name}</h4>
                        <p style="font-size: 0.85em; color: #777;">ID: ${b.bookingId}</p>
                        <p><strong>Оформлено:</strong> ${new Date(b.bookingDate).toLocaleString('ru-RU')}</p>
                        
                        ${detailsHTML} <p style="margin-top: 10px; font-size: 1.1em;"><strong>Итого:</strong> <span style="color:#e44d26">₽${b.totalPrice}</span></p>
                    </div>`;

            bookingContainer.appendChild(card);

            // Обработчик удаления
            const deleteBtn = card.querySelector('.delete-booking');

            deleteBtn.addEventListener('click', async () => {
                if (!confirm('Вы точно хотите удалить это бронирование?')) return;

                const bookingId = b.bookingId;

                try {
                    // 1. Если это помещение — удаляем из базы
                    if (isLoggedIn) {
                        const response = await fetch(`https://localhost:7123/api/BookingsAdvanced/${bookingId}`, {
                            method: 'DELETE'
                        });

                        if (!response.ok && response.status !== 404) {
                            throw new Error('Ошибка при удалении из базы данных');
                        }
                    }

                    // 2. Удаляем из LocalStorage
                    bookingHistory = bookingHistory.filter(x => String(x.bookingId) !== String(bookingId));
                    localStorage.setItem(storageKey, JSON.stringify(bookingHistory));

                    // 3. Обновляем страницу
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

    // Очистка всей истории
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
                        <a href="index.html" class="button">Перейти в каталог</a>
                    </div>
                `;

            } catch (error) {
                console.error('Ошибка полной очистки:', error);
                alert('Не удалось очистить историю на сервере.');
            }
        });
    }
});