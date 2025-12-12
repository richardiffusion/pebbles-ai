import React, { useState, useEffect } from 'react';
import { ViewState, PebbleData, Folder, GenerationTask, CognitiveLevel, MainBlock, SidebarBlock } from './types';
import { TheDrop } from './views/TheDrop';
import { TheConstruct } from './views/TheConstruct';
import { TheArtifact } from './views/TheArtifact';
import { TheArchive } from './views/TheArchive';
import { AuthView } from './views/AuthView'; // 新增：认证视图
import { ArchiveSidebar } from './components/ArchiveSidebar';
import { pebbleApi, folderApi } from './services/api'; // 新增：API 服务
import { CheckCircle2, ArrowRight, Loader2, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.DROP);
  
  // Auth & Loading State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  // Save State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);

  // --- 1. Initialization & Data Loading ---

  useEffect(() => {
    const token = localStorage.getItem('pebbles_token');
    if (token) {
      setIsAuthenticated(true);
      loadUserData();
    } else {
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, []);

  // ★★★ 新增：当状态变为 'saved' 后，2秒后自动隐藏 ★★★
  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => {
        setSaveStatus(null);
      }, 2000); // 2秒后消失，你可以调整这个时间
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const [fetchedPebbles, fetchedFolders] = await Promise.all([
        pebbleApi.getAll(),
        folderApi.getAll()
      ]);
      setArchive(fetchedPebbles);
      setFolders(fetchedFolders);
    } catch (error) {
      console.error("Failed to load data", error);
      // 如果 Token 失效，api interceptor 会处理跳转，这里只需停止 loading
    } finally {
      setIsLoading(false);
    }
  };

  // ★★★ 新增：处理退出登录 ★★★
  const handleLogout = () => {
    // 1. 清除本地存储的 Token
    localStorage.removeItem('pebbles_token');
    
    // 2. 重置所有状态（防止下个用户看到上个用户的数据缓存）
    setArchive([]);
    setFolders([]);
    setGenerationTask(null);
    setActivePebble(null);
    setCurrentReferences([]);
    
    // 3. 更新认证状态，这会触发页面重新渲染为 AuthView
    setIsAuthenticated(false);
  };

  // Persist sidebar width
  const handleSetSidebarWidth = (width: number) => {
    setSidebarWidth(width);
    localStorage.setItem('pebbles_sidebar_width', width.toString());
  };

  // --- 2. Core Generation Logic (Connected to Backend) ---

  const handleStartConstruct = async (topic: string) => {
    const taskId = crypto.randomUUID();
    
    // Initialize Task (Frontend Simulation for UX)
    const newTask: GenerationTask = {
        id: taskId,
        status: 'generating',
        topic,
        logs: [{ message: `> Analyzing intent: "${topic}"...`, timestamp: Date.now() }],
        progress: 10
    };
    setGenerationTask(newTask);
    setViewState(ViewState.CONSTRUCT);

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

    try {
        // Frontend Simulation Logs (为了视觉效果保留延迟)
        await new Promise(r => setTimeout(r, 800));
        addLog(`> Integrating ${currentReferences.length} context nodes...`);
        updateTask({ progress: 20 });
        
        await new Promise(r => setTimeout(r, 800));
        addLog(`> Retrieving semantic lattice...`);
        updateTask({ progress: 50 });

        await new Promise(r => setTimeout(r, 800));
        addLog(`> Querying generative models (Backend)...`);
        updateTask({ progress: 70 });

        // --- REAL API CALL ---
        const pebble = await pebbleApi.generate(topic, currentReferences);
        
        addLog(`> Constructing artifacts...`);
        updateTask({ progress: 100 });
        // 1. 给用户 1 秒钟的时间看到 "100%" 或完成状态，平滑过渡
        await new Promise(r => setTimeout(r, 1000));

        // 2. 直接执行跳转逻辑 (替代原来的 Toast)
        // a. 将新生成的 Pebble 加入存档
        setArchive(prev => [pebble, ...prev]); 
        
        // b. 设置为当前激活的 Pebble
        setActivePebble(pebble);
        
        // c. 切换视图到 Artifact
        setViewState(ViewState.ARTIFACT);

        // 3. 清理任务状态
        setGenerationTask(null);
        setCurrentReferences([]);

    } catch (error: any) {
        console.error(error);
        addLog(`> ERROR: ${error.message || "Server Error"}`);
        // Keep user in construct view to see error, or timeout to drop
        setTimeout(() => {
             alert("Generation failed. Please try again.");
             setGenerationTask(null);
             setViewState(ViewState.DROP);
        }, 2000);
    }
  };

  const handleTaskClick = () => {
      if (!generationTask) return;
      
      if (generationTask.status === 'completed' && generationTask.result) {
          // Solidify
          const newPebble = generationTask.result;
          setArchive(prev => [newPebble, ...prev]); // Optimistic update
          setActivePebble(newPebble);
          setViewState(ViewState.ARTIFACT);
          
          // Clear task
          setGenerationTask(null);
          setShowCompletionToast(false);
          setCurrentReferences([]); 
      } else {
          setViewState(ViewState.CONSTRUCT);
      }
  };

  // --- 3. CRUD Operations (Connected to Backend) ---

  // ★★★ 修改：增加 status 参数，支持验证和取消验证 ★★★
  const handleVerify = async (pebbleId: string, status: boolean) => {
    // 1. 乐观更新 Archive 列表
    setArchive(prev => prev.map(p => 
        p.id === pebbleId ? { ...p, isVerified: status } : p
    ));

    // 2. 乐观更新当前 Active Pebble
    if (activePebble && activePebble.id === pebbleId) {
        setActivePebble(prev => prev ? { ...prev, isVerified: status } : null);
    }

    // 3. 调用后端 API
    await pebbleApi.update(pebbleId, { isVerified: status });
  };

  const handleCreateFolder = async (name: string, parentId: string | null, initialPebbleIds: string[]) => {
    const newFolderBase = {
      id: crypto.randomUUID(), // Temporarily generate ID or let backend do it. Using client UUID for optimistic UI.
      name,
      parentId,
      createdAt: Date.now(),
      owner_id: '' // filled by backend
    };
    
    // API Call
    const createdFolder = await folderApi.create(newFolderBase);
    
    // Update State with returned data (to ensure IDs match)
    setFolders(prev => [...prev, createdFolder]);
    
    if (initialPebbleIds.length > 0) {
      setArchive(prev => prev.map(p => 
        initialPebbleIds.includes(p.id) ? { ...p, folderId: createdFolder.id } : p
      ));
      // Update pebbles in backend
      await Promise.all(initialPebbleIds.map(id => 
          pebbleApi.update(id, { folderId: createdFolder.id })
      ));
    }
    return createdFolder.id;
  };

  const handleRenameFolder = async (id: string, newName: string) => {
    // 1. 乐观更新 (Optimistic Update) - 让界面立刻变，不需要等待网络
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    
    // 2. 发送请求到后端保存
    try {
        await folderApi.update(id, { name: newName });
    } catch (error) {
        console.error("Failed to rename folder:", error);
        // 可选：如果失败了，可以在这里回滚名字，或者弹出 Toast 提示
    }
  };

  const handleUngroupFolder = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const targetParentId = folder.parentId;

    // 1. 本地乐观更新 (让 UI 瞬间反应)
    // 移出 Pebbles
    setArchive(prev => prev.map(p => 
        p.folderId === folderId ? { ...p, folderId: targetParentId } : p
    ));
    
    // 移出子文件夹，并删除当前文件夹
    setFolders(prev => {
        // 先把子文件夹移出来
        const updated = prev.map(f => 
            f.parentId === folderId ? { ...f, parentId: targetParentId } : f
        );
        // 再把自己删掉
        return updated.filter(f => f.id !== folderId);
    });

    // 2. 调用后端 API
    try {
        await folderApi.ungroup(folderId);
    } catch (e) {
        console.error("Ungroup failed", e);
        // 这里可以加一个 toast 提示失败并刷新数据
        loadUserData(); 
    }
  };

  const handleMovePebble = async (pebbleId: string, targetFolderId: string | null) => {
    setArchive(prev => prev.map(p => 
      p.id === pebbleId ? { ...p, folderId: targetFolderId } : p
    ));
    await pebbleApi.update(pebbleId, { folderId: targetFolderId });
  };

  const handleRenamePebble = async (id: string, newTopic: string) => {
    setArchive(prev => prev.map(p => 
      p.id === id ? { ...p, topic: newTopic } : p
    ));
    await pebbleApi.update(id, { topic: newTopic });
  };

  const handleDeletePebbles = async (ids: string[]) => {
    setArchive(prev => prev.map(p => 
      ids.includes(p.id) ? { ...p, isDeleted: true } : p
    ));
    // Parallel API Calls
    await Promise.all(ids.map(id => pebbleApi.delete(id)));
  };

  const handleRestorePebbles = async (ids: string[]) => {
    setArchive(prev => prev.map(p => 
      ids.includes(p.id) ? { ...p, isDeleted: false } : p
    ));
    await Promise.all(ids.map(id => pebbleApi.update(id, { isDeleted: false })));
  };

  // --- Content Updates (Complex Object) ---

  // ★★★ 修复：处理 Title, Summary, Keywords 的更新 ★★★
  const handleUpdateLevelMetadata = async (
      pebbleId: string, 
      level: CognitiveLevel, 
      field: 'title' | 'summary' | 'keywords', 
      value: string | string[]
  ) => {
      let updatedContentForApi = null;

      // 1. 更新 Archive 列表
      const updateFn = (prev: PebbleData[]) => prev.map(p => {
          if (p.id !== pebbleId) return p;
          
          const newContent = { ...p.content };
          const newLevelContent = { ...newContent[level] };
          
          // @ts-ignore
          newLevelContent[field] = value;
          newContent[level] = newLevelContent;
          
          const newPebble = { 
              ...p, 
              content: newContent,
              isUserEdited: true // Local State Update
          };
          updatedContentForApi = newContent; 
          return newPebble;
      });

      setArchive(updateFn);
      
      // 2. 同步 ActivePebble
      if (activePebble?.id === pebbleId) {
          setActivePebble(prev => {
              if (!prev) return null;
              const newContent = { ...prev.content };
              const newLevelContent = { ...newContent[level] };
              // @ts-ignore
              newLevelContent[field] = value;
              newContent[level] = newLevelContent;
              
              return { ...prev, content: newContent, isUserEdited: true };
          });
      }

      // 3. API 调用
      if (updatedContentForApi) {
          setSaveStatus('saving');
          try {
              // ★★★ 关键修改：发送 content 的同时，发送 isUserEdited: true ★★★
              await pebbleApi.update(pebbleId, { 
                  content: updatedContentForApi,
                  isUserEdited: true 
              });
              setTimeout(() => setSaveStatus('saved'), 500);
          } catch (e) {
              console.error(e);
              setSaveStatus('error');
          }
      }
  };

  // ★★★ 新增：处理 Socratic Questions 等全局字段更新 ★★★
  const handleUpdateGlobal = async (
      pebbleId: string, 
      field: string, 
      value: any
  ) => {
      // 1. 更新本地 Archive
      setArchive(prev => prev.map(p => 
          p.id === pebbleId ? { ...p, [field]: value } : p
      ));

      // 2. 更新当前 Active Pebble
      if (activePebble?.id === pebbleId) {
          setActivePebble(prev => prev ? { ...prev, [field]: value } : null);
      }

      // 3. 发送 API
      setSaveStatus('saving');
      try {
          await pebbleApi.update(pebbleId, { [field]: value });
          setTimeout(() => setSaveStatus('saved'), 500);
      } catch (e) {
          console.error(e);
          setSaveStatus('error');
      }
  };

  const handleUpdatePebbleContent = async (
      pebbleId: string, 
      level: CognitiveLevel, 
      section: 'main' | 'sidebar', 
      index: number, 
      updatedBlock: MainBlock | SidebarBlock
  ) => {
      // 1. Calculate New State
      let updatedContentForApi: any = null;

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

          const newPebble = {
              ...p,
              content: {
                  ...p.content,
                  [level]: newContent
              },
              isUserEdited: true // ★★★ 核心修改：标记为已人工编辑 ★★★  
          };
          updatedContentForApi = { 
              content: newPebble.content, 
              isUserEdited: true // ★★★ API 请求也要带上这个字段 ★★★
          };
          return newPebble;
      });

      // 2. Optimistic Update
      setArchive(updateFn);
      
      if (activePebble?.id === pebbleId) {
          setActivePebble(prev => {
              if (!prev) return null;
              // Re-apply logic for active pebble state
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

      // 3. API Call
      if (updatedContentForApi) {
        setSaveStatus('saving'); // ★ 开始保存
                try {
                    await pebbleApi.update(pebbleId, updatedContentForApi);
                    // 稍微延迟一下变回 Saved，让用户看清
                    setTimeout(() => setSaveStatus('saved'), 500); 
                } catch (e) {
                    console.error(e);
                    setSaveStatus('error');
                }
            }
  };

  // ★★★ 修复：添加版块逻辑 ★★★
  const handleAddBlock = async (
      pebbleId: string,
      level: CognitiveLevel,
      section: 'main' | 'sidebar',
      index: number,
      type: string
  ) => {
      let apiPayload = null; // 用于存储 API 请求数据

      const updateFn = (prev: PebbleData[]) => prev.map(p => {
          if (p.id !== pebbleId) return p;
          
          const levelContent = p.content[level];
          let newBlock: any = { type, body: "New content...", isUserEdited: true };
          
          if (section === 'main') {
              newBlock.heading = "New Section";
              newBlock.iconType = 'default';
              if (type === 'key_points') newBlock.body = ["Point 1", "Point 2"];
          } else {
              newBlock.heading = "New Item";
              if (type === 'profile') newBlock.emoji = '👤';
              if (type === 'stat') newBlock.emoji = '📊';
          }

          const newBlocks = section === 'main' 
              ? [...levelContent.mainContent] 
              : [...levelContent.sidebarContent];
          
          newBlocks.splice(index, 0, newBlock);

          const newContent = {
              ...levelContent,
              [section === 'main' ? 'mainContent' : 'sidebarContent']: newBlocks
          };

          const newPebble = { 
              ...p, 
              content: { ...p.content, [level]: newContent },
              isUserEdited: true // Local Update
          };
          
          // ★★★ 构造正确的 API Payload ★★★
          apiPayload = {
              content: newPebble.content,
              isUserEdited: true
          };
          
          return newPebble;
      });

      setArchive(updateFn);
      
      if (activePebble?.id === pebbleId) {
          setActivePebble(prev => {
              if (!prev) return null;
              const content = updateFn([prev])[0].content[level];
              return { ...prev, content: { ...prev.content, [level]: content }, isUserEdited: true };
          });
      }

      // ★★★ 发送 Payload ★★★
      if (apiPayload) await pebbleApi.update(pebbleId, apiPayload);
  };
  
  // ★★★ 修复：移动版块逻辑 ★★★
  const handleMoveBlock = async (
      pebbleId: string,
      level: CognitiveLevel,
      section: 'main' | 'sidebar',
      fromIndex: number,
      direction: 'up' | 'down'
  ) => {
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0) return; 

      let apiPayload = null;

      const updateFn = (prev: PebbleData[]) => prev.map(p => {
          if (p.id !== pebbleId) return p;
          
          const levelContent = p.content[level];
          const blocks = section === 'main' ? [...levelContent.mainContent] : [...levelContent.sidebarContent];
          
          if (toIndex >= blocks.length) return p;

          const temp = blocks[fromIndex];
          blocks[fromIndex] = blocks[toIndex];
          blocks[toIndex] = temp;

          const newContent = {
              ...levelContent,
              [section === 'main' ? 'mainContent' : 'sidebarContent']: blocks
          };

          const newPebble = { 
              ...p, 
              content: { ...p.content, [level]: newContent },
              isUserEdited: true 
          };
          
          apiPayload = {
              content: newPebble.content,
              isUserEdited: true
          };
          return newPebble;
      });

      setArchive(updateFn);
      
      if (activePebble?.id === pebbleId) {
          setActivePebble(prev => {
              if (!prev) return null;
              const content = updateFn([prev])[0].content[level];
              return { ...prev, content: { ...prev.content, [level]: content }, isUserEdited: true };
          });
      }

      if (apiPayload) await pebbleApi.update(pebbleId, apiPayload);
  };

  // ★★★ 修复：删除版块逻辑 ★★★
  const handleDeleteBlock = async (
      pebbleId: string,
      level: CognitiveLevel,
      section: 'main' | 'sidebar',
      index: number
  ) => {
      if (!confirm("Are you sure you want to remove this block?")) return;

      let apiPayload = null;

      const updateFn = (prev: PebbleData[]) => prev.map(p => {
          if (p.id !== pebbleId) return p;
          
          const levelContent = p.content[level];
          const blocks = section === 'main' ? [...levelContent.mainContent] : [...levelContent.sidebarContent];
          
          blocks.splice(index, 1);

          const newContent = {
              ...levelContent,
              [section === 'main' ? 'mainContent' : 'sidebarContent']: blocks
          };

          const newPebble = { 
              ...p, 
              content: { ...p.content, [level]: newContent },
              isUserEdited: true 
          };
          
          apiPayload = {
              content: newPebble.content,
              isUserEdited: true
          };
          return newPebble;
      });

      setArchive(updateFn);
      
      if (activePebble?.id === pebbleId) {
          setActivePebble(prev => {
              if (!prev) return null;
              const content = updateFn([prev])[0].content[level];
              return { ...prev, content: { ...prev.content, [level]: content }, isUserEdited: true };
          });
      }

      if (apiPayload) await pebbleApi.update(pebbleId, apiPayload);
  };

  const handleUpdateEmojiCollage = async (pebbleId: string, level: CognitiveLevel, newEmojis: string[]) => {
     let updatedPebbleContent: any = null;

     const updateFn = (prev: PebbleData[]) => prev.map(p => {
        if(p.id !== pebbleId) return p;
        const newPebble = {
            ...p,
            content: {
                ...p.content,
                [level]: { ...p.content[level], emojiCollage: newEmojis }
            }
        };
        updatedPebbleContent = newPebble.content;
        return newPebble;
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

     if (updatedPebbleContent) {
        await pebbleApi.update(pebbleId, { content: updatedPebbleContent });
     }
  };


  // ★★★ 新增：创建空白 Pebble 的逻辑 ★★★
  const handleCreateBlankPebble = async () => {
      // 1. 定义什么叫做“未编辑的空白草稿”
      const DEFAULT_TITLE = "Untitled Idea";
      const DEFAULT_BODY = "Start writing your thoughts here...";

      // 2. 在现有存档中查找是否已有这样的草稿
      // 我们按时间倒序找，优先复用最近的一个
      const existingDraft = archive.sort((a, b) => b.timestamp - a.timestamp).find(p => {
          // 检查标题
          if (p.topic !== DEFAULT_TITLE) return false;
          
          // 检查正文内容 (ELI5 和 ACADEMIC 都要检查，或者只检查 ELI5 即可，因为它们是同步初始化的)
          const mainBlock = p.content.ELI5.mainContent[0];
          if (!mainBlock || mainBlock.body !== DEFAULT_BODY) return false;
          
          // 检查是否仅有一个版块 (如果用户加了新版块，就不算空白了)
          if (p.content.ELI5.mainContent.length > 1) return false;
          if (p.content.ELI5.sidebarContent.length > 0) return false;

          return true;
      });

      // 3. 如果找到了“干净”的草稿，直接复用
      if (existingDraft) {
          setActivePebble(existingDraft);
          setViewState(ViewState.ARTIFACT);
          return; // ★★★ 退出函数，不执行新建逻辑 ★★★
      }

      // --- 下面是之前的创建逻辑 (保持不变) ---
      const newId = crypto.randomUUID();
      const timestamp = Date.now();
      
      const blankPebble: PebbleData = {
          id: newId,
          topic: DEFAULT_TITLE, // 使用常量
          timestamp: timestamp,
          folderId: null,
          isVerified: false,
          isUserEdited: true, 
          socraticQuestions: [],
          content: {
              ELI5: {
                  title: DEFAULT_TITLE,
                  summary: "Click to add a summary...",
                  emojiCollage: ["📝", "✨", "💭"],
                  keywords: [],
                  mainContent: [
                      { type: 'text', body: DEFAULT_BODY, iconType: 'default', isUserEdited: true }
                  ],
                  sidebarContent: []
              },
              ACADEMIC: {
                  title: DEFAULT_TITLE,
                  summary: "Click to add a summary...",
                  emojiCollage: ["📝", "✨", "💭"],
                  keywords: [],
                  mainContent: [
                      { type: 'text', body: DEFAULT_BODY, iconType: 'default', isUserEdited: true }
                  ],
                  sidebarContent: []
              }
          }
      };

      setArchive(prev => [blankPebble, ...prev]);
      setActivePebble(blankPebble);
      setViewState(ViewState.ARTIFACT);

      try {
          await pebbleApi.create(blankPebble);
          setSaveStatus('saved');
      } catch (e) {
          console.error("Failed to create blank pebble", e);
          setSaveStatus('error');
      }
  };

  // --- Navigation ---

  const goToArchive = () => setViewState(ViewState.ARCHIVE);
  const goToDrop = () => {
      setViewState(ViewState.DROP);
      setActivePebble(null);
  };

  const handleSelectFromArchive = (pebble: PebbleData) => {
      setActivePebble(pebble);
      setViewState(ViewState.ARTIFACT);
  };

  // --- Render ---

  if (!isAuthenticated) {
      return <AuthView onLoginSuccess={() => { setIsAuthenticated(true); loadUserData(); }} />;
  }

  if (isLoading) {
      return (
        <div className="h-screen w-full bg-stone-900 flex flex-col items-center justify-center text-stone-500 gap-4">
            <Loader2 className="animate-spin" size={32} />
            <span className="font-display tracking-widest text-xs uppercase">Syncing Neural Core...</span>
        </div>
      );
  }

  return (
    <div className="w-full min-h-screen font-sans flex overflow-hidden bg-stone-50">
      
      {/* Persistent Sidebar */}
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
             onBack={goToDrop}
             isImmersionMode={isImmersionMode && viewState === ViewState.DROP}
             onRenamePebble={handleRenamePebble}
             onDeletePebbles={handleDeletePebbles}
             onRestorePebbles={handleRestorePebbles}
             onMovePebble={handleMovePebble}
             onRenameFolder={handleRenameFolder}
             onUngroupFolder={handleUngroupFolder}
             onCreateBlank={handleCreateBlankPebble}
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
                    // ★★★ 确保这一行存在 ★★★
                    onUpdateMetadata={handleUpdateLevelMetadata}
                    onUpdateGlobal={handleUpdateGlobal}
                    onAddBlock={handleAddBlock} // 新增：添加版块
                    onMoveBlock={handleMoveBlock} // 新增：移动版块
                    onDeleteBlock={handleDeleteBlock} // 新增：删除版块
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
                    onRenameFolder={handleRenameFolder}
                    onDeletePebbles={handleDeletePebbles}
                    onRestorePebbles={handleRestorePebbles}
                    onUngroupFolder={handleUngroupFolder} // <--- 传递进去
                />
            </div>
          )}
      </main>

      {/* ★★★ 修改渲染条件：只在 Artifact 视图 且 有状态时显示 ★★★ */}
      {viewState === ViewState.ARTIFACT && saveStatus && (
        <div className="fixed top-6 right-20 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur border border-stone-200 text-xs font-bold text-stone-500 shadow-sm pointer-events-none transition-all animate-in fade-in slide-in-from-top-2">
            {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin text-blue-500" />}
            {saveStatus === 'saved' && <CheckCircle2 size={12} className="text-green-500" />}
            {saveStatus === 'error' && <span className="text-red-500">Save Failed</span>}
            <span className="uppercase tracking-wider">
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Error'}
            </span>
        </div>
      )}

      {/* ★★★ 新增：右上角退出按钮 ★★★ */}
      {/* 只在已登录状态下显示 */}
      {isAuthenticated && viewState !== ViewState.ARCHIVE && (
        <button 
          onClick={handleLogout}
          className="fixed top-6 right-6 z-50 p-2.5 bg-white/80 backdrop-blur border border-stone-200 rounded-full text-stone-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm hover:shadow-md group"
          title="Log Out"
        >
           <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>
      )}

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