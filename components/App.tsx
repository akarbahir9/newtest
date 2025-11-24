
import React from 'react';
import { Menu, PanelRight, Sparkles } from 'lucide-react';
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
import ConfirmationModal from './components/ConfirmationModal';
import { ProjectProvider, useProject } from './context/ProjectContext';

const MainLayout: React.FC = () => {
  const { currentView, isSidebarOpen, setSidebarOpen, isRightPanelOpen, setRightPanelOpen } = useProject();

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
      
      {/* AI Panel on Left in RTL */}
      <RightPanel />

      <div className="flex-1 flex flex-col min-w-0 relative h-full transition-all group/main">
        
        {/* Toggle Buttons (Swapped for RTL: Sidebar Toggle on Right, AI Toggle on Left) */}
        
        {/* Sidebar Toggle - Positioned on Right Edge */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-50 p-2 bg-zinc-900 border-y border-l border-zinc-800 rounded-l-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 shadow-xl transition-all items-center gap-2 group h-12 -mr-1 hover:mr-0"
            title="کرنەوەی لیست"
          >
            <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <PanelRight className="w-4 h-4" />
          </button>
        )}

        {/* AI Assistant Toggle - Positioned on Left Edge */}
        {!isRightPanelOpen && (
          <button 
            onClick={() => setRightPanelOpen(true)}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-50 p-2 bg-zinc-900 border-y border-r border-zinc-800 rounded-r-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 shadow-xl transition-all items-center gap-2 group h-12 -ml-1 hover:ml-0"
            title="کرنەوەی یاریدەدەر"
          >
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Sparkles className="w-4 h-4" />
          </button>
        )}

        {/* Mobile Header - With Safe Area Padding */}
        <div className="md:hidden h-auto min-h-[3rem] py-2 flex-shrink-0 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 relative z-30 pt-[env(safe-area-inset-top)]">
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

            {/* Left Side: AI Toggle */}
            <button 
                onClick={() => setRightPanelOpen(!isRightPanelOpen)} 
                className={`p-2 rounded-md transition ${isRightPanelOpen ? 'text-primary-400 bg-primary-900/20' : 'text-zinc-400 hover:text-white'}`}
                title="Toggle AI Chat"
            >
                <Sparkles className="w-5 h-5" />
            </button>
        </div>

        <main className="flex-1 bg-zinc-950 relative overflow-hidden flex flex-col">
            {renderView()}
        </main>
      </div>
      
      {/* Sidebar on Right in RTL */}
      <Sidebar />
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
