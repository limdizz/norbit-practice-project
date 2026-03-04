document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('loginPassword');
    const loginButton = document.getElementById('loginButton');

    // Элементы для переключения
    const emailField = document.getElementById('email-field');
    const phoneField = document.getElementById('phone-field');
    const emailInput = document.getElementById('loginEmail');
    const phoneInput = document.getElementById('loginPhone');
    const radioButtons = document.querySelectorAll('input[name="loginType"]');

    // Убираем встроенный onclick
    loginButton.removeAttribute('onclick');

    // Переключение между способами входа
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.value === 'email') {
                emailField.style.display = 'block';
                phoneField.style.display = 'none';
                emailInput.required = true;
                phoneInput.required = false;
                phoneInput.value = ''; // Очищаем поле телефона
            } else {
                emailField.style.display = 'none';
                phoneField.style.display = 'block';
                emailInput.required = false;
                phoneInput.required = true;
                emailInput.value = ''; // Очищаем поле email
            }
        });
    });

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const password = passwordInput.value.trim();

        // Определяем, какой способ входа выбран
        const loginType = document.querySelector('input[name="loginType"]:checked').value;

        let loginData = { password: password };

        if (loginType === 'email') {
            const email = emailInput.value.trim();
            if (!email) {
                alert('Пожалуйста, введите email.');
                return;
            }
            loginData.email = email;
        } else {
            const phone = phoneInput.value.trim();
            if (!phone) {
                alert('Пожалуйста, введите номер телефона.');
                return;
            }
            // Очищаем телефон от лишних символов для поиска в БД
            loginData.phone = phone.replace(/[^\d+]/g, '');
        }

        console.log(`Попытка входа через ${loginType}`);

        try {
            const response = await fetch('https://localhost:7123/api/UsersAdvanced/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            if (response.ok) {
                const userFromDb = await response.json();
                console.log('Вход успешен:', userFromDb);

                localStorage.setItem('userData', JSON.stringify({
                    firstName: userFromDb.name,
                    lastName: userFromDb.surname,
                    email: userFromDb.email,
                    phone: userFromDb.phone,
                    userUid: userFromDb.userUid
                }));

                localStorage.setItem('isLoggedIn', 'true');

                alert(`Добро пожаловать, ${userFromDb.name || userFromDb.surname || 'пользователь'}!`);
                window.location.href = 'index.html';
            } else {
                const errorText = await response.text();
                console.warn('Ошибка входа:', response.status, errorText);
                alert(errorText || 'Неверный email/телефон или пароль.');
            }

        } catch (error) {
            console.error('Ошибка соединения с сервером:', error);
            alert('Не удалось связаться с сервером. Попробуйте позже.');
        }
    });
});