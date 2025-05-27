
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { AppStep, InitialAIResponse, EnhancedAIResponse, UserProvidedImage, AISuggestedImage, SearchResultItem, AvailableModel } from './types';
import { GeminiService } from './services/geminiService'; 
import FileUpload from './components/FileUpload';
import NumberInput from './components/NumberInput';
import PresentationPreview from './components/PresentationPreview';
import ImageInputForm from './components/ImageInputForm';
import LoadingSpinner from './components/LoadingSpinner';
import Button from './components/Button';
import Header from './components/Header';
import StepIndicator from './components/StepIndicator';
import ModelSelector from './components/ModelSelector'; // New component
import { ChevronDownIcon, ChevronUpIcon, ClipboardDocumentIcon, DocumentArrowDownIcon, SparklesIcon, ArrowPathIcon, PlayIcon, CogIcon, DocumentTextIcon, LightBulbIcon, MagnifyingGlassIcon, EyeIcon, CheckIcon, InformationCircleIcon, GlobeAltIcon, PaletteIcon } from './components/Icons'; // FilmIcon removed
import { generateFullRevealHtmlPage, validThemes } from './utils/htmlGenerator'; // validTransitions removed from direct import if not used elsewhere


const App: React.FC = () => {
  const [uploadedData, setUploadedData] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [topicQuery, setTopicQuery] = useState<string>('');
  const [webPageUrl, setWebPageUrl] = useState<string>(''); 
  
  const [includeFileData, setIncludeFileData] = useState<boolean>(false);
  const [includePastedText, setIncludePastedText] = useState<boolean>(false);
  const [includeTopicQuery, setIncludeTopicQuery] = useState<boolean>(false);
  const [includeWebPageUrl, setIncludeWebPageUrl] = useState<boolean>(false); 
  const [useSearchForTopic, setUseSearchForTopic] = useState<boolean>(true); 
  
  const [minSlides, setMinSlides] = useState<number>(5);
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.SETUP);
  
  const [initialAIResponse, setInitialAIResponse] = useState<InitialAIResponse | null>(null);
  const [enhancedAIResponse, setEnhancedAIResponse] = useState<EnhancedAIResponse | null>(null);
  const [pptxTextContent, setPptxTextContent] = useState<string | null>(null);
  
  const [userImageInputs, setUserImageInputs] = useState<UserProvidedImage[]>([]);
  const [userEnhancementRequests, setUserEnhancementRequests] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showPreview, setShowPreview] = useState<boolean>(false); 
  const [showAiSuggestions, setShowAiSuggestions] = useState<boolean>(true);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(true);
  const [showPptxText, setShowPptxText] = useState<boolean>(true);

  const [displayTheme, setDisplayTheme] = useState<string | null>(null);
  // displayTransition state is removed

  const defaultModel: AvailableModel = 'gemini-2.5-pro-preview-05-06';
  const [selectedModel, setSelectedModel] = useState<AvailableModel>(defaultModel);
  const availableModels: AvailableModel[] = [
    'gemini-2.5-pro-preview-05-06',
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.5-flash-preview-04-17',
  ];

  const geminiService = useMemo(() => {
    try {
      return new GeminiService();
    } catch (e) {
      console.error("Failed to instantiate GeminiService:", e);
      const errorMessage = `Critical: Failed to initialize AI Service. ${e instanceof Error ? e.message : String(e)}. Please ensure API_KEY is correctly set.`;
      setError(prevError => prevError ? `${prevError}\n${errorMessage}` : errorMessage);
      return null; 
    }
  }, []); 
  
  const getActiveSearchResults = (): SearchResultItem[] | undefined => {
    if (currentStep === AppStep.ENHANCED_HTML_READY || currentStep === AppStep.PPT_TEXT_READY) {
      if (enhancedAIResponse?.search_results && enhancedAIResponse.search_results.length > 0) return enhancedAIResponse.search_results;
    }
    if (initialAIResponse?.search_results && initialAIResponse.search_results.length > 0) return initialAIResponse.search_results;
    return undefined;
  }

  const handleFileUpload = (content: string, fileName?: string) => {
    setUploadedData(content);
    setUploadedFileName(fileName || null);
    if (content && fileName) {
        setIncludeFileData(true); 
    } else {
        setIncludeFileData(false);
    }
  };


  const handleGenerateInitial = async () => {
    if (!geminiService) {
      setError("AI Service is not available. Cannot generate presentation.");
      return;
    }
    const inputParts: string[] = [];
    let isAnyInputSelected = false;

    if (includeFileData && uploadedData) {
      inputParts.push(`\n\n--- START OF UPLOADED FILE CONTENT (${uploadedFileName || 'unknown file'}) ---\n${uploadedData}\n--- END OF UPLOADED FILE CONTENT ---`);
      isAnyInputSelected = true;
    }
    if (includePastedText && pastedText.trim()) {
      inputParts.push(`\n\n--- START OF PASTED TEXT ---\n${pastedText.trim()}\n--- END OF PASTED TEXT ---`);
      isAnyInputSelected = true;
    }
    if (includeWebPageUrl && webPageUrl.trim()) { 
      inputParts.push(`\n\n--- START OF USER-PROVIDED URL FOR CONTEXT ---\n${webPageUrl.trim()}\n--- END OF USER-PROVIDED URL FOR CONTEXT ---`);
      isAnyInputSelected = true;
    }
    if (includeTopicQuery && topicQuery.trim()) {
      inputParts.push(`\n\n--- TOPIC FOR PRESENTATION (Search ${useSearchForTopic ? 'ENABLED' : 'DISABLED - use internal knowledge'}) ---\n${topicQuery.trim()}\n--- END OF TOPIC ---`);
      isAnyInputSelected = true;
    }


    if (isNaN(minSlides) || minSlides <= 0) {
       setError("Please specify a valid positive number for minimum slides.");
       return;
    }
    if (!isAnyInputSelected) {
      setError("Please select at least one input source (file, text, URL, or topic) and provide content for it.");
      return;
    }

    let dataToProcess: string;
    let finalGenerationMode: 'data' | 'topic';
    let finalUseSearch: boolean = (includeTopicQuery && topicQuery.trim() !== '' && useSearchForTopic);

    const onlyTopicSelected = includeTopicQuery && topicQuery.trim() && 
                              ! (includeFileData && uploadedData) && 
                              ! (includePastedText && pastedText.trim()) &&
                              ! (includeWebPageUrl && webPageUrl.trim()); 

    if (onlyTopicSelected) {
      dataToProcess = topicQuery.trim();
      finalGenerationMode = 'topic';
    } else {
      dataToProcess = inputParts.join("").trim(); 
      finalGenerationMode = 'data'; 
    }
    
    setIsLoading(true);
    setError(null);
    setInitialAIResponse(null); 
    setEnhancedAIResponse(null); 
    setPptxTextContent(null);
    setDisplayTheme(null); 
    setCurrentStep(AppStep.GENERATING_INITIAL);
    try {
      const response = await geminiService.generateInitialPresentation(
          dataToProcess, 
          minSlides, 
          finalGenerationMode, 
          selectedModel,
          finalUseSearch 
      );
      setInitialAIResponse(response);
      setDisplayTheme(response.chosen_theme); 
      setUserImageInputs(response.image_suggestions.map(s => ({ 
        type: 'ai_suggested', 
        suggestion_reference: s.slide_reference, 
        url: '', 
        description: s.description, // This becomes the editable description
        original_ai_description: s.description // Store AI's original suggestion
      })));
      setCurrentStep(AppStep.INITIAL_HTML_READY);
    } catch (e: any) {
      console.error("Error in handleGenerateInitial:", e);
      setError(`Error generating initial presentation: ${e.message || 'Unknown error'}`);
      setCurrentStep(AppStep.SETUP);
    }
    setIsLoading(false);
  };

  const handleProceedToEnhancementInput = () => {
    setCurrentStep(AppStep.AWAITING_USER_IMAGE_ENHANCEMENT_INPUT);
  }

  const handleRefineFurther = () => {
    const baseStep = enhancedAIResponse ? AppStep.ENHANCED_HTML_READY : (initialAIResponse ? AppStep.INITIAL_HTML_READY : AppStep.SETUP);
    if (!enhancedAIResponse && !initialAIResponse) {
      setError("Cannot refine further without a presentation to start from.");
      setCurrentStep(baseStep); 
      return;
    }
    setUserEnhancementRequests(''); 
    setPptxTextContent(null); 
    setCurrentStep(AppStep.AWAITING_USER_IMAGE_ENHANCEMENT_INPUT);
  };

  const handleGenerateEnhanced = async () => {
    if (!geminiService) {
      setError("AI Service is not available. Cannot enhance presentation.");
      return;
    }
    const baseHtmlForEnhancement = enhancedAIResponse?.enhanced_html_content || initialAIResponse?.html_content;

    if (!baseHtmlForEnhancement) {
      setError("Base presentation HTML for enhancement is missing.");
      setCurrentStep(initialAIResponse ? AppStep.INITIAL_HTML_READY : AppStep.SETUP);
      return;
    }
    setIsLoading(true);
    setError(null);
    setCurrentStep(AppStep.GENERATING_ENHANCED);
    try {
      const response = await geminiService.enhancePresentation(
        baseHtmlForEnhancement,
        userImageInputs, 
        userEnhancementRequests,
        selectedModel
      );
      
      let finalEnhancedHtml = response.enhanced_html_content;
      // Replace placeholders for AI-generated images
      userImageInputs.forEach((img, index) => {
        // Only replace if the URL is a data URI (meaning it was AI generated and successfully fetched)
        // and if the type is 'ai_suggested' or a user_defined image that was generated
        if (img.url.startsWith('data:image')) { 
            // The placeholder in the HTML should be `ai_image_ref:INDEX_OF_USER_IMAGE_INPUTS_ARRAY`
            const placeholder = `ai_image_ref:${index}`;
            // Escape placeholder for regex
            const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Regex for src='ai_image_ref:X' or src="ai_image_ref:X"
            const srcAttrRegex = new RegExp(`src=(['"])${escapedPlaceholder}\\1`, 'g');
            finalEnhancedHtml = finalEnhancedHtml.replace(srcAttrRegex, `src=$1${img.url}$1`);
            
            // Regex for data-background-image='ai_image_ref:X' or data-background-image="ai_image_ref:X"
            const dataBgAttrRegex = new RegExp(`data-background-image=(['"])${escapedPlaceholder}\\1`, 'g');
            finalEnhancedHtml = finalEnhancedHtml.replace(dataBgAttrRegex, `data-background-image=$1${img.url}$1`);
            
            // Regex for style="... url('ai_image_ref:X') ..." or style="... url(ai_image_ref:X) ..."
            // This is more complex. A simpler approach is if AI uses a consistent format for url()
            // Assuming AI uses url('placeholder') or url("placeholder")
            const styleUrlRegex = new RegExp(`url\\((['"]?)${escapedPlaceholder}\\1\\)`, 'g');
            finalEnhancedHtml = finalEnhancedHtml.replace(styleUrlRegex, `url($1${img.url}$1)`);
        }
      });

      setEnhancedAIResponse({
        ...response,
        enhanced_html_content: finalEnhancedHtml
      }); 
      setPptxTextContent(null); 
      setCurrentStep(AppStep.ENHANCED_HTML_READY);
    } catch (e: any) {
      console.error("Error in handleGenerateEnhanced:", e);
      setError(`Error enhancing presentation: ${e.message || 'Unknown error'}`);
      setCurrentStep(AppStep.AWAITING_USER_IMAGE_ENHANCEMENT_INPUT); 
    }
    setIsLoading(false);
  };
  
  const handleGeneratePptxTextContent = async () => {
    if (!geminiService) {
      setError("AI Service is not available. Cannot generate PPT text.");
      return;
    }
    const finalCoreHtml = enhancedAIResponse?.enhanced_html_content || initialAIResponse?.html_content;
    if (!finalCoreHtml) {
      setError("Final presentation core HTML is missing to generate plain text for PPT.");
      setCurrentStep(enhancedAIResponse ? AppStep.ENHANCED_HTML_READY : (initialAIResponse ? AppStep.INITIAL_HTML_READY : AppStep.SETUP));
      return;
    }
    setIsLoading(true);
    setError(null);
    setCurrentStep(AppStep.GENERATING_PPT_TEXT);
    try {
      const textContent = await geminiService.generatePptxTextContent(finalCoreHtml, selectedModel);
      setPptxTextContent(textContent);
      setCurrentStep(AppStep.PPT_TEXT_READY);
    } catch (e: any) {
      console.error("Error in handleGeneratePptxTextContent:", e);
      setError(`Error generating plain text for PPT: ${e.message || 'Unknown error'}`);
      setCurrentStep(AppStep.ENHANCED_HTML_READY); 
    }
    setIsLoading(false);
  };

  const downloadPresentationWithCurrentSettings = (coreHtml: string | null, filename: string) => {
    if (!coreHtml || !displayTheme ) { 
       setError(`Cannot download: HTML content or theme ('${displayTheme}') is missing.`);
       alert(`Cannot download: HTML content or theme is missing. Please ensure a presentation is fully generated and a theme is selected.`);
       return;
    }
    downloadPresentationHtml(coreHtml, displayTheme, filename);
  };


  const downloadPresentationHtml = (coreHtmlContent: string, theme: string, filename: string) => { 
    const fullHtml = generateFullRevealHtmlPage(coreHtmlContent, theme); 
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTextFile = (text: string | null, filename: string) => {
    if (!text) {
      setError(`No text content to download for ${filename}.`);
      alert(`No text content to download for ${filename}.`);
      return;
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  const copyToClipboard = (text: string | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => alert("Content copied to clipboard!"))
      .catch(err => {
        console.error("Failed to copy content: ", err);
        setError("Failed to copy content to clipboard.");
      });
  };

  const restartProcess = () => {
    setUploadedData(null);
    setUploadedFileName(null);
    setPastedText('');
    setTopicQuery('');
    setWebPageUrl(''); 
    setIncludeFileData(false);
    setIncludePastedText(false);
    setIncludeTopicQuery(false);
    setIncludeWebPageUrl(false); 
    setUseSearchForTopic(true);
    setMinSlides(5);
    setCurrentStep(AppStep.SETUP);
    setInitialAIResponse(null);
    setEnhancedAIResponse(null);
    setPptxTextContent(null);
    setError(null); 
    if (!geminiService) {
        setError("Critical: Failed to initialize AI Service. Please ensure API_KEY is correctly set and refresh.");
    }
    setUserImageInputs([]);
    setUserEnhancementRequests('');
    setShowPreview(false); 
    setShowAiSuggestions(true);
    setShowSearchResults(true);
    setShowPptxText(true);
    setDisplayTheme(null); 
    setSelectedModel(defaultModel); 
    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const renderThemeSelector = () => (
    <div className="my-4 p-4 bg-slate-700/50 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-sky-300 mb-3">Customize Appearance</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> 
        <div>
          <label htmlFor="theme-select" className="block text-sm font-medium text-slate-300 mb-1 flex items-center">
            <PaletteIcon className="w-4 h-4 mr-2 text-slate-400" /> Theme:
          </label>
          <select
            id="theme-select"
            value={displayTheme || ''}
            onChange={(e) => setDisplayTheme(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-600 border-slate-500 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md text-slate-100"
            aria-label="Select Presentation Theme"
          >
            {validThemes.map(theme => <option key={theme} value={theme}>{theme.charAt(0).toUpperCase() + theme.slice(1)}</option>)}
          </select>
        </div>
      </div>
    </div>
  );

  const renderModelSelectorForStep = (stepId: string) => (
    <ModelSelector
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        availableModels={availableModels}
        id={`model-select-${stepId}`}
        className="my-4 p-4 bg-slate-700/50 rounded-lg shadow"
    />
  );


  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner message={getLoadingMessage()} />;
    }

    const isGenerateButtonDisabled = (isNaN(minSlides) || minSlides <= 0) || 
                                     !( (includeFileData && uploadedData) || 
                                        (includePastedText && pastedText.trim()) || 
                                        (includeWebPageUrl && webPageUrl.trim()) || 
                                        (includeTopicQuery && topicQuery.trim()) ) ||
                                     !geminiService; 

    switch (currentStep) {
      case AppStep.SETUP:
        return (
          <div className="space-y-8 p-4 md:p-8 max-w-3xl mx-auto w-full">
            <h2 className="text-3xl font-bold text-sky-400 text-center mb-8">Create Your Presentation</h2>
            
            {renderModelSelectorForStep("setup")}
            
            <NumberInput label="Minimum Number of Slides:" value={minSlides} onChange={setMinSlides} />

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-slate-200 border-b border-slate-700 pb-2">Input Sources</h3>
              <p className="text-sm text-slate-400">Provide content using one or more methods below. Check the box next to each input you want to include.</p>

              <div className="p-4 bg-slate-800/50 rounded-lg shadow">
                <FileUpload onFileUpload={handleFileUpload} />
                <div className="mt-3 flex items-center">
                  <input id="include-file-data" type="checkbox" checked={includeFileData} onChange={e => setIncludeFileData(e.target.checked)} disabled={!uploadedData} className="h-4 w-4 text-sky-600 bg-slate-700 border-slate-500 rounded focus:ring-sky-500 focus:ring-offset-slate-800 disabled:opacity-50" />
                  <label htmlFor="include-file-data" className={`ml-2 text-sm font-medium ${!uploadedData ? 'text-slate-500' : 'text-slate-300'}`}>Include uploaded file content {uploadedData && uploadedFileName ? `(${uploadedFileName})` : ''}</label>
                </div>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-lg shadow">
                <label htmlFor="pasted-text" className="block text-sm font-medium text-slate-300 mb-1">Paste your content here:</label>
                <textarea id="pasted-text" rows={6} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={pastedText} onChange={(e) => { setPastedText(e.target.value); if(e.target.value.trim()) setIncludePastedText(true); else setIncludePastedText(false);}} placeholder="Paste your presentation data, script, or notes..." aria-label="Paste your content here" />
                <div className="mt-3 flex items-center">
                  <input id="include-pasted-text" type="checkbox" checked={includePastedText} onChange={e => setIncludePastedText(e.target.checked)} disabled={!pastedText.trim()} className="h-4 w-4 text-sky-600 bg-slate-700 border-slate-500 rounded focus:ring-sky-500 focus:ring-offset-slate-800 disabled:opacity-50" />
                  <label htmlFor="include-pasted-text" className={`ml-2 text-sm font-medium ${!pastedText.trim() ? 'text-slate-500' : 'text-slate-300'}`}>Include pasted text</label>
                </div>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-lg shadow">
                <label htmlFor="web-page-url" className="block text-sm font-medium text-slate-300 mb-1">Enter Web Page URL for context:</label>
                <input id="web-page-url" type="url" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={webPageUrl} onChange={(e) => { setWebPageUrl(e.target.value); if(e.target.value.trim()) setIncludeWebPageUrl(true); else setIncludeWebPageUrl(false);}} placeholder="e.g., https://example.com/article" aria-label="Enter Web Page URL" />
                <div className="mt-3 flex items-center">
                  <input id="include-web-page-url" type="checkbox" checked={includeWebPageUrl} onChange={e => setIncludeWebPageUrl(e.target.checked)} disabled={!webPageUrl.trim()} className="h-4 w-4 text-sky-600 bg-slate-700 border-slate-500 rounded focus:ring-sky-500 focus:ring-offset-slate-800 disabled:opacity-50" />
                  <label htmlFor="include-web-page-url" className={`ml-2 text-sm font-medium ${!webPageUrl.trim() ? 'text-slate-500' : 'text-slate-300'}`}>Include web page URL</label>
                </div>
                 <p className="mt-1 text-xs text-slate-400">Note: The AI will receive this URL as text context. It will not actively fetch or parse the page in real-time unless it is instructed to and has such capability via tools (like search).</p>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-lg shadow">
                <label htmlFor="topic-query" className="block text-sm font-medium text-slate-300 mb-1">Enter a topic for your presentation:</label>
                <input id="topic-query" type="text" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={topicQuery} onChange={(e) => { setTopicQuery(e.target.value); if(e.target.value.trim()) setIncludeTopicQuery(true); else setIncludeTopicQuery(false);}} placeholder="e.g., 'The Future of Renewable Energy'" aria-label="Enter a topic for your presentation" />
                <div className="mt-3 flex items-center">
                  <input id="include-topic-query" type="checkbox" checked={includeTopicQuery} onChange={e => setIncludeTopicQuery(e.target.checked)} disabled={!topicQuery.trim()} className="h-4 w-4 text-sky-600 bg-slate-700 border-slate-500 rounded focus:ring-sky-500 focus:ring-offset-slate-800 disabled:opacity-50" />
                  <label htmlFor="include-topic-query" className={`ml-2 text-sm font-medium ${!topicQuery.trim() ? 'text-slate-500' : 'text-slate-300'}`}>Include topic</label>
                </div>
                {includeTopicQuery && topicQuery.trim() && (
                  <div className="mt-3 pl-6">
                    <div className="flex items-center">
                      <input id="use-search-toggle" type="checkbox" checked={useSearchForTopic} onChange={e => setUseSearchForTopic(e.target.checked)} className="h-4 w-4 text-sky-600 bg-slate-700 border-slate-500 rounded focus:ring-sky-500 focus:ring-offset-slate-800" aria-describedby="search-toggle-description"/>
                      <label htmlFor="use-search-toggle" className="ml-2 text-sm font-medium text-slate-300">Use Google Search for this topic</label>
                    </div>
                    <p id="search-toggle-description" className="mt-1 text-xs text-slate-400">If checked, AI uses Google Search. Unchecked, AI uses internal knowledge.</p>
                  </div>
                )}
              </div>
            </div>
            
            <Button onClick={handleGenerateInitial} disabled={isGenerateButtonDisabled} Icon={PlayIcon} className="w-full">Generate Initial Presentation</Button>
            {isGenerateButtonDisabled && !geminiService && <p className="text-xs text-red-400 text-center mt-2">AI Service initialization failed. Check console and API Key.</p>}
            {isGenerateButtonDisabled && (isNaN(minSlides) || minSlides <= 0) && <p className="text-xs text-red-400 text-center mt-2">Minimum slides must be a positive number.</p>}
            {isGenerateButtonDisabled && !((includeFileData && uploadedData) || (includePastedText && pastedText.trim()) || (includeWebPageUrl && webPageUrl.trim()) || (includeTopicQuery && topicQuery.trim())) && 
             <p className="text-xs text-yellow-400 text-center mt-2 flex items-center justify-center"><InformationCircleIcon className="w-4 h-4 mr-1"/> Please select and provide content for at least one input source.</p>}
          </div>
        );
      
      case AppStep.INITIAL_HTML_READY:
        if (!initialAIResponse || !displayTheme ) return <p>Error: Initial response data or theme missing.</p>; 
        return (
          <div className="space-y-6 p-4 md:p-6 w-full">
            <h2 className="text-2xl font-semibold text-sky-400">Initial Presentation Generated!</h2>
            <p className="text-slate-300">The AI (model: {selectedModel}) has created an initial version with per-slide transitions.</p>
            {renderThemeSelector()}
            <div className="flex space-x-2 flex-wrap gap-2">
              <Button onClick={() => downloadPresentationWithCurrentSettings(initialAIResponse.html_content, 'initial_presentation.html')} variant="secondary" Icon={DocumentArrowDownIcon}>Download Initial HTML</Button>
              <Button onClick={() => setShowPreview(p => !p)} variant="secondary" Icon={EyeIcon}>{showPreview ? "Hide" : "Show"} Preview</Button>
              <Button onClick={handleProceedToEnhancementInput} Icon={SparklesIcon} className="bg-green-600 hover:bg-green-500 focus:ring-green-500">Next: Add Images & Enhancements</Button>
            </div>
            
            {showPreview && initialAIResponse.html_content && displayTheme && ( 
              <CollapsibleSection title="Preview Initial Presentation" isOpen={showPreview} setIsOpen={setShowPreview} >
                <PresentationPreview htmlContent={initialAIResponse.html_content} chosenTheme={displayTheme} />
              </CollapsibleSection>
            )}

            {getActiveSearchResults() && getActiveSearchResults()!.length > 0 && (
              <CollapsibleSection title="Google Search Sources Used" Icon={MagnifyingGlassIcon} isOpen={showSearchResults} setIsOpen={setShowSearchResults} >
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                  {getActiveSearchResults()!.map(result => ( <li key={result.uri}><a href={result.uri} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">{result.title || result.uri}</a></li> ))}
                </ul>
              </CollapsibleSection>
            )}

            <CollapsibleSection title="AI Suggestions & Next Steps" Icon={LightBulbIcon} isOpen={showAiSuggestions} setIsOpen={setShowAiSuggestions} >
              <div className="bg-slate-700/50 p-4 rounded-md space-y-3">
                {initialAIResponse.image_suggestions.length > 0 && ( <div> <h3 className="font-semibold text-slate-200 mb-1">AI Suggested Image Placements:</h3> <ul className="list-disc list-inside text-slate-300 text-sm space-y-1"> {initialAIResponse.image_suggestions.map((s, i) => <li key={i}><strong>{s.slide_reference}:</strong> {s.description}</li>)} </ul> <p className="text-xs text-slate-400 mt-1">You'll be able to provide URLs or generate images in the next step.</p> </div> )}
                {initialAIResponse.enhancement_queries && ( <div> <h3 className="font-semibold text-slate-200 mb-1">AI Asks:</h3> <p className="text-slate-300 text-sm whitespace-pre-wrap">{initialAIResponse.enhancement_queries}</p> <p className="text-xs text-slate-400 mt-1">You can describe these preferences in the next step.</p> </div> )}
              </div>
            </CollapsibleSection>
          </div>
        );

      case AppStep.AWAITING_USER_IMAGE_ENHANCEMENT_INPUT:
        if (!initialAIResponse || !displayTheme) return <p>Error: Initial data or theme missing for this step.</p>; 
        if (!geminiService) {
             return (
                <div className="p-4 md:p-6 w-full">
                    <h2 className="text-2xl font-semibold text-red-400">AI Service Error</h2>
                    <p className="text-slate-300 mt-2">The AI service could not be initialized. This is often due to a missing or invalid API key. Please check the console for detailed error messages and ensure your API key is correctly configured.</p>
                    <Button onClick={restartProcess} Icon={ArrowPathIcon} className="mt-4">Restart Setup</Button>
                </div>);
        }
        
        const currentAiQueries = (enhancedAIResponse?.ai_confirmation_or_further_queries && enhancedAIResponse.ai_confirmation_or_further_queries.trim() !== initialAIResponse.enhancement_queries?.trim()) ? enhancedAIResponse.ai_confirmation_or_further_queries : initialAIResponse.enhancement_queries;
        const previewHtmlForRefinement = enhancedAIResponse?.enhanced_html_content || initialAIResponse.html_content;
        const previewTitleForRefinement = enhancedAIResponse ? "Preview Current Base (Before This Refinement)" : "Preview Initial Presentation (Before Enhancements)";

        return (
          <div className="space-y-6 p-4 md:p-6 w-full">
            <h2 className="text-2xl font-semibold text-sky-400">Add Images & Refinements</h2>
            {renderModelSelectorForStep("enhancement-input")}
            <p className="text-slate-300 mb-4">Provide image URLs, generate images with AI, or add your own. Also, describe any further enhancements. Current Theme: '{displayTheme}'. Per-slide transitions are embedded in HTML.</p>
            
            <ImageInputForm
              aiSuggestedImages={initialAIResponse.image_suggestions} 
              userProvidedImages={userImageInputs}
              onUserProvidedImagesChange={setUserImageInputs}
              additionalEnhancements={userEnhancementRequests}
              onAdditionalEnhancementsChange={setUserEnhancementRequests}
              aiEnhancementQueries={currentAiQueries}
              geminiService={geminiService} 
            />
            <div className="flex space-x-4 mt-6 flex-wrap gap-2">
                <Button onClick={handleGenerateEnhanced} Icon={CogIcon} disabled={!geminiService}>Generate Enhanced Presentation</Button>
                <Button onClick={() => downloadPresentationWithCurrentSettings(initialAIResponse.html_content, 'initial_presentation.html')} variant="secondary" Icon={DocumentArrowDownIcon}>Download Initial HTML (Current Theme)</Button>
            </div>
             {previewHtmlForRefinement && displayTheme && ( 
              <CollapsibleSection title={previewTitleForRefinement} isOpen={showPreview} setIsOpen={setShowPreview} >
                <PresentationPreview htmlContent={previewHtmlForRefinement} chosenTheme={displayTheme} />
              </CollapsibleSection>
            )}
          </div>
        );
        
      case AppStep.ENHANCED_HTML_READY:
        if (!initialAIResponse || !enhancedAIResponse || !displayTheme ) return <p>Error: Data or theme missing.</p>; 

        return (
          <div className="space-y-6 p-4 md:p-6 w-full">
            <h2 className="text-2xl font-semibold text-sky-400">Enhanced Presentation Complete!</h2>
             {renderModelSelectorForStep("enhanced-ready")}
            <p className="text-slate-300 whitespace-pre-wrap">{enhancedAIResponse.ai_confirmation_or_further_queries || "Your presentation with integrated images and refinements is ready."}</p>
            <p className="text-sm text-slate-400">Model used for last enhancement: {selectedModel}</p>
            {renderThemeSelector()}
            <div className="flex space-x-2 flex-wrap gap-2">
              <Button onClick={() => downloadPresentationWithCurrentSettings(enhancedAIResponse.enhanced_html_content, 'enhanced_presentation.html')} variant="primary" Icon={DocumentArrowDownIcon}>Download Enhanced HTML</Button>
              <Button onClick={handleRefineFurther} Icon={SparklesIcon} variant="secondary" className="bg-purple-600 hover:bg-purple-500 focus:ring-purple-500" disabled={!geminiService}>Refine Further</Button>
              <Button onClick={handleGeneratePptxTextContent} Icon={DocumentTextIcon} className="bg-green-600 hover:bg-green-500 focus:ring-green-500" disabled={!geminiService}>Generate Plain Text for PPT</Button>
              <Button onClick={() => setShowPreview(p => !p)} variant="secondary" Icon={EyeIcon}>{showPreview ? "Hide" : "Show"} Preview</Button>
            </div>
            {showPreview && enhancedAIResponse.enhanced_html_content && displayTheme && ( 
              <CollapsibleSection title="Preview Enhanced Presentation" isOpen={showPreview} setIsOpen={setShowPreview} >
                <PresentationPreview htmlContent={enhancedAIResponse.enhanced_html_content} chosenTheme={displayTheme} />
              </CollapsibleSection>
            )}
             {getActiveSearchResults() && getActiveSearchResults()!.length > 0 && (
              <CollapsibleSection title="Google Search Sources Used (Last Enhancement)" Icon={MagnifyingGlassIcon} isOpen={showSearchResults} setIsOpen={setShowSearchResults} >
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                  {getActiveSearchResults()!.map(result => ( <li key={result.uri}><a href={result.uri} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">{result.title || result.uri}</a></li> ))}
                </ul>
              </CollapsibleSection>
            )}
          </div>
        );

      case AppStep.PPT_TEXT_READY:
         if (!initialAIResponse || !displayTheme ) return <p>Error: Data or theme missing for this step.</p>; 
         const finalHtmlForPptStep = enhancedAIResponse?.enhanced_html_content || initialAIResponse?.html_content;
        return (
          <div className="space-y-6 p-4 md:p-6 w-full">
            <h2 className="text-2xl font-semibold text-sky-400">Plain Text for PPT Generated</h2>
            {renderModelSelectorForStep("ppt-ready")}
            <p className="text-slate-300">The AI (model: {selectedModel}) has generated a plain text version of your presentation content. You can copy this or download it as a .txt file.</p>
            {renderThemeSelector()}
             <CollapsibleSection title="Plain Text Content for PPT" isOpen={showPptxText} setIsOpen={setShowPptxText} Icon={DocumentTextIcon}>
              <div className="relative">
                <textarea readOnly value={pptxTextContent || "No plain text content generated."} className="w-full h-96 p-3 bg-slate-900 border border-slate-700 rounded-md text-sm font-mono text-slate-200 focus:ring-sky-500 focus:border-sky-500" aria-label="Plain text content for PPT" />
                <div className="absolute top-3 right-3 flex flex-col space-y-2">
                    <Button onClick={() => copyToClipboard(pptxTextContent)} variant="secondary" size="sm" Icon={ClipboardDocumentIcon}>Copy</Button>
                    <Button onClick={() => downloadTextFile(pptxTextContent, 'presentation_content.txt')} variant="secondary" size="sm" Icon={DocumentArrowDownIcon}>Download .txt</Button>
                </div>
              </div>
            </CollapsibleSection>
            <div className="mt-6 flex space-x-4 flex-wrap gap-2">
                 <Button onClick={() => downloadPresentationWithCurrentSettings(finalHtmlForPptStep, 'final_presentation.html')} variant="secondary" Icon={DocumentArrowDownIcon} disabled={!finalHtmlForPptStep}>Download Final HTML</Button>
                 { (finalHtmlForPptStep) && <Button onClick={handleRefineFurther} Icon={SparklesIcon} variant="secondary" className="bg-purple-600 hover:bg-purple-500 focus:ring-purple-500" disabled={!geminiService}>Refine HTML Further</Button>}
            </div>
             {showPreview && finalHtmlForPptStep && displayTheme && ( 
              <CollapsibleSection title="Preview Final Presentation (HTML Basis)" isOpen={showPreview} setIsOpen={setShowPreview} >
                <PresentationPreview htmlContent={finalHtmlForPptStep} chosenTheme={displayTheme} />
              </CollapsibleSection>
            )}
          </div>
        );
      default:
        return <p>Loading or unknown state... Current step: {currentStep}</p>;
    }
  };
  
  const getLoadingMessage = () => {
    switch (currentStep) {
      case AppStep.GENERATING_INITIAL: return `Creating initial presentation core with ${selectedModel}... (includes per-slide transitions)`;
      case AppStep.GENERATING_ENHANCED: return `Applying enhancements with ${selectedModel}... (This may take a moment if many images were generated or the base presentation is large)`;
      case AppStep.GENERATING_PPT_TEXT: return `Generating plain text for PPT with ${selectedModel}...`;
      default: return "Loading...";
    }
  };

  useEffect(() => {
    if (!geminiService && !error?.includes("Critical: Failed to initialize AI Service")) {
        setError(prevError => {
            const initError = "Critical: AI Service is not initialized. Please ensure API_KEY is set and refresh.";
            if (prevError?.includes(initError)) return prevError;
            return prevError ? `${prevError}\n${initError}` : initError;
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geminiService]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onRestart={restartProcess} />
      <main className="flex-grow container mx-auto px-2 py-4 md:py-8 flex flex-col items-center">
        <div className="w-full max-w-5xl bg-slate-800/70 shadow-2xl rounded-xl p-4 md:p-6 backdrop-blur-md">
          <StepIndicator currentStep={currentStep} />
          {error && (
            <div className="my-4 p-4 bg-red-500/20 text-red-300 border border-red-700 rounded-md" role="alert">
              <p className="font-semibold">Error:</p>
              <p className="whitespace-pre-wrap">{error}</p>
              <Button onClick={() => setError(null)} variant="danger" size="sm" className="mt-2">Dismiss</Button>
            </div>
          )}
          {renderContent()}
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-slate-500">
        Follow me on: 
        <a href="https://x.com/raddoc96" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline mx-1">Twitter</a> |
        <a href="https://youtube.com/@medirobot96" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline mx-1">YouTube</a> |
        <a href="https://t.me/Medicine_Chatgpt" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline mx-1">Telegram</a> |
        <a href="https://whatsapp.com/channel/0029Va7em0M3QxS58ILSbl2q" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline mx-1">WhatsApp</a>
      </footer>
    </div>
  );
};

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  Icon?: React.ElementType;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, isOpen, setIsOpen, Icon }) => {
  return (
    <div className="border border-slate-700 rounded-lg mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 md:p-4 bg-slate-700/50 hover:bg-slate-600/50 transition-colors duration-150 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="flex items-center">
          {Icon && <Icon className="w-5 h-5 mr-2 text-sky-300" aria-hidden="true" />}
          <h3 className="text-lg font-medium text-sky-300">{title}</h3>
        </div>
        {isOpen ? <ChevronUpIcon className="w-6 h-6 text-slate-400" aria-hidden="true" /> : <ChevronDownIcon className="w-6 h-6 text-slate-400" aria-hidden="true" />}
      </button>
      {isOpen && (
        <div 
            id={`collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
            className="p-3 md:p-4 bg-slate-800 rounded-b-lg border-t border-slate-700"
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default App;
