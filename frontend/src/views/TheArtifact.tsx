import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PebbleData, CognitiveLevel, MainBlock, SidebarBlock, IconType } from '../types';
import { CognitiveSlider } from '../components/CognitiveSlider';
import { pebbleApi } from '../services/api';
import { 
  CheckCircle2, Circle, ArrowLeft, Quote, Activity, 
  Lightbulb, Library, Zap, Scale, Rocket, Search, BookOpen, User, Hash,
  Bold, Italic, Underline, Sparkles, RefreshCcw,
  Plus, ChevronUp, ChevronDown, Trash2, MoreVertical, X,
  Edit2, Loader2, Minimize2, Maximize2, Wand2, ArrowRight
} from 'lucide-react';

interface TheArtifactProps {
  pebble: PebbleData;
  onVerify: (pebbleId: string, status: boolean) => void;
  onBack: () => void;
  onUpdateContent: (pebbleId: string, level: CognitiveLevel, section: 'main' | 'sidebar', index: number, updatedBlock: MainBlock | SidebarBlock) => void;
  // ★★★ 新增 props ★★★
  onAddBlock: (pebbleId: string, level: CognitiveLevel, section: 'main' | 'sidebar', index: number, type: string) => void;
  onMoveBlock: (pebbleId: string, level: CognitiveLevel, section: 'main' | 'sidebar', fromIndex: number, direction: 'up' | 'down') => void;
  onDeleteBlock: (pebbleId: string, level: CognitiveLevel, section: 'main' | 'sidebar', index: number) => void;
  onUpdateEmoji: (pebbleId: string, level: CognitiveLevel, newEmojis: string[]) => void;
  // ★★★ 新增：更新层级元数据 (标题, 摘要, 关键词)
  onUpdateMetadata: (pebbleId: string, level: CognitiveLevel, field: 'title' | 'summary' | 'keywords', value: string | string[]) => void;
  // ★★★ 新增：更新全局 Pebble 数据 (苏格拉底问题)
  onUpdateGlobal: (pebbleId: string, field: 'socraticQuestions', value: string[]) => void;
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
}

const EditableText: React.FC<EditableTextProps> = ({ tagName: Tag, html, className, placeholder, onSave }) => {
  const contentRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false); // ★ 新增：打字状态锁

  // 1. 初始化内容 (仅在组件挂载时执行一次)
  useEffect(() => {
    if (contentRef.current) {
        contentRef.current.innerText = html;
    }
  }, []); // 空依赖数组，只执行一次

  // 2. 监听外部 props 变化 (同步服务器数据)
  useEffect(() => {
    // 只有当用户 "不在打字" 且 "当前没有聚焦" 时，才允许外部数据覆盖内部
    // 这防止了 Save 触发重渲染时把用户正在输入的内容覆盖掉
    if (contentRef.current && !isTypingRef.current && document.activeElement !== contentRef.current) {
        if (contentRef.current.innerText !== html) {
            contentRef.current.innerText = html;
        }
    }
  }, [html]);

  const handleInput = (e: React.FormEvent<HTMLElement>) => {
    isTypingRef.current = true; // 标记正在打字
    const newValue = e.currentTarget.innerText;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // 防抖保存
    timeoutRef.current = setTimeout(() => {
        if (newValue !== html) {
            console.log("Auto-saving...");
            onSave(newValue);
            isTypingRef.current = false; // 保存触发后，释放打字锁
        }
    }, 1000);
  };

  const handleBlur = () => {
    isTypingRef.current = false; // 失焦释放锁
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (contentRef.current && contentRef.current.innerText !== html) {
        console.log("Blur saving...");
        onSave(contentRef.current.innerText);
    }
  };

  return (
    <Tag
      ref={contentRef}
      className={`outline-none transition-all rounded px-0.5 -mx-0.5 empty:before:content-[attr(data-placeholder)] empty:before:text-stone-300 hover:bg-stone-100/50 focus:bg-white focus:ring-1 focus:ring-stone-200 ${className}`}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleBlur}
      data-placeholder={placeholder}
      // ★★★ 关键：这里删除了 dangerouslySetInnerHTML
      // 我们完全依靠上面的 useEffect 来管理内容，切断了 React Render 对 DOM 的强制重置
    />
  );
};

// --- 2. Floating Bubble Menu (Formatting) ---

