
import React from 'react';
import { MindMapNode, NodeStyle } from '../types';
import { X, Type, Square, Circle, MousePointer2, AlignLeft, Trash2 } from 'lucide-react';

interface PropertiesPanelProps {
  node: MindMapNode;
  onUpdate: (node: MindMapNode) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const COLORS = [
  { name: 'Slate', bg: '#0f172a', border: '#334155' },
  { name: 'Red', bg: '#450a0a', border: '#991b1b' },
  { name: 'Orange', bg: '#431407', border: '#9a3412' },
  { name: 'Amber', bg: '#451a03', border: '#b45309' },
  { name: 'Green', bg: '#052e16', border: '#166534' },
  { name: 'Emerald', bg: '#064e3b', border: '#10b981' },
  { name: 'Teal', bg: '#042f2e', border: '#14b8a6' },
  { name: 'Blue', bg: '#172554', border: '#3b82f6' },
  { name: 'Indigo', bg: '#1e1b4b', border: '#6366f1' },
  { name: 'Violet', bg: '#2e1065', border: '#8b5cf6' },
  { name: 'Purple', bg: '#3b0764', border: '#a855f7' },
  { name: 'Pink', bg: '#500724', border: '#ec4899' },
];

const SHAPES = [
  { id: 'rect', label: 'Box', icon: Square },
  { id: 'rounded', label: 'Rounded', icon: Square }, // approximation
  { id: 'pill', label: 'Pill', icon: Circle },
];

const SIZES = [
    { id: 'sm', label: 'S' },
    { id: 'md', label: 'M' },
    { id: 'lg', label: 'L' },
];

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ node, onUpdate, onClose, onDelete }) => {
  const currentStyle: NodeStyle = node.style || {};

  const handleStyleChange = (key: keyof NodeStyle, value: any) => {
    onUpdate({
      ...node,
      style: {
        ...currentStyle,
        [key]: value
      }
    });
  };

  const handleColorSelect = (colorCtx: typeof COLORS[0]) => {
      onUpdate({
        ...node,
        style: {
            ...currentStyle,
            backgroundColor: colorCtx.bg,
            borderColor: colorCtx.border
        }
      });
  };

  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <MousePointer2 size={18} className="text-blue-400" />
          <span>Properties</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="p-5 space-y-6">
        
        {/* Label & Description */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Content</label>
          <input 
            type="text" 
            value={node.label}
            onChange={(e) => onUpdate({ ...node, label: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            placeholder="Node Label"
          />
          <div className="relative">
              <textarea 
                value={node.description || ''}
                onChange={(e) => onUpdate({ ...node, description: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-h-[80px] resize-y"
                placeholder="Add notes or details..."
              />
              <AlignLeft size={14} className="absolute top-3 right-3 text-slate-600 pointer-events-none" />
          </div>
        </div>

        {/* Styling Section */}
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Appearance</label>
             </div>

             {/* Shapes */}
             <div className="grid grid-cols-3 gap-2">
                 {SHAPES.map(s => (
                     <button
                        key={s.id}
                        onClick={() => handleStyleChange('shape', s.id)}
                        className={`
                            flex flex-col items-center justify-center gap-1 py-2 rounded-lg border transition-all
                            ${currentStyle.shape === s.id || (!currentStyle.shape && s.id === 'rounded') 
                                ? 'bg-blue-600/20 border-blue-500 text-blue-200' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'}
                        `}
                     >
                         <s.icon size={16} className={s.id === 'pill' ? 'rounded-full' : s.id === 'rounded' ? 'rounded-md' : ''} />
                         <span className="text-[10px]">{s.label}</span>
                     </button>
                 ))}
             </div>

             {/* Font Size */}
             <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                 {SIZES.map(s => (
                     <button
                        key={s.id}
                        onClick={() => handleStyleChange('fontSize', s.id)}
                        className={`
                            flex-1 py-1.5 text-xs font-medium rounded transition-all
                            ${currentStyle.fontSize === s.id || (!currentStyle.fontSize && s.id === 'md')
                                ? 'bg-slate-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'}
                        `}
                     >
                         <span style={{ fontSize: s.id === 'sm' ? '10px' : s.id === 'lg' ? '14px' : '12px' }}>A</span>
                     </button>
                 ))}
             </div>

             {/* Colors */}
             <div>
                 <div className="text-[10px] font-semibold text-slate-500 mb-2">Background Color</div>
                 <div className="grid grid-cols-6 gap-2">
                     {COLORS.map((c, i) => (
                         <button
                            key={i}
                            onClick={() => handleColorSelect(c)}
                            className={`
                                w-8 h-8 rounded-full border-2 transition-transform hover:scale-110
                                ${currentStyle.backgroundColor === c.bg ? 'border-white ring-2 ring-blue-500/50' : 'border-transparent'}
                            `}
                            style={{ backgroundColor: c.bg, borderColor: currentStyle.backgroundColor === c.bg ? 'white' : c.border }}
                            title={c.name}
                         />
                     ))}
                 </div>
             </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-800">
            <button 
                onClick={() => { onDelete(node.id); onClose(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/50 transition-colors text-sm font-medium"
            >
                <Trash2 size={16} />
                Delete Node
            </button>
        </div>

      </div>
    </div>
  );
};

export default PropertiesPanel;
