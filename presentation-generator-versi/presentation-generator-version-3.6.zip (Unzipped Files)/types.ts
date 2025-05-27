export enum AppStep {
  SETUP = 'SETUP',
  GENERATING_INITIAL = 'GENERATING_INITIAL',
  INITIAL_HTML_READY = 'INITIAL_HTML_READY', // AI provides HTML, image suggestions, enhancement queries
  AWAITING_USER_IMAGE_ENHANCEMENT_INPUT = 'AWAITING_USER_IMAGE_ENHANCEMENT_INPUT', // User is providing image URLs and enhancement details
  GENERATING_ENHANCED = 'GENERATING_ENHANCED',
  ENHANCED_HTML_READY = 'ENHANCED_HTML_READY', // AI provides final HTML, may ask for more
  GENERATING_PPT_TEXT = 'GENERATING_PPT_TEXT', // New: Generating plain text for PPT
  PPT_TEXT_READY = 'PPT_TEXT_READY', // New: Plain text for PPT is ready
}

export type AvailableModel =
  | 'gemini-2.5-pro-preview-05-06'
  | 'gemini-2.5-flash-preview-05-20'
  | 'gemini-2.5-flash-preview-04-17';

export interface AISuggestedImage {
  slide_reference: string; // e.g., "Slide 2, Concept X" or "Image for Introduction"
  description: string;
  // placement_hint?: 'background' | 'inline' | 'any'; // Deferred due to prompt constraints
}

export interface UserProvidedImage {
  type: 'ai_suggested' | 'user_defined_existing_slide' | 'user_defined_new_slide';
  
  // Common fields
  url: string;
  description: string; // For AI-suggested, this becomes the editable prompt. For user-defined, it's their description/alt.

  // For 'ai_suggested':
  suggestion_reference?: string; // Matches AISuggestedImage.slide_reference
  original_ai_description?: string; // Stores the AI's original, non-editable description suggestion
  // placement_override?: 'background' | 'inline' | 'any'; // Deferred

  // For 'user_defined_existing_slide':
  slide_number?: number;
  placement?: 'background' | 'inline'; // User's choice

  // For 'user_defined_new_slide':
  after_slide_number?: number; // 0 means at the beginning
  // placement for new slide is also covered by the field above.
}

export interface InitialAIResponse {
  html_content: string; // Core Reveal.js slides: e.g., <div class='reveal'><div class='slides'><section>...</section>...</div></div>
  chosen_theme: string; // e.g., 'sky', 'night'
  image_suggestions: AISuggestedImage[];
  enhancement_queries: string; // AI's question about further enhancements
  search_results?: SearchResultItem[]; // Optional, if Google Search was used
}

export interface EnhancedAIResponse {
  enhanced_html_content: string; // Core Reveal.js slides: e.g., <div class='reveal'><div class='slides'><section>...</section>...</div></div>
  ai_confirmation_or_further_queries: string;
  search_results?: SearchResultItem[];
}

export interface SearchResultItem {
  uri: string;
  title: string;
}

// Old types, review if still needed or can be replaced/merged
export interface ImageConfigItem { // This might be deprecated if AI doesn't generate imageConfig
  id: string;
  url: string;
  description: string;
  width?: number;
  height?: number;
}

export interface ImageInputData { // This will be replaced by UserProvidedImage[]
  [id: string]: string; 
}

export interface NewImageInputData { // This will be replaced by UserProvidedImage[]
  url:string;
  description: string;
}

export interface ImageUpdatePayload { // This will be replaced by UserProvidedImage[]
  placeholderReplacements: ImageInputData;
  newOrDifferentImages: NewImageInputData[];
}