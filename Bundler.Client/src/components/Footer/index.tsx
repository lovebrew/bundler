import styles from './index.module.css';

const Spacer = () => <span className={styles.spacer}>•</span>;

type LinkProps = {
  icon: string;
  href?: string;
  children: string;
};

function Link(props: LinkProps) {
  return (
    <a href={props.href} className={styles.link}>
      <i className={`${props.icon} ${styles.linkIcon}`}></i>
      <span className={props.href ? "hide-sm" : ""}>{props.children}</span>
    </a>
  );
}

function Footer() {
  return (
    <footer className={styles.footerContainer}>
      <Link
        icon="fa-solid fa-flask"
        href="https://github.com/lovebrew/lovepotion"
      >
        LÖVE Potion
      </Link>
      <Spacer />
      <Link
        icon="fa-brands fa-github"
        href="https://github.com/lovebrew/lovebrew-webserver"
      >
        Source code
      </Link>
      <Spacer />
      <Link
        icon="fa-brands fa-paypal"
        href="https://paypal.me/TurtleP?country.x=US&locale.x=en_US"
      >
        Donate
      </Link>
      <span className={styles.spacer} />
      <Link icon="fa-regular fa-copyright">LÖVEBrew Team</Link>
    </footer>
  );
}

export default Footer;
