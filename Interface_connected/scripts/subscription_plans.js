const API_BASE_URL = "https://localhost:7123/api";

document.addEventListener('DOMContentLoaded', async function () {
    await loadPlans();
    await checkActiveSubscription();
});

// --- 1. Load Plans ---
async function loadPlans() {
    const container = document.getElementById('plans-container');
    container.innerHTML = '<p>Загрузка тарифов...</p>';
    const isStaff = localStorage.getItem('isStaff') === 'true';
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    try {
        const response = await fetch(`${API_BASE_URL}/SubscriptionPlans`);
        if (!response.ok) throw new Error('Ошибка загрузки планов');

        const plans = await response.json();
        container.innerHTML = '';

        // Получаем активную подписку пользователя для определения скидки
        const activeSubscription = isLoggedIn ? await getActiveSubscription() : null;

        plans.forEach(plan => {
            const pId = plan.planId || plan.PlanId;
            const pName = plan.planName || plan.PlanName;
            const pPrice = plan.totalPrice || plan.TotalPrice;
            const pDays = plan.validityDays || plan.ValidityDays;
            const pSessions = plan.sessionsCount || plan.SessionsCount;
            const pDesc = plan.description || plan.Description || '';
            const discountPercentage = plan.discountPercentage || 0;

            const card = document.createElement('div');
            card.className = 'plan-card';
            card.dataset.planId = pId;

            let icon = '💀';
            if (pName.includes('Dark')) icon = '☠';
            if (pName.includes('Lord')) icon = '✟';

            const buttonHtml = (isStaff && isLoggedIn)
                ? `<button class="subscribe-btn" onclick="location.href='admin_subscription_plans.html'">Управление абонементами</button>`
                : `<button class="subscribe-btn" onclick="buySubscription(${pId}, '${pName}', ${pDays}, ${pSessions})">Выбрать</button>`;

            // Определяем, нужно ли применять скидку
            let priceHtml = `₽${pPrice} / ${pDays} дн.`;

            // Проверяем, есть ли у пользователя активная подписка Acolyte и есть ли скидка для этого плана
            if (activeSubscription &&
                activeSubscription.planName &&
                activeSubscription.planName.toLowerCase().includes('acolyte') &&
                discountPercentage > 0) {

                const discountedPrice = pPrice * (1 - discountPercentage / 100);
                priceHtml = `
                    <span class="old-price">₽${pPrice}</span>
                    <span class="new-price">₽${discountedPrice.toFixed(2)}</span> / ${pDays} дн.
                `;
            }

            card.innerHTML = `
                <h2>${icon} ${pName}</h2>
                <p class="price">₽${pPrice}</p>
                <p class="description">${pDesc}</p>
                <ul>
                    <li>Сеансов: ${pSessions}</li>
                    <li>Действует: ${pDays} дней</li>
                    <li>Скидка: ${discountPercentage}%</li>
                </ul>
                ${buttonHtml}
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p>Не удалось загрузить тарифы. Проверьте консоль.</p>';
    }
}

// --- 2. Get Active Subscription ---
async function getActiveSubscription() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = userData.userUid || userData.uid;
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const isStaff = localStorage.getItem('isStaff') === 'true';

    if (!isLoggedIn || !userId) return null;
    if (isStaff) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/UserSubscriptionsAdvanced/active/${userId}`);

        if (response.ok) {
            const activeSub = await response.json();
            // Сохраняем скидку в localStorage для других страниц
            const discount = activeSub.discountPercentage || 0;
            localStorage.setItem('userDiscount', discount);
            return activeSub;
        } else if (response.status === 404) {
            localStorage.setItem('userDiscount', '0');
            console.log('Активная подписка не найдена, скидка сброшена');
            return null;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Ошибка проверки подписки:', error);
        return null;
    }
}

// --- 3. Buy Subscription ---
async function buySubscription(planId, planName, validityDays, sessionsCount) {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    // Проверяем userUid или uid (в зависимости от того, как вы сохранили при логине)
    const userId = userData.userUid || userData.uid;

    if (!isLoggedIn || !userId) {
        alert('Пожалуйста, войдите в систему.');
        window.location.href = 'log_in.html';
        return;
    }

    const hasActive = document.querySelector('.subscribe-btn[disabled]');
    if (hasActive && hasActive.textContent === 'Активно') {
        alert('У вас уже есть активная подписка. Отмените её в профиле.');
        return;
    }

    if (!confirm(`Оформить подписку "${planName}"?`)) return;

    const now = new Date();
    const validUntil = new Date();
    validUntil.setDate(now.getDate() + validityDays);

    const subscriptionData = {
        SubscriptionUid: crypto.randomUUID(),
        UserUid: userId,
        PlanId: planId,
        PurchaseDate: now.toISOString(),
        SessionsRemaining: sessionsCount,
        ValidUntil: validUntil.toISOString(),
        IsActive: true
    };

    try {
        const response = await fetch(`${API_BASE_URL}/UserSubscriptionsAdvanced`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscriptionData)
        });

        if (response.ok) {
            alert('Абонемент успешно оформлен!');
            await checkActiveSubscription();
        } else {
            const err = await response.text();
            console.error(err);
            alert('Ошибка при оформлении (см. консоль)');
        }
    } catch (error) {
        console.error(error);
        alert('Ошибка соединения с сервером.');
    }
}

