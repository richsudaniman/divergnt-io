import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { debounce } from 'lodash';

import { ConceptMap } from '@/entities/ConceptMap';
import { InvokeLLM } from '@/integrations/Core';
import { createPageUrl } from '@/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Sparkles, Lightbulb, Trash2, Plus, BrainCircuit } from 'lucide-react';

const TILE_COLORS = [
  'bg-blue-100 border-blue-200 text-blue-800',
  'bg-green-100 border-green-200 text-green-800',
  'bg-purple-100 border-purple-200 text-purple-800',
  'bg-orange-100 border-orange-200 text-orange-800',
  'bg-pink-100 border-pink-200 text-pink-800',
  'bg-indigo-100 border-indigo-200 text-indigo-800',
];

export default function ConceptMapPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [videoId, setVideoId] = useState(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [tiles, setTiles] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [userSummary, setUserSummary] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mapId, setMapId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const videoIdParam = params.get('videoId');
    const chunkParam = params.get('chunk');

    if (!videoIdParam || !chunkParam) {
      navigate(createPageUrl('Dashboard'));
      return;
    }

    setVideoId(videoIdParam);
    try {
      const chunkData = JSON.parse(atob(chunkParam));
      const titleMatch = chunkData.text.match(/^##\s*(.*)/m);
      const title = titleMatch ? titleMatch[1] : 'Concept Map';
      setTopicTitle(title);
      initializeConceptMap(chunkData, title);
    } catch (error) {
      console.error('Error parsing chunk data:', error);
      navigate(createPageUrl('Dashboard'));
    }
  }, [location, navigate]);

  const debouncedSave = useCallback(
    debounce((updatedTiles, updatedSummary) => saveMap(updatedTiles, updatedSummary), 2000),
    [mapId, videoId, topicTitle]
  );

  const saveMap = async (currentTiles, currentSummary) => {
    if (!videoId || !topicTitle) return;
    setIsSaving(true);
    const mapData = {
      videoId,
      topicTitle,
      tiles: currentTiles,
      userSummary: currentSummary,
    };

    try {
      if (mapId) {
        await ConceptMap.update(mapId, mapData);
      } else {
        const newMap = await ConceptMap.create(mapData);
        setMapId(newMap.id);
      }
    } catch (error) {
      console.error("Failed to save map", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const initializeConceptMap = async (chunkData, title) => {
    setIsLoading(true);
    try {
      const prompt = `From the text below, extract 5-7 core keywords a student could use to build a concept map.
      Text: "${chunkData.text}"
      Return JSON: { "keywords": ["keyword1", "keyword2"] }`;
      const result = await InvokeLLM({ prompt, response_json_schema: { type: "object", properties: { keywords: { type: "array", items: { type: "string" }}}, required: ["keywords"]}});
      setKeywords(result.keywords || []);
    } catch (e) {
      console.error(e);
      setKeywords(['Key Idea', 'Example', 'Process', 'Definition']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(tiles);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setTiles(items);
    debouncedSave(items, userSummary);
  };

  const addNewTile = (label = 'New Concept') => {
    const newTile = {
      id: `tile-${Date.now()}`,
      label,
      description: '',
      color: TILE_COLORS[tiles.length % TILE_COLORS.length]
    };
    const newTiles = [...tiles, newTile];
    setTiles(newTiles);
    debouncedSave(newTiles, userSummary);
  };

  const updateTile = (id, field, value) => {
    const newTiles = tiles.map(t => t.id === id ? { ...t, [field]: value } : t);
    setTiles(newTiles);
    debouncedSave(newTiles, userSummary);
  };
  
  const deleteTile = (id) => {
    const newTiles = tiles.filter(t => t.id !== id);
    setTiles(newTiles);
    debouncedSave(newTiles, userSummary);
  };

  const getFeedback = async () => {
      setIsLoading(true);
      setFeedback(null);
      try {
          const prompt = `A user has created a concept map with these tiles: ${JSON.stringify(tiles.map(t => t.label))}. They wrote this summary: "${userSummary}". Give short, constructive feedback on how well the summary connects the concepts.`;
          const result = await InvokeLLM({ prompt });
          setFeedback(result);
      } catch (error) {
          console.error("Error getting feedback:", error);
          setFeedback("Could not get feedback at this time.");
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{topicTitle}</h1>
        </div>
        <div className="flex items-center gap-4">
            {isSaving && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
            <Button onClick={() => saveMap(tiles, userSummary)} className="bg-[var(--primary)] hover:opacity-90">Save Map</Button>
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <main className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2"><BrainCircuit className="w-6 h-6 text-[var(--editorial-purple-accent)]" /> Your Canvas</h2>
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="concept-tiles">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="bg-white p-6 rounded-2xl shadow-sm border min-h-[60vh] space-y-4">
                            {tiles.map((tile, index) => (
                                <Draggable key={tile.id} draggableId={tile.id} index={index}>
                                    {(provided) => (
                                        <Card ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`${tile.color} rounded-xl p-4`}>
                                            <div className="flex items-start gap-2">
                                                <div className="flex-grow space-y-2">
                                                    <Input value={tile.label} onChange={(e) => updateTile(tile.id, 'label', e.target.value)} className="text-base font-semibold bg-white/60 border-0 focus-visible:ring-1 focus-visible:ring-inset" />
                                                    <Textarea value={tile.description} onChange={(e) => updateTile(tile.id, 'description', e.target.value)} placeholder="Describe this concept..." className="text-sm bg-white/60 border-0 min-h-[40px] focus-visible:ring-1 focus-visible:ring-inset" />
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => deleteTile(tile.id)}><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                        </Card>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                            <Button variant="outline" onClick={() => addNewTile()} className="w-full h-12 border-dashed"><Plus className="w-4 h-4 mr-2" />Add Concept</Button>
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </main>
        
        <aside className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2"><Sparkles className="w-6 h-6 text-yellow-500" /> AI Sparks</h2>
                <Card className="p-4 bg-white shadow-sm border">
                    <CardContent className="p-2">
                        <p className="text-sm text-gray-500 mb-4">Need ideas? Click a keyword to add it to your canvas.</p>
                        <div className="flex flex-wrap gap-2">
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                keywords.map(kw => <Badge key={kw} variant="secondary" onClick={() => addNewTile(kw)} className="cursor-pointer hover:bg-gray-200">{kw}</Badge>)
                            }
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2"><Lightbulb className="w-6 h-6 text-green-500" /> Synthesize & Reflect</h2>
                <Card className="p-4 bg-white shadow-sm border">
                    <CardContent className="p-2 space-y-4">
                         <Textarea placeholder="Connect your concepts in a short summary..." value={userSummary} onChange={(e) => setUserSummary(e.target.value)} onBlur={() => debouncedSave(tiles, userSummary)} className="h-32" />
                         <Button onClick={getFeedback} disabled={isLoading || !userSummary} className="w-full">
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Get Feedback
                        </Button>
                        {feedback && (
                            <div className="mt-4 p-4 bg-green-50 text-green-800 border border-green-200 rounded-lg text-sm">{feedback}</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </aside>
      </div>
    </div>
  );
}