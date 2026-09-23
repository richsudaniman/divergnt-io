import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  ExternalLink,
  X,
  Loader2,
  Sparkles,
  BookOpen,
  FlaskConical,
  Presentation,
  Calculator
} from 'lucide-react';
import { motion } from 'framer-motion';
import { createDocumentTemplate } from '@/functions/createDocumentTemplate';

const TEMPLATE_TYPES = {
  essay: {
    icon: FileText,
    name: 'Essay/Paper',
    description: 'Research paper or essay with thesis, outline, and structure',
    color: 'from-blue-500 to-indigo-500'
  },
  lab_report: {
    icon: FlaskConical,
    name: 'Lab Report',
    description: 'Scientific report with Introduction, Methods, Results, Discussion',
    color: 'from-green-500 to-emerald-500'
  },
  presentation: {
    icon: Presentation,
    name: 'Presentation',
    description: 'Slide outline and presentation structure',
    color: 'from-purple-500 to-pink-500'
  },
  problem_set: {
    icon: Calculator,
    name: 'Problem Set',
    description: 'Math/problem-solving with step-by-step structure',
    color: 'from-orange-500 to-red-500'
  },
  general: {
    icon: BookOpen,
    name: 'General Document',
    description: 'Basic document structure with helpful prompts',
    color: 'from-slate-500 to-gray-500'
  }
};

export default function TemplateSelector({ step, task, onClose, onTemplateCreated }) {
  const [isCreating, setIsCreating] = useState(false);
  const [creationStatus, setCreationStatus] = useState('');

  // Determine the best template type based on step content
  const determineTemplateType = () => {
    const content = (step.title + ' ' + step.description + ' ' + task.name).toLowerCase();
    
    if (content.includes('lab') || content.includes('experiment') || content.includes('methods') || content.includes('results')) {
      return 'lab_report';
    }
    if (content.includes('essay') || content.includes('paper') || content.includes('research') || content.includes('thesis')) {
      return 'essay';
    }
    if (content.includes('presentation') || content.includes('slides') || content.includes('present')) {
      return 'presentation';
    }
    if (content.includes('problem') || content.includes('math') || content.includes('calculate') || content.includes('solve')) {
      return 'problem_set';
    }
    return 'general';
  };

  const recommendedType = determineTemplateType();

  const handleCreateTemplate = async (templateType, platform) => {
    setIsCreating(true);
    setCreationStatus(`Creating ${TEMPLATE_TYPES[templateType].name} template...`);

    try {
      const { data } = await createDocumentTemplate({
        stepTitle: step.title,
        stepDescription: step.description,
        taskName: task.name,
        taskDeadline: task.deadline,
        templateType,
        platform
      });

      if (data.success) {
        if (platform === 'google_docs' && data.documentUrl) {
          // Open Google Docs in new tab
          window.open(data.documentUrl, '_blank');
          setCreationStatus('Document created! Opening in new tab...');
        } else if (platform === 'download' && data.downloadUrl) {
          // Trigger download
          const link = document.createElement('a');
          link.href = data.downloadUrl;
          link.download = data.fileName || 'template.docx';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setCreationStatus('Template downloaded!');
        }

        // Close modal after brief success display
        setTimeout(() => {
          onTemplateCreated();
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      setCreationStatus('Error creating template. Please try again.');
      setTimeout(() => {
        setIsCreating(false);
        setCreationStatus('');
      }, 2000);
    }
  };

  if (isCreating) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
      >
        <Card className="w-full max-w-md bg-white shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Creating Your Template</h3>
            <p className="text-slate-600">{creationStatus}</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <Card className="w-full max-w-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-600" />
                Choose Your Template
              </CardTitle>
              <p className="text-slate-600 mt-2">Get started instantly with a pre-structured template</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Task Context */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-slate-800 mb-2">Current Step:</h4>
            <p className="text-slate-700 font-medium">{step.title}</p>
            <p className="text-slate-600 text-sm mt-1">{step.description}</p>
            {recommendedType !== 'general' && (
              <Badge className="mt-3 bg-blue-100 text-blue-800">
                Recommended: {TEMPLATE_TYPES[recommendedType].name}
              </Badge>
            )}
          </div>

          {/* Template Options */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800">Select Template Type:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(TEMPLATE_TYPES).map(([key, template]) => {
                const Icon = template.icon;
                const isRecommended = key === recommendedType;
                
                return (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isRecommended ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 bg-gradient-to-br ${template.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-semibold text-slate-800">{template.name}</h5>
                            {isRecommended && (
                              <Badge className="text-xs bg-blue-100 text-blue-800">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{template.description}</p>
                          
                          {/* Platform Options */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleCreateTemplate(key, 'google_docs')}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Google Docs
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCreateTemplate(key, 'download')}
                              className="text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            <p><strong>💡 Pro tip:</strong> Your template will include the assignment title, due date, and helpful structure to get you started immediately!</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}