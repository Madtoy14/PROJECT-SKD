const fs = require("fs");
let quiz = fs.readFileSync("src/pages/Quiz.tsx", "utf8");

// We find the exact spot
const target = `Kumpulkan Ujian
                      </button>
                    )}
                  </div>
                )}
              </motion.div>`;

const replacement = `Kumpulkan Ujian
                      </button>
                    )}
                  </div>
                  </div>
                )}
              </motion.div>`;

const index = quiz.indexOf(target);
if (index !== -1) {
  quiz = quiz.substring(0, index) + replacement + quiz.substring(index + target.length);
  fs.writeFileSync("src/pages/Quiz.tsx", quiz);
  console.log("Fixed Quiz.tsx closing tag via exact indexOf");
} else {
  console.log("Still not found!");
}
