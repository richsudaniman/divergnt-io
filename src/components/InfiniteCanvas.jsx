import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Type, Edit3, Move3D, Camera, ZoomIn, ZoomOut, RotateCcw, Trash2, Undo, Redo } from 'lucide-react';
import { debounce } from 'lodash';

const InfiniteCanvas = ({ initialElements = [], onElementsChange = () => {} }) => {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [elements, setElements] = useState(initialElements);
  const [selectedTool, setSelectedTool] = useState('text');
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [selectedColor, setSelectedColor] = useState('#2563eb');
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [brushSize, setBrushSize] = useState(3);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });
  const [isTextInputVisible, setIsTextInputVisible] = useState(false);
  
  // Undo/Redo state
  const [history, setHistory] = useState([initialElements]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const colors = [
    '#1f2937', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
    '#ffffff', '#f3f4f6', '#fecaca', '#fed7aa', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#f9a8d4'
  ];

  const fonts = ['Inter', 'Comic Sans MS', 'Brush Script MT', 'Caveat', 'Permanent Marker'];
  const brushSizes = [1, 2, 3, 5, 8, 12];

  // Debounced callback to notify parent of changes
  const debouncedOnElementsChange = useCallback(debounce(onElementsChange, 1000), [onElementsChange]);

  // Sync with parent's initial elements
  useEffect(() => {
    setElements(initialElements);
    setHistory([initialElements]);
    setHistoryIndex(0);
  }, [initialElements]);

  // Notify parent when elements change
  useEffect(() => {
    if (elements !== initialElements) {
      debouncedOnElementsChange(elements);
    }
  }, [elements, initialElements, debouncedOnElementsChange]);

  // Add to history when elements change (for undo/redo)
  const addToHistory = useCallback((newElements) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...newElements]);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setElements(history[newIndex]);
    }
  }, [history, historyIndex]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setElements(history[newIndex]);
    }
  }, [history, historyIndex]);

  const screenToCanvas = useCallback((screenX, screenY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left) / viewBox.scale + viewBox.x,
      y: (screenY - rect.top) / viewBox.scale + viewBox.y
    };
  }, [viewBox]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.85 : 1.18;
    const newScale = Math.max(0.1, Math.min(8, viewBox.scale * zoomFactor));
    
    setViewBox(prev => ({
      x: prev.x + (mouseX / prev.scale - mouseX / newScale),
      y: prev.y + (mouseY / prev.scale - mouseY / newScale),
      scale: newScale
    }));
  }, [viewBox.scale]);

  const calculateTextDimensions = (text, font) => {
    const lines = text.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length), 1);
    const lineHeight = 24;
    const charWidth = 8.5;
    
    const calculatedWidth = Math.max(120, Math.min(500, maxLineLength * charWidth + 40));
    
    return {
      width: calculatedWidth,
      height: Math.max(30, lines.length * lineHeight + 20)
    };
  };

  const finishTextEditing = useCallback((elementId, newText) => {
    if (!newText || newText.trim() === '' || newText === 'Click to edit') {
      setElements(prev => {
        const filtered = prev.filter(el => el.id !== elementId);
        addToHistory(filtered);
        return filtered;
      });
    } else {
      setElements(prev => {
        const updated = prev.map(el => {
          if (el.id === elementId && el.type === 'text') {
            const dimensions = calculateTextDimensions(newText, el.font);
            return { 
              ...el, 
              content: newText.trim(), 
              width: dimensions.width, 
              height: dimensions.height,
              isEditing: false 
            };
          }
          return el;
        });
        addToHistory(updated);
        return updated;
      });
    }
    setSelectedElement(null);
    setEditingText('');
    setIsTextInputVisible(false);
  }, [addToHistory]);

  // Check if click is on resize handle
  const getResizeHandle = useCallback((element, canvasPos) => {
    if (!element || element.type === 'drawing') return null;
    
    const handleSize = 10 / viewBox.scale;
    const { x, y, width, height } = element;
    
    // Check corners and edges
    const handles = [
      { name: 'nw', x: x - handleSize/2, y: y - handleSize/2 },
      { name: 'ne', x: x + width - handleSize/2, y: y - handleSize/2 },
      { name: 'sw', x: x - handleSize/2, y: y + height - handleSize/2 },
      { name: 'se', x: x + width - handleSize/2, y: y + height - handleSize/2 },
    ];
    
    for (const handle of handles) {
      if (canvasPos.x >= handle.x && canvasPos.x <= handle.x + handleSize &&
          canvasPos.y >= handle.y && canvasPos.y <= handle.y + handleSize) {
        return handle.name;
      }
    }
    return null;
  }, [viewBox.scale]);

  // Image upload handler
  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newElement = {
          id: Date.now(),
          type: 'image',
          x: viewBox.x + 100,
          y: viewBox.y + 100,
          width: 200,
          height: 150,
          content: event.target.result
        };
        setElements(prev => {
          const updated = [...prev, newElement];
          addToHistory(updated);
          return updated;
        });
        setSelectedElement(newElement.id);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }, [viewBox, addToHistory]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    
    // Don't handle clicks on the text input area
    if (e.target.closest('.text-input-overlay')) {
      return;
    }
    
    // If clicking outside while editing text, finish editing
    const editingElement = elements.find(el => el.isEditing);
    if (editingElement && isTextInputVisible) {
      finishTextEditing(editingElement.id, editingText || editingElement.content);
      return;
    }
    
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    const clickedElement = elements.find(el => 
      canvasPos.x >= el.x - 10 && canvasPos.x <= el.x + el.width + 10 &&
      canvasPos.y >= el.y - 10 && canvasPos.y <= el.y + el.height + 10
    );
    
    if (selectedTool === 'pen') {
      setIsDrawing(true);
      setCurrentPath([canvasPos]);
      setSelectedElement(null);
      return;
    }
    
    if (selectedTool === 'text') {
      if (clickedElement && clickedElement.type === 'text') {
        // Edit existing text
        setSelectedElement(clickedElement.id);
        setEditingText(clickedElement.content);
        setElements(prev => prev.map(el => 
          el.id === clickedElement.id ? { ...el, isEditing: true } : { ...el, isEditing: false }
        ));
        setTextInputPosition({ x: e.clientX, y: e.clientY });
        setIsTextInputVisible(true);
      } else {
        // Create new text
        const dimensions = calculateTextDimensions('New text', selectedFont);
        const newElement = {
          id: Date.now(),
          type: 'text',
          x: canvasPos.x,
          y: canvasPos.y,
          width: dimensions.width,
          height: dimensions.height,
          content: '',
          color: selectedColor,
          font: selectedFont,
          isEditing: true
        };
        setElements(prev => [...prev, newElement]);
        setSelectedElement(newElement.id);
        setEditingText('');
        setTextInputPosition({ x: e.clientX, y: e.clientY });
        setIsTextInputVisible(true);
      }
      return;
    }
    
    // Check for resize handle first
    if (clickedElement && selectedElement === clickedElement.id) {
      const handle = getResizeHandle(clickedElement, canvasPos);
      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }
    }
    
    if (clickedElement) {
      setSelectedElement(clickedElement.id);
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setElements(prev => prev.map(el => ({ ...el, isEditing: false })));
      return;
    }
    
    setIsPanning(true);
    setLastPanPoint({ x: e.clientX, y: e.clientY });
    setSelectedElement(null);
    setElements(prev => prev.map(el => ({ ...el, isEditing: false })));
  }, [screenToCanvas, elements, selectedTool, selectedColor, selectedFont, editingText, finishTextEditing, isTextInputVisible, selectedElement, getResizeHandle, addToHistory]);

  const handleMouseMove = useCallback((e) => {
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    
    if (isDrawing && selectedTool === 'pen') {
      setCurrentPath(prev => [...prev, canvasPos]);
    } else if (isResizing && selectedElement) {
      const deltaX = (e.clientX - dragStart.x) / viewBox.scale;
      const deltaY = (e.clientY - dragStart.y) / viewBox.scale;
      
      setElements(prev => prev.map(el => {
        if (el.id === selectedElement) {
          let newProps = { ...el };
          
          switch (resizeHandle) {
            case 'se':
              newProps.width = Math.max(50, el.width + deltaX);
              newProps.height = Math.max(30, el.height + deltaY);
              break;
            case 'nw':
              const newWidth = Math.max(50, el.width - deltaX);
              const newHeight = Math.max(30, el.height - deltaY);
              newProps.x = el.x + (el.width - newWidth);
              newProps.y = el.y + (el.height - newHeight);
              newProps.width = newWidth;
              newProps.height = newHeight;
              break;
            case 'ne':
              newProps.width = Math.max(50, el.width + deltaX);
              newProps.height = Math.max(30, el.height - deltaY);
              newProps.y = el.y + deltaY;
              break;
            case 'sw':
              newProps.width = Math.max(50, el.width - deltaX);
              newProps.height = Math.max(30, el.height + deltaY);
              newProps.x = el.x + deltaX;
              break;
          }
          
          return newProps;
        }
        return el;
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      setViewBox(prev => ({
        ...prev,
        x: prev.x - deltaX / prev.scale,
        y: prev.y - deltaY / prev.scale
      }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    } else if (isDragging && selectedElement) {
      const deltaX = (e.clientX - dragStart.x) / viewBox.scale;
      const deltaY = (e.clientY - dragStart.y) / viewBox.scale;
      setElements(prev => prev.map(el => 
        el.id === selectedElement
          ? { ...el, x: el.x + deltaX, y: el.y + deltaY }
          : el
      ));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDrawing, isPanning, isDragging, isResizing, screenToCanvas, selectedTool, lastPanPoint, dragStart, selectedElement, viewBox.scale, resizeHandle]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentPath.length > 1) {
      const bounds = {
        minX: Math.min(...currentPath.map(p => p.x)),
        minY: Math.min(...currentPath.map(p => p.y)),
        maxX: Math.max(...currentPath.map(p => p.x)),
        maxY: Math.max(...currentPath.map(p => p.y))
      };
      
      const newDrawing = {
        id: Date.now(),
        type: 'drawing',
        path: currentPath,
        color: selectedColor,
        brushSize: brushSize,
        x: bounds.minX - 10,
        y: bounds.minY - 10,
        width: bounds.maxX - bounds.minX + 20,
        height: bounds.maxY - bounds.minY + 20
      };
      
      setElements(prev => {
        const updated = [...prev, newDrawing];
        addToHistory(updated);
        return updated;
      });
    }
    
    if (isDragging || isResizing) {
      addToHistory(elements);
    }
    
    setIsDrawing(false);
    setCurrentPath([]);
    setIsPanning(false);
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, [isDrawing, isDragging, isResizing, currentPath, selectedColor, brushSize, addToHistory, elements]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleMouseMove, handleMouseUp]);

  // Zoom functions
  const zoomIn = useCallback(() => {
    const newScale = Math.min(8, viewBox.scale * 1.3);
    const rect = canvasRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.width / 2 : window.innerWidth / 2;
    const centerY = rect ? rect.height / 2 : window.innerHeight / 2;

    setViewBox(prev => ({
      x: prev.x + (centerX / prev.scale - centerX / newScale),
      y: prev.y + (centerY / prev.scale - centerY / newScale),
      scale: newScale
    }));
  }, [viewBox.scale]);

  const zoomOut = useCallback(() => {
    const newScale = Math.max(0.1, viewBox.scale / 1.3);
    const rect = canvasRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.width / 2 : window.innerWidth / 2;
    const centerY = rect ? rect.height / 2 : window.innerHeight / 2;

    setViewBox(prev => ({
      x: prev.x + (centerX / prev.scale - centerX / newScale),
      y: prev.y + (centerY / prev.scale - centerY / newScale),
      scale: newScale
    }));
  }, [viewBox.scale]);

  const resetView = useCallback(() => setViewBox({ x: 0, y: 0, scale: 1 }), []);

  const deleteElement = useCallback(() => {
    if (selectedElement) {
      setElements(prev => {
        const filtered = prev.filter(el => el.id !== selectedElement);
        addToHistory(filtered);
        return filtered;
      });
      setSelectedElement(null);
    }
  }, [selectedElement, addToHistory]);

  const generatePathString = (path) => {
    if (path.length < 2) return '';
    let pathStr = `M ${path[0].x} ${path[0].y}`;
    for (let i = 1; i < path.length; i++) {
      pathStr += ` L ${path[i].x} ${path[i].y}`;
    }
    return pathStr;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle shortcuts when typing in text input
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        return;
      }
      
      // Tool shortcuts
      if (e.key === '1') setSelectedTool('text');
      else if (e.key === '2') setSelectedTool('pen');
      else if (e.key === '3') setSelectedTool('move');
      else if (e.key === '4') fileInputRef.current?.click();
      
      // Action shortcuts
      else if (e.key === 'Delete') deleteElement();
      else if (e.key === '0') resetView();
      else if (e.key === '=' || e.key === '+') zoomIn();
      else if (e.key === '-') zoomOut();
      else if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if (e.key === 'z' && e.shiftKey || e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
      else if (e.key === 'Escape') {
        const editingElement = elements.find(el => el.isEditing);
        if (editingElement) {
          finishTextEditing(editingElement.id, editingText);
        }
        setSelectedElement(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, elements, editingText, finishTextEditing, deleteElement, zoomIn, zoomOut, resetView, undo, redo]);

  useEffect(() => {
    if (isTextInputVisible && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 50);
    }
  }, [isTextInputVisible]);

  // Render resize handles for selected element
  const renderResizeHandles = (element) => {
    if (!element || element.type === 'drawing') return null;
    
    const handleSize = 8 / viewBox.scale;
    const { x, y, width, height } = element;
    
    const handles = [
      { name: 'nw', x: x - handleSize/2, y: y - handleSize/2 },
      { name: 'ne', x: x + width - handleSize/2, y: y - handleSize/2 },
      { name: 'sw', x: x - handleSize/2, y: y + height - handleSize/2 },
      { name: 'se', x: x + width - handleSize/2, y: y + height - handleSize/2 },
    ];
    
    return handles.map(handle => (
      <rect
        key={handle.name}
        x={handle.x}
        y={handle.y}
        width={handleSize}
        height={handleSize}
        fill="#3b82f6"
        stroke="#ffffff"
        strokeWidth={1 / viewBox.scale}
        className="cursor-resize"
        style={{
          cursor: handle.name === 'nw' || handle.name === 'se' ? 'nw-resize' :
                  handle.name === 'ne' || handle.name === 'sw' ? 'ne-resize' : 'move'
        }}
      />
    ));
  };

  const tools = [
    { id: 'text', icon: Type, label: 'Text (1)', shortcut: '1' },
    { id: 'pen', icon: Edit3, label: 'Pen (2)', shortcut: '2' },
    { id: 'move', icon: Move3D, label: 'Move (3)', shortcut: '3' }
  ];

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden relative">
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur-2xl border border-gray-200/30 shadow-lg rounded-2xl">
        <div className="flex items-center gap-4 px-4 py-3">
          {/* Tool buttons */}
          <div className="flex items-center gap-1 bg-gray-50/80 rounded-xl p-1">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  selectedTool === tool.id 
                    ? 'bg-white text-blue-600 shadow-md' 
                    : 'hover:bg-white/70 text-gray-600'
                }`}
                title={tool.label}
              >
                <tool.icon size={18} />
              </button>
            ))}
          </div>

          {/* Color picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPalette(!showColorPalette)}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200"
              title="Colors"
            >
              <div className="w-4 h-4 rounded border border-white shadow-sm" style={{ backgroundColor: selectedColor }}></div>
            </button>
            
            {showColorPalette && (
              <div className="absolute top-full mt-2 left-0 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl p-3 border border-gray-200/50 z-30">
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        setShowColorPalette(false);
                      }}
                      className={`w-6 h-6 rounded border-2 hover:scale-110 transition-transform ${
                        selectedColor === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                
                {selectedTool === 'pen' && (
                  <div className="border-t border-gray-200/50 pt-2">
                    <div className="text-xs text-gray-600 mb-1">Brush Size</div>
                    <div className="flex gap-1">
                      {brushSizes.map(size => (
                        <button
                          key={size}
                          onClick={() => setBrushSize(size)}
                          className={`w-6 h-6 rounded flex items-center justify-center ${
                            brushSize === size ? 'bg-blue-100 border border-blue-400' : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div 
                            className="rounded-full bg-gray-700" 
                            style={{ width: `${Math.min(size * 1.5, 12)}px`, height: `${Math.min(size * 1.5, 12)}px` }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Image upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200"
            title="Upload Image (4)"
          >
            <Camera size={18} />
          </button>

          {/* Undo/Redo */}
          <div className="flex items-center gap-1 bg-gray-50/80 rounded-xl p-1">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/70 text-gray-600"
              title="Undo (Ctrl+Z)"
            >
              <Undo size={16} />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/70 text-gray-600"
              title="Redo (Ctrl+Y)"
            >
              <Redo size={16} />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-gray-50/80 rounded-xl p-1">
            <button
              onClick={zoomOut}
              className="p-2 rounded-lg transition-all duration-200 hover:bg-white/70 text-gray-600"
              title="Zoom Out (-)"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={resetView}
              className="p-2 rounded-lg transition-all duration-200 hover:bg-white/70 text-gray-600"
              title="Reset View (0)"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={zoomIn}
              className="p-2 rounded-lg transition-all duration-200 hover:bg-white/70 text-gray-600"
              title="Zoom In (+)"
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Welcome message */}
      {elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
          <div className="text-center text-gray-500 bg-white/70 backdrop-blur-xl rounded-3xl p-10 shadow-xl border border-gray-200/30 max-w-2xl">
            <div className="text-3xl mb-6 font-light text-gray-700">✨ Infinite Canvas</div>
            <div className="space-y-3 text-gray-600 text-lg">
              <div>Click anywhere to add text</div>
              <div>Draw with the pen tool</div>
              <div>Upload and move images</div>
              <div className="text-sm text-gray-500 mt-6 space-y-1">
                <div><strong>Shortcuts:</strong> 1=Text, 2=Pen, 3=Move, 4=Image</div>
                <div>Ctrl+Z=Undo, Delete=Remove, 0=Reset View</div>
                <div>Enter to finish text • Shift+Enter for new line</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        style={{ 
          cursor: selectedTool === 'text' ? 'text' : 
                 selectedTool === 'pen' ? 'crosshair' : 
                 isPanning ? 'grabbing' : 'grab' 
        }}
      >
        <svg className="w-full h-full" style={{
          transform: `translate(${-viewBox.x * viewBox.scale}px, ${-viewBox.y * viewBox.scale}px) scale(${viewBox.scale})`,
          transformOrigin: '0 0'
        }}>
          <defs>
            <pattern id="paper" width="60" height="60" patternUnits="userSpaceOnUse">
              <rect width="60" height="60" fill="#fefefe" />
              <circle cx="30" cy="30" r="0.8" fill="#f8f9fa" opacity="0.4" />
            </pattern>
          </defs>
          
          <rect x={viewBox.x - 3000} y={viewBox.y - 3000} width="6000" height="6000" fill="url(#paper)" />

          {/* Elements */}
          {elements.map(element => (
            <g key={element.id} data-id={element.id}>
              {element.type === 'text' && !element.isEditing && (
                <g>
                  <foreignObject x={element.x} y={element.y} width={element.width} height={element.height}>
                    <div 
                      className="p-2 leading-relaxed"
                      style={{ 
                        fontSize: '16px',
                        fontFamily: element.font,
                        color: element.color,
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        width: '100%',
                        height: '100%'
                      }}
                    >
                      {element.content}
                    </div>
                  </foreignObject>
                  
                  {selectedElement === element.id && (
                    <>
                      <rect
                        x={element.x - 5}
                        y={element.y - 5}
                        width={element.width + 10}
                        height={element.height + 10}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={2 / viewBox.scale}
                        strokeDasharray={`${5 / viewBox.scale} ${3 / viewBox.scale}`}
                        rx="8"
                        opacity="0.7"
                      />
                      {renderResizeHandles(element)}
                    </>
                  )}
                </g>
              )}
              
              {element.type === 'drawing' && (
                <g>
                  <path
                    d={generatePathString(element.path)}
                    stroke={element.color}
                    strokeWidth={element.brushSize / viewBox.scale}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    className={selectedElement === element.id ? 'opacity-80' : ''}
                  />
                  
                  {selectedElement === element.id && (
                    <rect
                      x={element.x}
                      y={element.y}
                      width={element.width}
                      height={element.height}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={2 / viewBox.scale}
                      strokeDasharray={`${5 / viewBox.scale} ${3 / viewBox.scale}`}
                      rx="8"
                      opacity="0.7"
                    />
                  )}
                </g>
              )}
              
              {element.type === 'image' && (
                <g>
                  <image
                    x={element.x}
                    y={element.y}
                    width={element.width}
                    height={element.height}
                    href={element.content}
                    className={selectedElement === element.id ? 'opacity-90' : ''}
                  />
                  
                  {selectedElement === element.id && (
                    <>
                      <rect
                        x={element.x - 5}
                        y={element.y - 5}
                        width={element.width + 10}
                        height={element.height + 10}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={2 / viewBox.scale}
                        strokeDasharray={`${5 / viewBox.scale} ${3 / viewBox.scale}`}
                        rx="8"
                        opacity="0.7"
                      />
                      {renderResizeHandles(element)}
                    </>
                  )}
                </g>
              )}
            </g>
          ))}

          {/* Current drawing */}
          {isDrawing && currentPath.length > 1 && (
            <path
              d={generatePathString(currentPath)}
              stroke={selectedColor}
              strokeWidth={brushSize / viewBox.scale}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.8"
            />
          )}
        </svg>
      </div>

      {/* Hidden file input */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        onChange={handleImageUpload} 
        className="hidden" 
      />

      {/* Floating Text Input */}
      {isTextInputVisible && (
        <div 
          className="absolute z-50 pointer-events-auto text-input-overlay"
          style={{
            left: Math.max(10, Math.min(window.innerWidth - 400, textInputPosition.x - 200)),
            top: Math.max(100, Math.min(window.innerHeight - 250, textInputPosition.y + 20)),
          }}
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 p-4 w-96">
            <textarea
              ref={textareaRef}
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const editingElement = elements.find(el => el.isEditing);
                  if (editingElement) {
                    finishTextEditing(editingElement.id, editingText);
                  }
                } else if (e.key === 'Escape') {
                  const editingElement = elements.find(el => el.isEditing);
                  if (editingElement) {
                    finishTextEditing(editingElement.id, editingText);
                  }
                }
              }}
              className="w-full border-none outline-none resize-none bg-transparent text-gray-800 placeholder-gray-400"
              style={{ 
                fontSize: '16px',
                fontFamily: selectedFont,
                color: selectedColor,
                minHeight: '120px',
                lineHeight: '1.6'
              }}
              placeholder="Type your text... (Enter to finish, Shift+Enter for new line)"
              autoFocus
            />
            
            {/* Font selector */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200/50">
              <select
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400"
              >
                {fonts.map(font => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
              
              <div className="text-xs text-gray-500 flex-1">
                Enter to finish • Shift+Enter for new line
              </div>
              
              <button
                onClick={deleteElement}
                disabled={!selectedElement}
                className="p-1 rounded text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete Selected (Del)"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside handler for color palette */}
      {showColorPalette && (
        <div className="fixed inset-0 z-10" onClick={() => setShowColorPalette(false)} />
      )}
    </div>
  );
};

export default InfiniteCanvas;