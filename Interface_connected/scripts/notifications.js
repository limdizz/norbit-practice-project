// ============================================
// Модуль уведомлений (notifications.js)
// Подключать на всех страницах, где нужны уведомления
// ============================================

let currentNotifications = [];

// Инициализация уведомлений
function initNotifications() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const isStaff = localStorage.getItem('isStaff') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = userData.userUid || userData.uid;

    // Создаем контейнер для уведомлений в хедере, если его нет
    createNotificationsUI();

    // Настраиваем обработчики событий
    setupNotificationsEvents();

    // Если не авторизован или админ - скрываем уведомления
    if (!isLoggedIn || isStaff || !userId) {
        const container = document.getElementById('notifications-dropdown-container');
        if (container) container.style.display = 'none';
        return;
    }

    // Загружаем количество непрочитанных при загрузке страницы
    loadUnreadNotificationsCount(userId);

    // Периодическое обновление каждые 30 секунд
    setInterval(() => {
        if (userId) {
            loadUnreadNotificationsCount(userId);
        }
    }, 5000);
}

// Создание UI для уведомлений в хедере
function createNotificationsUI() {
    // Проверяем, есть ли уже контейнер для уведомлений
    if (document.getElementById('notifications-dropdown-container')) return;

    const userControls = document.getElementById('user-controls');
    if (!userControls) return;

    // Создаем контейнер и вставляем перед кнопкой "Профиль"
    const container = document.createElement('div');
    container.id = 'notifications-dropdown-container';
    container.style.cssText = 'position: relative; display: inline-block;';

    container.innerHTML = `
        <button id="notifications-toggle-btn" class="menu__item__button"
            style="position: relative; padding: 8px 12px;">
            🔔
            <span id="unread-badge" class="badge" style="display: none;">0</span>
        </button>
        <div id="notifications-dropdown"
            style="display: none; position: absolute; top: 100%; right: 0; width: 350px; max-height: 400px; overflow-y: auto; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); z-index: 1000; margin-top: 5px;">
            <div id="notifications-dropdown-content" style="padding: 15px;">
                <p style="color: #999; text-align: center;">Загрузка...</p>
            </div>
        </div>
    `;

    // Вставляем перед первой кнопкой
    const firstButton = userControls.querySelector('button');
    if (firstButton) {
        userControls.insertBefore(container, firstButton);
    } else {
        userControls.appendChild(container);
    }
}

// Настройка обработчиков событий для уведомлений
function setupNotificationsEvents() {
    const toggleBtn = document.getElementById('notifications-toggle-btn');
    const dropdown = document.getElementById('notifications-dropdown');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = userData.userUid || userData.uid;

    // Удаляем старые обработчики (чтобы избежать дублирования)
    if (toggleBtn) {
        const newToggleBtn = toggleBtn.cloneNode(true);
        toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);

        newToggleBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const dropdown = document.getElementById('notifications-dropdown');
            if (!dropdown) return;

            const isOpen = dropdown.classList.contains('open');

            if (isOpen) {
                dropdown.classList.remove('open');
            } else {
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                const userId = userData.userUid || userData.uid;
                if (userId) {
                    loadUserNotificationsForDropdown(userId);
                }
                dropdown.classList.add('open');
            }
        });
    }

    // Закрытие при клике вне dropdown (используем один глобальный обработчик)
    if (!window._notificationsOutsideClickHandler) {
        window._notificationsOutsideClickHandler = function (e) {
            const dropdown = document.getElementById('notifications-dropdown');
            const toggleBtn = document.getElementById('notifications-toggle-btn');

            if (dropdown && !dropdown.contains(e.target) && toggleBtn && !toggleBtn.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        };
        document.addEventListener('click', window._notificationsOutsideClickHandler);
    }

    // Глобальные ссылки для совместимости
    window.notificationsDropdownContent = document.getElementById('notifications-dropdown-content');
    window.notificationsDropdown = document.getElementById('notifications-dropdown');
    window.unreadBadge = document.getElementById('unread-badge');
}

// Загрузка непрочитанных уведомлений для бейджа
async function loadUnreadNotificationsCount(userUid) {
    const unreadBadge = document.getElementById('unread-badge');
    if (!unreadBadge) return;

    try {
        const response = await fetch(`https://localhost:7123/api/Notifications/user/${userUid}/unread`);
        if (!response.ok) throw new Error('Не удалось загрузить количество уведомлений');

        const count = await response.json();
        if (count > 0) {
            unreadBadge.textContent = count > 99 ? '99+' : count;
            unreadBadge.style.display = 'inline-block';
        } else {
            unreadBadge.style.display = 'none';
        }
    } catch (error) {
        console.error('Ошибка загрузки количества уведомлений:', error);
    }
}

