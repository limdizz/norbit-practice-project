document.addEventListener('DOMContentLoaded', function () {
    const userInfoDiv = document.getElementById('user-info');
    const bookingContainer = document.getElementById('booking-content');
    const clearBtn = document.getElementById('clear-history');

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    let bookingHistory = JSON.parse(localStorage.getItem('bookingHistory') || '[]');
    const subscription = JSON.parse(localStorage.getItem('subscription') || 'null');

    if (!isLoggedIn) {
        userInfoDiv.innerHTML = '<p>Вы не авторизованы. <a href="log_in.html">Войти</a></p>';
        bookingContainer.innerHTML = '';
        clearBtn.style.display = 'none';
        return;
    }

    // Формируем информацию о пользователе
    let userHTML = `
            <p><strong>Имя:</strong> ${userData.firstName || ''}</p>
            <p><strong>Фамилия:</strong> ${userData.lastName || ''}</p>
            <p><strong>Email:</strong> ${userData.email || ''}</p>
        `;

    // Добавляем информацию о подписке (если есть)
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

    // Отмена подписки
    const cancelBtn = document.getElementById('cancel-subscription');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите отменить абонемент?')) {
                localStorage.removeItem('subscription');
                alert('Абонемент успешно отменён.');
                location.reload();
            }
        });
    }

    // ===== Отображение бронирований =====
    function renderBookings() {
        bookingContainer.innerHTML = '';

        if (!bookingHistory.length) {
            bookingContainer.innerHTML = `
                    <div class="no-bookings">
                        <p>У вас нет активных бронирований.</p>
                        <a href="catalog_instruments.html" class="button">Перейти в каталог</a>
                    </div>`;
            clearBtn.style.display = 'none';
            return;
        }

        clearBtn.style.display = 'inline-block';

        bookingHistory.forEach(b => {
            const card = document.createElement('div');
            card.className = 'booking-card';
            card.dataset.id = b.bookingId;
            card.innerHTML = `
                    <button class="delete-booking" title="Отменить бронирование">✖</button>
                    <img src="${b.instrumentImage}" alt="${b.instrumentName}">
                    <div class="booking-info">
                        <h4>${b.instrumentName}</h4>
                        <p><strong>Номер бронирования:</strong> ${b.bookingId}</p>
                        <p><strong>Дата бронирования:</strong> ${new Date(b.bookingDate).toLocaleString('ru-RU')}</p>
                        <p><strong>Период:</strong> ${b.startDate} – ${b.endDate} (${b.days} дн.)</p>
                        <p><strong>Цена за день:</strong> ₽${b.dailyPrice}</p>
                        <p><strong>Итого:</strong> ₽${b.totalPrice}</p>
                    </div>`;
            bookingContainer.appendChild(card);

            card.querySelector('.delete-booking').addEventListener('click', () => {
                if (confirm('Отменить это бронирование?')) {
                    bookingHistory = bookingHistory.filter(x => String(x.bookingId) !== String(b.bookingId));
                    localStorage.setItem('bookingHistory', JSON.stringify(bookingHistory));
                    renderBookings();
                }
            });
        });
    }

    renderBookings();

    clearBtn.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите удалить всю историю бронирований?')) {
            bookingHistory = [];
            localStorage.removeItem('bookingHistory');
            renderBookings();
        }
    });
});