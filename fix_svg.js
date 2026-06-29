const fs = require('fs');
const files = ['./src/pages/Quiz.tsx', './src/pages/PembahasanTryout.tsx'];
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('document.createElement')) {
    text = text.replace(
      /let cleaned = text;\s*\/\/ Replace LaTeX delimiters safely/g,
      "let cleaned = text;\n  if (typeof document !== 'undefined') { const txt = document.createElement('textarea'); txt.innerHTML = cleaned; cleaned = txt.value; }\n  // Replace LaTeX delimiters safely"
    );
  }
  if (file.includes('Quiz.tsx')) {
    text = text.replace(
      />\{opt\.text\}<\/span>/g,
      " dangerouslySetInnerHTML={{ __html: cleanMathText(opt.text) }} ></span>"
    );
  }
  fs.writeFileSync(file, text);
}
console.log('Fixed SVG rendering.');
