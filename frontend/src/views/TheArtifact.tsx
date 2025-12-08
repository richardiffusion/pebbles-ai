import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PebbleData, CognitiveLevel, MainBlock, SidebarBlock, IconType, MainBlockType } from '../types';
import { CognitiveSlider } from '../components/CognitiveSlider';
import { 
  CheckCircle2, Circle, ArrowLeft, Quote, Activity, 
  Lightbulb, Library, Zap, Scale, Rocket, Search, BookOpen, User, Hash,
  Bold, Italic, Underline, Sparkles, Wand2, RefreshCcw
} from 'lucide-react';

interface TheArtifactProps {
  pebble: PebbleData;
  onVerify: (pebbleId: string) => void;
  onBack: () => void;
  onUpdateContent: (pebbleId: string, level: CognitiveLevel, section: 'main' | 'sidebar', index: number, updatedBlock: MainBlock | SidebarBlock) => void;
  onUpdateEmoji: (pebbleId: string, level: CognitiveLevel, newEmojis: string[]) => void;
}

// --- Icons Data & Helper ---
const ICON_TYPES: IconType[] = ['definition', 'history', 'idea', 'controversy', 'future', 'analysis', 'default'];

const getIconComponent = (type: IconType | undefined, size = 18, className = "") => {
  const baseClass = `inline-block mr-2 mb-1 ${className}`;
  switch (type) {
    case 'definition': return <Lightbulb size={size} className={`${baseClass} text-amber-500`} />;
    case 'history': return <Library size={size} className={`${baseClass} text-stone-500`} />;
    case 'idea': return <Zap size={size} className={`${baseClass} text-yellow-500`} />;
    case 'controversy': return <Scale size={size} className={`${baseClass} text-red-400`} />;
    case 'future': return <Rocket size={size} className={`${baseClass} text-indigo-400`} />;
    case 'analysis': return <Search size={size} className={`${baseClass} text-blue-400`} />;
    default: return <BookOpen size={size} className={`${baseClass} text-stone-400`} />;
  }
};

// --- Emojis Data for Picker ---
const PRESET_EMOJIS = [
  "💡", "🧠", "⚙️", "🏛️", "🚀", "⚖️", "🎨", "🌍", "🧬", "🔭", 
  "📚", "🔥", "🌊", "🌱", "🕸️", "🔗", "🧩", "🎤", "🎬", "🕹️",
  "🧱", "💎", "🛡️", "🔑", "🚪", "🗿", "📜", "🕯️", "⌛", "📡"
];

// --- 1. Editable Text Wrapper (The Core of Modeless Editing) ---

interface EditableTextProps {
  tagName: keyof React.JSX.IntrinsicElements;
  html: string;
  className?: string;
  placeholder?: string;
  onSave: (newHtml: string) => void;
  onFocus?: () => void;
}

const EditableText: React.FC<EditableTextProps> = ({ tagName: Tag, html, className, placeholder, onSave, onFocus }) => {
  const contentRef = useRef<HTMLElement>(null);
  
  const handleBlur = () => {
    if (contentRef.current) {
        const text = contentRef.current.innerText; // Use innerText for plain text model, or innerHTML if we want HTML
        if (text !== html) {
             onSave(text);
        }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      // Basic shortcuts if needed, e.g. Cmd+Enter to save/blur
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          contentRef.current?.blur();
      }
  };

  useEffect(() => {
    // Sync external updates if not focused
    if (contentRef.current && document.activeElement !== contentRef.current) {
         if (contentRef.current.innerText !== html) {
             contentRef.current.innerText = html;
         }
    }
  }, [html]);

  return (
    <Tag
      ref={contentRef}
      className={`outline-none transition-all rounded px-0.5 -mx-0.5 empty:before:content-[attr(data-placeholder)] empty:before:text-stone-300 hover:bg-stone-100/50 focus:bg-white focus:ring-1 focus:ring-stone-200 focus:shadow-sm ${className}`}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
    >
        {html}
    </Tag>
  );
};

// --- 2. Floating Bubble Menu (Formatting) ---

