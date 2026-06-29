const fs = require('fs');

// 1. Fix Quiz.tsx Layout & Explanation
let quizText = fs.readFileSync('src/pages/Quiz.tsx', 'utf8');
quizText = quizText.replace(
  " ? 'flex-row' : 'flex-col items-center'}}>",
  " ? 'flex-row' : 'flex-col'}}>"
);
quizText = quizText.replace(
  '<div className="flex flex-col flex-1 h-full min-w-0">',
  '<div className="flex flex-col flex-1 h-full min-w-0 w-full max-w-5xl mx-auto">'
);
quizText = quizText.replace(
  /{currentQuestion\.explanation \|\| 'Pembahasan tidak tersedia untuk soal ini\.'}/g,
  '<span dangerouslySetInnerHTML={{ __html: cleanMathText(currentQuestion.explanation || "Pembahasan tidak tersedia untuk soal ini.") }} />'
);
fs.writeFileSync('src/pages/Quiz.tsx', quizText);

// 2. Fix PembahasanTryout.tsx Explanation
let pembText = fs.readFileSync('src/pages/PembahasanTryout.tsx', 'utf8');
pembText = pembText.replace(
  /{activeQuestion\.explanation \|\| 'Belum ada pembahasan detail untuk soal ini\.'}/g,
  '<span dangerouslySetInnerHTML={{ __html: cleanMathText(activeQuestion.explanation || "Belum ada pembahasan detail untuk soal ini.") }} />'
);
fs.writeFileSync('src/pages/PembahasanTryout.tsx', pembText);

console.log('Fixed layout and explanation SVGs!');
