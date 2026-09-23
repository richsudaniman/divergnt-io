import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Brain, 
  Layers,
  ArrowRight,
  Lightbulb,
  Trophy,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

const TOOLS = [
  {
    id: 'creation_lab',
    title: 'Creation Lab',
    subtitle: 'Build & Learn',
    description: 'Turn concepts into comics, social media posts, or songs in 30-minute creative projects.',
    icon: Sparkles,
    color: 'bg-gradient-to-br from-[var(--soft-pink-light)] to-[var(--soft-yellow-light)]',
    textColor: 'text-[var(--soft-pink-dark)]',
    accentColor: 'text-[var(--soft-pink)]',
  },
  {
    id: 'analogical_analysis',
    title: 'Analogical Analysis',
    subtitle: 'Explain in Your Terms',
    description: 'Use guided analogies to deconstruct complex topics into familiar concepts.',
    icon: Lightbulb,
    color: 'bg-gradient-to-br from-[var(--soft-yellow-light)] to-[var(--soft-pink-light)]',
    textColor: 'text-[var(--soft-yellow-dark)]',
    accentColor: 'text-[var(--soft-yellow)]',
  },
  {
    id: 'application_generator',
    title: 'Application Generation',
    subtitle: 'Create Original Examples',
    description: 'Challenge yourself to generate real-world applications and scenarios.',
    icon: Trophy,
    color: 'bg-gradient-to-br from-[var(--soft-purple-light)] to-[var(--soft-blue-light)]',
    textColor: 'text-[var(--soft-purple-dark)]',
    accentColor: 'text-[var(--soft-purple)]',
  },
  {
    id: 'dynamicqa',
    title: 'Practice Questions',
    subtitle: 'Test Your Knowledge',
    description: 'Answer auto-generated questions to test your recall and understanding.',
    icon: Brain,
    color: 'bg-gradient-to-br from-[var(--soft-green-light)] to-[var(--soft-blue-light)]',
    textColor: 'text-[var(--soft-green-dark)]',
    accentColor: 'text-[var(--soft-green)]',
  },
  {
    id: 'flashcards',
    title: 'Flashcard Review',
    subtitle: 'Quick Recall Practice',
    description: 'Generate and review key term flashcards from your notes.',
    icon: Layers,
    color: 'bg-gradient-to-br from-[var(--soft-blue-light)] to-[var(--soft-purple-light)]',
    textColor: 'text-[var(--soft-blue-dark)]',
    accentColor: 'text-[var(--soft-blue)]',
  }
];

export default function ModeSelector({ onToolSelect }) {
  return (
    <div className="space-y-10">
      <motion.div
        key="tools"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        {TOOLS.map((tool) => (
          <Card
            key={tool.id}
            className="cursor-pointer hover:shadow-[var(--shadow-medium)] transition-all duration-300 border-[var(--border)] bg-white rounded-3xl overflow-hidden group hover:border-[var(--soft-blue)]/40 hover:scale-[1.02]"
            onClick={() => onToolSelect(tool.id)}
          >
            <CardHeader className={`${tool.color} ${tool.textColor} p-8`}>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-[var(--shadow-subtle)]">
                  <tool.icon className="w-8 h-8" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-medium">{tool.title}</CardTitle>
                  <p className="text-lg opacity-80 font-normal mt-1">{tool.subtitle}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <p className="text-[var(--text-muted)] mb-6 leading-relaxed text-lg">
                {tool.description}
              </p>
              <div className="flex items-center justify-end">
                <ArrowRight className={`w-6 h-6 text-[var(--text-muted)] group-hover:${tool.accentColor} transition-colors`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </div>
  );
}