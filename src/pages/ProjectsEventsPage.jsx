import React, { useState } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import CreateModal from '../components/common/CreateModal';

export default function ProjectsEventsPage() {
  const { containers, currentUser } = useDataContext();
  const [activeTab, setActiveTab] = useState('Projects'); // Projects vs Events
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'U';
    const split = name.split(' ');
    if (split.length > 1) return (split[0][0] + split[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  let dbContainers = containers || [];
  if (currentUser?.role === 'Assignee') {
    dbContainers = dbContainers.filter(t => t.created_by === currentUser.id);
  }

  const activeProjects = dbContainers.filter(c => c.type === 'Project' && c.progress > 0 && c.progress < 100);
  const activeEvents = dbContainers.filter(c => c.type === 'Event' && c.progress > 0 && c.progress < 100);
  
  const displayList = activeTab === 'Projects' ? activeProjects : activeEvents;

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1 font-headline">Portfolio Dashboard</h1>
          <p className="text-on-surface-variant font-medium text-sm">Strategic overview of all key initiatives and events.</p>
        </div>
        <div className="flex gap-4 items-center">
            <button className="bg-white border border-outline-variant/40 rounded-lg px-4 py-2 text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[18px]">save</span> Save Template
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[18px]">add</span> New {activeTab === 'Projects' ? 'Project' : 'Event'}
            </button>
        </div>
      </div>

      <div className="flex gap-6 border-b border-surface-container-high">
        <button 
          className={`pb-3 text-sm font-bold tracking-wide transition-colors relative ${activeTab === 'Projects' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          onClick={() => setActiveTab('Projects')}
        >
          {activeTab === 'Projects' && <span className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"></span>}
          Key Projects
        </button>
        <button 
          className={`pb-3 text-sm font-bold tracking-wide transition-colors relative ${activeTab === 'Events' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          onClick={() => setActiveTab('Events')}
        >
          {activeTab === 'Events' && <span className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"></span>}
          Upcoming Events
        </button>
        <button 
          className="pb-3 text-sm font-bold tracking-wide transition-colors relative text-on-surface-variant hover:text-on-surface ml-auto"
          onClick={() => setActiveTab('Templates')}
        >
          Saved Templates
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* KPI Summary col (1/4) */}
        <div className="md:col-span-1 flex flex-col gap-4">
           <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Active {activeTab}</h3>
              <p className="text-4xl font-extrabold font-headline text-on-surface">{displayList.length < 10 ? `0${displayList.length}` : displayList.length}</p>
           </div>
           
           {activeTab === 'Projects' && (
             <div className="bg-error-container/30 rounded-xl shadow-sm border border-error/20 p-5">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-error mb-2">At Risk</h3>
                <p className="text-4xl font-extrabold font-headline text-error">02</p>
             </div>
           )}

           <div className="bg-surface-container-low rounded-xl shadow-sm border border-outline-variant/30 p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Completed YTD</h3>
              <p className="text-4xl font-extrabold font-headline text-on-surface">14</p>
           </div>
        </div>

        {/* Data Cards (3/4) */}
        <div className="md:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
           {displayList.map(item => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-6 flex flex-col">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${item.progress < 20 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                             {item.progress < 20 ? 'Planning' : 'On Track'}
                          </span>
                       </div>
                       <h3 className="text-lg font-bold text-on-surface">{item.title}</h3>
                    </div>
                    <button className="text-on-surface-variant hover:bg-surface-dim p-1 rounded transition-colors"><span className="material-symbols-outlined text-[20px]">more_vert</span></button>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                       <p className="text-[10px] uppercase font-bold text-outline">Start Date</p>
                       <p className="text-sm font-medium text-on-surface-variant">01 Sept 2026</p>
                    </div>
                    <div>
                       <p className="text-[10px] uppercase font-bold text-outline">Target Deadline</p>
                       <p className="text-sm font-medium text-on-surface-variant">15 Nov 2026</p>
                    </div>
                 </div>

                 <div className="mt-auto">
                    <div className="flex justify-between text-xs font-bold mb-2">
                       <span className="text-on-surface-variant">Progress</span>
                       <span className="text-primary">{item.progress}%</span>
                    </div>
                    <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                       <div className="h-full bg-primary rounded-full transition-all duration-500" style={{width: `${item.progress}%`}}></div>
                    </div>
                 </div>
                 
                 <div className="mt-6 flex justify-between items-center border-t border-surface-container pt-4">
                    <div className="flex -space-x-2">
                       {/* Mock avatars */}
                       <div className="w-8 h-8 rounded-full border-2 border-white bg-error-container text-on-error-container flex items-center justify-center text-[10px] font-bold z-30">AB</div>
                       <div className="w-8 h-8 rounded-full border-2 border-white bg-primary-container text-on-primary-container flex items-center justify-center text-[10px] font-bold z-20">CD</div>
                       <div className="w-8 h-8 rounded-full border-2 border-white bg-surface-dim text-on-surface-variant flex items-center justify-center text-[10px] font-bold z-10">+3</div>
                    </div>
                    <button className="text-sm font-bold text-primary hover:text-primary-container transition-colors">View Details</button>
                 </div>
              </div>
           ))}
           {displayList.length === 0 && (
             <div className="lg:col-span-2 p-12 text-center border-2 border-dashed border-outline-variant/30 rounded-xl">
               <span className="material-symbols-outlined text-4xl text-outline mb-2">inbox</span>
               <p className="text-on-surface-variant font-medium">No active {activeTab.toLowerCase()} found.</p>
             </div>
           )}
        </div>
      </div>

      <CreateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        defaultType={activeTab === 'Projects' ? 'Project' : 'Event'}
      />
    </div>
  );
}
