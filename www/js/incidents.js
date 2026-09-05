/**
 * INCIDENTS MODULE
 * Handles everything Firestore/Storage related for incidents:
 * creating a report (with image upload + geolocation), listening to the
 * live feed, category filtering, incident detail lookup, and "my reports".
 */
const Incidents = (function () {

    const COLLECTION = "incidents";
    let unsubscribeFeed = null;
    let feedHasLoadedOnce = false;
    let cachedIncidents = []; // keeps the last snapshot in memory for filtering/detail lookup

    /**
     * Uploads the photo (if any) to Firebase Storage and creates the
     * Firestore document. Returns a Promise resolving to the new doc ID.
     */
    function create(data, photoDataUrl) {
        const user = Auth.currentUser();
        if (!user) return Promise.reject(new Error("You must be logged in to report an incident."));

        const incidentRef = db.collection(COLLECTION).doc(); // pre-generate ID so we can name the image after it
        const basePayload = {
            title: data.title,
            description: data.description,
            category: data.category,
            latitude: data.latitude,
            longitude: data.longitude,
            location: Geo.formatCoords(data.latitude, data.longitude),
            reporterId: user.uid,
            reporterName: user.displayName || "Anonymous",
            imageUrl: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        let uploadPromise = Promise.resolve(null);
        if (photoDataUrl) {
            const blob = CameraModule.dataUrlToBlob(photoDataUrl);
            const storageRef = storage.ref().child("incident-photos/" + incidentRef.id + ".jpg");
            uploadPromise = storageRef.put(blob).then(function (snapshot) {
                return snapshot.ref.getDownloadURL();
            });
        }

        return uploadPromise.then(function (imageUrl) {
            basePayload.imageUrl = imageUrl;
            return incidentRef.set(basePayload);
        }).then(function () {
            return incidentRef.id;
        });
    }

    /**
     * Subscribes to the live incident feed. `onUpdate` is called with the
     * full, ordered array of incidents every time anything changes.
     * `onNewIncident` fires once per incident that arrives AFTER the initial
     * load — this is what powers local notifications.
     */
    function listenToFeed(onUpdate, onNewIncident, onError) {
        if (unsubscribeFeed) unsubscribeFeed();
        feedHasLoadedOnce = false;

        unsubscribeFeed = db.collection(COLLECTION)
            .orderBy("createdAt", "desc")
            .limit(200)
            .onSnapshot(function (snapshot) {
                if (feedHasLoadedOnce && onNewIncident) {
                    snapshot.docChanges().forEach(function (change) {
                        if (change.type === "added") {
                            onNewIncident(mapDoc(change.doc));
                        }
                    });
                }

                cachedIncidents = snapshot.docs.map(mapDoc);
                feedHasLoadedOnce = true;
                onUpdate(cachedIncidents);
            }, function (error) {
                console.error("Feed listener error:", error);
                if (onError) onError(error);
            });
    }

    function stopListening() {
        if (unsubscribeFeed) {
            unsubscribeFeed();
            unsubscribeFeed = null;
        }
        feedHasLoadedOnce = false;
        cachedIncidents = [];
    }

    function filterByCategory(list, category) {
        if (!category || category === "All") return list;
        return list.filter(function (item) { return item.category === category; });
    }

    function getMine(uid) {
        return cachedIncidents.filter(function (item) { return item.reporterId === uid; });
    }

    function getById(id) {
        return cachedIncidents.find(function (item) { return item.id === id; });
    }

    function mapDoc(doc) {
        const data = doc.data();
        return {
            id: doc.id,
            title: data.title,
            description: data.description,
            category: data.category,
            imageUrl: data.imageUrl,
            latitude: data.latitude,
            longitude: data.longitude,
            location: data.location,
            reporterId: data.reporterId,
            reporterName: data.reporterName,
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
        };
    }

    return {
        create: create,
        listenToFeed: listenToFeed,
        stopListening: stopListening,
        filterByCategory: filterByCategory,
        getMine: getMine,
        getById: getById
    };
})();
