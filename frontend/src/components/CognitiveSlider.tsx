import React from 'react';
import { CognitiveLevel } from '../types';
import { Brain, GraduationCap } from 'lucide-react';

interface CognitiveSliderProps {
  level: CognitiveLevel;
  onChange: (level: CognitiveLevel) => void;
}

export const CognitiveSlider: React.FC<CognitiveSliderProps> = ({ level, onChange }) => {
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-stone-900/90 backdrop-blur-md text-stone-100 p-1 rounded-full shadow-2xl flex items-center border border-stone-700">
        
        <button
          onClick={() => onChange(CognitiveLevel.ELI5)}
          className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 ${
            level === CognitiveLevel.ELI5 
              ? 'bg-stone-100 text-stone-900 shadow-sm' 
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Brain size={18} />
          <span className="text-sm font-medium">Simple</span>
        </button>

        <button
          onClick={() => onChange(CognitiveLevel.ACADEMIC)}
          className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 ${
            level === CognitiveLevel.ACADEMIC 
              ? 'bg-stone-100 text-stone-900 shadow-sm' 
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <span className="text-sm font-medium">Academic</span>
          <GraduationCap size={18} />
        </button>

      </div>
    </div>
  );
};
