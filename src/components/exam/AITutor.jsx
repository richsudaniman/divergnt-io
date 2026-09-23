import React, { useState, useRef, useEffect } from 'react';
import { InvokeLLM } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';

const AITutorMessage = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--focus-purple-main)] to-[var(--dopamine-blue-main)] flex items-center justify-center flex-shrink-0"><Sparkles className="w-5 h-5 text-white"/></div>}
      <div className={`p-4 rounded-2xl max-w-sm md:max-w-md lg:max-w-lg ${isUser ? 'bg-[var(--dopamine-blue-main)] text-white rounded-br-none' : 'bg-slate-100 text-[var(--foreground)] rounded-bl-none'}`}>
        {message.content}
      </div>
    </div>
  );
};

export default function AITutor({ materials, examName, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I'm your AI Tutor for the ${examName} exam. Ask me anything about your study materials!` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const materialContext = materials.map(m => `File: ${m.fileName}, URL: ${m.fileUrl}`).join('\n');
      const prompt = `
        You are an AI Tutor helping a student prepare for their "${examName}" exam.
        Your knowledge is strictly limited to the content within the provided study materials.
        If a question is outside this scope, politely state that you can only answer questions based on the uploaded content.
        
        Study Materials Context:
        ---
        ${materialContext}
        ---

        Student's Question: "${input}"

        Your task is to provide a clear, concise, and helpful answer based ONLY on the context from the file URLs.
        Use ADHD-friendly explanation techniques: analogies, simple language, and step-by-step breakdowns where appropriate.
      `;

      const result = await InvokeLLM({ prompt, file_urls: materials.map(m => m.fileUrl) });
      const assistantMessage = { role: 'assistant', content: result };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI Tutor error:", error);
      const errorMessage = { role: 'assistant', content: "I'm sorry, I encountered an error. Please try asking again." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-lg h-[70vh] bg-white rounded-3xl shadow-[var(--shadow-large)] flex flex-col border border-[var(--border)] overflow-hidden"
    >
      <header className="p-4 border-b flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--focus-purple-main)] to-[var(--dopamine-blue-main)] flex items-center justify-center flex-shrink-0"><Sparkles className="w-6 h-6 text-white"/></div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">AI Tutor</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5"/></Button>
      </header>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, index) => <AITutorMessage key={index} message={msg} />)}
        {isLoading && <div className="flex justify-start"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)] ml-12"/></div>}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-4 border-t bg-white">
        <div className="flex items-center gap-2">
          <Textarea 
            placeholder="Ask a question..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
            className="h-12 resize-none"
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="h-12 w-12 flex-shrink-0 rounded-full">
            <Send className="w-5 h-5"/>
          </Button>
        </div>
      </footer>
    </motion.div>
  );
}