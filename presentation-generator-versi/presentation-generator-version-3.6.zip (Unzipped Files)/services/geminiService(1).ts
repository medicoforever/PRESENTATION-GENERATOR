
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { UserProvidedImage, InitialAIResponse, EnhancedAIResponse, SearchResultItem, AvailableModel } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API Key (process.env.API_KEY) is not configured. The application will not function correctly.");
}

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    if (!API_KEY) {
      throw new Error("Gemini API Key (process.env.API_KEY) is not configured. Please ensure it is set in your environment.");
    }
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  private async generateWithConfig(prompt: string, modelName: AvailableModel, useSearch: boolean = false, isInitialGeneration: boolean = true): Promise<any> {
    try {
      const modelRequestConfig: any = {}; 
      
      if (useSearch) {
        modelRequestConfig.tools = [{googleSearch: {}}];
      } else {
        modelRequestConfig.responseMimeType = "application/json";
      }
      
      if (modelName === 'gemini-2.5-flash-preview-04-17') {
         // modelRequestConfig.thinkingConfig = { thinkingBudget: 0 }; // Example: disable thinking for low latency
         // For this app, we'll omit thinkingConfig to use the default (enabled for higher quality)
      }


      const generateContentRequest = {
        model: modelName, 
        contents: prompt,
        config: modelRequestConfig,
      };

      console.log(`Generating content with model: ${modelName}, useSearch: ${useSearch}, isInitial: ${isInitialGeneration}`);
      if (modelRequestConfig.responseMimeType) {
        console.log(`Requesting responseMimeType: ${modelRequestConfig.responseMimeType}`);
      }

      const response: GenerateContentResponse = await this.ai.models.generateContent(generateContentRequest);

      let parsedData;
      let jsonStr = response.text?.trim() || "";

      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim(); 
      }

      try {
        if (!jsonStr) {
            throw new Error("AI_SERVICE_ERROR: AI returned an empty response string.");
        }
        if (! (jsonStr.startsWith('{') && jsonStr.endsWith('}')) && ! (jsonStr.startsWith('[') && jsonStr.endsWith(']')) ) {
            console.error("Cleaned string does not appear to be a JSON object or array. Raw string (first 500 chars):", jsonStr.substring(0,500));
            throw new Error(`AI_SERVICE_ERROR: AI response, after cleaning markdown, does not appear to be a valid JSON object or array. Starts with: '${jsonStr.substring(0,30)}', Ends with: '${jsonStr.substring(jsonStr.length-30)}'. Full string was: ${jsonStr}`);
        }
        parsedData = JSON.parse(jsonStr);
      } catch (e: any) {
        console.error(`Failed to parse JSON response (useSearch: ${useSearch}, responseMimeType for request: ${modelRequestConfig.responseMimeType || 'N/A'}):`, e.message);
        console.error("Raw JSON string attempted to parse (first 3000 chars):", jsonStr.substring(0,3000));
        if (e.message.includes("AI_SERVICE_ERROR: AI response, after cleaning markdown, does not appear to be a valid JSON object or array")) {
            throw e;
        }
        throw new Error(`AI_SERVICE_ERROR: AI returned malformed JSON. Parser error: ${e.message}. (Raw string start: ${jsonStr.substring(0,200)}...)`);
      }
      
      let faultInfo = { type: "", detail: "" };
      const startPatternRegex = /^<div\s+class=(['"])reveal\1>\s*<div\s+class=(['"])slides\2[^>]*>/i;
      const expectedEnd = '</div></div>';
      const sectionTagRegex = /<\s*\/?\s*section\b[^>]*>/i; 

      if (isInitialGeneration) {
        parsedData.html_content = parsedData.html_content?.trim(); 
        const htmlContent = parsedData.html_content; 

        console.log(`Validating Initial HTML. Type: ${typeof htmlContent}, Length: ${htmlContent?.length}, Snippet (start): '${htmlContent?.substring(0,100)}'`);

        if (!htmlContent) {
            faultInfo = { type: "missing", detail: "html_content is null, undefined, or empty after trim." };
        } else if (typeof htmlContent !== 'string') {
            faultInfo = { type: "wrong_type", detail: "html_content is not a string." };
        } else if (!startPatternRegex.test(htmlContent)) {
            faultInfo = { type: "invalid_start", detail: `html_content does not start with the expected <div class='reveal'><div class='slides' ... > structure (checked with regex, attributes allowed on slides div).` };
        } else if (!htmlContent.endsWith(expectedEnd)) {
            faultInfo = { type: "invalid_end", detail: `html_content does not end with '${expectedEnd}'.` };
        } else if (!sectionTagRegex.test(htmlContent)) {
            faultInfo = { type: "no_section_regex", detail: `html_content does not contain a <section> or </section> tag (checked with regex, case-insensitive).` };
        }

        if (!faultInfo.type) { 
            if (!parsedData.chosen_theme || typeof parsedData.chosen_theme !== 'string' || parsedData.chosen_theme.trim() === '') {
                console.warn("AI response parsed, but 'chosen_theme' is missing or invalid. Defaulting.", parsedData);
                parsedData.chosen_theme = "sky"; 
            }
            if (!parsedData.image_suggestions || !Array.isArray(parsedData.image_suggestions)) {
               console.warn("AI response parsed, but 'image_suggestions' is missing or not an array. Proceeding without suggestions.", parsedData);
               parsedData.image_suggestions = [];
            }
            if (!parsedData.enhancement_queries || typeof parsedData.enhancement_queries !== 'string') {
               console.warn("AI response parsed, but 'enhancement_queries' is missing or not a string. Proceeding without queries.", parsedData);
               parsedData.enhancement_queries = "No specific enhancement queries provided by AI.";
            }
        }
      } else { // Enhanced generation
        parsedData.enhanced_html_content = parsedData.enhanced_html_content?.trim(); 
        const htmlContent = parsedData.enhanced_html_content; 

        console.log(`Validating Enhanced HTML. Type: ${typeof htmlContent}, Length: ${htmlContent?.length}, Snippet (start): '${htmlContent?.substring(0,100)}'`);
        
        if (!htmlContent) {
            faultInfo = { type: "missing", detail: "enhanced_html_content is null, undefined, or empty after trim." };
        } else if (typeof htmlContent !== 'string') {
            faultInfo = { type: "wrong_type", detail: "enhanced_html_content is not a string." };
        } else if (!startPatternRegex.test(htmlContent)) {
            faultInfo = { type: "invalid_start", detail: `enhanced_html_content does not start with the expected <div class='reveal'><div class='slides' ... > structure (checked with regex, attributes allowed on slides div).` };
        } else if (!htmlContent.endsWith(expectedEnd)) {
            faultInfo = { type: "invalid_end", detail: `enhanced_html_content does not end with '${expectedEnd}'.` };
        } else if (!sectionTagRegex.test(htmlContent)) { 
            faultInfo = { type: "no_section_regex", detail: `enhanced_html_content does not contain a <section> or </section> tag (checked with regex, case-insensitive).` };
        }
        
        if (!faultInfo.type) { 
            if (!parsedData.ai_confirmation_or_further_queries || typeof parsedData.ai_confirmation_or_further_queries !== 'string') {
               console.warn("AI response parsed, but 'ai_confirmation_or_further_queries' is missing or not a string.", parsedData);
               parsedData.ai_confirmation_or_further_queries = "Enhanced presentation generated.";
            }
        }
      }

      if (faultInfo.type) {
            const currentHtmlContentForDisplay = isInitialGeneration ? parsedData.html_content : parsedData.enhanced_html_content;
            const displayHtmlStart = (typeof currentHtmlContentForDisplay === 'string' && currentHtmlContentForDisplay.length > 0) 
                ? currentHtmlContentForDisplay.substring(0, 200) + "..." 
                : (currentHtmlContentForDisplay === "" ? "[EMPTY STRING]" : String(currentHtmlContentForDisplay));
            
            const displayHtmlEnd = (typeof currentHtmlContentForDisplay === 'string' && currentHtmlContentForDisplay.length > 200) 
                ? "..." + currentHtmlContentForDisplay.substring(currentHtmlContentForDisplay.length - 200) 
                : "";

            console.error(`${isInitialGeneration ? 'Initial' : 'Enhanced'} HTML validation failed: ${faultInfo.detail}`);
            console.error(`Processed html_content (start): ${displayHtmlStart}`);
            if (displayHtmlEnd) console.error(`Processed html_content (end): ${displayHtmlEnd}`);
            throw new Error(`AI_SERVICE_ERROR: AI failed to provide valid ${isInitialGeneration ? 'initial' : 'enhanced'} core HTML content. Reason: [${faultInfo.type}] ${faultInfo.detail} Received (processed start): '${displayHtmlStart}' Received (processed end): '${displayHtmlEnd}'`);
      }

      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          parsedData.search_results = response.candidates[0].groundingMetadata.groundingChunks
              .filter(chunk => chunk.web && chunk.web.uri) 
              .map(chunk => ({
                  uri: chunk.web.uri!, 
                  title: chunk.web.title || chunk.web.uri! 
              }));
      } else if (parsedData.search_results && !Array.isArray(parsedData.search_results)) {
        console.warn("Parsed 'search_results' was not an array, defaulting to empty array.");
        parsedData.search_results = [];
      } else if (!parsedData.search_results) {
        parsedData.search_results = [];
      }
      
      return parsedData;

    } catch (error) {
      console.error("GeminiService Error in generateWithConfig:", error);
      if (error instanceof Error) {
        if (error.message.startsWith("AI_SERVICE_ERROR:") || 
            error.message.includes("AI failed to provide") || 
            error.message.includes("AI returned malformed JSON") || 
            error.message.includes("AI returned an empty") ||
            error.message.includes("AI response, after cleaning markdown, does not appear to be a valid JSON object") ||
            error.message.includes("got status: 400 INVALID_ARGUMENT") || 
            error.message.includes("GoogleGenerativeAI Error")) { 
            throw error;
        }
        throw new Error(`Gemini API request failed or an unexpected processing error occurred: ${error.message}`);
      }
      throw new Error("An unknown error occurred within the GeminiService's generateWithConfig function.");
    }
  }

  public async generateInitialPresentation(
    userData: string, 
    n: number, 
    mode: 'data' | 'topic', 
    modelName: AvailableModel,
    explicitUseSearch?: boolean 
  ): Promise<InitialAIResponse> {
    
    let useSearchForThisCall = false;
    if (mode === 'topic') {
      useSearchForThisCall = explicitUseSearch === true; 
    }

    let inputSection: string;
    if (mode === 'topic') {
        if (useSearchForThisCall) {
            inputSection = `The user wants a presentation on the topic: "${userData}". Use Google Search to gather relevant information. If you use search, the system will automatically provide the source URLs. Focus on generating the presentation content from the search results.`;
        } else {
            inputSection = `The user wants a presentation on the topic: "${userData}". Generate content based on your existing knowledge about this topic. Do NOT use Google Search for this request.`;
        }
    } else {
        inputSection = `The user has provided the following source documents/data: --- START DATA --- \n${userData}\n --- END DATA ---`;
    }

    const firstPrompt = `
Act as an expert HTML and Reveal.js coder. Your task is to generate the core slide structure and content for a presentation, aiming for a minimum of ${n} slides.

Strict Requirements for this Step:
1. Input: ${inputSection}
2. Exclusive Content: Use only the information present in the provided documents/data (or search results if a topic was given and search was used). Do NOT include any reference numbers, citations, or citation markers.
3. HTML Structure for "html_content" (Reveal.js Core Slides):
   - Output ONLY the core Reveal.js slide structure.
   - This means the content for "html_content" MUST start with \`<div class='reveal'><div class='slides'>\` (using single quotes for class attributes) and contain one or more \`<section>...\</section>\` elements for slides, and end with \`</div></div>\`. Ensure "section" tags are lowercase.
   - The \`<div class='slides'>\` tag itself may contain relevant Reveal.js data attributes IF GENERALLY APPLICABLE to all slides, but avoid slide-specific attributes here. Use single quotes for any such attributes.
   - DO NOT include \`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, \`<body>\`, \`<style>\`, or \`<script>\` tags for Reveal.js setup, themes, or scroll functionality within this "html_content" field. This will be handled by the frontend.
   - Ensure each <section> is well-formed and can function as a Reveal.js slide. Use single quotes for all HTML attributes (e.g. <section data-background-image='image.jpg'>).
   - PER-SLIDE TRANSITIONS: You MUST assign a 'data-transition' attribute to each individual <section> tag. Choose a transition for each slide from the following list: 'none', 'fade', 'slide', 'convex', 'concave', 'zoom', 'page', 'cube', 'coverflow', 'concave-cube', 'convex-cube', 'fade-in-then-out', 'fade-out-then-in'. You can also conceptually choose 'random' for a slide, in which case you (the AI) must pick a suitable varied transition from this list for that specific slide and use that concrete value in the 'data-transition' attribute. Vary transitions per slide for better engagement. Example: <section data-transition='zoom'>...</section> or <section data-transition='fade'>...</section>.
4. Content Layout and Scrolling Strategy:
   - Distribute key information across a minimum of ${n} slides.
   - Content should flow naturally. If content for a slide is extensive, it's expected that a frontend-implemented scroll mechanism will handle it.
   - DO NOT shrink font sizes excessively. Maintain readability.
   - Use clear headings (h1, h2, etc.), paragraphs (<p>), lists (<ul>, <ol>, <li>).
   - Include speaker notes (<aside class='notes'>...</aside>) where appropriate.
   - Use Reveal.js fragments (<p class='fragment'>...</p>) for progressive disclosure.
5. Deferred Enhancements: Focus on slide structure, content accuracy, and per-slide transitions. Advanced visuals and React components are for the next step.

Content for JSON fields:
- "html_content": STRING_VALUE_OF_CORE_REVEAL_SLIDES_HTML_HERE (e.g., \`<div class='reveal'><div class='slides'><section data-transition='slide'>Slide 1</section><section data-transition='zoom'>Slide 2</section></div></div>\`). This HTML snippet must be valid and well-formed, including per-slide 'data-transition' attributes.
- "chosen_theme": String. Choose ONE theme name from: 'black', 'white', 'league', 'beige', 'sky', 'night', 'serif', 'simple', 'solarized', 'blood', 'moon'. (e.g., "sky")
- "image_suggestions": Array of objects for image placements: { "slide_reference": "e.g., Slide 2, Concept X", "description": "intended image (be descriptive, this will be shown to user and potentially used for AI generation)" }.
- "enhancement_queries": String containing questions for the user about desired visual styles, animations, etc. for the next step.
${useSearchForThisCall ? '- "search_results": If Google Search was used and returned results, include an array of { "uri": "URL", "title": "Page Title" } objects. If no results or search not used, this can be an empty array or omitted.' : ''}


CRITICAL: JSON OUTPUT FORMAT
Your *entire response* MUST be a single, valid JSON object string.
- If the model configuration includes \`responseMimeType: "application/json"\` (which it will if Google Search is NOT used for this request), your output MUST be the JSON string directly, without any markdown fences.
- If Google Search IS used for this request (meaning \`responseMimeType\` is NOT "application/json"), you MAY wrap the JSON string in markdown fences (e.g., \`\`\`json\\n{...}\\n\`\`\`). The content INSIDE such fences must be a single, valid JSON object string.
- In ALL cases, there should be NO OTHER TEXT OR EXPLANATION outside the JSON object string (or its markdown fence wrapper if used).
The AI is expected to strictly adhere to this. Failure to produce a valid JSON string that can be parsed directly by 'JSON.parse()' (after any necessary fence removal) will result in an error.

ULTRA-CRITICAL JSON STRING ESCAPING FOR HTML CONTENT ("html_content"):
The HTML content provided in "html_content" MUST be a single, valid JSON string. Adhere to these rules meticulously:
1.  **HTML Attribute Quoting: CRITICAL RULE! You MUST use SINGLE QUOTES for ALL HTML attribute values.** (e.g., \`<section data-transition='fade'\`)
    -   Correct: \`<img src='image.jpg' alt='My image' style='color: blue;'>\`
    -   Incorrect (DO NOT USE): \`<img src="image.jpg" alt="My image" style="color: blue;">\`
    This is the most important rule to prevent JSON parsing errors. The \`<div class='reveal'><div class='slides' ...>\` wrapper itself MUST also use single quotes for its class and any other attributes.
2.  **Escaping Double Quotes in Text:** If a double quote (\") character appears as part of the *text content* of an HTML element (not as an attribute quote, see rule 1), it MUST be escaped as \`\\"\`.
3.  **Escaping Backslashes:** Any literal backslash (\\) character within the HTML MUST be escaped as \`\\\\\\\`.
4.  **Escaping Newlines:** Literal newline characters within the HTML string are FORBIDDEN. They MUST be escaped as \`\\\\n\`.
5.  **Other JSON Control Characters:** Tabs, carriage returns, form feeds, backspaces MUST be escaped as \`\\\\t\`, \`\\\\r\`, \`\\\\f\`, \`\\\\b\` respectively if they appear in the HTML.

Example JSON for "html_content" demonstrating these rules:
{
  "html_content": "<div class='reveal'><div class='slides' data-transition='slide'><section data-transition='zoom' data-background-image='path/to/bg.png' class='custom-slide-class'><h1 style='font-size: 2em;'>A Slide Title</h1><p>This slide contains a \\"quoted phrase\\" and a file path like C:\\\\folder\\\\item.txt. Here is a line break.\\\\nThis is the next line of the paragraph.</p><aside class='notes'>Speaker note here.</aside></section></div></div>",
  "chosen_theme": "sky",
  "image_suggestions": [
    { "slide_reference": "Example: Slide 1, Title Visual", "description": "A dynamic visual representing the core concept of the presentation." }
  ],
  "enhancement_queries": "For enhancement, what visual style (modern, techy) or animations would you like for your presentation?"
  ${useSearchForThisCall ? ', "search_results": []' : ''}
}

The AI must meticulously double-check the generated HTML string for "html_content" for adherence to ALL these escaping rules, especially the mandatory use of single quotes for HTML attributes and correct inclusion of 'data-transition' on each section, BEFORE finalizing the JSON output. Any error in escaping or attribute quoting will lead to a parsing failure.

FINAL STRICT INSTRUCTION: Output *only* the JSON string. Adherence to the JSON structure and ALL escaping rules is paramount.
`;
    return this.generateWithConfig(firstPrompt, modelName, useSearchForThisCall, true);
  }

  public async enhancePresentation(initialCoreHtml: string, userImages: UserProvidedImage[], userEnhancements: string, modelName: AvailableModel): Promise<EnhancedAIResponse> {
    const useSearchForEnhancement = false; 
    
    const promptUserImages = userImages.map((img, index) => {
      const imageEntry: any = {
        type: img.type,
        description: img.description, // User's final description (for alt text, AI context)
      };
      if (img.url && img.url.startsWith('data:image')) {
        imageEntry.url = `ai_image_ref:${index}`; // Placeholder for AI-generated image
      } else {
        imageEntry.url = img.url; // Could be a public URL pasted by the user
      }

      if (img.type === 'ai_suggested') {
        imageEntry.suggestion_reference = img.suggestion_reference;
      } else if (img.type === 'user_defined_existing_slide') {
        imageEntry.slide_number = img.slide_number;
        imageEntry.placement = img.placement;
      } else if (img.type === 'user_defined_new_slide') {
        imageEntry.after_slide_number = img.after_slide_number;
        imageEntry.placement = img.placement;
      }
      return imageEntry;
    });

    const secondPrompt = `
Act as an expert presentation designer and front-end developer. Enhance the provided core Reveal.js HTML slide structure by integrating user images and applying refinements. The goal is a visually distinct and engaging presentation with varied per-slide transitions.

Enhancement Requirements:
1. Input:
   - Base Core HTML (Reveal.js slides structure: \`<div class='reveal'><div class='slides' ... >...</div></div>\`):
     \`\`\`html
     ${initialCoreHtml}
     \`\`\`
   - User Image Inputs (Note: 'description' is the user's final description/prompt, use for alt text. 'url' can be a public URL or 'ai_image_ref:INDEX'):
     \`\`\`json
     ${JSON.stringify(promptUserImages, null, 2)}
     \`\`\`
     Interpret as follows:
     - If an image \`url\` is a standard HTTP/HTTPS link (e.g., from Imgur), use it directly as the \`src\` for an \`<img>\` tag or in \`data-background-image\`.
     - If an image \`url\` is a placeholder like \`ai_image_ref:INDEX\` (e.g., \`ai_image_ref:0\`), this signifies an AI-generated image that the frontend will provide as base64 data. You MUST use this exact placeholder string (e.g., \`ai_image_ref:0\`) as the value in the \`src\` attribute of an \`<img>\` tag, or within a \`url()\` for a CSS background-image property (e.g., \`style='background-image: url(ai_image_ref:0)'\` or \`data-background-image='ai_image_ref:0'\`). The 'description' associated with this placeholder in the input is for your contextual understanding and MUST be used as the alt text.
     - For 'ai_suggested' type images: Insert image (using its \`url\` or placeholder) at a conceptually appropriate place related to 'suggestion_reference' within a slide. You decide if it's inline or background based on the slide content and image description. Use the provided 'description' as alt text.
     - For 'user_defined_existing_slide' type images: Add image (using its \`url\` or placeholder) to slide \`slide_number\`. If \`placement\` is 'background', use it as \`data-background-image\` for the section. If \`placement\` is 'inline', insert it as an \`<img>\` tag. Use the provided 'description' as alt text.
     - For 'user_defined_new_slide' type images: Create a new \`<section>\` with the image (using its \`url\` or placeholder). This new slide MUST be inserted after the slide whose number is \`after_slide_number\`. If \`placement\` is 'background', the new section should use it as \`data-background-image\`. If \`placement\` is 'inline', the new section should contain an \`<img>\` tag. Use the provided 'description' as alt text for the image.
   - User Enhancement Requests:
     --- START USER ENHANCEMENTS ---
     ${userEnhancements || "IMPORTANT: User has not specified particular enhancements beyond image integration. Your goal is to make this presentation visually DISTINCT and highly engaging. Build upon the existing content CREATIVELY. Experiment with typography, vary slide layouts, apply different fragment styles, and consider unique CSS animations or dynamic elements. Make this presentation feel fresh and NOT like a generic template. Your default MUST be to introduce noticeable visual variation and polish directly into the HTML of the slides."}
     --- END USER ENHANCEMENTS ---
     ${useSearchForEnhancement ? `\n- If necessary, use Google Search to find information or assets relevant to the user's enhancement requests. If search is used, list sources in 'search_results'.` : ''}

2. HTML Structure for "enhanced_html_content":
   - Output ONLY the updated core Reveal.js slide structure, starting with \`<div class='reveal'><div class='slides' ...>\` and ending with \`</div></div>\`. Ensure "section" tags are lowercase.
   - DO NOT include \`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, \`<body>\`, global \`<style>\`, or \`<script>\` tags.
   - CRITICAL: Use SINGLE QUOTES for all HTML attributes. For AI-generated image placeholders, ensure they are correctly quoted, e.g. \`src='ai_image_ref:0'\`.
   - PER-SLIDE TRANSITIONS: Review and update the 'data-transition' attribute on each <section> tag as needed based on content and user requests. You can use transitions like: 'none', 'fade', 'slide', 'convex', 'concave', 'zoom', 'page', 'cube', 'coverflow', 'concave-cube', 'convex-cube', 'fade-in-then-out', 'fade-out-then-in'. Vary transitions. Preserve existing 'data-transition' attributes if appropriate. Example: <section data-transition='page'>...</section>.

3. Visual Polish & Engagement:
   - Refine typography, layout, color scheme, and use advanced Reveal.js features like fragments.
   - Content Legibility is highest priority.

4. Image Integration:
   - Integrate images using \`<img>\` tags or \`data-background-image\` attributes on \`<section>\`s.
   - Use placeholders like \`ai_image_ref:INDEX\` for images where the URL was an AI placeholder. The frontend will replace this with actual base64 image data.
   - Use direct public URLs (e.g. https://i.imgur.com/...) if provided in the input 'url' field.
   - Provide meaningful 'alt' attributes using the 'description' from the input JSON for each image.

5. No Citations: Confirm no reference numbers/markers.

Output Format:
A single, valid JSON object string.
- If \`responseMimeType: "application/json"\` is used, output JSON directly.
- If Google Search is used, you MAY wrap JSON in markdown fences.
- NO OTHER TEXT outside the JSON object or its wrapper.

Content for JSON fields:
- "enhanced_html_content": STRING_VALUE_OF_UPDATED_CORE_REVEAL_SLIDES_HTML_HERE (must include per-slide 'data-transition' attributes).
- "ai_confirmation_or_further_queries": String. Confirmation of changes and any further questions.
${useSearchForEnhancement ? '- "search_results": Array of { "uri": "URL", "title": "Page Title" } if search used.' : ''}

ULTRA-CRITICAL JSON STRING ESCAPING FOR HTML CONTENT ("enhanced_html_content"):
Adhere meticulously to all JSON string escaping rules:
1.  **SINGLE QUOTES for ALL HTML attributes.** (e.g., \`<section data-transition='concave'\`)
2.  Escape double quotes in text content as \`\\"\`.
3.  Escape backslashes as \`\\\\\\\`.
4.  Escape newlines as \`\\\\n\`.
5.  Escape other JSON control characters (\`\\\\t\`, \`\\\\r\`, \`\\\\f\`, \`\\\\b\`).

Example JSON for "enhanced_html_content":
{
  "enhanced_html_content": "<div class='reveal'><div class='slides'><section data-transition='cube' data-background-image='ai_image_ref:0' class='custom-slide-class' style='background-color: lightblue;'><h1 style='font-family: Arial;'>Updated Slide 1</h1><p>New content with image <img src='https://i.imgur.com/your_image.png' alt='user provided description' style='width:50%;'> and text with a \\"quote\\" and an AI image <img src='ai_image_ref:1' alt='user edited description for AI image 1'></p></section><section data-transition='slide'><img src='ai_image_ref:2' alt='another ai image description'></section></div></div>",
  "ai_confirmation_or_further_queries": "Images integrated (using placeholders for AI-generated ones if their URL was 'ai_image_ref:INDEX', or direct public URLs if provided; alt text from 'description' used). Per-slide transitions updated, visual style refreshed. Anything else?"
  ${useSearchForEnhancement ? ', "search_results": []' : ''}
}

The AI must meticulously double-check the generated HTML string for "enhanced_html_content" for adherence to ALL these escaping rules, especially single quotes for HTML attributes and inclusion of 'data-transition' on each section, BEFORE finalizing the JSON output.

FINAL STRICT INSTRUCTION: Output *only* the JSON string. Adherence to JSON structure, content escaping, HTML validity, and per-slide transitions is paramount.
`;
    return this.generateWithConfig(secondPrompt, modelName, useSearchForEnhancement, false);
  }

  public async generatePptxTextContent(finalHtmlOutput: string, modelName: AvailableModel): Promise<string> {
    const prompt = `
You are provided with the core HTML structure of a Reveal.js presentation. This HTML consists of a \`<div class='reveal'><div class='slides'>\` container (or possibly <div class="reveal"><div class="slides">), which holds multiple \`<section>\` elements representing individual slides.
Your task is to convert this HTML presentation into a plain text format suitable for manually creating a PowerPoint (PPT) presentation.

The core HTML presentation content is:
\`\`\`html
${finalHtmlOutput}
\`\`\`

Instructions for Plain Text Generation:
1.  Iterate through each top-level \`<section>\` element found directly inside the slides container. Each \`<section>\` represents one slide.
2.  For each slide:
    a.  Start with "Slide X" where X is the slide number (starting from 1).
    b.  If the slide has a 'data-transition' attribute, note it. E.g., "Transition: [value of data-transition]". If no attribute, omit.
    c.  Identify the main heading(s) (e.g., \`<h1>\`, \`<h2>\`). If found, format as "Heading: [Heading Text]".
    d.  Extract all primary textual content from paragraphs (\`<\p>\`), lists (\`<ul>\`, \`<ol>\`, \`<li>\`), and other relevant text-bearing elements. Preserve list formatting.
    e.  If an image (\`<img>\`) is present, include its \`alt\` text as "Image: [alt text]". If its \`src\` attribute is an AI placeholder like \`ai_image_ref:index\`, represent this as "Image: [AI-Generated Image Placeholder (was: ai_image_ref:index) - Alt: alt text]". If it's a public URL, state "Image: [URL - e.g., https://...] - Alt: alt text".
    f.  If a section has a \`data-background-image\`, mention it. If the value is an AI placeholder like \`ai_image_ref:index\`, state "Background Image: [AI-Generated Image Placeholder (was: ai_image_ref:index)]". If it's a public URL, state "Background Image: [URL - e.g., https://...]".
    g.  Extract speaker notes if present within \`<aside class='notes'>...\</aside>\` and include them under a "Notes:" label.
    h.  Format the extracted content clearly under a "Content:" label.
3.  Separate each slide's text representation with "---SLIDE BREAK---".
4.  The entire output should be a single plain text string. Do NOT use any JSON or HTML.
5.  Focus on extracting the substance. Avoid HTML tags in the text output.

Example Output Format:

Slide 1
Transition: zoom
Heading: Introduction to AI
Content:
Artificial Intelligence is a rapidly growing field.
It has many applications across various industries.
- Application 1
- Application 2
Notes:
Remember to define AI clearly.

---SLIDE BREAK---

Slide 2
Transition: fade
Heading: Key Concepts
Content:
Machine Learning is a subset of AI.
Deep Learning is a subset of Machine Learning.
Image: [URL - https://example.com/diagram.png] - Alt: A diagram illustrating the relationship between AI, ML, and DL.

---SLIDE BREAK---

Slide 3
Transition: page
Content:
This slide discusses future trends.
Background Image: [AI-Generated Image Placeholder (was: ai_image_ref:0)]

---SLIDE BREAK---

(and so on for all slides)

Output ONLY the plain text content as described.
`;
    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      
      let textContent = response.text?.trim() || "";
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = textContent.match(fenceRegex);
      if (match && match[2]) {
        textContent = match[2].trim();
      }

      if (!textContent) {
        throw new Error("AI_SERVICE_ERROR: AI failed to generate the plain text content for PPT. The response was empty.");
      }
      return textContent;
    } catch (error) {
      console.error("Gemini API Error (Plain Text PPT):", error);
      if (error instanceof Error) {
        if (error.message.startsWith("AI_SERVICE_ERROR: AI failed to generate the plain text content for PPT")) {
            throw error;
        }
        throw new Error(`Gemini API request failed for plain text PPT: ${error.message}`);
      }
      throw new Error("An unknown error occurred with the Gemini API for plain text PPT.");
    }
  }

  public async generateImageFromPrompt(prompt: string): Promise<string> {
    try {
      console.log(`Generating image with prompt: "${prompt}" using model 'imagen-3.0-generate-002'`);
      const response = await this.ai.models.generateImages({
        model: 'imagen-3.0-generate-002', 
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
      });

      if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
      } else {
        console.error("Image generation response missing expected data:", response);
        throw new Error("AI_SERVICE_ERROR: Image generation failed or returned no image data.");
      }
    } catch (error) {
      console.error("GeminiService Error in generateImageFromPrompt:", error);
      if (error instanceof Error) {
         if (error.message.startsWith("AI_SERVICE_ERROR:")) {
            throw error;
        }
        if (error.message.includes("GoogleGenerativeAI Error") || error.message.includes("got status:")) {
             throw new Error(`Image generation API request failed: ${error.message}`);
        }
        throw new Error(`Image generation failed due to an unexpected error: ${error.message}`);
      }
      throw new Error("An unknown error occurred during image generation.");
    }
  }
}
