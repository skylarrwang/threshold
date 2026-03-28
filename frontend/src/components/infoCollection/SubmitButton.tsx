interface SubmitButtonProps {
  isSubmitting: boolean;
}

export function SubmitButton({ isSubmitting }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="w-full sm:w-auto px-8 py-3 bg-primary text-on-primary font-headline font-bold rounded-xl shadow-[0_8px_32px_rgba(26,28,28,0.06)] hover:bg-primary-container hover:text-on-primary-container disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
    >
      {isSubmitting ? 'Submitting...' : 'Submit Info'}
    </button>
  );
}
