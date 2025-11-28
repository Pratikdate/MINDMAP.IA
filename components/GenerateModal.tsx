import React, { useState } from 'react';
import { X, Sparkles, Loader2, FileText } from 'lucide-react';

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (text: string) => void;
  isLoading: boolean;
}

const GenerateModal: React.FC<GenerateModalProps> = ({ isOpen, onClose, onGenerate, isLoading }) => {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 text-blue-400">
            <Sparkles size={20} />
            <h2 className="text-lg font-semibold text-white">Generate Mind Map with AI</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Paste your article, notes, or document text here
                </label>
                <div className="relative">
                    <textarea 
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="e.g. A summary of Photosynthesis, Project meeting notes, or a brainstorm list..."
                        className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none font-mono text-sm leading-relaxed"
                    />
                    <div className="absolute bottom-4 right-4 text-xs text-slate-500">
                        {text.length} characters
                    </div>
                </div>
            </div>
            
            <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4 flex gap-3">
                <div className="mt-0.5 text-blue-400">
                    <FileText size={16} />
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-blue-200">Pro Tip</h4>
                    <p className="text-xs text-blue-300/80 mt-1">
                        The AI works best with structured text like outlines, summaries, or articles with clear headings. It will automatically categorize key concepts.
                    </p>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={() => onGenerate(text)}
            disabled={!text.trim() || isLoading}
            className={`
                px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium text-white transition-all
                ${!text.trim() || isLoading ? 'bg-slate-700 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20'}
            `}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isLoading ? 'Generating Structure...' : 'Generate Mind Map'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default GenerateModal;
