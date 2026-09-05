/**
 * APP.JS
 * Bootstraps the whole app: auth-state routing, screen navigation, form
 * wiring, and rendering. Kept as plain vanilla JS (no framework) per the
 * assessment's tech stack.
 */

const CATEGORY_ICON = {
    Accident: "🚗",
    Fighting: "🥊",
    Rioting: "⚠️",
    Robbery: "🕵️",
    Fire: "🔥",
    Other: "📌"
};

const CATEGORY_CLASS = {
    Accident: "accident",
    Fighting: "fighting",
    Rioting: "rioting",
    Robbery: "robbery",
    Fire: "fire",
    Other: "other"
};

let state = {
    currentCategory: "All",
    reportPhotoDataUrl: null,
    reportLocation: null // { latitude, longitude }
};

function ready(fn) {
    if (window.cordova) {
        document.addEventListener("deviceready", fn, false);
    } else {
        // Running in a plain browser (e.g. `cordova run browser`) — no deviceready event
        document.addEventListener("DOMContentLoaded", fn, false);
    }
}

ready(function () {
    wireAuthForms();
    wireHomeScreen();
    wireReportForm();
    wireBottomNav();
    wireDetailScreen();

    Auth.onAuthStateChanged(function (user) {
        if (user) {
            onLoggedIn(user);
        } else {
            onLoggedOut();
        }
    });
});

/* ============================================================
   AUTH ROUTING
   ============================================================ */

function onLoggedIn(user) {
    UI.showBottomNav(true);
    UI.showScreen("screen-home");
    UI.setActiveNav("screen-home");
    Notify.requestPermission();

    Incidents.listenToFeed(
        function (incidents) { renderFeed(incidents); renderMyReports(user.uid); },
        function (newIncident) {
            // Don't notify the user about their own just-submitted report
            if (newIncident.reporterId !== user.uid) {
                Notify.newIncident(newIncident);
            }
        },
        function () { UI.toast("Couldn't load incidents. Check your connection.", "error"); }
    );
}

function onLoggedOut() {
    Incidents.stopListening();
    UI.showBottomNav(false);
    UI.showScreen("screen-login");
}

/* ============================================================
   AUTH FORMS (login / register)
   ============================================================ */

function wireAuthForms() {
    document.getElementById("go-to-register").addEventListener("click", function (e) {
        e.preventDefault();
        UI.showScreen("screen-register");
    });
    document.getElementById("go-to-login").addEventListener("click", function (e) {
        e.preventDefault();
        UI.showScreen("screen-login");
    });

    document.getElementById("form-login").addEventListener("submit", function (e) {
        e.preventDefault();
        UI.setFieldError("login-error", null);
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        UI.showLoader("Logging in…");
        Auth.login(email, password)
            .then(function () { UI.hideLoader(); })
            .catch(function (err) {
                UI.hideLoader();
                UI.setFieldError("login-error", UI.friendlyAuthError(err));
            });
    });

    document.getElementById("form-register").addEventListener("submit", function (e) {
        e.preventDefault();
        UI.setFieldError("register-error", null);
        const name = document.getElementById("register-name").value.trim();
        const email = document.getElementById("register-email").value.trim();
        const password = document.getElementById("register-password").value;

        if (password.length < 6) {
            UI.setFieldError("register-error", "Password should be at least 6 characters.");
            return;
        }

        UI.showLoader("Creating your account…");
        Auth.register(name, email, password)
            .then(function () { UI.hideLoader(); })
            .catch(function (err) {
                UI.hideLoader();
                UI.setFieldError("register-error", UI.friendlyAuthError(err));
            });
    });

    document.getElementById("btn-logout").addEventListener("click", function () {
        Auth.logout();
    });
}

/* ============================================================
   HOME / FEED SCREEN
   ============================================================ */

