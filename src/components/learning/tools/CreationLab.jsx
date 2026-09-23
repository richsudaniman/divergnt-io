import React, { useState } from 'react';
import { InvokeLLM } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, Lightbulb, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SocialMediaProjectCreator from './SocialMediaProjectCreator';

export default function CreationLab({ noteChunks, onClose }) {
  const [concept, setConcept] = useState('');
  const [projectIdeas, setProjectIdeas] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateSingleProject = async (concept, formatType) => {
    const formatNames = {
      comic_panel: 'Comic Panel',
      social_media_mockup: 'Social Media Mockup',
      song_tutorial: 'Song/Tutorial'
    };

    // Special handling for social_media_mockup with full system
    if (formatType === 'social_media_mockup') {
      return await generateSocialMediaProject(concept);
    }

    // Fallback for other formats (comic_panel, song_tutorial) - simplified for now
    const prompt = `# CreationLab Project Generator AI

You are that legendary teacher. The one students talk about decades later. The one who made supply and demand into a soap opera, turned gravity and friction into a live news debate, and somehow made the Krebs cycle feel like reality TV drama.

You don't just "make learning fun" - you make it impossible to forget.

## Your Mission

Generate ONE perfectly crafted creative project for the concept: "${concept}"

You MUST use the format: "${formatNames[formatType]}"

${formatType === 'comic_panel' ? `
This format is perfect for concepts with CONFLICT/TENSION, competing forces, cause-and-effect chains, or power dynamics.
Create a 3-4 panel comic that shows the drama, relationships, and power shifts.
` : ''}

${formatType === 'song_tutorial' ? `
This format is perfect for concepts with SEQUENCE/PROCESS, cycles, or steps to memorize.
Create a song/rhyme that makes the sequence stick through rhythm and repetition.
` : ''}

## The Creative Process

### Step 1: Understand the Concept Inside-Out

**The Deep Questions:**
- What's the core tension, transformation, or relationship here?
- What do students always get wrong or find confusing?
- What's the "aha moment" they need to have?
- If I had to teach this at a party, what's the hook?

**The Drama Mining:**
- What's competing or in conflict? (Opposing forces, competing interests, tensions)
- What's transforming or evolving? (Changes, cycles, processes)
- Who needs whom? (Dependencies, relationships, systems)
- What goes wrong? (Failures, imbalances, extremes)

**The "That's Actually Crazy" Factor:**
- What would make someone say "wait, WHAT?" about this concept?
- What's the unexpected, counterintuitive, or secretly wild part?

### Step 2: Find Your Creative Angle

${formatType === 'comic_panel' ? `
**For COMIC PANELS (3-4 panels):**

1. **Cast the characters** - Give concepts personalities, motivations, voices
2. **Set up the drama** - What's the normal situation vs. the disruption?
   - Panel 1: Everyone's happy (equilibrium)
   - Panel 2: CRISIS HITS (disruption)
   - Panel 3: CHAOS ERUPTS (reaction)
   - Panel 4: New reality emerges (resolution)
3. **Make it visual** - What shows the power shift?
4. **Add the hook** - What's the memorable title/tagline?

**Creative angles:** Soap opera, reality show conflict, breaking news, sports rivalry, crime drama
` : ''}

${formatType === 'song_tutorial' ? `
**For SONGS (4+ verses/lines):**

1. **Create the hook** - One catchy line that sums it up
2. **Build the verses** - Each verse has a job
   - Verse 1: WHAT is this? (definition)
   - Verse 2: HOW does it work? (process)
   - Verse 3: WHY does it matter? (real-world)
   - Verse 4: REMEMBER THIS (catchy summary)
3. **Make it flow** - Rhythm over perfect rhymes
4. **Add personality** - Memorable, not textbook

**Creative angles:** Rap/hip-hop, parody song, jingle, nursery rhyme, musical recipe
` : ''}

### Step 3: Craft the Perfect Project

Build a project that's:
- **Specific enough** - Clear what to create
- **Structured enough** - Guided steps prevent paralysis
- **Free enough** - Room for personal style
- **Smart enough** - Forces real understanding

## Quality Control Checklist

Before outputting, verify:
- [ ] Could a student complete this WITHOUT understanding? (If yes → redesign)
- [ ] Will this force them to think about relationships/function/sequence?
- [ ] Would students text friends about this assignment?
- [ ] Can this truly be done in 15-25 minutes?
- [ ] Does it require only basic materials?
- [ ] Is the creative angle actually illuminating (not just decorative)?

## Required Output

Return this exact JSON structure:

{
  "selectedFormat": "${formatType}",
  "formatReasoning": "2-3 sentences explaining why this format perfectly matches this concept",
  "project": {
    "title": "Creative, catchy title with emoji",
    "conceptTarget": "${concept}",
    "creativeAngle": "Specific creative lens (e.g., 'soap opera', 'Instagram chef', 'rap battle')",
    "setup": "2-3 engaging sentences showing the 'that's crazy' factor",
    "mission": "One clear sentence: Create a [specific thing] that shows [specific learning goal]",
    "whyThisWorks": "2-3 sentences explaining the pedagogical magic",
    "actionSteps": [
      {
        "stepNumber": 1,
        "title": "Punchy step title",
        "instruction": "Concrete guidance with examples",
        "learningFocus": "What cognitive work this accomplishes",
        "creativePrompt": "Guiding question sparking creativity"
      },
      {
        "stepNumber": 2,
        "title": "Punchy step title",
        "instruction": "Concrete guidance with examples",
        "learningFocus": "What cognitive work this accomplishes",
        "creativePrompt": "Guiding question sparking creativity"
      },
      {
        "stepNumber": 3,
        "title": "Punchy step title",
        "instruction": "Concrete guidance with examples",
        "learningFocus": "What cognitive work this accomplishes",
        "creativePrompt": "Guiding question sparking creativity"
      }
    ],
    "successCriteria": "Starts with 'You nailed it when...'",
    "timeEstimate": "15-25 minutes",
    "proMode": "One sentence optional extension",
    "teacherNote": "One sentence explaining the 'aha moment'"
  }
}

Remember: Find the story that already exists in every concept. Be legendary.`;

    const result = await InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          selectedFormat: {
            type: "string",
            enum: ["comic_panel", "social_media_mockup", "song_tutorial"]
          },
          formatReasoning: { type: "string" },
          project: {
            type: "object",
            properties: {
              title: { type: "string" },
              conceptTarget: { type: "string" },
              creativeAngle: { type: "string" },
              setup: { type: "string" },
              mission: { type: "string" },
              whyThisWorks: { type: "string" },
              actionSteps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    stepNumber: { type: "number" },
                    title: { type: "string" },
                    instruction: { type: "string" },
                    learningFocus: { type: "string" },
                    creativePrompt: { type: "string" }
                  },
                  required: ["stepNumber", "title", "instruction", "learningFocus", "creativePrompt"]
                },
                minItems: 3,
                maxItems: 4
              },
              successCriteria: { type: "string" },
              timeEstimate: { type: "string" },
              proMode: { type: "string" },
              teacherNote: { type: "string" }
            },
            required: ["title", "conceptTarget", "creativeAngle", "setup", "mission", "whyThisWorks", "actionSteps", "successCriteria", "timeEstimate"]
          }
        },
        required: ["selectedFormat", "formatReasoning", "project"]
      }
    });

    return result;
  };

  const generateSocialMediaProject = async (concept) => {
    const prompt = `# Social Media Profile Project Generator

You are creating a scaffolded social media profile project for ADHD learners. This format works when it forces students to understand WHAT something is through identity, function, relationships, and dynamic response.

## Input Concept
"${concept}"

## Your Task

First, analyze if this concept is appropriate for a social media profile format:

### Format Fit Analysis:
1. **Check if it's a PROCESS** (e.g., "photosynthesis", "erosion"):
   - If yes: Shift to the ACTOR who performs it (e.g., "photosynthesis" → "Chloroplast")
   - Include a "conceptShiftNote" explaining the adaptation to the user

2. **Check if it has clear IDENTITY/FUNCTION**:
   - Can it be personified with inputs, outputs, and relationships?
   - Does it have a role in a system?

3. **Determine fit level**:
   - HIGH FIT: Biological entities, economic forces, physical forces, historical actors, systems
   - MEDIUM FIT: Abstract concepts that can be personified
   - LOW FIT: Pure math formulas, pure procedures
   
If fit is LOW, return a redirect message suggesting a different format (song/tutorial for formulas, comic for conflicts).

If fit is HIGH or MEDIUM, generate a complete 4-step social media project:

## Step 1: Profile Picture
- Universal prompt: "Draw [concept]'s profile picture"
- Specific guidance based on concept type (organelle, force, economic concept, etc.)
- Include visual symbols, expression, colors
- Time: 5 minutes

## Step 2: Bio (Three Sections)
- 📝 What I do: Function, role, importance
- ❤️ What I need/like: Inputs, requirements, optimal conditions
- 😤 What I hate/avoid: Threats, limitations, failures
- Include example bio format
- Time: 6-7 minutes

## Step 3: Post (Relationship with Another Concept)
- Identify a related concept from the domain
- Determine relationship type:
  * OPPOSITION: Frustrated, passive aggressive (e.g., Demand annoyed at Supply's high prices)
  * COOPERATION: Appreciative, grateful (e.g., Mitochondria thanking Oxygen)
  * TRANSFORMATION: Proud, showing off work (e.g., Chloroplast showing off glucose made)
  * CAUSATION: Demonstrating power/effect (e.g., Gravity showing its pull)
- Provide tone guidance and example
- Time: 6-7 minutes

## Step 4: Story (Reaction to Change)
- Identify a disruption scenario relevant to the concept
- Create 2-3 frame Instagram Story showing:
  * Frame 1: Normal state
  * Frame 2: Disruption/crisis
  * Frame 3: Response/consequence
- Include format options (text on backgrounds, simple drawings, emojis)
- Add learning check question
- Time: 6-7 minutes

## Output JSON Structure

{
  "formatFit": "high" | "medium" | "low",
  "redirectMessage": "Only if formatFit is low - suggest alternative format",
  "conceptShiftNote": "Only if you shifted from process to actor - explain to user",
  "profileSubject": "The actual subject of the profile (might differ from input)",
  "projectTitle": "Catchy title with emoji",
  "emoji": "Single emoji representing concept",
  "timeEstimate": "20-25 minutes",
  "conceptTarget": "What students will understand after completing this",
  
  "step1": {
    "stepNumber": 1,
    "title": "Draw [Concept]'s Profile Picture",
    "instruction": "Full instruction with specific guidance for this concept type",
    "learningFocus": "What this step teaches",
    "timeEstimate": "5 minutes",
    "creativePrompt": "Guiding question",
    "inputType": "drawing_description"
  },
  
  "step2": {
    "stepNumber": 2,
    "title": "Write [Concept]'s Bio",
    "instruction": "Full instruction with three-part structure",
    "learningFocus": "What this step teaches",
    "timeEstimate": "6-7 minutes",
    "creativePrompt": "Guiding question",
    "exampleFormat": "Example bio text",
    "inputType": "bio_sections",
    "bioSections": {
      "whatIDoPrompt": "Specific prompt for this section",
      "whatINeedPrompt": "Specific prompt for this section",
      "whatIHatePrompt": "Specific prompt for this section"
    }
  },
  
  "step3": {
    "stepNumber": 3,
    "title": "Post: [Concept] [action] [RelatedConcept]",
    "instruction": "Full instruction for creating the post",
    "learningFocus": "What relationship this teaches",
    "timeEstimate": "6-7 minutes",
    "creativePrompt": "Guiding question",
    "example": "Example post text",
    "inputType": "social_post",
    "relatedConcept": "The other concept in this relationship",
    "relationshipType": "opposition | cooperation | transformation | causation",
    "toneGuidance": "How the post should sound"
  },
  
  "step4": {
    "stepNumber": 4,
    "title": "Story: [Disruption Scenario]",
    "instruction": "Full instruction with frame-by-frame guidance",
    "learningFocus": "What dynamic response this teaches",
    "timeEstimate": "6-7 minutes",
    "creativePrompt": "Guiding question",
    "learningCheckQuestion": "Question to verify understanding after completion",
    "inputType": "story_frames",
    "storyFrames": [
      {"frameNumber": 1, "description": "What to show in frame 1"},
      {"frameNumber": 2, "description": "What to show in frame 2"},
      {"frameNumber": 3, "description": "What to show in frame 3"}
    ],
    "formatOptions": ["Text on colored backgrounds", "Simple drawings", "Emoji progression"]
  },
  
  "successCriteria": "You nailed it when someone can look at your profile and explain: ...",
  "proMode": "Optional extension",
  "teacherNote": "Why this project creates an 'aha moment'"
}

Be creative, accurate, and make it impossible to complete without understanding the concept!`;

    const result = await InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          formatFit: { type: "string", enum: ["high", "medium", "low"] },
          redirectMessage: { type: "string" },
          conceptShiftNote: { type: "string" },
          profileSubject: { type: "string" },
          projectTitle: { type: "string" },
          emoji: { type: "string" },
          timeEstimate: { type: "string" },
          conceptTarget: { type: "string" },
          step1: {
            type: "object",
            properties: {
              stepNumber: { type: "number" },
              title: { type: "string" },
              instruction: { type: "string" },
              learningFocus: { type: "string" },
              timeEstimate: { type: "string" },
              creativePrompt: { type: "string" },
              inputType: { type: "string" }
            },
            required: ["stepNumber", "title", "instruction", "learningFocus", "timeEstimate", "creativePrompt", "inputType"]
          },
          step2: {
            type: "object",
            properties: {
              stepNumber: { type: "number" },
              title: { type: "string" },
              instruction: { type: "string" },
              learningFocus: { type: "string" },
              timeEstimate: { type: "string" },
              creativePrompt: { type: "string" },
              exampleFormat: { type: "string" },
              inputType: { type: "string" },
              bioSections: {
                type: "object",
                properties: {
                  whatIDoPrompt: { type: "string" },
                  whatINeedPrompt: { type: "string" },
                  whatIHatePrompt: { type: "string" }
                }
              }
            },
            required: ["stepNumber", "title", "instruction", "learningFocus", "timeEstimate", "creativePrompt", "inputType"]
          },
          step3: {
            type: "object",
            properties: {
              stepNumber: { type: "number" },
              title: { type: "string" },
              instruction: { type: "string" },
              learningFocus: { type: "string" },
              timeEstimate: { type: "string" },
              creativePrompt: { type: "string" },
              example: { type: "string" },
              inputType: { type: "string" },
              relatedConcept: { type: "string" },
              relationshipType: { type: "string" },
              toneGuidance: { type: "string" }
            },
            required: ["stepNumber", "title", "instruction", "learningFocus", "timeEstimate", "creativePrompt", "inputType"]
          },
          step4: {
            type: "object",
            properties: {
              stepNumber: { type: "number" },
              title: { type: "string" },
              instruction: { type: "string" },
              learningFocus: { type: "string" },
              timeEstimate: { type: "string" },
              creativePrompt: { type: "string" },
              learningCheckQuestion: { type: "string" },
              inputType: { type: "string" },
              storyFrames: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    frameNumber: { type: "number" },
                    description: { type: "string" }
                  }
                }
              },
              formatOptions: { type: "array", items: { type: "string" } }
            },
            required: ["stepNumber", "title", "instruction", "learningFocus", "timeEstimate", "creativePrompt", "inputType"]
          },
          successCriteria: { type: "string" },
          proMode: { type: "string" },
          teacherNote: { type: "string" }
        },
        required: ["formatFit", "profileSubject", "projectTitle", "conceptTarget", "step1", "step2", "step3", "step4", "successCriteria"]
      }
    });

    return result;
  };

  const handleGenerateProjectIdeas = async () => {
    if (!concept.trim()) {
      setError('Please enter a concept to generate projects!');
      return;
    }
    setIsLoading(true);
    setError(null);
    setProjectIdeas([]);
    setSelectedProject(null);

    try {
      // Generate one project for each format type
      const [comicResult, socialResult, songResult] = await Promise.all([
        generateSingleProject(concept, 'comic_panel'),
        generateSingleProject(concept, 'social_media_mockup'),
        generateSingleProject(concept, 'song_tutorial')
      ]);

      const ideas = [];

      // Handle comic result
      if (comicResult.selectedFormat) {
        ideas.push({
          id: 'proj1',
          type: comicResult.selectedFormat,
          title: comicResult.project.title,
          conceptAttack: `${comicResult.project.creativeAngle}`,
          setup: comicResult.project.setup,
          mission: comicResult.project.mission,
          actionSteps: comicResult.project.actionSteps,
          whyBrilliant: comicResult.project.whyThisWorks,
          successCriteria: comicResult.project.successCriteria,
          proMode: comicResult.project.proMode,
          teacherNote: comicResult.project.teacherNote,
          timeEstimate: comicResult.project.timeEstimate,
          fullData: comicResult
        });
      }

      // Handle social media result (with special structure)
      if (socialResult.formatFit === 'high' || socialResult.formatFit === 'medium') {
        ideas.push({
          id: 'proj2',
          type: 'social_media_mockup',
          title: socialResult.projectTitle,
          conceptAttack: socialResult.profileSubject,
          setup: socialResult.conceptTarget,
          mission: `Create ${socialResult.profileSubject}'s social media profile`,
          whyBrilliant: `Forces understanding through identity, function, relationships, and response to change.`,
          successCriteria: socialResult.successCriteria,
          proMode: socialResult.proMode,
          teacherNote: socialResult.teacherNote,
          timeEstimate: socialResult.timeEstimate,
          conceptShiftNote: socialResult.conceptShiftNote,
          fullData: socialResult
        });
      } else if (socialResult.redirectMessage) {
        // Show redirect message but still include other formats
        console.log('Social media redirect:', socialResult.redirectMessage);
      }

      // Handle song result
      if (songResult.selectedFormat) {
        ideas.push({
          id: 'proj3',
          type: songResult.selectedFormat,
          title: songResult.project.title,
          conceptAttack: `${songResult.project.creativeAngle}`,
          setup: songResult.project.setup,
          mission: songResult.project.mission,
          actionSteps: songResult.project.actionSteps,
          whyBrilliant: songResult.project.whyThisWorks,
          successCriteria: songResult.project.successCriteria,
          proMode: songResult.project.proMode,
          teacherNote: songResult.project.teacherNote,
          timeEstimate: songResult.project.timeEstimate,
          fullData: songResult
        });
      }

      setProjectIdeas(ideas);
    } catch (err) {
      setError(err.message || 'Failed to generate project ideas. Please try again.');
      console.error('Error generating projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
  };

  const handleBackToIdeas = () => {
    setSelectedProject(null);
  };

  const handleBackToConcept = () => {
    setProjectIdeas([]);
    setSelectedProject(null);
    setConcept('');
    setError(null);
  };

  const getFormatIcon = (type) => {
    switch(type) {
      case 'comic_panel': return '🎭';
      case 'social_media_mockup': return '📱';
      case 'song_tutorial': return '🎵';
      default: return '✨';
    }
  };

  const getFormatColor = (type) => {
    switch(type) {
      case 'comic_panel': return 'from-[var(--soft-purple-light)] to-[var(--soft-pink-light)]';
      case 'social_media_mockup': return 'from-[var(--soft-blue-light)] to-[var(--soft-purple-light)]';
      case 'song_tutorial': return 'from-[var(--soft-green-light)] to-[var(--soft-yellow-light)]';
      default: return 'from-[var(--soft-pink-light)] to-[var(--soft-yellow-light)]';
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!selectedProject ? (
          <motion.div
            key="concept-input-or-ideas"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card className="bg-white rounded-3xl shadow-[var(--shadow-soft)] border-2 border-[var(--soft-pink)]/20">
              <CardHeader className="bg-gradient-to-br from-[var(--soft-pink-light)] to-[var(--soft-yellow-light)] p-8 rounded-t-3xl">
                <CardTitle className="text-2xl font-bold text-[var(--soft-pink-dark)] flex items-center gap-3">
                  <Sparkles className="w-7 h-7" />
                  ✨ Creation Lab: Build & Learn
                </CardTitle>
                <p className="text-[var(--soft-pink-dark)]/80 text-lg mt-2">
                  Turn your notes into creative projects to deepen understanding. Choose from comics, social media posts, or songs!
                </p>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {error && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {projectIdeas.length === 0 ? (
                  <>
                    <div>
                      <label htmlFor="concept-input" className="block text-lg font-semibold text-[var(--text-main)] mb-3">
                        What concept from your notes do you want to explore?
                      </label>
                      <p className="text-[var(--text-muted)] text-base mb-4">
                        Pick any topic you want to understand better through hands-on creation.
                      </p>
                    </div>
                    <Input
                      id="concept-input"
                      placeholder="e.g., Photosynthesis, Supply & Demand, Electron Transport Chain"
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      className="h-14 text-lg border-2 border-[var(--border)] focus:border-[var(--soft-pink)] rounded-xl"
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerateProjectIdeas()}
                    />
                    <Button
                      onClick={handleGenerateProjectIdeas}
                      disabled={isLoading || !concept.trim()}
                      className="w-full h-14 bg-[var(--soft-pink)] hover:bg-[var(--soft-pink-dark)] text-white rounded-xl font-bold shadow-[var(--shadow-soft)] text-lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating Creative Ideas...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Generate Creative Project Ideas
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-[var(--text-main)]">
                        Choose Your Creative Challenge:
                      </h3>
                      <Button 
                        variant="outline" 
                        onClick={handleBackToConcept}
                        className="text-sm"
                      >
                        ← Try Different Concept
                      </Button>
                    </div>
                    <p className="text-[var(--text-muted)] text-base">
                      Pick the project that sounds most fun to you. Each takes about {projectIdeas[0]?.timeEstimate || '15-25 minutes'}.
                    </p>
                    <div className="grid grid-cols-1 gap-4">
                      {projectIdeas.map(idea => (
                        <motion.div
                          key={idea.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <Card
                            className="cursor-pointer hover:shadow-[var(--shadow-medium)] transition-all duration-300 border-2 border-[var(--border)] hover:border-[var(--soft-pink)]/50 rounded-2xl overflow-hidden"
                            onClick={() => handleSelectProject(idea)}
                          >
                            <div className={`bg-gradient-to-r ${getFormatColor(idea.type)} p-4`}>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{getFormatIcon(idea.type)}</span>
                                <span className="text-sm font-medium text-[var(--text-main)]/70 uppercase tracking-wide">
                                  {idea.type.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h4 className="text-xl font-bold text-[var(--text-main)] mb-2">{idea.title}</h4>
                                  {idea.conceptShiftNote && (
                                    <div className="bg-[var(--soft-blue-light)] p-3 rounded-lg mb-3 border-l-4 border-[var(--soft-blue)]">
                                      <p className="text-[var(--soft-blue-dark)] text-sm font-medium">
                                        💡 {idea.conceptShiftNote}
                                      </p>
                                    </div>
                                  )}
                                  <p className="text-[var(--soft-pink-dark)] font-medium text-base mb-3">
                                    🎯 {idea.conceptAttack}
                                  </p>
                                  <p className="text-[var(--text-muted)] text-base leading-relaxed mb-3">
                                    {idea.setup}
                                  </p>
                                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                    <Clock className="w-4 h-4" />
                                    <span>{idea.timeEstimate}</span>
                                  </div>
                                </div>
                                <ChevronRight className="w-6 h-6 text-[var(--text-muted)] flex-shrink-0 mt-1" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="selected-project-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Button 
              variant="outline" 
              onClick={handleBackToIdeas}
              className="w-full h-12 rounded-xl"
            >
              ← Back to Project Ideas
            </Button>
            
            {/* Render the appropriate project creator */}
            {selectedProject.type === 'social_media_mockup' && (
              <SocialMediaProjectCreator project={selectedProject.fullData} />
            )}
            
            {selectedProject.type === 'comic_panel' && (
              <Card className="bg-[var(--accent)] p-12 rounded-2xl text-center">
                <p className="text-[var(--text-muted)] text-lg">
                  🎨 Comic Panel Creator coming soon! For now, use the steps above to create your comic offline.
                </p>
              </Card>
            )}
            
            {selectedProject.type === 'song_tutorial' && (
              <Card className="bg-[var(--accent)] p-12 rounded-2xl text-center">
                <p className="text-[var(--text-muted)] text-lg">
                  🎵 Song/Tutorial Creator coming soon! For now, use the steps above to write your song offline.
                </p>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}