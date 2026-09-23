import React, { useState } from 'react';
import { InvokeLLM } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Target, Lightbulb, Trophy, BrainCircuit, ArrowRight, CheckCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CHALLENGE_TYPES = [
  {
    id: 'example_creation',
    title: '💡 Example Creation',
    description: 'Create your own original example',
    icon: Lightbulb,
    difficulty: 'Beginner'
  },
  {
    id: 'domain_transfer',
    title: '🚀 Domain Transfer',
    description: 'Apply concept to a different field',
    icon: Target,
    difficulty: 'Intermediate'
  },
  {
    id: 'problem_scenario',
    title: '🧠 Problem Scenario',
    description: 'Generate real-world applications',
    icon: BrainCircuit,
    difficulty: 'Advanced'
  },
  {
    id: 'creative_challenge',
    title: '🌟 Creative Challenge',
    description: 'Cross-domain creative applications',
    icon: Sparkles,
    difficulty: 'Expert'
  }
];

const DOMAIN_OPTIONS = [
  '🏢 Business & Entrepreneurship',
  '🎮 Gaming & Entertainment',
  '💕 Relationships & Social Life',
  '🏥 Healthcare & Medicine',
  '🎓 Education & Learning',
  '🌍 Environmental Issues',
  '💰 Finance & Economics',
  '🎭 Arts & Creativity',
  '⚡ Technology & Innovation',
  '🏃 Sports & Fitness'
];

