/**
 * CAMERA MODULE
 * Wraps the Cordova Camera plugin to capture a photo or pick one from the
 * gallery, returning a base64 data URL we can preview immediately and later
 * upload to Firebase Storage. Falls back to a native <input type="file">
 * picker when the Cordova camera plugin isn't available (e.g. testing in
 * a plain desktop browser).
 */
const CameraModule = (function () {

    function capture(sourceType) {
        return new Promise(function (resolve, reject) {
            if (window.Camera && navigator.camera) {
                navigator.camera.getPicture(
                    function (imageData) {
                        resolve("data:image/jpeg;base64," + imageData);
                    },
                    function (message) {
                        reject(new Error("Could not get photo: " + message));
                    },
                    {
                        quality: 60,
                        destinationType: window.Camera.DestinationType.DATA_URL,
                        sourceType: sourceType,
                        encodingType: window.Camera.EncodingType.JPEG,
                        mediaType: window.Camera.MediaType.PICTURE,
                        correctOrientation: true,
                        saveToPhotoAlbum: false,
                        targetWidth: 1024,
                        targetHeight: 1024
                    }
                );
            } else {
                // Browser fallback: plain file input
                fallbackFilePicker().then(resolve).catch(reject);
            }
        });
    }

    function fallbackFilePicker() {
        return new Promise(function (resolve, reject) {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = function () {
                const file = input.files[0];
                if (!file) { reject(new Error("No file selected.")); return; }
                const reader = new FileReader();
                reader.onload = function (e) { resolve(e.target.result); };
                reader.onerror = function () { reject(new Error("Could not read file.")); };
                reader.readAsDataURL(file);
            };
            input.click();
        });
    }

    function takePhoto() {
        const sourceType = window.Camera ? window.Camera.PictureSourceType.CAMERA : undefined;
        return capture(sourceType);
    }

    function pickFromGallery() {
        const sourceType = window.Camera ? window.Camera.PictureSourceType.PHOTOLIBRARY : undefined;
        return capture(sourceType);
    }

    /** Converts a base64 data URL into a Blob, ready for Firebase Storage upload. */
    function dataUrlToBlob(dataUrl) {
        const parts = dataUrl.split(",");
        const mime = parts[0].match(/:(.*?);/)[1];
        const binary = atob(parts[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
        }
        return new Blob([array], { type: mime });
    }

    return {
        takePhoto: takePhoto,
        pickFromGallery: pickFromGallery,
        dataUrlToBlob: dataUrlToBlob
    };
})();
