
import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, Bot, AlertTriangle, PenTool, Mic2, 
  BrainCircuit, Image, Mic, ArrowUp, X, FileInput, Copy
} from 'lucide-react';
import { generateAssistantResponse } from '../services/geminiService';
import { ChatMessage } from '../types';
import { useProject } from '../context/ProjectContext';

const RightPanel: React.FC = () => {
  const { currentProject, currentSceneId, updateSceneContent, isRightPanelOpen, setRightPanelOpen } = useProject();
  const [activeTab, setActiveTab] = useState<'assistant' | 'memory' | 'visuals'>('assistant');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'user', text: 'Check continuity for Aria\'s injury.' },
    { 
      id: '2', 
      role: 'model', 
      text: 'Contradiction detected regarding Aria\'s injury.',
      hasContradiction: true 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scene = currentProject?.scenes.find(s => s.id === currentSceneId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Build Deep Context including Relations and Project Metadata
      const charDetails = currentProject?.characters.map(c => {
          const rels = c.relationships?.map(r => {
              const target = currentProject.characters.find(tc => tc.id === r.targetId)?.name || 'Unknown';
              return `${r.type} of ${target} (${r.description})`;
          }).join(', ');
          
          return `${c.name} (${c.role}, ${c.archetype}): ${c.description}. Traits: [${c.traits.join(', ')}]. ${rels ? `Relationships: ${rels}` : ''}`;
      }).join('\n');

      const genreString = currentProject?.genres.join(', ') || 'Unknown Genre';

      const contextString = `
        Project: ${currentProject?.title}
        Genres: ${genreString}
        Logline: ${currentProject?.logline || 'N/A'}
        Theme: ${currentProject?.theme || 'N/A'}
        Setting: ${currentProject?.setting || 'N/A'}
        Protagonist Goal: ${currentProject?.protagonistGoal || 'N/A'}
        
        CHARACTERS & RELATIONSHIPS:
        ${charDetails}

        Current Scene: ${scene?.title}
        Scene Content: ${scene?.content.replace(/<[^>]*>?/gm, '')}
      `;

      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const responseText = await generateAssistantResponse(history, `[Deep Context Loaded: \n${contextString}]\n\nUser Query: ${userMsg.text}`);
      
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsert = (contentToInsert: string) => {
      if (!scene || !contentToInsert) return;
      // Strip outer screenplay tags if they exist for clean insertion
      const cleanContent = contentToInsert.replace(/<\/?screenplay>/g, '');
      const newContent = scene.content + cleanContent;
      updateSceneContent(scene.id, newContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper to parse message content and render screenplay cards
  const renderMessageContent = (text: string) => {
    // Split by screenplay tags
    const parts = text.split(/(<screenplay>[\s\S]*?<\/screenplay>)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('<screenplay>')) {
        // Extract content inside tags
        const content = part.replace(/<\/?screenplay>/g, '').trim();
        return (
          <div key={index} className="my-3 relative group">
             {/* Hollywood Card */}
             <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 shadow-lg overflow-hidden">
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                    <button 
                        onClick={() => handleInsert(content)}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-primary-400 rounded border border-zinc-700 flex items-center gap-1 shadow-lg"
                        title="Insert into Editor"
                    >
                        <FileInput className="w-3 h-3" />
                        <span className="text-[10px] font-medium">Insert</span>
                    </button>
                </div>
                {/* Render HTML content safely */}
                <div 
                    className="font-screenplay text-xs text-zinc-300 leading-relaxed pointer-events-none select-none"
                    dangerouslySetInnerHTML={{ __html: content }}
                />
             </div>
          </div>
        );
      } else if (part.trim().length > 0) {
        // Regular text
        return (
          <div key={index} className="whitespace-pre-wrap leading-relaxed text-zinc-300">
            {part.trim()}
          </div>
        );
      }
      return null;
    });
  };

  return (
    <aside 
        className={`
            fixed md:relative inset-y-0 right-0 z-40
            w-80 bg-zinc-925 border-l border-zinc-800/60 flex flex-col h-full flex-shrink-0 
            transition-all duration-300 ease-in-out
            ${isRightPanelOpen ? 'translate-x-0 mr-0' : 'translate-x-full md:translate-x-0 md:-mr-80'}
        `}
    >
        
      {/* Tabs */}
      <div className="flex border-b border-zinc-800 relative">
        <button 
          onClick={() => setActiveTab('assistant')} 
          className={`flex-1 py-3 text-xs font-medium border-b-2 transition ${activeTab === 'assistant' ? 'border-primary-500 text-zinc-200 bg-zinc-900/30' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'}`}
        >
          Assistant
        </button>
        <button 
          onClick={() => setActiveTab('memory')} 
          className={`flex-1 py-3 text-xs font-medium border-b-2 transition ${activeTab === 'memory' ? 'border-primary-500 text-zinc-200 bg-zinc-900/30' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'}`}
        >
          Memory
        </button>
        <button 
          onClick={() => setActiveTab('visuals')} 
          className={`flex-1 py-3 text-xs font-medium border-b-2 transition ${activeTab === 'visuals' ? 'border-primary-500 text-zinc-200 bg-zinc-900/30' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'}`}
        >
          Visuals
        </button>
        
        {/* Close Button */}
        <button 
            onClick={() => setRightPanelOpen(false)}
            className="absolute right-0 top-0 bottom-0 px-2 text-zinc-500 hover:text-zinc-300"
            title="Close Panel"
        >
            <X className="w-4 h-4" />
        </button>
      </div>

      {/* CONTENT: ASSISTANT */}
      {activeTab === 'assistant' && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
          {/* Current Context Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xxs font-semibold text-zinc-500 uppercase">Active Context</span>
              <span className="text-xxs text-emerald-500 flex items-center gap-1"><Wifi className="w-2.5 h-2.5" /> Live</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-xxs text-zinc-300">SC {scene?.number || '?' }</span>
              {currentProject?.characters.slice(0, 2).map(c => (
                <span key={c.id} className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-xxs text-zinc-300">{c.name}</span>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                {msg.role === 'user' ? (
                  <div className="w-6 h-6 rounded-full bg-zinc-700 flex-shrink-0 flex items-center justify-center text-xxs text-zinc-300">E</div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary-600 flex-shrink-0 flex items-center justify-center text-xxs text-white"><Bot className="w-3.5 h-3.5" /></div>
                )}
                
                <div className="space-y-1 w-full min-w-0">
                  <div className={`text-xs ${msg.role === 'user' ? 'text-zinc-400' : 'text-primary-400 font-medium'}`}>
                    {msg.role === 'user' ? 'Elena R.' : 'Zoer Assistant'}
                  </div>
                  
                  {msg.role === 'user' ? (
                     <div className="text-sm text-zinc-300 bg-zinc-800/50 p-2 rounded-lg inline-block">{msg.text}</div>
                  ) : (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs leading-relaxed group relative">
                      {msg.hasContradiction && (
                        <div className="flex items-start gap-2 mb-2 text-amber-400 bg-amber-400/10 p-2 rounded border border-amber-400/20">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
                          <div>
                            <span className="font-medium block mb-0.5">Contradiction Detected</span>
                            <span className="opacity-80">In Scene 001, Aria broke her <span class="underline decoration-amber-500/50">left arm</span>. Current scene describes her using both hands.</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Render Parsed Content */}
                      {renderMessageContent(msg.text)}
                      
                    </div>
                  )}
                </div>
              </div>
            ))}
             {isLoading && (
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary-600 flex-shrink-0 flex items-center justify-center text-xxs text-white"><Bot className="w-3.5 h-3.5" /></div>
                  <div className="space-y-2 w-full">
                    <div className="text-xs text-primary-400 font-medium">Zoer Assistant</div>
                     <div className="text-xs text-zinc-500 animate-pulse">Thinking...</div>
                  </div>
                </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          <div className="my-2 border-t border-zinc-800"></div>
          
          {/* Prompt Template Library */}
          <div>
            <div className="text-xxs font-semibold text-zinc-500 uppercase mb-3 tracking-wider">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2">
              <button className="flex flex-col items-start gap-1 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-md transition group text-left">
                <PenTool className="w-3.5 h-3.5 text-primary-500 group-hover:text-primary-400" />
                <span className="text-xs font-medium text-zinc-300">T_REWRITE</span>
              </button>
              <button className="flex flex-col items-start gap-1 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-md transition group text-left">
                <Mic2 className="w-3.5 h-3.5 text-emerald-500 group-hover:text-emerald-400" />
                <span className="text-xs font-medium text-zinc-300">T_DIALOGUE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTENT: MEMORY */}
      {activeTab === 'memory' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-zinc-400 text-xs text-center mt-10">
            <BrainCircuit className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Story Bible &amp; Context</p>
            <div className="mt-6 text-left space-y-4">
                {currentProject?.characters.map(c => (
                    <div key={c.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                        <strong className="text-zinc-200 block mb-1">{c.name}</strong>
                        <p className="text-zinc-500 text-xs leading-relaxed mb-2">{c.description}</p>
                        {c.relationships && c.relationships.length > 0 && (
                            <div className="text-xxs text-zinc-600 bg-zinc-800/50 p-2 rounded">
                                {c.relationships.map((r, i) => {
                                    const target = currentProject.characters.find(tc => tc.id === r.targetId)?.name;
                                    return <div key={i}>• {r.type} of {target} ({r.description})</div>
                                })}
                            </div>
                        )}
                    </div>
                ))}
                {currentProject?.locations.map(l => (
                     <div key={l.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                        <strong className="text-zinc-200 block mb-1">{l.name}</strong>
                        <p className="text-zinc-500 text-xs leading-relaxed">{l.description}</p>
                     </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* CONTENT: VISUALS */}
      {activeTab === 'visuals' && (
        <div className="flex-1 overflow-y-auto p-4">
             <div className="grid grid-cols-2 gap-2">
                 <div className="aspect-square bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center text-zinc-600">
                     <Image className="w-6 h-6" />
                 </div>
                 <div className="aspect-square bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center text-zinc-600">
                     <Image className="w-6 h-6" />
                 </div>
             </div>
             <p className="text-xxs text-zinc-500 text-center mt-2">Scene generation references</p>
        </div>
      )}

      {/* Chat Input Area */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/30 flex-shrink-0">
        <div className="relative">
          <textarea 
            rows={2} 
            placeholder="Ask Zoer to expand, shorten, or analyze..." 
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 resize-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          ></textarea>
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <button className="p-1 hover:bg-zinc-800 rounded text-zinc-500 transition"><Mic className="w-3 h-3" /></button>
            <button onClick={handleSend} className="p-1 bg-zinc-100 hover:bg-white text-zinc-950 rounded transition shadow-lg shadow-white/10"><ArrowUp className="w-3 h-3" /></button>
          </div>
        </div>
        <div className="mt-2 flex justify-between items-center px-1">
             <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                 <span className="text-xxs text-zinc-500 hidden sm:block">Model: Gemini 2.5</span>
             </div>
             <span className="text-xxs text-zinc-600">Cmd+K for commands</span>
        </div>
      </div>
    </aside>
  );
};

export default RightPanel;