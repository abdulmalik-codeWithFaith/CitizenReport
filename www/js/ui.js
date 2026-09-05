/**
 * UI HELPERS
 * Small shared utilities for switching screens, showing loading states,
 * and surfacing errors/success messages. Kept framework-free on purpose.
 */
const UI = (function () {
    let toastTimer = null;

    function showScreen(id) {
        document.querySelectorAll(".screen").forEach(function (el) {
            el.classList.remove("active");
        });
        const target = document.getElementById(id);
        if (target) target.classList.add("active");
        window.scrollTo(0, 0);
    }

    function showLoader(text) {
        const overlay = document.getElementById("global-loader");
        document.getElementById("loader-text").textContent = text || "Loading…";
        overlay.classList.remove("hidden");
    }

    function hideLoader() {
        document.getElementById("global-loader").classList.add("hidden");
    }

    function toast(message, type) {
        const el = document.getElementById("toast");
        el.textContent = message;
        el.className = "toast"; // reset
        if (type === "error") el.classList.add("toast-error");
        if (type === "success") el.classList.add("toast-success");
        el.classList.remove("hidden");

        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.classList.add("hidden");
        }, 3200);
    }

    function setFieldError(elId, message) {
        const el = document.getElementById(elId);
        if (!el) return;
        if (!message) {
            el.classList.add("hidden");
            el.textContent = "";
        } else {
            el.textContent = message;
            el.classList.remove("hidden");
        }
    }

    function showBottomNav(show) {
        const nav = document.getElementById("bottom-nav");
        if (show) nav.classList.remove("hidden");
        else nav.classList.add("hidden");
    }

    function setActiveNav(targetId) {
        document.querySelectorAll(".nav-btn").forEach(function (btn) {
            btn.classList.toggle("nav-btn-active", btn.dataset.target === targetId);
        });
    }

    function timeAgo(date) {
        if (!date) return "";
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return "just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + "m ago";
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + "h ago";
        const days = Math.floor(hours / 24);
        if (days < 7) return days + "d ago";
        return date.toLocaleDateString();
    }

    /** Friendly text for common Firebase Auth error codes. */
    function friendlyAuthError(err) {
        const map = {
            "auth/invalid-email": "That email address doesn't look right.",
            "auth/user-disabled": "This account has been disabled.",
            "auth/user-not-found": "No account found with that email.",
            "auth/wrong-password": "Incorrect password. Please try again.",
            "auth/invalid-credential": "Incorrect email or password.",
            "auth/email-already-in-use": "An account already exists with that email.",
            "auth/weak-password": "Password should be at least 6 characters.",
            "auth/network-request-failed": "Network error. Check your connection and try again."
        };
        return map[err.code] || err.message || "Something went wrong. Please try again.";
    }

    return {
        showScreen: showScreen,
        showLoader: showLoader,
        hideLoader: hideLoader,
        toast: toast,
        setFieldError: setFieldError,
        showBottomNav: showBottomNav,
        setActiveNav: setActiveNav,
        timeAgo: timeAgo,
        friendlyAuthError: friendlyAuthError
    };
})();
