
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Exam } from '@/entities/Exam';
import { ExamMaterial } from '@/entities/ExamMaterial';
import { StudyBurst } from '@/entities/StudyBurst';
import { StudyNotesSection } from '@/entities/StudyNotesSection'; // New import for StudyNotesSection
import { UploadFile, InvokeLLM } from '@/integrations/Core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  Upload as UploadIcon,
  FileText,
  Video,
  Image as ImageIcon,
  File,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
  GraduationCap,
  BookOpen,
  Target,
  Sparkles,
  BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // Fixed syntax here
import { updateUserProgress } from '@/functions/updateUserProgress';

const SUPPORTED_FORMATS = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'video/mp4',
  'video/mov',
  'video/quicktime',
  'video/avi',
  'image/jpeg',
  'image/png',
  'image/gif'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file

const LoadingOverlay = ({ status }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center"
  >
    <div className="text-center text-white space-y-6">
      <div className="relative w-24 h-24 mx-auto">
        <BrainCircuit className="absolute inset-0 w-full h-full text-white/20 animate-spin" style={{animationDuration: '10s'}} />
        <Sparkles className="absolute inset-0 w-full h-full text-[var(--soft-purple)] animate-pulse" />
      </div>
      <h2 className="text-3xl font-bold">Building Your Plan...</h2>
      <p className="text-lg text-white/80">{status}</p>
    </div>
  </motion.div>
);

