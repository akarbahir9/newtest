import React from 'react';
import { Search as SearchIcon, FileText, User } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const Search: React.FC = () => {
  const { navigateTo } = useProject();
  return (
    <div className="view-section active flex-1 p-4 md:p-20 flex flex-col items-center justify-start h-full">
      <div className="w-full max-w-2xl">
        <div className="relative mb-8">
          <SearchIcon className="absolute right-4 top-3.5 w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="گەڕان بەدوای دیمەن، کاراکتەر، یان دیالۆگ..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pr-12 pl-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 shadow-2xl" 
            autoFocus
          />
          <div className="absolute left-3 top-2.5 px-2 py-1 bg-zinc-800 rounded text-xxs text-zinc-500 border border-zinc-700 hidden sm:block">Esc</div>
        </div>
        
        <div className="space-y-2">
          <div className="text-xs font-medium text-zinc-500 px-2 mb-2">دوایینەکان</div>
          <div onClick={() => navigateTo('editor')} className="flex items-center justify-between p-3 hover:bg-zinc-900 rounded-lg cursor-pointer transition group">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
              <span className="text-sm text-zinc-300 group-hover:text-zinc-100">دیمەنی ٠٠٢ - کۆکپیت</span>
            </div>
            <span className="text-xs text-zinc-600">دوایین ئاماژە</span>
          </div>
          <div onClick={() => navigateTo('characters')} className="flex items-center justify-between p-3 hover:bg-zinc-900 rounded-lg cursor-pointer transition group">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
              <span className="text-sm text-zinc-300 group-hover:text-zinc-100">ئاریا</span>
            </div>
            <span className="text-xs text-zinc-600">کاراکتەر</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;