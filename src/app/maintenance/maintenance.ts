import { Component, inject } from '@angular/core';
import { MaintenanceService } from '@/services/maintenance';

@Component({
  selector: 'maintenance',
  imports: [],
  templateUrl: 'maintenance.html',
  styleUrl: 'maintenance.css',
  standalone: true,
})
export class Maintenance {
  ms = inject(MaintenanceService);
  isEnabled = this.ms.enabled;
}
