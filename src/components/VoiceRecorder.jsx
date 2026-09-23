
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { speechToText } from '@/functions/speechToText';

export default function VoiceRecorder({ onTranscriptReceived, className = "" }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState(null);
  const [error, setError] = useState(null);

  // Microphone selection states
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [showDeviceSelection, setShowDeviceSelection] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);

  // Load available microphone devices
  const loadAudioDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    setError(null);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');

      console.log('🎤 Available audio devices:', audioInputs);
      setAvailableDevices(audioInputs);

      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }

      setShowDeviceSelection(true);
    } catch (error) {
      console.error('❌ Error loading audio devices:', error);
      if (error.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access to select devices.');
      } else {
        setError('Failed to load microphone devices. Please check your microphone connection.');
      }
    } finally {
      setIsLoadingDevices(false);
    }
  }, [selectedDeviceId]);

  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording with device:', selectedDeviceId);
      setError(null);

      const constraints = {
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available from selected microphone');
      }

      console.log('🎵 Using microphone:', audioTracks[0].label);

      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ Recording stopped, processing audio...');

        if (audioChunksRef.current.length === 0) {
          console.error('❌ No audio data recorded');
          setError('No audio data was recorded. Please try again.');
          return;
        }

        const mimeType = options.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        console.log('✅ Audio blob created:', audioBlob.size, 'bytes');
        setRecordedAudio(audioUrl);
        setAudioBlob(audioBlob);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event.error);
        setError(`Recording error: ${event.error.message}`);
        setIsRecording(false);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      setRecordedAudio(null);
      setAudioBlob(null);
      setTranscriptionResult(null);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('❌ Error starting recording:', error);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (error.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone permissions and refresh the page.');
      } else if (error.name === 'NotFoundError') {
        setError('Selected microphone not found. Please check your microphone connection.');
      } else if (error.name === 'NotSupportedError') {
        setError('Recording is not supported in this browser. Please try Chrome or Firefox.');
      } else {
        setError(`Failed to start recording: ${error.message}`);
      }
    }
  };

  const stopRecording = () => {
    console.log('🛑 Stopping recording...');

    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playRecording = async () => {
    if (audioRef.current && recordedAudio) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('❌ Error playing audio:', error);
        setError(`Playback error: ${error.message}`);
        setIsPlaying(false);
      }
    }
  };

  // Convert ArrayBuffer to base64 using FileReader (prevents stack overflow)
  const convertToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        // Extract just the base64 data part (remove data:audio/...;base64, prefix)
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const transcribeAudio = async () => {
    if (!audioBlob) {
      setError('No audio to transcribe');
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      console.log('🔤 Starting transcription...');
      console.log('📊 Audio blob size:', audioBlob.size, 'bytes');
      console.log('📊 Audio blob type:', audioBlob.type);

      // Convert blob to base64 using FileReader (prevents stack overflow)
      const base64String = await convertToBase64(audioBlob);

      console.log('📤 Sending base64 audio with Base44 SDK...');
      console.log('📊 Base64 length:', base64String.length);
      
      const response = await speechToText({
        audioData: base64String,
        mimeType: audioBlob.type || 'audio/webm'
      });
      
      console.log('📥 Full response from speechToText:', response);

      if (!response || !response.data) {
        throw new Error('No response data received from SDK function.');
      }

      const result = response.data;
      console.log('📥 Transcription response data:', result);

      if (result.success && result.text && result.text.trim()) {
        console.log('✅ Transcription successful:', result.text);
        setTranscriptionResult(result);
        onTranscriptReceived(result.text);
      } else {
        console.error('❌ Transcription failed or no text received');
        console.error('❌ Result details:', result);
        
        // Enhanced error message based on error type
        let userFriendlyError = result.error || result.details || 'No speech detected in the recording.';
        
        // Check for specific error types
        if (userFriendlyError.includes('payment') || userFriendlyError.includes('subscription')) {
          userFriendlyError = '⚠️ Speech-to-text service has a billing issue. Please contact support or try again later.';
        } else if (userFriendlyError.includes('API key')) {
          userFriendlyError = '⚠️ Speech-to-text service is not properly configured. Please contact support.';
        } else if (userFriendlyError.includes('Empty') || userFriendlyError.includes('no speech')) {
          userFriendlyError = '🎤 No speech detected. Please try speaking louder and closer to the microphone.';
        }
        
        setError(userFriendlyError);
      }
    } catch (error) {
      console.error('❌ Transcription error:', error);
      
      // Enhanced error handling
      let userFriendlyError = 'Failed to transcribe audio. ';
      
      if (error.message.includes('500')) {
        userFriendlyError += 'The speech-to-text service encountered an error. Please try again or contact support.';
      } else if (error.message.includes('401') || error.message.includes('403')) {
        userFriendlyError += 'Authentication issue with speech-to-text service. Please contact support.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        userFriendlyError += 'Network connection issue. Please check your internet and try again.';
      } else {
        userFriendlyError += error.message;
      }
      
      setError(userFriendlyError);
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const clearRecording = () => {
    setRecordedAudio(null);
    setAudioBlob(null);
    setRecordingTime(0);
    setTranscriptionResult(null);
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Load devices on mount
  useEffect(() => {
    loadAudioDevices();
  }, [loadAudioDevices]);

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg rounded-2xl overflow-hidden">
        <CardContent className="p-6 space-y-6">

          {/* Device Selection */}
          {showDeviceSelection && availableDevices.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Settings className="w-4 h-4" />
                Select Microphone
              </div>
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a microphone" />
                </SelectTrigger>
                <SelectContent>
                  {availableDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 8)}...`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
          )}

          {/* Recording Controls */}
          <div className="text-center space-y-4">
            <AnimatePresence mode="wait">
              {!showDeviceSelection && isLoadingDevices && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  <p className="text-slate-600">Loading microphones...</p>
                </motion.div>
              )}

              {!isRecording && !recordedAudio && showDeviceSelection && (
                <motion.div
                  key="start"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Button
                    onClick={startRecording}
                    disabled={!selectedDeviceId}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg transition-all duration-300 disabled:opacity-50"
                  >
                    <Mic className="w-8 h-8" />
                  </Button>
                  <p className="text-slate-600 mt-4 text-lg">
                    Tap to start recording
                  </p>
                  {availableDevices.length > 0 && selectedDeviceId && (
                    <p className="text-slate-500 text-sm mt-2">
                      Using: {availableDevices.find(d => d.deviceId === selectedDeviceId)?.label || 'Selected microphone'}
                    </p>
                  )}
                </motion.div>
              )}

              {isRecording && (
                <motion.div
                  key="recording"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white"
                    >
                      <MicOff className="w-8 h-8" />
                    </motion.div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-2xl font-mono text-red-600 font-bold">
                      {formatTime(recordingTime)}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-600 font-medium">Recording...</span>
                    </div>
                  </div>

                  <Button
                    onClick={stopRecording}
                    variant="outline"
                    className="border-red-500 text-red-600 hover:bg-red-50"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Recording
                  </Button>
                </motion.div>
              )}

              {recordedAudio && (
                <motion.div
                  key="playback"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Audio Player */}
                  <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Recorded Audio</span>
                      <span className="text-slate-500 font-mono">{formatTime(recordingTime)}</span>
                    </div>

                    <audio
                      ref={audioRef}
                      src={recordedAudio}
                      preload="metadata"
                      onCanPlay={() => console.log('🎵 Audio can play')}
                      onError={(e) => {
                        console.error('❌ Audio error:', e);
                        setError('Audio playback error. The recording may be corrupted.');
                      }}
                      onEnded={() => setIsPlaying(false)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      className="hidden"
                    />

                    <div className="flex items-center justify-center gap-4">
                      <Button
                        onClick={playRecording}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-4 h-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Play
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={clearRecording}
                        variant="ghost"
                        className="text-slate-500"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  {/* Transcription */}
                  {!transcriptionResult && (
                    <Button
                      onClick={transcribeAudio}
                      disabled={isTranscribing}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white rounded-xl h-12"
                    >
                      {isTranscribing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Converting speech to text...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 mr-2" />
                          Add to Brain Dump
                        </>
                      )}
                    </Button>
                  )}

                  {transcriptionResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-50 border border-green-200 rounded-xl p-6"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-800">Successfully added to brain dump!</span>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <p className="text-slate-700 italic">"{transcriptionResult.text}"</p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{error}</span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
