// ── INVOICE.JS — Invoice Rendering Module ──
// Depends on: state.js, polling.js

// Render Invoice Step
function renderInvoiceDetails(data, schoolName) {
    document.getElementById('checkoutFormStep').style.display = 'none';
    document.getElementById('checkoutInvoiceStep').style.display = 'block';
    document.getElementById('checkoutSuccessStep').style.display = 'none';
    
    document.getElementById('invLicenseKey').textContent = data.license_key;
    document.getElementById('invNumber').textContent = data.invoice_number;
    document.getElementById('invTotalAmount').textContent = 'Rp ' + data.amount.toLocaleString('id-ID');
    
    // Channel specific info
    const channel = activePaymentChannels.find(c => c.code === data.payment_method) || { name: data.payment_method };
    document.getElementById('invMethodName').textContent = channel.name;

    // Handle Expiration Time & Deadline Display
    if (data.expired_time) {
        const expiryDate = new Date(data.expired_time * 1000);
        
        const day = String(expiryDate.getDate()).padStart(2, '0');
        const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
        const year = expiryDate.getFullYear();
        const hours = String(expiryDate.getHours()).padStart(2, '0');
        const minutes = String(expiryDate.getMinutes()).padStart(2, '0');
        const seconds = String(expiryDate.getSeconds()).padStart(2, '0');
        
        document.getElementById('invExpiryTime').textContent = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    } else {
        document.getElementById('invExpiryTime').textContent = '-';
    }

    const qrisCont = document.getElementById('qrisContainer');
    const vaCont = document.getElementById('vaContainer');
    
    if (data.payment_method === 'Manual' || data.payment_method === 'manual') {
        qrisCont.style.display = 'flex';
        vaCont.style.display = 'flex';
        document.getElementById('qrisImageCode').src = data.qr_url || '';
        
        let bankName = 'BANK';
        let accNum = '';
        let accName = '';
        
        const rawCode = data.pay_code || '';
        const parts1 = rawCode.split(' - ');
        if (parts1.length >= 2) {
            bankName = parts1[0].trim();
            const parts2 = parts1[1].split(' a/n ');
            if (parts2.length >= 2) {
                accNum = parts2[0].trim();
                accName = parts2[1].trim();
            } else {
                accNum = parts1[1].trim();
            }
        } else {
            accNum = rawCode;
        }

        // Fallback to parse account holder name from payment instructions steps if empty
        if (!accName && Array.isArray(data.payment_instructions)) {
            data.payment_instructions.forEach(group => {
                if (Array.isArray(group.steps)) {
                    group.steps.forEach(step => {
                        if (step.includes('Nama Pemilik Rekening:')) {
                            accName = step.replace('Nama Pemilik Rekening:', '').trim();
                        } else if (step.includes('Nama Pemilik Rekening')) {
                            const splitStep = step.split(':');
                            if (splitStep.length >= 2) {
                                accName = splitStep[1].trim();
                            }
                        }
                    });
                }
            });
        }

        vaCont.innerHTML = `
            <div class="pay-code-box" style="width: 100%; display: flex; flex-direction: column; gap: 8px; align-items: center; padding: 18px; background-color: var(--bg-dark); border-radius: 12px; border: 1px solid var(--border-dark); text-align: center;">
                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">REKENING TRANSFER MANUAL:</span>
                <span style="font-size: 1.3rem; font-weight: 800; color: var(--accent); margin-top: 4px;">${bankName}</span>
                <span id="manualAccNumber" style="font-family: monospace; font-size: 1.6rem; font-weight: 900; color: #fff; letter-spacing: 1px; margin: 4px 0;">${accNum}</span>
                <button class="btn-copy" style="padding: 6px 14px; font-size: 0.8rem; margin-bottom: 6px;" onclick="copyText('manualAccNumber', 'Nomor rekening ${bankName} berhasil disalin!')">📋 Salin Rekening</button>
                <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">a/n <strong style="color: var(--text-main); font-weight: 700;">${accName}</strong></span>
            </div>
            <p style="color: var(--text-muted); font-size: 0.75rem; max-width: 320px; line-height: 1.4; text-align: center; margin-top: 10px;">Lakukan transfer nominal persis sesuai dengan instruksi yang tertera di bawah.</p>
        `;
    } else {
        if (data.qr_url) {
            qrisCont.style.display = 'flex';
            vaCont.style.display = 'none';
            document.getElementById('qrisImageCode').src = data.qr_url;
        } else {
            qrisCont.style.display = 'none';
            vaCont.style.display = 'flex';
            
            vaCont.innerHTML = `
                <div class="pay-code-box">
                    <span style="font-size: 0.75rem; font-weight: bold; color: var(--text-muted);">NOMOR REKENING / KODE BAYAR:</span>
                    <span id="invPayCode" class="pay-code-number">${data.pay_code || ''}</span>
                    <button class="btn-copy" onclick="copyText('invPayCode', 'Kode pembayaran tersalin!')">📋 Salin Kode</button>
                </div>
                <p style="color: var(--text-muted); font-size: 0.75rem; max-width: 320px; line-height: 1.4; text-align: center;">Lakukan transfer nominal persis sesuai dengan instruksi yang tertera di bawah.</p>
            `;
        }
    }

    // Accordion instructions
    const instList = document.getElementById('invInstructionsList');
    instList.innerHTML = '';
    
    if (Array.isArray(data.payment_instructions)) {
        data.payment_instructions.forEach((group, index) => {
            const item = document.createElement('div');
            item.className = 'instruction-item';
            
            const stepsHtml = group.steps.map(s => `<li>${s}</li>`).join('');
            const isManual = (data.payment_method === 'Manual' || data.payment_method === 'manual');
            const displayStyle = isManual ? 'block' : 'none';
            const arrowChar = isManual ? '▲' : '▼';
            
            item.innerHTML = `
                <div class="instruction-header" onclick="toggleAccordion(${index})">
                    <span>👉 ${group.title}</span>
                    <span id="accordion-arrow-${index}">${arrowChar}</span>
                </div>
                <div class="instruction-content" id="accordion-content-${index}" style="display: ${displayStyle};">
                    <ol>${stepsHtml}</ol>
                </div>
            `;
            instList.appendChild(item);
        });
    }

    // Restore process button state for next usage
    const btn = document.getElementById('btnProcessCheckout');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '⚡ PROSES PEMBAYARAN SEKARANG';
    }

    // If expired, immediately transition to expired layout
    const nowSec = Math.floor(Date.now() / 1000);
    if (data.expired_time && nowSec > data.expired_time) {
        showExpiredStep('Batas waktu transfer telah habis. Transaksi ini kedaluwarsa.');
        return;
    }

    // Reset modal styles to default pending state if they were previously overridden by expired step
    const badge = document.getElementById('invStatusBadge');
    if (badge) {
        badge.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color: var(--accent);"></span> Menunggu Pembayaran`;
        badge.style.backgroundColor = '';
        badge.style.borderColor = '';
        badge.style.color = '';
    }
    const title = document.getElementById('invTitle');
    if (title) title.textContent = 'Tagihan Menunggu Pembayaran';
    const subtitle = document.getElementById('invSubtitle');
    if (subtitle) subtitle.textContent = 'Silakan selesaikan transfer untuk mengaktifkan lisensi sekolah Anda';
    if (qrisCont && data.qr_url) qrisCont.style.display = 'flex';
    if (vaCont && !data.qr_url) vaCont.style.display = 'flex';
    if (instList) instList.style.display = 'block';

    const bottomBox = document.getElementById('invBottomBox');
    if (bottomBox) {
        if (data.payment_method === 'Manual') {
            // ── MANAJEMEN UI PEMBAYARAN MANUAL ──
            const encodedText = encodeURIComponent(
                `Halo Admin Absenta, saya baru saja melakukan Transfer Manual untuk pendaftaran lisensi sekolah *${schoolName}*.\n\n` +
                `Berikut detail transaksinya:\n` +
                `• Kunci Lisensi: *${data.license_key}*\n` +
                `• Invoice: *${data.invoice_number}*\n` +
                `• Nominal: *Rp ${data.amount.toLocaleString('id-ID')}*\n` +
                `• Metode: Transfer Manual & QRIS Platform\n\n` +
                `Mohon bantuannya untuk melakukan aktivasi lisensi. Terima kasih! [Lampiran bukti transfer]`
            );
            const waUrl = `https://wa.me/${data.whatsapp_number}?text=${encodedText}`;
            
            const hasUploaded = data.payment_proof ? true : false;
            
            const uploadBoxHtml = hasUploaded
              ? `<div style="background-color: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 12px; text-align: center; color: #34D399; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px; width: 100%;">
                    <span>✅</span> Bukti transfer berhasil diunggah!
                 </div>`
              : `<div style="background-color: rgba(59, 130, 246, 0.05); border: 1px dashed rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 15px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 10px; width: 100%;">
                    <span style="font-size: 0.82rem; font-weight: 700; color: #60A5FA;">📤 UNGGAH BUKTI BAYAR DI SINI (WAJIB):</span>
                    <input type="file" id="receiptFileInput" accept="image/*" style="display: none;" onchange="handleReceiptUpload(this, ${JSON.stringify(data).replace(/"/g, '&quot;')}, '${schoolName.replace(/'/g, "\\'")}')">
                    <button onclick="document.getElementById('receiptFileInput').click()" id="btnUploadReceipt" class="btn-primary" style="background-color: #3B82F6; border: none; padding: 10px 18px; font-size: 0.82rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-weight: bold; color: white;">
                        <span>📁</span> Pilih Gambar Bukti
                    </button>
                    <div id="uploadReceiptStatus" style="font-size: 0.73rem; color: var(--text-muted);">Format: JPG, PNG. Ukuran maks 5MB.</div>
                 </div>`;
            
            bottomBox.innerHTML = `
                ${uploadBoxHtml}
                <a href="${waUrl}" target="_blank" class="btn-primary" style="display:flex; align-items:center; justify-content:center; gap:8px; background-color:#10B981; border:none; text-decoration:none; padding: 14px; font-weight:bold; color:white; border-radius:12px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    <span>📱</span> Konfirmasi Transfer via WhatsApp
                </a>
                <button class="btn-secondary" style="padding: 10px; font-size: 0.85rem;" onclick="cancelCheckoutProcess()">✕ Kembali / Batalkan</button>
            `;
        } else if (data.payment_method === 'Xendit') {
            // ── MANAJEMEN UI PEMBAYARAN XENDIT ──
            bottomBox.innerHTML = `
                <a href="${data.qr_url}" target="_blank" class="btn-primary" style="display:flex; align-items:center; justify-content:center; gap:8px; background-color:#3B82F6; border:none; text-decoration:none; padding: 14px; font-weight:bold; color:white; border-radius:12px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    <span>💳</span> Buka Tautan Invoice Xendit
                </a>
                <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 10px;">
                    <div class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></div>
                    Menunggu konfirmasi kelunasan Xendit...
                </div>
                <button class="btn-secondary" style="padding: 10px; font-size: 0.85rem;" onclick="cancelCheckoutProcess()">✕ Batalkan Transaksi</button>
            `;
        } else {
            // ── TRIPAY DEFAULT ──
            bottomBox.innerHTML = `
                <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <div class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></div>
                    Menunggu konfirmasi pembayaran instan...
                </div>
                <button class="btn-secondary" style="padding: 10px; font-size: 0.85rem;" onclick="cancelCheckoutProcess()">✕ Batalkan Transaksi</button>
            `;
        }
    }

    // Start Polling (Xendit & Tripay use status polling)
    startPollingStatus(data.license_key, schoolName);
}

// Accordion toggle helper
function toggleAccordion(index) {
    const content = document.getElementById(`accordion-content-${index}`);
    const arrow = document.getElementById(`accordion-arrow-${index}`);
    
    if (content.style.display === 'block') {
        content.style.display = 'none';
        arrow.textContent = '▼';
    } else {
        content.style.display = 'block';
        arrow.textContent = '▲';
    }
}

function cancelCheckoutProcess() {
    if (confirm('Apakah Anda yakin ingin membatalkan transaksi pending ini?')) {
        closeCheckout();
    }
}

// Copy utilities
function copyText(elementId, msg) {
    const text = document.getElementById(elementId).textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        alert(msg);
    }).catch(err => {
        console.error('Failed to copy', err);
    });
}

// Dynamic Receipt Upload Handler
function handleReceiptUpload(input, data, schoolName) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran gambar terlalu besar! Maksimal 5MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        const btn = document.getElementById('btnUploadReceipt');
        const status = document.getElementById('uploadReceiptStatus');

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; border:2px solid #fff; border-top-color:transparent; animation:spin 0.8s linear infinite;"></span> Mengunggah...`;
        }

        fetch(`${API_BASE}/api/license/upload-receipt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                license_key: data.license_key,
                image: base64Image
            })
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                alert('Bukti transfer berhasil diunggah! Mohon tunggu persetujuan Admin.');
                data.payment_proof = res.data.payment_proof;
                renderInvoiceDetails(data, schoolName);
            } else {
                throw new Error(res.message || 'Gagal mengunggah gambar.');
            }
        })
        .catch(err => {
            console.error(err);
            alert('Gagal mengunggah bukti bayar: ' + err.message);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span>📁</span> Pilih Gambar Bukti`;
            }
            if (status) status.textContent = '❌ Upload gagal. Silakan coba lagi.';
        });
    };
    reader.readAsDataURL(file);
}
