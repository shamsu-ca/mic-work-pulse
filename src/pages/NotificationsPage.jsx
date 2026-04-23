import { useDataContext } from '../context/SupabaseDataContext';

const todayStr  = () => new Date().toISOString().split('T')[0];

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

export default function NotificationsPage() {
  const { getActiveAnnouncements, announcements } = useDataContext();

  const active = getActiveAnnouncements?.() ?? [];

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
            const days = daysUntil(ann.event_date);
            const isToday = days === 0;
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
    </div>
  );
}
