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
            if (!email.includes('@')) {
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
                localStorage.setItem('userData', JSON.stringify(userData));
                localStorage.setItem('isLoggedIn', 'true');

                console.log('Пользователь сохранен:', userData);

                // 4. Перенаправляем
                alert('Регистрация прошла успешно!');
                window.location.href = 'index_auth.html';

            } catch (error) {
                console.error('Ошибка сохранения в localStorage:', error);
                alert('Не удалось зарегистрироваться.');
            }
        });
    } else {
        console.error('Кнопка регистрации не найдена.');
    }
});