// ── STATE.JS — Global State, Constants & DOM References ──
// Urutan load: PERTAMA. Semua file JS lain bergantung pada variabel di sini.

const API_BASE = 'https://api.absenta.id';
const PRODUCT_ID = 'gform-orkestrator';

let currentPlan = 'monthly';
let currentPlanTitle = 'Bulanan';
let currentBasePrice = 299000;

let selectedPaymentCode = 'QRIS2';
let activePaymentChannels = [];
let isGatewayOnline = true; // tracks live Tripay reachability

let activeCheckoutKey = '';
let pollingInterval = null;
let sslPollInterval = null;

// Real-time Subdomain check state
let slugCheckTimeout = null;
let isSlugAvailable = true;

// Modal DOM refs — diinisiasi setelah DOM ready (script di akhir body)
const checkoutModal = document.getElementById('checkoutModal');
const summaryPlanName = document.getElementById('summaryPlanName');
const summaryBasePrice = document.getElementById('summaryBasePrice');
const summaryAdminFee = document.getElementById('summaryAdminFee');
const summaryTotalPrice = document.getElementById('summaryTotalPrice');
