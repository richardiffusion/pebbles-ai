import React, { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
}

declare global {
  interface Window {
    mermaid: any;
  }
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    if (window.mermaid) {
      window.mermaid.initialize({ 
        startOnLoad: false,
        theme: 'neutral',
        fontFamily: 'Inter',
        securityLevel: 'loose',
      });
    }
  }, []);

  useEffect(() => {
    const renderChart = async () => {
      if (!window.mermaid || !containerRef.current || !chart) return;
      
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // Robust cleaning strategy
        let cleanChart = chart
          // Remove potential markdown code blocks
          .replace(/```mermaid/gi, '')
          .replace(/```/g, '')
          // Decode HTML entities which often break mermaid syntax (e.g. &gt; instead of >)
          .replace(/&gt;/g, '>')
          .replace(/&lt;/g, '<')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          // Remove "mermaid" word if it appears at the start (common model hallucination)
          .replace(/^mermaid\s*/i, '')
          .trim();

        // 1. Quote unquoted node labels (Heuristic to fix syntax errors like C{Text})
        // Matches id[...] where ... has no quotes and is not empty
        cleanChart = cleanChart.replace(/([A-Za-z0-9_\-]+)\s*\[([^"\[\]\n\r]+)\]/g, '$1["$2"]');
        cleanChart = cleanChart.replace(/([A-Za-z0-9_\-]+)\s*\(([^\(\)"\n\r]+)\)/g, '$1("$2")');
        cleanChart = cleanChart.replace(/([A-Za-z0-9_\-]+)\s*\{([^"\{\}\n\r]+)\}/g, '$1{"$2"}');

        // 2. Ensure newlines between statements that are jammed on one line
        // Looks for a closing bracket/paren/quote, followed by 0+ spaces, then an Identifier,
        // followed by a Start of a new node OR an arrow.
        // Example: A["Text"]B["Text"] -> A["Text"]\nB["Text"]
        // Example: A["Text"] B --> C -> A["Text"]\nB --> C
        cleanChart = cleanChart.replace(
            /([\]\)\}"'])\s*([A-Za-z0-9_\-]+)(?=\s*([\[\(\{]|-->|-\.|==>))/g, 
            '$1\n$2'
        );

        // 3. Ensure newline after graph/flowchart declaration
        // Matches "graph TD " and replaces with "graph TD\n"
        cleanChart = cleanChart.replace(/^(graph|flowchart)\s+([a-zA-Z0-9]+)/i, '$1 $2\n');
        
        // 4. Clean up any double newlines introduced
        cleanChart = cleanChart.replace(/\n\s*\n/g, '\n');
        
        const { svg } = await window.mermaid.render(id, cleanChart);
        setSvg(svg);
      } catch (error) {
        console.error("Mermaid rendering failed:", error);
        // Fallback or error display
        setSvg(`<div class="text-stone-400 text-xs p-4 text-center italic">Visualization structure could not be rendered.<br/>${(error as any).message?.split('\n')[0]}</div>`);
      }
    };

    renderChart();
  }, [chart]);

  return (
    <div 
      className="w-full flex justify-center items-center overflow-x-auto p-4 bg-white/50 rounded-lg border border-stone-200 min-h-[100px]"
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};