import { Injectable } from '@angular/core';
import { ApiService } from '@/services/api';

const DEFAULT_INTERVAL = 5 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class MaintenanceService {
  #enabled = false;

  constructor(private service: ApiService) {}

  async checkHealth(): Promise<void> {
    await this.service.health().catch(() => (this.#enabled = true));
  }

  async init(): Promise<void> {
    this.#enabled = await this.service.maintenance();
    await this.checkHealth();
    setInterval(async () => {
      await this.checkHealth();
    }, DEFAULT_INTERVAL);
  }

  get enabled(): boolean {
    return this.#enabled;
  }
}
