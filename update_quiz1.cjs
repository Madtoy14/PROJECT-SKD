const fs = require("fs");
let quiz = fs.readFileSync("src/pages/Quiz.tsx", "utf8");

quiz = quiz.replace(
  /const \[totalScore, setTotalScore\] = useState\(0\);/,
  "const [totalScore, setTotalScore] = useState(0);\n  const [doubtful, setDoubtful] = useState<Record<number, boolean>>({});\n  const [showSidebarMobile, setShowSidebarMobile] = useState(false);\n  const getSurvivalTime = (idx: number) => Math.max(10, 60 - idx * 5);"
);

quiz = quiz.replace(
  /const TOTAL_TIME = gameMode === 'survival' \? 20 : gameMode === 'tryout' \? 100 \* 60 : 45;/,
  "const TOTAL_TIME = gameMode === 'survival' ? getSurvivalTime(currentQuestionIndex) : gameMode === 'tryout' ? 100 * 60 : 45;"
);

quiz = quiz.replace(
  /if \(gameMode !== 'tryout'\) setTimeLeft\(TOTAL_TIME\);/,
  "if (gameMode !== 'tryout') setTimeLeft(gameMode === 'survival' ? getSurvivalTime(prev + 1) : TOTAL_TIME);"
);

quiz = quiz.replace(
  /if \(gameMode === 'survival' && !isTKP && !isCorrect\) \{/,
  "if (gameMode === 'survival' && ((!isTKP && !isCorrect) || (isTKP && earned < 50))) {"
);

quiz = quiz.replace(
  /navigate\('\/result', \{ state: \{ score: currentQuestionIndex \* 50, mode: gameMode \} \}\);/,
  "navigate('/result', { state: { score: currentQuestionIndex * 50 + earned, mode: gameMode } });"
);

quiz = quiz.replace(
  /<div className="flex justify-between items-center pt-4 mt-6 border-t border-skd-border">\s*<button\s*onClick=\{\(\) => setCurrentQuestionIndex\(prev => Math\.max\(0, prev - 1\)\)\}/,
  `<div className="flex flex-col gap-4 pt-4 mt-6 border-t border-skd-border">
                    <div className="flex justify-end gap-2">
                      {selected && (
                        <button onClick={() => {
                          setAnswers(p => { const n = {...p}; delete n[currentQuestionIndex]; return n; });
                        }} className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors shadow-sm">
                          Batalkan Jawaban
                        </button>
                      )}
                      <button onClick={() => setDoubtful(p => ({...p, [currentQuestionIndex]: !p[currentQuestionIndex]}))} className={\`px-4 py-2 border rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 \${doubtful[currentQuestionIndex] ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20'}\`}>
                        Ragu-Ragu
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}`
);

quiz = quiz.replace(
  /<\/button>\n\s*<\/div>\n\s*\}\)\}\n\s*<\/div>/,
  `</button>
                    )}
                  </div>
                  </div>`
);

quiz = quiz.replace(
  /\} else if \(answers\[idx\]\) \{/,
  "} else if (doubtful[idx]) {\n                            btnClass = 'bg-red-500 text-white font-bold border-red-500 shadow-md shadow-red-500/30';\n                          } else if (answers[idx]) {"
);

fs.writeFileSync("src/pages/Quiz.tsx", quiz);
console.log("Updated Quiz.tsx phase 1");
