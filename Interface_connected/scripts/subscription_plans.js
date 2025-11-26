function subscribe(planName, price, buttonElement) {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    if (!isLoggedIn) {
        alert('Пожалуйста, войдите в систему, чтобы оформить абонемент.');
        window.location.href = 'log_in.html';
        return;
    }

    const subscriptionKey = `subscription_${userData.email}`;

    const subscription = {
        plan: planName,
        price: price,
        startDate: new Date().toLocaleDateString('ru-RU')
    };

    localStorage.setItem(subscriptionKey, JSON.stringify(subscription));

    // Обновляем все кнопки на странице
    updateSubscriptionButtons(planName);

    alert(`Вы успешно оформили абонемент "${planName}"!`);
}

// Функция для обновления состояния кнопок
function updateSubscriptionButtons(activePlanName) {
    const buttons = document.querySelectorAll('.plan-card button');

    buttons.forEach(button => {
        const card = button.closest('.plan-card');
        const planTitle = card.querySelector('h2').textContent;

        // Проверяем, содержит ли заголовок карточки название активного плана
        if (planTitle.includes(activePlanName)) {
            // Это активная подписка
            button.textContent = 'Активно';
            button.style.backgroundColor = '#4CAF50'; // Зеленый
            button.style.color = 'white';
            button.disabled = true;
        } else {
            // Это другие подписки
            button.textContent = 'Выбрать';
            button.style.backgroundColor = 'black';
            button.style.color = 'white';
            button.disabled = false;
        }
    });
}

// Функция для проверки активной подписки при загрузке страницы
function checkActiveSubscription() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    if (!isLoggedIn) return;

    const subscriptionKey = `subscription_${userData.email}`;
    const subscription = JSON.parse(localStorage.getItem(subscriptionKey) || 'null');

    if (subscription) {
        updateSubscriptionButtons(subscription.plan);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    checkActiveSubscription();

    // Добавляем обработчики событий для всех кнопок
    const buttons = document.querySelectorAll('.plan-card button');
    buttons.forEach(button => {
        button.addEventListener('click', function () {
            const card = this.closest('.plan-card');
            const planName = card.querySelector('h2').textContent;
            const priceText = card.querySelector('.price').textContent;
            const price = parseInt(priceText.replace(/[^\d]/g, ''));

            // Определяем название плана без эмодзи
            let cleanPlanName = '';
            if (planName.includes('Рядовой')) cleanPlanName = 'Рядовой';
            else if (planName.includes('Ветеран')) cleanPlanName = 'Ветеран';
            else if (planName.includes('Завсегдатай')) cleanPlanName = 'Завсегдатай';

            subscribe(cleanPlanName, price, this);
        });
    });
});