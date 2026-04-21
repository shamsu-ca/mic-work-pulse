import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const DataContext = createContext();

export function SupabaseDataProvider({ children, session }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [containers, setContainers] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [staffGroup, setStaffGroup] = useState('Office Staff');
  const [dateFilter, setDateFilter] = useState('today'); // today | week | month | custom
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    if (!session?.user) {
      setCurrentUser(null);
      setLoadingInitial(false);
      return;
    }

    const fetchAllData = async () => {
      setLoadingInitial(true);
      
      try {
        // 1. Fetch current user profile safely without .single() throwing
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id);
        
        if (profileData && profileData.length > 0) {
           setCurrentUser(profileData[0]);
        } else {
           // Fallback: If DB trigger failed, manually insert a profile for this authenticated session so they aren't locked out permanently
           const { data: newProfile } = await supabase.from('profiles').insert([{ 
             id: session.user.id, 
             name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Unknown User',
             role: session.user.user_metadata?.role || 'Assignee',
             staff_group: session.user.user_metadata?.staff_group || 'Office Staff' 
           }]).select();
           
           if (newProfile && newProfile.length > 0) {
             setCurrentUser(newProfile[0]);
           } else {
             // Absolute worst case fallback to allow application to load
             setCurrentUser({ id: session.user.id, name: 'Guest/Error', role: 'Assignee' });
           }
        }

        // 2. Fetch all profiles (for Assignee dropdowns, Admin views)
        const { data: allProfiles } = await supabase.from('profiles').select('*');
        if (allProfiles) setProfiles(allProfiles);

        // 3. Fetch all containers (Projects/Events)
        const { data: allContainers } = await supabase.from('containers').select('*');
        if (allContainers) setContainers(allContainers);

        // 4. Fetch all work items
        let { data: allWorkItems } = await supabase.from('work_items').select('*');
        if (allWorkItems) {
            // Check and spawn recurring tasks
            const newItems = await checkAndSpawnRecurringTasks(allWorkItems);
            // Re-fetch if we spawned new ones
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

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchAllData();

    // Setup Realtime Subscriptions
    const profilesSub = supabase.channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
         supabase.from('profiles').select('*').then(({data}) => { if(data) setProfiles(data); });
      }).subscribe();

    const containersSub = supabase.channel('public:containers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'containers' }, payload => {
         supabase.from('containers').select('*').then(({data}) => { if(data) setContainers(data); });
      }).subscribe();

    const workItemsSub = supabase.channel('public:work_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_items' }, payload => {
         supabase.from('work_items').select('*').then(({data}) => { if(data) setWorkItems(data); });
      }).subscribe();

    const notifSub = supabase.channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, payload => {
         supabase.from('notifications').select('*').eq('user_id', session.user.id)
           .order('created_at', { ascending: false })
           .then(({data}) => { if(data) setNotifications(data); });
      }).subscribe();

    return () => {
      supabase.removeChannel(profilesSub);
      supabase.removeChannel(containersSub);
      supabase.removeChannel(workItemsSub);
      supabase.removeChannel(notifSub);
    };
  }, [session]);

  const checkAndSpawnRecurringTasks = async (cachedItems) => {
    const today = new Date().toISOString().split('T')[0];
    const templates = cachedItems.filter(w => w.is_recurring && w.is_active);
    const newInstancesToInsert = [];
    const templatesToUpdate = [];

    for (const template of templates) {
      if (!template.recurrence_rule) continue;
      
      const lastGenerated = template.last_generated_at;
      if (lastGenerated === today) continue; // Already generated today

      let shouldGenerate = false;
      const rule = template.recurrence_rule;

      if (!lastGenerated) {
          shouldGenerate = true; // First time
      } else {
          // Simple rule evaluation
          const lastDate = new Date(lastGenerated);
          const currentDate = new Date(today);
          const diffTime = Math.abs(currentDate - lastDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (rule.type === 'daily') {
              if (diffDays >= 1) shouldGenerate = true;
          } else if (rule.type === 'every_x_days' && rule.interval) {
              if (diffDays >= rule.interval) shouldGenerate = true;
          } else if (rule.type === 'weekly' && rule.day !== undefined) {
              // day: 0=Sun, 1=Mon, ..., 6=Sat
              if (currentDate.getDay() === rule.day && diffDays >= 7) shouldGenerate = true;
          } else if (rule.type === 'monthly' && rule.date) {
              if (currentDate.getDate() === rule.date && currentDate.getMonth() !== lastDate.getMonth()) shouldGenerate = true;
          } else if (rule.type === 'every_x_months' && rule.interval) {
              const monthDiff = (currentDate.getFullYear() - lastDate.getFullYear()) * 12 + (currentDate.getMonth() - lastDate.getMonth());
              if (monthDiff >= rule.interval) shouldGenerate = true;
          }
      }

      if (shouldGenerate) {
          newInstancesToInsert.push({
              title: template.title,
              description: template.description,
              type: template.type,
              assignee_id: template.assignee_id,
              container_id: template.container_id,
              estimated_hours: template.estimated_hours,
              priority: template.priority,
              status: 'Assigned',
              expected_date: today,
              is_recurring: false // instances are not recurring templates
          });
          templatesToUpdate.push(template.id);
      }
    }

    if (newInstancesToInsert.length > 0) {
        const { data, error } = await supabase.from('work_items').insert(newInstancesToInsert).select();
        if (error) {
            console.error('Failed to spawn recurring tasks:', error);
            return [];
        }
        
        // Update last_generated_at on templates
        for (const tid of templatesToUpdate) {
            await supabase.from('work_items').update({ last_generated_at: today }).eq('id', tid);
        }
        return data;
    }
    return [];
  };

  const startWorkItem = async (itemId) => {
    await supabase.from('work_items').update({ status: 'Ongoing' }).eq('id', itemId);
  };

  const completeWorkItem = async (itemId) => {
    await supabase.from('work_items').update({ status: 'Completed' }).eq('id', itemId);
  };

  const addWorkItem = async (itemData) => {
    const { data, error } = await supabase.from('work_items').insert([itemData]).select();
    if (error) console.error("Error adding work item:", error);
    return { data, error };
  };

  const updateWorkItem = async (id, updates) => {
    const { data, error } = await supabase.from('work_items').update(updates).eq('id', id).select();
    if (error) console.error("Error updating work item:", error);
    return { data, error };
  };

  const deleteWorkItem = async (id) => {
    const { error } = await supabase.from('work_items').delete().eq('id', id);
    if (error) console.error("Error deleting work item:", error);
    return { error };
  };

  const addContainer = async (containerData) => {
    const { data, error } = await supabase.from('containers').insert([containerData]).select();
    if (error) console.error("Error adding container:", error);
    return { data, error };
  };

  const updateContainer = async (id, updates) => {
    const { data, error } = await supabase.from('containers').update(updates).eq('id', id).select();
    if (error) console.error("Error updating container:", error);
    return { data, error };
  };

  const deleteContainer = async (id) => {
    const { error } = await supabase.from('containers').delete().eq('id', id);
    if (error) console.error("Error deleting container:", error);
    return { error };
  };

  // User Management
  const createUser = async (userData) => {
    const { email, password, full_name, role, staff_group, department, manager } = userData;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role,
          staff_group: staff_group || 'Office Staff',
          department,
          manager,
        }
      }
    });

    // Use upsert to guarantee email is stored in profiles
    // (avoids race condition with the DB trigger)
    if (!error && data?.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: full_name,
        role: role || 'Assignee',
        staff_group: staff_group || 'Office Staff',
        department: department || null,
        manager: manager || null,
        email,
      }, { onConflict: 'id' });
    }

    return { data, error };
  };

  const updateProfile = async (id, updates) => {
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select();
    if (error) {
      console.error('updateProfile error:', error);
      return { data, error };
    }
    // Refresh current user state if they updated themselves
    if (data && data.length > 0 && id === currentUser?.id) {
      setCurrentUser(data[0]);
    }
    // Always refresh the full profiles list so the table re-renders
    const { data: allProfiles } = await supabase.from('profiles').select('*');
    if (allProfiles) setProfiles(allProfiles);
    return { data, error };
  };

  // Admin: update profile fields - direct update
  const adminUpdateProfile = async (targetUserId, profileUpdates) => {
    // Filter out undefined/null values
    const updates = {};
    Object.keys(profileUpdates).forEach(key => {
      if (profileUpdates[key] !== undefined && profileUpdates[key] !== null && profileUpdates[key] !== '') {
        updates[key] = profileUpdates[key];
      }
    });
    
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', targetUserId).select();
    if (!error) {
      const { data: allProfiles } = await supabase.from('profiles').select('*');
      if (allProfiles) setProfiles(allProfiles);
    }
    return { data, error };
  };

  // Admin: reset password
  const adminResetUserPassword = async (targetUserId, newPassword) => {
    // Use edge function only - password reset requires auth admin
    const { data, error } = await supabase.functions.invoke('update-user-password', {
      body: { action: 'resetPassword', targetUserId, newPassword }
    });
    return { data, error };
  };

  // Admin: update password and/or email via edge function
  const adminUpdateUser = async (targetUserId, { newPassword, newEmail }) => {
    const { data, error } = await supabase.functions.invoke('update-user-password', {
      body: { action: 'resetPassword', targetUserId, newPassword, newEmail }
    });
    return { data, error };
  };

  // Notifications
  const markNotificationRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const getUnreadNotifications = () => {
    return notifications.filter(n => !n.is_read);
  };

  return (
    <DataContext.Provider value={{
      currentUser,
      profiles,
      containers,
      workItems,
      notifications,
      staffGroup,
      setStaffGroup,
      dateFilter,
      setDateFilter,
      customDateRange,
      setCustomDateRange,
      getUnreadNotifications,
      markNotificationRead,
      startWorkItem,
      completeWorkItem,
      addWorkItem,
      updateWorkItem,
      deleteWorkItem,
      addContainer,
      updateContainer,
      deleteContainer,
      createUser,
      updateProfile,
      adminUpdateProfile,
      adminResetUserPassword,
      adminUpdateUser,
      loadingInitial
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext() {
  return useContext(DataContext);
}
