import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Exam } from '@/entities/Exam';
import { StudyNotesSection } from '@/entities/StudyNotesSection';
import { createPageUrl } from '@/utils';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  BookOpen,
  Target,
  Loader2,
  Calculator,
  BarChart3,
  GitBranch,
  HelpCircle,
  Layers,
  ChevronRight,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

import MermaidRenderer from '../components/learning/MermaidRenderer';
import { BarChart, LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TAG_COLORS = {
  "Definition/Vocabulary": "bg-blue-100 text-blue-800 border-blue-200",
  "Linear Sequence": "bg-green-100 text-green-800 border-green-200", 
  "Systems/Relationships": "bg-purple-100 text-purple-800 border-purple-200",
  "Abstract/High-Level": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Quantitative/Formulaic": "bg-orange-100 text-orange-800 border-orange-200",
  "Cause & Effect/Decision Trees": "bg-pink-100 text-pink-800 border-pink-200",
  "Narrative/Story": "bg-indigo-100 text-indigo-800 border-indigo-200"
};

export default function StudyNotesViewerPage() {
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [noteSections, setNoteSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const examId = urlParams.get('id');
    
    if (examId) {
      loadExamAndNotes(examId);
    } else {
      setError("No exam ID provided");
      setLoading(false);
    }
  }, []);

  const loadExamAndNotes = async (examId) => {
    setLoading(true);
    try {
      const examData = await Exam.filter({ id: examId });
      if (examData.length === 0) {
        setError("Exam not found");
        return;
      }
      
      setExam(examData[0]);
      
      const sections = await StudyNotesSection.filter({ examId }, 'sectionOrder');
      setNoteSections(sections);
      
    } catch (error) {
      console.error("Error loading exam and notes:", error);
      setError("Failed to load study notes");
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (section, index) => {
    // Extract chunks for this section (fallback to splitting content)
    const chunks = section.note_chunks && section.note_chunks.length > 0
      ? section.note_chunks
      : section.content.split(/^## /m).filter(chunk => chunk.trim()).map((chunk, idx) => ({
          chunk_id: idx,
          text: chunk.startsWith('## ') ? chunk : `## ${chunk}`,
          tags: ["General"]
        }));

    return (
      <motion.div
        key={section.id || index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16"
      >
        <div className="space-y-8">
          {chunks.map((chunk, chunkIndex) => {
            // Extract title from chunk content
            const titleMatch = chunk.text.match(/^##\s*(.*)/m);
            const title = titleMatch ? titleMatch[1].trim() : `Section ${chunkIndex + 1}`;
            const content = chunk.text.replace(/^##\s*(.*)/, '').trim();

            return (
              <Card 
                key={chunk.chunk_id || chunkIndex}
                className="bg-white border-[var(--border)] shadow-[var(--shadow-soft)] rounded-3xl overflow-hidden hover:shadow-[var(--shadow-medium)] transition-all duration-300"
              >
                <CardContent className="p-0">
                  {/* Tags */}
                  {chunk.tags && chunk.tags.length > 0 && (
                    <div className="px-8 pt-8 pb-4">
                      <div className="flex flex-wrap gap-3">
                        {chunk.tags.map((tag, tagIndex) => (
                          <Badge 
                            key={tagIndex}
                            className={`${TAG_COLORS[tag] || 'bg-gray-100 text-gray-800 border-gray-200'} px-4 py-2 text-sm font-medium rounded-full border`}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Title with left border */}
                  <div className="px-8 pb-6">
                    <div className="border-l-4 border-pink-500 pl-6">
                      <h2 className="text-3xl font-bold text-[var(--foreground)] mb-6">
                        {title}
                      </h2>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-8 pb-8">
                    <div className="prose prose-lg max-w-none text-[var(--foreground)]">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-4 mt-8">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4 mt-6 flex items-center gap-3">
                              <Target className="w-5 h-5 text-pink-500" />
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3 mt-4">
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p className="text-lg leading-relaxed text-[var(--foreground)] mb-4">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="space-y-3 mb-6">
                              {children}
                            </ul>
                          ),
                          li: ({ children }) => (
                            <li className="flex items-start gap-3 text-lg leading-relaxed">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-3 flex-shrink-0"></div>
                              <span>{children}</span>
                            </li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-blue-600">
                              {children}
                            </strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic text-[var(--text-muted)]">
                              {children}
                            </em>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-[var(--focus-purple-main)] pl-6 py-4 bg-[var(--focus-purple-light)] rounded-r-xl my-6">
                              <div className="text-[var(--focus-purple-dark)] font-medium">
                                {children}
                              </div>
                            </blockquote>
                          ),
                          code: ({ inline, children }) => {
                            if (inline) {
                              return (
                                <code className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-sm font-mono">
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto my-4">
                                <code className="text-sm font-mono">{children}</code>
                              </pre>
                            );
                          }
                        }}
                      >
                        {content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Equations */}
                  {section.equations_found && section.equations_found.length > 0 && (
                    <div className="px-8 pb-6">
                      <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-[var(--focus-purple-main)]" />
                        Key Equations
                      </h3>
                      <div className="space-y-4">
                        {section.equations_found.map((eq, eqIndex) => (
                          <Card key={eqIndex} className="bg-[var(--focus-purple-light)] border-[var(--focus-purple-main)]/20">
                            <CardContent className="p-6">
                              <div className="text-center mb-4">
                                <code className="text-xl font-mono bg-white px-4 py-2 rounded-lg shadow-sm">
                                  {eq.equation}
                                </code>
                              </div>
                              <p className="text-[var(--focus-purple-dark)] mb-4 font-medium">
                                {eq.purpose}
                              </p>
                              {eq.variables && eq.variables.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {eq.variables.map((variable, varIndex) => (
                                    <div key={varIndex} className="flex items-start gap-3 text-sm">
                                      <code className="bg-white px-2 py-1 rounded font-mono text-[var(--focus-purple-dark)] font-semibold">
                                        {variable.value}
                                      </code>
                                      <div>
                                        <p className="text-[var(--focus-purple-dark)] font-medium">
                                          {variable.description}
                                        </p>
                                        {variable.unit && (
                                          <p className="text-[var(--focus-purple-dark)]/70 text-xs">
                                            Unit: {variable.unit}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diagrams */}
                  {section.diagrams && section.diagrams.length > 0 && (
                    <div className="px-8 pb-6">
                      <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-[var(--serotonin-green-main)]" />
                        Visual Diagrams
                      </h3>
                      <div className="space-y-6">
                        {section.diagrams.map((diagram, diagramIndex) => (
                          <Card key={diagramIndex} className="bg-[var(--serotonin-green-light)] border-[var(--serotonin-green-main)]/20">
                            <CardContent className="p-6">
                              <h4 className="text-lg font-semibold text-[var(--serotonin-green-dark)] mb-4">
                                {diagram.title}
                              </h4>
                              <div className="bg-white rounded-xl p-4 mb-4 overflow-x-auto">
                                <MermaidRenderer code={diagram.code} />
                              </div>
                              <p className="text-[var(--serotonin-green-dark)] leading-relaxed">
                                {diagram.recap}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Charts */}
                  {section.charts && section.charts.length > 0 && (
                    <div className="px-8 pb-8">
                      <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[var(--info-cyan-main)]" />
                        Data Visualizations
                      </h3>
                      <div className="space-y-6">
                        {section.charts.map((chart, chartIndex) => (
                          <Card key={chartIndex} className="bg-[var(--info-cyan-light)] border-[var(--info-cyan-main)]/20">
                            <CardContent className="p-6">
                              <h4 className="text-lg font-semibold text-[var(--info-cyan-dark)] mb-4">
                                {chart.title}
                              </h4>
                              <div className="bg-white rounded-xl p-4 mb-4" style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  {chart.type === 'bar' ? (
                                    <BarChart data={chart.data}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="label" />
                                      <YAxis />
                                      <Tooltip />
                                      <Bar dataKey="value" fill="#06B6D4" />
                                    </BarChart>
                                  ) : (
                                    <LineChart data={chart.data}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="label" />
                                      <YAxis />
                                      <Tooltip />
                                      <Line type="monotone" dataKey="value" stroke="#06B6D4" strokeWidth={2} />
                                    </LineChart>
                                  )}
                                </ResponsiveContainer>
                              </div>
                              <p className="text-[var(--info-cyan-dark)] leading-relaxed">
                                {chart.caption}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Section Practice Tools */}
        <div className="mt-8 flex gap-4 justify-center">
          <Button 
            variant="outline"
            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl px-6 py-3"
          >
            <HelpCircle className="w-5 h-5 mr-2" />
            Practice Questions
          </Button>
          <Button 
            variant="outline"
            className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 rounded-xl px-6 py-3"
          >
            <Layers className="w-5 h-5 mr-2" />
            Flashcards
          </Button>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--dopamine-blue-main)] mx-auto mb-4" />
          <p className="text-lg text-[var(--text-muted)]">Loading your study notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <Button onClick={() => navigate(createPageUrl('exam-prep-history'))}>
            Back to Exam History
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--background)] to-slate-50 flex">
      {/* Sidebar Table of Contents */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-80 bg-white/80 backdrop-blur-xl border-r border-[var(--border)] p-6 overflow-y-auto"
          >
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(createPageUrl('exam-prep-history'))}
                  className="hover:bg-slate-100 rounded-xl"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-lg font-bold text-[var(--foreground)]">Study Notes</h2>
                  {exam && (
                    <p className="text-sm text-[var(--text-muted)]">{exam.name}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">
                Table of Contents
              </h3>
              {noteSections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => setCurrentSectionIndex(index)}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                    currentSectionIndex === index
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-[var(--focus-purple-dark)] shadow-sm border border-slate-200'
                      : 'hover:bg-slate-50 text-[var(--text-muted)]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    currentSectionIndex === index
                      ? 'bg-[var(--dopamine-blue-main)] text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{section.title}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${
                    currentSectionIndex === index ? 'rotate-90' : ''
                  }`} />
                </button>
              ))}
            </div>

            {/* Navigation Controls */}
            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))}
                  disabled={currentSectionIndex === 0}
                  className="flex-1"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentSectionIndex(Math.min(noteSections.length - 1, currentSectionIndex + 1))}
                  disabled={currentSectionIndex === noteSections.length - 1}
                  className="flex-1"
                >
                  Next
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-[var(--border)] p-4 flex items-center gap-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-[var(--foreground)]">
            {noteSections[currentSectionIndex]?.title}
          </h1>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            {noteSections.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <BookOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
                  No Study Notes Yet
                </h3>
                <p className="text-[var(--text-muted)] mb-8">
                  Notes will appear here once your exam prep plan is generated.
                </p>
                <Button 
                  onClick={() => navigate(createPageUrl(`StudyDashboard?id=${exam?.id}`))}
                  className="bg-[var(--dopamine-blue-main)] hover:bg-[var(--dopamine-blue-dark)] text-white rounded-xl"
                >
                  Back to Study Dashboard
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key={currentSectionIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderSection(noteSections[currentSectionIndex], currentSectionIndex)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}