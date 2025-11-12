
import React, { useState, useEffect, useCallback } from 'react';
import { MultiScanResult, DetectedCard, PokemonCard } from '../types';
import { AddIcon, RetryIcon, CheckIcon } from './icons';

interface ScanResultProps {
  scanResult: MultiScanResult;
  onAddToCollection: (card: PokemonCard) => void;
  onRetry: () => void;
}

const DetectedCardDisplay: React.FC<{
  card: DetectedCard;
  onAdd: () => void;
  isAdded: boolean;
}> = ({ card, onAdd, isAdded }) => {
  const confidenceColor =
    card.confidence > 0.9 ? 'text-green-400' : card.confidence > 0.8 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 flex flex-col">
      <div className="bg-gray-900 flex items-center justify-center aspect-[3/4]">
        {card.croppedImageUrl ? (
          <img src={card.croppedImageUrl} alt={card.name} className="object-contain w-full h-full" />
        ) : (
          <div className="text-gray-500">Loading...</div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-bold text-white truncate">{card.name}</h3>
        <p className="text-sm text-gray-400 truncate">{card.set} - {card.card_number}</p>
        <p className="text-xs text-gray-500 mt-1">{card.rarity}</p>
        <div className="flex-grow"></div>
        <div className="flex justify-between items-center mt-3">
            <p className={`text-sm font-semibold ${confidenceColor}`}>
                {(card.confidence * 100).toFixed(1)}%
            </p>
            <button
                onClick={onAdd}
                disabled={isAdded}
                className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isAdded
                    ? 'bg-green-700 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
                {isAdded ? <CheckIcon className="h-4 w-4 mr-1"/> : <AddIcon className="h-4 w-4 mr-1"/>}
                {isAdded ? 'Added' : 'Add'}
            </button>
        </div>
      </div>
    </div>
  );
};

const ScanResult: React.FC<ScanResultProps> = ({ scanResult, onAddToCollection, onRetry }) => {
  const [cardsWithImages, setCardsWithImages] = useState<DetectedCard[]>([]);
  const [addedCards, setAddedCards] = useState<Set<number>>(new Set());

  useEffect(() => {
    const cropImages = async () => {
      if (!scanResult.originalImageUrls || scanResult.originalImageUrls.length === 0) {
        setCardsWithImages(scanResult.cards_detected);
        return;
      }
      
      const imageLoadPromises = scanResult.originalImageUrls.map(url => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = url;
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        });
      });

      try {
        const originalImages = await Promise.all(imageLoadPromises);
        const PADDING = 5;

        const processedCards = scanResult.cards_detected.map(card => {
          const originalImage = originalImages[card.imageIndex];
          if (!originalImage) return card;

          const [x_center_norm, y_center_norm, width_norm, height_norm] = card.bounding_box;

          const abs_width = width_norm * originalImage.width;
          const abs_height = height_norm * originalImage.height;
          const abs_x_center = x_center_norm * originalImage.width;
          const abs_y_center = y_center_norm * originalImage.height;

          let sx = abs_x_center - (abs_width / 2);
          let sy = abs_y_center - (abs_height / 2);

          let sWidth = abs_width;
          let sHeight = abs_height;

          sx = Math.max(0, sx - PADDING);
          sy = Math.max(0, sy - PADDING);
          const sWidthPadded = sWidth + (PADDING * 2);
          const sHeightPadded = sHeight + (PADDING * 2);

          sWidth = Math.min(originalImage.width - sx, sWidthPadded);
          sHeight = Math.min(originalImage.height - sy, sHeightPadded);
          
          const canvas = document.createElement('canvas');
          canvas.width = sWidth;
          canvas.height = sHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(originalImage, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
            return { ...card, croppedImageUrl: canvas.toDataURL('image/jpeg') };
          }
          return card;
        });
        setCardsWithImages(processedCards);

      } catch (error) {
        console.error("Failed to load one or more images for cropping.", error);
        setCardsWithImages(scanResult.cards_detected);
      }
    };

    if (scanResult.cards_detected.length > 0) {
      cropImages();
    }
  }, [scanResult]);

  const handleAdd = useCallback((card: DetectedCard, index: number) => {
    if (addedCards.has(index) || !card.croppedImageUrl) return;

    const newCard: PokemonCard = {
      id: `${card.set}-${card.card_number}-${Date.now()}`,
      name: card.name,
      setName: card.set,
      number: card.card_number,
      rarity: card.rarity,
      marketPrice: 0,
      imageUrl: card.croppedImageUrl,
      quantity: 1,
    };
    onAddToCollection(newCard);
    setAddedCards(prev => new Set(prev).add(index));
  }, [onAddToCollection, addedCards]);

  const handleAddAll = useCallback(() => {
      cardsWithImages.forEach((card, index) => {
          if(!addedCards.has(index) && card.croppedImageUrl) {
              handleAdd(card, index);
          }
      });
  }, [cardsWithImages, addedCards, handleAdd]);
  
  const allCardsAdded = cardsWithImages.length > 0 && addedCards.size === cardsWithImages.length;

  return (
    <div className="w-full max-w-7xl animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white">Scan Results: <span className="text-blue-400">{scanResult.total_detected} Cards Found</span></h2>
            <div className="flex gap-4 mt-4 md:mt-0">
                <button
                    onClick={handleAddAll}
                    disabled={allCardsAdded}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    <AddIcon className="h-5 w-5 mr-2" />
                    Add All to Collection
                </button>
                <button
                    onClick={onRetry}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                    <RetryIcon className="h-5 w-5 mr-2" />
                    Scan Another
                </button>
            </div>
        </div>
      
        {scanResult.cards_detected.length === 0 && (
            <div className="text-center bg-gray-800 p-10 rounded-lg border border-gray-700">
                <p className="text-gray-400">The AI could not detect any cards in this image. Please try another photo.</p>
            </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {cardsWithImages.map((card, index) => (
                <DetectedCardDisplay 
                    key={`${card.name}-${index}`}
                    card={card}
                    onAdd={() => handleAdd(card, index)}
                    isAdded={addedCards.has(index)}
                />
            ))}
        </div>
    </div>
  );
};

export default ScanResult;
