import { Component } from '@angular/core';

import { NgxSonnerToaster } from 'ngx-sonner';

import { Flask } from '@/app/flask/flask';
import { Dropzone } from '@/app/dropzone/dropzone';
import { Maintenance } from '@/app/maintenance/maintenance';

@Component({
  selector: 'app',
  templateUrl: 'app.html',
  styleUrl: 'app.css',
  imports: [Flask, Dropzone, NgxSonnerToaster, Maintenance],
})
export class App {}
