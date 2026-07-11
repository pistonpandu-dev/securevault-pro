// =====================================================
// DASHBOARD SCRIPT
// =====================================================

// State
let currentUser = null;
let isProcessing = false;
let processingInterval = null;
let timeInterval = null;
let allVideos = [];

// DOM Elements
const userEmailEl = document.getElementById('userEmail');
const userEmailTopEl = document.getElementById('userEmailTop');
const totalVideosEl = document.getElementById('totalVideos');
const totalSizeEl = document.getElementById('totalSize');
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

// =====================================================
// GENERATE VIDEOS - VCS 1-10 & WHATSAPP 10-50
// =====================================================

function generateVideos() {
    const videos = [];
    
    // VCS Videos: 1-10 dengan ukuran kecil ke besar
    const vcsSizes = [
        45, 78, 112, 156, 203, 267, 334, 412, 501, 623
    ];
    
    for (let i = 0; i < 10; i++) {
        const sizeMB = vcsSizes[i] + (Math.random() * 20 - 10);
        const sizeGB = sizeMB / 1024;
        videos.push({
            id: `vcs_${i+1}`,
            name: `VCS ${i+1}.mp4`,
            type: 'vcs',
            sizeMB: sizeMB,
            size: sizeMB >= 1024 ? `${(sizeMB / 1024).toFixed(2)} GB` : `${sizeMB.toFixed(1)} MB`,
            sizeGB: sizeGB,
            resolution: ['720p', '1080p', '4K'][Math.floor(Math.random() * 3)],
            duration: Math.floor(Math.random() * 3600) + 60,
            durationFormatted: formatDuration(Math.floor(Math.random() * 3600) + 60),
            icon: 'fa-phone-alt',
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
    }
    
    // WhatsApp Videos: 10-50 dengan ukuran bervariasi
    const waSizes = [];
    for (let i = 0; i < 41; i++) {
        // Ukuran dari kecil (30MB) sampai besar (4.5GB)
        const sizeMB = 30 + (i / 40) * 4470 + (Math.random() * 100 - 50);
        waSizes.push(Math.max(20, Math.min(4500, sizeMB)));
    }
    
    // Shuffle untuk variasi
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
            sizeMB: sizeMB,
            size: sizeMB >= 1024 ? `${(sizeMB / 1024).toFixed(2)} GB` : `${sizeMB.toFixed(1)} MB`,
            sizeGB: sizeGB,
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
// RENDER FUNCTIONS
// =====================================================

function renderMediaItems(videos) {
    mediaGrid.innerHTML = '';
    
    if (!videos || videos.length === 0) {
        mediaGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>Tidak ada video tersedia</p>
            </div>
        `;
        videoCountLabel.textContent = '0 video';
        return;
    }
    
    // Sort by type: VCS first, then WhatsApp
    const sorted = [...videos].sort((a, b) => {
        if (a.type === 'vcs' && b.type !== 'vcs') return -1;
        if (a.type !== 'vcs' && b.type === 'vcs') return 1;
        return a.name.localeCompare(b.name);
    });
    
    sorted.forEach(video => {
        const item = document.createElement('div');
        item.className = 'media-item';
        
        let sizeColor = '#10b981';
        if (video.sizeGB > 1) sizeColor = '#f59e0b';
        if (video.sizeGB > 3) sizeColor = '#ef4444';
        
        const typeBadge = video.type === 'vcs' 
            ? '<span class="type-badge vcs">VCS</span>' 
            : '<span class="type-badge wa">WA</span>';
        
        item.innerHTML = `
            <div class="video-icon" style="color: ${video.type === 'vcs' ? '#667eea' : '#25D366'};">
                <i class="fab ${video.icon}"></i>
            </div>
            ${typeBadge}
            <div class="video-name" title="${escapeHtml(video.name)}">${escapeHtml(video.name)}</div>
            <div class="video-resolution">${video.resolution}</div>
            <div class="video-size" style="color: ${sizeColor}; font-weight: 600;">${video.size}</div>
            <div class="video-duration">${video.durationFormatted}</div>
        `;
        
        mediaGrid.appendChild(item);
    });
    
    videoCountLabel.textContent = `${videos.length} video`;
}

function updateStats(videos) {
    const total = videos.length;
    const totalGB = videos.reduce((sum, v) => sum + v.sizeGB, 0);
    
    document.getElementById('totalVideos').textContent = total;
    document.getElementById('totalSize').textContent = totalGB >= 1 ? `${totalGB.toFixed(2)} GB` : `${(totalGB * 1024).toFixed(1)} MB`;
    
    // Update count per type
    const vcsCount = videos.filter(v => v.type === 'vcs').length;
    const waCount = videos.filter(v => v.type === 'whatsapp').length;
    document.getElementById('vcsCount').textContent = vcsCount;
    document.getElementById('waCount').textContent = waCount;
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
// SIMULATE DELETION - 34 HOURS
// =====================================================

function simulateDeletion(videos) {
    return new Promise((resolve) => {
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
        let deletedVideos = [];
        
        const totalSize = allVideos.reduce((sum, v) => sum + v.sizeGB, 0);
        const totalVideosCount = allVideos.length;
        const totalEstimatedSeconds = 34 * 3600; // 34 jam
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
            const remaining = videos.filter(v => !deletedVideos.includes(v.id));
            const showCount = Math.min(5, remaining.length);
            const showVideos = remaining.slice(0, showCount);
            
            videoList.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 8px; color: var(--gray-700);">
                    <i class="fas fa-spinner fa-spin"></i> Sedang memproses:
                </div>
                ${showVideos.map(v => {
                    const icon = v.type === 'vcs' ? 'fa-phone-alt' : 'fa-whatsapp';
                    const color = v.type === 'vcs' ? '#667eea' : '#25D366';
                    return `
                    <div class="processing-video-item">
                        <i class="fas ${icon}" style="color: ${color};"></i>
                        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(v.name)}</span>
                        <span style="color: var(--gray-500); font-size: 12px;">${v.size}</span>
                        <span class="processing-status-text">
                            <i class="fas fa-spinner fa-spin"></i>
                        </span>
                    </div>
                `}).join('')}
                ${remaining.length > showCount ? `
                    <div style="text-align: center; color: var(--gray-500); font-size: 13px; margin-top: 8px;">
                        + ${remaining.length - showCount} video lainnya...
                    </div>
                ` : ''}
                ${deletedVideos.length > 0 ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--gray-200);">
                        <div style="font-size: 13px; color: var(--gray-500);">
                            ✅ ${deletedVideos.length} video terhapus
                        </div>
                    </div>
                ` : ''}
            `;
        }
        
        function updateProgress() {
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            elapsedSeconds = elapsed;
            
            progress = Math.min(100, (elapsed / totalEstimatedSeconds) * 100);
            
            // Update processed count berdasarkan progress
            const newProcessedCount = Math.min(totalVideosCount, Math.floor((progress / 100) * totalVideosCount));
            
            // Tambahkan video ke deleted list jika bertambah
            if (newProcessedCount > processedCount) {
                const remaining = videos.filter(v => !deletedVideos.includes(v.id));
                const toAdd = remaining.slice(0, newProcessedCount - processedCount);
                toAdd.forEach(v => deletedVideos.push(v.id));
                processedCount = newProcessedCount;
            }
            
            deletedSize = (progress / 100) * totalSize;
            
            // Calculate speed
            const timeDiff = (now - speedUpdateTime) / 1000;
            if (timeDiff > 1) {
                const sizeDiff = (deletedSize - lastDeletedSize) * 1024;
                const speed = sizeDiff / timeDiff;
                processingSpeedEl.textContent = speed > 0 ? `${speed.toFixed(2)} MB/s` : '0 MB/s';
                lastDeletedSize = deletedSize;
                speedUpdateTime = now;
            }
            
            // Update UI
            progressFill.style.width = `${progress}%`;
            progressPercentText.textContent = `${progress.toFixed(2)}%`;
            progressPercentageEl.textContent = `${progress.toFixed(1)}%`;
            
            elapsedTimeEl.textContent = formatTime(elapsedSeconds);
            processingTimeEl.textContent = formatTime(elapsedSeconds);
            
            const remainingSeconds = totalEstimatedSeconds - elapsedSeconds;
            const estimatedCompletion = new Date(Date.now() + remainingSeconds * 1000);
            estimatedTimeEl.textContent = estimatedCompletion.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            processedVideosEl.textContent = `${processedCount} / ${totalVideosCount}`;
            deletedSizeEl.textContent = deletedSize >= 1 ? `${deletedSize.toFixed(2)} GB` : `${(deletedSize * 1024).toFixed(1)} MB`;
            
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
            processingStatus.textContent = currentStatus.text;
            
            updateVideoList();
            
            if (progress >= 100) {
                clearInterval(processingInterval);
                clearInterval(timeInterval);
                isProcessing = false;
                cancelBtn.style.display = 'none';
                
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
            elapsedTimeEl.textContent = formatTime(elapsed);
            processingTimeEl.textContent = formatTime(elapsed);
        }, 1000);
        
        updateProgress();
        updateVideoList();
    });
}

// =====================================================
// DELETE ALL VIDEOS
// =====================================================

async function deleteAllVideos() {
    if (isProcessing) {
        showToast('Proses sedang berjalan!', 'warning');
        return;
    }
    
    if (allVideos.length === 0) {
        showToast('Tidak ada video yang bisa dihapus!', 'info');
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
    
    if (!confirmed) return;
    
    try {
        await simulateDeletion(allVideos);
        
        allVideos = [];
        renderMediaItems([]);
        updateStats([]);
        
        showToast('✅ Semua video berhasil dihapus!', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showToast('❌ Gagal menghapus video', 'error');
    }
}

// =====================================================
// REFRESH DATA
// =====================================================

function refreshData() {
    if (isProcessing) {
        showToast('Tidak bisa refresh saat proses berjalan', 'warning');
        return;
    }
    
    allVideos = generateVideos();
    filterVideos();
    updateStats(allVideos);
    
    const vcsCount = allVideos.filter(v => v.type === 'vcs').length;
    const waCount = allVideos.filter(v => v.type === 'whatsapp').length;
    showToast(`✅ ${vcsCount} VCS + ${waCount} WhatsApp = ${allVideos.length} video dimuat`, 'success');
}

// =====================================================
// LOGOUT
// =====================================================

async function handleLogout() {
    if (isProcessing) {
        showToast('Tidak bisa logout saat proses berjalan!', 'warning');
        return;
    }
    
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Gagal logout', 'error');
    }
}

// =====================================================
// EVENT LISTENERS
// =====================================================

deleteAllBtn.addEventListener('click', deleteAllVideos);
logoutBtn.addEventListener('click', handleLogout);
refreshBtn.addEventListener('click', refreshData);

searchInput.addEventListener('input', debounce(filterVideos, 300));
filterSize.addEventListener('change', filterVideos);
sortBy.addEventListener('change', filterVideos);

// =====================================================
// AUTH STATE
// =====================================================

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        userEmailEl.textContent = user.email;
        userEmailTopEl.textContent = user.email;
        refreshData();
    } else {
        window.location.href = 'index.html';
    }
});

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
});

// =====================================================
// SIDEBAR TOGGLE
// =====================================================

document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    const nav = document.querySelector('.sidebar-nav');
    nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
});

console.log('✅ Dashboard initialized');
console.log(`📊 Total videos: ${allVideos.length}`);
