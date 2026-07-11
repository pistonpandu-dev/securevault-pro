// =====================================================
// LOGIN SCRIPT - ULTRA MODERN
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
    
    // Add floating particles to login
    initLoginParticles();
});

function initLoginParticles() {
    const container = document.querySelector('.login-container');
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    particlesContainer.style.position = 'fixed';
    particlesContainer.style.top = '0';
    particlesContainer.style.left = '0';
    particlesContainer.style.width = '100%';
    particlesContainer.style.height = '100%';
    particlesContainer.style.zIndex = '-1';
    particlesContainer.style.pointerEvents = 'none';
    particlesContainer.style.overflow = 'hidden';
    document.body.prepend(particlesContainer);

    const colors = ['#6C63FF', '#FF6584', '#00D2A0', '#FFB800'];
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        const size = Math.random() * 3 + 1;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 25 + 15) + 's';
        particle.style.animationDelay = (Math.random() * 15) + 's';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.opacity = Math.random() * 0.3 + 0.1;
        particlesContainer.appendChild(particle);
    }
}

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

// Login with email
async function loginWithEmail() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
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
    
    try {
        setLoading(true);
        setError('');
        
        await auth.signInWithEmailAndPassword(email, password);
        
        if (rememberMe.checked) {
            localStorage.setItem('savedEmail', email);
        } else {
            localStorage.removeItem('savedEmail');
        }
        
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        setLoading(false);
        console.error('Login error:', error);
        
        let message = 'Email atau password salah';
        if (error.code === 'auth/user-not-found') message = 'Email tidak terdaftar';
        else if (error.code === 'auth/wrong-password') message = 'Password salah';
        else if (error.code === 'auth/too-many-requests') message = 'Terlalu banyak percobaan. Coba lagi nanti';
        else if (error.code === 'auth/network-request-failed') message = 'Gagal terhubung ke server';
        
        setError(message);
    }
}

// Login with Google
async function loginWithGoogle() {
    try {
        setLoading(true);
        setError('');
        
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        await auth.signInWithPopup(provider);
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        setLoading(false);
        console.error('Google login error:', error);
        
        let message = 'Gagal login dengan Google';
        if (error.code === 'auth/popup-closed-by-user') message = 'Login dibatalkan';
        else if (error.code === 'auth/network-request-failed') message = 'Gagal terhubung ke server';
        
        setError(message);
    }
}

// Event Listeners
loginBtn.addEventListener('click', loginWithEmail);
googleBtn.addEventListener('click', loginWithGoogle);

document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && loginForm.style.display !== 'none') {
        loginWithEmail();
    }
});

// Auth state
auth.onAuthStateChanged(user => {
    if (user && window.location.pathname.includes('dashboard.html')) {
        // Already logged in
    } else if (user && !window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'dashboard.html';
    } else if (!user && window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'index.html';
    }
});
