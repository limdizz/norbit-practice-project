document.addEventListener('DOMContentLoaded', () => {
    // 1. Очищаем ПРАВИЛЬНЫЕ ключи (те же, что задавали при входе)
    localStorage.removeItem('userData');
    localStorage.removeItem('isLoggedIn');
    
    sessionStorage.clear(); // Очищаем данные текущей сессии (текущий заказ и т.д.)

    console.log('✅ Пользователь успешно вышел.');

    // 2. Перенаправляем на главную страницу (или страницу входа)
    setTimeout(() => {
        window.location.href = 'index.html'; 
    }, 1000);
});