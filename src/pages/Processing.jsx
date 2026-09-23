import React, { useState, useEffect } from "react";
import { ProcessedVideo } from "@/entities/ProcessedVideo";
import { InvokeLLM } from "@/integrations/Core";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

const PROCESSING_STAGES = [
  { key: "stage1_chunking", title: "Chunking", desc: "Breaking content into sections" },
  { key: "stage2_constraints", title: "Constraints", desc: "Applying sentence & concept limits" },
  { key: "stage3_decomposition", title: "Decomposition", desc: "Creating micro-steps" },
  { key: "stage4_formatting", title: "Formatting", desc: "Visual & spatial organization" },
  { key: "stage5_equations", title: "Equations", desc: "Detecting mathematical content" },
  { key: "stage6_cognitive", title: "Cognitive Load", desc: "Optimizing for retention" },
  { key: "stage7_reinforcement", title: "Reinforcement", desc: "Adding recaps & emphasis" }
];

export default function ProcessingPage() {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [currentStage, setCurrentStage] = useState(0); // 0 for transcribing, 1-7 for PROCESSING_STAGES
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');
    
    if (videoId) {
      loadVideo(videoId);
    } else {
      setError("No video ID provided");
    }
  }, []);

  const loadVideo = async (videoId) => {
    try {
      const videoData = await ProcessedVideo.filter({ id: videoId });
      if (videoData.length > 0) {
        setVideo(videoData[0]);
        if (videoData[0].processing_status === "completed") {
          navigate(createPageUrl(`Results?id=${videoId}`));
        } else if (videoData[0].processing_status !== "error") {
          const completedStages = Object.values(videoData[0].stage_progress || {}).filter(Boolean).length;
          const initialProgress = (videoData[0].transcript ? 10 : 0) + (completedStages * 10);
          setCurrentStage(completedStages);
          setOverallProgress(initialProgress);
          startProcessing(videoData[0], completedStages);
        }
      } else {
        setError("Video not found");
      }
    } catch (error) {
      console.error("Error loading video:", error);
      setError("Failed to load video");
    }
  };

  const startProcessing = async (videoData, startFromStage = 0) => {
    setIsProcessing(true);
    setError(null);
    let currentData = videoData;

    try {
      // Step 1: Transcribe the video if not already done and not resuming from later stage
      if (startFromStage === 0 && !currentData.transcript) {
        await ProcessedVideo.update(currentData.id, { processing_status: "transcribing" });
        setCurrentStage(0); // Set currentStage to 0 for transcription
        setOverallProgress(10);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const transcriptResult = await InvokeLLM({
          prompt: `This is a mock transcription of an educational video. Please provide a detailed educational transcript that would be typical for a lecture video, including timestamps. The video is titled: "${currentData.title}". 
          
          Make it comprehensive and educational, as if it were a real lecture transcript with multiple concepts, examples, and possibly some equations. Format it with natural speech patterns and include relevant educational content.`,
          response_json_schema: {
            type: "object",
            properties: {
              transcript: { type: "string" },
              duration: { type: "number" }
            }
          }
        });

        const updatedData = {
            transcript: transcriptResult.transcript,
            duration: transcriptResult.duration || 600,
            processing_status: "processing"
        };
        await ProcessedVideo.update(currentData.id, updatedData);
        currentData = { ...currentData, ...updatedData };
      }

      // Process through remaining stages
      for (let i = startFromStage; i < PROCESSING_STAGES.length; i++) {
        setCurrentStage(i + 1); // Set currentStage to i+1 for actual processing stages (1-7)
        setOverallProgress(20 + (i * 10)); // Base 20% after transcript, then 10% per stage
        
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        const stageProgress = { ...currentData.stage_progress };
        stageProgress[PROCESSING_STAGES[i].key] = true;
        
        await ProcessedVideo.update(currentData.id, { stage_progress: stageProgress });
        currentData = { ...currentData, stage_progress: stageProgress };
      }

      // Final processing: Generate structured notes
      setOverallProgress(90);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const notesResult = await InvokeLLM({
        prompt: `Transform this educational video transcript into perfectly structured, retainable notes. Follow all 7-stage pipeline rules.

        **CRITICAL VISUAL RULES**: 
        1. **DIAGRAMS** - Only if conditions are strictly met:
           - **Flowchart**: ONLY for clear step-by-step processes or decision trees
           - **Mind Map**: ONLY for central idea with 3+ related sub-ideas  
           - **Timeline**: ONLY for chronological events or stages
           - **Matrix**: ONLY for contrasting 2+ items across shared dimensions
           - **Concept Map**: ONLY for non-linear systems with feedback loops

        2. **CHARTS** - Only if quantitative data exists and meets criteria:
           - **Bar Chart**: ONLY if comparing 3-7 distinct categories with numerical data (frequencies, counts, measurements)
           - **Line Chart**: ONLY if tracking a variable over time/sequence showing change/progression
           
        If conditions aren't met, leave arrays empty. NO forced visuals.

        **ENHANCED SUMMARY REQUIREMENT**: 
        The final section MUST be a comprehensive "Key Takeaways & Summary" that covers:
        - All main concepts discussed
        - Important definitions and their practical applications
        - Key relationships between concepts
        - Critical points students should remember
        - Any formulas or processes with brief explanations
        This summary should be thorough enough for students to review and self-assess their complete understanding.

        **FINAL JSON STRUCTURE REQUIREMENT**:
        After creating the notes, perform two additional steps:
        1.  **Chunking**: Split the full markdown notes into logical chunks, where each chunk starts with a "## " heading.
        2.  **Tagging**: For each chunk, analyze its content and assign one or more relevant tags from the list below.

        **Available Tags:**
        -   "Definition/Vocabulary" (short, one-to-one mappings)
        -   "Linear Sequence" (ordered steps or phases)
        -   "Systems/Relationships" (nodes & connections)
        -   "Abstract/High-Level" (theories, frameworks)
        -   "Quantitative/Formulaic" (equations, numeric relationships)
        -   "Cause & Effect/Decision Trees" ("if → then" logic)
        -   "Narrative/Story" (plot-driven or case-study content)

        Return a single JSON object containing the full notes, any visuals found, AND a "note_chunks" array where each element contains the chunk text and its assigned tags.

        For any visual: Keep labels short (1-3 words), provide clear axis labels, include brief captions.

        TRANSCRIPT: ${currentData.transcript}
        
        Cover EVERY piece of information from the transcript without omission.`,
        response_json_schema: {
          type: "object",
          properties: {
            notes: { type: "string" },
            note_chunks: {
                type: "array",
                description: "Tagged and chunked notes.",
                items: {
                    type: "object",
                    properties: {
                        chunk_id: { type: "number" },
                        text: { type: "string" },
                        tags: {
                            type: "array",
                            items: { type: "string" }
                        }
                    },
                    required: ["chunk_id", "text", "tags"]
                }
            },
            equations_found: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  equation: { type: "string" },
                  variables: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        value: { type: "string", "description": "The symbol or name of the variable, e.g., 'Qd' or 'P'." },
                        description: { type: "string", "description": "A plain-English explanation of the variable." },
                        unit: { type: "string", "description": "The unit of measurement, e.g., 'units' or 'dollars'." }
                      },
                      required: ["value", "description"]
                    }
                  },
                  purpose: { type: "string" }
                }
              }
            },
            diagrams: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  type: { type: "string", "enum": ["flowchart", "mindmap", "timeline", "matrix", "conceptmap"] },
                  code: { type: "string" },
                  recap: { type: "string" }
                },
                required: ["title", "type", "code", "recap"]
              }
            },
            charts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  type: { type: "string", "enum": ["bar", "line"] },
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        value: { type: "number" }
                      }
                    }
                  },
                  x_axis_label: { type: "string" },
                  y_axis_label: { type: "string" },
                  caption: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Final update
      await ProcessedVideo.update(currentData.id, {
        processed_notes: notesResult.notes,
        note_chunks: notesResult.note_chunks || [],
        equations_found: notesResult.equations_found || [],
        diagrams: notesResult.diagrams || [],
        charts: notesResult.charts || [],
        processing_status: "completed"
      });

      setOverallProgress(100);
      
      setTimeout(() => {
        navigate(createPageUrl(`Results?id=${currentData.id}`));
      }, 1500);

    } catch (error) {
      console.error("Processing error:", error);
      setError("An issue occurred during processing. Please try again or contact support.");
      await ProcessedVideo.update(videoData.id, {
        processing_status: "error",
        error_message: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center">
          <Card className="border-[var(--error-red-main)]/30 shadow-[var(--shadow-medium)] bg-white rounded-3xl">
            <CardContent className="p-10">
              <AlertCircle className="w-16 h-16 text-[var(--error-red-main)] mx-auto mb-6" />
              <h2 className="text-3xl font-semibold text-[var(--foreground)] mb-2">Something went wrong</h2>
              <p className="text-[var(--text-muted)] mb-8">{error}</p>
              <Button 
                onClick={() => navigate(createPageUrl("Upload"))}
                className="bg-gradient-to-r from-[var(--focus-purple-main)] to-[var(--dopamine-blue-main)] hover:opacity-90 rounded-2xl text-xl h-14 px-10 shadow-lg font-medium"
              >
                Start Over
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center text-center">
          <Loader2 className="w-12 h-12 text-[var(--dopamine-blue-main)] animate-spin mb-6"/>
          <p className="text-xl text-[var(--text-muted)] font-medium">Getting your video ready...</p>
        </div>
      </div>
    );
  }
  
  const currentStageInfo = currentStage > 0 ? PROCESSING_STAGES[currentStage - 1] : { title: "Transcription", desc: "Turning audio into text" };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-semibold text-[var(--foreground)] mb-4 leading-tight">
            Magic in progress...
          </h1>
          <p className="text-xl text-[var(--text-muted)] line-clamp-1">
            {video?.title}
          </p>
        </motion.div>

        <Card className="border-[var(--border)] shadow-[var(--shadow-medium)] bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-10 space-y-10">
            <div>
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-xl font-semibold text-[var(--foreground)]">
                  Overall Progress
                </span>
                <span className="text-3xl font-bold text-[var(--focus-purple-main)]">
                  {overallProgress}%
                </span>
              </div>
              <Progress 
                value={overallProgress} 
                className="h-4 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-[var(--focus-purple-main)] [&>div]:to-[var(--dopamine-blue-main)] rounded-full" 
              />
            </div>

            <div className="bg-slate-50 p-8 rounded-3xl text-center border border-[var(--border)]">
               <AnimatePresence mode="wait">
                  <motion.div
                      key={currentStage}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                  >
                      <h3 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
                          Step {currentStage + 1}: {currentStageInfo.title}
                      </h3>
                      <p className="text-lg text-[var(--text-muted)]">{currentStageInfo.desc}</p>
                  </motion.div>
               </AnimatePresence>
            </div>

            <div className="grid grid-cols-7 gap-4">
              {Array(7).fill(0).map((_, index) => {
                const isCompleted = currentStage > index;
                return (
                  <motion.div
                    key={index}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1, type: "spring", stiffness: 300, damping: 20 }}
                    className={`h-4 rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-gradient-to-r from-[var(--focus-purple-main)] to-[var(--dopamine-blue-main)]' : 'bg-[var(--border)]'
                    }`}
                  >
                  {isCompleted && (
                      <motion.div 
                        initial={{scale:0}} 
                        animate={{scale:1}} 
                        transition={{delay:0.2}} 
                        className="flex items-center justify-center h-full"
                      >
                         <Sparkles className="w-3 h-3 text-white/80"/>
                      </motion.div>
                  )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {overallProgress === 100 && (
           <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-12"
           >
              <h3 className="text-3xl font-semibold text-[var(--foreground)] mb-2">All done! ✨</h3>
              <p className="text-lg text-[var(--text-muted)] mb-8">Your notes are ready for you.</p>
              <Button
                onClick={() => navigate(createPageUrl(`Results?id=${video.id}`))}
                className="bg-gradient-to-r from-[var(--focus-purple-main)] to-[var(--dopamine-blue-main)] hover:opacity-90 rounded-2xl text-xl h-14 px-10 shadow-lg font-medium"
              >
                Let's See Them
                <ArrowRight className="w-5 h-5 ml-3" />
              </Button>
           </motion.div>
        )}
      </div>
    </div>
  );
}