// ── GATEWAY.JS — Payment Gateway Module ──
// Depends on: state.js

let systemConfig = null;

// Fetch payment channels dynamically based on system config
function loadPaymentChannels() {
    const loading = document.getElementById('paymentChannelsLoading');
    const container = document.getElementById('paymentChannelsContainer');
    if (!loading || !container) return;
    
    loading.style.display = 'block';
    loading.textContent = '⏳ Memuat metode pembayaran...';
    container.style.display = 'none';
    
    // 1. Fetch system configs first (dynamic toggle, bank data, active gateway)
    fetch(`${API_BASE}/api/license/system-config`)
        .then(res => res.json())
        .then(configRes => {
            systemConfig = configRes.success ? configRes.data : null;
            const activeGateway = systemConfig ? systemConfig.active_gateway : 'tripay';
            
            // 2. Fetch payment channels
            if (activeGateway === 'xendit') {
                isGatewayOnline = true;
                removeGatewayOfflineBanner();
                
                let channels = [];
                if (systemConfig && systemConfig.manual_payment_enabled === '1') {
                    channels.push({
                        group: "Manual",
                        code: "manual",
                        name: "Transfer Manual & QRIS Platform",
                        icon_url: "logo.png",
                        fee_flat: 0,
                        fee_percent: 0
                    });
                }
                
                channels.push({
                    group: "Virtual Account",
                    code: "xendit",
                    name: "Bayar Otomatis VA / QRIS / Retail",
                    icon_url: "logo.png",
                    fee_flat: 0,
                    fee_percent: 0
                });
                
                activePaymentChannels = channels;
                selectedPaymentCode = channels[0] ? channels[0].code : 'xendit';
                renderPaymentChannels();
            } else {
                // Tripay active
                fetch(`${API_BASE}/api/license/payment-channels`)
                    .then(res => res.json())
                    .then(res => {
                        if (res.success && Array.isArray(res.data)) {
                            let channels = [];
                            
                            // Inject Manual if enabled
                            if (systemConfig && systemConfig.manual_payment_enabled === '1') {
                                channels.push({
                                    group: "Manual",
                                    code: "manual",
                                    name: "Transfer Manual & QRIS Platform",
                                    icon_url: "logo.png",
                                    fee_flat: 0,
                                    fee_percent: 0
                                });
                            }
                            
                            channels = channels.concat(res.data);
                            activePaymentChannels = channels;
                            
                            // Prevent empty selection
                            if (channels.length > 0) {
                                selectedPaymentCode = channels[0].code;
                            }

                            if (res.gateway_online === false) {
                                isGatewayOnline = false;
                                showGatewayOfflineBanner();
                            } else {
                                isGatewayOnline = true;
                                removeGatewayOfflineBanner();
                            }

                            renderPaymentChannels();
                        } else {
                            throw new Error('Response is not success');
                        }
                    })
                    .catch(err => {
                        console.error('Failed to load payment channels', err);
                        
                        // Failsafe fallback: show only Manual channel if active gateway fails
                        if (systemConfig && systemConfig.manual_payment_enabled === '1') {
                            isGatewayOnline = false;
                            activePaymentChannels = [{
                                group: "Manual",
                                code: "manual",
                                name: "Transfer Manual & QRIS Platform",
                                icon_url: "logo.png",
                                fee_flat: 0,
                                fee_percent: 0
                            }];
                            selectedPaymentCode = 'manual';
                            renderPaymentChannels();
                        } else {
                            isGatewayOnline = false;
                            showGatewayOfflineBanner();
                        }
                    });
            }
        })
        .catch(err => {
            console.error('Failed to load system config:', err);
            isGatewayOnline = false;
            showGatewayOfflineBanner();
        });
}