const FloatingMenu = () => {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            setVisible(false);
            return;
        }

        const range = selection.getRangeAt(0);
        // Only show if selection is within an editable area
        const container = range.commonAncestorContainer.parentElement;
        if (!container?.isContentEditable) {
             setVisible(false);
             return;
        }

        const rect = range.getBoundingClientRect();
        setPosition({
            top: rect.top - 40 + window.scrollY, // 40px above
            left: rect.left + rect.width / 2
        });
        setVisible(true);
    }, []);

    useEffect(() => {
        document.addEventListener('selectionchange', updatePosition);
        return () => document.removeEventListener('selectionchange', updatePosition);
    }, [updatePosition]);

    const exec = (command: string) => {
        document.execCommand(command, false);
    };

    if (!visible) return null;

    return (
        <div 
            ref={menuRef}
            style={{ top: position.top, left: position.left }}
            className="fixed z-50 transform -translate-x-1/2 bg-stone-900 text-stone-200 rounded-full px-2 py-1 shadow-xl flex items-center gap-1 animate-in zoom-in-95 duration-100"
            onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
        >
            <button onClick={() => exec('bold')} className="p-1.5 hover:text-white hover:bg-stone-700 rounded-full"><Bold size={14} /></button>
            <button onClick={() => exec('italic')} className="p-1.5 hover:text-white hover:bg-stone-700 rounded-full"><Italic size={14} /></button>
            <button onClick={() => exec('underline')} className="p-1.5 hover:text-white hover:bg-stone-700 rounded-full"><Underline size={14} /></button>
            <div className="w-px h-4 bg-stone-700 mx-1" />
            <button className="p-1.5 hover:text-amber-300 hover:bg-stone-700 rounded-full flex items-center gap-1 text-xs font-bold text-amber-200/80">
                <Sparkles size={12} /> AI
            </button>
        </div>
    );
};

// --- 3. Semantic Pickers ---

const IconPicker: React.FC<{ current: IconType, onSelect: (t: IconType) => void, onClose: () => void }> = ({ current, onSelect, onClose }) => {
    return (
        <div className="absolute z-50 mt-2 bg-white border border-stone-200 rounded-lg shadow-xl p-2 grid grid-cols-4 gap-2 animate-in fade-in zoom-in-95">
            {ICON_TYPES.map(t => (
                <button 
                    key={t} 
                    onClick={() => { onSelect(t); onClose(); }}
                    className={`p-2 rounded hover:bg-stone-100 flex justify-center ${current === t ? 'bg-stone-100 ring-1 ring-stone-300' : ''}`}
                    title={t}
                >
                    {getIconComponent(t)}
                </button>
            ))}
        </div>
    );
};

const EmojiPicker: React.FC<{ onSelect: (e: string) => void, onClose: () => void }> = ({ onSelect, onClose }) => {
    return (
        <div className="absolute z-50 mt-2 bg-white border border-stone-200 rounded-lg shadow-xl p-3 w-64 animate-in fade-in zoom-in-95">
            <div className="grid grid-cols-6 gap-2">
                {PRESET_EMOJIS.map(e => (
                    <button 
                        key={e} 
                        onClick={() => { onSelect(e); onClose(); }}
                        className="text-xl hover:bg-stone-100 rounded p-1 transition-colors hover:scale-110"
                    >
                        {e}
                    </button>
                ))}
            </div>
            <div className="mt-3 pt-2 border-t border-stone-100">
                <button onClick={() => { onSelect(PRESET_EMOJIS[Math.floor(Math.random() * PRESET_EMOJIS.length)]); onClose(); }} className="w-full text-xs font-bold text-stone-500 hover:text-stone-800 flex items-center justify-center gap-1">
                   <RefreshCcw size={10} /> Randomize
                </button>
            </div>
        </div>
    );
};

// --- 4. Main Components Refactored ---

