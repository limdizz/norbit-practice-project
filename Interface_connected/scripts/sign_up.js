document.addEventListener('DOMContentLoaded', function () {
    const registerButton = document.querySelector('.register_button');

    if (registerButton) {
        registerButton.removeAttribute('onclick');

        registerButton.addEventListener('click', async function (event) {
            event.preventDefault();

            const lastName = document.getElementById('regLastName')?.value.trim();
            const firstName = document.getElementById('regFirstName')?.value.trim();
            const phone = document.getElementById('regPhone')?.value.trim();
            const email = document.getElementById('regEmail')?.value.trim();
            const password = document.getElementById('regPassword')?.value.trim();

            // Валидация
            if (!lastName || !firstName || !email || !password) {
                alert('Пожалуйста, заполните все поля.');
                return;
            }

            // Простая проверка email
            if (!email.includes('@') || email.length < 5) {
                alert('Пожалуйста, введите корректный email.');
                return;
            }

            // Формируем объект для API
            const userForApi = {
                surname: lastName,
                name: firstName,
                phone: phone,
                email: email,
                passwordOrigin: password,
            };

            try {
                const response = await fetch('https://localhost:7123/api/UsersAdvanced', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userForApi)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Ошибка API:', response.status, errorText);
                    alert("Ошибка: " + errorText);
                    return;
                }

                const createdUser = await response.json();
                console.log('Пользователь добавлен в БД:', createdUser);

                // Сохраняем факт входа
                localStorage.setItem('userData', JSON.stringify({
                    firstName: firstName,  // Было: name: firstName
                    lastName: lastName,    // Было: surname: lastName
                    email: email
                }));
                localStorage.setItem('isLoggedIn', 'true');

                alert('Регистрация прошла успешно!');
                window.location.href = 'index_auth.html';

            } catch (error) {
                console.error('Ошибка при запросе к API:', error);
                alert('Не удалось зарегистрироваться. Ошибка сервера.');
            }
        });
    }
});