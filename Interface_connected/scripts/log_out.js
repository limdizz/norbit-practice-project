document.addEventListener('DOMContentLoaded', () => {
    // Удаляем информацию о пользователе
    localStorage.removeItem('currentUser');
    sessionStorage.clear();

    // Можно также очистить другие данные (например, токены)
    localStorage.removeItem('authToken');

    // Сообщение в консоль
    console.log('✅ Пользователь успешно вышел из профиля.');

    // Перенаправляем через 3 секунды
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 3000);
});