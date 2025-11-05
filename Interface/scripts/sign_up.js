// scripts/sign_up.js
document.addEventListener('DOMContentLoaded', function() {
    // Находим кнопку регистрации
    const registerButton = document.querySelector('.register_button');

    if (registerButton) {
        // Убираем встроенный onclick, чтобы наш скрипт мог его обработать
        registerButton.removeAttribute('onclick');
        
        registerButton.addEventListener('click', function(event) {
            // Предотвращаем немедленный переход по ссылке (если он был)
            event.preventDefault(); 
            
            console.log('Кнопка регистрации нажата');

            // Собираем все поля ввода
            const inputs = document.querySelectorAll('.register_p[type="text"]');
            
            const lastName = inputs[0]?.value.trim();
            const firstName = inputs[1]?.value.trim();
            const email = inputs[2]?.value.trim();
            const password = inputs[3]?.value.trim();

            if (!lastName || !firstName || !email || !password) {
                alert('Пожалуйста, заполните все поля.');
                return;
            }

            // Создаем объект пользователя
            const userData = {
                firstName: firstName,
                lastName: lastName,
                email: email
                // Мы не храним пароль в localStorage в реальном приложении!
                // Это только для демонстрации.
            };

            // Сохраняем данные пользователя в localStorage
            try {
                localStorage.setItem('userData', JSON.stringify(userData));
                localStorage.setItem('isLoggedIn', 'true');
                console.log('Пользователь сохранен:', userData);

                // Теперь перенаправляем на страницу для авторизованных
                window.location.href = 'index_auth.html'; 
                // (или на 'catalog.html' или куда вы хотите)

            } catch (error) {
                console.error('Ошибка сохранения в localStorage:', error);
                alert('Не удалось зарегистрироваться. Хранилище может быть переполнено.');
            }
        });
    }
});