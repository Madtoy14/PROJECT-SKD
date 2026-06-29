const fs = require("fs");
let quiz = fs.readFileSync("src/pages/Quiz.tsx", "utf8");

const searchStr = `Kumpulkan Ujian
                      </button>
                    )}
                  </div>
                )}`;

const replaceStr = `Kumpulkan Ujian
                      </button>
                    )}
                  </div>
                  </div>
                )}`;

if (quiz.includes(searchStr)) {
  quiz = quiz.replace(searchStr, replaceStr);
  fs.writeFileSync("src/pages/Quiz.tsx", quiz);
  console.log("Fixed Quiz.tsx closing tag via string match");
} else {
  console.log("String not found!");
}
