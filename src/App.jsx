import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  User,
  BookOpen,
  Flame,
  CheckCircle2,
  Circle,
  RotateCcw,
  Cloud,
  CloudOff,
  Camera,
  Menu,
  X,
  Plus,
  Trash2,
  Sparkles,
  Heart,
  Brain,
  Zap,
  BarChart3,
  Calendar,
  Trophy,
  Home
} from 'lucide-react';

const MISSOES_INICIAIS = [
  {
    id: 1,
    texto: 'Ler 10 páginas de um livro',
    xp: 20,
    categoria: 'mente',
    concluida: false
  },
  {
    id: 2,
    texto: 'Correr 3 km',
    xp: 30,
    categoria: 'corpo',
    concluida: false
  },
  {
    id: 3,
    texto: 'Beber 2 litros de água',
    xp: 15,
    categoria: 'corpo',
    concluida: false
  }
];

function obterDataHojeISO() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatarDataCurta(dataISO) {
  if (!dataISO) return '';
  const partes = dataISO.split('-');
  if (partes.length !== 3) return dataISO;
  return `${partes[2]}/${partes[1]}`;
}

const HISTORICO_INICIAL = [
  { data: '2026-11-15', xpGanho: 35, corpoDelta: 5, menteDelta: 5 },
  { data: '2026-11-16', xpGanho: 50, corpoDelta: 10, menteDelta: 5 },
  { data: '2026-11-17', xpGanho: 20, corpoDelta: 0, menteDelta: 5 },
  { data: '2026-11-18', xpGanho: 65, corpoDelta: 10, menteDelta: 10 },
  { data: obterDataHojeISO(), xpGanho: 25, corpoDelta: 5, menteDelta: 5 }
];

const ESTADO_INICIAL = {
  nome: 'PEDRO',
  nivel: 1,
  xp: 0,
  corpoHp: 95,
  menteHp: 95,
  energia: 90,
  inteligencia: 12,
  cardio: 15,
  fotoUrl: '',
  missoes: MISSOES_INICIAIS,
  historicoEvolucao: HISTORICO_INICIAL
};

