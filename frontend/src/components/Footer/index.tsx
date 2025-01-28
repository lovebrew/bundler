// import React from "react";
import styles from "./index.module.css";

const Spacer = () => <span className={styles.spacer}>•</span>;

type LinkProps = {
  icon: string;
  href?: string;
  text: string;
};

function Link(props: LinkProps) {
  return (
    <a href={props.href} className={styles.link}>
      <i className={`${props.icon} ${styles.linkIcon}`}></i>
      {props.text}
    </a>
  );
}

function Footer() {
  return (
    <div className={styles.footerContainer}>
      <Link
        icon="fa-solid fa-flask"
        href="https://github.com/lovebrew/lovepotion"
        text="LÖVE Potion"
      />
      <Spacer />
      <Link
        icon="fa-brands fa-github"
        href="https://github.com/lovebrew/lovebrew-webserver"
        text="Source code"
      />{" "}
      <Spacer />
      <Link
        icon="fa-brands fa-paypal"
        href="https://paypal.me/TurtleP?country.x=US&locale.x=en_US"
        text="Donate"
      />
      <Spacer />
      <Link icon="fa-regular fa-copyright" text="LÖVEBrew Team" />
    </div>
  );
}

export default Footer;
