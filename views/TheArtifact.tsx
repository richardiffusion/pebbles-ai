import React, { useState } from 'react';
import { PebbleData, CognitiveLevel, ContentBlock } from '../types';
import { CognitiveSlider } from '../components/CognitiveSlider';
import { CheckCircle2, Circle, ArrowLeft, Quote, Activity, Maximize2, X, ExternalLink } from 'lucide-react';

interface TheArtifactProps {
  pebble: PebbleData;
  onVerify: (pebbleId: string) => void;
  onBack: () => void;
}

const ImageBlock: React.FC<{ block: ContentBlock; isHero: boolean }> = ({ block, isHero }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Fallback if data is missing for some reason
  if (!block.data) return <div className="bg-stone-200 h-full w-full rounded-lg animate-pulse" />;

  const { url_regular, alt_text, photographer } = block.data;

  return (
    <>
      <div 
        className="h-full flex flex-col group cursor-pointer relative"
        onClick={() => setIsOpen(true)}
      >
         {block.heading && (
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">{block.heading}</h3>
                <Maximize2 size={12} className="text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
         )}
         <div className={`flex-1 relative rounded-lg overflow-hidden border border-stone-100 bg-stone-200 ${isHero ? 'min-h-[300px]' : 'min-h-[200px]'}`}>
            <img 
                src={url_regular} 
                alt={alt_text}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Attribution Tag - Appears on hover */}
            {photographer && (
                <a 
                   href={photographer.url} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   onClick={(e) => e.stopPropagation()}
                   className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                >
                   <span>Photo by {photographer.name}</span>
                   <ExternalLink size={8} />
                </a>
            )}
         </div>
      </div>

      {/* Lightbox Modal */}
      {isOpen && (
        <div 
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
            }}
        >
            <button 
                className="absolute top-6 right-6 text-stone-400 hover:text-white p-2"
                onClick={() => setIsOpen(false)}
            >
                <X size={32} />
            </button>
            <div className="max-w-7xl max-h-[90vh] flex flex-col items-center">
                <img 
                    src={url_regular} 
                    alt={alt_text} 
                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                />
                {block.heading && (
                    <p className="mt-4 text-stone-300 font-display font-medium text-lg">{block.heading}</p>
                )}
                <div className="mt-2 flex items-center gap-4 text-xs text-stone-500 font-mono">
                    <span>Keywords: {block.body}</span>
                    {photographer && (
                        <a href={photographer.url} target="_blank" rel="noopener noreferrer" className="hover:text-stone-300 underline">
                            Photo by {photographer.name}
                        </a>
                    )}
                </div>
            </div>
        </div>
      )}
    </>
  );
};

const BlockRenderer: React.FC<{ block: ContentBlock }> = ({ block }) => {
  switch (block.type) {
    case 'image':
      return <ImageBlock block={block} isHero={block.weight === 3} />;
    case 'stat':
      return (
        <div className="h-full flex flex-col justify-center items-center text-center p-4">
          <Activity className="mb-2 text-stone-300" size={24} />
          <span className="text-4xl md:text-5xl font-display font-bold text-stone-800">{block.body}</span>
          {block.heading && <span className="text-xs text-stone-500 mt-2 uppercase tracking-widest">{block.heading}</span>}
        </div>
      );
    case 'quote':
      return (
        <div className="h-full flex flex-col justify-center p-6 bg-stone-100 italic font-serif text-lg text-stone-700 relative overflow-hidden">
          <Quote className="absolute top-2 left-2 text-stone-200" size={48} />
          <p className="relative z-10">"{block.body}"</p>
          {block.heading && <p className="relative z-10 text-xs text-stone-500 mt-4 not-italic font-sans">— {block.heading}</p>}
        </div>
      );
    case 'text':
    default:
      return (
        <div className="h-full flex flex-col">
          {block.heading && (
            <h3 className="text-xl font-display font-bold text-stone-800 mb-3">
              {block.heading}
            </h3>
          )}
          <div className="prose prose-stone prose-sm md:prose-base font-serif text-stone-600 leading-relaxed">
            {block.body.split('\n').map((p, i) => (
               <p key={i} className="mb-2">{p}</p>
            ))}
          </div>
        </div>
      );
  }
};

