
import React from 'react';
import { AvailableModel } from '../types';

interface ModelSelectorProps {
  selectedModel: AvailableModel;
  onModelChange: (model: AvailableModel) => void;
  availableModels: AvailableModel[];
  id?: string;
  label?: string;
  className?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  availableModels,
  id = "model-select",
  label = "Select AI Model:",
  className = "mb-6 p-4 bg-slate-800/50 rounded-lg shadow"
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">
        {label}
      </label>
      <select
        id={id}
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value as AvailableModel)}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md text-slate-100"
        aria-label={label}
      >
        {availableModels.map(modelName => (
          <option key={modelName} value={modelName}>
            {modelName}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-slate-400">
        'pro' models are generally more capable. 'flash' models are faster. Current default is 'gemini-2.5-pro-preview-05-06'.
      </p>
    </div>
  );
};

export default ModelSelector;
