import { toast } from 'ngx-sonner';
import { Sound } from '@/app/models/sound';

const sfxMap = {
  success: new Sound('/sound/success.ogg'),
  error: new Sound('/sound/error.ogg'),
  loading: new Sound('/sound/loading.ogg', true),
  warning: new Sound('/sound/warning.ogg'),
} as const;

type ToastType = keyof typeof sfxMap;

export function playToast(type: ToastType, message?: string) {
  if (!message) return;
  sfxMap[type].play();

  switch (type) {
    case 'success':
      toast.success(message);
      break;
    case 'error':
      toast.error(message);
      break;
    case 'warning':
      toast.warning(message);
      break;
  }
}

export async function toastLoading<T>(
  f: Promise<T> | (() => Promise<T>),
  callback: (data: T) => string,
  message?: string,
) {
  if (!message) return;
  sfxMap.loading.play();
  const promise = typeof f === 'function' ? f() : f;

  toast.promise(promise, {
    loading: message,
    success: (data: T) => {
      sfxMap.loading.stop();
      sfxMap.success.play();
      return callback(data);
    },
    error: (error: unknown) => {
      sfxMap.loading.stop();
      sfxMap.error.play();
      return error instanceof Error ? error.message : 'Unknown error';
    },
  });
}
