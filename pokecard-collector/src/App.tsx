import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, LayoutGrid, Wallet, PlusCircle, X, Info, ChevronRight, ChevronLeft, Search, Filter, SortAsc, SortDesc, ChevronDown, Sword, Trash2 } from 'lucide-react';
import { DndContext, useDraggable, useDroppable, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { Pokemon, CollectionItem, PackType, PACK_TYPES, TOTAL_POKEMON, TYPE_COLORS, TYPE_TRANSLATIONS, RARITY_COLORS } from './types';

export default function App() {
  // State
  const [view, setView] = useState<'shop' | 'collection' | 'opening' | 'deck'>('shop');
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem('poke-balance');
    return saved ? parseInt(saved) : 500;
  });
  const [collection, setCollection] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem('poke-collection');
    return saved ? JSON.parse(saved) : {};
  });
  const [deck, setDeck] = useState<(number | null)[]>(() => {
    const saved = localStorage.getItem('poke-deck');
    return saved ? JSON.parse(saved) : Array(6).fill(null);
  });
  const [openedCards, setOpenedCards] = useState<number[]>([]);
  const [currentOpeningIndex, setCurrentOpeningIndex] = useState(-1);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(100);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'count'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showOnlyOwned, setShowOnlyOwned] = useState(false);
  const [pokemonBasicInfo, setPokemonBasicInfo] = useState<Record<number, { name: string, types: string[] }>>({});

  // Fetch all Pokemon basic info for searching and filtering
  useEffect(() => {
    const fetchBasicInfo = async () => {
      try {
        // First get the list of 151
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151');
        const data = await response.json();
        
        // Fetch details for each to get types (in chunks to avoid rate limiting)
        const info: Record<number, { name: string, types: string[] }> = {};
        
        // We can use a Promise.all for better performance but let's be careful
        // Actually, for 151 it's usually fine to do in a few batches
        const batchSize = 50;
        for (let i = 0; i < data.results.length; i += batchSize) {
          const batch = data.results.slice(i, i + batchSize);
          const details = await Promise.all(batch.map((p: any) => fetch(p.url).then(res => res.json())));
          details.forEach((d: any) => {
            info[d.id] = {
              name: d.name,
              types: d.types.map((t: any) => t.type.name)
            };
          });
          // Update partial state so UI can start showing names
          setPokemonBasicInfo(prev => ({ ...prev, ...info }));
        }
      } catch (error) {
        console.error('Error fetching basic info:', error);
      }
    };
    fetchBasicInfo();
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('poke-balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('poke-collection', JSON.stringify(collection));
  }, [collection]);

  useEffect(() => {
    localStorage.setItem('poke-deck', JSON.stringify(deck));
  }, [deck]);

  // Derived state
  const collectedCount = Object.keys(collection).length;

  // Filtering logic
  const filteredPokemon = useMemo(() => {
    let list = Array.from({ length: TOTAL_POKEMON }, (_, i) => i + 1);

    // Filter by ownership
    if (showOnlyOwned) {
      list = list.filter(id => !!collection[id]);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(id => {
        const info = pokemonBasicInfo[id];
        const name = info?.name || '';
        return name.includes(query) || id.toString().includes(query);
      });
    }

    // Filter by type
    if (selectedType !== 'all') {
      list = list.filter(id => {
        const info = pokemonBasicInfo[id];
        return info?.types.includes(selectedType);
      });
    }

    // Sorting
    list.sort((a, b) => {
      let valA: any = a;
      let valB: any = b;

      if (sortBy === 'name') {
        const infoA = pokemonBasicInfo[a];
        const infoB = pokemonBasicInfo[b];
        valA = infoA?.name || '';
        valB = infoB?.name || '';
      } else if (sortBy === 'count') {
        valA = collection[a] || 0;
        valB = collection[b] || 0;
      }

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });

    return list;
  }, [collection, searchQuery, showOnlyOwned, sortBy, sortOrder, pokemonBasicInfo, selectedType]);

  // Actions
  const buyPack = (pack: PackType) => {
    if (balance < pack.price) {
      alert('¡No tienes suficientes monedas!');
      return;
    }

    setBalance(prev => prev - pack.price);
    
    // Generate random cards (1-151)
    const newCards: number[] = [];
    for (let i = 0; i < pack.cardCount; i++) {
      newCards.push(Math.floor(Math.random() * TOTAL_POKEMON) + 1);
    }

    setOpenedCards(newCards);
    setCurrentOpeningIndex(0);
    setView('opening');
  };

  const nextCard = () => {
    if (currentOpeningIndex < openedCards.length - 1) {
      // Add current card to collection
      const cardId = openedCards[currentOpeningIndex];
      setCollection(prev => ({
        ...prev,
        [cardId]: (prev[cardId] || 0) + 1
      }));
      setCurrentOpeningIndex(prev => prev + 1);
    } else {
      // Last card
      const cardId = openedCards[currentOpeningIndex];
      setCollection(prev => ({
        ...prev,
        [cardId]: (prev[cardId] || 0) + 1
      }));
      setView('collection');
      setOpenedCards([]);
      setCurrentOpeningIndex(-1);
    }
  };

  const rechargeBalance = () => {
    setBalance(prev => prev + rechargeAmount);
    setIsRechargeModalOpen(false);
  };

  const fetchPokemonDetails = async (id: number) => {
    setIsLoadingDetails(true);
    try {
      const [pokemonRes, speciesRes] = await Promise.all([
        fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
        fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`)
      ]);
      
      const data = await pokemonRes.json();
      const speciesData = await speciesRes.json();
      
      // Find Spanish name
      const spanishNameEntry = speciesData.names.find((n: any) => n.language.name === 'es');
      const pokemonName = spanishNameEntry ? spanishNameEntry.name : data.name.charAt(0).toUpperCase() + data.name.slice(1);

      // Find Spanish description if available, otherwise English
      const descriptionEntry = speciesData.flavor_text_entries.find((entry: any) => entry.language.name === 'es') 
        || speciesData.flavor_text_entries.find((entry: any) => entry.language.name === 'en');
      
      // Fetch Spanish names for the first 2 moves
      const movePromises = data.moves.slice(0, 2).map(async (m: any) => {
        try {
          const moveRes = await fetch(m.move.url);
          const moveData = await moveRes.json();
          const spanishMoveName = moveData.names.find((n: any) => n.language.name === 'es');
          return spanishMoveName ? spanishMoveName.name : m.move.name.replace('-', ' ');
        } catch {
          return m.move.name.replace('-', ' ');
        }
      });

      const spanishMoves = await Promise.all(movePromises);

      const baseExp = data.base_experience;
      let rarity: any = 'Común';
      if (baseExp >= 250) rarity = 'Legendaria';
      else if (baseExp >= 200) rarity = 'Épica';
      else if (baseExp >= 150) rarity = 'Rara';
      else if (baseExp >= 100) rarity = 'Infrecuente';

      const pokemon: Pokemon = {
        id: data.id,
        name: pokemonName,
        types: data.types.map((t: any) => t.type.name),
        hp: data.stats.find((s: any) => s.stat.name === 'hp').base_stat,
        attack: data.stats.find((s: any) => s.stat.name === 'attack').base_stat,
        defense: data.stats.find((s: any) => s.stat.name === 'defense').base_stat,
        speed: data.stats.find((s: any) => s.stat.name === 'speed').base_stat,
        description: descriptionEntry?.flavor_text.replace(/[\f\n\r]/g, ' '),
        moves: spanishMoves,
        rarity: rarity,
        baseExp: baseExp,
      };
      
      setSelectedPokemon(pokemon);
    } catch (error) {
      console.error('Error fetching pokemon:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header / Navbar */}
      <header className="bg-black/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('shop')}>
            <div className="w-8 h-8 bg-pokemon-gold rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-black rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-black rounded-full"></div>
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-tighter text-pokemon-gold hidden sm:block">POKÉCOLLECT</h1>
          </div>

          <nav className="flex items-center gap-1 sm:gap-4">
            <button 
              onClick={() => setView('shop')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${view === 'shop' ? 'bg-white/10 text-pokemon-gold' : 'hover:bg-white/5'}`}
            >
              <ShoppingBag size={20} />
              <span className="hidden md:block">Tienda</span>
            </button>
            <button 
              onClick={() => setView('collection')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${view === 'collection' ? 'bg-white/10 text-pokemon-gold' : 'hover:bg-white/5'}`}
            >
              <LayoutGrid size={20} />
              <span className="hidden md:block">Colección</span>
            </button>
            <button 
              onClick={() => setView('deck')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${view === 'deck' ? 'bg-white/10 text-pokemon-gold' : 'hover:bg-white/5'}`}
            >
              <Sword size={20} />
              <span className="hidden md:block">Mazo</span>
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <Wallet size={16} className="text-pokemon-gold" />
              <span className="font-mono font-bold">{balance}</span>
            </div>
            <button 
              onClick={() => setIsRechargeModalOpen(true)}
              className="p-1.5 bg-pokemon-gold text-black rounded-full hover:scale-110 transition-transform"
            >
              <PlusCircle size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8">
        <AnimatePresence mode="wait">
          {view === 'shop' && (
            <motion.div 
              key="shop"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {PACK_TYPES.map((pack) => (
                <div key={pack.id} className="group relative">
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${pack.color} rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200`}></div>
                  <div className="relative bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center h-full">
                    <div className={`w-32 h-44 bg-gradient-to-br ${pack.color} rounded-lg shadow-2xl mb-6 flex items-center justify-center animate-float border-2 border-white/20`}>
                      <div className="text-4xl font-black text-white/20 select-none">POKÉ</div>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{pack.name}</h3>
                    <p className="text-white/60 mb-6 flex-1">{pack.description}</p>
                    <div className="flex items-center gap-2 mb-6">
                      <span className="text-white/40 text-sm">Contiene:</span>
                      <span className="font-bold text-pokemon-gold">{pack.cardCount} cartas</span>
                    </div>
                    <button 
                      onClick={() => buyPack(pack)}
                      className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-pokemon-gold transition-colors flex items-center justify-center gap-2"
                    >
                      Comprar por {pack.price}
                      <Wallet size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {view === 'opening' && (
            <motion.div 
              key="opening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center cursor-pointer"
              onClick={nextCard}
            >
              <div className="mb-12 text-center pointer-events-none">
                <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">¡NUEVA CARTA!</h2>
                <p className="text-white/40 uppercase tracking-[0.3em] text-xs">Sobre en proceso • {currentOpeningIndex + 1} / {openedCards.length}</p>
              </div>

              <motion.div 
                key={currentOpeningIndex}
                initial={{ y: 100, rotateX: -30, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, rotateX: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, type: "spring", damping: 12 }}
                className="w-72 sm:w-96"
              >
                <Card 
                  id={openedCards[currentOpeningIndex]} 
                  isFlipped={true}
                  showDetails={true}
                />
              </motion.div>

              <div className="mt-16 text-center pointer-events-none">
                <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/10 animate-bounce">
                  <span className="text-pokemon-gold font-bold text-sm uppercase tracking-widest">Toca para continuar</span>
                  <ChevronRight size={18} className="text-pokemon-gold" />
                </div>
              </div>
            </motion.div>
          )}

          {view === 'collection' && (
            <motion.div 
              key="collection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-pokemon-gold rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(255,203,5,0.3)]">
                      <LayoutGrid className="text-black" size={24} />
                    </div>
                    <div>
                      <h2 className="text-4xl font-black tracking-tight">Tu Colección</h2>
                      <p className="text-white/40 font-medium uppercase tracking-widest text-[10px]">Pokédex de Kanto (151)</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-3xl flex items-center gap-6 shadow-xl backdrop-blur-sm">
                    <div className="text-right">
                      <div className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] mb-1">Progreso</div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black font-mono text-pokemon-gold">{collectedCount}</span>
                        <span className="text-white/20 font-bold">/ {TOTAL_POKEMON}</span>
                      </div>
                    </div>
                    <div className="w-40 h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(collectedCount / TOTAL_POKEMON) * 100}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-pokemon-gold to-yellow-400 relative"
                      >
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]"></div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Filter Bar */}
              <div className="mb-10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Search Input */}
                  <div className="md:col-span-5 relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-pokemon-gold transition-colors">
                      <Search size={20} />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre o ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-pokemon-gold/50 focus:bg-white/[0.08] transition-all shadow-inner"
                    />
                  </div>

                  {/* Sort Controls */}
                  <div className="md:col-span-4 flex gap-2">
                    <div className="flex-1 relative">
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full appearance-none bg-white/5 border border-white/10 rounded-2xl py-4 pl-4 pr-10 text-white focus:outline-none focus:border-pokemon-gold/50 transition-all cursor-pointer"
                      >
                        <option value="id" className="bg-[#111]">Ordenar por ID</option>
                        <option value="name" className="bg-[#111]">Ordenar por Nombre</option>
                        <option value="count" className="bg-[#111]">Ordenar por Cantidad</option>
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-white/20">
                        <ChevronDown size={18} />
                      </div>
                    </div>
                    <button 
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="bg-white/5 border border-white/10 rounded-2xl px-4 hover:bg-white/10 transition-colors text-white/60 hover:text-pokemon-gold"
                    >
                      {sortOrder === 'asc' ? <SortAsc size={20} /> : <SortDesc size={20} />}
                    </button>
                  </div>

                  {/* Toggle Owned */}
                  <div className="md:col-span-3">
                    <button 
                      onClick={() => setShowOnlyOwned(!showOnlyOwned)}
                      className={`w-full h-full rounded-2xl border transition-all flex items-center justify-center gap-3 font-bold ${
                        showOnlyOwned 
                        ? 'bg-pokemon-gold/20 border-pokemon-gold text-pokemon-gold shadow-[0_0_15px_rgba(255,203,5,0.1)]' 
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${showOnlyOwned ? 'bg-pokemon-gold border-pokemon-gold' : 'border-white/20'}`}>
                        {showOnlyOwned && <X size={14} className="text-black" />}
                      </div>
                      Solo en posesión
                    </button>
                  </div>
                </div>

                {/* Quick Type Filters (Optional/Visual) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button 
                    onClick={() => setSelectedType('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                      selectedType === 'all' 
                      ? 'bg-white text-black border-white' 
                      : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    Todos
                  </button>
                  {Object.keys(TYPE_COLORS).map(type => (
                    <button 
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                        selectedType === type 
                        ? 'bg-white text-black border-white' 
                        : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {TYPE_TRANSLATIONS[type] || type}
                    </button>
                  ))}
                </div>
              </div>

              {filteredPokemon.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/20">
                    <Search size={40} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">No se encontraron Pokémon</h3>
                    <p className="text-white/40">Prueba con otros filtros o términos de búsqueda</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedType('all');
                      setShowOnlyOwned(false);
                    }}
                    className="text-pokemon-gold font-bold hover:underline"
                  >
                    Limpiar todos los filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                  {filteredPokemon.map(id => (
                    <div 
                      key={id} 
                      onClick={() => collection[id] && fetchPokemonDetails(id)}
                      className={collection[id] ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-not-allowed'}
                    >
                      <Card 
                        id={id} 
                        isFlipped={!!collection[id]} 
                        count={collection[id]}
                        grayscale={!collection[id]}
                      />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          {view === 'deck' && (
            <DeckBuilder 
              collection={collection} 
              deck={deck} 
              setDeck={setDeck} 
            />
          )}
        </AnimatePresence>
      </main>

      {/* Recharge Modal */}
      {isRechargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 max-w-md w-full relative"
          >
            <button 
              onClick={() => setIsRechargeModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-full"
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-bold mb-6">Recargar Monedas</h3>
            <p className="text-white/60 mb-8">Simulación de pasarela de pago. Elige la cantidad que deseas añadir a tu saldo.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[100, 500, 1000, 5000].map(amount => (
                <button 
                  key={amount}
                  onClick={() => setRechargeAmount(amount)}
                  className={`py-4 rounded-xl border-2 transition-all ${rechargeAmount === amount ? 'border-pokemon-gold bg-pokemon-gold/10 text-pokemon-gold' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                >
                  <span className="text-xl font-bold">{amount}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={rechargeBalance}
              className="w-full py-4 bg-pokemon-gold text-black font-black rounded-xl hover:scale-[1.02] transition-transform"
            >
              Confirmar Recarga
            </button>
          </motion.div>
        </div>
      )}

      {/* Detail Modal */}
      {(selectedPokemon || isLoadingDetails) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          {isLoadingDetails ? (
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-pulse">
              <div className="flex justify-center">
                <div className="w-72 sm:w-96 aspect-[2/3] bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center">
                  <div className="w-32 h-32 bg-white/5 rounded-full"></div>
                </div>
              </div>
              <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 space-y-6">
                <div className="space-y-2">
                  <div className="h-4 w-16 bg-white/5 rounded"></div>
                  <div className="h-10 w-48 bg-white/10 rounded"></div>
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-white/5 rounded-full"></div>
                    <div className="h-6 w-20 bg-white/5 rounded-full"></div>
                  </div>
                </div>
                <div className="h-20 w-full bg-white/5 rounded-2xl"></div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="h-3 w-24 bg-white/5 rounded"></div>
                    <div className="h-2 w-full bg-white/10 rounded"></div>
                    <div className="h-2 w-full bg-white/10 rounded"></div>
                    <div className="h-2 w-full bg-white/10 rounded"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 w-24 bg-white/5 rounded"></div>
                    <div className="h-10 w-full bg-white/5 rounded-xl"></div>
                    <div className="h-10 w-full bg-white/5 rounded-xl"></div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedPokemon && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
            >
            <div className="flex justify-center">
              <div className="w-72 sm:w-96">
                <Card id={selectedPokemon.id} isFlipped={true} />
              </div>
            </div>

            <div 
              className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 relative overflow-hidden"
              style={{
                background: selectedPokemon.rarity && selectedPokemon.rarity !== 'Común'
                  ? `linear-gradient(135deg, #1a1a1a 0%, ${RARITY_COLORS[selectedPokemon.rarity]}22 100%)`
                  : selectedPokemon.types.length > 1 
                    ? `linear-gradient(135deg, #1a1a1a 0%, ${TYPE_COLORS[selectedPokemon.types[0]]}11 50%, ${TYPE_COLORS[selectedPokemon.types[1]]}11 100%)`
                    : `linear-gradient(135deg, #1a1a1a 0%, ${TYPE_COLORS[selectedPokemon.types[0]]}11 100%)`
              }}
            >
              <button 
                onClick={() => setSelectedPokemon(null)}
                className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-full"
              >
                <X size={20} />
              </button>
              
              <div className="mb-6">
                <span className="text-pokemon-gold font-mono text-sm">#{selectedPokemon.id.toString().padStart(3, '0')}</span>
                <h2 className="text-4xl font-black">{selectedPokemon.name}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex gap-2">
                    {selectedPokemon.types.map(type => (
                      <span key={type} className="px-3 py-1 bg-white/10 rounded-full text-xs uppercase font-bold tracking-wider border border-white/10">
                        {TYPE_TRANSLATIONS[type] || type}
                      </span>
                    ))}
                  </div>
                  {selectedPokemon.rarity && (
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      selectedPokemon.rarity === 'Legendaria' ? 'bg-pokemon-gold/20 border-pokemon-gold text-pokemon-gold shadow-[0_0_10px_rgba(255,203,5,0.2)]' :
                      selectedPokemon.rarity === 'Épica' ? 'bg-purple-500/20 border-purple-500 text-purple-400' :
                      selectedPokemon.rarity === 'Rara' ? 'bg-blue-500/20 border-blue-500 text-blue-400' :
                      selectedPokemon.rarity === 'Infrecuente' ? 'bg-green-500/20 border-green-500 text-green-400' :
                      'bg-white/5 border-white/10 text-white/40'
                    }`}>
                      {selectedPokemon.rarity}
                    </span>
                  )}
                </div>
              </div>

              {selectedPokemon.description && (
                <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5 italic text-sm text-white/80 leading-relaxed">
                  "{selectedPokemon.description}"
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-2">Estadísticas</h4>
                  <StatBar label="HP" value={selectedPokemon.hp} max={255} color="bg-red-500" />
                  <StatBar label="Ataque" value={selectedPokemon.attack} max={190} color="bg-orange-500" />
                  <StatBar label="Defensa" value={selectedPokemon.defense} max={230} color="bg-blue-500" />
                  <StatBar label="Velocidad" value={selectedPokemon.speed} max={180} color="bg-green-500" />
                  <StatBar label="Experiencia" value={selectedPokemon.baseExp || 0} max={350} color="bg-pokemon-gold" />
                </div>

                {selectedPokemon.moves && selectedPokemon.moves.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-2">Ataques Principales</h4>
                    {selectedPokemon.moves.map(move => (
                      <div key={move} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
                        <span className="text-sm font-bold capitalize">{move}</span>
                        <div className="w-2 h-2 rounded-full bg-pokemon-gold animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/40">
                  <Info size={16} />
                  <span className="text-sm italic">Datos de PokeAPI</span>
                </div>
                <button 
                  onClick={() => setSelectedPokemon(null)}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-sm font-bold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    )}
    </div>
  );
}

function Card({ id, isFlipped, count, grayscale, showDetails = true }: { id: number, isFlipped: boolean, count?: number, grayscale?: boolean, showDetails?: boolean }) {
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  
  // Natural tilt effect
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [skewX, setSkewX] = useState(0);
  const [shadowX, setShadowX] = useState(0);
  const [shadowY, setShadowY] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pokemonData, setPokemonData] = useState<{ 
    name: string, 
    types: string[], 
    hp: number, 
    attack?: number,
    defense?: number,
    speed?: number,
    description?: string, 
    moves?: string[],
    height?: number,
    weight?: number,
    isRare?: boolean,
    rarity?: string,
    baseExp?: number
  } | null>(null);

  useEffect(() => {
    if (isFlipped && !pokemonData) {
      setIsLoading(true);
      Promise.all([
        fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(res => res.json()),
        fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`).then(res => res.json())
      ]).then(async ([data, speciesData]) => {
        // Find Spanish name
        const spanishNameEntry = speciesData.names.find((n: any) => n.language.name === 'es');
        const pokemonName = spanishNameEntry ? spanishNameEntry.name : data.name.charAt(0).toUpperCase() + data.name.slice(1);

        const descriptionEntry = speciesData.flavor_text_entries.find((entry: any) => entry.language.name === 'es') 
          || speciesData.flavor_text_entries.find((entry: any) => entry.language.name === 'en');

        // Fetch Spanish names for the first 2 moves
        const movePromises = data.moves.slice(0, 2).map(async (m: any) => {
          try {
            const moveRes = await fetch(m.move.url);
            const moveData = await moveRes.json();
            const spanishMoveName = moveData.names.find((n: any) => n.language.name === 'es');
            return spanishMoveName ? spanishMoveName.name : m.move.name.replace('-', ' ');
          } catch {
            return m.move.name.replace('-', ' ');
          }
        });

        const spanishMoves = await Promise.all(movePromises);

        const baseExp = data.base_experience;
        let rarity = 'Común';
        if (baseExp >= 250) rarity = 'Legendaria';
        else if (baseExp >= 200) rarity = 'Épica';
        else if (baseExp >= 150) rarity = 'Rara';
        else if (baseExp >= 100) rarity = 'Infrecuente';

        setPokemonData({
          name: pokemonName,
          types: data.types.map((t: any) => t.type.name),
          hp: data.stats.find((s: any) => s.stat.name === 'hp').base_stat,
          attack: data.stats.find((s: any) => s.stat.name === 'attack').base_stat,
          defense: data.stats.find((s: any) => s.stat.name === 'defense').base_stat,
          speed: data.stats.find((s: any) => s.stat.name === 'speed').base_stat,
          description: descriptionEntry?.flavor_text.replace(/[\f\n\r]/g, ' ').slice(0, 45) + '...',
          moves: spanishMoves,
          height: data.height / 10, // decimetres to metres
          weight: data.weight / 10, // hectograms to kilograms
          isRare: baseExp >= 150,
          rarity,
          baseExp,
        });
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [isFlipped, id]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFlipped || grayscale) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Pronounced 25 degrees tilt and 4 degrees skew
    const rX = ((y - centerY) / centerY) * -25;
    const rY = ((x - centerX) / centerX) * 25;
    const sX = ((x - centerX) / centerX) * 4;
    
    // Shadow offset
    const shX = ((x - centerX) / centerX) * -15;
    const shY = ((y - centerY) / centerY) * -15;
    
    setRotateX(rX);
    setRotateY(rY);
    setSkewX(sX);
    setShadowX(shX);
    setShadowY(shY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setSkewX(0);
    setShadowX(0);
    setShadowY(0);
  };

  const mainType = pokemonData?.types[0] || 'normal';
  const secondType = pokemonData?.types[1];
  
  // Rarity color takes precedence if it's not Común to highlight the card
  const rarityColor = pokemonData?.rarity && pokemonData.rarity !== 'Común' 
    ? RARITY_COLORS[pokemonData.rarity] 
    : null;
    
  const cardColor = rarityColor || TYPE_COLORS[mainType] || '#A8A77A';
  const secondCardColor = secondType ? TYPE_COLORS[secondType] : null;

  const backgroundStyle = useMemo(() => {
    if (grayscale) return undefined;
    if (secondCardColor) {
      return `linear-gradient(135deg, ${cardColor} 0%, ${secondCardColor} 100%)`;
    }
    return `linear-gradient(135deg, ${cardColor} 0%, ${cardColor}dd 100%)`;
  }, [cardColor, secondCardColor, grayscale]);

  return (
    <motion.div 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ 
        rotateX: rotateX, 
        rotateY: rotateY,
        skewX: skewX,
        z: rotateX !== 0 ? 50 : 0,
        scale: rotateX !== 0 ? 1.1 : 1,
        boxShadow: rotateX !== 0 
          ? `${shadowX}px ${shadowY + 20}px 30px rgba(0,0,0,0.4)` 
          : "0px 10px 20px rgba(0,0,0,0.2)"
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="card-container group"
    >
      <div className={`card-inner ${isFlipped ? 'is-flipped' : ''} ${isFlipped && pokemonData?.isRare && !grayscale ? 'card-glow' : ''}`}>
        {/* Back of the card (visible when not flipped) */}
        <div className="card-back">
          <div className="w-full h-full border-4 border-white/10 rounded-lg flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent"></div>
            <div className="w-32 h-32 border-8 border-pokemon-gold/30 rounded-full flex items-center justify-center">
              <div className="w-20 h-20 border-4 border-pokemon-gold/20 rounded-full"></div>
            </div>
            <div className="absolute bottom-6 text-[10px] font-bold text-white/20 tracking-[0.5em] uppercase">Pokémon TCG</div>
          </div>
        </div>

        {/* Front of the card (visible when flipped) */}
        <div className={`card-front ${pokemonData?.isRare && !grayscale ? 'holographic-card' : ''}`} style={{ 
          background: backgroundStyle,
          borderColor: grayscale ? undefined : `${cardColor}ff`
        }}>
          {pokemonData?.isRare && !grayscale && <div className="holo-sparkle"></div>}
          {isLoading ? (
            <div className="w-full h-full p-4 flex flex-col gap-4 animate-pulse">
              {/* Skeleton Header */}
              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2">
                  <div className="h-3 w-8 bg-black/10 rounded"></div>
                  <div className="h-4 w-20 bg-black/20 rounded"></div>
                </div>
                <div className="h-4 w-10 bg-black/10 rounded"></div>
              </div>
              
              {/* Skeleton Sprite Area */}
              <div className="w-full h-[48%] bg-black/5 rounded-xl border border-black/5 flex items-center justify-center">
                <div className="w-20 h-20 bg-black/5 rounded-full"></div>
              </div>
              
              {/* Skeleton Info Area */}
              <div className="space-y-3 mt-auto pb-4">
                <div className="space-y-2">
                  <div className="h-2 w-full bg-black/10 rounded"></div>
                  <div className="h-2 w-3/4 bg-black/10 rounded mx-auto"></div>
                </div>
                
                <div className="flex gap-2 justify-center pt-2">
                  <div className="h-6 w-16 bg-black/10 rounded-full"></div>
                  <div className="h-6 w-16 bg-black/10 rounded-full"></div>
                </div>
                <div className="w-full h-1.5 bg-black/5 rounded-full mt-2"></div>
              </div>
            </div>
          ) : (
            <>
              {/* Card Header */}
              <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-black/40">#{id.toString().padStart(3, '0')}</span>
                    <span className="text-sm font-black text-black/80 truncate max-w-[110px]">{pokemonData?.name || '...'}</span>
                  </div>
                  {pokemonData?.rarity && (
                    <span className={`text-[8px] font-black uppercase tracking-tighter -mt-0.5 ${
                      pokemonData.rarity === 'Legendaria' ? 'text-pokemon-gold' :
                      pokemonData.rarity === 'Épica' ? 'text-purple-600' :
                      pokemonData.rarity === 'Rara' ? 'text-blue-600' :
                      pokemonData.rarity === 'Infrecuente' ? 'text-green-600' :
                      'text-black/30'
                    }`}>
                      {pokemonData.rarity}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-black/40">HP</span>
                  <span className="text-sm font-black text-red-700">{pokemonData?.hp || '??'}</span>
                </div>
              </div>

              {/* Sprite Container */}
              <div className="w-full h-[48%] mt-5 bg-white/10 rounded-xl border border-black/10 flex items-center justify-center relative overflow-hidden shadow-inner">
                {/* Base Background with Type Color */}
                <div className="absolute inset-0 opacity-40" style={{ backgroundColor: cardColor }}></div>
                
                {/* Pattern: Subtle Dots/Grid */}
                <div className="absolute inset-0 opacity-20" style={{ 
                  backgroundImage: 'radial-gradient(rgba(0,0,0,0.2) 1px, transparent 0)',
                  backgroundSize: '10px 10px'
                }}></div>

                {/* Scenic Gradient */}
                <div className="absolute inset-0 opacity-30" style={{ 
                  backgroundImage: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 100%), radial-gradient(circle at 50% 50%, white 0%, transparent 80%)`
                }}></div>

                <img 
                  src={spriteUrl} 
                  alt="Pokemon" 
                  className={`w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] z-10 ${grayscale ? 'pokemon-silhouette' : 'pokemon-color'}`}
                  referrerPolicy="no-referrer"
                />
                {/* Physical Stats */}
                <div className="absolute bottom-2 left-3 right-3 flex justify-between z-20">
                  <span className="text-xs font-bold text-black/50">{pokemonData?.height}m</span>
                  <span className="text-xs font-bold text-black/50">{pokemonData?.weight}kg</span>
                </div>
              </div>

              {/* Card Footer / Details */}
              {showDetails && (
                <div className="mt-auto w-full flex flex-col items-center gap-2 pb-3 z-10 px-3">
                  {pokemonData?.description && (
                    <p className="text-[10px] text-center text-black/60 italic font-semibold leading-tight mb-1 line-clamp-2 bg-white/20 p-1.5 rounded-lg border border-black/5">
                      "{pokemonData.description}"
                    </p>
                  )}
                  
                  {pokemonData?.moves && (
                    <div className="flex flex-col items-center gap-0.5 w-full">
                      {pokemonData.moves.map(move => (
                        <div key={move} className="flex justify-between w-full items-center border-b border-black/10 last:border-0 py-1">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-black/20"></div>
                            <span className="text-[10px] font-black text-black/80 uppercase tracking-tighter">
                              {move}
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-black/40">30+</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mini Stats Row */}
                  <div className="flex justify-between w-full mt-1 pt-1 border-t border-black/10">
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-bold text-black/40 uppercase">Ataque</span>
                      <span className="text-[10px] font-black text-black/80">{pokemonData?.attack || '??'}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-bold text-black/40 uppercase">Defensa</span>
                      <span className="text-[10px] font-black text-black/80">{pokemonData?.defense || '??'}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-bold text-black/40 uppercase">Veloc.</span>
                      <span className="text-[10px] font-black text-black/80">{pokemonData?.speed || '??'}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-bold text-black/40 uppercase">EXP</span>
                      <span className="text-[10px] font-black text-black/80">{pokemonData?.baseExp || '??'}</span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 mt-1">
                    {pokemonData?.types.map(type => (
                      <span key={type} className="text-[9px] font-black px-2 py-0.5 bg-black/10 rounded-full uppercase tracking-tighter text-black/70 border border-black/5">
                        {TYPE_TRANSLATIONS[type] || type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {count && count > 1 && (
                <motion.div 
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 12 }}
                  whileHover={{ scale: 1.1, rotate: 0 }}
                  className="absolute -top-4 -right-4 w-14 h-14 bg-gradient-to-br from-pokemon-gold via-yellow-300 to-yellow-600 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.6)] border-2 border-white/40 z-30 group/badge"
                >
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span className="text-[9px] font-black text-black/50 uppercase tracking-tighter mb-0.5">Repetida</span>
                    <span className="text-xl font-black text-black drop-shadow-sm">x{count}</span>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatBar({ label, value, max, color }: { label: string, value: number, max: number, color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold mb-1 uppercase tracking-wider text-white/60">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(value / max) * 100}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color}`}
        ></motion.div>
      </div>
    </div>
  );
}

// --- Deck Builder Components ---

interface DeckBuilderProps {
  collection: Record<number, number>;
  deck: (number | null)[];
  setDeck: React.Dispatch<React.SetStateAction<(number | null)[]>>;
}

function DeckBuilder({ collection, deck, setDeck }: DeckBuilderProps) {
  const [activeId, setActiveId] = useState<number | null>(null);

  // Calculate available cards (owned - in deck)
  const availableCards = useMemo(() => {
    const counts = { ...collection };
    deck.forEach(id => {
      if (id !== null && counts[id]) {
        counts[id]--;
      }
    });
    
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([id, count]) => ({ id: parseInt(id), count }));
  }, [collection, deck]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Case 1: Dragging from Drawer to Slot
    if (activeData.type === 'drawer' && overData.type === 'slot') {
      const newDeck = [...deck];
      const slotIndex = overData.index;
      
      newDeck[slotIndex] = activeData.id;
      setDeck(newDeck);
    }

    // Case 2: Dragging from Slot to Slot
    if (activeData.type === 'slot' && overData.type === 'slot') {
      const newDeck = [...deck];
      const fromIndex = activeData.index;
      const toIndex = overData.index;
      
      const temp = newDeck[toIndex];
      newDeck[toIndex] = newDeck[fromIndex];
      newDeck[fromIndex] = temp;
      setDeck(newDeck);
    }

    // Case 3: Dragging from Slot to Drawer (Remove from deck)
    if (activeData.type === 'slot' && overData.id === 'drawer-area') {
      const newDeck = [...deck];
      newDeck[activeData.index] = null;
      setDeck(newDeck);
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row h-[calc(100vh-10rem)] gap-6"
      >
        {/* Left: Inventory (1/3) */}
        <div className="w-full md:w-[400px] bg-[#111] rounded-[2rem] border border-white/10 p-6 flex flex-col shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-pokemon-gold rounded-full animate-pulse"></div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Tu Inventario</h3>
            </div>
            <button 
              onClick={() => setDeck(Array(6).fill(null))}
              className="px-3 py-1 bg-white/5 rounded-full text-[10px] uppercase tracking-widest font-black text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-1.5"
            >
              <Trash2 size={12} />
              Limpiar
            </button>
          </div>

          <DrawerArea availableCards={availableCards} />
        </div>

        {/* Right: Table Area (2/3) */}
        <div className="flex-1 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-[3rem] border-8 border-[#2a2a2a] p-8 relative shadow-2xl flex flex-col overflow-y-auto custom-scrollbar">
          {/* Table Texture/Pattern */}
          <div className="absolute inset-0 opacity-10" style={{ 
            backgroundImage: 'radial-gradient(#fff 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
          
          <div className="relative z-10 min-h-full flex flex-col items-center justify-center py-8">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-black text-white/10 uppercase tracking-[0.8em] mb-1">Mazo de Batalla</h2>
              <div className="w-16 h-1 bg-white/5 mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-3 gap-x-8 gap-y-16 max-w-4xl w-full pb-12">
              {deck.map((cardId, index) => (
                <DroppableSlot 
                  key={index} 
                  index={index} 
                  cardId={cardId} 
                  onRemove={() => {
                    const newDeck = [...deck];
                    newDeck[index] = null;
                    setDeck(newDeck);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.5',
            },
          },
        }),
      }}>
        {activeId ? (
          <div className="w-32 h-44 scale-110 rotate-3 shadow-2xl pointer-events-none">
            <Card id={activeId} isFlipped={true} showDetails={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

const DroppableSlot: React.FC<{ index: number, cardId: number | null, onRemove: () => void }> = ({ index, cardId, onRemove }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${index}`,
    data: { type: 'slot', index }
  });

  return (
    <div 
      ref={setNodeRef}
      className={`aspect-[2/3] rounded-2xl border-2 border-dashed transition-all flex items-center justify-center relative group ${
        isOver 
        ? 'border-pokemon-gold bg-pokemon-gold/10 scale-105 shadow-[0_0_30px_rgba(255,203,5,0.2)]' 
        : cardId 
          ? 'border-white/20 bg-white/5 shadow-lg' 
          : 'border-white/5 bg-black/20'
      }`}
    >
      {cardId ? (
        <div className="w-full h-full p-1 relative">
          <DraggableCard id={cardId} type="slot" index={index} />
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg z-30 hover:bg-red-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="text-white/5 font-black text-6xl select-none">{index + 1}</div>
      )}
      
      {/* Slot Label */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#222] border border-white/10 px-3 py-1 rounded-full text-[10px] font-black text-white/30 uppercase tracking-widest group-hover:text-pokemon-gold group-hover:border-pokemon-gold/30 transition-all">
        {cardId ? 'Ocupado' : `Espacio ${index + 1}`}
      </div>
    </div>
  );
}

const DrawerArea: React.FC<{ availableCards: { id: number, count: number }[] }> = ({ availableCards }) => {
  const { setNodeRef } = useDroppable({
    id: 'drawer-area',
    data: { type: 'drawer-area' }
  });

  return (
    <div 
      ref={setNodeRef}
      className="flex-1 overflow-y-auto overflow-x-hidden pr-4 custom-scrollbar"
    >
      {availableCards.length === 0 ? (
        <div className="h-full flex items-center justify-center text-white/10 font-bold italic text-center p-4">
          No tienes más cartas disponibles
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 pb-6">
          {availableCards.map(({ id, count }) => (
            <div key={id} className="relative aspect-[2/3] group">
              <DraggableCard id={id} type="drawer" />
              {count > 1 && (
                <div className="absolute -top-1 -right-1 w-7 h-7 bg-pokemon-gold text-black rounded-full flex items-center justify-center text-[11px] font-black border-2 border-[#111] shadow-xl z-20">
                  x{count}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DraggableCard: React.FC<{ id: number, type: 'drawer' | 'slot', index?: number }> = ({ id, type, index }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: type === 'slot' ? `slot-card-${index}` : `drawer-card-${id}`,
    data: { type, id, index }
  });

  return (
    <div 
      ref={setNodeRef} 
      {...listeners} 
      {...attributes}
      className={`w-full h-full cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-0' : 'opacity-100'}`}
    >
      <Card id={id} isFlipped={true} showDetails={false} />
    </div>
  );
}
