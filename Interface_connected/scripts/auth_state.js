document.addEventListener('DOMContentLoaded', function () {
    updateHeaderState();
});

function updateHeaderState() {
    // 1. Проверяем статус входа
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

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
    } else {
        // Гость
        if (userControls) userControls.style.display = 'none';
        if (guestControls) guestControls.style.display = 'flex';
    }
}