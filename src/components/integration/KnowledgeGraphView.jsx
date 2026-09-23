import React, { useState, useEffect, useRef } from 'react';
import { BrainDump } from '@/entities/BrainDump';
import { ProcessedVideo } from '@/entities/ProcessedVideo';
import { StudyNotesSection } from '@/entities/StudyNotesSection';
import { Exam } from '@/entities/Exam';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import {
  Network,
  Search,
  Filter,
  Brain,
  Video,
  FileText,
  Target,
  Eye,
  Maximize2
} from 'lucide-react';

const KnowledgeGraphView = ({ centerNodeId, centerNodeType }) => {
  const svgRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (centerNodeId && centerNodeType) {
      buildKnowledgeGraph();
    }
  }, [centerNodeId, centerNodeType]);

  const buildKnowledgeGraph = async () => {
    try {
      // Load all study materials
      const [brainDumps, videos, exams, noteSections] = await Promise.all([
        BrainDump.list('-created_date'),
        ProcessedVideo.list('-created_date'),
        Exam.list('-created_date'),
        StudyNotesSection.list('-created_date')
      ]);

      // Create nodes
      const nodesList = [];
      
      // Center node
      let centerNode = null;
      if (centerNodeType === 'brain_dump') {
        const centerDump = brainDumps.find(d => d.id === centerNodeId);
        if (centerDump) {
          centerNode = {
            id: centerDump.id,
            type: 'brain_dump',
            title: centerDump.title,
            x: 400,
            y: 300,
            radius: 40,
            color: '#8b5cf6'
          };
        }
      }
      
      if (centerNode) {
        nodesList.push(centerNode);
      }

      // Add related nodes in concentric circles
      const radius1 = 150;
      const radius2 = 250;
      const radius3 = 350;

      // Brain dumps (closest circle)
      brainDumps.forEach((dump, index) => {
        if (dump.id !== centerNodeId) {
          const angle = (index * 2 * Math.PI) / brainDumps.length;
          nodesList.push({
            id: dump.id,
            type: 'brain_dump',
            title: dump.title,
            x: 400 + radius1 * Math.cos(angle),
            y: 300 + radius1 * Math.sin(angle),
            radius: 25,
            color: '#8b5cf6'
          });
        }
      });

      // Videos (middle circle)
      videos.forEach((video, index) => {
        const angle = (index * 2 * Math.PI) / videos.length;
        nodesList.push({
          id: video.id,
          type: 'video',
          title: video.title,
          x: 400 + radius2 * Math.cos(angle),
          y: 300 + radius2 * Math.sin(angle),
          radius: 20,
          color: '#3b82f6'
        });
      });

      // Exams and notes (outer circle)
      [...exams, ...noteSections].forEach((item, index) => {
        const angle = (index * 2 * Math.PI) / (exams.length + noteSections.length);
        const isExam = exams.includes(item);
        nodesList.push({
          id: item.id,
          type: isExam ? 'exam' : 'note_section',
          title: isExam ? item.name : item.title,
          x: 400 + radius3 * Math.cos(angle),
          y: 300 + radius3 * Math.sin(angle),
          radius: 15,
          color: isExam ? '#f59e0b' : '#10b981'
        });
      });

      // Create edges (simplified - just connect to center for now)
      const edgesList = [];
      nodesList.forEach(node => {
        if (node.id !== centerNodeId && centerNode) {
          edgesList.push({
            source: centerNode,
            target: node,
            strength: Math.random() * 0.8 + 0.2, // Mock connection strength
            type: 'conceptual' // Mock connection type
          });
        }
      });

      setNodes(nodesList);
      setEdges(edgesList);

    } catch (error) {
      console.error('Failed to build knowledge graph:', error);
    }
  };

  const getNodeIcon = (type) => {
    switch (type) {
      case 'brain_dump': return Brain;
      case 'video': return Video;
      case 'exam': return Target;
      case 'note_section': return FileText;
      default: return Brain;
    }
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setViewBox(prev => ({
        ...prev,
        x: prev.x - deltaX / prev.scale,
        y: prev.y - deltaY / prev.scale
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setViewBox(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale * zoomFactor))
    }));
  };

  const filteredNodes = nodes.filter(node =>
    node.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            Knowledge Graph
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Maximize2 className="w-4 h-4 mr-2" />
              Fullscreen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Graph Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="h-[600px] overflow-hidden">
            <CardContent className="p-0 h-full">
              <svg
                ref={svgRef}
                className="w-full h-full cursor-move"
                viewBox={`${viewBox.x} ${viewBox.y} ${800 / viewBox.scale} ${600 / viewBox.scale}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
              >
                {/* Background grid */}
                <defs>
                  <pattern
                    id="grid"
                    width="50"
                    height="50"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 50 0 L 0 0 0 50"
                      fill="none"
                      stroke="#f3f4f6"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Edges */}
                {edges.map((edge, index) => (
                  <line
                    key={index}
                    x1={edge.source.x}
                    y1={edge.source.y}
                    x2={edge.target.x}
                    y2={edge.target.y}
                    stroke="#d1d5db"
                    strokeWidth={edge.strength * 3}
                    strokeOpacity={0.6}
                  />
                ))}

                {/* Nodes */}
                {filteredNodes.map((node, index) => {
                  const IconComponent = getNodeIcon(node.type);
                  const isSelected = selectedNode?.id === node.id;
                  const isHighlighted = searchTerm && node.title.toLowerCase().includes(searchTerm.toLowerCase());

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={() => handleNodeClick(node)}
                      className="cursor-pointer"
                    >
                      {/* Node circle */}
                      <circle
                        r={node.radius}
                        fill={node.color}
                        stroke={isSelected ? '#1f2937' : '#ffffff'}
                        strokeWidth={isSelected ? 3 : 2}
                        opacity={isHighlighted || !searchTerm ? 1 : 0.3}
                        className="transition-all duration-200 hover:stroke-gray-700"
                      />
                      
                      {/* Node icon */}
                      <foreignObject
                        x={-10}
                        y={-10}
                        width="20"
                        height="20"
                        className="pointer-events-none"
                      >
                        <IconComponent 
                          className="w-5 h-5 text-white" 
                          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                        />
                      </foreignObject>

                      {/* Node label */}
                      <text
                        y={node.radius + 20}
                        textAnchor="middle"
                        className="fill-gray-700 text-xs font-medium pointer-events-none"
                        opacity={isHighlighted || !searchTerm ? 1 : 0.3}
                      >
                        {node.title.length > 20 ? `${node.title.slice(0, 20)}...` : node.title}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </CardContent>
          </Card>
        </div>

        {/* Selected Node Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Node Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: selectedNode.color }}
                    >
                      {React.createElement(getNodeIcon(selectedNode.type), {
                        className: "w-4 h-4 text-white"
                      })}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {selectedNode.title}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {selectedNode.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button size="sm" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  Click on a node to see details
                </p>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { type: 'brain_dump', label: 'Brain Dumps', color: '#8b5cf6' },
                  { type: 'video', label: 'Videos', color: '#3b82f6' },
                  { type: 'exam', label: 'Exams', color: '#f59e0b' },
                  { type: 'note_section', label: 'Notes', color: '#10b981' }
                ].map((item) => (
                  <div key={item.type} className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphView;