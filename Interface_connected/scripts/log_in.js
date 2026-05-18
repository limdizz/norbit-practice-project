document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('loginPassword');
    const loginButton = document.getElementById('loginButton');

    // Элементы для переключения
    const emailField = document.getElementById('email-field');
    const phoneField = document.getElementById('phone-field');
    const emailInput = document.getElementById('loginEmail');
    const phoneInput = document.getElementById('loginPhone');
    const typeToggle = document.getElementById('login-type-toggle');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const loginPasswordInput = document.getElementById('loginPassword');

    if (togglePasswordBtn && loginPasswordInput) {
        togglePasswordBtn.addEventListener('click', function () {
            // Проверяем текущий тип инпута
            if (loginPasswordInput.type === 'password') {
                loginPasswordInput.type = 'text';
                this.textContent = '✕'; // Меняем иконку на крестик или другой символ, когда пароль виден
            } else {
                loginPasswordInput.type = 'password';
                this.textContent = '👁'; // Возвращаем глазик
            }
        });
    }

    // Убираем встроенный onclick
    loginButton.removeAttribute('onclick');

    if (typeToggle) {
        typeToggle.addEventListener('change', function () {
            if (this.checked) {
                // Выбран Телефон: скрываем email, показываем телефон
                emailField.classList.add('hidden-field');
                phoneField.classList.remove('hidden-field');

                emailInput.required = false;
                phoneInput.required = true;
                emailInput.value = ''; // Очищаем поле email
            } else {
                // Выбран Email: показываем email, скрываем телефон
                emailField.classList.remove('hidden-field');
                phoneField.classList.add('hidden-field');

                emailInput.required = true;
                phoneInput.required = false;
                phoneInput.value = ''; // Очищаем поле телефона
            }
        });
    }

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const loginType = typeToggle && typeToggle.checked ? 'phone' : 'email';
        const password = passwordInput.value.trim();

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
                localStorage.removeItem('isStaff');

                try {
                    // Проверяем, является ли пользователь сотрудником (есть ли запись в staff_advanced)
                    const staffResp = await fetch(`https://localhost:7123/api/StaffAdvanced/byUser/${userFromDb.userUid}`);
                    if (staffResp.ok) {
                        // Помечаем в localStorage, что это сотрудник
                        localStorage.setItem('isStaff', 'true');
                        alert(`Добро пожаловать в админ-панель, ${userFromDb.name || userFromDb.surname || 'пользователь'}!`);
                        window.location.href = 'admin_bookings.html';
                        return;
                    }
                } catch (e) {
                    console.warn('Не удалось проверить статус сотрудника:', e);
                }

                // Обычный пользователь
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