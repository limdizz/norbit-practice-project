async function showDateTimePicker(title) {
    return new Promise((resolve) => {
        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000';

        // Создаем контент модального окна
        const content = document.createElement('div');
        content.style.backgroundColor = 'white';
        content.style.padding = '20px';
        content.style.borderRadius = '8px';
        content.style.width = '90%';
        content.style.maxWidth = '500px';
        content.style.maxHeight = '90vh';
        content.style.overflow = 'auto';

        // Заголовок
        const header = document.createElement('h3');
        header.textContent = title;
        header.style.margin = '0 0 15px 0';
        content.appendChild(header);

        // Выбор даты
        const dateLabel = document.createElement('label');
        dateLabel.textContent = 'Дата:';
        dateLabel.style.display = 'block';
        dateLabel.style.margin = '10px 0 5px 0';
        content.appendChild(dateLabel);

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.style.width = '100%';
        dateInput.style.padding = '8px';
        dateInput.style.border = '1px solid #ddd';
        dateInput.style.borderRadius = '4px';
        dateInput.style.marginBottom = '15px';
        content.appendChild(dateInput);

        // Выбор времени
        const timeLabel = document.createElement('label');
        timeLabel.textContent = 'Время:';
        timeLabel.style.display = 'block';
        timeLabel.style.margin = '10px 0 5px 0';
        content.appendChild(timeLabel);

        const timeInput = document.createElement('input');
        timeInput.type = 'time';
        timeInput.style.width = '100%';
        timeInput.style.padding = '8px';
        timeInput.style.border = '1px solid #ddd';
        timeInput.style.borderRadius = '4px';
        timeInput.style.marginBottom = '15px';
        content.appendChild(timeInput);

        // Кнопки
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '15px';

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Отмена';
        cancelButton.style.padding = '8px 16px';
        cancelButton.style.border = '1px solid #ddd';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.backgroundColor = 'white';
        cancelButton.style.cursor = 'pointer';
        buttonContainer.appendChild(cancelButton);

        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'Подтвердить';
        confirmButton.style.padding = '8px 16px';
        confirmButton.style.border = 'none';
        confirmButton.style.borderRadius = '4px';
        confirmButton.style.backgroundColor = 'black';
        confirmButton.style.color = 'white';
        confirmButton.style.cursor = 'pointer';
        buttonContainer.appendChild(confirmButton);

        content.appendChild(buttonContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Обработчик отмены
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(null);
        });

        // Обработчик подтверждения
        confirmButton.addEventListener('click', () => {
            const dateValue = dateInput.value;
            const timeValue = timeInput.value;

            if (!dateValue || !timeValue) {
                alert('Пожалуйста, выберите дату и время.');
                return;
            }

            // Форматируем как ГГГГ-ММ-ДД ЧЧ:ММ
            const result = `${dateValue} ${timeValue}`;
            document.body.removeChild(modal);
            resolve(result);
        });

        // Закрытие по клику вне окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                resolve(null);
            }
        });

        // Установка текущей даты и времени по умолчанию
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        dateInput.value = `${year}-${month}-${day}`;
        timeInput.value = `${hours}:${minutes}`;
    });
}
