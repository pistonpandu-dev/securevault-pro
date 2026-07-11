// =====================================================
// LOGIN SCRIPT
// =====================================================

// DOM Elements
const loginForm = document.getElementById('loginForm');
const loadingScreen = document.getElementById('loadingScreen');
const errorMessage = document.getElementById('errorMessage');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const googleBtn = document.getElementById('googleBtn');
const rememberMe = document.getElementById('rememberMe');

// Load saved email
document.addEventListener('DOMContentLoaded', () => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMe.checked = true;
    }
});

// Toggle password visibility
function togglePassword() {
    const toggleIcon = document.querySelector('.toggle-password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Set loading state
function setLoading(isLoading) {
    if (isLoading) {
        loginForm.style.display = 'none';
        loadingScreen.style.display = 'block';
        errorMessage.textContent = '';
        loginBtn.disabled = true;
        googleBtn.disabled = true;
    } else {
        loginForm.style.display = 'flex';
        loadingScreen.style.display = 'none';
        loginBtn.disabled = false;
        googleBtn.disabled = false;
    }
}

// Set error message
function setError(message) {
    errorMessage.textContent = message;
    if (message) {
        errorMessage.style.animation = 'none';
        setTimeout(() => {
            errorMessage.style.animation = 'shake 0.5s ease';
        }, 10);
    }
}

// =====================================================
// LOGIN WITH EMAIL
// =====================================================

async function loginWithEmail() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    console.log('🔐 Attempting login with:', email);
    
    // Validation
    if (!email || !password) {
        setError('Harap isi email dan password');
        return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
        setError('Email tidak valid');
        return;
    }
    
    if (password.length < 6) {
        setError('Password minimal 6 karakter');
        return;
    }
    
    // Check if Firebase is initialized
    if (typeof window.auth === 'undefined' || window.auth === null) {
        setError('Firebase tidak terinisialisasi. Silakan refresh halaman.');
        console.error('❌ Firebase auth is not initialized');
        return;
    }
    
    try {
        setLoading(true);
        setError('');
        
        console.log('📡 Sending login request to Firebase...');
        const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
        
        console.log('✅ Login successful:', userCredential.user.email);
        
        if (rememberMe.checked) {
            localStorage.setItem('savedEmail', email);
        } else {
            localStorage.removeItem('savedEmail');
        }
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        setLoading(false);
        console.error('❌ Login error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        let message = 'Email atau password salah';
        if (error.code === 'auth/user-not-found') {
            message = 'Email tidak terdaftar';
        } else if (error.code === 'auth/wrong-password') {
            message = 'Password salah';
        } else if (error.code === 'auth/too-many-requests') {
            message = 'Terlalu banyak percobaan. Coba lagi nanti';
        } else if (error.code === 'auth/network-request-failed') {
            message = 'Gagal terhubung ke server. Periksa koneksi internet';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Format email tidak valid';
        } else if (error.code === 'auth/user-disabled') {
            message = 'Akun ini telah dinonaktifkan';
        } else if (error.code === 'auth/operation-not-allowed') {
            message = 'Login dengan email/password tidak diaktifkan. Hubungi admin.';
        }
        
        setError(message);
    }
}

// =====================================================
// LOGIN WITH GOOGLE
// =====================================================

async function loginWithGoogle() {
    console.log('🔐 Attempting Google login...');
    
    if (typeof window.auth === 'undefined' || window.auth === null) {
        setError('Firebase tidak terinisialisasi. Silakan refresh halaman.');
        return;
    }
    
    try {
        setLoading(true);
        setError('');
        
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        const userCredential = await window.auth.signInWithPopup(provider);
        
        console.log('✅ Google login successful:', userCredential.user.email);
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        setLoading(false);
        console.error('❌ Google login error:', error);
        
        let message = 'Gagal login dengan Google';
        if (error.code === 'auth/popup-closed-by-user') {
            message = 'Login dibatalkan';
        } else if (error.code === 'auth/network-request-failed') {
            message = 'Gagal terhubung ke server';
        } else if (error.code === 'auth/operation-not-allowed') {
            message = 'Login dengan Google tidak diaktifkan. Hubungi admin.';
        }
        
        setError(message);
    }
}

// =====================================================
// EVENT LISTENERS
// =====================================================

loginBtn.addEventListener('click', loginWithEmail);
googleBtn.addEventListener('click', loginWithGoogle);

document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && loginForm.style.display !== 'none') {
        loginWithEmail();
    }
});

// =====================================================
// AUTH STATE
// =====================================================

if (typeof window.auth !== 'undefined' && window.auth) {
    window.auth.onAuthStateChanged(user => {
        if (user && window.location.pathname.includes('dashboard.html')) {
            // Already logged in
            console.log('👤 User already logged in:', user.email);
        } else if (user && !window.location.pathname.includes('dashboard.html')) {
            console.log('👤 User logged in, redirecting to dashboard...');
            window.location.href = 'dashboard.html';
        } else if (!user && window.location.pathname.includes('dashboard.html')) {
            console.log('👤 User not logged in, redirecting to login...');
            window.location.href = 'index.html';
        }
    });
} else {
    console.error('❌ Auth not available for state monitoring');
}

console.log('✅ Login script loaded');
