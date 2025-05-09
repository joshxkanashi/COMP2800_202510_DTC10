const button = document.querySelectorAll("#openCard")

button.forEach((card) => {
    card.addEventListener("click", () => {
        window.location.href = 'eachConnectLanding.html';
    })
})