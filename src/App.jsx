import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wind, Droplet, Activity, Syringe, Pill, ClipboardCheck, 
  Utensils, TrendingUp, HeartPulse, CheckSquare, Square, RotateCcw, Calculator
} from 'lucide-react';

const App = () => {
  // URLパラメータから初期タブを取得可能にする
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) return tab;
    }
    return 'vent';
  });

  // ==========================================
  // 共通：患者基本情報 (全タブで共有)
  // ==========================================
  const [gender, setGender] = useState('male');
  const [height, setHeight] = useState('170');
  const [weight, setWeight] = useState('65');
  const [weightBasis, setWeightBasis] = useState('actual'); // 'actual' | 'ibw' | 'pbw' | 'abw'

  const patientData = useMemo(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    
    if (isNaN(h) || h <= 0 || isNaN(w) || w <= 0) {
      return { pbw: 60, ibw: 63.6, abw: 64.2, actualWeight: 65, bmi: 22.5, targetMv: 6500, isValid: false };
    }

    // 予測体重 (PBW: Devine式)
    let pbw = gender === 'male' 
      ? 50 + 0.91 * (h - 152.4) 
      : 45.5 + 0.91 * (h - 152.4);
    pbw = Math.max(pbw, 1);

    // 理想体重 (IBW: 標準体重 BMI 22基準)
    const ibw = 22 * Math.pow(h / 100, 2);

    // 調整体重 (ABW: 肥満時薬剤投与用 = IBW + 0.4 * (実体重 - IBW))
    const abw = w > ibw ? ibw + 0.4 * (w - ibw) : w;

    const bmi = w / Math.pow(h / 100, 2);
    const targetMv = w * 100;

    return { pbw, ibw, abw, actualWeight: w, bmi, targetMv, isValid: true };
  }, [gender, height, weight]);

  // 薬剤・栄養計算に使用する選択基準体重
  const calcWeight = useMemo(() => {
    if (weightBasis === 'ibw') return patientData.ibw;
    if (weightBasis === 'pbw') return patientData.pbw;
    if (weightBasis === 'abw') return patientData.abw;
    return patientData.actualWeight;
  }, [weightBasis, patientData]);

  // ==========================================
  // タブ1：人工呼吸器設定
  // ==========================================
  const [vt, setVt] = useState('');
  const [rr, setRr] = useState('');
  const [mv, setMv] = useState('');
  const [pao2, setPao2] = useState('80');
  const [currentFio2, setCurrentFio2] = useState('40');
  const [tableFio2, setTableFio2] = useState('40');

  useEffect(() => {
    if (patientData.isValid) {
      const defaultVt = Math.round(patientData.pbw * 6);
      const defaultMv = patientData.targetMv / 1000;
      const defaultRr = Math.round((defaultMv * 1000) / defaultVt);
      setVt(defaultVt.toString());
      setRr(defaultRr.toString());
      setMv(defaultMv.toFixed(2));
    }
  }, [patientData.isValid, patientData.pbw, patientData.targetMv]);

  const handleVtChange = (e) => {
    const val = e.target.value;
    setVt(val);
    const vNum = parseFloat(val);
    const mNum = parseFloat(mv);
    const rNum = parseFloat(rr);
    if (!isNaN(vNum) && vNum > 0) {
      if (!isNaN(mNum) && mNum > 0) {
        const newRr = Math.max(1, Math.round((mNum * 1000) / vNum));
        setRr(newRr.toString());
        setMv(((vNum * newRr) / 1000).toFixed(2));
      } else if (!isNaN(rNum) && rNum > 0) {
        setMv(((vNum * rNum) / 1000).toFixed(2));
      }
    }
  };

  const handleRrChange = (e) => {
    const val = e.target.value;
    setRr(val);
    const rNum = parseFloat(val);
    const vNum = parseFloat(vt);
    if (!isNaN(vNum) && !isNaN(rNum) && rNum >= 0) {
      setMv(((vNum * rNum) / 1000).toFixed(2));
    }
  };

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

  const pfData = useMemo(() => {
    const p = parseFloat(pao2);
    const f = parseFloat(currentFio2);
    if (isNaN(p) || isNaN(f) || f <= 0) return null;
    const ratio = Math.round(p / (f / 100));
    const lower = Math.max(21, Math.min(100, Math.round((60 / ratio) * 100)));
    const upper = Math.max(21, Math.min(100, Math.round((100 / ratio) * 100)));
    return { ratio, lower, upper };
  }, [pao2, currentFio2]);

  const getLowPeep = (f) => {
    const v = parseFloat(f);
    if (v <= 30) return '5'; if (v <= 40) return '5 - 8'; if (v <= 50) return '8 - 10';
    if (v <= 60) return '10'; if (v <= 70) return '10 - 14'; if (v <= 80) return '14';
    if (v <= 90) return '14 - 18'; return '18 - 24';
  };
  const getHighPeep = (f) => {
    const v = parseFloat(f);
    if (v <= 30) return '5 - 14'; if (v <= 40) return '14 - 16'; if (v <= 50) return '16 - 20';
    if (v <= 60) return '20'; if (v <= 70) return '20'; if (v <= 80) return '20 - 22';
    if (v <= 90) return '22'; return '22 - 24';
  };

  // ==========================================
  // タブ2：人工呼吸器トレンドと肺メカニクス解析
  // ==========================================
  const [ventMode, setVentMode] = useState('VCV'); // 'VCV' | 'PCV' | 'PRVC' | 'SIMV' | 'PSV' | 'APRV'
  const [prevPplat, setPrevPplat] = useState('28');
  const [prevPeep, setPrevPeep] = useState('12');
  const [prevVt, setPrevVt] = useState('420');
  const [currPplat, setCurrPplat] = useState('22');
  const [currPeep, setCurrPeep] = useState('10');
  const [currPpeak, setCurrPpeak] = useState('26');
  const [currVt, setCurrVt] = useState('420');
  const [currRr, setCurrRr] = useState('18');

  const ventModeInfos = {
    VCV: {
      name: 'VCV (従量式換気)',
      focus: '1回換気量(Vt)が一定のため、肺の悪化は「Pplat・Ppeakの上昇」として現れます。',
      keyMetric: '注目指標：Pplat推移・駆動圧(ΔP)・気道圧差(Ppeak - Pplat)'
    },
    PCV: {
      name: 'PCV (従圧式換気)',
      focus: '吸気圧(PC圧+PEEP)が一定のため、肺の悪化や痰貯留は「1回換気量(Vt)の低下」として現れます。',
      keyMetric: '注目指標：1回換気量(Vt)トレンド・静的コンプライアンス(Cstat)'
    },
    PRVC: {
      name: 'PRVC (圧制御従量式 / AutoFlow / VC+)',
      focus: '目標Vtを維持するよう吸気圧を自動調整します。強い吸気努力があると補助圧が下がりすぎたり、逆に過換気(P-SILI)を招く点に注意。',
      keyMetric: '注目指標：吸気圧(Ppeak/Pplat)の自動変動・実測Vt過剰(>8mL/kg)'
    },
    SIMV: {
      name: 'SIMV (同期式間欠的強制換気)',
      focus: '設定回数の強制換気に加え、間の自発呼吸(PSV付加)を許容します。強制換気と自発呼吸の混在による呼吸仕事量増大・非同調に注意。',
      keyMetric: '注目指標：総呼吸回数・強制/自発の1回換気量差・ファイティング有無'
    },
    PSV: {
      name: 'PSV (圧支持・自発換気)',
      focus: '患者の自発吸気努力に依存します。過補助(筋萎縮)と努力過多(P-SILI: 自発呼吸関連肺傷害)に注意。',
      keyMetric: '注目指標：RSBI (浅速呼吸指数 < 105)・1回換気量(6〜8mL/kg目安)'
    },
    APRV: {
      name: 'APRV / BiLevel',
      focus: '高圧相(Phigh/Thigh)で肺胞リクルートメントを維持し、自発呼吸を温存するモードです。',
      keyMetric: '注目指標：放出1回換気量・自発呼吸の割合・平均気道内圧'
    }
  };

  const lungMechanics = useMemo(() => {
    const pPlat1 = parseFloat(prevPplat) || 0;
    const peep1 = parseFloat(prevPeep) || 0;
    const vt1 = parseFloat(prevVt) || 0;

    const pPlat2 = parseFloat(currPplat) || 0;
    const peep2 = parseFloat(currPeep) || 0;
    const pPeak2 = parseFloat(currPpeak) || 0;
    const vt2 = parseFloat(currVt) || 0;
    const rr2 = parseFloat(currRr) || 0;

    const dpPrev = Math.max(0, pPlat1 - peep1);
    const dpCurr = Math.max(0, pPlat2 - peep2);
    const cstatPrev = dpPrev > 0 ? vt1 / dpPrev : 0;
    const cstatCurr = dpCurr > 0 ? vt2 / dpCurr : 0;
    const resistiveDiff = Math.max(0, pPeak2 - pPlat2);
    const mp = 0.098 * rr2 * (vt2 / 1000) * (pPeak2 - 0.5 * dpCurr);
    const rsbi = vt2 > 0 ? Math.round(rr2 / (vt2 / 1000)) : 0;
    const vtPerPbw = patientData.pbw > 0 ? vt2 / patientData.pbw : 0;

    const isOverdistended = dpCurr >= 15 || pPlat2 >= 30 || vtPerPbw > 8.5;
    const isStiffLung = cstatCurr < 35;
    const isHighResistance = resistiveDiff >= 7;
    const isLowPeepAtelectasis = peep2 <= 5 && cstatCurr < 45;

    let statusTitle = '';
    let statusDesc = '';
    let statusColor = 'text-emerald-400 border-emerald-700 bg-emerald-950/30';
    let visualTag = '正常換気・良好なコンプライアンス';

    if (isOverdistended) {
      statusTitle = '⚠️ 肺過膨張・高い駆動圧 / 過大換気リスク (VILI / P-SILI注意)';
      statusDesc = ventMode === 'PRVC'
        ? 'PRVC稼働下で駆動圧上昇またはPBWあたり8.5mL/kg超の過大換気となっています。患者の強い吸気努力による過換気（ダブルトリガー等）がないか確認し、目標Vtや鎮静・モード見直しを検討してください。'
        : 'Driving Pressureが15以上、プラトー圧30以上、またはPBW換算8.5mL/kg超です。肺胞に過剰な伸展ストレスがかかっています。1回換気量の減量やPEEPの適正化を検討してください。';
      statusColor = 'text-rose-400 border-rose-700 bg-rose-950/40';
      visualTag = '肺胞過膨張・高ストレス状態';
    } else if (isStiffLung) {
      statusTitle = '🟠 肺コンプライアンス高度低下 (硬い肺・ARDS/無気肺傾向)';
      statusDesc = '肺の伸展性が低下しています（Cstat < 35）。前回値と比較し悪化傾向であれば、肺水腫・ARDS進行・背側無気肺を疑いPEEP調整や腹臥位療法を検討してください。';
      statusColor = 'text-amber-400 border-amber-700 bg-amber-950/30';
      visualTag = 'コンプライアンス低下（硬い肺・無気肺）';
    } else if (isHighResistance) {
      statusTitle = '🟡 気道抵抗の上昇 (分泌物貯留・気管支攣縮・チューブ屈曲)';
      statusDesc = '最高気道内圧(Ppeak)とプラトー圧(Pplat)の差が7以上に拡大しています。肺胞自体は硬くありませんが、気道が狭くなっています。吸引・気管支拡張薬・回路確認を行ってください。';
      statusColor = 'text-yellow-400 border-yellow-700 bg-yellow-950/30';
      visualTag = '気道狭窄・分泌物貯留（抵抗上昇）';
    } else {
      statusTitle = '✅ 良好な肺メカニクス・肺保護換気達成';
      statusDesc = `駆動圧(<15)・プラトー圧(<30)・気道抵抗ともに安全域内です。${
        ventMode === 'PSV' || ventMode === 'SIMV'
          ? `RSBIは ${rsbi} です（<105でウィーニング有利）。`
          : ventMode === 'PRVC'
          ? '目標1回換気量が適正圧で維持されています。吸気圧の推移を引き続き観察してください。'
          : '自発呼吸温存やPSVへの移行・SBT実施条件を評価可能です。'
      }`;
    }

    return {
      dpPrev, dpCurr, cstatPrev, cstatCurr, resistiveDiff, mp, rsbi, vtPerPbw,
      isOverdistended, isStiffLung, isHighResistance, isLowPeepAtelectasis,
      statusTitle, statusDesc, statusColor, visualTag,
      peep2, pPlat2, pPeak2
    };
  }, [prevPplat, prevPeep, prevVt, currPplat, currPeep, currPpeak, currVt, currRr, patientData.pbw, ventMode]);

  // ==========================================
  // タブ3：薬剤別 γ (ガンマ: µg/kg/min) 計算
  // ==========================================
  const gammaPresets = [
    { id: 'nad', name: 'ノルアドレナリン (NAD)', mg: 5, ml: 50, min: 0.02, normalMax: 0.3, limitMax: 1.0, note: '敗血症性ショック第一選択。0.3γ超でバソプレシン併用検討' },
    { id: 'doa', name: 'ドパミン (DOA)', mg: 200, ml: 100, min: 2.0, normalMax: 10.0, limitMax: 20.0, note: '10γ超でα作用優位・不整脈リスク増大' },
    { id: 'dob', name: 'ドブタミン (DOB)', mg: 200, ml: 100, min: 2.0, normalMax: 10.0, limitMax: 20.0, note: '心原性ショック・低心拍出量症候群に' },
    { id: 'adr', name: 'アドレナリン (Ad)', mg: 5, ml: 50, min: 0.02, normalMax: 0.3, limitMax: 1.0, note: 'アナフィラキシー・高度徐脈・難治性ショック' },
    { id: 'mil', name: 'ミルリノン (PDE3阻害)', mg: 10, ml: 50, min: 0.25, normalMax: 0.5, limitMax: 0.75, note: '腎排泄型のため腎機能低下時は減量' },
    { id: 'hanp', name: 'カルペリチド (ハンプ)', mg: 1, ml: 50, min: 0.0125, normalMax: 0.05, limitMax: 0.2, note: '急性心不全の血管拡張・利尿作用。低血圧に注意' },
    { id: 'land', name: 'ランジオロール (抗不整脈)', mg: 50, ml: 50, min: 1.0, normalMax: 10.0, limitMax: 40.0, note: '超短時間作用型β1遮断薬。心機能低下例のAF/頻脈には1〜10γから慎重開始' },
    { id: 'nic', name: 'ニカルジピン (降圧)', mg: 50, ml: 50, min: 0.5, normalMax: 6.0, limitMax: 10.0, note: '脳出血急性期等の厳格な降圧管理' },
    { id: 'ntg', name: 'ニトログリセリン (NTG)', mg: 25, ml: 50, min: 0.1, normalMax: 2.0, limitMax: 5.0, note: '冠動脈拡張・前負荷軽減。耐性に注意' },
    { id: 'remi_g', name: 'レミフェンタニル (鎮痛)', mg: 2, ml: 40, min: 0.025, normalMax: 0.2, limitMax: 0.5, note: '超短時間作用型オピオイド。ICU鎮痛はボーラスなしで0.025〜0.1γから開始' },
  ];
  const [selectedGammaId, setSelectedGammaId] = useState('nad');
  const [drugMg, setDrugMg] = useState('5');
  const [solutionMl, setSolutionMl] = useState('50');
  const [flowRate, setFlowRate] = useState('3.0');
  const [targetGammaInput, setTargetGammaInput] = useState('0.08');

  const currentGammaDrug = gammaPresets.find(d => d.id === selectedGammaId) || gammaPresets[0];

  const handleSelectGammaDrug = (drug) => {
    setSelectedGammaId(drug.id);
    setDrugMg(drug.mg.toString());
    setSolutionMl(drug.ml.toString());
    const initGamma = (drug.min + drug.normalMax) / 4;
    const conc = (drug.mg * 1000) / drug.ml;
    const initRate = (initGamma * calcWeight * 60) / conc;
    setFlowRate(initRate.toFixed(1));
    setTargetGammaInput(initGamma.toFixed(3));
  };

  const concentrationUgMl = useMemo(() => {
    const mg = parseFloat(drugMg);
    const ml = parseFloat(solutionMl);
    if (isNaN(mg) || isNaN(ml) || ml <= 0) return 0;
    return (mg * 1000) / ml;
  }, [drugMg, solutionMl]);

  const calculatedGamma = useMemo(() => {
    const rate = parseFloat(flowRate);
    if (isNaN(rate) || concentrationUgMl <= 0 || calcWeight <= 0) return 0;
    return (rate * concentrationUgMl) / (calcWeight * 60);
  }, [flowRate, concentrationUgMl, calcWeight]);

  const calculatedFlowFromGamma = useMemo(() => {
    const g = parseFloat(targetGammaInput);
    if (isNaN(g) || concentrationUgMl <= 0 || calcWeight <= 0) return 0;
    return (g * calcWeight * 60) / concentrationUgMl;
  }, [targetGammaInput, concentrationUgMl, calcWeight]);

  // ==========================================
  // タブ4：γ以外の体重換算投与量 (希釈組成・導入/維持明記)
  // ==========================================
  const weightDrugPresets = [
    {
      id: 'propofol', category: '鎮静', name: 'プロポフォール',
      amountUnit: 'mg', doseUnit: 'mg/kg/h',
      defaultAmount: 500, defaultVol: 50, defaultRate: 6.0, defaultTargetDose: 1.0,
      min: 0.3, max: 3.0, limitMax: 4.0,
      inductionText: '【導入】0.5〜1.5 mg/kg 緩徐静注（ICUでは低血圧回避のため少量分割または省略）',
      maintenanceText: '【維持】0.3〜3.0 mg/kg/h 持続静注（PRIS予防のため 4.0 mg/kg/h 以下を厳守）',
      inductionCalc: (w) => `${(w * 0.5).toFixed(0)} 〜 ${(w * 1.5).toFixed(0)} mg`,
      note: '脂質製剤のため 1.1 kcal/mL のカロリー計算が必要。長期・高用量でPRIS（プロポフォール注入症候群）に注意。'
    },
    {
      id: 'dex', category: '鎮静', name: 'デクスメデトミジン',
      amountUnit: 'µg', doseUnit: 'µg/kg/h',
      defaultAmount: 200, defaultVol: 50, defaultRate: 6.0, defaultTargetDose: 0.4,
      min: 0.2, max: 0.7, limitMax: 1.4,
      inductionText: '【導入】6 µg/kg/h で10分間投与（ICUでは高度徐脈・低血圧リスクのため初期負荷省略が一般的）',
      maintenanceText: '【維持】0.2〜0.7 µg/kg/h 持続静注（挿管中・非挿管鎮静とも呼吸抑制が少ない）',
      inductionCalc: (w) => `初期負荷する場合 ${(w * 6 / 4).toFixed(1)} mL/h (4µg/mL時) × 10分`,
      note: '循環動態不安定例・高度房室ブロックでは初期負荷を必ず省略し 0.2 µg/kg/h から開始。'
    },
    {
      id: 'midazolam', category: '鎮静', name: 'ミダゾラム',
      amountUnit: 'mg', doseUnit: 'mg/kg/h',
      defaultAmount: 50, defaultVol: 50, defaultRate: 3.0, defaultTargetDose: 0.05,
      min: 0.03, max: 0.2, limitMax: 0.3,
      inductionText: '【導入】0.03〜0.1 mg/kg 緩徐静注（呼吸抑制・舌根沈下に注意）',
      maintenanceText: '【維持】0.03〜0.2 mg/kg/h 持続静注（せん妄リスクがあるため長期使用は最小限に）',
      inductionCalc: (w) => `${(w * 0.03).toFixed(1)} 〜 ${(w * 0.1).toFixed(1)} mg`,
      note: '腎不全患者では活性代謝物（1-ヒドロキシミダゾラム）が蓄積し著明な覚醒遅延を起こす。'
    },
    {
      id: 'fentanyl', category: '鎮痛', name: 'フェンタニル',
      amountUnit: 'µg', doseUnit: 'µg/kg/h',
      defaultAmount: 1000, defaultVol: 50, defaultRate: 2.0, defaultTargetDose: 0.8,
      min: 0.5, max: 2.0, limitMax: 4.0,
      inductionText: '【導入】0.5〜2.0 µg/kg 静注（処置前・鎮痛導入時は 25〜100 µg ずつ分割投与）',
      maintenanceText: '【維持】0.5〜2.0 µg/kg/h 持続静注（通常 25〜100 µg/h 程度でタイトレーション）',
      inductionCalc: (w) => `${(w * 0.5).toFixed(0)} 〜 ${(w * 2.0).toFixed(0)} µg`,
      note: '肝代謝だが長時間持続投与すると脂肪組織への蓄積により半減期が延長する。'
    },
    {
      id: 'remifentanil', category: '鎮痛', name: 'レミフェンタニル',
      amountUnit: 'µg', doseUnit: 'µg/kg/min',
      defaultAmount: 2000, defaultVol: 40, defaultRate: 3.0, defaultTargetDose: 0.05,
      min: 0.025, max: 0.2, limitMax: 0.5,
      inductionText: '【導入】ICU鎮痛では原則ボーラス省略（筋硬直・高度徐脈・低血圧回避）。挿管時のみ 0.5〜1.0 µg/kg を30秒以上かけ静注',
      maintenanceText: '【維持】0.025〜0.2 µg/kg/min（= 1.5〜12 µg/kg/h）持続静注',
      inductionCalc: (w) => `挿管時のみ ${(w * 0.5).toFixed(0)} 〜 ${(w * 1.0).toFixed(0)} µg (ICU鎮痛はボーラスなし)`,
      note: '血液・組織中の非特異的エステラーゼで代謝されるため肝腎機能に依存せず覚醒が極めて速い。中止後の痛覚過敏・急な疼痛再燃に注意。'
    },
    {
      id: 'ketamine', category: '鎮痛・鎮静', name: 'ケタミン',
      amountUnit: 'mg', doseUnit: 'mg/kg/h',
      defaultAmount: 200, defaultVol: 40, defaultRate: 3.0, defaultTargetDose: 0.2,
      min: 0.1, max: 0.5, limitMax: 1.5,
      inductionText: '【導入】0.5〜2.0 mg/kg 静注（ショック患者のRSI麻酔導入や気管支痙攣重積時）',
      maintenanceText: '【維持】0.1〜0.5 mg/kg/h 持続静注（オピオイド節減・難治性疼痛・喘息重積時）',
      inductionCalc: (w) => `${(w * 0.5).toFixed(0)} 〜 ${(w * 2.0).toFixed(0)} mg`,
      note: '交感神経刺激作用により血圧・心拍数を維持し気管支を拡張する。悪夢・せん妄防止にベンゾジアゼピン少量併用を考慮。'
    },
    {
      id: 'rocuronium', category: '筋弛緩', name: 'ロクロニウム',
      amountUnit: 'µg', doseUnit: 'µg/kg/min',
      defaultAmount: 500000, defaultVol: 50, defaultRate: 3.0, defaultTargetDose: 8.0,
      min: 5.0, max: 12.0, limitMax: 15.0,
      inductionText: '【導入】気管挿管時 0.6〜1.0 mg/kg 急速静注（RSI時は 1.0〜1.2 mg/kg）',
      maintenanceText: '【維持】5.0〜12.0 µg/kg/min（= 0.3〜0.7 mg/kg/h）持続静注（TOFモニタリング推奨）',
      inductionCalc: (w) => `挿管時 ${(w * 0.6).toFixed(0)} 〜 ${(w * 1.0).toFixed(0)} mg`,
      note: '投与中は必ず十分な鎮静・鎮痛を行い、角膜乾燥予防（点眼・閉眼）とDVT予防を徹底する。'
    },
    {
      id: 'amiodarone', category: '抗不整脈', name: 'アミオダロン',
      amountUnit: 'mg', doseUnit: 'mg/kg/h',
      defaultAmount: 750, defaultVol: 50, defaultRate: 3.3, defaultTargetDose: 0.8,
      min: 0.3, max: 1.0, limitMax: 1.5,
      inductionText: '【導入】CPA時300mg静注。血行動態安定VT/AF時は 125mg/10分静注後、50mg/h(約0.8mg/kg/h)で6時間初期負荷',
      maintenanceText: '【維持】初期負荷終了後 25mg/h（600mg/日、約0.3〜0.5mg/kg/h）で持続維持',
      inductionCalc: () => `CPA時 300mg / 初期負荷 125mg(10分) → 50mg/h(6時間)`,
      note: '中心静脈ラインからの投与を推奨（末梢静脈炎リスク）。QT延長・徐脈・肺障害に注意。'
    },
    {
      id: 'lidocaine', category: '抗不整脈', name: 'リドカイン',
      amountUnit: 'mg', doseUnit: 'mg/kg/h',
      defaultAmount: 1000, defaultVol: 50, defaultRate: 6.0, defaultTargetDose: 1.5,
      min: 1.0, max: 3.0, limitMax: 4.0,
      inductionText: '【導入】1.0〜1.5 mg/kg 緩徐静注（効果不十分時は5〜10分毎に0.5〜0.75mg/kg追加、総量3mg/kgまで）',
      maintenanceText: '【維持】1.0〜4.0 mg/min（= 約 1.0〜3.0 mg/kg/h）持続静注',
      inductionCalc: (w) => `${(w * 1.0).toFixed(0)} 〜 ${(w * 1.5).toFixed(0)} mg`,
      note: '心室性不整脈（VT/VF）に使用。肝血流低下・心不全・高齢者ではクリアランス低下のため維持量を半減。'
    },
    {
      id: 'digoxin', category: '強心・抗不整脈', name: 'ジゴキシン',
      amountUnit: 'µg', doseUnit: 'µg/kg/日',
      defaultAmount: 250, defaultVol: 1, defaultRate: 0.5, defaultTargetDose: 2.0,
      min: 1.5, max: 4.0, limitMax: 6.0,
      inductionText: '【導入(急速飽和)】初回 250〜500 µg (0.25〜0.5mg) 緩徐静注、以降4〜6時間毎に 125〜250 µg（総飽和量 750〜1250 µg）',
      maintenanceText: '【維持】125〜250 µg/日 (0.125〜0.25mg/日、目安 1.5〜4.0 µg/kg/日) 1日1回静注または内服',
      inductionCalc: () => `初回 0.25〜0.5 mg 静注（腎機能低下時は半減）`,
      note: '腎排泄型のため腎機能低下時は維持量を減量（0.0625〜0.125mg/日）。低K血症・低Mg血症でジギタリス中毒リスク急増。'
    },
    {
      id: 'furosemide', category: '利尿薬', name: 'フロセミド (持続)',
      amountUnit: 'mg', doseUnit: 'mg/kg/h',
      defaultAmount: 200, defaultVol: 50, defaultRate: 2.5, defaultTargetDose: 0.15,
      min: 0.05, max: 0.4, limitMax: 0.8,
      inductionText: '【導入(ボーラス)】10〜40 mg 静注（利尿薬未使用例は10〜20mgから、長期内服例は普段の1回量以上を静注）',
      maintenanceText: '【維持(持続)】0.05〜0.4 mg/kg/h（通常 2〜20 mg/h で目標尿量に合わせて調整）',
      inductionCalc: () => `10 〜 40 mg 静注（持続開始前にボーラス投与を併用すると立ち上がりが早い）`,
      note: '持続静注は間欠投与に比べ血中濃度が安定し電解質異常や聴器毒性を軽減できる。低K・低Mg血症に注意。'
    },
    {
      id: 'heparin', category: '抗凝固', name: '未分画ヘパリン',
      amountUnit: '単位', doseUnit: '単位/kg/h',
      defaultAmount: 10000, defaultVol: 50, defaultRate: 4.0, defaultTargetDose: 12.0,
      min: 10.0, max: 18.0, limitMax: 25.0,
      inductionText: '【導入】VTE/ACS時 50〜80 単位/kg 静注（最大5000単位目安、出血リスク時は省略）',
      maintenanceText: '【維持】10〜18 単位/kg/h 持続静注（APTT 1.5〜2.5倍目標で調整）',
      inductionCalc: (w) => `${Math.round(w * 50)} 〜 ${Math.round(w * 80)} 単位`,
      note: '投与開始5〜10日目の血小板急減時はHIT（ヘパリン起因性血小板減少症）を疑う。'
    },
  ];

  const [selectedWeightDrugId, setSelectedWeightDrugId] = useState('propofol');
  const [wDrugAmount, setWDrugAmount] = useState('500');
  const [wDrugTotalVol, setWDrugTotalVol] = useState('50');
  const [wDrugCurrentRate, setWDrugCurrentRate] = useState('6.0');
  const [wDrugTargetDose, setWDrugTargetDose] = useState('1.0');

  const currentWeightDrug = weightDrugPresets.find(d => d.id === selectedWeightDrugId) || weightDrugPresets[0];

  const handleSelectWeightDrug = (drug) => {
    setSelectedWeightDrugId(drug.id);
    setWDrugAmount(drug.defaultAmount.toString());
    setWDrugTotalVol(drug.defaultVol.toString());
    setWDrugCurrentRate(drug.defaultRate.toString());
    setWDrugTargetDose(drug.defaultTargetDose.toString());
  };

  // 体重換算薬剤の双方向計算
  const weightDrugCalc = useMemo(() => {
    const amt = parseFloat(wDrugAmount);
    const vol = parseFloat(wDrugTotalVol);
    const currRate = parseFloat(wDrugCurrentRate);
    const targDose = parseFloat(wDrugTargetDose);

    if (isNaN(amt) || isNaN(vol) || vol <= 0 || calcWeight <= 0) {
      return { conc: 0, currentWeightDose: 0, currentHourlyTotal: 0, requiredRate: 0, targetHourlyTotal: 0 };
    }

    const conc = amt / vol;
    const isPerMin = currentWeightDrug.doseUnit.includes('/min');
    const isPerDay = currentWeightDrug.doseUnit.includes('/日');

    const currentHourlyTotal = !isNaN(currRate) ? currRate * conc : 0;
    let currentWeightDose = 0;
    if (isPerMin) {
      currentWeightDose = currentHourlyTotal / (calcWeight * 60);
    } else if (isPerDay) {
      currentWeightDose = (currentHourlyTotal * 24) / calcWeight;
    } else {
      currentWeightDose = currentHourlyTotal / calcWeight;
    }

    let targetHourlyTotal = 0;
    if (!isNaN(targDose)) {
      if (isPerMin) {
        targetHourlyTotal = targDose * calcWeight * 60;
      } else if (isPerDay) {
        targetHourlyTotal = (targDose * calcWeight) / 24;
      } else {
        targetHourlyTotal = targDose * calcWeight;
      }
    }
    const requiredRate = conc > 0 ? targetHourlyTotal / conc : 0;

    return { conc, currentWeightDose, currentHourlyTotal, requiredRate, targetHourlyTotal };
  }, [wDrugAmount, wDrugTotalVol, wDrugCurrentRate, wDrugTargetDose, calcWeight, currentWeightDrug]);

  // ==========================================
  // タブ5：ABG評価 ＆ スチュアート法 (Stewart Approach)
  // ==========================================
  const [abgPh, setAbgPh] = useState('7.32');
  const [abgPaco2, setAbgPaco2] = useState('36');
  const [abgHco3, setAbgHco3] = useState('18.0');
  const [abgNa, setAbgNa] = useState('140');
  const [abgK, setAbgK] = useState('4.2');
  const [abgCl, setAbgCl] = useState('112');
  const [abgIca, setAbgIca] = useState('1.15'); // mmol/L
  const [abgMg, setAbgMg] = useState('2.0');    // mg/dL
  const [abgLac, setAbgLac] = useState('2.5');  // mmol/L
  const [abgAlb, setAbgAlb] = useState('2.2');  // g/dL
  const [abgPi, setAbgPi] = useState('3.5');    // mg/dL

  const stewartData = useMemo(() => {
    const ph = parseFloat(abgPh) || 7.40;
    const paco2 = parseFloat(abgPaco2) || 40;
    const hco3 = parseFloat(abgHco3) || 24;
    const na = parseFloat(abgNa) || 140;
    const k = parseFloat(abgK) || 4.0;
    const cl = parseFloat(abgCl) || 104;
    const ica = parseFloat(abgIca) || 1.15;
    const mg = parseFloat(abgMg) || 2.0;
    const lac = parseFloat(abgLac) || 1.0;
    const alb = parseFloat(abgAlb) || 4.0;
    const pi = parseFloat(abgPi) || 3.5;

    const caMeq = ica * 2;
    const mgMeq = mg * 0.823;

    // 1. SIDa (見かけの強イオン差)
    const sida = (na + k + caMeq + mgMeq) - (cl + lac);
    const sidaSimple = (na + k) - (cl + lac);

    // 2. Atot (弱酸による総陰イオン荷電: Figge式)
    const albGL = alb * 10;
    const piMmol = pi * 0.3229;
    const albCharge = albGL * (0.123 * ph - 0.631);
    const piCharge = piMmol * (0.309 * ph - 0.469);
    const atot = albCharge + piCharge;

    // 3. SIDe (有効強イオン差)
    const side = hco3 + atot;

    // 4. SIG (強イオンギャップ = SIDa - SIDe)
    const sig = sida - side;

    // 5. 従来のAG と 補正AG (cAG)
    const ag = na - (cl + hco3);
    const cag = ag + 2.5 * (4.0 - alb);

    // 6. Wintersの式 (代謝性アシドーシス時の予測PaCO2)
    const expectedPaco2Low = 1.5 * hco3 + 8 - 2;
    const expectedPaco2High = 1.5 * hco3 + 8 + 2;

    const findings = [];
    if (ph < 7.35) {
      findings.push({ type: 'warn', text: `アシデミア (pH ${ph.toFixed(2)} < 7.35) を認めます。` });
    } else if (ph > 7.45) {
      findings.push({ type: 'info', text: `アルカレミア (pH ${ph.toFixed(2)} > 7.45) を認めます。` });
    } else {
      findings.push({ type: 'ok', text: `pH (${ph.toFixed(2)}) は正常範囲内ですが、混合性酸塩基平衡異常の隠蔽に注意してください。` });
    }

    if (paco2 > 45) {
      findings.push({ type: 'warn', text: `呼吸性アシドーシス (PaCO₂ ${paco2} > 45 mmHg)：換気量不足・死腔増大の評価が必要です。` });
    } else if (paco2 < 35) {
      if (hco3 < 22 && paco2 >= expectedPaco2Low && paco2 <= expectedPaco2High) {
        findings.push({ type: 'ok', text: `代謝性アシドーシスに対する適切な呼吸性代償です (Winters予測範囲: ${expectedPaco2Low.toFixed(0)}〜${expectedPaco2High.toFixed(0)} mmHg)。` });
      } else if (hco3 < 22 && paco2 < expectedPaco2Low) {
        findings.push({ type: 'warn', text: `呼吸性アルカローシスの合併 (PaCO₂ ${paco2} < Winters予測下限 ${expectedPaco2Low.toFixed(0)})：敗血症・疼痛・低酸素等を検索。` });
      } else {
        findings.push({ type: 'info', text: `呼吸性アルカローシス (PaCO₂ ${paco2} < 35 mmHg)：過換気の背景評価が必要です。` });
      }
    }

    if (sida < 38) {
      findings.push({ type: 'warn', text: `【SIDa低下: ${sida.toFixed(1)} mEq/L (<38)】強イオン差縮小による代謝性アシドーシス（生食大量投与による高Cl血症、下痢、RTA等）。` });
    } else if (sida > 42) {
      findings.push({ type: 'info', text: `【SIDa上昇: ${sida.toFixed(1)} mEq/L (>42)】強イオン差拡大による代謝性アルカローシス（利尿薬による低Cl血症、嘔吐・胃液喪失等）。` });
    }

    if (alb < 3.5) {
      findings.push({ type: 'info', text: `【低アルブミン血症性アルカローシス (Alb ${alb} g/dL, Atot ${atot.toFixed(1)} mEq/L)】弱酸減少によりアルカローシス方向に偏位し、併存するアシドーシスをマスクしています。` });
    }

    if (sig > 2.0) {
      findings.push({ type: 'danger', text: `【SIG上昇: +${sig.toFixed(1)} mEq/L (>2.0)】未測定陰イオン（ケトン体、尿毒症物質、サリチル酸、アルコール/グリコール代謝物等）の蓄積による代謝性アシドーシスが存在します！` });
    }

    if (lac >= 2.0) {
      findings.push({ type: 'danger', text: `【高乳酸血症 (Lac ${lac} mmol/L)】組織低灌流・酸素需給バランス破綻・薬剤性(アドレナリン/メトホルミン等)を評価してください。` });
    }

    return {
      sida, sidaSimple, side, sig, atot, albCharge, piCharge, ag, cag,
      expectedPaco2Low, expectedPaco2High, findings
    };
  }, [abgPh, abgPaco2, abgHco3, abgNa, abgK, abgCl, abgIca, abgMg, abgLac, abgAlb, abgPi]);

  // ==========================================
  // タブ6：栄養・水分管理 (製剤プリセット・アミパレン等アミノ酸補充・IN/OUT)
  // ==========================================
  const enFormulas = [
    { id: 'std10', name: '標準半消化態 (1.0 kcal/mL：ラコール/エンシュア等)', kcal: 1.0, pro: 4.0, fat: 2.8, carb: 14.5, water: 85 },
    { id: 'high15', name: '高濃度流動食 (1.5 kcal/mL：エンシュアH/アイソカルPlus等)', kcal: 1.5, pro: 5.5, fat: 4.8, carb: 21.0, water: 78 },
    { id: 'high20', name: '超高濃度流動食 (2.0 kcal/mL：テルミール2.0α/ハイネックス等)', kcal: 2.0, pro: 7.2, fat: 6.7, carb: 27.5, water: 70 },
    { id: 'pep10', name: '高蛋白・ペプチド (1.0 kcal/mL：ペプタメンAF/ツインライン等)', kcal: 1.0, pro: 6.0, fat: 3.5, carb: 11.0, water: 84 },
    { id: 'renal16', name: '腎不全用流動食 (1.6 kcal/mL：リーナレンMP/レナウェルA等)', kcal: 1.6, pro: 3.5, fat: 5.5, carb: 24.0, water: 75 },
    { id: 'dm10', name: '耐糖能異常・DM用 (1.0 kcal/mL：グルセルナ-REX/インスロー等)', kcal: 1.0, pro: 4.2, fat: 4.5, carb: 10.5, water: 85 },
    { id: 'none', name: '経管栄養なし (絶食)', kcal: 0, pro: 0, fat: 0, carb: 0, water: 0 },
  ];

  const tpnFormulas = [
    { id: 'elneopa1', name: 'エルネオパNF 1号 (1000mL: 560kcal / 糖120g / アミノ20g)', bagVol: 1000, kcalBag: 560, gluBag: 120, aminoBag: 20 },
    { id: 'elneopa2', name: 'エルネオパNF 2号 (1000mL: 820kcal / 糖175g / アミノ30g)', bagVol: 1000, kcalBag: 820, gluBag: 175, aminoBag: 30 },
    { id: 'neoparen1', name: 'ネオパレン 1号 (1000mL: 560kcal / 糖120g / アミノ20g)', bagVol: 1000, kcalBag: 560, gluBag: 120, aminoBag: 20 },
    { id: 'neoparen2', name: 'ネオパレン 2号 (1000mL: 820kcal / 糖175g / アミノ30g)', bagVol: 1000, kcalBag: 820, gluBag: 175, aminoBag: 30 },
    { id: 'fulcaliq1', name: 'フルカリック 1号 (903mL: 560kcal / 糖120g / アミノ20g)', bagVol: 903, kcalBag: 560, gluBag: 120, aminoBag: 20 },
    { id: 'fulcaliq2', name: 'フルカリック 2号 (1003mL: 820kcal / 糖175g / アミノ30g)', bagVol: 1003, kcalBag: 820, gluBag: 175, aminoBag: 30 },
    { id: 'fulcaliq3', name: 'フルカリック 3号 (1103mL: 1160kcal / 糖250g / アミノ40g)', bagVol: 1103, kcalBag: 1160, gluBag: 250, aminoBag: 40 },
    { id: 'bfleed', name: 'ビーフリード (500mL: 210kcal / 糖37.5g / アミノ15g / PPN)', bagVol: 500, kcalBag: 210, gluBag: 37.5, aminoBag: 15 },
    { id: 'none', name: '静脈栄養製剤なし (TPN/PPNなし)', bagVol: 1000, kcalBag: 0, gluBag: 0, aminoBag: 0 },
  ];

  const aminoFormulas = [
    { id: 'amiparen', name: 'アミパレン輸液 (10%アミノ酸：100mLあたり 蛋白10.0g / 40kcal)', pro100: 10.0, glu100: 0, kcal100: 40, water100: 90 },
    { id: 'moripron', name: 'モリプロンF輸液 (10%アミノ酸：100mLあたり 蛋白10.0g / 40kcal)', pro100: 10.0, glu100: 0, kcal100: 40, water100: 90 },
    { id: 'plusamino', name: 'プラスアミノ輸液 (10%アミノ酸+糖：100mLあたり 蛋白10.0g / 糖7.5g / 70kcal)', pro100: 10.0, glu100: 7.5, kcal100: 70, water100: 85 },
    { id: 'aminoleban', name: 'アミノレバン点滴静注 (肝不全用 8%：100mLあたり 蛋白8.0g / 32kcal)', pro100: 8.0, glu100: 0, kcal100: 32, water100: 92 },
    { id: 'kidmin', name: 'キドミン輸液 (腎不全用 7.2%：100mLあたり 蛋白7.2g / 29kcal)', pro100: 7.2, glu100: 0, kcal100: 29, water100: 93 },
    { id: 'none', name: 'アミノ酸単味製剤の補充なし', pro100: 0, glu100: 0, kcal100: 0, water100: 0 },
  ];

  const [targetKcalPerKg, setTargetKcalPerKg] = useState('25');
  const [targetProPerKg, setTargetProPerKg] = useState('1.3');
  const [targetWaterPerKg, setTargetWaterPerKg] = useState('30');

  const [selectedEnId, setSelectedEnId] = useState('std10');
  const [enKcalPerMl, setEnKcalPerMl] = useState('1.0');
  const [enProPer100Ml, setEnProPer100Ml] = useState('4.0');
  const [enFatPer100Ml, setEnFatPer100Ml] = useState('2.8');
  const [enCarbPer100Ml, setEnCarbPer100Ml] = useState('14.5');
  const [enWaterPer100Ml, setEnWaterPer100Ml] = useState('85');
  const [enVolumeMl, setEnVolumeMl] = useState('600');

  const [selectedTpnId, setSelectedTpnId] = useState('elneopa2');
  const [tpnVolumeMl, setTpnVolumeMl] = useState('1000');
  const [selectedAminoId, setSelectedAminoId] = useState('amiparen');
  const [aminoVolumeMl, setAminoVolumeMl] = useState('200');
  const [tpnLipidMl, setTpnLipidMl] = useState('250');
  const [propofolMlDay, setPropofolMlDay] = useState('0');
  const [otherFluidMl, setOtherFluidMl] = useState('500');

  const [urineMlDay, setUrineMlDay] = useState('1500');
  const [drainMlDay, setDrainMlDay] = useState('200');
  const [bodyTemp, setBodyTemp] = useState('37.0');

  const handleSelectEnFormula = (id) => {
    setSelectedEnId(id);
    const f = enFormulas.find(item => item.id === id);
    if (f) {
      setEnKcalPerMl(f.kcal.toString());
      setEnProPer100Ml(f.pro.toString());
      setEnFatPer100Ml(f.fat.toString());
      setEnCarbPer100Ml(f.carb.toString());
      setEnWaterPer100Ml(f.water.toString());
      if (id === 'none') setEnVolumeMl('0');
      else if (parseFloat(enVolumeMl) === 0) setEnVolumeMl('600');
    }
  };

  const handleSelectTpnFormula = (id) => {
    setSelectedTpnId(id);
    const f = tpnFormulas.find(item => item.id === id);
    if (f) {
      if (id === 'none') setTpnVolumeMl('0');
      else setTpnVolumeMl(f.bagVol.toString());
    }
  };

  const handleSelectAminoFormula = (id) => {
    setSelectedAminoId(id);
    if (id === 'none') setAminoVolumeMl('0');
    else if (parseFloat(aminoVolumeMl) === 0) setAminoVolumeMl('200');
  };

  const nutritionAndFluid = useMemo(() => {
    const w = calcWeight;
    const goalKcal = w * (parseFloat(targetKcalPerKg) || 0);
    const goalPro = w * (parseFloat(targetProPerKg) || 0);
    const goalWater = w * (parseFloat(targetWaterPerKg) || 0);

    const enVol = parseFloat(enVolumeMl) || 0;
    const enKcal = enVol * (parseFloat(enKcalPerMl) || 0);
    const enPro = (enVol / 100) * (parseFloat(enProPer100Ml) || 0);
    const enFat = (enVol / 100) * (parseFloat(enFatPer100Ml) || 0);
    const enCarb = (enVol / 100) * (parseFloat(enCarbPer100Ml) || 0);
    const enWater = (enVol / 100) * (parseFloat(enWaterPer100Ml) || 0);

    const tpnFormula = tpnFormulas.find(f => f.id === selectedTpnId) || tpnFormulas[0];
    const tpnVol = parseFloat(tpnVolumeMl) || 0;
    const tpnRatio = tpnFormula.bagVol > 0 ? tpnVol / tpnFormula.bagVol : 0;
    const gluG = tpnFormula.gluBag * tpnRatio;
    const amiG = tpnFormula.aminoBag * tpnRatio;
    const tpnKcalBase = tpnFormula.kcalBag * tpnRatio;

    const aminoFormula = aminoFormulas.find(f => f.id === selectedAminoId) || aminoFormulas[0];
    const aminoVol = parseFloat(aminoVolumeMl) || 0;
    const suppAminoPro = (aminoVol / 100) * aminoFormula.pro100;
    const suppAminoGlu = (aminoVol / 100) * aminoFormula.glu100;
    const suppAminoKcal = (aminoVol / 100) * aminoFormula.kcal100;
    const suppAminoWater = (aminoVol / 100) * aminoFormula.water100;

    const lipMl = parseFloat(tpnLipidMl) || 0;
    const propMl = parseFloat(propofolMlDay) || 0;
    const otherMl = parseFloat(otherFluidMl) || 0;

    const totalKcal = enKcal + tpnKcalBase + suppAminoKcal + (lipMl * 2) + (propMl * 1.1);
    const totalPro = enPro + amiG + suppAminoPro;
    const totalFat = enFat + (lipMl * 0.2) + (propMl * 0.1);
    const totalCarb = enCarb + gluG + suppAminoGlu;

    const pKcal = totalPro * 4;
    const fKcal = totalFat * 9;
    const cKcal = totalCarb * 4;
    const pfcSum = pKcal + fKcal + cKcal || 1;
    const pRatio = Math.round((pKcal / pfcSum) * 100);
    const fRatio = Math.round((fKcal / pfcSum) * 100);
    const cRatio = Math.max(0, 100 - pRatio - fRatio);

    const nonProteinKcal = fKcal + cKcal;
    const nitrogen = totalPro / 6.25;
    const npcN = nitrogen > 0 ? Math.round(nonProteinKcal / nitrogen) : 0;

    const totalFluidIn = enWater + tpnVol + suppAminoWater + (lipMl * 0.8) + (propMl * 0.85) + otherMl;
    const temp = parseFloat(bodyTemp) || 37.0;
    const feverFactor = temp > 37.0 ? 1 + (temp - 37.0) * 0.15 : 1.0;
    const insensibleLoss = Math.round(patientData.actualWeight * 15 * feverFactor);
    const totalFluidOut = (parseFloat(urineMlDay) || 0) + (parseFloat(drainMlDay) || 0) + insensibleLoss;
    const fluidBalance = Math.round(totalFluidIn - totalFluidOut);

    return {
      goalKcal, goalPro, goalWater,
      totalKcal, totalPro, suppAminoPro,
      kcalPerKgActual: w > 0 ? totalKcal / w : 0,
      proPerKgActual: w > 0 ? totalPro / w : 0,
      pRatio, fRatio, cRatio, npcN,
      totalFluidIn: Math.round(totalFluidIn),
      waterPerKgActual: w > 0 ? totalFluidIn / w : 0,
      insensibleLoss,
      totalFluidOut: Math.round(totalFluidOut),
      fluidBalance
    };
  }, [
    calcWeight, patientData.actualWeight, targetKcalPerKg, targetProPerKg, targetWaterPerKg,
    enKcalPerMl, enProPer100Ml, enFatPer100Ml, enCarbPer100Ml, enWaterPer100Ml, enVolumeMl,
    selectedTpnId, tpnVolumeMl, selectedAminoId, aminoVolumeMl, tpnLipidMl, propofolMlDay, otherFluidMl,
    urineMlDay, drainMlDay, bodyTemp
  ]);

  // ==========================================
  // タブ7：循環動態・PV Loop シミュレーター
  // ==========================================
  const [sbp, setSbp] = useState('95');
  const [dbp, setDbp] = useState('55');
  const [hr, setHr] = useState('105');
  const [cvp, setCvp] = useState('6');
  const [lvef, setLvef] = useState('45');
  const [lvotVti, setLvotVti] = useState('16');
  const [lvotDiam, setLvotDiam] = useState('2.0');
  const [lactate, setLactate] = useState('2.4');

  const hemoData = useMemo(() => {
    const s = parseFloat(sbp) || 100;
    const d = parseFloat(dbp) || 60;
    const h = parseFloat(hr) || 80;
    const c = parseFloat(cvp) || 5;
    const ef = parseFloat(lvef) || 55;
    const vti = parseFloat(lvotVti) || 18;
    const diam = parseFloat(lvotDiam) || 2.0;

    const map = Math.round(d + (s - d) / 3);
    const shockIndex = s > 0 ? (h / s).toFixed(2) : '--';
    const sv = Math.round(Math.PI * Math.pow(diam / 2, 2) * vti);
    const co = ((sv * h) / 1000).toFixed(2);
    const svr = parseFloat(co) > 0 ? Math.round(((map - c) * 80) / parseFloat(co)) : 0;

    let profile = '';
    let actionHint = '';
    if (map < 65 && svr < 800) {
      profile = '血液分布異常性ショック傾向 (血管拡張・後負荷低下)';
      actionHint = 'ノルアドレナリン等の血管収縮薬によるSVR維持を優先。過度な輸液負荷に注意。';
    } else if (ef < 40 && sv < 50) {
      profile = '心原性ショック・収縮力低下傾向 (低心拍出量)';
      actionHint = 'ドブタミン等の強心薬検討。前負荷過剰(うっ血)がある場合は利尿・血管拡張を検討。';
    } else if (cvp < 5 && vti < 15) {
      profile = '循環血液量減少傾向 (前負荷不足)';
      actionHint = '輸液反応性(PLR等)を確認のうえ、細胞外液のボーラス投与を検討。';
    } else if (svr > 1400 && map > 90) {
      profile = '後負荷増大傾向 (血管収縮・高血圧)';
      actionHint = '後負荷不整合(Afterload mismatch)によるSV低下に注意。血管拡張薬を検討。';
    } else {
      profile = '循環動態は比較的代償・維持されています';
      actionHint = '乳酸値トレンドと尿量・末梢循環を継続モニタリングしてください。';
    }

    const edvScale = Math.min(1.4, Math.max(0.6, (cvp / 8) * 0.4 + (100 - ef) / 100 + 0.5));
    const svScale = Math.min(1.4, Math.max(0.4, sv / 65));
    const xEdv = Math.min(270, Math.max(130, 140 + edvScale * 65));
    const xEsv = Math.max(55, xEdv - svScale * 75);
    const yBottom = 240;
    const yEdp = Math.max(195, 232 - c * 2.2);
    const ySbp = Math.max(35, 240 - s * 1.15);
    const yEes = Math.max(25, ySbp - 12);

    return {
      map, shockIndex, sv, co, svr, profile, actionHint,
      svg: { xEdv, xEsv, yBottom, yEdp, ySbp, yEes }
    };
  }, [sbp, dbp, hr, cvp, lvef, lvotVti, lvotDiam]);

  // ==========================================
  // タブ8：By-System チェックリスト & KDIGO AKI評価
  // ==========================================
  const [akiBaseCr, setAkiBaseCr] = useState('0.8');
  const [akiCurrCr, setAkiCurrCr] = useState('1.4');
  const [akiUrineRate, setAkiUrineRate] = useState('0.4');

  const akiStageResult = useMemo(() => {
    const base = parseFloat(akiBaseCr) || 0.8;
    const curr = parseFloat(akiCurrCr) || 0.8;
    const uo = parseFloat(akiUrineRate);

    const ratio = base > 0 ? curr / base : 1;
    const diff = curr - base;

    let stage = 0;
    let reason = 'AKI基準に該当せず';
    let color = 'text-emerald-400 bg-emerald-950/40 border-emerald-700';

    if (ratio >= 3.0 || curr >= 4.0 || (!isNaN(uo) && uo < 0.3)) {
      stage = 3;
      reason = 'Cr ≧3.0倍 / Cr ≧4.0 / 尿量 <0.3mL/kg/h のいずれかに該当';
      color = 'text-rose-400 bg-rose-950/50 border-rose-600';
    } else if (ratio >= 2.0 || (!isNaN(uo) && uo < 0.5)) {
      stage = 2;
      reason = 'Cr 2.0〜2.9倍 または 尿量 <0.5mL/kg/h (12時間以上) に該当';
      color = 'text-amber-400 bg-amber-950/40 border-amber-600';
    } else if (ratio >= 1.5 || diff >= 0.3) {
      stage = 1;
      reason = 'Cr 1.5〜1.9倍 または +0.3mg/dL以上上昇に該当';
      color = 'text-yellow-300 bg-yellow-950/40 border-yellow-600';
    }

    return { stage, ratio: ratio.toFixed(2), diff: diff.toFixed(2), reason, color };
  }, [akiBaseCr, akiCurrCr, akiUrineRate]);

  const initialChecklist = [
    {
      system: '① 神経・PADIS (Pain, Agitation, Delirium, Immobility, Sleep)',
      color: 'text-purple-400',
      items: [
        { id: 'padis_p', text: '【Pain】BPS / CPOT による疼痛評価と鎮痛優先 (Analgesia-first)', checked: false },
        { id: 'padis_a', text: '【Agitation/Sedation】RASS目標値設定・過鎮静回避・SAT (自発覚醒トライアル)', checked: false },
        { id: 'padis_d', text: '【Delirium】CAM-ICU / ICDSC によるせん妄評価と誘因除去', checked: false },
        { id: 'padis_i', text: '【Immobility】早期離床・ICUリハビリテーション (IMSレベル評価)', checked: false },
        { id: 'padis_s', text: '【Sleep】概日リズム維持 (夜間消灯・騒音軽減・不要な夜間処置回避)', checked: false },
      ]
    },
    {
      system: '② 循環・不整脈関連',
      color: 'text-rose-400',
      items: [
        { id: 'cvs1', text: 'MAP ≧ 65 mmHg の維持・昇圧剤の漸減評価', checked: false },
        { id: 'cvs_arr1', text: '【不整脈】新規心房細動 (NOAF)・VPC/VTの有無とトリガー評価 (虚血・カテコラミン過多)', checked: false },
        { id: 'cvs_arr2', text: '【QTc】12誘導/モニターでのQT延長 (QTc > 450〜500ms) と原因薬剤確認', checked: false },
        { id: 'cvs_arr3', text: '【電解質目標】不整脈予防のため K ≧ 4.0 mEq/L, Mg ≧ 2.0 mg/dL 維持', checked: false },
        { id: 'cvs2', text: '末梢循環 (CRT)・乳酸値トレンド・輸液反応性評価', checked: false },
      ]
    },
    {
      system: '③ 呼吸器',
      color: 'text-teal-400',
      items: [
        { id: 'resp1', text: '肺保護換気: Vt 4〜8 mL/kg (PBW) ＆ プラトー圧 < 30 ＆ 駆動圧 < 15', checked: false },
        { id: 'resp2', text: 'SBT (自発呼吸トライアル) 実施基準評価と抜管・カフリーク確認', checked: false },
        { id: 'resp3', text: '適切な加温加湿・気道分泌物クリアランス', checked: false },
      ]
    },
    {
      system: '④ 腎・AKI評価・体液管理',
      color: 'text-blue-400',
      items: [
        { id: 'ren_aki', text: '【AKI評価】KDIGO基準 (血清Cr推移・尿量 mL/kg/h) によるステージ判定と腎代替療法(CRRT)検討', checked: false },
        { id: 'ren_bal', text: '累積水分バランス (IN/OUT) 確認と血管内脱水/うっ血の是正', checked: false },
        { id: 'ren_tox', text: '腎機能 (eGFR/CCr) に応じた抗菌薬・抗凝固薬等の用量調整、腎毒性薬回避', checked: false },
      ]
    },
    {
      system: '⑤ 消化器・栄養',
      color: 'text-orange-400',
      items: [
        { id: 'gi1', text: '入室24〜48時間以内の早期経腸栄養開始と目標エネルギー/蛋白達成度 (アミノ酸補充検討)', checked: false },
        { id: 'gi2', text: '胃残量・嘔吐・下痢・排便コントロール (ICU便秘プロトコル)', checked: false },
        { id: 'gi3', text: '肝胆道系酵素・ビリルビン推移および胆嚢炎 (無石胆嚢炎) 否定', checked: false },
      ]
    },
    {
      system: '⑥ 血液・凝固',
      color: 'text-red-400',
      items: [
        { id: 'heme1', text: '【輸血閾値】Hb目標 (原則 ≧ 7.0 g/dL, 心疾患/急性冠症候群は 8〜9 g/dL)、Plt/FFP適応評価', checked: false },
        { id: 'heme2', text: '【凝固/DIC】急性期DICスコア (血小板減少・PT-INR延長・FDP/Dダイマー上昇) の評価', checked: false },
        { id: 'heme3', text: '穿刺部・消化管等の出血徴候およびHIT (ヘパリン起因性血小板減少症) の否定', checked: false },
      ]
    },
    {
      system: '⑦ 内分泌・代謝',
      color: 'text-amber-400',
      items: [
        { id: 'endo1', text: '【血糖管理】目標 140〜180 mg/dL 維持と医原性低血糖 (< 70 mg/dL) の回避', checked: false },
        { id: 'endo2', text: '【ステロイド】難治性敗血症性ショックでのヒドロコルチゾン適応・長期内服例の副腎不全予防', checked: false },
        { id: 'endo3', text: '【Refeeding】栄養再開時の P・K・Mg 低下モニタリングとビタミンB1投与', checked: false },
      ]
    },
    {
      system: '⑧ 予防バンドル (Prophylaxis)',
      color: 'text-emerald-400',
      items: [
        { id: 'prev_vap', text: '【VAP予防】ヘッドアップ 30〜45度・口腔ケア・カフ圧適正維持 (20〜30 cmH₂O)', checked: false },
        { id: 'prev_dvt', text: '【DVT予防】弾性ストッキング・IPC (間欠的空気圧迫法)・抗凝固薬予防投与', checked: false },
        { id: 'prev_ulcer', text: '【潰瘍予防】人工呼吸 >48h や凝固障害等の適応評価と不要時PPI中止', checked: false },
        { id: 'prev_crbsi', text: '【CRBSI/ライン】刺入部発赤確認と不要カテーテル (CVC, Aライン, 尿道カテ) の早期抜去', checked: false },
        { id: 'prev_skin', text: '【褥瘡・角膜保護】体位変換・除圧マット、深鎮静/筋弛緩時の閉眼・点眼保護', checked: false },
      ]
    }
  ];
  const [checklist, setChecklist] = useState(initialChecklist);

  const toggleCheckItem = (sysIdx, itemId) => {
    setChecklist(prev => prev.map((sys, idx) => {
      if (idx !== sysIdx) return sys;
      return {
        ...sys,
        items: sys.items.map(item => item.id === itemId ? { ...item, checked: !item.checked } : item)
      };
    }));
  };

  const resetChecklist = () => setChecklist(initialChecklist);

  const checklistProgress = useMemo(() => {
    let total = 0;
    let done = 0;
    checklist.forEach(s => s.items.forEach(i => {
      total++;
      if (i.checked) done++;
    }));
    return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [checklist]);

  // ご指定の並び順：人工呼吸器 → 呼吸トレンド → 薬剤 → ABG → 栄養 → 循環 → By-System
  const tabs = [
    { id: 'vent', label: '人工呼吸器', icon: Wind },
    { id: 'lungTrend', label: '呼吸トレンド', icon: TrendingUp },
    { id: 'gamma', label: '薬剤(γ計算)', icon: Syringe },
    { id: 'weightDrug', label: '薬剤(体重換算)', icon: Pill },
    { id: 'abgStewart', label: 'ABG・スチュアート法', icon: Calculator },
    { id: 'nutrition', label: '栄養・水分管理', icon: Utensils },
    { id: 'pvLoop', label: '循環・PV Loop', icon: HeartPulse },
    { id: 'checklist', label: 'By-System', icon: ClipboardCheck },
  ];

  // 基準体重セレクター共通UI
  const WeightBasisSelector = () => (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-slate-400 font-bold mr-1">基準体重:</span>
      {[
        { id: 'actual', label: `実体重 (${patientData.actualWeight}kg)` },
        { id: 'ibw', label: `理想体重 (${patientData.ibw.toFixed(1)}kg)` },
        { id: 'pbw', label: `予測体重 (${patientData.pbw.toFixed(1)}kg)` },
        { id: 'abw', label: `調整体重 (${patientData.abw.toFixed(1)}kg)` },
      ].map(b => (
        <button key={b.id} onClick={() => setWeightBasis(b.id)}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
            weightBasis === b.id ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}>
          {b.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 md:p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-5">
        
        {/* ヘッダー＆共通患者バー */}
        <header className="bg-slate-900 p-4 md:p-5 rounded-2xl shadow-lg border border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
                <Activity size={26} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">ICU 総合臨床シミュレーター</h1>
                <p className="text-slate-400 text-xs">人工呼吸器・呼吸トレンド・薬剤・ABG(スチュアート法)・栄養水分・循環・By-System 統合ツール</p>
              </div>
            </div>

            {/* 共通患者ステータス入力バー */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div className="flex rounded-lg overflow-hidden border border-slate-700">
                <button onClick={() => setGender('male')}
                  className={`px-2.5 py-1.5 text-xs font-bold ${gender === 'male' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>男性</button>
                <button onClick={() => setGender('female')}
                  className={`px-2.5 py-1.5 text-xs font-bold ${gender === 'female' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400'}`}>女性</button>
              </div>
              <div className="flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400 font-bold">身長</span>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                  className="w-12 bg-transparent text-white font-bold text-sm text-right outline-none" />
                <span className="text-xs text-slate-400">cm</span>
              </div>
              <div className="flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400 font-bold">実体重</span>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                  className="w-12 bg-transparent text-white font-bold text-sm text-right outline-none" />
                <span className="text-xs text-slate-400">kg</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 text-xs">
                <div><span className="text-slate-400">理想(IBW):</span> <span className="font-black text-emerald-400 text-sm">{patientData.ibw.toFixed(1)}</span>kg</div>
                <div><span className="text-slate-400">予測(PBW):</span> <span className="font-black text-blue-400 text-sm">{patientData.pbw.toFixed(1)}</span>kg</div>
                <div><span className="text-slate-400">調整(ABW):</span> <span className="font-black text-purple-400 text-sm">{patientData.abw.toFixed(1)}</span>kg</div>
                <div><span className="text-slate-400">BMI:</span> <span className="font-black text-slate-200 text-sm">{patientData.bmi.toFixed(1)}</span></div>
              </div>
            </div>
          </div>

          {/* ナビゲーションタブ */}
          <nav className="flex overflow-x-auto pb-1 gap-1.5 no-scrollbar">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-950/60' 
                      : 'bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* ==============================================================
            TAB 1: 人工呼吸器設定
           ============================================================== */}
        {activeTab === 'vent' && (
          <div className="space-y-6">
            <section className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 border-b border-slate-800 pb-3 gap-2">
                <h2 className="text-lg font-bold flex items-center text-slate-100">
                  <Wind size={20} className="mr-2 text-teal-400" />
                  ① 換気設定 (1回換気量・呼吸回数・分時換気量の相互連動)
                </h2>
                <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                  ※ 1項目を変更すると他項目が自動再計算されます
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/50">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-200">1回換気量 (Vt)</label>
                    <span className="text-[11px] text-teal-300 bg-teal-900/60 px-2 py-0.5 rounded">変更→RR/MV連動</span>
                  </div>
                  <div className="relative">
                    <input type="number" value={vt} onChange={handleVtChange}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-2xl font-black text-white pr-12 outline-none focus:ring-2 focus:ring-teal-500" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">mL</span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-teal-300 flex justify-between">
                    <span>PBW換算 (目安 4〜8):</span>
                    <span>{parseFloat(vt) ? (parseFloat(vt) / patientData.pbw).toFixed(1) : '--'} mL/kg</span>
                  </div>
                </div>

                <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/50">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-200">呼吸回数 (RR)</label>
                    <span className="text-[11px] text-teal-300 bg-teal-900/60 px-2 py-0.5 rounded">変更→MV連動</span>
                  </div>
                  <div className="relative">
                    <input type="number" value={rr} onChange={handleRrChange}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-2xl font-black text-white pr-16 outline-none focus:ring-2 focus:ring-teal-500" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">回/分</span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-400 flex justify-between">
                    <span>推奨初期目安:</span>
                    <span>{parseFloat(vt) > 0 ? Math.round(patientData.targetMv / parseFloat(vt)) : '--'} 回/分</span>
                  </div>
                </div>
                
                <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-800/50">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-blue-200">分時換気量 (MV)</label>
                    <span className="text-[11px] text-blue-300 bg-blue-900/60 px-2 py-0.5 rounded">変更→RR連動</span>
                  </div>
                  <div className="relative">
                    <input type="number" step="0.1" value={mv} onChange={handleMvChange}
                      className="w-full px-4 py-3 bg-slate-800 border border-blue-800/70 rounded-lg text-2xl font-black text-blue-300 pr-16 outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400/70 font-bold">L/分</span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-blue-300 flex justify-between">
                    <span>目標 (実体重×100):</span>
                    <span>{(patientData.targetMv / 1000).toFixed(2)} L/分</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col">
                <h2 className="text-lg font-bold mb-4 flex items-center text-slate-100 border-b border-slate-800 pb-3">
                  <Droplet size={20} className="mr-2 text-indigo-400" />
                  酸素化とFiO2漸減
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">現行 PaO2 (Torr)</label>
                    <input type="number" value={pao2} onChange={(e) => setPao2(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg font-bold text-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">現行 FiO2 (%)</label>
                    <input type="number" value={currentFio2} onChange={(e) => setCurrentFio2(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg font-bold text-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-indigo-950/40 rounded-xl border border-indigo-800/50 mb-4">
                  <span className="text-sm font-bold text-indigo-200">P/F 比 (Ratio)</span>
                  <span className="text-3xl font-black text-indigo-400">{pfData ? pfData.ratio : '--'}</span>
                </div>
                <div className="mt-auto bg-slate-800/60 border border-slate-700 p-4 rounded-xl text-sm font-bold text-slate-300">
                  目標PaO₂ (60〜100Torr) を維持するためのFiO₂は
                  <span className="text-lg font-black text-indigo-400 mx-1">{pfData ? pfData.lower : '--'}%</span>〜
                  <span className="text-lg font-black text-indigo-400 mx-1">{pfData ? pfData.upper : '--'}%</span>
                  まで漸減可能です。
                </div>
              </section>

              <section className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col">
                <h2 className="text-lg font-bold mb-4 flex items-center text-slate-100 border-b border-slate-800 pb-3">
                  <Activity size={20} className="mr-2 text-rose-400" />
                  PEEP 設定 (ARDSNet)
                </h2>
                <div className="mb-5">
                  <label className="block text-sm font-bold text-slate-300 mb-2">評価用 FiO2 (%)</label>
                  <select value={tableFio2} onChange={(e) => setTableFio2(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-lg text-lg font-bold outline-none focus:ring-2 focus:ring-rose-500">
                    {[30,40,50,60,70,80,90,100].map(v => <option key={v} value={v}>{v}% ({(v/100).toFixed(1)})</option>)}
                  </select>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center p-3 bg-rose-950/30 rounded-lg border border-rose-800/50">
                    <span className="text-sm font-bold text-rose-200">Low PEEP Table</span>
                    <span className="text-xl font-black text-rose-400">{getLowPeep(tableFio2)} <span className="text-xs">cmH₂O</span></span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-rose-950/30 rounded-lg border border-rose-800/50">
                    <span className="text-sm font-bold text-rose-200">High PEEP Table</span>
                    <span className="text-xl font-black text-rose-400">{getHighPeep(tableFio2)} <span className="text-xs">cmH₂O</span></span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-800/70 rounded-lg border border-slate-700">
                    <span className="text-sm font-bold text-slate-300">肥満考慮 PEEP (BMI÷3)</span>
                    <span className="text-xl font-black text-white">{Math.round(patientData.bmi / 3)} <span className="text-xs text-slate-400">cmH₂O</span></span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 2: 人工呼吸器トレンドと肺メカニクス解析
           ============================================================== */}
        {activeTab === 'lungTrend' && (
          <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-4 gap-3">
              <div>
                <h2 className="text-lg font-bold flex items-center text-white">
                  <TrendingUp size={20} className="mr-2 text-cyan-400" />
                  ② 人工呼吸器トレンド＆肺メカニクス・イラスト可視化
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">換気モードと気道内圧・換気量トレンドから現在の肺の状態を図解します</p>
              </div>

              {/* 換気モード切り替え */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 font-bold mr-1">モード:</span>
                {Object.keys(ventModeInfos).map(m => (
                  <button key={m} onClick={() => setVentMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                      ventMode === m 
                        ? 'bg-cyan-600 text-white shadow shadow-cyan-950' 
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* 選択モードの臨床ポイントバー */}
            <div className="bg-cyan-950/30 border border-cyan-800/60 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-extrabold text-cyan-300 mr-2">【{ventModeInfos[ventMode].name}】</span>
                <span className="text-slate-200">{ventModeInfos[ventMode].focus}</span>
              </div>
              <span className="text-[11px] font-bold text-cyan-200 bg-slate-900/80 px-2.5 py-1 rounded border border-cyan-800/50 whitespace-nowrap">
                {ventModeInfos[ventMode].keyMetric}
              </span>
            </div>

            {/* 上段：パラメータ入力 ＋ リアルタイム肺イラスト */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 左カラム：前回＆現在トレンド入力 (7カラム) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 space-y-3">
                  <h3 className="text-sm font-bold text-slate-400">1. 前回評価時 (比較ベースライン)</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Pplat (プラトー圧)</label>
                      <input type="number" value={prevPplat} onChange={(e) => setPrevPplat(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">PEEP</label>
                      <input type="number" value={prevPeep} onChange={(e) => setPrevPeep(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">1回換気量 Vt (mL)</label>
                      <input type="number" value={prevVt} onChange={(e) => setPrevVt(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold" />
                    </div>
                  </div>
                </div>

                <div className="bg-cyan-950/20 p-4 rounded-xl border border-cyan-800/50 space-y-3">
                  <h3 className="text-sm font-bold text-cyan-300">2. 現在の実測値 ({ventMode} 稼働中)</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Ppeak (最高気道圧)</label>
                      <input type="number" value={currPpeak} onChange={(e) => setCurrPpeak(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {['PCV', 'PRVC', 'PSV'].includes(ventMode) ? 'Pplat / 吸気終末圧' : 'Pplat (プラトー圧)'}
                      </label>
                      <input type="number" value={currPplat} onChange={(e) => setCurrPplat(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-cyan-700/60 rounded-lg text-white font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">PEEP</label>
                      <input type="number" value={currPeep} onChange={(e) => setCurrPeep(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">実測 Vt (mL)</label>
                      <input type="number" value={currVt} onChange={(e) => setCurrVt(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">呼吸回数 RR (回/分)</label>
                      <input type="number" value={currRr} onChange={(e) => setCurrRr(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold" />
                    </div>
                    <div className="flex flex-col justify-center bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700">
                      <span className="text-[10px] text-slate-400">PBWあたり換気量</span>
                      <span className={`text-sm font-black ${lungMechanics.vtPerPbw > 8 ? 'text-rose-400' : 'text-teal-300'}`}>
                        {lungMechanics.vtPerPbw.toFixed(1)} mL/kg
                      </span>
                    </div>
                  </div>
                </div>

                {/* 数値サマリーカード */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400">駆動圧 ΔP (&lt;15)</span>
                    <div className="flex items-baseline space-x-1.5 mt-1">
                      <span className="text-xs text-slate-500">{lungMechanics.dpPrev}→</span>
                      <span className={`text-2xl font-black ${lungMechanics.dpCurr >= 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {lungMechanics.dpCurr}
                      </span>
                      <span className="text-[10px] text-slate-400">cmH₂O</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400">Cstat (50〜80)</span>
                    <div className="flex items-baseline space-x-1.5 mt-1">
                      <span className="text-xs text-slate-500">{lungMechanics.cstatPrev.toFixed(0)}→</span>
                      <span className={`text-2xl font-black ${lungMechanics.cstatCurr < 35 ? 'text-amber-400' : 'text-cyan-400'}`}>
                        {lungMechanics.cstatCurr.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400">気道圧差 (Ppeak-plat)</span>
                    <div className="flex items-baseline space-x-1.5 mt-1">
                      <span className={`text-2xl font-black ${lungMechanics.isHighResistance ? 'text-yellow-400' : 'text-white'}`}>
                        {lungMechanics.resistiveDiff}
                      </span>
                      <span className="text-[10px] text-slate-400">cmH₂O</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400">
                      {ventMode === 'PSV' || ventMode === 'SIMV' ? 'RSBI (目標<105)' : 'Mech Power (<17)'}
                    </span>
                    <div className="flex items-baseline space-x-1.5 mt-1">
                      {ventMode === 'PSV' || ventMode === 'SIMV' ? (
                        <span className={`text-2xl font-black ${lungMechanics.rsbi >= 105 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {lungMechanics.rsbi}
                        </span>
                      ) : (
                        <>
                          <span className={`text-2xl font-black ${lungMechanics.mp >= 17 ? 'text-amber-400' : 'text-white'}`}>
                            {lungMechanics.mp.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400">J/m</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 右カラム：現在の肺＆気道内圧リアルタイムイラスト図 (5カラム) */}
              <div className="lg:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-300">🫁 現在の肺・気道状態 イメージ図</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    lungMechanics.isOverdistended ? 'bg-rose-950 text-rose-300 border border-rose-700' :
                    lungMechanics.isStiffLung ? 'bg-amber-950 text-amber-300 border border-amber-700' :
                    lungMechanics.isHighResistance ? 'bg-yellow-950 text-yellow-300 border border-yellow-700' :
                    'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  }`}>
                    {lungMechanics.visualTag}
                  </span>
                </div>

                {(() => {
                  const clampP = (val) => Math.min(40, Math.max(0, val));
                  const pToY = (val) => 235 - (clampP(val) / 40) * 200;
                  const yPeep = pToY(lungMechanics.peep2);
                  const yPlat = pToY(lungMechanics.pPlat2);
                  const yPeak = pToY(lungMechanics.pPeak2);
                  const yLimit30 = pToY(30);

                  const lungScale = lungMechanics.isOverdistended ? 1.12 : lungMechanics.isStiffLung ? 0.86 : 1.0;
                  const lungFill = lungMechanics.isOverdistended
                    ? 'rgba(244, 63, 94, 0.25)'
                    : lungMechanics.isStiffLung
                    ? 'rgba(245, 158, 11, 0.22)'
                    : 'rgba(20, 184, 166, 0.24)';
                  const lungStroke = lungMechanics.isOverdistended
                    ? '#fb7185'
                    : lungMechanics.isStiffLung
                    ? '#fbbf24'
                    : '#2dd4bf';

                  return (
                    <svg viewBox="0 0 360 275" className="w-full max-w-md h-auto">
                      {/* 左側：気道内圧ゲージ */}
                      <text x="12" y="20" fill="#94a3b8" fontSize="9" fontWeight="bold">気道内圧 (cmH₂O)</text>
                      <rect x="26" y="35" width="24" height="200" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                      
                      {/* 30 cmH2O 安全上限ライン */}
                      <line x1="18" y1={yLimit30} x2="62" y2={yLimit30} stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="3 2" />
                      <text x="6" y={yLimit30 + 3} fill="#fb7185" fontSize="8" fontWeight="bold">30</text>
                      <text x="10" y="238" fill="#64748b" fontSize="8">0</text>

                      {/* PEEP 領域 */}
                      <rect x="27" y={yPeep} width="22" height={Math.max(0, 235 - yPeep)} fill="#0284c7" opacity="0.85" />
                      {/* 駆動圧 ΔP (PEEP〜Pplat) 領域 */}
                      <rect x="27" y={yPlat} width="22" height={Math.max(0, yPeep - yPlat)}
                        fill={lungMechanics.dpCurr >= 15 ? '#e11d48' : '#10b981'} opacity="0.9" />
                      {/* 抵抗圧差 (Pplat〜Ppeak) 領域 */}
                      <rect x="27" y={yPeak} width="22" height={Math.max(0, yPlat - yPeak)}
                        fill={lungMechanics.isHighResistance ? '#f59e0b' : '#38bdf8'} opacity="0.9" />

                      {/* 圧力ラベル */}
                      <text x="54" y={Math.min(234, yPeep + 3)} fill="#38bdf8" fontSize="8.5" fontWeight="bold">
                        PEEP {lungMechanics.peep2}
                      </text>
                      <text x="54" y={Math.max(42, yPlat + 3)} fill={lungMechanics.dpCurr >= 15 ? '#fda4af' : '#6ee7b7'} fontSize="8.5" fontWeight="bold">
                        Pplat {lungMechanics.pPlat2} (ΔP:{lungMechanics.dpCurr})
                      </text>
                      {lungMechanics.resistiveDiff > 0 && (
                        <text x="54" y={Math.max(30, yPeak - 2)} fill="#fde047" fontSize="8.5" fontWeight="bold">
                          Ppeak {lungMechanics.pPeak2}
                        </text>
                      )}

                      {/* 右側：気管・気管支＋左右肺イラスト */}
                      <g transform={`translate(225, 135) scale(${lungScale}) translate(-225, -135)`}>
                        {/* 右肺 (画面向かって左) */}
                        <path
                          d="M 212 72 C 185 68, 152 105, 145 162 C 142 188, 155 202, 182 198 C 198 195, 210 185, 212 170 Z"
                          fill={lungFill}
                          stroke={lungStroke}
                          strokeWidth="2.5"
                        />
                        {/* 左肺 (画面向かって右) */}
                        <path
                          d="M 238 72 C 265 68, 298 105, 305 162 C 308 188, 295 202, 268 198 C 252 195, 240 185, 238 170 Z"
                          fill={lungFill}
                          stroke={lungStroke}
                          strokeWidth="2.5"
                        />

                        {/* 硬い肺（ARDS/間質陰影）の網目表現 */}
                        {lungMechanics.isStiffLung && (
                          <g stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 3" opacity="0.65">
                            <line x1="158" y1="115" x2="205" y2="145" />
                            <line x1="152" y1="145" x2="205" y2="175" />
                            <line x1="292" y1="115" x2="245" y2="145" />
                            <line x1="298" y1="145" x2="245" y2="175" />
                          </g>
                        )}

                        {/* 背側無気肺（PEEP不足 or コンプライアンス低下時の肺底部虚脱表現） */}
                        {(lungMechanics.isLowPeepAtelectasis || lungMechanics.isStiffLung) && (
                          <g fill="#1e293b" opacity="0.85">
                            <path d="M 146 172 Q 178 168 208 176 C 202 194, 160 202, 146 172 Z" />
                            <path d="M 304 172 Q 272 168 242 176 C 248 194, 290 202, 304 172 Z" />
                            <text x="163" y="188" fill="#94a3b8" fontSize="7.5" fontWeight="bold">無気肺/虚脱</text>
                            <text x="253" y="188" fill="#94a3b8" fontSize="7.5" fontWeight="bold">無気肺/虚脱</text>
                          </g>
                        )}

                        {/* 過膨張ストレス破線 (ΔP >= 15 または Pplat >= 30) */}
                        {lungMechanics.isOverdistended && (
                          <g stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 3" fill="none">
                            <path d="M 210 64 C 178 60, 142 100, 136 164 C 133 196, 152 210, 184 205" />
                            <path d="M 240 64 C 272 60, 308 100, 314 164 C 317 196, 298 210, 266 205" />
                            <text x="186" y="218" fill="#fb7185" fontSize="8.5" fontWeight="bold">⚠️ 肺胞過膨張ストレス</text>
                          </g>
                        )}
                      </g>

                      {/* 気管・主気管支 */}
                      <path
                        d="M 219 25 L 219 88 L 192 118 M 231 25 L 231 88 L 258 118"
                        fill="none"
                        stroke={lungMechanics.isHighResistance ? '#facc15' : '#38bdf8'}
                        strokeWidth={lungMechanics.isHighResistance ? '4.5' : '3'}
                        strokeLinecap="round"
                      />
                      {/* 気道抵抗上昇時の分泌物・狭窄ハイライト */}
                      {lungMechanics.isHighResistance && (
                        <g>
                          <circle cx="225" cy="70" r="4.5" fill="#facc15" />
                          <circle cx="206" cy="103" r="3.5" fill="#facc15" />
                          <circle cx="244" cy="103" r="3.5" fill="#facc15" />
                          <rect x="242" y="42" width="98" height="18" rx="4" fill="#422006" stroke="#eab308" strokeWidth="1" />
                          <text x="248" y="54" fill="#fef08a" fontSize="8" fontWeight="bold">気道抵抗↑ (痰/攣縮)</text>
                        </g>
                      )}

                      {/* 下部サマリー凡例 */}
                      <rect x="95" y="244" width="250" height="24" rx="6" fill="#0f172a" stroke="#1e293b" />
                      <text x="105" y="259" fill="#cbd5e1" fontSize="8.5" fontWeight="bold">
                        Cstat: {lungMechanics.cstatCurr.toFixed(1)} mL/cmH₂O ｜ ΔP: {lungMechanics.dpCurr} cmH₂O ｜ Vt: {currVt} mL
                      </text>
                    </svg>
                  );
                })()}
              </div>
            </div>

            {/* 自動診断・臨床アクションコメント */}
            <div className={`p-5 rounded-xl border ${lungMechanics.statusColor} space-y-1.5`}>
              <div className="text-base font-extrabold">{lungMechanics.statusTitle}</div>
              <p className="text-sm text-slate-200 leading-relaxed">{lungMechanics.statusDesc}</p>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 3: 薬剤別 γ (ガンマ) 計算と許容投与量
           ============================================================== */}
        {activeTab === 'gamma' && (
          <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-4 gap-3">
              <h2 className="text-lg font-bold flex items-center text-white">
                <Syringe size={20} className="mr-2 text-rose-400" />
                ③ 薬剤別 γ (ガンマ: µg/kg/min) 計算＆許容投与量
              </h2>
              <WeightBasisSelector />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {gammaPresets.map(drug => (
                <button key={drug.id} onClick={() => handleSelectGammaDrug(drug)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    selectedGammaId === drug.id 
                      ? 'bg-rose-950/50 border-rose-500 text-white' 
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}>
                  <div className="text-xs font-bold truncate">{drug.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{drug.mg}mg / {drug.ml}mL</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-3">
                <h3 className="text-sm font-bold text-slate-300">1. 希釈組成 (濃度: {concentrationUgMl.toFixed(0)} µg/mL)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">薬剤量 (mg)</label>
                    <input type="number" value={drugMg} onChange={(e) => setDrugMg(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">総液量 (mL)</label>
                    <input type="number" value={solutionMl} onChange={(e) => setSolutionMl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold" />
                  </div>
                </div>
              </div>

              <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-800/50 space-y-3">
                <h3 className="text-sm font-bold text-rose-300">2. 現在の速度から γ を算出</h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">現在の投与速度 (mL/h)</label>
                  <input type="number" step="0.1" value={flowRate} onChange={(e) => setFlowRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-rose-700/60 rounded-lg text-xl font-black text-white" />
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-xs text-slate-400">現在投与量:</span>
                  <span className="text-2xl font-black text-rose-400">{calculatedGamma.toFixed(3)} <span className="text-xs">γ</span></span>
                </div>
              </div>

              <div className="bg-blue-950/20 p-4 rounded-xl border border-blue-800/50 space-y-3">
                <h3 className="text-sm font-bold text-blue-300">3. 目標 γ から必要速度を逆算</h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">目標投与量 (γ = µg/kg/min)</label>
                  <input type="number" step="0.01" value={targetGammaInput} onChange={(e) => setTargetGammaInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-blue-700/60 rounded-lg text-xl font-black text-white" />
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-xs text-slate-400">必要投与速度:</span>
                  <span className="text-2xl font-black text-blue-400">{calculatedFlowFromGamma.toFixed(2)} <span className="text-xs">mL/h</span></span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/70 p-5 rounded-xl border border-slate-700 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <span className="text-sm font-bold text-white">{currentGammaDrug.name} の投与量レンジ評価</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  calculatedGamma > currentGammaDrug.limitMax ? 'bg-rose-600 text-white' :
                  calculatedGamma > currentGammaDrug.normalMax ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {calculatedGamma > currentGammaDrug.limitMax ? '⚠️ 許容上限超過' :
                   calculatedGamma > currentGammaDrug.normalMax ? '🟠 高用量域 (他剤併用・副作用注意)' : '✅ 常用投与量域'}
                </span>
              </div>

              <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden flex border border-slate-700">
                <div style={{ width: `${Math.min(100, (calculatedGamma / currentGammaDrug.limitMax) * 100)}%` }}
                  className={`h-full transition-all ${
                    calculatedGamma > currentGammaDrug.limitMax ? 'bg-rose-500' :
                    calculatedGamma > currentGammaDrug.normalMax ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-semibold">
                <span>開始目安: {currentGammaDrug.min} γ</span>
                <span>常用上限: {currentGammaDrug.normalMax} γ</span>
                <span>最大許容目安: {currentGammaDrug.limitMax} γ</span>
              </div>
              <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                💡 {currentGammaDrug.note}
              </p>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 4: γ以外の体重換算投与量 (希釈組成・現在速度逆算・導入/維持明記)
           ============================================================== */}
        {activeTab === 'weightDrug' && (
          <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-4 gap-3">
              <h2 className="text-lg font-bold flex items-center text-white">
                <Pill size={20} className="mr-2 text-amber-400" />
                ④ 体重換算薬剤の投与量・速度計算 (導入／維持用量明記)
              </h2>
              <WeightBasisSelector />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {weightDrugPresets.map(drug => (
                <button key={drug.id} onClick={() => handleSelectWeightDrug(drug)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    selectedWeightDrugId === drug.id 
                      ? 'bg-amber-950/50 border-amber-500 text-white' 
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-bold">{drug.category}</span>
                    <span className="text-[10px] text-slate-400">{drug.doseUnit}</span>
                  </div>
                  <div className="text-xs md:text-sm font-bold mt-1 truncate">{drug.name}</div>
                </button>
              ))}
            </div>

            <div className="bg-slate-800/80 p-4 rounded-xl border border-amber-700/40 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80 pb-2">
                <span className="text-sm font-extrabold text-amber-300">{currentWeightDrug.name}：導入（負荷）と維持の投与基準</span>
                <span className="text-xs font-bold bg-amber-950 text-amber-200 px-2.5 py-1 rounded border border-amber-700/60">
                  対象体重 ({calcWeight.toFixed(1)}kg) での導入目安: {currentWeightDrug.inductionCalc(calcWeight)}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-700/80">
                  <div className="font-bold text-rose-300 mb-1">導入（ボーラス / 初期負荷）</div>
                  <div className="text-slate-200 leading-relaxed">{currentWeightDrug.inductionText}</div>
                </div>
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-700/80">
                  <div className="font-bold text-emerald-300 mb-1">維持（持続投与）</div>
                  <div className="text-slate-200 leading-relaxed">{currentWeightDrug.maintenanceText}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-3">
                <h3 className="text-sm font-bold text-slate-300">
                  1. 希釈組成 (濃度: {weightDrugCalc.conc.toFixed(2)} {currentWeightDrug.amountUnit}/mL)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">薬剤量 ({currentWeightDrug.amountUnit})</label>
                    <input type="number" value={wDrugAmount} onChange={(e) => setWDrugAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">総液量 (mL)</label>
                    <input type="number" value={wDrugTotalVol} onChange={(e) => setWDrugTotalVol(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold" />
                  </div>
                </div>
              </div>

              <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-700/60 space-y-3">
                <h3 className="text-sm font-bold text-amber-300">2. 現在の投与速度から投与量を算出</h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">現在の投与速度 (mL/h)</label>
                  <input type="number" step="0.1" value={wDrugCurrentRate} onChange={(e) => setWDrugCurrentRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-amber-700/60 rounded-lg text-xl font-black text-white" />
                </div>
                <div className="pt-1 space-y-0.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">現在投与量:</span>
                    <span className="text-2xl font-black text-amber-400">
                      {weightDrugCalc.currentWeightDose.toFixed(2)} <span className="text-xs">{currentWeightDrug.doseUnit}</span>
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    (時間総量: {weightDrugCalc.currentHourlyTotal.toFixed(1)} {currentWeightDrug.amountUnit}/h)
                  </div>
                </div>
              </div>

              <div className="bg-blue-950/20 p-4 rounded-xl border border-blue-800/50 space-y-3">
                <h3 className="text-sm font-bold text-blue-300">3. 目標投与量から必要速度を逆算</h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">目標維持量 ({currentWeightDrug.doseUnit})</label>
                  <input type="number" step="0.05" value={wDrugTargetDose} onChange={(e) => setWDrugTargetDose(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-blue-700/60 rounded-lg text-xl font-black text-white" />
                </div>
                <div className="pt-1 space-y-0.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">必要投与速度:</span>
                    <span className="text-2xl font-black text-blue-400">
                      {weightDrugCalc.requiredRate.toFixed(2)} <span className="text-xs">mL/h</span>
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    (維持常用域: {currentWeightDrug.min}〜{currentWeightDrug.max} {currentWeightDrug.doseUnit})
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700 text-xs text-slate-300">
              💡 <span className="font-bold text-white">臨床注意点：</span> {currentWeightDrug.note}
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 5: ABG評価 ＆ スチュアート法 (Stewart Approach)
           ============================================================== */}
        {activeTab === 'abgStewart' && (
          <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold flex items-center text-white">
                <Calculator size={20} className="mr-2 text-indigo-400" />
                ⑤ ABG ＆ スチュアート法 (Stewart Approach) 物理化学的酸塩基平衡解析
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                従来のAG法では見逃される「低アルブミン血症による隠れアシドーシス」や「高Cl性(SIDa低下)・未測定陰イオン(SIG上昇)」を定量評価します
              </p>
            </div>

            {/* 入力グリッド */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. 血液ガス */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
                <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">1. 血液ガス (ABG)</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">pH (7.35-7.45)</label>
                    <input type="number" step="0.01" value={abgPh} onChange={(e) => setAbgPh(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">PaCO₂ (35-45)</label>
                    <input type="number" step="1" value={abgPaco2} onChange={(e) => setAbgPaco2(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">HCO₃⁻ (22-26)</label>
                    <input type="number" step="0.5" value={abgHco3} onChange={(e) => setAbgHco3(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Lactate (mmol/L)</label>
                    <input type="number" step="0.1" value={abgLac} onChange={(e) => setAbgLac(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-rose-700/60 rounded text-rose-300 font-bold" />
                  </div>
                </div>
              </div>

              {/* 2. 強イオン (Strong Ions) */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
                <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider">2. 強イオン (Strong Ions)</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Na (mEq/L)</label>
                    <input type="number" value={abgNa} onChange={(e) => setAbgNa(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold text-sm" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">K (mEq/L)</label>
                    <input type="number" step="0.1" value={abgK} onChange={(e) => setAbgK(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold text-sm" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Cl (mEq/L)</label>
                    <input type="number" value={abgCl} onChange={(e) => setAbgCl(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-teal-700/60 rounded text-teal-200 font-bold text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">iCa²⁺ (mmol/L)</label>
                    <input type="number" step="0.05" value={abgIca} onChange={(e) => setAbgIca(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold text-sm" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Mg (mg/dL)</label>
                    <input type="number" step="0.1" value={abgMg} onChange={(e) => setAbgMg(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold text-sm" />
                  </div>
                </div>
              </div>

              {/* 3. 不揮発性弱酸 (Atot: Alb・Pi) */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">3. 弱酸 (Atot: Alb・リン)</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Alb (g/dL)</label>
                    <input type="number" step="0.1" value={abgAlb} onChange={(e) => setAbgAlb(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-amber-700/60 rounded text-amber-200 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">無機リン Pi (mg/dL)</label>
                    <input type="number" step="0.1" value={abgPi} onChange={(e) => setAbgPi(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 bg-slate-900/70 p-2 rounded border border-slate-800">
                  Alb荷電: <span className="text-slate-200 font-bold">{stewartData.albCharge.toFixed(1)}</span> mEq/L ／
                  Pi荷電: <span className="text-slate-200 font-bold">{stewartData.piCharge.toFixed(1)}</span> mEq/L
                </div>
              </div>
            </div>

            {/* スチュアート法 算出結果カード */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <div className="text-[11px] text-slate-400 font-bold">SIDa (正常 38〜42)</div>
                <div className={`text-2xl font-black mt-0.5 ${
                  stewartData.sida < 38 ? 'text-rose-400' : stewartData.sida > 42 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {stewartData.sida.toFixed(1)} <span className="text-xs font-normal text-slate-400">mEq/L</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">簡易SIDa: {stewartData.sidaSimple.toFixed(1)}</div>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <div className="text-[11px] text-slate-400 font-bold">SIDe (有効強イオン差)</div>
                <div className="text-2xl font-black text-blue-400 mt-0.5">
                  {stewartData.side.toFixed(1)} <span className="text-xs font-normal text-slate-400">mEq/L</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">HCO₃⁻ + Atot</div>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-indigo-700/60">
                <div className="text-[11px] text-indigo-300 font-bold">SIG (正常 0〜2.0)</div>
                <div className={`text-2xl font-black mt-0.5 ${stewartData.sig > 2.0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {stewartData.sig >= 0 ? `+${stewartData.sig.toFixed(1)}` : stewartData.sig.toFixed(1)} <span className="text-xs font-normal text-slate-400">mEq/L</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">未測定陰イオン指標</div>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <div className="text-[11px] text-slate-400 font-bold">Atot (弱酸総陰イオン)</div>
                <div className="text-2xl font-black text-amber-400 mt-0.5">
                  {stewartData.atot.toFixed(1)} <span className="text-xs font-normal text-slate-400">mEq/L</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">正常目安: 13〜16</div>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <div className="text-[11px] text-slate-400 font-bold">補正AG (cAG)</div>
                <div className={`text-2xl font-black mt-0.5 ${stewartData.cag > 14 ? 'text-rose-400' : 'text-white'}`}>
                  {stewartData.cag.toFixed(1)} <span className="text-xs font-normal text-slate-400">mEq/L</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">実測AG: {stewartData.ag.toFixed(1)}</div>
              </div>
            </div>

            {/* 自動臨床診断・病態コメント */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2.5">
              <div className="text-xs font-extrabold text-slate-300">🔍 スチュアート法 ＆ 血液ガス自動解釈レポート</div>
              <div className="space-y-2">
                {stewartData.findings.map((f, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border text-xs font-medium leading-relaxed ${
                    f.type === 'danger' ? 'bg-rose-950/40 border-rose-700/70 text-rose-200' :
                    f.type === 'warn' ? 'bg-amber-950/30 border-amber-700/60 text-amber-200' :
                    f.type === 'info' ? 'bg-blue-950/30 border-blue-700/60 text-blue-200' :
                    'bg-emerald-950/30 border-emerald-700/60 text-emerald-200'
                  }`}>
                    {f.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 6: 栄養・水分管理 (製剤プリセット・アミパレン補充・IN/OUT)
           ============================================================== */}
        {activeTab === 'nutrition' && (
          <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-4 gap-3">
              <h2 className="text-lg font-bold flex items-center text-white">
                <Utensils size={20} className="mr-2 text-orange-400" />
                ⑥ 栄養・水分管理シミュレーター (製剤選択・アミノ酸補充・IN/OUT)
              </h2>
              <WeightBasisSelector />
            </div>

            {/* 1日の目標設定 */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">目標エネルギー (kcal/kg)</label>
                <input type="number" value={targetKcalPerKg} onChange={(e) => setTargetKcalPerKg(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">目標蛋白量 (g/kg)</label>
                <input type="number" step="0.1" value={targetProPerKg} onChange={(e) => setTargetProPerKg(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">目標水分量 (mL/kg)</label>
                <input type="number" value={targetWaterPerKg} onChange={(e) => setTargetWaterPerKg(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
              </div>
              <div className="flex flex-col justify-center bg-slate-900/60 px-3 py-1.5 rounded-lg">
                <span className="text-[11px] text-slate-400">目標エネルギー</span>
                <span className="text-lg font-black text-orange-400">{Math.round(nutritionAndFluid.goalKcal)} kcal</span>
              </div>
              <div className="flex flex-col justify-center bg-slate-900/60 px-3 py-1.5 rounded-lg">
                <span className="text-[11px] text-slate-400">目標蛋白量</span>
                <span className="text-lg font-black text-teal-400">{nutritionAndFluid.goalPro.toFixed(1)} g</span>
              </div>
              <div className="flex flex-col justify-center bg-slate-900/60 px-3 py-1.5 rounded-lg">
                <span className="text-[11px] text-slate-400">目標水分量</span>
                <span className="text-lg font-black text-sky-400">{Math.round(nutritionAndFluid.goalWater)} mL</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 経管栄養 (EN) 製剤選択 */}
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 space-y-3">
                <h3 className="text-sm font-bold text-orange-300">1. 経管栄養 (EN) 製剤選択と投与量</h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">経腸栄養剤を選択</label>
                  <select value={selectedEnId} onChange={(e) => handleSelectEnFormula(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs md:text-sm text-white font-bold">
                    {enFormulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">1日投与量 (mL/日)</label>
                    <input type="number" step="50" value={enVolumeMl} onChange={(e) => setEnVolumeMl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-orange-700/60 rounded-lg text-white font-black text-lg" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">水分含有率 (mL/100mL)</label>
                    <input type="number" value={enWaterPer100Ml} onChange={(e) => setEnWaterPer100Ml(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sky-300 font-bold text-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] text-slate-400">kcal/mL</label>
                    <input type="number" step="0.1" value={enKcalPerMl} onChange={(e) => setEnKcalPerMl(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">蛋白g/100</label>
                    <input type="number" step="0.1" value={enProPer100Ml} onChange={(e) => setEnProPer100Ml(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">脂質g/100</label>
                    <input type="number" step="0.1" value={enFatPer100Ml} onChange={(e) => setEnFatPer100Ml(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">糖質g/100</label>
                    <input type="number" step="0.1" value={enCarbPer100Ml} onChange={(e) => setEnCarbPer100Ml(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-bold" />
                  </div>
                </div>
              </div>

              {/* 静脈栄養 (TPN) ＆ アミパレン等アミノ酸補充 */}
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 space-y-3">
                <h3 className="text-sm font-bold text-blue-300">2. 静脈栄養 (TPN/PPN) ＆ アミノ酸補充 (アミパレン等)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">TPN / PPN 基本製剤</label>
                    <select value={selectedTpnId} onChange={(e) => handleSelectTpnFormula(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-bold">
                      {tpnFormulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">TPN量 (mL/日)</label>
                    <input type="number" step="100" value={tpnVolumeMl} onChange={(e) => setTpnVolumeMl(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-blue-700/60 rounded-lg text-white font-black text-base" />
                  </div>
                </div>

                {/* アミノ酸単味補充 (アミパレン等) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-teal-950/25 p-2.5 rounded-lg border border-teal-800/50">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-teal-300 font-bold mb-1">蛋白上乗せ：アミノ酸製剤補充</label>
                    <select value={selectedAminoId} onChange={(e) => handleSelectAminoFormula(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-teal-700/60 rounded-lg text-xs text-white font-bold">
                      {aminoFormulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-teal-300 font-bold mb-1">補充量 (mL/日)</label>
                    <input type="number" step="100" value={aminoVolumeMl} onChange={(e) => setAminoVolumeMl(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-teal-600 rounded-lg text-teal-300 font-black text-base" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">20%脂肪乳剤 (mL)</label>
                    <input type="number" step="50" value={tpnLipidMl} onChange={(e) => setTpnLipidMl(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-sm" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">プロポフォール (mL)</label>
                    <input type="number" step="10" value={propofolMlDay} onChange={(e) => setPropofolMlDay(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-sm" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">その他輸液/薬剤液</label>
                    <input type="number" step="50" value={otherFluidMl} onChange={(e) => setOtherFluidMl(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sky-300 font-bold text-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. OUT (尿量・排液・体温) 入力バー */}
            <div className="bg-sky-950/20 p-4 rounded-xl border border-sky-800/50 space-y-3">
              <h3 className="text-sm font-bold text-sky-300">3. 水分排泄 (OUT) ＆ 不感蒸泄補正</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">1日尿量 (mL/日)</label>
                  <input type="number" step="50" value={urineMlDay} onChange={(e) => setUrineMlDay(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">ドレーン・胃管・便 (mL/日)</label>
                  <input type="number" step="50" value={drainMlDay} onChange={(e) => setDrainMlDay(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">平均体温 (℃) ※発熱補正</label>
                  <input type="number" step="0.1" value={bodyTemp} onChange={(e) => setBodyTemp(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold" />
                </div>
                <div className="flex flex-col justify-center bg-slate-900/70 px-3 py-1.5 rounded-lg border border-slate-700">
                  <span className="text-[11px] text-slate-400">推定不感蒸泄 (実体重×15+発熱)</span>
                  <span className="text-base font-black text-sky-300">{nutritionAndFluid.insensibleLoss} mL/日</span>
                </div>
              </div>
            </div>

            {/* 総合結果サマリー */}
            <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <span className="text-xs text-slate-400">総投与エネルギー</span>
                  <div className="text-2xl font-black text-orange-400">{Math.round(nutritionAndFluid.totalKcal)} <span className="text-xs">kcal</span></div>
                  <div className="text-xs text-slate-300">({nutritionAndFluid.kcalPerKgActual.toFixed(1)} kcal/kg)</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">総投与蛋白量</span>
                  <div className="text-2xl font-black text-teal-400">{nutritionAndFluid.totalPro.toFixed(1)} <span className="text-xs">g</span></div>
                  <div className="text-xs text-slate-300">
                    ({nutritionAndFluid.proPerKgActual.toFixed(2)} g/kg / うち補充+{nutritionAndFluid.suppAminoPro.toFixed(1)}g)
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">NPC/N 比 (目安80〜120)</span>
                  <div className="text-2xl font-black text-white">{nutritionAndFluid.npcN}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">総水分 IN / OUT</span>
                  <div className="text-lg font-black text-sky-400">{nutritionAndFluid.totalFluidIn} <span className="text-xs font-normal text-slate-400">/ {nutritionAndFluid.totalFluidOut} mL</span></div>
                  <div className="text-xs text-slate-300">({nutritionAndFluid.waterPerKgActual.toFixed(1)} mL/kg IN)</div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700 text-center">
                  <span className="text-xs text-slate-400">1日水分バランス</span>
                  <div className={`text-2xl font-black ${
                    nutritionAndFluid.fluidBalance > 1000 ? 'text-rose-400' :
                    nutritionAndFluid.fluidBalance < -1000 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {nutritionAndFluid.fluidBalance >= 0 ? `+${nutritionAndFluid.fluidBalance}` : nutritionAndFluid.fluidBalance} <span className="text-xs">mL</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-teal-400">P (蛋白): {nutritionAndFluid.pRatio}%</span>
                  <span className="text-amber-400">F (脂質): {nutritionAndFluid.fRatio}%</span>
                  <span className="text-blue-400">C (糖質): {nutritionAndFluid.cRatio}%</span>
                </div>
                <div className="w-full h-4 rounded-full overflow-hidden flex">
                  <div style={{ width: `${nutritionAndFluid.pRatio}%` }} className="bg-teal-500 h-full" />
                  <div style={{ width: `${nutritionAndFluid.fRatio}%` }} className="bg-amber-500 h-full" />
                  <div style={{ width: `${nutritionAndFluid.cRatio}%` }} className="bg-blue-500 h-full" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 7: 循環動態・PV Loop 可視化
           ============================================================== */}
        {activeTab === 'pvLoop' && (
          <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 space-y-6">
            <h2 className="text-lg font-bold flex items-center text-white border-b border-slate-800 pb-4">
              <HeartPulse size={20} className="mr-2 text-rose-400" />
              ⑦ 循環動態パラメータ ＆ 左室 PV Loop シミュレーション
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2.5 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">収縮期血圧</label>
                    <input type="number" value={sbp} onChange={(e) => setSbp(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">拡張期血圧</label>
                    <input type="number" value={dbp} onChange={(e) => setDbp(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">心拍数 (HR)</label>
                    <input type="number" value={hr} onChange={(e) => setHr(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">CVP (mmHg)</label>
                    <input type="number" value={cvp} onChange={(e) => setCvp(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">LVEF (%)</label>
                    <input type="number" value={lvef} onChange={(e) => setLvef(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">LVOT VTI (cm)</label>
                    <input type="number" step="0.5" value={lvotVti} onChange={(e) => setLvotVti(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">LVOT径 (cm)</label>
                    <input type="number" step="0.1" value={lvotDiam} onChange={(e) => setLvotDiam(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">乳酸値 (Lac)</label>
                    <input type="number" step="0.1" value={lactate} onChange={(e) => setLactate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
                    <div className="text-[11px] text-slate-400">MAP (目標≧65)</div>
                    <div className={`text-2xl font-black ${hemoData.map < 65 ? 'text-rose-400' : 'text-emerald-400'}`}>{hemoData.map}</div>
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
                    <div className="text-[11px] text-slate-400">心拍出量 (CO)</div>
                    <div className="text-2xl font-black text-blue-400">{hemoData.co} <span className="text-xs">L/m</span></div>
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
                    <div className="text-[11px] text-slate-400">1回拍出量 (SV)</div>
                    <div className="text-2xl font-black text-white">{hemoData.sv} <span className="text-xs">mL</span></div>
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
                    <div className="text-[11px] text-slate-400">SVR (800-1200)</div>
                    <div className="text-2xl font-black text-amber-400">{hemoData.svr}</div>
                  </div>
                </div>

                <div className="bg-rose-950/30 border border-rose-800/60 p-4 rounded-xl space-y-1">
                  <div className="text-sm font-extrabold text-rose-300">📊 現在の循環動態評価：{hemoData.profile}</div>
                  <p className="text-xs text-slate-200 leading-relaxed">{hemoData.actionHint}</p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                <div className="text-xs font-bold text-slate-400 mb-2">左室 圧-容積曲線 (PV Loop) イメージ図</div>
                <svg viewBox="0 0 310 270" className="w-full max-w-sm h-auto">
                  <line x1="40" y1="20" x2="40" y2="245" stroke="#475569" strokeWidth="2" />
                  <line x1="40" y1="245" x2="295" y2="245" stroke="#475569" strokeWidth="2" />
                  <text x="12" y="130" fill="#94a3b8" fontSize="10" transform="rotate(-90 12,130)">左室圧 (Pressure)</text>
                  <text x="135" y="263" fill="#94a3b8" fontSize="10">左室容積 (Volume)</text>

                  <path d="M 90 232 Q 140 232 185 225 L 185 100 Q 135 88 90 100 Z" 
                    fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />
                  <text x="192" y="110" fill="#475569" fontSize="9">正常参考枠</text>

                  <line x1="40" y1="245" x2={hemoData.svg.xEsv + 25} y2={Math.max(15, hemoData.svg.yEes - 25)} 
                    stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" />
                  <text x={hemoData.svg.xEsv - 15} y={Math.max(22, hemoData.svg.yEes - 18)} fill="#fb7185" fontSize="9" fontWeight="bold">ESPVR (収縮力)</text>

                  <path d={`M 45 244 Q 160 242 ${Math.min(285, hemoData.svg.xEdv + 20)} ${Math.max(160, hemoData.svg.yEdp - 15)}`}
                    fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />

                  <path 
                    d={`M ${hemoData.svg.xEsv} ${hemoData.svg.yBottom} 
                        Q ${(hemoData.svg.xEsv + hemoData.svg.xEdv)/2} ${hemoData.svg.yBottom} ${hemoData.svg.xEdv} ${hemoData.svg.yEdp} 
                        L ${hemoData.svg.xEdv} ${hemoData.svg.ySbp} 
                        Q ${(hemoData.svg.xEsv + hemoData.svg.xEdv)/2} ${hemoData.svg.yEes} ${hemoData.svg.xEsv} ${hemoData.svg.ySbp} Z`}
                    fill="rgba(59, 130, 246, 0.25)" 
                    stroke="#60a5fa" 
                    strokeWidth="2.5" 
                  />

                  <circle cx={hemoData.svg.xEdv} cy={hemoData.svg.yEdp} r="3.5" fill="#38bdf8" />
                  <text x={hemoData.svg.xEdv + 5} y={hemoData.svg.yEdp + 4} fill="#7dd3fc" fontSize="9">EDV (前負荷)</text>

                  <circle cx={hemoData.svg.xEsv} cy={hemoData.svg.ySbp} r="3.5" fill="#f43f5e" />
                  <text x={Math.max(45, hemoData.svg.xEsv - 38)} y={hemoData.svg.ySbp - 5} fill="#fda4af" fontSize="9">ESP (後負荷)</text>

                  <text x={(hemoData.svg.xEsv + hemoData.svg.xEdv)/2 - 18} y={(hemoData.svg.yEdp + hemoData.svg.ySbp)/2} 
                    fill="#ffffff" fontSize="10" fontWeight="bold">SV: {hemoData.sv}mL</text>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 8: By-System チェックリスト (PADIS・不整脈・AKI・血液凝固・内分泌・予防)
           ============================================================== */}
        {activeTab === 'checklist' && (
          <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
              <div>
                <h2 className="text-lg font-bold flex items-center text-white">
                  <ClipboardCheck size={20} className="mr-2 text-emerald-400" />
                  ⑧ By-System 系統別アセスメント＆チェックリスト
                </h2>
                <p className="text-xs text-slate-400 mt-1">PADIS・不整脈・KDIGO AKI評価・血液凝固・内分泌・予防バンドルを網羅</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-xs text-slate-400">確認進捗</div>
                  <div className="text-xl font-black text-emerald-400">{checklistProgress.done}/{checklistProgress.total} ({checklistProgress.percent}%)</div>
                </div>
                <button onClick={resetChecklist}
                  className="flex items-center space-x-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700">
                  <RotateCcw size={14} />
                  <span>リセット</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-800/70 p-4 rounded-xl border border-blue-800/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-blue-300">🩺 KDIGO AKI ステージ簡易判定ツール</span>
                <span className={`text-xs font-black px-3 py-1 rounded-full border ${akiStageResult.color}`}>
                  判定: AKI Stage {akiStageResult.stage} (Cr比 {akiStageResult.ratio}倍 / 差 +{akiStageResult.diff})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">ベースライン Cr (mg/dL)</label>
                  <input type="number" step="0.1" value={akiBaseCr} onChange={(e) => setAkiBaseCr(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">現在 Cr (mg/dL)</label>
                  <input type="number" step="0.1" value={akiCurrCr} onChange={(e) => setAkiCurrCr(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">直近尿量 (mL/kg/h)</label>
                  <input type="number" step="0.1" value={akiUrineRate} onChange={(e) => setAkiUrineRate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white font-bold" />
                </div>
                <div className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/80">
                  {akiStageResult.reason}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {checklist.map((sys, sysIdx) => (
                <div key={sys.system} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/80 space-y-2.5">
                  <h3 className={`text-sm font-extrabold ${sys.color} border-b border-slate-700/80 pb-2`}>{sys.system}</h3>
                  <div className="space-y-1.5">
                    {sys.items.map(item => (
                      <button key={item.id} onClick={() => toggleCheckItem(sysIdx, item.id)}
                        className={`w-full flex items-start space-x-2.5 text-left p-2 rounded-lg transition-all ${
                          item.checked ? 'bg-emerald-950/30 text-slate-400 line-through' : 'hover:bg-slate-800 text-slate-200'
                        }`}>
                        {item.checked 
                          ? <CheckSquare size={17} className="text-emerald-400 flex-shrink-0 mt-0.5" /> 
                          : <Square size={17} className="text-slate-500 flex-shrink-0 mt-0.5" />}
                        <span className="text-xs font-medium leading-snug">{item.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;
