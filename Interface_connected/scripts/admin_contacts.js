// admin_contacts.js
document.addEventListener('DOMContentLoaded', function () {
    updateHeaderState();
    initContactsAdmin();
});

// Хранилище данных контактов (загружается с сервера или используется стандартное)
let contactsData = {
    infoCards: [
        {
            id: 'address',
            icon: '📍',
            title: 'Адрес',
            text: 'г. Нижний Новгород, проспект Гагарина, 23',
            link: 'https://yandex.ru/maps/58/nizhny-novgorod/?ll=43.962114%2C56.298589&z=17',
            linkText: 'Показать на карте'
        },
        {
            id: 'phone',
            icon: '📞',
            title: 'Телефон',
            text: '+7 (495) 123-45-67',
            link: 'tel:+74951234567',
            linkText: 'Позвонить'
        },
        {
            id: 'email',
            icon: '✉️',
            title: 'Email',
            text: 'vlad.klimenko.mmv@bk.ru',
            link: 'mailto:vlad.klimenko.mmv@bk.ru',
            linkText: 'Написать письмо'
        },
        {
            id: 'schedule',
            icon: '🕒',
            title: 'Режим работы',
            text: 'Пн–Пт: 10:00–22:00<br>Сб–Вс: 11:00–21:00',
            link: '#',
            linkText: 'Проверка...',
            isDynamic: true
        }
    ],
    socialCards: [
        {
            id: 'github',
            icon: '🐙',
            title: 'GitHub',
            desc: 'Код и проекты',
            url: 'https://github.com/limdizz'
        },
        {
            id: 'vk',
            icon: '📱',
            title: 'VK',
            desc: 'Новости и фото',
            url: 'https://vk.com/limdizz'
        },
        {
            id: 'youtube',
            icon: '🎥',
            title: 'YouTube',
            desc: 'Видео и трансляции',
            url: 'https://www.youtube.com/@Limdizz'
        }
    ],
    faqItems: [
        {
            id: 'faq1',
            question: 'Как забронировать помещение?',
            answer: 'Перейдите в раздел "Помещения", выберите подходящий зал и нажмите "Забронировать".'
        },
        {
            id: 'faq2',
            question: 'Как отменить бронирование?',
            answer: 'Отменить бронирование можно в разделе "Мои бронирования" в личном кабинете.'
        },
        {
            id: 'faq3',
            question: 'Работаете ли вы в праздники?',
            answer: 'В праздничные дни студия работает по сокращенному графику. Уточняйте по телефону.'
        }
    ]
};

// Ключ для localStorage
const STORAGE_KEY = 'contacts_custom_data';

function initContactsAdmin() {
    // Загружаем сохранённые данные
    loadContactsData();

    // Проверяем права администратора
    const isStaff = localStorage.getItem('isStaff') === 'true';
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const isAdmin = isLoggedIn && isStaff;

    // Показываем/скрываем админ-панель
    const adminPanel = document.getElementById('admin-edit-panel');
    if (adminPanel) {
        adminPanel.style.display = isAdmin ? 'block' : 'none';
    }

    if (isAdmin) {
        // Добавляем кнопки редактирования к существующим карточкам
        addEditButtonsToCards();

        // Добавляем кнопки редактирования к FAQ
        addEditButtonsToFaq();
    }

    // Обновляем отображение статуса работы
    updateOpenStatus();
    setInterval(updateOpenStatus, 60000);
}

function loadContactsData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.infoCards) contactsData.infoCards = parsed.infoCards;
            if (parsed.socialCards) contactsData.socialCards = parsed.socialCards;
            if (parsed.faqItems) contactsData.faqItems = parsed.faqItems;
        } catch (e) {
            console.error('Ошибка загрузки данных контактов:', e);
        }
    }
}

function saveContactsData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contactsData));
}

