import React, { useState } from 'react';
import { RealtimeProvider, useRealtime } from './context/RealtimeContext.tsx';
import { Header } from './components/Header.tsx';
import { LoginPortal } from './components/LoginPortal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AgencyDashboard } from './components/AgencyDashboard.tsx';
import { PartnerView } from './components/PartnerView.tsx';
import { AgencyRegisterModal } from './components/AgencyRegisterModal.tsx';
import { PartnerRegisterModal } from './components/PartnerRegisterModal.tsx';
import { BatchScheduleModal } from './components/BatchScheduleModal.tsx';
import { SingleSlotModal } from './components/SingleSlotModal.tsx';
import { BookingModal } from './components/BookingModal.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { TimeSlot, Booking } from './types/index.ts';

const MainLayout: React.FC = () => {
  const { currentUser } = useRealtime();

  // Modals state
  const [isAgencyRegisterModalOpen, setIsAgencyRegisterModalOpen] = useState(false);
  const [isPartnerRegisterModalOpen, setIsPartnerRegisterModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isSingleSlotModalOpen, setIsSingleSlotModalOpen] = useState(false);
  const [bookingModalData, setBookingModalData] = useState<{ slot: TimeSlot; booking?: Booking } | null>(null);

  const handleBookingSuccess = () => {
    setBookingModalData(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Header */}
      <Header />

      {/* Main Container - Conditional by Role / Session */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {!currentUser ? (
          <LoginPortal />
        ) : currentUser.role === 'admin' ? (
          <AdminDashboard
            onOpenAgencyRegisterModal={() => setIsAgencyRegisterModalOpen(true)}
            onOpenPartnerRegisterModal={() => setIsPartnerRegisterModalOpen(true)}
            onOpenBatchModal={() => setIsBatchModalOpen(true)}
            onOpenSingleSlotModal={() => setIsSingleSlotModalOpen(true)}
            onBookSlot={(slot) => setBookingModalData({ slot })}
          />
        ) : currentUser.role === 'agency' ? (
          <AgencyDashboard
            onOpenBatchModal={() => setIsBatchModalOpen(true)}
            onOpenSingleSlotModal={() => setIsSingleSlotModalOpen(true)}
          />
        ) : (
          <PartnerView
            onBookSlot={(slot, booking) => setBookingModalData({ slot, booking })}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 tracking-tight text-base">
              Syncz
            </span>
            <span>• Plataforma de Agendamentos & Parcerias</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Confirmação Automática Ativa</span>
            <span>•</span>
            <span>Visualização em Tempo Real</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isAgencyRegisterModalOpen && (
        <AgencyRegisterModal
          onClose={() => setIsAgencyRegisterModalOpen(false)}
        />
      )}

      {isPartnerRegisterModalOpen && (
        <PartnerRegisterModal
          onClose={() => setIsPartnerRegisterModalOpen(false)}
        />
      )}

      {isBatchModalOpen && (
        <BatchScheduleModal onClose={() => setIsBatchModalOpen(false)} />
      )}

      {isSingleSlotModalOpen && (
        <SingleSlotModal onClose={() => setIsSingleSlotModalOpen(false)} />
      )}

      {bookingModalData && (
        <BookingModal
          slot={bookingModalData.slot}
          existingBooking={bookingModalData.booking}
          onClose={() => setBookingModalData(null)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {/* Floating Notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <RealtimeProvider>
      <MainLayout />
    </RealtimeProvider>
  );
}
