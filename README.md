# Nexora - Autonomous Entity Defense Platform

## 🚀 Overview

Nexora is an enterprise-grade cybersecurity SaaS platform designed to secure non-human identities (NHIs) including AI agents, API keys, service accounts, and bots. The platform provides real-time threat detection, quantum-resistant cryptography, and autonomous remediation capabilities with human-in-the-loop controls.

## 🎨 UI/UX Design System

This repository contains the complete UI/UX design system for the Nexora platform, built with modern web technologies and security-first principles.

### 🎯 Design Philosophy

- **Security-First**: Every visual element communicates trust, control, and security
- **Dark Mode Native**: Optimized for security operations centers (SOCs)
- **Zero Trust Visual Language**: Deny-by-default with clear permission indicators
- **Accessibility**: WCAG 2.1 AA compliant with screen reader support
- **Performance**: <2s page load, 60fps animations, optimized bundle size

### 🏗️ Architecture

```
Nexora UI/UX Architecture
├── Design System (Tabler-inspired)
├── Component Library (Radix UI + CVA)
├── Security-Focused Color Palette
├── Real-time Data Visualizations
├── Responsive Mobile-First Design
└── Enterprise Accessibility Features
```

## 🛠️ Technology Stack

### Frontend Framework
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - 60fps animations

### UI Components
- **Radix UI** - Accessible headless components
- **Class Variance Authority (CVA)** - Component variants
- **Lucide React** - Icon system
- **Tabler Icons** - Security-focused icons

### Data Visualization
- **Recharts** - Chart library for analytics
- **React Flow** - Entity relationship graphs
- **D3.js** - Custom security visualizations

### Development Tools
- **Storybook** - Component development
- **Jest** - Unit testing
- **Pa11y** - Accessibility testing
- **ESLint + Prettier** - Code quality

## 🚀 Complete SaaS Startup Guide

### Prerequisites

- Node.js 18+ 
- npm 9+
- PostgreSQL 14+ (for backend database)
- Git

### Full Stack Installation & Startup

#### Option 1: Frontend Only (Current - Live Data Demo)
```bash
# 1. Install frontend dependencies
npm install

# 2. Start frontend development server
npm run dev

# 3. Open browser
http://localhost:3000

# Features Available:
# ✅ Live threat intelligence from NIST NVD + AbuseIPDB
# ✅ Real-time dashboard with auto-refresh
# ✅ All UI/UX components functional
# ✅ Client dashboard with live data
```

#### Option 2: Full Stack (Frontend + Backend + Database)
```bash
# 1. Install frontend dependencies
npm install

# 2. Install backend dependencies
cd backend
npm install

# 3. Setup PostgreSQL database
# Create database: nexora_dev
# Update backend/.env with your DATABASE_URL

# 4. Run database migrations
cd backend
npx prisma migrate dev
npx prisma generate

# 5. Start backend API server (Terminal 1)
cd backend
npm run dev
# Backend runs on: http://localhost:8080

# 6. Start frontend dev server (Terminal 2)
cd ..
npm run dev
# Frontend runs on: http://localhost:3000
```

### Quick Start (Recommended)
```bash
# Single command to start frontend with live data
npm run dev

# Access application:
# - Main Dashboard: http://localhost:3000
# - Client Dashboard: http://localhost:3000/client-dashboard
# - Admin Panel: http://localhost:3000/admin
# - Demo Page: http://localhost:3000/demo
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking

# Testing
npm test             # Run Jest tests
npm run test:watch   # Watch mode testing
npm run test:coverage # Coverage report

# Storybook
npm run storybook    # Start Storybook
npm run build-storybook # Build Storybook

# Accessibility
npm run accessibility # Run Pa11y accessibility tests
```

## 🎨 Design System Components

### Core Components

#### 1. **ThreatCard**
Security-focused card component for displaying threat information.

```tsx
<ThreatCard
  id="threat-001"
  title="Suspicious API Key Usage"
  description="API key accessed from unusual location"
  severity="critical"
  entityName="prod-api-key-7829"
  entityType="API Key"
  timestamp={new Date()}
  status="active"
  riskScore={95}
  onInvestigate={() => {}}
  onRemediate={() => {}}
  onDismiss={() => {}}
/>
```

#### 2. **RiskGauge**
Circular progress indicator for risk scores with security color coding.

```tsx
<RiskGauge
  value={73}
  size="lg"
  label="Risk Score"
  animated
/>
```

#### 3. **Timeline**
Activity timeline component for security events.

```tsx
<Timeline
  events={timelineEvents}
  maxEvents={10}
  showEntityNames
/>
```

#### 4. **Button**
Enhanced button component with security variants.

```tsx
<Button variant="critical" size="lg">
  Emergency Stop
</Button>
```

### Color Palette

#### Security-Focused Colors
```css
--security-critical: #dc2626  /* Red 600 */
--security-high: #ea580c      /* Orange 600 */
--security-medium: #d97706    /* Amber 600 */
--security-low: #65a30d       /* Lime 600 */
--security-info: #2563eb      /* Blue 600 */
--security-success: #059669   /* Emerald 600 */
```

