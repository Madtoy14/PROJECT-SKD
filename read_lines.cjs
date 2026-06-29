const fs = require("fs");
const lines = fs.readFileSync("src/pages/Quiz.tsx", "utf8").split("\n");
for (let i = 530; i <= 555; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
