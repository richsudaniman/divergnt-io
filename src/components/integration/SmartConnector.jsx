import React, { useState } from 'react';
import { BrainDump } from '@/entities/BrainDump';
import { ProcessedVideo } from '@/entities/ProcessedVideo';
import { StudyNotesSection } from '@/entities/StudyNotesSection';
import { Exam } from '@/entities/Exam';
import { InvokeLLM } from '@/integrations/Core';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import {
  Link2,
  Brain,
  FileText,
  Video,
  BookOpen,
  Lightbulb,
  ArrowRight,
  Zap,
  Target,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SmartConnector = ({ brainDumpId, onConnectionsFound }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [connections, setConnections] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [currentStep, setCurrentStep] = useState('');

  const analyzeConnections = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      // Step 1: Load brain dump data
      setCurrentStep('Loading your brain dump...');
      setAnalysisProgress(10);
      
      const brainDumps = await BrainDump.filter({ id: brainDumpId });
      if (brainDumps.length === 0) return;
      
      const brainDump = brainDumps[0];
      const brainDumpConcepts = brainDump.extracted_concepts || [];
      const brainDumpText = brainDump.raw_text_content || '';

      // Step 2: Gather existing study materials
      setCurrentStep('Scanning your study library...');
      setAnalysisProgress(25);
      
      const [videos, exams, noteSections] = await Promise.all([
        ProcessedVideo.list('-created_date', 20),
        Exam.list('-created_date', 10),
        StudyNotesSection.list('-created_date', 50)
      ]);

      // Step 3: Find semantic connections
      setCurrentStep('Finding intelligent connections...');
      setAnalysisProgress(50);
      
      const connectionAnalysis = await InvokeLLM({
        prompt: `Analyze this brain dump and find intelligent connections to existing study materials:

        BRAIN DUMP CONCEPTS: ${JSON.stringify(brainDumpConcepts)}
        BRAIN DUMP TEXT: "${brainDumpText}"

        EXISTING MATERIALS:
        Videos: ${videos.map(v => `"${v.title}"`).join(', ')}
        Exams: ${exams.map(e => `"${e.name}"`).join(', ')}
        Note Sections: ${noteSections.map(n => `"${n.title}"`).join(', ')}

        Find connections based on:
        1. Conceptual overlap (same topics/themes)
        2. Complementary knowledge (brain dump fills gaps)
        3. Contradiction resolution (brain dump clarifies confusion)
        4. Application opportunities (brain dump provides examples)
        5. Study sequence optimization (what to study next)

        Return detailed connections with confidence scores.`,
        response_json_schema: {
          type: "object",
          properties: {
            connections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  target_type: { type: "string", enum: ["video", "exam", "note_section"] },
                  target_id: { type: "string" },
                  target_title: { type: "string" },
                  connection_type: { type: "string", enum: ["conceptual_overlap", "complementary", "clarification", "application", "sequence"] },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                  explanation: { type: "string" },
                  suggested_action: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Step 4: Generate smart suggestions
      setCurrentStep('Generating smart suggestions...');
      setAnalysisProgress(75);
      
      const suggestionAnalysis = await InvokeLLM({
        prompt: `Based on the brain dump and found connections, generate smart learning suggestions:

        BRAIN DUMP: "${brainDumpText}"
        CONNECTIONS FOUND: ${connectionAnalysis.connections?.length || 0}

        Generate suggestions for:
        1. What to study next based on this brain dump
        2. Knowledge gaps to fill
        3. Practice opportunities to apply these concepts
        4. Review strategies for retention
        5. Cross-connections to explore further

        Focus on ADHD-friendly, actionable suggestions that build on the user's interest momentum.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["study_next", "fill_gap", "practice", "review", "explore"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                  time_estimate: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Step 5: Finalize results
      setCurrentStep('Finalizing connections...');
      setAnalysisProgress(100);

      const foundConnections = connectionAnalysis.connections || [];
      const smartSuggestions = suggestionAnalysis.suggestions || [];

      setConnections(foundConnections);
      setSuggestions(smartSuggestions);
      
      if (onConnectionsFound) {
        onConnectionsFound(foundConnections, smartSuggestions);
      }

    } catch (error) {
      console.error('Connection analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
      setCurrentStep('');
    }
  };

  const getConnectionIcon = (type) => {
    switch (type) {
      case 'video': return Video;
      case 'exam': return Target;
      case 'note_section': return FileText;
      default: return BookOpen;
    }
  };

  const getConnectionColor = (connectionType) => {
    switch (connectionType) {
      case 'conceptual_overlap': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'complementary': return 'bg-green-50 border-green-200 text-green-800';
      case 'clarification': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'application': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'sequence': return 'bg-orange-50 border-orange-200 text-orange-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'study_next': return ArrowRight;
      case 'fill_gap': return Target;
      case 'practice': return Zap;
      case 'review': return Brain;
      case 'explore': return Lightbulb;
      default: return BookOpen;
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Trigger */}
      {!isAnalyzing && connections.length === 0 && (
        <Card className="border-2 border-dashed border-blue-200 bg-blue-50/30">
          <CardContent className="p-8 text-center">
            <Link2 className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-blue-900 mb-2">
              Discover Smart Connections
            </h3>
            <p className="text-blue-700 mb-6 max-w-md mx-auto">
              Let AI find intelligent connections between this brain dump and your existing study materials.
            </p>
            <Button 
              onClick={analyzeConnections}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl"
            >
              <Brain className="w-5 h-5 mr-2" />
              Find Connections
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Analysis Progress */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-900">
                    Analyzing Connections
                  </h3>
                </div>
                <Progress 
                  value={analysisProgress} 
                  className="h-3 mb-3 bg-blue-100 [&>div]:bg-blue-500 rounded-full" 
                />
                <p className="text-blue-700 text-sm">{currentStep}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connections Results */}
      {connections.length > 0 && (
        <div className="space-y-6">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
              <CardTitle className="text-green-800 flex items-center gap-3">
                <Link2 className="w-6 h-6" />
                Smart Connections Found ({connections.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {connections.map((connection, index) => {
                  const IconComponent = getConnectionIcon(connection.target_type);
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {connection.target_title}
                          </h4>
                          <Badge className={`text-xs ${getConnectionColor(connection.connection_type)}`}>
                            {connection.connection_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-blue-600">
                            {Math.round(connection.confidence * 100)}%
                          </div>
                          <div className="text-xs text-gray-500">confidence</div>
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm mb-3">{connection.explanation}</p>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-blue-800 text-sm font-medium">
                          💡 {connection.suggested_action}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
                <CardTitle className="text-purple-800 flex items-center gap-3">
                  <Lightbulb className="w-6 h-6" />
                  Smart Learning Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {suggestions.map((suggestion, index) => {
                    const IconComponent = getSuggestionIcon(suggestion.type);
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-4 p-4 bg-gradient-to-r from-white to-purple-50/30 rounded-xl border border-purple-100"
                      >
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{suggestion.title}</h4>
                            <Badge 
                              variant={suggestion.priority === 'urgent' ? 'destructive' : 'outline'}
                              className="text-xs"
                            >
                              {suggestion.priority}
                            </Badge>
                            {suggestion.time_estimate && (
                              <Badge variant="secondary" className="text-xs">
                                {suggestion.time_estimate}
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-700 text-sm">{suggestion.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartConnector;