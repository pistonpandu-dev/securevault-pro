// =====================================================
// DASHBOARD SCRIPT - WITH INVITE FEATURE
// =====================================================

// =====================================================
// STATE
// =====================================================
let currentUser = null;
let isProcessing = false;
let processingInterval = null;
let timeInterval = null;
let allVideos = [];
let deletedVideosList = [];
let database = null;
let inviteRef = null;
let devicesRef = null;
let currentInviteCode = null;
let connectedDevices = [];
let pendingInvites = [];

// =====================================================
// DOM ELEMENTS
// =====================================================
const userEmailEl = document.getElementById('userEmail');
const userEmailTopEl = document.getElementById('userEmailTop');
const totalVideosEl = document.getElementById('totalVideos');
const totalSizeEl = document.getElementById('totalSize');
const vcsCountEl = document.getElementById('vcsCount');
const waCountEl = document.getElementById('waCount');
const processingTimeEl = document.getElementById('processingTime');
const progressPercentageEl = document.getElementById('progressPercentage');
const mediaGrid = document.getElementById('mediaGrid');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const filterSize = document.getElementById('filterSize');
const sortBy = document.getElementById('sortBy');
const videoCountLabel = document.getElementById('videoCountLabel');

// Invite elements
const inviteSection = document.getElementById('inviteSection');
const inviteTab = document.getElementById('inviteTab');
const devicesGrid = document.getElementById('devicesGrid');
const pendingInvitesEl = document.getElementById('pendingInvites');
const generateInviteBtn = document.getElementById('generateInviteBtn');
const inviteLinkContainer = document.getElementById('inviteLinkContainer');
const inviteLinkInput = document.getElementById('inviteLinkInput');
const copyInviteBtn = document.getElementById('copyInviteBtn');
const revokeInviteBtn = document.getElementById('revokeInviteBtn');
const deviceCountLabel = document.getElementById('deviceCountLabel');
const inviteBadge = document.getElementById('inviteBadge');
const notificationBadge = document.getElementById('notificationBadge');
const notificationBtn = document.getElementById('notificationBtn');

// Modal elements
const inviteModal = document.getElementById('inviteModal');
const inviteCodeInput = document.getElementById('inviteCodeInput');
const joinDeviceBtn = document.getElementById('joinDeviceBtn');
const inviteModalError = document.getElementById('inviteModalError');

// =====================================================
// INITIALIZE FIREBASE DATABASE
// =====================================================
function initDatabase() {
    try {
        if (typeof firebase !== 'undefined' && firebase.database) {
            database = firebase.database();
            console.log('✅ Firebase Database initialized');
            return true;
        } else {
            console.warn('⚠️ Firebase Database not available');
            return false;
        }
    } catch (error) {
        console.error('❌ Firebase Database init error:', error);
        return false;
    }
}

// =====================================================
// INVITE FUNCTIONS
// =====================================================

// Generate invite link
async function generateInvite() {
    try {
        if (!currentUser) {
            showToast('Silakan login terlebih dahulu', 'warning');
            return;
        }

        const inviteCode = generateId() + generateId();
        currentInviteCode = inviteCode;
        const baseUrl = window.location.origin;
        const inviteLink = `${baseUrl}?invite=${inviteCode}`;

        // Save to Firebase
        if (database) {
            const inviteData = {
                code: inviteCode,
                createdBy: currentUser.uid,
                createdByEmail: currentUser.email,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
                used: false,
                usedBy: null,
                usedAt: null
            };

            await database.ref(`invites/${inviteCode}`).set(inviteData);
            console.log('✅ Invite saved to database');

            // Listen for when this invite is used
            database.ref(`invites/${inviteCode}/used`).on('value', (snapshot) => {
                const used = snapshot.val();
                if (used === true) {
                    showToast('🔔 Ada perangkat baru yang bergabung!', 'success');
                    loadConnectedDevices();
                    updateNotificationBadge();
                }
            });
        }

        // Show invite link
        inviteLinkInput.value = inviteLink;
        inviteLinkContainer.style.display = 'block';
        generateInviteBtn.textContent = 'Tautan Dibuat';
        generateInviteBtn.disabled = true;

        showToast('✅ Tautan undangan berhasil dibuat!', 'success');
        console.log('📎 Invite link:', inviteLink);

    } catch (error) {
        console.error('❌ Generate invite error:', error);
        showToast('❌ Gagal membuat tautan undangan', 'error');
    }
}

// Copy invite link
function copyInviteLink() {
    const link = inviteLinkInput.value;
    if (!link) {
        showToast('Tidak ada tautan untuk disalin', 'warning');
        return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link)
            .then(() => {
                showToast('✅ Tautan berhasil disalin!', 'success');
                copyInviteBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyInviteBtn.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            })
            .catch(() => {
                fallbackCopy(link);
            });
    } else {
        fallbackCopy(link);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('✅ Tautan berhasil disalin!', 'success');
    } catch (err) {
        showToast('❌ Gagal menyalin tautan', 'error');
    }
    document.body.removeChild(textarea);
}

// Revoke invite
async function revokeInvite() {
    if (!currentInviteCode) {
        showToast('Tidak ada tautan yang aktif', 'warning');
        return;
    }

    const confirmed = confirm('Yakin ingin membatalkan tautan undangan?');
    if (!confirmed) return;

    try {
        if (database) {
            await database.ref(`invites/${currentInviteCode}`).remove();
        }

        currentInviteCode = null;
        inviteLinkContainer.style.display = 'none';
        generateInviteBtn.textContent = 'Buat Tautan Undangan';
        generateInviteBtn.disabled = false;
        inviteLinkInput.value = '';

        showToast('✅ Tautan undangan dibatalkan', 'success');
        console.log('✅ Invite revoked');

    } catch (error) {
        console.error('❌ Revoke invite error:', error);
        showToast('❌ Gagal membatalkan tautan', 'error');
    }
}

// Load connected devices
async function loadConnectedDevices() {
    if (!database || !currentUser) return;

    try {
        const snapshot = await database.ref(`devices/${currentUser.uid}`).once('value');
        const data = snapshot.val();
        
        connectedDevices = [];
        if (data) {
            Object.keys(data).forEach(key => {
                connectedDevices.push({
                    id: key,
                    ...data[key]
                });
            });
        }

        renderDevices(connectedDevices);
        deviceCountLabel.textContent = `${connectedDevices.length} perangkat terhubung`;

    } catch (error) {
        console.error('❌ Load devices error:', error);
    }
}

