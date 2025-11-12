import React, { useState, useCallback } from 'react';
import { PokemonCard, MultiScanResult } from './types';
import Header from './components/Header';
import Uploader from './components/Uploader';
import ScanResult from './components/ScanResult';
import Collection from './components/Collection';

type View = 'scanner' | 'collection';

const App: React.FC = () => {
  const [view, setView] = useState<View>('scanner');
  const [scanResult, setScanResult] = useState<MultiScanResult | null>(null);
  const [collection, setCollection] = useState<PokemonCard[]>([]);

  const handleScanComplete = useCallback((data: MultiScanResult) => {
    setScanResult(data);
  }, []);

  const handleAddToCollection = useCallback((card: PokemonCard) => {
    setCollection(prevCollection => {
      const existingCardIndex = prevCollection.findIndex(c => c.name === card.name && c.number === card.number && c.setName === card.setName);
      if (existingCardIndex > -1) {
        const newCollection = [...prevCollection];
        newCollection[existingCardIndex] = {
          ...newCollection[existingCardIndex],
          quantity: (newCollection[existingCardIndex].quantity || 1) + 1,
        };
        return newCollection;
      }
      return [...prevCollection, { ...card, quantity: 1 }];
    });
  }, []);

  const handleResetScanner = useCallback(() => {
    setScanResult(null);
  }, []);

  const handleNavigate = useCallback((newView: View) => {
    setView(newView);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <Header currentView={view} onNavigate={handleNavigate} />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {view === 'scanner' && (
          <div className="flex flex-col items-center">
            {!scanResult ? (
              <Uploader onScanComplete={handleScanComplete} />
            ) : (
              <ScanResult
                scanResult={scanResult}
                onAddToCollection={handleAddToCollection}
                onRetry={handleResetScanner}
              />
            )}
          </div>
        )}
        {view === 'collection' && <Collection cards={collection} />}
      </main>
      <footer className="text-center p-4 text-gray-500 text-sm">
        <p>&copy; 2025 Project Arceus. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </footer>
    </div>
  );
};

export default App;
