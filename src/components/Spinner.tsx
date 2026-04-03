export default function Spinner() {
  return (
    <svg className="spinner" viewBox="0 0 50 50" role="img" aria-label="Loading">
      <circle className="spinnerTrack" cx="25" cy="25" r="20" fill="none" strokeWidth="5" />
      <circle
        className="spinnerIndicator"
        cx="25"
        cy="25"
        r="20"
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
