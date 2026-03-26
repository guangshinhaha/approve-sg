interface SubmissionIdProps {
  id: string;
}

export function SubmissionId({ id }: SubmissionIdProps) {
  const short = `ASG-${id.slice(0, 4).toUpperCase()}`;
  return (
    <code className="text-xs font-semibold bg-approve-surface-alt text-approve-primary-dark px-2 py-0.5 rounded">
      {short}
    </code>
  );
}
