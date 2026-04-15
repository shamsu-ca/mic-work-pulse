import React from 'react';

export default function SettingsPage() {
  return (
    <div className="flex-column gap-6">
      <h2 className="headline-sm m-0">System Settings</h2>

      <div className="grid-cards">
        <div className="surface-card flex-column gap-4">
          <h3 className="title-sm m-0" style={{ borderBottom: '1px solid var(--ghost-border)', paddingBottom: '0.5rem' }}>
            Departments
          </h3>
          <div className="list-group">
            <div className="list-item-card" style={{ padding: '0.5rem 1rem' }}>Management</div>
            <div className="list-item-card" style={{ padding: '0.5rem 1rem' }}>Clerk</div>
            <div className="list-item-card" style={{ padding: '0.5rem 1rem' }}>HR</div>
            <div className="list-item-card" style={{ padding: '0.5rem 1rem' }}>Faculty</div>
          </div>
          <button className="btn btn-secondary">+ Add Department</button>
        </div>

        <div className="surface-card flex-column gap-4">
          <h3 className="title-sm m-0" style={{ borderBottom: '1px solid var(--ghost-border)', paddingBottom: '0.5rem' }}>
            Staff Types
          </h3>
          <div className="list-group">
            <div className="list-item-card" style={{ padding: '0.5rem 1rem' }}>Office Staff</div>
            <div className="list-item-card" style={{ padding: '0.5rem 1rem' }}>Institution</div>
          </div>
          <button className="btn btn-secondary">+ Add Type</button>
        </div>

        <div className="surface-card flex-column gap-4">
          <h3 className="title-sm m-0" style={{ borderBottom: '1px solid var(--ghost-border)', paddingBottom: '0.5rem' }}>
            System Options
          </h3>
          <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label-sm">Enable Email Notifications</span>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label-sm">Auto-Assign Planning Pool Tasks</span>
            <input type="checkbox" />
          </div>
        </div>
      </div>
    </div>
  );
}
