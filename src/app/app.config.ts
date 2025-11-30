import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { MaintenanceService } from '@/app/maintenance';

export function initAppFactory(ms: MaintenanceService) {
  return () => ms.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => {
      const ms = inject(MaintenanceService);
      return ms.init();
    }),
  ],
};
