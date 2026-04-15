import React, { createContext, useContext, useState, useEffect } from 'react';

const SupabaseDataContext = createContext();

const initialProfiles = [
  { id: 'u1', name: 'Admin User', role: 'Admin', staffGroup: 'Office Staff', department: 'Management' },
  { id: 'u2', name: 'Shamsuddin', role: 'Assignee', staffGroup: 'Office Staff', department: 'Clerk' },
  { id: 'u3', name: 'Nisha', role: 'Assignee', staffGroup: 'Office Staff', department: 'HR' },
  { id: 'u4', name: 'Rahman', role: 'Assignee', staffGroup: 'Institution', department: 'Faculty' },
];

const initialContainers = [
  { id: 'c1', type: 'Project', title: 'Audit Work', progress: 60 },
  { id: 'c2', type: 'Event', title: 'Annual Day', progress: 70 },
];

const initialWorkItems = [
  // Task 1 (Has Subtasks)
  { id: 'w1', type: 'Task', title: 'Prepare Audit Report', assigneeId: 'u2', expectedDate: '2026-04-05', priority: 1, status: 'Overdue', containerId: null },
  { id: 'w2', type: 'Subtask', title: 'Gather Financials', assigneeId: 'u2', expectedDate: '2026-04-05', priority: 2, status: 'Completed', parentId: 'w1' },
  { id: 'w3', type: 'Subtask', title: 'Review Receipts', assigneeId: 'u2', expectedDate: '2026-04-06', priority: 2, status: 'Overdue', parentId: 'w1' },

  // Other items
  { id: 'w4', type: 'Checklist', title: 'Book Venue', assigneeId: 'u3', expectedDate: '2026-04-07', priority: 1, status: 'Not Started', containerId: 'c2' },
  { id: 'w5', type: 'Task', title: 'Update Roster', assigneeId: 'u2', expectedDate: '2026-04-08', priority: 3, status: 'Assigned', containerId: null },
  { id: 'w6', type: 'Milestone', title: 'Phase 1 Complete', assigneeId: 'u4', expectedDate: '2026-04-08', priority: 1, status: 'Not Started', containerId: 'c1' },
  { id: 'w7', type: 'Task', title: 'Planning Pool Task A', assigneeId: null, expectedDate: '2026-04-10', priority: 2, status: null, inPlanningPool: true, aging: 'Aged' },
];

export function MockDataProvider({ children }) {
  // Simulate logged in user (Admin by default for testing Admin dashboard)
  // We can easily swap this out by updating `currentUser` state.
  const [currentUser, setCurrentUser] = useState(initialProfiles[0]); 
  
  const [profiles] = useState(initialProfiles);
  const [containers] = useState(initialContainers);
  const [workItems, setWorkItems] = useState(initialWorkItems);

  // Derived calculations based on current date
  const getDerivedStatus = (item) => {
    // A simplified simulation of the exact derived states mentioned in PRD
    // If it's explicitly Overdue or Not Started in our mock, keep it.
    // In a real app we'd compare item.expectedDate with new Date()
    return item.status; 
  };

  const startWorkItem = (itemId) => {
    setWorkItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, status: 'Ongoing' } : item
    ));
  };

  const completeWorkItem = (itemId) => {
    setWorkItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, status: 'Completed' } : item
    ));
  };

  return (
    <SupabaseDataContext.Provider value={{
      currentUser,
      setCurrentUser,
      profiles,
      containers,
      workItems,
      setWorkItems,
      startWorkItem,
      completeWorkItem,
      getDerivedStatus
    }}>
      {children}
    </SupabaseDataContext.Provider>
  );
}

export function useDataContext() {
  return useContext(SupabaseDataContext);
}
