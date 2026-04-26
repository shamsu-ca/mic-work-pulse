import { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';

const todayStr = () => new Date().toISOString().split('T')[0];

const daysUntil = (dateStr) => {
  const today = new Date(todayStr());
  const target = new Date(dateStr);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hr = parseInt(h);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  const hr12 = hr % 12 || 12;
  return `${hr12}:${m} ${ampm}`;
};

const UrgencyBadge = ({ days }) => {
  if (days < 0)  return null;
  if (days === 0) return <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full uppercase">Today</span>;
  if (days === 1) return <span className="text-[10px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase">Tomorrow</span>;
  return <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">In {days} days</span>;
};

const INPUT_CLS = "bg-slate-50 border border-outline-variant rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full";

function EditAnnouncementModal({ ann, onClose, onSave }) {
  const [title, setTitle]     = useState(ann.title || '');
  const [message, setMessage] = useState(ann.message || '');
  const [date, setDate]       = useState(ann.event_date || '');
  const [time, setTime]       = useState(ann.event_time || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!title.trim() || !date) return;
    setLoading(true);
    await onSave(ann.id, { title: title.trim(), message: message.trim() || null, event_date: date, event_time: time || null });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container">
          <h2 className="font-bold text-base font-headline text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">edit</span> Edit Notice
          </h2>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Title *</label>
            <input required className={INPUT_CLS} value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Message</label>
            <textarea className={INPUT_CLS + " resize-none"} rows={3} value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Event Date *</label>
              <input required type="date" className={INPUT_CLS} value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Event Time</label>
              <input type="time" className={INPUT_CLS} value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
        </form>
        <div className="flex gap-3 px-6 pb-5 border-t border-surface-container pt-4">
          <button type="button" className="flex-1 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl" onClick={onClose}>Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:opacity-90 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[16px]">save</span>{loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ onConfirm, onCancel }) {
  return (
    <span className="flex items-center gap-1.5 flex-shrink-0">
      <button onClick={onConfirm} className="text-[11px] font-bold bg-red-600 text-white px-2.5 py-1 rounded-lg hover:bg-red-700">Confirm</button>
      <button onClick={onCancel}  className="text-[11px] font-bold border border-outline-variant/40 text-on-surface-variant px-2 py-1 rounded-lg hover:bg-surface-container">Cancel</button>
    </span>
  );
}

export default function NotificationsPage() {
  const { getActiveAnnouncements, updateAnnouncement, deleteAnnouncement, currentUser } = useDataContext();
  const isAdmin = currentUser?.role === 'Admin';

  const [editingAnn, setEditingAnn]   = useState(null);
  const [deletingId, setDeletingId]   = useState(null);

  const active = getActiveAnnouncements?.() ?? [];

  const handleDelete = async (id) => {
    await deleteAnnouncement(id);
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col gap-5 max-w-[700px] mx-auto pb-12 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">Notifications</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">
          {active.length > 0 ? `${active.length} active notice${active.length !== 1 ? 's' : ''} for you` : 'No active notices right now'}
        </p>
      </div>

      {active.length === 0 ? (
        <div className="bg-white rounded-2xl border border-outline-variant/30 px-6 py-20 text-center">
          <span className="material-symbols-outlined text-5xl text-outline mb-3 block">notifications_none</span>
          <p className="font-bold text-on-surface-variant">All clear — no notices for you right now.</p>
          <p className="text-sm text-on-surface-variant/70 mt-1">Check back later or ask your admin.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {active.map(ann => {
            const days    = daysUntil(ann.event_date);
            const isToday = days === 0;
            const isDeleting = deletingId === ann.id;
            return (
              <div key={ann.id} className={`bg-white rounded-2xl border flex flex-col gap-3 px-5 py-4 shadow-sm transition-all ${isToday ? 'border-red-300' : days === 1 ? 'border-orange-300' : 'border-primary/20'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${isToday ? 'bg-red-100' : days === 1 ? 'bg-orange-100' : 'bg-primary/10'}`}>
                      <span className={`material-symbols-outlined text-[22px] ${isToday ? 'text-red-600' : days === 1 ? 'text-orange-600' : 'text-primary'}`}
                        style={{ fontVariationSettings: "'FILL' 1" }}>
                        campaign
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-on-surface leading-tight">{ann.title}</h3>
                        <UrgencyBadge days={days} />
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed">{ann.message}</p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                      {isDeleting ? (
                        <DeleteConfirm onConfirm={() => handleDelete(ann.id)} onCancel={() => setDeletingId(null)} />
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingAnn(ann)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => setDeletingId(ann.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-red-50 hover:text-error transition-all"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Date / time strip */}
                <div className={`flex items-center gap-4 flex-wrap rounded-xl px-4 py-2.5 ${isToday ? 'bg-red-50' : days === 1 ? 'bg-orange-50' : 'bg-surface-container-low'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-on-surface-variant">calendar_today</span>
                    <span className="text-xs font-bold text-on-surface">{formatDate(ann.event_date)}</span>
                  </div>
                  {ann.event_time && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-on-surface-variant">schedule</span>
                      <span className="text-xs font-bold text-on-surface">{formatTime(ann.event_time)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingAnn && (
        <EditAnnouncementModal
          ann={editingAnn}
          onClose={() => setEditingAnn(null)}
          onSave={async (id, updates) => { await updateAnnouncement(id, updates); setEditingAnn(null); }}
        />
      )}
    </div>
  );
}
