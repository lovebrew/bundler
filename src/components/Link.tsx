import "@/styles/link.css";

const Spacer = () => <span className="spacer">&#x2022;</span>;

type LinkProps = {
  icon: string;
  href?: string;
  text: string;
};

function Link(props: LinkProps) {
  return (
    <a href={props.href} className="link">
      <i className={`${props.icon} link-icon`}></i>
      {props.text}
    </a>
  );
}

export { Link, Spacer };
