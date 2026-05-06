# WorkPulse ERP: UI & Design System Summary

This document outlines the visual architecture, design system tokens, and global layout patterns used across the WorkPulse ERP application.

## 1. Design System & Theming (Tailwind CSS)

The application utilizes a heavily customized Tailwind CSS configuration, mapping closely to Material Design 3 (M3) semantic tokens while injecting a modern, premium SaaS aesthetic.

*   **Dark Mode Paradigm**: Class-based (`darkMode: "class"`).
*   **Typography**:
    *   **Headline/Display**: `Manrope` — Used for titles, brand names, and structural headings, providing a geometric, modern look.
    *   **Body/Label**: `Inter` — Used for standard readable text, inputs, and dense data, prioritizing legibility.
*   **Core Color Palette**:
    *   **Primary**: `#0051d5` (Deep Blue)
    *   **Secondary**: `#4648d4` (Indigo)
    *   **Background/Surface**: `#faf8ff` (A very soft lavender/off-white tint)
    *   **Error**: `#ba1a1a` (Standard accessible red)
*   **Semantic Depth**: Extensive use of `-container` and `on-` prefixing (e.g., `surface-container-low`, `on-surface-variant`) allowing for precise layering and text-contrast management without hardcoding hex values in the components.

---

## 2. Global Styling & Textures (`index.css`)

The application employs several custom CSS classes to achieve a "dynamic" and "premium" feel, moving beyond flat design:

*   **Glassmorphism**: `.glass-card` and `.glass-effect` provide a frosted glass look using `backdrop-filter: blur(20px)` and a 60% white background. Used heavily on fixed navigational elements to maintain context when scrolling.
*   **Gradients**: `.primary-gradient` and `.premium-gradient` create a smooth 135-degree linear transition from the `primary` deep blue to the `secondary` indigo.
*   **Background Texture**: `.architectural-grid` applies a subtle, 40px dotted grid pattern using a radial gradient. This is applied to the main content `main` tag, giving the workspace a structured, blueprint-like feel.

---

## 3. Structural Layout (`AppLayout.jsx`)

The application embraces a dual-mode responsive layout to accommodate both desktop power users and mobile field workers. It ensures PWA safe-areas are respected (`env(safe-area-inset-top/bottom)`).

### Top Header (Global)
*   **Behavior**: Fixed to the top, uses a blurred white background (`bg-white/95 backdrop-blur-md`).
*   **Components**: 
    *   Left: Logo mark and bold brand title.
    *   Right: Expanding search bar (`w-52 focus:w-64`), Notification bell (with red unread badges), and an Avatar dropdown menu.

### Desktop Sidebar (Medium Screens & Up)
*   **Behavior**: Fixed on the left (`w-60`), running full height beneath the Top Header.
*   **Navigation Links**: Uses variable-font Material Symbols. When a link is active:
    *   The icon fills in (`fontVariationSettings: "'FILL' 1"`).
    *   The background gains a soft primary tint (`bg-primary/10`).
    *   A small primary indicator dot appears on the far right of the row.
*   **Bottom Action**: A sticky, full-width "Create New" button sits at the bottom of the sidebar, utilizing a primary drop-shadow for emphasis.

### Mobile Bottom Navigation (Small Screens)
*   **Behavior**: Fixed to the bottom, highly mobile-optimized.
*   **Floating Action Button (FAB)**: The "Create New" action is moved to a central, elevated circular button. It uses a negative top margin (`-mt-5`) and a thick white border to break out of the navigation bar's bounding box, creating a prominent focal point.
*   **Icon Distribution**: Navigation links are evenly split to the left and right of the central FAB, displaying only icons and micro-text (`text-[8px]`).

---

## 4. Role-Based Navigation Rendering

The navigation arrays are dynamically injected based on the user's role, ensuring a clean UI devoid of "locked" or disabled tabs:

*   **Admin**: Dashboard, Staffs, Works, Planning, Works Hub, Reports.
*   **Manager**: Dashboard, Works, Planning, Reports, My Team.
*   **Assignee**: Dashboard, Works, Planning, Works Hub, Reports.

---

## 5. Micro-Interactions & UX Details

*   **Active States**: Interactive elements (like the FAB or primary buttons) use `active:scale-95` to provide immediate, tactile feedback when clicked or tapped.
*   **Focus Management**: Input fields use a customized focus ring (`focus:ring-2 focus:ring-primary/20 focus:border-primary`) rather than harsh default browser outlines.
*   **Icon Animation**: The usage of `material-symbols-outlined` with variable font properties allows the icons to transition smoothly from an outline to a filled state without swapping DOM elements or SVGs.
