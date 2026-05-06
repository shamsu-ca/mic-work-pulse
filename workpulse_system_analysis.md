# WorkPulse ERP: Production SaaS System Analysis

This document provides a comprehensive structural, logical, and architectural analysis of the WorkPulse system, evaluating it from the perspective of a production-grade SaaS ERP.

## 1. PAGES & ROUTES

The application routes are defined centrally in `App.jsx`, mapping to dedicated page components under `src/pages/`.

*   **Dashboard (`/`)**: 
    *   *Purpose*: Provides a high-level overview of daily focus, metrics, and active tasks.
    *   *Access*: Both (Renders `AdminDashboard` or `AssigneeDashboard` based on role).
*   **All Tasks (`/tasks`)**: 
    *   *Purpose*: The central hub for standalone tasks, subtasks, and their history.
    *   *Access*: Both (Assignees see their own; Admins see all unassigned + filtered staff groups).
*   **Planning (`/planning`)**: 
    *   *Purpose*: Triage area for incoming, unstructured tasks and cross-organization announcements.
    *   *Access*: Both (Assignees see only their created pool items; Admin manages all and can assign them).
*   **Projects & Events (`/projects-events`)**: 
    *   *Purpose*: Workspace for complex grouped tasks. Projects use milestones; Events use date-gated phases and checklists.
    *   *Access*: Both (Assignees can interact with tasks inside containers assigned to them; Admins have full CRUD and Template controls).
*   **Reports (`/reports`)**: 
    *   *Purpose*: Aggregated metrics, charts, and downloadable CSVs.
    *   *Access*: Both (Assignees see personal metrics; Admins see organization-wide).
*   **Notifications (`/notifications`)**: 
    *   *Purpose*: System alerts and event announcements.
    *   *Access*: Both.
*   **Staff Overview (`/staff`)**: 
    *   *Purpose*: User management, leave management, and global staff settings.
    *   *Access*: **Admin Only**.

---

## 2. UI STRUCTURE PER PAGE

### Dashboard
*   **Sections**: "Today's Focus" list, "My Metrics" charts (Donut chart for statuses), Notices ribbon.
*   **Actions**: "Start" / "Complete" buttons on Today's Focus items.
*   **Click Behavior**: Changes status of the task locally and pushes to the database, instantly updating the metrics chart.

### All Tasks Page
*   **Sections**: 
    *   Filter Bar (Search, Priority, Staff, Date).
    *   Tabs: *Active* (grouped by Status: Overdue, Not Started, Assigned, Ongoing) and *History* (Completed tasks).
*   **Actions**: Expand rows, Add Subtask, Edit, Delete, Start, Complete, Follow-Up (History tab).
*   **Click Behavior**: "Complete" prompts a completion panel for notes/tags. "Follow-Up" spawns a modal to create a linked continuation task.

### Planning Page
*   **Sections**: 
    *   Tabs: *Pool* (aging tasks) and *Notifications* (System announcements).
*   **Actions**: Assign to User, Convert to Task, Convert to Project, Edit, Delete.
*   **Click Behavior**: "Convert to Project" prompts for Milestone setup, creates a new Container, and deletes the pool item.

### Projects & Events Page
*   **Sections**: 
    *   Tabs: *Projects*, *Events*. Sub-modes: *Active*, *Saved Templates*.
    *   Cards for each Container showing progress bars and sub-item counts.
*   **Actions**: Expand container, Deploy Template, Save as Template, Add Milestone/Phase, Set Today, Complete.
*   **Click Behavior**: Expanding an active Event reveals Phases. If a phase date is in the future, its checklists are visually locked. 

---

## 3. DATA TABLES (DATABASE)

The Supabase schema uses the following key tables:

*   `users`: `id`, `name`, `username`, `role`, `department`, `category` (Office Staff/Institution).
*   `containers`: Projects/Events. `id`, `title`, `type`, `source_template_id`, `is_active`.
*   `saved_containers`: Templates for projects/events.
*   `work_items`: The core operational table (Tasks, Subtasks, Milestones, Phases, Checklists). 
    *   *FKs*: `assignee_id` -> `users.id`, `container_id` -> `containers.id`, `parent_id` -> `work_items.id`.
*   `saved_tasks`: Recurring templates and container template items. 
    *   *Key Columns*: `recurrence_rule`, `last_generated_at`, `parent_id`.
*   `absences`: User leave tracking. `user_id`, `from_date`, `to_date`.
*   `notifications` / `announcements`: System messaging.

**Missing / Sub-optimal Fields**:
*   *Attachments*: No direct relationship table for file uploads.
*   *Comments/Activity Log*: No `item_comments` or `audit_log` tables to track *who* changed *what* and *when* (critical for SaaS ERPs).
*   *Permissions Matrix*: Hardcoded role strings (`Admin`, `Assignee`) rather than a joined `permissions` table.

---

## 4. CORE FLOWS

1.  **Task Creation → Assignment → Completion**
    *   Task is created in the Planning Pool (unassigned) -> Admin clicks "Assign" -> Converted to a `Task` in `work_items` -> Assignee clicks "Start" (`status='Ongoing'`) -> Assignee clicks "Complete" (logs `completed_at` and notes).
2.  **Project → Milestone Flow**
    *   Project container created -> Milestones (actionable units) added under container -> Assignees work on Milestones -> Project progress % calculates based on completed vs total Milestones.
3.  **Event → Phase → Checklist Activation**
    *   Event container created -> Phases added with `expected_date` -> Checklists added under Phases.
    *   *Activation*: Logic explicitly checks `phase.expected_date <= today`. Until then, Checklists cannot be started.
