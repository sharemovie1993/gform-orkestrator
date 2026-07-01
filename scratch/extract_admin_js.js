const fs = require('fs');
const path = require('path');

const adminHtmlPath = path.join(__dirname, '..', 'license-server', 'public', 'admin.html');
const adminJsPath = path.join(__dirname, '..', 'license-server', 'public', 'admin.js');

if (!fs.existsSync(adminHtmlPath)) {
  console.error('admin.html not found at:', adminHtmlPath);
  process.exit(1);
}

const content = fs.readFileSync(adminHtmlPath, 'utf-8');

// Find the script block
const scriptStartTag = '<script>';
const scriptEndTag = '</script>';

const startIndex = content.indexOf(scriptStartTag);
const endIndex = content.lastIndexOf(scriptEndTag);

if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
  console.error('Could not locate valid <script>...</script> tags in admin.html');
  process.exit(1);
}

// Extract Javascript code inside the script tag
const jsCode = content.substring(startIndex + scriptStartTag.length, endIndex);

fs.writeFileSync(adminJsPath, jsCode, 'utf-8');
console.log('Successfully extracted script block and wrote to:', adminJsPath);
console.log('Size of extracted JS file:', jsCode.length, 'bytes');
