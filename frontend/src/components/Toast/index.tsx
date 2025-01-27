import toast, { Toaster } from 'react-hot-toast';
import { Howl } from 'howler';

import successSfx from '@assets/sound/success.ogg';
import errorSfx from '@assets/sound/error.ogg';

const Toast = () => {
  return (
    <Toaster
      toastOptions={{
        className: 'bg-neutral-800 text-white',
        success: { className: 'bg-green-600 text-white' },
        error: { className: 'bg-red-600 text-white' },
      }}
    />
  );
};

const playSound = (type: 'success' | 'error') => {
  const sound = type === 'success' ? successSfx : errorSfx;
  new Howl({ src: sound }).play();
};

export function toastSuccess(message?: string) {
  playSound("success");
  if (!message) return;
  toast.success(message);
}

export function toastError(message?: string) {
  playSound("error");
  if (!message) return;
  toast.error(message);
}

export default Toast;

