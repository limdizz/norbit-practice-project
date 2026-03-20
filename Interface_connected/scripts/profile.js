document.addEventListener('DOMContentLoaded', function () {
    const userInfoDiv = document.getElementById('user-info');
    const bookingContainerCurrent = document.getElementById('booking-content-current');
    const bookingContainerArchive = document.getElementById('booking-content-archive');
    const clearBtn = document.getElementById('clear-history');
    const profileBookingsSection = document.getElementById('profile-bookings-section');

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const isStaff = localStorage.getItem('isStaff') === 'true';

    // Для администратора скрываем блоки, связанные с бронированиями
    if (isStaff && profileBookingsSection) {
        profileBookingsSection.style.display = 'none';
    }

    // 1. Определяем уникальный ключ хранилища для пользователя
    const userEmail = userData.email;
    const storageKey = userEmail ? `bookingHistory_${userEmail}` : 'bookingHistory_guest';

    let bookingHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');

    // Подписка тоже по уникальному ключу
    const subscriptionKey = userEmail ? `subscription_${userEmail}` : 'subscription_guest';
    const subscription = JSON.parse(localStorage.getItem(subscriptionKey) || 'null');

    if (!isLoggedIn) {
        if (userInfoDiv) userInfoDiv.innerHTML = '<p>Вы не авторизованы. <a href="log_in.html">Войти</a></p>';
        if (bookingContainerCurrent) bookingContainerCurrent.innerHTML = '';
        if (bookingContainerArchive) bookingContainerArchive.innerHTML = '';
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

        if (isStaff) {
            userHTML += `
                <hr>
                <p><strong>Режим:</strong> Администратор</p>
                <button class="button" onclick="location.href='admin_bookings.html'">Админ-панель</button>
            `;
            userHTML += `<a href="log_out.html" class="button logout">Выйти</a>`;
            userInfoDiv.innerHTML = userHTML;
            return;
        }

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
        if (!bookingContainerCurrent || !bookingContainerArchive) return;

        bookingContainerCurrent.innerHTML = '';
        bookingContainerArchive.innerHTML = '';

        if (!bookingHistory.length) {
            bookingContainerCurrent.innerHTML = `
                    <div class="no-bookings">
                        <p>У вас нет активных бронирований.</p>
                        <a href="index.html" class="button">Перейти в каталог</a>
                    </div>`;
            bookingContainerArchive.innerHTML = `
                    <div class="no-bookings">
                        <p>Архив пока пуст.</p>
                    </div>`;
            if (clearBtn) clearBtn.style.display = 'none';
            return;
        }

        if (clearBtn) clearBtn.style.display = 'inline-block';

        const nowMs = Date.now();

        function getRoomEndMs(b) {
            if (!b?.date || !b?.time || !b?.hours) return null;
            const parts = String(b.date).split('.');
            if (parts.length !== 3) return null;
            const [day, month, year] = parts.map(Number);
            const [hour, minute] = String(b.time).split(':').map(Number);
            const hours = parseInt(b.hours, 10);
            if ([day, month, year, hour, minute, hours].some(x => Number.isNaN(x))) return null;
            const start = new Date(year, month - 1, day, hour, minute, 0);
            const end = new Date(start);
            end.setHours(end.getHours() + hours);
            return end.getTime();
        }

        function getInstrumentEndMs(b) {
            if (!b?.endDate) return null;
            const parts = String(b.endDate).split('.');
            if (parts.length !== 3) return null;
            const [day, month, year] = parts.map(Number);
            const timeStr = b.endTime || '00:00';
            const [hour, minute] = String(timeStr).split(':').map(Number);
            if ([day, month, year, hour, minute].some(x => Number.isNaN(x))) return null;
            const end = new Date(year, month - 1, day, hour, minute, 0);
            return end.getTime();
        }

        function isCurrentBooking(b) {
            if (b?.itemType === 'Room') {
                const endMs = getRoomEndMs(b);
                if (endMs === null) return false;
                return endMs > nowMs;
            }

            const endMs = getInstrumentEndMs(b);
            if (endMs === null) return false;
            return endMs > nowMs;
        }

        // сначала раскидываем по контейнерам, чтобы можно было корректно показывать пустые состояния
        const currentBookings = [];
        const archiveBookings = [];
        bookingHistory.forEach(b => {
            if (isCurrentBooking(b)) currentBookings.push(b);
            else archiveBookings.push(b);
        });

        if (currentBookings.length === 0) {
            bookingContainerCurrent.innerHTML = `
                    <div class="no-bookings">
                        <p>Текущих бронирований нет.</p>
                    </div>`;
        }

        if (archiveBookings.length === 0) {
            bookingContainerArchive.innerHTML = `
                    <div class="no-bookings">
                        <p>Архив пока пуст.</p>
                    </div>`;
        }

        function renderCards(list, container) {
            list.forEach(b => {
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

            container.appendChild(card);

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

        renderCards(currentBookings, bookingContainerCurrent);
        renderCards(archiveBookings, bookingContainerArchive);
    }

    if (!isStaff) {
        renderBookings();
    }

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
                if (bookingContainerCurrent) {
                    bookingContainerCurrent.innerHTML = `
                        <div class="no-bookings">
                            <h2>История очищена</h2>
                            <a href="index.html" class="button">Перейти в каталог</a>
                        </div>
                    `;
                }
                if (bookingContainerArchive) {
                    bookingContainerArchive.innerHTML = `
                        <div class="no-bookings">
                            <p>Архив пуст.</p>
                        </div>
                    `;
                }

            } catch (error) {
                console.error('Ошибка полной очистки:', error);
                alert('Не удалось очистить историю на сервере.');
            }
        });
    }
});

