# 🎨 SafeNode Brand Guidelines

## Brand Identity

### Logo
The SafeNode logo features a modern lock icon representing security and trust. The design emphasizes:
- **Clean, minimal aesthetic**
- **Purple gradient color scheme** (#8B5CF6 to #EC4899)
- **Rounded corners** for friendliness
- **Scalable design** that works across all platforms

### Color Palette

#### Primary Colors
- **Purple**: `#8B5CF6` (Primary brand color)
- **Pink**: `#EC4899` (Accent color)
- **Gradient**: `from-purple-500 to-pink-500`

#### Secondary Colors
- **Slate**: `#64748B` (Text and UI elements)
- **White**: `#FFFFFF` (Background and contrast)
- **Green**: `#10B981` (Success states)
- **Red**: `#EF4444` (Error states)
- **Blue**: `#3B82F6` (Info states)

### Typography

#### Primary Font
- **Inter**: Modern, clean sans-serif
- **Weights**: 300, 400, 500, 600, 700, 800
- **Usage**: All UI text, headings, and body copy

#### Font Hierarchy
- **H1**: 2.25rem (36px) / font-weight: 700
- **H2**: 1.875rem (30px) / font-weight: 600
- **H3**: 1.5rem (24px) / font-weight: 600
- **Body**: 1rem (16px) / font-weight: 400
- **Small**: 0.875rem (14px) / font-weight: 400

### Design Principles

#### Glass Morphism
- **Background**: `bg-white/80` with `backdrop-blur-xl`
- **Borders**: `border-white/20`
- **Shadows**: `shadow-xl shadow-black/5`
- **Usage**: Cards, modals, and UI containers

#### Animations
- **Duration**: 200-300ms for micro-interactions
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)`
- **Scale**: `1.02` for hover states
- **Library**: Framer Motion

#### Spacing
- **Base unit**: 4px (0.25rem)
- **Common spacing**: 8px, 12px, 16px, 24px, 32px
- **Grid**: 8-column responsive grid

### Voice & Tone

#### Brand Personality
- **Secure**: Trustworthy and reliable
- **Modern**: Cutting-edge technology
- **Elegant**: Beautiful and refined
- **Accessible**: Easy to understand and use

#### Messaging
- **Primary**: "Your zero-knowledge, beautifully designed password vault"
- **Secondary**: "Security meets elegance"
- **Tagline**: "Built for the modern web"

### Usage Guidelines

#### Logo Usage
- **Minimum size**: 24px height
- **Clear space**: 2x the logo height
- **Background**: Works on light and dark backgrounds
- **Don't**: Stretch, rotate, or modify colors

#### Color Usage
- **Primary purple**: Use for CTAs and brand elements
- **Gradients**: Use sparingly for emphasis
- **Neutrals**: Use for text and secondary elements
- **Accent colors**: Use for status indicators only

#### Typography
- **Headlines**: Use gradient text for impact
- **Body text**: Use standard slate colors
- **Links**: Use purple with hover states
- **Code**: Use monospace fonts

### Marketing Materials

#### Screenshots
- **Style**: Clean, minimal UI shots
- **Background**: Light gradient or white
- **Annotations**: Purple accent color
- **Format**: PNG with transparency

#### Social Media
- **Aspect ratio**: 1:1 for Instagram, 16:9 for Twitter
- **Template**: Brand colors with logo
- **Content**: Feature highlights and security benefits

#### Documentation
- **Header**: Purple gradient background
- **Code blocks**: Dark theme with syntax highlighting
- **Callouts**: Glass morphism cards
- **Navigation**: Clean, minimal design

### Implementation

#### CSS Classes
```css
/* Brand Colors */
.brand-primary { @apply bg-purple-500; }
.brand-gradient { @apply bg-gradient-to-r from-purple-500 to-pink-500; }
.brand-text { @apply bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent; }

/* Glass Effects */
.glass { @apply bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl shadow-black/5; }
.glass-card { @apply bg-white/70 backdrop-blur-md border border-white/30 shadow-lg; }

/* Animations */
.hover-lift { @apply hover:-translate-y-0.5 transition-transform duration-200; }
.hover-scale { @apply hover:scale-105 transition-transform duration-200; }
```

#### React Components
- **Button**: Standardized with brand colors
- **Card**: Glass morphism styling
- **Icon**: Consistent sizing and colors
- **Typography**: Gradient text support

### Accessibility

#### Color Contrast
- **AA Compliance**: All text meets WCAG 2.1 AA standards
- **Focus States**: Purple ring for keyboard navigation
- **Reduced Motion**: Respects user preferences

#### Screen Readers
- **Alt Text**: Descriptive for all images
- **ARIA Labels**: Clear for interactive elements
- **Semantic HTML**: Proper heading hierarchy

### File Formats

#### Logo Files
- **SVG**: For web and scalable use
- **PNG**: 24px, 48px, 96px, 192px, 512px
- **ICO**: For favicons and desktop apps

#### Brand Assets
- **Favicon**: 32x32 PNG with transparency
- **App Icons**: 512x512 PNG for app stores
- **Social Images**: 1200x630 PNG for social sharing

---

*Last updated: December 2024*
*Version: 1.0*
