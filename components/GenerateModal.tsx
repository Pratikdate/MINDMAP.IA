
import React, { useState } from 'react';
import { X, Sparkles, Loader2, FileText, Link as LinkIcon } from 'lucide-react';

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
                    Paste content to analyze
                </label>
                <div className="relative">
                    <textarea 
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Paste a website URL (e.g., https://example.com/article) OR paste raw text here..."
                        className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none font-mono text-sm leading-relaxed"
                    />
                    <div className="absolute bottom-4 right-4 text-xs text-slate-500">
                        {text.length} characters
                    </div>
                </div>
            </div>
            
            <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-start gap-3">
                     <div className="mt-0.5 text-blue-400">
                        <FileText size={16} />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-blue-200">Text Mode</h4>
                        <p className="text-xs text-blue-300/80">
                            Paste articles, notes, or outlines. The AI will structure them into a hierarchy.
                        </p>
                    </div>
                </div>
                <div className="w-full h-px bg-blue-900/30 my-1"></div>
                <div className="flex items-start gap-3">
                     <div className="mt-0.5 text-blue-400">
                        <LinkIcon size={16} />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-blue-200">Web Mode</h4>
                        <p className="text-xs text-blue-300/80">
                            Paste a URL (http/https). The AI will research the page and create a map from its content.
                        </p>
                    </div>
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
