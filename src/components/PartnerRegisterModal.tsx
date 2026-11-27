import React, { useState } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { PartnerProfile, ConstrutoraEmpreendimento } from '../types/index.ts';
import { Users, Building, X, Loader2, CheckCircle2, Trash2, Layers, MapPin } from 'lucide-react';

interface PartnerRegisterModalProps {
  onClose: () => void;
  onPartnerCreated?: (partnerId: string) => void;
  partnerToEdit?: PartnerProfile | null;
  canDelete?: boolean;
  initialSegment?: 'Parceiro Negocial' | 'Construtora';
}

export const PartnerRegisterModal: React.FC<PartnerRegisterModalProps> = ({
  onClose,
  onPartnerCreated,
  partnerToEdit,
  canDelete: propCanDelete,
  initialSegment = 'Parceiro Negocial',
}) => {
  const {
    registerPartner,
    updatePartner,
    deletePartner,
    currentUser,
    currentAgency,
    adminPerspective,
  } = useRealtime();
  const isEditing = Boolean(partnerToEdit);
  const isMasterAdmin =
    currentUser?.role === 'admin' && adminPerspective === 'admin_master';
  const isAgencyView =
    currentUser?.role === 'agency' ||
    (currentUser?.role === 'admin' && adminPerspective === 'agency_view');
  const hidePasswordInAgencyView = isEditing && isAgencyView;
  const allowDelete =
    isMasterAdmin && (propCanDelete !== undefined ? propCanDelete : true);

  const resolvedInitialSegment: 'Parceiro Negocial' | 'Construtora' = partnerToEdit
    ? partnerToEdit.segment?.toLowerCase() === 'construtora'
      ? 'Construtora'
      : 'Parceiro Negocial'
    : initialSegment;

  const [name, setName] = useState(partnerToEdit?.name || '');
  const [representative, setRepresentative] = useState(partnerToEdit?.representative || partnerToEdit?.name || '');
  const [email, setEmail] = useState(partnerToEdit?.email || '');
  const [phone, setPhone] = useState(partnerToEdit?.phone || '');
  const [cnpj, setCnpj] = useState(partnerToEdit?.cnpj || '');
  const profileSegment: 'Parceiro Negocial' | 'Construtora' = resolvedInitialSegment;
  const [password, setPassword] = useState(
    hidePasswordInAgencyView
      ? '***'
      : partnerToEdit?.password ||
          (resolvedInitialSegment === 'Construtora' ? 'construtora123' : 'parceiro123')
  );
  const [logoUrl, setLogoUrl] = useState(partnerToEdit?.logoUrl || '');
  const [empreendimentosList, setEmpreendimentosList] = useState<ConstrutoraEmpreendimento[]>(
    Array.isArray(partnerToEdit?.empreendimentos) ? partnerToEdit!.empreendimentos! : []
  );
  const [confirmDeleteEmpId, setConfirmDeleteEmpId] = useState<string | null>(null);
  const [deletingEmpId, setDeletingEmpId] = useState<string | null>(null);

  const isConstrutora = profileSegment === 'Construtora';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDeleteEmpreendimento = async (empId: string) => {
    if (!partnerToEdit || !allowDelete) return;
    if (confirmDeleteEmpId !== empId) {
      setConfirmDeleteEmpId(empId);
      return;
    }

    setDeletingEmpId(empId);
    setErrorMsg(null);
    const nextEmps = empreendimentosList.filter((e) => e.id !== empId);
    try {
      await updatePartner(partnerToEdit.id, {
        ...partnerToEdit,
        name: name.trim() || partnerToEdit.name,
        representative: representative.trim() || name.trim() || partnerToEdit.representative,
        email: email.trim() || partnerToEdit.email,
        phone: phone.trim(),
        cnpj: cnpj.trim() || partnerToEdit.cnpj,
        segment: profileSegment,
        password:
          hidePasswordInAgencyView || password === '***'
            ? partnerToEdit.password
            : password || partnerToEdit.password,
        logoUrl: isConstrutora ? logoUrl.trim() : partnerToEdit.logoUrl || '',
        empreendimentos: nextEmps,
      });
      setEmpreendimentosList(nextEmps);
      setConfirmDeleteEmpId(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao excluir empreendimento.');
    } finally {
      setDeletingEmpId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cnpj.trim() || !email.trim()) {
      setErrorMsg('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const defaultPass = isConstrutora ? 'construtora123' : 'parceiro123';

    try {
      if (isEditing && partnerToEdit) {
        const preservedPassword =
          hidePasswordInAgencyView || password === '***'
            ? partnerToEdit.password || defaultPass
            : password || defaultPass;

        await updatePartner(partnerToEdit.id, {
          name: name.trim(),
          representative: (representative.trim() || name.trim()),
          email: email.trim(),
          phone: phone.trim(),
          cnpj: cnpj.trim(),
          segment: profileSegment,
          password: preservedPassword,
          logoUrl: isConstrutora ? logoUrl.trim() : partnerToEdit.logoUrl || '',
          allowedAgencyIds: partnerToEdit.allowedAgencyIds,
          empreendimentos: isConstrutora ? empreendimentosList : partnerToEdit.empreendimentos,
        });
      } else {
        const isAgencyCreator =
          currentUser?.role === 'agency' ||
          (currentUser?.role === 'admin' && adminPerspective === 'agency_view');
        const activeAgencyId = currentUser?.agencyId || currentAgency?.id;

        const created = await registerPartner({
          name: name.trim(),
          representative: (representative.trim() || name.trim()),
          email: email.trim(),
          phone: phone.trim(),
          cnpj: cnpj.trim(),
          segment: profileSegment,
          password: password || defaultPass,
          logoUrl: isConstrutora ? logoUrl.trim() : '',
          allowedAgencyIds: isAgencyCreator && activeAgencyId ? [activeAgencyId] : [],
        });

        if (onPartnerCreated) {
          onPartnerCreated(created.id);
        }
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          (isEditing
            ? isConstrutora
              ? 'Erro ao atualizar construtora.'
              : 'Erro ao atualizar parceiro.'
            : isConstrutora
              ? 'Erro ao cadastrar construtora.'
              : 'Erro ao cadastrar parceiro negocial.')
      );
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!partnerToEdit || !allowDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await deletePartner(partnerToEdit.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || (isConstrutora ? 'Erro ao excluir construtora.' : 'Erro ao excluir parceiro.'));
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-white shadow-2xl relative my-auto">
        
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
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
              isConstrutora
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {isConstrutora ? <Building className="w-7 h-7" /> : <Users className="w-7 h-7" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isEditing
                ? isConstrutora
                  ? 'Editar Construtora'
                  : 'Editar Parceiro Negocial'
                : isConstrutora
                  ? 'Nova Construtora'
                  : 'Novo Parceiro Negocial'}
            </h2>
            <p className="text-xs text-slate-400">
              {isEditing
                ? isConstrutora
                  ? allowDelete
                    ? 'Altere os dados cadastrais ou exclua o cadastro da construtora'
                    : 'Altere os dados cadastrais da construtora'
                  : allowDelete
                    ? 'Altere os dados cadastrais ou exclua o cadastro do parceiro'
                    : 'Altere os dados cadastrais do parceiro'
                : isConstrutora
                  ? 'Cadastro de construtora para visualização das agendas'
                  : 'Cadastro de empresa parceira para visualização e agendamento'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isConstrutora ? 'Razão Social / Nome da Construtora *' : 'Razão Social / Nome da Empresa *'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Brasfort Logística Integrada"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                CNPJ da Empresa *
              </label>
              <input
                type="text"
                required
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                E-mail Corporativo *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@empresa.com.br"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isConstrutora ? 'Senha de Acesso da Construtora *' : 'Senha de Acesso do Parceiro *'}
              </label>
              {hidePasswordInAgencyView ? (
                <input
                  type="text"
                  readOnly
                  value="***"
                  title="Senha oculta por segurança na visão da agência"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 focus:outline-none text-xs sm:text-sm font-mono cursor-not-allowed select-none"
                />
              ) : (
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isConstrutora ? 'Ex: construtora123' : 'Ex: parceiro123'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-xs sm:text-sm font-mono"
                />
              )}
            </div>
          </div>

          {isConstrutora && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Link da Imagem do Logo
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://exemplo.com/logo-construtora.png"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 text-xs sm:text-sm"
                />
                {logoUrl.trim() && (
                  <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={logoUrl.trim()}
                      alt="Logo"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                      onLoad={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'block';
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {isEditing && isConstrutora && allowDelete && (
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Layers className="w-3.5 h-3.5 text-orange-400" />
                  Empreendimentos Cadastrados ({empreendimentosList.length})
                </label>
                <span className="text-[11px] text-slate-500">
                  Exclusão exclusiva do Painel Master
                </span>
              </div>

              {empreendimentosList.length === 0 ? (
                <div className="px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-500 text-center">
                  Nenhum empreendimento vinculado a esta construtora.
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {[...empreendimentosList]
                    .sort((a, b) =>
                      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
                    )
                    .map((emp) => {
                      const isConfirming = confirmDeleteEmpId === emp.id;
                      const isDeletingThis = deletingEmpId === emp.id;
                      return (
                        <div
                          key={emp.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {emp.name}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">
                                {emp.city || 'Sem cidade'}
                                {emp.state ? `/${emp.state}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isConfirming && !isDeletingThis && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteEmpId(null)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
                              >
                                Cancelar
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={Boolean(deletingEmpId) || isSubmitting || isDeleting}
                              onClick={() => handleDeleteEmpreendimento(emp.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                                isConfirming
                                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                  : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {isDeletingThis ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Excluindo...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-3 h-3" />
                                  {isConfirming ? 'Confirmar' : 'Excluir'}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

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
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-xs sm:text-sm shadow-lg cursor-pointer disabled:opacity-50 ${
                isConstrutora
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditing ? 'Salvando...' : 'Cadastrando...'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {isEditing
                    ? 'Salvar Alterações'
                    : isConstrutora
                      ? 'Cadastrar Construtora'
                      : 'Cadastrar Parceiro'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

