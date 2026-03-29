import { useNavigate } from 'react-router-dom';

interface QuickAction {
  icon: string;
  label: string;
  description: string;
  prompt: string;
}

const ACTIONS: QuickAction[] = [
  {
    icon: 'emergency_home',
    label: 'Find Emergency Shelter',
    description: 'Shelters with beds available near you',
    prompt: 'I need help finding emergency shelter near Hartford, CT',
  },
  {
    icon: 'house',
    label: 'Reentry Housing Programs',
    description: 'Programs that accept people with records',
    prompt: 'Find me reentry housing programs in Connecticut',
  },
  {
    icon: 'apartment',
    label: 'Section 8 / PHA Guide',
    description: 'Housing authority info and waitlists',
    prompt: 'Give me the Section 8 and public housing authority guide for Connecticut',
  },
  {
    icon: 'checklist',
    label: 'Prepare to Apply',
    description: 'Document checklists and talking points',
    prompt: 'Help me prepare a housing application for transitional housing',
  },
  {
    icon: 'gavel',
    label: 'Know Your Rights',
    description: 'Fair chance housing laws in your state',
    prompt: 'What are the fair chance housing laws in Connecticut?',
  },
  {
    icon: 'payments',
    label: 'Check Rent Prices',
    description: 'Fair market rents for budgeting',
    prompt: 'What are the fair market rents in Hartford County, Connecticut?',
  },
];

export function QuickActionsGrid() {
  const navigate = useNavigate();

  const handleAction = (prompt: string) => {
    navigate(`/chat?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          onClick={() => handleAction(action.prompt)}
          className="flex items-start gap-3 p-4 rounded-xl bg-surface-container-lowest shadow-[0_2px_8px_rgba(26,28,28,0.04)] hover:shadow-[0_4px_16px_rgba(26,28,28,0.08)] transition-all text-left group"
        >
          <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform flex-shrink-0 mt-0.5">
            {action.icon}
          </span>
          <div>
            <p className="text-sm font-bold text-on-surface mb-0.5">{action.label}</p>
            <p className="text-xs text-on-surface-variant leading-relaxed">{action.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
