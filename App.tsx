import React, { useState, useEffect, useRef } from 'react';
import { DoodleCard, DoodleButton, ScribbleBackground } from './components/PixelComponents'; 
import { StorySection, StoryPartStatus } from './types';
import { generateExplanationAudio, analyzeStoryDraft } from './services/geminiService';

// Initial Data Structure adapted for "Turistea With Us" storytelling style
// Now includes 'audioScript' distinct from 'description'
const INITIAL_SECTIONS: StorySection[] = [
  {
    id: '1',
    title: 'El Comienzo',
    description: 'Describe quién es el protagonista y dónde está. ¿Es un lugar ruidoso o silencioso? ¿Hace frío o calor? ¡Presenta tu mundo!',
    audioScript: '¡Hola viajero! Imagina que tu historia es una casa. El comienzo es la puerta de entrada. Tienes que describir el lugar y a tu personaje principal de forma tan genial que el lector no quiera irse nunca. ¡Cuéntanos quién es y dónde está parado!',
    promptGuidance: 'Intro text introducing protagonist and setting.',
    status: StoryPartStatus.OPEN,
    userContent: '',
    aiFeedback: null,
    color: 'bg-cyan-200'
  },
  {
    id: '2',
    title: 'El Problema',
    description: 'Algo interrumpe la calma. ¿Se perdió el pasaporte? ¿Apareció un mapa misterioso? ¿Llegó un mensaje extraño? ¡Rompe la rutina!',
    audioScript: 'Oye, ninguna buena historia es aburrida. Necesitamos un problema. Algo tiene que salir mal o cambiar de repente. Es la chispa que obliga a tu personaje a moverse. ¿Qué lío se armó?',
    promptGuidance: 'Inciting incident, problem starts.',
    status: StoryPartStatus.LOCKED,
    userContent: '',
    aiFeedback: null,
    color: 'bg-pink-300'
  },
  {
    id: '3',
    title: 'La Aventura',
    description: 'Describe cómo intentan solucionar el problema, pero se encuentran con obstáculos. ¡Haz que suden la gota gorda!',
    audioScript: 'Aquí es donde se pone buena la cosa. Tu personaje intenta arreglar el problema, pero ¡zas! Aparecen obstáculos. Es el viaje, la lucha, el camino difícil. No se lo pongas fácil, ¡haz que le cueste trabajo!',
    promptGuidance: 'Rising action, obstacles.',
    status: StoryPartStatus.LOCKED,
    userContent: '',
    aiFeedback: null,
    color: 'bg-yellow-200'
  },
  {
    id: '4',
    title: 'El Gran Momento',
    description: 'Es la batalla final o el momento de la verdad. Describe con mucha emoción cómo enfrentan el reto más grande.',
    audioScript: '¡Llegamos a la cima de la montaña! Este es el clímax. Es el momento de máxima tensión, el todo o nada. Aquí tu personaje enfrenta su mayor miedo o al gran villano. ¡Ponle música dramática a tus palabras!',
    promptGuidance: 'Climax, final battle or realization.',
    status: StoryPartStatus.LOCKED,
    userContent: '',
    aiFeedback: null,
    color: 'bg-orange-300'
  },
  {
    id: '5',
    title: 'El Final',
    description: 'Después de la tormenta, llega la calma. ¿Cómo cambió el personaje? ¿Qué aprendió? Cierra la historia con un buen mensaje.',
    audioScript: 'Uff, qué viaje tan intenso. Ahora toca aterrizar. El final nos dice cómo quedaron las cosas después de la aventura. ¿Tu personaje cambió? ¿Aprendió algo? Danos un cierre que nos deje suspirando.',
    promptGuidance: 'Resolution, ending.',
    status: StoryPartStatus.LOCKED,
    userContent: '',
    aiFeedback: null,
    color: 'bg-lime-300'
  }
];