// Загрузка уведомлений для dropdown
async function loadUserNotificationsForDropdown(userUid) {
    try {
        const response = await fetch(`https://localhost:7123/api/Notifications/user/${userUid}`);
        if (!response.ok) throw new Error('Не удалось загрузить уведомления');

        currentNotifications = await response.json();
        renderNotificationsDropdown(currentNotifications);
    } catch (error) {
        console.error('Ошибка загрузки уведомлений:', error);
        const content = document.getElementById('notifications-dropdown-content');
        if (content) {
            content.innerHTML = '<p style="color: #999; text-align: center;">Не удалось загрузить уведомления</p>';
        }
    }
}

// Отрисовка уведомлений в dropdown
function renderNotificationsDropdown(notifications) {
    const content = document.getElementById('notifications-dropdown-content');
    if (!content) return;

    if (notifications.length === 0) {
        content.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Уведомлений нет</p>';
        return;
    }

    const unreadCount = notifications.filter(n => !n.isRead).length;

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
            <h4 style="margin: 0;">🔔 Уведомления ${unreadCount > 0 ? `<span style="color: #f44336;">(${unreadCount})</span>` : ''}</h4>
            ${unreadCount > 0 ? `<button onclick="event.stopPropagation(); markAllNotificationsRead()" style="padding: 4px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8em;">Все прочитано</button>` : ''}
        </div>
    `;

    html += notifications.map(notification => {
        const typeLabel = getNotificationTypeLabel(notification.notificationType);
        const timeAgo = getTimeAgo(notification.createdAt);

        return `
            <div style="padding: 10px; margin-bottom: 8px; border: 1px solid #eee; border-radius: 6px; ${!notification.isRead ? 'background-color: #f0f7ff; border-left: 3px solid #2196F3;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                        <span style="display: inline-block; padding: 2px 8px; background: #e3f2fd; color: #1976d2; border-radius: 4px; font-size: 0.75em; margin-bottom: 5px;">
                            ${typeLabel}
                        </span>
                        <div style="font-weight: 500; margin: 5px 0 3px 0;">${escapeHtml(notification.title)}</div>
                        <div style="color: #666; font-size: 0.85em; margin-bottom: 5px;">${escapeHtml(notification.message)}</div>
                        <div style="color: #999; font-size: 0.75em;">${timeAgo}</div>
                    </div>
                    ${!notification.isRead ? `
                        <button onclick="event.stopPropagation(); markNotificationAsRead('${notification.notificationId}')"
                            style="padding: 4px 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75em; white-space: nowrap; margin-left: 10px;">
                            Прочитано
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    content.innerHTML = html;
}

// Отметить одно уведомление как прочитанное
window.markNotificationAsRead = async function (notificationId) {
    try {
        const response = await fetch(`https://localhost:7123/api/Notifications/${notificationId}/read`, {
            method: 'PUT'
        });

        if (response.ok) {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const userUid = userData.userUid || userData.uid;
            if (userUid) {
                await loadUserNotificationsForDropdown(userUid);
                await loadUnreadNotificationsCount(userUid);

                // Если есть функция загрузки уведомлений на странице профиля
                if (typeof loadUserNotifications === 'function') {
                    await loadUserNotifications(userUid);
                }
            }
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось обновить статус уведомления');
    }
};

// Отметить все как прочитанные
window.markAllNotificationsRead = async function () {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userUid = userData.userUid || userData.uid;
    if (!userUid) return;

    try {
        const response = await fetch(`https://localhost:7123/api/Notifications/user/${userUid}/mark-all-read`, {
            method: 'PUT'
        });
        if (response.ok) {
            await loadUserNotificationsForDropdown(userUid);
            await loadUnreadNotificationsCount(userUid);

            if (typeof loadUserNotifications === 'function') {
                await loadUserNotifications(userUid);
            }
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
};

// Вспомогательные функции
function getNotificationTypeLabel(type) {
    const labels = {
        'new_booking': 'Новое бронирование',
        'booking_rescheduled': 'Перенос бронирования',
        'booking_cancelled': 'Отмена бронирования'
    };
    return labels[type] || type;
}

function getTimeAgo(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU');
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Переопределяем глобально для обратной совместимости
window.loadUserNotificationsForDropdown = loadUserNotificationsForDropdown;
window.getTimeAgo = getTimeAgo;
window.getNotificationTypeLabel = getNotificationTypeLabel;

// Автоинициализация при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotifications);
} else {
    initNotifications();
}