/**
 * AUTH MODULE
 * Wraps Firebase Authentication (email/password) and keeps a matching
 * profile document in Firestore under users/{uid}.
 */
const Auth = (function () {

    function register(name, email, password) {
        return auth.createUserWithEmailAndPassword(email, password)
            .then(function (cred) {
                return cred.user.updateProfile({ displayName: name })
                    .then(function () {
                        return db.collection("users").doc(cred.user.uid).set({
                            name: name,
                            email: email,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    })
                    .then(function () {
                        return cred.user;
                    });
            });
    }

    function login(email, password) {
        return auth.signInWithEmailAndPassword(email, password)
            .then(function (cred) {
                return cred.user;
            });
    }

    function logout() {
        return auth.signOut();
    }

    function onAuthStateChanged(callback) {
        return auth.onAuthStateChanged(callback);
    }

    function currentUser() {
        return auth.currentUser;
    }

    return {
        register: register,
        login: login,
        logout: logout,
        onAuthStateChanged: onAuthStateChanged,
        currentUser: currentUser
    };
})();
