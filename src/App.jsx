import React, { useState, useEffect, useRef } from 'react';
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
  Zap
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
  missoes: MISSOES_INICIAIS
};

export default function App() {
  const [dados, setDados] = useState(ESTADO_INICIAL);
  const [abaAtiva, setAbaAtiva] = useState('inicio');
  const [menuAberto, setMenuAberto] = useState(false);
  const [sincronizado, setSincronizado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [novaMissaoTexto, setNovaMissaoTexto] = useState('');
  const [novaMissaoCategoria, setNovaMissaoCategoria] = useState('mente');
  const [novaMissaoXp, setNovaMissaoXp] = useState(20);
  const inputFotoRef = useRef(null);

  // 1. Carrega dados do Supabase (ou localStorage como backup)
  useEffect(() => {
    async function carregarDados() {
      try {
        const localSalvo = localStorage.getItem('sistema_pedro_v2');
        if (localSalvo) {
          setDados((prev) => ({ ...prev, ...JSON.parse(localSalvo) }));
        }

        const { data, error } = await supabase
          .from('jogador_pedro')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (!error && data && data.dados) {
          setDados((prev) => ({ ...prev, ...data.dados }));
          localStorage.setItem('sistema_pedro_v2', JSON.stringify(data.dados));
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

  // 2. Salva alterações no localStorage e sincroniza com o Supabase
  const salvarAlteracoes = async (novosDados) => {
    setDados(novosDados);
    localStorage.setItem('sistema_pedro_v2', JSON.stringify(novosDados));

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

  // 3. Upload e compressão da foto de perfil para caber leve no banco
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

  // 4. Concluir / desmarcar missão evoluindo Corpo e Mente separadamente
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
    const novaMenteHp = ehMente
      ? Math.min(100, Math.max(0, dados.menteHp + 5 * fator))
      : dados.menteHp;
    const novoCorpoHp = !ehMente
      ? Math.min(100, Math.max(0, dados.corpoHp + 5 * fator))
      : dados.corpoHp;

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

    salvarAlteracoes({
      ...dados,
      nivel: novoNivel,
      xp: novoXp,
      corpoHp: novoCorpoHp,
      menteHp: novaMenteHp,
      energia: novaEnergia,
      inteligencia: novaInteligencia,
      cardio: novoCardio,
      missoes: missoesAtualizadas
    });
  };

  // 5. Novo dia: desmarca missões e restaura energia diária
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

  // 6. Adicionar missão personalizada
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

  return (
    <div className="min-h-screen bg-[#040b16] text-slate-100 font-sans pb-12 selection:bg-cyan-500/30">
      {/* Barra Superior */}
      <header className="sticky top-0 z-30 bg-[#040b16]/90 backdrop-blur-md border-b border-cyan-500/15 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition"
            aria-label="Abrir menu"
          >
            {menuAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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

        {/* Menu de Abas */}
        {menuAberto && (
          <nav className="max-w-lg mx-auto mt-3 pt-3 border-t border-slate-800 flex gap-2">
            <button
              onClick={() => {
                setAbaAtiva('inicio');
                setMenuAberto(false);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition ${
                abaAtiva === 'inicio'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              Painel & Missões
            </button>
            <button
              onClick={() => {
                setAbaAtiva('status');
                setMenuAberto(false);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition ${
                abaAtiva === 'status'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              Evolução Corpo & Mente
            </button>
          </nav>
        )}
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
          {/* Cabeçalho do Jogador */}
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
            {/* Evolução do Corpo */}
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

            {/* Evolução da Mente */}
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

            {/* Energia Diária */}
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

          {/* Atributos Separados: Inteligência (Mente) vs Cardio (Corpo) */}
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

        {/* ABA 1: MISSÕES DIÁRIAS */}
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

            {/* Formulário para criar nova missão */}
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

        {/* ABA 2: DETALHE DA EVOLUÇÃO SEPARADA DE CORPO E MENTE */}
        {abaAtiva === 'status' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-widest text-slate-300 uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                EVOLUÇÃO DETALHADA
              </h3>
              <button
                onClick={() => setAbaAtiva('inicio')}
                className="text-xs text-cyan-400 hover:underline"
              >
                Voltar às missões
              </button>
            </div>

            {/* Card Evolução do Corpo */}
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

            {/* Card Evolução da Mente */}
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
      </main>
    </div>
  );
}