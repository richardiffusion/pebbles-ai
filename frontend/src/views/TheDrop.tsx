import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Box, GripHorizontal, X } from 'lucide-react';
import { PebbleData } from '../types';

interface TheDropProps {
  references: PebbleData[];
  onSetReferences: (refs: PebbleData[]) => void;
  onConstruct: (topic: string) => void;
  onTypingStateChange: (isTyping: boolean) => void;
  archive: PebbleData[]; // Passed for dropping lookup
}

export const TheDrop: React.FC<TheDropProps> = ({ 
  references, 
  onSetReferences, 
  onConstruct,
  onTypingStateChange,
  archive
}) => {
  const [topic, setTopic] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onConstruct(topic);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const pebbleId = e.dataTransfer.getData("text/pebble-id");
    const pebble = archive.find(p => p.id === pebbleId);
    
    if (pebble && !references.some(r => r.id === pebble.id)) {
      const newRefs = [...references, pebble];
      onSetReferences(newRefs);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "link";
  };

  const removeReference = (id: string) => {
    onSetReferences(references.filter(p => p.id !== id));
  };

  // Immersion Mode Logic
  useEffect(() => {
    if (topic) {
      onTypingStateChange(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        onTypingStateChange(false);
      }, 3000);
    } else {
        onTypingStateChange(false);
    }
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [topic, onTypingStateChange]);

  return (
      <div 
        className="flex-1 relative flex flex-col items-center justify-center p-8 transition-all duration-700 h-screen"
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
            <div className={`mt-8 text-center transition-opacity duration-700 ${references.length > 0 ? 'opacity-0' : 'opacity-40'}`}>
               <p className="text-stone-400 text-sm flex items-center justify-center gap-2">
                  <GripHorizontal size={16} />
                  <span>Drag from archive to reference context</span>
               </p>
            </div>

         </form>

      </div>
  );
};