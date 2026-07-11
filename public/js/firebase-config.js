// =====================================================
// FIREBASE CONFIGURATION - LOAD FROM API
// =====================================================

(function() {
    'use strict';

    console.log('🔧 Loading Firebase configuration from API...');

    let auth = null;
    let firebaseInitialized = false;
    let configLoaded = false;

    // =====================================================
    // LOAD CONFIG FROM API
    // =====================================================
    
    async function loadFirebaseConfig() {
        try {
            console.log('📡 Fetching Firebase config from /api/config...');
            
            const response = await fetch('/api/config');
            const data = await response.json();
            
            console.log('📡 API Response:', data);
            
            if (data.success && data.config) {
                window.__firebaseConfig = data.config;
                window.__firebaseMissing = data.missing || [];
                configLoaded = true;
                
                console.log('✅ Firebase config loaded from API');
                console.log('📱 Project ID:', data.config.projectId);
                console.log('🔑 API Key:', data.config.apiKey ? '✅ Set' : '❌ Missing');
                
                if (data.missing && data.missing.length > 0) {
                    console.warn('⚠️ Missing config:', data.missing.join(', '));
                }
                
                return data.config;
            } else {
                console.error('❌ Failed to load config from API');
                console.error('Missing:', data.missing || []);
                return null;
            }
        } catch (error) {
            console.error('❌ Error loading Firebase config:', error);
            return null;
        }
    }

    // =====================================================
    // INITIALIZE FIREBASE
    // =====================================================
    
    async function initFirebase() {
        try {
            // Check if Firebase SDK is loaded
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK not loaded. Please check script tags.');
            }

            // Load config from API
            const config = await loadFirebaseConfig();
            
            if (!config || !config.apiKey) {
                throw new Error('Firebase configuration is invalid or missing');
            }

            // Check if already initialized
            try {
                const existingApp = firebase.app();
                if (existingApp) {
                    console.log('ℹ️ Firebase already initialized, reusing...');
                    firebaseInitialized = true;
                    auth = firebase.auth();
                    return true;
                }
            } catch (e) {
                // Not initialized yet
            }

            // Initialize Firebase
            firebase.initializeApp(config);
            firebaseInitialized = true;
            auth = firebase.auth();
            
            console.log('✅ Firebase initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Firebase initialization error:', error);
            firebaseInitialized = false;
            return false;
        }
    }

    // =====================================================
    // SETUP AUTH PERSISTENCE
    // =====================================================
    
    function setupAuth() {
        if (!auth) {
            console.warn('⚠️ Auth not available');
            return;
        }

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
    // CHECK AUTH STATE
    // =====================================================
    
    function checkAuthState() {
        if (!auth) return;
        
        auth.onAuthStateChanged(user => {
            if (user) {
                console.log('👤 User authenticated:', user.email);
                // Dispatch event for other scripts
                window.dispatchEvent(new CustomEvent('auth-ready', {
                    detail: { user: user }
                }));
            } else {
                console.log('👤 User not authenticated');
            }
        });
    }

    // =====================================================
    // SHOW ERROR UI
    // =====================================================
    
    function showErrorUI(message, details = '') {
        if (typeof document === 'undefined') return;

        const show = () => {
            const existing = document.getElementById('firebase-error');
            if (existing) existing.remove();

            const errorDiv = document.createElement('div');
            errorDiv.id = 'firebase-error';
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #FF4757;
                color: white;
                padding: 20px 28px;
                border-radius: 12px;
                z-index: 99999;
                box-shadow: 0 8px 24px rgba(255, 71, 87, 0.4);
                text-align: center;
                max-width: 90%;
                font-family: 'Inter', -apple-system, sans-serif;
                animation: slideDown 0.5s ease;
                border: 1px solid rgba(255,255,255,0.1);
            `;
            errorDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 14px; justify-content: center; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
                        <div style="text-align: left;">
                            <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">${message}</div>
                            ${details ? `<div style="font-weight: 400; font-size: 13px; opacity: 0.9;">${details}</div>` : ''}
                        </div>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

            document.body.prepend(errorDiv);

            if (!document.getElementById('firebase-error-styles')) {
                const style = document.createElement('style');
                style.id = 'firebase-error-styles';
                style.textContent = `
                    @keyframes slideDown {
                        from { opacity: 0; transform: translateX(-50%) translateY(-30px); }
                        to { opacity: 1; transform: translateX(-50%) translateY(0); }
                    }
                `;
                document.head.appendChild(style);
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', show);
        } else {
            show();
        }
    }

    // =====================================================
    // EXECUTION
    // =====================================================
    
    // Initialize Firebase
    initFirebase().then((success) => {
        if (success && auth) {
            setupAuth();
            checkAuthState();
        } else {
            const missing = window.__firebaseMissing || [];
            showErrorUI(
                'Firebase Configuration Error',
                missing.length > 0 
                    ? `Missing: ${missing.join(', ')}. Please set environment variables in Vercel.`
                    : 'Please check your Firebase configuration.'
            );
        }
    });

    // =====================================================
    // EXPOSE TO GLOBAL
    // =====================================================
    
    if (typeof window !== 'undefined') {
        window.auth = auth;
        window.firebase = firebaseInitialized ? firebase : null;
        window.firebaseInitialized = firebaseInitialized;
        window.__loadFirebaseConfig = loadFirebaseConfig;
        
        // Retry function
        window.__retryFirebase = async function() {
            console.log('🔄 Retrying Firebase initialization...');
            const config = await loadFirebaseConfig();
            if (config && config.apiKey) {
                window.location.reload();
            } else {
                showErrorUI(
                    'Firebase Configuration Still Error',
                    'Please check your environment variables in Vercel dashboard.'
                );
            }
        };
    }

    console.log('🔐 Firebase module loaded');
    console.log('📊 Status:', firebaseInitialized ? '✅ Ready' : '❌ Error');

})();
