document.addEventListener("DOMContentLoaded", function () {
    const popup = document.getElementById("editMealPopup");
    const closeButton = document.querySelector(".close-btn");
    const editMealForm = document.getElementById("editMealForm");

    window.openEditMealPopup = function (id, name, calories, day) {
        document.getElementById("meal_id").value = id;
        document.getElementById("edit_meal_name").value = name;
        document.getElementById("edit_calories").value = calories;
        document.getElementById("edit_day").value = day;
    
        setTimeout(() => popup.classList.add("show"), 0.1); // Voeg fade-in effect toe
    };

    window.closePopup = function () {
        popup.classList.remove("show");
    };

    // Controleer of de sluitknop bestaat voordat je een event toevoegt
    if (closeButton) {
        closeButton.addEventListener("click", closePopup);
    }

    // Event listener voor formulier
    if (editMealForm) {
        editMealForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const mealId = document.getElementById("meal_id").value;
            const formData = new FormData(this);

            fetch(`/edit-meal/${mealId}`, {
                method: "POST",
                body: new URLSearchParams(formData),
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            })
            .then(response => response.text())
            .then(() => {
                closePopup();
                location.reload();
            })
            .catch(error => console.error("Fout bij bewerken:", error));
        });
    }
});
