import React, { useState } from 'react';
import { ViewState, PebbleData, Folder } from './types';
import { TheDrop } from './views/TheDrop';
import { TheConstruct } from './views/TheConstruct';
import { TheArtifact } from './views/TheArtifact';
import { TheArchive } from './views/TheArchive';

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.DROP);
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [currentReferences, setCurrentReferences] = useState<PebbleData[]>([]);
  const [activePebble, setActivePebble] = useState<PebbleData | null>(null);
  
  // Data Store
  const [archive, setArchive] = useState<PebbleData[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  // Transition: Drop -> Construct
  const handleConstruct = (topic: string, references: PebbleData[] = []) => {
    setCurrentTopic(topic);
    setCurrentReferences(references);
    setViewState(ViewState.CONSTRUCT);
  };

  // Transition: Construct -> Artifact (Completion)
  const handleGenerationComplete = (pebble: PebbleData) => {
    setActivePebble(pebble);
    setArchive(prev => {
        const exists = prev.find(p => p.topic.toLowerCase() === pebble.topic.toLowerCase());
        return exists ? prev : [pebble, ...prev];
    });
    // Reset construct state
    setCurrentReferences([]);
    setViewState(ViewState.ARTIFACT);
  };

  // Error handling in Construct
  const handleGenerationError = (error: string) => {
    alert(error);
    setViewState(ViewState.DROP);
  };

  // Mark as verified
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
    
    // Move initial pebbles into new folder
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
    <main className="w-full min-h-screen font-sans">
      {viewState === ViewState.DROP && (
        <TheDrop 
            archive={archive}
            onConstruct={handleConstruct} 
            onGoToArchive={goToArchive}
            onSelectPebble={handleSelectFromArchive}
        />
      )}

      {viewState === ViewState.CONSTRUCT && (
        <TheConstruct 
            topic={currentTopic}
            references={currentReferences}
            onComplete={handleGenerationComplete}
            onError={handleGenerationError}
        />
      )}

      {viewState === ViewState.ARTIFACT && activePebble && (
        <TheArtifact 
            pebble={activePebble} 
            onVerify={handleVerify}
            onBack={goToDrop}
        />
      )}

      {viewState === ViewState.ARCHIVE && (
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
      )}
    </main>
  );
};

export default App;