const content = (
  <>
    <img className="brand-logo" src="/assets/mystery-club-logo.svg" alt="" />
    <strong>Mystery Club</strong>
  </>
);

export default function Brand({ linked = false }) {
  return linked ? <a className="brand" href="#">{content}</a> : <div className="brand">{content}</div>;
}
