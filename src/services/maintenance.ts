import { Injectable, signal } from '@angular/core';
import { ApiService } from '@/services/api';

const DEFAULT_INTERVAL = 5 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class MaintenanceService {
  readonly enabled = signal<boolean>(false);

  constructor(private service: ApiService) {
    void this.init();
  }

  async checkHealth(): Promise<void> {
    await this.service.health().catch(() => this.enabled.set(true));
  }

  async init(): Promise<void> {
    this.enabled.set(await this.service.maintenance());
    await this.checkHealth();
    setInterval(async () => {
      await this.checkHealth();
    }, DEFAULT_INTERVAL);
    console.log(this.enabled());
  }

  isEnabled(): boolean {
    return this.enabled();
  }
}
