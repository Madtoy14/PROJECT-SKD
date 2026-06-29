const fs = require('fs');

let qsc = fs.readFileSync('src/context/QuizSessionContext.tsx', 'utf8');
qsc = qsc.replace(/await supabase\s*\n/g, 'await supabase!\n');
qsc = qsc.replace(/import React, \{ createContext, useContext, useState, useEffect, ReactNode \} from 'react';/, "import React, { createContext, useContext, useState, useEffect } from 'react';\nimport type { ReactNode } from 'react';");
fs.writeFileSync('src/context/QuizSessionContext.tsx', qsc);

let trns = fs.readFileSync('src/lib/transactions.ts', 'utf8');
trns = trns.replace(/await supabase\s*\n/g, 'await supabase!\n');
fs.writeFileSync('src/lib/transactions.ts', trns);

console.log('Fixed multiline supabase');
