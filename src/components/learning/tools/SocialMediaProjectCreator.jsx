import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lightbulb, CheckCircle, Sparkles, ChevronRight, ChevronLeft, Clock, Target, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SocialMediaProjectCreator({ project }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [profileData, setProfileData] = useState({
    profilePicDescription: '',
    whatIDo: '',
    whatINeed: '',
    whatIHate: '',
    postContent: '',
    storyFrame1: '',
    storyFrame2: '',
    storyFrame3: ''
  });

  const steps = [project.step1, project.step2, project.step3, project.step4];
  const currentStep = steps[currentStepIndex];
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleComplete = () => {
    console.log('Project completed:', profileData);
    // TODO: Save to backend or trigger AI feedback
    alert(`🎉 Amazing work! You've created ${project.profileSubject}'s complete social media profile!\n\nYou nailed it! ${project.successCriteria}`);
  };

  const isCurrentStepComplete = () => {
    // Check if current step has required input
    if (currentStepIndex === 0) return profileData.profilePicDescription.trim().length > 0;
    if (currentStepIndex === 1) {
      return profileData.whatIDo.trim().length > 0 && 
             profileData.whatINeed.trim().length > 0 && 
             profileData.whatIHate.trim().length > 0;
    }
    if (currentStepIndex === 2) return profileData.postContent.trim().length > 0;
    if (currentStepIndex === 3) {
      return profileData.storyFrame1.trim().length > 0 && 
             profileData.storyFrame2.trim().length > 0 && 
             profileData.storyFrame3.trim().length > 0;
    }
    return true;
  };

  const renderStepContent = () => {
    if (currentStep.inputType === 'drawing_description') {
      return (
        <div className="space-y-4">
          <Textarea
            placeholder="Describe what you'd draw for the profile picture... (e.g., 'A strong, energetic character with lightning bolts, looking confident')"
            value={profileData.profilePicDescription}
            onChange={(e) => handleInputChange('profilePicDescription', e.target.value)}
            className="h-40 text-lg border-2 border-[var(--border)] focus:border-[var(--soft-purple)] rounded-xl resize-none"
            autoFocus
          />
          <p className="text-sm text-[var(--text-muted)] flex items-start gap-2">
            <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Tip: You can actually draw this separately or just describe it in detail here. The goal is to visualize the core identity!</span>
          </p>
        </div>
      );
    }

    if (currentStep.inputType === 'bio_sections' && project.step2.bioSections) {
      return (
        <div className="space-y-6">
          {/* What I Do Section */}
          <div className="bg-[var(--soft-blue-light)] p-6 rounded-2xl border-l-4 border-[var(--soft-blue)]">
            <h4 className="font-bold text-[var(--soft-blue-dark)] text-lg mb-3 flex items-center gap-2">
              📝 What I do
            </h4>
            <p className="text-[var(--soft-blue-dark)]/80 text-base mb-4 leading-relaxed">
              {project.step2.bioSections.whatIDoPrompt}
            </p>
            <Textarea
              placeholder="Write what you do, your role, why you're important..."
              value={profileData.whatIDo}
              onChange={(e) => handleInputChange('whatIDo', e.target.value)}
              className="h-24 text-base border-2 border-white/50 focus:border-[var(--soft-blue)] rounded-xl bg-white/80"
            />
          </div>

          {/* What I Need/Like Section */}
          <div className="bg-[var(--soft-green-light)] p-6 rounded-2xl border-l-4 border-[var(--soft-green)]">
            <h4 className="font-bold text-[var(--soft-green-dark)] text-lg mb-3 flex items-center gap-2">
              ❤️ What I need/like
            </h4>
            <p className="text-[var(--soft-green-dark)]/80 text-base mb-4 leading-relaxed">
              {project.step2.bioSections.whatINeedPrompt}
            </p>
            <Textarea
              placeholder="What do you need to function? What inputs, resources, or conditions?"
              value={profileData.whatINeed}
              onChange={(e) => handleInputChange('whatINeed', e.target.value)}
              className="h-24 text-base border-2 border-white/50 focus:border-[var(--soft-green)] rounded-xl bg-white/80"
            />
          </div>

          {/* What I Hate/Avoid Section */}
          <div className="bg-[var(--soft-pink-light)] p-6 rounded-2xl border-l-4 border-[var(--soft-pink)]">
            <h4 className="font-bold text-[var(--soft-pink-dark)] text-lg mb-3 flex items-center gap-2">
              😤 What I hate/avoid
            </h4>
            <p className="text-[var(--soft-pink-dark)]/80 text-base mb-4 leading-relaxed">
              {project.step2.bioSections.whatIHatePrompt}
            </p>
            <Textarea
              placeholder="What threatens you? What do you avoid? What's your worst nightmare?"
              value={profileData.whatIHate}
              onChange={(e) => handleInputChange('whatIHate', e.target.value)}
              className="h-24 text-base border-2 border-white/50 focus:border-[var(--soft-pink)] rounded-xl bg-white/80"
            />
          </div>

          {/* Example Format */}
          {project.step2.exampleFormat && (
            <Alert className="bg-[var(--soft-purple-light)] border-[var(--soft-purple)]/30">
              <Sparkles className="h-5 w-5 text-[var(--soft-purple)]" />
              <AlertDescription className="text-[var(--soft-purple-dark)] text-base leading-relaxed">
                <strong>Example Bio Format:</strong><br/>
                {project.step2.exampleFormat}
              </AlertDescription>
            </Alert>
          )}
        </div>
      );
    }

    if (currentStep.inputType === 'social_post') {
      return (
        <div className="space-y-6">
          {/* Relationship Context */}
          {project.step3.relatedConcept && (
            <div className="bg-[var(--soft-yellow-light)] p-6 rounded-2xl border-l-4 border-[var(--soft-yellow)]">
              <h4 className="font-bold text-[var(--soft-yellow-dark)] text-lg mb-2 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Your Relationship
              </h4>
              <p className="text-[var(--soft-yellow-dark)]/80 text-base">
                You're showing how <strong>{project.profileSubject}</strong> relates to <strong>{project.step3.relatedConcept}</strong>
              </p>
              {project.step3.toneGuidance && (
                <p className="text-[var(--soft-yellow-dark)]/80 text-base mt-2">
                  <strong>Tone:</strong> {project.step3.toneGuidance}
                </p>
              )}
            </div>
          )}

          {/* Post Input */}
          <Textarea
            placeholder="Write your post here... (Include emojis, hashtags, and @ mentions)"
            value={profileData.postContent}
            onChange={(e) => handleInputChange('postContent', e.target.value)}
            className="h-48 text-lg border-2 border-[var(--border)] focus:border-[var(--soft-purple)] rounded-xl resize-none font-normal"
            autoFocus
          />

          {/* Example Post */}
          {project.step3.example && (
            <Alert className="bg-[var(--soft-blue-light)] border-[var(--soft-blue)]/30">
              <Sparkles className="h-5 w-5 text-[var(--soft-blue)]" />
              <AlertDescription className="text-[var(--soft-blue-dark)] text-base leading-relaxed">
                <strong>Example Post:</strong><br/>
                <em className="font-normal">{project.step3.example}</em>
              </AlertDescription>
            </Alert>
          )}
        </div>
      );
    }

    if (currentStep.inputType === 'story_frames' && project.step4.storyFrames) {
      return (
        <div className="space-y-6">
          {/* Frame-by-Frame Guidance */}
          {project.step4.storyFrames.map((frame, index) => (
            <div key={frame.frameNumber} className="bg-white p-6 rounded-2xl border-2 border-[var(--border)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[var(--soft-purple)] text-white rounded-full flex items-center justify-center font-bold">
                  {frame.frameNumber}
                </div>
                <h4 className="font-bold text-[var(--text-main)] text-lg">
                  Frame {frame.frameNumber}
                </h4>
              </div>
              <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">
                {frame.description}
              </p>
              <Textarea
                placeholder={`What you show/write in Frame ${frame.frameNumber}...`}
                value={profileData[`storyFrame${frame.frameNumber}`]}
                onChange={(e) => handleInputChange(`storyFrame${frame.frameNumber}`, e.target.value)}
                className="h-32 text-base border-2 border-[var(--border)] focus:border-[var(--soft-purple)] rounded-xl"
              />
            </div>
          ))}

          {/* Format Options */}
          {project.step4.formatOptions && (
            <Alert className="bg-[var(--soft-green-light)] border-[var(--soft-green)]/30">
              <Lightbulb className="h-5 w-5 text-[var(--soft-green)]" />
              <AlertDescription className="text-[var(--soft-green-dark)] text-base">
                <strong>Format Options:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {project.step4.formatOptions.map((option, idx) => (
                    <li key={idx}>{option}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Learning Check Question */}
          {project.step4.learningCheckQuestion && currentStepIndex === 3 && (
            <Alert className="bg-[var(--soft-pink-light)] border-[var(--soft-pink)]/30">
              <HelpCircle className="h-5 w-5 text-[var(--soft-pink)]" />
              <AlertDescription className="text-[var(--soft-pink-dark)] text-base leading-relaxed">
                <strong>Learning Check:</strong><br/>
                {project.step4.learningCheckQuestion}
              </AlertDescription>
            </Alert>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-8">
      {/* Project Header */}
      <Card className="bg-gradient-to-br from-[var(--soft-blue-light)] to-[var(--soft-purple-light)] border-2 border-[var(--soft-blue)]/30 rounded-3xl shadow-[var(--shadow-soft)]">
        <CardHeader className="p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{project.emoji}</span>
                <Badge className="bg-white/30 text-[var(--soft-blue-dark)] font-semibold px-3 py-1">
                  Step {currentStepIndex + 1} of {steps.length}
                </Badge>
              </div>
              <CardTitle className="text-3xl font-bold text-[var(--soft-blue-dark)]">
                {project.projectTitle}
              </CardTitle>
            </div>
            <div className="text-right">
              <div className="text-sm text-[var(--soft-blue-dark)]/70 mb-1">Progress</div>
              <div className="text-2xl font-bold text-[var(--soft-blue-dark)]">
                {Math.round(progressPercentage)}%
              </div>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-[var(--soft-blue-dark)]/80 text-lg mt-4">
            🎯 <strong>Goal:</strong> {project.conceptTarget}
          </p>
        </CardHeader>
      </Card>

      {/* Current Step */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`step-${currentStepIndex}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-white border-2 border-[var(--soft-purple)]/30 rounded-3xl shadow-[var(--shadow-soft)]">
            <CardHeader className="bg-gradient-to-r from-[var(--soft-purple-light)] to-[var(--soft-pink-light)] p-8 rounded-t-3xl">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 bg-[var(--soft-purple)] text-white rounded-full flex items-center justify-center font-bold text-2xl shadow-[var(--shadow-soft)] flex-shrink-0">
                  {currentStep.stepNumber}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold text-[var(--soft-purple-dark)] mb-3">
                    {currentStep.title}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-[var(--soft-purple-dark)]/70">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {currentStep.timeEstimate}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              {/* Instructions */}
              <div className="bg-[var(--accent)] p-6 rounded-2xl">
                <h4 className="font-semibold text-[var(--text-main)] text-lg mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-[var(--soft-purple)]" />
                  Instructions
                </h4>
                <p className="text-[var(--text-main)] text-base leading-relaxed whitespace-pre-line">
                  {currentStep.instruction}
                </p>
              </div>

              {/* Learning Focus */}
              <Alert className="bg-[var(--soft-yellow-light)] border-[var(--soft-yellow)]/30">
                <Lightbulb className="h-5 w-5 text-[var(--soft-yellow-dark)]" />
                <AlertDescription className="text-[var(--soft-yellow-dark)] text-base">
                  <strong>What you're learning:</strong> {currentStep.learningFocus}
                </AlertDescription>
              </Alert>

              {/* Creative Prompt */}
              {currentStep.creativePrompt && (
                <div className="bg-gradient-to-r from-[var(--soft-pink-light)] to-[var(--soft-purple-light)] p-5 rounded-2xl border-l-4 border-[var(--soft-pink)]">
                  <p className="text-[var(--soft-pink-dark)] font-medium text-base italic">
                    💭 {currentStep.creativePrompt}
                  </p>
                </div>
              )}

              {/* Step-Specific Input UI */}
              <div className="pt-4">
                {renderStepContent()}
              </div>

              {/* Navigation */}
              <div className="flex gap-4 pt-6 border-t-2 border-[var(--border)]">
                <Button
                  onClick={handlePrevious}
                  disabled={currentStepIndex === 0}
                  variant="outline"
                  className="flex items-center gap-2 rounded-xl border-2 border-[var(--border)] hover:bg-[var(--accent)] disabled:opacity-40"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </Button>

                {currentStepIndex < steps.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    disabled={!isCurrentStepComplete()}
                    className="flex-1 h-12 bg-[var(--soft-purple)] hover:bg-[var(--soft-purple-dark)] text-white rounded-xl font-bold shadow-[var(--shadow-soft)] disabled:opacity-40"
                  >
                    Next Step
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={!isCurrentStepComplete()}
                    className="flex-1 h-12 bg-[var(--soft-green)] hover:bg-[var(--soft-green-dark)] text-white rounded-xl font-bold shadow-[var(--shadow-soft)] disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Complete Project! 🎉
                  </Button>
                )}
              </div>

              {!isCurrentStepComplete() && (
                <p className="text-sm text-[var(--text-muted)] text-center">
                  Fill in all sections to continue
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Success Criteria & Pro Mode (visible on last step) */}
      {currentStepIndex === steps.length - 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card className="bg-[var(--soft-green-light)] border-2 border-[var(--soft-green)]/30 rounded-2xl">
            <CardContent className="p-6">
              <h4 className="font-bold text-[var(--soft-green-dark)] text-lg mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Success Criteria
              </h4>
              <p className="text-[var(--soft-green-dark)] text-base leading-relaxed">
                {project.successCriteria}
              </p>
            </CardContent>
          </Card>

          {project.proMode && (
            <Card className="bg-[var(--soft-purple-light)] border-2 border-[var(--soft-purple)]/30 rounded-2xl">
              <CardContent className="p-6">
                <h4 className="font-bold text-[var(--soft-purple-dark)] text-lg mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Pro Mode Challenge
                </h4>
                <p className="text-[var(--soft-purple-dark)] text-base leading-relaxed">
                  {project.proMode}
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}