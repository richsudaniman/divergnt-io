
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainDump } from '@/entities/BrainDump';
import { Exam } from '@/entities/Exam';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  FolderOpen,
  Sparkles,
  Loader2,
  CheckCircle,
  FileText,
  BookOpen
} from 'lucide-react';
import { debounce } from 'lodash';
import VoiceRecorder from "../components/VoiceRecorder";
import { updateUserProgress } from '@/functions/updateUserProgress';

export default function BrainDumpPage() {
  const navigate = useNavigate();

  const [dumpId, setDumpId] = useState(null);
  const [title, setTitle] = useState('');
  const [linkedExamId, setLinkedExamId] = useState('');
  const [availableExams, setAvailableExams] = useState([]);
  const [brainDumpText, setBrainDumpText] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('structured');
  const [inputMode, setInputMode] = useState('text');

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const lastSavedState = useRef({
    title: '',
    linkedExamId: '',
    brainDumpText: '',
  });

  // Placeholder text rotation
  const placeholders = [
    "Dump your thoughts here... messy is perfectly fine!",
    "Let your ideas flow freely... we'll organize them later",
    "Brain fog? Just start typing anything that comes to mind",
    "No structure needed - that's what AI is for!",
    "Stream of consciousness welcome here",
    "Half-formed thoughts are the best thoughts"
  ];
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);

  const loadExams = useCallback(async () => {
    try {
      const exams = await Exam.list('-created_date');
      setAvailableExams(exams);
    } catch (error) {
      console.error('Error loading exams:', error);
      setAvailableExams([]);
    }
  }, []);

  const createInitialDump = useCallback(async () => {
    try {
      const newDump = await BrainDump.create({
        title: 'Untitled Brain Dump',
        processing_status: 'raw',
        raw_text_content: ''
      });
      setDumpId(newDump.id);
      setTitle('Untitled Brain Dump');
      setBrainDumpText('');
      setLinkedExamId('');

      lastSavedState.current = { title: 'Untitled Brain Dump', linkedExamId: '', brainDumpText: '' };

      navigate(createPageUrl(`BrainDump?id=${newDump.id}`), { replace: true });

      // Track brain dump creation for Academic Weapon score
      try {
        await updateUserProgress({
          activityType: 'brain_dump_created',
          metadata: {}
        });
      } catch (progressError) {
        console.log('Progress tracking failed (non-critical):', progressError);
      }
    } catch (error) {
      console.error('Error creating initial dump:', error);
    }
  }, [navigate, setDumpId, setTitle, setBrainDumpText, setLinkedExamId]);

  const loadExistingDump = useCallback(async (id) => {
    try {
      const dumps = await BrainDump.filter({ id });
      if (dumps.length > 0) {
        const dump = dumps[0];
        setDumpId(dump.id);
        setTitle(dump.title || 'Untitled Brain Dump');
        setLinkedExamId(dump.linked_exam_id || '');
        setBrainDumpText(dump.raw_text_content || '');

        lastSavedState.current = {
          title: dump.title || 'Untitled Brain Dump',
          linkedExamId: dump.linked_exam_id || '',
          brainDumpText: dump.raw_text_content || '',
        };
      } else {
        await createInitialDump();
      }
    } catch (error) {
      console.error('Error loading existing dump:', error);
      await createInitialDump();
    }
  }, [createInitialDump, setDumpId, setTitle, setLinkedExamId, setBrainDumpText]); // Added state setters for loadExistingDump dependencies

  const initializePage = useCallback(async () => {
    try {
      await loadExams();

      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id');
      if (id) {
        await loadExistingDump(id);
      } else {
        await createInitialDump();
      }
    } catch (error) {
      console.error('Error initializing page:', error);
    }
  }, [loadExams, loadExistingDump, createInitialDump]);

  useEffect(() => {
    if (!isInitialized) {
      initializePage();
      setIsInitialized(true);
    }
  }, [isInitialized, initializePage]);

  // Rotate placeholders every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder(prev => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  const saveDumpData = useCallback(async (currentTitle, currentLinkedExamId, currentText) => {
    if (!dumpId) return;

    const currentState = {
      title: currentTitle || 'Untitled Brain Dump',
      linkedExamId: currentLinkedExamId || '',
      brainDumpText: currentText || '',
    };

    const hasChanges = (
      currentState.title !== lastSavedState.current.title ||
      currentState.linkedExamId !== lastSavedState.current.linkedExamId ||
      currentState.brainDumpText !== lastSavedState.current.brainDumpText
    );

    if (!hasChanges) return;

    setIsSaving(true);
    try {
      await BrainDump.update(dumpId, {
        title: currentState.title,
        linked_exam_id: currentState.linkedExamId || null,
        raw_text_content: currentState.brainDumpText,
      });

      lastSavedState.current = currentState;
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving dump:', error);
    } finally {
      setIsSaving(false);
    }
  }, [dumpId]); // setIsSaving and setLastSaved are state setters, React guarantees their stability

  const debouncedSave = useCallback(
    debounce((currentTitle, currentLinkedExamId, currentText) => {
      saveDumpData(currentTitle, currentLinkedExamId, currentText);
    }, 2000),
    [saveDumpData]
  );

  useEffect(() => {
    if (isInitialized) {
      debouncedSave(title, linkedExamId, brainDumpText);
    }
    return () => debouncedSave.cancel();
  }, [title, linkedExamId, brainDumpText, isInitialized, debouncedSave]);

  const handleProcessDump = async () => {
    if (!dumpId || !brainDumpText.trim()) return;

    debouncedSave.flush();

    try {
      await new Promise(res => setTimeout(res, 200));
      await BrainDump.update(dumpId, { processing_status: 'analyzing' });
      navigate(createPageUrl(`BrainDumpResults?id=${dumpId}`));
    } catch (error) {
      console.error('Error processing dump:', error);
    }
  };

  const handleVoiceTranscript = (transcriptText) => {
    // Add the transcribed text to the existing brain dump text
    const newText = brainDumpText ? `${brainDumpText}\n\n${transcriptText}` : transcriptText;
    setBrainDumpText(newText);
  };

  const formats = [
    {
      id: 'structured',
      label: 'Beautiful Notes',
      description: 'Organized cards with chaos bubbles and insights',
      icon: Sparkles
    },
    {
      id: 'cornell',
      label: 'Cornell Notes',
      description: 'Questions, answers, and summary in Cornell format',
      icon: BookOpen
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Brain Dump → Beautiful Notes
          </h1>
          <p className="text-lg text-gray-600">
            Transform your unique thought patterns into structured, personalized notes that actually make sense to you
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">

          {/* Header Controls */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Input
                placeholder="Give your brain dump a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg h-12 border-gray-300 focus:border-blue-500 rounded-xl"
              />
              <Select value={linkedExamId} onValueChange={setLinkedExamId}>
                <SelectTrigger className="h-12 border-gray-300 rounded-xl">
                  <SelectValue placeholder="Connect to a class (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No Class</SelectItem>
                  {availableExams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        {exam.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Format Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Choose your note style:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formats.map((format) => {
                  const IconComponent = format.icon;
                  return (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        selectedFormat === format.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <IconComponent className={`w-5 h-5 ${
                          selectedFormat === format.id ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                        <span className={`font-semibold ${
                          selectedFormat === format.id ? 'text-blue-900' : 'text-gray-700'
                        }`}>
                          {format.label}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        selectedFormat === format.id ? 'text-blue-700' : 'text-gray-500'
                      }`}>
                        {format.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Input Methods Tabs */}
          <div className="mb-6">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
              <button
                onClick={() => setInputMode('text')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  inputMode === 'text'
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                ✏️ Type It Out
              </button>
              <button
                onClick={() => setInputMode('voice')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  inputMode === 'voice'
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                🎤 Voice Record
              </button>
            </div>
          </div>

          {/* Input Content Area */}
          <div className="mb-6">
            {inputMode === 'text' ? (
              <div className="relative">
                <Textarea
                  value={brainDumpText}
                  onChange={(e) => setBrainDumpText(e.target.value)}
                  placeholder={placeholders[currentPlaceholder]}
                  className="min-h-[400px] text-base leading-relaxed resize-none border-gray-300 focus:border-blue-500 rounded-xl p-6"
                />

                {/* Floating placeholder animation */}
                {!brainDumpText && (
                  <div className="absolute top-6 left-6 pointer-events-none">
                    <div
                      key={currentPlaceholder}
                      className="text-gray-400 italic animate-pulse"
                    >
                      {placeholders[currentPlaceholder]}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <VoiceRecorder onTranscriptReceived={handleVoiceTranscript} />

                {/* Show accumulated text */}
                {brainDumpText && (
                  <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Your Brain Dump Content
                    </h4>
                    <div className="max-h-60 overflow-y-auto">
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{brainDumpText}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between">
            {/* Save Status */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {isSaving && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {lastSaved && !isSaving && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Saved</span>
                </>
              )}
            </div>

            {/* Transform Button */}
            <Button
              onClick={handleProcessDump}
              disabled={!brainDumpText.trim() || isSaving}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Create Beautiful Notes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