function showGatewayOfflineBanner() {
    removeGatewayOfflineBanner();

    // Lock the checkout button if manual is not enabled
    const isManualEnabled = systemConfig && systemConfig.manual_payment_enabled === '1';
    
    const btn = document.getElementById('btnProcessCheckout');
    if (!isManualEnabled && btn) {
        btn.disabled = true;
        btn.innerHTML = '🚫 LAYANAN PEMBAYARAN SEDANG GANGGUAN';
    }

    const banner = document.createElement('div');
    banner.id = 'gatewayOfflineBanner';
    banner.style.cssText = `
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(239, 68, 68, 0.4);
        border-radius: 10px;
        padding: 14px 16px;
        margin-top: 8px;
        margin-bottom: 4px;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        font-size: 0.82rem;
        color: #fca5a5;
        line-height: 1.5;
    `;
    
    banner.innerHTML = `
        <span style="font-size:1.2rem; flex-shrink:0;">🔴</span>
        <div>
            <strong style="display:block; color:#f87171; margin-bottom:2px;">Automated Gateway Sedang Gangguan</strong>
            Layanan pembayaran otomatis saat ini sedang gangguan. 
            ${isManualEnabled ? 'Anda masih dapat melakukan pemesanan menggunakan metode <strong>Transfer Manual & QRIS Platform</strong> di bawah.' : 'Silakan coba beberapa saat lagi.'}
        </div>
    `;

    const channelsSection = document.getElementById('paymentChannelsLoading');
    if (channelsSection) {
        channelsSection.style.display = 'none';
        channelsSection.parentNode.insertBefore(banner, channelsSection.nextSibling);
    }
}

function removeGatewayOfflineBanner() {
    const existing = document.getElementById('gatewayOfflineBanner');
    if (existing) existing.remove();

    const container = document.getElementById('paymentChannelsContainer');
    if (container) container.style.display = 'grid';
    const priceSummary = document.getElementById('priceSummaryBox');
    if (priceSummary) priceSummary.style.display = '';

    const btn = document.getElementById('btnProcessCheckout');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '⚡ PROSES PEMBAYARAN SEKARANG';
    }
}

function renderPaymentChannels() {
    const container = document.getElementById('paymentChannelsContainer');
    const loading = document.getElementById('paymentChannelsLoading');
    if (!container || !loading) return;
    
    container.innerHTML = '';
    
    activePaymentChannels.forEach(channel => {
        const isSelected = channel.code === selectedPaymentCode;
        
        const flat = parseInt(channel.fee_flat, 10) || 0;
        const percent = parseFloat(channel.fee_percent) || 0;
        const calculatedFee = flat + Math.round(currentBasePrice * (percent / 100));
        
        const card = document.createElement('div');
        card.className = `payment-channel-item ${isSelected ? 'selected' : ''}`;
        card.onclick = () => selectPaymentChannel(channel.code);
        
        card.innerHTML = `
            <img class="channel-logo" src="${channel.icon_url}" alt="${channel.name}">
            <div class="channel-info">
                <span class="channel-name">${channel.name}</span>
                <span class="channel-fee">+Rp ${calculatedFee.toLocaleString('id-ID')} fee</span>
            </div>
        `;
        container.appendChild(card);
    });
    
    loading.style.display = 'none';
    container.style.display = 'grid';
    calculateAggregatePrice();
}

function selectPaymentChannel(code) {
    selectedPaymentCode = code;
    
    const items = document.querySelectorAll('.payment-channel-item');
    items.forEach((item, idx) => {
        const channel = activePaymentChannels[idx];
        if (channel && channel.code === code) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
    
    calculateAggregatePrice();
}

function calculateAggregatePrice() {
    const channel = activePaymentChannels.find(c => c.code === selectedPaymentCode);
    if (!channel) return;
    
    const flat = parseInt(channel.fee_flat, 10) || 0;
    const percent = parseFloat(channel.fee_percent) || 0;
    const fee = flat + Math.round(currentBasePrice * (percent / 100));
    const total = currentBasePrice + fee;
    
    const summaryAdminFee = document.getElementById('summaryAdminFee');
    const summaryTotalPrice = document.getElementById('summaryTotalPrice');
    
    if (summaryAdminFee && summaryTotalPrice) {
        summaryAdminFee.textContent = 'Rp ' + fee.toLocaleString('id-ID');
        summaryTotalPrice.textContent = 'Rp ' + total.toLocaleString('id-ID');
    }
}
