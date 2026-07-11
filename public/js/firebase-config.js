// =====================================================
// FIREBASE CONFIGURATION - VERCEL ENV SUPPORT
// =====================================================

(function() {
    'use strict';

    console.log('🔧 Loading Firebase configuration from Vercel...');

    // =====================================================
    // GET ENVIRONMENT VARIABLES FROM VERCEL
    // =====================================================
    
    function getVercelEnv(key) {
        // 1. Coba dari window.__env (injected di HTML)
        if (typeof window !== 'undefined' && window.__env) {
            const value = window.__env[key];
            if (value && value !== '' && !value.includes('YOUR_') && !value.includes('${')) {
                console.log(`✅ Found ${key} in window.__env`);
                return value;
            }
        }

        // 2. Coba dari process.env (Vercel build time)
        if (typeof process !== 'undefined' && process.env) {
            const value = process.env[key];
            if (value && value !== '' && !value.includes('YOUR_') && !value.includes('${')) {
                console.log(`✅ Found ${key} in process.env`);
                return value;
            }
        }

        // 3. Coba dari meta tags
        if (typeof document !== 'undefined') {
            const metaName = key.toLowerCase().replace(/_/g, '-');
            const meta = document.querySelector(`meta[name="firebase-${metaName.replace('firebase-', '')}"]`);
            if (meta) {
                const content = meta.getAttribute('content');
                if (content && content !== '' && !content.includes('YOUR_') && !content.includes('${')) {
                    console.log(`✅ Found ${key} in meta tags`);
                    return content;
                }
            }
        }

        console.warn(`⚠️ ${key} not found in any source`);
        return null;
    }

    // =====================================================
    // BUILD FIREBASE CONFIG
    // =====================================================
    
    const firebaseConfig = {
        apiKey: getVercelEnv('FIREBASE_API_KEY') || '',
        authDomain: getVercelEnv('FIREBASE_AUTH_DOMAIN') || '',
        projectId: getVercelEnv('FIREBASE_PROJECT_ID') || '',
        storageBucket: getVercelEnv('FIREBASE_STORAGE_BUCKET') || '',
        messagingSenderId: getVercelEnv('FIREBASE_MESSAGING_SENDER_ID') || '',
        appId: getVercelEnv('FIREBASE_APP_ID') || '',
        measurementId: getVercelEnv('FIREBASE_MEASUREMENT_ID') || ''
    };

    // =====================================================
    // VALIDATE CONFIGURATION
    // =====================================================
    
    function validateConfig(config) {
        const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        const missing = [];
        const found = [];

        required.forEach(key => {
            const value = config[key];
            if (value && value !== '' && !value.includes('YOUR_') && !value.includes('${')) {
                found.push(key);
            } else {
                missing.push(key);
            }
        });

        return {
            isValid: missing.length === 0,
            missing: missing,
            found: found,
            total: required.length
        };
    }

    const validation = validateConfig(firebaseConfig);

    // =====================================================
    // LOGGING
    // =====================================================
    
    console.log('========================================');
    console.log('🔐 FIREBASE CONFIGURATION STATUS');
    console.log('========================================');
    console.log(`📊 Found ${validation.found.length}/${validation.total} variables`);
    console.log('📱 Project ID:', firebaseConfig.projectId || '❌ Not set');
    console.log('🔑 API Key:', firebaseConfig.apiKey ? '✅ Set' : '❌ Missing');
    console.log('🌐 Auth Domain:', firebaseConfig.authDomain ? '✅ Set' : '❌ Missing');
    console.log('📦 Storage Bucket:', firebaseConfig.storageBucket ? '✅ Set' : '❌ Missing');
    console.log('📨 Sender ID:', firebaseConfig.messagingSenderId ? '✅ Set' : '❌ Missing');
    console.log('📱 App ID:', firebaseConfig.appId ? '✅ Set' : '❌ Missing');
    
    if (validation.missing.length > 0) {
        console.warn('⚠️ Missing variables:', validation.missing.join(', '));
        console.warn('Please set these environment variables in Vercel:');
        validation.missing.forEach(key => {
            const envKey = key.toUpperCase().replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
            console.warn(`  - FIREBASE_${envKey}`);
        });
    }
    console.log('========================================');

    // =====================================================
    // INITIALIZE FIREBASE
    // =====================================================
    
    let auth = null;
    let firebaseInitialized = false;

    try {
        // Check if Firebase SDK is loaded
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK not loaded. Please check script tags.');
        }

        // Check if already initialized
        try {
            const existingApp = firebase.app();
            if (existingApp) {
                console.log('ℹ️ Firebase already initialized, reusing...');
                firebaseInitialized = true;
                auth = firebase.auth();
            }
        } catch (e) {
            // Not initialized yet
        }

        // Initialize if not already and config is valid
        if (!firebaseInitialized && validation.isValid) {
            firebase.initializeApp(firebaseConfig);
            firebaseInitialized = true;
            auth = firebase.auth();
            console.log('✅ Firebase initialized successfully');
        } else if (!validation.isValid) {
            console.error('❌ Firebase initialization failed: Invalid configuration');
            console.error('Missing:', validation.missing.join(', '));
        }

    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
    }

    // =====================================================
    // SETUP AUTH PERSISTENCE
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
    // EXPOSE TO GLOBAL
    // =====================================================
    
    if (typeof window !== 'undefined') {
        window.auth = auth;
        window.firebase = firebaseInitialized ? firebase : null;
        window.firebaseConfig = firebaseConfig;
        window.firebaseInitialized = firebaseInitialized;
        window.__firebaseValidation = validation;
    }

    console.log('🔐 Firebase module loaded');
    console.log('📊 Status:', firebaseInitialized ? '✅ Ready' : '❌ Error');

})();
