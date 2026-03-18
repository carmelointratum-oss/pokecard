export type Rarity = 'Común' | 'Infrecuente' | 'Rara' | 'Épica' | 'Legendaria';

export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  description?: string;
  moves?: string[];
  rarity?: Rarity;
  baseExp?: number;
}

export interface CollectionItem {
  id: number;
  count: number;
}

export interface PackType {
  id: string;
  name: string;
  price: number;
  cardCount: number;
  description: string;
  color: string;
}

export const PACK_TYPES: PackType[] = [
  {
    id: 'basic',
    name: 'Sobre Básico',
    price: 50,
    cardCount: 5,
    description: 'Ideal para empezar tu colección.',
    color: 'from-blue-600 to-blue-800'
  },
  {
    id: 'standard',
    name: 'Sobre Estándar',
    price: 100,
    cardCount: 10,
    description: 'Más cartas, más posibilidades.',
    color: 'from-purple-600 to-purple-800'
  },
  {
    id: 'premium',
    name: 'Sobre Premium',
    price: 200,
    cardCount: 15,
    description: '¡La mejor forma de completar tu Pokédex!',
    color: 'from-yellow-600 to-yellow-800'
  }
];

export const TOTAL_POKEMON = 151;

export const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD',
};

export const TYPE_TRANSLATIONS: Record<string, string> = {
  normal: 'Normal',
  fire: 'Fuego',
  water: 'Agua',
  electric: 'Eléctrico',
  grass: 'Planta',
  ice: 'Hielo',
  fighting: 'Lucha',
  poison: 'Veneno',
  ground: 'Tierra',
  flying: 'Volador',
  psychic: 'Psíquico',
  bug: 'Bicho',
  rock: 'Roca',
  ghost: 'Fantasma',
  dragon: 'Dragón',
  dark: 'Siniestro',
  steel: 'Acero',
  fairy: 'Hada'
};

export const RARITY_COLORS: Record<string, string> = {
  'Común': '#A8A77A', // Normal-like
  'Infrecuente': '#7AC74C', // Grass-like
  'Rara': '#6390F0', // Water-like
  'Épica': '#A33EA1', // Poison-like
  'Legendaria': '#F7D02C', // Electric-like
};
