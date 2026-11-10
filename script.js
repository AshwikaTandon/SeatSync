
// ========================================
// SEATSYNC - SMART LIBRARY BOOKING SYSTEM
// ========================================

// DOM elements
const pages = document.querySelectorAll(".page");
const navLinks = document.querySelectorAll(".nav-link");
const pageName = document.getElementById("pageName");
const seatMap = document.getElementById("seatMap");

const today = new Date();
const todayString = formatDate(today);

let currentFloor = 1;
let selectedSeat = null;
let selectedZone = "all";

let bookings = JSON.parse(localStorage.getItem("seatSyncBookings")) || [];

let darkMode = localStorage.getItem("seatSyncTheme") === "dark";

// Simulated occupied seats for each floor
const occupiedSeats = {
    1: [2, 5, 9, 14, 16],
    2: [1, 4, 7, 12, 15],
    3: [3, 6, 10, 11, 16]
};

// ========================================
// DATE HELPERS
// ========================================

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function displayDate(dateString) {
    return new Date(dateString + "T00:00:00").toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("todayDate").textContent =
        today.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    const dateInput = document.getElementById("bookingDate");
    dateInput.min = todayString;
    dateInput.value = todayString;

    if (darkMode) {
        document.body.classList.add("dark");
        updateThemeIcons();
    }

    renderSeats();
    updateDashboard();
    renderBookings();
    setupEvents();

});

// ========================================
// NAVIGATION
// ========================================

function navigateTo(pageId) {

    pages.forEach(page => {
        page.classList.toggle("active", page.id === pageId);
    });

    navLinks.forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.page === pageId
        );
    });

    const names = {
        dashboard: "Dashboard",
        booking: "Find a Seat",
        bookings: "My Bookings",
        profile: "My Profile"
    };

    pageName.textContent = names[pageId] || "Dashboard";

    document.getElementById("sidebar").classList.remove("open");

    if (pageId === "booking") {
        renderSeats();
    }

    if (pageId === "bookings") {
        renderBookings();
    }

    if (pageId === "profile") {
        document.getElementById("profileBookingCount").textContent =
            bookings.length;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEvents() {

    // Sidebar navigation
    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            navigateTo(link.dataset.page);
        });
    });

    // Buttons that navigate to another page
    document.querySelectorAll("[data-goto]").forEach(button => {
        button.addEventListener("click", () => {
            navigateTo(button.dataset.goto);
        });
    });

    // Mobile menu
    document.getElementById("mobileMenu").addEventListener("click", () => {
        document.getElementById("sidebar").classList.toggle("open");
    });

    // Floor selection
    document.querySelectorAll(".floor-button").forEach(button => {
        button.addEventListener("click", () => {

            currentFloor = Number(button.dataset.floor);
            selectedSeat = null;

            document.querySelectorAll(".floor-button").forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            updateSelectedSeat();
            renderSeats();
        });
    });

    // Zone filter
    document.getElementById("zoneFilter").addEventListener("change", event => {
        selectedZone = event.target.value;
        renderSeats();
    });

    // Booking date change
    document.getElementById("bookingDate").addEventListener("change", () => {
        selectedSeat = null;
        updateSelectedSeat();
        renderSeats();
    });

    // Confirm booking
    document.getElementById("confirmBooking").addEventListener("click", confirmBooking);

    // Modal buttons
    document.getElementById("closeModal").addEventListener("click", closeModal);

    document.getElementById("doneButton").addEventListener("click", () => {
        closeModal();
        navigateTo("bookings");
    });

    // Close modal on outside click
    document.getElementById("successModal").addEventListener("click", event => {
        if (event.target.id === "successModal") {
            closeModal();
        }
    });

    // Theme buttons
    document.getElementById("themeButton").addEventListener("click", toggleTheme);
    document.getElementById("profileThemeButton").addEventListener("click", toggleTheme);

    // Profile shortcut
    document.getElementById("profileShortcut").addEventListener("click", () => {
        navigateTo("profile");
    });

    // Help button
    document.getElementById("helpButton").addEventListener("click", () => {
        showToast("Choose a floor, select a green seat and confirm your booking!");
    });

    // Zone preference
    const preference = document.getElementById("preferredZone");

    preference.addEventListener("change", () => {
        document.getElementById("zoneFilter").value = preference.value;
        selectedZone = preference.value;
        navigateTo("booking");
        renderSeats();
        showToast("Study zone preference applied!");
    });

}

// ========================================
// SEAT DATA
// ========================================

function getZone(index) {

    if (index <= 6) {
        return "Silent Zone";
    }

    if (index <= 12) {
        return "General Zone";
    }

    return "Group Zone";
}

function getSeatData(floor, index) {

    const row = Math.ceil(index / 6);
    const column = ((index - 1) % 6) + 1;

    const seatId = `F${floor}-${String.fromCharCode(64 + row)}${column}`;

    return {
        id: seatId,
        label: `${String.fromCharCode(64 + row)}${column}`,
        floor: floor,
        zone: getZone(index),
        occupied: occupiedSeats[floor].includes(index)
    };
}

