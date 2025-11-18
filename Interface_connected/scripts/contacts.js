document.getElementById("feedback-form").addEventListener("submit", function (e) {
    e.preventDefault();
    alert("Спасибо за сообщение! Мы свяжемся с вами в ближайшее время.");
    this.reset();
});