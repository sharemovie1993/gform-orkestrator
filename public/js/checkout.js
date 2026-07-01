// ── CHECKOUT.JS — Checkout Form & Slug Check Module ──
// Depends on: state.js, gateway.js

function openCheckout(planId, title, price) {
    currentPlan = planId;
    currentPlanTitle = title;
    currentBasePrice = price;
    
    summaryPlanName.textContent = title;
    summaryBasePrice.textContent = 'Rp ' + price.toLocaleString('id-ID');
    
    // Show Form Step, hide others
    document.getElementById('checkoutFormStep').style.display = 'block';
    document.getElementById('checkoutInvoiceStep').style.display = 'none';
    document.getElementById('checkoutSuccessStep').style.display = 'none';

    checkoutModal.classList.add('active');
    
    // Reset slug check status
    isSlugAvailable = true;
    const statusEl = document.getElementById('slugCheckStatus');
    if (statusEl) statusEl.style.display = 'none';
    const btn = document.getElementById('btnProcessCheckout');
    if (btn) btn.disabled = false;
    
    loadPaymentChannels();
}

function closeCheckout() {
    checkoutModal.classList.remove('active');
    stopPollingStatus();
    document.getElementById('checkoutFormStep').style.display = 'none';
    document.getElementById('checkoutInvoiceStep').style.display = 'none';
    document.getElementById('checkoutSuccessStep').style.display = 'none';
}

function toggleAdvancedDbSettings() {
    const chk = document.getElementById('advancedDbCheckbox');
    const container = document.getElementById('advancedDbSettingsContainer');
    if (chk && chk.checked) {
        container.style.display = 'block';
    } else if (container) {
        container.style.display = 'none';
        document.getElementById('schoolSupabaseUrlInput').value = '';
        document.getElementById('schoolSupabaseKeyInput').value = '';
    }
}

function checkSlugAvailabilityDebounced() {
    const statusEl = document.getElementById('slugCheckStatus');
    const slugInput = document.getElementById('schoolSlugInput');
    const btn = document.getElementById('btnProcessCheckout');
    const slug = slugInput.value.trim().toLowerCase();

    if (slugCheckTimeout) clearTimeout(slugCheckTimeout);
    
    if (!slug) {
        statusEl.style.display = 'none';
        if (isGatewayOnline) btn.disabled = false;
        isSlugAvailable = true;
        return;
    }

    statusEl.style.display = 'block';
    statusEl.style.color = 'var(--text-muted)';
    statusEl.textContent = '⏳ Memeriksa ketersediaan subdomain...';
    btn.disabled = true;

    slugCheckTimeout = setTimeout(() => {
        checkSlugAvailability(slug);
    }, 600);
}

function checkSlugAvailability(slug) {
    const statusEl = document.getElementById('slugCheckStatus');
    const btn = document.getElementById('btnProcessCheckout');

    fetch(`${API_BASE}/api/license/check-slug/${slug}`)
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                if (res.available) {
                    statusEl.style.color = '#10B981';
                    statusEl.textContent = '🟢 Subdomain tersedia!';
                    isSlugAvailable = true;
                    if (isGatewayOnline) {
                        btn.disabled = false;
                        btn.innerHTML = '⚡ PROSES PEMBAYARAN SEKARANG';
                    }
                } else if (res.is_recovery) {
                    statusEl.style.color = '#F59E0B';
                    statusEl.textContent = '🟡 Subdomain terdaftar (Kedaluwarsa). Lanjutkan untuk melakukan perpanjangan lisensi Anda.';
                    isSlugAvailable = true;
                    if (isGatewayOnline) {
                        btn.disabled = false;
                        btn.innerHTML = '🔄 AKTIFKAN & PERPANJANG LISENSI';
                    }
                } else if (res.status_code === 'pending_payment') {
                    statusEl.style.color = '#F59E0B';
                    statusEl.textContent = '⏳ Subdomain sedang dipesan (Menunggu Pembayaran)';
                    btn.disabled = true;
                    btn.innerHTML = '⚡ PROSES PEMBAYARAN SEKARANG';
                    isSlugAvailable = false;
                } else {
                    statusEl.style.color = '#EF4444';
                    statusEl.textContent = '🔴 Subdomain sudah digunakan oleh sekolah lain yang memiliki lisensi aktif!';
                    btn.disabled = true;
                    btn.innerHTML = '⚡ PROSES PEMBAYARAN SEKARANG';
                    isSlugAvailable = false;
                }
            } else {
                statusEl.style.display = 'none';
                isSlugAvailable = true;
                if (isGatewayOnline) btn.disabled = false;
            }
        })
        .catch(err => {
            console.error(err);
            statusEl.style.display = 'none';
            isSlugAvailable = true;
            if (isGatewayOnline) btn.disabled = false;
        });
}

// Submit to API
function submitCheckoutRequest() {
    const schoolName = document.getElementById('schoolNameInput').value.trim();
    const requestedSlug = document.getElementById('schoolSlugInput').value.trim();
    
    const isAdvanced = document.getElementById('advancedDbCheckbox').checked;
    const supabaseUrl = document.getElementById('schoolSupabaseUrlInput').value.trim();
    const supabaseAnonKey = document.getElementById('schoolSupabaseKeyInput').value.trim();
    
    const btn = document.getElementById('btnProcessCheckout');
    const errorMsg = document.getElementById('checkoutErrorMsg');
    
    if (!schoolName) {
        alert('Silakan masukkan Nama Sekolah / Lembaga terlebih dahulu.');
        return;
    }
    if (!requestedSlug) {
        alert('Silakan tentukan Subdomain Pilihan sekolah Anda.');
        return;
    }
    if (!isSlugAvailable) {
        alert('Subdomain pilihan Anda sudah digunakan sekolah lain. Harap gunakan subdomain lainnya.');
        return;
    }
    if (isAdvanced && (!supabaseUrl || !supabaseAnonKey)) {
        alert('Kredensial database Supabase (URL & Anon Key) wajib diisi jika Anda memilih opsi Database Sendiri.');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner"></div> Sedang memproses transaksi...`;
    errorMsg.style.display = 'none';
    
    fetch(`${API_BASE}/api/license/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            school_name: schoolName,
            plan_id: currentPlan,
            payment_method: selectedPaymentCode,
            product_id: PRODUCT_ID,
            device_limit: 99999,
            is_unlimited: 1,
            requested_slug: requestedSlug,
            requested_supabase_url: supabaseUrl,
            requested_supabase_anon_key: supabaseAnonKey
        })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success && res.data) {
            activeCheckoutKey = res.data.license_key;
            renderInvoiceDetails(res.data, schoolName);
        } else {
            throw new Error(res.message || 'Transaksi ditolak oleh server.');
        }
    })
    .catch(err => {
        console.error(err);
        errorMsg.textContent = '❌ Terjadi kesalahan: ' + err.message;
        errorMsg.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '⚡ PROSES PEMBAYARAN SEKARANG';
    });
}
