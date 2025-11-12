import React, { useState, useCallback } from 'react';
import { identifyCards } from '../services/geminiService';
import { MultiScanResult } from '../types';
import { UploadIcon, ProcessingIcon } from './icons';

// Add type declaration for the HEIC conversion library
declare global {
  interface Window {
    heic2any?: (options: {
      blob: Blob;
      toType?: string;
      quality?: number;
    }) => Promise<Blob | Blob[]>;
  }
}

interface UploaderProps {
  onScanComplete: (cardData: MultiScanResult) => void;
}

const processingSteps = [
  "Normalizing aspect ratio...",
  "Denoising and color correcting...",
  "Locating cards with YOLOv8...",
  "Generating embeddings with OpenCLIP...",
  "Resolving with Gemini...",
  "Enriching metadata...",
];

const Uploader: React.FC<UploaderProps> = ({ onScanComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setCurrentStep(0);
    setProcessingMessage(`Preparing ${files.length} image${files.length > 1 ? 's' : ''}...`);

    let stepInterval: number | undefined;

    try {
      const fileArray = Array.from(files);
      
      const conversionPromises = fileArray.map(async (file) => {
        const fileNameLower = file.name.toLowerCase();
        if ((fileNameLower.endsWith('.heic') || fileNameLower.endsWith('.heif'))) {
          if (!window.heic2any) {
            throw new Error("HEIC conversion library failed to load. Please try another format.");
          }
          setProcessingMessage(`Converting ${file.name}...`);
          const convertedBlob = await window.heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.92,
          });
          const blobToUse = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpeg');
          return new File([blobToUse], newFileName, { type: 'image/jpeg' });
        }
        return file;
      });

      const processedFiles = await Promise.all(conversionPromises);

      setProcessingMessage(`Processing ${processedFiles.length} image${processedFiles.length > 1 ? 's' : ''}...`);
      
      stepInterval = window.setInterval(() => {
        setCurrentStep(prev => (prev + 1) % processingSteps.length);
      }, 1500);
      
      const imageUrls = processedFiles.map(file => URL.createObjectURL(file));

      const identificationPromises = processedFiles.map(file => identifyCards(file));
      const results = await Promise.all(identificationPromises);

      const combinedResult: MultiScanResult = {
        cards_detected: [],
        total_detected: 0,
        originalImageUrls: imageUrls,
      };

      results.forEach((result, index) => {
        if (result && result.cards_detected) {
          combinedResult.total_detected += result.total_detected || 0;
          const cardsWithImageIndex = result.cards_detected.map(card => ({
            ...card,
            imageIndex: index,
          }));
          combinedResult.cards_detected.push(...cardsWithImageIndex);
        }
      });

      onScanComplete(combinedResult);

    } catch (e) {
      if (e instanceof Error) {
          setError(e.message);
      } else {
          setError("An unknown error occurred during processing.");
      }
    } finally {
      if (stepInterval) clearInterval(stepInterval);
      setIsProcessing(false);
    }
  }, [onScanComplete]);

  if (isProcessing) {
    return (
      <div className="w-full max-w-lg text-center p-8 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
        <ProcessingIcon className="h-16 w-16 text-blue-500 mx-auto animate-spin" />
        <h2 className="mt-4 text-xl font-bold text-white">Processing Scan</h2>
        <p className="mt-2 text-gray-400">{processingMessage}</p>
        <div className="mt-6 h-4 bg-gray-700 rounded-full overflow-hidden">
           <div className="h-full bg-blue-600 rounded-full" style={{ width: `${((currentStep + 1) / processingSteps.length) * 100}%` }}></div>
        </div>
        <p className="mt-3 text-sm text-blue-300 font-medium transition-opacity duration-500">
          {processingSteps[currentStep]}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl flex flex-col items-center">
        <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">AI-Powered TCG Scanner</h1>
            <p className="mt-3 max-w-md mx-auto text-lg text-gray-400">Upload photos of your Pokémon cards to instantly identify and add them to your collection.</p>
        </div>
      <div className="relative w-full p-8 border-2 border-dashed border-gray-600 rounded-xl hover:border-blue-500 transition-colors duration-300 bg-gray-800/50">
        <input
          type="file"
          id="file-upload"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept="image/*,.heic,.heif"
          onChange={handleFileChange}
          disabled={isProcessing}
          multiple
        />
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center text-center cursor-pointer">
          <UploadIcon className="h-12 w-12 text-gray-500 mb-4" />
          <p className="text-lg font-semibold text-white">Click to upload or drag and drop</p>
          <p className="text-sm text-gray-400">PNG, JPG, WEBP, or HEIC (multiple files supported)</p>
        </label>
      </div>
       {error && <p className="mt-4 text-red-400 bg-red-900/50 px-4 py-2 rounded-md">{error}</p>}
    </div>
  );
};

export default Uploader;