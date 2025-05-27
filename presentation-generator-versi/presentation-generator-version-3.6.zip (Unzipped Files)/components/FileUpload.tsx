
import React, { useState, useCallback } from 'react';
import { DocumentArrowUpIcon } from './Icons';
import * as pdfjsLib from 'pdfjs-dist';

// Specify the workerSrc for pdfjsLib. THIS IS CRUCIAL.
// Using the same CDN version as in index.html import map for consistency.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;


interface FileUploadProps {
  onFileUpload: (content: string, fileName?: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [localFileName, setLocalFileName] = useState<string | null>(null); // Renamed to avoid confusion
  const [error, setError] = useState<string | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
    }
    return fullText;
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTextTypes = ['text/plain', 'text/markdown', 'application/json'];
      const validNameEndings = ['.txt', '.md', '.json'];
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      
      const isValidTextFile = validTextTypes.includes(file.type) || validNameEndings.some(ending => file.name.endsWith(ending));

      if (!isValidTextFile && !isPdf) {
        setError('Invalid file type. Please upload a .txt, .md, .json, or .pdf file.');
        setLocalFileName(null);
        onFileUpload('', undefined); 
        return;
      }
      
      setError(null);
      setLocalFileName(file.name);

      if (isPdf) {
        setIsProcessingPdf(true);
        try {
          const textContent = await extractTextFromPdf(file);
          onFileUpload(textContent, file.name); // Pass filename here
        } catch (e) {
          console.error("Error processing PDF:", e);
          setError('Error processing PDF file. It might be corrupted, protected, or too large for browser processing.');
          onFileUpload('', file.name); // Pass filename even on error
        } finally {
          setIsProcessingPdf(false);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          onFileUpload(content, file.name); // Pass filename here
        };
        reader.onerror = () => {
          setError('Error reading file.');
          setLocalFileName(null);
          onFileUpload('', undefined);
        }
        reader.readAsText(file);
      }
    } else {
      setLocalFileName(null);
      onFileUpload('', undefined);
      setError(null);
    }
  }, [onFileUpload]);

  return (
    <div className="w-full">
      <label htmlFor="file-upload-input" className="block text-sm font-medium text-slate-300 mb-1">
        Upload Data File (.txt, .md, .json, .pdf)
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md hover:border-sky-500 transition-colors">
        <div className="space-y-1 text-center">
          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-slate-500" />
          <div className="flex text-sm text-slate-400">
            <label
              htmlFor="file-upload-input"
              className={`relative cursor-pointer bg-slate-700 rounded-md font-medium text-sky-400 hover:text-sky-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-800 focus-within:ring-sky-500 px-2 py-1 ${isProcessingPdf ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>{isProcessingPdf ? 'Processing PDF...' : (localFileName ? 'Change file' : 'Upload a file')}</span>
              <input id="file-upload-input" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".txt,.md,.json,.pdf,text/plain,text/markdown,application/json,application/pdf" disabled={isProcessingPdf} />
            </label>
            {!isProcessingPdf && !localFileName && <p className="pl-1">or drag and drop</p>}
          </div>
          {localFileName && <p className="text-xs text-slate-500 mt-1">{localFileName} {isProcessingPdf ? '(Processing...)' : ''}</p>}
          {!localFileName && <p className="text-xs text-slate-500">PDFs: any size (large files may take time/impact performance). Other files: check limits if any.</p>}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
};

export default FileUpload;