function addEditButtonsToCards() {
    // Добавляем кнопки редактирования к информационным карточкам
    const infoCards = document.querySelectorAll('.info-card');
    infoCards.forEach((card, index) => {
        // Проверяем, не добавлена ли уже кнопка
        if (!card.querySelector('.edit-card-btn')) {
            addEditButtonToCard(card, 'info', index);
        }
    });

    // Добавляем кнопки редактирования к социальным карточкам
    const socialCards = document.querySelectorAll('.social-card');
    socialCards.forEach((card, index) => {
        if (!card.querySelector('.edit-card-btn')) {
            addEditButtonToCard(card, 'social', index);
        }
    });
}

function addEditButtonsToFaq() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach((item, index) => {
        if (!item.querySelector('.edit-faq-btn')) {
            const editBtn = document.createElement('button');
            editBtn.innerHTML = '✏️';
            editBtn.className = 'edit-faq-btn';
            editBtn.style.cssText = `
                position: absolute;
                top: 8px;
                right: 8px;
                background: transparent;
                border: none;
                border-radius: 50%;
                width: 28px;
                height: 28px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                transition: all 0.2s;
                z-index: 10;
            `;

            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                editFaqItem(index);
            });

            item.style.position = 'relative';
            item.appendChild(editBtn);
        }
    });
}

function addEditButtonToCard(card, type, index) {
    const editBtn = document.createElement('button');
    editBtn.innerHTML = '✏️';
    editBtn.className = 'edit-card-btn';
    editBtn.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: transparent;
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transition: all 0.2s;
        z-index: 10;
    `;

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (type === 'info') {
            editInfoCard(index);
        } else if (type === 'social') {
            editSocialCard(index);
        }
    });

    card.style.position = 'relative';
    card.appendChild(editBtn);
}

// Редактирование информационной карточки
function editInfoCard(index) {
    const card = contactsData.infoCards[index];
    if (!card) return;

    const modalHtml = `
        <div id="edit-card-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
            <div style="background: white; padding: 25px; border-radius: 12px; width: 500px; max-width: 90vw; max-height: 85vh; overflow-y: auto;">
                <h3 style="margin-top: 0;">Редактировать карточку</h3>
                <form id="edit-card-form">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Иконка (эмодзи):</label>
                        <input type="text" id="edit-icon" value="${card.icon}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Заголовок:</label>
                        <input type="text" id="edit-title" value="${escapeHtml(card.title)}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Текст:</label>
                        <textarea id="edit-text" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${escapeHtml(card.text)}</textarea>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Ссылка:</label>
                        <input type="text" id="edit-link" value="${escapeHtml(card.link || '')}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Текст ссылки:</label>
                        <input type="text" id="edit-link-text" value="${escapeHtml(card.linkText || '')}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-top: 20px; text-align: right;">
                        <button type="button" id="cancel-edit" style="padding: 8px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Отмена</button>
                        <button type="submit" style="padding: 8px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('edit-card-modal');
    const form = document.getElementById('edit-card-form');

    document.getElementById('cancel-edit').addEventListener('click', () => modal.remove());

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Обновляем данные
        card.icon = document.getElementById('edit-icon').value;
        card.title = document.getElementById('edit-title').value;
        card.text = document.getElementById('edit-text').value;
        card.link = document.getElementById('edit-link').value;
        card.linkText = document.getElementById('edit-link-text').value;

        saveContactsData();

        // Обновляем DOM
        updateInfoCardDisplay(index);

        modal.remove();
        alert('Карточка обновлена!');
    });
}

function updateInfoCardDisplay(index) {
    const cards = document.querySelectorAll('.info-card');
    if (cards[index]) {
        const card = cards[index];
        const data = contactsData.infoCards[index];

        // Обновляем содержимое
        const iconDiv = card.querySelector('.info-card-icon');
        const titleDiv = card.querySelector('.info-card-title');
        const textDiv = card.querySelector('.info-card-text');
        const link = card.querySelector('.info-card-link');

        if (iconDiv) iconDiv.textContent = data.icon;
        if (titleDiv) titleDiv.textContent = data.title;
        if (textDiv) {
            if (data.isDynamic) {
                // Для динамической карточки (режим работы) сохраняем структуру
                textDiv.innerHTML = data.text;
            } else {
                textDiv.innerHTML = data.text;
            }
        }
        if (link) {
            link.textContent = data.linkText;
            if (data.link && data.link !== '#') {
                link.href = data.link;
            }
        }
    }
}

