// updateLastOpened.js
// Requires Firebase SDKs to be loaded before this script
(function() {
    // Wait for Firebase to be available
    function updateLastOpened() {
        if (!(window.firebase && firebase.auth && firebase.firestore)) {
            setTimeout(updateLastOpened, 100);
            return;
        }
        const auth = firebase.auth();
        const db = firebase.firestore();
        auth.onAuthStateChanged(function(user) {
            if (!user) return;
            // Get formId from URL
            const urlParams = new URLSearchParams(window.location.search);
            const formId = urlParams.get('formId');
            if (!formId) return;
            db.collection('users').doc(user.uid).collection('forms').doc(formId)
                .set({ lastOpened: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
                .then(function() {
                    console.log('[updateLastOpened] Updated lastOpened for', formId);
                })
                .catch(function(err) {
                    console.warn('[updateLastOpened] Failed to update lastOpened:', err);
                });
        });
    }
    updateLastOpened();
})(); 