export default function App() {
  const [sections, setSections] = useState<StorySection[]>(INITIAL_SECTIONS);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  
  // Audio State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Final View
  const [showFullStory, setShowFullStory] = useState(false);

  const activeSection = sections.find(s => s.id === activeSectionId);

  // Play Audio Logic
  const handlePlayAudio = async () => {
    if (!activeSection) return;

    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    }
    const ctx = audioContextRef.current;

    let bufferToPlay = audioBuffer;

    if (!bufferToPlay) {
      setIsLoadingAudio(true);
      // Changed to use audioScript instead of description
      bufferToPlay = await generateExplanationAudio(activeSection.audioScript);
      setIsLoadingAudio(false);
      
      if (bufferToPlay) {
        setAudioBuffer(bufferToPlay);
      } else {
        alert("¡Uy! No se pudo generar el audio. Intenta de nuevo.");
        return;
      }
    }

    if (bufferToPlay && ctx) {
      const source = ctx.createBufferSource();
      source.buffer = bufferToPlay;
      source.connect(ctx.destination);
      source.start();
      setIsPlayingAudio(true);
      source.onended = () => setIsPlayingAudio(false);
    }
  };

  const handleSectionClick = (id: string) => {
    const section = sections.find(s => s.id === id);
    if (section && section.status !== StoryPartStatus.LOCKED) {
      setActiveSectionId(id);
      setInputText(section.userContent);
      setAudioBuffer(null);
    }
  };

  const handleAnalyzeAndSave = async () => {
    if (!activeSection) return;
    if (inputText.trim().length < 10) {
      alert("¡Escribe un poquito más para que la magia funcione!");
      return;
    }

    setIsAnalyzing(true);
    // Passing the description (instructions) for analysis context
    const result = await analyzeStoryDraft(activeSection.title, activeSection.description, inputText);
    setIsAnalyzing(false);

    if (result.isRelevant) {
      setSections(prev => {
        const newSections = [...prev];
        const index = newSections.findIndex(s => s.id === activeSection.id);
        newSections[index] = {
          ...newSections[index],
          userContent: inputText,
          aiFeedback: result.feedback,
          status: StoryPartStatus.COMPLETED
        };

        if (index < newSections.length - 1) {
            if (newSections[index+1].status === StoryPartStatus.LOCKED) {
                newSections[index+1].status = StoryPartStatus.OPEN;
            }
        }
        return newSections;
      });

      alert(`¡Súper bien! ${result.encouragement}\n\nTip del Profe: ${result.feedback}`);
      setActiveSectionId(null); 
    } else {
      alert(`Mmm... creo que te fuiste por las ramas.\n\nEl Profe dice: ${result.feedback}`);
    }
  };

  const handleShowFullStory = () => {
    setShowFullStory(true);
  }

  const allCompleted = sections.every(s => s.status === StoryPartStatus.COMPLETED);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto selection:bg-pink-200">
      
      {/* Header / Logo Area */}
      <header className="mb-16 text-center relative mt-8">
        <div className="relative inline-block rotate-[-3deg]">
            <h1 className="text-7xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-pink-500 to-yellow-500 drop-shadow-[5px_5px_0px_rgba(0,0,0,1)] z-10 relative px-4 pb-2">
            Turistea With Us
            </h1>
             {/* Fake underline marker stroke */}
            <div className="absolute -bottom-2 left-0 w-full h-4 bg-yellow-300 -z-10 rounded-full skew-x-12 opacity-80"></div>
        </div>
        
        {/* Updated Workshop Title */}
        <div className="mt-6 flex flex-col items-center gap-2">
           <h2 className="text-4xl font-amatic font-bold text-gray-800 rotate-[2deg]">
             Taller: <span className="text-pink-600">Mamarrachos con pixeles narrativos</span>
           </h2>
           <p className="text-xl text-gray-800 font-bold bg-white inline-block px-6 py-2 border-[3px] border-black shadow-[3px_3px_0px_black] rounded-lg rotate-[-1deg]">
             ¡Crea tu relato viajero paso a paso!
           </p>
        </div>

        <ScribbleBackground className="text-pink-400 w-32 h-32 -top-10 left-0 md:left-20 rotate-12" type="star" />
        <ScribbleBackground className="text-cyan-400 w-40 h-40 top-10 right-0 md:right-20 -rotate-12" type="spiral" />
      </header>

      {/* Main Map View */}
      {!showFullStory && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 relative z-10 px-4">
          {sections.map((section, idx) => {
             // Randomize rotation slightly for mamarracho feel
             const rotations = ['rotate-1', '-rotate-1', 'rotate-2', '-rotate-2', 'rotate-0'];
             const rotation = rotations[idx % rotations.length];

             return (
                <DoodleCard 
                key={section.id} 
                color={section.color}
                disabled={section.status === StoryPartStatus.LOCKED}
                onClick={() => handleSectionClick(section.id)}
                rotate={rotation}
                className="h-72 flex flex-col justify-between group"
                >
                <div className="relative">
                    <span className="font-amatic text-6xl font-bold opacity-30 absolute -top-4 -right-2 text-black">#{idx + 1}</span>
                    <h3 className="text-5xl font-bold mb-3 leading-none text-black">{section.title}</h3>
                    <p className="text-xl leading-tight border-l-[3px] border-black pl-3 font-semibold text-gray-800">
                        {section.status === StoryPartStatus.LOCKED ? "🔒 Bloqueado" : 
                        section.status === StoryPartStatus.COMPLETED ? "✅ ¡Listo!" : "✏️ ¡Toca para escribir!"}
                    </p>
                </div>
                
                <div className="mt-4">
                    {section.status === StoryPartStatus.COMPLETED && (
                    <div className="bg-white/80 border-[2px] border-black p-3 text-lg truncate rounded-md -rotate-1 shadow-sm">
                        "{section.userContent}"
                    </div>
                    )}
                </div>
                </DoodleCard>
             );
          })}
          
          {allCompleted && (
             <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-center mt-12 mb-12">
                <DoodleButton variant="success" onClick={handleShowFullStory} className="text-4xl py-6 px-12 animate-bounce rotate-1">
                    📖 ¡LEER MI CUENTO COMPLETO!
                </DoodleButton>
             </div>
          )}
        </div>
      )}

      {/* Editor Modal Overlay */}
      {activeSectionId && activeSection && !showFullStory && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`relative w-full max-w-4xl ${activeSection.color} border-[4px] border-black shadow-[15px_15px_0px_white] p-6 md:p-10 max-h-[90vh] overflow-y-auto rounded-[30px] rotate-1`}>
            
            <button 
                onClick={() => setActiveSectionId(null)}
                className="absolute top-6 right-6 bg-red-500 text-white w-12 h-12 border-[3px] border-black font-bold text-2xl hover:bg-red-600 shadow-[3px_3px_0px_black] rounded-full flex items-center justify-center hover:rotate-12 transition-transform"
            >
                X
            </button>

            <h2 className="text-6xl md:text-7xl font-bold mb-8 uppercase text-center border-b-[3px] border-black border-dashed pb-4">{activeSection.title}</h2>

            <div className="grid md:grid-cols-2 gap-8 mb-6">
                {/* Audio Info Box */}
                <div className="bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,0.1)] rounded-xl -rotate-1 relative">
                    <div className="absolute -top-3 -left-3 bg-yellow-300 px-3 py-1 border-2 border-black font-bold text-lg rotate-[-5deg]">Paso 1: Escucha</div>
                    
                    <div className="flex flex-col items-center text-center mt-4">
                         <button 
                            onClick={handlePlayAudio}
                            disabled={isPlayingAudio || isLoadingAudio}
                            className={`
                                w-20 h-20 rounded-full border-[3px] border-black flex items-center justify-center mb-4 transition-transform hover:scale-105 active:scale-95
                                ${isPlayingAudio ? 'bg-green-400 animate-pulse' : 'bg-yellow-400 hover:bg-yellow-300'}
                                disabled:opacity-50 disabled:cursor-wait shadow-[3px_3px_0px_black]
                            `}
                        >
                            {isLoadingAudio ? (
                                <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <span className="text-4xl ml-1">{isPlayingAudio ? 'II' : '▶'}</span>
                            )}
                        </button>
                        {/* Note: The user listens to the audioScript, but reads the description below */}
                        <p className="text-xl leading-tight font-medium">¡Dale play para que el Profe te explique esta parte!</p>
                    </div>
                </div>

                {/* Tips Box */}
                <div className="bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,0.1)] rounded-xl rotate-1 relative flex items-center justify-center">
                    <div className="absolute -top-3 -right-3 bg-cyan-300 px-3 py-1 border-2 border-black font-bold text-lg rotate-[5deg]">Paso 2: Escribe</div>
                    <p className="text-2xl font-amatic text-gray-600 text-center">
                        "{activeSection.description}"
                    </p>
                </div>
            </div>

            {/* Writing Section */}
            <div className="mb-6 relative">
                <textarea
                    className="w-full h-64 p-6 text-2xl border-[3px] border-black bg-white focus:outline-none focus:shadow-[8px_8px_0px_#22d3ee] resize-none font-patrick rounded-lg leading-relaxed bg-[linear-gradient(transparent_29px,#ccc_30px)] bg-[length:100%_30px]"
                    placeholder="Escribe aquí tu historia mágica..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    style={{lineHeight: '30px'}}
                />
                <ScribbleBackground className="text-black w-16 h-16 -bottom-8 -right-4 rotate-12 opacity-10" type="zigzag" />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-lg font-bold text-gray-600 bg-white px-2 rounded border border-black transform -rotate-1">
                    ✏️ Mínimo 10 letras
                </p>
                <DoodleButton 
                    onClick={handleAnalyzeAndSave} 
                    disabled={isAnalyzing}
                    variant="primary"
                    className="w-full md:w-auto text-3xl"
                >
                    {isAnalyzing ? '🤔 El Profe está leyendo...' : '✅ Revisar Texto'}
                </DoodleButton>
            </div>

          </div>
        </div>
      )}

      {/* Full Story View */}
      {showFullStory && (
        <div className="bg-white border-[4px] border-black p-8 md:p-16 shadow-[12px_12px_0px_rgba(0,0,0,0.2)] relative z-20 rounded-sm rotate-[0.5deg] max-w-4xl mx-auto">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-48 h-12 bg-gray-200/50 rotate-[-1deg] border border-gray-300"></div>

            <button 
                onClick={() => setShowFullStory(false)}
                className="mb-8 text-cyan-600 hover:text-cyan-800 text-2xl font-bold font-amatic flex items-center gap-2 group"
            >
                <span className="group-hover:-translate-x-1 transition-transform">⬅</span> Volver al mapa
            </button>
            
            <div className="text-center mb-12">
                <h2 className="text-8xl font-bold font-amatic mb-2 text-black">MI GRAN HISTORIA</h2>
                <div className="h-1 w-32 bg-black mx-auto rounded-full"></div>
            </div>
            
            <div className="space-y-8 font-patrick">
                {sections.map((section, idx) => (
                    <div key={section.id} className="relative group">
                        <h3 className="text-2xl font-bold text-pink-500 font-amatic mb-1 rotate-[-1deg] inline-block bg-yellow-100 px-2">{section.title}</h3>
                        <p className="text-3xl leading-relaxed whitespace-pre-wrap text-gray-800">{section.userContent}</p>
                    </div>
                ))}
            </div>

            <div className="mt-16 text-center border-t-[3px] border-dashed border-gray-300 pt-8">
                <p className="font-amatic text-4xl mb-6">¡Felicidades Autor!</p>
                <div className="flex gap-4 justify-center">
                    <DoodleButton variant="secondary" onClick={() => window.print()}>
                        🖨️ IMPRIMIR
                    </DoodleButton>
                    <DoodleButton variant="success" onClick={() => window.location.reload()}>
                        🔄 CREAR OTRA
                    </DoodleButton>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