4.  **Recurring Task Generation**
    *   On app load, `checkAndSpawnRecurringTasks` runs.
    *   It pulls active `saved_tasks` with `recurrence_rule`s. It checks `last_generated_at` vs interval math (daily, weekly, monthly).
    *   It checks the `absences` table. If the Assignee is absent today, *the task skips spawning*.
    *   If valid, it copies the `saved_task` into a live `work_item` and updates `last_generated_at`.

---

## 5. STATUS LOGIC

Statuses are derived dynamically via `src/lib/statusUtils.js` to ensure the UI stays accurate even if background crons fail:
*   **Completed**: `status === 'Completed'`.
*   **Overdue**: Not completed AND `expected_date` is strictly before `today`.
*   **Ongoing**: `status === 'Ongoing'`.
*   **Not Started**: `status === 'Assigned'`. 
    *   *Trigger*: For Tasks/Subtasks, triggers 1 day before due date. For Milestones/Phases, triggers on the exact due date.
*   **Assigned**: Has no date, or the trigger date has not been reached yet.

*Triggers*: Status changes are purely click-driven (Assigned -> Ongoing -> Completed), while Overdue/Not Started are time-driven evaluated on render.

---

## 6. FILTERS & VIEWS

*   **Global Filters**: Staff Category (`Office Staff` vs `Institution`) alters which users and tasks are loaded into the Admin views.
*   **Local Filters**: Search query, Priority dropdown, Specific Staff dropdown, Date ranges.
*   **Inconsistencies**: The `in_planning_pool` items do not have `category` ties, so the global Staff Category toggle on the Planning page visually switches tabs but may not filter raw pool data effectively at the DB level.

---

## 7. ALERT LOGIC

*   **Overdue Logic**: Computed entirely on the frontend via `isOverdue(item)`. Excludes items if the user is currently listed in the `absences` table.
*   **Not Started Logic**: Warning given 24 hours prior to a Task's due date, preventing assignees from being overwhelmed by future work.
*   **Where Shown**: 
    *   Admin Dashboard: Aggregated Donut chart and "Urgent" counts.
    *   Task Cards: Red badge, red row background (`bg-red-50`).

---

## 8. ROLE-BASED BEHAVIOR

*   **Admin**: 
    *   Full CRUD access across all tables. 
    *   Can see all users' tasks. 
    *   Has access to the `/staff` route (User Management).
    *   Can convert pool items into structural Projects.
*   **Assignee**: 
    *   Strict isolation. DB pulls and UI filters (`w.assignee_id === currentUser.id`) lock them to their own tasks.
    *   Cannot access `/staff`.
    *   Can only "Start" and "Complete" work items; cannot typically edit the core title/date once assigned.

---

## 9. REAL-TIME BEHAVIOR

The app is highly reactive. `SupabaseDataContext.jsx` opens `.channel('public:table_name')` on mounts.
*   **Live Updates**: Any insert, update, or delete in `work_items`, `users`, `containers`, etc., broadcasts to all clients. The React context state is updated immediately without page refreshes.
*   **Requires Refresh**: Initial session auth parsing, or if the WebSocket connection drops and fails to automatically reconnect.

---

## 10. MISSING FEATURES / GAPS (Production ERP Comparison)

1.  **Granular Permissions**: Lacks intermediate roles (e.g., Manager, Auditor, Department Head). Currently relies on strict Admin vs Assignee binary.
2.  **Audit Trails**: No historical ledger of changes. If a user deletes a task, it vanishes from the DB. Production ERPs require soft-deletes and immutable audit logs.
3.  **Communication Layer**: No ability to comment on tasks or tag colleagues. The only feedback loop is the "Completion Note".
4.  **Approval Workflows**: Assignees mark tasks as "Completed" directly. There is no "In Review" status requiring Admin sign-off before closing.
5.  **Data Pagination**: `fetchAllData()` pulls the entire `work_items` table into memory on load. This will cause massive performance degradation once task volume reaches the thousands.

---

## 11. EDGE CASES

*   **Task has no due date**: Remains indefinitely in the "Assigned" status bucket.
*   **User inactive/absent**: The `isItemExcludedByAbsence` utility hides their tasks from Overdue reports. Recurring tasks will silently skip spawning during their absence.
*   **Event phase date missed**: The Phase itself does not have a status, but if the date passes, its inner checklists become actionable. If those checklists have no date, they just sit as "Assigned".
*   **Assignee not selected**: Shows as "Unassigned". Assignees cannot see it; only Admins see it in their global list.
*   **Recurring overlaps**: If a user does not complete a daily task, the next day's spawn will still occur, resulting in duplicated backlogs (e.g., two "Clean Desk" tasks).

---

## 12. SIMPLIFIED SYSTEM SUMMARY

**WorkPulse is a real-time, hierarchy-driven task engine.**

1.  **Work Enters**: Ideas and requests dump into the **Planning Pool**.
2.  **Work is Structured**: An Admin triages the pool, converting items into either standalone **Tasks** or large **Projects/Events**.
3.  **Work is Gated**: Standalone tasks are available immediately. Project Milestones are tracked for overall progress. Event Checklists remain securely locked until the specific Phase date arrives in the real world.
4.  **Work is Executed**: Assignees log in, see only their actionable pipeline, click "Start" (tracking time implicitly), and "Complete" (providing a final report). 
5.  **Work is Monitored**: Admins watch the entire ecosystem shift via real-time WebSocket updates, tracking overdue items and managing staff absences without refreshing their browsers.
