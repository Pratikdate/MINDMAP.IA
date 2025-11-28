
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MindMapNode, Viewport, NodeStyle, SecondaryLink } from '../types';
import { Plus, Trash2, Edit2, Maximize, ZoomIn, ZoomOut, GripHorizontal } from 'lucide-react';

interface MindMapCanvasProps {
  nodes: MindMapNode[];
  secondaryLinks?: SecondaryLink[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  onNodeUpdate: (node: MindMapNode) => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  onNodeAdd: (parentId: string) => void;
  onNodeDelete: (id: string) => void;
  onNodeReparent: (nodeId: string, newParentId: string) => void;
  onLinkAdd: (sourceId: string, targetId: string) => void;
}

// Helper to generate a smart bezier curve based on relative positions
const SmartLink: React.FC<{ 
    source: { x: number, y: number }, 
    target: { x: number, y: number }, 
    isSecondary?: boolean 
}> = ({ source, target, isSecondary }) => {
    
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let path = '';

    // If nodes are far enough apart horizontally, use horizontal cubic bezier
    if (absDx > absDy) {
        const midX = (source.x + target.x) / 2;
        path = `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x} ${target.y}`;
    } 
    // Otherwise use vertical cubic bezier
    else {
        const midY = (source.y + target.y) / 2;
        path = `M ${source.x} ${source.y} C ${source.x} ${midY}, ${target.x} ${midY}, ${target.x} ${target.y}`;
    }

    return (
        <path
            d={path}
            fill="none"
            stroke={isSecondary ? "#f59e0b" : "#334155"} // Amber-500 for secondary, Slate-700 for primary
            strokeWidth="2"
            strokeDasharray={isSecondary ? "5,5" : undefined}
            className="transition-all duration-300"
        />
    );
};

const MindMapCanvas: React.FC<MindMapCanvasProps> = ({ 
    nodes, 
    secondaryLinks = [],
    selectedNodeId,
    onNodeSelect, 
    onNodeUpdate, 
    onNodeMove,
    onNodeAdd, 
    onNodeDelete,
    onNodeReparent,
    onLinkAdd
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  // Dragging State
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [dragState, setDragState] = useState<{ 
      nodeId: string, 
      startX: number, 
      startY: number,
      initialNodeX: number,
      initialNodeY: number,
      isAltPressed: boolean
  } | null>(null);
  
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  // Viewport Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on background or SVG directly
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
      onNodeSelect(null); 
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Panning Logic
    if (isPanning) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastMouse({ x: e.clientX, y: e.clientY });
      return;
    }

    // 2. Node Dragging Logic
    if (isDraggingNode && dragState) {
        // Calculate delta in "World Space" (accounting for scale)
        const dx = (e.clientX - lastMouse.x) / viewport.scale;
        const dy = (e.clientY - lastMouse.y) / viewport.scale;
        
        setLastMouse({ x: e.clientX, y: e.clientY });

        // Update the dragged node and its subtree visually
        onNodeMove(dragState.nodeId, dx, dy);

        // Hit Testing for Reparenting/Linking
        const worldX = (e.clientX - viewport.x - window.innerWidth/2) / viewport.scale;
        const worldY = (e.clientY - viewport.y - window.innerHeight/2) / viewport.scale;
        
        // Simple bounding box check against other nodes
        const hitNode = nodes.find(n => 
            n.id !== dragState.nodeId && 
            Math.abs(n.x - worldX) < 100 && // Wide hit area
            Math.abs(n.y - worldY) < 40
        );

        setDropTargetId(hitNode ? hitNode.id : null);
    }
  };

  const handleMouseUp = () => {
    if (isDraggingNode && dragState && dropTargetId) {
        if (dragState.isAltPressed) {
            // Create Secondary Link
            onLinkAdd(dragState.nodeId, dropTargetId);
        } else {
            // Reparent
            onNodeReparent(dragState.nodeId, dropTargetId);
        }
    }

    setIsPanning(false);
    setIsDraggingNode(false);
    setDragState(null);
    setDropTargetId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSensitivity = 0.001;
    const newScale = Math.min(Math.max(0.1, viewport.scale - e.deltaY * zoomSensitivity), 3);
    setViewport(prev => ({ ...prev, scale: newScale }));
  };

  const updateZoom = (delta: number) => {
    setViewport(prev => ({ ...prev, scale: Math.min(Math.max(0.1, prev.scale + delta), 3) }));
  };

