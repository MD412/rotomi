import React, { useState, useCallback } from 'react';
import { identifyCardsInImage } from '../services/geminiService';
import { MultiScanResult, DetectedCard } from '../types';
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
    "Preparing image...",
    "Scanning with Gemini...",
    "Analyzing results...",
    "Cropping card images...",
    "Finalizing scan...",
];

const Uploader: React.FC<UploaderProps> = ({ onScanComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (files.length > 1) {
        setError("Multi-image upload is not supported in this version. Please upload one image at a time.");
        return;
    }
    const file = files[0];

    setIsProcessing(true);
    setError(null);
    setCurrentStep(0);
    setProcessingMessage('Starting process...');

    let stepInterval: number | undefined;

    try {
      stepInterval = window.setInterval(() => {
        setCurrentStep(prev => (prev + 1) % processingSteps.length);
      }, 1500);
      
      // 1. Convert HEIC if necessary
      setProcessingMessage(`Preparing ${file.name}...`);
      const fileNameLower = file.name.toLowerCase();
      let processedFile = file;
      if ((fileNameLower.endsWith('.heic') || fileNameLower.endsWith('.heif'))) {
        if (!window.heic2any) {
          throw new Error("HEIC conversion library failed to load. Please try another format.");
        }
        setProcessingMessage(`Converting ${file.name}...`);
        const convertedBlob = await window.heic2any({
          blob: file, toType: 'image/jpeg', quality: 0.92,
        });
        const blobToUse = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpeg');
        processedFile = new File([blobToUse], newFileName, { type: 'image/jpeg' });
      }

      // 2. Identify all cards in a single, powerful API call
      setCurrentStep(1);
      setProcessingMessage("Scanning with Gemini...");
      const detectedCardsRaw = await identifyCardsInImage(processedFile);

      setCurrentStep(2);
      setProcessingMessage("Analyzing results...");
      if (!detectedCardsRaw || detectedCardsRaw.length === 0) {
        onScanComplete({ cards_detected: [], total_detected: 0, originalImageUrls: [URL.createObjectURL(processedFile)] });
        return;
      }

      // 3. Crop images based on bounding boxes returned from the API
      setCurrentStep(3);
      setProcessingMessage(`Cropping ${detectedCardsRaw.length} cards...`);
      const originalImageUrl = URL.createObjectURL(processedFile);
      const originalImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = originalImageUrl;
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error("Failed to load image for cropping." + err));
      });

      const PADDING = 4; // Outset for cropping to add a small border
      const enrichedCardsPromises = detectedCardsRaw.map(async (card) => {
          const [x_center_norm, y_center_norm, width_norm, height_norm] = card.bounding_box;
            
          const abs_width = width_norm * originalImage.width;
          const abs_height = height_norm * originalImage.height;
          const abs_x_center = x_center_norm * originalImage.width;
          const abs_y_center = y_center_norm * originalImage.height;

          let sx = abs_x_center - (abs_width / 2) - PADDING;
          let sy = abs_y_center - (abs_height / 2) - PADDING;
          let sWidth = abs_width + (PADDING * 2);
          let sHeight = abs_height + (PADDING * 2);

          sx = Math.max(0, sx);
          sy = Math.max(0, sy);
          sWidth = Math.min(originalImage.width - sx, sWidth);
          sHeight = Math.min(originalImage.height - sy, sHeight);
            
          const canvas = document.createElement('canvas');
          canvas.width = sWidth;
          canvas.height = sHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return { ...card, imageIndex: 0 };
          
          ctx.drawImage(originalImage, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
          
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
          
          return {
            ...card,
            imageIndex: 0,
            croppedImageUrl: blob ? URL.createObjectURL(blob) : undefined,
          };
      });

      const detectedCards: DetectedCard[] = await Promise.all(enrichedCardsPromises);
      
      setCurrentStep(4);
      const finalResult: MultiScanResult = {
        cards_detected: detectedCards,
        total_detected: detectedCards.length,
        originalImageUrls: [originalImageUrl],
      };

      onScanComplete(finalResult);

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
            <p className="mt-3 max-w-md mx-auto text-lg text-gray-400">Upload a photo of your Pokémon cards to instantly identify and add them to your collection.</p>
        </div>
      <div className="relative w-full p-8 border-2 border-dashed border-gray-600 rounded-xl hover:border-blue-500 transition-colors duration-300 bg-gray-800/50">
        <input
          type="file"
          id="file-upload"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept="image/*,.heic,.heif"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center text-center cursor-pointer">
          <UploadIcon className="h-12 w-12 text-gray-500 mb-4" />
          <p className="text-lg font-semibold text-white">Click to upload or drag and drop</p>

          <p className="text-sm text-gray-400">PNG, JPG, WEBP, or HEIC</p>
        </label>
      </div>
       {error && <p className="mt-4 text-red-400 bg-red-900/50 px-4 py-2 rounded-md">{error}</p>}
    </div>
  );
};

export default Uploader;