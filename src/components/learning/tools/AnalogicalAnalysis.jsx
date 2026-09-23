import React, { useState } from 'react';
import { InvokeLLM } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight, ArrowLeft, Lightbulb, Target, Star, Zap, BrainCircuit, Loader2, RefreshCw, MessageCircle, Layers, ArrowUpDown, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AnalogicalAnalysis = ({ noteChunks }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [concept, setConcept] = useState('');
  const [suggestedDomain, setSuggestedDomain] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [showManualDomains, setShowManualDomains] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [learningStreak, setLearningStreak] = useState(4);
  const [conceptsMastered, setConceptsMastered] = useState(12);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [conceptOverview, setConceptOverview] = useState('');
  
  // Core new state for system-based analogies
  const [analogySystemModel, setAnalogySystemModel] = useState(null);
  const [conversationFlow, setConversationFlow] = useState([]);
  const [currentConversationStep, setCurrentConversationStep] = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [showSystemModel, setShowSystemModel] = useState(false);

  const domains = [
    { id: 'gaming', name: 'Gaming', icon: '🎮', desc: 'Games, mechanics, players' },
    { id: 'sports', name: 'Sports', icon: '⚽', desc: 'Teams, matches, strategy' },
    { id: 'movies', name: 'Pop Culture', icon: '🎬', desc: 'Movies, TV, celebrities' },
    { id: 'everyday', name: 'Everyday Life', icon: '🏠', desc: 'Daily situations, social interactions' }
  ];

  const getProgressPercentage = () => {
    switch(currentStep) {
      case 1: return 20;
      case 2: return 40;
      case 3: 
        const totalConversationSteps = conversationFlow.length;
        if (totalConversationSteps === 0) return 75;
        return Math.min(75 + (currentConversationStep / totalConversationSteps) * 20, 95);
      case 4: return 100;
      default: return 0;
    }
  };

  const handleConceptSubmit = async () => {
    if (!concept.trim()) return;
    
    setIsLoading(true);
    try {
      const conceptAnalysis = await InvokeLLM({
        prompt: `Give a very brief, 1-2 sentence overview of "${concept}" that a student can understand quickly. 
        
        Make it simple and clear - just the core idea without jargon. This is to refresh their memory before building analogies.`,
        response_json_schema: {
          type: "object",
          properties: {
            overview: { type: "string" },
            suitable_for_analogies: { type: "boolean" }
          },
          required: ["overview", "suitable_for_analogies"]
        }
      });

      setConceptOverview(conceptAnalysis.overview);

      const domainSuggestion = await InvokeLLM({
        prompt: `Analyze this academic concept and determine the BEST analogy domain for explaining it to college students with ADHD.

        Concept: "${concept}"
        Context: "${conceptAnalysis.overview}"

        Choose the single best domain from these options:
        - "gaming": For concepts involving mechanics, systems, rules, competition, progression
        - "sports": For concepts involving strategy, teamwork, performance, competition
        - "movies": For concepts involving storytelling, characters, plots, cultural references
        - "everyday": For concepts involving social interactions, daily habits, personal experiences, group dynamics

        Consider:
        - What domain would create the most natural, intuitive understanding?
        - What domain would resonate most with college students?
        - What domain has the clearest structural similarities to this concept?

        Return just the domain name (gaming, sports, movies, or everyday).`,
        response_json_schema: {
          type: "object",
          properties: {
            suggested_domain: { 
              type: "string", 
              enum: ["gaming", "sports", "movies", "everyday"] 
            }
          },
          required: ["suggested_domain"]
        }
      });

      const domainObj = domains.find(d => d.id === domainSuggestion.suggested_domain);
      setSuggestedDomain(domainObj);
      setCurrentStep(2);
    } catch (error) {
      console.error("Error analyzing concept:", error);
      setConceptOverview(`Let's explore ${concept} through analogies to make it clearer.`);
      setSuggestedDomain(domains.find(d => d.id === 'everyday'));
      setCurrentStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDomainAccept = async () => {
    if (!suggestedDomain) return;
    await proceedWithDomain(suggestedDomain);
  };

  const handleDomainSelect = async (domain) => {
    setShowManualDomains(false);
    await proceedWithDomain(domain);
  };

  const proceedWithDomain = async (domain) => {
    setSelectedDomain(domain.id);
    setIsLoading(true);

    try {
      const analogyResult = await InvokeLLM({
        prompt: `You are creating a structurally homologous analogy for "${concept}" using ${domain.name}. This is for college students with ADHD who need rich, accurate mental models - not shallow pattern matching.

        CONCEPT: "${concept}"
        CONTEXT: "${conceptOverview}"
        ANALOGICAL DOMAIN: "${domain.name}"

        PHASE 1: DEEP CONCEPTUAL GROUNDING
        Before building any analogy, demonstrate mastery by analyzing:

        1. Core Mechanisms (3 most important): What are the fundamental dynamics/processes that drive this concept? What makes it "tick"?
        
        2. Expert Fascination: What makes domain experts excited about this concept? What deeper patterns or implications do they see?
        
        3. Real-World Impact: What real problems does this concept solve? What phenomena does it explain that would otherwise be mysterious?
        
        4. Fundamental "Why": What is the deepest principle or law that governs this concept's behavior?

        PHASE 2: STRUCTURAL HOMOLOGY EVALUATION
        Evaluate whether ${domain.name} can provide genuine structural homology:

        - Does ${domain.name} actually follow the same underlying principles as ${concept}?
        - Can someone make causal predictions in both domains using the same reasoning?
        - Will this analogy scale to handle increasing sophistication?
        - Is this surface similarity or deep structural alignment?

        PHASE 3: SYSTEM MODEL CONSTRUCTION
        Create a multi-part system where each element genuinely maps:

        Core Elements (4-5): Each analogy element must share causal structure with its academic counterpart
        Structural Relations: How elements interact (must mirror academic concept's dynamics)
        Dynamics: "What-if" scenarios that work in both domains using same principles
        Mechanism: The shared fundamental principle governing both systems
        Caveats: Explicit limitations where analogy breaks down

        PHASE 4: SOPHISTICATED CONVERSATION DESIGN
        Design 7-step conversation following this exact blueprint:

        STEP 1 - START (Intuition):
        Create genuine curiosity with relatable ${domain.name} scenario
        
        STEP 2 - DRAW OUT:
        Follow-up that explores mechanism deeper, building on their reasoning
        
        STEP 3 - CONCEPT (One-sentence):
        Formal definition delivered cleanly
        
        STEP 4 - ANALOGY WORLD:
        Explicit structural mappings presented systematically
        
        STEP 5 - DYNAMICS:
        Two "what-if" scenarios with formal academic parallels
        
        STEP 6 - DEEPEN (Mechanism):
        Explain the fundamental mechanism governing both systems - the deep "why"
        
        STEP 7 - SEAL:
        Student restates concept using analogy

        OUTPUT STRUCTURE:
        {
          "conceptual_grounding": {
            "core_mechanisms": ["mechanism1", "mechanism2", "mechanism3"],
            "expert_fascination": "string",
            "real_world_impact": "string", 
            "fundamental_why": "string"
          },
          "homology_validation": {
            "structural_alignment": "string - why this domain genuinely mirrors the concept",
            "causal_reasoning": "string - how same reasoning applies in both domains",
            "scalability": "string - how analogy handles increasing sophistication",
            "quality_assessment": "string - expert validation of depth"
          },
          "analogy_system_model": {
            "header": "string",
            "core_elements": [
              {
                "analogy_element": "string",
                "academic_component": "string",
                "structural_basis": "string - why these genuinely correspond"
              }
            ],
            "structural_relations": ["string"],
            "dynamics": [
              {
                "scenario_title": "string",
                "analogy_behavior": "string", 
                "academic_parallel": "string",
                "shared_principle": "string - the mechanism governing both"
              }
            ],
            "mechanism": "string - the fundamental principle governing both systems",
            "caveats": ["string"]
          },
          "conversation_flow": [
            {
              "step_number": 1,
              "step_title": "START (Intuition)",
              "student_prompt": "string - genuine curiosity, relatable scenario",
              "expected_response": "string",
              "program_response": "string - validates and connects to concept element"
            },
            {
              "step_number": 2,
              "step_title": "DRAW OUT", 
              "student_prompt": "string - explores mechanism deeper",
              "expected_response": "string",
              "program_response": "string - builds on their reasoning, reveals mechanism"
            },
            {
              "step_number": 3,
              "step_title": "CONCEPT (One-sentence)",
              "program_statement": "string - formal definition",
              "analogy_bridge": "string - connects to their domain experience"
            },
            {
              "step_number": 4,
              "step_title": "ANALOGY WORLD",
              "program_teaching": "string - systematic presentation of all mappings"
            },
            {
              "step_number": 5,
              "step_title": "DYNAMICS",
              "student_prompt": "string",
              "expected_response": "string",
              "program_response_1": "string",
              "program_response_2": "string" 
            },
            {
              "step_number": 6,
              "step_title": "DEEPEN (Mechanism)",
              "mechanism_explanation": "string - fundamental principle governing both systems"
            },
            {
              "step_number": 7,
              "step_title": "SEAL",
              "recap_mappings": "string - key mappings summarized",
              "student_restatement_prompt": "string - explain concept using analogy",
              "expected_response": "string",
              "program_response": "string"
            }
          ]
        }`,

        response_json_schema: {
          type: "object",
          properties: {
            conceptual_grounding: {
              type: "object",
              properties: {
                core_mechanisms: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 3,
                  maxItems: 3
                },
                expert_fascination: { type: "string" },
                real_world_impact: { type: "string" },
                fundamental_why: { type: "string" }
              },
              required: ["core_mechanisms", "expert_fascination", "real_world_impact", "fundamental_why"]
            },
            homology_validation: {
              type: "object", 
              properties: {
                structural_alignment: { type: "string" },
                causal_reasoning: { type: "string" },
                scalability: { type: "string" },
                quality_assessment: { type: "string" }
              },
              required: ["structural_alignment", "causal_reasoning", "scalability", "quality_assessment"]
            },
            analogy_system_model: {
              type: "object",
              properties: {
                header: { type: "string" },
                core_elements: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      analogy_element: { type: "string" },
                      academic_component: { type: "string" },
                      structural_basis: { type: "string" }
                    },
                    required: ["analogy_element", "academic_component", "structural_basis"]
                  },
                  minItems: 4
                },
                structural_relations: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 2
                },
                dynamics: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      scenario_title: { type: "string" },
                      analogy_behavior: { type: "string" },
                      academic_parallel: { type: "string" },
                      shared_principle: { type: "string" }
                    },
                    required: ["scenario_title", "analogy_behavior", "academic_parallel", "shared_principle"]
                  },
                  minItems: 2,
                  maxItems: 2
                },
                mechanism: { type: "string" },
                caveats: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 2
                }
              },
              required: ["header", "core_elements", "structural_relations", "dynamics", "mechanism", "caveats"]
            },
            conversation_flow: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step_number: { type: "number" },
                  step_title: { type: "string" },
                  student_prompt: { type: "string" },
                  expected_response: { type: "string" },
                  program_response: { type: "string" },
                  program_statement: { type: "string" },
                  analogy_bridge: { type: "string" },
                  program_teaching: { type: "string" },
                  scenario_1_question: { type: "string" },
                  program_response_1: { type: "string" },
                  scenario_2_question: { type: "string" },
                  program_response_2: { type: "string" },
                  mechanism_explanation: { type: "string" },
                  recap_mappings: { type: "string" },
                  student_restatement_prompt: { type: "string" }
                },
                required: ["step_number", "step_title"]
              },
              minItems: 7,
              maxItems: 7
            }
          },
          required: ["conceptual_grounding", "homology_validation", "analogy_system_model", "conversation_flow"]
        }
      });

      setAnalogySystemModel(analogyResult);
      setConversationFlow(analogyResult.conversation_flow);
      setCurrentConversationStep(0);
      setConversationHistory([]);
      setCurrentResponse('');
      
      setTimeout(() => setCurrentStep(3), 800);
    } catch (error) {
      console.error("Error generating analogy system:", error);
      setConversationFlow([
        {
          step_number: 1,
          step_title: "Let's Start",
          student_prompt: `Think about your experience with ${domain.name}. Can you describe a situation that might relate to ${concept}?`,
          expected_response: "Any example from your experience",
          program_response: "Great! Let's build on that connection..."
        }
      ]);
      setConversationHistory([]);
      setTimeout(() => setCurrentStep(3), 800);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponseSubmit = () => {
    if (!currentResponse.trim()) return;

    const currentStepData = conversationFlow[currentConversationStep];
    const userResponseText = currentResponse.trim();

    let programResponseText = "";
    
    if (currentStepData.program_response) {
      programResponseText = currentStepData.program_response.replace(/\[their input\]/g, userResponseText);
    } else if (currentStepData.program_response_1 && currentStepData.program_response_2) {
      programResponseText = `${currentStepData.program_response_1}\n\n${currentStepData.program_response_2}`;
    }
    
    setConversationHistory(prev => [...prev, {
      step: currentStepData,
      userResponse: userResponseText,
      programResponse: programResponseText
    }]);

    setCurrentResponse('');

    if (currentConversationStep < conversationFlow.length - 1) {
      setCurrentConversationStep(prev => prev + 1);
    } else {
      setConceptsMastered(prev => prev + 1);
      setLearningStreak(prev => prev + 1);
      setCurrentStep(4);
    }
  };

  const handleAdvanceStep = () => {
    const currentStepData = conversationFlow[currentConversationStep];
    
    let programContent = "";
    
    if (currentStepData.program_statement) {
      programContent = currentStepData.program_statement;
      if (currentStepData.analogy_bridge) {
        programContent += `\n\n${currentStepData.analogy_bridge}`;
      }
    } else if (currentStepData.program_teaching) {
      programContent = currentStepData.program_teaching;
    } else if (currentStepData.mechanism_explanation) {
      programContent = currentStepData.mechanism_explanation;
    } else if (currentStepData.recap_mappings && !currentStepData.student_restatement_prompt) {
        programContent = currentStepData.recap_mappings;
    }

    if (programContent) {
      setConversationHistory(prev => [...prev, {
        step: currentStepData,
        userResponse: null,
        programResponse: programContent
      }]);
    }

    if (currentConversationStep < conversationFlow.length - 1) {
      setCurrentConversationStep(prev => prev + 1);
    } else {
      setConceptsMastered(prev => prev + 1);
      setLearningStreak(prev => prev + 1);
      setCurrentStep(4);
    }
  };

  const resetTool = () => {
    setCurrentStep(1);
    setConcept('');
    setConceptOverview('');
    setSuggestedDomain(null);
    setSelectedDomain('');
    setShowManualDomains(false);
    setAnalogySystemModel(null);
    setConversationFlow([]);
    setCurrentConversationStep(0);
    setConversationHistory([]);
    setCurrentResponse('');
    setShowSystemModel(false);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-[var(--text-main)] mb-2">🔎 Analogical Analysis</h3>
        <p className="text-[var(--text-muted)]">Master complex concepts through structurally homologous analogies that create rich mental models.</p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-[var(--text-muted)]">
          <span>Step {currentStep} of 4</span>
          <span>{getProgressPercentage()}% Complete</span>
        </div>
        <Progress value={getProgressPercentage()} className="h-2" />
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6 text-sm">
        <Badge variant="outline" className="flex items-center gap-2 border-[var(--border)]">
          <Star className="w-4 h-4 text-[var(--soft-yellow)]" />
          {learningStreak} day streak
        </Badge>
        <Badge variant="outline" className="flex items-center gap-2 border-[var(--border)]">
          <Target className="w-4 h-4 text-[var(--soft-green)]" />
          {conceptsMastered} concepts mastered
        </Badge>
        <Badge variant="outline" className="flex items-center gap-2 border-[var(--border)]">
          <Lightbulb className="w-4 h-4 text-[var(--soft-blue)]" />
          {hintsUsed} hints used
        </Badge>
      </div>

      <Card className="bg-white/80 backdrop-blur-md border-[var(--border)] shadow-[var(--shadow-soft)] rounded-3xl">
        <CardContent className="p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Concept Input */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <BrainCircuit className="w-16 h-16 text-[var(--soft-purple)] mx-auto mb-4" />
                  <h4 className="text-xl font-semibold mb-2">What concept is giving you trouble?</h4>
                  <p className="text-[var(--text-muted)]">Enter any topic you want to understand better</p>
                </div>

                <div className="space-y-4">
                  <Input
                    placeholder="e.g., Supply and Demand, Photosynthesis, Neural Networks..."
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    className="text-lg h-14 text-center border-[var(--border)] focus:border-[var(--soft-purple)]"
                    onKeyDown={(e) => e.key === 'Enter' && handleConceptSubmit()}
                  />

                  <Button
                    onClick={handleConceptSubmit}
                    disabled={!concept.trim() || isLoading}
                    className="w-full h-12 text-lg bg-[var(--soft-purple)] hover:bg-[var(--soft-purple-dark)] text-white rounded-2xl shadow-[var(--shadow-soft)]"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <ChevronRight className="w-5 h-5 mr-2" />
                    )}
                    Build System Analogy
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: AI Domain Suggestion */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h4 className="text-xl font-semibold mb-2">Perfect System Found!</h4>
                  <p className="text-[var(--text-muted)]">Based on your concept, here's the best system analogy to build</p>
                  
                  {conceptOverview && (
                    <div className="mt-4 p-4 bg-[var(--soft-purple-light)] rounded-xl border-l-4 border-[var(--soft-purple)]">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-[var(--soft-purple)] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-[var(--soft-purple-dark)] mb-1">Quick Refresher:</p>
                          <p className="text-[var(--soft-purple-dark)] leading-relaxed">{conceptOverview}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Suggested Domain */}
                {suggestedDomain && !showManualDomains && (
                  <div className="space-y-6">
                    <Card className="border-4 border-[var(--soft-green)] bg-gradient-to-br from-[var(--soft-green-light)] to-white shadow-[var(--shadow-medium)] rounded-3xl">
                      <CardContent className="p-8 text-center">
                        <div className="text-6xl mb-4">{suggestedDomain.icon}</div>
                        <h3 className="text-2xl font-bold text-[var(--soft-green-dark)] mb-2">
                          This concept maps perfectly to...
                        </h3>
                        <div className="text-3xl font-bold text-[var(--text-main)] mb-3">
                          {suggestedDomain.name} Systems
                        </div>
                        <p className="text-[var(--soft-green-dark)] text-lg mb-6">
                          {suggestedDomain.desc}
                        </p>
                        
                        <div className="flex gap-4 justify-center">
                          <Button
                            onClick={handleDomainAccept}
                            disabled={isLoading}
                            className="bg-[var(--soft-green)] hover:bg-[var(--soft-green-dark)] text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-[var(--shadow-soft)]"
                          >
                            {isLoading ? (
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                              <Layers className="w-5 h-5 mr-2" />
                            )}
                            Build This System
                          </Button>
                          
                          <Button
                            onClick={() => setShowManualDomains(true)}
                            variant="outline"
                            className="px-6 py-3 text-lg rounded-xl border-2 border-[var(--soft-green)]/30 hover:bg-[var(--soft-green-light)]"
                          >
                            <RefreshCw className="w-5 h-5 mr-2" />
                            Different System
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Manual Domain Selection */}
                {showManualDomains && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h4 className="text-lg font-semibold text-[var(--text-main)] mb-4">
                        Choose a different system domain:
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {domains.map((domain) => (
                        <Card
                          key={domain.id}
                          className="cursor-pointer hover:shadow-[var(--shadow-soft)] transition-all duration-300 border-2 hover:border-[var(--soft-purple)]/50 rounded-2xl"
                          onClick={() => handleDomainSelect(domain)}
                        >
                          <CardContent className="p-6 text-center">
                            <div className="text-3xl mb-3">{domain.icon}</div>
                            <h5 className="font-semibold text-lg mb-1">{domain.name}</h5>
                            <p className="text-sm text-[var(--text-muted)]">{domain.desc}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="text-center">
                      <Button
                        onClick={() => setShowManualDomains(false)}
                        variant="ghost"
                        className="text-[var(--text-muted)]"
                      >
                        ← Back to AI suggestion
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="w-full border-[var(--border)] hover:bg-[var(--accent)]"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Change Concept
                </Button>
              </motion.div>
            )}

            {/* Step 3: Enhanced Conversation Flow */}
            {currentStep === 3 && conversationFlow && conversationFlow.length > 0 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h4 className="text-xl font-semibold mb-2">Building Deep Understanding</h4>
                  <p className="text-[var(--text-muted)] mb-4">
                    Exploring <strong>{concept}</strong> through <strong>{domains.find(d => d.id === selectedDomain)?.name} systems</strong>
                  </p>
                </div>

                {/* Conversation History */}
                {conversationHistory.length > 0 && (
                  <div className="space-y-6 mb-8">
                    {conversationHistory.map((exchange, index) => (
                      <div key={index} className="space-y-4">
                        {exchange.userResponse !== null ? (
                          <>
                            <div className="bg-[var(--soft-blue-light)] p-4 rounded-xl border-l-4 border-[var(--soft-blue)]">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageCircle className="w-4 h-4 text-[var(--soft-blue)]" />
                                <span className="font-medium text-sm text-[var(--soft-blue-dark)]">
                                  {exchange.step.step_title}
                                </span>
                              </div>
                              <p className="text-[var(--soft-blue-dark)]">{exchange.step.student_prompt || exchange.step.recap_mappings}</p>
                            </div>
                            
                            <div className="bg-white p-4 rounded-xl border border-[var(--border)] ml-8">
                              <p className="text-[var(--text-main)] italic">"{exchange.userResponse}"</p>
                            </div>
                            
                            <div className="bg-[var(--soft-green-light)] p-4 rounded-xl border-l-4 border-[var(--soft-green)] ml-4">
                              <div className="text-[var(--soft-green-dark)] whitespace-pre-line">
                                {exchange.programResponse}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-[var(--soft-green-light)] p-4 rounded-xl border-l-4 border-[var(--soft-green)]">
                            <div className="flex items-center gap-2 mb-2">
                              <BrainCircuit className="w-4 h-4 text-[var(--soft-green)]" />
                              <span className="font-medium text-sm text-[var(--soft-green-dark)]">
                                {exchange.step.step_title}
                              </span>
                            </div>
                            <div className="text-[var(--soft-green-dark)] whitespace-pre-line">
                              {exchange.programResponse}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Current Step */}
                {currentConversationStep < conversationFlow.length && (
                  <div className="space-y-6">
                    {(() => {
                      const currentStepData = conversationFlow[currentConversationStep];
                      const needsInput = (currentStepData.student_prompt || currentStepData.student_restatement_prompt);
                      
                      return (
                        <div className="bg-gradient-to-br from-[var(--soft-purple-light)] to-[var(--soft-blue-light)] rounded-2xl p-6 border-2 border-[var(--soft-purple)]/30">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-[var(--soft-purple)] text-white rounded-full flex items-center justify-center font-bold">
                              {currentStepData.step_number}
                            </div>
                            <h5 className="text-lg font-bold text-[var(--soft-purple-dark)]">
                              {currentStepData.step_title}
                            </h5>
                          </div>

                          <div className="text-lg text-[var(--soft-purple-dark)] leading-relaxed whitespace-pre-line">
                            {currentStepData.program_statement && <span className="block mb-4">{currentStepData.program_statement}</span>}
                            {currentStepData.analogy_bridge && <span className="block mb-4">{currentStepData.analogy_bridge}</span>}
                            {currentStepData.program_teaching && <span className="block mb-4">{currentStepData.program_teaching}</span>}
                            {currentStepData.mechanism_explanation && <span className="block mb-4">{currentStepData.mechanism_explanation}</span>}
                            {currentStepData.recap_mappings && <span className="block mb-4">{currentStepData.recap_mappings}</span>}

                            {(currentStepData.student_prompt && !currentStepData.program_statement && !currentStepData.program_teaching && !currentStepData.mechanism_explanation && !currentStepData.recap_mappings) && currentStepData.student_prompt}
                            {currentStepData.student_restatement_prompt && currentStepData.student_restatement_prompt}
                          </div>

                          {currentStepData.expected_response && needsInput && (
                            <div className="bg-white/60 p-3 rounded-xl text-sm text-[var(--soft-purple-dark)]/70 mt-4">
                              <strong>Think about:</strong> {currentStepData.expected_response}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Input area for student steps */}
                    {(conversationFlow[currentConversationStep]?.student_prompt || conversationFlow[currentConversationStep]?.student_restatement_prompt) && (
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Share your thoughts..."
                          value={currentResponse}
                          onChange={(e) => setCurrentResponse(e.target.value)}
                          className="h-32 text-base border-2 border-[var(--border)] focus:border-[var(--soft-purple)] rounded-xl"
                        />
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        onClick={() => setCurrentStep(2)}
                        variant="outline"
                        className="flex-1 border-[var(--border)] hover:bg-[var(--accent)]"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Change Domain
                      </Button>
                      
                      {(conversationFlow[currentConversationStep]?.student_prompt || conversationFlow[currentConversationStep]?.student_restatement_prompt) ? (
                        <Button
                          onClick={handleResponseSubmit}
                          disabled={!currentResponse.trim()}
                          className="flex-1 h-12 bg-[var(--soft-purple)] hover:bg-[var(--soft-purple-dark)] text-white font-bold rounded-xl shadow-[var(--shadow-soft)]"
                        >
                          <ChevronRight className="w-5 h-5 mr-2" />
                          {currentConversationStep === conversationFlow.length - 1 ? 'Complete Understanding' : 'Continue'}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleAdvanceStep}
                          className="flex-1 h-12 bg-[var(--soft-purple)] hover:bg-[var(--soft-purple-dark)] text-white font-bold rounded-xl shadow-[var(--shadow-soft)]"
                        >
                          <ChevronRight className="w-5 h-5 mr-2" />
                          Continue
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Enhanced System Model Display */}
            {currentStep === 4 && analogySystemModel && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <Star className="w-16 h-16 text-[var(--soft-yellow)] mx-auto mb-4" />
                  <h4 className="text-2xl font-semibold mb-2">🎉 Deep Understanding Achieved!</h4>
                  <p className="text-[var(--text-muted)]">You've built a structurally homologous mental model that you can use for genuine reasoning about {concept}.</p>
                </div>

                {/* Enhanced System Model Display */}
                <Card className="bg-gradient-to-br from-[var(--soft-green-light)] to-[var(--soft-blue-light)] border-2 border-[var(--soft-green)]/30 rounded-3xl shadow-[var(--shadow-soft)]">
                  <CardHeader className="text-center p-6">
                    <CardTitle className="text-2xl font-bold text-[var(--soft-green-dark)] flex items-center justify-center gap-3">
                      <Layers className="w-7 h-7" />
                      {analogySystemModel.analogy_system_model?.header}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    {/* Conceptual Grounding */}
                    {analogySystemModel.conceptual_grounding && (
                      <div className="bg-[var(--soft-purple-light)] p-6 rounded-xl border-l-4 border-[var(--soft-purple)]">
                        <h5 className="text-lg font-bold text-[var(--soft-purple-dark)] mb-4 flex items-center gap-2">
                          <BrainCircuit className="w-5 h-5" />
                          Deep Conceptual Foundation
                        </h5>
                        <div className="space-y-3">
                          <div>
                            <strong className="text-[var(--soft-purple-dark)]">Why Experts Love This:</strong>
                            <p className="text-[var(--soft-purple-dark)]/80">{analogySystemModel.conceptual_grounding.expert_fascination}</p>
                          </div>
                          <div>
                            <strong className="text-[var(--soft-purple-dark)]">Fundamental Principle:</strong>
                            <p className="text-[var(--soft-purple-dark)]/80">{analogySystemModel.conceptual_grounding.fundamental_why}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Core Elements */}
                    {analogySystemModel.analogy_system_model?.core_elements && (
                      <div>
                        <h5 className="text-lg font-bold text-[var(--soft-green-dark)] mb-4 flex items-center gap-2">
                          <Target className="w-5 h-5" />
                          Structural Mappings
                        </h5>
                        <div className="grid gap-4">
                          {analogySystemModel.analogy_system_model.core_elements.map((element, index) => (
                            <div key={index} className="bg-white/80 p-4 rounded-xl border border-[var(--soft-green)]/20">
                              <div className="flex items-center gap-3 mb-2">
                                <ArrowUpDown className="w-4 h-4 text-[var(--soft-green)]" />
                                <strong className="text-[var(--soft-green-dark)]">
                                  {element.analogy_element} = {element.academic_component}
                                </strong>
                              </div>
                              <p className="text-sm text-[var(--soft-green-dark)]/80">{element.structural_basis}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Core Mechanism */}
                    {analogySystemModel.analogy_system_model?.mechanism && (
                      <div className="bg-[var(--soft-purple-light)] p-6 rounded-xl border-l-4 border-[var(--soft-purple)]">
                        <h5 className="text-lg font-bold text-[var(--soft-purple-dark)] mb-3 flex items-center gap-2">
                          <BrainCircuit className="w-5 h-5" />
                          Shared Governing Mechanism
                        </h5>
                        <p className="text-[var(--soft-purple-dark)] leading-relaxed">{analogySystemModel.analogy_system_model.mechanism}</p>
                      </div>
                    )}

                    {/* Dynamics */}
                    {analogySystemModel.analogy_system_model?.dynamics && (
                      <div>
                        <h5 className="text-lg font-bold text-[var(--soft-green-dark)] mb-4 flex items-center gap-2">
                          <Zap className="w-5 h-5" />
                          Predictive Scenarios
                        </h5>
                        <div className="space-y-4">
                          {analogySystemModel.analogy_system_model.dynamics.map((dynamic, index) => (
                            <div key={index} className="bg-white/80 p-4 rounded-xl border border-[var(--soft-green)]/20">
                              <h6 className="font-semibold text-[var(--soft-green-dark)] mb-2">{dynamic.scenario_title}</h6>
                              <p className="text-sm text-[var(--soft-green-dark)]/80 mb-2">
                                <strong>Analogy:</strong> {dynamic.analogy_behavior}
                              </p>
                              <p className="text-sm text-[var(--soft-green-dark)]/80 mb-2">
                                <strong>Academic:</strong> {dynamic.academic_parallel}
                              </p>
                              <p className="text-sm text-[var(--soft-green-dark)] font-medium">
                                <strong>Shared Principle:</strong> {dynamic.shared_principle}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Caveats */}
                    {analogySystemModel.analogy_system_model?.caveats && (
                      <div className="bg-[var(--soft-yellow-light)] p-6 rounded-xl border-l-4 border-[var(--soft-yellow)]">
                        <h5 className="text-lg font-bold text-[var(--text-main)] mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-[var(--soft-yellow)]" />
                          Analogy Limitations
                        </h5>
                        <ul className="space-y-2">
                          {analogySystemModel.analogy_system_model.caveats.map((caveat, index) => (
                            <li key={index} className="text-[var(--text-main)] text-sm flex items-start gap-2">
                              <span className="text-[var(--soft-yellow)] mt-1">⚠️</span>
                              {caveat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    onClick={resetTool}
                    className="flex-1 bg-[var(--soft-purple)] hover:bg-[var(--soft-purple-dark)] text-white font-bold rounded-xl shadow-[var(--shadow-soft)]"
                  >
                    <Star className="w-5 h-5 mr-2" />
                    Master Another Concept
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalogicalAnalysis;