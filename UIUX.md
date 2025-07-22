# UI/UX Principles – Rolodex

## 1. Design Philosophy
- Immaculate, design-tool-level polish
- Minimal, modern, and highly usable
- Delightful microinteractions, no jank
- Accessibility and responsiveness are non-negotiable

## 2. Component Library
- **shadcn/ui** as base (headless, accessible)
- Custom tokens for brand (spacing, radii, color)
- All components themed for dark/light/system
- Use Geist and Geist Mono for typography

## 3. Theming & Typography
- Tailwind dark mode (class strategy)
- Theme switcher (persistent, system-aware)
- Geist for UI, Geist Mono for code/hex fields

## 4. Layout & Responsiveness
- Grid-based layouts for library/moodboard
- Drag-and-drop (dnd-kit)
- Mobile-first, but optimized for large screens

## 5. Motion & Microinteractions
- Framer Motion for transitions
- Toasts/snackbars for feedback
- Skeleton loaders for async/AI fetches

## 6. Accessibility
- Keyboard navigation for all controls
- ARIA labels, focus states, color contrast
- Screen reader tested (VoiceOver, NVDA)

## 7. Visual Polish
- Subtle shadows, border radii, spacing
- Custom empty states, easter eggs
- High-res, print-quality moodboard export

## 8. Component Inventory
- **Button**: Primary, secondary, icon, loading
- **Input**: Text, search, number, color picker
- **Modal**: Edit item, confirm delete, moodboard export
- **Card**: Product/item, project
- **Grid/List**: Library view, project view
- **Dropdown**: Filters, category select
- **Toast/Snackbar**: Save, error, undo
- **Theme Switcher**: Dark/light/system
- **Drag-and-drop**: Project/moodboard arrangement
- **Avatar/User menu**: Profile, logout
- **Empty State**: No items, no projects, error

## 9. Color Palette (Example)
- **Primary**: #1A202C (dark), #F7FAFC (light)
- **Accent**: #4A6B3C (green), #E53E3E (red)
- **Background**: #121212 (dark), #FFFFFF (light)
- **Surface**: #23272F (dark), #F5F5F5 (light)
- **Border**: #2D3748 (dark), #E2E8F0 (light)
- **Text**: #F7FAFC (dark), #1A202C (light)

## 10. Spacing Scale (Tailwind)
- 0, 1, 2, 4, 6, 8, 12, 16, 24, 32, 40, 48, 56, 64 (px)
- Use consistent spacing for padding, margin, grid gaps

## 11. Example UI States
- **Loading**: Skeletons for cards, spinners for buttons
- **Error**: Toast/snackbar with retry, error illustration
- **Empty**: Custom illustration, call-to-action
- **Success**: Toast/snackbar, confetti (optional)
- **Disabled**: Reduced opacity, no pointer events

## 12. References
- **Figma UI Kit**: [link-to-be-added] *(Tracked in issue: TBD)*
- **Storybook**: [link-to-be-added] *(Will be deployed to a subdomain)*
- **Component Code**: `/components/`