import React from 'react';

const MathRenderer = ({ equation, className = "" }) => {
  // Simple math rendering - converts basic LaTeX patterns to readable format
  const renderMath = (mathString) => {
    if (!mathString) return mathString;
    
    // Remove outer $$ if present
    let cleaned = mathString.replace(/^\$\$?|\$\$?$/g, '');
    
    // Convert subscripts: _x -> subscript
    cleaned = cleaned.replace(/_([a-zA-Z0-9]+)/g, '<sub>$1</sub>');
    
    // Convert superscripts: ^x -> superscript  
    cleaned = cleaned.replace(/\^([a-zA-Z0-9]+)/g, '<sup>$1</sup>');
    
    // Convert fractions: \frac{a}{b} -> a/b with styling
    cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span class="fraction"><span class="numerator">$1</span><span class="denominator">$2</span></span>');
    
    // Convert Greek letters
    const greekLetters = {
      '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
      '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ',
      '\\lambda': 'λ', '\\mu': 'μ', '\\pi': 'π', '\\sigma': 'σ',
      '\\tau': 'τ', '\\phi': 'φ', '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
      '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Pi': 'Π',
      '\\Sigma': 'Σ', '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω'
    };
    
    Object.keys(greekLetters).forEach(latex => {
      cleaned = cleaned.replace(new RegExp(latex.replace('\\', '\\\\'), 'g'), greekLetters[latex]);
    });
    
    // Convert common math symbols
    cleaned = cleaned.replace(/\\times/g, '×');
    cleaned = cleaned.replace(/\\div/g, '÷');
    cleaned = cleaned.replace(/\\pm/g, '±');
    cleaned = cleaned.replace(/\\leq/g, '≤');
    cleaned = cleaned.replace(/\\geq/g, '≥');
    cleaned = cleaned.replace(/\\neq/g, '≠');
    cleaned = cleaned.replace(/\\approx/g, '≈');
    cleaned = cleaned.replace(/\\infty/g, '∞');
    cleaned = cleaned.replace(/\\sum/g, '∑');
    cleaned = cleaned.replace(/\\int/g, '∫');
    
    return cleaned;
  };

  return (
    <div className={className}>
      <style jsx>{`
        .fraction {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          margin: 0 4px;
          font-size: 0.9em;
        }
        .numerator {
          border-bottom: 1px solid currentColor;
          padding-bottom: 2px;
          margin-bottom: 2px;
        }
        .denominator {
          padding-top: 2px;
        }
      `}</style>
      <span 
        dangerouslySetInnerHTML={{ 
          __html: renderMath(equation) 
        }} 
      />
    </div>
  );
};

export default MathRenderer;