const API_BASE_URL = "https://localhost:7123/api";

document.addEventListener('DOMContentLoaded', function () {
    renderUserProfile();
    // renderBookings(); // Если это файл с бронированиями, раскомментируйте
});

async function renderUserProfile() {
    const userInfoDiv = document.getElementById('user-info');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = userData.userUid || userData.uid;
    const isStaff = localStorage.getItem('isStaff') === 'true';

    if (!userInfoDiv) return;

    if (!userId) {
        userInfoDiv.innerHTML = '<p>Вы не авторизованы. <a href="log_in.html">Войти</a></p>';
        return;
    }

    let userHTML = `
        <p><strong>Имя:</strong> ${userData.firstName || 'Пользователь'}</p>
        <p><strong>Фамилия:</strong> ${userData.lastName || 'Пользователь'}</p>
        <p><strong>Email:</strong> ${userData.email || 'Не указан'}</p>
    `;

    if (isStaff) {
        userHTML += `
            <hr>
            <p><strong>Режим:</strong> Администратор</p>
            <a href="admin_bookings.html" class="button">Админ-панель</a>
        `;
        userHTML += `<br><a href="log_out.html" class="button logout" style="margin-top:20px;">Выйти</a>`;
        userInfoDiv.innerHTML = userHTML;
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/UserSubscriptionsAdvanced/active/${userId}`);

        if (response.ok) {
            const sub = await response.json();

            // Учитываем разный регистр свойств
            const validDateRaw = sub.validUntil || sub.ValidUntil;
            const validDate = new Date(validDateRaw).toLocaleDateString('ru-RU');

            const sessions = sub.sessionsRemaining !== undefined ? sub.sessionsRemaining : sub.SessionsRemaining;

            // Безопасный доступ к вложенному объекту Plan
            const planObj = sub.plan || sub.Plan;
            const planName = sub.planName || sub.PlanName || (sub.plan ? (sub.plan.planName || sub.plan.PlanName) : 'Тариф');

            userHTML += `
                <div style="margin-top: 20px; padding: 15px; border: 1px solid #4CAF50; border-radius: 8px; background-color: #f9fff9;">
                    <h3 style="color: #2E7D32; margin-top:0;">Ваш абонемент: ${planName}</h3>
                    <p><strong>Статус:</strong> <span style="color: #4CAF50; font-weight: bold;">АКТИВЕН</span></p>
                    <p><strong>Осталось сеансов:</strong> ${sessions}</p>
                    <p><strong>Действует до:</strong> ${validDate}</p>
                    
                    <button id="cancel-sub-btn" class="button logout" style="background:#dc3545; margin-top: 10px;">
                        Отменить подписку
                    </button>
                    <p style="font-size: 0.8em; color: #666; margin-top: 5px;">
                        *Отмена позволит вам выбрать новый тариф.
                    </p>
                </div>
            `;
        } else {
            userHTML += `
                <hr>
                <p>У вас нет активного абонемента.</p>
                <a href="subscription_plans.html" class="button" style="background: black; color: white; text-decoration: none; padding: 10px 20px; display: inline-block;">Купить абонемент</a>
            `;
        }
    } catch (e) {
        console.error("Ошибка загрузки профиля", e);
        userHTML += `<p style="color:red">Не удалось загрузить данные подписки.</p>`;
    }

    userHTML += `<br><a href="log_out.html" class="button logout" style="margin-top:20px;">Выйти</a>`;
    userInfoDiv.innerHTML = userHTML;

    // Обработчик кнопки отмены
    const cancelBtn = document.getElementById('cancel-sub-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => cancelSubscription(userId));
    }
}

async function cancelSubscription(userId) {
    if (!confirm('Вы уверены, что хотите отменить подписку? Оставшиеся сеансы могут сгореть.')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/UserSubscriptionsAdvanced/cancel/${userId}`, {
            method: 'POST'
        });

        if (response.ok) {
            alert('Подписка успешно отменена.');
            window.location.reload();
        } else {
            const msg = await response.text();
            alert('Ошибка: ' + msg);
        }
    } catch (error) {
        console.error(error);
        alert('Ошибка соединения.');
    }
}