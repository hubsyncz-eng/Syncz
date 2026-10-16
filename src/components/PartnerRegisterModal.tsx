import React, { useState } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { Users, X, Loader2, CheckCircle2, Building2 } from 'lucide-react';

interface PartnerRegisterModalProps {
  onClose: () => void;
  onPartnerCreated?: (partnerId: string) => void;
}

export const PartnerRegisterModal: React.FC<PartnerRegisterModalProps> = ({
  onClose,
  onPartnerCreated,
}) => {
  const { registerPartner } = useRealtime();

  const [name, setName] = useState('');
  const [representative, setRepresentative] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [segment, setSegment] = useState('Logística e Supply Chain');
  const [password, setPassword] = useState('parceiro123');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !representative.trim() || !email.trim()) {
      setErrorMsg('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await registerPartner({
        name: name.trim(),
        representative: representative.trim(),
        email: email.trim(),
        phone: phone.trim(),
        cnpj: cnpj.trim() || '00.000.000/0001-00',
        segment,
        password: password || 'parceiro123',
      });

      if (onPartnerCreated) {
        onPartnerCreated(created.id);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao cadastrar parceiro negocial.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-white shadow-2xl relative my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
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
              Cadastrar Novo Parceiro Negocial
            </h2>
            <p className="text-xs text-slate-400">
              O Administrador cadastra empresas parceiras para visualização e agendamento
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
                CNPJ da Empresa
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Segmento de Atuação
              </label>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
              >
                <option value="Logística e Supply Chain">Logística e Supply Chain</option>
                <option value="Tecnologia & Fintech">Tecnologia & Fintech</option>
                <option value="Varejo & Distribuição">Varejo & Distribuição</option>
                <option value="Energia & Sustentabilidade">Energia & Sustentabilidade</option>
                <option value="Saúde & Benefícios">Saúde & Benefícios</option>
                <option value="Indústria & Manufatura">Indústria & Manufatura</option>
                <option value="Serviços Corporativos">Serviços Corporativos</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome do Representante / Negociador *
              </label>
              <input
                type="text"
                required
                value={representative}
                onChange={(e) => setRepresentative(e.target.value)}
                placeholder="Ex: Carlos Eduardo Silveira"
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
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Cadastrar Parceiro
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