function wireHomeScreen() {
    document.getElementById("filter-row").addEventListener("click", function (e) {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        document.querySelectorAll("#filter-row .chip").forEach(function (c) { c.classList.remove("chip-active"); });
        chip.classList.add("chip-active");
        state.currentCategory = chip.dataset.category;
        renderFeed(Incidents.filterByCategory === undefined ? [] : lastFullIncidentList);
    });

    document.getElementById("incident-list").addEventListener("click", function (e) {
        const card = e.target.closest(".incident-card");
        if (!card) return;
        openDetail(card.dataset.id);
    });

    document.getElementById("myreports-list").addEventListener("click", function (e) {
        const card = e.target.closest(".incident-card");
        if (!card) return;
        openDetail(card.dataset.id);
    });
}

let lastFullIncidentList = [];

function renderFeed(incidents) {
    lastFullIncidentList = incidents;
    const filtered = Incidents.filterByCategory(incidents, state.currentCategory);
    renderIncidentList(filtered, "incident-list", "home-empty");
}

function renderMyReports(uid) {
    const mine = Incidents.getMine(uid);
    renderIncidentList(mine, "myreports-list", "myreports-empty");
}

function renderIncidentList(list, listElId, emptyElId) {
    const listEl = document.getElementById(listElId);
    const emptyEl = document.getElementById(emptyElId);

    if (!list.length) {
        listEl.innerHTML = "";
        emptyEl.classList.remove("hidden");
        return;
    }
    emptyEl.classList.add("hidden");

    listEl.innerHTML = list.map(renderCard).join("");
}

function renderCard(incident) {
    const catClass = CATEGORY_CLASS[incident.category] || "other";
    const icon = CATEGORY_ICON[incident.category] || "📌";
    const photo = incident.imageUrl
        ? '<img src="' + escapeHtml(incident.imageUrl) + '" alt="" />'
        : '<div class="no-photo">' + icon + '</div>';

    return (
        '<div class="incident-card cat-' + catClass + '" data-id="' + incident.id + '">' +
            photo +
            '<div class="incident-card-body">' +
                '<div class="incident-card-top">' +
                    '<span class="incident-card-cat text-' + catClass + '">' + escapeHtml(incident.category) + '</span>' +
                    '<span class="incident-card-time">' + UI.timeAgo(incident.createdAt) + '</span>' +
                '</div>' +
                '<h3>' + escapeHtml(incident.title) + '</h3>' +
                '<p>' + escapeHtml(incident.description) + '</p>' +
                '<div class="incident-card-reporter">Reported by ' + escapeHtml(incident.reporterName) + '</div>' +
            '</div>' +
        '</div>'
    );
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}

/* ============================================================
   REPORT INCIDENT SCREEN
   ============================================================ */

function wireReportForm() {
    document.getElementById("btn-back-from-report").addEventListener("click", function () {
        navigateTo("screen-home");
    });

    document.querySelectorAll('.nav-btn[data-target="screen-report"]').forEach(function (btn) {
        btn.addEventListener("click", prepareReportScreen);
    });

    document.getElementById("btn-take-photo").addEventListener("click", function () {
        CameraModule.takePhoto()
            .then(setReportPhoto)
            .catch(function (err) { UI.toast(err.message, "error"); });
    });

    document.getElementById("btn-pick-photo").addEventListener("click", function () {
        CameraModule.pickFromGallery()
            .then(setReportPhoto)
            .catch(function (err) { UI.toast(err.message, "error"); });
    });

    document.getElementById("btn-retry-location").addEventListener("click", fetchReportLocation);

    document.getElementById("form-report").addEventListener("submit", function (e) {
        e.preventDefault();
        submitReport();
    });
}

function prepareReportScreen() {
    // Reset form state each time the report screen is opened
    document.getElementById("form-report").reset();
    state.reportPhotoDataUrl = null;
    state.reportLocation = null;
    UI.setFieldError("report-error", null);
    document.getElementById("report-photo-preview").classList.add("hidden");
    document.getElementById("photo-placeholder").classList.remove("hidden");
    fetchReportLocation();
}