const EmojiCollageHero: React.FC<{ emojis: string[], onUpdate: (newEmojis: string[]) => void }> = ({ emojis, onUpdate }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <div className="relative w-full h-48 md:h-64 overflow-hidden bg-stone-100 border-b border-stone-200 mb-8 select-none group">
       <div className="absolute inset-0 flex justify-center items-center opacity-90 scale-150 md:scale-125">
          {emojis.slice(0, 5).map((emoji, i) => (
             <div 
                key={i} 
                className="relative"
                style={{
                   zIndex: i,
                   transform: `translateX(${(i - 2) * 60}px) rotate(${(i - 2) * 10}deg)`,
                }}
             >
                 <span 
                    onClick={() => setActiveIdx(i)}
                    className="text-[8rem] md:text-[10rem] leading-none absolute cursor-pointer hover:brightness-110 hover:scale-105 transition-all"
                    style={{ textShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                 >
                    {emoji}
                 </span>
                 
                 {/* Emoji Picker Popover */}
                 {activeIdx === i && (
                     <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                        <div className="fixed inset-0" onClick={(e) => { e.stopPropagation(); setActiveIdx(null); }} />
                        <EmojiPicker 
                            onSelect={(newEmoji) => {
                                const newArr = [...emojis];
                                newArr[i] = newEmoji;
                                onUpdate(newArr);
                            }} 
                            onClose={() => setActiveIdx(null)} 
                        />
                     </div>
                 )}
             </div>
          ))}
       </div>
       <div className="absolute inset-0 bg-gradient-to-t from-stone-50 to-transparent opacity-80 pointer-events-none" />
       
       {/* Hint */}
       <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur px-2 py-1 rounded text-xs text-stone-500 font-medium">
          Click emoji to swap
       </div>
    </div>
  );
};

const MainContentRenderer: React.FC<{ blocks: MainBlock[], onUpdateBlock: (idx: number, b: MainBlock) => void }> = ({ blocks, onUpdateBlock }) => {
  const [iconPickerIdx, setIconPickerIdx] = useState<number | null>(null);

  return (
    <div className="space-y-12">
      {blocks.map((block, idx) => {
        const updateBody = (val: string | string[]) => onUpdateBlock(idx, { ...block, body: val });
        const updateHeading = (val: string) => onUpdateBlock(idx, { ...block, heading: val });
        const updateIcon = (val: IconType) => onUpdateBlock(idx, { ...block, iconType: val });

        switch (block.type) {
          case 'pull_quote':
            return (
              <div key={idx} className="relative my-10 pl-6 border-l-4 border-stone-300 group">
                <Quote className="absolute -top-4 -left-3 text-stone-200 bg-stone-50 p-1" size={32} />
                <div className="font-display font-bold text-2xl md:text-3xl text-stone-800 leading-tight italic">
                  <EditableText 
                    tagName="div" 
                    html={block.body as string} 
                    onSave={updateBody} 
                    placeholder="Empty quote..."
                  />
                </div>
                {block.heading !== undefined && (
                  <div className="mt-4 text-xs font-bold text-stone-500 uppercase tracking-widest not-italic flex gap-1">
                    — <EditableText tagName="span" html={block.heading} onSave={updateHeading} placeholder="Author" />
                  </div>
                )}
              </div>
            );
          
          case 'key_points':
            const points = Array.isArray(block.body) ? block.body : [block.body as string];
            return (
              <div key={idx} className="bg-stone-100 rounded-xl p-6 md:p-8 my-8 border border-stone-200 group">
                {block.heading && (
                   <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <CheckCircle2 size={16} /> 
                      <EditableText tagName="span" html={block.heading} onSave={updateHeading} />
                   </h3>
                )}
                <ul className="space-y-3">
                   {points.map((p, i) => (
                      <li key={i} className="flex items-start gap-3 text-stone-700 font-serif text-lg leading-relaxed group/item">
                         <span 
                            onClick={() => {
                                // Toggle item completion visual (local only for now or could be state)
                                // Ideally this would update state, but keeping it simple for text editing focus
                            }}
                            className="mt-2 w-1.5 h-1.5 bg-stone-400 rounded-full flex-shrink-0 cursor-pointer hover:bg-stone-600 hover:scale-125 transition-all" 
                         />
                         <div className="flex-1">
                             <EditableText 
                                tagName="div" 
                                html={p} 
                                onSave={(newText) => {
                                    const newPoints = [...points];
                                    newPoints[i] = newText;
                                    updateBody(newPoints);
                                }}
                             />
                         </div>
                      </li>
                   ))}
                </ul>
              </div>
            );

          case 'text':
          default:
            return (
              <div key={idx} className="prose prose-stone prose-lg max-w-none group">
                 {block.heading && (
                    <div className="relative">
                        <h2 className="text-2xl md:text-3xl font-sans font-bold text-stone-900 mt-10 mb-4 flex items-center">
                            <button 
                                onClick={() => setIconPickerIdx(iconPickerIdx === idx ? null : idx)}
                                className="hover:bg-stone-100 rounded p-1 -ml-1 mr-1 transition-colors"
                            >
                                {getIconComponent(block.iconType)}
                            </button>
                            <EditableText tagName="span" html={block.heading} onSave={updateHeading} />
                        </h2>
                        {iconPickerIdx === idx && (
                            <div className="absolute top-10 left-0 z-10">
                                <div className="fixed inset-0" onClick={() => setIconPickerIdx(null)} />
                                <IconPicker 
                                    current={block.iconType || 'default'} 
                                    onSelect={(t) => updateIcon(t)} 
                                    onClose={() => setIconPickerIdx(null)} 
                                />
                            </div>
                        )}
                    </div>
                 )}
                 <div className="text-stone-700 font-serif leading-8 text-lg md:text-xl whitespace-pre-line">
                    <EditableText tagName="div" html={block.body as string} onSave={updateBody} placeholder="Type paragraph..." />
                 </div>
              </div>
            );
        }
      })}
      
      {/* Floating Menu for all text editing */}
      <FloatingMenu />
    </div>
  );
};

const SidebarRenderer: React.FC<{ blocks: SidebarBlock[], onUpdateBlock: (idx: number, b: SidebarBlock) => void }> = ({ blocks, onUpdateBlock }) => {
  const [emojiPickerIdx, setEmojiPickerIdx] = useState<number | null>(null);

  return (
    <div className="space-y-6 sticky top-24">
       {blocks.map((block, idx) => {
          const updateHeading = (v: string) => onUpdateBlock(idx, { ...block, heading: v });
          const updateBody = (v: string) => onUpdateBlock(idx, { ...block, body: v });
          const updateEmoji = (v: string) => onUpdateBlock(idx, { ...block, emoji: v });

          return (
          <div key={idx} className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow group relative">
             {block.type === 'profile' && (
                 <div className="flex items-start gap-4">
                     <div className="relative">
                         <button 
                            onClick={() => setEmojiPickerIdx(emojiPickerIdx === idx ? null : idx)}
                            className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center text-2xl border border-stone-200 flex-shrink-0 hover:bg-stone-200 transition-colors"
                         >
                            {block.emoji || <User size={20} className="text-stone-400" />}
                         </button>
                         {emojiPickerIdx === idx && (
                             <div className="absolute top-full left-0 z-50">
                                 <div className="fixed inset-0" onClick={() => setEmojiPickerIdx(null)} />
                                 <EmojiPicker onSelect={updateEmoji} onClose={() => setEmojiPickerIdx(null)} />
                             </div>
                         )}
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-stone-900 leading-tight">
                            <EditableText tagName="span" html={block.heading} onSave={updateHeading} />
                        </h4>
                        <div className="text-xs text-stone-500 mt-1 font-serif leading-relaxed">
                            <EditableText tagName="div" html={block.body} onSave={updateBody} />
                        </div>
                     </div>
                 </div>
             )}

             {block.type === 'stat' && (
                 <div>
                    <div className="flex items-center gap-2 mb-2 text-stone-400 text-xs font-bold uppercase tracking-widest">
                       <Hash size={12} /> Key Stat
                    </div>
                    <div className="text-3xl font-display font-bold text-stone-800">
                        <EditableText tagName="span" html={block.heading} onSave={updateHeading} />
                    </div>
                    <div className="text-sm text-stone-500 mt-1">
                        <EditableText tagName="div" html={block.body} onSave={updateBody} />
                    </div>
                 </div>
             )}

             {block.type === 'definition' && (
                 <div>
                    <h4 className="font-bold text-stone-800 border-b border-stone-100 pb-2 mb-2 flex items-center gap-2">
                       <BookOpen size={14} className="text-stone-400" />
                       <EditableText tagName="span" html={block.heading} onSave={updateHeading} />
                    </h4>
                    <div className="text-sm text-stone-600 font-serif leading-relaxed">
                        <EditableText tagName="div" html={block.body} onSave={updateBody} />
                    </div>
                 </div>
             )}
          </div>
       )})}
    </div>
  );
};

export const TheArtifact: React.FC<TheArtifactProps> = ({ pebble, onVerify, onBack, onUpdateContent, onUpdateEmoji }) => {
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

  return (
    <div className="min-h-screen bg-stone-50 pb-32 fade-in font-sans selection:bg-stone-800 selection:text-stone-50">
      
      {/* Navigation */}
      <button 
        onClick={onBack}
        className="fixed top-6 left-6 z-40 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm hover:bg-stone-100 transition-colors border border-stone-200"
      >
        <ArrowLeft size={20} className="text-stone-600" />
      </button>

      {/* Hero Section */}
      <EmojiCollageHero emojis={content.emojiCollage} onUpdate={(newEmojis) => onUpdateEmoji(pebble.id, level, newEmojis)} />

      {/* Title Header */}
      <div className="max-w-6xl mx-auto px-6 md:px-8 mb-12 border-b border-stone-200 pb-8">
         <div className="flex flex-col gap-4">
             <div className="flex items-center gap-3">
                 <span className="bg-stone-900 text-stone-100 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    {level === CognitiveLevel.ELI5 ? 'Analogy Mode' : 'Academic Mode'}
                 </span>
                 <span className="text-stone-400 text-sm font-medium">
                    {new Date(pebble.timestamp).toLocaleDateString()}
                 </span>
             </div>
             <h1 className="text-4xl md:text-6xl font-display font-bold text-stone-900 leading-tight tracking-tight outline-none">
                {/* Note: Title editing handled separately usually, but for now making it display only or simple contentEditable would be easy. Let's stick to main content blocks editing focus first. */}
                {content.title}
             </h1>
             <p className="text-xl md:text-2xl text-stone-500 font-serif max-w-3xl leading-relaxed">
                {content.summary}
             </p>
             <div className="flex gap-2 mt-2">
                {content.keywords.map((k, i) => (
                   <span key={i} className="text-xs font-bold text-stone-400 uppercase tracking-wide">#{k}</span>
                ))}
             </div>
         </div>
      </div>

      {/* Magazine Layout Grid */}
      <div className="max-w-6xl mx-auto px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
         
         {/* Main Column (70%) */}
         <div className="lg:col-span-8">
            <MainContentRenderer 
                blocks={content.mainContent} 
                onUpdateBlock={(idx, b) => onUpdateContent(pebble.id, level, 'main', idx, b)}
            />
            
            {/* Socratic Verification (Inline at bottom of main) */}
            <div className={`mt-20 rounded-2xl p-8 border transition-all duration-500 ${isLocked ? 'bg-stone-900 text-stone-100 border-stone-800' : 'bg-white border-stone-200 shadow-sm'}`}>
                <h3 className="font-display font-bold text-xl mb-6 flex items-center gap-3">
                  {isLocked ? <CheckCircle2 className="text-green-400" /> : <Circle className="text-stone-400" />}
                  Socratic Verification
                </h3>
                <div className="space-y-4">
                  {pebble.socraticQuestions.map((q, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => toggleQuestion(idx)}
                        className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start gap-4 ${
                            isLocked 
                            ? 'bg-stone-800 border-stone-700 hover:bg-stone-700' 
                            : completedQuestions.has(idx) 
                                ? 'bg-stone-50 border-stone-200 opacity-60' 
                                : 'bg-stone-50 border-stone-100 hover:border-stone-300 hover:shadow-md'
                        }`}
                    >
                        <div className={`mt-1 h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            completedQuestions.has(idx) || isLocked ? 'border-transparent bg-green-500' : 'border-stone-300'
                        }`}>
                            {(completedQuestions.has(idx) || isLocked) && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                        <p className={`text-base font-serif leading-relaxed ${isLocked ? 'text-stone-300' : 'text-stone-700'}`}>{q}</p>
                    </div>
                  ))}
                </div>
            </div>
         </div>

         {/* Sidebar Column (30%) */}
         <div className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-8">
               <div className="mb-4 text-xs font-bold text-stone-400 uppercase tracking-widest border-b border-stone-200 pb-2">
                  Context & Data
               </div>
               <SidebarRenderer 
                  blocks={content.sidebarContent} 
                  onUpdateBlock={(idx, b) => onUpdateContent(pebble.id, level, 'sidebar', idx, b)}
               />
            </div>
         </div>

         {/* Mobile Sidebar Content (Appears below main on mobile) */}
         <div className="lg:hidden space-y-6 mt-12 pt-12 border-t border-stone-200">
             <div className="text-sm font-bold text-stone-900 uppercase tracking-widest mb-6">
                Related Context
             </div>
             <SidebarRenderer 
                  blocks={content.sidebarContent} 
                  onUpdateBlock={(idx, b) => onUpdateContent(pebble.id, level, 'sidebar', idx, b)}
             />
         </div>

      </div>

      <CognitiveSlider level={level} onChange={setLevel} />
    </div>
  );
};