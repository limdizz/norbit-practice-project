document.addEventListener('DOMContentLoaded', function () {
    const registerButton = document.querySelector('.register_button');

    if (registerButton) {
        registerButton.removeAttribute('onclick');

        registerButton.addEventListener('click', function (event) {
            event.preventDefault();

            console.log('Кнопка регистрации нажата');

            // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
            // Находим каждое поле по его уникальному ID
            const lastName = document.getElementById('regLastName')?.value.trim();
            const firstName = document.getElementById('regFirstName')?.value.trim();
            const email = document.getElementById('regEmail')?.value.trim();
            const password = document.getElementById('regPassword')?.value.trim();
            // --- КОНЕЦ ИЗМЕНЕНИЯ ---

            // 1. Валидация
            if (!lastName || !firstName || !email || !password) {
                alert('Пожалуйста, заполните все поля.');
                return;
            }

            // Простая проверка email (можно улучшить)
            if (!email.includes('@') || email.length < 5) {
                alert('Пожалуйста, введите корректный email.');
                return;
            }

            // 2. Создаем объект пользователя
            const userData = {
                firstName: firstName,
                lastName: lastName,
                email: email
            };

            // 3. Сохраняем данные пользователя в localStorage
            try {
                // Загружаем существующий список пользователей.
                // Если его нет, создаем пустой массив.
                let users = JSON.parse(localStorage.getItem('users') || '[]');

                // Проверяем, существует ли пользователь с таким email
                const existingUser = users.find(user => user.email === email);

                if (existingUser) {
                    // Пользователь найден! Отменяем регистрацию.
                    alert('Ошибка: Пользователь с таким email уже зарегистрирован.');
                    return;
                }

                // --- 4. Регистрация нового пользователя ---
                // Пользователь не найден, продолжаем регистрацию

                // Создаем объект нового пользователя
                const newUser = {
                    id: Date.now(), // Уникальный ID
                    firstName: firstName,
                    lastName: lastName,
                    email: email
                    // Мы не сохраняем пароль в localStorage!
                };

                // Добавляем нового пользователя в массив
                users.push(newUser);

                // Сохраняем ОБНОВЛЕННЫЙ массив пользователей обратно
                localStorage.setItem('users', JSON.stringify(users));

                // --- 5. Вход в систему (для совместимости с другими скриптами) ---
                // Сохраняем данные текущего пользователя отдельно,
                // чтобы order.js и instrument.js могли их найти
                localStorage.setItem('userData', JSON.stringify(newUser));
                localStorage.setItem('isLoggedIn', 'true');

                console.log('Пользователь успешно зарегистрирован:', newUser);

                // 6. Перенаправляем
                alert('Регистрация прошла успешно!');
                window.location.href = 'index_auth.html';

            } catch (error) {
                console.error('Ошибка при работе с localStorage:', error);
                alert('Не удалось зарегистрироваться. Ошибка хранилища.');
            }
        });
    } else {
        console.error('Кнопка регистрации не найдена.');
    }
});