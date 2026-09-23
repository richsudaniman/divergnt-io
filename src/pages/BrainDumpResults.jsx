import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrainDump } from '@/entities/BrainDump';
import { createPageUrl } from '@/utils';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import SmartConnector from '../components/integration/SmartConnector';
import KnowledgeGraphView from '../components/integration/KnowledgeGraphView';
import StudyPathRecommender from '../components/integration/StudyPathRecommender';
import NoteStructurer from '../components/brain-dump/NoteStructurer';

import {
  Brain,
  Lightbulb,
  CheckSquare,
  TrendingUp,
  Link2,
  ArrowLeft,
  Copy,
  Share2,
  BookOpen,
  Network
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function BrainDumpResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [dumpId, setDumpId] = useState(null);
  const [dumpData, setDumpData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const id = urlParams.get('id');
    
    if (id) {
      setDumpId(id);
      loadDumpResults(id);
    } else {
      setError("No brain dump ID provided");
      setLoading(false);
    }
  }, [location]);

  const loadDumpResults = async (id) => {
    try {
      const dumps = await BrainDump.filter({ id });
      if (dumps.length === 0) {
        setError("Brain dump not found");
        return;
      }

      const dump = dumps[0];
      setDumpData(dump);
      
      if (dump.processing_status !== 'processed') {
        setError("Brain dump is not fully processed yet. Some AI-generated insights may not be available.");
      } else {
        setError(null);
      }
      
    } catch (error) {
      console.error("Error loading brain dump results:", error);
      setError("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 animate-pulse text-purple-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading your processed thoughts...</p>
        </div>
      </div>
    );
  }

  if (!dumpData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Oops!</h2>
            <p className="text-gray-600 mb-6">{error || "Could not load brain dump data."}</p>
            <Button 
              onClick={() => navigate(createPageUrl("BrainDump"))}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Back to Brain Dump
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { 
    extracted_concepts = [], 
    identified_patterns = [], 
    extracted_action_items = [], 
    cross_referenced_materials = [], 
    processed_notes_markdown = "",
    raw_text_content = ""
  } = dumpData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("BrainDump"))}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{dumpData?.title}</h1>
              <p className="text-gray-600">Beautiful structured notes from your brain dump</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(dumpData?.processed_notes_markdown || '')}
              className="rounded-xl"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Notes
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </motion.div>

        {/* Optional: Display processing status error if it exists */}
        {error && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
            <p className="flex items-center gap-2"><Lightbulb className="w-5 h-5" /> {error}</p>
          </div>
        )}

        {/* Main Content - Now with Beautiful Note Structurer */}
        <Tabs defaultValue="structured" className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full bg-white/50 backdrop-blur-sm rounded-2xl p-2 shadow-sm">
            <TabsTrigger value="structured" className="rounded-xl">Beautiful Notes</TabsTrigger>
            <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
            <TabsTrigger value="concepts" className="rounded-xl">Concepts</TabsTrigger>
            <TabsTrigger value="patterns" className="rounded-xl">Patterns</TabsTrigger>
            <TabsTrigger value="actions" className="rounded-xl">Actions</TabsTrigger>
            <TabsTrigger value="connections" className="rounded-xl">Connections</TabsTrigger>
          </TabsList>

          {/* NEW: Beautiful Structured Notes Tab (Primary) */}
          <TabsContent value="structured" className="space-y-6">
            <NoteStructurer 
              rawContent={raw_text_content}
              onStructuredNotesReady={(structuredNotes) => {
                console.log('Structured notes ready:', structuredNotes);
              }}
            />
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6 text-center">
                  <Lightbulb className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-blue-800 mb-1">{extracted_concepts.length}</div>
                  <div className="text-blue-600 font-medium">Core Concepts</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-purple-800 mb-1">{identified_patterns.length}</div>
                  <div className="text-purple-600 font-medium">Thinking Patterns</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-6 text-center">
                  <CheckSquare className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-orange-800 mb-1">{extracted_action_items.length}</div>
                  <div className="text-orange-600 font-medium">Action Items</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6 text-center">
                  <Link2 className="w-8 h-8 text-green-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-green-800 mb-1">{cross_referenced_materials.length}</div>
                  <div className="text-green-600 font-medium">Connections</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Preview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Top Concepts Preview */}
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-blue-50 border-b border-blue-100">
                  <CardTitle className="text-blue-800 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Key Concepts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {extracted_concepts.slice(0, 3).map((concept, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <h4 className="font-semibold text-blue-900 mb-1">{concept.name}</h4>
                        <p className="text-blue-700 text-sm">{concept.summary}</p>
                      </div>
                    ))}
                    {extracted_concepts.length > 3 && (
                      <p className="text-blue-600 text-sm">+{extracted_concepts.length - 3} more concepts</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Actions Preview */}
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-orange-50 border-b border-orange-100">
                  <CardTitle className="text-orange-800 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    {extracted_action_items.slice(0, 4).map((action, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 hover:bg-orange-50 rounded-lg">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{action}</span>
                      </div>
                    ))}
                    {extracted_action_items.length > 4 && (
                      <p className="text-orange-600 text-sm pl-5">+{extracted_action_items.length - 4} more actions</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Concepts Tab */}
          <TabsContent value="concepts" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {extracted_concepts.map((concept, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                      <CardTitle className="text-blue-900">{concept.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-gray-700 mb-4">{concept.summary}</p>
                      {concept.related_terms && concept.related_terms.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-gray-600 mb-2">Related Terms:</h5>
                          <div className="flex flex-wrap gap-2">
                            {concept.related_terms.map((term, termIndex) => (
                              <Badge key={termIndex} variant="secondary" className="bg-blue-100 text-blue-800">
                                {term}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-6">
            <div className="space-y-4">
              {identified_patterns.map((pattern, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="shadow-lg border-0">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Badge 
                          className={`mt-1 ${
                            pattern.type === 'metaphor' ? 'bg-purple-100 text-purple-800' :
                            pattern.type === 'analogy' ? 'bg-green-100 text-green-800' :
                            pattern.type === 'confusion_point' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {pattern.type.replace('_', ' ')}
                        </Badge>
                        <div className="flex-1">
                          <div className="bg-gray-50 p-3 rounded-lg mb-3 border-l-4 border-gray-300">
                            <p className="text-gray-700 italic">"{pattern.original_phrase}"</p>
                          </div>
                          <p className="text-gray-800">{pattern.explanation}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-100">
                <CardTitle className="text-orange-900 flex items-center gap-2">
                  <CheckSquare className="w-6 h-6" />
                  Your Action Items
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {extracted_action_items.map((action, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-4 p-4 bg-orange-50 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors"
                    >
                      <div className="w-6 h-6 border-2 border-orange-400 rounded flex-shrink-0 mt-0.5"></div>
                      <span className="text-gray-800 flex-1">{action}</span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Related Materials if they exist */}
            {cross_referenced_materials.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b border-green-100">
                  <CardTitle className="text-green-900 flex items-center gap-2">
                    <Link2 className="w-6 h-6" />
                    Related Materials
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {cross_referenced_materials.map((connection, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-100">
                        <BookOpen className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div className="flex-1">
                          <h5 className="font-semibold text-green-900">{connection.title}</h5>
                          <p className="text-green-700 text-sm">{connection.connection_reason}</p>
                        </div>
                        <Badge variant="outline" className="border-green-300 text-green-700">
                          {connection.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-6">
            <SmartConnector 
              brainDumpId={dumpId} 
              onConnectionsFound={(connections, suggestions) => {
                console.log('Connections found:', connections, suggestions);
              }}
            />

            <StudyPathRecommender 
              brainDumpId={dumpId}
              userGoal="Master the concepts from this brain dump"
            />

            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                <CardTitle className="text-indigo-900 flex items-center gap-2">
                  <Network className="w-6 h-6" />
                  Knowledge Graph
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <KnowledgeGraphView 
                  centerNodeId={dumpId} 
                  centerNodeType="brain_dump" 
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}