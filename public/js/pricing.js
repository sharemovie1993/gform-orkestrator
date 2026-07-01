// ── PRICING.JS — Dynamic Pricing Rendering Module ──
// Depends on: state.js, checkout.js (openCheckout)

document.addEventListener('DOMContentLoaded', () => {
    loadDynamicPricing();
});

function loadDynamicPricing() {
    const gridContainer = document.querySelector('.pricing-grid');
    if (!gridContainer) return;

    // Show beautiful premium skeleton loading state
    gridContainer.innerHTML = `
        <div class="price-card skeleton" style="min-height: 450px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1);">
            <div class="skeleton-pulse" style="width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,0.05); margin-bottom: 20px;"></div>
            <div class="skeleton-pulse" style="width: 120px; height: 20px; background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 10px;"></div>
            <div class="skeleton-pulse" style="width: 80px; height: 14px; background: rgba(255,255,255,0.03); border-radius: 4px;"></div>
        </div>
        <div class="price-card skeleton popular" style="min-height: 450px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1);">
            <div class="skeleton-pulse" style="width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,0.05); margin-bottom: 20px;"></div>
            <div class="skeleton-pulse" style="width: 120px; height: 20px; background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 10px;"></div>
            <div class="skeleton-pulse" style="width: 80px; height: 14px; background: rgba(255,255,255,0.03); border-radius: 4px;"></div>
        </div>
        <div class="price-card skeleton" style="min-height: 450px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1);">
            <div class="skeleton-pulse" style="width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,0.05); margin-bottom: 20px;"></div>
            <div class="skeleton-pulse" style="width: 120px; height: 20px; background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 10px;"></div>
            <div class="skeleton-pulse" style="width: 80px; height: 14px; background: rgba(255,255,255,0.03); border-radius: 4px;"></div>
        </div>
    `;

    // Inject skeleton CSS animation dynamically
    if (!document.getElementById('skeleton-style')) {
        const style = document.createElement('style');
        style.id = 'skeleton-style';
        style.innerHTML = `
            @keyframes pulse {
                0% { opacity: 0.3; }
                50% { opacity: 0.8; }
                100% { opacity: 0.3; }
            }
            .skeleton-pulse {
                animation: pulse 1.5s infinite ease-in-out;
            }
        `;
        document.head.appendChild(style);
    }

    // Fetch dynamic pricing configurations from backend API
    fetch(`${API_BASE}/api/license/packages?product_id=${PRODUCT_ID}`)
        .then(response => response.json())
        .then(res => {
            if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                renderPricingCards(res.data);
            } else {
                throw new Error('Invalid data format received from packages API.');
            }
        })
        .catch(err => {
            console.error('[Dynamic Pricing Error] Failed to fetch packages:', err);
            // Fallback: render default static prices so user experience never breaks
            renderPricingCards([
                { id: 'monthly', title: 'Bulanan', price: 'Rp 299.000', duration: '30 Hari', badge: null },
                { id: 'semester', title: 'Semesteran', price: 'Rp 699.000', duration: '180 Hari', badge: 'Terpopuler' },
                { id: 'annual', title: 'Tahunan', price: 'Rp 1.199.000', duration: '365 Hari', badge: 'Terbaik' }
            ]);
        });
}

function renderPricingCards(plans) {
    const gridContainer = document.querySelector('.pricing-grid');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';

    plans.forEach(plan => {
        // Parse numerical price from string e.g. "Rp 299.000" -> 299000
        const numericPrice = parseInt(plan.price.replace(/[^\d]/g, ''), 10) || 0;

        // Class and Badge configurations
        let cardClass = 'price-card';
        let badgeHtml = '';

        if (plan.badge) {
            badgeHtml = `<div class="ribbon-badge">${plan.badge}</div>`;
            if (plan.badge.toLowerCase().includes('populer') || plan.id === 'semester') {
                cardClass += ' popular';
            } else if (plan.badge.toLowerCase().includes('baik') || plan.id === 'annual') {
                cardClass += ' best';
            }
        } else {
            // Backup styling fallback based on id
            if (plan.id === 'semester') cardClass += ' popular';
            else if (plan.id === 'annual') cardClass += ' best';
        }

        // Build feature list
        let featuresListHtml = `
            <li>Aktivasi HP Siswa: <strong>Unlimited</strong></li>
            <li>Integrasi Google Forms</li>
            <li>Sistem Anti-Screenshot</li>
            <li>Auto-Unlock Lisensi</li>
            <li>Full Support Teknis 24/7</li>
        `;

        if (plan.id === 'semester' || (plan.badge && plan.badge.toLowerCase().includes('populer'))) {
            featuresListHtml += `<li>Prioritas Update Fitur</li>`;
        } else if (plan.id === 'annual' || (plan.badge && plan.badge.toLowerCase().includes('baik'))) {
            featuresListHtml += `<li>Lebih Hemat 33%</li>`;
        }

        // Render HTML for the pricing card
        const cardHtml = `
            <div class="${cardClass}">
                ${badgeHtml}
                <h3 class="price-title">${plan.title}</h3>
                <div class="price-amount">${plan.price}<span>/ Paket</span></div>
                <div class="price-duration">Masa Aktif ${plan.duration}</div>
                <ul class="price-features-list">
                    ${featuresListHtml}
                </ul>
                <button class="btn-price" onclick="openCheckout('${plan.id}', '${plan.title}', ${numericPrice})">Beli Sekarang</button>
            </div>
        `;
        gridContainer.insertAdjacentHTML('beforeend', cardHtml);
    });
}
