const { generateTOTP } = require('/var/www/licensing-server/utils/totp');
console.log(generateTOTP('ABSENTASECRETKEYMYSECURETOKEN'));
