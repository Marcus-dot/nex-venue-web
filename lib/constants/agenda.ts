import { 
    Star, 
    Lightbulb, 
    Users, 
    MessageSquare, 
    Coffee, 
    Monitor, 
    BookOpen, 
    Flame, 
    Megaphone, 
    Presentation, 
    Layers 
} from "lucide-react";

export const CATEGORY_CONFIG = {
    keynote: { 
        label: 'Keynote', 
        icon: Star, 
        color: 'text-amber-500', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20',
        description: 'Main stage presentations'
    },
    workshop: { 
        label: 'Workshop', 
        icon: Lightbulb, 
        color: 'text-purple-500', 
        bg: 'bg-purple-500/10', 
        border: 'border-purple-500/20',
        description: 'Interactive learning sessions'
    },
    panel: { 
        label: 'Panel', 
        icon: Users, 
        color: 'text-blue-500', 
        bg: 'bg-blue-500/10', 
        border: 'border-blue-500/20',
        description: 'Group discussions and Q&A'
    },
    networking: { 
        label: 'Networking', 
        icon: MessageSquare, 
        color: 'text-green-500', 
        bg: 'bg-green-500/10', 
        border: 'border-green-500/20',
        description: 'Social and business connections'
    },
    break: { 
        label: 'Break', 
        icon: Coffee, 
        color: 'text-surface-dark/40', 
        bg: 'bg-surface-dark/5', 
        border: 'border-surface-dark/10',
        description: 'Coffee and rest intervals'
    },
    demo: { 
        label: 'Demo', 
        icon: Monitor, 
        color: 'text-pink-500', 
        bg: 'bg-pink-500/10', 
        border: 'border-pink-500/20',
        description: 'Product or feature showcases'
    },
    case_study: { 
        label: 'Case Study', 
        icon: BookOpen, 
        color: 'text-cyan-500', 
        bg: 'bg-cyan-500/10', 
        border: 'border-cyan-500/20',
        description: 'Deep dives into real projects'
    },
    fireside: { 
        label: 'Fireside', 
        icon: Flame, 
        color: 'text-orange-600', 
        bg: 'bg-orange-600/10', 
        border: 'border-orange-600/20',
        description: 'Intimate 1-on-1 conversations'
    },
    remarks: { 
        label: 'Remarks', 
        icon: Megaphone, 
        color: 'text-red-500', 
        bg: 'bg-red-500/10', 
        border: 'border-red-500/20',
        description: 'Opening and closing speeches'
    },
    presentation: { 
        label: 'Presentation', 
        icon: Presentation, 
        color: 'text-accent', 
        bg: 'bg-accent/10', 
        border: 'border-accent/20',
        description: 'Standard informational talks'
    },
    other: { 
        label: 'Other', 
        icon: Layers, 
        color: 'text-surface-dark/60', 
        bg: 'bg-surface-dark/10', 
        border: 'border-surface-dark/20',
        description: 'Miscellaneous sessions'
    },
} as const;

export type CategoryKey = keyof typeof CATEGORY_CONFIG;
