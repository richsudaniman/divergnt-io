import React, { useState } from 'react';
import { Image } from 'lucide-react';

const MermaidRenderer = ({ code }) => {
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[var(--border)] min-h-[200px]">
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 bg-[var(--accent)] px-4 py-2 rounded-xl">
          <Image className="w-5 h-5 text-[var(--muted-foreground)]" />
          <span className="text-sm font-medium text-[var(--muted-foreground)]">Conceptual Diagram</span>
        </div>
      </div>
      
      <div className="bg-[var(--accent)] p-4 rounded-xl mb-4 text-center">
        <p className="text-[var(--muted-foreground)] text-sm mb-3">
          This diagram shows the conceptual relationship between different elements in this topic.
        </p>
        <button
          onClick={() => setShowCode(!showCode)}
          className="text-[var(--primary)] hover:underline text-sm font-medium"
        >
          {showCode ? 'Hide' : 'View'} diagram structure
        </button>
      </div>

      {showCode && (
        <div className="bg-[var(--foreground)] text-white p-4 rounded-xl font-mono text-sm overflow-x-auto">
          <pre className="whitespace-pre-wrap">{code}</pre>
        </div>
      )}
    </div>
  );
};

export default MermaidRenderer;