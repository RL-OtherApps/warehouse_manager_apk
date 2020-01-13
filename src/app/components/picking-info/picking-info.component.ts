import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { StockService } from '../../services/stock.service';
import { AudioService } from '../../services/audio.service';
import { VoiceService } from '../../services/voice.service';
import { Location } from "@angular/common";
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-picking-info',
  templateUrl: './picking-info.component.html',
  styleUrls: ['./picking-info.component.scss'],
})
export class PickingInfoComponent implements OnInit {

  picking_data: {};
  picking: string;
  picking_code: string;
  move_lines: {};
  move_line_ids: {};
  active_operation: boolean;
  loading: any;
  audio_command: any[];

  @Input() scanner_reading: string
  @Input() voice_command: boolean;
  @Input() pick: {}
  ngSwitch: any

  constructor(
    public router: Router,
    public alertCtrl: AlertController,
    private stock: StockService,
    private route: ActivatedRoute,
    public audio: AudioService,
    private location: Location,
    public loadingController: LoadingController,
    private cd: ChangeDetectorRef,
    private voice: VoiceService
  ) {}

  ngOnInit() {
    this.active_operation = true;
    this.picking = this.route.snapshot.paramMap.get('id');
    this.get_picking_info(this.picking);
    this.voice.voice_command_refresh$.subscribe(data => {
      this.voice_command_check();
    });
  }

  open_link(location_id){
    this.router.navigateByUrl('/stock-location/'+location_id);
  }

  action_assign(){
    this.stock.action_assign(this.picking).then((lines_data)=>{
      if (lines_data == true) {
        console.log("Reloading");
        this.get_picking_info(this.picking);
      }
    })
    .catch((error)=>{
      this.presentAlert('Error al asignar cantidades:', error);
    });
  }

  button_validate(){
    this.presentLoading();
    this.stock.button_validate(Number(this.picking)).then((lines_data)=>{
      if (lines_data && lines_data['err'] == false) {
        console.log("Reloading");
        this.loading.dismiss()
        this.location.back();
      } else if (lines_data['err'] != false) {
        this.loading.dismiss()
        this.presentAlert('Error al validar el albarán:', lines_data['err']);
      }
    })
    .catch((error)=>{
      this.loading.dismiss()
      this.presentAlert('Error al validar el albarán:', error);
    });
  }

  async force_set_qty_done(move_id, field, model='stock.picking'){
    await this.stock.force_set_qty_done(Number(move_id), field, model).then((lines_data)=>{
      if (lines_data == true) {
        console.log("Reloading");
        this.move_lines = false;
        this.move_line_ids = false;
        this.get_picking_info(this.picking);
      }
    })
    .catch((error)=>{
      this.presentAlert('Error al forzar la cantidad:', error);
    });
  }

  async force_reset_qties(pick_id){
    await this.stock.force_reset_qties(Number(pick_id), 'stock.picking').then((lines_data)=>{
      if (lines_data == true) {
        console.log("Reloading");
        this.move_lines = false;
        this.move_line_ids = false;
        this.get_picking_info(this.picking);
      }
    })
    .catch((error)=>{
      this.presentAlert('Error al forzar la cantidad:', error);
    });
  }

  async presentAlert(titulo, texto) {
    this.audio.play('error');
    const alert = await this.alertCtrl.create({
        header: titulo,
        subHeader: texto,
        buttons: ['Ok']
    });
    await alert.present();
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      message: 'Validando...',
      translucent: true,
      cssClass: 'custom-class custom-loading'
    });
    await this.loading.present();
  }

  get_picking_info(picking) {
    this.stock.get_picking_info(picking).then((data)=>{
      this.picking_data = data[0];
      this.picking_code = data[0].code;
      this.move_lines = this.picking_data['move_lines'];
      this.move_line_ids = this.picking_data['move_line_ids'];
    })
    .catch((error)=>{
      this.presentAlert('Error al recuperar el picking:', error);
    });
  }

  // Voice command

  voice_command_check() {
    console.log("voice_command_check");
    console.log(this.voice.voice_command);
    if (this.voice.voice_command) {
      let voice_command_register = this.voice.voice_command;
      console.log("Recibida orden de voz: " + voice_command_register);
      
      if (this.check_if_value_in_responses("validar", voice_command_register) && this.picking_data['show_validate']) {
        console.log("entra al validate");
        this.button_validate();
      } else if (this.picking_data && (this.picking_data['state'] == 'confirmed' || this.picking_data['state'] == 'assigned') && this.check_if_value_in_responses("hecho", voice_command_register)){
        console.log("entra al hecho");
        this.force_set_qty_done(this.picking_data['id'], 'product_qty', 'stock.picking');
      } else if (this.picking_data && (this.picking_data['state'] == 'confirmed' || this.picking_data['state'] == 'assigned') && this.check_if_value_in_responses("reiniciar", voice_command_register)){
        console.log("entra al reset");
        this.force_reset_qties(this.picking_data['id']);
      }
    }
  }

  check_if_value_in_responses(value, dict) {
    if(value == dict[0] || value == dict[1] || value == dict[2]) {
      return true;
    } else {
      return false;
    }
  }



}
