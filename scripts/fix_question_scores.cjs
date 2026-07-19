/**
 * fix_question_scores.cjs
 * Fix pola 0/5 di TWK & TIU — opsi salah dikasih skor 1-4 unik
 */

const fs = require('fs');
const path = require('path');

function fixScores(questions) {
  let fixed = 0;
  for (const q of questions) {
    const wrong = q.options.filter(o => o.score === 0);
    const correct = q.options.find(o => o.score === 5);
    if (!correct || wrong.length === 0) continue;

    // Assign unique scores 1-4 to wrong options
    const scores = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
    wrong.forEach((o, i) => { o.score = scores[i] || 1; });
    fixed++;
  }
  return fixed;
}

const dir = path.join(__dirname, '..', 'src', 'data', 'questions');
['twk.json', 'tiu.json'].forEach(file => {
  const fp = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  const fixed = fixScores(data);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`${file}: ${fixed}/${data.length} soal difix`);
});