#### Brand Colors
```css
--nexora-primary: #0ea5e9     /* Cyan 500 */
--nexora-secondary: #1e293b   /* Slate 800 */
--nexora-accent: #10b981      /* Green 500 */
```

### Typography

- **Headings**: Inter (sans-serif, weight 600-700)
- **Body**: Inter (sans-serif, weight 400)
- **Code/Monospace**: JetBrains Mono
- **Arabic Support**: IBM Plex Arabic

## 📱 Key Dashboard Pages

### 1. **Main Dashboard** (`/`)
- Real-time threat overview
- Risk score gauge
- Active threats list
- Activity timeline
- Quick actions

### 2. **Identity Inventory** (`/entities`)
- Searchable entity table
- Risk-based filtering
- Bulk operations
- Entity type distribution

### 3. **Threat Detection Center** (`/threats`)
- Timeline view of threats
- Investigation workspace
- Entity relationship graph
- Playbook automation

### 4. **Autonomous Remediation** (`/remediation`)
- Active playbooks
- Approval queue
- Deception network status
- Quarantine zone

### 5. **Compliance & Audit** (`/compliance`)
- Framework selector (SOC2, ISO, HIPAA, PCI-DSS)
- Control mapping
- Evidence vault
- Report generator

### 6. **Quantum Readiness** (`/quantum`)
- Algorithm migration status
- Attack simulation results
- Certificate inventory
- Migration roadmap

### 7. **Threat Intelligence** (`/intelligence`)
- Global threat map
- Shared IOC feed
- Threat actor profiles
- Community contributions

## 🔒 Security Features

### Visual Security Indicators
- **Trust Levels**: Color-coded security states
- **Glow Effects**: Critical elements pulse with security animations
- **Lock Icons**: Secure elements clearly identified
- **Status Badges**: Real-time security status indicators

### Accessibility Features
- **WCAG 2.1 AA Compliance**: Full accessibility support
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Keyboard Navigation**: Full keyboard accessibility
- **High Contrast Mode**: Support for vision accessibility
- **Reduced Motion**: Respects user motion preferences

### Performance Optimizations
- **Code Splitting**: Lazy-loaded components
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: Webpack bundle analyzer
- **GPU Acceleration**: Hardware-accelerated animations

## 🎯 User Personas

### 1. **Security Analyst** (Power User)
- **Needs**: Real-time threat feed, investigation tools, playbook automation
- **Pain Points**: Information overload, alert fatigue
- **UI Focus**: Dense information display, quick actions, keyboard shortcuts

### 2. **Compliance Officer** (Auditor)
- **Needs**: Compliance reports, evidence collection, framework mapping
- **Pain Points**: Manual evidence gathering, unclear audit trails
- **UI Focus**: Report generation, evidence management, compliance dashboards

### 3. **CISO/Executive** (Decision Maker)
- **Needs**: Risk dashboards, trend analysis, board-ready reports
- **Pain Points**: Too technical, lacks business context
- **UI Focus**: High-level metrics, executive summaries, trend visualizations

## 📊 Design Validation Criteria

### User Experience Metrics
- ✅ Can a new user find their most critical threat in <30 seconds?
- ✅ Can an executive understand the risk posture in <10 seconds?
- ✅ Can a compliance officer generate an audit report in <2 minutes?
- ✅ Is the design accessible to colorblind users?

### Performance Metrics
- ✅ Page load time: <2 seconds
- ✅ Animation frame rate: 60fps
- ✅ Bundle size: Optimized with recommendations
- ✅ Accessibility score: WCAG 2.1 AA compliant

## 🚀 Deployment

### Development Environment
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Docker Deployment
```bash
docker build -t nexora-ui .
docker run -p 3000:3000 nexora-ui
```

### Environment Variables
```env
NEXT_PUBLIC_API_URL=https://api.nexora.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://ws.nexora.com
NEXT_PUBLIC_ENVIRONMENT=production
```

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Implement component with Storybook story
3. Add unit tests
4. Run accessibility tests
5. Create pull request

### Component Development Guidelines
- Use TypeScript for all components
- Follow CVA pattern for variants
- Include Storybook stories
- Add accessibility tests
- Document props and usage

### Design System Updates
- Update design tokens in `tailwind.config.js`
- Add new components to Storybook
- Update documentation
- Test across all user personas

## 📚 Documentation

- **Design System**: `/docs/design-system.md`
- **Component API**: `/docs/components/`
- **Accessibility Guide**: `/docs/accessibility.md`
- **Performance Guide**: `/docs/performance.md`
- **Deployment Guide**: `/docs/deployment.md`

## 🔗 Links

- **Live Demo**: [https://nexora-demo.vercel.app](https://nexora-demo.vercel.app)
- **Storybook**: [https://nexora-storybook.vercel.app](https://nexora-storybook.vercel.app)
- **Figma Designs**: [Design Files](https://figma.com/nexora-designs)
- **API Documentation**: [https://api.nexora.com/docs](https://api.nexora.com/docs)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the Nexora Security Team**

*Securing the future of autonomous entities, one interface at a time.*
