document.addEventListener('DOMContentLoaded', function () {
    updateHeaderState();
});

function updateHeaderState() {
    // 1. Проверяем статус входа
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const isStaff = localStorage.getItem('isStaff') === 'true';

    // 2. Находим блоки кнопок
    const userControls = document.getElementById('user-controls');
    const guestControls = document.getElementById('guest-controls');

    // 3. Переключаем видимость
    if (isLoggedIn) {
        // Пользователь вошел
        if (guestControls) guestControls.style.display = 'none';

        if (userControls) {
            userControls.style.display = 'flex';
        }

        // Для сотрудников скрываем пункт "Мои бронирования" в хедере
        if (userControls) {
            const myBookingsLinks = userControls.querySelectorAll('a[href="my_bookings.html"]');
            myBookingsLinks.forEach(a => {
                a.style.display = isStaff ? 'none' : '';
            });
        }
    } else {
        // Гость
        if (userControls) userControls.style.display = 'none';
        if (guestControls) guestControls.style.display = 'flex';
    }
}