// Render devices
function renderDevices(devices) {
    if (!devicesGrid) return;

    if (!devices || devices.length === 0) {
        devicesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-wifi"></i>
                <p>Belum ada perangkat terhubung</p>
                <span style="font-size: 13px; color: rgba(255,255,255,0.3);">Bagikan tautan undangan untuk menghubungkan perangkat lain</span>
            </div>
        `;
        return;
    }

    devicesGrid.innerHTML = devices.map(device => `
        <div class="device-card">
            <div class="device-icon">
                <i class="fas ${device.type === 'mobile' ? 'fa-mobile-alt' : 'fa-desktop'}"></i>
            </div>
            <div class="device-info">
                <div class="device-name">${escapeHtml(device.name || 'Perangkat')}</div>
                <div class="device-detail">${escapeHtml(device.browser || 'Unknown')}</div>
                <div class="device-time">Bergabung: ${formatDate(device.joinedAt)}</div>
            </div>
            <div class="device-status ${device.online ? 'online' : 'offline'}">
                <span class="status-dot"></span>
                ${device.online ? 'Online' : 'Offline'}
            </div>
            <button class="device-remove-btn" onclick="removeDevice('${device.id}')" title="Hapus perangkat">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Remove device
async function removeDevice(deviceId) {
    if (!database || !currentUser) return;

    const confirmed = confirm('Yakin ingin menghapus perangkat ini?');
    if (!confirmed) return;

    try {
        await database.ref(`devices/${currentUser.uid}/${deviceId}`).remove();
        showToast('✅ Perangkat berhasil dihapus', 'success');
        loadConnectedDevices();
        updateNotificationBadge();
    } catch (error) {
        console.error('❌ Remove device error:', error);
        showToast('❌ Gagal menghapus perangkat', 'error');
    }
}

// =====================================================
// JOIN DEVICE (from invite link)
// =====================================================
async function joinDevice() {
    const inviteCode = inviteCodeInput.value.trim();
    if (!inviteCode) {
        inviteModalError.textContent = 'Masukkan tautan undangan';
        inviteModalError.style.display = 'block';
        return;
    }

    // Extract code from URL if full link is pasted
    let code = inviteCode;
    if (inviteCode.includes('invite=')) {
        const params = new URLSearchParams(inviteCode.split('?')[1]);
        code = params.get('invite') || code;
    }

    try {
        inviteModalError.style.display = 'none';
        joinDeviceBtn.disabled = true;
        joinDeviceBtn.textContent = 'Memproses...';

        // Check invite in database
        if (!database) {
            throw new Error('Database tidak tersedia');
        }

        const snapshot = await database.ref(`invites/${code}`).once('value');
        const inviteData = snapshot.val();

        if (!inviteData) {
            throw new Error('Tautan undangan tidak valid atau sudah kadaluarsa');
        }

        if (inviteData.used) {
            throw new Error('Tautan undangan sudah digunakan');
        }

        if (inviteData.expiresAt < Date.now()) {
            throw new Error('Tautan undangan sudah kadaluarsa');
        }

        if (inviteData.createdBy === currentUser.uid) {
            throw new Error('Anda tidak bisa bergabung dengan tautan Anda sendiri');
        }

        // Register device
        const deviceInfo = {
            id: generateId(),
            name: navigator.userAgent.includes('Mobile') ? 'Perangkat Mobile' : 'Perangkat Desktop',
            browser: navigator.userAgent.split(' ').slice(-1)[0] || 'Unknown',
            type: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
            online: true,
            joinedAt: Date.now(),
            userId: currentUser.uid,
            userEmail: currentUser.email
        };

        await database.ref(`devices/${inviteData.createdBy}/${deviceInfo.id}`).set(deviceInfo);
        
        // Mark invite as used
        await database.ref(`invites/${code}`).update({
            used: true,
            usedBy: currentUser.uid,
            usedAt: Date.now()
        });

        showToast('✅ Berhasil bergabung dengan perangkat!', 'success');
        closeInviteModal();
        loadConnectedDevices();
        updateNotificationBadge();

    } catch (error) {
        console.error('❌ Join device error:', error);
        inviteModalError.textContent = error.message || 'Gagal bergabung';
        inviteModalError.style.display = 'block';
    } finally {
        joinDeviceBtn.disabled = false;
        joinDeviceBtn.textContent = 'Gabung Sekarang';
    }
}

// =====================================================
// NOTIFICATION FUNCTIONS
// =====================================================
function updateNotificationBadge() {
    const total = connectedDevices.length + pendingInvites.length;
    if (total > 0) {
        notificationBadge.textContent = total;
        notificationBadge.style.display = 'flex';
        inviteBadge.textContent = total;
        inviteBadge.style.display = 'flex';
    } else {
        notificationBadge.style.display = 'none';
        inviteBadge.style.display = 'none';
    }
}

// =====================================================
// MODAL FUNCTIONS
// =====================================================
function openInviteModal() {
    inviteModal.style.display = 'flex';
    inviteCodeInput.value = '';
    inviteModalError.style.display = 'none';
    inviteCodeInput.focus();
}

function closeInviteModal() {
    inviteModal.style.display = 'none';
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    if (e.target === inviteModal) {
        closeInviteModal();
    }
});

// =====================================================
// NAVIGATION
// =====================================================
function navigateTo(page) {
    const mediaSection = document.getElementById('mediaSection');
    const inviteSectionEl = document.getElementById('inviteSection');

    // Hide all sections
    if (mediaSection) mediaSection.style.display = 'none';
    if (inviteSectionEl) inviteSectionEl.style.display = 'none';

    // Show selected section
    if (page === 'invite') {
        if (inviteSectionEl) inviteSectionEl.style.display = 'block';
        loadConnectedDevices();
    } else {
        if (mediaSection) mediaSection.style.display = 'block';
    }

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (activeNav) activeNav.classList.add('active');
}

// =====================================================
// CHECK INVITE IN URL
// =====================================================
function checkUrlForInvite() {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    if (inviteCode) {
        // Clean URL
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        // Open modal
        inviteCodeInput.value = inviteCode;
        openInviteModal();
    }
}

// =====================================================
// GENERATE VIDEOS (existing)
// =====================================================
function generateVideos() {
    const videos = [];
    
    const vcsSizes = [45, 78, 112, 156, 203, 267, 334, 412, 501, 623];
    const vcsNames = [
        'VCS 1.mp4', 'VCS 2.mp4', 'VCS 3.mp4', 'VCS 4.mp4', 'VCS 5.mp4',
        'VCS 6.mp4', 'VCS 7.mp4', 'VCS 8.mp4', 'VCS 9.mp4', 'VCS 10.mp4'
    ];
    
    for (let i = 0; i < 10; i++) {
        const sizeMB = vcsSizes[i] + (Math.random() * 20 - 10);
        const sizeGB = sizeMB / 1024;
        videos.push({
            id: `vcs_${i+1}`,
            name: vcsNames[i],
            type: 'vcs',
            sizeMB: Math.max(20, sizeMB),
            size: sizeMB >= 1024 ? `${(sizeMB / 1024).toFixed(2)} GB` : `${sizeMB.toFixed(1)} MB`,
            sizeGB: Math.max(0.02, sizeGB),
            resolution: ['720p', '1080p', '4K'][Math.floor(Math.random() * 3)],
            duration: Math.floor(Math.random() * 3600) + 60,
            durationFormatted: formatDuration(Math.floor(Math.random() * 3600) + 60),
            icon: 'fa-phone-alt',
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
    }
    
    const waNames = [];
    for (let i = 10; i <= 50; i++) {
        waNames.push(`WhatsApp video ${i}.mp4`);
    }
    
    const waSizes = [];
    for (let i = 0; i < 41; i++) {
        const sizeMB = 30 + (i / 40) * 4470 + (Math.random() * 100 - 50);
        waSizes.push(Math.max(20, Math.min(4500, sizeMB)));
    }
    
    for (let i = waSizes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [waSizes[i], waSizes[j]] = [waSizes[j], waSizes[i]];
    }
    
    for (let i = 0; i < 41; i++) {
        const sizeMB = waSizes[i];
        const sizeGB = sizeMB / 1024;
        const num = i + 10;
        videos.push({
            id: `wa_${num}`,
            name: `WhatsApp video ${num}.mp4`,
            type: 'whatsapp',
            sizeMB: Math.max(20, sizeMB),
            size: sizeMB >= 1024 ? `${(sizeMB / 1024).toFixed(2)} GB` : `${sizeMB.toFixed(1)} MB`,
            sizeGB: Math.max(0.02, sizeGB),
            resolution: ['720p', '1080p', '4K', '8K'][Math.floor(Math.random() * 4)],
            duration: Math.floor(Math.random() * 7200) + 30,
            durationFormatted: formatDuration(Math.floor(Math.random() * 7200) + 30),
            icon: 'fa-whatsapp',
            date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000)
        });
    }
    
    return videos;
}

// =====================================================
// RENDER FUNCTIONS (existing)
// =====================================================
function renderMediaItems(videos) {
    mediaGrid.innerHTML = '';
    
    if (!videos || videos.length === 0) {
        mediaGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>Tidak ada video tersedia</p>
                <span style="font-size: 13px; color: rgba(255,255,255,0.3);">Klik refresh untuk memuat</span>
            </div>
        `;
        videoCountLabel.textContent = '0 video';
        return;
    }
    
    const sorted = [...videos].sort((a, b) => {
        if (a.type === 'vcs' && b.type !== 'vcs') return -1;
        if (a.type !== 'vcs' && b.type === 'vcs') return 1;
        return a.name.localeCompare(b.name);
    });
    
    sorted.forEach((video, index) => {
        const item = document.createElement('div');
        item.className = 'media-item';
        item.style.animation = `fadeInUp 0.5s ease ${index * 0.05}s forwards`;
        item.style.opacity = '0';
        
        let sizeColor = '#00D2A0';
        if (video.sizeGB > 1) sizeColor = '#FFB800';
        if (video.sizeGB > 3) sizeColor = '#FF4757';
        
        const typeBadge = video.type === 'vcs' 
            ? '<span class="type-badge vcs">VCS</span>' 
            : '<span class="type-badge wa">WA</span>';
        
        const iconColor = video.type === 'vcs' ? '#6C63FF' : '#25D366';
        
        item.innerHTML = `
            <div class="video-icon" style="color: ${iconColor};">
                <i class="fab ${video.icon}"></i>
            </div>
            ${typeBadge}
            <div class="video-name" title="${escapeHtml(video.name)}">${escapeHtml(video.name)}</div>
            <div class="video-resolution">${video.resolution}</div>
            <div class="video-size" style="color: ${sizeColor}; font-weight: 700;">${video.size}</div>
            <div class="video-duration">${video.durationFormatted}</div>
        `;
        
        mediaGrid.appendChild(item);
    });
    
    videoCountLabel.textContent = `${videos.length} video`;
}

function updateStats(videos) {
    const total = videos.length;
    const totalGB = videos.reduce((sum, v) => sum + v.sizeGB, 0);
    const vcsCount = videos.filter(v => v.type === 'vcs').length;
    const waCount = videos.filter(v => v.type === 'whatsapp').length;
    
    totalVideosEl.textContent = total;
    vcsCountEl.textContent = vcsCount;
    waCountEl.textContent = waCount;
    
    const sizeText = totalGB >= 1 ? `${totalGB.toFixed(2)} GB` : `${(totalGB * 1024).toFixed(1)} MB`;
    totalSizeEl.textContent = sizeText;
}

function filterVideos() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const sizeFilter = filterSize.value;
    const sort = sortBy.value;
    
    let filtered = [...allVideos];
    
    if (searchTerm) {
        filtered = filtered.filter(v => v.name.toLowerCase().includes(searchTerm));
    }
    
    if (sizeFilter !== 'all') {
        filtered = filtered.filter(v => {
            if (sizeFilter === 'small') return v.sizeMB < 500;
            if (sizeFilter === 'medium') return v.sizeMB >= 500 && v.sizeMB < 2000;
            if (sizeFilter === 'large') return v.sizeMB >= 2000;
            return true;
        });
    }
    
    if (sort === 'name') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'size') {
        filtered.sort((a, b) => b.sizeMB - a.sizeMB);
    } else if (sort === 'duration') {
        filtered.sort((a, b) => b.duration - a.duration);
    }
    
    renderMediaItems(filtered);
}

// =====================================================
// SIMULATE DELETION (existing - shortened for space)
// =====================================================
function simulateDeletion(videos) {
    return new Promise((resolve) => {
        if (!videos || videos.length === 0) {
            resolve();
            return;
        }

        const overlay = document.getElementById('processingOverlay');
        const progressFill = document.getElementById('progressFill');
        const progressPercentText = document.getElementById('progressPercentText');
        const elapsedTimeEl = document.getElementById('elapsedTime');
        const estimatedTimeEl = document.getElementById('estimatedTime');
        const processedVideosEl = document.getElementById('processedVideos');
        const deletedSizeEl = document.getElementById('deletedSize');
        const processingStatus = document.getElementById('processingStatus');
        const videoList = document.getElementById('videoProcessingList');
        const processingSpeedEl = document.getElementById('processingSpeed');
        const cancelBtn = document.getElementById('cancelProcessing');
        
        overlay.style.display = 'flex';
        isProcessing = true;
        
        let progress = 0;
        let elapsedSeconds = 0;
        let processedCount = 0;
        let deletedSize = 0;
        let lastDeletedSize = 0;
        let speedUpdateTime = Date.now();
        let deletedIds = [];
        
        const totalSize = videos.reduce((sum, v) => sum + v.sizeGB, 0);
        const totalVideosCount = videos.length;
        const totalEstimatedSeconds = 34 * 3600;
        const startTime = Date.now();
        
        cancelBtn.style.display = 'block';
        cancelBtn.onclick = () => {
            if (confirm('Yakin ingin membatalkan proses?')) {
                clearInterval(processingInterval);
                clearInterval(timeInterval);
                isProcessing = false;
                overlay.style.display = 'none';
                showToast('Proses dibatalkan', 'warning');
                cancelBtn.style.display = 'none';
            }
        };
        
        function updateVideoList() {
            const remaining = videos.filter(v => !deletedIds.includes(v.id));
            const showCount = Math.min(5, remaining.length);
            const showVideos = remaining.slice(0, showCount);
            
            if (videoList) {
                videoList.innerHTML = `
                    <div style="font-weight: 600; margin-bottom: 8px; color: rgba(255,255,255,0.7);">
                        <i class="fas fa-spinner fa-spin"></i> Sedang memproses:
                    </div>
                    ${showVideos.map(v => {
                        const icon = v.type === 'vcs' ? 'fa-phone-alt' : 'fa-whatsapp';
                        const color = v.type === 'vcs' ? '#6C63FF' : '#25D366';
                        return `
                        <div class="processing-video-item">
                            <i class="fas ${icon}" style="color: ${color};"></i>
                            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(v.name)}</span>
                            <span style="color: rgba(255,255,255,0.4); font-size: 12px;">${v.size}</span>
                            <span class="processing-status-text">
                                <i class="fas fa-spinner fa-spin"></i>
                            </span>
                        </div>
                    `}).join('')}
                    ${remaining.length > showCount ? `
                        <div style="text-align: center; color: rgba(255,255,255,0.3); font-size: 13px; margin-top: 8px;">
                            + ${remaining.length - showCount} video lainnya...
                        </div>
                    ` : ''}
                    ${deletedIds.length > 0 ? `
                        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05);">
                            <div style="font-size: 13px; color: var(--success);">
                                ✅ ${deletedIds.length} video terhapus
                            </div>
                        </div>
                    ` : ''}
                `;
            }
        }
        
        function updateProgress() {
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            elapsedSeconds = elapsed;
            
            progress = Math.min(100, (elapsed / totalEstimatedSeconds) * 100);
            
            const newProcessedCount = Math.min(totalVideosCount, Math.floor((progress / 100) * totalVideosCount));
            
            if (newProcessedCount > processedCount) {
                const remaining = videos.filter(v => !deletedIds.includes(v.id));
                const toAdd = remaining.slice(0, newProcessedCount - processedCount);
                toAdd.forEach(v => deletedIds.push(v.id));
                processedCount = newProcessedCount;
            }
            
            deletedSize = (progress / 100) * totalSize;
            
            const timeDiff = (now - speedUpdateTime) / 1000;
            if (timeDiff > 1) {
                const sizeDiff = (deletedSize - lastDeletedSize) * 1024;
                const speed = sizeDiff / timeDiff;
                if (processingSpeedEl) {
                    processingSpeedEl.textContent = speed > 0 ? `${speed.toFixed(2)} MB/s` : '0 MB/s';
                }
                lastDeletedSize = deletedSize;
                speedUpdateTime = now;
            }
            
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressPercentText) progressPercentText.textContent = `${progress.toFixed(2)}%`;
            if (progressPercentageEl) progressPercentageEl.textContent = `${progress.toFixed(1)}%`;
            
            if (elapsedTimeEl) elapsedTimeEl.textContent = formatTime(elapsedSeconds);
            if (processingTimeEl) processingTimeEl.textContent = formatTime(elapsedSeconds);
            
            const remainingSeconds = totalEstimatedSeconds - elapsedSeconds;
            const estimatedCompletion = new Date(Date.now() + remainingSeconds * 1000);
            if (estimatedTimeEl) {
                estimatedTimeEl.textContent = estimatedCompletion.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
            
            if (processedVideosEl) processedVideosEl.textContent = `${processedCount} / ${totalVideosCount}`;
            if (deletedSizeEl) {
                deletedSizeEl.textContent = deletedSize >= 1 ? `${deletedSize.toFixed(2)} GB` : `${(deletedSize * 1024).toFixed(1)} MB`;
            }
            
            const statuses = [
                { max: 15, text: '🔍 Memindai dan mengidentifikasi video...' },
                { max: 30, text: '🗑️ Menghapus file VCS...' },
                { max: 50, text: '🗑️ Menghapus file WhatsApp...' },
                { max: 70, text: '🔄 Mengoptimalkan dan membersihkan data...' },
                { max: 85, text: '📊 Memverifikasi integritas data...' },
                { max: 95, text: '✨ Menyelesaikan proses penghapusan...' },
                { max: 100, text: '✅ Proses penghapusan selesai!' }
            ];
            
            const currentStatus = statuses.find(s => progress <= s.max) || statuses[statuses.length - 1];
            if (processingStatus) processingStatus.textContent = currentStatus.text;
            
            updateVideoList();
            
            if (progress >= 100) {
                clearInterval(processingInterval);
                clearInterval(timeInterval);
                isProcessing = false;
                if (cancelBtn) cancelBtn.style.display = 'none';
                
                setTimeout(() => {
                    overlay.style.display = 'none';
                    resolve();
                }, 1500);
            }
        }
        
        processingInterval = setInterval(updateProgress, 2000);
        timeInterval = setInterval(() => {
            if (!isProcessing) return;
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            if (elapsedTimeEl) elapsedTimeEl.textContent = formatTime(elapsed);
            if (processingTimeEl) processingTimeEl.textContent = formatTime(elapsed);
        }, 1000);
        
        updateProgress();
        updateVideoList();
    });
}

// =====================================================
// DELETE ALL VIDEOS (existing)
// =====================================================
async function deleteAllVideos() {
    try {
        console.log('🗑️ Delete all videos started');
        
        if (isProcessing) {
            showToast('⚠️ Proses sedang berjalan!', 'warning');
            return;
        }
        
        if (!allVideos || allVideos.length === 0) {
            showToast('ℹ️ Tidak ada video yang bisa dihapus!', 'info');
            return;
        }
        
        const totalSize = allVideos.reduce((sum, v) => sum + v.sizeGB, 0);
        const vcsCount = allVideos.filter(v => v.type === 'vcs').length;
        const waCount = allVideos.filter(v => v.type === 'whatsapp').length;
        
        const confirmed = confirm(
            `⚠️ PERINGATAN! \n\n` +
            `Anda akan menghapus:\n` +
            `• ${vcsCount} video VCS\n` +
            `• ${waCount} video WhatsApp\n` +
            `Total: ${allVideos.length} video\n` +
            `Total ukuran: ${totalSize >= 1 ? totalSize.toFixed(2) + ' GB' : (totalSize * 1024).toFixed(1) + ' MB'}\n\n` +
            `Proses ini akan memakan waktu sekitar 34 jam.\n\n` +
            `Yakin ingin melanjutkan?`
        );
        
        if (!confirmed) {
            console.log('❌ Deletion cancelled by user');
            return;
        }
        
        console.log('✅ Deletion confirmed, starting process...');
        
        await simulateDeletion(allVideos);
        
        allVideos = [];
        renderMediaItems([]);
        updateStats([]);
        
        showToast('✅ Semua video berhasil dihapus!', 'success');
        console.log('✅ All videos deleted successfully');
        
    } catch (error) {
        console.error('❌ Error in deleteAllVideos:', error);
        showToast('❌ Gagal menghapus video. Silakan coba lagi.', 'error');
    }
}

// =====================================================
// REFRESH DATA (existing)
// =====================================================
function refreshData() {
    try {
        if (isProcessing) {
            showToast('⚠️ Tidak bisa refresh saat proses berjalan', 'warning');
            return;
        }
        
        console.log('🔄 Refreshing data...');
        allVideos = generateVideos();
        filterVideos();
        updateStats(allVideos);
        
        const vcsCount = allVideos.filter(v => v.type === 'vcs').length;
        const waCount = allVideos.filter(v => v.type === 'whatsapp').length;
        showToast(`✅ ${vcsCount} VCS + ${waCount} WhatsApp = ${allVideos.length} video dimuat`, 'success');
        console.log(`✅ Loaded ${allVideos.length} videos`);
        
    } catch (error) {
        console.error('❌ Error refreshing data:', error);
        showToast('❌ Gagal memuat data', 'error');
    }
}

// =====================================================
// LOGOUT (existing)
// =====================================================
async function handleLogout() {
    if (isProcessing) {
        showToast('⚠️ Tidak bisa logout saat proses berjalan!', 'warning');
        return;
    }
    
    try {
        if (window.auth) {
            await window.auth.signOut();
        }
        window.location.href = 'index.html';
    } catch (error) {
        console.error('❌ Logout error:', error);
        showToast('❌ Gagal logout', 'error');
    }
}

// =====================================================
// EVENT LISTENERS
// =====================================================

// Existing listeners
if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', deleteAllVideos);
}
if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}
if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshData);
}
if (searchInput) {
    searchInput.addEventListener('input', debounce(filterVideos, 300));
}
if (filterSize) {
    filterSize.addEventListener('change', filterVideos);
}
if (sortBy) {
    sortBy.addEventListener('change', filterVideos);
}

// Invite listeners
if (generateInviteBtn) {
    generateInviteBtn.addEventListener('click', generateInvite);
}
if (copyInviteBtn) {
    copyInviteBtn.addEventListener('click', copyInviteLink);
}
if (revokeInviteBtn) {
    revokeInviteBtn.addEventListener('click', revokeInvite);
}
if (joinDeviceBtn) {
    joinDeviceBtn.addEventListener('click', joinDevice);
}

// Navigation
if (inviteTab) {
    inviteTab.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('invite');
    });
}

// Notification click
if (notificationBtn) {
    notificationBtn.addEventListener('click', () => {
        navigateTo('invite');
    });
}

// =====================================================
// SIDEBAR TOGGLE
// =====================================================
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    const nav = document.querySelector('.sidebar-nav');
    if (nav) {
        nav.classList.toggle('active');
    }
});

// =====================================================
// AUTH STATE
// =====================================================
if (window.auth) {
    window.auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            if (userEmailEl) userEmailEl.textContent = user.email;
            if (userEmailTopEl) userEmailTopEl.textContent = user.email;
            
            // Init database
            const dbInit = initDatabase();
            if (dbInit) {
                await loadConnectedDevices();
                updateNotificationBadge();
            }
            
            refreshData();
            checkUrlForInvite();
            
            console.log('👤 User authenticated:', user.email);
        } else {
            console.log('👤 User not authenticated, redirecting...');
            window.location.href = 'index.html';
        }
    });
} else {
    console.error('❌ Auth not available');
    window.location.href = 'index.html';
}

// =====================================================
// KEYBOARD SHORTCUTS
// =====================================================
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        refreshData();
    }
    if (e.key === 'Escape' && isProcessing) {
        const cancelBtn = document.getElementById('cancelProcessing');
        if (cancelBtn && cancelBtn.style.display !== 'none') {
            cancelBtn.click();
        }
    }
    if (e.key === 'Escape' && inviteModal && inviteModal.style.display === 'flex') {
        closeInviteModal();
    }
});

console.log('✅ Dashboard initialized with invite feature');
console.log(`📊 Total videos loaded: ${allVideos.length}`);