// Редактирование социальной карточки
function editSocialCard(index) {
    const card = contactsData.socialCards[index];
    if (!card) return;

    const modalHtml = `
        <div id="edit-social-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
            <div style="background: white; padding: 25px; border-radius: 12px; width: 450px; max-width: 90vw;">
                <h3 style="margin-top: 0;">Редактировать социальную сеть</h3>
                <form id="edit-social-form">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Иконка (эмодзи):</label>
                        <input type="text" id="edit-icon" value="${card.icon}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Название:</label>
                        <input type="text" id="edit-title" value="${escapeHtml(card.title)}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Описание:</label>
                        <input type="text" id="edit-desc" value="${escapeHtml(card.desc)}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">URL:</label>
                        <input type="url" id="edit-url" value="${escapeHtml(card.url)}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-top: 20px; text-align: right;">
                        <button type="button" id="delete-social" style="padding: 8px 20px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; float: left;">Удалить</button>
                        <button type="button" id="cancel-edit" style="padding: 8px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Отмена</button>
                        <button type="submit" style="padding: 8px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('edit-social-modal');
    const form = document.getElementById('edit-social-form');

    document.getElementById('cancel-edit').addEventListener('click', () => modal.remove());

    document.getElementById('delete-social').addEventListener('click', () => {
        if (confirm('Удалить эту социальную сеть?')) {
            deleteSocialCard(index);
            modal.remove();
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        card.icon = document.getElementById('edit-icon').value;
        card.title = document.getElementById('edit-title').value;
        card.desc = document.getElementById('edit-desc').value;
        card.url = document.getElementById('edit-url').value;

        saveContactsData();
        refreshSocialCards();

        modal.remove();
        alert('Социальная сеть обновлена!');
    });
}

function deleteSocialCard(index) {
    contactsData.socialCards.splice(index, 1);
    saveContactsData();
    refreshSocialCards();
}

function refreshSocialCards() {
    const container = document.querySelector('.social-cards');
    if (!container) return;

    // Сохраняем оригинальный HTML
    container.innerHTML = '';

    contactsData.socialCards.forEach((card, idx) => {
        const cardHtml = `
            <a href="${card.url}" class="social-card" target="_blank" style="position: relative; text-decoration: none;">
                <div class="social-card-icon">${card.icon}</div>
                <div class="social-card-title">${escapeHtml(card.title)}</div>
                <div class="social-card-desc">${escapeHtml(card.desc)}</div>
            </a>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
    });

    // Добавляем кнопки редактирования
    const isAdmin = localStorage.getItem('isStaff') === 'true' && localStorage.getItem('isLoggedIn') === 'true';
    if (isAdmin) {
        const newCards = document.querySelectorAll('.social-card');
        newCards.forEach((card, idx) => {
            if (!card.querySelector('.edit-card-btn')) {
                addEditButtonToCard(card, 'social', idx);
            }
        });
    }
}

