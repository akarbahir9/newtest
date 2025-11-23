import React from 'react';
import { Menu, Pen } from 'lucide-react';
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
      
      {/* Sidebar on Right (Start in RTL) */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 relative h-full transition-all group/main">
        
        {/* Mobile Header */}
        <div className="md:hidden h-12 flex-shrink-0 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 relative z-30">
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
                <Pen className="w-5 h-5" />
            </button>
        </div>

        <main className="flex-1 bg-zinc-950 relative overflow-hidden flex flex-col">
            {renderView()}
        </main>
      </div>
      
      {/* AI Panel on Left (End in RTL) */}
      <RightPanel />
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