import { Howl } from 'howler';

import success from '@assets/sound/success.ogg';
import error from '@assets/sound/error.ogg';
import loading from '@assets/sound/loading.ogg';
import warning from '@assets/sound/warning.ogg';

import { toast, Toaster } from 'sonner';

import "@styles/toast.css";

const successSfx = new Howl({ src: success });
const errorSfx = new Howl({ src: error });
const loadingSfx = new Howl({ src: loading, loop: true });
const warningSfx = new Howl({ src: warning });

export function Toast() {
  return (
    <Toaster
      position='top-center'
      richColors
      className="toast-content"
      toastOptions={{
        style: {
          width: "fit-content",
          marginInline: "auto"
        },
        classNames: {
          success: "toast-success",
          error: "toast-error",
          warning: "toast-warning",
          loading: "toast-loading"
        }
      }}
    />
  );
}

export function toastSuccess(
  message?: string,
) {
  if (!message) return;
  successSfx.play();
  toast.success(message);

}

export function toastError(
  message?: string,
) {
  if (!message) return;
  errorSfx.play();
  toast.error(message);
}

export function toastWarning(message?: string) {
  if (!message) return;
  warningSfx.play();
  toast.warning(message);
}

export async function toastLoading(
  f: Promise<unknown> | (() => Promise<unknown>),
  message?: string,
) {
  if (!message) return;
  loadingSfx.play();
  toast.promise(f, {
    loading: message,
    success: (data: unknown) => {
      loadingSfx.stop();
      return data as string;
    },
    error: (error: Error) => {
      loadingSfx.stop();
      return error.message;
    }
  });
}
