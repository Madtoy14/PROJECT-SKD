const fs = require("fs");
let quiz = fs.readFileSync("src/pages/Quiz.tsx", "utf8");

quiz = quiz.replace(
  /Kumpulkan Ujian\n\s*<\/button>\n\s*\}\)\n\s*<\/div>\n\s*\}\)/,
  `Kumpulkan Ujian
                      </button>
                    )}
                  </div>
                  </div>
                )}`
);

fs.writeFileSync("src/pages/Quiz.tsx", quiz);
console.log("Fixed Quiz.tsx closing tag");
