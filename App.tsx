import React, { useState, useEffect } from 'react';
import { ViewState, PebbleData, Folder, GenerationTask, CognitiveLevel, MainBlock, SidebarBlock } from './types';
import { TheDrop } from './views/TheDrop';
import { TheConstruct } from './views/TheConstruct';
import { TheArtifact } from './views/TheArtifact';
import { TheArchive } from './views/TheArchive';
import { ArchiveSidebar } from './components/ArchiveSidebar';
import { generatePebble } from './services/geminiService';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.DROP);
  
  // Data Store
  const [archive, setArchive] = useState<PebbleData[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  
  // Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('pebbles_sidebar_width');
    return saved ? parseInt(saved, 10) : 260;
  });

  // Input State
  const [currentReferences, setCurrentReferences] = useState<PebbleData[]>([]);
  const [isImmersionMode, setIsImmersionMode] = useState(false);

  // Active View State
  const [activePebble, setActivePebble] = useState<PebbleData | null>(null);

  // Async Generation Task State
  const [generationTask, setGenerationTask] = useState<GenerationTask | null>(null);
  const [showCompletionToast, setShowCompletionToast] = useState(false);

  // Persist sidebar width
  const handleSetSidebarWidth = (width: number) => {
    setSidebarWidth(width);
    localStorage.setItem('pebbles_sidebar_width', width.toString());
  };

  // Folder Management Handlers
  const handleRenameFolder = (id: string, newName: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
  };

  const handleUngroupFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const targetParentId = folder.parentId;

    // Move pebbles to parent
    setArchive(prev => prev.map(p => 
        p.folderId === folderId ? { ...p, folderId: targetParentId } : p
    ));

    // Move subfolders to parent
    setFolders(prev => {
        const remaining = prev.filter(f => f.id !== folderId);
        return remaining.map(f => 
            f.parentId === folderId ? { ...f, parentId: targetParentId } : f
        );
    });
  };

  // --- Core Generation Logic (Background) ---
  const handleStartConstruct = async (topic: string) => {
    const taskId = crypto.randomUUID();
    
    // 1. Initialize Task
    const newTask: GenerationTask = {
        id: taskId,
        status: 'generating',
        topic,
        logs: [{ message: `> Analyzing intent: "${topic}"...`, timestamp: Date.now() }],
        progress: 10
    };
    setGenerationTask(newTask);
    
    // 2. Switch View (Optional - defaulting to Construct to show start)
    setViewState(ViewState.CONSTRUCT);

    // 3. Helper to update task safely
    const updateTask = (updates: Partial<GenerationTask>) => {
        setGenerationTask(prev => prev && prev.id === taskId ? { ...prev, ...updates } : prev);
    };

    const addLog = (msg: string) => {
        setGenerationTask(prev => {
            if (prev && prev.id === taskId) {
                return { ...prev, logs: [...prev.logs, { message: msg, timestamp: Date.now() }] };
            }
            return prev;
        });
    };

    // 4. Run Simulation & API Call
    try {
        await new Promise(r => setTimeout(r, 800));
        addLog(`> Integrating ${currentReferences.length} context nodes...`);
        updateTask({ progress: 20 });
        
        await new Promise(r => setTimeout(r, 800));
        addLog(`> Retrieving semantic lattice...`);
        updateTask({ progress: 50 });

        await new Promise(r => setTimeout(r, 800));
        addLog(`> Querying generative models...`);
        updateTask({ progress: 70 });

        // API Call
        const pebble = await generatePebble(topic, currentReferences);
        
        addLog(`> Constructing artifacts...`);
        updateTask({ progress: 90 });
        await new Promise(r => setTimeout(r, 600));

        // 5. Complete
        setGenerationTask(prev => {
             if(prev && prev.id === taskId) {
                 return { ...prev, status: 'completed', result: pebble, progress: 100 };
             }
             return prev;
        });
        
        // Notify
        setShowCompletionToast(true);

    } catch (error: any) {
        console.error(error);
        addLog(`> ERROR: ${error.message}`);
        alert("Generation failed. See console.");
        setGenerationTask(null);
        setViewState(ViewState.DROP);
    }
  };

  const handleTaskClick = () => {
      if (!generationTask) return;
      
      if (generationTask.status === 'completed' && generationTask.result) {
          // Solidify
          const newPebble = generationTask.result;
          setArchive(prev => [newPebble, ...prev]);
          setActivePebble(newPebble);
          setViewState(ViewState.ARTIFACT);
          
          // Clear task
          setGenerationTask(null);
          setShowCompletionToast(false);
          setCurrentReferences([]); // Reset refs
      } else {
          // View Progress
          setViewState(ViewState.CONSTRUCT);
      }
  };

  const handleVerify = (pebbleId: string) => {
    setArchive(prev => prev.map(p => 
        p.id === pebbleId ? { ...p, isVerified: true } : p
    ));
    if (activePebble && activePebble.id === pebbleId) {
        setActivePebble(prev => prev ? { ...prev, isVerified: true } : null);
    }
  };

  // Archive Management Handlers
  const handleCreateFolder = (name: string, parentId: string | null, initialPebbleIds: string[]) => {
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name,
      parentId,
      createdAt: Date.now()
    };
    setFolders(prev => [...prev, newFolder]);
    if (initialPebbleIds.length > 0) {
      setArchive(prev => prev.map(p => 
        initialPebbleIds.includes(p.id) ? { ...p, folderId: newFolder.id } : p
      ));
    }
    return newFolder.id;
  };

  const handleMovePebble = (pebbleId: string, targetFolderId: string | null) => {
    setArchive(prev => prev.map(p => 
      p.id === pebbleId ? { ...p, folderId: targetFolderId } : p
    ));
  };

  const handleRenamePebble = (id: string, newTopic: string) => {
    setArchive(prev => prev.map(p => 
      p.id === id ? { ...p, topic: newTopic } : p
    ));
  };

  const handleUpdatePebbleContent = (
      pebbleId: string, 
      level: CognitiveLevel, 
      section: 'main' | 'sidebar', 
      index: number, 
      updatedBlock: MainBlock | SidebarBlock
  ) => {
      const updateFn = (prev: PebbleData[]) => prev.map(p => {
          if (p.id !== pebbleId) return p;
          
          const levelContent = p.content[level];
          let newContent = { ...levelContent };

          if (section === 'main') {
              const newBlocks = [...levelContent.mainContent];
              newBlocks[index] = { ...updatedBlock as MainBlock, isUserEdited: true };
              newContent.mainContent = newBlocks;
          } else {
              const newBlocks = [...levelContent.sidebarContent];
              newBlocks[index] = { ...updatedBlock as SidebarBlock, isUserEdited: true };
              newContent.sidebarContent = newBlocks;
          }

          return {
              ...p,
              content: {
                  ...p.content,
                  [level]: newContent
              }
          };
      });

      setArchive(updateFn);
      
      // Update active pebble reference if it's the one being edited
      if (activePebble?.id === pebbleId) {
          setActivePebble(prev => {
             if (!prev) return null;
             const levelContent = prev.content[level];
             let newContent = { ...levelContent };

             if (section === 'main') {
                 const newBlocks = [...levelContent.mainContent];
                 newBlocks[index] = { ...updatedBlock as MainBlock, isUserEdited: true };
                 newContent.mainContent = newBlocks;
             } else {
                 const newBlocks = [...levelContent.sidebarContent];
                 newBlocks[index] = { ...updatedBlock as SidebarBlock, isUserEdited: true };
                 newContent.sidebarContent = newBlocks;
             }

             return { ...prev, content: { ...prev.content, [level]: newContent } };
          });
      }
  };

  const handleUpdateEmojiCollage = (pebbleId: string, level: CognitiveLevel, newEmojis: string[]) => {
     const updateFn = (prev: PebbleData[]) => prev.map(p => {
        if(p.id !== pebbleId) return p;
        return {
            ...p,
            content: {
                ...p.content,
                [level]: { ...p.content[level], emojiCollage: newEmojis }
            }
        };
     });
     setArchive(updateFn);
     if (activePebble?.id === pebbleId) {
         setActivePebble(prev => prev ? {
             ...prev,
             content: {
                 ...prev.content,
                 [level]: { ...prev.content[level], emojiCollage: newEmojis }
             }
         } : null);
     }
  };

  const handleDeletePebbles = (ids: string[]) => {
    setArchive(prev => prev.map(p => 
      ids.includes(p.id) ? { ...p, isDeleted: true } : p
    ));
  };

  const handleRestorePebbles = (ids: string[]) => {
    setArchive(prev => prev.map(p => 
      ids.includes(p.id) ? { ...p, isDeleted: false } : p
    ));
  };

  // Navigation handlers
  const goToArchive = () => setViewState(ViewState.ARCHIVE);
  const goToDrop = () => {
      setViewState(ViewState.DROP);
      setActivePebble(null);
  };

  const handleSelectFromArchive = (pebble: PebbleData) => {
      setActivePebble(pebble);
      setViewState(ViewState.ARTIFACT);
  };

  return (
    <div className="w-full min-h-screen font-sans flex overflow-hidden bg-stone-50">
      
      {/* Persistent Sidebar (except in full Archive view) */}
      {viewState !== ViewState.ARCHIVE && (
          <ArchiveSidebar 
             archive={archive}
             folders={folders}
             generationTask={generationTask}
             sidebarWidth={sidebarWidth}
             onSetSidebarWidth={handleSetSidebarWidth}
             onSelectPebble={handleSelectFromArchive}
             onSelectTask={handleTaskClick}
             onGoToArchive={goToArchive}
             isImmersionMode={isImmersionMode && viewState === ViewState.DROP}
             onRenamePebble={handleRenamePebble}
             onDeletePebbles={handleDeletePebbles}
             onRestorePebbles={handleRestorePebbles}
             onMovePebble={handleMovePebble}
             onRenameFolder={handleRenameFolder}
             onUngroupFolder={handleUngroupFolder}
          />
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
          
          {viewState === ViewState.DROP && (
            <TheDrop 
                references={currentReferences}
                onSetReferences={setCurrentReferences}
                onConstruct={handleStartConstruct}
                onTypingStateChange={setIsImmersionMode}
                archive={archive}
            />
          )}

          {viewState === ViewState.CONSTRUCT && generationTask && (
            <TheConstruct task={generationTask} />
          )}

          {viewState === ViewState.ARTIFACT && activePebble && (
            <div className="h-screen overflow-y-auto">
                <TheArtifact 
                    pebble={activePebble} 
                    onVerify={handleVerify}
                    onBack={goToDrop}
                    onUpdateContent={handleUpdatePebbleContent}
                    onUpdateEmoji={handleUpdateEmojiCollage}
                />
            </div>
          )}

          {viewState === ViewState.ARCHIVE && (
            <div className="h-screen overflow-y-auto">
                <TheArchive 
                    pebbles={archive}
                    folders={folders}
                    onSelectPebble={handleSelectFromArchive}
                    onBack={goToDrop}
                    onCreateFolder={handleCreateFolder}
                    onMovePebble={handleMovePebble}
                    onRenamePebble={handleRenamePebble}
                    onDeletePebbles={handleDeletePebbles}
                    onRestorePebbles={handleRestorePebbles}
                />
            </div>
          )}
      </main>

      {/* Completion Toast */}
      {showCompletionToast && generationTask?.result && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-stone-900 text-stone-50 px-6 py-3 rounded-full shadow-2xl z-50 animate-[slideInUp_0.3s_ease-out] flex items-center gap-4">
            <CheckCircle2 className="text-green-400" size={20} />
            <span className="font-medium text-sm">
                "{generationTask.result.topic}" is ready.
            </span>
            <button 
               onClick={handleTaskClick}
               className="bg-stone-700 hover:bg-stone-600 px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
            >
               View <ArrowRight size={12} />
            </button>
        </div>
      )}
    </div>
  );
};

export default App;