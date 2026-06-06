import React, { useState, useEffect } from 'react';
import { useDataContext } from '../context/SupabaseDataContext';
import { getDisplayStatus, isOverdue, getActionableUnits, calculateUserEfficiency, isLowestLevelActionableUnit } from '../lib/statusUtils';
import { isItemInDateRange, fmtDate, getISTDateString } from '../lib/dateUtils';
import { supabase } from '../lib/supabaseClient';
import FilterBar from '../components/common/FilterBar';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

export default function ReportsPage() {
  const {
    workItems, profiles, currentUser, dateFilter, customDateRange, leaveRequests,
    containers, savedTasks,
  } = useDataContext();

  const todayStr = getISTDateString();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showClosedProjects, setShowClosedProjects] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  
  // Archives State
  const [archivesList, setArchivesList] = useState([]);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveProgress, setArchiveProgress] = useState('');
  const [isMigrationNeeded, setIsMigrationNeeded] = useState(false);

  // Fetch archives on mount
  useEffect(() => {
    fetchArchives();
  }, []);

  const fetchArchives = async () => {
    try {
      const { data, error } = await supabase
        .from('archives')
        .select('*')
        .order('archive_number', { ascending: false });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === 'PGRST204') {
          setIsMigrationNeeded(true);
        }
        console.error("Error fetching archives:", error);
      } else {
        setArchivesList(data || []);
      }
    } catch (err) {
      console.error("Archives fetch exception:", err);
    }
  };


  const safeProfiles = profiles || [];
  const safeWorkItems = workItems || [];
  const safeContainers = containers || [];

  // Helper for formatting date nicely in UI and Reports
  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return 'System Start';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Determine finalized report period: FROM last reset date (or system start) TO yesterday
  const getReportPeriod = () => {
    let startDateVal = '';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const endDateVal = getISTDateString(yesterday);

    if (archivesList && archivesList.length > 0) {
      const lastArchive = archivesList[0];
      if (lastArchive.archive_date) {
        startDateVal = getISTDateString(lastArchive.archive_date);
      }
    }

    if (!startDateVal) {
      // If no archive exists, start from the system's start date
      const dates = [
        ...safeWorkItems.map(w => w.created_at),
        ...safeContainers.map(c => c.created_at)
      ].filter(Boolean).map(d => d.split('T')[0]);
      
      if (dates.length > 0) {
        dates.sort();
        startDateVal = dates[0];
      } else {
        const fallback = new Date();
        fallback.setDate(fallback.getDate() - 30);
        startDateVal = getISTDateString(fallback);
      }
    }

    return { startDate: startDateVal, endDate: endDateVal };
  };

  const { startDate, endDate } = getReportPeriod();
  const isPeriodEmpty = startDate > endDate;

  // Filter out items already counted as overdue in previous archives to prevent duplicate counting
  // Also only count items created on or before yesterday (endDate)
  const currentCycleItems = safeWorkItems.filter(item => 
    !item.previously_overdue && 
    item.created_at && 
    item.created_at.split('T')[0] <= endDate
  );

  const actionable = getActionableUnits(currentCycleItems);

  // ───────────────────────────────────────────────────────────────────────────
  // 1. OVERVIEW METRICS CALCULATIONS
  // ───────────────────────────────────────────────────────────────────────────
  // Completed items in report period (completed on or before yesterday)
  const completedItems = actionable.filter(w => 
    w.status === 'Completed' && 
    w.completed_at && 
    w.completed_at.split('T')[0] <= endDate
  );

  // Total Due Work in report period: expected date in period
  const totalDueWorkList = actionable.filter(w => 
    w.expected_date && 
    w.expected_date >= startDate && 
    w.expected_date <= endDate
  );

  // Completed On Time: due in period, completed on or before due date
  const completedOnTime = completedItems.filter(t => 
    t.expected_date && 
    t.expected_date >= startDate && 
    t.expected_date <= endDate && 
    getISTDateString(t.completed_at) <= t.expected_date
  );

  // Completed Late: due in period, completed after due date (but completed on or before yesterday)
  const completedLate = completedItems.filter(t => 
    t.expected_date && 
    t.expected_date >= startDate && 
    t.expected_date <= endDate && 
    getISTDateString(t.completed_at) > t.expected_date
  );

  // Overdue: due in period (on or before yesterday) and not completed as of yesterday
  const overdueItemsList = actionable.filter(w => 
    w.expected_date && 
    w.expected_date >= startDate && 
    w.expected_date <= endDate && 
    (w.status !== 'Completed' || (w.completed_at && getISTDateString(w.completed_at) > endDate))
  );

  // Active Work (Neutral load): future due works or no due date, not completed as of yesterday
  const activeWorkList = actionable.filter(w => 
    (w.status !== 'Completed' || (w.completed_at && getISTDateString(w.completed_at) > endDate)) && 
    (!w.expected_date || w.expected_date > endDate)
  );

  const totalDueCount = totalDueWorkList.length;
  const onTimeCount = completedOnTime.length;
  const lateCount = completedLate.length;
  const overdueCount = overdueItemsList.length;
  const activeCount = activeWorkList.length;

  const efficiencyScore = totalDueCount === 0 ? 100 : Math.round(
    ((onTimeCount * 1.0 + lateCount * 0.5) / totalDueCount) * 100
  );

  const earlyCount = completedOnTime.filter(t => 
    t.completed_at && t.expected_date && 
    getISTDateString(t.completed_at) < t.expected_date
  ).length;

  // ───────────────────────────────────────────────────────────────────────────
  // 2. STAFF PERFORMANCE METRICS CALCULATIONS
  // ───────────────────────────────────────────────────────────────────────────
  const activeStaff = safeProfiles.filter(p => p.role !== 'Admin');

  const staffPerformanceData = activeStaff.map(staff => {
    const staffAllItems = actionable.filter(w => w.assignee_id === staff.id);
    
    const staffTotalDue = staffAllItems.filter(w => 
      w.expected_date && 
      w.expected_date >= startDate && 
      w.expected_date <= endDate
    ).length;

    const staffOnTime = staffAllItems.filter(t => 
      t.expected_date && 
      t.expected_date >= startDate && 
      t.expected_date <= endDate && 
      t.status === 'Completed' && 
      t.completed_at && 
      getISTDateString(t.completed_at) <= t.expected_date
    ).length;

    const staffLate = staffAllItems.filter(t => 
      t.expected_date && 
      t.expected_date >= startDate && 
      t.expected_date <= endDate && 
      t.status === 'Completed' && 
      t.completed_at && 
      getISTDateString(t.completed_at) > t.expected_date
    ).length;

    const staffOverdue = staffAllItems.filter(w => 
      w.expected_date && 
      w.expected_date >= startDate && 
      w.expected_date <= endDate && 
      (w.status !== 'Completed' || (w.completed_at && getISTDateString(w.completed_at) > endDate))
    ).length;

    const staffActive = staffAllItems.filter(w => 
      (w.status !== 'Completed' || (w.completed_at && getISTDateString(w.completed_at) > endDate)) && 
      (!w.expected_date || w.expected_date > endDate)
    ).length;

    const staffEff = staffTotalDue === 0 ? 100 : Math.round(
      ((staffOnTime * 1.0 + staffLate * 0.5) / staffTotalDue) * 100
    );

    const staffProjects = safeContainers.filter(c => 
      c.type === 'Project' && c.status !== 'Closed' &&
      safeWorkItems.some(w => w.container_id === c.id && w.assignee_id === staff.id)
    ).length;

    return {
      ...staff,
      totalDue: staffTotalDue,
      onTime: staffOnTime,
      late: staffLate,
      overdue: staffOverdue,
      active: staffActive,
      efficiency: staffEff,
      projectsCount: staffProjects
    };
  }).sort((a, b) => b.efficiency - a.efficiency);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. PROJECT METRICS CALCULATIONS
  // ───────────────────────────────────────────────────────────────────────────
  const activeProjectsList = safeContainers.filter(c => 
    c.type === 'Project' && (showClosedProjects ? true : c.status !== 'Closed')
  );

  const projectsData = activeProjectsList.map(proj => {
    // Only milestones created on or before yesterday (endDate)
    const projMilestones = safeWorkItems.filter(w => 
      w.container_id === proj.id && 
      w.type === 'Milestone' && 
      w.created_at && 
      w.created_at.split('T')[0] <= endDate
    );

    const activeMilestones = projMilestones.filter(w => 
      w.status !== 'Completed' || (w.completed_at && w.completed_at.split('T')[0] > endDate)
    );

    const overdueMilestones = projMilestones.filter(w => 
      w.expected_date && 
      w.expected_date <= endDate && 
      (w.status !== 'Completed' || (w.completed_at && w.completed_at.split('T')[0] > endDate))
    );

    const completedMilestones = projMilestones.filter(w => 
      w.status === 'Completed' && 
      w.completed_at && 
      w.completed_at.split('T')[0] <= endDate
    );

    const recentlyCompleted = completedMilestones.filter(m => {
      const compDate = new Date(m.completed_at);
      const limitDate = new Date(endDate);
      limitDate.setDate(limitDate.getDate() - 7);
      return compDate >= limitDate;
    });

    const assigneesSet = new Set(projMilestones.map(m => m.assignee_id).filter(Boolean));

    // Find latest activity date as of endDate
    const dates = [
      proj.created_at,
      ...projMilestones.map(m => m.completed_at),
      ...projMilestones.map(m => m.updated_at),
      ...projMilestones.map(m => m.created_at)
    ].filter(Boolean).map(d => new Date(d)).filter(d => getISTDateString(d) <= endDate);
    
    const latestActivity = dates.length > 0 ? new Date(Math.max(...dates)) : new Date(proj.created_at);

    return {
      ...proj,
      totalMilestones: projMilestones.length,
      activeMilestones: activeMilestones.length,
      overdueMilestones: overdueMilestones.length,
      recentlyCompleted: recentlyCompleted.length,
      assigneesCount: assigneesSet.size,
      latestActivityDate: latestActivity,
      milestones: projMilestones
    };
  });

  // Urgent milestones count: due today/tomorrow and not completed
  const tomorrowStr = getISTDateString(new Date(Date.now() + 86400000));
  const urgentMilestonesCount = safeWorkItems.filter(w => 
    w.type === 'Milestone' && 
    w.status !== 'Completed' && 
    (w.expected_date === todayStr || w.expected_date === tomorrowStr)
  ).length;

  // ───────────────────────────────────────────────────────────────────────────
  // 4. OVERDUE ANALYSIS
  // ───────────────────────────────────────────────────────────────────────────
  const oldestOverdueItems = [...overdueItemsList].sort((a, b) => {
    return (a.expected_date || '').localeCompare(b.expected_date || '');
  });

  const priorityOverdue = overdueItemsList.reduce((acc, item) => {
    const prio = item.priority || 'Medium';
    acc[prio] = (acc[prio] || 0) + 1;
    return acc;
  }, { Critical: 0, High: 0, Medium: 0, Low: 0 });

  const overdueByStaffMap = overdueItemsList.reduce((acc, item) => {
    const staffName = safeProfiles.find(p => p.id === item.assignee_id)?.name || 'Unassigned';
    acc[staffName] = (acc[staffName] || 0) + 1;
    return acc;
  }, {});

  const overdueByProjectMap = overdueItemsList.reduce((acc, item) => {
    const projName = item.container_id ? safeContainers.find(c => c.id === item.container_id)?.title || 'Event/Phase' : 'Standalone';
    acc[projName] = (acc[projName] || 0) + 1;
    return acc;
  }, {});

  const recurringMisses = overdueItemsList.filter(item => {
    // Check if it's spawned from a template (recurring template matching name)
    return savedTasks?.some(t => t.title === item.title && t.is_recurring);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // EXPORT UTILITIES & MOCK DRIVE ARCHIVE Clean Up
  // ───────────────────────────────────────────────────────────────────────────
  const getCSVData = (type) => {
    if (type === 'staff') {
      const headers = ['Assignee', 'Role', 'Department', 'Category', 'Total Due Work', 'Completed On Time', 'Completed Late', 'Overdue', 'Active Work', 'Efficiency %', 'Active Projects'];
      const rows = staffPerformanceData.map(s => [
        s.name, s.role, s.department || '—', s.category || 'Office Staff', s.totalDue, s.onTime, s.late, s.overdue, s.active, `${s.efficiency}%`, s.projectsCount
      ]);
      return { headers, rows, filename: 'staff_performance.csv' };
    }
    if (type === 'work') {
      const headers = ['Task Title', 'Type', 'Assignee', 'Status', 'Due Date', 'Completed Date', 'Priority', 'Parent Project/Event'];
      const rows = actionable.map(w => [
        w.title, w.type, safeProfiles.find(p => p.id === w.assignee_id)?.name || 'Unassigned', w.status, w.expected_date || '—', w.completed_at ? fmtDate(w.completed_at) : '—', w.priority || 'Medium', w.container_id ? safeContainers.find(c => c.id === w.container_id)?.title || 'Container' : 'Standalone'
      ]);
      return { headers, rows, filename: 'work_reports.csv' };
    }
    if (type === 'overdue') {
      const headers = ['Title', 'Type', 'Assignee', 'Project', 'Due Date', 'Overdue Days', 'Priority'];
      const rows = overdueItemsList.map(w => {
        const diff = Math.max(0, Math.round((new Date(endDate) - new Date(w.expected_date)) / 86400000));
        return [
          w.title, w.type, safeProfiles.find(p => p.id === w.assignee_id)?.name || 'Unassigned', w.container_id ? safeContainers.find(c => c.id === w.container_id)?.title || 'Container' : 'Standalone', w.expected_date, diff, w.priority || 'Medium'
        ];
      });
      return { headers, rows, filename: 'overdue_reports.csv' };
    }
    if (type === 'projects') {
      const headers = ['Project Title', 'Created Date', 'Created By', 'Active Assignees', 'Total Milestones', 'Active Milestones', 'Overdue Milestones', 'Recently Completed', 'Latest Activity'];
      const rows = projectsData.map(p => [
        p.title, fmtDate(p.created_at), safeProfiles.find(x => x.id === p.created_by)?.name || 'Admin', p.assigneesCount, p.totalMilestones, p.activeMilestones, p.overdueMilestones, p.recentlyCompleted, fmtDate(p.latestActivityDate)
      ]);
      return { headers, rows, filename: 'project_operational_reports.csv' };
    }
    if (type === 'recurring') {
      const headers = ['Template Name', 'Assignee', 'Status', 'Last Spawned Date', 'Overdue Spawns'];
      const rows = (savedTasks || []).filter(t => t.is_recurring).map(t => {
        const overdueSpawn = overdueItemsList.filter(o => o.title === t.title).length;
        return [
          t.title, safeProfiles.find(p => p.id === t.assignee_id)?.name || 'Unassigned', t.is_active ? 'Active' : 'Paused', t.last_generated_at || '—', overdueSpawn
        ];
      });
      return { headers, rows, filename: 'recurring_summaries.csv' };
    }
  };

  const getLogsText = (type) => {
    if (type === 'activity') {
      return actionable.map(w => `[${w.created_at}] ITEM CREATED: ${w.title} (${w.type}) assigned to ${safeProfiles.find(p => p.id === w.assignee_id)?.name || 'Unassigned'}. Status: ${w.status}.`).join('\n');
    }
    if (type === 'completion') {
      return completedItems.map(w => `[${w.completed_at}] COMPLETED: ${w.title} (${w.type}) by ${safeProfiles.find(p => p.id === w.assignee_id)?.name || 'Unassigned'}. Note: ${w.completion_note || 'None'}. Tag: ${w.completion_tag || 'None'}.`).join('\n');
    }
    if (type === 'followup') {
      return safeWorkItems.filter(w => w.linked_to && w.created_at && w.created_at.split('T')[0] >= startDate && w.created_at.split('T')[0] <= endDate).map(w => {
        const orig = safeWorkItems.find(x => x.id === w.linked_to);
        return `[${w.created_at}] FOLLOW-UP CREATED: "${w.title}" linked to "${orig?.title || 'Unknown Task'}" (Link Type: ${w.link_type || 'Continuation'}).`;
      }).join('\n');
    }
    if (type === 'recurring') {
      return (savedTasks || []).filter(t => t.is_recurring).map(t => {
        return `[Template] "${t.title}" (Status: ${t.is_active ? 'Active' : 'Paused'}) last generated on ${t.last_generated_at || 'Never'}.`;
      }).join('\n');
    }
    if (type === 'leave') {
      return (leaveRequests || []).filter(l => l.created_at && l.created_at.split('T')[0] >= startDate && l.created_at.split('T')[0] <= endDate).map(l => {
        const u = safeProfiles.find(p => p.id === l.user_id)?.name || 'User';
        return `[${l.created_at}] LEAVE REQUEST: ${u} applied for ${l.leave_type} from ${l.from_date} to ${l.to_date}. Status: ${l.status}. Approved by: ${safeProfiles.find(p => p.id === l.approved_by)?.name || '—'}.`;
      }).join('\n');
    }
  };

  // Dynamic Context-Sensitive Exports per Tab
  const downloadOverviewCSV = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Report Period From', startDate],
      ['Report Period To', endDate],
      ['Total Due Work', totalDueCount],
      ['Completed On Time', onTimeCount],
      ['Completed Late', lateCount],
      ['Overdue', overdueCount],
      ['Active Work (Neutral)', activeCount],
      ['Overall Efficiency Score', `${efficiencyScore}%`]
    ];
    triggerCSVDownload(headers, rows, 'cycle_overview_report.csv');
  };

  const downloadOverviewPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("WorkPulse ERP - Cycle Overview Report", 15, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()} | Period: ${formatFriendlyDate(startDate)} to ${formatFriendlyDate(endDate)}`, 15, 28);
    doc.line(15, 30, 195, 30);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Overview Summary Metrics", 15, 42);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Due Work: ${totalDueCount}`, 20, 52);
    doc.text(`Completed On Time: ${onTimeCount}`, 20, 60);
    doc.text(`Completed Late: ${lateCount}`, 20, 68);
    doc.text(`Overdue Items: ${overdueCount}`, 120, 52);
    doc.text(`Active (Neutral) Load: ${activeCount}`, 120, 60);
    doc.text(`Overall Operational Efficiency: ${efficiencyScore}%`, 120, 68);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Visual Analytics Legends", 15, 84);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("• Completion Status Donut: Highlights the ratio of on-time, late, and overdue completed tasks.", 20, 94);
    doc.text("• Staff Productivity Matrix: Focuses on the efficiency score of active operational employees.", 20, 102);
    doc.text("• Overdue Work distribution: Pinpoints which team members hold outstanding overdue work.", 20, 110);
    doc.text("• Project Milestones Health: Lists the quantity of active and overdue milestones across projects.", 20, 118);

    doc.save(`cycle_overview_report_${endDate}.pdf`);
  };

  const printOverview = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    
    printWin.document.write(`
      <!DOCTYPE html><html><head><title>WorkPulse - Cycle Overview Report</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:32px;color:#1e293b}
        h1{font-size:24px;font-weight:900;margin-bottom:2px}
        p{color:#64748b;font-size:13px;margin-bottom:24px}
        .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:24px}
        .card{background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:12px}
        .card-title{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:bold;letter-spacing:.05em}
        .card-val{font-size:28px;font-weight:900;margin-top:4px}
      </style></head><body>
      <h1>WorkPulse Cycle Overview Report</h1>
      <p>Report Period: ${formatFriendlyDate(startDate)} to ${formatFriendlyDate(endDate)}</p>
      <div class="grid">
        <div class="card"><div class="card-title">Total Due Work</div><div class="card-val">${totalDueCount}</div></div>
        <div class="card"><div class="card-title">Completed On Time</div><div class="card-val">${onTimeCount}</div></div>
        <div class="card"><div class="card-title">Completed Late</div><div class="card-val">${lateCount}</div></div>
        <div class="card"><div class="card-title">Overdue Items</div><div class="card-val">${overdueCount}</div></div>
        <div class="card"><div class="card-title">Active Work (Neutral)</div><div class="card-val">${activeCount}</div></div>
        <div class="card" style="background:#2563eb;color:white"><div class="card-title" style="color:rgba(255,255,255,0.8)">Operational Efficiency</div><div class="card-val">${efficiencyScore}%</div></div>
      </div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    printWin.document.close();
  };

  const downloadStaffCSV = () => {
    const headers = ['Assignee', 'Role', 'Department', 'Category', 'Total Due Work', 'Completed On Time', 'Completed Late', 'Overdue', 'Active Work', 'Efficiency %', 'Active Projects'];
    const rows = staffPerformanceData.map(s => [
      s.name, s.role, s.department || '—', s.category || 'Office Staff', s.totalDue, s.onTime, s.late, s.overdue, s.active, `${s.efficiency}%`, s.projectsCount
    ]);
    triggerCSVDownload(headers, rows, 'staff_performance_report.csv');
  };

  const downloadStaffPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("WorkPulse ERP - Staff Performance Report", 15, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()} | Period: ${formatFriendlyDate(startDate)} to ${formatFriendlyDate(endDate)}`, 15, 28);
    doc.line(15, 30, 195, 30);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Assignee Performance Matrix", 15, 42);
    
    let y = 50;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Assignee", 15, y);
    doc.text("Role", 60, y);
    doc.text("Due", 100, y);
    doc.text("On-Time", 120, y);
    doc.text("Late", 140, y);
    doc.text("Overdue", 160, y);
    doc.text("Efficiency %", 180, y);
    y += 4;
    doc.line(15, y, 195, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    staffPerformanceData.forEach(s => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(s.name, 15, y);
      doc.text(s.role.substring(0, 18), 60, y);
      doc.text(String(s.totalDue), 100, y);
      doc.text(String(s.onTime), 120, y);
      doc.text(String(s.late), 140, y);
      doc.text(String(s.overdue), 160, y);
      doc.text(`${s.efficiency}%`, 180, y);
      y += 6;
    });

    doc.save(`staff_performance_report_${endDate}.pdf`);
  };

  const printStaff = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    
    const rows = staffPerformanceData.map(s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.role}</td>
        <td style="text-align:center">${s.totalDue}</td>
        <td style="text-align:center">${s.onTime}</td>
        <td style="text-align:center">${s.late}</td>
        <td style="text-align:center;font-weight:bold;color:${s.overdue > 0 ? '#ef4444' : '#22c55e'}">${s.overdue}</td>
        <td style="text-align:center">${s.active}</td>
        <td style="text-align:center;font-weight:bold;color:${s.efficiency >= 80 ? '#2563eb' : s.efficiency >= 60 ? '#d97706' : '#ef4444'}">${s.efficiency}%</td>
      </tr>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html><html><head><title>WorkPulse Reports Summary</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:32px;color:#1e293b}
        h1{font-size:24px;font-weight:900;margin-bottom:2px}
        p{color:#64748b;font-size:13px;margin-bottom:24px}
        table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px}
        th{background:#f1f5f9;padding:10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
        td{padding:10px;border-bottom:1px solid #e2e8f0}
      </style></head><body>
      <h1>WorkPulse Staff Operational Performance Report</h1>
      <p>Report Period: ${formatFriendlyDate(startDate)} to ${formatFriendlyDate(endDate)}</p>
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Role</th><th style="text-align:center">Total Due</th>
            <th style="text-align:center">On-Time</th><th style="text-align:center">Late</th>
            <th style="text-align:center">Overdue</th><th style="text-align:center">Active Load</th>
            <th style="text-align:center">Efficiency</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    printWin.document.close();
  };

  const downloadProjectsCSV = () => {
    const headers = ['Project Title', 'Created Date', 'Created By', 'Active Assignees', 'Total Milestones', 'Active Milestones', 'Overdue Milestones', 'Recently Completed', 'Latest Activity'];
    const rows = projectsData.map(p => [
      p.title, fmtDate(p.created_at), safeProfiles.find(x => x.id === p.created_by)?.name || 'Admin', p.assigneesCount, p.totalMilestones, p.activeMilestones, p.overdueMilestones, p.recentlyCompleted, fmtDate(p.latestActivityDate)
    ]);
    triggerCSVDownload(headers, rows, 'projects_operational_report.csv');
  };

  const downloadProjectsPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("WorkPulse ERP - Project Timeline Report", 15, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()} | Period: ${formatFriendlyDate(startDate)} to ${formatFriendlyDate(endDate)}`, 15, 28);
    doc.line(15, 30, 195, 30);

    let y = 40;
    projectsData.forEach(p => {
      if (y > 250) { doc.addPage(); y = 20; }
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`Project: ${p.title} (Status: ${p.status || 'Active'})`, 15, y);
      y += 5;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Created By: ${safeProfiles.find(x => x.id === p.created_by)?.name || 'Admin'} | Total Milestones: ${p.totalMilestones} | Active: ${p.activeMilestones} | Overdue: ${p.overdueMilestones}`, 15, y);
      y += 6;

      const pMilestones = p.milestones || [];
      if (pMilestones.length === 0) {
        doc.text("  No milestones recorded in this cycle.", 15, y);
        y += 6;
      } else {
        pMilestones.forEach(m => {
          if (y > 270) { doc.addPage(); y = 20; }
          const status = getDisplayStatus(m);
          const assignee = safeProfiles.find(x => x.id === m.assignee_id)?.name || 'Unassigned';
          doc.text(`  • Milestone: ${m.title} | Assignee: ${assignee} | Due: ${m.expected_date || 'None'} | Status: ${status}`, 15, y);
          y += 5;
        });
      }
      y += 4;
    });

    doc.save(`project_operational_timelines_${endDate}.pdf`);
  };

  const printProjects = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    
    const rows = projectsData.map(p => `
      <div style="margin-bottom: 24px; page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${p.title} (${p.status || 'Active'})</h3>
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b;">
          Created Date: ${fmtDate(p.created_at)} | Milestones: ${p.totalMilestones} | Active: ${p.activeMilestones} | Overdue: ${p.overdueMilestones}
        </p>
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:6px; text-align:left;">Milestone Title</th>
              <th style="padding:6px; text-align:left;">Assignee</th>
              <th style="padding:6px; text-align:center;">Due Date</th>
              <th style="padding:6px; text-align:center;">Completed Date</th>
              <th style="padding:6px; text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${(p.milestones || []).map(m => `
              <tr>
                <td style="padding:6px; border-bottom:1px solid #e2e8f0;">${m.title}</td>
                <td style="padding:6px; border-bottom:1px solid #e2e8f0;">${safeProfiles.find(x => x.id === m.assignee_id)?.name || 'Unassigned'}</td>
                <td style="padding:6px; border-bottom:1px solid #e2e8f0; text-align:center;">${m.expected_date || '—'}</td>
                <td style="padding:6px; border-bottom:1px solid #e2e8f0; text-align:center;">${m.completed_at ? fmtDate(m.completed_at) : '—'}</td>
                <td style="padding:6px; border-bottom:1px solid #e2e8f0; text-align:center;">${getDisplayStatus(m)}</td>
              </tr>
            `).join('')}
            ${p.milestones.length === 0 ? '<tr><td colspan="5" style="padding:10px; text-align:center; color:#64748b;">No milestones.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html><html><head><title>WorkPulse - Project Milestones Report</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:32px;color:#1e293b}
        h1{font-size:24px;font-weight:900;margin-bottom:2px}
        p{color:#64748b;font-size:13px;margin-bottom:24px}
      </style></head><body>
      <h1>WorkPulse Project Milestones Operational Report</h1>
      <p>Report Period: ${formatFriendlyDate(startDate)} to ${formatFriendlyDate(endDate)}</p>
      ${rows}
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    printWin.document.close();
  };

  const downloadOverdueCSV = () => {
    const headers = ['Title', 'Type', 'Assignee', 'Project/Event', 'Due Date', 'Overdue Days', 'Priority'];
    const rows = overdueItemsList.map(w => {
      const diff = Math.max(0, Math.round((new Date(endDate) - new Date(w.expected_date)) / 86400000));
      return [
        w.title, w.type, safeProfiles.find(p => p.id === w.assignee_id)?.name || 'Unassigned', 
        w.container_id ? safeContainers.find(c => c.id === w.container_id)?.title || 'Container' : 'Standalone', 
        w.expected_date, diff, w.priority || 'Medium'
      ];
    });
    triggerCSVDownload(headers, rows, 'overdue_analysis_report.csv');
  };

  const downloadOverduePDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("WorkPulse ERP - Overdue Analysis Report", 15, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()} | Period: ${formatFriendlyDate(startDate)} to ${formatFriendlyDate(endDate)}`, 15, 28);
    doc.line(15, 30, 195, 30);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Outstanding Overdue Tasks (Finalized as of yesterday)", 15, 42);

    let y = 50;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Task Title", 15, y);
    doc.text("Assignee", 80, y);
    doc.text("Due Date", 125, y);
    doc.text("Late Days", 150, y);
    doc.text("Priority", 175, y);
    y += 4;
    doc.line(15, y, 195, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    overdueItemsList.forEach(o => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const assignee = safeProfiles.find(x => x.id === o.assignee_id)?.name || 'Unassigned';
      const diff = Math.max(0, Math.round((new Date(endDate) - new Date(o.expected_date)) / 86400000));
      doc.text(o.title.substring(0, 30), 15, y);
      doc.text(assignee, 80, y);
      doc.text(o.expected_date || '—', 125, y);
      doc.text(`${diff} Days`, 150, y);
      doc.text(o.priority || 'Medium', 175, y);
      y += 6;
    });

    if (overdueItemsList.length === 0) {
      doc.text("No overdue items found in the current cycle.", 15, y);
    }

    doc.save(`overdue_analysis_report_${endDate}.pdf`);
  };

  const printOverdue = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    
    const rows = overdueItemsList.map(o => {
      const assignee = safeProfiles.find(x => x.id === o.assignee_id)?.name || 'Unassigned';
      const diff = Math.max(0, Math.round((new Date(endDate) - new Date(o.expected_date)) / 86400000));
      return `
        <tr>
          <td>${o.title}</td>
          <td>${o.type}</td>
          <td>${assignee}</td>
          <td style="text-align:center">${o.expected_date || '—'}</td>
          <td style="text-align:center;font-weight:bold;color:#ef4444">${diff} Days</td>
          <td style="text-align:center">${o.priority || 'Medium'}</td>
        </tr>
      `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html><html><head><title>WorkPulse - Overdue Analysis Report</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:32px;color:#1e293b}
        h1{font-size:24px;font-weight:900;margin-bottom:2px}
        p{color:#64748b;font-size:13px;margin-bottom:24px}
        table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px}
        th{background:#f1f5f9;padding:10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
        td{padding:10px;border-bottom:1px solid #e2e8f0}
      </style></head><body>
      <h1>WorkPulse Overdue Analysis Report</h1>
      <p>Report Period: ${formatFriendlyDate(startDate)} to ${formatFriendlyDate(endDate)}</p>
      <table>
        <thead>
          <tr>
            <th>Title</th><th>Type</th><th>Assignee</th><th style="text-align:center">Due Date</th><th style="text-align:center">Days Overdue</th><th style="text-align:center">Priority</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${overdueItemsList.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:24px;">No overdue items found.</td></tr>' : ''}
        </tbody>
      </table>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    printWin.document.close();
  };

  // Compile full ZIP and trigger download client-side
  const downloadZIPArchive = async () => {
    const zip = new JSZip();

    // Excel csv sheets
    const csvStaff = getCSVData('staff');
    zip.file("Excel_Reports/staff_performance.csv", [csvStaff.headers.join(','), ...csvStaff.rows.map(e => e.join(','))].join('\n'));
    
    const csvWork = getCSVData('work');
    zip.file("Excel_Reports/work_reports.csv", [csvWork.headers.join(','), ...csvWork.rows.map(e => e.join(','))].join('\n'));

    const csvOverdue = getCSVData('overdue');
    zip.file("Excel_Reports/overdue_reports.csv", [csvOverdue.headers.join(','), ...csvOverdue.rows.map(e => e.join(','))].join('\n'));

    const csvProj = getCSVData('projects');
    zip.file("Excel_Reports/project_operational_reports.csv", [csvProj.headers.join(','), ...csvProj.rows.map(e => e.join(','))].join('\n'));

    const csvRec = getCSVData('recurring');
    zip.file("Excel_Reports/recurring_summaries.csv", [csvRec.headers.join(','), ...csvRec.rows.map(e => e.join(','))].join('\n'));

    // PDFs
    const overviewPdf = new jsPDF();
    overviewPdf.setFont("helvetica", "bold");
    overviewPdf.setFontSize(22);
    overviewPdf.text("WorkPulse ERP - Cycle Overview Report", 15, 20);
    overviewPdf.setFontSize(10);
    overviewPdf.setFont("helvetica", "normal");
    overviewPdf.text(`Generated: ${new Date().toLocaleString()} | Period: ${formatFriendlyDate(startDate)} to ${formatFriendlyDate(endDate)}`, 15, 28);
    overviewPdf.line(15, 30, 195, 30);
    overviewPdf.setFont("helvetica", "bold");
    overviewPdf.setFontSize(14);
    overviewPdf.text("Overview Summary Metrics", 15, 42);
    overviewPdf.setFontSize(11);
    overviewPdf.setFont("helvetica", "normal");
    overviewPdf.text(`Total Due Work: ${totalDueCount}`, 20, 52);
    overviewPdf.text(`Completed On Time: ${onTimeCount}`, 20, 60);
    overviewPdf.text(`Completed Late: ${lateCount}`, 20, 68);
    overviewPdf.text(`Overdue Items: ${overdueCount}`, 120, 52);
    overviewPdf.text(`Active (Neutral) Load: ${activeCount}`, 120, 60);
    overviewPdf.text(`Overall Operational Efficiency: ${efficiencyScore}%`, 120, 68);
    zip.file("PDF_Reports/operational_summary.pdf", overviewPdf.output('blob'));
    zip.file("PDF_Reports/efficiency_summary.pdf", overviewPdf.output('blob'));

    // Staff-wise scorecard PDF
    const staffPdf = new jsPDF();
    staffPdf.setFontSize(16);
    staffPdf.setFont("helvetica", "bold");
    staffPdf.text("Staff Performance Scorecards", 15, 20);
    staffPdf.setFontSize(10);
    staffPdf.setFont("helvetica", "normal");
    let sy = 30;
    staffPerformanceData.forEach(s => {
      if (sy > 250) { staffPdf.addPage(); sy = 20; }
      staffPdf.setFont("helvetica", "bold");
      staffPdf.text(`${s.name} (${s.role}) - Efficiency: ${s.efficiency}%`, 15, sy);
      sy += 5;
      staffPdf.setFont("helvetica", "normal");
      staffPdf.text(`  Total Due: ${s.totalDue} | On-Time: ${s.onTime} | Late: ${s.late} | Overdue: ${s.overdue} | Active Load: ${s.active}`, 15, sy);
      sy += 8;
    });
    zip.file("PDF_Reports/staff_wise_performance.pdf", staffPdf.output('blob'));

    // Timeline Summary PDF
    const timelinePdf = new jsPDF();
    timelinePdf.setFontSize(16);
    timelinePdf.setFont("helvetica", "bold");
    timelinePdf.text("Project Milestones Timeline Flow", 15, 20);
    timelinePdf.setFontSize(10);
    timelinePdf.setFont("helvetica", "normal");
    let py = 30;
    projectsData.forEach(p => {
      if (py > 260) { timelinePdf.addPage(); py = 20; }
      timelinePdf.setFont("helvetica", "bold");
      timelinePdf.text(`Project: ${p.title} (Created: ${fmtDate(p.created_at)})`, 15, py);
      py += 6;
      timelinePdf.setFont("helvetica", "normal");
      
      const pMilestones = p.milestones || [];
      if (pMilestones.length === 0) {
        timelinePdf.text("  No milestones recorded.", 15, py);
        py += 6;
      } else {
        pMilestones.forEach(m => {
          timelinePdf.text(`  • ${m.title} - Due: ${m.expected_date || 'None'} - Status: ${getDisplayStatus(m)}`, 15, py);
          py += 5;
        });
      }
      py += 4;
    });
    zip.file("PDF_Reports/project_timelines.pdf", timelinePdf.output('blob'));

    // Logs
    zip.file("Logs/completion_logs.txt", getLogsText('completion') || '');
    zip.file("Logs/follow_up_logs.txt", getLogsText('followup') || '');
    zip.file("Logs/recurring_generation_logs.txt", getLogsText('recurring') || '');
    zip.file("Logs/leave_logs.txt", getLogsText('leave') || '');

    // Generate zip blob and trigger browser download
    const nextArchiveNum = (archivesList && archivesList[0] ? archivesList[0].archive_number : 0) + 1;
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = `Archive_${nextArchiveNum}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // ARCHIVE & RESET SYSTEM FLOW
  // ───────────────────────────────────────────────────────────────────────────
  const triggerArchiveAndReset = async () => {
    if (!window.confirm("CRITICAL WARNING: This action will compile and download the current cycle's ZIP archive and then permanent DELETE completed operational tasks, followups, checklist items, and logs from the active database. Overdue/Ongoing items and templates will be preserved. Closed Projects will be deleted. Are you sure you want to proceed?")) {
      return;
    }

    setIsArchiving(true);
    setArchiveProgress('Gathering cycle datasets...');

    try {
      // Step 1: Download the ZIP Package client-side (Aborts transaction if this fails)
      setArchiveProgress('Compiling reports and Excel sheets...');
      await new Promise(r => setTimeout(r, 800));
      setArchiveProgress('Building PDF operational summaries...');
      await new Promise(r => setTimeout(r, 600));
      setArchiveProgress('Packing archive ZIP and downloading...');
      
      // Trigger download
      await downloadZIPArchive();
      await new Promise(r => setTimeout(r, 1200));

      // Step 2: Prepare the Archive Metadata Snapshot for Supabase
      setArchiveProgress('Creating archive snapshot record...');
      const archiveSummaryObj = {
        metrics: {
          totalDueWork: totalDueCount,
          completedOnTime: onTimeCount,
          completedLate: lateCount,
          overdue: overdueCount,
          activeWork: activeCount,
          efficiency: efficiencyScore
        },
        staffPerformance: staffPerformanceData.map(s => ({
          name: s.name, role: s.role, totalDue: s.totalDue, onTime: s.onTime, late: s.late, overdue: s.overdue, active: s.active, efficiency: s.efficiency
        })),
        projects: projectsData.map(p => ({
          title: p.title, created_at: p.created_at, milestonesCount: p.totalMilestones, activeMilestones: p.activeMilestones, overdueMilestones: p.overdueMilestones, status: p.status
        }))
      };

      const { data: insertedArchive, error: archiveErr } = await supabase
        .from('archives')
        .insert([{
          total_items: completedItems.length + completedLate.length,
          generated_by: currentUser?.id,
          archive_summary: archiveSummaryObj,
          drive_link: null, 
          metadata: {
            report_from: startDate,
            report_to: endDate,
            clean_date: todayStr,
            cleared_tasks_count: completedItems.filter(w => w.type === 'Task').length,
            cleared_checklists_count: completedItems.filter(w => w.type === 'Checklist').length
          }
        }])
        .select();

      if (archiveErr) {
        throw new Error("Failed to write archive record: " + archiveErr.message);
      }

      // Step 3: Perform database cleanup and update status of overdue items
      setArchiveProgress('Applying "previously overdue" flags...');
      const overdueIds = overdueItemsList.map(o => o.id);
      if (overdueIds.length > 0) {
        const { error: updErr } = await supabase
          .from('work_items')
          .update({ previously_overdue: true })
          .in('id', overdueIds);
        if (updErr) console.error("Error setting previously_overdue:", updErr);
      }

      setArchiveProgress('Cleaning up completed standalone tasks and logs...');
      
      // 1. Delete completed standalone tasks (no container_id, status = Completed, type = Task/Checklist)
      const completedStandaloneTasks = safeWorkItems.filter(w => 
        w.status === 'Completed' && 
        !w.container_id && 
        (w.type === 'Task' || w.type === 'Checklist')
      );
      const standaloneToDeleteIds = completedStandaloneTasks.map(t => t.id);

      if (standaloneToDeleteIds.length > 0) {
        const { error: delErr } = await supabase
          .from('work_items')
          .delete()
          .in('id', standaloneToDeleteIds);
        if (delErr) console.error("Error deleting completed standalone tasks:", delErr);
      }

      // 2. Delete old notifications (is_read = true)
      const { error: notifDelErr } = await supabase
        .from('notifications')
        .delete()
        .eq('is_read', true);
      if (notifDelErr) console.error("Error clearing read notifications:", notifDelErr);

      // 3. Closed Projects and Completed Events Cleanup
      setArchiveProgress('Removing Closed Projects and Completed Events...');
      const closedContainers = safeContainers.filter(c => 
        c.status === 'Closed' && 
        (c.type === 'Project' || c.type === 'Event')
      );

      for (const container of closedContainers) {
        // Delete all work items nested inside the closed project or completed event
        const nestedItems = safeWorkItems.filter(w => w.container_id === container.id);
        const nestedIds = nestedItems.map(item => item.id);
        
        if (nestedIds.length > 0) {
          const { error: nestedDelErr } = await supabase
            .from('work_items')
            .delete()
            .in('id', nestedIds);
          if (nestedDelErr) console.error(`Error deleting items under container ${container.id}:`, nestedDelErr);
        }
        
        // Delete the container itself
        const { error: containerDelErr } = await supabase
          .from('containers')
          .delete()
          .eq('id', container.id);
        if (containerDelErr) console.error(`Error deleting container ${container.id}:`, containerDelErr);
      }

      setArchiveProgress('Refetching updated system state...');
      await fetchArchives();
      
      setArchiveProgress('Archive & Reset successfully completed!');
      await new Promise(r => setTimeout(r, 1200));

    } catch (error) {
      alert("Error during archive reset: " + error.message);
      setIsArchiving(false);
      setArchiveProgress('');
      return;
    } finally {
      setIsArchiving(false);
      setArchiveProgress('');
    }
    
    // Reload page to refresh state
    window.location.reload();
  };

  // Re-download ZIP from past archive summary
  const downloadPastArchiveZIP = async (archive) => {
    const summary = archive.archive_summary;
    if (!summary) {
      alert("No summary snapshot data available in this archive record.");
      return;
    }

    const zip = new JSZip();

    // Reconstruct CSV files
    const staffHeaders = ['Assignee', 'Role', 'Total Due Work', 'Completed On Time', 'Completed Late', 'Overdue', 'Active Work', 'Efficiency %'];
    const staffRows = (summary.staffPerformance || []).map(s => [
      s.name, s.role, s.totalDue, s.onTime, s.late, s.overdue, s.active, `${s.efficiency}%`
    ]);
    zip.file("Excel_Reports/staff_performance.csv", [staffHeaders.join(','), ...staffRows.map(e => e.join(','))].join('\n'));

    const projHeaders = ['Project Title', 'Created Date', 'Milestones Count', 'Active Milestones', 'Overdue Milestones', 'Status'];
    const projRows = (summary.projects || []).map(p => [
      p.title, fmtDate(p.created_at), p.milestonesCount, p.activeMilestones, p.overdueMilestones, p.status || 'Active'
    ]);
    zip.file("Excel_Reports/project_operational_reports.csv", [projHeaders.join(','), ...projRows.map(e => e.join(','))].join('\n'));

    // Reconstruct text stats summary
    const txtStats = `
WORKPULSE ERP HISTORICAL ARCHIVE SNAPSHOT
------------------------------------------
Archive Number: #${archive.archive_number}
Archive Date: ${new Date(archive.archive_date).toLocaleString()}
Generated By: Admin
Total Cleared Items: ${archive.total_items}
Report Period: ${formatFriendlyDate(archive.metadata?.report_from)} to ${formatFriendlyDate(archive.metadata?.report_to)}

CYCLE PERFORMANCE SUMMARY:
Total Due Work: ${summary.metrics?.totalDueWork ?? 0}
Completed On Time: ${summary.metrics?.completedOnTime ?? 0}
Completed Late: ${summary.metrics?.completedLate ?? 0}
Overdue Work: ${summary.metrics?.overdue ?? 0}
Active Neutral Load: ${summary.metrics?.activeWork ?? 0}
Overall Efficiency: ${summary.metrics?.efficiency ?? 0}%
    `;
    zip.file("Operational_Summary.txt", txtStats);

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = `Archive_${archive.archive_number}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render warning if migration SQL is needed
  const renderMigrationNotice = () => {
    if (!isMigrationNeeded) return null;
    return (
      <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-4 flex flex-col gap-2 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>
        <div className="flex items-center gap-2 font-bold ml-2">
          <span className="material-symbols-outlined text-amber-600">warning</span>
          Database Migration Required
        </div>
        <p className="text-xs text-amber-700 ml-8">
          The <code>archives</code> table or columns are not yet created in your Supabase database. To enable the Close Project flow and Archive & Reset triggers, please copy and run the contents of the <code>migration_reports_and_archives.sql</code> file in your Supabase SQL Editor.
        </p>
      </div>
    );
  };

  // ─── Assignee View ────────────────────────────────────────────────────────
  // ─── Assignee View ────────────────────────────────────────────────────────
  if (currentUser.role === 'Assignee') {
    // Only count items created on or before yesterday (endDate)
    const myItemsAll = safeWorkItems.filter(w => 
      w.assignee_id === currentUser.id && 
      !w.previously_overdue && 
      w.created_at && 
      w.created_at.split('T')[0] <= endDate
    );
    const myItems = getActionableUnits(myItemsAll);
    
    // Completed items in report period
    const completed = myItems.filter(w => 
      w.status === 'Completed' && 
      w.completed_at && 
      w.completed_at.split('T')[0] <= endDate
    );
    
    // Completed On Time: due in period, completed on or before due date
    const compOnTime = completed.filter(t => 
      t.expected_date && 
      t.expected_date >= startDate && 
      t.expected_date <= endDate && 
      getISTDateString(t.completed_at) <= t.expected_date
    );

    // Completed Late: due in period, completed after due date (but completed on or before yesterday)
    const compLate = completed.filter(t => 
      t.expected_date && 
      t.expected_date >= startDate && 
      t.expected_date <= endDate && 
      getISTDateString(t.completed_at) > t.expected_date
    );

    // Overdue: due in period and not completed as of yesterday
    const overdue = myItems.filter(w => 
      w.expected_date && 
      w.expected_date >= startDate && 
      w.expected_date <= endDate && 
      (w.status !== 'Completed' || (w.completed_at && getISTDateString(w.completed_at) > endDate))
    );

    // Active (Neutral load): future due or no due date, not completed as of yesterday
    const active = myItems.filter(w => 
      (w.status !== 'Completed' || (w.completed_at && getISTDateString(w.completed_at) > endDate)) && 
      (!w.expected_date || w.expected_date > endDate)
    );

    const totalDue = myItems.filter(w => 
      w.expected_date && 
      w.expected_date >= startDate && 
      w.expected_date <= endDate
    ).length;

    const prodScore = totalDue === 0 ? 100 : Math.round(
      ((compOnTime.length * 1.0 + compLate.length * 0.5) / totalDue) * 100
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Tab calculations
    // ─────────────────────────────────────────────────────────────────────────
    const currentTab = ['Overview', 'Projects', 'Overdue Analysis'].includes(activeTab) ? activeTab : 'Overview';

    // Projects Tab calculations
    const myProjectsData = projectsData.filter(proj => {
      const hasAssigneeMilestone = proj.milestones.some(m => m.assignee_id === currentUser.id);
      const hasAssigneeTask = safeWorkItems.some(w => w.container_id === proj.id && w.assignee_id === currentUser.id);
      return hasAssigneeMilestone || hasAssigneeTask;
    }).map(proj => {
      const myMilestones = proj.milestones.filter(m => m.assignee_id === currentUser.id);
      const activeMyMilestones = myMilestones.filter(w => 
        w.status !== 'Completed' || (w.completed_at && w.completed_at.split('T')[0] > endDate)
      );
      const overdueMyMilestones = myMilestones.filter(w => 
        w.expected_date && 
        w.expected_date <= endDate && 
        (w.status !== 'Completed' || (w.completed_at && w.completed_at.split('T')[0] > endDate))
      );
      const completedMyMilestones = myMilestones.filter(w => 
        w.status === 'Completed' && 
        w.completed_at && 
        w.completed_at.split('T')[0] <= endDate
      );
      const recentlyCompletedMyMilestones = completedMyMilestones.filter(m => {
        const compDate = new Date(m.completed_at);
        const limitDate = new Date(endDate);
        limitDate.setDate(limitDate.getDate() - 7);
        return compDate >= limitDate;
      });

      const dates = [
        proj.created_at,
        ...myMilestones.map(m => m.completed_at),
        ...myMilestones.map(m => m.updated_at),
        ...myMilestones.map(m => m.created_at)
      ].filter(Boolean).map(d => new Date(d)).filter(d => getISTDateString(d) <= endDate);
      
      const latestActivity = dates.length > 0 ? new Date(Math.max(...dates)) : new Date(proj.created_at);

      return {
        ...proj,
        totalMilestones: myMilestones.length,
        activeMilestones: activeMyMilestones.length,
        overdueMilestones: overdueMyMilestones.length,
        recentlyCompleted: recentlyCompletedMyMilestones.length,
        assigneesCount: 1,
        latestActivityDate: latestActivity,
        milestones: myMilestones
      };
    });

    const myUrgentMilestonesCount = safeWorkItems.filter(w => 
      w.assignee_id === currentUser.id &&
      w.type === 'Milestone' && 
      w.status !== 'Completed' && 
      (w.expected_date === todayStr || w.expected_date === tomorrowStr)
    ).length;

    // Overdue Analysis calculations
    const myOldestOverdueItems = [...overdue].sort((a, b) => {
      return (a.expected_date || '').localeCompare(b.expected_date || '');
    });

    const myPriorityOverdue = overdue.reduce((acc, item) => {
      const prio = item.priority || 'Medium';
      acc[prio] = (acc[prio] || 0) + 1;
      return acc;
    }, { Critical: 0, High: 0, Medium: 0, Low: 0 });

    const myRecurringMisses = overdue.filter(item => {
      return savedTasks?.some(t => t.title === item.title && t.is_recurring);
    });

    // Charts calculations
    const getEfficiencyByType = (type) => {
      const typeItems = myItems.filter(w => w.type === type);
      const typeDue = typeItems.filter(w => 
        w.expected_date && 
        w.expected_date >= startDate && 
        w.expected_date <= endDate
      ).length;
      
      const typeOnTime = typeItems.filter(t => 
        t.expected_date && 
        t.expected_date >= startDate && 
        t.expected_date <= endDate && 
        t.status === 'Completed' && 
        t.completed_at && 
        getISTDateString(t.completed_at) <= t.expected_date
      ).length;

      const typeLate = typeItems.filter(t => 
        t.expected_date && 
        t.expected_date >= startDate && 
        t.expected_date <= endDate && 
        t.status === 'Completed' && 
        t.completed_at && 
        getISTDateString(t.completed_at) > t.expected_date
      ).length;

      return typeDue === 0 ? 100 : Math.round(
        ((typeOnTime * 1.0 + typeLate * 0.5) / typeDue) * 100
      );
    };

    const tasksEff = getEfficiencyByType('Task');
    const milestonesEff = getEfficiencyByType('Milestone');
    const checklistsEff = getEfficiencyByType('Checklist');

    const getCountsByType = (type) => {
      const typeItems = myItems.filter(w => w.type === type);
      const completedCount = typeItems.filter(w => w.status === 'Completed' && w.completed_at && w.completed_at.split('T')[0] <= endDate).length;
      const overdueCount = typeItems.filter(w => 
        w.expected_date && 
        w.expected_date >= startDate && 
        w.expected_date <= endDate && 
        (w.status !== 'Completed' || (w.completed_at && w.completed_at.split('T')[0] > endDate))
      ).length;
      const ongoingCount = typeItems.length - completedCount - overdueCount;
      return { completedCount, ongoingCount, overdueCount };
    };

    const taskCounts = getCountsByType('Task');
    const milestoneCounts = getCountsByType('Milestone');
    const checklistCounts = getCountsByType('Checklist');

    // Export Handlers
    const handleAssigneePdfExport = () => {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(`${currentUser.name} - Performance Report`, 15, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleDateString()} | Period: ${formatFriendlyDate(startDate)} to ${formatFriendlyDate(endDate)}`, 15, 27);
      doc.line(15, 29, 195, 29);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Personal Performance Dashboard", 15, 38);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Allocated Due Tasks: ${totalDue}`, 20, 46);
      doc.text(`Completed On-Time: ${compOnTime.length}`, 20, 53);
      doc.text(`Completed Late: ${compLate.length}`, 20, 60);
      doc.text(`Currently Overdue: ${overdue.length}`, 115, 46);
      doc.text(`Active Neutral Load: ${active.length}`, 115, 53);
      doc.text(`Calculated Efficiency: ${prodScore}%`, 115, 60);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Task History Logs", 15, 78);
      
      let y = 86;
      doc.setFontSize(9);
      doc.text("Task Title", 15, y);
      doc.text("Type", 95, y);
      doc.text("Status", 125, y);
      doc.text("Due Date", 160, y);
      y += 3;
      doc.line(15, y, 195, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      myItems.forEach(t => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(t.title, 15, y);
        doc.text(t.type, 95, y);
        doc.text(getDisplayStatus(t), 125, y);
        doc.text(t.expected_date || 'None', 160, y);
        y += 6;
      });

      doc.save(`${currentUser.name}_performance.pdf`);
    };

    const handleAssigneeOverviewCSV = () => {
      const headers = ['Metric', 'Value'];
      const rows = [
        ['Total Allocated Due Tasks', totalDue],
        ['Completed On-Time', compOnTime.length],
        ['Completed Late', compLate.length],
        ['Currently Overdue', overdue.length],
        ['Active Neutral Load', active.length],
        ['Calculated Efficiency', `${prodScore}%`]
      ];
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${currentUser.name}_performance_summary.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleAssigneeProjectsCSV = () => {
      const headers = ['Project Title', 'Created Date', 'Total Milestones', 'Active Milestones', 'Overdue Milestones', 'Recently Completed'];
      const rows = myProjectsData.map(p => [
        p.title, fmtDate(p.created_at), p.totalMilestones, p.activeMilestones, p.overdueMilestones, p.recentlyCompleted
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${currentUser.name}_projects_summary.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleAssigneeProjectsPDF = () => {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("My Project Milestones Timeline Flow", 15, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString()} | Period: ${formatFriendlyDate(startDate)} to ${formatFriendlyDate(endDate)}`, 15, 27);
      doc.line(15, 29, 195, 29);
      
      let py = 38;
      myProjectsData.forEach(p => {
        if (py > 260) { doc.addPage(); py = 20; }
        doc.setFont("helvetica", "bold");
        doc.text(`Project: ${p.title} (Created: ${fmtDate(p.created_at)})`, 15, py);
        py += 6;
        doc.setFont("helvetica", "normal");
        
        const myMilestones = p.milestones || [];
        if (myMilestones.length === 0) {
          doc.text("  No milestones recorded for you in this workspace.", 15, py);
          py += 6;
        } else {
          myMilestones.forEach(m => {
            const msDisplayStatus = getDisplayStatus(m);
            doc.text(`  • ${m.title} - Due: ${m.expected_date || 'None'} - Status: ${msDisplayStatus}`, 15, py);
            py += 5;
          });
        }
        py += 4;
      });
      doc.save(`${currentUser.name}_projects_timeline.pdf`);
    };

    const handleAssigneeOverdueCSV = () => {
      const headers = ['Title', 'Type', 'Due Date', 'Days Overdue', 'Priority'];
      const rows = overdue.map(o => {
        const diff = Math.max(0, Math.round((new Date(endDate) - new Date(o.expected_date)) / 86400000));
        return [o.title, o.type, o.expected_date || '—', `${diff} Days`, o.priority || 'Medium'];
      });
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${currentUser.name}_overdue_report.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleAssigneeOverduePDF = () => {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Personal Overdue Analysis Report", 15, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString()} | Period: ${formatFriendlyDate(startDate)} to ${formatFriendlyDate(endDate)}`, 15, 27);
      doc.line(15, 29, 195, 29);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("My Overdue Items", 15, 38);
      
      let y = 46;
      doc.setFontSize(9);
      doc.text("Title", 15, y);
      doc.text("Type", 95, y);
      doc.text("Due Date", 125, y);
      doc.text("Days Late", 150, y);
      doc.text("Priority", 175, y);
      y += 3;
      doc.line(15, y, 195, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      overdue.forEach(o => {
        if (y > 270) { doc.addPage(); y = 20; }
        const diff = Math.max(0, Math.round((new Date(endDate) - new Date(o.expected_date)) / 86400000));
        doc.text(o.title.substring(0, 30), 15, y);
        doc.text(o.type, 95, y);
        doc.text(o.expected_date || '—', 125, y);
        doc.text(`${diff} Days`, 150, y);
        doc.text(o.priority || 'Medium', 175, y);
        y += 6;
      });

      if (overdue.length === 0) {
        doc.text("No overdue items found in the current cycle.", 15, y);
      }
      doc.save(`${currentUser.name}_overdue_analysis.pdf`);
    };

    return (
      <div className="flex flex-col gap-6 w-full max-w-full md:max-w-[1200px] mx-auto pb-24">
        {/* Page Title & Context Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surface-container-high pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-on-surface tracking-tight mb-0.5 font-headline">My Performance Center</h1>
            <p className="text-xs text-on-surface-variant">Confidential operational scorecard</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-outline bg-slate-100 border border-outline-variant/30 px-3 py-2 rounded-xl">
              Period: {formatFriendlyDate(startDate)} to {formatFriendlyDate(endDate)}
            </span>
          </div>
        </div>

        {/* Tab Selector & Exports bar */}
        <div className="flex flex-col gap-3 bg-white border border-outline-variant/30 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-surface-container pb-3">
            <div className="flex bg-surface-container p-1 rounded-xl gap-0.5 overflow-x-auto max-w-full">
              {['Overview', 'Projects', 'Overdue Analysis'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                    currentTab === tab ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {currentTab === 'Projects' && (
                <label className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant cursor-pointer select-none bg-slate-50 border border-outline-variant/40 rounded-xl px-3 py-1.5 hover:bg-slate-100 transition-colors shadow-sm">
                  <input
                    type="checkbox"
                    checked={showClosedProjects}
                    onChange={e => setShowClosedProjects(e.target.checked)}
                    className="rounded text-primary focus:ring-primary/20"
                  />
                  Show Closed Projects
                </label>
              )}
            </div>
          </div>

          {/* Dynamic Export Controls per active tab */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-1 text-xs">
            <span className="font-bold text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">download</span> Export {currentTab} Data:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {currentTab === 'Overview' && (
                <>
                  <button onClick={handleAssigneeOverviewCSV} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1">CSV Summary</button>
                  <button onClick={handleAssigneePdfExport} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1">PDF Scorecard</button>
                </>
              )}
              {currentTab === 'Projects' && (
                <>
                  <button onClick={handleAssigneeProjectsCSV} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1">CSV Projects Summary</button>
                  <button onClick={handleAssigneeProjectsPDF} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1">PDF Timeline Flow</button>
                </>
              )}
              {currentTab === 'Overdue Analysis' && (
                <>
                  <button onClick={handleAssigneeOverdueCSV} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1">CSV Overdue List</button>
                  <button onClick={handleAssigneeOverduePDF} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1">PDF Analysis</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── OVERVIEW TAB ── */}
        {currentTab === 'Overview' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Top Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-sm">
                <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Total Due Work</p>
                <h3 className="text-2xl font-black font-headline text-on-surface mt-1">{totalDue}</h3>
              </div>
              
              <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-sm border-l-4 border-l-green-500">
                <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Completed On Time</p>
                <h3 className="text-2xl font-black font-headline text-green-600 mt-1">{compOnTime.length}</h3>
              </div>

              <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-sm border-l-4 border-l-orange-400">
                <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Completed Late</p>
                <h3 className="text-2xl font-black font-headline text-orange-500 mt-1">{compLate.length}</h3>
              </div>

              <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-sm border-l-4 border-l-red-500">
                <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Overdue</p>
                <h3 className="text-2xl font-black font-headline text-error mt-1">{overdue.length}</h3>
              </div>

              <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-sm border-l-4 border-l-blue-500">
                <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Active Work</p>
                <h3 className="text-2xl font-black font-headline text-blue-600 mt-1">{active.length}</h3>
              </div>

              <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-sm text-white p-4">
                <p className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Efficiency Score</p>
                <h3 className="text-2xl font-black font-headline mt-1">{prodScore}%</h3>
              </div>
            </div>

            {/* SVG Charts section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Completion Status Donut Chart */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex flex-col">
                <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider border-b pb-2 mb-4">Completion Status</h3>
                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 flex-1">
                  {/* SVG Donut */}
                  <div className="relative w-36 h-36">
                    {totalDue === 0 ? (
                      <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-xs text-outline italic">No work due</div>
                    ) : (
                      <svg className="w-full h-full transform -rotate-95" viewBox="0 0 42 42">
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4"></circle>
                        {/* On-Time Circle */}
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#22c55e" strokeWidth="4" 
                          strokeDasharray={`${Math.round((compOnTime.length/totalDue)*100)} ${100 - Math.round((compOnTime.length/totalDue)*100)}`} 
                          strokeDashoffset="0"></circle>
                        {/* Late Circle */}
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f97316" strokeWidth="4" 
                          strokeDasharray={`${Math.round((compLate.length/totalDue)*100)} ${100 - Math.round((compLate.length/totalDue)*100)}`} 
                          strokeDashoffset={`-${Math.round((compOnTime.length/totalDue)*100)}`}></circle>
                        {/* Overdue Circle */}
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#ef4444" strokeWidth="4" 
                          strokeDasharray={`${Math.round((overdue.length/totalDue)*100)} ${100 - Math.round((overdue.length/totalDue)*100)}`} 
                          strokeDashoffset={`-${Math.round(((compOnTime.length + compLate.length)/totalDue)*100)}`}></circle>
                      </svg>
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-on-surface font-headline">{totalDue}</span>
                      <span className="text-[8px] font-bold text-outline uppercase tracking-widest">Total Due</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 text-xs font-semibold text-on-surface-variant">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded-sm"></span> On Time: {compOnTime.length}</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-orange-400 rounded-sm"></span> Completed Late: {compLate.length}</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-sm"></span> Overdue: {overdue.length}</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded-sm"></span> Active Neutral: {active.length}</div>
                  </div>
                </div>
              </div>

              {/* Personal Efficiency by Type Bar Chart */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex flex-col">
                <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider border-b pb-2 mb-4">My Productivity by Type</h3>
                <div className="flex flex-col gap-4 max-h-56 overflow-y-auto pr-1">
                  {[
                    { name: 'Tasks', eff: tasksEff },
                    { name: 'Milestones', eff: milestonesEff },
                    { name: 'Checklists', eff: checklistsEff }
                  ].map(s => (
                    <div key={s.name} className="flex flex-col gap-1 text-xs">
                      <div className="flex justify-between font-bold text-on-surface-variant">
                        <span>{s.name}</span>
                        <span className={s.eff >= 80 ? 'text-primary' : s.eff >= 60 ? 'text-orange-500' : 'text-error'}>{s.eff}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${
                          s.eff >= 80 ? 'bg-primary' : s.eff >= 60 ? 'bg-orange-400' : 'bg-error'
                        }`} style={{ width: `${s.eff}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overdue Comparison by Priority */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex flex-col">
                <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px] text-error">hourglass_bottom</span> Overdue by Priority
                </h3>
                <div className="flex items-end gap-3 h-44 pt-4 border-b border-slate-200">
                  {Object.entries(myPriorityOverdue).map(([prio, count]) => {
                    const maxCount = Math.max(...Object.values(myPriorityOverdue), 1);
                    const hPct = Math.round((count / maxCount) * 100);
                    return (
                      <div key={prio} className="flex-1 flex flex-col items-center group">
                        <span className="text-[10px] font-black text-error mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                        <div className="w-6 sm:w-8 bg-error/15 group-hover:bg-error/30 border-t-2 border-error rounded-t-sm transition-all" style={{ height: `${hPct}%` }}></div>
                        <span className="text-[8px] font-bold text-outline mt-2 truncate w-14 text-center leading-none">{prio}</span>
                      </div>
                    );
                  })}
                  {Object.keys(myPriorityOverdue).length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-xs text-outline italic">No overdue work in this cycle</div>
                  )}
                </div>
              </div>

              {/* Work Status Distribution Chart */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex flex-col">
                <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px] text-primary">bar_chart</span> Work Distribution
                </h3>
                <div className="flex items-end gap-4 h-44 pt-4 border-b border-slate-200">
                  {[
                    { label: 'Tasks', ...taskCounts },
                    { label: 'Milestones', ...milestoneCounts },
                    { label: 'Checklists', ...checklistCounts }
                  ].map(cat => {
                    const maxVal = Math.max(taskCounts.completedCount + taskCounts.ongoingCount + taskCounts.overdueCount, milestoneCounts.completedCount + milestoneCounts.ongoingCount + milestoneCounts.overdueCount, checklistCounts.completedCount + checklistCounts.ongoingCount + checklistCounts.overdueCount, 1);
                    const compPct = Math.round((cat.completedCount / maxVal) * 100);
                    const ongPct = Math.round((cat.ongoingCount / maxVal) * 100);
                    const ovPct = Math.round((cat.overdueCount / maxVal) * 100);

                    return (
                      <div key={cat.label} className="flex-1 flex flex-col items-center">
                        <div className="flex items-end gap-1 w-full h-full justify-center">
                          {/* Completed Bar (Green) */}
                          <div title={`Completed: ${cat.completedCount}`} className="w-2 sm:w-3 bg-green-500/80 hover:bg-green-600 rounded-t-sm transition-all" style={{ height: `${compPct}%` }}></div>
                          {/* Ongoing Bar (Blue) */}
                          <div title={`Ongoing: ${cat.ongoingCount}`} className="w-2 sm:w-3 bg-blue-500/80 hover:bg-blue-600 rounded-t-sm transition-all" style={{ height: `${ongPct}%` }}></div>
                          {/* Overdue Bar (Red) */}
                          <div title={`Overdue: ${cat.overdueCount}`} className="w-2 sm:w-3 bg-red-500/80 hover:bg-red-600 rounded-t-sm transition-all" style={{ height: `${ovPct}%` }}></div>
                        </div>
                        <span className="text-[8px] font-bold text-outline mt-2 truncate w-14 text-center leading-none">{cat.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2.5 justify-center mt-3 text-[8px] font-bold text-outline uppercase tracking-wider">
                  <div className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-sm"></span> Completed</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-sm"></span> Ongoing</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-sm"></span> Overdue</div>
                </div>
              </div>
            </div>

            {/* Recent Work Section (Details Grid) */}
            <div className="bg-slate-50 border border-outline-variant/30 rounded-3xl p-6 shadow-inner">
              <h3 className="font-extrabold text-base font-headline text-on-surface mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">analytics</span> Personal Scorecard Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs font-semibold text-on-surface-variant">
                {/* 1. Overdue Items */}
                <div className="flex flex-col gap-2 bg-white rounded-2xl p-4 border border-outline-variant/30 shadow-sm">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-error flex items-center gap-1 border-b pb-2 mb-1.5">
                    <span className="material-symbols-outlined text-[14px]">warning</span> Overdue Items ({overdue.length})
                  </p>
                  <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {overdue.map(o => (
                      <div key={o.id} className="p-2 bg-red-50/50 border border-red-100 rounded-lg flex flex-col">
                        <span className="truncate font-bold text-red-900">{o.title}</span>
                        <span className="text-[9px] text-red-600 mt-0.5">Due: {o.expected_date}</span>
                      </div>
                    ))}
                    {overdue.length === 0 && <p className="text-xs text-outline italic py-6 text-center">No overdue items.</p>}
                  </div>
                </div>

                {/* 2. Ongoing & Active */}
                <div className="flex flex-col gap-2 bg-white rounded-2xl p-4 border border-outline-variant/30 shadow-sm">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-blue-600 flex items-center gap-1 border-b pb-2 mb-1.5">
                    <span className="material-symbols-outlined text-[14px]">play_circle</span> Ongoing & Active ({active.length})
                  </p>
                  <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {active.map(a => (
                      <div key={a.id} className="p-2 bg-blue-50/50 border border-blue-100 rounded-lg flex flex-col">
                        <span className="truncate font-bold text-blue-900">{a.title}</span>
                        <span className="text-[9px] text-blue-600 mt-0.5">{a.status} {a.expected_date ? `| Due: ${a.expected_date}` : ''}</span>
                      </div>
                    ))}
                    {active.length === 0 && <p className="text-xs text-outline italic py-6 text-center">No active works.</p>}
                  </div>
                </div>

                {/* 3. Recent Completions */}
                <div className="flex flex-col gap-2 bg-white rounded-2xl p-4 border border-outline-variant/30 shadow-sm">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-green-600 flex items-center gap-1 border-b pb-2 mb-1.5">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span> Recent Completions ({completed.length})
                  </p>
                  <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {completed.map(c => {
                      const isLate = c.expected_date && getISTDateString(c.completed_at) > c.expected_date;
                      return (
                        <div key={c.id} className={`p-2 border rounded-lg flex flex-col ${isLate ? 'bg-orange-50/40 border-orange-100' : 'bg-green-50/40 border-green-100'}`}>
                          <span className={`truncate font-bold ${isLate ? 'text-orange-900' : 'text-green-900'}`}>{c.title}</span>
                          <span className="text-[9px] text-outline mt-0.5">Done: {c.completed_at ? fmtDate(c.completed_at) : '—'} {isLate ? '(Late)' : '(On Time)'}</span>
                        </div>
                      );
                    })}
                    {completed.length === 0 && <p className="text-xs text-outline italic py-6 text-center">No recent completions.</p>}
                  </div>
                </div>

                {/* 4. Recurring Stats & Follow-ups */}
                <div className="flex flex-col gap-4 bg-white rounded-2xl p-4 border border-outline-variant/30 shadow-sm">
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[10px] text-purple-600 flex items-center gap-1 mb-1.5 border-b pb-2">
                      <span className="material-symbols-outlined text-[14px]">autorenew</span> Recurring Templates
                    </p>
                    <div className="bg-purple-50/50 border border-purple-100 p-2.5 rounded-xl text-purple-950 flex justify-between items-center mt-1">
                      <span className="font-medium text-[11px]">My templates:</span>
                      <span className="text-sm font-black bg-purple-100 px-2 py-0.5 rounded-md">
                        {savedTasks?.filter(t => t.assignee_id === currentUser.id && t.is_recurring).length || 0}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col min-h-0">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-teal-600 flex items-center gap-1 mb-1.5 border-b pb-2">
                      <span className="material-symbols-outlined text-[14px]">link</span> Follow-ups ({safeWorkItems.filter(w => w.assignee_id === currentUser.id && w.linked_to && w.created_at && w.created_at.split('T')[0] <= endDate).length})
                    </p>
                    <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                      {safeWorkItems.filter(w => w.assignee_id === currentUser.id && w.linked_to && w.created_at && w.created_at.split('T')[0] <= endDate).map(f => {
                        const orig = safeWorkItems.find(x => x.id === f.linked_to);
                        return (
                          <div key={f.id} className="p-1.5 bg-teal-50/50 border border-teal-100 rounded-md text-[10px] flex flex-col">
                            <span className="font-bold text-teal-900 truncate">{f.title}</span>
                            <span className="text-[8px] text-teal-600 mt-0.5">Linked to: {orig?.title || 'Unknown'}</span>
                          </div>
                        );
                      })}
                      {safeWorkItems.filter(w => w.assignee_id === currentUser.id && w.linked_to && w.created_at && w.created_at.split('T')[0] <= endDate).length === 0 && (
                        <p className="text-[11px] text-outline italic text-center py-4">No follow-ups logged.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PROJECTS TAB ── */}
        {currentTab === 'Projects' && (
          <div className="flex flex-col gap-5 animate-fade-in">
            {/* Urgent milestones banner */}
            {myUrgentMilestonesCount > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600" style={{fontVariationSettings:"'FILL' 1"}}>crisis_alert</span>
                  <span className="text-sm font-bold">Urgent Milestone Alert: You have {myUrgentMilestonesCount} project milestone(s) due today or tomorrow that remain incomplete.</span>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-lowest/50 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                    <tr>
                      <th className="px-5 py-4">Project Title</th>
                      <th className="px-3 py-4 text-center">Created Date</th>
                      <th className="px-3 py-4 text-center">Created By</th>
                      <th className="px-3 py-4 text-center">Total Milestones</th>
                      <th className="px-3 py-4 text-center">Active Milestones</th>
                      <th className="px-3 py-4 text-center text-error">Overdue Milestones</th>
                      <th className="px-3 py-4 text-center text-green-600">Recently Done</th>
                      <th className="px-3 py-4 text-center">Latest Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low font-semibold text-on-surface-variant">
                    {myProjectsData.map(p => {
                      const isSelected = selectedProjectId === p.id;
                      const closedStyle = p.status === 'Closed' ? 'bg-slate-50 opacity-75' : '';
                      return (
                        <React.Fragment key={p.id}>
                          <tr 
                            onClick={() => setSelectedProjectId(isSelected ? null : p.id)}
                            className={`hover:bg-surface-container-low/40 cursor-pointer transition-all ${
                              isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                            } ${closedStyle}`}
                          >
                            <td className="px-5 py-4 flex items-center gap-2">
                              <span className="material-symbols-outlined text-[18px] text-indigo-600">folder</span>
                              <div>
                                <span className="font-bold text-on-surface">{p.title}</span>
                                {p.status === 'Closed' && (
                                  <span className="text-[8px] font-black bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded border border-slate-300 ml-2 uppercase">Closed</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-center text-xs">{fmtDate(p.created_at)}</td>
                            <td className="px-3 py-4 text-center text-xs">{safeProfiles.find(x => x.id === p.created_by)?.name || 'Admin'}</td>
                            <td className="px-3 py-4 text-center">{p.totalMilestones}</td>
                            <td className="px-3 py-4 text-center">{p.activeMilestones}</td>
                            <td className="px-3 py-4 text-center text-error font-bold">{p.overdueMilestones}</td>
                            <td className="px-3 py-4 text-center text-green-600">{p.recentlyCompleted}</td>
                            <td className="px-3 py-4 text-center text-xs">{fmtDate(p.latestActivityDate)}</td>
                          </tr>
                          {isSelected && (
                            <tr>
                              <td colSpan="8" className="bg-slate-50/50 p-5 border-b border-surface-container-high">
                                <p className="font-bold uppercase tracking-wider text-[10px] text-outline mb-3 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">timeline</span> My Milestone Timeline
                                </p>
                                
                                <div className="flex flex-col gap-4">
                                  <div className="relative border-l-2 border-outline-variant/60 ml-4 pl-6 flex flex-col gap-4">
                                    {p.milestones.map(m => {
                                      const msDisplayStatus = getDisplayStatus(m);
                                      let colorCls = 'text-outline bg-slate-100 border-slate-200';
                                      if (msDisplayStatus === 'Completed') colorCls = 'text-green-700 bg-green-50 border-green-200';
                                      else if (msDisplayStatus === 'Overdue') colorCls = 'text-red-700 bg-red-50 border-red-200';
                                      else if (msDisplayStatus === 'Ongoing') colorCls = 'text-blue-700 bg-blue-50 border-blue-200';

                                      const linkedFollowups = safeWorkItems.filter(f => f.linked_to === m.id && f.assignee_id === currentUser.id);

                                      return (
                                        <div key={m.id} className="relative flex flex-col gap-1">
                                          <div className={`absolute -left-[33px] top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${colorCls} text-[10px] font-black`}>
                                            {msDisplayStatus === 'Completed' ? '✓' : '!'}
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-on-surface">{m.title}</span>
                                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded border ${colorCls}`}>{msDisplayStatus}</span>
                                          </div>
                                          <div className="text-[10px] text-outline flex items-center gap-3 flex-wrap font-medium">
                                            <span>Due: {m.expected_date || '—'}</span>
                                            {m.completed_at && <span>Completed: {fmtDate(m.completed_at)}</span>}
                                          </div>
                                          {linkedFollowups.length > 0 && (
                                            <div className="mt-1.5 pl-3 border-l border-teal-200 flex flex-col gap-1">
                                              <span className="text-[8px] font-bold uppercase text-teal-600">Linked Follow-ups:</span>
                                              {linkedFollowups.map(f => (
                                                <div key={f.id} className="text-[10px] text-on-surface-variant flex items-center gap-2">
                                                  <span className="material-symbols-outlined text-[10px] text-teal-500">subdirectory_arrow_right</span>
                                                  <span>{f.title} ({getDisplayStatus(f)})</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {p.milestones.length === 0 && <p className="text-xs text-outline italic ml-2">No milestones set up for you in this project workspace.</p>}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {myProjectsData.length === 0 && (
                      <tr><td colSpan="8" className="px-5 py-10 text-center text-outline italic">No projects relevant to you.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── OVERDUE ANALYSIS TAB ── */}
        {currentTab === 'Overdue Analysis' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Oldest Overdue Works */}
            <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-error">hourglass_bottom</span> My Oldest Overdue Works
              </h3>
              <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                {myOldestOverdueItems.map(o => {
                  const diffDays = Math.max(0, Math.round((new Date(todayStr) - new Date(o.expected_date)) / 86400000));
                  return (
                    <div key={o.id} className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-red-900 truncate leading-snug">{o.title}</p>
                        <p className="text-[10px] text-red-650 font-medium">Type: {o.type} | Priority: {o.priority || 'Medium'}</p>
                      </div>
                      <span className="text-[10px] font-black bg-red-600 text-white px-2.5 py-1 rounded-full whitespace-nowrap">{diffDays} Days Late</span>
                    </div>
                  );
                })}
                {myOldestOverdueItems.length === 0 && <p className="text-xs text-outline italic text-center py-12">No overdue works logged.</p>}
              </div>
            </div>

            {/* Priority Wise Overdue */}
            <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-primary">priority_high</span> My Priority-wise Overdue
              </h3>
              <div className="flex flex-col gap-3 font-semibold text-xs text-on-surface-variant">
                {Object.entries(myPriorityOverdue).map(([prio, count]) => {
                  let badgeCls = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (prio === 'Critical') badgeCls = 'bg-red-100 text-red-700 border-red-200';
                  else if (prio === 'High') badgeCls = 'bg-orange-100 text-orange-700 border-orange-250';

                  return (
                    <div key={prio} className="flex justify-between items-center p-2 border-b last:border-0 border-slate-55">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${badgeCls}`}>{prio}</span>
                      <span className="font-black text-sm">{count} overdue</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recurring Template Misses */}
            <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm md:col-span-2">
              <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-orange-600">autorenew</span> My Recurring Template Misses
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                {myRecurringMisses.map(r => (
                  <div key={r.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface truncate leading-snug">{r.title}</p>
                      <p className="text-[10px] text-outline mt-0.5">Type: {r.type} | Priority: {r.priority || 'Medium'}</p>
                    </div>
                    <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-250 px-2 py-0.5 rounded uppercase whitespace-nowrap">Recurring Overdue</span>
                  </div>
                ))}
                {myRecurringMisses.length === 0 && <p className="text-xs text-outline italic text-center py-8 sm:col-span-2">No recurring misses recorded.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ADMIN VIEW RENDER
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 w-full max-w-full md:max-w-[1200px] mx-auto pb-24">
      {/* Page Title & Archive Reset Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">Operational Command Center</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">Central productivity, milestones, and archive console</p>
        </div>
        
        {currentUser.role === 'Admin' && (
          <div className="flex items-center gap-2.5 self-stretch md:self-auto justify-end">
            <button
              onClick={triggerArchiveAndReset}
              disabled={isArchiving || isMigrationNeeded}
              className="bg-error hover:bg-error/95 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">archive</span>
              ARCHIVE & RESET CYCLE
            </button>
          </div>
        )}
      </div>

      {renderMigrationNotice()}

      {/* Report Period Banner */}
      {isPeriodEmpty ? (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <span className="material-symbols-outlined text-blue-600">calendar_today</span>
            New Cycle Started
          </div>
          <p className="text-xs text-blue-700 font-semibold">
            The active cycle reset was executed today ({formatFriendlyDate(startDate)}). Finalized operational reports will populate starting tomorrow.
          </p>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 text-on-surface rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
            <div>
              <p className="text-[10px] font-bold text-outline uppercase tracking-wider leading-none">Finalized Report Period</p>
              <p className="text-sm font-extrabold text-on-surface mt-1.5">
                {formatFriendlyDate(startDate)} &mdash; {formatFriendlyDate(endDate)}
              </p>
            </div>
          </div>
          <div className="text-[10px] font-bold text-outline bg-white px-3 py-1 rounded-full border shadow-sm">
            Stable historical analytics (excludes today's live data)
          </div>
        </div>
      )}

      {/* Filter and Tab Section */}
      <div className="flex flex-col gap-3 bg-white border border-outline-variant/30 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-surface-container pb-3">
          <div className="flex bg-surface-container p-1 rounded-xl gap-0.5 overflow-x-auto max-w-full">
            {['Overview', 'Staff Performance', 'Projects', 'Overdue Analysis', 'Archives'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            {activeTab === 'Projects' && (
              <label className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant cursor-pointer select-none bg-slate-50 border border-outline-variant/40 rounded-xl px-3 py-1.5 hover:bg-slate-100 transition-colors shadow-sm">
                <input
                  type="checkbox"
                  checked={showClosedProjects}
                  onChange={e => setShowClosedProjects(e.target.checked)}
                  className="rounded text-primary focus:ring-primary/20"
                />
                Show Closed Projects
              </label>
            )}
          </div>
        </div>

        {/* Dynamic Context-Sensitive Exports */}
        {activeTab !== 'Archives' && (
          <div className="flex items-center justify-between flex-wrap gap-3 pt-1 text-xs">
            <span className="font-bold text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">download</span> Export {activeTab} Data:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === 'Overview' && (
                <>
                  <button onClick={downloadOverviewCSV} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1">CSV Summary</button>
                  <button onClick={downloadOverviewPDF} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1">PDF Overview</button>
                  <button onClick={printOverview} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">print</span> Print</button>
                </>
              )}
              {activeTab === 'Staff Performance' && (
                <>
                  <button onClick={downloadStaffCSV} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1">CSV Staff Stats</button>
                  <button onClick={downloadStaffPDF} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1">PDF scorecards</button>
                  <button onClick={printStaff} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">print</span> Print</button>
                </>
              )}
              {activeTab === 'Projects' && (
                <>
                  <button onClick={downloadProjectsCSV} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1">CSV Projects Summary</button>
                  <button onClick={downloadProjectsPDF} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1">PDF Timeline Flow</button>
                  <button onClick={printProjects} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">print</span> Print</button>
                </>
              )}
              {activeTab === 'Overdue Analysis' && (
                <>
                  <button onClick={downloadOverdueCSV} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1">CSV Overdue List</button>
                  <button onClick={downloadOverduePDF} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1">PDF Analysis</button>
                  <button onClick={printOverdue} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-bold border border-outline-variant/30 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">print</span> Print</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────
          TAB CONTENT RENDERS
          ─────────────────────────────────────────────────────────────────────────── */}

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'Overview' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Top Summary Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-sm">
              <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Total Due Work</p>
              <h3 className="text-2xl font-black font-headline text-on-surface mt-1">{totalDueCount}</h3>
            </div>
            
            <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-sm border-l-4 border-l-green-500">
              <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Completed On Time</p>
              <h3 className="text-2xl font-black font-headline text-green-600 mt-1">{onTimeCount}</h3>
            </div>

            <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-sm border-l-4 border-l-orange-400">
              <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Completed Late</p>
              <h3 className="text-2xl font-black font-headline text-orange-500 mt-1">{lateCount}</h3>
            </div>

            <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-sm border-l-4 border-l-red-500">
              <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Overdue</p>
              <h3 className="text-2xl font-black font-headline text-error mt-1">{overdueCount}</h3>
            </div>

            <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-sm border-l-4 border-l-blue-500">
              <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Active Work</p>
              <h3 className="text-2xl font-black font-headline text-blue-600 mt-1">{activeCount}</h3>
            </div>

            <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-sm text-white p-4">
              <p className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Efficiency Score</p>
              <h3 className="text-2xl font-black font-headline mt-1">{efficiencyScore}%</h3>
            </div>
          </div>

          {/* Interactive Custom SVG Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Completion Status Donut Chart */}
            <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex flex-col">
              <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider border-b pb-2 mb-4">Completion Status</h3>
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 flex-1">
                {/* SVG Donut */}
                <div className="relative w-36 h-36">
                  {totalDueCount === 0 ? (
                    <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-xs text-outline italic">No work due</div>
                  ) : (
                    <svg className="w-full h-full transform -rotate-95" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4"></circle>
                      {/* On-Time Circle */}
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#22c55e" strokeWidth="4" 
                        strokeDasharray={`${Math.round((onTimeCount/totalDueCount)*100)} ${100 - Math.round((onTimeCount/totalDueCount)*100)}`} 
                        strokeDashoffset="0"></circle>
                      {/* Late Circle */}
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f97316" strokeWidth="4" 
                        strokeDasharray={`${Math.round((lateCount/totalDueCount)*100)} ${100 - Math.round((lateCount/totalDueCount)*100)}`} 
                        strokeDashoffset={`-${Math.round((onTimeCount/totalDueCount)*100)}`}></circle>
                      {/* Overdue Circle */}
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#ef4444" strokeWidth="4" 
                        strokeDasharray={`${Math.round((overdueCount/totalDueCount)*100)} ${100 - Math.round((overdueCount/totalDueCount)*100)}`} 
                        strokeDashoffset={`-${Math.round(((onTimeCount + lateCount)/totalDueCount)*100)}`}></circle>
                    </svg>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-on-surface font-headline">{totalDueCount}</span>
                    <span className="text-[8px] font-bold text-outline uppercase tracking-widest">Total Due</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 text-xs font-semibold text-on-surface-variant">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded-sm"></span> On Time: {onTimeCount}</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 bg-orange-400 rounded-sm"></span> Completed Late: {lateCount}</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-sm"></span> Overdue: {overdueCount}</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded-sm"></span> Active Neutral: {activeCount}</div>
                </div>
              </div>
            </div>

            {/* Staff Efficiency Horizontal Bar Chart */}
            <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex flex-col">
              <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider border-b pb-2 mb-4">Staff Productivity Matrix</h3>
              <div className="flex flex-col gap-4 max-h-56 overflow-y-auto pr-1">
                {staffPerformanceData.slice(0, 5).map(s => (
                  <div key={s.id} className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between font-bold text-on-surface-variant">
                      <span>{s.name}</span>
                      <span className={s.efficiency >= 80 ? 'text-primary' : s.efficiency >= 60 ? 'text-orange-500' : 'text-error'}>{s.efficiency}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${
                        s.efficiency >= 80 ? 'bg-primary' : s.efficiency >= 60 ? 'bg-orange-400' : 'bg-error'
                      }`} style={{ width: `${s.efficiency}%` }} />
                    </div>
                  </div>
                ))}
                {staffPerformanceData.length === 0 && <p className="text-xs text-outline italic text-center py-8">No active staff scorecard available.</p>}
              </div>
            </div>

            {/* Overdue Comparison by Assignee Chart */}
            <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex flex-col">
              <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider border-b pb-2 mb-4">Overdue Work by Assignee</h3>
              <div className="flex items-end gap-3 h-44 pt-4 border-b border-slate-200">
                {Object.entries(overdueByStaffMap).map(([name, count]) => {
                  const maxOverdue = Math.max(...Object.values(overdueByStaffMap), 1);
                  const hPct = Math.round((count / maxOverdue) * 100);
                  return (
                    <div key={name} className="flex-1 flex flex-col items-center group">
                      <span className="text-[10px] font-black text-error mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                      <div className="w-6 sm:w-8 bg-error/15 group-hover:bg-error/30 border-t-2 border-error rounded-t-sm transition-all" style={{ height: `${hPct}%` }}></div>
                      <span className="text-[8px] font-bold text-outline mt-2 truncate w-14 text-center leading-none">{name.split(' ')[0]}</span>
                    </div>
                  );
                })}
                {Object.keys(overdueByStaffMap).length === 0 && (
                  <div className="w-full h-full flex items-center justify-center text-xs text-outline italic">No overdue work in this cycle</div>
                )}
              </div>
            </div>

            {/* Active Project Health Chart */}
            <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex flex-col">
              <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider border-b pb-2 mb-4">Project Milestones Health</h3>
              <div className="flex flex-col gap-3.5 max-h-56 overflow-y-auto pr-1">
                {projectsData.slice(0, 4).map(p => (
                  <div key={p.id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2 last:border-0">
                    <span className="font-semibold text-on-surface max-w-[160px] truncate">{p.title}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">{p.totalMilestones - p.activeMilestones} Completed</span>
                      {p.overdueMilestones > 0 ? (
                        <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{p.overdueMilestones} Overdue</span>
                      ) : (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">{p.activeMilestones} Active</span>
                      )}
                    </div>
                  </div>
                ))}
                {projectsData.length === 0 && <p className="text-xs text-outline italic text-center py-8">No active projects logged.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STAFF PERFORMANCE TAB ── */}
      {activeTab === 'Staff Performance' && (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-lowest/50 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                <tr>
                  <th className="px-5 py-4">Assignee</th>
                  <th className="px-3 py-4 text-center">Due Work</th>
                  <th className="px-3 py-4 text-center text-green-600">On Time</th>
                  <th className="px-3 py-4 text-center text-orange-500">Late</th>
                  <th className="px-3 py-4 text-center text-error">Overdue</th>
                  <th className="px-3 py-4 text-center text-blue-600">Active</th>
                  <th className="px-3 py-4 text-center">Efficiency %</th>
                  <th className="px-3 py-4 text-center">Projects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low font-semibold text-on-surface-variant">
                {staffPerformanceData.map(s => {
                  const isSelected = selectedStaffId === s.id;
                  const eCls = s.efficiency >= 80 ? 'text-primary' : s.efficiency >= 60 ? 'text-orange-500' : 'text-error';
                  return (
                    <React.Fragment key={s.id}>
                      <tr 
                        onClick={() => setSelectedStaffId(isSelected ? null : s.id)}
                        className={`hover:bg-surface-container-low/40 cursor-pointer transition-all ${
                          isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <td className="px-5 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-[10px]">
                            {s.name.split(' ').map(x => x[0]).join('').toUpperCase().substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{s.name}</p>
                            <p className="text-[10px] text-outline uppercase font-bold tracking-wide mt-0.5">{s.role}</p>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-center">{s.totalDue}</td>
                        <td className="px-3 py-4 text-center text-green-600">{s.onTime}</td>
                        <td className="px-3 py-4 text-center text-orange-400">{s.late}</td>
                        <td className="px-3 py-4 text-center text-error">{s.overdue}</td>
                        <td className="px-3 py-4 text-center text-blue-600">{s.active}</td>
                        <td className={`px-3 py-4 text-center font-black text-base ${eCls}`}>{s.efficiency}%</td>
                        <td className="px-3 py-4 text-center">{s.projectsCount}</td>
                      </tr>
                      {isSelected && (
                        <tr>
                          <td colSpan="8" className="bg-slate-50/50 p-5 border-b border-surface-container-high">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs font-semibold text-on-surface-variant">
                              {/* 1. Overdue Items */}
                              <div className="flex flex-col gap-2">
                                <p className="font-bold uppercase tracking-wider text-[10px] text-error flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">warning</span> Overdue Items ({s.overdue})
                                </p>
                                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                                  {actionable.filter(w => w.assignee_id === s.id && w.expected_date && w.expected_date >= startDate && w.expected_date <= endDate && (w.status !== 'Completed' || (w.completed_at && getISTDateString(w.completed_at) > endDate))).map(o => (
                                    <div key={o.id} className="p-2 bg-red-50/50 border border-red-100 rounded-lg flex flex-col">
                                      <span className="truncate font-bold text-red-900">{o.title}</span>
                                      <span className="text-[9px] text-red-600 mt-0.5">Due: {o.expected_date}</span>
                                    </div>
                                  ))}
                                  {s.overdue === 0 && <p className="text-xs text-outline italic py-2">No overdue items.</p>}
                                </div>
                              </div>

                              {/* 2. Ongoing & Active */}
                              <div className="flex flex-col gap-2">
                                <p className="font-bold uppercase tracking-wider text-[10px] text-blue-600 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">play_circle</span> Ongoing & Active ({s.active})
                                </p>
                                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                                  {actionable.filter(w => w.assignee_id === s.id && (w.status !== 'Completed' || (w.completed_at && getISTDateString(w.completed_at) > endDate)) && (!w.expected_date || w.expected_date > endDate)).map(a => (
                                    <div key={a.id} className="p-2 bg-blue-50/50 border border-blue-100 rounded-lg flex flex-col">
                                      <span className="truncate font-bold text-blue-900">{a.title}</span>
                                      <span className="text-[9px] text-blue-600 mt-0.5">{a.status} {a.expected_date ? `| Due: ${a.expected_date}` : ''}</span>
                                    </div>
                                  ))}
                                  {s.active === 0 && <p className="text-xs text-outline italic py-2">No active works.</p>}
                                </div>
                              </div>

                              {/* 3. Recent Completions */}
                              <div className="flex flex-col gap-2">
                                <p className="font-bold uppercase tracking-wider text-[10px] text-green-600 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">check_circle</span> Recent Completions ({s.onTime + s.late})
                                </p>
                                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                                  {completedItems.filter(w => w.assignee_id === s.id).map(c => {
                                    const isLate = c.expected_date && getISTDateString(c.completed_at) > c.expected_date;
                                    return (
                                      <div key={c.id} className={`p-2 border rounded-lg flex flex-col ${isLate ? 'bg-orange-50/40 border-orange-100' : 'bg-green-50/40 border-green-100'}`}>
                                        <span className={`truncate font-bold ${isLate ? 'text-orange-900' : 'text-green-900'}`}>{c.title}</span>
                                        <span className="text-[9px] text-outline mt-0.5">Done: {c.completed_at ? fmtDate(c.completed_at) : '—'} {isLate ? '(Late)' : '(On Time)'}</span>
                                      </div>
                                    );
                                  })}
                                  {(s.onTime + s.late) === 0 && <p className="text-xs text-outline italic py-2">No recent completions.</p>}
                                </div>
                              </div>

                              {/* 4. Recurring Stats & Follow-ups */}
                              <div className="flex flex-col gap-4">
                                <div>
                                  <p className="font-bold uppercase tracking-wider text-[10px] text-purple-600 flex items-center gap-1 mb-1.5">
                                    <span className="material-symbols-outlined text-[14px]">autorenew</span> Recurring Templates
                                  </p>
                                  <div className="bg-purple-50/50 border border-purple-100 p-2.5 rounded-xl text-purple-950 flex justify-between items-center">
                                    <span className="font-medium">Assigned templates:</span>
                                    <span className="text-sm font-black bg-purple-100 px-2 py-0.5 rounded-md">
                                      {savedTasks?.filter(t => t.assignee_id === s.id && t.is_recurring).length || 0}
                                    </span>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="font-bold uppercase tracking-wider text-[10px] text-teal-600 flex items-center gap-1 mb-1.5">
                                    <span className="material-symbols-outlined text-[14px]">link</span> Follow-up References
                                  </p>
                                  <div className="flex flex-col gap-1 max-h-20 overflow-y-auto pr-1">
                                    {safeWorkItems.filter(w => w.assignee_id === s.id && w.linked_to && w.created_at && w.created_at.split('T')[0] <= endDate).map(f => {
                                      const orig = safeWorkItems.find(x => x.id === f.linked_to);
                                      return (
                                        <div key={f.id} className="p-1.5 bg-teal-50/50 border border-teal-100 rounded-md text-[10px] flex flex-col">
                                          <span className="font-bold text-teal-900 truncate">{f.title}</span>
                                          <span className="text-[8px] text-teal-600 mt-0.5">Linked to: {orig?.title || 'Unknown'}</span>
                                        </div>
                                      );
                                    })}
                                    {safeWorkItems.filter(w => w.assignee_id === s.id && w.linked_to && w.created_at && w.created_at.split('T')[0] <= endDate).length === 0 && (
                                      <p className="text-[11px] text-outline italic">No follow-ups logged.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PROJECTS TAB ── */}
      {activeTab === 'Projects' && (
        <div className="flex flex-col gap-5 animate-fade-in">
          {/* Urgent milestones banner */}
          {urgentMilestonesCount > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-4 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600" style={{fontVariationSettings:"'FILL' 1"}}>crisis_alert</span>
                <span className="text-sm font-bold">Urgent Milestone Alert: You have {urgentMilestonesCount} project milestone(s) due today or tomorrow that remain incomplete.</span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-lowest/50 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                  <tr>
                    <th className="px-5 py-4">Project Title</th>
                    <th className="px-3 py-4 text-center">Created Date</th>
                    <th className="px-3 py-4 text-center">Created By</th>
                    <th className="px-3 py-4 text-center">Active Staff</th>
                    <th className="px-3 py-4 text-center">Total Milestones</th>
                    <th className="px-3 py-4 text-center">Active Milestones</th>
                    <th className="px-3 py-4 text-center text-error">Overdue Milestones</th>
                    <th className="px-3 py-4 text-center text-green-600">Recently Done</th>
                    <th className="px-3 py-4 text-center">Latest Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low font-semibold text-on-surface-variant">
                  {projectsData.map(p => {
                    const isSelected = selectedProjectId === p.id;
                    const closedStyle = p.status === 'Closed' ? 'bg-slate-50 opacity-75' : '';
                    return (
                      <React.Fragment key={p.id}>
                        <tr 
                          onClick={() => setSelectedProjectId(isSelected ? null : p.id)}
                          className={`hover:bg-surface-container-low/40 cursor-pointer transition-all ${
                            isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                          } ${closedStyle}`}
                        >
                          <td className="px-5 py-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-indigo-600">folder</span>
                            <div>
                              <span className="font-bold text-on-surface">{p.title}</span>
                              {p.status === 'Closed' && (
                                <span className="text-[8px] font-black bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded border border-slate-300 ml-2 uppercase">Closed</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-4 text-center text-xs">{fmtDate(p.created_at)}</td>
                          <td className="px-3 py-4 text-center text-xs">{safeProfiles.find(x => x.id === p.created_by)?.name || 'Admin'}</td>
                          <td className="px-3 py-4 text-center">{p.assigneesCount}</td>
                          <td className="px-3 py-4 text-center">{p.totalMilestones}</td>
                          <td className="px-3 py-4 text-center">{p.activeMilestones}</td>
                          <td className="px-3 py-4 text-center text-error font-bold">{p.overdueMilestones}</td>
                          <td className="px-3 py-4 text-center text-green-600">{p.recentlyCompleted}</td>
                          <td className="px-3 py-4 text-center text-xs">{fmtDate(p.latestActivityDate)}</td>
                        </tr>
                        {isSelected && (
                          <tr>
                            <td colSpan="9" className="bg-slate-50/50 p-5 border-b border-surface-container-high">
                              <p className="font-bold uppercase tracking-wider text-[10px] text-outline mb-3 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">timeline</span> Operational Milestone Timeline
                              </p>
                              
                              <div className="flex flex-col gap-4">
                                {/* Visual timeline flow: Created -> Added -> Due -> Completed */}
                                <div className="relative border-l-2 border-outline-variant/60 ml-4 pl-6 flex flex-col gap-4">
                                  {p.milestones.map(m => {
                                    const msDisplayStatus = getDisplayStatus(m);
                                    let colorCls = 'text-outline bg-slate-100 border-slate-200';
                                    if (msDisplayStatus === 'Completed') colorCls = 'text-green-700 bg-green-50 border-green-200';
                                    else if (msDisplayStatus === 'Overdue') colorCls = 'text-red-700 bg-red-50 border-red-200';
                                    else if (msDisplayStatus === 'Ongoing') colorCls = 'text-blue-700 bg-blue-50 border-blue-200';

                                    return (
                                      <div key={m.id} className="relative flex flex-col gap-1">
                                        <div className={`absolute -left-[33px] top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${colorCls} text-[10px] font-black`}>
                                          {msDisplayStatus === 'Completed' ? '✓' : '!'}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs font-bold text-on-surface">{m.title}</span>
                                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded border ${colorCls}`}>{msDisplayStatus}</span>
                                        </div>
                                        <div className="text-[10px] text-outline flex items-center gap-3 flex-wrap font-medium">
                                          <span>Assignee: {safeProfiles.find(x => x.id === m.assignee_id)?.name || 'Unassigned'}</span>
                                          <span>Due: {m.expected_date || '—'}</span>
                                          {m.completed_at && <span>Completed: {fmtDate(m.completed_at)}</span>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {p.milestones.length === 0 && <p className="text-xs text-outline italic ml-2">No milestones set up for this project workspace.</p>}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── OVERDUE ANALYSIS TAB ── */}
      {activeTab === 'Overdue Analysis' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* Oldest Overdue Works */}
          <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px] text-error">hourglass_bottom</span> Oldest Overdue Works
            </h3>
            <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
              {oldestOverdueItems.map(o => {
                const diffDays = Math.max(0, Math.round((new Date(todayStr) - new Date(o.expected_date)) / 86400000));
                return (
                  <div key={o.id} className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-red-900 truncate leading-snug">{o.title}</p>
                      <p className="text-[10px] text-red-600 mt-0.5 font-bold uppercase tracking-wide">Assignee: {safeProfiles.find(x => x.id === o.assignee_id)?.name || 'Unassigned'}</p>
                    </div>
                    <span className="text-[10px] font-black bg-red-600 text-white px-2.5 py-1 rounded-full whitespace-nowrap">{diffDays} Days Late</span>
                  </div>
                );
              })}
              {oldestOverdueItems.length === 0 && <p className="text-xs text-outline italic text-center py-12">No overdue works logged in the active database.</p>}
            </div>
          </div>

          {/* Priority Wise Overdue */}
          <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px] text-primary">priority_high</span> Priority-wise Overdue
            </h3>
            <div className="flex flex-col gap-3 font-semibold text-xs text-on-surface-variant">
              {Object.entries(priorityOverdue).map(([prio, count]) => {
                let badgeCls = 'bg-slate-100 text-slate-700 border-slate-200';
                if (prio === 'Critical') badgeCls = 'bg-red-100 text-red-700 border-red-200';
                else if (prio === 'High') badgeCls = 'bg-orange-100 text-orange-700 border-orange-250';

                return (
                  <div key={prio} className="flex justify-between items-center p-2 border-b last:border-0 border-slate-55">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${badgeCls}`}>{prio}</span>
                    <span className="font-black text-sm">{count} overdue</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recurring misses */}
          <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm md:col-span-2">
            <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px] text-orange-600">autorenew</span> Recurring Template Misses
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
              {recurringMisses.map(r => (
                <div key={r.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-on-surface truncate leading-snug">{r.title}</p>
                    <p className="text-[10px] text-outline mt-0.5">Assignee: {safeProfiles.find(x => x.id === r.assignee_id)?.name || 'Unassigned'}</p>
                  </div>
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-250 px-2 py-0.5 rounded uppercase whitespace-nowrap">Recurring Overdue</span>
                </div>
              ))}
              {recurringMisses.length === 0 && <p className="text-xs text-outline italic text-center py-8 sm:col-span-2">No recurring misses recorded.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── ARCHIVES TAB ── */}
      {activeTab === 'Archives' && (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden animate-fade-in">
          <div className="p-5 border-b border-surface-container-high bg-surface-container-lowest flex justify-between items-center">
            <h2 className="font-bold text-base font-headline text-on-surface">Archive Catalog snapshots</h2>
            <span className="text-xs text-outline font-semibold">Stores cycle summaries and local ZIP records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-lowest/50 border-b border-surface-container-high text-[10px] uppercase font-bold tracking-widest text-outline">
                <tr>
                  <th className="px-5 py-3.5">Archive No</th>
                  <th className="px-3 py-3.5 text-center">Generated On</th>
                  <th className="px-3 py-3.5 text-center">Report From</th>
                  <th className="px-3 py-3.5 text-center">Report To</th>
                  <th className="px-3 py-3.5 text-center">Total Archived Items</th>
                  <th className="px-3 py-3.5 text-center">Generated By</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low font-semibold text-on-surface-variant text-xs">
                {archivesList.map(a => {
                  const genName = safeProfiles.find(p => p.id === a.generated_by)?.name || 'Admin';
                  return (
                    <tr key={a.id} className="hover:bg-surface-container-low/40">
                      <td className="px-5 py-4 font-bold text-on-surface text-sm">Archive #{a.archive_number}</td>
                      <td className="px-3 py-4 text-center">{new Date(a.archive_date).toLocaleDateString()}</td>
                      <td className="px-3 py-4 text-center">{formatFriendlyDate(a.metadata?.report_from)}</td>
                      <td className="px-3 py-4 text-center">{formatFriendlyDate(a.metadata?.report_to)}</td>
                      <td className="px-3 py-4 text-center font-bold text-primary">{a.total_items} items</td>
                      <td className="px-3 py-4 text-center">{genName}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => downloadPastArchiveZIP(a)}
                            className="bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-lg font-bold flex items-center gap-1 text-[11px]"
                          >
                            <span className="material-symbols-outlined text-[13px]">download</span>
                            Download ZIP
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {archivesList.length === 0 && (
                  <tr><td colSpan="7" className="px-5 py-10 text-center text-outline italic">No cataloged archives found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ARCHIVING MODAL TRIGGER PROGRESS ── */}
      {isArchiving && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col items-center gap-4 text-center">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
            <div>
              <h3 className="font-bold text-on-surface text-base">Archiving & Resetting System</h3>
              <p className="text-xs text-on-surface-variant mt-1.5">{archiveProgress}</p>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-primary animate-pulse w-3/4"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
