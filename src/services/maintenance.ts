import { Injectable, signal } from '@angular/core';
import { ApiService } from '@/services/api';

@Injectable({
  providedIn: 'root',
})
export class MaintenanceService {
  readonly enabled = signal<boolean>(false);

  constructor(private service: ApiService) {
    void this.init();
  }

  async init(): Promise<void> {
    try {
      if (await this.service.maintenance()) {
        this.enabled.set(true);
      }
      await this.service.health();
    } catch (error) {
      this.enabled.set(true);
    }
  }

  isEnabled(): boolean {
    return this.enabled();
  }
}
