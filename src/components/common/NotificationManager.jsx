import { useEffect, useRef } from 'react';
import { useDataContext } from '../../context/SupabaseDataContext';

export default function NotificationManager() {
  const { currentUser, workItems, announcements, getDynamicNotificationText } = useDataContext();
  const lastChecked = useRef(Date.now());
  const audioRef = useRef(new Audio('/notification.mp3'));

  useEffect(() => {
    if (!currentUser || !('Notification' in window)) return;
    
    // Default settings if null
    const settings = currentUser.notification_settings || {
      popup_enabled: false,
      sound_enabled: true,
      notify_tasks: true,
      notify_overdue: true,
      notify_announcements: true,
      notify_programs: true
    };

    if (!settings.popup_enabled || Notification.permission !== 'granted') return;

    const playSound = () => {
      if (settings.sound_enabled) {
        audioRef.current.play().catch(e => console.log('Audio play blocked:', e));
      }
    };

    const showPopup = (title, body, tag, url = '/') => {
      // Check local storage to avoid duplicate spam
      const notified = JSON.parse(localStorage.getItem('notified_ids') || '{}');
      if (notified[tag]) return;

      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body,
            icon: '/app-icon-192.png',
            badge: '/favicon.svg',
            tag,
            vibrate: [200, 100, 200]
          });
        });
      } else {
        new Notification(title, { body, icon: '/app-icon-192.png', tag });
      }

      notified[tag] = Date.now();
      localStorage.setItem('notified_ids', JSON.stringify(notified));
      playSound();
    };

    const checkNotifications = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const isPast10AM = currentHour >= 10;
      const todayStr = now.toISOString().split('T')[0];

      // 1. Task Assigned (active polling for new tasks)
      if (settings.notify_tasks && workItems) {
        workItems.forEach(task => {
          if (task.assignee_id === currentUser.id && task.status === 'Assigned') {
            const taskTime = new Date(task.created_at).getTime();
            // If created recently or not notified
            if (taskTime > lastChecked.current || !localStorage.getItem('notified_ids')?.includes(`task-${task.id}`)) {
              showPopup('New Task Assigned', task.title, `task-${task.id}`);
            }
          }
        });
      }

      // 2. Overdue & Not Started Alerts (Once per day at 10 AM)
      if (isPast10AM && workItems) {
        let overdueCount = 0;
        let notStartedCount = 0;
        
        workItems.forEach(task => {
          if (task.assignee_id === currentUser.id && task.status !== 'Completed') {
            if (task.due_date && new Date(task.due_date) < now) overdueCount++;
            if (task.status === 'Assigned') notStartedCount++;
          }
        });

        if (settings.notify_overdue && overdueCount > 0) {
          showPopup('Overdue Tasks', `You have ${overdueCount} overdue task(s).`, `overdue-${todayStr}`);
        }
        // Assuming Not Started is grouped under overdue/tasks
        if (settings.notify_tasks && notStartedCount > 0) {
          showPopup('Pending Tasks', `You have ${notStartedCount} task(s) not started.`, `pending-${todayStr}`);
        }
      }

      // 3. Announcements & Programs
      if (announcements) {
        announcements.forEach(ann => {
          // Verify staff group
          if (ann.staff_group !== 'Both' && ann.staff_group !== currentUser.category && currentUser.role !== 'Admin') return;

          if (ann.type === 'Text' && settings.notify_announcements) {
            const annTime = new Date(ann.created_at).getTime();
            if (annTime > lastChecked.current || !localStorage.getItem('notified_ids')?.includes(`ann-${ann.id}`)) {
              showPopup('New Announcement', ann.message, `ann-${ann.id}`);
            }
          }

          if (ann.type === 'Program' && settings.notify_programs) {
            const dynText = getDynamicNotificationText(ann);
            // Notify if created recently
            const annTime = new Date(ann.created_at).getTime();
            if (annTime > lastChecked.current && !localStorage.getItem('notified_ids')?.includes(`prog-new-${ann.id}`)) {
              showPopup('New Program/Event', ann.title, `prog-new-${ann.id}`);
            }

            // Daily count notification
            if (dynText === 'Today' || dynText === 'Tomorrow' || dynText.includes('left')) {
               showPopup(`Program: ${dynText}`, ann.title, `prog-${ann.id}-${dynText.replace(/ /g,'-')}`);
            }
          }
        });
      }

      lastChecked.current = Date.now();
    };

    // Run immediately
    checkNotifications();

    // Poll every 60 seconds
    const interval = setInterval(checkNotifications, 60000);
    return () => clearInterval(interval);
  }, [currentUser, workItems, announcements, getDynamicNotificationText]);

  return null;
}
