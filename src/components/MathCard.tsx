import React from 'react';
import { Lightbulb, Calculator } from 'lucide-react';

interface MathCardProps {
  explanation: string;
  category: string;
}

export default function MathCard({ explanation, category }: MathCardProps) {
  if (category !== 'TIU' || !explanation) {
    return <span dangerouslySetInnerHTML={{ __html: explanation }} />;
  }

  // Colorize variables and format fractions
  const formattedExplanation = explanation
    .replace(/\b([xyzabc])\b/gi, (match) => {
      const colors: Record<string, string> = {
        x: 'text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded mx-0.5 border border-emerald-500/10',
        y: 'text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded mx-0.5 border border-cyan-500/10',
        z: 'text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded mx-0.5 border border-purple-500/10',
        a: 'text-yellow-400 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded mx-0.5 border border-yellow-500/10',
        b: 'text-pink-400 font-bold bg-pink-500/10 px-1.5 py-0.5 rounded mx-0.5 border border-pink-500/10',
        c: 'text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded mx-0.5 border border-amber-500/10',
      };
      const key = match.toLowerCase();
      return colors[key] ? `<span class="${colors[key]}">${match}</span>` : match;
    })
    .replace(/(\d+)\/(\d+)/g, '<span class="inline-flex flex-col text-center align-middle mx-1 leading-none"><span class="border-b border-white/30 pb-0.5 px-1 text-[11px] font-bold text-primary">$1</span><span class="text-[11px] pt-0.5 px-1 font-bold text-primary">$2</span></span>');

  // Let's divide into step parts. We can split by paragraphs or by common bullet points.
  const paragraphs = formattedExplanation.split(/<br\s*\/?>|\n/i).map(p => p.trim()).filter(Boolean);

  let diketahuiList: string[] = [];
  let rumusList: string[] = [];
  let perhitunganList: string[] = [];

  paragraphs.forEach(para => {
    const textLower = para.toLowerCase();
    if (textLower.includes('diketahui') || textLower.includes('ditanya') || textLower.includes('diket') || textLower.includes('misal')) {
      diketahuiList.push(para);
    } else if (textLower.includes('rumus') || textLower.includes('formula') || textLower.includes('persamaan') || textLower.includes('trik') || textLower.includes('konsep')) {
      rumusList.push(para);
    } else {
      perhitunganList.push(para);
    }
  });

  // Fallback if the lists are empty, just put them in structured sections anyway
  if (diketahuiList.length === 0 && rumusList.length === 0) {
    if (paragraphs.length >= 3) {
      diketahuiList = [paragraphs[0]];
      rumusList = [paragraphs[1]];
      perhitunganList = paragraphs.slice(2);
    } else {
      perhitunganList = paragraphs;
    }
  }

  return (
    <div className="space-y-4 text-left w-full">
      {diketahuiList.length > 0 && (
        <div className="bg-surface border border-cyan-500/20 rounded-2xl p-4 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
          <h5 className="text-xs font-black text-cyan-400 mb-2 uppercase tracking-wide flex items-center gap-1.5">
            <Lightbulb size={12} /> 1. Informasi & Diketahui
          </h5>
          <div className="text-xs md:text-sm text-fg-muted space-y-1.5 font-medium leading-relaxed">
            {diketahuiList.map((para, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: para }} />
            ))}
          </div>
        </div>
      )}

      {rumusList.length > 0 && (
        <div className="bg-surface border-2 border-warning/30 rounded-2xl p-4 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning/10 rounded-full blur-xl pointer-events-none" />
          <h5 className="text-xs font-black text-warning mb-2 uppercase tracking-wide flex items-center gap-1.5">
            ⚡ 2. Rumus Utama & Konsep
          </h5>
          <div className="text-xs md:text-sm text-fg-muted space-y-1.5 font-semibold bg-warning-subtle p-3 rounded-xl border border-warning/10 leading-relaxed">
            {rumusList.map((para, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: para }} />
            ))}
          </div>
        </div>
      )}

      {perhitunganList.length > 0 && (
        <div className="bg-surface border border-purple-500/20 rounded-2xl p-4 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
          <h5 className="text-xs font-black text-purple-400 mb-2 uppercase tracking-wide flex items-center gap-1.5">
            <Calculator size={12} /> 3. Langkah Perhitungan
          </h5>
          <div className="text-xs md:text-sm text-fg-muted space-y-2.5 font-medium leading-relaxed">
            {perhitunganList.map((para, i) => (
              <p key={i} className="pl-4 border-l-2 border-purple-500/20 relative" dangerouslySetInnerHTML={{ __html: para }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