// Редактирование FAQ
function editFaqItem(index) {
    const item = contactsData.faqItems[index];
    if (!item) return;

    const modalHtml = `
        <div id="edit-faq-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
            <div style="background: white; padding: 25px; border-radius: 12px; width: 500px; max-width: 90vw;">
                <h3 style="margin-top: 0;">Редактировать FAQ</h3>
                <form id="edit-faq-form">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Вопрос:</label>
                        <input type="text" id="edit-question" value="${escapeHtml(item.question)}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Ответ:</label>
                        <textarea id="edit-answer" rows="4" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${escapeHtml(item.answer)}</textarea>
                    </div>
                    <div style="margin-top: 20px; text-align: right;">
                        <button type="button" id="delete-faq" style="padding: 8px 20px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; float: left;">Удалить</button>
                        <button type="button" id="cancel-edit" style="padding: 8px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Отмена</button>
                        <button type="submit" style="padding: 8px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('edit-faq-modal');
    const form = document.getElementById('edit-faq-form');

    document.getElementById('cancel-edit').addEventListener('click', () => modal.remove());

    document.getElementById('delete-faq').addEventListener('click', () => {
        if (confirm('Удалить этот вопрос?')) {
            deleteFaqItem(index);
            modal.remove();
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        item.question = document.getElementById('edit-question').value;
        item.answer = document.getElementById('edit-answer').value;

        saveContactsData();
        refreshFaqItems();

        modal.remove();
        alert('FAQ обновлён!');
    });
}

function deleteFaqItem(index) {
    contactsData.faqItems.splice(index, 1);
    saveContactsData();
    refreshFaqItems();
}

function refreshFaqItems() {
    const container = document.querySelector('.faq-info');
    if (!container) return;

    // Сохраняем заголовок
    const title = container.querySelector('h2');

    container.innerHTML = '';
    if (title) container.appendChild(title);

    contactsData.faqItems.forEach((item, idx) => {
        const faqHtml = `
            <div class="faq-item" style="position: relative;">
                <h4>${escapeHtml(item.question)}</h4>
                <p>${escapeHtml(item.answer)}</p>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', faqHtml);
    });

    // Добавляем кнопки редактирования
    const isAdmin = localStorage.getItem('isStaff') === 'true' && localStorage.getItem('isLoggedIn') === 'true';
    if (isAdmin) {
        const newFaqs = document.querySelectorAll('.faq-item');
        newFaqs.forEach((item, idx) => {
            if (!item.querySelector('.edit-faq-btn')) {
                const editBtn = document.createElement('button');
                editBtn.innerHTML = '✏️';
                editBtn.className = 'edit-faq-btn';
                editBtn.style.cssText = `
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: transparent;
                    border: none;
                    border-radius: 50%;
                    width: 28px;
                    height: 28px;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    z-index: 10;
                `;
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    editFaqItem(idx);
                });
                item.appendChild(editBtn);
            }
        });
    }

    // Восстанавливаем обработчики раскрытия
    document.querySelectorAll(".faq-item").forEach(item => {
        item.addEventListener("click", (e) => {
            if (!e.target.classList.contains('edit-faq-btn')) {
                item.classList.toggle("active");
            }
        });
    });
}

// Добавление новой карточки
function addContactCard() {
    const modalHtml = `
        <div id="add-card-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
            <div style="background: white; padding: 25px; border-radius: 12px; width: 500px; max-width: 90vw;">
                <h3 style="margin-top: 0;">Добавить карточку</h3>
                <form id="add-card-form">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Тип карточки:</label>
                        <select id="card-type" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="info">Информационная карточка</option>
                            <option value="social">Социальная сеть</option>
                            <option value="faq">FAQ</option>
                        </select>
                    </div>
                    <div id="dynamic-fields"></div>
                    <div style="margin-top: 20px; text-align: right;">
                        <button type="button" id="cancel-add" style="padding: 8px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Отмена</button>
                        <button type="submit" style="padding: 8px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Добавить</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('add-card-modal');
    const typeSelect = document.getElementById('card-type');
    const dynamicFields = document.getElementById('dynamic-fields');

    function updateFields() {
        const type = typeSelect.value;
        if (type === 'info') {
            dynamicFields.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Иконка (эмодзи):</label>
                    <input type="text" id="new-icon" value="📌" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Заголовок:</label>
                    <input type="text" id="new-title" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Текст:</label>
                    <textarea id="new-text" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Ссылка:</label>
                    <input type="text" id="new-link" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Текст ссылки:</label>
                    <input type="text" id="new-link-text" value="Подробнее" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            `;
        } else if (type === 'social') {
            dynamicFields.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Иконка (эмодзи):</label>
                    <input type="text" id="new-icon" value="🔗" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Название:</label>
                    <input type="text" id="new-title" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Описание:</label>
                    <input type="text" id="new-desc" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">URL:</label>
                    <input type="url" id="new-url" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            `;
        } else if (type === 'faq') {
            dynamicFields.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Вопрос:</label>
                    <input type="text" id="new-question" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Ответ:</label>
                    <textarea id="new-answer" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                </div>
            `;
        }
    }

    typeSelect.addEventListener('change', updateFields);
    updateFields();

    document.getElementById('cancel-add').addEventListener('click', () => modal.remove());

    const form = document.getElementById('add-card-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const type = typeSelect.value;

        if (type === 'info') {
            const newCard = {
                id: 'custom_' + Date.now(),
                icon: document.getElementById('new-icon').value,
                title: document.getElementById('new-title').value,
                text: document.getElementById('new-text').value,
                link: document.getElementById('new-link').value,
                linkText: document.getElementById('new-link-text').value,
                isDynamic: false
            };
            contactsData.infoCards.push(newCard);
            saveContactsData();
            refreshInfoCards();
        } else if (type === 'social') {
            const newCard = {
                id: 'custom_' + Date.now(),
                icon: document.getElementById('new-icon').value,
                title: document.getElementById('new-title').value,
                desc: document.getElementById('new-desc').value,
                url: document.getElementById('new-url').value
            };
            contactsData.socialCards.push(newCard);
            saveContactsData();
            refreshSocialCards();
        } else if (type === 'faq') {
            const newFaq = {
                id: 'custom_' + Date.now(),
                question: document.getElementById('new-question').value,
                answer: document.getElementById('new-answer').value
            };
            contactsData.faqItems.push(newFaq);
            saveContactsData();
            refreshFaqItems();
        }

        modal.remove();
        alert('Карточка добавлена!');
    });
}

