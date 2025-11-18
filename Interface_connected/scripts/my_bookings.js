document.addEventListener('DOMContentLoaded', function () {
    console.log('Загрузка истории бронирований...');

    const bookingContainer = document.getElementById('booking-content');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    let bookingHistory = JSON.parse(localStorage.getItem('bookingHistory') || '[]');

    if (!isLoggedIn) {
        bookingContainer.innerHTML = `
            <div class="no-bookings">
                <h2>Вы не авторизованы</h2>
                <p>Пожалуйста, войдите в систему, чтобы просмотреть ваши бронирования.</p>
                <a href="log_in.html" class="button">Войти</a>
            </div>
        `;
        return;
    }

    if (!Array.isArray(bookingHistory)) {
        bookingHistory = [];
    }

    if (bookingHistory.length === 0) {
        bookingContainer.innerHTML = `
            <div class="no-bookings">
                <h2>У вас пока нет бронирований</h2>
                <p>Перейдите в каталог и выберите инструмент для аренды.</p>
                <a href="catalog_instruments.html" class="button">Перейти в каталог</a>
            </div>
        `;
        return;
    }

    // --- Рендер карточек с крестиками ---
    bookingContainer.innerHTML = bookingHistory
        .map(b => `
            <div class="booking-card" data-id="${String(b.bookingId)}" 
                style="position: relative; border: 1px solid #ccc; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <button class="delete-booking" title="Отменить бронирование" 
                        style="position:absolute; top:8px; right:8px; background:none; border:none; color:#e44d26; font-size:20px; cursor:pointer;">✖</button>
                <img src="${b.instrumentImage}" alt="${b.instrumentName}" style="width:100px; height:300px; border-radius:8px;">
                <div class="booking-info" style="margin-left: 10px;">
                    <h2>${b.instrumentName}</h2>
                    <p><strong>Номер бронирования:</strong> ${b.bookingId}</p>
                    <p><strong>Дата бронирования:</strong> ${new Date(b.bookingDate).toLocaleString('ru-RU')}</p>
                    <p><strong>Период:</strong> ${b.startDate} – ${b.endDate} (${b.days} дн.)</p>
                    <p><strong>Цена за день:</strong> ₽${b.dailyPrice}</p>
                    <p><strong>Итого:</strong> <span style="color:#e44d26;font-weight:bold;">₽${b.totalPrice}</span></p>
                    <p><strong>Бронировал:</strong> ${userData.firstName || 'Неизвестно'} ${userData.lastName || ''}</p>
                </div>
            </div>
        `)
        .join('');

    // --- Удаление отдельного бронирования ---
    document.querySelectorAll('.delete-booking').forEach(button => {
        button.addEventListener('click', function () {
            const card = this.closest('.booking-card');
            const bookingId = card.getAttribute('data-id');

            if (confirm('Отменить это бронирование?')) {
                // Удаляем из массива (с приведением типов)
                bookingHistory = bookingHistory.filter(b => String(b.bookingId) !== String(bookingId));

                // Сохраняем обновлённый список в localStorage
                localStorage.setItem('bookingHistory', JSON.stringify(bookingHistory));

                // Убираем карточку из DOM
                card.remove();
                updateClearButtonVisibility();

                // Проверяем, остались ли бронирования
                if (bookingHistory.length === 0) {
                    bookingContainer.innerHTML = `
                        <div class="no-bookings">
                            <h2>У вас больше нет бронирований</h2>
                            <a href="catalog_instruments.html" class="button">Перейти в каталог</a>
                        </div>
                    `;
                }
            }
        });
    });

    // --- Очистить всю историю ---
    const clearBtn = document.getElementById('clear-history');

    function updateClearButtonVisibility() {
        if (!clearBtn) return;
        if (bookingHistory.length === 0) {
            clearBtn.style.display = 'none';
        } else {
            clearBtn.style.display = 'inline-block'; // или 'block', в зависимости от дизайна
        }
    }

    // После загрузки страницы и рендера карточек:
    updateClearButtonVisibility();

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            if (confirm('Вы уверены, что хотите удалить всю историю бронирований?')) {
                bookingHistory = [];
                localStorage.removeItem('bookingHistory');
                location.reload();
                updateClearButtonVisibility();
            }
        });
    }
});
