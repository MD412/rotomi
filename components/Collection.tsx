
import React, { useState, useMemo } from 'react';
import { PokemonCard } from '../types';
import Card from './Card';
import { CollectionIcon } from './icons';

interface CollectionProps {
  cards: PokemonCard[];
}

const Collection: React.FC<CollectionProps> = ({ cards }) => {
  const [filter, setFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState('all');

  const uniqueRarities = useMemo(() => {
    const rarities = new Set(cards.map(card => card.rarity));
    return ['all', ...Array.from(rarities)];
  }, [cards]);

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      const matchesSearch = card.name.toLowerCase().includes(filter.toLowerCase()) || 
                             card.setName.toLowerCase().includes(filter.toLowerCase());
      const matchesRarity = rarityFilter === 'all' || card.rarity === rarityFilter;
      return matchesSearch && matchesRarity;
    });
  }, [cards, filter, rarityFilter]);

  if (cards.length === 0) {
    return (
        <div className="text-center py-20">
            <CollectionIcon className="mx-auto h-24 w-24 text-gray-600" />
            <h3 className="mt-4 text-2xl font-semibold text-white">Your Collection is Empty</h3>
            <p className="mt-2 text-lg text-gray-400">Use the scanner to add your first card!</p>
        </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 bg-gray-800 p-4 rounded-lg sticky top-[65px] z-40 border border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by name or set..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full md:w-1/2 bg-gray-700 border border-gray-600 text-white rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="w-full md:w-1/2 bg-gray-700 border border-gray-600 text-white rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            {uniqueRarities.map(rarity => (
              <option key={rarity} value={rarity}>{rarity.charAt(0).toUpperCase() + rarity.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
      
      {filteredCards.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredCards.map(card => (
            <Card key={card.id} card={card} />
            ))}
        </div>
      ) : (
        <div className="text-center py-10">
            <p className="text-gray-400">No cards match your filters.</p>
        </div>
      )}
    </div>
  );
};

export default Collection;
   