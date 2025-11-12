
import React, { useState, useEffect, useRef } from 'react';
import { MultiScanResult, DetectedCard } from '../types';
import { CloseIcon } from './icons';

interface DevPanelProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: MultiScanResult;
  selectedCardIndex: number | null;
}

const DevPanel: React.FC<DevPanelProps> = ({ isOpen, onClose, scanResult, selectedCardIndex }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const selectedOriginalImageUrl = scanResult.originalImageUrls[activeImageIndex];

  // Effect to draw bounding boxes
  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !scanResult) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Sync canvas size with displayed image size
      canvas.width = image.clientWidth;
      canvas.height = image.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      scanResult.cards_detected.forEach((card, index) => {
        if (card.imageIndex !== activeImageIndex) return;

        const [x_center, y_center, width, height] = card.bounding_box;
        const rectX = (x_center - width / 2) * canvas.width;
        const rectY = (y_center - height / 2) * canvas.height;
        const rectWidth = width * canvas.width;
        const rectHeight = height * canvas.height;

        const isSelected = index === selectedCardIndex;
        ctx.strokeStyle = isSelected ? '#3b82f6' : '#f59e0b'; // blue for selected, amber for others
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
        
        // Add label
        ctx.fillStyle = isSelected ? '#3b82f6' : '#f59e0b';
        ctx.font = '12px "Inter", sans-serif';
        const label = `${card.name} (${(card.confidence * 100).toFixed(0)}%)`;
        ctx.fillText(label, rectX, rectY > 15 ? rectY - 5 : rectY + rectHeight + 15);
      });
    };

    if (image.complete && image.naturalHeight !== 0) {
      draw();
    } else {
      image.onload = draw;
    }
    
    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(image);

    return () => {
      image.onload = null;
      resizeObserver.disconnect();
    };
  }, [scanResult, selectedCardIndex, activeImageIndex]);

  // Reset active image when panel opens and scanResult changes
  useEffect(() => {
    if (isOpen) {
      setActiveImageIndex(0);
    }
  }, [isOpen, scanResult]);

  const selectedDetection = selectedCardIndex !== null ? scanResult.cards_detected[selectedCardIndex] : null;

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Panel */}
      <aside 
        role="dialog"
        aria-modal="true"
        aria-labelledby="dev-panel-title"
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-gray-800 border-l border-gray-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
            <h2 id="dev-panel-title" className="text-xl font-bold text-white">Debug Panel</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close debug panel">
              <CloseIcon className="h-6 w-6" />
            </button>
          </header>

          <div className="flex-grow p-4 overflow-y-auto">
            {/* Image Viewer */}
            <section className="mb-4" aria-labelledby="image-viewer-title">
              <h3 id="image-viewer-title" className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Original Image with Detections</h3>
              <div className="relative">
                <img
                  ref={imageRef}
                  src={selectedOriginalImageUrl}
                  alt={`Original scan ${activeImageIndex + 1}`}
                  className="w-full h-auto rounded-md bg-gray-900"
                />
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
              </div>
              {scanResult.originalImageUrls.length > 1 && (
                <div className="flex justify-center gap-2 mt-2" role="tablist" aria-label="Original images">
                  {scanResult.originalImageUrls.map((_, index) => (
                    <button
                      key={index}
                      role="tab"
                      aria-selected={activeImageIndex === index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`h-2 w-6 rounded-full transition-colors ${activeImageIndex === index ? 'bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'}`}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Selected Card Info */}
            {selectedDetection && (
              <section className="mb-4" aria-labelledby="selected-card-title">
                 <h3 id="selected-card-title" className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Selected Card Details</h3>
                 <div className="bg-gray-900/50 p-3 rounded-md">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all font-mono">
                        {JSON.stringify(selectedDetection, null, 2)}
                    </pre>
                 </div>
              </section>
            )}

            {/* Raw JSON Output */}
            <section aria-labelledby="raw-output-title">
              <h3 id="raw-output-title" className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Full Raw Model Output</h3>
              <div className="bg-gray-900/50 p-3 rounded-md max-h-96 overflow-y-auto">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all font-mono">
                  {JSON.stringify(scanResult, null, 2)}
                </pre>
              </div>
            </section>
          </div>
        </div>
      </aside>
    </>
  );
};

export default DevPanel;
