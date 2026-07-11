// =====================================================
// FIREBASE CONFIGURATION - DIRECT CONFIG
// =====================================================

// =====================================================
// 1. FIREBASE CONFIGURATION
// =====================================================
// Ganti dengan konfigurasi Firebase Anda dari Firebase Console
// https://console.firebase.google.com/project/_/settings/general/

const firebaseConfig = {
    apiKey: "AIzaSyDbG1FApnkPbnPHcMx0T-lApl1n9SVmiaA",
    authDomain: "vault-pro-2a1cc.firebaseapp.com",
    projectId: "vault-pro-2a1cc",
    storageBucket: "vault-pro-2a1cc.firebasestorage.app",
    messagingSenderId: "754622783661",
    appId: "1:754622783661:web:f39fac58f6c3845afee624",
    measurementId: "G-YSKRSP28Y9"
};

// =====================================================
// 2. INISIALISASI FIREBASE
// =====================================================

console.log('🔧 Initializing Firebase...');
console.log('📱 Project ID:', firebaseConfig.projectId);
console.log('🔑 API Key:', firebaseConfig.apiKey ? '✅ Set' : '❌ Missing');

// Inisialisasi Firebase
let auth = null;
let firebaseInitialized = false;

try {
    // Cek apakah Firebase SDK sudah dimuat
    if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded. Check script tags.');
    }

    // Cek apakah sudah ada app yang diinisialisasi
    try {
        const existingApp = firebase.app();
        if (existingApp) {
            console.log('ℹ️ Firebase already initialized, reusing...');
            firebaseInitialized = true;
            auth = firebase.auth();
        }
    } catch (e) {
        // Belum ada app, lanjutkan
    }

    // Inisialisasi jika belum
    if (!firebaseInitialized) {
        firebase.initializeApp(firebaseConfig);
        firebaseInitialized = true;
        auth = firebase.auth();
        console.log('✅ Firebase initialized successfully');
    }

} catch (error) {
    console.error('❌ Firebase initialization error:', error);
    firebaseInitialized = false;
}

// =====================================================
// 3. SETUP AUTH PERSISTENCE
// =====================================================

if (auth) {
    try {
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(() => {
                console.log('✅ Auth persistence set to LOCAL');
            })
            .catch((error) => {
                console.error('❌ Auth persistence error:', error);
            });
    } catch (error) {
        console.error('❌ Auth setup error:', error);
    }
}

// =====================================================
// 4. EXPOSE TO GLOBAL
// =====================================================

if (typeof window !== 'undefined') {
    window.auth = auth;
    window.firebase = firebaseInitialized ? firebase : null;
    window.firebaseConfig = firebaseConfig;
    window.firebaseInitialized = firebaseInitialized;
}

console.log('🔐 Firebase Auth ready:', firebaseInitialized ? '✅ Yes' : '❌ No');
console.log('📊 Status:', firebaseInitialized ? '✅ Ready' : '❌ Error');
