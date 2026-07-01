// ── POLLING.JS — Status Polling, Success & Expired Steps ──
// Depends on: state.js, checkout.js (closeCheckout)

// Polling loop
function startPollingStatus(key, schoolName) {
    stopPollingStatus();
    
    pollingInterval = setInterval(() => {
        fetch(`${API_BASE}/api/license/check/${key}?device_id=DUMMY-CHECK`)
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) {
                    if (res.data.status === 'active') {
                        showSuccessStep(key, schoolName, res.data.requested_slug);
                    } else if (res.data.status === 'expired') {
                        showExpiredStep(res.data.message || res.message);
                    }
                }
            })
            .catch(err => console.log('Polling error:', err));
    }, 4000);
}

function stopPollingStatus() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
    if (sslPollInterval) {
        clearInterval(sslPollInterval);
        sslPollInterval = null;
    }
}

function showExpiredStep(message) {
    stopPollingStatus();
    
    // Update the status badge in checkoutInvoiceStep to show expired
    const badge = document.getElementById('invStatusBadge');
    if (badge) {
        badge.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color: var(--danger);"></span> Tagihan Kedaluwarsa`;
        badge.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        badge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        badge.style.color = 'var(--danger)';
    }
    
    const title = document.getElementById('invTitle');
    if (title) title.textContent = 'Tagihan Telah Kedaluwarsa';
    
    const subtitle = document.getElementById('invSubtitle');
    if (subtitle) subtitle.textContent = message || 'Batas waktu transfer telah habis. Silakan buat pengajuan lisensi baru.';
    
    // Hide payment barcode and instructions
    const qrisCont = document.getElementById('qrisContainer');
    const vaCont = document.getElementById('vaContainer');
    const instList = document.getElementById('invInstructionsList');
    if (qrisCont) qrisCont.style.display = 'none';
    if (vaCont) vaCont.style.display = 'none';
    if (instList) instList.style.display = 'none';
    
    // Update the waiting status box at the bottom
    const bottomBox = document.getElementById('invBottomBox');
    if (bottomBox) {
        bottomBox.innerHTML = `
            <div style="font-size: 0.85rem; color: var(--danger); font-weight: bold; text-align: center; margin-bottom: 10px;">
                ❌ Pembayaran Gagal / Kedaluwarsa
            </div>
            <button class="btn-primary" style="background-color: var(--primary); padding: 12px; font-size: 0.9rem; width: 100%; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; color: white;" onclick="closeCheckout()">Tutup Jendela</button>
        `;
    }
}

function showSuccessStep(key, schoolName, requestedSlug, isLookup) {
    stopPollingStatus();
    
    document.getElementById('checkoutFormStep').style.display = 'none';
    document.getElementById('checkoutInvoiceStep').style.display = 'none';
    document.getElementById('checkoutSuccessStep').style.display = 'block';
    
    document.getElementById('successLicenseKey').textContent = key;
    document.getElementById('successSchoolName').textContent = schoolName;
    document.getElementById('successDurationName').textContent = currentPlanTitle;

    // Generate direct link to school subdomain
    const slug = (requestedSlug || document.getElementById('schoolSlugInput').value || '').trim().toLowerCase();
    const provisioningStatusBox = document.getElementById('provisioningStatusBox');
    const provisioningLoader = document.getElementById('provisioningLoader');
    const provisioningText = document.getElementById('provisioningText');
    const successAppLinkBtn = document.getElementById('successAppLinkBtn');

    if (slug) {
        const appUrl = `https://${slug}.absenta.id`;
        if (successAppLinkBtn) {
            successAppLinkBtn.href = appUrl;
            successAppLinkBtn.textContent = `🚀 BUKA PORTAL: ${slug.toUpperCase()}.ABSENTA.ID`;
        }

        // Hide both initially while we query status
        provisioningStatusBox.style.display = 'none';
        successAppLinkBtn.style.display = 'none';

        // Check if SSL is already ready (bypass loader if yes!)
        fetch(`${API_BASE}/api/license/provision-status/${slug}`)
            .then(res => res.json())
            .then(res => {
                if (res.success && (res.ssl_active || res.ssl_ready)) {
                    // SSL is already set up and active! Show portal button instantly!
                    provisioningStatusBox.style.display = 'none';
                    successAppLinkBtn.style.display = 'inline-flex';
                } else {
                    // SSL is not ready yet (fresh checkout). Show loader and poll!
                    provisioningStatusBox.style.display = 'block';
                    provisioningLoader.innerHTML = `<div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div><span>Menyiapkan SSL Let's Encrypt & domain...</span>`;
                    provisioningLoader.style.color = '#93C5FD';
                    provisioningText.innerHTML = `Mohon tunggu sebentar, sistem sedang mengamankan subdomain sekolah Anda dengan sertifikat SSL HTTPS agar siap diakses secara aman.`;
                    successAppLinkBtn.style.display = 'none';

                    let attempts = 0;
                    sslPollInterval = setInterval(() => {
                        attempts++;
                        fetch(`${API_BASE}/api/license/provision-status/${slug}`)
                            .then(r => r.json())
                            .then(r => {
                                if (r.success && (r.ssl_active || r.ssl_ready)) {
                                    clearInterval(sslPollInterval);
                                    sslPollInterval = null;
                                    provisioningLoader.innerHTML = `✅ <span style="font-weight: bold; color: var(--success);">SSL Aktif & Portal Siap!</span>`;
                                    provisioningLoader.style.color = 'var(--success)';
                                    provisioningText.innerHTML = `Konfigurasi subdomain dan SSL HTTPS Let's Encrypt selesai. Akun admin utama telah disiapkan. Klik tombol di bawah ini untuk membuka portal sekolah Anda!`;
                                    successAppLinkBtn.style.display = 'inline-flex';
                                } else if (attempts >= 15) {
                                    clearInterval(sslPollInterval);
                                    sslPollInterval = null;
                                    provisioningLoader.innerHTML = `⚠️ <span style="font-weight: bold; color: #FBBF24;">Menyelesaikan Konfigurasi...</span>`;
                                    provisioningLoader.style.color = '#FBBF24';
                                    provisioningText.innerHTML = `Server memerlukan waktu lebih lama untuk memproses SSL. Anda tetap dapat mencoba membuka portal, jika muncul peringatan "Connection not private", mohon muat ulang (refresh) halaman setelah 1 menit.`;
                                    successAppLinkBtn.style.display = 'inline-flex';
                                }
                            })
                            .catch(err => console.log('SSL polling error:', err));
                    }, 4000);
                }
            })
            .catch(err => {
                console.log('Initial SSL check error:', err);
                // Fallback: show button
                provisioningStatusBox.style.display = 'none';
                successAppLinkBtn.style.display = 'inline-flex';
            });
    } else {
        provisioningStatusBox.style.display = 'none';
        successAppLinkBtn.style.display = 'inline-flex';
    }
}
