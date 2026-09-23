
import React, { useState, useEffect, useRef } from "react";
import { ProcessedVideo } from "@/entities/ProcessedVideo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Copy,
  CheckCircle2,
  FileText,
  Clock,
  Calculator,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Pin,
  Star,
  StarOff,
  Loader2,
  LayoutGrid,
  BarChart3,
  TrendingUp,
  Zap,
  Target,
  Brain,
  Key,
  AlertTriangle,
  Info,
  CheckSquare,
  Sparkles,
  Headphones,
  Eye,
  List // New import for analogy mapping
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import MermaidRenderer from "../components/learning/MermaidRenderer";
import QuestionGenerator from "../components/learning/QuestionGenerator";
import ModeSelector from "../components/learning/ModeSelector";
import DynamicQA from "../components/learning/tools/DynamicQA";
import FlashcardGenerator from "../components/learning/tools/FlashcardGenerator";
import AnalogicalAnalysis from "../components/learning/tools/AnalogicalAnalysis";
import ApplicationGenerator from "../components/learning/tools/ApplicationGenerator";
import CreationLab from '../components/learning/tools/CreationLab';
import MathRenderer from "../components/MathRenderer";
import { InvokeLLM } from "@/integrations/Core";

export default function ResultsPage() {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [highlightedLines, setHighlightedLines] = useState(new Set());
  const [isNewNotes, setIsNewNotes] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [transcriptCopied, setTranscriptCopied] = useState(false);

  // New state for focus mode
  const [viewMode, setViewMode] = useState('focus');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const notesContainerRef = useRef(null);

  // New state for section analogies
  const [sectionAnalogyCache, setSectionAnalogyCache] = useState({});

  const noteSections = video?.note_chunks || [];

  // Determine where to place the interactive components
  const validSlots = noteSections
    .map((section, index) => {
      const titleMatch = section.text.match(/^##\s*(.*)/m);
      const sectionTitle = titleMatch ? titleMatch[1] : null;
      const isSummarySection = sectionTitle && (sectionTitle.toLowerCase().includes('recap') || sectionTitle.toLowerCase().includes('summary'));
      return { index, isSummarySection };
    })
    .filter(slot => !slot.isSummarySection)
    .map(slot => slot.index);

  let questionGeneratorIndex = -1;

  if (validSlots.length > 0) {
    // Place the question generator in the last available non-summary slot for good separation
    questionGeneratorIndex = validSlots[validSlots.length - 1];
  }

  // Load ElevenLabs ConvAI widget script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';

    script.onload = () => {
      console.log('✅ ElevenLabs ConvAI widget loaded successfully');
      setWidgetLoaded(true);
    };

    script.onerror = (error) => {
      console.error('❌ Failed to load ElevenLabs Convai widget:', error);
    };

    // Check if script is already loaded
    const existingScript = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
    if (!existingScript) {
      document.head.appendChild(script);
    } else {
      setWidgetLoaded(true);
    }

    return () => {
      // Cleanup: Remove script on unmount if we added it
      if (!existingScript && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

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
      if (videoData.length > 0 && videoData[0].processing_status === "completed") {
        setVideo(videoData[0]);

        // Check if notes were recently created (within last 5 minutes)
        const createdTime = new Date(videoData[0].created_date);
        const now = new Date();
        const timeDiff = (now - createdTime) / (1000 * 60); // minutes
        setIsNewNotes(timeDiff < 5);

        if (timeDiff < 5) {
          // Remove "new" indicator after 8 seconds
          setTimeout(() => setIsNewNotes(false), 8000);
        }
      } else {
        setError("Video not found or not yet processed");
      }
    } catch (error) {
      console.error("Error loading video:", error);
      setError("Failed to load video");
    }
  };

  const handleCopyNotes = async () => {
    // Filter out chunks that are identified as summary or recap sections
    const notesToCopy = video?.note_chunks
      ?.filter(chunk => {
        // Extract the title from the chunk's text (assuming it starts with "## ")
        const titleMatch = chunk.text.match(/^##\s*(.*)/m);
        const sectionTitle = titleMatch ? titleMatch[1] : null;

        // If there's no title, or the title does not contain "recap" or "summary", include the chunk
        return !sectionTitle || (
          !sectionTitle.toLowerCase().includes('recap') &&
          !sectionTitle.toLowerCase().includes('summary')
        );
      })
      .map(chunk => chunk.text) // Get the text content of the filtered chunks
      .join('\n\n'); // Join them with double newlines

    // Use video.processed_notes as a fallback if note_chunks is empty or null after filtering
    const fullNotesText = notesToCopy || video?.processed_notes;

    if (fullNotesText) {
      try {
        await navigator.clipboard.writeText(fullNotesText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  const handleDownload = () => {
    // Join all note chunks' text for downloading
    const fullNotesText = video?.note_chunks?.map(chunk => chunk.text).join('\n\n') || video?.processed_notes;
    if (fullNotesText) {
      const blob = new Blob([fullNotesText], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${video.title.replace(/[^a-z0-9]/gi, '_')}_notes.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const toggleHighlight = (lineId) => {
    const newHighlights = new Set(highlightedLines);
    if (newHighlights.has(lineId)) {
      newHighlights.delete(lineId);
    } else {
      newHighlights.add(lineId);
    }
    setHighlightedLines(newHighlights);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToolSelect = (toolId) => {
    setActiveTool(toolId);
  };

  const renderActiveTool = () => {
    if (!activeTool) return null;

    switch (activeTool) {
      case 'creation_lab':
        return <CreationLab noteChunks={noteSections} />;
      case 'analogical_analysis':
        return <AnalogicalAnalysis noteChunks={noteSections} />;
      case 'application_generator':
        return <ApplicationGenerator noteChunks={noteSections} />;
      case 'dynamicqa':
        return <DynamicQA noteChunks={noteSections} />;
      case 'flashcards':
        return <FlashcardGenerator noteChunks={noteSections} />;
      default:
        return (
          <div className="text-center py-16">
            <p className="text-[var(--text-muted)] text-xl">
              Select a tool to get started.
            </p>
          </div>
        );
    }
  };

  const handleNextSection = () => {
    if (currentSectionIndex < noteSections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  };

  const handlePrevSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'focus' ? 'overview' : 'focus');
  };

  const handleCopyTranscript = async () => {
    if (video?.transcript) {
      try {
        await navigator.clipboard.writeText(video.transcript);
        setTranscriptCopied(true);
        setTimeout(() => setTranscriptCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy transcript:", error);
      }
    }
  };

  const handleGenerateSectionAnalogy = async (chunkId, sectionText) => {
    // Check if analogy is already loaded - toggle display
    if (sectionAnalogyCache[chunkId]?.status === 'loaded') {
      setSectionAnalogyCache(prev => ({
        ...prev,
        [chunkId]: {
          ...prev[chunkId],
          display: !prev[chunkId].display
        }
      }));
      return;
    }

    // Set loading state
    setSectionAnalogyCache(prev => ({
      ...prev,
      [chunkId]: { status: 'loading', display: true }
    }));

    try {
      const analogyResult = await InvokeLLM({
        prompt: `You are an expert educator specializing in creating mechanistic analogies that reveal the core causal logic of academic concepts.

Your goal is to analyze the following text chunk and create ONE concrete analogy that captures the underlying mechanism and cause-and-effect relationships.

Text to analyze:
---
${sectionText}
---

ANALYSIS REQUIREMENTS:
• Identify the Core Mechanism: What force, process, or principle actually drives this concept? Focus on cause-and-effect relationships.
• Find Mechanical Parallels: Choose concrete, relatable scenarios with the same underlying mechanics - physical systems, everyday situations, games, modern examples (like sneaker drops, see-saws, treadmills, social media, etc.)
• Test Predictive Power: Your analogy should help explain what happens when conditions change.

FORMAT REQUIREMENTS:
• Start with a relevant emoji
• Begin with "Analogy:"
• Use conversational, modern language
• Keep it concise (2-3 sentences max)
• Make explicit connections using "=" or clear linking phrases
• Use concrete, physical examples that show cause-and-effect

STYLE EXAMPLES:
• "🎯 Analogy: Imagine a see-saw with two kids. If one side is too heavy, the other kid moves closer to the middle until both sides balance. That balance point = equilibrium."
• "🛒 Analogy: Think of a popular new sneaker drop. If tons of people want it but there are only a few pairs, the resale price skyrockets. Supply and demand in action."
• "🏗️ Analogy: A factory's maximum output is like a treadmill's top speed. You can sprint faster for a few seconds, but in the long run you're capped by the treadmill's limit."

Return JSON with this exact schema:
{
  "analogy_text": "string (the complete analogy with emoji, starting with 'Analogy:', explaining the mechanism concisely)",
  "key_insight": "string (one sentence capturing the essential causal relationship this analogy reveals)"
}

Focus on modern, relatable examples that clearly show the mechanical cause-and-effect relationships driving the concept.`,
        response_json_schema: {
          type: "object",
          properties: {
            analogy_text: { type: "string" },
            key_insight: { type: "string" }
          },
          required: ["analogy_text", "key_insight"]
        }
      });

      // Update cache with loaded analogy
      setSectionAnalogyCache(prev => ({
        ...prev,
        [chunkId]: {
          status: 'loaded',
          data: analogyResult,
          display: true
        }
      }));

    } catch (error) {
      console.error("Error generating section analogy:", error);
      setSectionAnalogyCache(prev => ({
        ...prev,
        [chunkId]: {
          status: 'error',
          error: 'Could not generate analogy. Please try again.',
          display: true
        }
      }));
    }
  };

  const renderSingleSection = (section, index) => {
    const titleMatch = section.text.match(/^##\s*(.*)/m);
    const sectionTitle = titleMatch ? titleMatch[1] : null;
    const chunkId = section.chunk_id || `section-${index}`;
    const analogyState = sectionAnalogyCache[chunkId];

    return (
      <div key={chunkId} className="mb-16 last:mb-0">
        {section.tags && section.tags.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-8">
            {section.tags.map((tag, tagIndex) => {
              const tagColors = [
                'bg-[var(--soft-blue-light)] text-[var(--soft-blue-dark)] border-[var(--soft-blue)]/30',
                'bg-[var(--soft-green-light)] text-[var(--soft-green-dark)] border-[var(--soft-green)]/30',
                'bg-[var(--soft-purple-light)] text-[var(--soft-purple-dark)] border-[var(--soft-purple)]/30',
                'bg-[var(--soft-yellow-light)] text-[var(--soft-yellow-dark)] border-[var(--soft-yellow)]/30',
                'bg-[var(--soft-pink-light)] text-[var(--soft-pink-dark)] border-[var(--soft-pink)]/30'
              ];
              return (
                <Badge key={tag} className={`${tagColors[tagIndex % tagColors.length]} font-medium px-4 py-2 rounded-full border text-base`}>
                  {tag}
                </Badge>
              );
            })}
          </div>
        )}
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown
            components={{
              h2: ({ children }) => {
                const text = children?.toString() || '';

                // Enhanced Summary/Recap - Vibrant green with sparkle
                if (text.toLowerCase().includes('recap') || text.toLowerCase().includes('summary')) {
                  return (
                    <div className="my-20">
                      <div className="bg-gradient-to-br from-[var(--soft-green-light)] via-[var(--soft-blue-light)] to-[var(--soft-green-light)] rounded-3xl p-10 border-4 border-[var(--soft-green)]/50 shadow-[var(--shadow-medium)]">
                        <h2 className="text-3xl font-medium text-[var(--soft-green-dark)] flex items-center gap-5 m-0">
                          <span className="text-4xl animate-pulse">🎯</span>
                          <CheckSquare className="w-8 h-8 text-[var(--soft-green)]" />
                          {children}
                        </h2>
                        <p className="text-[var(--soft-green-dark)]/80 mt-5 text-xl font-medium">
                          🚀 Perfect! You've covered the essentials. Time to lock it in!
                        </p>
                      </div>
                    </div>
                  );
                }

                // Key Points - Soft blue with key icon
                if (text.toLowerCase().includes('key') || text.toLowerCase().includes('important')) {
                  return (
                    <div className="my-16">
                      <div className="bg-gradient-to-br from-[var(--soft-blue-light)] to-[var(--soft-purple-light)] rounded-3xl p-8 border-l-6 border-[var(--soft-blue)] shadow-[var(--shadow-soft)]">
                        <h2 className="text-2xl font-medium text-[var(--soft-blue-dark)] flex items-center gap-4 m-0">
                          <Key className="w-7 h-7 text-[var(--soft-blue)]" />
                          <span className="text-xl">🔑</span>
                          {children}
                        </h2>
                      </div>
                    </div>
                  );
                }

                // Definitions/Equations - Soft purple with brain icon
                if (text.toLowerCase().includes('definition') || text.toLowerCase().includes('concept') || text.toLowerCase().includes('equation') || text.toLowerCase().includes('formula')) {
                  return (
                    <div className="my-16">
                      <div className="bg-gradient-to-br from-[var(--soft-purple-light)] to-[var(--soft-pink-light)] rounded-3xl p-8 border-l-6 border-[var(--soft-purple)] shadow-[var(--shadow-soft)]">
                        <h2 className="text-2xl font-medium text-[var(--soft-purple-dark)] flex items-center gap-4 m-0">
                          <Brain className="w-7 h-7 text-[var(--soft-purple)]" />
                          <span className="text-xl">🧠</span>
                          {children}
                        </h2>
                      </div>
                    </div>
                  );
                }

                // Regular headers with subtle accent
                return (
                  <div className="my-16">
                    <h2 className="text-3xl font-medium text-[var(--text-main)] mb-8 leading-tight border-l-4 border-[var(--soft-pink)] pl-6 bg-gradient-to-r from-[var(--soft-pink-light)] to-transparent py-4 rounded-r-2xl">
                      {children}
                    </h2>
                  </div>
                );
              },

              h3: ({ children }) => (
                <h3 className="text-2xl font-medium text-[var(--text-main)] mt-12 mb-6 flex items-center gap-3">
                  <Target className="w-6 h-6 text-[var(--soft-pink)]" />
                  {children}
                </h3>
              ),

              p: ({ children }) => <p className="my-8 text-[var(--text-main)] leading-relaxed text-xl">{children}</p>,

              strong: ({ children }) => (
                <strong className="font-medium text-[var(--soft-blue-dark)] bg-[var(--soft-blue-light)] px-2 py-1 rounded-lg">
                  {children}
                </strong>
              ),

              ul: ({ children }) => <ul className="my-10 space-y-6">{children}</ul>,

              li: ({ children }) => {
                const lineId = `line-${Math.random().toString(36).substr(2, 9)}`;
                const isHighlighted = highlightedLines.has(lineId);

                return (
                  <li className="group flex items-start gap-5 hover:bg-gradient-to-r hover:from-[var(--accent)] hover:to-[var(--soft-blue-light)]/30 -mx-6 px-6 py-5 rounded-2xl transition-all duration-300 border border-transparent hover:border-[var(--soft-blue)]/20 hover:shadow-[var(--shadow-subtle)]">
                    <span className="w-4 h-4 bg-gradient-to-br from-[var(--soft-blue)] to-[var(--soft-purple)] rounded-full mt-3 flex-shrink-0 shadow-sm"></span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-lg leading-relaxed ${
                        isHighlighted
                          ? 'bg-gradient-to-r from-[var(--soft-yellow-light)] to-[var(--soft-pink-light)] px-6 py-4 rounded-2xl border-l-4 border-[var(--soft-pink)] shadow-[var(--shadow-subtle)]'
                          : ''
                      }`}>
                        {children}
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleHighlight(lineId)}
                      className="opacity-0 group-hover:opacity-100 p-3 rounded-full hover:bg-white hover:shadow-[var(--shadow-soft)] transition-all duration-300"
                      title={isHighlighted ? "Remove highlight" : "Highlight this"}
                    >
                      {isHighlighted ? (
                        <Star className="w-6 h-6 text-[var(--soft-pink)] fill-current" />
                      ) : (
                        <StarOff className="w-6 h-6 text-[var(--text-muted)] hover:text-[var(--soft-pink)]" />
                      )}
                    </motion.button>
                  </li>
                );
              },

              blockquote: ({ children }) => (
                <blockquote className="my-10 bg-gradient-to-r from-[var(--soft-blue-light)] to-[var(--soft-purple-light)] p-8 rounded-3xl border-l-4 border-[var(--soft-blue)] italic shadow-[var(--shadow-subtle)]">
                  <div className="flex items-start gap-4">
                    <Info className="w-6 h-6 text-[var(--soft-blue)] mt-1 flex-shrink-0" />
                    <div className="text-lg">{children}</div>
                  </div>
                </blockquote>
              ),

              code: ({ children }) => (
                <code className="bg-gradient-to-r from-[var(--soft-purple-light)] to-[var(--soft-pink-light)] px-4 py-2 rounded-xl text-base font-mono text-[var(--soft-purple-dark)] border border-[var(--soft-purple)]/30">
                  {children}
                </code>
              ),

              pre: ({ children }) => (
                <pre className="bg-gradient-to-br from-[var(--text-main)] to-gray-800 text-white p-8 rounded-3xl overflow-x-auto my-10 font-mono text-base leading-loose shadow-[var(--shadow-medium)] border-l-4 border-[var(--soft-pink)]">
                  {children}
                </pre>
              )
            }}
          >
            {section.text}
          </ReactMarkdown>
        </div>

        {/* Contextual Analogical Analysis Button (Focus Mode Only) */}
        {viewMode === 'focus' && (
          <div className="mt-8 space-y-4">
            <div className="flex justify-center">
              <Button
                onClick={() => handleGenerateSectionAnalogy(chunkId, section.text)}
                disabled={analogyState?.status === 'loading'}
                variant="outline"
                className="flex items-center gap-3 rounded-2xl border-2 border-[var(--soft-purple)]/30 hover:bg-[var(--soft-purple-light)] hover:border-[var(--soft-purple)] transition-all duration-300 py-3 px-6 text-base font-medium"
              >
                {analogyState?.status === 'loading' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--soft-purple)]" />
                ) : (
                  <Lightbulb className="w-5 h-5 text-[var(--soft-purple)]" />
                )}
                {analogyState?.status === 'loaded'
                  ? (analogyState?.display ? 'Hide Analogy' : 'Show Analogy')
                  : 'Generate Analogy'
                }
              </Button>
            </div>

            {/* Analogy Display */}
            <AnimatePresence>
              {analogyState?.display && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  {analogyState.status === 'loaded' && analogyState.data && (
                    <Card className="bg-gradient-to-br from-[var(--soft-purple-light)] to-[var(--soft-blue-light)] border-2 border-[var(--soft-purple)]/30 rounded-3xl shadow-[var(--shadow-soft)]">
                      <CardContent className="p-8 space-y-6">
                        <div className="text-[var(--soft-purple-dark)] text-lg leading-relaxed">
                          {analogyState.data.analogy_text}
                        </div>

                        <div className="bg-[var(--soft-yellow-light)] p-4 rounded-xl border-l-4 border-[var(--soft-yellow)]">
                          <div className="flex items-start gap-3">
                            <Target className="w-5 h-5 text-[var(--soft-yellow-dark)] mt-0.5 flex-shrink-0" />
                            <p className="font-medium text-[var(--soft-yellow-dark)] leading-relaxed">
                              <strong>Key Insight:</strong> {analogyState.data.key_insight}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {analogyState.status === 'error' && (
                    <Card className="bg-[var(--soft-pink-light)] border-2 border-[var(--soft-pink)]/30 rounded-2xl">
                      <CardContent className="p-6 text-center">
                        <AlertTriangle className="w-8 h-8 text-[var(--soft-pink)] mx-auto mb-3" />
                        <p className="text-[var(--soft-pink-dark)] font-medium">
                          {analogyState.error}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Add learning tools strategically */}
        {index === questionGeneratorIndex && (
          <div className="not-prose">
            <QuestionGenerator sectionContent={section.text} />
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className="max-w-lg mx-auto text-center">
        <Card className="border-[var(--soft-pink)]/40 shadow-[var(--shadow-soft)] bg-white rounded-3xl">
          <CardContent className="p-12">
            <FileText className="w-20 h-20 text-[var(--text-muted)] mx-auto mb-8" />
            <h2 className="text-2xl font-medium text-[var(--text-main)] mb-4">Notes Not Available</h2>
            <p className="text-[var(--text-muted)] mb-10 leading-relaxed text-lg">{error}</p>
            <Button
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="bg-[var(--soft-blue)] hover:bg-[var(--soft-blue-dark)] rounded-2xl py-4 px-8 text-lg font-medium"
            >
              Back to Library
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24">
        <Loader2 className="w-16 h-16 text-[var(--soft-blue)] animate-spin mb-8"/>
        <p className="text-xl text-[var(--text-muted)] font-medium">Loading your notes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Elegant Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-20"
      >
        <div className="flex items-start justify-between mb-10">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="hover:bg-[var(--accent)] rounded-2xl p-4 transition-all duration-300"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <div className="flex items-center gap-6 mb-4">
                <h1 className="text-5xl font-medium text-[var(--text-main)] leading-tight">
                  {video?.title}
                </h1>
                <AnimatePresence>
                  {isNewNotes && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="bg-gradient-to-r from-[var(--soft-green)] to-[var(--soft-blue)] text-white px-6 py-3 rounded-full text-lg font-medium shadow-[var(--shadow-soft)]"
                    >
                      ✨ Fresh Notes!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-10 text-[var(--text-muted)]">
                <span className="flex items-center gap-3 bg-[var(--accent)] px-5 py-2 rounded-full">
                  <Clock className="w-5 h-5" />
                  {formatDuration(video?.duration || 0)}
                </span>
                {video?.equations_found?.length > 0 && (
                  <span className="flex items-center gap-3 bg-[var(--soft-purple-light)] px-5 py-2 rounded-full text-[var(--soft-purple-dark)]">
                    <Calculator className="w-5 h-5" />
                    {video.equations_found.length} equation{video.equations_found.length > 1 ? 's' : ''}
                  </span>
                )}
                {video?.diagrams?.length > 0 && (
                  <span className="flex items-center gap-3 bg-[var(--soft-blue-light)] px-5 py-2 rounded-full text-[var(--soft-blue-dark)]">
                    <LayoutGrid className="w-5 h-5" />
                    {video.diagrams.length} diagram{video.diagrams.length > 1 ? 's' : ''}
                  </span>
                )}
                {video?.charts?.length > 0 && (
                  <span className="flex items-center gap-3 bg-[var(--soft-green-light)] px-5 py-2 rounded-full text-[var(--soft-green-dark)]">
                    <BarChart3 className="w-5 h-5" />
                    {video.charts.length} chart{video.charts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-3">
            {/* View Mode Toggle */}
            <Button
              variant="outline"
              onClick={toggleViewMode}
              className="flex items-center gap-3 rounded-2xl border-[var(--border)] hover:bg-[var(--accent)] hover:border-[var(--soft-blue)] transition-all duration-300 py-3 px-6"
            >
              {viewMode === 'focus' ? (
                <>
                  <List className="w-5 h-5" />
                  Overview
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  Focus Mode
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleCopyNotes}
              className="flex items-center gap-3 rounded-2xl border-[var(--border)] hover:bg-[var(--accent)] hover:border-[var(--soft-blue)] transition-all duration-300 py-3 px-6"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-[var(--soft-green)]" />
                  <span className="text-[var(--soft-green-dark)] font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy
                </>
              )}
            </Button>
            <Button
              onClick={handleDownload}
              className="bg-[var(--soft-blue)] hover:bg-[var(--soft-blue-dark)] text-white flex items-center gap-3 rounded-2xl transition-all duration-300 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] hover:scale-[1.02] py-3 px-6"
            >
              <Download className="w-5 h-5" />
              Download
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Visual Diagrams Section */}
      {video?.diagrams && video.diagrams.length > 0 && (
        <div className="mb-20 space-y-16">
          {video.diagrams.map((diagram, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="bg-white rounded-3xl shadow-[var(--shadow-soft)] border-2 border-[var(--soft-blue)]/20 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[var(--soft-blue-light)] to-[var(--soft-purple-light)] px-10 py-8 border-b border-[var(--border)]">
                <h3 className="text-2xl font-medium text-[var(--soft-blue-dark)] flex items-center gap-4">
                  <LayoutGrid className="w-7 h-7" />
                  {diagram.title}
                </h3>
              </div>
              <div className="p-10">
                <MermaidRenderer code={diagram.code} />

                <div className="bg-gradient-to-br from-[var(--soft-purple-light)] to-[var(--soft-blue-light)] border-2 border-[var(--soft-purple)]/30 text-[var(--soft-purple-dark)] p-8 rounded-3xl mt-8">
                  <div className="flex items-start gap-4">
                    <Pin className="w-6 h-6 text-[var(--soft-purple)] mt-1 flex-shrink-0" />
                    <p className="font-medium leading-relaxed text-lg">
                      <strong className="text-[var(--soft-purple-dark)]">Key Insight:</strong> {diagram.recap}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Data Charts Section */}
      {video?.charts && video.charts.length > 0 && (
        <div className="mb-20 space-y-16">
          {video.charts.map((chart, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-white rounded-3xl shadow-[var(--shadow-soft)] border-2 border-[var(--soft-green)]/20 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[var(--soft-green-light)] to-[var(--soft-blue-light)] px-10 py-8 border-b border-[var(--border)]">
                <h3 className="text-2xl font-medium text-[var(--soft-green-dark)] flex items-center gap-4">
                  {chart.type === 'bar' ? (
                    <BarChart3 className="w-7 h-7" />
                  ) : (
                    <TrendingUp className="w-7 h-7" />
                  )}
                  {chart.title}
                </h3>
              </div>
              <div className="p-10">
                <div className="h-80 w-full mb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart.type === 'bar' ? (
                      <BarChart data={chart.data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 14, fill: 'var(--text-muted)' }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fontSize: 14, fill: 'var(--text-muted)' }} />
                        <Bar
                          dataKey="value"
                          fill="var(--soft-blue)"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    ) : (
                      <LineChart data={chart.data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 14, fill: 'var(--text-muted)' }}
                        />
                        <YAxis tick={{ fontSize: 14, fill: 'var(--text-muted)' }} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="var(--soft-green)"
                          strokeWidth={3}
                          dot={{ fill: 'var(--soft-green)', strokeWidth: 2, r: 6 }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
                <div className="bg-gradient-to-br from-[var(--soft-pink-light)] to-[var(--soft-yellow-light)] border-2 border-[var(--soft-pink)]/30 text-[var(--soft-pink-dark)] p-8 rounded-3xl">
                  <div className="flex items-start gap-4">
                    <Lightbulb className="w-6 h-6 text-[var(--soft-pink)] mt-1 flex-shrink-0" />
                    <p className="leading-relaxed font-medium text-lg">{chart.caption}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Main Notes Content */}
      <motion.div
        ref={notesContainerRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl shadow-[var(--shadow-soft)] border border-[var(--border)] overflow-hidden mb-20"
      >
        <div className="p-12 md:p-16">
          {/* Focus Mode Section Indicator */}
          {viewMode === 'focus' && noteSections.length > 0 && (
            <div className="mb-12 p-6 bg-gradient-to-r from-[var(--soft-blue-light)] to-[var(--soft-purple-light)] rounded-2xl border border-[var(--soft-blue)]/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Eye className="w-6 h-6 text-[var(--soft-blue-dark)]" />
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--soft-blue-dark)]">Focus Mode</h3>
                    <p className="text-[var(--soft-blue-dark)]/70">Section {currentSectionIndex + 1} of {noteSections.length}</p>
                  </div>
                </div>
                <div className="text-[var(--soft-blue-dark)]/70 text-lg font-medium">
                  {Math.round(((currentSectionIndex + 1) / noteSections.length) * 100)}% Complete
                </div>
              </div>
            </div>
          )}

          {/* Render Notes Based on View Mode */}
          {noteSections.length > 0 ? (
            viewMode === 'overview' ? (
              // Overview Mode - Show all sections
              noteSections.map((section, index) => {
                return (
                  <div key={section.chunk_id || index}>
                    {renderSingleSection(section, index)}
                    {index < noteSections.length - 1 && (
                      <div className="my-16 flex items-center">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"></div>
                        <div className="px-6">
                          <div className="w-4 h-4 bg-gradient-to-br from-[var(--soft-blue)] to-[var(--soft-purple)] rounded-full shadow-sm"></div>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"></div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              // Focus Mode - Show only current section
              <>
                {renderSingleSection(noteSections[currentSectionIndex], currentSectionIndex)}

                {/* Navigation Controls for Focus Mode */}
                <div className="mt-16 pt-8 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between">
                    <Button
                      onClick={handlePrevSection}
                      disabled={currentSectionIndex === 0}
                      variant="outline"
                      className="flex items-center gap-3 rounded-2xl border-[var(--border)] hover:bg-[var(--accent)] hover:border-[var(--soft-blue)] transition-all duration-300 py-4 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Previous Section
                    </Button>

                    <div className="flex items-center gap-4 text-[var(--text-muted)]">
                      <div className="flex gap-2">
                        {noteSections.map((_, index) => (
                          <div
                            key={index}
                            className={`w-3 h-3 rounded-full transition-all duration-300 ${
                              index === currentSectionIndex
                                ? 'bg-[var(--soft-blue)] scale-125'
                                : index < currentSectionIndex
                                ? 'bg-[var(--soft-green)]'
                                : 'bg-[var(--border)]'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleNextSection}
                      disabled={currentSectionIndex === noteSections.length - 1}
                      className="flex items-center gap-3 bg-[var(--soft-blue)] hover:bg-[var(--soft-blue-dark)] text-white rounded-2xl transition-all duration-300 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] py-4 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next Section
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </>
            )
          ) : (
            <div className="prose prose-lg max-w-none">
              <ReactMarkdown>{video?.processed_notes}</ReactMarkdown>
            </div>
          )}
        </div>
      </motion.div>

      {/* Further Understanding Section - Only show in overview mode OR when all sections are complete in focus mode */}
      {(viewMode === 'overview' || (viewMode === 'focus' && currentSectionIndex === noteSections.length - 1 && noteSections.length > 0)) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-3xl shadow-[var(--shadow-soft)] border-2 border-[var(--soft-purple)]/20 overflow-hidden mb-20"
        >
          <div className="bg-gradient-to-br from-[var(--soft-purple-light)] via-[var(--soft-blue-light)] to-[var(--soft-pink-light)] p-10 text-center border-b-2 border-[var(--soft-purple)]/20">
            <h2 className="text-4xl font-medium text-[var(--soft-purple-dark)] mb-4 flex items-center justify-center gap-5">
              <Zap className="w-9 h-9 text-[var(--soft-pink)]" />
              ✨ Further Understanding
              <Sparkles className="w-9 h-9 text-[var(--soft-blue)]" />
            </h2>
            <p className="text-[var(--soft-purple-dark)]/80 text-xl font-medium">
              🎮 Ready to level up? Choose your learning adventure!
            </p>
            {viewMode === 'focus' && (
              <div className="mt-4 p-4 bg-white/50 rounded-2xl border border-[var(--soft-green)]/30">
                <p className="text-[var(--soft-green-dark)] font-semibold text-lg">
                  🎉 Great job! You've completed all sections. Time to dive deeper!
                </p>
              </div>
            )}
          </div>

          <div className="p-10 md:p-16">
            {/* Enhanced Podcast Instruction with Copy Transcript Button */}
            <div className="bg-gradient-to-r from-[var(--soft-blue-light)] to-[var(--soft-purple-light)] rounded-3xl p-8 mb-10 border-2 border-[var(--soft-blue)]/20 shadow-[var(--shadow-subtle)]">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 flex-shrink-0 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Headphones className="w-8 h-8 text-[var(--soft-blue)]" />
                  </div>
                  <div>
                    <p className="text-[var(--soft-blue-dark)] font-medium text-xl">
                      🎧 For a fun podcast, copy the transcript and paste into widget below
                    </p>
                    <p className="text-[var(--soft-blue-dark)]/70 text-lg font-normal mt-2">
                      Our AI agent creates ADHD-optimized audio from your content!
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleCopyTranscript}
                  className="flex items-center gap-3 bg-white/80 hover:bg-white text-[var(--soft-blue-dark)] border border-[var(--soft-blue)]/30 hover:border-[var(--soft-blue)] rounded-2xl py-3 px-6 font-medium shadow-sm transition-all duration-300"
                >
                  {transcriptCopied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-[var(--soft-green)]" />
                      <span className="text-[var(--soft-green-dark)]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy Transcript
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Podcast widget and loading state */}
            <div className="mt-6">
              {widgetLoaded ? (
                <div className="w-full">
                  <elevenlabs-convai agent-id="agent_5501k3vzpkdye1gv24y8zj3x9t5j"></elevenlabs-convai>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Loader2 className="w-10 h-10 text-[var(--text-muted)] animate-spin mx-auto mb-4"/>
                  <p className="text-[var(--text-muted)] font-medium text-lg">Loading podcast widget...</p>
                </div>
              )}
            </div>

            {activeTool ? (
              <div className="space-y-8">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveTool(null);
                  }}
                  className="rounded-2xl border-2 border-[var(--soft-blue)]/30 hover:bg-[var(--soft-blue-light)] hover:border-[var(--soft-blue)] py-3 px-6"
                >
                  ← Back to Learning Tools
                </Button>
                {renderActiveTool()}
              </div>
            ) : (
              <div className="space-y-10">
                <ModeSelector
                  onToolSelect={handleToolSelect}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Equations Reference */}
      {video?.equations_found && video.equations_found.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl shadow-[var(--shadow-soft)] border-2 border-[var(--soft-purple)]/20 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-[var(--soft-purple-light)] to-[var(--soft-pink-light)] px-10 py-8 border-b border-[var(--border)]">
            <h3 className="text-2xl font-medium text-[var(--soft-purple-dark)] flex items-center gap-4">
              <Calculator className="w-7 h-7" />
              📐 Equations Reference
            </h3>
          </div>
          <div className="p-10 space-y-10">
            {video.equations_found.map((eq, index) => (
              <div key={index} className="bg-gradient-to-br from-[var(--soft-purple-light)] to-[var(--soft-pink-light)] rounded-3xl p-10 border-2 border-[var(--soft-purple)]/30">
                <div className="text-center mb-8">
                  <div className="inline-block bg-white px-10 py-8 rounded-2xl border-2 border-[var(--soft-purple)]/30 shadow-[var(--shadow-soft)]">
                    <MathRenderer
                      equation={eq.equation}
                      className="text-3xl font-serif text-[var(--soft-purple-dark)]"
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <span className="font-medium text-[var(--soft-purple-dark)] block mb-3 flex items-center gap-3 text-lg">
                      <Target className="w-5 h-5" />
                      Purpose:
                    </span>
                    <p className="text-[var(--soft-purple-dark)] leading-relaxed text-lg">{eq.purpose}</p>
                  </div>

                  {eq.variables && eq.variables.length > 0 && (
                    <div>
                      <span className="font-medium text-[var(--soft-purple-dark)] block mb-5 flex items-center gap-3 text-lg">
                        <Brain className="w-5 h-5" />
                        Variables:
                      </span>
                      <div className="space-y-4">
                        {eq.variables.map((v, i) => (
                          <div key={i} className="flex items-start gap-5 bg-white/80 p-6 rounded-2xl border border-[var(--soft-purple)]/20 shadow-[var(--shadow-subtle)]">
                            <div className="w-14 h-14 flex-shrink-0 bg-[var(--soft-purple-light)] rounded-2xl flex items-center justify-center border border-[var(--soft-purple)]/30">
                              <MathRenderer
                                equation={v.value}
                                className="text-xl font-serif font-medium text-[var(--soft-purple)]"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[var(--soft-purple-dark)] leading-relaxed text-lg">
                                {v.description}
                                {v.unit && (
                                  <span className="text-[var(--soft-purple-dark)]/70 font-medium ml-3 bg-[var(--soft-pink-light)] px-3 py-1 rounded-lg text-base">
                                    ({v.unit})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