// --- 4. Check Active Subscription ---
async function checkActiveSubscription() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = userData.userUid || userData.uid;
    const isStaff = localStorage.getItem('isStaff') === 'true';

    if (!userId) return;
    if (isStaff) return;

    try {
        const response = await fetch(`${API_BASE_URL}/UserSubscriptionsAdvanced/active/${userId}`);

        if (response.ok) {
            const activeSub = await response.json();
            console.log("Получен объект подписки:", activeSub); // Посмотрите структуру в консоли!

            // 1. Пытаемся достать PlanId напрямую (с учетом регистра)
            // 2. Если его нет, пытаемся достать его из вложенного объекта Plan
            const activeId = activeSub.planId ||
                activeSub.PlanId ||
                (activeSub.plan ? (activeSub.plan.planId || activeSub.plan.PlanId) : null);

            console.log("Определенный ID плана:", activeId);

            if (activeId) {
                updateButtonsUI(activeId);
            } else {
                resetButtonsUI();
            }
        } else {
            resetButtonsUI();
        }
    } catch (error) {
        console.error('Ошибка проверки подписки:', error);
        resetButtonsUI();
    }
}

// --- 5. Update UI ---
function updateButtonsUI(activePlanId) {
    if (!activePlanId) {
        resetButtonsUI();
        return;
    }

    const cards = document.querySelectorAll('.plan-card');

    cards.forEach(card => {
        const btn = card.querySelector('button');
        const cardPlanId = parseInt(card.dataset.planId);

        if (cardPlanId === activePlanId) {
            // Активный план
            btn.textContent = 'Активно';
            btn.style.backgroundColor = 'black';
            btn.style.color = 'white';
            btn.disabled = true;
            card.style.border = '3px solid black';
            card.style.transform = 'scale(1.02)';
        } else {
            // Недоступные планы
            btn.textContent = 'Недоступно';
            btn.style.backgroundColor = '#ccc';
            btn.style.color = '#666';
            btn.style.cursor = 'not-allowed';
            btn.disabled = true;
            card.style.opacity = '0.7';
            card.style.border = '1px solid #ddd';
            card.style.transform = 'none';
        }
    });
}

function resetButtonsUI() {
    const cards = document.querySelectorAll('.plan-card');
    cards.forEach(card => {
        const btn = card.querySelector('button');
        if (btn) {
            btn.textContent = 'Выбрать';
            btn.style.backgroundColor = 'black';
            btn.style.color = 'white';
            btn.style.cursor = 'pointer';
            btn.disabled = false;
        }
        card.style.opacity = '1';
        card.style.border = '1px solid #ddd';
        card.style.transform = 'none';
    });
}