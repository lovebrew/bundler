import { Howl } from 'howler';

import success from '@assets/sound/success.ogg';
import error from '@assets/sound/error.ogg';
import loading from '@assets/sound/loading.ogg';
import warning from '@assets/sound/warning.ogg';

import { toast, Toaster } from 'sonner';

// Cookie utility functions
function setCookie(name: string, value: string, days: number = 7) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name: string): string | null {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

const successSfx = new Howl({ src: success });
const errorSfx = new Howl({ src: error });
const loadingSfx = new Howl({ src: loading, loop: true });
const warningSfx = new Howl({ src: warning });

export function Toast() {
  return (
    <Toaster
      position="top-center"
      richColors
      toastOptions={{
        classNames: {
          success: 'toast-success',
          error: 'toast-error',
          loading: 'toast-wait',
          warning: 'toast-warning'
        }
      }}
    />
  );
}

export function toastSuccess(
  message?: string,
  cookieName?: string,
  cookieValue?: string
) {
  if (!message) return;
  successSfx.play();

  if (cookieName && cookieValue) {
    toast.success(message, {
      action: {
        label: 'OK',
        onClick: () => setCookie(cookieName, cookieValue)
      }
    });
  } else {
    toast.success(message);
  }
}

export function toastError(
  message?: string,
  cookieName?: string,
  cookieValue?: string
) {
  if (!message) return;
  errorSfx.play();

  if (cookieName && cookieValue) {
    toast.error(message, {
      action: {
        label: 'Dismiss',
        onClick: () => setCookie(cookieName, cookieValue)
      }
    });
  } else {
    toast.error(message);
  }
}

export function toastWarning(
  message?: string,
  cookieName?: string,
  cookieValue?: string
) {
  if (!message) return;
  warningSfx.play();

  if (cookieName && cookieValue) {
    toast.warning(message, {
      action: {
        label: 'Got it',
        onClick: () => setCookie(cookieName, cookieValue)
      }
    });
  } else {
    toast.warning(message);
  }
}

export function toastLoading(
  f: Promise<unknown>,
  success: Promise<unknown>,
  message?: string,
  cookieName?: string,
  cookieValue?: string
) {
  if (!message) return;
  loadingSfx.play();
  toast.promise(f, {
    loading: message,
    success: (data: unknown) => {
      loadingSfx.stop();
      if (cookieName && cookieValue) {
        setCookie(cookieName, cookieValue);
      }
      return data as string;
    },
    error: (error: Error) => {
      loadingSfx.stop();
      return error.message;
    }
  });
}

// Additional utility function to create a custom clickable toast
export function toastClickable(
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  cookieName: string,
  cookieValue: string,
  actionLabel: string = 'Click me'
) {
  const toastFn =
    type === 'success'
      ? toast.success
      : type === 'error'
        ? toast.error
        : type === 'warning'
          ? toast.warning
          : toast;

  toastFn(message, {
    action: {
      label: actionLabel,
      onClick: () => setCookie(cookieName, cookieValue)
    }
  });
}

// Export cookie utilities for external use
export { setCookie, getCookie };
