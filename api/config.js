// =====================================================
// API ROUTE - FIREBASE CONFIG
// =====================================================
// File ini akan dijalankan di Vercel Serverless
// Environment variables akan terbaca di sini

module.exports = (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Ambil environment variables dari Vercel
    const config = {
        apiKey: process.env.FIREBASE_API_KEY || '',
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.FIREBASE_APP_ID || '',
        measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
    };

    // Validasi
    const missing = [];
    if (!config.apiKey) missing.push('apiKey');
    if (!config.authDomain) missing.push('authDomain');
    if (!config.projectId) missing.push('projectId');
    if (!config.storageBucket) missing.push('storageBucket');
    if (!config.messagingSenderId) missing.push('messagingSenderId');
    if (!config.appId) missing.push('appId');

    res.status(200).json({
        success: missing.length === 0,
        config: config,
        missing: missing,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
};
