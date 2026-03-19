document.addEventListener('DOMContentLoaded', async function () {
    const accessMessage = document.getElementById('access-message');
    const bookingsSection = document.getElementById('bookings-section');
    const bookingsTbody = document.getElementById('bookings-tbody');

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userUid = userData.userUid;

    if (!isLoggedIn || !userUid) {
        if (accessMessage) {
            accessMessage.style.display = 'block';
            accessMessage.textContent = 'Для доступа к административной панели необходимо войти в систему.';
        }
        window.location.href = 'log_in.html';
        return;
    }

    try {
        // Проверяем, есть ли пользователь в staff_advanced
        const staffCheckResponse = await fetch(`https://localhost:7123/api/StaffAdvanced/byUser/${userUid}`);
        if (!staffCheckResponse.ok) {
            if (accessMessage) {
                accessMessage.style.display = 'block';
                accessMessage.textContent = 'У вас нет прав для доступа к административной панели.';
            }
            return;
        }

        // Загрузка всех бронирований
        const bookingsResponse = await fetch(`https://localhost:7123/api/BookingsAdvanced/admin?staffUserUid=${userUid}`);
        if (!bookingsResponse.ok) {
            throw new Error('Не удалось загрузить бронирования.');
        }

        const bookings = await bookingsResponse.json();

        if (!Array.isArray(bookings) || bookings.length === 0) {
            if (accessMessage) {
                accessMessage.style.display = 'block';
                accessMessage.textContent = 'Бронирований пока нет.';
            }
            return;
        }

        if (bookingsSection) {
            bookingsSection.style.display = 'block';
        }

        bookingsTbody.innerHTML = '';

        bookings.forEach(b => {
            const tr = document.createElement('tr');

            const userInfo = b.userEmail
                ? `${b.userName || ''} ${b.userSurname || ''} (${b.userEmail})`
                : b.userUid || '';

            const itemInfo = b.roomName || b.instrumentName || (b.roomId ? `Комната #${b.roomId}` : '');

            tr.innerHTML = `
                <td>${b.bookingUid}</td>
                <td>${userInfo}</td>
                <td>${itemInfo}</td>
                <td>${b.startTime ? new Date(b.startTime).toLocaleString('ru-RU') : ''}</td>
                <td>${b.endTime ? new Date(b.endTime).toLocaleString('ru-RU') : ''}</td>
                <td>${b.status || ''}</td>
                <td>${b.staffName ? b.staffName : (b.staffUid || '')}</td>
                <td>
                    <button class="admin-cancel-btn" data-id="${b.bookingUid}">Отменить</button>
                    <button class="admin-reschedule-btn" data-id="${b.bookingUid}">Перенести</button>
                </td>
            `;

            bookingsTbody.appendChild(tr);
        });

        // Обработчики для кнопок "Отменить"
        document.querySelectorAll('.admin-cancel-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const bookingId = btn.getAttribute('data-id');
                if (!confirm('Вы уверены, что хотите отменить это бронирование?')) return;

                try {
                    const resp = await fetch(`https://localhost:7123/api/BookingsAdvanced/${bookingId}/cancel`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ staffUserUid: userUid })
                    });

                    if (!resp.ok) {
                        const msg = await resp.text();
                        throw new Error(msg || 'Ошибка отмены бронирования.');
                    }

                    alert('Бронирование отменено.');
                    window.location.reload();
                } catch (e) {
                    console.error(e);
                    alert('Не удалось отменить бронирование.');
                }
            });
        });

        // Обработчики для кнопок "Перенести"
        document.querySelectorAll('.admin-reschedule-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const bookingId = btn.getAttribute('data-id');

                const newStart = prompt('Введите новое время начала (в формате ГГГГ-ММ-ДД ЧЧ:ММ):');
                if (!newStart) return;
                const newEnd = prompt('Введите новое время окончания (в формате ГГГГ-ММ-ДД ЧЧ:ММ):');
                if (!newEnd) return;

                const startDate = new Date(newStart.replace(' ', 'T'));
                const endDate = new Date(newEnd.replace(' ', 'T'));

                if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
                    alert('Неверный формат даты/времени. Проверьте ввод.');
                    return;
                }

                if (startDate >= endDate) {
                    alert('Время начала должно быть строго раньше времени окончания.');
                    return;
                }

                const startIso = startDate.toISOString();
                const endIso = endDate.toISOString();

                try {
                    const resp = await fetch(`https://localhost:7123/api/BookingsAdvanced/${bookingId}/reschedule`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            staffUserUid: userUid,
                            startTime: startIso,
                            endTime: endIso
                        })
                    });

                    if (!resp.ok) {
                        const msg = await resp.text();
                        throw new Error(msg || 'Ошибка переноса бронирования.');
                    }

                    alert('Бронирование успешно перенесено.');
                    window.location.reload();
                } catch (e) {
                    console.error(e);
                    alert('Не удалось перенести бронирование.');
                }
            });
        });

    } catch (error) {
        console.error('Ошибка загрузки админской панели бронирований:', error);
        if (accessMessage) {
            accessMessage.style.display = 'block';
            accessMessage.textContent = 'Произошла ошибка при загрузке панели бронирований.';
        }
    }
});

