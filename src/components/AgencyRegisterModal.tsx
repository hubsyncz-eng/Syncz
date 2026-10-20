import React, { useState, useEffect } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { Agency } from '../types/index.ts';
import { Building2, X, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import {
  BRAZILIAN_STATES,
  CITIES_BY_STATE_FALLBACK,
  fetchCitiesByState,
} from '../utils/brazilLocations.ts';

interface AgencyRegisterModalProps {
  onClose: () => void;
  onAgencyCreated?: (agencyId: string) => void;
  agencyToEdit?: Agency | null;
  canDelete?: boolean;
}

export const AgencyRegisterModal: React.FC<AgencyRegisterModalProps> = ({
  onClose,
  onAgencyCreated,
  agencyToEdit,
  canDelete: propCanDelete,
}) => {
  const { registerAgency, updateAgency, deleteAgency, currentUser } = useRealtime();
  const isEditing = Boolean(agencyToEdit);
  const allowDelete = propCanDelete !== undefined ? propCanDelete : currentUser?.role === 'admin';

  const [name, setName] = useState(agencyToEdit?.name || '');
  const [address, setAddress] = useState(agencyToEdit?.address || '');
  const [state, setState] = useState(agencyToEdit?.state || 'SP');
  const [citiesList, setCitiesList] = useState<string[]>(
    CITIES_BY_STATE_FALLBACK[agencyToEdit?.state || 'SP'] || ['São Paulo']
  );
  const [city, setCity] = useState(agencyToEdit?.city || 'São Paulo');
  const [managerName, setManagerName] = useState(agencyToEdit?.managerName || '');
  const [phone, setPhone] = useState(agencyToEdit?.phone || '');
  const [email, setEmail] = useState(agencyToEdit?.email || '');
  const [password, setPassword] = useState(agencyToEdit?.password || 'agencia123');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fallback = CITIES_BY_STATE_FALLBACK[state] || [];
    setCitiesList(fallback);
    if (fallback.length > 0 && !fallback.includes(city)) {
      setCity(fallback[0]);
    }

    fetchCitiesByState(state).then((list) => {
      if (!active || list.length === 0) return;
      setCitiesList(list);
      setCity((prev) => (list.includes(prev) ? prev : list[0]));
    });

    return () => {
      active = false;
    };
  }, [state]);

  const handleStateChange = (newUf: string) => {
    setState(newUf);
    const fallback = CITIES_BY_STATE_FALLBACK[newUf] || [];
    if (fallback.length > 0) {
      setCity(fallback[0]);
    } else {
      setCity('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMsg('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (isEditing && agencyToEdit) {
        await updateAgency(agencyToEdit.id, {
          name: name.trim(),
          address: address.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city,
          state,
          managerName: managerName || 'Gestor Responsável',
          description: agencyToEdit.description || 'Centralizadora de Agendas e Negociações Corporativas',
          password: password || 'agencia123',
        });
      } else {
        const created = await registerAgency({
          name: name.trim(),
          address: address.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city,
          state,
          managerName: managerName || 'Gestor Responsável',
          description: 'Centralizadora de Agendas e Negociações Corporativas',
          password: password || 'agencia123',
        });

        if (onAgencyCreated) {
          onAgencyCreated(created.id);
        }
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.message || (isEditing ? 'Erro ao atualizar agência.' : 'Erro ao cadastrar agência.')
      );
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!agencyToEdit) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await deleteAgency(agencyToEdit.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao excluir agência.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 sm:p-8 text-white shadow-2xl relative my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting || isDeleting}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isEditing ? 'Editar Agência Centralizadora' : 'Nova Agência Centralizadora'}
            </h2>
            <p className="text-xs text-slate-400">
              {isEditing
                ? 'Altere os dados cadastrais ou exclua o cadastro da agência'
                : 'O Administrador registra a agência para que ela gerencie e abra horários na semana'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs sm:text-sm">
          {/* Nome da Agência */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome da Agência *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Agência Central Beta"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
            />
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Endereço
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
            />
          </div>

          {/* Estado & Cidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Estado (UF)
              </label>
              <select
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
              >
                {BRAZILIAN_STATES.map((st) => (
                  <option key={st.uf} value={st.uf}>
                    {st.uf} - {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cidade
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
              >
                {citiesList.map((cityName) => (
                  <option key={cityName} value={cityName}>
                    {cityName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Responsável & Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Gestor / Responsável
              </label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Ex: Dra. Mariana Costa"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Telefone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 3300-2200"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* E-mail Institucional & Senha de Acesso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                E-mail Institucional *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agendamento@agenciabeta.com.br"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Senha de Acesso da Agência *
              </label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ex: agencia123"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm font-mono"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            {isEditing && allowDelete && (
              <button
                type="button"
                disabled={isSubmitting || isDeleting}
                onClick={handleDelete}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                  confirmDelete
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                }`}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {confirmDelete ? 'Confirmar Exclusão' : 'Excluir Cadastro'}
                  </>
                )}
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditing ? 'Salvando...' : 'Cadastrando...'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {isEditing ? 'Salvar Alterações' : 'Cadastrar Agência'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
