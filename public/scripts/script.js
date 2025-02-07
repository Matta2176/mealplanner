document.addEventListener("DOMContentLoaded", function () {
    // Pop-up handling
    const popup = document.getElementById("editMealPopup");
    const closeButton = document.querySelector(".close-btn");
    const editMealForm = document.getElementById("editMealForm");

    // Open the edit meal popup
    window.openEditMealPopup = function (id, name, calories, day) {
        document.getElementById("meal_id").value = id;
        document.getElementById("edit_meal_name").value = name;
        document.getElementById("edit_calories").value = calories;
        document.getElementById("edit_day").value = day;

        setTimeout(() => popup.classList.add("show"), 0.1); // Add fade-in effect
    };

    // Close the popup
    window.closePopup = function () {
        popup.classList.remove("show");
    };

    // Close button event listener
    if (closeButton) {
        closeButton.addEventListener("click", closePopup);
    }

    // Form submission event listener for editing meal
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
                    location.reload(); // Reload the page to reflect changes
                })
                .catch(error => console.error("Error editing meal:", error));
        });
    }

    // Fetch time data to update days and highlight today
    fetch('http://localhost:3000/meals') // Update this endpoint if needed
        .then(response => response.json())
        .then(meals => {
            // Loop through meals and create meal items
            const mealListElement = document.getElementById('meal-list');
            mealListElement.innerHTML = ''; // Clear previous meals

            // Loop through meals and render them
            meals.forEach(meal => {
                const mealItem = document.createElement('li');
                mealItem.classList.add('meal-item');
                const mealDate = new Date(meal.date); // Assuming the date is in the format "YYYY-MM-DD"
                const mealDay = mealDate.toLocaleDateString('nl-NL', { weekday: 'long' }); // Convert to day name (e.g. "Vrijdag")

                mealItem.setAttribute('data-day', mealDay); // Use the day name

                // Meal content
                mealItem.innerHTML = `
                    <span>${meal.name}</span>
                    <span>${meal.calories} Calories</span>
                    <span>${mealDay}</span>`; // Show the exact day (e.g., "Vrijdag")

                mealListElement.appendChild(mealItem);
            });

            // Call highlightToday to display today's meals
            fetch('http://localhost:3000/time') // Update this endpoint if needed
                .then(response => response.json())
                .then(data => {
                    const currentDay = data.day_of_week; // "Wednesday", for example
                    highlightToday(currentDay); // Call the function to highlight today
                })
                .catch(error => {
                    console.error('Error fetching time data:', error);
                    alert('Failed to fetch time data. Please try again later.');
                });
        })
        .catch(error => {
            console.error('Error fetching meals:', error);
        });
});

// Function to highlight today and show today's meals
function highlightToday(today) {
    // Hide all days and meals initially
    document.querySelectorAll(".meal-item").forEach(item => {
        item.style.display = "none";
    });

    // Show today's meals
    const todayMeals = document.querySelectorAll(`.meal-item[data-day="${today}"]`);
    todayMeals.forEach(meal => {
        meal.style.display = "block";  // Show meals for today
        meal.classList.add("today-meal");  // Optional: Style today's meals
    });

    // Highlight today's day in red (if it exists in the list)
    const todayDayHeader = document.querySelector(`.day-header[data-day="${today}"]`);
    if (todayDayHeader) {
        todayDayHeader.classList.add("today");
    }
}

// Function to toggle extra days visibility
function toggleExtraDays() {
    document.querySelectorAll('.extra-day').forEach(day => {
        day.classList.toggle('hidden');
    });

    const button = document.getElementById("showAllMeals");
    button.innerText = button.innerText === "Show All Days" ? "Hide Extra Days" : "Show All Days";
}

function convertDayToDate(event) {
    event.preventDefault(); // Voorkomt dat het formulier meteen verzendt

    const selectedDay = document.getElementById("day").value;
    const dateInput = document.getElementById("date");

    // Haal de huidige datum op
    const today = new Date();
    const currentDayIndex = today.getDay(); // 0 (zondag) t/m 6 (zaterdag)

    // Maak een mapping van dagen naar indices
    const dayMapping = {
        "Zondag": 0,
        "Maandag": 1,
        "Dinsdag": 2,
        "Woensdag": 3,
        "Donderdag": 4,
        "Vrijdag": 5,
        "Zaterdag": 6
    };

    const targetDayIndex = dayMapping[selectedDay];

    // Bereken de eerstvolgende datum voor die dag
    let daysUntilTarget = targetDayIndex - currentDayIndex;
    if (daysUntilTarget < 0) {
        daysUntilTarget += 7; // Spring naar de volgende week als de dag al voorbij is
    }

    const targetDate = new Date();
    targetDate.setDate(today.getDate() + daysUntilTarget);

    // Formatteer naar YYYY-MM-DD
    const formattedDate = targetDate.toISOString().split("T")[0];

    // Zet de berekende datum in het verborgen veld en verzend het formulier
    dateInput.value = formattedDate;
    event.target.submit();
}
