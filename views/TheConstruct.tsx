import React, { useEffect, useState } from 'react';
import { generatePebble } from '../services/geminiService';
import { PebbleData, LogEntry } from '../types';

interface TheConstructProps {
  topic: string;
  references: PebbleData[];
  onComplete: (pebble: PebbleData) => void;
  onError: (error: string) => void;
}

export const TheConstruct: React.FC<TheConstructProps> = ({ topic, references, onComplete, onError }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [phase, setPhase] = useState(0); // 0-255 for bg darkness

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, { message: msg, timestamp: Date.now() }]);
  };

  useEffect(() => {
    let isMounted = true;

    const runConstruction = async () => {
      try {
        addLog(`> Analyzing intent: "${topic}"...`);
        if (references.length > 0) {
            addLog(`> Integrating ${references.length} context node${references.length > 1 ? 's' : ''}...`);
        }
        setPhase(20);
        await new Promise(r => setTimeout(r, 800)); // Pacing

        addLog(`> Retrieving semantic lattice...`);
        setPhase(50);
        await new Promise(r => setTimeout(r, 800));

        addLog(`> Querying generative models...`);
        setPhase(100);
        
        // Actual API Call with References
        const pebble = await generatePebble(topic, references);
        
        if (isMounted) {
            addLog(`> Constructing artifacts...`);
            setPhase(200);
            await new Promise(r => setTimeout(r, 600));
            
            addLog(`> Finalizing...`);
            await new Promise(r => setTimeout(r, 400));
            onComplete(pebble);
        }

      } catch (err) {
        if (isMounted) {
          console.error(err);
          onError("The construct failed to stabilize. Please try again.");
        }
      }
    };

    runConstruction();

    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, references]);

  // Dynamic background style based on phase
  const bgStyle = {
    backgroundColor: `rgb(${250 - phase/2}, ${250 - phase/2}, ${249 - phase/2})`,
    color: phase > 120 ? '#fafaf9' : '#1c1917'
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center transition-colors duration-[2000ms] font-mono text-sm"
      style={bgStyle}
    >
      <div className="w-full max-w-md p-6 space-y-2">
        {logs.map((log, i) => (
          <div key={log.timestamp + i} className="opacity-0 animate-[fadeIn_0.5s_forwards]">
            <span className="opacity-50 mr-2">{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}</span>
            {log.message}
          </div>
        ))}
        <div className="animate-pulse">_</div>
      </div>
    </div>
  );
};