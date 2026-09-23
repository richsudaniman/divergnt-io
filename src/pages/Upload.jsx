
import React, { useState, useRef } from "react";
import { ProcessedVideo } from "@/entities/ProcessedVideo";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Upload as UploadIcon, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Loader2 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

const SUPPORTED_FORMATS = ['video/mp4', 'video/mov', 'video/quicktime', 'video/avi'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

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
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file) => {
    setError(null);
    
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      setError("Please upload a video file (MP4, MOV, or AVI)");
      return;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be 50MB or less");
      return;
    }
    
    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const formatFileSize = (bytes) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      setError("Please select a file and provide a title");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const uploadTimer = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 95));
      }, 100);

      const { file_url } = await UploadFile({ file: selectedFile });
      
      clearInterval(uploadTimer);
      setUploadProgress(100);

      const videoRecord = await ProcessedVideo.create({
        title: title.trim(),
        original_filename: selectedFile.name,
        file_url: file_url,
        file_size: selectedFile.size,
        processing_status: "uploading"
      });

      setSuccess(true);
      
      setTimeout(() => {
        navigate(createPageUrl(`Processing?id=${videoRecord.id}`));
      }, 1200);

    } catch (error) {
      console.error("Upload error:", error);
      setError("Something went wrong during the upload. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-semibold text-[var(--foreground)] mb-6 leading-tight">
            Turn video into clarity.
          </h1>
          <p className="text-xl text-[var(--text-muted)] leading-relaxed max-w-xl mx-auto">
            Your unique brain deserves notes that work for you. Upload your lecture, and our AI creates personalized, digestible learning materials.
          </p>
        </motion.div>

        <Card className="border-[var(--border)] shadow-[var(--shadow-medium)] bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-10 space-y-10">
            {error && (
              <Alert variant="destructive" className="rounded-2xl border-[var(--error-red-main)]/30 bg-[var(--error-red-light)]">
                <AlertCircle className="h-5 w-5 text-[var(--error-red-dark)]" />
                <AlertDescription className="text-base text-[var(--error-red-dark)]">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Label htmlFor="title" className="text-lg font-semibold text-[var(--foreground)]">
                First, what's this video about?
              </Label>
              <Input
                id="title"
                placeholder="e.g., Intro to Quantum Physics"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-16 text-lg border-[var(--border)] focus:border-[var(--focus-purple-main)] focus:ring-2 focus:ring-[var(--focus-purple-light)] rounded-2xl bg-white"
              />
            </div>

            <div
              className={`relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 text-center ${
                dragActive 
                  ? "border-[var(--focus-purple-main)] bg-[var(--focus-purple-light)]" 
                  : "border-[var(--border)] hover:border-[var(--text-muted)]"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/mov,video/quicktime,video/avi"
                onChange={handleFileInput}
                className="hidden"
              />

              <AnimatePresence mode="wait">
                {selectedFile ? (
                  <motion.div
                    key="selected"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-20 h-20 mb-6 bg-[var(--serotonin-green-light)] rounded-3xl flex items-center justify-center border-2 border-[var(--serotonin-green-main)]/30">
                      <CheckCircle2 className="w-10 h-10 text-[var(--serotonin-green-dark)]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3 truncate max-w-full">
                      {selectedFile.name}
                    </h3>
                    <p className="text-lg text-[var(--text-muted)] mb-6">
                      {formatFileSize(selectedFile.size)} • Ready to process
                    </p>
                    <Button
                      variant="link"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[var(--focus-purple-main)] font-semibold text-base hover:text-[var(--focus-purple-dark)]"
                    >
                      Choose a different video
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-24 h-24 mx-auto mb-8 bg-slate-50 rounded-3xl flex items-center justify-center border border-[var(--border)]">
                      <UploadIcon className="w-12 h-12 text-[var(--text-muted)]" />
                    </div>
                    <h3 className="text-2xl font-semibold text-[var(--foreground)] mb-3">
                      Drag & drop your video
                    </h3>
                    <p className="text-lg text-[var(--text-muted)] mb-6">
                      or <span className="text-[var(--focus-purple-main)] font-semibold">click to browse</span>
                    </p>
                    <p className="text-base text-[var(--text-muted)]">
                      MP4, MOV, or AVI (max 50MB)
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isUploading && (
              <div className="space-y-4">
                <Progress 
                  value={uploadProgress} 
                  className="h-3 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-[var(--focus-purple-main)] [&>div]:to-[var(--dopamine-blue-main)] rounded-full" 
                />
                <p className="text-base font-medium text-center text-[var(--text-muted)]">
                  {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : "Finalizing..."}
                </p>
              </div>
            )}

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !title.trim() || isUploading || success}
                className="w-full h-16 text-xl font-semibold bg-gradient-to-r from-[var(--focus-purple-main)] to-[var(--dopamine-blue-main)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl shadow-lg transition-all duration-300"
              >
                {success ? (
                  <CheckCircle2 className="w-6 h-6 mr-3" />
                ) : isUploading ? (
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                ) : (
                  <Sparkles className="w-6 h-6 mr-3" />
                )}
                {success ? "Done!" : isUploading ? "Processing..." : "Create My Notes"}
              </Button>
            </motion.div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
