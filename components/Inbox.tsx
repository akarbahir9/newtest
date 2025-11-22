import React from 'react';

const Inbox: React.FC = () => {
  return (
    <div className="view-section active flex-1 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold text-zinc-100 mb-6">Inbox</h1>
        <div className="space-y-2">
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg flex gap-4">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h4 className="text-sm text-zinc-200 font-medium">Collaborator Comment</h4>
              <p className="text-xs text-zinc-400 mt-1">John D. commented on Scene 002: "Love this dialogue."</p>
              <div className="text-xxs text-zinc-600 mt-2">10 mins ago</div>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg flex gap-4">
            <div className="w-2 h-2 bg-zinc-700 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h4 className="text-sm text-zinc-200 font-medium">Weekly Report</h4>
              <p className="text-xs text-zinc-400 mt-1">You've written 4,000 words this week. Great pace!</p>
              <div className="text-xxs text-zinc-600 mt-2">2 days ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;