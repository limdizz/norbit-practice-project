document.addEventListener('DOMContentLoaded', function () {
    updateHeaderState();
    loadPlans();

    document.getElementById('add-plan-form').addEventListener('submit', createPlan);
    document.getElementById('add-plan-btn').addEventListener('click', function () {
        document.getElementById('add-plan-modal').style.display = 'block';
    });
});

async function loadPlans() {
    try {
        const response = await fetch('https://localhost:7123/api/SubscriptionPlans');
        if (!response.ok) throw new Error('Ошибка сети');

        const plans = await response.json();
        displayPlans(plans);
    } catch (error) {
        console.error('Ошибка при загрузке абонементов:', error);
        document.getElementById('plans-section').style.display = 'none';
        document.getElementById('access-message').innerHTML = '<p style="color: red;">Не удалось загрузить список абонементов.</p>';
        document.getElementById('access-message').style.display = 'block';
    }
}

function displayPlans(plans) {
    const tbody = document.getElementById('plans-tbody');
    tbody.innerHTML = '';

    if (plans.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;">Абонементы не найдены</td></tr>`;
        document.getElementById('plans-section').style.display = 'block';
        return;
    }

    plans.forEach(plan => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${plan.planId}</td>
            <td>${plan.planName}</td>
            <td>${plan.totalPrice} ₽</td>
            <td>${plan.validityDays}</td>
            <td>${plan.sessionsCount}</td>
            <td>${plan.description || '-'}</td>
            <td>
                <button onclick="editPlan(${plan.planId})">Редактировать</button>
                <button onclick="deletePlan(${plan.planId})" style="background-color: #f44336;">Удалить</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('plans-section').style.display = 'block';
}

async function createPlan(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const planData = {
        planName: formData.get('planName'),
        totalPrice: parseFloat(formData.get('totalPrice')),
        validityDays: parseInt(formData.get('validityDays')),
        sessionsCount: parseInt(formData.get('sessionsCount')),
        description: formData.get('description')
    };

    try {
        const response = await fetch('https://localhost:7123/api/SubscriptionPlans', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(planData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка при добавлении абонемента');
        }

        // Сброс формы и скрытие модального окна
        event.target.reset();
        document.getElementById('add-plan-modal').style.display = 'none';

        // Обновление списка
        loadPlans();

        alert('Абонемент успешно добавлен!');
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось добавить абонемент: ' + error.message);
    }
}

async function deletePlan(id) {
    if (!confirm('Вы уверены, что хотите удалить этот абонемент?')) return;

    try {
        const response = await fetch(`https://localhost:7123/api/SubscriptionPlans/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Ошибка сети');

        loadPlans();
        alert('Абонемент успешно удален!');
    } catch (error) {
        console.error('Ошибка при удалении:', error);
        alert('Не удалось удалить абонемент.');
    }
}

function editPlan(id) {
    alert('Функция редактирования временно недоступна. Используйте прямое редактирование через API или базу данных.');
    // В будущем здесь будет реализовано окно редактирования
}