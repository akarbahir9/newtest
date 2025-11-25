
import React, { useEffect } from 'react';
import { Menu, Sparkles, PanelRight, PanelLeft } from 'lucide-react';
import Sidebar from './components/Sidebar';
import RightPanel from './components/RightPanel';
import Editor from './components/Editor';
import Dashboard from './components/Dashboard';
import Characters from './components/Characters';
import Locations from './components/Locations';
import Search from './components/Search';
import Settings from './components/Settings';
import Inbox from './components/Inbox';
import Outline from './components/Outline';
import StoryBuilder from './components/StoryBuilder';
import ConfirmationModal from './components/ConfirmationModal';
import { ProjectProvider, useProject } from './context/ProjectContext';

const MainLayout: React.FC = () => {
  const { currentView, isSidebarOpen, setSidebarOpen, isRightPanelOpen, setRightPanelOpen } = useProject();

  const isEditor = currentView === 'editor';

  // Keyboard Shortcuts (Keep functional for mobile or if needed, though desktop UI is now static)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Sidebar: Cmd/Ctrl + B
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen(!isSidebarOpen);
      }
      // Toggle AI Panel: Cmd/Ctrl + I or Cmd/Ctrl + \
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'i' || e.key === '\\')) {
        e.preventDefault();
        setRightPanelOpen(!isRightPanelOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen, setSidebarOpen, isRightPanelOpen, setRightPanelOpen]);

  const renderView = () => {
    switch (currentView) {
      case 'editor':
        return <Editor />;
      case 'dashboard':
        return <Dashboard />;
      case 'characters':
        return <Characters />;
      case 'locations':
        return <Locations />;
      case 'search':
        return <Search />;
      case 'settings':
        return <Settings />;
      case 'inbox':
        return <Inbox />;
      case 'outline':
        return <Outline />;
      case 'story-builder':
        return <StoryBuilder />;
      default:
        return <Editor />;
    }
  };

  return (
    <div className="flex h-full w-full relative">
      {/* Confirmation Modal Rendered Globally */}
      <ConfirmationModal />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/60 z-[65] md:hidden" 
            onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar on Right (Start in RTL) - Hide in Story Builder */}
      {currentView !== 'story-builder' && <Sidebar />}

      <div className="flex-1 flex flex-col min-w-0 relative h-full transition-all group/main">
        
        {/* Mobile Header - Hide in Story Builder */}
        {currentView !== 'story-builder' && (
            <div 
                className="md:hidden h-12 flex-shrink-0 border-b border-zinc-800 bg-zinc-950 relative z-30"
                style={{ 
                    height: 'calc(3rem + env(safe-area-inset-top))', 
                    paddingTop: 'env(safe-area-inset-top)' 
                }}
            >
                <div className="h-full flex items-center justify-between px-4">
                    {/* Right Side: Menu & Brand */}
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setSidebarOpen(true)} 
                            className="text-zinc-400 hover:text-white"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-semibold text-zinc-100">Zoer.ai</span>
                    </div>

                    {/* Left Side: AI Toggle - Only visible in Editor */}
                    {isEditor && (
                        <button 
                            onClick={() => setRightPanelOpen(!isRightPanelOpen)} 
                            className={`p-2 rounded-md transition ${isRightPanelOpen ? 'text-primary-400 bg-primary-900/20' : 'text-zinc-400 hover:text-white'}`}
                            title="Toggle AI Chat"
                        >
                            <Sparkles className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        )}

        <main className="flex-1 bg-zinc-950 relative overflow-hidden flex flex-col">
            {renderView()}
        </main>
      </div>
      
      {/* AI Panel on Left (End in RTL) - Hidden via CSS when not in editor */}
      <div className={isEditor ? 'contents' : 'hidden'}>
        <RightPanel />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ProjectProvider>
      <MainLayout />
    </ProjectProvider>
  );
};

export default App;
