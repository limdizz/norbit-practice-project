document.addEventListener('DOMContentLoaded', function () {

    // Находим форму и ее элементы
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('loginEmail');

    const passwordInput = document.getElementById('loginPassword');
    const loginButton = document.getElementById('loginButton');

    // Проверяем, что все элементы найдены
    if (!loginForm || !emailInput || !passwordInput || !loginButton) {
        console.error('Не все элементы формы входа были найдены!');
        return;
    }

    // 1. Убираем встроенный onclick, чтобы он не мешал скрипту
    loginButton.removeAttribute('onclick');

    // 2. Вешаем обработчик на 'submit' (отправку) формы
    loginForm.addEventListener('submit', function (event) {

        // 3. Предотвращаем стандартное поведение формы (перезагрузку страницы)
        event.preventDefault();

        // 4. Собираем введённые данные
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            alert('Пожалуйста, заполните поля Email и Пароль.');
            return;
        }

        console.log(`Попытка входа с email: ${email}`);

        // 5. Проверяем наличие зарегистрированного пользователя
        const savedUserDataString = localStorage.getItem('userData');

        if (!savedUserDataString) {
            alert('Зарегистрированный пользователь не найден. Пожалуйста, сначала зарегистрируйтесь.');
            return;
        }

        try {
            const savedUserData = JSON.parse(savedUserDataString);

            // 6. Сравниваем email
            if (savedUserData.email === email) {

                // --- ВАЖНОЕ ЗАМЕЧАНИЕ О ПАРОЛЕ ---
                // Ваш скрипт sign_up.js намеренно не сохраняет пароль в localStorage
                // (что является правильной практикой безопасности).
                // В реальном приложении, здесь бы отправлялся запрос на сервер:
                // fetch('/api/login', { method: 'POST', body: {email, password} })
                //
                // Поскольку у нас нет сервера, мы просто считаем, что если email
                // совпал, то вход успешен (имитация).

                console.log('Email совпал. Вход выполнен (имитация).');

                // 7. "Пересылаем данные" (сохраняем статус входа)
                localStorage.setItem('isLoggedIn', 'true');
                // Данные пользователя (userData) уже лежат в localStorage

                // 8. Перенаправляем пользователя
                alert('Вход выполнен успешно!');
                window.location.href = 'index_auth.html';

            } else {
                // Email не совпал
                alert('Пользователь с таким email не найден или пароль неверный.');
            }

        } catch (error) {
            console.error('Ошибка при чтении данных из localStorage:', error);
            alert('Произошла ошибка при попытке входа.');
        }
    });
});