  const resetZoom = () => {
      setViewport({ x: 0, y: 0, scale: 1 });
  };

  // Node Interactions
  const handleNodeMouseDown = (e: React.MouseEvent, node: MindMapNode) => {
      e.stopPropagation();
      onNodeSelect(node.id);
      
      setIsDraggingNode(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
      setDragState({
          nodeId: node.id,
          startX: e.clientX,
          startY: e.clientY,
          initialNodeX: node.x,
          initialNodeY: node.y,
          isAltPressed: e.altKey
      });
  };

  const updateNodeLabel = (id: string, newLabel: string) => {
     const node = nodes.find(n => n.id === id);
     if (node) {
         onNodeUpdate({ ...node, label: newLabel });
     }
     setEditingNodeId(null);
  };

  const getNodeStyles = (node: MindMapNode, isSelected: boolean, isDropTarget: boolean) => {
      const style: NodeStyle = node.style || {};
      const shape = style.shape || 'rounded';
      const size = style.fontSize || 'md';
      
      const baseClasses = `relative px-4 py-2 border-2 transition-shadow duration-200 select-none flex items-center justify-center min-w-[80px] max-w-[300px]`;
      
      let shapeClass = 'rounded-xl';
      if (shape === 'rect') shapeClass = 'rounded-md';
      if (shape === 'pill') shapeClass = 'rounded-full';

      let borderClass = 'border-slate-700 hover:border-slate-500';
      if (isSelected) borderClass = 'border-blue-500 shadow-blue-500/20 ring-2 ring-blue-500/10';
      if (isDropTarget) borderClass = 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-105 bg-slate-800';

      const customBorderColor = !isSelected && !isDropTarget && style.borderColor ? style.borderColor : undefined;

      let textClass = 'text-sm';
      if (size === 'sm') textClass = 'text-xs';
      if (size === 'lg') textClass = 'text-lg font-semibold';

      const bgColor = style.backgroundColor || '#0f172a';

      return {
          className: `${baseClasses} ${shapeClass} ${borderClass}`,
          style: {
              backgroundColor: bgColor,
              borderColor: isSelected || isDropTarget ? undefined : customBorderColor,
          },
          textClass
      };
  };

  // Generate links purely from node positions
  const renderLinks = () => {
      const links: React.ReactNode[] = [];
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // 1. Primary Hierarchy Links
      nodes.forEach(node => {
          if (node.parentId) {
              const parent = nodeMap.get(node.parentId);
              if (parent) {
                  links.push(
                      <SmartLink 
                        key={`${parent.id}-${node.id}`}
                        source={{ x: parent.x, y: parent.y }}
                        target={{ x: node.x, y: node.y }}
                      />
                  );
              }
          }
      });

      // 2. Secondary Cross-Links
      secondaryLinks.forEach(link => {
          const source = nodeMap.get(link.sourceId);
          const target = nodeMap.get(link.targetId);
          if (source && target) {
            links.push(
                <SmartLink 
                    key={`sec-${link.sourceId}-${link.targetId}`}
                    source={{ x: source.x, y: source.y }}
                    target={{ x: target.x, y: target.y }}
                    isSecondary
                />
            );
          }
      });

      // 3. Dragging Line Indicator
      if (isDraggingNode && dragState && dropTargetId) {
           const source = nodeMap.get(dragState.nodeId);
           const target = nodeMap.get(dropTargetId);
           if (source && target) {
               links.push(
                   <path
                        key="drag-line"
                        d={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
                        stroke={dragState.isAltPressed ? "#f59e0b" : "#3b82f6"}
                        strokeWidth="2"
                        strokeDasharray="4"
                        className="animate-pulse"
                   />
               )
           }
      }

      return links;
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
        {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-slate-600 text-lg">Double click anywhere or use the toolbar to start.</p>
            </div>
        )}

        <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-40">
            <button onClick={() => updateZoom(0.1)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg shadow-lg border border-slate-700 transition-colors">
                <ZoomIn size={20} />
            </button>
            <button onClick={() => updateZoom(-0.1)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg shadow-lg border border-slate-700 transition-colors">
                <ZoomOut size={20} />
            </button>
            <button onClick={resetZoom} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg shadow-lg border border-slate-700 transition-colors">
                <Maximize size={20} />
            </button>
        </div>

        {/* World Container */}
        <div 
            style={{ 
            transform: `translate(${viewport.x + window.innerWidth/2}px, ${viewport.y + window.innerHeight/2}px) scale(${viewport.scale})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out'
            }}
            className="absolute top-0 left-0 w-0 h-0"
        >
            {/* Links Layer */}
            <svg className="overflow-visible absolute top-0 left-0 pointer-events-none">
                {renderLinks()}
            </svg>

            {/* Nodes Layer */}
            <AnimatePresence>
            {nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isEditing = editingNodeId === node.id;
                const isDropTarget = dropTargetId === node.id;
                const isHovered = hoveredNodeId === node.id;
                
                // Show tooltip if hovered (and not dragging self) OR if acting as drop target
                const showTooltip = node.description && ( (isHovered && !isDraggingNode) || isDropTarget );

                const { className, style, textClass } = getNodeStyles(node, isSelected, isDropTarget);
                
                // If this specific node is being dragged, we disable spring smoothing to prevent drag lag/floatiness
                const isBeingDragged = isDraggingNode && isSelected;

                return (
                <motion.div
                    key={node.id}
                    // REMOVED layoutId here to prevent global layout instability on hover
                    initial={{ x: node.x, y: node.y, scale: 0 }}
                    animate={{ x: node.x, y: node.y, scale: 1 }}
                    transition={isBeingDragged ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute"
                    style={{ 
                        marginLeft: -12, // simple centering offset
                        marginTop: -20,
                        zIndex: isSelected || isDraggingNode || isHovered ? 50 : 10
                    }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                >
                    {/* Floating Action Menu */}
                    {isSelected && !isEditing && !isDraggingNode && (
                        <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex gap-1 bg-slate-800 p-1.5 rounded-lg border border-slate-700 shadow-xl z-50">
                            <button onMouseDown={(e) => { e.stopPropagation(); onNodeAdd(node.id); }} className="p-1 hover:bg-blue-600 rounded text-slate-300 hover:text-white transition-colors" title="Add Child (Tab)">
                                <Plus size={14} />
                            </button>
                            <button onMouseDown={(e) => { e.stopPropagation(); setEditingNodeId(node.id); }} className="p-1 hover:bg-emerald-600 rounded text-slate-300 hover:text-white transition-colors" title="Edit Text (DblClick)">
                                <Edit2 size={14} />
                            </button>
                            {node.parentId && (
                                <button onMouseDown={(e) => { e.stopPropagation(); onNodeDelete(node.id); }} className="p-1 hover:bg-red-600 rounded text-slate-300 hover:text-white transition-colors" title="Delete (Del)">
                                    <Trash2 size={14} />
                                </button>
                            )}
                             <div className="w-px bg-slate-600 mx-1"></div>
                             <div className="flex items-center justify-center px-1 cursor-grab active:cursor-grabbing text-slate-500" title="Drag to move">
                                <GripHorizontal size={14} />
                             </div>
                        </div>
                    )}
                    
                    {/* Description Indicator (if not selected/hovered) */}
                    {node.description && !isSelected && !showTooltip && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900 z-20"></div>
                    )}

                    {/* Tooltip Popup */}
                    <AnimatePresence>
                        {showTooltip && (
                            <motion.div 
                                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-900/95 backdrop-blur-md border border-slate-600/80 rounded-xl shadow-2xl z-[60] pointer-events-none origin-bottom"
                            >
                                <div className="flex items-center gap-2 mb-1.5 border-b border-slate-700/50 pb-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Description</span>
                                </div>
                                <p className="text-xs text-slate-200 leading-relaxed font-sans">{node.description}</p>
                                {/* Arrow */}
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/95 border-b border-r border-slate-600/80 rotate-45"></div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div 
                        onMouseDown={(e) => handleNodeMouseDown(e, node)}
                        onDoubleClick={(e) => { e.stopPropagation(); setEditingNodeId(node.id); }}
                        className={`${className} ${isDraggingNode && isSelected ? 'cursor-grabbing' : 'cursor-grab'}`}
                        style={style}
                    >
                        {isEditing ? (
                            <input 
                                autoFocus
                                className={`bg-transparent text-white text-center outline-none w-full min-w-[100px] ${textClass}`}
                                defaultValue={node.label}
                                onBlur={(e) => updateNodeLabel(node.id, e.target.value)}
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter') updateNodeLabel(node.id, e.currentTarget.value);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className={`font-medium text-slate-200 truncate ${textClass}`}>{node.label}</span>
                        )}
                    </div>
                </motion.div>
                );
            })}
            </AnimatePresence>
        </div>
    </div>
  );
};

export default MindMapCanvas;
