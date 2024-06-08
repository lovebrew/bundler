import tw from "tailwind-styled-components";

const FooterContainer = tw.footer`
flex
p-3
bg-neutral-800
flex-row
max-sm:text-base
content-center
justify-center
items-center
font-coolvetica
text-xl
w-full
gap-1
drop-shadow-footer
`;

const Spacer = () => <span className="px-1">•</span>;

type LinkProps = {
  icon: string;
  href?: string;
  children: string;
};

function Link(props: LinkProps) {
  return (
    <a href={props.href} className="px-1">
      <i className={`${props.icon} pr-2`}></i>
      <span className={`${props.href !== undefined && "max-sm:hidden"}`}>
        {props.children}
      </span>
    </a>
  );
}

function Footer() {
  return (
    <FooterContainer>
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
      <Spacer />
      <Link icon="fa-regular fa-copyright">LÖVEBrew Team</Link>
    </FooterContainer>
  );
}

export default Footer;
