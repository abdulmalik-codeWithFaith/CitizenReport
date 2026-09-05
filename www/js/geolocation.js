/**
 * GEOLOCATION MODULE
 * Wraps the Cordova Geolocation plugin (navigator.geolocation, patched by
 * cordova-plugin-geolocation) with a Promise-based API and a sane timeout.
 * Falls back gracefully to the browser's built-in geolocation when running
 * outside of a Cordova WebView (e.g. `cordova run browser` or a plain browser tab).
 */
const Geo = (function () {

    function getCurrentPosition() {
        return new Promise(function (resolve, reject) {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported on this device."));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                function (position) {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                function (error) {
                    reject(new Error(mapGeoError(error)));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 60000
                }
            );
        });
    }

    function mapGeoError(error) {
        switch (error.code) {
            case 1: return "Location permission was denied. Enable it in your device settings.";
            case 2: return "Your location is currently unavailable.";
            case 3: return "Getting your location took too long. Please try again.";
            default: return "Unable to get your current location.";
        }
    }

    /** Best-effort reverse description used only for a human-readable label. */
    function formatCoords(lat, lng) {
        return lat.toFixed(5) + ", " + lng.toFixed(5);
    }

    return {
        getCurrentPosition: getCurrentPosition,
        formatCoords: formatCoords
    };
})();
