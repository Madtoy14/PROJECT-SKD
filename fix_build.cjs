const fs = require('fs');

// 1. Fix ErrorBoundary.tsx
let ebPath = 'src/components/ErrorBoundary.tsx';
if (fs.existsSync(ebPath)) {
  let content = fs.readFileSync(ebPath, 'utf8');
  content = content.replace(
    /import React, \{ Component, ErrorInfo, ReactNode \} from 'react';/,
    "import React, { Component } from 'react';\nimport type { ErrorInfo, ReactNode } from 'react';"
  );
  content = content.replace(/process\.env\.NODE_ENV === 'development'/g, "import.meta.env.DEV");
  fs.writeFileSync(ebPath, content);
}

// 2. Fix QuizSessionContext.tsx
let qscPath = 'src/context/QuizSessionContext.tsx';
if (fs.existsSync(qscPath)) {
  let content = fs.readFileSync(qscPath, 'utf8');
  content = content.replace(
    /import React, \{ createContext, useContext, useState, useEffect, ReactNode \} from 'react';/,
    "import React, { createContext, useContext, useState, useEffect } from 'react';\nimport type { ReactNode } from 'react';"
  );
  content = content.replace(/supabase\./g, "supabase!.");
  fs.writeFileSync(qscPath, content);
}

// 3. Fix transactions.ts
let transPath = 'src/lib/transactions.ts';
if (fs.existsSync(transPath)) {
  let content = fs.readFileSync(transPath, 'utf8');
  content = content.replace(/supabase\./g, "supabase!.");
  fs.writeFileSync(transPath, content);
}

// 4. Fix Dashboard.tsx
let dashPath = 'src/pages/Dashboard.tsx';
if (fs.existsSync(dashPath)) {
  let content = fs.readFileSync(dashPath, 'utf8');
  content = content.replace(/newEnergy: number \| null/g, "newEnergy: number");
  content = content.replace(/energy: number \| null/g, "energy: number");
  content = content.replace(/setEnergy\(([^)]+)\)/g, (match, p1) => {
    return `setEnergy(${p1} || 0)`;
  });
  // specifically fix energy math
  content = content.replace(/energy \+ 1/g, "(energy || 0) + 1");
  content = content.replace(/energy >= GAME_MODES/g, "(energy || 0) >= GAME_MODES");
  content = content.replace(/energy < cost/g, "(energy || 0) < cost");
  content = content.replace(/energy - cost/g, "(energy || 0) - cost");
  
  // also specifically fix the TS2322 in setEnergy:
  // src/pages/Dashboard.tsx(277,9): error TS2322: Type 'number | null' is not assignable to type 'number | undefined'.
  content = content.replace(/setEnergy\(newEnergy\)/g, "setEnergy(newEnergy || 0)");
  content = content.replace(/setEnergy\(currentEnergy\)/g, "setEnergy(currentEnergy || 0)");
  content = content.replace(/setEnergy\(e\)/g, "setEnergy(e || 0)");
  fs.writeFileSync(dashPath, content);
}

console.log('Fixed build errors');