// ========================================
// CHECK BOOKING STATUS
// ========================================

function getSeatBooking(seatId, date, slot) {

    return bookings.find(booking =>
        booking.seatId === seatId &&
        booking.date === date &&
        booking.slot === slot
    );

}

function isSeatBooked(seatId, date, slot) {

    return Boolean(getSeatBooking(seatId, date, slot));

}

// ========================================
// RENDER SEATING MAP
// ========================================

function renderSeats() {

    seatMap.innerHTML = "";

    const bookingDate = document.getElementById("bookingDate").value;
    const timeSlot = document.getElementById("timeSlot").value;

    for (let i = 1; i <= 16; i++) {

        const seat = getSeatData(currentFloor, i);

        const isOccupied = seat.occupied;

        const userBooking = getSeatBooking(
            seat.id,
            bookingDate,
            timeSlot
        );

        const isReserved = Boolean(userBooking);

        const button = document.createElement("button");

        button.className = "seat";
        button.textContent = seat.label;
        button.title = `${seat.id} - ${seat.zone}`;

        if (isOccupied) {
            button.classList.add("occupied");
            button.disabled = true;
            button.title = "Currently occupied";
        }

        else if (isReserved) {
            button.classList.add("reserved");
            button.disabled = true;
            button.title = "Already reserved";
        }

        else if (selectedSeat === seat.id) {
            button.classList.add("selected");
        }

        if (
            selectedZone !== "all" &&
            selectedZone !== seat.zone
        ) {
            button.classList.add("filtered-out");
        }

        button.addEventListener("click", () => {

            if (isOccupied || isReserved) return;

            if (selectedSeat === seat.id) {
                selectedSeat = null;
            } else {
                selectedSeat = seat.id;
            }

            updateSelectedSeat();
            renderSeats();

        });

        seatMap.appendChild(button);

    }

}

// ========================================
// UPDATE SELECTED SEAT
// ========================================

function updateSelectedSeat() {

    const text = document.getElementById("selectedSeatText");
    const zone = document.getElementById("zoneDisplay");

    if (!selectedSeat) {

        text.textContent = "No seat selected";
        zone.value = "Select a seat first";

        return;
    }

    const index = Number(selectedSeat.split("-")[1].charAt(1));
    const seat = getSeatData(currentFloor, index);

    text.textContent = selectedSeat;
    zone.value = seat.zone;

}

// ========================================
// CONFIRM BOOKING
// ========================================

function confirmBooking() {

    if (!selectedSeat) {
        showToast("Please select an available seat first!");
        return;
    }

    const date = document.getElementById("bookingDate").value;
    const slot = document.getElementById("timeSlot").value;

    if (!date) {
        showToast("Please select a booking date.");
        return;
    }

    if (date < todayString) {
        showToast("You cannot book a date in the past.");
        return;
    }

    if (currentFloor < 1 || currentFloor > 3) {
        showToast("Please select a valid floor.");
        return;
    }

    const index = Number(selectedSeat.split("-")[1].charAt(1));
    const seat = getSeatData(currentFloor, index);

    if (seat.occupied) {
        showToast("This seat is occupied.");
        return;
    }

    if (isSeatBooked(selectedSeat, date, slot)) {
        showToast("This seat has already been reserved.");
        renderSeats();
        return;
    }

    const booking = {

        id: "SS-" + Date.now().toString().slice(-7),

        seatId: selectedSeat,

        floor: currentFloor,

        date: date,

        slot: slot,

        zone: seat.zone,

        createdAt: new Date().toISOString()

    };

    bookings.push(booking);

    saveBookings();

    updateDashboard();
    renderBookings();
    renderSeats();

    showSuccessModal(booking);

    selectedSeat = null;
    updateSelectedSeat();

}

// ========================================
// SAVE BOOKINGS
// ========================================

function saveBookings() {

    localStorage.setItem(
        "seatSyncBookings",
        JSON.stringify(bookings)
    );

}

// ========================================
// SUCCESS MODAL
// ========================================

function showSuccessModal(booking) {

    document.getElementById("ticketId").textContent = booking.id;
    document.getElementById("ticketSeat").textContent = booking.seatId;
    document.getElementById("ticketDate").textContent = displayDate(booking.date);
    document.getElementById("ticketTime").textContent = booking.slot;
    document.getElementById("ticketFloor").textContent = "Floor " + booking.floor;

    // This is a decorative demo QR placeholder, not a scannable code.
    document.getElementById("qrCode").title =
        "Demo booking pass: " + booking.id;

    document.getElementById("successModal").classList.add("show");

}

function closeModal() {

    document.getElementById("successModal").classList.remove("show");

}

// ========================================
// CANCEL BOOKING
// ========================================

function cancelBooking(id) {

    const confirmed = confirm(
        "Are you sure you want to cancel this reservation?"
    );

    if (!confirmed) return;

    bookings = bookings.filter(booking => booking.id !== id);

    saveBookings();

    updateDashboard();
    renderBookings();
    renderSeats();

    showToast("Reservation cancelled successfully.");

}

