import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  X,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function NextTaskSuggestion({ suggestion, onClose, onRefresh }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartTask = async () => {
    setIsLoading(true);
    
    // Navigate to the progressive task view
    if (suggestion.taskId) {
      navigate(createPageUrl(`TaskProgressiveView?id=${suggestion.taskId}`));
    }
    
    setIsLoading(false);
    onClose();
  };

  const handleGetNewSuggestion = () => {
    onRefresh();
  };

  if (!suggestion.hasSuggestion) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
      >
        <Card className="w-full max-w-lg bg-white shadow-xl rounded-3xl">
          <CardHeader className="bg-green-50 p-8 rounded-t-3xl relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-green-900">
              All Done! 🎉
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center">
            <p className="text-lg text-slate-700 mb-6">
              {suggestion.message}
            </p>
            <Button
              onClick={onClose}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl"
            >
              Awesome!
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <Card className="w-full max-w-2xl bg-white shadow-xl rounded-3xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 p-8 rounded-t-3xl relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-slate-900">
            What Should I Do Next?
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Main Suggestion */}
            <div className="bg-slate-50 rounded-2xl p-6 border-2 border-blue-200">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {suggestion.suggestion}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-700">AI Recommendation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reasoning */}
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Why this makes sense right now:
              </h4>
              <p className="text-amber-800 leading-relaxed">{suggestion.reasoning}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handleStartTask}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-14 text-lg font-semibold rounded-xl shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Start This Task
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleGetNewSuggestion}
                variant="outline"
                className="px-6 h-14 text-base font-medium rounded-xl border-2"
              >
                Different Suggestion
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}