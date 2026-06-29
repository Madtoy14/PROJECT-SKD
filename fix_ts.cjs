const fs = require('fs');
const file = 'tsconfig.json';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/"noUnusedLocals":\s*true/, '"noUnusedLocals": false');
text = text.replace(/"noUnusedParameters":\s*true/, '"noUnusedParameters": false');
fs.writeFileSync(file, text);
const file2 = 'tsconfig.app.json';
if(fs.existsSync(file2)) {
  let text2 = fs.readFileSync(file2, 'utf8');
  text2 = text2.replace(/"noUnusedLocals":\s*true/, '"noUnusedLocals": false');
  text2 = text2.replace(/"noUnusedParameters":\s*true/, '"noUnusedParameters": false');
  fs.writeFileSync(file2, text2);
}
console.log('Updated tsconfig');
