import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Wind, Scale, Droplet, Activity, Info } from 'lucide-react';

const App = () => {
  // --- Step 1: Patient Profile ---
  const [gender, setGender] = useState('male');
  const [height, setHeight] = useState('170');
  const [weight, setWeight] = useState('65');

  // --- Step 2: Vent Settings ---
  const [vt, setVt] = useState('');
  const [rr, setRr] = useState('');
  const [mv, setMv] = useState('');

  // --- Step 3: Oxygenation ---
  const [pao2, setPao2] = useState('80');
  const [currentFio2, setCurrentFio2] = useState('40'); // %

  // --- Step 4: PEEP ---
  const [tableFio2, setTableFio2] = useState('40'); // %

  // ==========================================
  // Calculations
  // ==========================================

  // ① 基本情報の計算 (PBW, BMI, Target MV)
  const patientData = useMemo(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    
    if (isNaN(h) || h <= 0 || isNaN(w) || w <= 0) {
      return { pbw: null, bmi: null, targetMv: null, isValid: false };
    }

    // 予測体重 (PBW)
    let pbw = gender === 'male' 
      ? 50 + 0.91 * (h - 152.4) 
      : 45.5 + 0.91 * (h - 152.4);
    pbw = Math.max(pbw, 1);

    // BMI
    const bmi = w / Math.pow(h / 100, 2);

    // 目標分時換気量 (Target MV) = 実体重 * 100 ml/min
    const targetMv = w * 100;

    return { pbw, bmi, targetMv, isValid: true };
  }, [gender, height, weight]);

  // 初期値のセット (基本情報が変更された時のみ再計算)
  useEffect(() => {
    if (patientData.isValid) {
      const defaultVt = Math.round(patientData.pbw * 6);
      const defaultMv = patientData.targetMv / 1000;
      const defaultRr = Math.round((defaultMv * 1000) / defaultVt);
      
      setVt(defaultVt.toString());
      setRr(defaultRr.toString());
      setMv(defaultMv.toFixed(2));
    } else {
      setVt('');
      setRr('');
      setMv('');
    }
  }, [patientData.isValid, patientData.pbw, patientData.targetMv]);

  // ② 換気量の連動ハンドラー
  // 1回換気量(Vt)を変更 → 分時換気量(MV)を維持するように呼吸回数(RR)を再計算
  const handleVtChange = (e) => {
    const val = e.target.value;
    setVt(val);
    const vNum = parseFloat(val);
    const mNum = parseFloat(mv);
    const rNum = parseFloat(rr);

    if (!isNaN(vNum) && vNum > 0) {
      if (!isNaN(mNum) && mNum > 0) {
        // 現在のMVを維持してRRを逆算
        const newRr = Math.max(1, Math.round((mNum * 1000) / vNum));
        setRr(newRr.toString());
        // 丸めたRRに合わせて正確なMVも微調整
        setMv(((vNum * newRr) / 1000).toFixed(2));
      } else if (!isNaN(rNum) && rNum > 0) {
        setMv(((vNum * rNum) / 1000).toFixed(2));
      }
    }
  };

  // 呼吸回数(RR)を変更 → 1回換気量(Vt)を維持して分時換気量(MV)を再計算
  const handleRrChange = (e) => {
    const val = e.target.value;
    setRr(val);
    const rNum = parseFloat(val);
    const vNum = parseFloat(vt);
    if (!isNaN(vNum) && !isNaN(rNum) && rNum >= 0) {
      setMv(((vNum * rNum) / 1000).toFixed(2));
    }
  };

  // 分時換気量(MV)を変更 → 1回換気量(Vt)を維持して呼吸回数(RR)を再計算
  const handleMvChange = (e) => {
    const val = e.target.value;
    setMv(val);
    const mNum = parseFloat(val);
    const vNum = parseFloat(vt);
    if (!isNaN(mNum) && mNum >= 0 && !isNaN(vNum) && vNum > 0) {
      const newRr = Math.max(1, Math.round((mNum * 1000) / vNum));
      setRr(newRr.toString());
    }
  };

  // ③ 酸素化・FiO2漸減の計算
  const pfData = useMemo(() => {
    const p = parseFloat(pao2);
    const f = parseFloat(currentFio2);
    if (isNaN(p) || isNaN(f) || f <= 0) return null;
    
    const ratio = Math.round(p / (f / 100));
    
    // PaO2 60~100にするためのFiO2要求量 (下限21%, 上限100%)
    const rawLower = (60 / ratio) * 100;
    const rawUpper = (100 / ratio) * 100;
    
    const lower = Math.max(21, Math.min(100, Math.round(rawLower)));
    const upper = Math.max(21, Math.min(100, Math.round(rawUpper)));

    return { ratio, lower, upper };
  }, [pao2, currentFio2]);

  // ④ PEEP Tableのロジック
  const getLowPeep = (fio2Val) => {
    const f = parseFloat(fio2Val);
    if (f <= 30) return '5';
    if (f <= 40) return '5 - 8';
    if (f <= 50) return '8 - 10';
    if (f <= 60) return '10';
    if (f <= 70) return '10 - 14';
    if (f <= 80) return '14';
    if (f <= 90) return '14 - 18';
    return '18 - 24';
  };

  const getHighPeep = (fio2Val) => {
    const f = parseFloat(fio2Val);
    if (f <= 30) return '5 - 14';
    if (f <= 40) return '14 - 16';
    if (f <= 50) return '16 - 20';
    if (f <= 60) return '20';
    if (f <= 70) return '20';
    if (f <= 80) return '20 - 22';
    if (f <= 90) return '22';
    return '22 - 24';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center space-x-4 bg-slate-900 p-5 rounded-2xl shadow-lg border border-slate-800">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-950/50">
            <Settings size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">人工呼吸器 設定シミュレーター</h1>
            <p className="text-slate-400 text-sm font-medium mt-1">プロトコルに基づく自動計算 ＆ 漸減評価</p>
          </div>
        </header>

        {/* ① 患者基本情報 */}
        <section className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800">
          <h2 className="text-lg font-bold mb-5 flex items-center text-slate-100 border-b border-slate-800 pb-3">
            <Scale size={20} className="mr-2 text-blue-400" />
            ① 患者基本情報
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">性別</label>
                <div className="flex rounded-lg shadow-sm">
                  <button
                    onClick={() => setGender('male')}
                    className={`flex-1 py-2 text-sm font-bold rounded-l-lg border transition-all ${
                      gender === 'male' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >男性</button>
                  <button
                    onClick={() => setGender('female')}
                    className={`flex-1 py-2 text-sm font-bold rounded-r-lg border-y border-r transition-all ${
                      gender === 'female' ? 'bg-pink-600 border-pink-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >女性</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">身長 (cm)</label>
                  <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-lg" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">実体重 (kg)</label>
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-lg" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80 flex flex-col justify-center items-center">
                <span className="text-sm font-bold text-slate-400 mb-1">予測体重 (PBW)</span>
                <div className="flex items-baseline text-blue-400">
                  <span className="text-4xl font-black">{patientData.isValid ? patientData.pbw.toFixed(1) : '--'}</span>
                  <span className="ml-1 text-sm font-bold">kg</span>
                </div>
              </div>
              <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80 flex flex-col justify-center items-center">
                <span className="text-sm font-bold text-slate-400 mb-1">BMI</span>
                <div className="flex items-baseline text-slate-100">
                  <span className="text-4xl font-black">{patientData.isValid ? patientData.bmi.toFixed(1) : '--'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ② 換気設定 */}
        <section className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 border-b border-slate-800 pb-3 gap-2">
            <h2 className="text-lg font-bold flex items-center text-slate-100">
              <Wind size={20} className="mr-2 text-teal-400" />
              ② 換気設定 (相互連動)
            </h2>
            <span className="text-xs font-medium text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full">
              ※ 1項目を変更すると他項目が自動計算されます
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1回換気量 */}
            <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/50">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-200">1回換気量 (Vt)</label>
                <span className="text-[11px] font-semibold text-teal-300 bg-teal-900/60 px-2 py-0.5 rounded border border-teal-700/50">変更→RR/MV連動</span>
              </div>
              <div className="relative">
                <input type="number" value={vt} onChange={handleVtChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-2xl font-black text-white pr-12" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">mL</span>
              </div>
              <div className="mt-2 text-xs font-semibold text-teal-300 flex justify-between">
                <span>PBW換算 (目安 4〜8):</span>
                <span>
                  {patientData.isValid && parseFloat(vt) 
                    ? (parseFloat(vt) / patientData.pbw).toFixed(1) 
                    : '--'} mL/kg
                </span>
              </div>
            </div>

            {/* 呼吸回数 */}
            <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/50">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-200">呼吸回数 (RR)</label>
                <span className="text-[11px] font-semibold text-teal-300 bg-teal-900/60 px-2 py-0.5 rounded border border-teal-700/50">変更→MV連動</span>
              </div>
              <div className="relative">
                <input type="number" value={rr} onChange={handleRrChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-2xl font-black text-white pr-16" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">回/分</span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-400 flex justify-between">
                <span>推奨初期目安:</span>
                <span>
                  {patientData.isValid && parseFloat(vt) > 0
                    ? Math.round(patientData.targetMv / parseFloat(vt))
                    : '--'} 回/分
                </span>
              </div>
            </div>
            
            {/* 分時換気量 */}
            <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-800/50">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-blue-200">分時換気量 (MV)</label>
                <span className="text-[11px] font-semibold text-blue-300 bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700/50">変更→RR連動</span>
              </div>
              <div className="relative">
                <input type="number" step="0.1" value={mv} onChange={handleMvChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-blue-800/70 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-2xl font-black text-blue-300 pr-16" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400/70 font-bold">L/分</span>
              </div>
              <div className="mt-2 text-xs font-semibold text-blue-300 flex justify-between">
                <span>目標 (実体重×100):</span>
                <span>{patientData.isValid ? (patientData.targetMv / 1000).toFixed(2) : '--'} L/分</span>
              </div>
            </div>
          </div>
        </section>

        {/* ③ & ④ Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* ③ 酸素化とFiO2調整 */}
          <section className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col">
            <h2 className="text-lg font-bold mb-4 flex items-center text-slate-100 border-b border-slate-800 pb-3">
              <Droplet size={20} className="mr-2 text-indigo-400" />
              ③ 酸素化とFiO2漸減
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">現行 PaO2 (Torr)</label>
                <input type="number" value={pao2} onChange={(e) => setPao2(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">現行 FiO2 (%)</label>
                <input type="number" value={currentFio2} onChange={(e) => setCurrentFio2(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-indigo-950/40 rounded-xl border border-indigo-800/50 mb-4">
              <span className="text-sm font-bold text-indigo-200">P/F 比 (Ratio)</span>
              <span className="text-3xl font-black text-indigo-400">{pfData ? pfData.ratio : '--'}</span>
            </div>

            <div className="mt-auto bg-slate-800/60 border border-slate-700/80 p-4 rounded-xl">
              <div className="flex items-start">
                <Info size={18} className="text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-bold text-slate-300 leading-relaxed">
                  目標PaO₂ (60〜100Torr) を維持するためのFiO₂は <br/>
                  <span className="text-lg font-black text-indigo-400 mx-1">{pfData ? pfData.lower : '--'} %</span> 〜
                  <span className="text-lg font-black text-indigo-400 mx-1">{pfData ? pfData.upper : '--'} %</span> <br/>
                  まで漸減・調整可能です。
                </p>
              </div>
            </div>
          </section>

          {/* ④ PEEP設定 */}
          <section className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col">
            <h2 className="text-lg font-bold mb-4 flex items-center text-slate-100 border-b border-slate-800 pb-3">
              <Activity size={20} className="mr-2 text-rose-400" />
              ④ PEEP 設定 (ARDSNet)
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-300 mb-2">評価用 FiO2 (%)</label>
              <select 
                value={tableFio2} 
                onChange={(e) => setTableFio2(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-xl font-bold"
              >
                <option value="30">30% (0.3)</option>
                <option value="40">40% (0.4)</option>
                <option value="50">50% (0.5)</option>
                <option value="60">60% (0.6)</option>
                <option value="70">70% (0.7)</option>
                <option value="80">80% (0.8)</option>
                <option value="90">90% (0.9)</option>
                <option value="100">100% (1.0)</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-rose-950/30 rounded-lg border border-rose-800/50">
                <span className="text-sm font-bold text-rose-200">Low PEEP Table</span>
                <span className="text-xl font-black text-rose-400">{getLowPeep(tableFio2)} <span className="text-sm font-bold">cmH₂O</span></span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-rose-950/30 rounded-lg border border-rose-800/50">
                <span className="text-sm font-bold text-rose-200">High PEEP Table</span>
                <span className="text-xl font-black text-rose-400">{getHighPeep(tableFio2)} <span className="text-sm font-bold">cmH₂O</span></span>
              </div>

              <div className="flex justify-between items-center p-3 mt-4 bg-slate-800/70 rounded-lg border border-slate-700">
                <span className="text-sm font-bold text-slate-300">肥満考慮 PEEP <span className="text-xs text-slate-400">(BMI ÷ 3)</span></span>
                <span className="text-xl font-black text-white">
                  {patientData.isValid ? Math.round(patientData.bmi / 3) : '--'} <span className="text-sm font-bold text-slate-400">cmH₂O</span>
                </span>
              </div>
            </div>
          </section>
          
        </div>

      </div>
    </div>
  );
};

export default App;