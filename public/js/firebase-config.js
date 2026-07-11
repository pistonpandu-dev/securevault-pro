// =====================================================
// FIREBASE CONFIGURATION
// =====================================================

(function() {
    'use strict';

    console.log('🔧 Loading Firebase configuration...');

    function getFirebaseConfig() {
        let config = {
            apiKey: '',
            authDomain: '',
            projectId: '',
            storageBucket: '',
            messagingSenderId: '',
            appId: '',
            measurementId: ''
        };

        // Source 1: window.__env
        if (typeof window !== 'undefined' && window.__env) {
            const env = window.__env;
            if (env.FIREBASE_API_KEY) {
                config.apiKey = env.FIREBASE_API_KEY;
                config.authDomain = env.FIREBASE_AUTH_DOMAIN || config.authDomain;
                config.projectId = env.FIREBASE_PROJECT_ID || config.projectId;
                config.storageBucket = env.FIREBASE_STORAGE_BUCKET || config.storageBucket;
                config.messagingSenderId = env.FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId;
                config.appId = env.FIREBASE_APP_ID || config.appId;
                config.measurementId = env.FIREBASE_MEASUREMENT_ID || config.measurementId;
                console.log('✅ Config loaded from window.__env');
                return config;
            }
        }

        // Source 2: process.env
        if (typeof process !== 'undefined' && process.env) {
            if (process.env.FIREBASE_API_KEY) {
                config.apiKey = process.env.FIREBASE_API_KEY;
                config.authDomain = process.env.FIREBASE_AUTH_DOMAIN || config.authDomain;
                config.projectId = process.env.FIREBASE_PROJECT_ID || config.projectId;
                config.storageBucket = process.env.FIREBASE_STORAGE_BUCKET || config.storageBucket;
                config.messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId;
                config.appId = process.env.FIREBASE_APP_ID || config.appId;
                config.measurementId = process.env.FIREBASE_MEASUREMENT_ID || config.measurementId;
                console.log('✅ Config loaded from process.env');
                return config;
            }
        }

        return config;
    }

    const firebaseConfig = getFirebaseConfig();

    function validateConfig(config) {
        const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        const missing = required.filter(key => !config[key] || config[key] === '' || config[key].includes('YOUR_'));
        return {
            isValid: missing.length === 0,
            missing: missing,
            hasConfig: config.apiKey && config.apiKey !== '' && !config.apiKey.includes('YOUR_')
        };
    }

    const validation = validateConfig(firebaseConfig);

    console.log('========================================');
    console.log('🔐 FIREBASE CONFIGURATION STATUS');
    console.log('========================================');
    console.log('📱 Project ID:', firebaseConfig.projectId || '(not set)');
    console.log('🔑 API Key:', firebaseConfig.apiKey ? '✓ Set' : '✗ Missing');
    console.log('========================================');

    let auth = null;
    let firebaseInitialized = false;

    try {
        if (typeof firebase !== 'undefined') {
            // Check if already initialized
            try {
                const existingApp = firebase.app();
                if (existingApp) {
                    console.log('ℹ️ Firebase already initialized');
                    firebaseInitialized = true;
                    auth = firebase.auth();
                }
            } catch (e) {
                // Not initialized yet
            }

            if (!firebaseInitialized && validation.isValid && validation.hasConfig) {
                firebase.initializeApp(firebaseConfig);
                firebaseInitialized = true;
                auth = firebase.auth();
                console.log('✅ Firebase initialized successfully');
            }
        } else {
            console.error('❌ Firebase SDK not loaded');
        }
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
    }

    if (auth) {
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(() => console.log('✅ Auth persistence set to LOCAL'))
            .catch((error) => console.error('❌ Auth persistence error:', error));
    }

    if (typeof window !== 'undefined') {
        window.auth = auth;
        window.firebase = firebaseInitialized ? firebase : null;
        window.firebaseConfig = firebaseConfig;
        window.firebaseInitialized = firebaseInitialized;
    }

    console.log('🔐 Firebase module loaded');
    console.log('📊 Status:', firebaseInitialized ? '✅ Ready' : '❌ Error');
})();
