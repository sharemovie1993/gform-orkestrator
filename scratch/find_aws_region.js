const https = require('https');

const dbIp = '2406:da12:557:f802:282c:1615:7053:1c75';

// Function to convert IPv6 string to a BigInt representation
function ipv6ToBigInt(ip) {
  const parts = ip.split(':');
  // Handle :: compaction
  let fullParts = [];
  let doubleColonIndex = parts.indexOf('');
  if (doubleColonIndex !== -1) {
    const zeroCount = 8 - parts.filter(p => p !== '').length;
    for (let i = 0; i < parts.length; i++) {
      if (i === doubleColonIndex) {
        for (let j = 0; j < zeroCount; j++) fullParts.push('0');
      } else if (parts[i] !== '') {
        fullParts.push(parts[i]);
      }
    }
  } else {
    fullParts = parts;
  }
  
  // Pad each part to 4 hex characters
  const hex = fullParts.map(p => p.padStart(4, '0')).join('');
  return BigInt('0x' + hex);
}

// Function to check if an IPv6 is in a CIDR block
function ipInCidr(ipStr, cidrStr) {
  const [prefixStr, maskStr] = cidrStr.split('/');
  const mask = parseInt(maskStr, 10);
  const ipVal = ipv6ToBigInt(ipStr);
  const prefixVal = ipv6ToBigInt(prefixStr);
  
  const shift = BigInt(128 - mask);
  return (ipVal >> shift) === (prefixVal >> shift);
}

console.log('Downloading AWS IP ranges JSON...');
https.get('https://ip-ranges.amazonaws.com/ip-ranges.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(`Successfully parsed ${json.ipv6_prefixes.length} IPv6 prefixes.`);
      
      let found = false;
      for (const prefix of json.ipv6_prefixes) {
        if (ipInCidr(dbIp, prefix.ipv6_prefix)) {
          console.log('\n🌟 MATCH FOUND!');
          console.log(`Prefix: ${prefix.ipv6_prefix}`);
          console.log(`Region: ${prefix.region}`);
          console.log(`Service: ${prefix.service}`);
          found = true;
          break;
        }
      }
      if (!found) {
        console.log('No matching AWS IPv6 prefix found in the list.');
      }
    } catch (err) {
      console.error('Error parsing JSON:', err.message);
    }
  });
}).on('error', err => {
  console.error('Error downloading AWS ranges:', err.message);
});
