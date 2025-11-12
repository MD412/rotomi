
import React from 'react';
import { PokemonCard } from '../types';

interface CardProps {
  card: PokemonCard;
}

const Card: React.FC<CardProps> = ({ card }) => {
  return (
    <div className="group relative bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 transform transition-all duration-300 hover:scale-105 hover:shadow-yellow-400/20">
      <img 
        src={card.imageUrl} 
        alt={card.name} 
        className="w-full h-auto object-cover aspect-[3/4]"
      />
      {card.quantity > 1 && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-gray-800">
          {card.quantity}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-100 p-3 flex flex-col justify-end">
        <h3 className="text-sm font-bold text-white leading-tight truncate">{card.name}</h3>
        <p className="text-xs text-gray-300 truncate">{card.setName} - {card.number}</p>
      </div>
    </div>
  );
};

export default Card;
   