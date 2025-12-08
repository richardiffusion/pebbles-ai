import React, { useEffect, useState } from 'react';
import { GenerationTask } from '../types';

interface TheConstructProps {
  task: GenerationTask;
}

export const TheConstruct: React.FC<TheConstructProps> = ({ task }) => {
  const [localLogs, setLocalLogs] = useState(task.logs);

  // Sync logs for animation smoothness
  useEffect(() => {
    setLocalLogs(task.logs);
  }, [task.logs]);

  // Dynamic background style based on progress
  const phase = task.progress * 2.5; // Scale 0-100 to 0-250 roughly
  const bgStyle = {
    backgroundColor: `rgb(${250 - phase/2}, ${250 - phase/2}, ${249 - phase/2})`,
    color: phase > 120 ? '#fafaf9' : '#1c1917'
  };

  return (
    <div 
      className="h-screen w-full flex flex-col items-center justify-center transition-colors duration-1000 font-mono text-sm overflow-hidden"
      style={bgStyle}
    >
      <div className="w-full max-w-md p-6 space-y-2">
        <div className="mb-8 font-display font-bold text-xl opacity-80 border-b border-current pb-2">
            Constructing: {task.topic}
        </div>
        {localLogs.map((log, i) => (
          <div key={log.timestamp + i} className="opacity-0 animate-[fadeIn_0.5s_forwards]">
            <span className="opacity-50 mr-2">{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}</span>
            {log.message}
          </div>
        ))}
        {task.status === 'generating' && <div className="animate-pulse">_</div>}
      </div>
    </div>
  );
};