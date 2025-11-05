document.addEventListener('DOMContentLoaded', function() {
    const loginButton = document.querySelector('.register_button');
    
    if (loginButton) {
        // Удаляем все встроенные onclick
        loginButton.removeAttribute('onclick');

        // Добавляем наш собственный обработчик
        loginButton.addEventListener('click', handleLogin);
    }
});

function handleLogin(event) {
    event.preventDefault(); // Останавливаем любое поведение по умолчанию

    const inputs = document.querySelectorAll('input.register_p');
    const email = inputs[0]?.value.trim();
    const password = inputs[1]?.value.trim();

    if (!email || !password) {
        alert('Пожалуйста, введите email и пароль.');
        return;
    }

    // Проверяем, есть ли пользователь в localStorage
    const existingUser = localStorage.getItem('userData');
    let userData;

    if (existingUser) {
        // Если пользователь есть, "входим" под ним
        userData = JSON.parse(existingUser);
        console.log('Вход под существующим пользователем:', userData.email);
    } else {
        // Если пользователя нет, создаем нового (для демонстрации)
        // В реальном приложении здесь должна быть ошибка "пользователь не найден"
        console.warn('Пользователь не найден. Создаем нового для демонстрации.');
        userData = {
            firstName: 'Иван',
            lastName: 'Иванов',
            email: email
        };
    }

    // Сохраняем/обновляем данные и флаг входа
    try {
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('isLoggedIn', 'true');
        console.log('Пользователь вошел:', userData);

        // Перенаправляем на авторизованную главную страницу
        window.location.href = 'index_auth.html';
    } catch (error) {
        console.error('Ошибка сохранения в localStorage:', error);
    }
}