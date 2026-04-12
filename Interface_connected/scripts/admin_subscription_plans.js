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

async function editPlan(id) {
    try {
        const response = await fetch(`https://localhost:7123/api/SubscriptionPlans/${id}`);
        if (!response.ok) throw new Error('Абонемент не найден');

        const plan = await response.json();

        const modalHtml = `
            <div id="edit-plan-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: white; padding: 20px; border-radius: 8px; width: 450px; max-width: 90vw;">
                    <h3 style="margin-top: 0;">Редактировать абонемент</h3>
                    <form id="edit-plan-form">
                        <div style="margin-bottom: 10px;">
                            <label for="edit-planName" style="display: inline-block; width: 150px;">Название:</label>
                            <input type="text" id="edit-planName" name="planName" value="${escapeHtml(plan.planName)}" required style="width: 230px; padding: 5px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label for="edit-totalPrice" style="display: inline-block; width: 150px;">Общая цена (₽):</label>
                            <input type="number" id="edit-totalPrice" name="totalPrice" value="${plan.totalPrice}" min="0" step="0.01" required style="width: 230px; padding: 5px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label for="edit-validityDays" style="display: inline-block; width: 150px;">Срок действия (дней):</label>
                            <input type="number" id="edit-validityDays" name="validityDays" value="${plan.validityDays}" min="1" required style="width: 230px; padding: 5px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label for="edit-sessionsCount" style="display: inline-block; width: 150px;">Количество сессий:</label>
                            <input type="number" id="edit-sessionsCount" name="sessionsCount" value="${plan.sessionsCount}" min="1" required style="width: 230px; padding: 5px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label for="edit-description" style="display: inline-block; width: 150px; vertical-align: top;">Описание:</label>
                            <textarea id="edit-description" name="description" rows="3" style="width: 230px; padding: 5px; vertical-align: top;">${escapeHtml(plan.description || '')}</textarea>
                        </div>
                        <div style="margin-top: 15px; text-align: right;">
                            <button type="button" id="cancel-edit" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Отмена</button>
                            <button type="submit" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Сохранить</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('edit-plan-modal');
        const form = document.getElementById('edit-plan-form');
        const cancelButton = document.getElementById('cancel-edit');

        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const updatedData = {
                planId: id,
                planName: formData.get('planName'),
                totalPrice: parseFloat(formData.get('totalPrice')),
                validityDays: parseInt(formData.get('validityDays')),
                sessionsCount: parseInt(formData.get('sessionsCount')),
                description: formData.get('description') || null
            };

            try {
                const response = await fetch(`https://localhost:7123/api/SubscriptionPlans/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Ошибка при обновлении');
                }

                document.body.removeChild(modal);
                loadPlans();
                alert('Абонемент успешно обновлён!');
            } catch (err) {
                console.error('Ошибка:', err);
                alert('Не удалось обновить абонемент: ' + err.message);
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки абонемента:', error);
        alert('Не удалось загрузить данные абонемента.');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}