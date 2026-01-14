
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Command, FoodItem, UserProfile, AnalysisResponse } from './types';
import { ASSETS } from './constants/assets';
import { useInventory } from './hooks/useInventory';
import Header from './components/Layout/Header';
import Scanner from './components/Scanner';
import ChefAvatar from './components/Chef/ChefAvatar';
import { analyzeFood } from './geminiService';

const App: React.FC = () => {
  const { inventory, addItem, removeItem } = useInventory();
  const [activeTab, setActiveTab] = useState<Command>(Command.SHOW_INVENTORY);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('eat-repeat-profile');
    return saved ? JSON.parse(saved) : null;
  });

  // Flow & Onboarding State
  const [onboardingStage, setOnboardingStage] = useState<'greeting' | 'name' | 'demo' | 'origin' | 'cuisine' | 'complete'>('greeting');
  const [isMainBubbleActive, setIsMainBubbleActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [tutorialNarration, setTutorialNarration] = useState("");
  const [tutorialAssetsFlying, setTutorialAssetsFlying] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<{ role: 'gusto' | 'user', text: string }[]>([]);
  const [chefInput, setChefInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const isDemoRunning = useMemo(() => onboardingStage === 'demo', [onboardingStage]);
  const showAppUI = useMemo(() => !!userProfile || isDemoRunning, [userProfile, isDemoRunning]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isThinking]);

  // Initial greeting
  useEffect(() => {
    if (!userProfile && chatHistory.length === 0) {
      setChatHistory([{ 
        role: 'gusto', 
        text: "Bonjour! I am Chef Gusto. For 45 years, I've mastered the art of the pantry. Now, I'm here to bring AI precision to your home. Tell me, mon ami, what is your name?" 
      }]);
      setOnboardingStage('name');
    }
  }, [userProfile]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chefInput.trim() || isThinking) return;

    const userInput = chefInput.trim();
    setChatHistory(prev => [...prev, { role: 'user', text: userInput }]);
    setChefInput("");
    setIsThinking(true);

    try {
      const response = await analyzeFood(
        Command.VALIDATE_INPUT, 
        undefined, 
        [], 
        `User Stage: ${onboardingStage}, User Input: ${userInput}`,
        userProfile || undefined
      );
      
      if (onboardingStage === 'name') {
        setOnboardingStage('demo');
        setChatHistory(prev => [...prev, { 
          role: 'gusto', 
          text: `Enchanté, ${userInput}! Let me demonstrate my Neural Eye. It analyzes food with molecular precision. Shall we begin the scan demo?` 
        }]);
      } else if (onboardingStage === 'origin') {
        setOnboardingStage('cuisine');
        setChatHistory(prev => [...prev, { 
          role: 'gusto', 
          text: response.chefReaction || "Magnificent. And what culinary tradition inspires you most?" 
        }]);
      } else if (onboardingStage === 'cuisine') {
        const profile: UserProfile = { 
          name: chatHistory.find(m => m.role === 'user')?.text || "Friend", 
          origin: "Earth", 
          cuisine: userInput, 
          memory: [] 
        };
        setUserProfile(profile);
        localStorage.setItem('eat-repeat-profile', JSON.stringify(profile));
        setOnboardingStage('complete');
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'gusto', text: "Pardonnez-moi, my neural circuits are a bit cluttered. Let's try again." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const startDemo = () => {
    setIsMainBubbleActive(false);
    setActiveTab(Command.SCAN_ITEM);
    setTutorialNarration("Initializing visual capture system...");

    setTimeout(() => {
      setTutorialAssetsFlying([ASSETS.MILK]);
      setTutorialNarration("Detected: Velvet Farms Whole Milk. Extracting shelf-life metadata...");
      
      setTimeout(() => {
        setTutorialAssetsFlying([ASSETS.MILK, ASSETS.APPLE]);
        setTutorialNarration("Detected: Organic Fuji Apple. Analyzing freshness markers...");
        
        setTimeout(() => {
          setLoading(true);
          setTutorialAssetsFlying([]);
          setTimeout(() => {
            setLoading(false);
            setAnalysisResult({
              item: {
                id: 'demo-milk',
                name: 'Fresh Whole Milk',
                brand: 'Velvet Farms',
                type: 'packaged',
                expiryDate: '2024-12-05',
                imageUrl: ASSETS.MILK,
                storageAdvice: 'Keep chilled at 4°C.',
                addedDate: new Date().toISOString()
              }
            });
            setTutorialNarration("Analysis complete. Review the digital signature below.");
          }, 2500);
        }, 1500);
      }, 1500);
    }, 1000);
  };

  const handleFinishDemo = () => {
    if (analysisResult?.item) addItem(analysisResult.item);
    setAnalysisResult(null);
    setOnboardingStage('origin');
    setIsMainBubbleActive(true);
    setChatHistory(prev => [...prev, { 
      role: 'gusto', 
      text: "Magnifique! Your first items are safely vaulted. Now, mon ami, where in the world are you from?" 
    }]);
    setActiveTab(Command.SHOW_INVENTORY);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Fallback if local image loading fails
    e.currentTarget.onerror = null;
    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23f1f5f9' width='100' height='100'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EIMG%3C/text%3E%3C/svg%3E";
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col max-w-7xl mx-auto px-4 md:px-12 py-10 antialiased overflow-x-hidden selection:bg-emerald-100">
      
      <Header profile={userProfile} isVisible={showAppUI} />

      {/* Onboarding Chat Bubble - Centered and High Z-Index */}
      {!userProfile && isMainBubbleActive && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-xl">
          <div className="bg-white rounded-[3rem] shadow-6xl overflow-hidden flex flex-col border border-white/20 animate-scale-up w-full max-w-xl">
            <div className="p-8 bg-slate-900 text-white flex items-center space-x-6">
              <ChefAvatar size="lg" className="flex-shrink-0" />
              <div>
                <h3 className="font-black text-2xl tracking-tight">Chef Gusto</h3>
                <p className="text-[10px] uppercase font-black tracking-[0.4em] text-emerald-400">Neural Intelligence</p>
              </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto space-y-6 max-h-[50vh] custom-scrollbar bg-slate-50/30">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'gusto' ? 'justify-start' : 'justify-end'} animate-slide-up`}>
                  <div className={`max-w-[85%] p-5 rounded-[2rem] font-bold text-base leading-relaxed ${
                    msg.role === 'gusto' ? 'bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-sm' : 'bg-slate-900 text-white rounded-tr-none shadow-xl'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex space-x-2 p-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-8 bg-white border-t border-slate-100">
              {onboardingStage === 'demo' ? (
                <button 
                  onClick={startDemo} 
                  className="w-full py-6 bg-emerald-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-3xl hover:bg-emerald-500 transition-all transform active:scale-95"
                >
                  Launch Demo Analysis
                </button>
              ) : (
                <form onSubmit={handleChatSubmit} className="flex space-x-4">
                  <input 
                    autoFocus
                    value={chefInput}
                    onChange={(e) => setChefInput(e.target.value)}
                    placeholder="Enter message..."
                    className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 text-base font-bold outline-none ring-2 ring-transparent focus:ring-emerald-500/20"
                  />
                  <button type="submit" className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-slate-800 transition-all">
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Narration Pill - Visible during demo only */}
      {isDemoRunning && !isMainBubbleActive && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[400] w-full max-w-xl px-6 animate-slide-down">
          <div className="bg-slate-900/95 backdrop-blur-2xl text-white p-6 rounded-[3rem] shadow-6xl flex items-center space-x-6 border border-white/10">
            <ChefAvatar size="md" className="flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400 mb-1">Gusto Live Feed</p>
              <p className="text-base font-bold leading-snug">{tutorialNarration}</p>
            </div>
          </div>
        </div>
      )}

      <main className={`flex-1 pb-44 transition-all duration-700 ${showAppUI ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
        {activeTab === Command.SCAN_ITEM && (
          <div className="max-w-4xl mx-auto space-y-16 animate-fade-in">
            <Scanner 
              onAnalyze={(imgs) => console.log(imgs)}
              isProcessing={loading}
              tutorialAssetsFlying={tutorialAssetsFlying}
              demoImage={isDemoRunning ? ASSETS.MILK : null}
            />

            {analysisResult?.item && (
              <div id="results-card" className="bg-white p-10 md:p-16 rounded-[4rem] shadow-6xl border border-slate-50 animate-scale-up">
                <div className="flex flex-col md:flex-row gap-12">
                   <div className="w-full md:w-1/3 aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-100 border-4 border-white">
                      <img 
                        src={analysisResult.item.imageUrl || ASSETS.MILK} 
                        className="w-full h-full object-cover" 
                        alt="Scan Result" 
                        onError={handleImageError}
                      />
                   </div>
                   <div className="flex-1 space-y-8">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-[0.5em] text-emerald-500 mb-2 block">Neural Eye Profiling</span>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter">{analysisResult.item.name}</h2>
                        <p className="text-xl font-bold text-slate-400">{analysisResult.item.brand || 'Bio-signature'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                           <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Expiration</label>
                           <p className="text-lg font-black">{analysisResult.item.expiryDate || 'N/A'}</p>
                        </div>
                        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                           <label className="text-[10px] font-black uppercase text-emerald-600/60 mb-1 block">Freshness</label>
                           <p className="text-lg font-black text-emerald-600">Perfect</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleFinishDemo}
                        className="w-full py-7 bg-slate-900 text-white font-black rounded-full shadow-6xl uppercase tracking-widest hover:bg-emerald-600 transition-all ring-8 ring-slate-900/5 active:scale-95"
                      >
                        Secure in Vault
                      </button>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === Command.SHOW_INVENTORY && (
          <div className="space-y-16 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-10">
              <div className="text-center md:text-left">
                <h2 className="text-8xl font-black text-slate-900 tracking-tighter leading-none opacity-90 uppercase">Vault</h2>
                <p className="text-slate-400 text-2xl font-medium tracking-tight">Currently monitoring {inventory.length} biological assets.</p>
              </div>
              <button onClick={() => setActiveTab(Command.SCAN_ITEM)} className="px-12 py-6 bg-slate-900 text-white rounded-full font-black text-[11px] uppercase tracking-[0.2em] shadow-6xl hover:bg-emerald-500 transition-all scale-110 active:scale-100 ring-8 ring-slate-900/5">
                Launch Eye
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {inventory.length === 0 ? (
                <div className="col-span-full py-48 bg-white rounded-[4rem] border-2 border-dashed border-slate-100 text-center flex flex-col items-center justify-center space-y-8 group hover:border-emerald-200 transition-all cursor-pointer" onClick={() => setActiveTab(Command.SCAN_ITEM)}>
                   <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200"><i className="fas fa-boxes-stacked text-4xl"></i></div>
                   <p className="text-slate-300 text-3xl font-black uppercase tracking-[0.5em]">Vault Idle</p>
                </div>
              ) : (
                inventory.map((item, idx) => (
                  <div key={item.id} className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-50 hover:shadow-6xl hover:-translate-y-3 transition-all group relative overflow-hidden animate-scale-up" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="w-full aspect-square rounded-[2rem] bg-slate-100 overflow-hidden mb-6 shadow-xl group-hover:scale-105 transition-transform duration-500">
                      <img 
                        src={item.imageUrl || ASSETS.MILK} 
                        className="w-full h-full object-cover" 
                        alt={item.name} 
                        onError={handleImageError}
                      />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{item.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{item.brand || 'Visual ID Captured'}</p>
                    <div className="flex items-center space-x-3 bg-slate-50 py-3 px-5 rounded-full text-[10px] font-black uppercase shadow-inner group-hover:bg-slate-900 group-hover:text-white transition-colors duration-500">
                       <span className={`w-2 h-2 rounded-full ${item.expiryDate && new Date(item.expiryDate).getTime() - Date.now() < 259200000 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`}></span>
                       <span>{item.expiryDate || 'Verified'}</span>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="absolute top-6 right-6 text-slate-100 hover:text-rose-500 transition-colors p-2 group-hover:opacity-100 opacity-0"><i className="fas fa-trash-can text-base"></i></button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Persistence Nav Controller */}
      <nav className={`fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-slate-900/98 backdrop-blur-3xl rounded-full p-3 flex justify-between items-center z-[200] shadow-6xl border border-white/10 transition-all duration-1000 ${showAppUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24 pointer-events-none'}`}>
        {[
          { id: Command.SCAN_ITEM, label: 'Eye', icon: 'fa-camera-viewfinder' },
          { id: Command.SHOW_INVENTORY, label: 'Vault', icon: 'fa-box-archive' },
          { id: Command.SHOW_NUTRITION, label: 'Vital', icon: 'fa-heart-pulse' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => { setActiveTab(tab.id); setAnalysisResult(null); }}
            className={`flex-1 flex flex-col items-center justify-center py-5 rounded-full transition-all duration-500 ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-3xl scale-110' : 'text-slate-500 hover:text-white'}`}
          >
            <i className={`fas ${tab.icon} text-xl mb-1`}></i>
            <span className="text-[8px] font-black uppercase tracking-[0.3em]">{tab.label}</span>
          </button>
        ))}
      </nav>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes scaleUp { 0% { transform: scale(0.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes slideUp { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { 0% { transform: translate(-50%, -100%); opacity: 0; } 100% { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes flyInScanner { 0% { transform: translate(100vw, 30vh) scale(3); opacity: 0; } 100% { transform: translate(0, 0) scale(1); opacity: 1; } }
        
        .animate-scale-up { animation: scaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-slide-up { animation: slideUp 0.4s ease-out both; }
        .animate-slide-down { animation: slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-fade-in { animation: fadeIn 0.8s ease-out; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-fly-to-scanner { animation: flyInScanner 1.2s cubic-bezier(0.16, 1, 0.3, 1) both; }
        
        .shadow-6xl { box-shadow: 0 40px 100px -20px rgba(0,0,0,0.5), 0 20px 40px -20px rgba(0,0,0,0.4); }
        .shadow-3xl { box-shadow: 0 15px 35px -5px rgba(16,185,129,0.4); }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
