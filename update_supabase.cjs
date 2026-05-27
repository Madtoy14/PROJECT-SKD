
const fs = require("fs");
let text = fs.readFileSync("src/lib/supabase.ts", "utf8");

text = text.replace(
  "await supabase!.rpc(\"get_random_soal\", { limit_count: 10 })",
  "await supabase!.rpc(\"get_random_soal\", { limit_count: gameMode === \"survival\" ? 500 : 10 })"
);

text = text.replace(
  /return SOAL_SKD\.sort\(\(\) => 0\.5 - Math\.random\(\)\)\.slice\(0, 10\);/g,
  "return SOAL_SKD.sort(() => 0.5 - Math.random()).slice(0, gameMode === \"survival\" ? 500 : 10);"
);

fs.writeFileSync("src/lib/supabase.ts", text);
console.log("Updated supabase.ts");