// ★★★ 全新的 FloatingMenu 组件 ★★★
const FloatingMenu = () => {
    // 状态管理
    const [visible, setVisible] = useState(false);
    // mode: 'main' (基础格式), 'ai_options' (AI选项), 'processing' (AI思考中)
    const [mode, setMode] = useState<'main' | 'ai_options' | 'processing'>('main');
    const [position, setPosition] = useState({ top: 0, left: 0, placement: 'top' });
    
    // 用来对比选区是否真的变了，防止微小抖动
    const lastRangeStr = useRef<string>('');
    const menuRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        const selection = window.getSelection();

        // 1. 隐藏检查
        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
            // 只有在非处理状态下才允许自动隐藏
            if (mode !== 'processing') {
                setVisible(false);
                setMode('main'); // 重置回主菜单
                lastRangeStr.current = '';
            }
            return;
        }

        // 2. 防抖动核心：如果选区内容和范围没变，且菜单已显示，这就“锁死”位置，不再计算
        const range = selection.getRangeAt(0);
        const currentRangeStr = range.toString() + range.startOffset + range.endOffset;
        
        if (visible && currentRangeStr === lastRangeStr.current) {
            return; // 彻底解决左跳问题
        }
        lastRangeStr.current = currentRangeStr;

        // 3. 容器检查 (确保在编辑器内)
        const container = range.commonAncestorContainer.parentElement;
        const isInsideEditor = container?.closest('.prose') || container?.closest('.group\\/block');
        if (!isInsideEditor) {
             setVisible(false);
             return;
        }

        // 4. 坐标计算 (智能避让)
        const rect = range.getBoundingClientRect();
        if (rect.width === 0) return;

        // 默认显示在上方 (top)
        const gap = 10;
        const menuHeight = 50; // 预估高度
        let placement = 'top';
        let top = rect.top - gap; // 这里的 top 是指菜单底部的锚点

        // 如果上方空间不足 (比如在屏幕最顶端)，改为显示在下方
        if (top < menuHeight + 60) { // 60是顶部导航栏的大概高度
            placement = 'bottom';
            top = rect.bottom + gap;
        } else {
            top = rect.top - gap;
        }

        const left = rect.left + rect.width / 2;

        setPosition({ 
            top: Math.round(top + window.scrollY), 
            left: Math.round(left),
            placement 
        });
        setVisible(true);
    }, [visible, mode]);

    useEffect(() => {
        document.addEventListener('selectionchange', updatePosition);
        // 只有不显示的时候才监听 resize/scroll 来隐藏，显示后锁定位置直到选区改变
        if (!visible) {
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            document.removeEventListener('selectionchange', updatePosition);
            window.removeEventListener('resize', updatePosition);
        };
    }, [updatePosition, visible]);

    const exec = (command: string) => {
        document.execCommand(command, false);
    };

    const handleAiRewrite = async (aiMode: 'improve' | 'shorter' | 'longer' | 'simplify') => {
        const selection = window.getSelection();
        const text = selection?.toString();
        if (!text) return;

        // 锁定当前选区
        const range = selection.getRangeAt(0).cloneRange();
        
        setMode('processing'); // 进入 loading 状态

        try {
            const newText = await pebbleApi.rewrite(text, aiMode);
            
            // 恢复选区并替换
            selection.removeAllRanges();
            selection.addRange(range);
            document.execCommand('insertText', false, newText);
            
            // 任务完成，关闭菜单
            setVisible(false);
            setMode('main');
        } catch (error) {
            console.error(error);
            alert("AI Failed");
            setMode('ai_options'); // 回退到选项
        }
    };

    if (!visible) return null;

    return (
        <div 
            ref={menuRef}
            style={{ 
                top: position.top, 
                left: position.left,
                // 根据 placement 决定是往上偏移还是往下偏移
                transform: `translateX(-50%) ${position.placement === 'top' ? 'translateY(-100%)' : 'translateY(0)'}`
            }}
            className="fixed z-[100] animate-in fade-in zoom-in-95 duration-200"
            onMouseDown={(e) => e.preventDefault()} // 防止失焦
        >
            <div className="bg-stone-900 text-stone-200 rounded-full px-1.5 py-1.5 shadow-2xl border border-stone-700 flex items-center gap-1 overflow-hidden transition-all duration-300 ease-in-out">
                
                {/* 模式 1: 基础格式工具栏 */}
                {mode === 'main' && (
                    <div className="flex items-center gap-1 animate-in slide-in-from-left-2 duration-200">
                        <button onClick={() => exec('bold')} className="p-1.5 hover:text-white hover:bg-stone-700 rounded-full transition-colors"><Bold size={14} /></button>
                        <button onClick={() => exec('italic')} className="p-1.5 hover:text-white hover:bg-stone-700 rounded-full transition-colors"><Italic size={14} /></button>
                        <button onClick={() => exec('underline')} className="p-1.5 hover:text-white hover:bg-stone-700 rounded-full transition-colors"><Underline size={14} /></button>
                        
                        <div className="w-px h-4 bg-stone-700 mx-1" />
                        
                        <button 
                            onClick={() => setMode('ai_options')}
                            className="px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-purple-900/50 to-blue-900/50 hover:from-purple-800 hover:to-blue-800 border border-white/10 text-stone-200 transition-all group"
                        >
                            <Sparkles size={12} className="text-purple-300 group-hover:text-white transition-colors" />
                            <span>AI</span>
                        </button>
                    </div>
                )}

                {/* 模式 2: AI 选项菜单 (原地替换，不堆叠) */}
                {mode === 'ai_options' && (
                    <div className="flex items-center gap-1 animate-in slide-in-from-right-4 duration-200">
                        <button 
                            onClick={() => setMode('main')}
                            className="p-1.5 hover:bg-stone-700 rounded-full text-stone-400 hover:text-white"
                        >
                            <ArrowLeft size={14} />
                        </button>
                        <div className="w-px h-4 bg-stone-700 mx-1" />
                        
                        <button onClick={() => handleAiRewrite('improve')} className="px-2 py-1.5 hover:bg-stone-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors">
                            <Wand2 size={12} /> Fix
                        </button>
                        <button onClick={() => handleAiRewrite('shorter')} className="px-2 py-1.5 hover:bg-stone-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors">
                            <Minimize2 size={12} /> Short
                        </button>
                        <button onClick={() => handleAiRewrite('longer')} className="px-2 py-1.5 hover:bg-stone-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors">
                            <Maximize2 size={12} /> Expand
                        </button>
                    </div>
                )}

                {/* 模式 3: AI 处理中 */}
                {mode === 'processing' && (
                    <div className="flex items-center gap-2 px-3 py-1 animate-in fade-in duration-300">
                        <Loader2 size={14} className="animate-spin text-blue-400" />
                        <span className="text-xs font-bold text-stone-300 tracking-wide">Thinking...</span>
                    </div>
                )}

            </div>
            
            {/* 底部小箭头指示器 */}
            <div className={`w-3 h-3 bg-stone-900 border-r border-b border-stone-700 absolute left-1/2 -translate-x-1/2 rotate-45 ${position.placement === 'top' ? '-bottom-1.5' : '-top-1.5 border-r-0 border-b-0 border-l border-t'}`} />
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

// ★★★ 重新设计的 EmojiCollageHero ★★★
const EmojiCollageHero: React.FC<{ emojis: string[], onUpdate: (newEmojis: string[]) => void }> = ({ emojis, onUpdate }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // 补齐 5 个 emoji，防止数据不足导致布局塌陷
  const displayEmojis = [...emojis];
  while (displayEmojis.length < 5) displayEmojis.push('✨');

  return (
    <div className="relative w-full py-16 bg-stone-100/50 border-b border-stone-200 mb-12 select-none overflow-visible group/hero">
       
       {/* 背景装饰：微妙的光晕，增加氛围感 */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-32 bg-gradient-to-r from-blue-100/0 via-stone-200/50 to-blue-100/0 blur-3xl rounded-full pointer-events-none" />

       <div className="relative flex justify-center items-end gap-2 md:gap-6 z-10 px-4">
          {displayEmojis.slice(0, 5).map((emoji, i) => {
             // 视觉节奏：中间大，两边小
             const isCenter = i === 2;
             const isSide = i === 1 || i === 3;
             
             return (
              <div 
                key={i} 
                className="relative group/emoji"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                  {/* Emoji 本体 */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveIdx(activeIdx === i ? null : i); }}
                    className={`
                        relative transition-all duration-300 ease-out transform cursor-pointer
                        ${isCenter ? 'text-7xl md:text-9xl -translate-y-2 z-20' : isSide ? 'text-5xl md:text-7xl z-10 text-stone-800/90' : 'text-4xl md:text-5xl text-stone-800/70'}
                        ${activeIdx === i ? 'scale-110 drop-shadow-2xl grayscale-0' : 'hover:scale-110 hover:-translate-y-4 hover:drop-shadow-xl'}
                        ${activeIdx !== null && activeIdx !== i ? 'blur-sm opacity-50 scale-90' : ''}
                    `}
                    style={{ textShadow: '0 4px 12px rgba(0,0,0,0.05)' }} // 柔和阴影
                  >
                     {emoji}
                     
                     {/* 悬停时的编辑提示 (仅在未打开选择器时显示) */}
                     {activeIdx === null && hoveredIdx === i && (
                         <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/emoji:opacity-100 transition-opacity bg-stone-900 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap pointer-events-none">
                             <Edit2 size={8} /> <span>Change</span>
                         </div>
                     )}
                  </button>
                  
                  {/* Emoji Picker Popover (定位在 Emoji 正下方) */}
                  {activeIdx === i && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                         {/* 遮罩，点击外部关闭 */}
                         <div className="fixed inset-0 z-[-1]" onClick={(e) => { e.stopPropagation(); setActiveIdx(null); }} />
                         
                         {/* 选择器本体 */}
                         <div className="bg-white rounded-xl shadow-2xl border border-stone-200 p-3 w-64 relative after:content-[''] after:absolute after:-top-2 after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-b-white">
                             <EmojiPicker 
                                onSelect={(newEmoji) => {
                                    const newArr = [...emojis];
                                    newArr[i] = newEmoji;
                                    onUpdate(newArr);
                                    setActiveIdx(null);
                                }} 
                                onClose={() => setActiveIdx(null)} 
                             />
                         </div>
                      </div>
                  )}
              </div>
             );
          })}
       </div>

       {/* 底部提示文案 */}
       <div className="text-center mt-8 opacity-0 group-hover/hero:opacity-100 transition-opacity duration-500 delay-100">
           <span className="text-xs font-bold text-stone-400 uppercase tracking-widest border border-stone-200 px-3 py-1 rounded-full bg-white/50 backdrop-blur">
              Cognitive Symbols
           </span>
       </div>
    </div>
  );
};

