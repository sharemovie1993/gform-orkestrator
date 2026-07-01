const fetch = require('node-fetch') || globalThis.fetch;

fetch('http://localhost:5001/api/license/payment-channels')
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));