export default function ExamPrepSetupPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [examData, setExamData] = useState({
    name: '',
    examDate: '',
    preferredSessionLength: 45, // Default value
    focusAreas: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const fileInputRef = useRef(null);

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('video/')) return Video;
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('presentation')) return FileText;
    if (fileType.includes('word') || fileType.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFileSelection(files);
  };

  const handleFileSelection = async (files) => {
    setError(null);
    setIsUploading(true);

    const validFiles = files.filter(file => {
      if (!SUPPORTED_FORMATS.includes(file.type)) {
        setError(`File "${file.name}" is not a supported format.`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" exceeds 50MB limit.`);
        return false;
      }
      // Check if file is already added (by name and size to avoid duplicates)
      if (uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
        setError(`File "${file.name}" has already been added.`);
        return false;
      }
      return true;
    });

    for (let file of validFiles) {
      const fileId = Date.now() + Math.random(); // Unique ID for tracking progress

      // Add file to state with uploading status
      setUploadedFiles(prev => [...prev, {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        status: 'uploading',
        progress: 0
      }]);

      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: Math.min((prev[fileId] || 0) + Math.random() * 20, 90) // Progress up to 90%
          }));
        }, 200);

        const { file_url } = await UploadFile({ file });

        clearInterval(progressInterval);

        // Update file status to completed
        setUploadedFiles(prev => prev.map(f =>
          f.id === fileId
            ? { ...f, status: 'completed', fileUrl: file_url, progress: 100 }
            : f
        ));

        setUploadProgress(prev => ({ ...prev, [fileId]: 100 })); // Ensure progress is 100% on completion

      } catch (error) {
        console.error("Upload error:", error);
        setUploadedFiles(prev => prev.map(f =>
          f.id === fileId
            ? { ...f, status: 'error' }
            : f
        ));
        setError(`Failed to upload "${file.name}". Please try again.`);
      }
    }

    setIsUploading(false);
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const canProceedFromStep1 = () => {
    return examData.name.trim() && examData.examDate;
  };

  const canProceedFromStep2 = () => {
    return uploadedFiles.some(f => f.status === 'completed') && !isUploading;
  };

  const handleNextStep = () => {
    setError(null); // Clear error on next step
    if (currentStep === 1 && canProceedFromStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedFromStep2()) {
      setCurrentStep(3);
    } else if (currentStep === 1 && !canProceedFromStep1()) {
      setError("Please fill in both the exam name and date to proceed.");
    } else if (currentStep === 2 && !canProceedFromStep2()) {
      setError("Please upload at least one study material to proceed.");
    }
  };

  const handlePrevStep = () => {
    setError(null); // Clear error on prev step
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    setError(null);

    try {
      // 1. Create the Exam record
      setGenerationStatus("Saving exam details...");
      const newExam = await Exam.create({
        name: examData.name,
        examDate: examData.examDate,
        preferredSessionLength: examData.preferredSessionLength
      });

      // Track exam prep start for Academic Weapon score
      try {
        await updateUserProgress({
          activityType: 'exam_prep_started',
          metadata: {}
        });
      } catch (progressError) {
        console.log('Progress tracking failed (non-critical):', progressError);
      }

      // 2. Create ExamMaterial records
      setGenerationStatus("Logging your study materials...");
      const completedFiles = uploadedFiles.filter(f => f.status === 'completed');
      const materialsToCreate = completedFiles.map(f => ({
        examId: newExam.id,
        fileName: f.name,
        fileType: f.type,
        fileUrl: f.fileUrl,
        fileSize: f.size
      }));
      await ExamMaterial.bulkCreate(materialsToCreate);

      // 3. Categorize files and generate video transcripts
      const LLM_SUPPORTED_DOC_FORMATS = [
        'application/pdf', 'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      const readableDocs = completedFiles.filter(f => LLM_SUPPORTED_DOC_FORMATS.includes(f.type));
      const videosToAnalyze = completedFiles.filter(f => f.type.startsWith('video/'));

      if (readableDocs.length === 0 && videosToAnalyze.length === 0) {
        throw new Error("No readable documents or videos were provided. Please upload at least one supported file to generate a plan.");
      }

      let generatedTranscriptsText = '';
      if (videosToAnalyze.length > 0) {
        setGenerationStatus(`Analyzing ${videosToAnalyze.length} video(s)...`);
        const transcriptPromises = videosToAnalyze.map(video => {
          return InvokeLLM({
            prompt: `Based on the title "${video.name}", generate a detailed educational transcript for a lecture video. Make it comprehensive with concepts, examples, and key terms. Return ONLY the transcript text.`
          });
        });
        const transcripts = await Promise.all(transcriptPromises);
        generatedTranscriptsText = transcripts.join('\n\n---\n\n');
      }

      // 4. Generate comprehensive notes AND study plan with scheduling
      setGenerationStatus("Creating your personalized study notes & schedule...");
      const docFileUrls = readableDocs.map(f => f.fileUrl);
      
      const today = new Date();
      const examDate = new Date(examData.examDate);
      const daysUntilExam = Math.max(1, Math.ceil((examDate - today) / (1000 * 60 * 60 * 24)));
      
      const prompt = `
        You are an expert academic strategist creating a comprehensive study package.
        Your task is two-fold: generate structured, ADHD-friendly notes AND a scheduled study plan.

        Exam Details:
        - Name: ${examData.name}
        - Days Until Exam: ${daysUntilExam}
        - Preferred Session Length: ${examData.preferredSessionLength} minutes
        - Focus Areas: ${examData.focusAreas || 'Analyze all content to determine key areas.'}

        PART 1: GENERATE STRUCTURED, SECTIONED NOTES
        1.  Analyze and synthesize ALL provided content (from files and the transcript text below).
        2.  Intelligently divide the content into logical sections or chapters.
        3.  For EACH section, generate comprehensive notes applying the full 7-stage pipeline (chunking, diagrams, equations, etc.).
        4.  **Adapt note condensation based on days until the exam:**
            - If > 20 days: Very detailed, explanatory notes.
            - If 6-20 days: Well-summarized notes, focusing on key concepts.
            - If < 6 days: Highly condensed notes (like cheat sheets).
        5.  For each section, generate diagrams, charts, and extract equations where applicable, following strict criteria.
        6.  For each section, chunk the content and assign relevant tags.

        Video Transcripts (if any):
        ---
        ${generatedTranscriptsText || "No video transcripts provided."}
        ---

        PART 2: GENERATE A SCHEDULED STUDY PLAN ('BURSTS')
        1.  Based on the note sections you created, create a study plan of "bursts".
        2.  Link bursts to note sections using \`linkedSectionIndex\`.

        Return ONLY a JSON object with a "sections" array and a "bursts" array.
      `;

      const schema = {
        type: "object",
        properties: {
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                content: { type: "string" },
                note_chunks: { "type": "array", "items": {"type": "object", "properties": {"chunk_id": {"type": "number"}, "text": {"type": "string"}, "tags": {"type": "array", "items": {"type": "string"}}}}},
                equations_found: { "type": "array", "items": {"type": "object", "properties": {"equation": {"type": "string"}, "variables": {"type": "array", "items": {"type": "object", "properties": {"value": {"type": "string"}, "description": {"type": "string"}, "unit": {"type": "string"}}}}, "purpose": {"type": "string"}}}},
                diagrams: { "type": "array", "items": {"type": "object", "properties": {"title": {"type": "string"}, "type": {"type": "string", "enum": ["flowchart", "mindmap", "timeline", "matrix", "conceptmap"]}, "code": {"type": "string"}, "recap": {"type": "string"}}}},
                charts: { "type": "array", "items": {"type": "object", "properties": {"title": {"type": "string"}, "type": {"type": "string", "enum": ["bar", "line"]}, "data": {"type": "array", "items": {"type": "object", "properties": {"label": {"type": "string"}, "value": {"type": "number"}}}}, "x_axis_label": {"type": "string"}, "y_axis_label": {"type": "string"}, "caption": {"type": "string"}}}}
              },
              required: ["title", "content"]
            }
          },
          bursts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                topic: { type: "string" },
                subtopic: { type: "string" },
                taskType: { type: "string", "enum": ["review_notes", "practice_questions", "flashcards", "break", "summarize_concept"] },
                taskDetails: { type: "string" },
                estimatedDuration: { type: "number" },
                dayOffset: { type: "number" },
                priority: { type: "string", "enum": ["low", "medium", "high", "critical"], "default": "medium" },
                linkedSectionIndex: { type: "number", description: "0-based index of the linked section from the 'sections' array" }
              },
              required: ["title", "topic", "taskType", "estimatedDuration", "dayOffset"]
            }
          }
        },
        required: ["sections", "bursts"]
      };

      const planResult = await InvokeLLM({
        prompt,
        file_urls: docFileUrls.length > 0 ? docFileUrls : undefined,
        response_json_schema: schema
      });

      // 5. Create StudyNotesSection records
      setGenerationStatus("Saving your new structured notes...");
      if (!planResult || !planResult.sections || planResult.sections.length === 0) {
        throw new Error("The AI could not generate study notes from the provided materials. This might happen if the files are empty or content is not extractable.");
      }
      const sectionsToCreate = planResult.sections.map((section, index) => ({
        examId: newExam.id,
        sectionOrder: index,
        title: section.title,
        content: section.content,
        note_chunks: section.note_chunks || [],
        equations_found: section.equations_found || [],
        diagrams: section.diagrams || [],
        charts: section.charts || [],
      }));
      const createdNoteSections = await StudyNotesSection.bulkCreate(sectionsToCreate);

      // 6. Create scheduled StudyBurst records, linking them to the new notes
      setGenerationStatus("Scheduling your study bursts...");
      if (planResult.bursts && planResult.bursts.length > 0) {
        const burstsToCreate = planResult.bursts.map(burst => {
          const scheduledDate = new Date();
          scheduledDate.setDate(today.getDate() + (burst.dayOffset || 0));
          
          // Link burst to the correct note section ID
          // Ensure linkedSectionIndex is a valid number and within bounds of createdNoteSections
          const linkedNoteSectionId = typeof burst.linkedSectionIndex === 'number' && burst.linkedSectionIndex >= 0 && createdNoteSections[burst.linkedSectionIndex]
            ? createdNoteSections[burst.linkedSectionIndex].id
            : null;

          return {
            ...burst,
            examId: newExam.id,
            scheduledDate: scheduledDate.toISOString().split('T')[0], // Store as YYYY-MM-DD
            isCompleted: false,
            masteryScore: 0,
            linkedNoteSection: linkedNoteSectionId // Assign the foreign key
          };
        });
        await StudyBurst.bulkCreate(burstsToCreate);
      } else {
        throw new Error("The AI could not generate a study plan from the provided materials.");
      }

      // 7. Navigate to the living study dashboard
      setGenerationStatus("Taking you to your study dashboard...");
      navigate(createPageUrl(`StudyDashboard?id=${newExam.id}`));

    } catch (err) {
      console.error("Failed to generate plan:", err);
      setError(err.message || "An unexpected error occurred. Please try again. Ensure your files have relevant content.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const getStepProgress = () => {
    return (currentStep / 3) * 100;
  };

  return (
    <>
      {isGeneratingPlan && <LoadingOverlay status={generationStatus} />}
      <div className="min-h-screen bg-gradient-to-br from-[var(--background)] to-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-[var(--soft-blue)] to-[var(--soft-purple)] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[var(--shadow-medium)]">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--foreground)] mb-4 leading-tight">
              Set Up Your Exam Prep
            </h1>
            <p className="text-lg text-[var(--text-muted)] leading-relaxed max-w-2xl mx-auto">
              Let's create your personalized study plan that adapts to your learning style and schedule.
            </p>
          </motion.div>

          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-[var(--text-muted)]">
                Step {currentStep} of 3
              </span>
              <span className="text-sm font-medium text-[var(--soft-blue)]">
                {Math.round(getStepProgress())}% Complete
              </span>
            </div>
            <Progress
              value={getStepProgress()}
              className="h-3 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-[var(--soft-blue)] [&>div]:to-[var(--soft-purple)] rounded-full"
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-8 rounded-2xl border-red-200 bg-red-50">
              <AlertDescription className="text-base text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="bg-white border-[var(--border)] shadow-[var(--shadow-medium)] rounded-3xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-[var(--soft-blue-light)] to-[var(--soft-purple-light)] p-8">
                    <CardTitle className="text-2xl font-bold text-[var(--soft-blue-dark)] flex items-center gap-3">
                      <BookOpen className="w-7 h-7" />
                      What Exam Are You Preparing For?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="space-y-4">
                      <Label htmlFor="examName" className="text-lg font-semibold text-[var(--foreground)]">
                        Exam Name
                      </Label>
                      <Input
                        id="examName"
                        placeholder="e.g., Organic Chemistry Midterm, History Finals"
                        value={examData.name}
                        onChange={(e) => setExamData(prev => ({ ...prev, name: e.target.value }))}
                        className="h-14 text-lg border-[var(--border)] focus:border-[var(--soft-blue)] focus:ring-2 focus:ring-[var(--soft-blue-light)] rounded-xl bg-white"
                      />
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="examDate" className="text-lg font-semibold text-[var(--foreground)]">
                        Exam Date
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                        <Input
                          id="examDate"
                          type="date"
                          value={examData.examDate}
                          onChange={(e) => setExamData(prev => ({ ...prev, examDate: e.target.value }))}
                          className="h-14 text-lg pl-12 border-[var(--border)] focus:border-[var(--soft-blue)] focus:ring-2 focus:ring-[var(--soft-blue-light)] rounded-xl bg-white"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="bg-white border-[var(--border)] shadow-[var(--shadow-medium)] rounded-3xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-[var(--soft-green-light)] to-[var(--soft-blue-light)] p-8">
                    <CardTitle className="text-2xl font-bold text-[var(--soft-green-dark)] flex items-center gap-3">
                      <UploadIcon className="w-7 h-7" />
                      Upload Your Study Materials
                    </CardTitle>
                    <p className="text-[var(--soft-green-dark)] text-lg mt-2">
                      Add your lectures, notes, PDFs, videos, and any other study resources.
                    </p>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    {/* Upload Area */}
                    <div
                      className={`relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 text-center ${
                        dragActive
                          ? "border-[var(--soft-blue)] bg-[var(--soft-blue-light)]"
                          : "border-[var(--border)] hover:border-[var(--text-muted)] hover:bg-slate-50"
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={SUPPORTED_FORMATS.join(',')}
                        onChange={handleFileInput}
                        className="hidden"
                      />

                      <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 rounded-3xl flex items-center justify-center border-2 border-[var(--border)]">
                          <UploadIcon className="w-12 h-12 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-2xl font-semibold text-[var(--foreground)] mb-3">
                          Drag & drop your files here
                        </h3>
                        <p className="text-lg text-[var(--text-muted)] mb-6">
                          or <span className="text-[var(--soft-blue)] font-semibold">click to browse</span>
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          Supports: PDF, PPT, Word, TXT, MP4, MOV, JPG, PNG (max 50MB each)
                        </p>
                      </div>
                    </div>

                    {/* Uploaded Files List */}
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-[var(--soft-green)]" />
                          Uploaded Files ({uploadedFiles.filter(f => f.status === 'completed').length})
                        </h4>
                        <div className="space-y-3">
                          {uploadedFiles.map((file) => {
                            const FileIcon = getFileIcon(file.type);
                            return (
                              <motion.div
                                key={file.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-[var(--border)]"
                              >
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border-2 border-[var(--border)]">
                                  <FileIcon className="w-5 h-5 text-[var(--text-muted)]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-[var(--foreground)] truncate">{file.name}</p>
                                  <p className="text-sm text-[var(--text-muted)]">{formatFileSize(file.size)}</p>
                                  {file.status === 'uploading' && (
                                    <div className="mt-2">
                                      <Progress
                                        value={uploadProgress[file.id] || 0}
                                        className="h-2 bg-slate-200 [&>div]:bg-[var(--soft-blue)] rounded-full"
                                      />
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {file.status === 'uploading' && (
                                    <Loader2 className="w-5 h-5 text-[var(--soft-blue)] animate-spin" />
                                  )}
                                  {file.status === 'completed' && (
                                    <CheckCircle2 className="w-5 h-5 text-[var(--soft-green)]" />
                                  )}
                                  {file.status === 'error' && (
                                    <Badge variant="destructive" className="text-xs">Error</Badge>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(file.id)}
                                    className="text-[var(--text-muted)] hover:text-red-600 p-1 h-8 w-8"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="bg-white border-[var(--border)] shadow-[var(--shadow-medium)] rounded-3xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-[var(--soft-purple-light)] to-[var(--soft-pink-light)] p-8">
                    <CardTitle className="text-2xl font-bold text-[var(--soft-purple-dark)] flex items-center gap-3">
                      <Target className="w-7 h-7" />
                      Personalize Your Study Plan
                    </CardTitle>
                    <p className="text-[var(--soft-purple-dark)] text-lg mt-2">
                      Tell us how you like to study. The AI will adapt the plan to your style.
                    </p>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">

                    <div>
                      <Label className="text-lg font-semibold text-[var(--foreground)] mb-4 block">
                        Preferred Session Length
                      </Label>
                      <RadioGroup
                        value={String(examData.preferredSessionLength)}
                        onValueChange={(value) => setExamData(prev => ({ ...prev, preferredSessionLength: Number(value) }))}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                      >
                        {[
                          { value: 25, label: "Short Bursts", description: "Quick, focused sprints." },
                          { value: 45, label: "Standard Session", description: "Balanced focus time." },
                          { value: 90, label: "Deep Dive", description: "For complex topics." },
                        ].map(option => (
                          <Label
                            key={option.value}
                            htmlFor={`session-${option.value}`} // Link label to radio button
                            className="flex flex-col items-center justify-center p-6 border-2 rounded-2xl cursor-pointer transition-all duration-200 has-[:checked]:border-[var(--soft-purple)] has-[:checked]:bg-[var(--soft-purple-light)]"
                          >
                            <RadioGroupItem value={String(option.value)} id={`session-${option.value}`} className="sr-only" />
                            <span className="text-xl font-bold">{option.value} min</span>
                            <span className="text-sm font-semibold mt-2">{option.label}</span>
                            <span className="text-xs text-[var(--text-muted)] mt-1">{option.description}</span>
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>

                    <div>
                      <Label htmlFor="focusAreas" className="text-lg font-semibold text-[var(--foreground)] mb-3 block">
                        Key Focus Areas (Optional)
                      </Label>
                      <Textarea
                        id="focusAreas"
                        placeholder="e.g., 'Focus more on Chapter 3 formulas', 'I struggle with the historical context of the 1800s'"
                        value={examData.focusAreas}
                        onChange={(e) => setExamData(prev => ({ ...prev, focusAreas: e.target.value }))}
                        className="h-28 text-base border-[var(--border)] focus:border-[var(--soft-purple)] focus:ring-2 focus:ring-[var(--soft-purple-light)] rounded-xl bg-white"
                      />
                    </div>

                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-12">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStep === 1 || isGeneratingPlan}
              className="h-12 px-6 rounded-xl border-[var(--border)] hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button
                onClick={handleNextStep}
                disabled={
                  (currentStep === 1 && !canProceedFromStep1()) ||
                  (currentStep === 2 && !canProceedFromStep2()) ||
                  isUploading ||
                  isGeneratingPlan
                }
                className="h-12 px-8 bg-gradient-to-r from-[var(--soft-blue)] to-[var(--soft-purple)] hover:opacity-90 text-white rounded-xl shadow-[var(--shadow-medium)] font-semibold"
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleGeneratePlan}
                disabled={isGeneratingPlan}
                className="h-14 px-10 text-lg bg-gradient-to-r from-[var(--soft-purple)] to-[var(--soft-blue)] hover:opacity-90 text-white rounded-xl shadow-[var(--shadow-medium)] font-bold"
              >
                <Sparkles className="w-5 h-5 mr-3" />
                {isGeneratingPlan ? "Generating..." : "Generate My Smart Plan"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
