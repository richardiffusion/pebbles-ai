import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PebbleData, Folder, CognitiveLevel } from '../types';
import { GraphView } from '../components/GraphView';
import { 
  ArrowLeft, GitGraph, Orbit, Box, ChevronRight, Home, 
  LayoutGrid, List as ListIcon, ChevronDown, CheckCircle2, 
  Circle, FileText, X, Image as ImageIcon, MoreHorizontal,
  Trash2, Edit2, Info, CheckSquare, Square, Undo, CornerDownLeft
} from 'lucide-react';

interface TheArchiveProps {
  pebbles: PebbleData[];
  folders: Folder[];
  onSelectPebble: (pebble: PebbleData) => void;
  onBack: () => void;
  onCreateFolder: (name: string, parentId: string | null, initialPebbleIds: string[]) => string;
  onMovePebble: (pebbleId: string, targetFolderId: string | null) => void;
  onRenamePebble: (id: string, newTopic: string) => void;
  onDeletePebbles: (ids: string[]) => void;
  onRestorePebbles: (ids: string[]) => void;
}

type ArchiveTab = 'vault' | 'stream' | 'orbit';
type LayoutMode = 'grid' | 'list';

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

export const TheArchive: React.FC<TheArchiveProps> = ({ 
  pebbles, 
  folders, 
  onSelectPebble, 
  onBack,
  onCreateFolder,
  onMovePebble,
  onRenamePebble,
  onDeletePebbles,
  onRestorePebbles
}) => {
  const [activeTab, setActiveTab] = useState<ArchiveTab>('vault');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Interaction State
  const [draggedPebbleId, setDraggedPebbleId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, targetId: null, type: 'pebble' });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  // Slow Double Click Logic
  const lastClickRef = useRef<{ id: string, time: number } | null>(null);

  // List View specific states
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [previewPebble, setPreviewPebble] = useState<PebbleData | null>(null);

  // Toast State
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', idsToRestore: [] });

  // Filter out deleted items
  const visiblePebbles = useMemo(() => pebbles.filter(p => !p.isDeleted), [pebbles]);
  
  // --- Logic for Vault View ---
  
  // Navigation Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const path: { id: string | null, name: string }[] = [{ id: null, name: 'Archive' }];
    let curr = currentFolderId;
    const stack = [];
    while (curr) {
      const folder = folders.find(f => f.id === curr);
      if (folder) {
        stack.unshift({ id: folder.id, name: folder.name });
        curr = folder.parentId;
      } else {
        break;
      }
    }
    return [...path, ...stack];
  }, [currentFolderId, folders]);

  // Current Level Items (for Grid View)
  const gridItems = useMemo(() => {
    const childFolders = folders.filter(f => f.parentId === currentFolderId);
    const childPebbles = visiblePebbles.filter(p => p.folderId === currentFolderId);
    
    if (search) {
      const term = search.toLowerCase();
      return {
        folders: childFolders.filter(f => f.name.toLowerCase().includes(term)),
        pebbles: childPebbles.filter(p => p.topic.toLowerCase().includes(term))
      };
    }
    return { folders: childFolders, pebbles: childPebbles };
  }, [folders, visiblePebbles, currentFolderId, search]);

  // --- Handlers ---

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu.visible && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
      // Also clear editing if clicked outside
      if (editingId && !(e.target as HTMLElement).closest('.rename-input')) {
        commitRename();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu.visible, editingId, editName]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedPebbleId(id);
    // Auto select if not already
    if (!selectedIds.has(id)) {
        setSelectedIds(new Set([id]));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDropOnFolder = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    const idsToMove: string[] = Array.from(selectedIds);
    if (idsToMove.length > 0) {
      idsToMove.forEach(id => onMovePebble(id, targetFolderId));
      setSelectedIds(new Set());
    } else {
        // Fallback for single drag if selection failed
        const id = e.dataTransfer.getData("text/plain");
        if(id) onMovePebble(id, targetFolderId);
    }
    setDraggedPebbleId(null);
  };

  const handleDropOnPebble = (e: React.DragEvent, targetPebble: PebbleData) => {
    e.preventDefault();
    e.stopPropagation();
    
    const sourceId = e.dataTransfer.getData("text/plain");
    // If dropping on self, do nothing
    if (sourceId === targetPebble.id) return;
    
    // Check if dragging multiple items
    const idsToMove = new Set<string>(selectedIds);
    // Ensure sourceId is included if it wasn't selected first
    if (sourceId) idsToMove.add(sourceId);
    
    // Prevent target being in source
    if (idsToMove.has(targetPebble.id)) idsToMove.delete(targetPebble.id);

    if (idsToMove.size === 0) return;

    // Create new folder containing the target + all dragged items
    const initialIds: string[] = [targetPebble.id, ...Array.from(idsToMove)];
    onCreateFolder("New Collection", currentFolderId, initialIds);
    
    setDraggedPebbleId(null);
    setSelectedIds(new Set());
  };

  const handleDropOnTrash = (e: React.DragEvent) => {
    e.preventDefault();
    const idsToDelete: string[] = Array.from(selectedIds);
    if (idsToDelete.length > 0) {
        performDelete(idsToDelete);
    } else {
        const id = e.dataTransfer.getData("text/plain");
        if(id) performDelete([id]);
    }
    setDraggedPebbleId(null);
  };

  const performDelete = (ids: string[]) => {
      onDeletePebbles(ids);
      setSelectedIds(new Set());
      setToast({
          visible: true,
          message: `${ids.length} item${ids.length > 1 ? 's' : ''} deleted`,
          idsToRestore: ids
      });
      // Hide toast after 5s
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 5000);
  };

  const handleUndo = () => {
      onRestorePebbles(toast.idsToRestore);
      setToast({ visible: false, message: '', idsToRestore: [] });
  };

  const handleContextMenu = (e: React.MouseEvent, id: string, type: 'folder' | 'pebble') => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.has(id)) {
        setSelectedIds(new Set([id]));
    }
    setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        targetId: id,
        type
    });
  };

  const handleItemClick = (e: React.MouseEvent, id: string, pebble?: PebbleData) => {
      e.stopPropagation();
      // Multi-select with Cmd/Ctrl
      if (e.metaKey || e.ctrlKey) {
          const next = new Set(selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          setSelectedIds(next);
          return;
      }
      
      // Shift Select (Simplified range logic not implemented, just additive)
      if (e.shiftKey) {
           const next = new Set(selectedIds);
           next.add(id);
           setSelectedIds(next);
           return;
      }

      // Single Select & Slow Double Click Logic
      if (selectedIds.has(id) && selectedIds.size === 1) {
          const now = Date.now();
          if (lastClickRef.current && lastClickRef.current.id === id && (now - lastClickRef.current.time > 300) && (now - lastClickRef.current.time < 1500)) {
              startRenaming(id, pebble?.topic || '');
              lastClickRef.current = null;
              return;
          }
      }

      setSelectedIds(new Set([id]));
      lastClickRef.current = { id, time: Date.now() };

      // Double Click (Fast) is handled by onDoubleClick handler on element
  };

  const startRenaming = (id: string, currentName: string) => {
      setEditingId(id);
      setEditName(currentName);
      setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const commitRename = () => {
      if (editingId && editName.trim()) {
          onRenamePebble(editingId, editName.trim());
      }
      setEditingId(null);
  };

  const toggleFolderExpand = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    const next = new Set(expandedFolders);
    if (next.has(folderId)) next.delete(folderId);
    else next.add(folderId);
    setExpandedFolders(next);
  };

  // --- Render Helpers ---

  const renderContextMenu = () => {
      if (!contextMenu.visible) return null;
      return (
          <div 
            ref={contextMenuRef}
            className="fixed z-50 w-48 bg-stone-900/90 backdrop-blur-md border border-stone-700 rounded-lg shadow-2xl py-1 text-stone-200 text-sm overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
              <button 
                onClick={() => {
                    const p = visiblePebbles.find(p => p.id === contextMenu.targetId);
                    if (p) onSelectPebble(p);
                    setContextMenu(prev => ({...prev, visible: false}));
                }}
                className="w-full text-left px-4 py-2 hover:bg-stone-700 flex items-center gap-2"
              >
                  <CornerDownLeft size={14} /> Open
              </button>
              <button 
                 onClick={() => {
                    const p = visiblePebbles.find(p => p.id === contextMenu.targetId);
                    if(p) startRenaming(p.id, p.topic);
                 }}
                 className="w-full text-left px-4 py-2 hover:bg-stone-700 flex items-center gap-2"
              >
                  <Edit2 size={14} /> Rename
              </button>
              <div className="h-px bg-stone-700 my-1 mx-2" />
              <button className="w-full text-left px-4 py-2 hover:bg-stone-700 flex items-center gap-2 text-stone-400">
                  <Info size={14} /> Get Info
              </button>
              <div className="h-px bg-stone-700 my-1 mx-2" />
              <button 
                 onClick={() => {
                    if (contextMenu.targetId) {
                      const ids = Array.from(selectedIds).length > 0 ? Array.from(selectedIds) : [contextMenu.targetId];
                      performDelete(ids as string[]);
                    }
                    setContextMenu(prev => ({...prev, visible: false}));
                 }}
                 className="w-full text-left px-4 py-2 hover:bg-red-900/50 text-red-400 flex items-center gap-2"
              >
                  <Trash2 size={14} /> Delete
              </button>
          </div>
      );
  };

  const renderActionIsland = () => {
      if (selectedIds.size === 0) return null;
      return (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-stone-900 text-stone-100 px-4 py-2 rounded-full shadow-2xl border border-stone-700 flex items-center gap-4 animate-in slide-in-from-bottom-4">
              <span className="text-xs font-medium text-stone-400 border-r border-stone-700 pr-4">{selectedIds.size} Selected</span>
              <button className="hover:text-stone-300 transition-colors p-1" title="Move">
                 <Box size={16} />
              </button>
              <button 
                className="hover:text-red-400 transition-colors p-1" 
                title="Delete"
                onClick={() => performDelete(Array.from(selectedIds))}
              >
                 <Trash2 size={16} />
              </button>
              <button 
                 className="ml-2 hover:text-stone-300"
                 onClick={() => setSelectedIds(new Set())}
              >
                  <X size={14} />
              </button>
          </div>
      );
  };

  const renderToast = () => {
      if (!toast.visible) return null;
      return (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-stone-950 text-stone-100 px-6 py-3 rounded-lg shadow-2xl flex items-center gap-6 border border-stone-800 animate-in slide-in-from-bottom-2 fade-in">
              <span className="text-sm">{toast.message}</span>
              <button 
                 onClick={handleUndo}
                 className="text-sm font-bold text-stone-400 hover:text-white flex items-center gap-2"
              >
                 <Undo size={14} /> Undo
              </button>
          </div>
      );
  };

  const renderTrashDropZone = () => {
      if (!draggedPebbleId) return null;
      return (
          <div 
             onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
             onDrop={handleDropOnTrash}
             className="fixed bottom-8 right-8 z-30 w-16 h-16 bg-stone-800/80 backdrop-blur border-2 border-dashed border-stone-600 rounded-2xl flex items-center justify-center text-stone-500 transition-all hover:scale-110 hover:border-red-500 hover:text-red-500 hover:bg-red-900/20"
          >
              <Trash2 size={24} />
          </div>
      );
  };

  const renderVaultGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 grid-dense pb-20" onClick={() => setSelectedIds(new Set())}>
        {/* Folders */}
        {gridItems.folders.map(folder => {
          const previews = visiblePebbles.filter(p => p.folderId === folder.id).slice(0, 4);
          const isSelected = selectedIds.has(folder.id);
          return (
            <div 
              key={folder.id}
              onClick={(e) => { e.stopPropagation(); setCurrentFolderId(folder.id); }}
              onContextMenu={(e) => handleContextMenu(e, folder.id, 'folder')}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnFolder(e, folder.id)}
              className={`col-span-2 row-span-2 bg-stone-800 rounded-2xl p-4 cursor-pointer hover:bg-stone-700 transition-all group relative border ${isSelected ? 'border-stone-400 ring-1 ring-stone-400' : 'border-stone-700 hover:border-stone-500'}`}
            >
               <h3 className="text-stone-200 font-display font-bold mb-3 flex items-center gap-2">
                 <Box size={16} className="text-stone-400" />
                 {folder.name}
               </h3>
               <div className="grid grid-cols-2 grid-rows-2 gap-2 h-[120px]">
                 {previews.map(p => {
                    const emoji = p.content.ELI5.emojiCollage?.[0] || '📄';
                    return (
                        <div key={p.id} className="bg-stone-600 rounded-lg p-2 overflow-hidden flex items-center justify-center">
                            <span className="text-xl filter drop-shadow-sm">{emoji}</span>
                        </div>
                    );
                 })}
                 {[...Array(Math.max(0, 4 - previews.length))].map((_, i) => (
                   <div key={i} className="bg-stone-800/50 rounded-lg border border-stone-700/50 border-dashed" />
                 ))}
               </div>
               <div className="absolute bottom-4 right-4 text-xs text-stone-500">{previews.length} items</div>
            </div>
          );
        })}

        {/* Pebbles */}
        {gridItems.pebbles.map(pebble => {
          const isSelected = selectedIds.has(pebble.id);
          const isEditing = editingId === pebble.id;
          const emojis = pebble.content.ELI5.emojiCollage || [];
          
          return (
          <div 
            key={pebble.id}
            draggable
            onDragStart={(e) => handleDragStart(e, pebble.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropOnPebble(e, pebble)}
            onContextMenu={(e) => handleContextMenu(e, pebble.id, 'pebble')}
            onClick={(e) => isEditing ? e.stopPropagation() : handleItemClick(e, pebble.id, pebble)}
            onDoubleClick={() => !isEditing && onSelectPebble(pebble)}
            className={`col-span-1 row-span-1 bg-stone-800/60 backdrop-blur rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:bg-stone-700 transition-all border group relative hover:-translate-y-1 hover:shadow-xl ${isSelected ? 'border-stone-400 ring-1 ring-stone-400 bg-stone-700' : 'border-stone-700 hover:border-stone-400'}`}
          >
             <div>
               <div className="flex justify-between items-start mb-3">
                   <div className="flex -space-x-1">
                       {emojis.slice(0, 3).map((e, i) => (
                           <span key={i} className="text-xl filter drop-shadow-sm">{e}</span>
                       ))}
                   </div>
                   <div className={`w-2 h-2 rounded-full ${pebble.isVerified ? 'bg-green-500' : 'bg-stone-600'}`} />
               </div>
               
               {isEditing ? (
                   <input 
                      type="text"
                      className="rename-input bg-stone-900 border-b border-stone-400 text-sm font-bold text-stone-100 w-full focus:outline-none"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      onBlur={commitRename}
                   />
               ) : (
                   <h4 className="text-sm font-bold text-stone-200 line-clamp-2 leading-tight select-none">{pebble.topic}</h4>
               )}
             </div>
             
             {/* Hover Menu Trigger for quick access */}
             <button 
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-stone-400 hover:text-stone-100"
                onClick={(e) => handleContextMenu(e, pebble.id, 'pebble')}
             >
                <MoreHorizontal size={14} />
             </button>
          </div>
        )})}
        
        {gridItems.folders.length === 0 && gridItems.pebbles.length === 0 && (
           <div className="col-span-full py-20 text-center text-stone-600 italic">
             This container is empty. Drag pebbles here to fill it.
           </div>
        )}
    </div>
  );

  const renderListRows = (parentId: string | null, depth: number) => {
    // Filter items for this level
    const childFolders = folders.filter(f => f.parentId === parentId);
    const childPebbles = visiblePebbles.filter(p => p.folderId === parentId);

    // Filter by search
    if (search && parentId === currentFolderId) {
        // Flattened Search Result Mode
        const allMatchingPebbles = visiblePebbles.filter(p => p.topic.toLowerCase().includes(search.toLowerCase()));
        return allMatchingPebbles.map(pebble => renderPebbleListRow(pebble, 0));
    }

    return (
      <>
        {childFolders.map(folder => (
          <React.Fragment key={folder.id}>
            <div 
              className={`group flex items-center py-3 border-b border-stone-800 hover:bg-stone-800/50 transition-colors cursor-pointer select-none`}
              onClick={(e) => toggleFolderExpand(e, folder.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnFolder(e, folder.id)}
            >
              <div className="flex-1 flex items-center min-w-0" style={{ paddingLeft: `${depth * 24 + 16}px` }}>
                 {/* Indent Guide */}
                 {depth > 0 && <div className="absolute left-0 w-px h-full bg-stone-800" style={{ left: `${depth * 24}px`}} />}
                 
                 <div className="mr-2 text-stone-500 hover:text-stone-300 transition-colors">
                    {expandedFolders.has(folder.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                 </div>
                 <Box size={16} className="text-stone-400 mr-3 flex-shrink-0" />
                 <span className="font-medium text-stone-200 truncate">{folder.name}</span>
                 <span className="ml-3 text-xs text-stone-600">
                    {visiblePebbles.filter(p => p.folderId === folder.id).length} items
                 </span>
              </div>
            </div>
            {expandedFolders.has(folder.id) && renderListRows(folder.id, depth + 1)}
          </React.Fragment>
        ))}

        {childPebbles.map(pebble => renderPebbleListRow(pebble, depth))}
        
        {childFolders.length === 0 && childPebbles.length === 0 && depth === 0 && !search && (
            <div className="py-12 text-center text-stone-600 italic text-sm">Empty container</div>
        )}
      </>
    );
  };

  const renderPebbleListRow = (pebble: PebbleData, depth: number) => {
      const isSelected = selectedIds.has(pebble.id);
      const isEditing = editingId === pebble.id;
      
      return (
        <div 
        key={pebble.id}
        draggable
        onDragStart={(e) => handleDragStart(e, pebble.id)}
        onClick={(e) => {
            if (isEditing) return;
            // In List view, click row selects/previews. 
            // Click checkbox handles selection.
            setPreviewPebble(pebble);
        }}
        onDoubleClick={() => !isEditing && onSelectPebble(pebble)}
        className={`group flex items-center py-3 border-b border-stone-800 hover:bg-stone-800 transition-colors cursor-pointer ${previewPebble?.id === pebble.id ? 'bg-stone-800 border-l-2 border-l-stone-400' : 'border-l-2 border-l-transparent'}`}
        >
        {/* Checkbox */}
        <div className="pl-4 pr-2" onClick={(e) => {
            e.stopPropagation();
            const next = new Set(selectedIds);
            if(next.has(pebble.id)) next.delete(pebble.id);
            else next.add(pebble.id);
            setSelectedIds(next);
        }}>
            {isSelected ? <CheckSquare size={16} className="text-stone-300" /> : <Square size={16} className="text-stone-700 group-hover:text-stone-500" />}
        </div>

        <div className="flex-1 flex items-center min-w-0" style={{ paddingLeft: `${depth * 24}px` }}>
            {depth > 0 && <div className="absolute left-0 w-px h-full bg-stone-800" style={{ left: `${depth * 24 + 40}px`}} />}
            
            <FileText size={16} className="text-stone-500 mr-3 flex-shrink-0" />
            
            {isEditing ? (
                <input 
                    type="text"
                    className="rename-input bg-stone-900 border-b border-stone-400 text-sm font-medium text-white w-full focus:outline-none"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    onBlur={commitRename}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span className={`font-medium truncate ${previewPebble?.id === pebble.id ? 'text-white' : 'text-stone-300'}`}>
                    {pebble.topic}
                </span>
            )}
            
            {/* Inline Rename Trigger */}
            <button 
                className={`ml-2 text-stone-600 hover:text-stone-300 ${isEditing ? 'hidden' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}
                onClick={(e) => { e.stopPropagation(); startRenaming(pebble.id, pebble.topic); }}
            >
                <Edit2 size={12} />
            </button>

            {pebble.content.ELI5.keywords.slice(0, 2).map((k, i) => (
                <span key={i} className="ml-2 px-1.5 py-0.5 rounded bg-stone-800 text-[10px] text-stone-500 border border-stone-700 hidden lg:inline-block">#{k}</span>
            ))}
        </div>
        
        {/* Hover Actions (Explicit) */}
        <div className="flex items-center gap-1 pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
                className="p-1.5 hover:bg-stone-700 rounded text-stone-500 hover:text-stone-300"
                onClick={(e) => { e.stopPropagation(); startRenaming(pebble.id, pebble.topic); }}
                title="Rename"
            >
                <Edit2 size={14} />
            </button>
             <button 
                className="p-1.5 hover:bg-red-900/50 rounded text-stone-500 hover:text-red-400"
                onClick={(e) => { e.stopPropagation(); performDelete([pebble.id]); }}
                title="Delete"
            >
                <Trash2 size={14} />
            </button>
        </div>

        <div className="w-32 hidden md:flex justify-end items-center px-4">
            {pebble.isVerified ? (
                <div className="flex items-center gap-1.5 text-green-500/80">
                    <CheckCircle2 size={14} />
                    <span className="text-xs font-medium">Verified</span>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 text-stone-600">
                    <Circle size={14} />
                    <span className="text-xs">Draft</span>
                </div>
            )}
        </div>

        <div className="w-40 hidden md:flex justify-end items-center px-4 text-xs text-stone-500">
            {new Date(pebble.timestamp).toLocaleDateString()}
        </div>
        </div>
      );
  };

  const renderStream = () => {
    // Flatten logic for stream
    const sorted = [...visiblePebbles].sort((a, b) => b.timestamp - a.timestamp);
    return (
      <div className="w-full h-full overflow-y-auto px-4 pt-24 pb-20 max-w-2xl mx-auto space-y-8">
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-stone-700 to-transparent pointer-events-none" />
        {sorted.map(pebble => {
          const isFossil = (Date.now() - pebble.timestamp) > 1000 * 60 * 5; 
          const emojis = pebble.content.ELI5.emojiCollage || ['📜'];

          return (
            <div 
              key={pebble.id}
              onClick={() => onSelectPebble(pebble)}
              className={`relative group cursor-pointer transition-all duration-500 hover:translate-x-2 ${isFossil ? 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100' : 'opacity-100'}`}
            >
              <div className={`absolute left-[-16px] md:left-[-36px] top-6 w-3 h-3 rounded-full border-2 bg-stone-900 z-10 transition-colors ${pebble.isVerified ? 'border-green-500' : 'border-stone-500 group-hover:bg-stone-500'}`} />
              <div className="bg-stone-800/80 backdrop-blur border border-stone-700 p-6 rounded-lg shadow-lg group-hover:border-stone-500 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-display font-bold text-stone-100">{pebble.topic}</h3>
                  {pebble.isVerified && <span className="text-[10px] uppercase tracking-widest text-green-400 border border-green-900 bg-green-900/20 px-2 py-0.5 rounded">Mastered</span>}
                </div>
                <div className="flex gap-2 mb-4 text-2xl">
                    {emojis.slice(0, 4).map((e,i) => <span key={i}>{e}</span>)}
                </div>
                <p className="text-stone-400 text-sm font-serif line-clamp-2 mb-4">{pebble.content.ELI5.summary}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col relative overflow-hidden fade-in">
      
      {/* Top Bar */}
      <div className="fixed top-0 left-0 w-full z-30 p-6 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-stone-800 rounded-full hover:bg-stone-700 transition-colors border border-stone-700"
          >
            <ArrowLeft size={20} />
          </button>
          <input 
            type="text" 
            placeholder="Search..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-stone-800/80 backdrop-blur border border-stone-700 rounded-full px-5 py-2 text-sm focus:outline-none focus:border-stone-500 min-w-[200px] shadow-xl"
          />
        </div>

        <div className="pointer-events-auto bg-stone-800 p-1 rounded-lg flex gap-1 border border-stone-700 shadow-xl">
           <button 
             onClick={() => setActiveTab('vault')}
             className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all ${activeTab === 'vault' ? 'bg-stone-100 text-stone-900' : 'hover:bg-stone-700 text-stone-400'}`}
           >
             <Box size={14} />
             <span>Vault</span>
           </button>
           <button 
             onClick={() => setActiveTab('stream')}
             className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all ${activeTab === 'stream' ? 'bg-stone-100 text-stone-900' : 'hover:bg-stone-700 text-stone-400'}`}
           >
             <GitGraph size={14} />
             <span>Stream</span>
           </button>
           <button 
             onClick={() => setActiveTab('orbit')}
             className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all ${activeTab === 'orbit' ? 'bg-stone-100 text-stone-900' : 'hover:bg-stone-700 text-stone-400'}`}
           >
             <Orbit size={14} />
             <span>Orbit</span>
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full h-full relative overflow-y-auto" onClick={() => { if(selectedIds.size > 0 && !editingId) setSelectedIds(new Set()); }}>
        {activeTab === 'vault' && (
             <div className="w-full h-full flex flex-col pt-24">
                {/* Vault Toolbar */}
                <div className="px-6 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-stone-500 overflow-x-auto no-scrollbar">
                        {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={crumb.id || 'root'}>
                            <div 
                            onDragOver={handleDragOver}
                            onDrop={(e) => { e.preventDefault(); if(draggedPebbleId) onMovePebble(draggedPebbleId, crumb.id); }}
                            onClick={() => setCurrentFolderId(crumb.id)}
                            className={`flex items-center gap-1 hover:text-stone-200 transition-colors cursor-pointer whitespace-nowrap ${idx === breadcrumbs.length - 1 ? 'text-stone-200' : ''}`}
                            >
                            {idx === 0 && <Home size={14} />}
                            <span>{crumb.name}</span>
                            </div>
                            {idx < breadcrumbs.length - 1 && <ChevronRight size={14} className="opacity-50" />}
                        </React.Fragment>
                        ))}
                    </div>
                    <div className="flex bg-stone-800 rounded-lg p-1 border border-stone-700 pointer-events-auto">
                        <button 
                            onClick={() => setLayoutMode('grid')}
                            className={`p-1.5 rounded transition-all ${layoutMode === 'grid' ? 'bg-stone-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'}`}
                            title="Grid View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button 
                            onClick={() => setLayoutMode('list')}
                            className={`p-1.5 rounded transition-all ${layoutMode === 'list' ? 'bg-stone-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'}`}
                            title="List View"
                        >
                            <ListIcon size={16} />
                        </button>
                    </div>
                </div>

                {layoutMode === 'grid' ? (
                    <div className="flex-1 overflow-y-auto px-6 pb-20">
                        {renderVaultGrid()}
                    </div>
                ) : (
                    <div className="flex-1 flex overflow-hidden border-t border-stone-800">
                         {/* List Panel */}
                        <div className={`flex-1 overflow-y-auto ${previewPebble ? 'hidden lg:block' : 'w-full'}`}>
                            <div className="flex items-center px-4 py-2 border-b border-stone-800 bg-stone-900/50 text-[10px] font-bold text-stone-500 uppercase tracking-widest sticky top-0 backdrop-blur z-10">
                                <div className="w-8"></div> {/* Checkbox spacer */}
                                <div className="flex-1 ml-9">Name</div>
                                <div className="w-32 text-right px-4 hidden md:block">Status</div>
                                <div className="w-40 text-right px-4 hidden md:block">Last Modified</div>
                            </div>
                            <div className="pb-20">
                                {renderListRows(currentFolderId, 0)}
                            </div>
                        </div>
                        {/* Split Preview Pane */}
                        {previewPebble && (
                            <aside className="w-full lg:w-[480px] bg-stone-900 border-l border-stone-800 flex flex-col absolute lg:static inset-0 z-20">
                                <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-900">
                                <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Quick Preview</span>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => onSelectPebble(previewPebble)}
                                        className="text-xs bg-stone-100 text-stone-900 px-3 py-1.5 rounded font-medium hover:bg-white transition-colors"
                                    >
                                        Open Full
                                    </button>
                                    <button 
                                        onClick={() => setPreviewPebble(null)}
                                        className="p-1.5 hover:bg-stone-800 rounded text-stone-400"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 bg-stone-900/50">
                                    <div className="text-4xl mb-4 text-center">{previewPebble.content.ELI5.emojiCollage?.[0]}</div>
                                    <h2 className="text-2xl font-display font-bold text-stone-100 mb-2">{previewPebble.topic}</h2>
                                    <div className="flex gap-2 mb-6">
                                        {previewPebble.isVerified && <span className="bg-green-900/30 text-green-400 border border-green-900 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">Verified</span>}
                                        <span className="bg-stone-800 text-stone-400 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">{new Date(previewPebble.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <p className="text-sm text-stone-400 font-serif leading-relaxed">
                                            {previewPebble.content.ELI5.summary}
                                        </p>
                                    </div>
                                </div>
                            </aside>
                        )}
                    </div>
                )}
             </div>
        )}
        {activeTab === 'stream' && renderStream()}
        {activeTab === 'orbit' && <GraphView pebbles={visiblePebbles} onNodeClick={onSelectPebble} />}
      </div>
      
      {/* Overlays */}
      {renderContextMenu()}
      {renderActionIsland()}
      {renderToast()}
      {renderTrashDropZone()}
    </div>
  );
};