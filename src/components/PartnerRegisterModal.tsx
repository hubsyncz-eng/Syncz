import React, { useState } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { PartnerProfile } from '../types/index.ts';
import { Users, X, Loader2, CheckCircle2, Trash2 } from 'lucide-react';

interface PartnerRegisterModalProps {
  onClose: () => void;
  onPartnerCreated?: (partnerId: string) => void;
  partnerToEdit?: PartnerProfile | null;
  canDelete?: boolean;
}

export const PartnerRegisterModal: React.FC<PartnerRegisterModalProps> = ({
  onClose,
  onPartnerCreated,
  partnerToEdit,
  canDelete: propCanDelete,
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
  const allowDelete = propCanDelete !== undefined ? propCanDelete : currentUser?.role !== 'partner';

  const [name, setName] = useState(partnerToEdit?.name || '');
  const [representative, setRepresentative] = useState(partnerToEdit?.representative || partnerToEdit?.name || '');
  const [email, setEmail] = useState(partnerToEdit?.email || '');
  const [phone, setPhone] = useState(partnerToEdit?.phone || '');
  const [cnpj, setCnpj] = useState(partnerToEdit?.cnpj || '');
  const [password, setPassword] = useState(partnerToEdit?.password || 'parceiro123');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cnpj.trim() || !email.trim()) {
      setErrorMsg('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (isEditing && partnerToEdit) {
        await updatePartner(partnerToEdit.id, {
          name: name.trim(),
          representative: (representative.trim() || name.trim()),
          email: email.trim(),
          phone: phone.trim(),
          cnpj: cnpj.trim(),
          segment: partnerToEdit.segment || 'Parceiro Negocial',
          password: password || 'parceiro123',
          allowedAgencyIds: partnerToEdit.allowedAgencyIds,
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
          segment: 'Parceiro Negocial',
          password: password || 'parceiro123',
          allowedAgencyIds: isAgencyCreator && activeAgencyId ? [activeAgencyId] : [],
        });

        if (onPartnerCreated) {
          onPartnerCreated(created.id);
        }
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.message || (isEditing ? 'Erro ao atualizar parceiro.' : 'Erro ao cadastrar parceiro negocial.')
      );
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!partnerToEdit) return;
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
      setErrorMsg(err.message || 'Erro ao excluir parceiro.');
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
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isEditing ? 'Editar Parceiro Negocial' : 'Novo Parceiro Negocial'}
            </h2>
            <p className="text-xs text-slate-400">
              {isEditing
                ? 'Altere os dados cadastrais ou exclua o cadastro do parceiro'
                : 'O Administrador cadastra empresas parceiras para visualização e agendamento'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Razão Social / Nome da Empresa Parceira *
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
                Senha de Acesso do Parceiro *
              </label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ex: parceiro123"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-xs sm:text-sm font-mono"
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
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditing ? 'Salvando...' : 'Cadastrando...'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {isEditing ? 'Salvar Alterações' : 'Cadastrar Parceiro'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

