import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabaseClient';

const DataContext = createContext();

export function SupabaseDataProvider({ children, session }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [containers, setContainers] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });
  const [staffGroup, setStaffGroup] = useState('Office Staff');

  useEffect(() => {
    if (!session?.user) {
      setCurrentUser(null);
      setLoadingInitial(false);
      return;
    }

    const fetchAllData = async () => {
      setLoadingInitial(true);

      try {
        // 1. Fetch current user profile
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id);

        if (profileData && profileData.length > 0) {
          setCurrentUser(profileData[0]);
        } else {
          // Fallback: if DB trigger failed, manually insert a profile
          const { data: newProfile } = await supabase.from('users').insert([{
            id: session.user.id,
            name: session.user.user_metadata?.full_name || 'Unknown User',
            username: session.user.user_metadata?.username || 'unknown',
            role: session.user.user_metadata?.role || 'Assignee',
          }]).select();

          if (newProfile && newProfile.length > 0) {
            setCurrentUser(newProfile[0]);
          } else {
            setCurrentUser({ id: session.user.id, name: 'Guest/Error', role: 'Assignee' });
          }
        }

        // 2. Fetch all profiles
        const { data: allProfiles } = await supabase.from('users').select('*');
        if (allProfiles) setProfiles(allProfiles);

        // 3. Fetch all containers
        const { data: allContainers } = await supabase.from('containers').select('*');
        if (allContainers) setContainers(allContainers);

        // 4. Fetch all work items
        let { data: allWorkItems } = await supabase.from('work_items').select('*');
        if (allWorkItems) {
          const newItems = await checkAndSpawnRecurringTasks(allWorkItems);
          if (newItems && newItems.length > 0) {
            const { data: latestWorkItems } = await supabase.from('work_items').select('*');
            if (latestWorkItems) allWorkItems = latestWorkItems;
          }
          setWorkItems(allWorkItems);
        }

        // 5. Fetch notifications for current user
        const { data: userNotifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        if (userNotifications) setNotifications(userNotifications);

        // 6. Fetch announcements
        const { data: allAnnouncements } = await supabase
          .from('announcements')
          .select('*')
          .order('event_date', { ascending: true });
        if (allAnnouncements) setAnnouncements(allAnnouncements);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchAllData();

    // Realtime subscriptions
    const profilesSub = supabase.channel('public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        supabase.from('users').select('*').then(({ data }) => { if (data) setProfiles(data); });
      }).subscribe();

    const containersSub = supabase.channel('public:containers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'containers' }, () => {
        supabase.from('containers').select('*').then(({ data }) => { if (data) setContainers(data); });
      }).subscribe();

    const workItemsSub = supabase.channel('public:work_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_items' }, () => {
        supabase.from('work_items').select('*').then(({ data }) => { if (data) setWorkItems(data); });
      }).subscribe();

    const notifSub = supabase.channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        supabase.from('notifications').select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => { if (data) setNotifications(data); });
      }).subscribe();

    const annSub = supabase.channel('public:announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        supabase.from('announcements').select('*')
          .order('event_date', { ascending: true })
          .then(({ data }) => { if (data) setAnnouncements(data); });
      }).subscribe();

    return () => {
      supabase.removeChannel(profilesSub);
      supabase.removeChannel(containersSub);
      supabase.removeChannel(workItemsSub);
      supabase.removeChannel(notifSub);
      supabase.removeChannel(annSub);
    };
  }, [session]);

  const checkAndSpawnRecurringTasks = async (cachedItems) => {
    const today = new Date().toISOString().split('T')[0];
    const templates = cachedItems.filter(w => w.is_recurring && w.is_active);
    const candidateTemplates = [];

    for (const template of templates) {
      if (!template.recurrence_rule) continue;
      const lastGenerated = template.last_generated_at;
      if (lastGenerated === today) continue;

      let shouldGenerate = false;
      const rule = template.recurrence_rule;

      if (!lastGenerated) {
        shouldGenerate = true;
      } else {
        const lastDate = new Date(lastGenerated);
        const currentDate = new Date(today);
        const diffDays = Math.ceil(Math.abs(currentDate - lastDate) / (1000 * 60 * 60 * 24));

        if (rule.type === 'daily') {
          if (diffDays >= 1) shouldGenerate = true;
        } else if (rule.type === 'every_x_days' && rule.interval) {
          if (diffDays >= rule.interval) shouldGenerate = true;
        } else if (rule.type === 'weekly' && rule.day !== undefined) {
          if (currentDate.getDay() === rule.day && diffDays >= 7) shouldGenerate = true;
        } else if (rule.type === 'monthly' && rule.date) {
          if (currentDate.getDate() === rule.date && currentDate.getMonth() !== lastDate.getMonth()) shouldGenerate = true;
        } else if (rule.type === 'every_x_months' && rule.interval) {
          const monthDiff = (currentDate.getFullYear() - lastDate.getFullYear()) * 12 + (currentDate.getMonth() - lastDate.getMonth());
          if (monthDiff >= rule.interval) shouldGenerate = true;
        }
      }

      if (shouldGenerate) candidateTemplates.push(template);
    }

    if (candidateTemplates.length === 0) return [];

    // Atomic lock: update last_generated_at ONLY for rows where it is not already today.
    // The first concurrent call claims the rows; any second call finds 0 rows updated and exits.
    const candidateIds = candidateTemplates.map(t => t.id);
    const { data: claimed } = await supabase
      .from('work_items')
      .update({ last_generated_at: today })
      .in('id', candidateIds)
      .or(`last_generated_at.is.null,last_generated_at.neq.${today}`)
      .select('id');

    if (!claimed || claimed.length === 0) return [];

    const claimedIds = new Set(claimed.map(t => t.id));

    const toInsert = candidateTemplates
      .filter(t => claimedIds.has(t.id))
      .map(t => ({
        title: t.title,
        description: t.description,
        type: t.type,
        assignee_id: t.assignee_id,
        container_id: t.container_id,
        estimated_hours: t.estimated_hours,
        priority: t.priority,
        status: 'Assigned',
        expected_date: today,
        is_recurring: false,
      }));

    if (toInsert.length === 0) return [];

    const { data, error } = await supabase.from('work_items').insert(toInsert).select();
    if (error) {
      console.error('Failed to spawn recurring tasks:', error);
      return [];
    }
    return data;
  };

  const startWorkItem = async (itemId) => {
    setWorkItems(prev => prev.map(w => w.id === itemId ? { ...w, status: 'Ongoing', updated_at: new Date().toISOString() } : w));
    await supabase.from('work_items').update({ status: 'Ongoing' }).eq('id', itemId);
  };

  const completeWorkItem = async (itemId, note = '') => {
    const now = new Date().toISOString();
    const updates = { status: 'Completed', completed_at: now, completion_note: note || null };
    setWorkItems(prev => prev.map(w => w.id === itemId ? { ...w, ...updates, updated_at: now } : w));
    await supabase.from('work_items').update(updates).eq('id', itemId);
  };

  const addWorkItem = async (itemData) => {
    const { data, error } = await supabase.from('work_items').insert([itemData]).select();
    if (error) console.error('Error adding work item:', error);
    return { data, error };
  };

  const updateWorkItem = async (id, updates) => {
    setWorkItems(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    const { data, error } = await supabase.from('work_items').update(updates).eq('id', id).select();
    if (error) {
      console.error('Error updating work item:', error);
      supabase.from('work_items').select('*').then(({ data: d }) => { if (d) setWorkItems(d); });
    }
    return { data, error };
  };

  const deleteWorkItem = async (id) => {
    setWorkItems(prev => prev.filter(w => w.id !== id));
    const { error } = await supabase.from('work_items').delete().eq('id', id);
    if (error) {
      console.error('Error deleting work item:', error);
      supabase.from('work_items').select('*').then(({ data: d }) => { if (d) setWorkItems(d); });
    }
    return { error };
  };

  const addContainer = async (containerData) => {
    const { data, error } = await supabase.from('containers').insert([containerData]).select();
    if (error) console.error('Error adding container:', error);
    return { data, error };
  };

  const updateContainer = async (id, updates) => {
    const { data, error } = await supabase.from('containers').update(updates).eq('id', id).select();
    if (error) console.error('Error updating container:', error);
    return { data, error };
  };

  const createUser = async (userData) => {
    const { username, password, full_name, role, department, manager, position, category } = userData;

    if (!supabaseAdmin) {
      return { data: null, error: new Error("Server configuration error: Admin privileges not securely enabled. Please add your VITE_SUPABASE_SERVICE_ROLE_KEY to your .env.local file to use the direct local generator!") };
    }

    const cleanId = username.trim().toLowerCase();
    const email = cleanId.includes('@') ? cleanId : `${cleanId}@erp.mic`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name, role, department, manager, position }
    });

    if (authError) return { data: null, error: authError };

    const { data: insertData, error: insertError } = await supabaseAdmin.from('users').upsert({
      id: authData.user.id,
      name: full_name,
      username: cleanId,
      role: role || 'Assignee',
      department: department || null,
      manager: manager || null,
      position: position || null,
      category: category || 'Office Staff',
    }, { onConflict: 'id' }).select();

    if (insertError) return { data: null, error: insertError };

    const { data: allUsers } = await supabase.from('users').select('*');
    if (allUsers) setProfiles(allUsers);

    return { data: insertData, error: null };
  };

  const updateProfile = async (id, updates) => {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select();
    if (error) {
      console.error('updateProfile error:', error);
      return { data, error };
    }
    if (data && data.length > 0 && id === currentUser?.id) setCurrentUser(data[0]);
    const { data: allProfiles } = await supabase.from('users').select('*');
    if (allProfiles) setProfiles(allProfiles);
    return { data, error };
  };

  const adminUpdateProfile = async (targetUserId, profileUpdates) => {
    const updates = {};
    Object.keys(profileUpdates).forEach(key => {
      if (profileUpdates[key] !== undefined && profileUpdates[key] !== null && profileUpdates[key] !== '') {
        updates[key] = profileUpdates[key];
      }
    });

    // If username changes, we must sync the hidden Supabase authentication email as well
    if (updates.username && supabaseAdmin) {
      const cleanId = updates.username.trim().toLowerCase();
      const email = cleanId.includes('@') ? cleanId : `${cleanId}@erp.mic`;
      await supabaseAdmin.auth.admin.updateUserById(targetUserId, { email });
    }

    const { data, error } = await supabase.from('users').update(updates).eq('id', targetUserId).select();
    if (!error) {
      const { data: allProfiles } = await supabase.from('users').select('*');
      if (allProfiles) setProfiles(allProfiles);
    }
    return { data, error };
  };

  const adminResetUserPassword = async (targetUserId, newPassword) => {
    if (!supabaseAdmin) return { data: null, error: new Error("Admin configuration missing: Need Service Role key.") };
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, { password: newPassword });
    return { data, error };
  };

  const adminUpdateUser = async (targetUserId, { newPassword, newUsername }) => {
    if (!supabaseAdmin) return { data: null, error: new Error("Admin configuration missing: Need Service Role key.") };
    const updates = {};
    if (newPassword) updates.password = newPassword;
    if (newUsername) {
      const cleanId = newUsername.trim().toLowerCase();
      updates.email = cleanId.includes('@') ? cleanId : `${cleanId}@erp.mic`;
    }
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, updates);
    return { data, error };
  };

  const markNotificationRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const getUnreadNotifications = () => notifications.filter(n => !n.is_read);

  // Announcements
  const getActiveAnnouncements = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date(today + 'T00:00:00');
    return announcements.filter(a => {
      const eventDate = new Date(a.event_date + 'T00:00:00');
      return todayDate <= eventDate;
    });
  };

  const getDynamicNotificationText = (ann) => {
    if (ann.type === 'Text') {
      return '';
    }

    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date(today + 'T00:00:00');
    const eventDate = new Date(ann.event_date + 'T00:00:00');
    
    const diffTime = eventDate - todayDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      let displayTime = 'All Day';
      if (ann.event_time) {
        const [h, m] = ann.event_time.split(':');
        let hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        displayTime = `${hour}:${m} ${ampm}`;
      }
      return `Today @ ${displayTime}`;
    }

    const plural = diffDays === 1 ? 'day' : 'days';
    return `${diffDays} ${plural} left`;
  };

  const addAnnouncement = async (announcementData) => {
    const { data, error } = await supabase.from('announcements').insert([announcementData]).select();
    if (error) console.error('Error adding announcement:', error);
    return { data, error };
  };

  const updateAnnouncement = async (id, updates) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    const { data, error } = await supabase.from('announcements').update(updates).eq('id', id).select();
    if (error) {
      console.error('Error updating announcement:', error);
      supabase.from('announcements').select('*').order('event_date', { ascending: true }).then(({ data: d }) => { if (d) setAnnouncements(d); });
    }
    return { data, error };
  };

  const deleteAnnouncement = async (id) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      console.error('Error deleting announcement:', error);
      supabase.from('announcements').select('*').order('event_date', { ascending: true }).then(({ data: d }) => { if (d) setAnnouncements(d); });
    }
    return { error };
  };

  return (
    <DataContext.Provider value={{
      currentUser,
      profiles,
      containers,
      workItems,
      notifications,
      announcements,
      dateFilter,
      setDateFilter,
      staffGroup,
      setStaffGroup,
      customDateRange,
      setCustomDateRange,
      loadingInitial,
      getUnreadNotifications,
      markNotificationRead,
      getActiveAnnouncements,
      getDynamicNotificationText,
      addAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      startWorkItem,
      completeWorkItem,
      addWorkItem,
      updateWorkItem,
      deleteWorkItem,
      addContainer,
      updateContainer,
      createUser,
      updateProfile,
      adminUpdateProfile,
      adminResetUserPassword,
      adminUpdateUser,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext() {
  return useContext(DataContext);
}
