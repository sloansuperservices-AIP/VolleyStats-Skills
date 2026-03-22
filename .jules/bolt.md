# Performance & Architecture Journal

## Merge Overview
Merged four separate volleyball-related components into a single unified React application:
1. **Dashboard Hub**: The central navigation system based on the user's mind map.
2. **DIBS Management**: A full-featured volunteer shift and credit tracking system.
3. **Combine Performance (PlayerBoard)**: Video-based biomechanics analysis and tracking stations.
4. **Club Ops (Planner Preview)**: A management dashboard showing tournament readiness and club stats.

## Architecture
- **AppShell**: A top-level router that manages view state and provides common UI elements (header, nav).
- **Modular Structure**: Each module lives in `src/components/<module_name>` for easy scaling.
- **Shared Utilities**: Geometry, video processing, and inference logic consolidated in `src/utils`.

## Performance Optimizations
- **Code Organization**: Consolidating utilities prevents duplicate logic and reduces the bundle size compared to separate apps.
- **Vite Build**: Successful production build with efficient chunking.
- **Responsive Design**: All new components use Tailwind CSS for consistent, responsive layouts.

## Operational Improvements
- Users can now transition seamlessly between performance analysis (Combine) and club management (DIBS/Planner) without reloading different apps.
- The Dashboard Hub provides a clear high-level overview of the entire club ecosystem.
