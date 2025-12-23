const API_BASE_URL = "https://localhost:7123/api";

document.addEventListener('DOMContentLoaded', async function () {
    await loadPlans();
    await checkActiveSubscription();
});

// --- 1. Load Plans ---
async function loadPlans() {
    const container = document.getElementById('plans-container');
    container.innerHTML = '<p>Загрузка тарифов...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/SubscriptionPlans`);
        if (!response.ok) throw new Error('Ошибка загрузки планов');

        const plans = await response.json();
        container.innerHTML = '';

        plans.forEach(plan => {
            // Учитываем разный регистр (PlanId или planId)
            const pId = plan.planId || plan.PlanId;
            const pName = plan.planName || plan.PlanName;
            const pPrice = plan.totalPrice || plan.TotalPrice;
            const pDays = plan.validityDays || plan.ValidityDays;
            const pSessions = plan.sessionsCount || plan.SessionsCount;
            const pDesc = plan.description || plan.Description || '';

            const card = document.createElement('div');
            card.className = 'plan-card';
            card.dataset.planId = pId; // Сохраняем ID

            let icon = '✨';
            if (pName.includes('Dark')) icon = '🔥';
            if (pName.includes('Lord')) icon = '👑';

            card.innerHTML = `
                <h2>${icon} ${pName}</h2>
                <p class="price">₽${pPrice} / ${pDays} дн.</p>
                <p class="description">${pDesc}</p>
                <ul>
                    <li>Сеансов: ${pSessions}</li>
                    <li>Действует: ${pDays} дней</li>
                </ul>
                <button class="subscribe-btn" onclick="buySubscription(${pId}, '${pName}', ${pDays}, ${pSessions})">
                    Выбрать
                </button>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p>Не удалось загрузить тарифы. Проверьте консоль.</p>';
    }
}

// --- 2. Buy Subscription ---
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

// --- 3. Check Active Subscription ---
async function checkActiveSubscription() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = userData.userUid || userData.uid;

    if (!userId) return;

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

// --- 4. Update UI ---
function updateButtonsUI(activePlanId) {
    // Если ID не передан или undefined, не блокируем всё подряд, а сбрасываем
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
            btn.style.backgroundColor = '#4CAF50';
            btn.style.color = 'white';
            btn.disabled = true;
            card.style.border = '3px solid #4CAF50';
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