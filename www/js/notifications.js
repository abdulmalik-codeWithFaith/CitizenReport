/**
 * NOTIFICATIONS MODULE
 * -----------------------------------------------------------------------
 * Real push notifications (Firebase Cloud Messaging) require a server-side
 * component to send the push when a new Firestore document is created
 * (typically a Cloud Function). That's outside the scope of a client-only
 * assessment build, so this app uses `cordova-plugin-local-notification`
 * instead: while the app is open, a Firestore real-time listener detects
 * new incidents and fires a local device notification immediately. This
 * satisfies "notify users when a new incident is submitted" without
 * requiring a paid Firebase plan or a deployed backend.
 *
 * If you want true push-when-app-is-closed notifications, the notes at the
 * bottom of README.md explain how to extend this with FCM + Cloud Functions.
 * -----------------------------------------------------------------------
 */
const Notify = (function () {

    function isAvailable() {
        return !!(window.cordova && cordova.plugins && cordova.plugins.notification && cordova.plugins.notification.local);
    }

    function requestPermission() {
        if (!isAvailable()) return Promise.resolve(false);
        return new Promise(function (resolve) {
            cordova.plugins.notification.local.hasPermission(function (granted) {
                if (granted) { resolve(true); return; }
                cordova.plugins.notification.local.requestPermission(function (granted2) {
                    resolve(!!granted2);
                });
            });
        });
    }

    let notifId = 1;

    function newIncident(incident) {
        // Native local notification when running as a real Cordova app
        if (isAvailable()) {
            cordova.plugins.notification.local.schedule({
                id: notifId++,
                title: "New incident reported",
                text: incident.title + " — " + incident.category,
                foreground: true
            });
            return;
        }
        // Browser fallback so the feature is still visible during `cordova run browser`
        UI.toast("New incident: " + incident.title, "success");
    }

    return {
        requestPermission: requestPermission,
        newIncident: newIncident
    };
})();
