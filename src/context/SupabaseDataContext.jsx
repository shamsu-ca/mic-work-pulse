import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const DataContext = createContext();

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

  useEffect(() => {
    if (!session?.id) {
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
          setCurrentUser(userObj);
        } else {
          // If the profile no longer exists in the DB, log out
          localStorage.removeItem('workpulse_session');
          window.dispatchEvent(new Event('workpulse_auth_change'));
          setCurrentUser(null);
          setLoadingInitial(false);
          return;
        }

        // 2. Fetch all profiles
        const { data: allProfiles } = await supabase.from('users').select('*');
        if (allProfiles) setProfiles(allProfiles);

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

        // 6. Fetch work items, then spawn any due recurring tasks
        let { data: allWorkItems } = await supabase.from('work_items').select('*');
        if (allWorkItems) {
          const newItems = await checkAndSpawnRecurringTasks(allSavedTasks ?? [], allLeaves ?? []);
          if (newItems && newItems.length > 0) {
            const { data: latestWorkItems } = await supabase.from('work_items').select('*');
            if (latestWorkItems) allWorkItems = latestWorkItems;
          }
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
        supabase.from('users').select('*').then(({ data }) => { if (data) setProfiles(data); });
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
        supabase.from('work_items').select('*').then(({ data }) => { if (data) setWorkItems(data); });
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

    return () => {
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

  // Reads from saved_tasks, spawns actual task entries into work_items
  const checkAndSpawnRecurringTasks = async (savedTasksList, currentLeaves = []) => {
    const today = new Date().toISOString().split('T')[0];

    const isAbsentFullDayToday = (userId) => {
      if (!userId || !currentLeaves.length) return false;
      return currentLeaves.some(l => 
        l.user_id === userId && 
        l.status === 'Approved' && 
        l.leave_type === 'Full Day' && 
        today >= l.from_date && today <= l.to_date
      );
    };


    // ── Phase A: parent templates ──────────────────────────────────────────
    let spawnedParents = [];

    const validUserIds = new Set((profiles || []).map(p => p.id));
    const templates = savedTasksList.filter(w => {
      if (!w.is_recurring || !w.is_active || w.type === 'Group') return false;
      if (w.assignee_id && !validUserIds.has(w.assignee_id)) return false;
      return true;
    });
    const candidateTemplates = [];

    for (const template of templates) {
      if (!template.recurrence_rule) continue;
      const lastGenerated = template.last_generated_at;
      if (lastGenerated === today) continue;
      
      // Skip spawn if assignee has Full-Day leave today
      if (isAbsentFullDayToday(template.assignee_id)) continue;

      const rule = template.recurrence_rule;
      
      // Half Day Leave: generate all recurring tasks normally
      let shouldGenerate = false;

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
        } else if (rule.type === 'weekly' && Array.isArray(rule.weekly_days)) {
          if (rule.weekly_days.includes(currentDate.getDay())) shouldGenerate = true;
        } else if (rule.type === 'monthly' && rule.monthly_day) {
          if (currentDate.getDate() === rule.monthly_day &&
              (currentDate.getFullYear() !== lastDate.getFullYear() ||
               currentDate.getMonth() !== lastDate.getMonth())) shouldGenerate = true;
        } else if (rule.type === 'x_monthly' && rule.x_month_interval && rule.monthly_day) {
          const monthDiff = (currentDate.getFullYear() - lastDate.getFullYear()) * 12
                          + (currentDate.getMonth() - lastDate.getMonth());
          if (currentDate.getDate() === rule.monthly_day && monthDiff >= rule.x_month_interval)
            shouldGenerate = true;
        }
      }

      if (shouldGenerate) candidateTemplates.push(template);
    }

    if (candidateTemplates.length > 0) {
      const candidateIds = candidateTemplates.map(t => t.id);
      const { data: claimed } = await supabase
        .from('saved_tasks')
        .update({ last_generated_at: today })
        .in('id', candidateIds)
        .or(`last_generated_at.is.null,last_generated_at.neq.${today}`)
        .select('id');

      if (claimed?.length) {
        const claimedIds = new Set(claimed.map(t => t.id));
        const claimedList = candidateTemplates.filter(t => claimedIds.has(t.id));

        const toInsert = claimedList.map(t => ({
          title: t.title, description: t.description, type: 'Task',
          assignee_id: t.assignee_id, container_id: null,
          estimated_hours: t.estimated_hours, priority: t.priority,
          status: 'Assigned', expected_date: today, is_recurring: false,
          parent_id: null,
        }));

        const { data: insertedParents, error } = await supabase.from('work_items').insert(toInsert).select();
        if (error) {
          console.error('Failed to spawn recurring tasks:', error);
          // Rollback last_generated_at in saved_tasks
          for (const item of claimedList) {
            await supabase
              .from('saved_tasks')
              .update({ last_generated_at: item.last_generated_at })
              .eq('id', item.id);
          }
        } else if (insertedParents?.length) {
          spawnedParents = insertedParents;
        }
      }
    }

    return spawnedParents;
  };

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
    if (!window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) return { error: null };
    setWorkItems(prev => prev.filter(w => w.id !== id));
    const { error } = await supabase.from('work_items').delete().eq('id', id);
    if (error) {
      console.error('Error deleting work item:', error);
      supabase.from('work_items').select('*').then(({ data: d }) => { if (d) setWorkItems(d); });
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
    const { data, error } = await supabase.from('saved_tasks').insert([taskData]).select();
    if (error) console.error('Error adding saved task:', error);
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
    if (data && data.length > 0 && id === currentUser?.id) {
      setCurrentUser(data[0]);
      localStorage.setItem('workpulse_session', JSON.stringify(data[0]));
    }
    const { data: allProfiles } = await supabase.from('users').select('*');
    if (allProfiles) setProfiles(allProfiles);
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
        setCurrentUser(data[0]);
        localStorage.setItem('workpulse_session', JSON.stringify(data[0]));
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
        setCurrentUser(data[0]);
        localStorage.setItem('workpulse_session', JSON.stringify(data[0]));
      }
    }
    return { data, error };
  };

  const markNotificationRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const getUnreadNotifications = () => notifications.filter(n => !n.is_read);

  const getActiveAnnouncements = () => {
    const today = new Date().toISOString().split('T')[0];
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

    const today = new Date().toISOString().split('T')[0];
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
    const today = new Date().toISOString().split('T')[0];
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

  const deleteTodayGeneratedTasksForUser = async (userId, client = supabase) => {
    const today = new Date().toISOString().split('T')[0];
    const { data: templates } = await client
      .from('saved_tasks')
      .select('title')
      .eq('assignee_id', userId)
      .eq('is_recurring', true);
    
    if (!templates || templates.length === 0) return;
    const titles = templates.map(t => t.title);
    
    const { error } = await client
      .from('work_items')
      .delete()
      .eq('assignee_id', userId)
      .eq('expected_date', today)
      .eq('is_recurring', false)
      .eq('status', 'Assigned')
      .in('title', titles);
      
    if (error) {
      console.error("Error deleting auto-generated tasks on leave approval:", error);
    } else {
      setWorkItems(prev => prev.filter(w => 
        !(w.assignee_id === userId && w.expected_date === today && !w.is_recurring && titles.includes(w.title) && w.status === 'Assigned')
      ));
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
      payload.approved_date = new Date().toISOString().split('T')[0];
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
        const today = new Date().toISOString().split('T')[0];
        if (today >= payload.from_date && today <= payload.to_date) {
          await deleteTodayGeneratedTasksForUser(targetUserId, client);
        }
      }
    }
    return { data, error };
  };

  const updateLeaveRequest = async (id, updates) => {
    const req = leaveRequests.find(l => l.id === id);
    const isAdmin = currentUser?.role === 'Admin';

    if (updates.status === 'Approved') {
      updates.approved_date = new Date().toISOString().split('T')[0];
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
        const today = new Date().toISOString().split('T')[0];
        if (today >= req.from_date && today <= req.to_date) {
          await deleteTodayGeneratedTasksForUser(req.user_id, client);
        }
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
