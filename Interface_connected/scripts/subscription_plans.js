function subscribe(planName, price) {
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
    alert(`Вы успешно оформили абонемент "${planName}"!`);
}