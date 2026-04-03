interface FieldLabelProps {
  htmlFor?: string;
  label: string;
  info: string;
}

export default function FieldLabel({ htmlFor, label }: FieldLabelProps) {
  return (
    <div className="labelRow">
      <label htmlFor={htmlFor}>{label}</label>
    </div>
  );
}