export default function App() {
  const [dados, setDados] = useState(ESTADO_INICIAL);
  const [abaAtiva, setAbaAtiva] = useState('inicio');
  const [menuLateralAberto, setMenuLateralAberto] = useState(false);
  const [sincronizado, setSincronizado] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const [novaMissaoTexto, setNovaMissaoTexto] = useState('');
  const [novaMissaoCategoria, setNovaMissaoCategoria] = useState('mente');
  const [novaMissaoXp, setNovaMissaoXp] = useState(20);

  // Estados para registrar ou filtrar datas no gráfico de evolução
  const [dataRegistro, setDataRegistro] = useState(obterDataHojeISO());
  const [xpRegistro, setXpRegistro] = useState(30);
  const [corpoRegistro, setCorpoRegistro] = useState(5);
  const [menteRegistro, setMenteRegistro] = useState(5);
  const [dataInicioFiltro, setDataInicioFiltro] = useState('');
  const [dataFimFiltro, setDataFimFiltro] = useState('');
  const [metricaGrafico, setMetricaGrafico] = useState('xpGanho');

  const inputFotoRef = useRef(null);

  useEffect(() => {
    async function carregarDados() {
      try {
        const localSalvo = localStorage.getItem('sistema_pedro_v3');
        if (localSalvo) {
          const parsed = JSON.parse(localSalvo);
          setDados((prev) => ({
            ...prev,
            ...parsed,
            historicoEvolucao:
              Array.isArray(parsed.historicoEvolucao) &&
              parsed.historicoEvolucao.length > 0
                ? parsed.historicoEvolucao
                : prev.historicoEvolucao
          }));
        }

        const { data, error } = await supabase
          .from('jogador_pedro')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (!error && data && data.dados) {
          const remoto = {
            ...ESTADO_INICIAL,
            ...data.dados,
            historicoEvolucao:
              Array.isArray(data.dados.historicoEvolucao) &&
              data.dados.historicoEvolucao.length > 0
                ? data.dados.historicoEvolucao
                : ESTADO_INICIAL.historicoEvolucao
          };
          setDados(remoto);
          localStorage.setItem('sistema_pedro_v3', JSON.stringify(remoto));
          setSincronizado(true);
        } else if (!error) {
          setSincronizado(true);
        }
      } catch (err) {
        console.error('Erro ao carregar Supabase:', err);
        setSincronizado(false);
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, []);

  const salvarAlteracoes = async (novosDados) => {
    setDados(novosDados);
    localStorage.setItem('sistema_pedro_v3', JSON.stringify(novosDados));

    try {
      const { error } = await supabase
        .from('jogador_pedro')
        .upsert({
          id: 1,
          dados: novosDados,
          atualizado_em: new Date().toISOString()
        });

      setSincronizado(!error);
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      setSincronizado(false);
    }
  };

  const registrarEvolucaoNaData = (
    historicoAtual,
    dataISO,
    deltaXp,
    deltaCorpo,
    deltaMente,
    somarSeExistir = true
  ) => {
    const lista = Array.isArray(historicoAtual) ? [...historicoAtual] : [];
    const idx = lista.findIndex((item) => item.data === dataISO);

    if (idx >= 0) {
      const atual = lista[idx];
      lista[idx] = {
        data: dataISO,
        xpGanho: Math.max(
          0,
          somarSeExistir ? atual.xpGanho + deltaXp : deltaXp
        ),
        corpoDelta: somarSeExistir
          ? atual.corpoDelta + deltaCorpo
          : deltaCorpo,
        menteDelta: somarSeExistir
          ? atual.menteDelta + deltaMente
          : deltaMente
      };
    } else {
      lista.push({
        data: dataISO,
        xpGanho: Math.max(0, deltaXp),
        corpoDelta: deltaCorpo,
        menteDelta: deltaMente
      });
    }

    return lista.sort((a, b) => a.data.localeCompare(b.data));
  };

  const handleTrocarFoto = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = (evento) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const tamanhoMax = 220;
        let largura = img.width;
        let altura = img.height;

        if (largura > altura) {
          if (largura > tamanhoMax) {
            altura = Math.round((altura * tamanhoMax) / largura);
            largura = tamanhoMax;
          }
        } else if (altura > tamanhoMax) {
          largura = Math.round((largura * tamanhoMax) / altura);
          altura = tamanhoMax;
        }

        canvas.width = largura;
        canvas.height = altura;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, largura, altura);

        const fotoComprimida = canvas.toDataURL('image/jpeg', 0.78);
        salvarAlteracoes({ ...dados, fotoUrl: fotoComprimida });
      };
      img.src = evento.target.result;
    };
    leitor.readAsDataURL(arquivo);
  };

  const alternarMissao = (id) => {
    const missaoAlvo = dados.missoes.find((m) => m.id === id);
    if (!missaoAlvo) return;

    const concluindo = !missaoAlvo.concluida;
    const fator = concluindo ? 1 : -1;

    let novoXp = dados.xp + missaoAlvo.xp * fator;
    let novoNivel = dados.nivel;

    while (novoXp >= 100) {
      novoXp -= 100;
      novoNivel += 1;
    }
    while (novoXp < 0 && novoNivel > 1) {
      novoNivel -= 1;
      novoXp += 100;
    }
    if (novoXp < 0) novoXp = 0;

    const ehMente = missaoAlvo.categoria === 'mente';
    const deltaMente = ehMente ? 5 * fator : 0;
    const deltaCorpo = !ehMente ? 5 * fator : 0;

    const novaMenteHp = Math.min(100, Math.max(0, dados.menteHp + deltaMente));
    const novoCorpoHp = Math.min(100, Math.max(0, dados.corpoHp + deltaCorpo));

    const novaInteligencia = ehMente
      ? Math.max(0, dados.inteligencia + 1 * fator)
      : dados.inteligencia;
    const novoCardio = !ehMente
      ? Math.max(0, dados.cardio + 1 * fator)
      : dados.cardio;

    const novaEnergia = Math.min(
      100,
      Math.max(0, dados.energia + (concluindo ? -5 : 5))
    );

    const missoesAtualizadas = dados.missoes.map((m) =>
      m.id === id ? { ...m, concluida: concluindo } : m
    );

    const historicoAtualizado = registrarEvolucaoNaData(
      dados.historicoEvolucao,
      obterDataHojeISO(),
      missaoAlvo.xp * fator,
      deltaCorpo,
      deltaMente,
      true
    );

    salvarAlteracoes({
      ...dados,
      nivel: novoNivel,
      xp: novoXp,
      corpoHp: novoCorpoHp,
      menteHp: novaMenteHp,
      energia: novaEnergia,
      inteligencia: novaInteligencia,
      cardio: novoCardio,
      missoes: missoesAtualizadas,
      historicoEvolucao: historicoAtualizado
    });
  };

  const iniciarNovoDia = () => {
    const missoesResetadas = dados.missoes.map((m) => ({
      ...m,
      concluida: false
    }));

    salvarAlteracoes({
      ...dados,
      energia: 100,
      missoes: missoesResetadas
    });
  };

  const adicionarMissao = (e) => {
    e.preventDefault();
    if (!novaMissaoTexto.trim()) return;

    const nova = {
      id: Date.now(),
      texto: novaMissaoTexto.trim(),
      xp: Number(novaMissaoXp) || 15,
      categoria: novaMissaoCategoria,
      concluida: false
    };

    salvarAlteracoes({
      ...dados,
      missoes: [...dados.missoes, nova]
    });
    setNovaMissaoTexto('');
  };

  const removerMissao = (id) => {
    salvarAlteracoes({
      ...dados,
      missoes: dados.missoes.filter((m) => m.id !== id)
    });
  };

  const salvarDataEvolucao = (e) => {
    e.preventDefault();
    if (!dataRegistro) return;

    const historicoAtualizado = registrarEvolucaoNaData(
      dados.historicoEvolucao,
      dataRegistro,
      Number(xpRegistro) || 0,
      Number(corpoRegistro) || 0,
      Number(menteRegistro) || 0,
      false
    );

    salvarAlteracoes({
      ...dados,
      historicoEvolucao: historicoAtualizado
    });
  };

  const removerDataEvolucao = (dataISO) => {
    const filtrado = (dados.historicoEvolucao || []).filter(
      (item) => item.data !== dataISO
    );
    salvarAlteracoes({
      ...dados,
      historicoEvolucao: filtrado
    });
  };

  const historicoFiltrado = useMemo(() => {
    const lista = [...(dados.historicoEvolucao || [])].sort((a, b) =>
      a.data.localeCompare(b.data)
    );
    return lista.filter((item) => {
      if (dataInicioFiltro && item.data < dataInicioFiltro) return false;
      if (dataFimFiltro && item.data > dataFimFiltro) return false;
      return true;
    });
  }, [dados.historicoEvolucao, dataInicioFiltro, dataFimFiltro]);

  const melhorDia = useMemo(() => {
    if (historicoFiltrado.length === 0) return null;
    return historicoFiltrado.reduce((melhor, atual) => {
      const scoreAtual =
        atual.xpGanho + atual.corpoDelta * 3 + atual.menteDelta * 3;
      const scoreMelhor =
        melhor.xpGanho + melhor.corpoDelta * 3 + melhor.menteDelta * 3;
      return scoreAtual > scoreMelhor ? atual : melhor;
    }, historicoFiltrado[0]);
  }, [historicoFiltrado]);

  const missoesMente = dados.missoes.filter((m) => m.categoria === 'mente');
  const missoesCorpo = dados.missoes.filter((m) => m.categoria === 'corpo');
  const progressoMenteDia =
    missoesMente.length > 0
      ? Math.round(
          (missoesMente.filter((m) => m.concluida).length /
            missoesMente.length) *
            100
        )
      : 0;
  const progressoCorpoDia =
    missoesCorpo.length > 0
      ? Math.round(
          (missoesCorpo.filter((m) => m.concluida).length /
            missoesCorpo.length) *
            100
        )
      : 0;

  const maxValorGrafico = useMemo(() => {
    if (historicoFiltrado.length === 0) return 10;
    const maior = Math.max(
      ...historicoFiltrado.map((item) => Math.abs(Number(item[metricaGrafico]) || 0))
    );
    return maior > 0 ? maior : 10;
  }, [historicoFiltrado, metricaGrafico]);

  const navegarPara = (aba) => {
    setAbaAtiva(aba);
    setMenuLateralAberto(false);
  };

  return (
    <div className="min-h-screen bg-[#040b16] text-slate-100 font-sans pb-12 selection:bg-cyan-500/30">
      {/* MENU LATERAL DESLIZANTE (SIDEBAR) */}
      {menuLateralAberto && (
        <div className="fixed inset-0 z-50 flex">
          <div
            onClick={() => setMenuLateralAberto(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
          />
          <aside className="relative z-10 w-72 max-w-[82vw] h-full bg-[#071122] border-r border-cyan-500/25 p-5 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase">
                    NAVEGAÇÃO
                  </p>
                  <h2 className="text-base font-extrabold text-white tracking-wide">
                    SISTEMA PEDRO
                  </h2>
                </div>
                <button
                  onClick={() => setMenuLateralAberto(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  aria-label="Fechar menu lateral"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => navegarPara('inicio')}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition text-left ${
                    abaAtiva === 'inicio'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <Home className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Painel & Missões</span>
                </button>

                <button
                  onClick={() => navegarPara('status')}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition text-left ${
                    abaAtiva === 'status'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Evolução Corpo & Mente</span>
                </button>

                <button
                  onClick={() => navegarPara('evolucao')}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition text-left ${
                    abaAtiva === 'evolucao'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Gráfico & Datas</span>
                </button>
              </nav>
            </div>

            <div className="rounded-xl bg-[#040b16] border border-slate-800 p-3 text-xs space-y-1">
              <p className="text-slate-400">
                Nível atual:{' '}
                <span className="text-white font-bold">{dados.nivel}</span>
              </p>
              <p className="text-slate-400">
                Corpo:{' '}
                <span className="text-emerald-400 font-bold">
                  {dados.corpoHp}%
                </span>{' '}
                • Mente:{' '}
                <span className="text-cyan-400 font-bold">
                  {dados.menteHp}%
                </span>
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* BARRA SUPERIOR LIMPA (SEM ABAS HORIZONTAIS) */}
      <header className="sticky top-0 z-30 bg-[#040b16]/90 backdrop-blur-md border-b border-cyan-500/15 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => setMenuLateralAberto(true)}
            className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition"
            aria-label="Abrir menu lateral"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-extrabold tracking-widest text-cyan-400">
              SISTEMA PEDRO
            </h1>
            {sincronizado ? (
              <Cloud
                className="w-4 h-4 text-emerald-400"
                title="Sincronizado na nuvem"
              />
            ) : (
              <CloudOff
                className="w-4 h-4 text-amber-400"
                title="Modo local"
              />
            )}
          </div>

          <button
            onClick={() => inputFotoRef.current?.click()}
            className="w-9 h-9 rounded-full border border-cyan-500/40 bg-slate-900/80 flex items-center justify-center overflow-hidden hover:border-cyan-400 transition"
            title="Alterar foto de perfil"
          >
            {dados.fotoUrl ? (
              <img
                src={dados.fotoUrl}
                alt="Perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-cyan-400" />
            )}
          </button>
        </div>
      </header>

      <input
        ref={inputFotoRef}
        type="file"
        accept="image/*"
        onChange={handleTrocarFoto}
        className="hidden"
      />

      <main className="p-4 max-w-lg mx-auto space-y-6 mt-2">
        {carregando && (
          <div className="text-center text-xs text-cyan-400/80 animate-pulse">
            Sincronizando status do jogador...
          </div>
        )}

        {/* CARTÃO PRINCIPAL DO JOGADOR */}
        <section className="rounded-2xl bg-[#081224] border border-cyan-500/25 p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)] space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div
                onClick={() => inputFotoRef.current?.click()}
                className="relative group w-16 h-16 rounded-full border-2 border-cyan-400/70 bg-slate-900 flex items-center justify-center overflow-hidden cursor-pointer shrink-0"
              >
                {dados.fotoUrl ? (
                  <img
                    src={dados.fotoUrl}
                    alt="Foto do Jogador"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-7 h-7 text-cyan-400" />
                )}
                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase">
                  JOGADOR
                </p>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  {dados.nome} (Nível {dados.nivel})
                </h2>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold shrink-0">
              XP: {dados.xp}/100
            </div>
          </div>

          {/* BARRAS SEPARADAS DE CORPO, MENTE E ENERGIA */}
          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="flex items-center gap-1.5 text-slate-200 font-medium">
                  <Heart className="w-3.5 h-3.5 text-emerald-400" />
                  Corpo (Evolução Física)
                </span>
                <span className="text-emerald-400 font-bold">
                  {dados.corpoHp}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800/90 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-300"
                  style={{ width: `${dados.corpoHp}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="flex items-center gap-1.5 text-slate-200 font-medium">
                  <Brain className="w-3.5 h-3.5 text-cyan-400" />
                  Mente (Evolução Mental)
                </span>
                <span className="text-cyan-400 font-bold">
                  {dados.menteHp}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800/90 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full transition-all duration-300"
                  style={{ width: `${dados.menteHp}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Energia Diária
                </span>
                <span className="text-amber-400 font-bold">
                  {dados.energia}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800/90 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-300"
                  style={{ width: `${dados.energia}%` }}
                />
              </div>
            </div>
          </div>

          {/* Atributos Separados */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl bg-[#050d1b] border border-cyan-500/20 p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-300 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Inteligência</span>
              </div>
              <p className="text-2xl font-extrabold text-cyan-400">
                {dados.inteligencia}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Atributo Mente</p>
            </div>

            <div className="rounded-xl bg-[#050d1b] border border-emerald-500/20 p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-300 mb-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Cardio</span>
              </div>
              <p className="text-2xl font-extrabold text-orange-400">
                {dados.cardio}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Atributo Corpo</p>
            </div>
          </div>
        </section>

        {/* SEÇÃO 1: MISSÕES DIÁRIAS */}
        {abaAtiva === 'inicio' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-widest text-slate-300 uppercase">
                MISSÕES DIÁRIAS
              </h3>
              <button
                onClick={iniciarNovoDia}
                className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Novo dia (desmarcar)
              </button>
            </div>

            <div className="space-y-2.5">
              {dados.missoes.map((missao) => {
                const ehMente = missao.categoria === 'mente';
                return (
                  <div
                    key={missao.id}
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition ${
                      missao.concluida
                        ? 'bg-[#071526]/60 border-slate-800/80 opacity-70'
                        : 'bg-[#081224] border-slate-800 hover:border-cyan-500/30'
                    }`}
                  >
                    <button
                      onClick={() => alternarMissao(missao.id)}
                      className="flex items-center gap-3 text-left flex-1"
                    >
                      {missao.concluida ? (
                        <CheckCircle2
                          className={`w-5 h-5 shrink-0 ${
                            ehMente ? 'text-cyan-400' : 'text-emerald-400'
                          }`}
                        />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 shrink-0" />
                      )}

                      <div>
                        <p
                          className={`text-sm font-medium ${
                            missao.concluida
                              ? 'line-through text-slate-400'
                              : 'text-slate-100'
                          }`}
                        >
                          {missao.texto}
                        </p>
                        <span
                          className={`inline-block text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                            ehMente ? 'text-cyan-400' : 'text-emerald-400'
                          }`}
                        >
                          {ehMente ? 'Mente (+INT)' : 'Corpo (+CARDIO)'}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-950/90 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                        +{missao.xp} XP
                      </span>
                      <button
                        onClick={() => removerMissao(missao.id)}
                        className="p-1.5 text-slate-600 hover:text-rose-400 transition"
                        title="Remover missão"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={adicionarMissao}
              className="rounded-2xl bg-[#081224] border border-slate-800 p-3.5 space-y-3"
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Adicionar nova missão
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={novaMissaoTexto}
                  onChange={(e) => setNovaMissaoTexto(e.target.value)}
                  placeholder="Ex: Treinar musculação ou Estudar React..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1 hover:bg-cyan-400 transition"
                >
                  <Plus className="w-4 h-4" />
                  Criar
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={novaMissaoCategoria}
                  onChange={(e) => setNovaMissaoCategoria(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
                >
                  <option value="mente">Área: Mente</option>
                  <option value="corpo">Área: Corpo</option>
                </select>
                <select
                  value={novaMissaoXp}
                  onChange={(e) => setNovaMissaoXp(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
                >
                  <option value={15}>+15 XP</option>
                  <option value={20}>+20 XP</option>
                  <option value={30}>+30 XP</option>
                </select>
              </div>
            </form>
          </section>
        )}

        {/* SEÇÃO 2: EVOLUÇÃO SEPARADA DE CORPO E MENTE */}
        {abaAtiva === 'status' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-widest text-slate-300 uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                EVOLUÇÃO CORPO & MENTE
              </h3>
              <button
                onClick={() => setAbaAtiva('evolucao')}
                className="text-xs text-cyan-400 hover:underline"
              >
                Ver gráfico por data
              </button>
            </div>

            <div className="rounded-2xl bg-[#081224] border border-emerald-500/25 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                  <Heart className="w-4 h-4" />
                  Evolução do Corpo
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                  {dados.corpoHp}% HP
                </span>
              </div>
              <div className="flex justify-between p-3 bg-slate-950 rounded-xl text-xs">
                <span className="text-slate-400">Pontos de Cardio</span>
                <span className="font-bold text-orange-400">
                  {dados.cardio} pts
                </span>
              </div>
              <div className="flex justify-between p-3 bg-slate-950 rounded-xl text-xs">
                <span className="text-slate-400">Missões do Corpo hoje</span>
                <span className="font-bold text-emerald-400">
                  {progressoCorpoDia}% concluídas
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-[#081224] border border-cyan-500/25 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold text-cyan-400 text-sm">
                  <Brain className="w-4 h-4" />
                  Evolução da Mente
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">
                  {dados.menteHp}% HP
                </span>
              </div>
              <div className="flex justify-between p-3 bg-slate-950 rounded-xl text-xs">
                <span className="text-slate-400">Pontos de Inteligência</span>
                <span className="font-bold text-cyan-400">
                  {dados.inteligencia} pts
                </span>
              </div>
              <div className="flex justify-between p-3 bg-slate-950 rounded-xl text-xs">
                <span className="text-slate-400">Missões da Mente hoje</span>
                <span className="font-bold text-cyan-400">
                  {progressoMenteDia}% concluídas
                </span>
              </div>
            </div>
          </section>
        )}

        {/* SEÇÃO 3: GRÁFICO DE EVOLUÇÃO + DATAS DE MAIOR EVOLUÇÃO */}
        {abaAtiva === 'evolucao' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-widest text-slate-300 uppercase flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                GRÁFICO DE EVOLUÇÃO POR DATA
              </h3>
              <button
                onClick={() => setAbaAtiva('inicio')}
                className="text-xs text-cyan-400 hover:underline"
              >
                Voltar às missões
              </button>
            </div>

            {/* Destaque da data com maior evolução */}
            {melhorDia && (
              <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-cyan-500/10 to-emerald-500/15 border border-amber-400/35 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                      MAIOR EVOLUÇÃO NO PERÍODO
                    </p>
                    <p className="text-sm font-extrabold text-white">
                      {formatarDataCurta(melhorDia.data)} ({melhorDia.data})
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <p className="font-bold text-cyan-300">+{melhorDia.xpGanho} XP</p>
                  <p className="text-[11px] text-slate-300">
                    Corpo +{melhorDia.corpoDelta}% • Mente +{melhorDia.menteDelta}%
                  </p>
                </div>
              </div>
            )}

            {/* Seletor de métrica e filtro de intervalo de datas */}
            <div className="rounded-2xl bg-[#081224] border border-slate-800 p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMetricaGrafico('xpGanho')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    metricaGrafico === 'xpGanho'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-900 text-slate-300'
                  }`}
                >
                  XP por Data
                </button>
                <button
                  onClick={() => setMetricaGrafico('corpoDelta')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    metricaGrafico === 'corpoDelta'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-slate-300'
                  }`}
                >
                  Corpo (%)
                </button>
                <button
                  onClick={() => setMetricaGrafico('menteDelta')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    metricaGrafico === 'menteDelta'
                      ? 'bg-sky-400 text-slate-950'
                      : 'bg-slate-900 text-slate-300'
                  }`}
                >
                  Mente (%)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Data inicial
                  </label>
                  <input
                    type="date"
                    value={dataInicioFiltro}
                    onChange={(e) => setDataInicioFiltro(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Data final
                  </label>
                  <input
                    type="date"
                    value={dataFimFiltro}
                    onChange={(e) => setDataFimFiltro(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {(dataInicioFiltro || dataFimFiltro) && (
                <button
                  onClick={() => {
                    setDataInicioFiltro('');
                    setDataFimFiltro('');
                  }}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Limpar filtro de datas
                </button>
              )}

              {/* Gráfico de barras por data */}
              {historicoFiltrado.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Nenhum registro encontrado para as datas selecionadas.
                </p>
              ) : (
                <div className="pt-2 space-y-2.5">
                  {historicoFiltrado.map((item) => {
                    const valor = Number(item[metricaGrafico]) || 0;
                    const larguraPercent = Math.min(
                      100,
                      Math.max(6, Math.round((Math.abs(valor) / maxValorGrafico) * 100))
                    );
                    const ehPico = melhorDia && melhorDia.data === item.data;

                    const corBarra =
                      metricaGrafico === 'corpoDelta'
                        ? 'from-emerald-500 to-green-400'
                        : metricaGrafico === 'menteDelta'
                        ? 'from-cyan-500 to-sky-400'
                        : 'from-cyan-400 to-indigo-500';

                    return (
                      <div
                        key={item.data}
                        className={`p-2.5 rounded-xl border ${
                          ehPico
                            ? 'bg-amber-500/10 border-amber-400/40'
                            : 'bg-slate-950/90 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                            {formatarDataCurta(item.data)}
                            {ehPico && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                                TOP DIA
                              </span>
                            )}
                          </span>
                          <span className="font-bold text-cyan-300">
                            {metricaGrafico === 'xpGanho'
                              ? `+${valor} XP`
                              : `+${valor}%`}
                          </span>
                        </div>

                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${corBarra} rounded-full transition-all duration-300`}
                            style={{ width: `${larguraPercent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                          <span>
                            XP: +{item.xpGanho} • Corpo: +{item.corpoDelta}% •
                            Mente: +{item.menteDelta}%
                          </span>
                          <button
                            onClick={() => removerDataEvolucao(item.data)}
                            className="text-slate-500 hover:text-rose-400 transition"
                            title="Excluir registro desta data"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Formulário para colocar/atualizar evolução em qualquer data */}
            <form
              onSubmit={salvarDataEvolucao}
              className="rounded-2xl bg-[#081224] border border-slate-800 p-4 space-y-3"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Colocar evolução em uma data
              </p>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={dataRegistro}
                    onChange={(e) => setDataRegistro(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    XP do dia
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={xpRegistro}
                    onChange={(e) => setXpRegistro(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Evolução Corpo (%)
                  </label>
                  <input
                    type="number"
                    value={corpoRegistro}
                    onChange={(e) => setCorpoRegistro(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Evolução Mente (%)
                  </label>
                  <input
                    type="number"
                    value={menteRegistro}
                    onChange={(e) => setMenteRegistro(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider hover:bg-cyan-400 transition"
              >
                Salvar evolução da data
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}