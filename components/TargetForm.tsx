
import React, { useState } from 'react';
import { TargetProfiles, MacroTargets } from '../types';

interface TargetFormProps {
  targets: TargetProfiles;
  onSave: (targets: TargetProfiles) => void;
}

const TargetForm: React.FC<TargetFormProps> = ({ targets, onSave }) => {
  const [activeSubTab, setActiveSubTab] = useState<'training' | 'rest'>('training');
  // Usiamo uno stato locale che può accettare stringhe per permettere il campo vuoto
  const [localTargets, setLocalTargets] = useState<any>(targets); 
  const [showSaved, setShowSaved] = useState(false);

  const currentMacro = localTargets[activeSubTab];

  const updateField = (field: keyof MacroTargets, value: string) => {
    // Se l'input è vuoto, salviamo stringa vuota, altrimenti il numero
    const val = value === '' ? '' : parseFloat(value);
    
    setLocalTargets((prev: any) => ({
      ...prev,
      [activeSubTab]: {
        ...prev[activeSubTab],
        [field]: val
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Conversione finale: se stringa vuota o NaN, diventa 0
    const cleanTargets: TargetProfiles = {
        training: {
            kcal: Number(localTargets.training.kcal) || 0,
            carbs: Number(localTargets.training.carbs) || 0,
            protein: Number(localTargets.training.protein) || 0,
            fat: Number(localTargets.training.fat) || 0,
            fiber: Number(localTargets.training.fiber) || 0,
        },
        rest: {
            kcal: Number(localTargets.rest.kcal) || 0,
            carbs: Number(localTargets.rest.carbs) || 0,
            protein: Number(localTargets.rest.protein) || 0,
            fat: Number(localTargets.rest.fat) || 0,
            fiber: Number(localTargets.rest.fiber) || 0,
        }
    };

    onSave(cleanTargets);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const inputStyle = "w-full p-4 bg-white border border-slate-300 rounded-2xl outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-base font-black text-black placeholder-slate-400 transition-all shadow-sm";
  const labelStyle = "block text-[10px] font-black text-black uppercase mb-1 tracking-tight";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-black uppercase tracking-tight">Target</h2>
        <div className="flex bg-slate-200 p-1.5 rounded-2xl shadow-inner border border-slate-300">
          <button 
            onClick={() => setActiveSubTab('training')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${activeSubTab === 'training' ? 'bg-white shadow-md text-indigo-700 border border-indigo-200' : 'text-slate-600'}`}
          >
            Allenamento
          </button>
          <button 
            onClick={() => setActiveSubTab('rest')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${activeSubTab === 'rest' ? 'bg-white shadow-md text-indigo-700 border border-indigo-200' : 'text-slate-600'}`}
          >
            Riposo
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-black text-black mb-1.5 uppercase tracking-tighter">Calorie (Kcal)</label>
            <input 
              type="number" 
              value={currentMacro.kcal}
              onChange={e => updateField('kcal', e.target.value)}
              className={inputStyle}
              placeholder="Inserisci Calorie Target..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Carbo (g)</label>
              <input type="number" value={currentMacro.carbs} onChange={e => updateField('carbs', e.target.value)}
                className={inputStyle} placeholder="es. 300" />
            </div>
            <div>
              <label className={labelStyle}>Proteine (g)</label>
              <input type="number" value={currentMacro.protein} onChange={e => updateField('protein', e.target.value)}
                className={inputStyle} placeholder="es. 180" />
            </div>
            <div>
              <label className={labelStyle}>Grassi (g)</label>
              <input type="number" value={currentMacro.fat} onChange={e => updateField('fat', e.target.value)}
                className={inputStyle} placeholder="es. 60" />
            </div>
            <div>
              <label className={labelStyle}>Fibre (g)</label>
              <input type="number" value={currentMacro.fiber} onChange={e => updateField('fiber', e.target.value)}
                className={inputStyle} placeholder="es. 30" />
            </div>
          </div>
        </div>

        <button type="submit" className="w-full py-4 bg-black text-white rounded-2xl font-black text-sm shadow-xl hover:opacity-90 active:scale-[0.98] transition-all uppercase tracking-widest">
          Salva Impostazioni
        </button>
        {showSaved && <p className="text-center text-green-700 text-xs font-black animate-bounce tracking-widest uppercase mt-2">Target Salvati!</p>}
      </form>
    </div>
  );
};

export default TargetForm;
