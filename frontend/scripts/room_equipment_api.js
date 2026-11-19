// API-клиент для работы с оборудованием помещений

/**
 * Загружает оборудование, входящее в комплект помещения (без доплаты)
 * @param {number} roomId - ID помещения
 * @returns {Promise<Array>} - Список оборудования
 */
async function fetchRoomEquipment(roomId) {
    try {
        const response = await fetch(`https://localhost:7123/api/RoomEquipments?roomId=${roomId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const allRoomEquipment = await response.json();

        // Получаем ID оборудования для фильтрации
        const equipmentIds = allRoomEquipment.map(re => re.EquipmentId);

        // Загружаем детали оборудования по ID
        const equipmentPromises = equipmentIds.map(id =>
            fetch(`https://localhost:7123/api/Equipments/${id}`).then(r => r.json())
        );

        const equipmentDetails = await Promise.all(equipmentPromises);
        return equipmentDetails;
    } catch (error) {
        console.error('Ошибка при загрузке оборудования помещения:', error);
        return [];
    }
}

/**
 * Загружает всё доступное оборудование для аренды (дополнительно)
 * @returns {Promise<Array>} - Список всего оборудования
 */
async function fetchAllEquipment() {
    try {
        const response = await fetch('https://localhost:7123/api/Equipments');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const allEquipment = await response.json();
        return allEquipment.filter(e => e.IsRentable);
    } catch (error) {
        console.error('Ошибка при загрузке списка оборудования:', error);
        return [];
    }
}