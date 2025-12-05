# HyperDrive Design Guidelines

## Design Philosophy
**Aesthetic**: Sophisticated Minimalism - The interface must be indistinguishable from a native Notion page. This is a productivity tool, not a marketing site.

## Typography System

**Primary Font**: Inter (from next/font/google) for all UI text
**Code/Logs Font**: JetBrains Mono or standard Monospace

**Hierarchy Rule**: NO large headers. Create visual hierarchy through font-weight (font-medium) and color (text-zinc-900), not through size changes.

## Color Palette (Tailwind Zinc-based)

**Backgrounds**:
- Cards/Panels: `bg-white`
- Main app background/Sidebar: `bg-[#F7F7F5]` (Notion's signature gray)

**Text Colors**:
- Primary text: `text-[#37352f]` (Notion black)
- Secondary text: `text-[#9B9A97]` (muted gray)

**Borders**: Very subtle `border-[#E0E0E0]`

**Accent Colors**: Minimal use - green for performance improvements (e.g., "45ms" latency in green)

## Component Design Standards

**Buttons**: 
- Small height only: `h-7` or `h-8`
- Subtle hover states
- No drop shadows
- Clean, flat appearance

**Icons**: 
- Library: lucide-react exclusively
- Size: 14px or 16px consistently

**Cards/Panels**: 
- Clean white backgrounds
- Minimal borders
- Ample padding for breathing room

**Progress Indicators**: 
- Minimal height (`h-1`) 
- Positioned at top of relevant sections

## Layout Architecture

**Sidebar Navigation**:
- Fixed width: `w-60`
- Flat gray background (`bg-[#F7F7F5]`)
- Links: "New Optimization", "Job History", "Playground", "Deployment"
- Minimal styling - text-based links with subtle hover states

**TopNav**:
- Minimal breadcrumb navigation (e.g., "HyperDrive / Jobs / #8291a")
- Clean, understated design
- No heavy branding elements

**Content Areas**:
- High information density
- Generous whitespace between sections
- No flashy gradients or decorative elements

## Page-Specific Guidelines

**Upload Page (/upload)**:
- Left Panel: Clean drag-and-drop zone with subtle border
- Right Panel: Notion-style property list displaying configuration options (Quantization, Target Device, Strategy)
- Action button: "Optimize Model" - small, prominent placement

**Job Detail Page (/jobs/[id])**:
- Visual Pipeline: Vertical step tracker showing optimization stages (e.g., "1. Graph Fusion", "2. Quantization")
- Live Terminal: Black code block (`bg-[#1e1e1e]`) displaying streaming logs
- Progress bar: Minimal `h-1` at page top
- Technical aesthetic - emphasize data over decoration

**Playground Page (/playground)**:
- Split-screen layout: Two equal panels side-by-side
- Input area: Text area for prompt input
- Output comparison:
  - Left: Original Model Output + Latency (neutral styling)
  - Right: Optimized Model Output + Latency in green highlighting performance gain
- Action: "Run Inference" button centered or bottom-aligned

**Deploy Page (/deploy)**:
- Tabbed interface: "Python (ONNX)", "Triton Server", "Docker"
- Code snippet display: Monospace font, dark background, syntax highlighting
- Copy-to-clipboard functionality
- Minimal chrome around code blocks

## Interactive Elements

**Real-time Updates**:
- WebSocket-powered log streaming in terminal view
- Progressive step completion indicators
- Subtle animations for state changes (avoid flashy transitions)

**Data Visualization**:
- Clean, minimal charts if needed
- Emphasize performance metrics (latency improvements)
- Use subtle color coding (green for improvements)

## Design Principles

1. **Information Density**: Pack meaningful data without clutter
2. **Whitespace**: Use generously to create breathing room
3. **Restraint**: Avoid decorative elements - function over form
4. **Trust Through Transparency**: Show technical details (logs, metrics) to build confidence
5. **Production-Ready Feel**: Professional, enterprise-grade aesthetic throughout

## Images
No hero images. No marketing imagery. This is a pure dashboard/productivity application focused on data, forms, and technical output visualization.