// --- 组件 1: 插入区 (Add Zone) ---
const AddBlockZone: React.FC<{ 
    onAdd: (type: string) => void; 
    options: { label: string, type: string }[] 
}> = ({ onAdd, options }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative h-6 group flex items-center justify-center -my-3 z-10 hover:z-20">
            {/* 隐形触发区 */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setIsOpen(!isOpen)} />
            
            {/* 悬停显示的线和按钮 */}
            <div className={`w-full h-px bg-blue-500 transition-all duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`absolute bg-white border border-blue-500 text-blue-500 rounded-full p-0.5 transition-all duration-200 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'}`}
            >
                <Plus size={14} />
            </button>

            {/* 类型选择菜单 */}
            {isOpen && (
                <div className="absolute top-6 bg-white border border-stone-200 shadow-xl rounded-lg p-1 flex gap-1 animate-in zoom-in-95">
                    {options.map(opt => (
                        <button 
                            key={opt.type}
                            onClick={() => { onAdd(opt.type); setIsOpen(false); }}
                            className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 rounded-md whitespace-nowrap"
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
            
            {/* 点击外部关闭菜单的遮罩 */}
            {isOpen && <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />}
        </div>
    );
};

// --- 组件 2: 版块包装器 (带控制按钮) ---
const BlockWrapper: React.FC<{
    children: React.ReactNode;
    index: number;
    total: number;
    onMove: (dir: 'up' | 'down') => void;
    onDelete: () => void;
}> = ({ children, index, total, onMove, onDelete }) => {
    return (
        <div className="group/block relative -mx-4 px-4 py-2 rounded-xl transition-colors hover:bg-stone-100/50">
            {/* 控制按钮组 (悬停出现) */}
            <div className="absolute right-0 top-2 opacity-0 group-hover/block:opacity-100 transition-opacity flex flex-col gap-1 bg-white/80 backdrop-blur border border-stone-200 rounded-lg p-1 shadow-sm z-10 translate-x-full md:translate-x-0">
                <button 
                    disabled={index === 0}
                    onClick={() => onMove('up')}
                    className="p-1 text-stone-400 hover:text-stone-900 hover:bg-stone-200 rounded disabled:opacity-30"
                    title="Move Up"
                >
                    <ChevronUp size={14} />
                </button>
                <button 
                    disabled={index === total - 1}
                    onClick={() => onMove('down')}
                    className="p-1 text-stone-400 hover:text-stone-900 hover:bg-stone-200 rounded disabled:opacity-30"
                    title="Move Down"
                >
                    <ChevronDown size={14} />
                </button>
                <div className="h-px bg-stone-200 my-0.5" />
                <button 
                    onClick={onDelete}
                    className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded"
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>
            {children}
        </div>
    );
};

// --- MainContentRenderer (重构) ---
const MainContentRenderer: React.FC<{ 
    blocks: MainBlock[], 
    onUpdateBlock: (idx: number, b: MainBlock) => void,
    onAdd: (idx: number, type: string) => void,
    onMove: (idx: number, dir: 'up'|'down') => void,
    onDelete: (idx: number) => void
}> = ({ blocks, onUpdateBlock, onAdd, onMove, onDelete }) => {
  const [iconPickerIdx, setIconPickerIdx] = useState<number | null>(null);

  const MAIN_OPTIONS = [
      { label: 'Paragraph', type: 'text' },
      { label: 'Quote', type: 'pull_quote' },
      { label: 'Checklist', type: 'key_points' }
  ];

  return (
    <div className="space-y-6">
      {/* 顶部的添加区 */}
      <AddBlockZone onAdd={(t) => onAdd(0, t)} options={MAIN_OPTIONS} />

      {blocks.map((block, idx) => {
        const updateBody = (val: string | string[]) => onUpdateBlock(idx, { ...block, body: val });
        const updateHeading = (val: string) => onUpdateBlock(idx, { ...block, heading: val });
        const updateIcon = (val: IconType) => onUpdateBlock(idx, { ...block, iconType: val });

        // --- Block Content Rendering Logic (Same as before) ---
        let content = null;
        if (block.type === 'pull_quote') {
            content = (
              <div className="relative my-4 pl-6 border-l-4 border-stone-300">
                <Quote className="absolute -top-4 -left-3 text-stone-200 bg-stone-50 p-1" size={32} />
                <div className="font-display font-bold text-2xl md:text-3xl text-stone-800 leading-tight italic">
                  <EditableText tagName="div" html={block.body as string} onSave={updateBody} placeholder="Empty quote..." />
                </div>
                {/* ... author logic ... */}
              </div>
            );
        } else if (block.type === 'key_points') {
            const points = Array.isArray(block.body) ? block.body : [block.body as string];
            content = (
              <div className="bg-stone-100 rounded-xl p-6 border border-stone-200">
                {block.heading && (
                   <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <CheckCircle2 size={16} /> 
                      <EditableText tagName="span" html={block.heading} onSave={updateHeading} />
                   </h3>
                )}
                <ul className="space-y-3">
                   {points.map((p, i) => (
                      <li key={i} className="flex items-start gap-3 text-stone-700 font-serif text-lg leading-relaxed">
                         <span className="mt-2 w-1.5 h-1.5 bg-stone-400 rounded-full flex-shrink-0" />
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
        } else {
            // Default Text
            content = (
              <div className="prose prose-stone prose-lg max-w-none">
                 {block.heading && (
                    <div className="relative">
                        <h2 className="text-2xl md:text-3xl font-sans font-bold text-stone-900 mt-4 mb-4 flex items-center">
                            <button onClick={() => setIconPickerIdx(iconPickerIdx === idx ? null : idx)} className="hover:bg-stone-100 rounded p-1 -ml-1 mr-1 transition-colors">
                                {getIconComponent(block.iconType)}
                            </button>
                            <EditableText tagName="span" html={block.heading} onSave={updateHeading} />
                        </h2>
                        {iconPickerIdx === idx && (
                            <div className="absolute top-10 left-0 z-50">
                                <div className="fixed inset-0" onClick={() => setIconPickerIdx(null)} />
                                <IconPicker current={block.iconType || 'default'} onSelect={updateIcon} onClose={() => setIconPickerIdx(null)} />
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

        return (
            <React.Fragment key={idx}>
                <BlockWrapper 
                    index={idx} 
                    total={blocks.length} 
                    onMove={(dir) => onMove(idx, dir)}
                    onDelete={() => onDelete(idx)}
                >
                    {content}
                </BlockWrapper>
                {/* 底部添加区 */}
                <AddBlockZone onAdd={(t) => onAdd(idx + 1, t)} options={MAIN_OPTIONS} />
            </React.Fragment>
        );
      })}
    </div>
  );
};

// --- SidebarRenderer (重构) ---
const SidebarRenderer: React.FC<{ 
    blocks: SidebarBlock[], 
    onUpdateBlock: (idx: number, b: SidebarBlock) => void,
    onAdd: (idx: number, type: string) => void,
    onMove: (idx: number, dir: 'up'|'down') => void,
    onDelete: (idx: number) => void
}> = ({ blocks, onUpdateBlock, onAdd, onMove, onDelete }) => {
  const [emojiPickerIdx, setEmojiPickerIdx] = useState<number | null>(null);
  
  const SIDEBAR_OPTIONS = [
      { label: 'Definition', type: 'definition' },
      { label: 'Profile', type: 'profile' },
      { label: 'Stat', type: 'stat' }
  ];

  return (
    <div className="space-y-4">
       <AddBlockZone onAdd={(t) => onAdd(0, t)} options={SIDEBAR_OPTIONS} />
       
       {blocks.map((block, idx) => {
          // ... (Update handlers same as before) ...
          const updateHeading = (v: string) => onUpdateBlock(idx, { ...block, heading: v });
          const updateBody = (v: string) => onUpdateBlock(idx, { ...block, body: v });
          const updateEmoji = (v: string) => onUpdateBlock(idx, { ...block, emoji: v });

          let content = null;
          // ... (Render Logic same as before, simplified for brevity) ...
          content = (
             <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
                 {/* ... (Your existing render logic for profile/stat/def) ... */}
                 {block.type === 'profile' && (
                     <div className="flex items-start gap-4">
                         <div className="relative">
                             <button onClick={() => setEmojiPickerIdx(emojiPickerIdx === idx ? null : idx)} className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center text-2xl">
                                 {block.emoji || <User size={20} />}
                             </button>
                             {emojiPickerIdx === idx && (
                                <div className="absolute top-full left-0 z-50">
                                    <div className="fixed inset-0" onClick={() => setEmojiPickerIdx(null)} />
                                    <EmojiPicker onSelect={updateEmoji} onClose={() => setEmojiPickerIdx(null)} />
                                </div>
                             )}
                         </div>
                         <div className="flex-1">
                             <h4 className="font-bold"><EditableText tagName="span" html={block.heading} onSave={updateHeading} /></h4>
                             <div className="text-xs text-stone-500 mt-1"><EditableText tagName="div" html={block.body} onSave={updateBody} /></div>
                         </div>
                     </div>
                 )}
                 {block.type !== 'profile' && (
                     <>
                        <h4 className="font-bold text-stone-800 mb-2 flex items-center gap-2">
                            {block.type === 'stat' && <Hash size={12} className="text-stone-400"/>}
                            <EditableText tagName="span" html={block.heading} onSave={updateHeading} />
                        </h4>
                        <div className="text-sm text-stone-600"><EditableText tagName="div" html={block.body} onSave={updateBody} /></div>
                     </>
                 )}
             </div>
          );

          return (
            <React.Fragment key={idx}>
                <BlockWrapper 
                    index={idx} 
                    total={blocks.length} 
                    onMove={(dir) => onMove(idx, dir)}
                    onDelete={() => onDelete(idx)}
                >
                    {content}
                </BlockWrapper>
                <AddBlockZone onAdd={(t) => onAdd(idx + 1, t)} options={SIDEBAR_OPTIONS} />
            </React.Fragment>
          );
       })}
    </div>
  );
};

export const TheArtifact: React.FC<TheArtifactProps> = ({ 
  pebble, 
  onVerify, 
  onBack, 
  onUpdateContent, 
  onUpdateEmoji, 
  onUpdateMetadata, 
  onUpdateGlobal,
  onAddBlock,
  onMoveBlock,
  onDeleteBlock
}) => {
  const [level, setLevel] = useState<CognitiveLevel>(CognitiveLevel.ELI5);
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());
  
  const content = pebble.content[level];
  const questions = pebble.socraticQuestions || [];
  const isLocked = pebble.isVerified; // 苏格拉底：视觉上的锁定状态（绿色）

// ★★★ 新增：当 Pebble ID 变化或 isVerified 变化时，同步勾选状态 ★★★
  useEffect(() => {
      if (pebble.isVerified) {
          // 如果已验证，默认全选所有问题
          setCompletedQuestions(new Set(questions.map((_, i) => i)));
      } else {
          // 如果未验证（且是切换了Pebble），重置为空
          // 注意：这里可能需要更复杂的逻辑来保留用户未提交的勾选，但简化起见，未验证默认不勾选
          // 或者保持当前 state 不变（如果只是 cancel verify）
      }
  }, [pebble.id, pebble.isVerified, questions.length]);

  // --- Handlers ---

  const updateQuestions = (newQuestions: string[]) => {
      const deepCopy = [...newQuestions];
      onUpdateGlobal(pebble.id, 'socraticQuestions', deepCopy);
  };

  // ★★★ 核心修改：勾选/取消勾选逻辑 ★★★
  const handleToggleQuestion = (index: number) => {
    const newSet = new Set(completedQuestions);
    if (newSet.has(index)) {
        newSet.delete(index); // 取消勾选
    } else {
        newSet.add(index);    // 勾选
    }
    setCompletedQuestions(newSet);
    
    // 判断是否全选
    const allChecked = questions.length > 0 && newSet.size === questions.length;
    
    // 只有当状态不一致时才触发更新
    // 如果全选了 -> Verify(true)
    // 如果没全选 -> Verify(false)
    if (allChecked !== isLocked) {
        onVerify(pebble.id, allChecked);
    }
  };

  const handleEditQuestion = (index: number, newVal: string) => {
      const newQuestions = [...questions];
      newQuestions[index] = newVal;
      updateQuestions(newQuestions);
  };

  // ★★★ 核心修改：新增问题时，自动取消验证状态 ★★★
  const handleAddQuestion = () => {
      const newQuestions = [...questions, "New reflection question..."];
      updateQuestions(newQuestions);
      
      // 因为加了新问题，肯定没全选，所以取消验证
      if (isLocked) {
          onVerify(pebble.id, false);
      }
  };

  const handleDeleteQuestion = (index: number) => {
      const newQuestions = questions.filter((_, i) => i !== index);
      updateQuestions(newQuestions);
      
      // 删除后，需要重新检查剩余的是否全选了
      // 这里的逻辑稍微复杂，因为索引变了，简单起见，我们重置勾选或取消验证
      // 最安全的做法：删除导致状态不确定，先取消验证，让用户重新确认
      if (isLocked) {
          onVerify(pebble.id, false);
      }
      
      // 同时也需要从 completedQuestions 里移除被删的 index，并调整后续 index
      // 这里为了简单，直接清空勾选，强迫用户重新勾选确认
      setCompletedQuestions(new Set());
  };

  const handleDeleteSection = () => {
      if(window.confirm("Remove the Socratic Verification section?")) {
          // 1. 清空问题列表
          updateQuestions([]);
          // 2. 清空本地勾选记录 (关键步骤，防止下次恢复时残留)
          setCompletedQuestions(new Set());
          // 3. 状态设为未验证
          if (isLocked) onVerify(pebble.id, false); 
      }
  };

  const handleRestoreSection = () => {
      // 1. 恢复默认问题
      updateQuestions([
          "Why is this concept important?", 
          "How does this apply to your work?", 
          "What is a potential counter-argument?"
      ]);
      
      // 2. ★★★ 显式清空勾选状态，确保新出来的都是空的 ★★★
      setCompletedQuestions(new Set());

      // 3. ★★★ 显式重置验证状态为 False ★★★
      // 即使之前是 Verified 的，现在重置了问题，也应该变成 Unverified
      onVerify(pebble.id, false);
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
        {/* @ts-ignore */}
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
                 
                 <div className="text-4xl md:text-6xl font-display font-bold text-stone-900 leading-tight tracking-tight">
                    <EditableText 
                        tagName="h1" 
                        html={content.title} 
                        onSave={(val) => onUpdateMetadata(pebble.id, level, 'title', val)}
                    />
                 </div>

                 <div className="text-xl md:text-2xl text-stone-500 font-serif max-w-3xl leading-relaxed">
                    <EditableText 
                        tagName="p" 
                        html={content.summary} 
                        onSave={(val) => onUpdateMetadata(pebble.id, level, 'summary', val)}
                    />
                 </div>

                 <div className="flex flex-wrap gap-2 mt-2">
                    {content.keywords.map((k, i) => (
                       <span key={i} className="text-xs font-bold text-stone-400 uppercase tracking-wide bg-stone-100 px-1.5 py-0.5 rounded hover:bg-stone-200 transition-colors cursor-text">
                           #<EditableText 
                               tagName="span" 
                               html={k} 
                               onSave={(val) => {
                                   const newKeys = [...content.keywords];
                                   newKeys[i] = val;
                                   onUpdateMetadata(pebble.id, level, 'keywords', newKeys);
                               }} 
                           />
                       </span>
                    ))}
                 </div>
             </div>
        </div>

        {/* Magazine Layout Grid */}
        <div className="max-w-6xl mx-auto px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Main Column */}
            <div className="lg:col-span-8">
                <MainContentRenderer 
                    blocks={content.mainContent} 
                    onUpdateBlock={(idx, b) => onUpdateContent(pebble.id, level, 'main', idx, b)}
                    onAdd={(idx, type) => onAddBlock(pebble.id, level, 'main', idx, type)}
                    onMove={(idx, dir) => onMoveBlock(pebble.id, level, 'main', idx, dir)}
                    onDelete={(idx) => onDeleteBlock(pebble.id, level, 'main', idx)}
                />
                
                {/* --- SOCRATIC VERIFICATION SECTION --- */}
                {questions.length > 0 ? (
                    <div className={`mt-20 rounded-2xl p-8 border transition-all duration-500 group/socratic relative ${isLocked ? 'bg-stone-900 text-stone-100 border-stone-800' : 'bg-white border-stone-200 shadow-sm'}`}>
                        
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="font-display font-bold text-xl flex items-center gap-3">
                                {isLocked ? <CheckCircle2 className="text-green-400" /> : <Circle className="text-stone-400" />}
                                Socratic Verification
                            </h3>
                            <button 
                                onClick={handleDeleteSection}
                                className="opacity-0 group-hover/socratic:opacity-100 p-2 hover:bg-red-100 hover:text-red-500 text-stone-400 rounded transition-all"
                                title="Remove Section"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="space-y-4">
                            {questions.map((q, idx) => (
                                <div 
                                    // ★★★ 关键修改：不要只用 idx 做 key，加上内容本身防止渲染复用导致的 bug
                                    // 如果允许重复内容，可以暂时用 idx，但 EditableText 需要 key 更新来重置内部状态
                                    key={`${idx}-${q.substring(0, 5)}`} 
                                    className={`group/item relative p-4 rounded-xl border transition-all flex items-start gap-4 ${
                                        isLocked 
                                        ? 'bg-stone-800 border-stone-700' 
                                        : completedQuestions.has(idx) 
                                            ? 'bg-stone-50 border-stone-200 opacity-60' 
                                            : 'bg-stone-50 border-stone-100 hover:border-stone-300 hover:shadow-md'
                                    }`}
                                >
                                    <div 
                                        onClick={() => handleToggleQuestion(idx)}
                                        className={`mt-1 h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                                        completedQuestions.has(idx) || isLocked ? 'border-transparent bg-green-500' : 'border-stone-300'
                                    }`}>
                                        {(completedQuestions.has(idx) || isLocked) && <CheckCircle2 size={12} className="text-white" />}
                                    </div>
                                    
                                    <div className={`flex-1 text-base font-serif leading-relaxed ${isLocked ? 'text-stone-300' : 'text-stone-700'}`}>
                                        <EditableText 
                                            tagName="div" 
                                            html={q} 
                                            onSave={(val) => handleEditQuestion(idx, val)} 
                                        />
                                    </div>

                                    <button 
                                        onClick={() => handleDeleteQuestion(idx)}
                                        className="opacity-0 group-hover/item:opacity-100 absolute right-2 top-2 p-1.5 text-stone-400 hover:text-red-500 hover:bg-stone-200 rounded transition-all"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add Button */}
                        <div className="mt-6 flex justify-center">
                            <button 
                                onClick={handleAddQuestion}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                                    isLocked 
                                    ? 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200' 
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                                }`}
                            >
                                <Plus size={16} /> Add Question
                            </button>
                        </div>
                    </div>
                ) : (
                    // Empty State
                    <div className="mt-20 border-t border-stone-200 pt-8 flex justify-center">
                        <button 
                            onClick={handleRestoreSection}
                            className="group flex flex-col items-center gap-2 text-stone-400 hover:text-blue-500 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-stone-300 group-hover:border-blue-400 flex items-center justify-center">
                                <Plus size={20} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest">Add Verification Layer</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-4 hidden lg:block">
                <div className="sticky top-8">
                    <div className="mb-4 text-xs font-bold text-stone-400 uppercase tracking-widest border-b border-stone-200 pb-2">
                        Context & Data
                    </div>
                    {/* @ts-ignore */}
                    <SidebarRenderer 
                        blocks={content.sidebarContent} 
                        onUpdateBlock={(idx, b) => onUpdateContent(pebble.id, level, 'sidebar', idx, b)}
                        onAdd={(idx, type) => onAddBlock(pebble.id, level, 'sidebar', idx, type)}
                        onMove={(idx, dir) => onMoveBlock(pebble.id, level, 'sidebar', idx, dir)}
                        onDelete={(idx) => onDeleteBlock(pebble.id, level, 'sidebar', idx)}
                    />
                </div>
            </div>

            {/* Mobile Sidebar */}
            <div className="lg:hidden space-y-6 mt-12 pt-12 border-t border-stone-200">
                 {/* ... (Mobile sidebar logic same as desktop) ... */}
                 {/* @ts-ignore */}
                 <SidebarRenderer 
                    blocks={content.sidebarContent} 
                    onUpdateBlock={(idx, b) => onUpdateContent(pebble.id, level, 'sidebar', idx, b)}
                    onAdd={(idx, type) => onAddBlock(pebble.id, level, 'sidebar', idx, type)}
                    onMove={(idx, dir) => onMoveBlock(pebble.id, level, 'sidebar', idx, dir)}
                    onDelete={(idx) => onDeleteBlock(pebble.id, level, 'sidebar', idx)}
                 />
            </div>

        </div>
        
        {/* @ts-ignore */}
        <FloatingMenu />
        
        <CognitiveSlider level={level} onChange={setLevel} />
    </div>
  );
};