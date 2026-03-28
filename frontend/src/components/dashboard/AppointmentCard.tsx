import type { Appointment } from '@/types';
import { cn } from '@/lib/utils';

interface AppointmentCardProps {
  appointment: Appointment;
}

function formatMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
}

function formatDay(dateStr: string): string {
  const date = new Date(dateStr);
  return String(date.getDate());
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const isPrimary = appointment.type === 'counseling' || appointment.type === 'employment';

  return (
    <div className="flex gap-4 items-start">
      <div
        className={cn(
          'flex flex-col items-center justify-center min-w-[50px] h-[50px] rounded-lg flex-shrink-0',
          isPrimary
            ? 'bg-primary-container text-on-primary-container'
            : 'bg-surface-container-high text-on-surface-variant'
        )}
      >
        <span className="text-xs font-bold uppercase leading-none">{formatMonth(appointment.date)}</span>
        <span className="text-lg font-extrabold leading-tight">{formatDay(appointment.date)}</span>
      </div>
      <div>
        <p className="text-sm font-bold text-on-surface">{appointment.title}</p>
        <p className="text-xs text-on-surface-variant mt-0.5">
          {appointment.time} &bull; {appointment.location}
        </p>
      </div>
    </div>
  );
}
