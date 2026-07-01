const fetch = require('node-fetch');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY;
const TRIPAY_API_URL = process.env.TRIPAY_API_URL || 'https://tripay.co.id/api-sandbox';

if (!TRIPAY_API_KEY) {
  console.error('API Key not found in .env');
  process.exit(1);
}

fetch(`${TRIPAY_API_URL}/merchant/payment-channel`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${TRIPAY_API_KEY}`
  }
})
  .then(res => res.json())
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => console.error(err));
