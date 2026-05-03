import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabaseClient';

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

        // 6. Fetch work items, then spawn any due recurring tasks
        let { data: allWorkItems } = await supabase.from('work_items').select('*');
        if (allWorkItems) {
          const newItems = await checkAndSpawnRecurringTasks(allSavedTasks ?? [], allAbsences ?? []);
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
          .eq('user_id', session.user.id)
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

    const absencesSub = supabase.channel('public:absences')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absences' }, () => {
        supabase.from('absences').select('*').then(({ data }) => { if (data) setAbsences(data); });
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
    };
  }, [session]);

  function shouldSubtaskSpawnToday(sub, parentTemplate, today) {
    const rule = sub.recurrence_rule;
    if (!rule || sub.last_generated_at === today) return false;
    const currentDate = new Date(today);

    if (rule.type === 'weekly' && rule.day !== undefined) {
      if (currentDate.getDay() !== rule.day) return false;
      if (!sub.last_generated_at) return true;
      const diffDays = Math.ceil(Math.abs(currentDate - new Date(sub.last_generated_at)) / 86400000);
      return diffDays >= 7;
    }
    if (rule.type === 'every_x_days' && rule.offset !== undefined) {
      const parentLastGen = parentTemplate.last_generated_at;
      if (!parentLastGen) return false;
      const daysSinceParent = Math.ceil(Math.abs(currentDate - new Date(parentLastGen)) / 86400000);
      if (daysSinceParent < rule.offset) return false;
      if (!sub.last_generated_at) return true;
      return new Date(sub.last_generated_at) < new Date(parentLastGen);
    }
    if (rule.type === 'monthly' && rule.date !== undefined) {
      if (currentDate.getDate() !== rule.date) return false;
      if (!sub.last_generated_at) return true;
      const last = new Date(sub.last_generated_at);
      return currentDate.getMonth() !== last.getMonth() || currentDate.getFullYear() !== last.getFullYear();
    }
    if (rule.type === 'every_x_months' && rule.date !== undefined) {
      if (currentDate.getDate() !== rule.date) return false;
      if (!sub.last_generated_at) return true;
      const last = new Date(sub.last_generated_at);
      const interval = parentTemplate.recurrence_rule?.interval ?? 1;
      const monthDiff = (currentDate.getFullYear() - last.getFullYear()) * 12
        + (currentDate.getMonth() - last.getMonth());
      return monthDiff >= interval;
    }
    return false;
  }

  // Reads from saved_tasks, spawns actual task entries into work_items
  const checkAndSpawnRecurringTasks = async (savedTasksList, currentAbsences = []) => {
    const today = new Date().toISOString().split('T')[0];

    const isAbsentToday = (userId) => {
      if (!userId || !currentAbsences.length) return false;
      return currentAbsences.some(a => a.user_id === userId && today >= a.from_date && today <= a.to_date);
    };

    // ── Phase A: parent templates ──────────────────────────────────────────
    let spawnedParents = [];
    const templateToSpawn = {};
    const templateAssignee = {};

    const templates = savedTasksList.filter(w => w.is_recurring && w.is_active && !w.parent_id);
    const candidateTemplates = [];

    for (const template of templates) {
      if (!template.recurrence_rule) continue;
      const lastGenerated = template.last_generated_at;
      if (lastGenerated === today) continue;
      // Skip spawn if assignee is absent today
      if (isAbsentToday(template.assignee_id)) continue;

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
          title: t.title, description: t.description, type: t.type,
          assignee_id: t.assignee_id, container_id: null,
          estimated_hours: t.estimated_hours, priority: t.priority,
          status: 'Assigned', expected_date: today, is_recurring: false,
        }));

        const { data: insertedParents, error } = await supabase.from('work_items').insert(toInsert).select();
        if (error) {
          console.error('Failed to spawn recurring tasks:', error);
        } else if (insertedParents?.length) {
          spawnedParents = insertedParents;
          claimedList.forEach((t, i) => {
            templateToSpawn[t.id] = insertedParents[i].id;
            templateAssignee[t.id] = t.assignee_id;
          });

          // Persist last_spawned_id into each parent template's recurrence_rule
          await Promise.all(claimedList.map((t, i) =>
            supabase.from('saved_tasks')
              .update({ recurrence_rule: { ...t.recurrence_rule, last_spawned_id: insertedParents[i].id } })
              .eq('id', t.id)
          ));

          // Spawn "with parent" subtasks (recurrence_rule IS NULL)
          const { data: withParentSubs } = await supabase
            .from('saved_tasks').select('*')
            .in('parent_id', claimedList.map(t => t.id))
            .eq('type', 'Subtask')
            .is('recurrence_rule', null);

          if (withParentSubs?.length) {
            await supabase.from('work_items').insert(withParentSubs.map(sub => ({
              title: sub.title, description: sub.description, type: 'Subtask',
              assignee_id: templateAssignee[sub.parent_id] ?? null,
              priority: sub.priority, estimated_hours: sub.estimated_hours,
              status: 'Assigned', expected_date: today, is_recurring: false,
              parent_id: templateToSpawn[sub.parent_id],
            })));
          }
        }
      }
    }

    // ── Phase B: day-specific subtask templates (always runs) ──────────────
    const parentById = Object.fromEntries(
      savedTasksList.filter(t => t.is_recurring && t.is_active).map(t => [t.id, t])
    );
    const candidateDaySubs = savedTasksList.filter(t =>
      t.type === 'Subtask' && t.recurrence_rule !== null &&
      t.is_active !== false && t.last_generated_at !== today
    ).filter(sub => {
      const p = parentById[sub.parent_id];
      if (!p || isAbsentToday(p.assignee_id)) return false;
      return shouldSubtaskSpawnToday(sub, p, today);
    });

    if (candidateDaySubs.length > 0) {
      const { data: claimedDaySubs } = await supabase
        .from('saved_tasks')
        .update({ last_generated_at: today })
        .in('id', candidateDaySubs.map(s => s.id))
        .or(`last_generated_at.is.null,last_generated_at.neq.${today}`)
        .select('id');

      if (claimedDaySubs?.length) {
        const claimedDayIds = new Set(claimedDaySubs.map(s => s.id));
        const toInsertDay = candidateDaySubs.filter(s => claimedDayIds.has(s.id)).map(sub => {
          const p = parentById[sub.parent_id];
          const parentWorkItemId =
            templateToSpawn[sub.parent_id] ??
            p?.recurrence_rule?.last_spawned_id ?? null;
          return {
            title: sub.title, description: sub.description, type: 'Subtask',
            assignee_id: p?.assignee_id ?? null,
            priority: sub.priority, estimated_hours: sub.estimated_hours,
            status: 'Assigned', expected_date: today, is_recurring: false,
            parent_id: parentWorkItemId,
          };
        });
        await supabase.from('work_items').insert(toInsertDay);
        return [...spawnedParents, ...claimedDaySubs];
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

  const createFollowUpTask = async (completedItemId, { title, description, assigneeId, dueDate, priority, linkType }) => {
    const { data, error } = await supabase.from('work_items').insert([{
      title, description: description || null,
      assignee_id: assigneeId || null, expected_date: dueDate || null,
      priority: priority || 'Medium', status: 'Assigned', type: 'Task',
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

  /** Returns true if userId is absent on the given YYYY-MM-DD date string. */
  const isUserAbsentOn = (userId, dateStr) => {
    if (!userId || !dateStr) return false;
    return absences.some(a => a.user_id === userId && dateStr >= a.from_date && dateStr <= a.to_date);
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
