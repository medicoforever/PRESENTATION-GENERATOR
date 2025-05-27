import React from 'react';
import { AppStep } from '../types';
import { CheckCircleIcon } from './Icons';

interface StepIndicatorProps {
  currentStep: AppStep;
}

// Define the sequence and relevance of steps for the indicator
const STEPS_CONFIG = [
  { 
    id: AppStep.SETUP, 
    label: 'Input Data', 
    relevantStates: [AppStep.SETUP, AppStep.GENERATING_INITIAL] 
  },
  { 
    id: AppStep.INITIAL_HTML_READY, 
    label: 'Initial Draft & AI Feedback', 
    relevantStates: [AppStep.INITIAL_HTML_READY] 
  },
  { 
    id: AppStep.AWAITING_USER_IMAGE_ENHANCEMENT_INPUT, 
    label: 'Your Images & Refinements', 
    relevantStates: [AppStep.AWAITING_USER_IMAGE_ENHANCEMENT_INPUT, AppStep.GENERATING_ENHANCED] 
  },
  { 
    id: AppStep.ENHANCED_HTML_READY, 
    label: 'Enhanced Presentation', 
    relevantStates: [AppStep.ENHANCED_HTML_READY] 
  },
  {
    id: AppStep.PPT_TEXT_READY,
    label: 'PPT Text Output',
    relevantStates: [AppStep.GENERATING_PPT_TEXT, AppStep.PPT_TEXT_READY]
  }
];

const getStepStatus = (stepConfigId: AppStep, currentActualStep: AppStep): 'completed' | 'current' | 'upcoming' => {
  const currentConfig = STEPS_CONFIG.find(s => s.relevantStates.includes(currentActualStep));
  const stepToCheckConfig = STEPS_CONFIG.find(s => s.id === stepConfigId);

  if (!currentConfig || !stepToCheckConfig) {
    // Fallback for safety, though all steps should be covered by relevantStates
     const order = STEPS_CONFIG.map(s => s.id);
     const currentIndex = order.indexOf(currentActualStep);
     const stepIndex = order.indexOf(stepConfigId);

     if (currentIndex === -1 || stepIndex === -1) return 'upcoming'; // Should not happen

     if (stepIndex < currentIndex) return 'completed';
     if (stepIndex === currentIndex) return 'current';
     // If currentActualStep's relevantStates puts it "before" stepConfigId effectively
     if (currentConfig && STEPS_CONFIG.indexOf(stepToCheckConfig) > STEPS_CONFIG.indexOf(currentConfig) ) return 'upcoming';
     // A bit more complex: if currentActualStep is GENERATING_ENHANCED, then ENHANCED_HTML_READY should be upcoming/current logic
     // This is simplified because relevantStates should handle most ordering.
     
     // Direct ordering based on STEPS_CONFIG array
     const currentConfigIndex = STEPS_CONFIG.findIndex(s => s.id === currentConfig?.id);
     const stepToCheckConfigIndex = STEPS_CONFIG.findIndex(s => s.id === stepToCheckConfig?.id);

     if (stepToCheckConfigIndex < currentConfigIndex) return 'completed';
     if (stepToCheckConfigIndex === currentConfigIndex) return 'current';
     return 'upcoming';
  }
  
  const currentIndexInConfigOrder = STEPS_CONFIG.indexOf(currentConfig);
  const stepToCheckIndexInConfigOrder = STEPS_CONFIG.indexOf(stepToCheckConfig);

  if (stepToCheckIndexInConfigOrder < currentIndexInConfigOrder) return 'completed';
  if (stepToCheckIndexInConfigOrder === currentIndexInConfigOrder) return 'current';
  return 'upcoming';
};


const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol role="list" className="flex items-center justify-around space-x-1 md:space-x-2">
        {STEPS_CONFIG.map((step, stepIdx) => {
          const status = getStepStatus(step.id, currentStep);
          return (
            <li key={step.label} className="relative flex-1">
              {stepIdx !== 0 && (
                // Connector line
                <div className="absolute inset-0 flex items-center" aria-hidden="true" 
                     style={{left: '-50%', right: '50%', top: '0.9rem', position: 'absolute', transform: 'translateY(-50%)'}}>
                  <div className={`h-0.5 w-full ${getStepStatus(STEPS_CONFIG[stepIdx-1].id, currentStep) === 'completed' ? 'bg-sky-500' : 'bg-slate-700'}`}></div>
                </div>
              )}
              <div
                className={`relative flex flex-col items-center text-center
                  transition-all duration-300 ease-in-out group`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full
                  ${status === 'completed' ? 'bg-sky-500 group-hover:bg-sky-400' : ''}
                  ${status === 'current' ? 'border-2 border-sky-500 bg-slate-700 scale-110 shadow-lg' : ''}
                  ${status === 'upcoming' ? 'border-2 border-slate-600 bg-slate-800 group-hover:border-slate-500' : ''}
                `}>
                  {status === 'completed' ? (
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  ) : (
                    <span className={`h-2.5 w-2.5 rounded-full 
                      ${status === 'current' ? 'bg-sky-400 animate-pulse' : 'bg-slate-600'}
                    `}></span>
                  )}
                </div>
                 <span className={`mt-2 block w-max max-w-[100px] md:max-w-[120px] text-xs font-medium 
                   ${status === 'current' ? 'text-sky-300' : 'text-slate-400 group-hover:text-slate-200'}
                 `}>{step.label}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default StepIndicator;