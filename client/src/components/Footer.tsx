import { Link, Spacer } from '@/components/Link';
import '@/styles/footer.css';

const version = require('../../package.json').version;

export const Footer = () => {
  const links = [
    {
      icon: 'fa-solid fa-book-open',
      href: 'https://lovebrew.org/bundler/overview',
      text: 'Wiki'
    },
    {
      icon: 'fa-regular fa-copyright',
      href: undefined,
      text: `LÖVEBrew`
    },
    {
      icon: 'fa-solid fa-tag',
      href: undefined,
      text: `${version}`
    }
  ];

  return (
    <footer className="footer">
      {links.map((link, index) => (
        <>
          <Link icon={link.icon} href={link.href} text={link.text} />
          {index < links.length - 1 && <Spacer />}
        </>
      ))}
    </footer>
  );
};
