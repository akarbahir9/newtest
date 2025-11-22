import React from 'react';
import { Menu } from 'lucide-react';
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
import { ProjectProvider, useProject } from './context/ProjectContext';

const MainLayout: React.FC = () => {
  const { currentView, isSidebarOpen, setSidebarOpen } = useProject();

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
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/60 z-40 md:hidden" 
            onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 relative h-full transition-all">
        {/* Mobile Header */}
        <div className="md:hidden h-12 flex-shrink-0 border-b border-zinc-800 flex items-center px-4 bg-zinc-950 justify-between z-30">
            <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="text-zinc-400 hover:text-white">
                    <Menu className="w-5 h-5" />
                </button>
                <span className="text-sm font-semibold text-zinc-100">Zoer.ai</span>
            </div>
            <div className="w-6" /> {/* Spacer for balance */}
        </div>

        <main className="flex-1 bg-zinc-950 relative overflow-hidden flex flex-col">
            {renderView()}
        </main>
      </div>
      
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