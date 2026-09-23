
import React, { useState, useEffect } from "react";
import { ProcessedVideo } from "@/entities/ProcessedVideo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  FileText, 
  Clock, 
  Calendar,
  Eye,
  Loader2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      const videoData = await ProcessedVideo.list("-created_date");
      setVideos(videoData);
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.original_filename.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusProps = (status) => {
    const props = {
      completed: { text: "Ready", color: "bg-[var(--serotonin-green-light)] text-[var(--serotonin-green-dark)] border-[var(--serotonin-green-main)]/30" },
      processing: { text: "Processing", color: "bg-[var(--info-cyan-light)] text-[var(--info-cyan-dark)] border-[var(--info-cyan-main)]/30" }, 
      transcribing: { text: "Processing", color: "bg-[var(--info-cyan-light)] text-[var(--info-cyan-dark)] border-[var(--info-cyan-main)]/30" },
      uploading: { text: "Processing", color: "bg-[var(--info-cyan-light)] text-[var(--info-cyan-dark)] border-[var(--info-cyan-main)]/30" },
      error: { text: "Error", color: "bg-[var(--error-red-light)] text-[var(--error-red-dark)] border-[var(--error-red-main)]/30" }
    };
    return props[status] || { text: status, color: "bg-gray-100 text-gray-800 border-gray-200" };
  };

  const formatFileSize = (bytes) => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16"
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12">
          <div>
            <p className="text-lg text-[var(--text-muted)] font-medium mb-3">Welcome back! 👋</p>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-[var(--foreground)] leading-tight tracking-tighter">
              Your Learning Hub
            </h1>
          </div>
          <Link to={createPageUrl("Upload")}>
            <Button className="bg-gradient-to-r from-[var(--dopamine-blue-main)] to-[var(--focus-purple-main)] hover:opacity-90 h-14 px-8 text-lg font-bold text-white rounded-2xl shadow-lg hover:shadow-[var(--shadow-medium)] transition-all duration-300">
              <Plus className="w-6 h-6 mr-3" />
              New Video Notes
            </Button>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <Input
            placeholder="Search your notes by title or filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-14 h-16 text-lg border-[var(--border)] focus:border-[var(--dopamine-blue-main)] focus:ring-2 focus:ring-[var(--dopamine-blue-light)] rounded-2xl bg-white shadow-sm"
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-[var(--dopamine-blue-main)] animate-spin" />
          </div>
        ) : filteredVideos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32 bg-white rounded-3xl shadow-[var(--shadow-soft)] border border-[var(--border)]"
          >
            <div className="w-24 h-24 bg-slate-50 rounded-full mx-auto mb-8 flex items-center justify-center">
              <FileText className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-3xl font-bold text-[var(--foreground)] mb-4">
              {videos.length > 0 ? 'No matching notes found' : 'Your learning journey starts here'}
            </h3>
            <p className="text-lg text-[var(--text-muted)] mb-12 max-w-md mx-auto leading-relaxed">
              {videos.length > 0
                ? 'Try a different search term to find what you\'re looking for.'
                : 'Upload your first video and let our AI create notes that work perfectly for your unique learning style.'}
            </p>
            {videos.length === 0 && (
              <Link to={createPageUrl("Upload")}>
                <Button className="bg-gradient-to-r from-[var(--dopamine-blue-main)] to-[var(--focus-purple-main)] hover:opacity-90 h-14 px-8 rounded-2xl shadow-lg font-bold text-white">
                  <Plus className="w-5 h-5 mr-3" />
                  Process First Video
                </Button>
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <Card 
                    className="border-[var(--border)] shadow-[var(--shadow-soft)] bg-white hover:shadow-[var(--shadow-medium)] transition-all duration-300 rounded-3xl flex flex-col h-full group cursor-pointer hover:border-[var(--dopamine-blue-main)]/50"
                    onClick={() => video.processing_status === 'completed' && navigate(createPageUrl(`Results?id=${video.id}`))}
                >
                  <CardHeader className="pb-4 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle className="text-xl font-bold text-[var(--foreground)] line-clamp-2 leading-tight">
                        {video.title}
                      </CardTitle>
                      <Badge className={`${getStatusProps(video.processing_status).color} border text-sm py-1.5 px-4 rounded-full font-semibold`}>
                        {getStatusProps(video.processing_status).text}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 flex-grow flex flex-col p-6 pt-0">
                    <div className="text-base text-[var(--text-muted)] space-y-4 flex-grow">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <span className="truncate">{video.original_filename}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        <span>{format(new Date(video.created_date), 'MMMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="pt-4 mt-auto">
                        {video.processing_status === 'completed' ? (
                          <Button className="w-full h-12 text-base rounded-xl bg-[var(--dopamine-blue-main)] hover:bg-[var(--dopamine-blue-dark)] text-white transition-all duration-300 font-bold">
                            <Eye className="w-5 h-5 mr-3" />
                            View Notes
                          </Button>
                        ) : video.processing_status === 'error' ? (
                           <Button variant="outline" className="w-full h-12 text-base rounded-xl border-[var(--error-red-main)]/50 bg-[var(--error-red-light)] text-[var(--error-red-dark)] hover:bg-red-100 font-semibold">
                               Retry
                           </Button>
                        ) : (
                          <Button variant="outline" className="w-full h-12 text-base rounded-xl border-[var(--border)] bg-slate-50 text-slate-500 cursor-wait">
                            <Clock className="w-5 h-5 mr-3 animate-spin" />
                            In Progress
                          </Button>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
