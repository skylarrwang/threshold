import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/shared/Button';

export function ChatSearchNudge() {
  const navigate = useNavigate();

  return (
    <div className="bg-primary-fixed rounded-xl p-6 flex items-start gap-5">
      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-2xl text-primary">search</span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-headline font-bold text-on-primary-fixed mb-1">
          Find Jobs via Chat
        </h3>
        <p className="text-sm text-on-primary-fixed-variant leading-relaxed mb-4">
          Our AI assistant searches thousands of real listings, identifies fair-chance employers, and can auto-fill applications for you.
        </p>
        <Button
          size="sm"
          onClick={() => navigate('/chat?prompt=' + encodeURIComponent('Help me search for jobs near me'))}
        >
          <span className="material-symbols-outlined text-[16px] mr-1">support_agent</span>
          Start Job Search
        </Button>
      </div>
    </div>
  );
}
