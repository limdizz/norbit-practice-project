export async function getUserBookings(userUid) {
    const response = await fetch(`https://localhost:7123/api/BookingsAdvanced/user/${userUid}`);
    
    if (!response.ok) {
        throw new Error('Ошибка загрузки бронирований');
    }
    
    return await response.json();
}

export async function deleteBooking(bookingId, userUid) {
    const response = await fetch(`https://localhost:7123/api/BookingsAdvanced/${bookingId}/user/${userUid}`, {
        method: "DELETE"
    });

    if (!response.ok)
        throw new Error(await response.text());

    return true;
}