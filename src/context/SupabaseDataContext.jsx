import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const DataContext = createContext();

import { getISTDateString, getNextDayString } from '../lib/dateUtils';

const getNextWorkingDay = (dateStr) => getNextDayString(dateStr);

const getEffectiveUser = (user, allProfiles) => {
  if (!user) return null;
  if (user.role === 'Assignee') {
    const hasReports = allProfiles.some(p => p.manager && p.manager === user.name);
    if (hasReports) {
      return { ...user, role: 'Manager' };
    }
  }
  return user;
};

export function SupabaseDataProvider({ children, session }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [containers, setContainers] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [savedContainers, setSavedContainers] = useState([]);
  const [savedTasks, setSavedTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });
  const [staffGroup, setStaffGroup] = useState('Office Staff');

  const fetchAllFromTable = async (tableName, orderCol = 'created_at', ascending = false) => {
    let allData = [];
    let from = 0;
    const step = 1000;
    let keepFetching = true;

    while (keepFetching) {
      let query = supabase.from(tableName).select('*');
      if (orderCol) {
        query = query.order(orderCol, { ascending });
      }
      const { data, error } = await query.range(from, from + step - 1);

      if (error || !data || data.length === 0) {
        keepFetching = false;
      } else {
        allData = allData.concat(data);
        if (data.length < step) {
          keepFetching = false;
        } else {
          from += step;
        }
      }
    }
    return allData;
  };

  useEffect(() => {
    if (!session?.id) {
      setCurrentUser(null);
      setLoadingInitial(false);
      return;
    }

    const fetchAllData = async () => {
      setLoadingInitial(true);

      try {
        // 2. Fetch all profiles
        const { data: allProfiles } = await supabase.from('users').select('*');
        if (allProfiles) setProfiles(allProfiles);

        // 1. Fetch current user profile
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.id);

        if (profileData && profileData.length > 0) {
          const userObj = profileData[0];
          if (userObj.is_active === false) {
            // Force logout if deactivated
            localStorage.removeItem('workpulse_session');
            window.dispatchEvent(new Event('workpulse_auth_change'));
            setCurrentUser(null);
            setLoadingInitial(false);
            return;
          }
          const effectiveUser = getEffectiveUser(userObj, allProfiles || []);
          setCurrentUser(effectiveUser);
        } else {
          // If the profile no longer exists in the DB, log out
          localStorage.removeItem('workpulse_session');
          window.dispatchEvent(new Event('workpulse_auth_change'));
          setCurrentUser(null);
          setLoadingInitial(false);
          return;
        }

        // 3. Fetch all containers (active only — no templates)
        const { data: allContainers } = await supabase.from('containers').select('*');
        if (allContainers) setContainers(allContainers);

        // 4. Fetch saved containers (project/event templates)
        const { data: allSavedContainers } = await supabase.from('saved_containers').select('*');
        if (allSavedContainers) setSavedContainers(allSavedContainers);

        // 5. Fetch saved tasks (recurring templates + items inside saved containers)
        const { data: allSavedTasks } = await supabase.from('saved_tasks').select('*');
        if (allSavedTasks) setSavedTasks(allSavedTasks);

        // 5.5 Fetch absences (needed for recurring tasks)
        const { data: allAbsences } = await supabase.from('absences').select('*');
        if (allAbsences) setAbsences(allAbsences);

        // 5.6 Fetch leave_requests
        const { data: allLeaves } = await supabase.from('leave_requests').select('*');
        if (allLeaves) setLeaveRequests(allLeaves);

        // 6. Fetch work items directly (paginated to ensure >1000 items load)
        const allWorkItems = await fetchAllFromTable('work_items', 'created_at', false);
        if (allWorkItems) {
          setWorkItems(allWorkItems);
        }

        // 7. Fetch notifications for current user
        const { data: userNotifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', session.id)
          .order('created_at', { ascending: false });
        if (userNotifications) setNotifications(userNotifications);

        // 8. Fetch announcements
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
        supabase.from('users').select('*').then(({ data }) => {
          if (data) {
            setProfiles(data);
            setCurrentUser(prev => {
              if (!prev) return null;
              const currentProfile = data.find(p => p.id === prev.id);
              if (currentProfile) {
                return getEffectiveUser(currentProfile, data);
              }
              return prev;
            });
          }
        });
      }).subscribe();

    const containersSub = supabase.channel('public:containers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'containers' }, () => {
        supabase.from('containers').select('*').then(({ data }) => { if (data) setContainers(data); });
      }).subscribe();

    const savedContainersSub = supabase.channel('public:saved_containers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_containers' }, () => {
        supabase.from('saved_containers').select('*').then(({ data }) => { if (data) setSavedContainers(data); });
      }).subscribe();

    const savedTasksSub = supabase.channel('public:saved_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_tasks' }, () => {
        supabase.from('saved_tasks').select('*').then(({ data }) => { if (data) setSavedTasks(data); });
      }).subscribe();

    const workItemsSub = supabase.channel('public:work_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_items' }, () => {
        fetchAllFromTable('work_items', 'created_at', false).then(data => { if (data) setWorkItems(data); });
      }).subscribe();

    const notifSub = supabase.channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        supabase.from('notifications').select('*')
          .eq('user_id', session.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => { if (data) setNotifications(data); });
      }).subscribe();

    const annSub = supabase.channel('public:announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        supabase.from('announcements').select('*')
          .order('event_date', { ascending: true })
          .then(({ data }) => { if (data) setAnnouncements(data); });
      }).subscribe();

    const absencesSub = supabase.channel('public:absences')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absences' }, () => {
        supabase.from('absences').select('*').then(({ data }) => { if (data) setAbsences(data); });
      }).subscribe();

    const leavesSub = supabase.channel('public:leave_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
        supabase.from('leave_requests').select('*').then(({ data }) => { if (data) setLeaveRequests(data); });
      }).subscribe();

    // Auto-sync on window focus / tab visibility change (e.g. waking computer or returning to tab)
    const handleFocusSync = () => {
      if (document.visibilityState === 'visible') {
        fetchAllData();
      }
    };
    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);

    // Background 30-second polling fallback to ensure state stays in sync even if WebSocket drops
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAllFromTable('work_items', 'created_at', false).then(data => { if (data) setWorkItems(data); });
        supabase.from('saved_tasks').select('*').then(({ data }) => { if (data) setSavedTasks(data); });
      }
    }, 30000);


    return () => {
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
      clearInterval(pollInterval);
      supabase.removeChannel(profilesSub);
      supabase.removeChannel(containersSub);
      supabase.removeChannel(savedContainersSub);
      supabase.removeChannel(savedTasksSub);
      supabase.removeChannel(workItemsSub);
      supabase.removeChannel(notifSub);
      supabase.removeChannel(annSub);
      supabase.removeChannel(absencesSub);
      supabase.removeChannel(leavesSub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);



  const startWorkItem = async (itemId) => {
    setWorkItems(prev => prev.map(w => w.id === itemId ? { ...w, status: 'Ongoing', updated_at: new Date().toISOString() } : w));
    await supabase.from('work_items').update({ status: 'Ongoing' }).eq('id', itemId);
  };

  const completeWorkItem = async (itemId, { note, tag } = {}) => {
    const now = new Date().toISOString();
    const updates = { status: 'Completed', completed_at: now, completion_note: note || null, completion_tag: tag || null };
    setWorkItems(prev => prev.map(w => w.id === itemId ? { ...w, ...updates, updated_at: now } : w));
    await supabase.from('work_items').update(updates).eq('id', itemId);
  };

  const createFollowUpTask = async (completedItemId, { title, description, assigneeId, dueDate, dueTime, priority, linkType, type, container_id }) => {
    const { data, error } = await supabase.from('work_items').insert([{
      title, description: description || null,
      assignee_id: assigneeId || null, expected_date: dueDate || null,
      due_time: dueTime || null,
      priority: priority || 'Medium', status: 'Assigned',
      type: type || 'Task',
      container_id: container_id || null,
      linked_to: completedItemId, link_type: linkType || null,
      created_by: currentUser?.id || null, is_recurring: false,
    }]).select();
    if (data) setWorkItems(prev => [...prev, ...data]);
    return { data, error };
  };

  const addWorkItem = async (itemData) => {
    const { data, error } = await supabase.from('work_items').insert([itemData]).select();
    if (error) {
      console.error('Error adding work item:', error);
    } else if (data && data.length > 0) {
      setWorkItems(prev => [...prev, ...data]);
      fetchAllFromTable('work_items', 'created_at', false).then(d => { if (d) setWorkItems(d); });
    }
    return { data, error };
  };

  const updateWorkItem = async (id, updates) => {
    setWorkItems(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    const { data, error } = await supabase.from('work_items').update(updates).eq('id', id).select();
    if (error) {
      console.error('Error updating work item:', error);
      fetchAllFromTable('work_items', 'created_at', false).then(d => { if (d) setWorkItems(d); });
    }
    return { data, error };
  };

  const deleteWorkItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) return { error: null };
    setWorkItems(prev => prev.filter(w => w.id !== id));
    const { error } = await supabase.from('work_items').delete().eq('id', id);
    if (error) {
      console.error('Error deleting work item:', error);
      fetchAllFromTable('work_items', 'created_at', false).then(d => { if (d) setWorkItems(d); });
    }
    return { error };
  };

  // ── Saved containers (project/event templates) ────────────────────────────

  const addSavedContainer = async (containerData) => {
    const { data, error } = await supabase.from('saved_containers').insert([containerData]).select();
    if (error) console.error('Error adding saved container:', error);
    return { data, error };
  };

  const updateSavedContainer = async (id, updates) => {
    setSavedContainers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    const { data, error } = await supabase.from('saved_containers').update(updates).eq('id', id).select();
    if (error) {
      console.error('Error updating saved container:', error);
      supabase.from('saved_containers').select('*').then(({ data: d }) => { if (d) setSavedContainers(d); });
    }
    return { data, error };
  };

  const deleteSavedContainer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) return { error: null };
    setSavedContainers(prev => prev.filter(c => c.id !== id));
    const { error } = await supabase.from('saved_containers').delete().eq('id', id);
    if (error) {
      console.error('Error deleting saved container:', error);
      supabase.from('saved_containers').select('*').then(({ data: d }) => { if (d) setSavedContainers(d); });
    }
    return { error };
  };

  // ── Saved tasks (recurring templates + items inside saved containers) ──────

  const addSavedTask = async (taskData) => {
    const payload = { ...taskData };
    if (payload.is_recurring) {
      payload.last_generated_at = null; // Do not block generation today
    }
    const { data, error } = await supabase.from('saved_tasks').insert([payload]).select();
    if (error) {
      console.error('Error adding saved task:', error);
      return { data, error };
    }
    if (data && data.length > 0) {
      setSavedTasks(prev => [...prev, ...data]);
      // Re-fetch work items so any auto-spawned work item from DB trigger immediately reflects in UI state
      const freshWi = await fetchAllFromTable('work_items', 'created_at', false);
      if (freshWi) setWorkItems(freshWi);
    }
    return { data, error };
  };


  const updateSavedTask = async (id, updates) => {
    setSavedTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    const { data, error } = await supabase.from('saved_tasks').update(updates).eq('id', id).select();
    if (error) {
      console.error('Error updating saved task:', error);
      supabase.from('saved_tasks').select('*').then(({ data: d }) => { if (d) setSavedTasks(d); });
    }
    return { data, error };
  };

  const deleteSavedTask = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) return { error: null };
    setSavedTasks(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from('saved_tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting saved task:', error);
      supabase.from('saved_tasks').select('*').then(({ data: d }) => { if (d) setSavedTasks(d); });
    }
    return { error };
  };

  // ── Containers (active projects/events) ───────────────────────────────────

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

  const deleteContainer = async (id) => {
    setContainers(prev => prev.filter(c => c.id !== id));
    setWorkItems(prev => prev.filter(w => w.container_id !== id));
    await supabase.from('work_items').delete().eq('container_id', id);
    const { error } = await supabase.from('containers').delete().eq('id', id);
    if (error) {
      console.error('Error deleting container:', error);
      const { data: allContainers } = await supabase.from('containers').select('*');
      if (allContainers) setContainers(allContainers);
      const allWorkItems = await fetchAllFromTable('work_items', 'created_at', false);
      if (allWorkItems) setWorkItems(allWorkItems);
    }
    return { error };
  };

  const createUser = async (userData) => {
    const { username, password, full_name, role, department, manager, position, category } = userData;
    const cleanId = username.trim().toLowerCase();
    const newId = crypto.randomUUID();

    const { data: insertData, error: insertError } = await supabase.from('users').insert([{
      id: newId,
      name: full_name,
      username: cleanId,
      password: password,
      role: role || 'Assignee',
      department: department || null,
      manager: manager || null,
      position: position || null,
      category: category || 'Office Staff',
      is_active: true,
    }]).select();

    if (insertError) {
      console.error('Error creating user in ERP users table:', insertError);
      return { data: null, error: insertError };
    }

    const { data: allUsers } = await supabase.from('users').select('*');
    if (allUsers) setProfiles(allUsers);

    return { data: insertData ? insertData[0] : null, error: null };
  };

  const updateProfile = async (id, updates) => {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select();
    if (error) {
      console.error('updateProfile error:', error);
      return { data, error };
    }
    const { data: allProfiles } = await supabase.from('users').select('*');
    if (allProfiles) setProfiles(allProfiles);

    if (data && data.length > 0 && id === currentUser?.id) {
      const effectiveUser = getEffectiveUser(data[0], allProfiles || []);
      setCurrentUser(effectiveUser);
      localStorage.setItem('workpulse_session', JSON.stringify(effectiveUser));
    }
    return { data, error };
  };

  const adminUpdateProfile = async (targetUserId, profileUpdates) => {
    const updates = {};
    Object.keys(profileUpdates).forEach(key => {
      if (profileUpdates[key] !== undefined && profileUpdates[key] !== null) {
        updates[key] = profileUpdates[key];
      }
    });

    if (updates.username) {
      updates.username = updates.username.trim().toLowerCase();
    }

    const { data, error } = await supabase.from('users').update(updates).eq('id', targetUserId).select();
    if (!error) {
      const { data: allProfiles } = await supabase.from('users').select('*');
      if (allProfiles) setProfiles(allProfiles);

      if (targetUserId === currentUser?.id && data && data.length > 0) {
        const effectiveUser = getEffectiveUser(data[0], allProfiles || []);
        setCurrentUser(effectiveUser);
        localStorage.setItem('workpulse_session', JSON.stringify(effectiveUser));
      }
    }
    return { data, error };
  };

  const adminResetUserPassword = async (targetUserId, newPassword) => {
    const { data, error } = await supabase.from('users').update({ password: newPassword }).eq('id', targetUserId).select();
    return { data, error };
  };

  const adminUpdateUser = async (targetUserId, { newPassword, newUsername, is_active }) => {
    const updates = {};
    if (newPassword) updates.password = newPassword;
    if (newUsername) {
      updates.username = newUsername.trim().toLowerCase();
    }
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase.from('users').update(updates).eq('id', targetUserId).select();
    if (!error) {
      const { data: allProfiles } = await supabase.from('users').select('*');
      if (allProfiles) setProfiles(allProfiles);

      if (targetUserId === currentUser?.id && data && data.length > 0) {
        const effectiveUser = getEffectiveUser(data[0], allProfiles || []);
        setCurrentUser(effectiveUser);
        localStorage.setItem('workpulse_session', JSON.stringify(effectiveUser));
      }
    }
    return { data, error };
  };

  const markNotificationRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const getUnreadNotifications = () => notifications.filter(n => !n.is_read);

  const getActiveAnnouncements = () => {
    const today = getISTDateString();
    const todayDate = new Date(today + 'T00:00:00');
    return announcements.filter(a => {
      const eventDate = new Date(a.event_date + 'T00:00:00');
      // Text announcements auto-delete AFTER the date.
      // Program announcements show "Expired" if past the date. We will keep them active but the UI will filter them if needed.
      // Wait, the prompt says "Dashboard: show active announcements only".
      // Active means todayDate <= eventDate for Text. 
      // For Program, if they are shown in Admin Expired Tab, they must remain in the state. 
      // Let's filter out expired ones from getActiveAnnouncements, but we can access `announcements` directly for the Expired Tab.
      return todayDate <= eventDate;
    });
  };

  const getDynamicNotificationText = (ann) => {
    if (ann.type === 'Text') {
      return '';
    }

    const today = getISTDateString();
    const todayDate = new Date(today + 'T00:00:00');
    const eventDate = new Date(ann.event_date + 'T00:00:00');

    const diffTime = eventDate - todayDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Expired";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `${diffDays} days left`;
  };

  // ── Absences ──────────────────────────────────────────────────────────────

  const addAbsence = async (absenceData) => {
    const { data, error } = await supabase.from('absences').insert([{
      ...absenceData,
      created_by: currentUser?.id || null,
    }]).select();
    if (error) console.error('Error adding absence:', error);
    else if (data) setAbsences(prev => [...prev, ...data]);
    return { data, error };
  };

  const updateAbsence = async (id, updates) => {
    setAbsences(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    const { data, error } = await supabase.from('absences').update(updates).eq('id', id).select();
    if (error) {
      console.error('Error updating absence:', error);
      supabase.from('absences').select('*').then(({ data: d }) => { if (d) setAbsences(d); });
    }
    return { data, error };
  };

  const deleteAbsence = async (id) => {
    if (!window.confirm("Are you sure you want to delete this absence? This action cannot be undone.")) return { error: null };
    setAbsences(prev => prev.filter(a => a.id !== id));
    const { error } = await supabase.from('absences').delete().eq('id', id);
    if (error) {
      console.error('Error deleting absence:', error);
      supabase.from('absences').select('*').then(({ data: d }) => { if (d) setAbsences(d); });
    }
    return { error };
  };

  const checkTodayStartedOrCompletedRecurringTasks = async (userId) => {
    const today = getISTDateString();
    const { data: templates } = await supabase
      .from('saved_tasks')
      .select('title')
      .eq('assignee_id', userId)
      .eq('is_recurring', true);
      
    if (!templates || templates.length === 0) return [];
    const titles = templates.map(t => t.title);
    
    const { data: items } = await supabase
      .from('work_items')
      .select('title, status')
      .eq('assignee_id', userId)
      .eq('expected_date', today)
      .eq('is_recurring', false)
      .in('status', ['Ongoing', 'Completed'])
      .in('title', titles);
      
    return items || [];
  };

  const rescheduleTasksOnLeaveApproval = async (userId, fromDate, toDate, client = supabase) => {
    const { data: items, error: fetchErr } = await client
      .from('work_items')
      .select('*')
      .eq('assignee_id', userId)
      .eq('status', 'Assigned')
      .gte('expected_date', fromDate)
      .lte('expected_date', toDate);
      
    if (fetchErr) {
      console.error("Error fetching tasks for rescheduling:", fetchErr);
      return;
    }
    
    if (!items || items.length === 0) return;

    // Filter items that have source_template_item_id (meaning they are generated recurring tasks)
    const recurringItems = items.filter(item => item.source_template_item_id);
    if (recurringItems.length === 0) return;

    // Fetch the corresponding templates to check their recurrence rule type
    const templateIds = [...new Set(recurringItems.map(item => item.source_template_item_id))];
    const { data: templates, error: templatesErr } = await client
      .from('saved_tasks')
      .select('id, recurrence_rule')
      .in('id', templateIds);

    if (templatesErr) {
      console.error("Error fetching templates for rescheduling:", templatesErr);
      return;
    }

    const templateMap = {};
    if (templates) {
      templates.forEach(t => {
        templateMap[t.id] = t;
      });
    }

    const deleteIds = [];
    const rescheduleUpdates = [];
    const nextWorkingDay = getNextWorkingDay(toDate);

    recurringItems.forEach(item => {
      const template = templateMap[item.source_template_item_id];
      if (!template || !template.recurrence_rule) return;

      const rule = template.recurrence_rule;
      if (rule.type === 'daily') {
        deleteIds.push(item.id);
      } else {
        rescheduleUpdates.push({ id: item.id, expected_date: nextWorkingDay });
      }
    });

    if (deleteIds.length > 0) {
      const { error: delErr } = await client
        .from('work_items')
        .delete()
        .in('id', deleteIds);
      if (delErr) {
        console.error("Error deleting daily tasks on leave approval:", delErr);
      } else {
        setWorkItems(prev => prev.filter(w => !deleteIds.includes(w.id)));
      }
    }

    if (rescheduleUpdates.length > 0) {
      for (const update of rescheduleUpdates) {
        const { error: updErr } = await client
          .from('work_items')
          .update({ expected_date: update.expected_date })
          .eq('id', update.id);
        if (updErr) {
          console.error(`Error rescheduling task ${update.id} on leave approval:`, updErr);
        }
      }
      setWorkItems(prev => prev.map(w => {
        const update = rescheduleUpdates.find(u => u.id === w.id);
        return update ? { ...w, expected_date: update.expected_date } : w;
      }));
    }
  };

  // ── Leave Requests ────────────────────────────────────────────────────────
  const applyLeave = async (leaveData) => {
    const isAdmin = currentUser?.role === 'Admin';
    const targetUserId = leaveData.user_id || currentUser?.id;
    const payload = {
      ...leaveData,
      user_id: targetUserId,
      status: isAdmin ? 'Approved' : 'Pending',
      approved_by: isAdmin ? currentUser?.id : null
    };

    if (payload.status === 'Approved') {
      payload.approved_date = getISTDateString();
    }

    const client = supabase;
    let result = await client.from('leave_requests').insert([payload]).select();
    
    if (result.error && (result.error.message?.includes('approved_date') || result.error.code === 'PGRST204')) {
      const { approved_date: _approved_date, ...cleanPayload } = payload;
      result = await client.from('leave_requests').insert([cleanPayload]).select();
    }
    
    const { data, error } = result;
    if (error) {
      console.error('Error applying leave:', error);
    } else if (data) {
      setLeaveRequests(prev => [...prev, ...data]);
      if (payload.status === 'Approved' && payload.leave_type === 'Full Day') {
        await rescheduleTasksOnLeaveApproval(targetUserId, payload.from_date, payload.to_date, client);
      }
    }
    return { data, error };
  };

  const updateLeaveRequest = async (id, updates) => {
    const req = leaveRequests.find(l => l.id === id);
    const isAdmin = currentUser?.role === 'Admin';

    if (updates.status === 'Approved') {
      updates.approved_date = getISTDateString();
      updates.approved_by = currentUser?.id;
    }

    setLeaveRequests(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    const client = supabase;
    let result = await client.from('leave_requests').update(updates).eq('id', id).select();
    
    if (result.error && (result.error.message?.includes('approved_date') || result.error.code === 'PGRST204')) {
      const { approved_date: _approved_date, ...cleanUpdates } = updates;
      result = await client.from('leave_requests').update(cleanUpdates).eq('id', id).select();
    }
    
    const { data, error } = result;
    if (error) {
      console.error('Error updating leave:', error);
      supabase.from('leave_requests').select('*').then(({ data: d }) => { if (d) setLeaveRequests(d); });
    } else {
      if (req && updates.status === 'Approved' && req.leave_type === 'Full Day') {
        await rescheduleTasksOnLeaveApproval(req.user_id, req.from_date, req.to_date, client);
      }
    }
    return { data, error };
  };

  const deleteLeaveRequest = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this leave request?")) return { error: null };
    const isAdmin = currentUser?.role === 'Admin';
    setLeaveRequests(prev => prev.filter(l => l.id !== id));
    const client = supabase;
    const { error } = await client.from('leave_requests').delete().eq('id', id);
    if (error) {
      console.error('Error deleting leave:', error);
      supabase.from('leave_requests').select('*').then(({ data: d }) => { if (d) setLeaveRequests(d); });
    }
    return { error };
  };

  /** Returns true if userId is absent on the given YYYY-MM-DD date string. */
  const isUserAbsentOn = (userId, dateStr) => {
    if (!userId || !dateStr) return false;
    return leaveRequests.some(l => 
      l.user_id === userId && 
      l.status === 'Approved' && 
      l.leave_type === 'Full Day' && 
      dateStr >= l.from_date && dateStr <= l.to_date
    );
  };

  const addAnnouncement = async (announcementData) => {
    const payload = { ...announcementData, created_by: currentUser?.id };
    const { data, error } = await supabase.from('announcements').insert([payload]).select();
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
    if (!window.confirm("Are you sure you want to delete this announcement? This action cannot be undone.")) return { error: null };
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      console.error('Error deleting announcement:', error);
      supabase.from('announcements').select('*').order('event_date', { ascending: true }).then(({ data: d }) => { if (d) setAnnouncements(d); });
    }
    return { error };
  };

  const triggerRecurringSpawn = async () => {
    try {
      const { error } = await supabase.rpc('spawn_recurring_tasks_ist');
      if (error) throw error;
      const refreshedItems = await fetchAllFromTable('work_items', 'created_at', false);
      if (refreshedItems) setWorkItems(refreshedItems);
      const { data: refreshedSaved } = await supabase.from('saved_tasks').select('*');
      if (refreshedSaved) setSavedTasks(refreshedSaved);
      return { success: true };
    } catch (err) {
      console.error('Error triggering recurring spawn:', err);
      return { success: false, error: err };
    }
  };

  return (
    <DataContext.Provider value={{
      currentUser,
      profiles,
      containers,
      workItems,
      savedContainers,
      savedTasks,
      notifications,
      announcements,
      absences,
      addAbsence,
      updateAbsence,
      deleteAbsence,
      leaveRequests,
      applyLeave,
      updateLeaveRequest,
      deleteLeaveRequest,
      checkTodayStartedOrCompletedRecurringTasks,
      isUserAbsentOn,
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
      createFollowUpTask,
      addWorkItem,
      updateWorkItem,
      deleteWorkItem,
      addSavedContainer,
      updateSavedContainer,
      deleteSavedContainer,
      addSavedTask,
      updateSavedTask,
      deleteSavedTask,
      addContainer,
      updateContainer,
      deleteContainer,
      createUser,
      updateProfile,
      adminUpdateProfile,
      adminResetUserPassword,
      adminUpdateUser,
      getNextWorkingDay,
      triggerRecurringSpawn,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext() {
  return useContext(DataContext);
}
