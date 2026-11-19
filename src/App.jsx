import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Zap, BookOpen, Flame, CheckCircle, TrendingUp, User, Plus, Camera, Cloud } from 'lucide-react';
import { supabase } from './supabaseClient';

const TAREFAS_INICIAIS = [
  { id: 1, titulo: 'Ler 10 páginas de um livro', tipo: 'inteligencia', xp: 20, concluida: false },
  { id: 2, titulo: 'Correr 3 km', tipo: 'cardio', xp: 30, concluida: false },
  { id: 3, titulo: 'Beber 2 litros de água', tipo: 'saude', xp: 15, concluida: false },
];

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('painel');
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const fileInputRef = useRef(null);

  const [perfil, setPerfil] = useState({
    nome: 'PEDRO',
    foto: ''
  });

  const [stats, setStats] = useState({
    nivel: 1,
    xp: 0,
    xpMax: 100,
    hp: 95,
    energia: 90,
    inteligencia: 12,
    cardio: 15,
  });

  const [tarefas, setTarefas] = useState(TAREFAS_INICIAIS);
  const [novaTarefa, setNovaTarefa] = useState('');
  const [novoTipo, setNovoTipo] = useState('inteligencia');

  // Carregar dados do Supabase ao abrir no PC ou celular
  useEffect(() => {
    const carregarDados = async () => {
      const { data, error } = await supabase
        .from('jogador_pedro')
        .select('*')
        .eq('id', 'pedro')
        .single();

      if (!error && data) {
        setPerfil({
          nome: data.nome || 'PEDRO',
          foto: data.foto || ''
        });
        setStats({
          nivel: data.nivel,
          xp: data.xp,
          xpMax: data.xp_max,
          hp: data.hp,
          energia: data.energia,
          inteligencia: data.inteligencia,
          cardio: data.cardio
        });
        setTarefas(Array.isArray(data.tarefas) && data.tarefas.length > 0 ? data.tarefas : TAREFAS_INICIAIS);
      }
      setCarregando(false);
    };

    carregarDados();
  }, []);

  // Função central para salvar tudo no Supabase
  const salvarNoSupabase = async (novoPerfil, novosStats, novasTarefas) => {
    setSincronizando(true);
    await supabase
      .from('jogador_pedro')
      .upsert({
        id: 'pedro',
        nome: novoPerfil.nome,
        foto: novoPerfil.foto,
        nivel: novosStats.nivel,
        xp: novosStats.xp,
        xp_max: novosStats.xpMax,
        hp: novosStats.hp,
        energia: novosStats.energia,
        inteligencia: novosStats.inteligencia,
        cardio: novosStats.cardio,
        tarefas: novasTarefas,
        updated_at: new Date().toISOString()
      });
    setSincronizando(false);
  };

  // Comprime a imagem para 300x300 antes de salvar no banco
  const handleFotoChange = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = (evento) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const tamanho = 300;
        canvas.width = tamanho;
        canvas.height = tamanho;
        const ctx = canvas.getContext('2d');

        const minLado = Math.min(img.width, img.height);
        const sx = (img.width - minLado) / 2;
        const sy = (img.height - minLado) / 2;

        ctx.drawImage(img, sx, sy, minLado, minLado, 0, 0, tamanho, tamanho);
        const fotoComprimida = canvas.toDataURL('image/jpeg', 0.8);

        const novoPerfil = { ...perfil, foto: fotoComprimida };
        setPerfil(novoPerfil);
        await salvarNoSupabase(novoPerfil, stats, tarefas);
      };
      img.src = evento.target.result;
    };
    leitor.readAsDataURL(arquivo);
  };

  const concluirTarefa = async (id) => {
    let novosStats = { ...stats };
    const novasTarefas = tarefas.map((t) => {
      if (t.id === id && !t.concluida) {
        let novoXp = stats.xp + t.xp;
        let novoNivel = stats.nivel;
        let novoHp = Math.min(100, stats.hp + 5);
        let novaInt = t.tipo === 'inteligencia' ? stats.inteligencia + 2 : stats.inteligencia;
        let novoCardio = t.tipo === 'cardio' ? stats.cardio + 2 : stats.cardio;

        if (novoXp >= stats.xpMax) {
          novoNivel += 1;
          novoXp = novoXp - stats.xpMax;
        }

        novosStats = {
          ...stats,
          nivel: novoNivel,
          xp: novoXp,
          hp: novoHp,
          inteligencia: novaInt,
          cardio: novoCardio
        };

        return { ...t, concluida: true };
      }
      return t;
    });

    setStats(novosStats);
    setTarefas(novasTarefas);
    await salvarNoSupabase(perfil, novosStats, novasTarefas);
  };

  const adicionarTarefa = async (e) => {
    e.preventDefault();
    if (!novaTarefa.trim()) return;
    const item = {
      id: Date.now(),
      titulo: novaTarefa,
      tipo: novoTipo,
      xp: 20,
      concluida: false
    };
    const novasTarefas = [...tarefas, item];
    setTarefas(novasTarefas);
    setNovaTarefa('');
    await salvarNoSupabase(perfil, stats, novasTarefas);
  };

  const resetarDia = async () => {
    const tarefasResetadas = tarefas.map((t) => ({ ...t, concluida: false }));
    setTarefas(tarefasResetadas);
    await salvarNoSupabase(perfil, stats, tarefasResetadas);
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-400 flex items-center justify-center font-bold tracking-wider">
        CARREGANDO SISTEMA PEDRO...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-10">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFotoChange}
        className="hidden"
      />

      {/* Barra Superior */}
      <header className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <button onClick={() => setIsOpen(true)} className="p-2 text-cyan-400 hover:bg-slate-800 rounded-lg">
          <Menu size={28} />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-wider text-cyan-400">SISTEMA PEDRO</h1>
          <Cloud size={15} className={sincronizando ? 'text-amber-400 animate-pulse' : 'text-emerald-400'} />
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Alterar foto de perfil"
          className="w-9 h-9 rounded-full overflow-hidden border border-cyan-500/40 bg-slate-800 flex items-center justify-center"
        >
          {perfil.foto ? (
            <img src={perfil.foto} alt="Perfil" className="w-full h-full object-cover" />
          ) : (
            <User size={18} className="text-cyan-400" />
          )}
        </button>
      </header>

      {/* Aba Lateral */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70" onClick={() => setIsOpen(false)}></div>
          <div className="relative w-72 bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between z-10 shadow-2xl">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-cyan-400">Menu</h2>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              {/* Bloco de Perfil no Menu */}
              <div className="flex items-center gap-3 p-3 mb-6 bg-slate-950/70 border border-slate-800 rounded-xl">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-14 h-14 rounded-full overflow-hidden border border-cyan-500/40 bg-slate-800 flex items-center justify-center shrink-0"
                >
                  {perfil.foto ? (
                    <img src={perfil.foto} alt="Foto do jogador" className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-cyan-400" />
                  )}
                </button>
                <div className="min-w-0">
                  <p className="font-bold text-white truncate">{perfil.nome}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-1"
                  >
                    <Camera size={12} /> Trocar foto
                  </button>
                </div>
              </div>

              <nav className="space-y-3">
                <button 
                  onClick={() => { setAbaAtiva('painel'); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg font-medium text-left ${abaAtiva === 'painel' ? 'bg-slate-800 text-cyan-300' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <User size={20} /> Painel do Personagem
                </button>
                <button 
                  onClick={() => { setAbaAtiva('missoes'); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg font-medium text-left ${abaAtiva === 'missoes' ? 'bg-slate-800 text-cyan-300' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Zap size={20} /> Gerenciar Missões
                </button>
                <button 
                  onClick={() => { setAbaAtiva('status'); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg font-medium text-left ${abaAtiva === 'status' ? 'bg-slate-800 text-cyan-300' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <TrendingUp size={20} /> Evolução Corpo & Mente
                </button>
              </nav>
            </div>
            <div className="text-xs text-slate-500 text-center">
              Sistema Pedro v2.0 (Cloud Sync)
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="p-4 max-w-md mx-auto space-y-6">
        {abaAtiva === 'painel' && (
          <>
            {/* Card do Personagem */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-cyan-500/30 rounded-2xl p-5 shadow-lg shadow-cyan-950/50">
              <div className="flex justify-between items-center gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Clique para escolher uma foto"
                    className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-500/40 bg-slate-800 flex items-center justify-center shrink-0 group"
                  >
                    {perfil.foto ? (
                      <img src={perfil.foto} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={28} className="text-cyan-400" />
                    )}
                    <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera size={16} className="text-white" />
                    </span>
                  </button>
                  <div className="min-w-0">
                    <span className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">Jogador</span>
                    <h2 className="text-xl font-black text-white truncate">{perfil.nome} (Nível {stats.nivel})</h2>
                  </div>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full text-cyan-400 text-sm font-bold shrink-0">
                  XP: {stats.xp}/{stats.xpMax}
                </div>
              </div>

              {/* Barras de Status */}
              <div className="space-y-3 mt-4">
                <div>
                  <div className="flex justify-between text-xs mb-1 text-slate-400">
                    <span>Corpo & Mente (HP)</span>
                    <span>{stats.hp}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${stats.hp}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 text-slate-400">
                    <span>Energia Diária</span>
                    <span>{stats.energia}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${stats.energia}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Atributos */}
              <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-800">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 flex items-center justify-center gap-1">
                    <BookOpen size={14} className="text-cyan-400" /> Inteligência
                  </span>
                  <span className="text-xl font-bold text-cyan-400 mt-1 block">{stats.inteligencia}</span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 flex items-center justify-center gap-1">
                    <Flame size={14} className="text-orange-400" /> Cardio
                  </span>
                  <span className="text-xl font-bold text-orange-400 mt-1 block">{stats.cardio}</span>
                </div>
              </div>
            </div>

            {/* Missões Diárias */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Missões Diárias</h3>
                <button
                  onClick={resetarDia}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Novo dia (desmarcar)
                </button>
              </div>
              {tarefas.map((tarefa) => (
                <div 
                  key={tarefa.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    tarefa.concluida 
                      ? 'bg-slate-900/40 border-emerald-500/30 opacity-60' 
                      : 'bg-slate-900 border-slate-800 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => concluirTarefa(tarefa.id)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                        tarefa.concluida ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-600 hover:border-cyan-400'
                      }`}
                    >
                      {tarefa.concluida && <CheckCircle size={16} />}
                    </button>
                    <span className={`text-sm font-medium ${tarefa.concluida ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {tarefa.titulo}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-md">
                    +{tarefa.xp} XP
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {abaAtiva === 'missoes' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-bold text-cyan-400">Adicionar Nova Missão</h2>
            <form onSubmit={adicionarTarefa} className="space-y-3">
              <input
                type="text"
                placeholder="Ex: Ler 5 páginas, Meditar 10 min..."
                value={novaTarefa}
                onChange={(e) => setNovaTarefa(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              <select
                value={novoTipo}
                onChange={(e) => setNovoTipo(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="inteligencia">Melhora Inteligência (Mente)</option>
                <option value="cardio">Melhora Cardio (Corpo)</option>
                <option value="saude">Saúde Geral (HP)</option>
              </select>
              <button
                type="submit"
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={18} /> Adicionar Missão
              </button>
            </form>
          </div>
        )}

        {abaAtiva === 'status' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-bold text-cyan-400">Resumo de Performance</h2>
            <p className="text-sm text-slate-400">
              Cada tarefa concluída fortalece seus atributos. Tudo fica sincronizado automaticamente na nuvem entre seu PC e celular.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-3 bg-slate-950 rounded-xl">
                <span className="text-slate-400">Nível Atual</span>
                <span className="font-bold text-white">{stats.nivel}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-950 rounded-xl">
                <span className="text-slate-400">Pontos de Inteligência</span>
                <span className="font-bold text-cyan-400">{stats.inteligencia} pts</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-950 rounded-xl">
                <span className="text-slate-400">Pontos de Cardio</span>
                <span className="font-bold text-orange-400">{stats.cardio} pts</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}