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
    loginForm.addEventListener('submit', async function (event) {

        // 3. Предотвращаем стандартное поведение формы (перезагрузку страницы)
        event.preventDefault();

        // 4. Собираем введённые данные
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            alert('Пожалуйста, заполните поля Email и Пароль.');
            return;
        }

       console.log(`Попытка входа через API для: ${email}`);

        try {
            // 3. Отправляем запрос на сервер (Backend)
            // Убедитесь, что порт (7123) совпадает с вашим запуском API
            const response = await fetch('https://localhost:7123/api/UsersAdvanced/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            // 4. Обрабатываем ответ
            if (response.ok) {
                const userFromDb = await response.json();
                console.log('Вход успешен:', userFromDb);

                // 5. Сохраняем данные пользователя в localStorage для работы сайта
                // (Используем поля, которые вернул сервер. Обычно они с маленькой буквы в JSON)
                localStorage.setItem('userData', JSON.stringify({
                    firstName: userFromDb.name,     // Проверьте, как поля называются в вашей модели C#
                    lastName: userFromDb.surname,   // Скорее всего Name и Surname
                    email: userFromDb.email,
                    id: userFromDb.userUid
                }));
                
                localStorage.setItem('isLoggedIn', 'true');

                alert(`Добро пожаловать, ${userFromDb.name}!`);
                window.location.href = 'index_auth.html';
            } else {
                // Ошибка входа (401 или 404)
                const errorText = await response.text();
                console.warn('Ошибка входа:', response.status, errorText);
                alert(errorText || 'Неверный email или пароль.');
            }

        } catch (error) {
            console.error('Ошибка соединения с сервером:', error);
            alert('Не удалось связаться с сервером. Попробуйте позже.');
        }
    });
});