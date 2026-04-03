type PillOption = { value: string; label: string };

interface PillRadioGroupProps {
  name: string;
  value: string;
  options: PillOption[];
  onChange: (value: string) => void;
}

export default function PillRadioGroup({ name, value, options, onChange }: PillRadioGroupProps) {
  return (
    <div className="pillGroup" role="radiogroup" aria-label={name}>
      {options.map((opt) => (
        <label key={opt.value} className="pill">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
