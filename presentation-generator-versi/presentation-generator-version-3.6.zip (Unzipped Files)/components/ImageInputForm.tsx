
import React, { useState } from 'react';
import { AISuggestedImage, UserProvidedImage } from '../types';
import Button from './Button';
import { PlusCircleIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, LightBulbIcon, PencilSquareIcon, SparklesIcon, PhotoIcon, InformationCircleIcon, MagnifyingGlassIcon, ClipboardDocumentIcon, DocumentArrowDownIcon } from './Icons';
import { GeminiService } from '../services/geminiService'; 
import { downloadDataUrl } from '../utils/imageUtils'; // New import

interface ImageInputFormProps {
  aiSuggestedImages: AISuggestedImage[];
  userProvidedImages: UserProvidedImage[];
  onUserProvidedImagesChange: (images: UserProvidedImage[]) => void;
  additionalEnhancements: string;
  onAdditionalEnhancementsChange: (enhancements: string) => void;
  aiEnhancementQueries?: string;
  geminiService: GeminiService | null; 
}

type UserProvidedImageUpdatableFields = keyof UserProvidedImage;


const ImageInputForm: React.FC<ImageInputFormProps> = ({
  aiSuggestedImages,
  userProvidedImages,
  onUserProvidedImagesChange,
  additionalEnhancements,
  onAdditionalEnhancementsChange,
  aiEnhancementQueries,
  geminiService, 
}) => {
  const [showAiSuggestions, setShowAiSuggestions] = useState(true);
  const [showUserDefined, setShowUserDefined] = useState(true);
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null); 
  const [imageGenError, setImageGenError] = useState<Record<string, string | null>>({});


  const handleUserProvidedImageChange = (index: number, field: UserProvidedImageUpdatableFields, value: string | number | undefined) => {
    const updatedImages = [...userProvidedImages];
    const imageToUpdate = { ...updatedImages[index] };

    if (field === 'slide_number' || field === 'after_slide_number') {
        imageToUpdate[field] = value === '' || value === undefined ? undefined : Number(value);
    } else if (field === 'placement') {
        imageToUpdate[field] = value as 'background' | 'inline';
    } else if (field === 'type') {
        imageToUpdate[field] = value as UserProvidedImage['type'];
    } else if (field === 'url' || field === 'description' || field === 'suggestion_reference' || field === 'original_ai_description') {
        imageToUpdate[field] = value as string;
    }
    
    updatedImages[index] = imageToUpdate;
    onUserProvidedImagesChange(updatedImages);
  };
  
  const addUserDefinedImageField = (type: 'user_defined_existing_slide' | 'user_defined_new_slide') => {
    const newImageEntry: UserProvidedImage = {
      type: type,
      url: '',
      description: '',
      placement: 'inline', 
      ...(type === 'user_defined_existing_slide' && { slide_number: undefined }),
      ...(type === 'user_defined_new_slide' && { after_slide_number: undefined }),
    };
    onUserProvidedImagesChange([...userProvidedImages, newImageEntry]);
  };

  const removeUserProvidedImageField = (index: number) => {
    onUserProvidedImagesChange(userProvidedImages.filter((_, i) => i !== index));
  };

  const handleGenerateAiImage = async (item: UserProvidedImage, overallIndex: number) => {
    if (!geminiService || typeof geminiService.generateImageFromPrompt !== 'function') {
      console.error('ImageInputForm: GeminiService is not available or generateImageFromPrompt method is missing.');
      setImageGenError(prev => ({ ...prev, [item.suggestion_reference || `userdef-${overallIndex}`]: 'AI Image Generation Service is unavailable.' }));
      return;
    }
    if (!item.description || item.description.trim() === '') {
        setImageGenError(prev => ({ ...prev, [item.suggestion_reference || `userdef-${overallIndex}`]: 'Please provide a description for the image.' }));
        return;
    }

    const loadingKey = item.suggestion_reference || `userdef-${overallIndex}`;
    setGeneratingImageFor(loadingKey);
    setImageGenError(prev => ({ ...prev, [loadingKey]: null }));
    try {
      const imageDataUrl = await geminiService.generateImageFromPrompt(item.description);
      handleUserProvidedImageChange(overallIndex, 'url', imageDataUrl);
    } catch (e: any) {
      console.error("Error generating AI image:", e); 
      setImageGenError(prev => ({ ...prev, [loadingKey]: `Failed: ${e.message || 'Unknown error'}` }));
    } finally {
      setGeneratingImageFor(null);
    }
  };

  const handleSearchWebForImage = (description: string) => {
    if (!description || description.trim() === '') return;
    const searchQuery = encodeURIComponent(description.trim());
    const searchUrl = `https://www.google.com/search?tbm=isch&q=${searchQuery}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };


  const aiSuggestedEntries = userProvidedImages.filter(img => img.type === 'ai_suggested');
  const userDefinedEntries = userProvidedImages.filter(img => img.type !== 'ai_suggested');

  const renderImageItemFields = (item: UserProvidedImage, overallIndex: number, isAISuggested: boolean) => {
    const uniqueKeyPart = isAISuggested ? item.suggestion_reference : `userdef-${overallIndex}`;
    const isLoadingThisImage = generatingImageFor === uniqueKeyPart;
    const errorForThisImage = uniqueKeyPart ? imageGenError[uniqueKeyPart] : null;
    const canGenerate = geminiService && typeof geminiService.generateImageFromPrompt === 'function';
    const hasDescription = item.description?.trim();
    const isCurrentlyAiGenerated = item.url.startsWith('data:image');

    return (
      <>
        {isAISuggested && item.original_ai_description && (
            <p className="text-xs text-slate-400 italic">AI's original idea: "{item.original_ai_description}"</p>
        )}
        
        <label htmlFor={`image-desc-${overallIndex}`} className="block text-xs font-medium text-slate-300 mt-1">
          Image Description (edit for AI generation, web search, or as alt text):
        </label>
        <textarea
          id={`image-desc-${overallIndex}`}
          value={item.description}
          onChange={(e) => handleUserProvidedImageChange(overallIndex, 'description', e.target.value)}
          placeholder="Describe the image you want here..."
          rows={2}
          className="block w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-sm shadow-sm placeholder-slate-400 text-slate-100
                    focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
        
        {isCurrentlyAiGenerated && (
          <div className="my-2">
            <img src={item.url} alt={`Generated for ${item.description}`} className="max-w-xs max-h-48 rounded border border-slate-500" />
            <p className="text-xs text-slate-400 mt-1">AI Generated Image Preview</p>
          </div>
        )}

        <label htmlFor={`image-url-${overallIndex}`} className="block text-xs font-medium text-slate-300 mt-2">
          Image URL:
        </label>
        <input
          type="url"
          id={`image-url-${overallIndex}`}
          value={isCurrentlyAiGenerated ? '' : item.url} 
          onChange={(e) => handleUserProvidedImageChange(overallIndex, 'url', e.target.value)}
          placeholder={
            isCurrentlyAiGenerated 
            ? "Using embedded AI image. Paste public URL to override." 
            : "Enter image URL (e.g., https://...)"
          }
          className="mt-1 block w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-sm shadow-sm placeholder-slate-400 text-slate-100
                    focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
        {isCurrentlyAiGenerated && (
          <div className="mt-2 space-y-1">
            <div className="flex flex-wrap gap-2">
                <Button 
                    onClick={() => navigator.clipboard.writeText(item.url)}
                    variant="secondary" size="sm" Icon={ClipboardDocumentIcon}
                    className="flex-grow sm:flex-grow-0"
                    title="Copy the full base64 data URL of the generated image."
                >
                    Copy Data URL
                </Button>
                <Button 
                    onClick={() => downloadDataUrl(item.url, `generated-image-${overallIndex}.jpeg`)}
                    variant="secondary" size="sm" Icon={DocumentArrowDownIcon}
                    className="flex-grow sm:flex-grow-0"
                    title="Download the generated image as a JPEG file."
                >
                    Download Image
                </Button>
            </div>
            <p className="text-xs text-slate-400">
              Optional: Host downloaded/copied image externally (e.g., Imgur) and paste its public URL above to use that instead of embedding.
            </p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 mt-3">
            <Button
                onClick={() => handleGenerateAiImage(item, overallIndex)}
                variant="secondary"
                size="sm"
                Icon={PhotoIcon}
                disabled={isLoadingThisImage || !canGenerate || !hasDescription}
                className="flex-grow sm:flex-grow-0"
                title={!canGenerate ? "Image generation service unavailable" : (!hasDescription ? "Enter a description to generate image" : (isCurrentlyAiGenerated ? 'Re-generate Image with AI' : 'Generate Image with AI from description'))}
            >
                {isLoadingThisImage ? 'Generating...' : (isCurrentlyAiGenerated ? 'Re-generate Image' : 'Generate Image with AI')}
            </Button>
            <Button
                onClick={() => handleSearchWebForImage(item.description)}
                variant="secondary"
                size="sm"
                Icon={MagnifyingGlassIcon}
                disabled={!hasDescription}
                className="flex-grow sm:flex-grow-0"
                title={!hasDescription ? "Enter a description to search the web" : "Search Google Images for this description"}
            >
                Search Web
            </Button>
        </div>
        {!canGenerate && <p className="text-xs text-yellow-400 mt-1">AI image generation is currently unavailable.</p>}
        {errorForThisImage && <p className="text-xs text-red-400 mt-1">{errorForThisImage}</p>}
      </>
    );
  };


  return (
    <div className="space-y-8">
      {aiSuggestedImages.length > 0 && (
        <div>
          <CollapsibleHeader title="AI Suggested Image Placements" Icon={LightBulbIcon} isOpen={showAiSuggestions} setIsOpen={setShowAiSuggestions} count={aiSuggestedEntries.length} />
          {showAiSuggestions && (
            <div className="space-y-6 mt-2 p-4 bg-slate-800/50 rounded-b-md border border-t-0 border-slate-700">
              <p className="text-sm text-slate-300 mb-3">The AI suggested these placements. You can provide a URL, edit the description and generate an image with AI, search the web for an image based on the description, or leave the URL blank to skip this suggestion.</p>
              {aiSuggestedEntries.map((item) => {
                const overallIndex = userProvidedImages.findIndex(upi => upi.suggestion_reference === item.suggestion_reference && upi.type === 'ai_suggested');
                if (overallIndex === -1) return null; 

                return (
                  <div key={item.suggestion_reference} className="p-4 bg-slate-700/60 rounded-md shadow space-y-3">
                    <label className="block text-sm font-medium text-sky-300">
                      For AI Suggestion: <span className="font-normal text-slate-200">{item.suggestion_reference}</span>
                    </label>
                    {renderImageItemFields(item, overallIndex, true)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div>
        <CollapsibleHeader title="Define Your Own Images" Icon={PencilSquareIcon} isOpen={showUserDefined} setIsOpen={setShowUserDefined} count={userDefinedEntries.length} />
        {showUserDefined && (
          <div className="space-y-6 mt-2 p-4 bg-slate-800/50 rounded-b-md border border-t-0 border-slate-700">
            <p className="text-sm text-slate-300 mb-1">Add your own images to specific slides or create new slides with images.</p>
            <div className="text-xs text-slate-400 bg-slate-700/30 p-2 rounded-md mb-4 flex items-start">
                <InformationCircleIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-sky-400"/>
                <div>
                    <strong>Placement Tips:</strong>
                    <ul className="list-disc list-inside ml-1">
                        <li><strong>Inline Content:</strong> Image is part of the slide's content flow.</li>
                        <li><strong>Background Image:</strong> Image covers the entire slide background.</li>
                    </ul>
                </div>
            </div>
            {userDefinedEntries.map((item, index) => {
              const overallIndex = userProvidedImages.findIndex(upi => upi === item); 
              if (overallIndex === -1) return null;
              
              return (
              <div key={index} className="p-4 bg-slate-700/60 rounded-md shadow relative space-y-3">
                 <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-sky-300">
                        {item.type === 'user_defined_existing_slide' ? 'Image for Existing Slide' : 'Image for New Slide'}
                    </span>
                    <Button
                        onClick={() => removeUserProvidedImageField(overallIndex)}
                        variant="danger"
                        size="sm"
                        aria-label="Remove this image entry"
                        className='ml-2'
                    >
                        <TrashIcon className="w-4 h-4" />
                    </Button>
                 </div>

                {item.type === 'user_defined_existing_slide' && (
                  <div>
                    <label htmlFor={`user-slide-num-${overallIndex}`} className="block text-xs font-medium text-slate-300">Target Slide Number:</label>
                    <input
                        id={`user-slide-num-${overallIndex}`}
                        type="number"
                        value={item.slide_number ?? ''}
                        onChange={(e) => handleUserProvidedImageChange(overallIndex, 'slide_number', e.target.value)}
                        placeholder="e.g., 3"
                        min="1"
                        className="mt-1 block w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-sm shadow-sm placeholder-slate-400 text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                )}
                {item.type === 'user_defined_new_slide' && (
                  <div>
                    <label htmlFor={`user-after-slide-num-${overallIndex}`} className="block text-xs font-medium text-slate-300">Insert After Slide Number:</label>
                    <input
                        id={`user-after-slide-num-${overallIndex}`}
                        type="number"
                        value={item.after_slide_number ?? ''}
                        onChange={(e) => handleUserProvidedImageChange(overallIndex, 'after_slide_number', e.target.value)}
                        placeholder="e.g., 5 (or 0 for start)"
                        min="0"
                        className="mt-1 block w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-sm shadow-sm placeholder-slate-400 text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                )}
                
                <div>
                    <label htmlFor={`user-placement-${overallIndex}`} className="block text-xs font-medium text-slate-300">Image Placement:</label>
                    <select
                        id={`user-placement-${overallIndex}`}
                        value={item.placement || 'inline'}
                        onChange={(e) => handleUserProvidedImageChange(overallIndex, 'placement', e.target.value as 'inline' | 'background')}
                        className="mt-1 block w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-sm shadow-sm text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                        <option value="inline">Inline Content</option>
                        <option value="background">Background Image</option>
                    </select>
                </div>
                
                {renderImageItemFields(item, overallIndex, false)}

              </div>
            )})}
            <div className="flex space-x-2 mt-4">
                <Button onClick={() => addUserDefinedImageField('user_defined_existing_slide')} variant="secondary" Icon={PlusCircleIcon}>Add Image to Existing Slide</Button>
                <Button onClick={() => addUserDefinedImageField('user_defined_new_slide')} variant="secondary" Icon={PlusCircleIcon}>Add Image as New Slide</Button>
            </div>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-md font-semibold text-sky-300 mb-2 flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2"/> Additional Enhancements & Refinements
        </h3>
        {aiEnhancementQueries && (
            <p className="text-sm text-slate-300 bg-slate-700/30 p-3 rounded-md mb-3 whitespace-pre-wrap">
                <strong>AI Asks:</strong> {aiEnhancementQueries}
            </p>
        )}
        <textarea
          id="additional-enhancements"
          rows={4}
          value={additionalEnhancements}
          onChange={(e) => onAdditionalEnhancementsChange(e.target.value)}
          placeholder="Describe any other changes, content adjustments, preferred animations, color schemes, or specific Reveal.js features you'd like..."
          className="block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400 text-slate-100
                     focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
      </div>
    </div>
  );
};

interface CollapsibleHeaderProps {
  title: string;
  Icon?: React.ElementType;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  count?: number;
}

const CollapsibleHeader: React.FC<CollapsibleHeaderProps> = ({ title, Icon, isOpen, setIsOpen, count }) => (
  <button
    onClick={() => setIsOpen(!isOpen)}
    className="w-full flex justify-between items-center p-3 bg-slate-700 hover:bg-slate-600/80 transition-colors duration-150 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
    aria-expanded={isOpen}
  >
    <div className="flex items-center">
      {Icon && <Icon className="w-5 h-5 mr-2 text-sky-400" />}
      <h3 className="text-md font-semibold text-sky-300">{title}</h3>
      {typeof count !== 'undefined' && (
        <span className="ml-2 text-xs bg-sky-500 text-white px-1.5 py-0.5 rounded-full">{count}</span>
      )}
    </div>
    {isOpen ? <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : <ChevronDownIcon className="w-5 h-5 text-slate-400" />}
  </button>
);

export default ImageInputForm;