function refreshInfoCards() {
    const container = document.querySelector('.info-cards');
    if (!container) return;

    container.innerHTML = '';

    contactsData.infoCards.forEach((card, idx) => {
        const linkHtml = card.link && card.link !== '#'
            ? `<a href="${card.link}" class="info-card-link" target="${card.link.startsWith('http') ? '_blank' : ''}">${escapeHtml(card.linkText)}</a>`
            : `<div id="status-open-now" class="info-card-link">${escapeHtml(card.linkText)}</div>`;

        const cardHtml = `
            <div class="info-card" style="position: relative;">
                <div class="info-card-icon">${card.icon}</div>
                <div class="info-card-content">
                    <div class="info-card-title">${escapeHtml(card.title)}</div>
                    <div class="info-card-text">${card.text}</div>
                    ${linkHtml}
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
    });

    // Добавляем кнопки редактирования
    const isAdmin = localStorage.getItem('isStaff') === 'true' && localStorage.getItem('isLoggedIn') === 'true';
    if (isAdmin) {
        const newCards = document.querySelectorAll('.info-card');
        newCards.forEach((card, idx) => {
            if (!card.querySelector('.edit-card-btn')) {
                addEditButtonToCard(card, 'info', idx);
            }
        });
    }

    // Восстанавливаем динамический статус для карточки с расписанием
    updateOpenStatus();
    setInterval(updateOpenStatus, 60000);
}

function updateOpenStatus() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hour * 60 + minutes;

    let isOpen = false;

    if (day >= 1 && day <= 5) {
        const openTime = 10 * 60;
        const closeTime = 22 * 60;
        isOpen = currentMinutes >= openTime && currentMinutes < closeTime;
    } else if (day === 6 || day === 0) {
        const openTime = 11 * 60;
        const closeTime = 21 * 60;
        isOpen = currentMinutes >= openTime && currentMinutes < closeTime;
    }

    const statusElement = document.getElementById('status-open-now');
    if (statusElement) {
        if (isOpen) {
            statusElement.textContent = 'Открыто сейчас';
            statusElement.style.color = '#4CAF50';
        } else {
            statusElement.textContent = 'Закрыто';
            statusElement.style.color = '#f44336';
        }
    }
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

// Глобальные функции для вызова из HTML
window.addContactCard = addContactCard;
window.editInfoCard = editInfoCard;
window.editSocialCard = editSocialCard;
window.editFaqItem = editFaqItem;