export default function ApplicationGenerator({ noteChunks }) {
  const [mode, setMode] = useState('selection');
  const [concept, setConcept] = useState('');
  const [conceptContext, setConceptContext] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [challengePrompt, setChallengePrompt] = useState('');
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [userApplication, setUserApplication] = useState('');
  const [elaborationPrompts, setElaborationPrompts] = useState([]);
  const [elaborationResponses, setElaborationResponses] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [savedApplications, setSavedApplications] = useState([]);

  const handleAnalyzeConcept = async () => {
    if (!concept.trim()) return;
    setIsLoading(true);
    
    try {
      const analysisResult = await InvokeLLM({
        prompt: `A student wants to practice applying a concept they've learned. Help prepare them for application generation.
        
        Concept: "${concept}"
        
        Provide:
        1. "context": A brief 1-2 sentence explanation of what this concept means
        2. "application_readiness": Is this concept ready for application practice? (true/false)
        3. "suggested_challenge": Which challenge type would work best? ("example_creation", "domain_transfer", "problem_scenario", or "creative_challenge")
        
        Return JSON with these keys.`,
        response_json_schema: {
          type: "object",
          properties: {
            context: { type: "string" },
            application_readiness: { type: "boolean" },
            suggested_challenge: { type: "string", enum: ["example_creation", "domain_transfer", "problem_scenario", "creative_challenge"] }
          },
          required: ["context", "application_readiness", "suggested_challenge"]
        }
      });
      
      setConceptContext(analysisResult.context);
      if (analysisResult.application_readiness) {
        const suggested = CHALLENGE_TYPES.find(c => c.id === analysisResult.suggested_challenge);
        setSelectedChallenge(suggested);
        setMode('challenge');
      } else {
        setMode('selection');
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      setMode('selection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChallengeSelect = async (challengeType) => {
    setSelectedChallenge(challengeType);
    setIsLoading(true);
    
    try {
      const promptResult = await InvokeLLM({
        prompt: `Generate an engaging application challenge prompt for a student.
        
        Concept: "${concept}"
        Context: "${conceptContext}"
        Challenge Type: "${challengeType.id}"
        
        Create a specific, engaging prompt that asks the student to generate their own original example or application. Make it creative and challenging but not overwhelming.
        
        For domain_transfer or creative_challenge types, also suggest 2-3 interesting domains they could apply the concept to.
        
        Return JSON with "prompt" and optionally "suggested_domains" (array of strings).`,
        response_json_schema: {
          type: "object",
          properties: {
            prompt: { type: "string" },
            suggested_domains: { type: "array", items: { type: "string" } }
          },
          required: ["prompt"]
        }
      });
      
      setChallengePrompt(promptResult.prompt);
      if (promptResult.suggested_domains) {
        setSelectedDomains(promptResult.suggested_domains);
      }
      setMode('challenge');
    } catch (error) {
      console.error("Challenge generation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!userApplication.trim()) return;
    setIsLoading(true);
    
    try {
      const elaborationResult = await InvokeLLM({
        prompt: `A student has created an original application for a concept. Generate 3-4 follow-up questions to help them think deeper about their example.
        
        Concept: "${concept}"
        Student's Application: "${userApplication}"
        
        Create questions that:
        1. Ask them to explain WHY their example works
        2. Challenge them to find limitations or edge cases
        3. Connect to other concepts or contexts
        4. Encourage deeper analysis
        
        Make questions engaging and thought-provoking, not intimidating.
        
        Return JSON with "elaboration_questions" array.`,
        response_json_schema: {
          type: "object",
          properties: {
            elaboration_questions: { type: "array", items: { type: "string" } }
          },
          required: ["elaboration_questions"]
        }
      });
      
      setElaborationPrompts(elaborationResult.elaboration_questions);
      setMode('elaboration');
    } catch (error) {
      console.error("Elaboration generation failed:", error);
      setMode('complete');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApplication = () => {
    const newApplication = {
      id: Date.now(),
      concept,
      challengeType: selectedChallenge.title,
      application: userApplication,
      elaborations: elaborationResponses,
      timestamp: new Date().toLocaleDateString()
    };
    setSavedApplications([...savedApplications, newApplication]);
    setMode('complete');
  };

  const resetTool = () => {
    setMode('selection');
    setConcept('');
    setConceptContext('');
    setSelectedChallenge(null);
    setChallengePrompt('');
    setSelectedDomains([]);
    setUserApplication('');
    setElaborationPrompts([]);
    setElaborationResponses({});
  };

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {mode === 'selection' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-gradient-to-br from-[var(--soft-purple-light)] to-[var(--soft-blue-light)] border-2 border-[var(--soft-purple)]/30 rounded-3xl shadow-[var(--shadow-soft)]">
              <CardHeader className="text-center p-8">
                <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <Trophy className="w-8 h-8 text-[var(--soft-purple)]" />
                </div>
                <CardTitle className="text-3xl font-bold text-[var(--soft-purple-dark)] mb-3">
                  🎯 Application Generation
                </CardTitle>
                <p className="text-[var(--soft-purple-dark)]/80 text-lg font-medium">
                  Time to prove you really understand! Create original examples and scenarios.
                </p>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <div className="space-y-6">
                  <div>
                    <label className="block text-base font-semibold text-[var(--soft-purple-dark)] mb-3">
                      What concept do you want to apply?
                    </label>
                    <Textarea
                      placeholder="Enter a concept from your notes... (e.g., 'photosynthesis', 'supply and demand', 'confirmation bias')"
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      className="h-20 text-base border-2 border-white/50 focus:border-[var(--soft-purple)] rounded-xl bg-white/60 backdrop-blur-sm"
                    />
                  </div>
                  
                  <Button
                    onClick={handleAnalyzeConcept}
                    disabled={!concept.trim() || isLoading}
                    className="w-full h-14 text-lg bg-[var(--soft-purple)] hover:bg-[var(--soft-purple-dark)] text-white rounded-xl font-bold shadow-[var(--shadow-soft)]"
                  >
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-6 h-6 mr-3" />
                    )}
                    Let's Get Creative! 🚀
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {mode === 'challenge' && (
          <motion.div
            key="challenge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Challenge Type Selection */}
            {!selectedChallenge && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {CHALLENGE_TYPES.map((challenge) => (
                  <motion.div
                    key={challenge.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className="cursor-pointer hover:shadow-[var(--shadow-soft)] transition-all duration-300 border-2 border-[var(--border)] hover:border-[var(--soft-purple)]/50 rounded-2xl"
                      onClick={() => handleChallengeSelect(challenge)}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 bg-[var(--soft-purple-light)] rounded-xl flex items-center justify-center mx-auto mb-4">
                          <challenge.icon className="w-6 h-6 text-[var(--soft-purple)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">
                          {challenge.title}
                        </h3>
                        <p className="text-[var(--text-muted)] mb-3">
                          {challenge.description}
                        </p>
                        <Badge className="bg-[var(--soft-purple-light)] text-[var(--soft-purple-dark)]">
                          {challenge.difficulty}
                        </Badge>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Active Challenge */}
            {selectedChallenge && challengePrompt && (
              <Card className="bg-white rounded-3xl shadow-[var(--shadow-soft)] border-2 border-[var(--soft-purple)]/20">
                <CardHeader className="bg-gradient-to-r from-[var(--soft-purple-light)] to-[var(--soft-blue-light)] p-8 rounded-t-3xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold text-[var(--soft-purple-dark)] mb-2">
                        {selectedChallenge.title}
                      </CardTitle>
                      <p className="text-[var(--soft-purple-dark)]/80 text-lg">
                        Concept: <span className="font-semibold">{concept}</span>
                      </p>
                    </div>
                    <Badge className="bg-white/30 text-[var(--soft-purple-dark)] font-semibold">
                      {selectedChallenge.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  {/* Context Reminder */}
                  <div className="bg-[var(--soft-purple-light)] p-4 rounded-xl border-l-4 border-[var(--soft-purple)]">
                    <p className="text-[var(--soft-purple-dark)] leading-relaxed">
                      <strong>Quick Refresher:</strong> {conceptContext}
                    </p>
                  </div>

                  {/* Challenge Prompt */}
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-[var(--soft-yellow-light)] to-[var(--soft-pink-light)] p-6 rounded-2xl border-2 border-[var(--soft-yellow)]/30">
                      <p className="text-lg leading-relaxed text-[var(--text-main)] whitespace-pre-line">
                        {challengePrompt}
                      </p>
                    </div>

                    {/* Domain Suggestions */}
                    {selectedDomains.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-base font-semibold text-[var(--text-muted)]">
                          💡 Need inspiration? Try these domains:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedDomains.map((domain, index) => (
                            <Badge
                              key={index}
                              className="bg-[var(--soft-blue-light)] text-[var(--soft-blue-dark)] px-3 py-1 text-sm"
                            >
                              {domain}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response Area */}
                    <div className="space-y-3">
                      <label className="block text-lg font-semibold text-[var(--text-main)]">
                        Your Application:
                      </label>
                      <Textarea
                        placeholder="Think creatively! Describe your original example or scenario in detail..."
                        value={userApplication}
                        onChange={(e) => setUserApplication(e.target.value)}
                        className="h-40 text-base border-2 border-[var(--border)] focus:border-[var(--soft-purple)] rounded-xl"
                      />
                    </div>

                    <div className="flex gap-4">
                      <Button
                        onClick={() => setSelectedChallenge(null)}
                        variant="outline"
                        className="rounded-xl border-[var(--border)] hover:bg-[var(--accent)]"
                      >
                        Try Different Challenge
                      </Button>
                      <Button
                        onClick={handleSubmitApplication}
                        disabled={!userApplication.trim() || isLoading}
                        className="flex-1 h-12 bg-[var(--soft-purple)] hover:bg-[var(--soft-purple-dark)] text-white rounded-xl font-bold shadow-[var(--shadow-soft)]"
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <ArrowRight className="w-5 h-5 mr-2" />
                        )}
                        Dig Deeper
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {mode === 'elaboration' && (
          <motion.div
            key="elaboration"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <Card className="bg-white rounded-3xl shadow-[var(--shadow-soft)] border-2 border-[var(--soft-green)]/20">
              <CardHeader className="bg-gradient-to-r from-[var(--soft-green-light)] to-[var(--soft-blue-light)] p-8 rounded-t-3xl">
                <CardTitle className="text-2xl font-bold text-[var(--soft-green-dark)] flex items-center gap-3">
                  <Zap className="w-7 h-7" />
                  🤔 Let's Think Deeper
                </CardTitle>
                <p className="text-[var(--soft-green-dark)]/80 text-lg mt-2">
                  Great application! Now let's explore it from different angles.
                </p>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {/* User's Application */}
                <div className="bg-[var(--soft-purple-light)] p-6 rounded-2xl border-l-4 border-[var(--soft-purple)]">
                  <h4 className="font-semibold text-[var(--soft-purple-dark)] mb-2">Your Application:</h4>
                  <p className="text-[var(--soft-purple-dark)] leading-relaxed">{userApplication}</p>
                </div>

                {/* Elaboration Questions */}
                {elaborationPrompts.map((prompt, index) => (
                  <div key={index} className="space-y-3">
                    <div className="bg-gradient-to-br from-[var(--soft-yellow-light)] to-[var(--soft-pink-light)] p-4 rounded-xl border-2 border-[var(--soft-yellow)]/30">
                      <p className="font-medium text-[var(--text-main)]">
                        <span className="mr-2">💭</span>
                        {prompt}
                      </p>
                    </div>
                    <Textarea
                      placeholder="Share your thoughts..."
                      value={elaborationResponses[index] || ''}
                      onChange={(e) => setElaborationResponses({
                        ...elaborationResponses,
                        [index]: e.target.value
                      })}
                      className="h-24 text-base border-2 border-[var(--border)] focus:border-[var(--soft-green)] rounded-xl"
                    />
                  </div>
                ))}

                <div className="flex gap-4">
                  <Button
                    onClick={() => setMode('challenge')}
                    variant="outline"
                    className="rounded-xl border-[var(--border)] hover:bg-[var(--accent)]"
                  >
                    Back to Application
                  </Button>
                  <Button
                    onClick={handleSaveApplication}
                    className="flex-1 h-12 bg-[var(--soft-green)] hover:bg-[var(--soft-green-dark)] text-white rounded-xl font-bold shadow-[var(--shadow-soft)]"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Save Application
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {mode === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-gradient-to-br from-[var(--soft-green-light)] to-[var(--soft-blue-light)] border-2 border-[var(--soft-green)]/30 rounded-3xl text-center shadow-[var(--shadow-soft)]">
              <CardContent className="p-12">
                <div className="w-20 h-20 bg-white/30 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                  <Trophy className="w-10 h-10 text-[var(--soft-green)]" />
                </div>
                <h3 className="text-3xl font-bold text-[var(--soft-green-dark)] mb-4">
                  🎉 Excellent Work!
                </h3>
                <p className="text-lg text-[var(--soft-green-dark)]/80 mb-8 leading-relaxed">
                  You've successfully applied <strong>{concept}</strong> in a creative way. This kind of thinking builds real understanding that transfers to new situations!
                </p>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={resetTool}
                    className="bg-white/30 hover:bg-white/50 text-[var(--soft-green-dark)] border-2 border-white/50 rounded-xl font-semibold"
                  >
                    Try Another Concept
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Applications Library */}
      {savedApplications.length > 0 && (
        <Card className="bg-white rounded-2xl shadow-[var(--shadow-soft)] border border-[var(--border)]">
          <CardHeader className="p-6">
            <CardTitle className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[var(--soft-yellow)]" />
              Your Application Library ({savedApplications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              {savedApplications.slice(-3).map((app) => (
                <div key={app.id} className="bg-slate-50 p-4 rounded-xl border border-[var(--border)]">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-[var(--text-main)]">{app.concept}</h4>
                    <Badge className="bg-[var(--soft-purple-light)] text-[var(--soft-purple-dark)] text-xs">
                      {app.challengeType}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] line-clamp-2">{app.application}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-2">{app.timestamp}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}