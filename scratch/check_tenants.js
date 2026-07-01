const https = require('https');

const url = 'https://xjnctgbzilrhbzsbrtpu.supabase.co/rest/v1/tenants?select=id,domain_or_slug,supabase_url,supabase_anon_key';
const anonKey = 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';

const options = {
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  }
};

console.log('Querying tenants with supabase config columns...');
https.get(url, options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n--- RESPONSE BODY ---');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
}).on('error', (err) => {
  console.error('Error contacting Supabase API:', err.message);
});
