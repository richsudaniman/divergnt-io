import React, { useState } from 'react';
import { InvokeLLM } from '@/integrations/Core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  CheckCircle2,
  Sparkles,
  Loader2,
  Eye,
  EyeOff,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NoteStructurer = ({ rawContent, selectedFormat = 'structured', onStructuredNotesReady }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [structuredNotes, setStructuredNotes] = useState(null);
  const [showOriginalChaos, setShowOriginalChaos] = useState(false);
  const [processingStage, setProcessingStage] = useState('');

  const structureNotes = async () => {
    if (!rawContent?.trim()) {
      alert('Please add some content to your brain dump first!');
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setProcessingStage('Analyzing your chaotic thoughts...');

    try {
      if (selectedFormat === 'cornell') {
        await generateCornellNotes();
      } else {
        await generateStructuredNotes();
      }
    } catch (error) {
      console.error('Error structuring notes:', error);
      alert('Something went wrong while structuring your notes. Please try again!');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateCornellNotes = async () => {
    setProgress(30);
    setProcessingStage('Creating Cornell-style notes with exam questions...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const cornellResult = await InvokeLLM({
      prompt: `Transform this chaotic brain dump into Cornell Notes format. Focus heavily on creating EXAM QUESTIONS.

      ORIGINAL CONTENT: "${rawContent}"

      Create Cornell Notes with these sections:
      1. CUE COLUMN (Left): Extract key exam questions, keywords, and cues from the content
      2. NOTE COLUMN (Right): Organized main content with answers to the questions
      3. SUMMARY (Bottom): Concise summary of key points

      IMPORTANT INSTRUCTIONS:
      - Do NOT use markdown formatting (**bold**, *italic*, # headers)
      - Write in plain text only
      - Focus on generating potential EXAM QUESTIONS in the cue column
      - Match questions with their answers in the note column through clear organization
      - Add relevant icons naturally (use text descriptions like "💡", "⚡", "🎯", "📝", "🔍")
      - Make it engaging for ADHD learners with good visual breaks

      Return structured data for Cornell format.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          cue_column: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["question", "keyword", "concept"] },
                content: { type: "string" },
                icon: { type: "string" },
                linked_note_index: { type: "number" }
              }
            }
          },
          note_column: {
            type: "array",
            items: {
              type: "object",
              properties: {
                content: { type: "string" },
                type: { type: "string", enum: ["answer", "explanation", "example", "definition"] },
                icon: { type: "string" },
                emphasis: { type: "string", enum: ["normal", "highlight", "important"] }
              }
            }
          },
          summary: { type: "string" },
          key_insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                insight: { type: "string" },
                icon: { type: "string" }
              }
            }
          }
        }
      }
    });

    setProgress(100);
    setProcessingStage('Cornell notes ready! 📚');
    
    const finalStructure = {
      ...cornellResult,
      format: 'cornell',
      originalContent: rawContent,
      createdAt: new Date().toISOString()
    };

    setStructuredNotes(finalStructure);
    if (onStructuredNotesReady) {
      onStructuredNotesReady(finalStructure);
    }
  };

  const generateStructuredNotes = async () => {
    // Stage 1: Extract core concepts and chaos elements
    setProgress(25);
    setProcessingStage('Identifying key concepts and confusing moments...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    const conceptAnalysis = await InvokeLLM({
      prompt: `Analyze this chaotic brain dump and extract:

      RAW CONTENT: "${rawContent}"

      Extract:
      1. Main topics/concepts (even if poorly explained)
      2. Confused moments or questions the user expressed
      3. Metaphors or analogies the user created
      4. Incomplete thoughts that need clarification
      5. User's own language and phrases (preserve their voice)
      6. Any formulas, processes, or step-by-step thinking
      
      Focus on preserving the user's personality and thought patterns while identifying structure.`,
      response_json_schema: {
        type: "object",
        properties: {
          main_concepts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                user_description: { type: "string" },
                confusion_level: { type: "string", enum: ["clear", "somewhat_confused", "very_confused"] }
              }
            }
          },
          user_metaphors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                original_phrase: { type: "string" },
                concept: { type: "string" },
                effectiveness: { type: "string", enum: ["helpful", "needs_expansion", "misleading"] }
              }
            }
          },
          confusion_moments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                user_question: { type: "string" },
                topic: { type: "string" },
                type: { type: "string", enum: ["terminology", "process", "comparison", "application"] }
              }
            }
          },
          incomplete_thoughts: { type: "array", items: { type: "string" } },
          user_language_style: { type: "string" }
        }
      }
    });

    // Stage 2: Create structured handwritten-style content
    setProgress(50);
    setProcessingStage('Creating beautiful handwritten-style notes...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const structuringResult = await InvokeLLM({
      prompt: `Transform this chaotic brain dump into beautiful, handwritten-style notes that preserve the user's voice and resolve confusion.

      ORIGINAL CONTENT: "${rawContent}"
      ANALYSIS: ${JSON.stringify(conceptAnalysis)}

      Create structured content with:
      1. User's original chaotic phrases in special "chaos bubbles"
      2. Clear concept explanations that resolve confusion
      3. Visual hierarchy with headers, subheaders, and emphasis
      4. Preserve user's metaphors and analogies
      5. Add clarifying notes and insights
      6. Include contextual icons naturally (use text like "💡", "⚡", "🎯", "📝", "🔍", "✨")

      IMPORTANT: Do NOT use any markdown formatting like **bold** or *italics* or # headers. 
      Write in plain text only. The visual formatting will be handled by the card types and styling.
      Use simple, clean text without any special characters for formatting.

      Return structured sections that can be rendered beautifully.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["header", "concept", "chaos_bubble", "clarification", "metaphor", "action_item"] },
                content: { type: "string" },
                icon: { type: "string" },
                emphasis: { type: "string", enum: ["normal", "highlight", "underline", "important"] }
              }
            }
          },
          key_insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["concept", "confusion_resolved", "metaphor", "action"] },
                original_phrase: { type: "string" },
                clarity_added: { type: "string" },
                icon: { type: "string" }
              }
            }
          },
          personality_preserved: {
            type: "object",
            properties: {
              original_phrases: { type: "array", items: { type: "string" } },
              metaphors_used: { type: "array", items: { type: "string" } },
              confusion_resolved_count: { type: "number" }
            }
          }
        }
      }
    });

    setProgress(100);
    setProcessingStage('Notes ready! ✨');
    
    const finalStructure = {
      ...structuringResult,
      format: 'structured',
      originalContent: rawContent,
      createdAt: new Date().toISOString()
    };

    setStructuredNotes(finalStructure);
    if (onStructuredNotesReady) {
      onStructuredNotesReady(finalStructure);
    }
  };

  // Clean content function to remove any remaining markdown
  const cleanContent = (content) => {
    if (!content) return '';
    return content
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
      .replace(/\*(.*?)\*/g, '$1')      // Remove *italic*
      .replace(/#{1,6}\s/g, '')         // Remove # headers
      .replace(/`(.*?)`/g, '$1')        // Remove `code`
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove [links](url)
      .trim();
  };

  const renderCornellNotes = () => {
    if (!structuredNotes || structuredNotes.format !== 'cornell') return null;

    return (
      <div className="space-y-6">
        {/* Cornell Notes Container */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardContent className="p-0">
            <div 
              className="cornell-notes-container bg-white relative min-h-[600px]"
              style={{
                fontFamily: "'Caveat', cursive",
                background: `
                  linear-gradient(to right, #e5e7eb 200px, transparent 200px),
                  linear-gradient(to bottom, transparent calc(100% - 150px), #e5e7eb calc(100% - 150px)),
                  radial-gradient(circle at 20% 80%, rgba(0,0,0,0.02) 1px, transparent 1px),
                  #fefefe
                `,
                backgroundSize: '100% 100%, 100% 100%, 30px 30px'
              }}
            >
              {/* Header */}
              <div className="p-6 border-b-2 border-gray-300">
                <h2 className="text-3xl font-bold text-center text-gray-800" 
                    style={{ fontFamily: "'Amatic SC', cursive" }}>
                  📚 {structuredNotes.title}
                </h2>
              </div>

              <div className="flex min-h-[450px]">
                {/* Cue Column (Left) */}
                <div className="w-[200px] p-4 border-r-2 border-gray-300 bg-blue-50/30">
                  <h3 className="text-lg font-bold text-blue-800 mb-4 text-center"
                      style={{ fontFamily: "'Amatic SC', cursive" }}>
                    Questions & Cues
                  </h3>
                  <div className="space-y-4">
                    {structuredNotes.cue_column?.map((cue, index) => (
                      <div key={index} className={`p-3 rounded-lg ${
                        cue.type === 'question' ? 'bg-yellow-100 border-l-4 border-yellow-500' :
                        cue.type === 'keyword' ? 'bg-green-100 border-l-4 border-green-500' :
                        'bg-purple-100 border-l-4 border-purple-500'
                      }`}>
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{cue.icon || '❓'}</span>
                          <div className="flex-1">
                            <div className={`text-sm font-bold mb-1 ${
                              cue.type === 'question' ? 'text-yellow-800' :
                              cue.type === 'keyword' ? 'text-green-800' :
                              'text-purple-800'
                            }`}>
                              {cue.type.toUpperCase()}
                            </div>
                            <div className="text-gray-800 leading-relaxed" style={{ fontSize: '1rem' }}>
                              {cleanContent(cue.content)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Note Column (Right) */}
                <div className="flex-1 p-6">
                  <h3 className="text-lg font-bold text-gray-700 mb-4 text-center"
                      style={{ fontFamily: "'Amatic SC', cursive" }}>
                    Notes & Answers
                  </h3>
                  <div className="space-y-4">
                    {structuredNotes.note_column?.map((note, index) => (
                      <div key={index} className={`p-4 rounded-lg ${
                        note.type === 'answer' ? 'bg-green-50 border-l-4 border-green-400' :
                        note.type === 'explanation' ? 'bg-blue-50 border-l-4 border-blue-400' :
                        note.type === 'example' ? 'bg-purple-50 border-l-4 border-purple-400' :
                        'bg-gray-50 border-l-4 border-gray-400'
                      }`}>
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{note.icon || '📝'}</span>
                          <div className="flex-1">
                            <div className={`text-sm font-bold mb-2 ${
                              note.type === 'answer' ? 'text-green-800' :
                              note.type === 'explanation' ? 'text-blue-800' :
                              note.type === 'example' ? 'text-purple-800' :
                              'text-gray-800'
                            }`}>
                              {note.type.toUpperCase()}
                            </div>
                            <div className={`leading-relaxed ${
                              note.emphasis === 'highlight' ? 'bg-yellow-200 p-2 rounded' :
                              note.emphasis === 'important' ? 'font-bold text-red-700' : ''
                            }`} style={{ fontSize: '1.1rem' }}>
                              {cleanContent(note.content)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary Section (Bottom) */}
              <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-t-2 border-gray-300">
                <h3 className="text-xl font-bold text-center text-orange-800 mb-4"
                    style={{ fontFamily: "'Amatic SC', cursive" }}>
                  ✨ Summary
                </h3>
                <div className="text-lg leading-relaxed text-gray-800 text-center max-w-4xl mx-auto">
                  {cleanContent(structuredNotes.summary)}
                </div>
                
                {/* Key Insights */}
                {structuredNotes.key_insights && structuredNotes.key_insights.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-lg font-bold text-orange-700 mb-3 text-center">
                      Key Takeaways:
                    </h4>
                    <div className="flex flex-wrap justify-center gap-3">
                      {structuredNotes.key_insights.map((insight, index) => (
                        <div key={index} className="bg-white p-3 rounded-xl shadow-sm border border-orange-200">
                          <span className="text-lg mr-2">{insight.icon || '💡'}</span>
                          <span className="text-gray-800 font-medium">{cleanContent(insight.insight)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderStructuredNotes = () => {
    if (!structuredNotes || structuredNotes.format !== 'structured') return null;

    const renderSection = (section, index) => {
      const baseClasses = "mb-4 transition-all duration-200";
      const cleanedContent = cleanContent(section.content);
      
      switch (section.type) {
        case 'header':
          return (
            <div key={index} className={`${baseClasses} text-center mb-8`}>
              <h2 className="handwritten-title text-4xl font-bold text-gray-800 mb-2" 
                  style={{ fontFamily: "'Amatic SC', cursive" }}>
                {section.icon && <span className="mr-3">{section.icon}</span>}
                {cleanedContent}
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-blue-400 mx-auto rounded-full"></div>
            </div>
          );
          
        case 'concept':
          return (
            <div key={index} className={`${baseClasses} concept-card bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border-l-4 border-blue-400 shadow-sm`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{section.icon || '💡'}</span>
                </div>
                <div className="flex-1">
                  <div className={`text-lg leading-relaxed ${
                    section.emphasis === 'highlight' ? 'handwritten-highlight' : ''
                  } ${section.emphasis === 'underline' ? 'sketchy-underline' : ''}`}
                       style={{ fontFamily: "'Caveat', cursive" }}>
                    {cleanedContent}
                  </div>
                </div>
              </div>
            </div>
          );
          
        case 'chaos_bubble':
          return (
            <div key={index} className={`${baseClasses} chaos-bubble relative`}>
              <div className="bg-pink-50 border-2 border-dashed border-pink-300 rounded-3xl p-6 transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                <div className="absolute -top-3 -left-2 text-2xl">💭</div>
                <p className="text-pink-700 font-medium text-lg leading-relaxed italic" 
                   style={{ fontFamily: "'Indie Flower', cursive" }}>
                  "{cleanedContent}"
                </p>
                <div className="absolute -bottom-2 -right-2 text-sm text-pink-500 font-bold">
                  Your original chaos
                </div>
              </div>
            </div>
          );
          
        case 'clarification':
          return (
            <div key={index} className={`${baseClasses} clarification-card bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border-l-4 border-green-400`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{section.icon || '✨'}</span>
                </div>
                <div className="flex-1">
                  <div className="text-green-800 font-medium mb-2 text-sm">Clarity Added:</div>
                  <div className="text-lg leading-relaxed" style={{ fontFamily: "'Caveat', cursive" }}>
                    {cleanedContent}
                  </div>
                </div>
              </div>
            </div>
          );
          
        case 'metaphor':
          return (
            <div key={index} className={`${baseClasses} metaphor-card bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-2xl border-l-4 border-purple-400`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{section.icon || '🎭'}</span>
                </div>
                <div className="flex-1">
                  <div className="text-purple-800 font-medium mb-2 text-sm">Your Metaphor Enhanced:</div>
                  <div className="text-lg leading-relaxed" style={{ fontFamily: "'Caveat', cursive" }}>
                    {cleanedContent}
                  </div>
                </div>
              </div>
            </div>
          );
          
        case 'action_item':
          return (
            <div key={index} className={`${baseClasses} action-card bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-2xl border-l-4 border-orange-400`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{section.icon || '🎯'}</span>
                </div>
                <div className="flex-1">
                  <div className="text-orange-800 font-medium mb-2 text-sm">Action Item:</div>
                  <div className="text-lg leading-relaxed" style={{ fontFamily: "'Caveat', cursive" }}>
                    {cleanedContent}
                  </div>
                </div>
              </div>
            </div>
          );
          
        default:
          return (
            <div key={index} className={`${baseClasses} text-lg leading-relaxed`} 
                 style={{ fontFamily: "'Caveat', cursive" }}>
              {section.icon && <span className="mr-2 text-xl">{section.icon}</span>}
              {cleanedContent}
            </div>
          );
      }
    };

    return (
      <div className="space-y-6">
        {/* Beautiful Handwritten Notes */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardContent className="p-0">
            <div 
              className="handwritten-notes-container bg-white relative min-h-[600px] p-8"
              style={{
                fontFamily: "'Caveat', cursive",
                background: `
                  radial-gradient(circle at 20% 80%, rgba(0,0,0,0.02) 1px, transparent 1px),
                  radial-gradient(circle at 80% 20%, rgba(0,0,0,0.02) 1px, transparent 1px),
                  radial-gradient(circle at 40% 40%, rgba(0,0,0,0.01) 1px, transparent 1px),
                  #fefefe
                `,
                backgroundSize: '30px 30px, 25px 25px, 40px 40px, 100%'
              }}
            >
              {/* Notes Content */}
              <div className="space-y-6">
                {structuredNotes.sections?.map((section, index) => renderSection(section, index))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {structuredNotes.personality_preserved && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Chaos Successfully Transformed! 🎯
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-800">
                    {structuredNotes.personality_preserved.original_phrases?.length || 0}
                  </div>
                  <div className="text-green-600 text-sm">Original phrases preserved</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-800">
                    {structuredNotes.personality_preserved.metaphors_used?.length || 0}
                  </div>
                  <div className="text-blue-600 text-sm">Your metaphors enhanced</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-800">
                    {structuredNotes.personality_preserved.confusion_resolved_count || 0}
                  </div>
                  <div className="text-purple-600 text-sm">Confusions resolved</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Processing Trigger */}
      {!isProcessing && !structuredNotes && (
        <Card className="border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-8 text-center">
            {selectedFormat === 'cornell' ? (
              <>
                <BookOpen className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-blue-900 mb-2">
                  Transform → Cornell Notes with Exam Questions
                </h3>
                <p className="text-blue-700 mb-6 max-w-md mx-auto">
                  Turn your messy thoughts into organized Cornell-style notes with exam questions, answers, and a summary.
                </p>
              </>
            ) : (
              <>
                <Sparkles className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-purple-900 mb-2">
                  Transform Chaos → Beautiful Handwritten Notes
                </h3>
                <p className="text-purple-700 mb-6 max-w-md mx-auto">
                  Turn your messy brain dump into gorgeous, handwritten-style notes that preserve your personality and resolve your confusion.
                </p>
              </>
            )}
            
            <Button 
              onClick={structureNotes}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-bold"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {selectedFormat === 'cornell' ? 'Create Cornell Notes' : 'Make Beautiful Handwritten Notes'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Processing Animation */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 relative">
                    <Loader2 className="w-16 h-16 text-purple-600 animate-spin" />
                    <Brain className="w-8 h-8 text-purple-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <h3 className="text-xl font-bold text-purple-900 mb-2">
                    {selectedFormat === 'cornell' ? 'Creating your Cornell notes with exam questions...' : 'Transforming your chaos into handwritten beauty...'}
                  </h3>
                  <p className="text-purple-700 mb-4">{processingStage}</p>
                </div>
                <Progress 
                  value={progress} 
                  className="h-3 mb-4 bg-purple-100 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-pink-500 rounded-full" 
                />
                <p className="text-purple-600 text-sm">
                  {selectedFormat === 'cornell' ? 'Organizing questions, answers, and summary...' : 'Adding sketchy lines, handwritten fonts, and notebook feel... ✏️'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Structured Notes Result */}
      {structuredNotes && (
        <div className="space-y-6">
          {/* Header with Controls */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
              <div className="flex justify-between items-center">
                <CardTitle className="text-purple-900 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    {selectedFormat === 'cornell' ? <BookOpen className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
                  </div>
                  {selectedFormat === 'cornell' ? '📚' : '✏️'} {structuredNotes.title || 'Your Beautiful Notes'}
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setShowOriginalChaos(!showOriginalChaos)}
                  className="flex items-center gap-2"
                >
                  {showOriginalChaos ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showOriginalChaos ? 'Hide' : 'Show'} Original Chaos
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Original Chaos Toggle */}
          <AnimatePresence>
            {showOriginalChaos && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border-2 border-dashed border-gray-300">
                  <CardHeader>
                    <CardTitle className="text-gray-700 flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      🧠 Your Original Chaotic Brain Dump
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="bg-gray-50 p-4 rounded-lg border text-gray-700 whitespace-pre-wrap"
                      style={{ fontFamily: "'Indie Flower', cursive", fontSize: '1rem' }}
                    >
                      <div className="text-gray-500 text-sm mb-3 italic" style={{ fontFamily: "'Caveat', cursive" }}>
                        Your original chaotic thoughts:
                      </div>
                      {structuredNotes.originalContent}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Render Notes Based on Format */}
          {selectedFormat === 'cornell' ? renderCornellNotes() : renderStructuredNotes()}
        </div>
      )}

      {/* Handwritten Styles */}
      <style jsx>{`
        .handwritten-title {
          position: relative;
          transform: rotate(-0.5deg);
        }
        
        .handwritten-title::after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 10%;
          right: 10%;
          height: 3px;
          background: repeating-linear-gradient(
            90deg,
            #667eea,
            #667eea 5px,
            transparent 5px,
            transparent 8px
          );
          transform: rotate(0.2deg);
        }
        
        .handwritten-highlight {
          background: rgba(255, 235, 59, 0.3);
          padding: 2px 4px;
          border-radius: 3px;
          position: relative;
        }
        
        .sketchy-underline {
          position: relative;
        }
        
        .sketchy-underline::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: repeating-linear-gradient(
            90deg,
            #667eea,
            #667eea 3px,
            transparent 3px,
            transparent 5px
          );
          transform: rotate(-0.2deg);
        }
        
        .chaos-bubble::before {
          content: '';
          position: absolute;
          top: -5px;
          left: 20px;
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-bottom: 10px solid #fdf2f8;
          z-index: 1;
        }

        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Kalam:wght@300;400;700&family=Indie+Flower&family=Amatic+SC:wght@400;700&display=swap');
      `}</style>
    </div>
  );
};

export default NoteStructurer;