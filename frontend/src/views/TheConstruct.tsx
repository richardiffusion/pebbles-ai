// frontend/src/views/TheConstruct.tsx

import React, { useEffect, useState } from 'react';
import { GenerationTask } from '../types';

interface TheConstructProps {
  task: GenerationTask;
}

export const TheConstruct: React.FC<TheConstructProps> = ({ task }) => {
  const [localLogs, setLocalLogs] = useState(task.logs);

  useEffect(() => {
    setLocalLogs(task.logs);
  }, [task.logs]);

  const phase = task.progress * 2.5;
  const bgStyle = {
    backgroundColor: `rgb(${250 - phase/2}, ${250 - phase/2}, ${249 - phase/2})`,
    color: phase > 120 ? '#fafaf9' : '#1c1917',
    transition: 'background-color 1s ease, color 1s ease'
  };

  return (
    <div 
      className="h-screen w-full flex flex-col items-center justify-center font-mono text-sm overflow-hidden"
      style={bgStyle}
    >
      {/* ★★★ 修复点：在 style 中添加了 fadeIn 动画定义 ★★★ */}
      <style>{`
        /* 原有的省略号动画 */
        @keyframes ellipsis-animation {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
        
        .loading-ellipsis:after {
          content: '';
          display: inline-block;
          animation: ellipsis-animation 2s steps(1) infinite;
          width: 3ch; 
          text-align: left;
        }

        /* ★★★ 新增：淡入动画定义 ★★★ */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="w-full max-w-md p-6 space-y-2">
        <div className="mb-8 font-display font-bold text-xl opacity-80 border-b border-current pb-2">
            Constructing: {task.topic}
        </div>
        
        {localLogs.map((log, i) => (
          // 这里使用内联 style animation 确保 tailwind 任意值能找到对应的 keyframe
          <div 
            key={log.timestamp + i} 
            className="flex items-start opacity-0" // 初始 opacity-0
            style={{ 
                animation: 'fadeIn 0.5s ease-out forwards', // 直接调用上面定义的 CSS 动画
                animationDelay: `${i * 0.1}s` // 可选：给之前的日志加一点级联延迟效果
            }}
          >
            <span className="opacity-50 mr-3 flex-shrink-0">
                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
            </span>
            <span>{log.message}</span>
          </div>
        ))}
        
        {task.status === 'generating' && (
            <div className="pt-2 flex items-center text-base font-bold opacity-80">
                <span className="mr-2">Thinking</span>
                <span className="loading-ellipsis"></span>
            </div>
        )}
      </div>
    </div>
  );
};