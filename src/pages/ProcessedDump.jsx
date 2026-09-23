import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrainDump } from '@/entities/BrainDump';
import { ProcessedVideo } from '@/entities/ProcessedVideo';
import { InvokeLLM } from '@/integrations/Core';
import { createPageUrl } from '@/utils';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

import {
  Brain,
  Lightbulb,
  CheckSquare,
  TrendingUp,
  Link2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  FileText,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PROCESSING_STAGES = [
  { key: "extracting_concepts", title: "Extracting Core Concepts", desc: "Identifying key ideas and themes" },
  { key: "finding_patterns", title: "Finding Thinking Patterns", desc: "Analyzing your thought processes" },
  { key: "creating_actions", title: "Creating Action Items", desc: "Converting thoughts into tasks" },
  { key: "cross_referencing", title: "Cross-Referencing", desc: "Connecting to your existing notes" },
  { key: "generating_notes", title: "Generating Structured Notes", desc: "Creating organized markdown output" }
];

export default function ProcessedDumpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [dumpId, setDumpId] = useState(null);
  const [dumpData, setDumpData] = useState(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [processingResults, setProcessingResults] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const id = urlParams.get('id');
    
    if (id) {
      setDumpId(id);
      loadAndProcessDump(id);
    } else {
      setError("No brain dump ID provided");
    }
  }, [location]);

  const loadAndProcessDump = async (id) => {
    try {
      // Load the brain dump
      const dumps = await BrainDump.filter({ id });
      if (dumps.length === 0) {
        setError("Brain dump not found");
        return;
      }

      const dump = dumps[0];
      setDumpData(dump);

      // Start AI processing pipeline
      await processWithAI(dump);
      
    } catch (error) {
      console.error("Error processing brain dump:", error);
      setError("Failed to process brain dump. Please try again.");
      setIsProcessing(false);
    }
  };

  const processWithAI = async (dump) => {
    setIsProcessing(true);
    setCurrentStage(0);
    setOverallProgress(10);

    try {
      // Parse canvas elements to extract text content
      let canvasElements = [];
      try {
        canvasElements = JSON.parse(dump.canvas_data_json || '[]');
      } catch {
        canvasElements = [];
      }

      const textContent = canvasElements
        .filter(el => el.type === 'text' && el.content?.trim())
        .map(el => el.content)
        .join('\n\n');

      if (!textContent.trim()) {
        setError("No text content found in brain dump to process");
        setIsProcessing(false);
        return;
      }

      // Stage 1: Extract Core Concepts
      setCurrentStage(0);
      setOverallProgress(20);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const conceptsResult = await InvokeLLM({
        prompt: `Analyze this brain dump and extract the core concepts and ideas. Look for:
        
        Brain Dump Content:
        "${textContent}"
        
        Extract and categorize the main concepts, themes, and ideas. Return structured data.`,
        response_json_schema: {
          type: "object",
          properties: {
            concepts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  summary: { type: "string" },
                  related_terms: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      // Stage 2: Find Thinking Patterns
      setCurrentStage(1);
      setOverallProgress(40);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const patternsResult = await InvokeLLM({
        prompt: `Analyze this brain dump for personal thinking patterns. Look for:
        - Metaphors and analogies the person uses
        - Areas of confusion or uncertainty
        - Repeated themes or concerns
        - Learning preferences that emerge
        
        Content: "${textContent}"
        
        Identify patterns that reveal how this person thinks and learns.`,
        response_json_schema: {
          type: "object",
          properties: {
            patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["metaphor", "analogy", "confusion_point", "learning_preference"] },
                  original_phrase: { type: "string" },
                  explanation: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Stage 3: Create Action Items
      setCurrentStage(2);
      setOverallProgress(60);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const actionsResult = await InvokeLLM({
        prompt: `From this brain dump, extract clear, actionable tasks and next steps:
        
        Content: "${textContent}"
        
        Convert thoughts into specific, actionable items. Focus on what the person should DO next.`,
        response_json_schema: {
          type: "object",
          properties: {
            action_items: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      // Stage 4: Cross-Reference with Existing Materials
      setCurrentStage(3);
      setOverallProgress(80);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get user's existing study materials for cross-referencing
      const existingVideos = await ProcessedVideo.list('-created_date', 10);
      const videoTitles = existingVideos.map(v => v.title).join(', ');
      
      const crossRefResult = await InvokeLLM({
        prompt: `Compare this brain dump content with the user's existing study materials and find connections:
        
        Brain Dump: "${textContent}"
        
        Existing Materials: ${videoTitles || 'None found'}
        
        Find connections and suggest related materials.`,
        response_json_schema: {
          type: "object",
          properties: {
            connections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["video_notes", "exam_material", "study_section"] },
                  title: { type: "string" },
                  entity_id: { type: "string" },
                  connection_reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Stage 5: Generate Structured Notes
      setCurrentStage(4);
      setOverallProgress(95);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const notesResult = await InvokeLLM({
        prompt: `Transform this brain dump into clean, structured study notes in markdown format:
        
        Original Content: "${textContent}"
        
        Create organized notes that:
        - Have clear headings and structure
        - Maintain the person's authentic voice and thinking style
        - Include key insights and connections
        - Are easy to review later
        
        Return well-formatted markdown.`
      });

      // Compile final results
      const finalResults = {
        concepts: conceptsResult.concepts || [],
        patterns: patternsResult.patterns || [],
        action_items: actionsResult.action_items || [],
        connections: crossRefResult.connections || [],
        structured_notes: notesResult || "Failed to generate structured notes"
      };

      // Update the brain dump with results
      await BrainDump.update(dump.id, {
        processing_status: 'processed',
        extracted_concepts: finalResults.concepts,
        identified_patterns: finalResults.patterns,
        extracted_action_items: finalResults.action_items,
        cross_referenced_materials: finalResults.connections,
        processed_notes_markdown: finalResults.structured_notes
      });

      setProcessingResults(finalResults);
      setOverallProgress(100);
      setIsProcessing(false);

    } catch (error) {
      console.error("AI processing error:", error);
      await BrainDump.update(dump.id, {
        processing_status: 'error'
      });
      setError("AI processing failed. Please try again.");
      setIsProcessing(false);
    }
  };

  const viewStructuredNotes = () => {
    navigate(createPageUrl(`BrainDumpResults?id=${dumpId}`));
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto border-red-200 shadow-lg">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Processing Failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button 
              onClick={() => navigate(createPageUrl("BrainDump"))}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Back to Brain Dump
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI is processing your thoughts...
          </h1>
          <p className="text-lg text-gray-600">
            {dumpData?.title || 'Your Brain Dump'}
          </p>
        </motion.div>

        {/* Progress Card */}
        <Card className="mb-12 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Overall Progress</h3>
              <span className="text-3xl font-bold text-purple-600">{overallProgress}%</span>
            </div>
            
            <Progress 
              value={overallProgress} 
              className="h-4 mb-8 bg-gray-100 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-blue-600 rounded-full" 
            />

            {isProcessing && (
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center"
                  >
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {PROCESSING_STAGES[currentStage]?.title}
                    </h4>
                    <p className="text-gray-600">
                      {PROCESSING_STAGES[currentStage]?.desc}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stage Indicators */}
        <div className="grid grid-cols-5 gap-4 mb-12">
          {PROCESSING_STAGES.map((stage, index) => {
            const isCompleted = currentStage > index;
            const isCurrent = currentStage === index && isProcessing;
            
            return (
              <motion.div
                key={stage.key}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`text-center p-4 rounded-2xl border transition-all duration-500 ${
                  isCompleted 
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                    : isCurrent
                    ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 shadow-lg'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${
                  isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isCurrent
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {isCompleted ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <h5 className="text-xs font-semibold text-gray-700">{stage.title}</h5>
              </motion.div>
            );
          })}
        </div>

        {/* Results Preview */}
        {processingResults && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                <CardTitle className="text-xl text-green-800 flex items-center gap-3">
                  <Sparkles className="w-6 h-6" />
                  Processing Complete!
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <Lightbulb className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-800">{processingResults.concepts.length}</div>
                    <div className="text-sm text-blue-600">Core Concepts</div>
                  </div>

                  <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-800">{processingResults.patterns.length}</div>
                    <div className="text-sm text-purple-600">Thinking Patterns</div>
                  </div>

                  <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <Target className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-orange-800">{processingResults.action_items.length}</div>
                    <div className="text-sm text-orange-600">Action Items</div>
                  </div>

                  <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                    <Link2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-800">{processingResults.connections.length}</div>
                    <div className="text-sm text-green-600">Connections Found</div>
                  </div>
                </div>

                <div className="text-center">
                  <Button 
                    onClick={viewStructuredNotes}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white font-semibold px-8 py-3 rounded-xl shadow-lg"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    View Your Structured Notes
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}