export const TheArtifact: React.FC<TheArtifactProps> = ({ pebble, onVerify, onBack }) => {
  const [level, setLevel] = useState<CognitiveLevel>(CognitiveLevel.ELI5);
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());
  const [isLocked, setIsLocked] = useState(pebble.isVerified);

  const content = pebble.content[level];

  const toggleQuestion = (index: number) => {
    const newSet = new Set(completedQuestions);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setCompletedQuestions(newSet);
    
    if (newSet.size === pebble.socraticQuestions.length && !isLocked) {
        onVerify(pebble.id);
        setIsLocked(true);
    }
  };

  // Helper to determine grid classes based on weight
  const getGridClasses = (weight: number, type: string) => {
    // Images get darker backgrounds for contrast if they are Hero
    if (type === 'image' && weight === 3) return "col-span-12 md:col-span-8 md:row-span-2 bg-stone-900 text-stone-100";
    if (weight === 3) return "col-span-12 md:col-span-8 md:row-span-2 bg-stone-900 text-stone-100"; // Hero Text
    
    // Major
    if (weight === 2) return "col-span-12 md:col-span-6 bg-white border border-stone-200"; 
    
    // Minor
    return "col-span-6 md:col-span-3 bg-stone-50 border border-stone-100"; 
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-32 fade-in">
      {/* Navigation */}
      <button 
        onClick={onBack}
        className="fixed top-6 left-6 z-40 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm hover:bg-stone-100 transition-colors"
      >
        <ArrowLeft size={24} className="text-stone-600" />
      </button>

      {/* Header Area */}
      <div className="max-w-7xl mx-auto pt-24 px-4 md:px-8 mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest text-stone-500 uppercase bg-stone-100 rounded-full border border-stone-200">
               {level === CognitiveLevel.ELI5 ? 'Analogy Mode' : 'Academic Mode'}
            </span>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-stone-900 leading-tight">
              {content.title}
            </h1>
            <p className="mt-4 text-lg text-stone-600 max-w-2xl font-serif">
              {content.summary}
            </p>
          </div>
          {/* Tag Cloud */}
          <div className="flex flex-wrap gap-2 justify-end max-w-md">
             {content.keywords.map((kw, i) => (
                <span key={i} className="px-2 py-1 bg-stone-200 text-stone-600 text-xs rounded font-medium">#{kw}</span>
             ))}
          </div>
        </div>
      </div>

      {/* Bento Grid Layout Engine */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-12 auto-rows-min gap-4 md:gap-6">
        
        {content.blocks.map((block, idx) => (
          <div 
            key={idx} 
            className={`rounded-2xl p-6 md:p-8 overflow-hidden transition-all duration-500 ${getGridClasses(block.weight, block.type)}`}
          >
             {/* Special styling for Hero blocks */}
             {block.weight === 3 && block.type !== 'image' ? (
               <div className="h-full flex flex-col justify-between">
                 <div>
                   {block.heading && <h2 className="text-2xl font-display font-bold mb-4 text-stone-50">{block.heading}</h2>}
                   {block.type === 'text' && <p className="text-lg md:text-xl font-serif leading-relaxed text-stone-300">{block.body}</p>}
                 </div>
               </div>
             ) : (
               <BlockRenderer block={block} />
             )}
          </div>
        ))}

        {/* Socratic Validator - Always present as a Major Block */}
        <div className={`col-span-12 md:col-span-6 rounded-2xl p-6 md:p-8 border transition-all duration-500 ${isLocked ? 'bg-stone-800 border-stone-700 text-stone-100' : 'bg-white border-stone-200'}`}>
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
               {isLocked ? <CheckCircle2 className="text-green-400" /> : <Circle className="text-stone-400" />}
               Socratic Verification
            </h3>
            <div className="space-y-3">
              {pebble.socraticQuestions.map((q, idx) => (
                <div 
                    key={idx} 
                    onClick={() => toggleQuestion(idx)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start gap-3 ${
                        isLocked 
                         ? 'bg-stone-700/50 border-stone-600 hover:bg-stone-700' 
                         : completedQuestions.has(idx) 
                            ? 'bg-stone-50 border-stone-200 opacity-60' 
                            : 'bg-stone-50 border-stone-100 hover:border-stone-300 hover:shadow-md'
                    }`}
                >
                    <div className={`mt-1 min-w-[1.25rem] h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        completedQuestions.has(idx) || isLocked ? 'border-transparent bg-green-500' : 'border-stone-300'
                    }`}>
                        {(completedQuestions.has(idx) || isLocked) && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <p className={`text-sm font-medium ${isLocked ? 'text-stone-300' : 'text-stone-700'}`}>{q}</p>
                </div>
              ))}
            </div>
            {isLocked && <div className="mt-4 text-xs text-green-400 font-bold uppercase tracking-widest text-right">Mastery Verified</div>}
        </div>

      </div>

      <CognitiveSlider level={level} onChange={setLevel} />
    </div>
  );
};