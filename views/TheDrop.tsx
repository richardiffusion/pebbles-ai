import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Library, X, Box, GripHorizontal, FileText } from 'lucide-react';
import { PebbleData, CognitiveLevel } from '../types';

interface TheDropProps {
  archive: PebbleData[];
  onConstruct: (topic: string, references: PebbleData[]) => void;
  onGoToArchive: () => void;
  onSelectPebble: (pebble: PebbleData) => void;
}

export const TheDrop: React.FC<TheDropProps> = ({ archive, onConstruct, onGoToArchive, onSelectPebble }) => {
  const [topic, setTopic] = useState('');
  const [references, setReferences] = useState<PebbleData[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter out deleted items and sort by recent
  const visibleArchive = archive
    .filter(p => !p.isDeleted)
    .sort((a, b) => b.timestamp - a.timestamp);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onConstruct(topic, references);
    }
  };

  const handleDragStart = (e: React.DragEvent, pebble: PebbleData) => {
    e.dataTransfer.setData("text/pebble-id", pebble.id);
    e.dataTransfer.effectAllowed = "link";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const pebbleId = e.dataTransfer.getData("text/pebble-id");
    const pebble = archive.find(p => p.id === pebbleId);
    
    if (pebble && !references.some(r => r.id === pebble.id)) {
      setReferences(prev => [...prev, pebble]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "link";
  };

  const removeReference = (id: string) => {
    setReferences(prev => prev.filter(p => p.id !== id));
  };

  // Immersion Mode Logic
  useEffect(() => {
    if (topic) {
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    }
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [topic]);

  return (
    <div className="min-h-screen flex bg-stone-50 overflow-hidden font-sans">
      
      {/* --- LEFT: Archive Wing (22% width) --- */}
      <aside 
        className={`w-[22%] min-w-[260px] h-screen bg-stone-200/50 backdrop-blur-xl border-r border-stone-200 transition-all duration-1000 ease-in-out flex flex-col z-20 ${isTyping ? 'opacity-30 -translate-x-10' : 'opacity-100 translate-x-0'}`}
      >
        {/* Header */}
        <div 
          onClick={onGoToArchive}
          className="p-6 border-b border-stone-200/50 cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-2 text-stone-500 group-hover:text-stone-900 transition-colors">
            <Library size={18} />
            <span className="font-display font-bold text-sm tracking-widest uppercase">Archive</span>
          </div>
          <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
        </div>

        {/* Stream List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
          {visibleArchive.map(pebble => (
            <div 
              key={pebble.id}
              draggable
              onDragStart={(e) => handleDragStart(e, pebble)}
              onClick={() => onSelectPebble(pebble)}
              className="group relative p-3 rounded-lg hover:bg-white/60 transition-all cursor-pointer select-none"
            >
              {/* State A: Minimal */}
              <div className="flex items-center gap-3">
                 <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pebble.isVerified ? 'bg-green-500' : 'bg-stone-400'}`} />
                 <span className="text-sm font-medium text-stone-500 group-hover:text-stone-900 truncate">
                    {pebble.topic}
                 </span>
              </div>
              
              {/* State B: Peek (Hover Expansion) */}
              <div className="hidden group-hover:block mt-3 pl-4 animate-in slide-in-from-top-1 fade-in duration-200">
                  <p className="text-[10px] text-stone-400 font-serif leading-relaxed line-clamp-2">
                     {pebble.content[CognitiveLevel.ELI5].summary}
                  </p>
                  <div className="flex gap-1 mt-2">
                     {pebble.content[CognitiveLevel.ELI5].keywords.slice(0,2).map(k => (
                        <span key={k} className="text-[9px] bg-stone-200/50 text-stone-500 px-1.5 py-0.5 rounded">#{k}</span>
                     ))}
                  </div>
              </div>
            </div>
          ))}
          
          {visibleArchive.length === 0 && (
             <div className="text-center py-10 text-xs text-stone-400 italic">
                Your mind is clear.<br/>Cast your first pebble.
             </div>
          )}
        </div>
      </aside>


      {/* --- RIGHT: Input Zone (Fluid) --- */}
      <main 
        className="flex-1 relative flex flex-col items-center justify-center p-8 transition-all duration-700"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
         {/* Background Texture */}
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/clean-gray-paper.png')] opacity-40 pointer-events-none" />

         <form onSubmit={handleSubmit} className="w-full max-w-2xl z-10 relative">
            
            {/* Context Capsules */}
            <div className={`flex flex-wrap gap-2 mb-6 min-h-[32px] transition-all duration-500 ${references.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {references.map(ref => (
                   <div key={ref.id} className="flex items-center gap-2 bg-white border border-stone-200 text-stone-600 px-3 py-1.5 rounded-full text-xs shadow-sm animate-in zoom-in">
                      <Box size={12} className="text-stone-400" />
                      <span className="font-medium max-w-[150px] truncate">{ref.topic}</span>
                      <button 
                        type="button" 
                        onClick={() => removeReference(ref.id)} 
                        className="hover:text-stone-900 ml-1"
                      >
                         <X size={12} />
                      </button>
                   </div>
                ))}
                {references.length > 0 && (
                    <span className="text-xs text-stone-400 flex items-center italic animate-pulse">
                        Context active
                    </span>
                )}
            </div>

            {/* Input Field */}
            <div className="relative group">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Cast a pebble..."
                className="w-full bg-transparent border-b-2 border-stone-200 text-3xl md:text-5xl font-display font-light py-4 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-stone-800 transition-all duration-500 text-center"
                autoFocus
              />
              <button 
                type="submit"
                className={`absolute right-0 top-1/2 -translate-y-1/2 text-stone-800 opacity-0 transition-opacity duration-300 ${topic ? 'opacity-100' : ''}`}
              >
                <ArrowRight size={32} strokeWidth={1.5} />
              </button>
            </div>
            
            {/* Helper Text */}
            <div className={`mt-8 text-center transition-opacity duration-700 ${isTyping || references.length > 0 ? 'opacity-0' : 'opacity-40'}`}>
               <p className="text-stone-400 text-sm flex items-center justify-center gap-2">
                  <GripHorizontal size={16} />
                  <span>Drag from archive to reference context</span>
               </p>
            </div>

         </form>

      </main>

    </div>
  );
};