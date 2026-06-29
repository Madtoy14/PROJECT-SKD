const fs = require("fs");
let quiz = fs.readFileSync("src/pages/Quiz.tsx", "utf8");

quiz = quiz.replace(
  "import { X, Trophy, Skull, Users, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';",
  "import { X, Trophy, Skull, Users, ChevronUp, ChevronDown, Loader2, Menu } from 'lucide-react';"
);

quiz = quiz.replace(
  '<div className="flex justify-between items-center text-xs mb-1.5 font-space font-bold text-skd-muted">\n                <span>Soal {currentQuestionIndex + 1}{gameMode !== \'survival\' && `/${totalQuestions}`}</span>',
  `<div className="flex justify-between items-center text-xs mb-1.5 font-space font-bold text-skd-muted">
                <div className="flex items-center gap-2">
                  {gameMode === 'tryout' && (
                    <button onClick={() => setShowSidebarMobile(true)} className="lg:hidden p-1 -ml-1 text-skd-text hover:bg-skd-muted/10 rounded-md">
                      <Menu size={16} />
                    </button>
                  )}
                  <span>Soal {currentQuestionIndex + 1}{gameMode !== 'survival' && \`/\${totalQuestions}\`}</span>
                </div>`
);

quiz = quiz.replace(
  /{gameMode === 'tryout' && \(\n\s*<div className="hidden lg:flex flex-col w-72 xl:w-80 border-l border-skd-border bg-skd-card\/40 backdrop-blur-sm">/,
  `{gameMode === 'tryout' && (
          <>
          {/* Desktop Sidebar */}
          <div className="hidden lg:flex flex-col w-72 xl:w-80 border-l border-skd-border bg-skd-card/40 backdrop-blur-sm">`
);

quiz = quiz.replace(
  /<\/div>\n\s*\)\}\n\n\s*<\/div>\}/,
  `</div>
          {/* Mobile Sidebar */}
          <AnimatePresence>
            {showSidebarMobile && (
              <>
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setShowSidebarMobile(false)} />
                <motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring', damping:25, stiffness:200}} className="fixed inset-y-0 right-0 w-72 bg-skd-bg border-l border-skd-border z-50 lg:hidden flex flex-col shadow-2xl">
                  <div className="p-4 border-b border-skd-border flex justify-between items-center">
                    <h3 className="font-bold text-skd-text flex items-center gap-2 text-sm">
                      Navigasi Soal
                    </h3>
                    <button onClick={() => setShowSidebarMobile(false)} className="p-1 text-skd-muted hover:text-skd-text"><X size={18}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {['TWK', 'TIU', 'TKP'].map(cat => {
                      const catQuestions = questions.map((q, idx) => ({ q, idx })).filter(item => item.q.category === cat);
                      if (catQuestions.length === 0) return null;
                      const isOpen = openCategories[cat];
                      return (
                        <div key={cat} className="mb-4">
                          <button
                            onClick={() => toggleCategory(cat)}
                            className="flex items-center justify-between w-full p-2 mb-2 bg-skd-muted/10 hover:bg-skd-muted/20 rounded-lg text-sm font-bold text-skd-text transition-colors"
                          >
                            <span>{cat}</span>
                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="grid grid-cols-5 gap-2 overflow-hidden"
                              >
                                {catQuestions.map(({ idx }) => {
                                  const isAnswered = answers[idx] !== undefined;
                                  const isCurrent = currentQuestionIndex === idx;
                                  let btnClass = 'bg-skd-bg border-skd-border text-skd-muted hover:bg-skd-muted/20';
                                  if (isCurrent) {
                                    btnClass = 'bg-blue-500 text-white border-blue-500 shadow-md ring-2 ring-blue-500/50 ring-offset-1 ring-offset-skd-card';
                                  } else if (doubtful[idx]) {
                                    btnClass = 'bg-red-500 text-white font-bold border-red-500 shadow-md shadow-red-500/30';
                                  } else if (isAnswered) {
                                    btnClass = 'bg-skd-success text-white border-skd-success shadow-sm';
                                  }
                                  return (
                                    <button
                                      key={idx}
                                      onClick={() => { setCurrentQuestionIndex(idx); setShowSidebarMobile(false); }}
                                      className={\`w-10 h-10 rounded-md border flex items-center justify-center text-xs font-bold transition-all \${btnClass}\`}
                                    >
                                      {idx + 1}
                                    </button>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-4 border-t border-skd-border bg-skd-bg">
                    <button
                      onClick={finishTryout}
                      className="w-full py-3 bg-skd-success hover:bg-skd-success/90 text-white rounded-xl font-black shadow-lg shadow-skd-success/20 transition-all active:scale-95"
                    >
                      Kumpulkan Ujian
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          </>
        )}

      </div>}
`
);

fs.writeFileSync("src/pages/Quiz.tsx", quiz);
console.log("Updated Quiz.tsx phase 2");
