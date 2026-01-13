
import React, { useState, useEffect, useCallback } from 'react';
import { Command, FoodItem, Recipe, AnalysisResponse } from './types';
import { analyzeFood } from './geminiService';
import Scanner from './components/Scanner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Command>(Command.SCAN_ITEM);
  const [inventory, setInventory] = useState<FoodItem[]>(() => {
    const saved = localStorage.getItem('fresh-track-inventory');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

  useEffect(() => {
    localStorage.setItem('fresh-track-inventory', JSON.stringify(inventory));
  }, [inventory]);

  const handleScanAnalysis = async (images: string[]) => {
    setLoading(true);
    setAnalysisResult(null);
    try {
      const response = await analyzeFood(Command.SCAN_ITEM, images);
      if (response.item) {
        setAnalysisResult(response);
      } else {
        alert("Gemini couldn't identify the item clearly. Please try scanning more clearly.");
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to analyze images. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addItemToInventory = () => {
    if (analysisResult?.item) {
      const newItem: FoodItem = {
        ...analysisResult.item,
        id: crypto.randomUUID(),
        addedDate: new Date().toISOString()
      };
      setInventory(prev => [newItem, ...prev]);
      setAnalysisResult(null);
      setActiveTab(Command.SHOW_INVENTORY);
    }
  };

  const removeItem = (id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
  };

  const executeCommand = async (cmd: Command) => {
    setActiveTab(cmd);
    if (cmd === Command.SCAN_ITEM || cmd === Command.SHOW_INVENTORY) return;

    setLoading(true);
    setAnalysisResult(null);
    try {
      const response = await analyzeFood(cmd, undefined, inventory);
      setAnalysisResult(response);
    } catch (error) {
      console.error("Command execution failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => {
    const expiringSoon = inventory.filter(item => {
      if (!item.expiryDate && !item.shelfLifeDays) return false;
      const expiry = item.expiryDate ? new Date(item.expiryDate) : new Date(new Date(item.addedDate).getTime() + (item.shelfLifeDays || 0) * 86400000);
      const diff = expiry.getTime() - Date.now();
      return diff < 3 * 86400000; // 3 days
    });

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl">
              <i className="fas fa-boxes-stacked"></i>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Items</p>
              <h3 className="text-2xl font-bold">{inventory.length}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center text-xl">
              <i className="fas fa-clock-rotate-left"></i>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Expiring Soon</p>
              <h3 className="text-2xl font-bold">{expiringSoon.length}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-xl">
              <i className="fas fa-leaf"></i>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Fresh Items</p>
              <h3 className="text-2xl font-bold">{inventory.filter(i => i.freshness === 'Fresh').length}</h3>
            </div>
          </div>
        </div>

        {activeTab === Command.SHOW_REMINDERS && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <i className="fas fa-bell text-amber-500 mr-2"></i>
              Smart Reminders
            </h2>
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ) : analysisResult?.reminders ? (
              <ul className="space-y-3">
                {analysisResult.reminders.map((r, i) => (
                  <li key={i} className="flex items-start p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg text-amber-800">
                    <span className="mr-3 mt-1">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No urgent reminders. Your inventory looks good!</p>
            )}
          </div>
        )}

        {activeTab === Command.SHOW_NUTRITION && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <h2 className="text-xl font-bold mb-4 flex items-center">
              <i className="fas fa-chart-pie text-indigo-500 mr-2"></i>
              Inventory Nutrition Analysis
            </h2>
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Prot (g)', val: inventory.reduce((acc, i) => acc + (i.nutrition?.protein || 0), 0) },
                  { name: 'Carb (g)', val: inventory.reduce((acc, i) => acc + (i.nutrition?.carbs || 0), 0) },
                  { name: 'Fat (g)', val: inventory.reduce((acc, i) => acc + (i.nutrition?.fats || 0), 0) }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="val">
                    <Cell fill="#10b981" />
                    <Cell fill="#3b82f6" />
                    <Cell fill="#f59e0b" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {analysisResult?.nutritionSummary && (
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-indigo-900 leading-relaxed">
                {analysisResult.nutritionSummary}
              </div>
            )}
          </div>
        )}

        {activeTab === Command.SUGGEST_RECIPES && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              [1, 2].map(i => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse h-48"></div>
              ))
            ) : analysisResult?.recipes?.map((recipe, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-800">{recipe.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    recipe.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : 
                    recipe.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {recipe.difficulty}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <i className="fas fa-clock mr-2"></i>
                  {recipe.prepTime}
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-2">Ingredients</h4>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                    </ul>
                  </div>
                  <button className="w-full py-2 bg-emerald-50 text-emerald-700 font-bold rounded-lg hover:bg-emerald-100 transition-colors">
                    View Instructions
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderInventory = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Kitchen</h2>
        <div className="flex space-x-2">
           <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
             {inventory.length} Items
           </span>
        </div>
      </div>
      
      {inventory.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
           <i className="fas fa-basket-shopping text-gray-300 text-6xl mb-4"></i>
           <p className="text-gray-500 text-lg">Your inventory is empty.<br/>Scan some items to get started!</p>
           <button 
            onClick={() => setActiveTab(Command.SCAN_ITEM)}
            className="mt-4 text-emerald-600 font-bold hover:underline"
           >
            Scan an item now
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative group overflow-hidden">
              <button 
                onClick={() => removeItem(item.id)}
                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
              >
                <i className="fas fa-trash"></i>
              </button>
              
              <div className="flex items-start space-x-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                  item.type === 'packaged' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  <i className={item.type === 'packaged' ? 'fas fa-box' : 'fas fa-apple-whole'}></i>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 truncate pr-6">{item.name}</h3>
                  <p className="text-xs text-gray-400">{item.brand || 'Fresh Produce'}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {item.freshness && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    item.freshness === 'Fresh' ? 'bg-green-100 text-green-700' :
                    item.freshness === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.freshness}
                  </span>
                )}
                {item.expiryDate ? (
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                    Expires: {new Date(item.expiryDate).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                    No Expiry Date
                  </span>
                )}
              </div>

              {item.nutrition && (item.nutrition.calories > 0 || item.nutrition.protein > 0) ? (
                <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                  <div className="flex justify-between">
                    <span>Cals</span>
                    <span className="font-bold text-gray-700">{item.nutrition.calories}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prot</span>
                    <span className="font-bold text-gray-700">{item.nutrition.protein}g</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-gray-50 text-[10px] text-gray-400 italic">
                  Nutrition label not found
                </div>
              )}
              
              {item.storageAdvice && (
                <div className="mt-3 p-2 bg-blue-50 text-blue-700 text-[10px] rounded-lg">
                  <i className="fas fa-info-circle mr-1"></i>
                  {item.storageAdvice}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-4xl mx-auto px-4 py-6">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <i className="fas fa-kitchen-set"></i>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">FreshTrack<span className="text-emerald-600">AI</span></h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-gray-400 hover:text-gray-600">
            <i className="fas fa-user-circle text-2xl"></i>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24">
        {activeTab === Command.SCAN_ITEM && (
          <div className="flex flex-col items-center">
            {!analysisResult && (
              <div className="w-full text-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Scan Your Groceries</h2>
                <p className="text-gray-500">Snap up to 3 angles for high-precision detection.</p>
              </div>
            )}
            
            <Scanner onAnalyze={handleScanAnalysis} isProcessing={loading} />

            {analysisResult?.item && (
              <div className="mt-8 w-full bg-white p-6 rounded-3xl shadow-xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {!analysisResult.item.expiryDate && (
                  <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl flex items-start space-x-3 text-amber-900">
                    <i className="fas fa-triangle-exclamation mt-1 text-amber-600"></i>
                    <div>
                      <p className="font-bold text-sm">Expiry Date Not Found</p>
                      <p className="text-xs opacity-80">Gemini could not locate a clear date in the scans. Please check manually.</p>
                    </div>
                  </div>
                )}

                {(analysisResult.item.type === 'packaged' && (!analysisResult.item.nutrition || analysisResult.item.nutrition.calories === 0)) && (
                  <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl flex items-start space-x-3 text-blue-900">
                    <i className="fas fa-info-circle mt-1 text-blue-600"></i>
                    <div>
                      <p className="font-bold text-sm">Nutrition Facts Unavailable</p>
                      <p className="text-xs opacity-80">Nutrition label was not visible. No facts were assumed.</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{analysisResult.item.name}</h2>
                    <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">{analysisResult.item.brand || 'Identified Item'}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full font-bold text-sm ${
                    analysisResult.item.freshness === 'Fresh' ? 'bg-emerald-100 text-emerald-700' :
                    analysisResult.item.freshness === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {analysisResult.item.freshness || 'Verified'}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className={`p-4 rounded-2xl text-center ${analysisResult.item.nutrition?.calories ? 'bg-gray-50' : 'bg-gray-100 opacity-40'}`}>
                    <p className="text-xs text-gray-400 mb-1">Calories</p>
                    <p className="text-xl font-bold text-gray-800">{analysisResult.item.nutrition?.calories || '--'}</p>
                  </div>
                  <div className={`p-4 rounded-2xl text-center ${analysisResult.item.nutrition?.protein ? 'bg-gray-50' : 'bg-gray-100 opacity-40'}`}>
                    <p className="text-xs text-gray-400 mb-1">Protein</p>
                    <p className="text-xl font-bold text-gray-800">{analysisResult.item.nutrition?.protein || '--'}g</p>
                  </div>
                  <div className={`p-4 rounded-2xl text-center ${analysisResult.item.nutrition?.carbs ? 'bg-gray-50' : 'bg-gray-100 opacity-40'}`}>
                    <p className="text-xs text-gray-400 mb-1">Carbs</p>
                    <p className="text-xl font-bold text-gray-800">{analysisResult.item.nutrition?.carbs || '--'}g</p>
                  </div>
                  <div className={`p-4 rounded-2xl text-center ${analysisResult.item.nutrition?.fats ? 'bg-gray-50' : 'bg-gray-100 opacity-40'}`}>
                    <p className="text-xs text-gray-400 mb-1">Fats</p>
                    <p className="text-xl font-bold text-gray-800">{analysisResult.item.nutrition?.fats || '--'}g</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                      <i className="fas fa-calendar-day"></i>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Expiry Date</p>
                      <p className={`text-gray-500 ${!analysisResult.item.expiryDate ? 'italic text-amber-600 font-medium' : ''}`}>
                        {analysisResult.item.expiryDate || 'NOT DETECTED'}
                      </p>
                    </div>
                  </div>
                  {analysisResult.item.notes && (
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-600 leading-relaxed">
                      <p className="font-bold text-gray-400 uppercase tracking-widest text-[9px] mb-1">AI Analyst Notes</p>
                      {analysisResult.item.notes}
                    </div>
                  )}
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                      <i className="fas fa-temperature-half"></i>
                    </div>
                    <div>
                      <p className="font-semibold">Storage Advice</p>
                      <p className="text-gray-500">{analysisResult.item.storageAdvice || 'Keep in a cool dry place'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                   <button 
                    onClick={() => setAnalysisResult(null)}
                    className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={addItemToInventory}
                    className="flex-[2] py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-200"
                  >
                    Add to Inventory
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === Command.SHOW_INVENTORY && renderInventory()}
        {(activeTab === Command.SHOW_REMINDERS || activeTab === Command.SHOW_NUTRITION || activeTab === Command.SUGGEST_RECIPES) && renderDashboard()}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-2 flex justify-between items-center z-50">
        <button 
          onClick={() => setActiveTab(Command.SCAN_ITEM)}
          className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${activeTab === Command.SCAN_ITEM ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-emerald-600'}`}
        >
          <i className="fas fa-plus-circle text-xl mb-1"></i>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Scan</span>
        </button>
        <button 
          onClick={() => executeCommand(Command.SHOW_INVENTORY)}
          className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${activeTab === Command.SHOW_INVENTORY ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-emerald-600'}`}
        >
          <i className="fas fa-list-ul text-xl mb-1"></i>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Stock</span>
        </button>
        <button 
          onClick={() => executeCommand(Command.SHOW_REMINDERS)}
          className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${activeTab === Command.SHOW_REMINDERS ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-emerald-600'}`}
        >
          <i className="fas fa-bell text-xl mb-1"></i>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Alerts</span>
        </button>
        <button 
          onClick={() => executeCommand(Command.SHOW_NUTRITION)}
          className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${activeTab === Command.SHOW_NUTRITION ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-emerald-600'}`}
        >
          <i className="fas fa-heart-pulse text-xl mb-1"></i>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Health</span>
        </button>
        <button 
          onClick={() => executeCommand(Command.SUGGEST_RECIPES)}
          className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${activeTab === Command.SUGGEST_RECIPES ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-emerald-600'}`}
        >
          <i className="fas fa-mortar-pestle text-xl mb-1"></i>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Recipes</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
