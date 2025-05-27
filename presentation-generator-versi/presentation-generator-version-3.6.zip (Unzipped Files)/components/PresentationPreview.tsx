
import React from 'react';
import { generateFullRevealHtmlPage } from '../utils/htmlGenerator'; 

interface PresentationPreviewProps {
  htmlContent: string | null; 
  chosenTheme: string | null;
  // chosenTransition prop removed
}

const PresentationPreview: React.FC<PresentationPreviewProps> = ({ htmlContent, chosenTheme }) => {
  if (!htmlContent || !chosenTheme) { // chosenTransition removed from check
    return <div className="text-center p-8 text-slate-400">No presentation content or theme to display.</div>;
  }

  const fullHtml = generateFullRevealHtmlPage(htmlContent, chosenTheme); // chosenTransition argument removed

  return (
    <div className="w-full aspect-[16/9] bg-slate-900 rounded-lg shadow-lg border border-slate-700">
      <iframe
        srcDoc={fullHtml}
        title="Presentation Preview"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms" 
      />
    </div>
  );
};

export default PresentationPreview;