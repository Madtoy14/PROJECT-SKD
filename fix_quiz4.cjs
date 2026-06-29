const fs = require("fs");
let raw = fs.readFileSync("src/pages/Quiz.tsx", "utf8");
// Handle both CRLF and LF safely by splitting on \n and trimming \r later if needed, but actually it's easier to use a standard split/join.
let lines = raw.split(/\r?\n/);
lines.splice(546, 0, "                  </div>");
fs.writeFileSync("src/pages/Quiz.tsx", lines.join("\n"));
console.log("Injected missing </div>");