// ========================================
// RENDER MY BOOKINGS
// ========================================

function renderBookings() {

    const container = document.getElementById("bookingList");

    container.innerHTML = "";

    const sorted = [...bookings].sort((a, b) =>
        (a.date + a.slot).localeCompare(b.date + b.slot)
    );

    const upcoming = bookings.filter(booking =>
        booking.date >= todayString
    );

    const floors = new Set(bookings.map(booking => booking.floor));

    document.getElementById("bookingTotal").textContent = bookings.length;
    document.getElementById("upcomingTotal").textContent = upcoming.length;
    document.getElementById("floorsTotal").textContent = floors.size;

    document.getElementById("bookingCount").textContent = bookings.length;

    if (sorted.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-calendar-xmark"
                   style="font-size:30px;display:block;margin-bottom:12px;"></i>
                <strong>No reservations yet.</strong>
                <p style="margin-top:7px;">Find a seat and plan your next study session!</p>
            </div>
        `;

        updateRecentBookings();

        return;
    }

    sorted.forEach(booking => {

        const item = document.createElement("div");

        item.className = "booking-item";

        const isPast = booking.date < todayString;

        const status = isPast ? "Past" : "Upcoming";

        const statusColor = isPast
            ? "background:#edf0f4;color:#8491a2;"
            : "";

        item.innerHTML = `
            <div class="booking-symbol">
                <i class="fa-solid fa-chair"></i>
            </div>

            <div class="booking-info">
                <strong>${booking.seatId} · Floor ${booking.floor}</strong>
                <small>${displayDate(booking.date)} · ${booking.slot}</small>
                <small>${booking.zone}</small>
            </div>

            <span class="status" style="${statusColor}">
                ${status}
            </span>

            <button class="cancel-button"
                data-cancel="${booking.id}"
                ${isPast ? "disabled" : ""}>
                ${isPast ? "Completed" : "Cancel"}
            </button>
        `;

        container.appendChild(item);

    });

    container.querySelectorAll("[data-cancel]").forEach(button => {

        button.addEventListener("click", () => {
            cancelBooking(button.dataset.cancel);
        });

    });

    updateRecentBookings();

}

// ========================================
// RECENT BOOKINGS
// ========================================

function updateRecentBookings() {

    const container = document.getElementById("recentBookings");

    container.innerHTML = "";

    const recent = [...bookings]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 3);

    if (recent.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                You haven't booked a seat yet.
                Find your perfect spot!
            </div>
        `;

        return;
    }

    recent.forEach(booking => {

        const item = document.createElement("div");

        item.className = "recent-item";

        item.innerHTML = `
            <div class="booking-symbol">
                <i class="fa-solid fa-chair"></i>
            </div>

            <div>
                <strong>${booking.seatId} · Floor ${booking.floor}</strong>
                <small>${displayDate(booking.date)} · ${booking.slot}</small>
            </div>

            <span class="status">Booked</span>
        `;

        container.appendChild(item);

    });

}

// ========================================
// DASHBOARD STATISTICS
// ========================================

function updateDashboard() {

    const total = 48;

    const occupied = Object.values(occupiedSeats)
        .reduce((sum, floor) => sum + floor.length, 0);

    const bookedForToday = bookings.filter(booking =>
        booking.date === todayString
    ).length;

    const available = Math.max(0, total - occupied - bookedForToday);

    const occupiedTotal = occupied + bookedForToday;

    const percentage = Math.round((occupiedTotal / total) * 100);

    document.getElementById("totalSeats").textContent = total;

    document.getElementById("availableSeats").textContent = available;

    document.getElementById("occupiedSeats").textContent = occupiedTotal;

    document.getElementById("myBookingStat").textContent = bookings.length;

    document.getElementById("occupancyPercent").textContent =
        percentage + "%";

    document.getElementById("legendAvailable").textContent = available;

    document.getElementById("legendOccupied").textContent = occupiedTotal;

    document.getElementById("occupancyDonut").style.background =
        `conic-gradient(var(--orange) 0deg ${percentage * 3.6}deg, #e9f1f6 ${percentage * 3.6}deg 360deg)`;

    updateRecentBookings();

    document.getElementById("bookingCount").textContent = bookings.length;

}

// ========================================
// DARK / LIGHT THEME
// ========================================

function toggleTheme() {

    document.body.classList.toggle("dark");

    darkMode = document.body.classList.contains("dark");

    localStorage.setItem(
        "seatSyncTheme",
        darkMode ? "dark" : "light"
    );

    updateThemeIcons();

}

function updateThemeIcons() {

    const icon = document.querySelector("#themeButton i");

    icon.className = darkMode
        ? "fa-solid fa-sun"
        : "fa-regular fa-moon";

}

// ========================================
// TOAST NOTIFICATION
// ========================================

let toastTimer;

function showToast(message) {

    const toast = document.getElementById("toast");

    document.getElementById("toastMessage").textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}
