import Flask from '@components/Flask';

import Footer from '@components/Footer';
import Banner from '@/src/components/Banner';

import Toast from './components/Toast';

function App() {
  return (
    <>
      <Banner />
      <Toast />
      <Flask />
      <Footer />
    </>
  );
}

export default App;
