import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const ConfirmationModal: React.FC = () => {
  const { confirmationState, hideConfirmation } = useProject();

  if (!confirmationState) {
    return null;
  }

  const { message, onConfirm } = confirmationState;

  const handleConfirm = () => {
    onConfirm();
    hideConfirmation();
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-25">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-sm shadow-2xl">
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-100">Confirmation Required</h3>
          <p className="text-sm text-zinc-400 mt-2">
            {message}
          </p>
        </div>
        
        <div className="flex gap-3 justify-center mt-6">
          <button 
            onClick={hideConfirmation} 
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium px-4 py-2.5 rounded transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm} 
            className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-4 py-2.5 rounded transition shadow-lg shadow-red-900/20"
          >
            Yes, Proceed
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
