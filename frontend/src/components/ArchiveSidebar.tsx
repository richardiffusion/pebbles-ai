import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Library, ArrowRight, Loader2, ChevronRight, ChevronDown, 
  MoreHorizontal, Edit2, Trash2, Folder as FolderIcon,
  CornerDownLeft, Link as LinkIcon, Undo, 
  PanelLeft, Layers, ArrowLeft, Plus, PenTool
} from 'lucide-react';
import { PebbleData, GenerationTask, Folder } from '../types';

interface ArchiveSidebarProps {
  archive: PebbleData[];
  folders: Folder[];
  generationTask: GenerationTask | null;
  sidebarWidth: number;
  onSetSidebarWidth: (width: number) => void;
  onSelectPebble: (pebble: PebbleData) => void;
  onSelectTask: () => void;
  onGoToArchive: () => void;
  onBack: () => void; // go to Drop
  isImmersionMode: boolean;
  onRenamePebble: (id: string, newTopic: string) => void;
  onDeletePebbles: (ids: string[]) => void;
  onRestorePebbles: (ids: string[]) => void;
  onMovePebble: (pebbleId: string, targetFolderId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onUngroupFolder: (id: string) => void;
  onCreateBlank: () => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetId: string | null;
  type: 'folder' | 'pebble';
}

interface ToastState {
  visible: boolean;
  message: string;
  idsToRestore: string[];
}

export const ArchiveSidebar: React.FC<ArchiveSidebarProps> = ({ 
  archive, 
  folders,
  generationTask, 
  sidebarWidth,
  onSetSidebarWidth,
  onSelectPebble, 
  onSelectTask,
  onGoToArchive,
  onBack,
  isImmersionMode,
  onRenamePebble,
  onDeletePebbles,
  onRestorePebbles,
  onMovePebble,
  onRenameFolder,
  onUngroupFolder,
  onCreateBlank
}) => {
  // State
  // ★★★ 修改：删除了 activeTab 状态，因为侧边栏不再需要管理 Tabs
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [cardViewFolderId, setCardViewFolderId] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, targetId: null, type: 'pebble' });
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', idsToRestore: [] });
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const visiblePebbles = useMemo(() => archive.filter(p => !p.isDeleted), [archive]);
  const isCardMode = sidebarWidth > 300;

  // --- Effects (Resize & Click Outside) ---
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu.visible && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
      if (editingId && !(e.target as HTMLElement).closest('.rename-input')) {
        commitRename();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu.visible, editingId, editName]);

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isResizing.current) return;
          let newWidth = e.clientX;
          if (Math.abs(newWidth - 260) < 20) newWidth = 260;
          if (Math.abs(newWidth - 380) < 20) newWidth = 380;
          if (newWidth < 240) newWidth = 240;
          if (newWidth > 480) newWidth = 480;
          onSetSidebarWidth(newWidth);
      };
      const handleMouseUp = () => {
          isResizing.current = false;
          document.body.style.cursor = 'default';
          document.body.style.userSelect = 'auto';
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      };
  }, [onSetSidebarWidth]);

  // --- Handlers (Drag, Rename, Delete, etc.) ---
  const startResizing = () => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const toggleWidthMode = () => {
      onSetSidebarWidth(isCardMode ? 260 : 380);
  };

  const handleDragStart = (e: React.DragEvent, pebble: PebbleData) => {
    e.dataTransfer.setData("text/pebble-id", pebble.id);
    e.dataTransfer.effectAllowed = "all";
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (folderId && folderId !== dragOverFolderId) {
        setDragOverFolderId(folderId);
        if (!isCardMode && !expandedFolders.has(folderId)) {
            setTimeout(() => {
                setExpandedFolders(prev => new Set(prev).add(folderId));
            }, 600);
        }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverFolderId(null);
  };

  const handleDropOnFolder = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    const pebbleId = e.dataTransfer.getData("text/pebble-id");
    if (pebbleId) onMovePebble(pebbleId, folderId);
  };

  const toggleFolderListMode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(expandedFolders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedFolders(next);
  };

  const enterFolderCardMode = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setCardViewFolderId(id);
  };

  const startRenaming = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
       const isPebble = archive.some(p => p.id === editingId);
       const isFolder = folders.some(f => f.id === editingId);
       if (isPebble) onRenamePebble(editingId, editName.trim());
       if (isFolder) onRenameFolder(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
      onDeletePebbles([id]);
      setToast({ visible: true, message: 'Item deleted', idsToRestore: [id] });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 5000);
      setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleUngroup = (id: string) => {
      onUngroupFolder(id);
      setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleContextMenu = (e: React.MouseEvent, id: string, type: 'folder' | 'pebble') => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, targetId: id, type });
  };

  const copyToInput = (text: string) => {
      navigator.clipboard.writeText(text);
      setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // --- Render Helpers ---
  const renderToast = () => {
    if (!toast.visible) return null;
    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-stone-100 px-4 py-2 rounded-full shadow-lg flex items-center gap-4 text-xs animate-in slide-in-from-bottom-2 fade-in whitespace-nowrap">
            <span>{toast.message}</span>
            <button 
                onClick={() => {
                    onRestorePebbles(toast.idsToRestore);
                    setToast(prev => ({ ...prev, visible: false }));
                }}
                className="font-bold text-stone-400 hover:text-white flex items-center gap-1"
            >
                <Undo size={12} /> Undo
            </button>
        </div>
    );
  };

  const renderContextMenuOverlay = () => {
      if (!contextMenu.visible || !contextMenu.targetId) return null;
      const targetPebble = visiblePebbles.find(p => p.id === contextMenu.targetId);
      const targetFolder = folders.find(f => f.id === contextMenu.targetId);
      
      return (
        <div 
          ref={contextMenuRef}
          className="fixed z-[100] w-48 bg-stone-900/95 backdrop-blur border border-stone-700 rounded-lg shadow-2xl py-1 text-stone-200 text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
            {targetPebble && (
                <>
                    <button onClick={() => { onSelectPebble(targetPebble); setContextMenu(prev => ({...prev, visible: false})); }} className="w-full text-left px-4 py-2 hover:bg-stone-800 flex items-center gap-2">
                        <CornerDownLeft size={12} /> Open
                    </button>
                    <button onClick={() => startRenaming(targetPebble.id, targetPebble.topic)} className="w-full text-left px-4 py-2 hover:bg-stone-800 flex items-center gap-2">
                        <Edit2 size={12} /> Rename
                    </button>
                    <button onClick={() => copyToInput(targetPebble.topic)} className="w-full text-left px-4 py-2 hover:bg-stone-800 flex items-center gap-2">
                        <LinkIcon size={12} /> Copy Title
                    </button>
                    <div className="h-px bg-stone-800 my-1 mx-2" />
                    <button onClick={() => handleDelete(targetPebble.id)} className="w-full text-left px-4 py-2 hover:bg-red-900/30 text-red-400 flex items-center gap-2">
                        <Trash2 size={12} /> Delete
                    </button>
                </>
            )}
            {targetFolder && (
                 <>
                    <button onClick={() => startRenaming(targetFolder.id, targetFolder.name)} className="w-full text-left px-4 py-2 hover:bg-stone-800 flex items-center gap-2">
                        <Edit2 size={12} /> Rename
                    </button>
                    <button onClick={() => handleUngroup(targetFolder.id)} className="w-full text-left px-4 py-2 hover:bg-stone-800 flex items-center gap-2">
                        <Layers size={12} /> Ungroup
                    </button>
                 </>
            )}
        </div>
      );
  };

  const renderListMode = (parentId: string | null, depth: number = 0) => {
      const currentFolders = folders.filter(f => f.parentId === parentId);
      const currentPebbles = visiblePebbles.filter(p => p.folderId === parentId).sort((a,b) => b.timestamp - a.timestamp);

      if (parentId === null && currentFolders.length === 0 && currentPebbles.length === 0 && !generationTask) {
           return (
            <div className="text-center py-10 text-xs text-stone-400 italic">
               Your mind is clear.<br/>Cast your first pebble.
            </div>
           );
      }

      return (
          <div className="space-y-0.5">
              {currentFolders.map(folder => {
                  const isEditing = editingId === folder.id;
                  return (
                  <div key={folder.id}>
                      <div 
                        className={`group relative flex items-center px-2 py-1.5 rounded-md text-stone-600 hover:text-stone-900 hover:bg-white/50 cursor-pointer select-none transition-colors ${dragOverFolderId === folder.id ? 'bg-blue-100/50 ring-1 ring-blue-300' : ''}`}
                        style={{ paddingLeft: `${depth * 12 + 8}px` }}
                        onClick={(e) => toggleFolderListMode(e, folder.id)}
                        onDragOver={(e) => handleDragOver(e, folder.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropOnFolder(e, folder.id)}
                        onContextMenu={(e) => handleContextMenu(e, folder.id, 'folder')}
                      >
                         <span className="mr-1 opacity-70 hover:opacity-100 p-0.5 rounded hover:bg-stone-200 transition-colors">
                             {expandedFolders.has(folder.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                         </span>
                         <FolderIcon size={14} className="mr-2 text-stone-400 fill-stone-200" />
                         
                         {isEditing ? (
                             <input 
                                type="text"
                                className="rename-input flex-1 min-w-0 bg-stone-800 text-stone-100 text-xs px-1 py-0.5 rounded border border-stone-600 focus:outline-none focus:border-stone-400"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                autoFocus
                                onBlur={commitRename}
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter') commitRename();
                                    if(e.key === 'Escape') setEditingId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                             />
                         ) : (
                             <span className="text-xs font-semibold truncate flex-1">{folder.name}</span>
                         )}

                         {!isEditing && (
                            <button 
                                className="ml-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-300 rounded text-stone-400 hover:text-stone-800 transition-all"
                                onClick={(e) => { e.stopPropagation(); startRenaming(folder.id, folder.name); }}
                            >
                                <Edit2 size={10} />
                            </button>
                         )}
                      </div>
                      {expandedFolders.has(folder.id) && renderListMode(folder.id, depth + 1)}
                  </div>
              )})}

              {currentPebbles.map(pebble => {
                  const isEditing = editingId === pebble.id;
                  return (
                    <div 
                        key={pebble.id}
                        draggable={!isEditing}
                        onDragStart={(e) => handleDragStart(e, pebble)}
                        onClick={() => !isEditing && onSelectPebble(pebble)}
                        onContextMenu={(e) => handleContextMenu(e, pebble.id, 'pebble')}
                        className="group relative flex items-center px-2 py-1.5 rounded-md hover:bg-white/60 cursor-pointer select-none transition-all"
                        style={{ paddingLeft: `${depth * 12 + 20}px` }}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mr-2 transition-transform ${isEditing ? 'scale-0' : 'scale-100'} ${pebble.isVerified ? 'bg-green-500' : 'bg-stone-400'}`} />
                        <div className="flex-1 min-w-0 relative">
                            {isEditing ? (
                                <input 
                                    type="text"
                                    className="rename-input w-full bg-stone-800 text-stone-100 text-xs px-1 py-0.5 rounded border border-stone-600 focus:outline-none focus:border-stone-400"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    autoFocus
                                    onBlur={commitRename}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitRename();
                                        if (e.key === 'Escape') setEditingId(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className="text-sm text-stone-500 group-hover:text-stone-900 truncate block transition-all group-hover:-translate-x-1 duration-300">
                                    {pebble.topic}
                                </span>
                            )}
                        </div>
                        {!isEditing && (
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pl-4 bg-gradient-to-l from-stone-200 via-stone-200 to-transparent">
                                <button 
                                    className="p-1 hover:bg-stone-300 rounded text-stone-500 hover:text-stone-800 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); startRenaming(pebble.id, pebble.topic); }}
                                >
                                    <Edit2 size={10} />
                                </button>
                                <button 
                                    className="p-1 hover:bg-red-100 rounded text-stone-400 hover:text-red-500 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(pebble.id); }}
                                >
                                    <Trash2 size={10} />
                                </button>
                            </div>
                        )}
                    </div>
                  );
              })}
          </div>
      );
  };

  const renderCardMode = () => {
      const currentContextId = cardViewFolderId;
      const currentFolder = folders.find(f => f.id === currentContextId);
      const subFolders = folders.filter(f => f.parentId === currentContextId);
      const items = visiblePebbles.filter(p => p.folderId === currentContextId).sort((a,b) => b.timestamp - a.timestamp);

      return (
          <div className="space-y-4 px-1">
              {currentContextId && (
                  <div className="flex items-center gap-2 mb-4">
                      <button 
                        onClick={() => setCardViewFolderId(currentFolder?.parentId || null)}
                        className="p-1.5 bg-white border border-stone-200 rounded-full hover:bg-stone-100 transition-colors"
                      >
                          <ArrowLeft size={14} />
                      </button>
                      <h3 className="font-display font-bold text-lg text-stone-800">{currentFolder?.name}</h3>
                  </div>
              )}
              {subFolders.map(folder => {
                  const isEditing = editingId === folder.id;
                  const itemCount = visiblePebbles.filter(p => p.folderId === folder.id).length;
                  const subFolderCount = folders.filter(f => f.parentId === folder.id).length;
                  return (
                      <div 
                        key={folder.id}
                        onClick={(e) => enterFolderCardMode(e, folder.id)}
                        onContextMenu={(e) => handleContextMenu(e, folder.id, 'folder')}
                        onDragOver={(e) => handleDragOver(e, folder.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropOnFolder(e, folder.id)}
                        className={`relative group bg-stone-100 border border-stone-200 p-4 rounded-xl cursor-pointer hover:bg-white hover:shadow-md transition-all ${dragOverFolderId === folder.id ? 'ring-2 ring-blue-300 bg-blue-50' : ''}`}
                      >
                          <div className="absolute top-0 right-0 -mt-1 -mr-1 w-full h-full border border-stone-200 bg-stone-50 rounded-xl z-[-1] translate-x-1 translate-y-1" />
                          <div className="flex justify-between items-start">
                             <div className="flex items-center gap-3">
                                 <div className="bg-stone-200 p-2 rounded-lg text-stone-500"><Layers size={20} /></div>
                                 <div>
                                     {isEditing ? (
                                         <input 
                                            type="text"
                                            className="rename-input bg-stone-800 text-stone-100 text-sm px-2 py-1 rounded w-full"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            autoFocus
                                            onBlur={commitRename}
                                            onKeyDown={(e) => { if(e.key === 'Enter') commitRename(); if(e.key === 'Escape') setEditingId(null); }}
                                            onClick={(e) => e.stopPropagation()}
                                         />
                                     ) : (
                                         <h4 className="font-bold text-stone-800">{folder.name}</h4>
                                     )}
                                     <span className="text-xs text-stone-500">{itemCount} items {subFolderCount > 0 && `• ${subFolderCount} folders`}</span>
                                 </div>
                             </div>
                             <button 
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-200 rounded text-stone-400 hover:text-stone-800"
                                onClick={(e) => handleContextMenu(e, folder.id, 'folder')}
                             >
                                 <MoreHorizontal size={16} />
                             </button>
                          </div>
                      </div>
                  );
              })}
              {items.map(pebble => {
                  const emojis = pebble.content.ELI5.emojiCollage || [];
                  return (
                      <div 
                        key={pebble.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, pebble)}
                        onClick={() => onSelectPebble(pebble)}
                        onContextMenu={(e) => handleContextMenu(e, pebble.id, 'pebble')}
                        className="group bg-white border border-stone-200 rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
                      >
                          <div className="h-24 w-full bg-stone-100 overflow-hidden relative flex items-center justify-center gap-1">
                              {emojis.slice(0, 3).map((e, i) => (
                                 <span key={i} className="text-4xl filter drop-shadow-sm transform group-hover:scale-110 transition-transform">{e}</span>
                              ))}
                              {pebble.isVerified && <div className="absolute top-2 right-2 bg-green-500 w-2 h-2 rounded-full ring-2 ring-white" />}
                          </div>
                          <div className="p-4">
                              <h4 className="font-display font-bold text-stone-900 leading-tight mb-2 line-clamp-2">{pebble.topic}</h4>
                              <div className="flex gap-2 mb-3">
                                  {pebble.content.ELI5.keywords.slice(0, 2).map((k, i) => (
                                      <span key={i} className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-500 uppercase tracking-wide">#{k}</span>
                                  ))}
                              </div>
                              <p className="text-xs text-stone-500 font-serif line-clamp-2 leading-relaxed">
                                  {pebble.content.ELI5.summary}
                              </p>
                          </div>
                      </div>
                  );
              })}
              {subFolders.length === 0 && items.length === 0 && (
                  <div className="text-center py-12 text-stone-400 italic text-sm border-2 border-dashed border-stone-100 rounded-xl">Empty collection</div>
              )}
          </div>
      );
  };

  return (
    <aside 
      style={{ width: sidebarWidth }}
      className={`min-w-[240px] max-w-[480px] h-screen bg-stone-100/80 backdrop-blur-xl border-r border-stone-200 transition-opacity duration-500 ease-in-out flex flex-col z-20 absolute top-0 left-0 lg:relative ${isImmersionMode ? 'opacity-30 -translate-x-10 pointer-events-none' : 'opacity-100 translate-x-0 pointer-events-auto'}`}
    >
      {/* ★★★ 修改：重构 Header，移除了 Tab 按钮 ★★★ */}
      <div className="flex flex-col border-b border-stone-200/50">
          
          {/* 1. Archive Link (最顶部) */}
          <div 
            onClick={onGoToArchive}
            className="p-4 flex items-center justify-between cursor-pointer group hover:bg-stone-50 transition-colors"
          >
             <div className="flex items-center gap-2 text-stone-600 group-hover:text-stone-900">
                <Library size={18} />
                <span className="font-display font-bold text-sm tracking-widest uppercase">Archive</span>
             </div>
             <ArrowRight size={14} className="text-stone-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
          </div>

          {/* ★★★ 修改：操作按钮区 (双按钮布局) ★★★ */}
          <div className="px-4 pb-4 grid grid-cols-2 gap-2">
             {/* 左边：AI 生成 (Cast) */}
             <button 
                onClick={onBack}
                className="bg-stone-900 hover:bg-stone-800 text-stone-100 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                title="AI Construct"
             >
                <Plus size={14} />
                <span>Cast Pebble</span>
             </button>

             {/* 右边：手动创建 (Draft) */}
             <button 
                onClick={onCreateBlank}
                className="bg-white hover:bg-stone-50 text-stone-900 border border-stone-200 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                title="Blank Note"
             >
                <PenTool size={14} />
                <span>Draft Empty</span>
             </button>
          </div>
      </div>

      {/* Resize Handle */}
      <div 
        onMouseDown={startResizing}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-50 hover:bg-blue-400/50 transition-colors group"
      >
          <button 
             onMouseDown={(e) => { e.stopPropagation(); toggleWidthMode(); }}
             className="absolute top-1/2 -left-3 w-6 h-8 bg-stone-300 rounded-l flex items-center justify-center text-stone-600 hover:bg-stone-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          >
             <PanelLeft size={14} />
          </button>
      </div>

      {/* Stream List (第三层) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin relative">
        {generationTask && (
            <div 
                onClick={onSelectTask}
                className={`group relative p-3 rounded-lg cursor-pointer mb-6 border transition-all mx-1 ${
                    generationTask.status === 'completed' 
                    ? 'bg-stone-50 border-stone-300 shadow-sm' 
                    : 'bg-white/40 border-stone-200/50 animate-pulse'
                }`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 flex items-center justify-center">
                        {generationTask.status === 'generating' ? (
                            <Loader2 size={10} className="text-stone-400 animate-spin" />
                        ) : (
                            <div className="w-1.5 h-1.5 bg-stone-900 rounded-full animate-bounce" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium truncate block ${generationTask.status === 'completed' ? 'text-stone-900' : 'text-stone-500 italic'}`}>
                            {generationTask.status === 'completed' ? generationTask.result?.topic : generationTask.topic}
                        </span>
                        {generationTask.status === 'generating' && (
                            <span className="text-[9px] text-stone-400 font-mono uppercase tracking-wider block mt-0.5">
                                {generationTask.logs[generationTask.logs.length - 1]?.message.replace('> ', '').slice(0, 25) || 'Initializing...'}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        )}

        {isCardMode ? renderCardMode() : renderListMode(null, 0)}
      </div>
      
      <div className="absolute bottom-0 w-full p-4 pointer-events-none flex justify-center">
         {renderToast()}
      </div>

      {renderContextMenuOverlay()}
    </aside>
  );
};