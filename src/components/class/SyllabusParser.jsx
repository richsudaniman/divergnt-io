import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Trash2,
  Plus,
  GraduationCap,
  Target,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseSyllabus } from '@/functions/parseSyllabus';
import { Task } from '@/entities/Task';

export default function SyllabusParser({ classId, onTasksCreated }) {
  const [syllabusText, setSyllabusText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [parsedResults, setParsedResults] = useState(null);
  const [error, setError] = useState(null);
  const [editingAssignments, setEditingAssignments] = useState({});

  const handleParseSyllabus = async () => {
    if (!syllabusText.trim()) {
      setError('Please paste your syllabus or course schedule first.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setParsedResults(null);

    try {
      setProcessingStep('Analyzing your comprehensive syllabus...');
      const { data } = await parseSyllabus({ syllabusText });
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to parse syllabus');
      }

      setParsedResults(data);
      setProcessingStep('Parsing complete!');
    } catch (error) {
      console.error('Error parsing syllabus:', error);
      setError(error.message || 'Failed to parse syllabus. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditAssignment = (index, field, value) => {
    setEditingAssignments(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
    }));
  };

  const getEditedAssignment = (assignment, index) => {
    return {
      ...assignment,
      ...editingAssignments[index]
    };
  };

  const handleRemoveAssignment = (index) => {
    setParsedResults(prev => ({
      ...prev,
      assignments: prev.assignments.filter((_, i) => i !== index)
    }));
  };

  const handleCreateTasks = async () => {
    if (!parsedResults || !parsedResults.assignments || parsedResults.assignments.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      setProcessingStep('Creating tasks from your assignments...');
      
      const tasksToCreate = parsedResults.assignments.map((assignment, index) => {
        const editedAssignment = getEditedAssignment(assignment, index);
        return {
          name: editedAssignment.name,
          description: editedAssignment.description || `${editedAssignment.type} for this class`,
          deadline: editedAssignment.dueDate,
          classId: classId,
          processingStatus: 'pending' // Will be processed by AI to break into phases
        };
      });

      // Bulk create tasks
      await Task.bulkCreate(tasksToCreate);
      
      // Reset state
      setSyllabusText('');
      setParsedResults(null);
      setEditingAssignments({});
      
      // Callback to refresh parent component
      if (onTasksCreated) {
        onTasksCreated();
      }

      setProcessingStep('Tasks created successfully!');
    } catch (error) {
      console.error('Error creating tasks:', error);
      setError('Failed to create tasks. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getAssignmentTypeColor = (type) => {
    const colors = {
      exam: 'bg-red-100 text-red-800',
      midterm: 'bg-red-100 text-red-800',
      final: 'bg-red-100 text-red-800',
      quiz: 'bg-orange-100 text-orange-800', 
      test: 'bg-orange-100 text-orange-800',
      essay: 'bg-blue-100 text-blue-800',
      paper: 'bg-blue-100 text-blue-800',
      project: 'bg-green-100 text-green-800',
      assignment: 'bg-purple-100 text-purple-800',
      homework: 'bg-purple-100 text-purple-800',
      reading: 'bg-yellow-100 text-yellow-800',
      discussion: 'bg-indigo-100 text-indigo-800',
      presentation: 'bg-pink-100 text-pink-800',
      lab: 'bg-emerald-100 text-emerald-800',
      report: 'bg-cyan-100 text-cyan-800'
    };
    return colors[type?.toLowerCase()] || 'bg-slate-100 text-slate-800';
  };

  if (parsedResults) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-6"
        >
          <div className="text-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-slate-900">
              Successfully Parsed Your Syllabus
            </h3>
            <p className="text-sm text-slate-600">
              Found {parsedResults.assignments?.length || 0} assignments and comprehensive course information
            </p>
          </div>

          <Tabs defaultValue="assignments" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="assignments">
                Assignments ({parsedResults.assignments?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="overview">Course Overview</TabsTrigger>
              <TabsTrigger value="policies">Policies & Info</TabsTrigger>
            </TabsList>
            
            <TabsContent value="assignments" className="space-y-4">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {parsedResults.assignments?.map((assignment, index) => {
                  const editedAssignment = getEditedAssignment(assignment, index);
                  return (
                    <Card key={index} className="border border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={getAssignmentTypeColor(editedAssignment.type)}>
                                {editedAssignment.type}
                              </Badge>
                              {editedAssignment.points && (
                                <Badge variant="outline">
                                  {editedAssignment.points} points
                                </Badge>
                              )}
                              {editedAssignment.weight && (
                                <Badge variant="outline">
                                  {editedAssignment.weight}% of grade
                                </Badge>
                              )}
                            </div>
                            
                            <input
                              type="text"
                              value={editedAssignment.name}
                              onChange={(e) => handleEditAssignment(index, 'name', e.target.value)}
                              className="w-full font-semibold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                            />
                            
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Calendar className="w-4 h-4" />
                              <input
                                type="date"
                                value={editedAssignment.dueDate}
                                onChange={(e) => handleEditAssignment(index, 'dueDate', e.target.value)}
                                className="bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                              />
                              {editedAssignment.dueTime && (
                                <span className="text-slate-500">at {editedAssignment.dueTime}</span>
                              )}
                            </div>
                            
                            {editedAssignment.description && (
                              <textarea
                                value={editedAssignment.description}
                                onChange={(e) => handleEditAssignment(index, 'description', e.target.value)}
                                className="w-full text-sm text-slate-600 bg-transparent border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                rows={3}
                              />
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAssignment(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="overview" className="space-y-4">
              {parsedResults.courseInfo && (
                <div className="space-y-4">
                  {parsedResults.courseInfo.objectives && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Target className="w-5 h-5 text-blue-600" />
                          Learning Objectives
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
                          {parsedResults.courseInfo.objectives.map((objective, index) => (
                            <li key={index}>{objective}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {parsedResults.courseInfo.schedule && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-green-600" />
                          Course Schedule
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm">
                          {parsedResults.courseInfo.schedule.map((item, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                              <div className="font-semibold text-slate-700 min-w-20">
                                {item.week || item.date}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-slate-800">{item.topic}</div>
                                {item.readings && (
                                  <div className="text-slate-600 mt-1">Readings: {item.readings}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {parsedResults.courseInfo.gradingBreakdown && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <GraduationCap className="w-5 h-5 text-purple-600" />
                          Grading Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Object.entries(parsedResults.courseInfo.gradingBreakdown).map(([category, percentage]) => (
                            <div key={category} className="flex justify-between items-center">
                              <span className="capitalize text-slate-700">{category}</span>
                              <span className="font-semibold text-slate-900">{percentage}%</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="policies" className="space-y-4">
              {parsedResults.policies && (
                <div className="space-y-4">
                  {Object.entries(parsedResults.policies).map(([key, value]) => (
                    value && (
                      <Card key={key}>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2 capitalize">
                            <Info className="w-5 h-5 text-amber-600" />
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {value}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                setParsedResults(null);
                setEditingAssignments({});
                setError(null);
              }}
              variant="outline"
              className="flex-1"
            >
              Start Over
            </Button>
            <Button
              onClick={handleCreateTasks}
              disabled={isProcessing || !parsedResults.assignments?.length}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Tasks...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create {parsedResults.assignments?.length || 0} Tasks
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Paste your complete course syllabus here...&#10;&#10;Include everything: course description, objectives, schedule, assignments, exams, grading policies, attendance policies, etc.&#10;&#10;The more comprehensive your syllabus, the more detailed information we can extract to help organize your semester!"
        value={syllabusText}
        onChange={(e) => setSyllabusText(e.target.value)}
        className="min-h-[300px] text-sm resize-y"
      />

      <div className="text-xs text-slate-500 space-y-1">
        <p><strong>💡 Pro tip:</strong> Include your entire syllabus for best results!</p>
        <p>We can extract: assignments, exams, due dates, grading breakdown, course schedule, policies, and learning objectives.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleParseSyllabus}
        disabled={isProcessing || !syllabusText.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {processingStep}
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Parse Complete Syllabus
          </>
        )}
      </Button>

      <p className="text-xs text-slate-500 text-center">
        Our advanced AI can handle complex syllabuses with tables, multiple sections, and various formatting styles
      </p>
    </div>
  );
}