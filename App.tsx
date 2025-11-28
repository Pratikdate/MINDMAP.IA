
import React, { useState, useCallback, useEffect, useRef } from 'react';
import MindMapCanvas from './components/MindMapCanvas';
import GenerateModal from './components/GenerateModal';
import PropertiesPanel from './components/PropertiesPanel';
import { MindMapNode, AppStatus, LayoutDirection, MindMapData, SecondaryLink } from './types';
import { generateMindMapFromText } from './services/gemini';
import { applyAutoLayout } from './utils/layout';
import { Plus, Wand2, Download, Upload, RotateCcw, Undo2, Redo2, Layout, Sparkles } from 'lucide-react';

const DEFAULT_ROOT: MindMapNode = {
  id: 'root',
  parentId: null,
  label: 'Central Idea',
  description: 'Start here',
  x: 0,
  y: 0,
  style: {
      shape: 'pill',
      fontSize: 'lg',
      backgroundColor: '#1e3a8a', // blue-900
      borderColor: '#3b82f6'
  }
};

function App() {
  const [nodes, setNodes] = useState<MindMapNode[]>([DEFAULT_ROOT]);
  const [secondaryLinks, setSecondaryLinks] = useState<SecondaryLink[]>([]);
  const [history, setHistory] = useState<{
      past: { nodes: MindMapNode[], links: SecondaryLink[] }[], 
      future: { nodes: MindMapNode[], links: SecondaryLink[] }[]
  }>({ past: [], future: [] });
  
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // --- History Helper ---
  const pushToHistory = useCallback((newNodes: MindMapNode[], newLinks: SecondaryLink[] = secondaryLinks) => {
      setHistory(prev => ({
          past: [...prev.past, { nodes, links: secondaryLinks }],
          future: []
      }));
      setNodes(newNodes);
      setSecondaryLinks(newLinks);
  }, [nodes, secondaryLinks]);

  const handleUndo = useCallback(() => {
      if (history.past.length === 0) return;
      const previous = history.past[history.past.length - 1];
      const newPast = history.past.slice(0, -1);
      
      setHistory({
          past: newPast,
          future: [{ nodes, links: secondaryLinks }, ...history.future]
      });
      setNodes(previous.nodes);
      setSecondaryLinks(previous.links);
  }, [history, nodes, secondaryLinks]);

  const handleRedo = useCallback(() => {
      if (history.future.length === 0) return;
      const next = history.future[0];
      const newFuture = history.future.slice(1);

      setHistory({
          past: [...history.past, { nodes, links: secondaryLinks }],
          future: newFuture
      });
      setNodes(next.nodes);
      setSecondaryLinks(next.links);
  }, [history, nodes, secondaryLinks]);

  // --- Node Operations ---

  const handleNodeUpdate = useCallback((updatedNode: MindMapNode) => {
    const newNodes = nodes.map(n => n.id === updatedNode.id ? updatedNode : n);
    pushToHistory(newNodes);
  }, [nodes, pushToHistory]);

  const handleNodeMove = useCallback((id: string, dx: number, dy: number) => {
      // Move a node and its entire subtree
      const getDescendants = (nodeId: string, list: MindMapNode[]): string[] => {
          return list.filter(n => n.parentId === nodeId).reduce((acc, child) => {
              return [...acc, child.id, ...getDescendants(child.id, list)];
          }, [] as string[]);
      };

      const idsToMove = [id, ...getDescendants(id, nodes)];
      const newNodes = nodes.map(n => {
          if (idsToMove.includes(n.id)) {
              return { ...n, x: n.x + dx, y: n.y + dy };
          }
          return n;
      });
      
      setNodes(newNodes);
      // Note: We don't push to history on every mouse move frame, only on drag end would be ideal
      // but for simplicity here we update state directly. 
      // A production app would likely debounce history push or use a dragEnd handler.
  }, [nodes]);

  const handleNodeAdd = useCallback((parentId: string) => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    // Place new child to the right of parent with some randomization
    const newNode: MindMapNode = {
      id: crypto.randomUUID(),
      parentId,
      label: 'New Node',
      x: parent.x + 200,
      y: parent.y + (Math.random() * 100 - 50)
    };
    
    const newNodes = [...nodes, newNode];
    pushToHistory(newNodes);
    setTimeout(() => setSelectedNodeId(newNode.id), 100);
  }, [nodes, pushToHistory]);

  const handleNodeAddSibling = useCallback((id: string) => {
      const node = nodes.find(n => n.id === id);
      if (node && node.parentId) {
          handleNodeAdd(node.parentId);
      }
  }, [nodes, handleNodeAdd]);

  const handleNodeDelete = useCallback((id: string) => {
    const getDescendants = (nodeId: string, currentNodes: MindMapNode[]): string[] => {
      const children = currentNodes.filter(n => n.parentId === nodeId);
      let ids = [nodeId];
      children.forEach(child => {
        ids = [...ids, ...getDescendants(child.id, currentNodes)];
      });
      return ids;
    };
    const idsToDelete = getDescendants(id, nodes);
    
    // Remove nodes
    const newNodes = nodes.filter(n => !idsToDelete.includes(n.id));
    
    // Remove associated links
    const newLinks = secondaryLinks.filter(l => !idsToDelete.includes(l.sourceId) && !idsToDelete.includes(l.targetId));

    pushToHistory(newNodes, newLinks);
    setSelectedNodeId(null);
  }, [nodes, secondaryLinks, pushToHistory]);

  const handleNodeReparent = useCallback((nodeId: string, newParentId: string) => {
    if (nodeId === newParentId) return;

    // Check for cycles
    const isDescendant = (parent: string, child: string): boolean => {
        if (parent === child) return true;
        const subChildren = nodes.filter(n => n.parentId === parent);
        for (const sub of subChildren) {
            if (isDescendant(sub.id, child)) return true;
        }
        return false;
    };

    if (isDescendant(newParentId, nodeId)) {
        setErrorMsg("Cannot move a node into its own descendant.");
        setTimeout(() => setErrorMsg(null), 3000);
        return;
    }

    const newNodes = nodes.map(n => n.id === nodeId ? { ...n, parentId: newParentId } : n);
    pushToHistory(newNodes);
  }, [nodes, pushToHistory]);

  // --- Link Operations ---
  const handleLinkAdd = useCallback((sourceId: string, targetId: string) => {
      if (sourceId === targetId) return;
      if (secondaryLinks.some(l => (l.sourceId === sourceId && l.targetId === targetId) || (l.sourceId === targetId && l.targetId === sourceId))) return;

      const newLinks = [...secondaryLinks, { sourceId, targetId }];
      pushToHistory(nodes, newLinks);
  }, [nodes, secondaryLinks, pushToHistory]);

  const handleLinkDelete = useCallback((sourceId: string, targetId: string) => {
      const newLinks = secondaryLinks.filter(l => !(l.sourceId === sourceId && l.targetId === targetId));
      pushToHistory(nodes, newLinks);
  }, [nodes, secondaryLinks, pushToHistory]);

  // --- Auto Layout ---
  const handleAutoLayout = (direction: 'horizontal' | 'vertical') => {
      const updatedNodes = applyAutoLayout(nodes, direction);
      pushToHistory(updatedNodes);
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to clear the canvas?")) {
        pushToHistory([DEFAULT_ROOT], []);
        setSelectedNodeId('root');
    }
  };

  // --- File I/O ---
  const handleExport = () => {
      const data: MindMapData = { version: '1.1', nodes, secondaryLinks };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindmap-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = JSON.parse(event.target?.result as string) as MindMapData;
              if (Array.isArray(data.nodes)) {
                  // Backwards compatibility for v1.0 (no x/y)
                  let loadedNodes = data.nodes;
                  if (loadedNodes.length > 0 && typeof loadedNodes[0].x === 'undefined') {
                       loadedNodes = applyAutoLayout(loadedNodes);
                  }
                  
                  pushToHistory(loadedNodes, data.secondaryLinks || []);
                  setSelectedNodeId(null);
              } else {
                  alert("Invalid file format");
              }
          } catch (err) {
              alert("Failed to parse JSON");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  // --- AI Generation ---
  const handleGenerate = async (text: string) => {
    setStatus(AppStatus.GENERATING);
    setErrorMsg(null);
    try {
      const generatedNodes = await generateMindMapFromText(text);
      if (generatedNodes && generatedNodes.length > 0) {
        // Run initial layout so they aren't all at 0,0
        const laidOutNodes = applyAutoLayout(generatedNodes, 'horizontal');
        
        // Find root for style
        const root = laidOutNodes.find(n => n.parentId === null);
        if (root) {
            root.style = { ...DEFAULT_ROOT.style, ...root.style };
            pushToHistory(laidOutNodes, []);
            setIsModalOpen(false);
            setSelectedNodeId(root.id);
        }
      } else {
        setErrorMsg("AI returned an empty structure.");
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Failed to generate mind map.");
    } finally {
      setStatus(AppStatus.IDLE);
    }
  };

  // --- Shortcuts ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

          if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
              e.preventDefault();
              if (e.shiftKey) handleRedo();
              else handleUndo();
              return;
          }
          if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
              e.preventDefault();
              handleRedo();
              return;
          }

          if (!selectedNodeId) return;

          switch (e.key) {
              case 'Tab':
                  e.preventDefault();
                  handleNodeAdd(selectedNodeId);
                  break;
              case 'Enter':
                  e.preventDefault();
                  handleNodeAddSibling(selectedNodeId);
                  break;
              case 'Backspace':
              case 'Delete':
                  if (selectedNodeId !== 'root') {
                      e.preventDefault();
                      handleNodeDelete(selectedNodeId);
                  }
                  break;
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, handleNodeAdd, handleNodeAddSibling, handleNodeDelete, handleUndo, handleRedo]);

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-slate-950 text-slate-200 flex">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
      
      <div className="flex-1 relative h-full flex flex-col">
          
          {/* Main Toolbar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-1.5 rounded-2xl shadow-xl flex items-center gap-1.5">
            <div className="flex items-center gap-2 px-3 border-r border-slate-700 mr-1">
                <span className="font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">MindGenius</span>
                <span className="text-xs font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">PRO</span>
            </div>

            <div className="flex items-center gap-1">
                <button onClick={handleUndo} disabled={history.past.length === 0} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-30 transition-colors" title="Undo (Ctrl+Z)">
                    <Undo2 size={18} />
                </button>
                <button onClick={handleRedo} disabled={history.future.length === 0} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-30 transition-colors" title="Redo (Ctrl+Y)">
                    <Redo2 size={18} />
                </button>
            </div>

            <div className="w-px h-6 bg-slate-700 mx-1"></div>

            <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-95"
            >
                <Wand2 size={16} />
                AI Generate
            </button>

            <div className="w-px h-6 bg-slate-700 mx-1"></div>

            <button 
                onClick={() => handleAutoLayout('horizontal')}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
                title="Auto Layout (Horizontal)"
            >
                <Layout size={18} />
            </button>
            <button 
                onClick={() => handleAutoLayout('vertical')}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
                title="Auto Layout (Vertical)"
            >
                <Layout size={18} className="rotate-90" />
            </button>

             <div className="flex items-center gap-1">
                <button onClick={handleExport} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Export JSON">
                    <Download size={18} />
                </button>
                <button onClick={handleImportClick} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Import JSON">
                    <Upload size={18} />
                </button>
            </div>

             <div className="w-px h-6 bg-slate-700 mx-1"></div>

            <button 
                onClick={handleReset}
                className="p-2 text-red-400 hover:text-red-200 hover:bg-slate-800 rounded-lg transition-colors"
                title="Clear All"
            >
                <RotateCcw size={18} />
            </button>
          </div>

          <MindMapCanvas 
            nodes={nodes}
            secondaryLinks={secondaryLinks}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            onNodeUpdate={handleNodeUpdate}
            onNodeMove={handleNodeMove}
            onNodeAdd={handleNodeAdd}
            onNodeDelete={handleNodeDelete}
            onNodeReparent={handleNodeReparent}
            onLinkAdd={handleLinkAdd}
          />

          {errorMsg && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 animate-bounce">
              <div className="bg-red-500/90 text-white px-6 py-3 rounded-full shadow-lg backdrop-blur flex items-center gap-3">
                 <span>{errorMsg}</span>
                 <button onClick={() => setErrorMsg(null)} className="hover:bg-red-600 rounded-full p-1"><Plus size={16} className="rotate-45"/></button>
              </div>
            </div>
          )}
          
          <div className="absolute bottom-4 right-4 z-30 flex flex-col items-end gap-1 pointer-events-none select-none">
             <div className="text-xs text-slate-500 font-mono bg-slate-900/50 p-1 rounded border border-slate-800 text-right">
                Drag: Move Node • Drag on Node: Connect <br/>
                Alt + Drag on Node: Cross Link
             </div>
          </div>
      </div>

      {selectedNode && (
          <div className="relative z-50 h-full border-l border-slate-800 bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300">
              <PropertiesPanel 
                  node={selectedNode}
                  onUpdate={handleNodeUpdate}
                  onClose={() => setSelectedNodeId(null)}
                  onDelete={handleNodeDelete}
              />
          </div>
      )}

      <GenerateModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={handleGenerate}
        isLoading={status === AppStatus.GENERATING}
      />

    </div>
  );
}

export default App;