function setReportPhoto(dataUrl) {
    state.reportPhotoDataUrl = dataUrl;
    const img = document.getElementById("report-photo-preview");
    img.src = dataUrl;
    img.classList.remove("hidden");
    document.getElementById("photo-placeholder").classList.add("hidden");
}

function fetchReportLocation() {
    const textEl = document.getElementById("location-text");
    const retryBtn = document.getElementById("btn-retry-location");
    textEl.textContent = "Fetching your current location…";
    retryBtn.classList.add("hidden");

    Geo.getCurrentPosition()
        .then(function (pos) {
            state.reportLocation = pos;
            textEl.textContent = "📍 " + Geo.formatCoords(pos.latitude, pos.longitude);
        })
        .catch(function (err) {
            state.reportLocation = null;
            textEl.textContent = err.message;
            retryBtn.classList.remove("hidden");
        });
}

function submitReport() {
    UI.setFieldError("report-error", null);

    const title = document.getElementById("report-title").value.trim();
    const category = document.getElementById("report-category").value;
    const description = document.getElementById("report-description").value.trim();

    if (!title || !description) {
        UI.setFieldError("report-error", "Please fill in the title and description.");
        return;
    }
    if (!state.reportLocation) {
        UI.setFieldError("report-error", "We need your location before you can submit. Tap Retry above, or check location permissions.");
        return;
    }

    const submitBtn = document.getElementById("btn-submit-report");
    submitBtn.disabled = true;
    UI.showLoader("Submitting your report…");

    Incidents.create({
        title: title,
        category: category,
        description: description,
        latitude: state.reportLocation.latitude,
        longitude: state.reportLocation.longitude
    }, state.reportPhotoDataUrl)
        .then(function () {
            UI.hideLoader();
            submitBtn.disabled = false;
            UI.toast("Incident reported. Thank you!", "success");
            navigateTo("screen-home");
        })
        .catch(function (err) {
            UI.hideLoader();
            submitBtn.disabled = false;
            console.error(err);
            UI.setFieldError("report-error", "Couldn't submit your report. " + (err.message || "Please try again."));
        });
}

/* ============================================================
   INCIDENT DETAIL SCREEN
   ============================================================ */

function wireDetailScreen() {
    document.getElementById("btn-back-from-detail").addEventListener("click", function () {
        navigateTo("screen-home");
    });
}

function openDetail(id) {
    const incident = Incidents.getById(id);
    if (!incident) {
        UI.toast("That incident is no longer available.", "error");
        return;
    }

    document.getElementById("detail-category").textContent = incident.category;
    document.getElementById("detail-title").textContent = incident.title;
    document.getElementById("detail-description").textContent = incident.description;
    document.getElementById("detail-meta").textContent =
        "Reported by " + incident.reporterName + " · " + UI.timeAgo(incident.createdAt);

    const photo = document.getElementById("detail-photo");
    if (incident.imageUrl) {
        photo.src = incident.imageUrl;
        photo.classList.remove("hidden");
    } else {
        photo.classList.add("hidden");
    }

    document.getElementById("detail-coords").textContent = incident.location ||
        Geo.formatCoords(incident.latitude, incident.longitude);
    document.getElementById("detail-map-link").href =
        "https://www.google.com/maps/search/?api=1&query=" + incident.latitude + "," + incident.longitude;

    navigateTo("screen-detail");
}

/* ============================================================
   BOTTOM NAV / GENERIC NAVIGATION
   ============================================================ */

function wireBottomNav() {
    document.querySelectorAll(".nav-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            navigateTo(btn.dataset.target);
        });
    });
}

function navigateTo(screenId) {
    UI.showScreen(screenId);
    UI.setActiveNav(screenId);

    if (screenId === "screen-myreports") {
        const user = Auth.currentUser();
        if (user) renderMyReports(user.uid);
    }
}
