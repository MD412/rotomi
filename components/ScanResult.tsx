
import React, { useState, useCallback, useEffect } from 'react';
import { MultiScanResult, DetectedCard, PokemonCard } from '../types';
import { AddIcon, RetryIcon, CheckIcon, DebugIcon } from './icons';
import DevPanel from './DevPanel';

interface ScanResultProps {
  scanResult: MultiScanResult;
  onAddToCollection: (card: PokemonCard) => void;
  onRetry: () => void;
}

interface DetectedCardDisplayProps {
  card: DetectedCard;
  onAdd: () => void;
  isAdded: boolean;
  onClick: () => void;
  isSelected: boolean;
}

const DetectedCardDisplay: React.FC<DetectedCardDisplayProps> = ({ card, onAdd, isAdded, onClick, isSelected }) => {
  const confidenceColor =
    card.confidence > 0.9 ? 'text-green-400' : card.confidence > 0.8 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div 
        onClick={onClick}
        className={`bg-gray-800 rounded-lg overflow-hidden shadow-lg border flex flex-col cursor-pointer transition-all duration-200 ${
            isSelected ? 'border-blue-500 scale-105 shadow-blue-500/30' : 'border-gray-700'
        }`}
    >
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
                onClick={(e) => {
                    e.stopPropagation(); // Prevent card selection when adding
                    onAdd();
                }}
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
  const [addedCards, setAddedCards] = useState<Set<number>>(new Set());
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);

  // Reset selection and added cards when new results come in
  useEffect(() => {
    setSelectedCardIndex(null);
    setAddedCards(new Set());
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
      scanResult.cards_detected.forEach((card, index) => {
          if(!addedCards.has(index) && card.croppedImageUrl) {
              handleAdd(card, index);
          }
      });
  }, [scanResult.cards_detected, addedCards, handleAdd]);

  const handleCardClick = (index: number) => {
    setSelectedCardIndex(index);
    if (!isDevPanelOpen) {
      setIsDevPanelOpen(true);
    }
  };
  
  const allCardsAdded = scanResult.cards_detected.length > 0 && addedCards.size === scanResult.cards_detected.length;

  return (
    <div className="w-full max-w-7xl animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div className="flex items-center gap-4">
                <h2 className="text-3xl font-bold text-white">Scan Results: <span className="text-blue-400">{scanResult.total_detected} Cards Found</span></h2>
                <button
                    onClick={() => setIsDevPanelOpen(true)}
                    title="Open Debug Panel"
                    className="p-2 rounded-full text-gray-400 bg-gray-800 hover:bg-gray-700 hover:text-white transition-colors"
                >
                    <DebugIcon className="h-5 w-5" />
                </button>
            </div>
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
            {scanResult.cards_detected.map((card, index) => (
                <DetectedCardDisplay 
                    key={`${card.name}-${index}`}
                    card={card}
                    onAdd={() => handleAdd(card, index)}
                    isAdded={addedCards.has(index)}
                    onClick={() => handleCardClick(index)}
                    isSelected={selectedCardIndex === index}
                />
            ))}
        </div>

        <DevPanel 
            isOpen={isDevPanelOpen}
            onClose={() => {
                setIsDevPanelOpen(false);
                setSelectedCardIndex(null);
            }}
            scanResult={scanResult}
            selectedCardIndex={selectedCardIndex}
        />
    </div>
  );
};

export default ScanResult;
