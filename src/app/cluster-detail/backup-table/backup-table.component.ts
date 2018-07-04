import { Component, OnInit, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CookieService } from 'angular2-cookie/core';
import { CDSService } from '../../../services/httpAPI.service';
import { DataTablesResponse } from '../../../models/datatable';
import { Subject } from 'rxjs/Subject';
import { BackupResponseData, ErrorResponse } from '../../../models/response';
import { SharedService} from '../../../services/shared.service';

@Component({
  selector: 'app-backup-table',
  templateUrl: './backup-table.component.html',
  styleUrls: ['./backup-table.component.css']
})
export class BackupTableComponent implements OnInit {
  @Input('queryString') queryString = "";   
  dtOptions: any = {};
  configDiffStats: any = [];
  clusterIP : any = '';
  dtTrigger: Subject<any> = new Subject();
  modelTitle:string='';
  modalMessage:string='';
  errorBackupResponse:BackupResponseData=null;
  successBackupResponse:DataTablesResponse=null;
  errorResponse:ErrorResponse;
  constructor(private http:HttpClient, private _cookieService:CookieService, private apiData: CDSService, private sharedService:SharedService ) { }

  ngOnInit() {
    this.getBackupTable(this.queryString);
  }

  getBackupTable(obj){
    let view = this;
    view.clusterIP = obj.ip;
    console.log('obj');
    console.log(obj);
    $('#overlay').show();
    view.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      dom: "Z<'row'<'col-6'i><'col-6'f>>" +
      "<'row'<'col-12'tr>>" +
      "<'row'<'col-8'l><'col-4'p>>",
      language: {
        emptyTable : "No data available in table",
        info: "_START_ to _END_ of _TOTAL_",
        infoEmpty: "0 - 0 of 0",
        lengthMenu: "Show _MENU_",
        zeroRecords:"",
        searchPlaceholder: "Search for..."
      }
    };

    this.apiData.cdsBackupLogsService(obj).subscribe(data => {
      $('#overlay').hide();
      console.log('cdsBackupLogsService');
      console.log(data);
      if(data.hasOwnProperty('recordsFiltered')) {
        view.successBackupResponse=data;
      } else if(data.hasOwnProperty('success')) {
        view.errorBackupResponse=data;
        if(!view.errorBackupResponse.success) {
          view.modelTitle='Error';
          view.modalMessage=view.errorBackupResponse.message;
          $('#showAuditLogErrorModal').click();
        }
      }     
      view.configDiffStats = data.data;
      view.dtTrigger.next();
    }, function(err) {
      view.errorResponse = err;
      $('#overlay').hide();
      if (view.errorResponse.message.includes('Session')) {
        view.sharedService.logout(true);
      } else {
        view.modelTitle=view.errorResponse.title;
        view.modalMessage=view.errorResponse.message;
        $('#showAuditLogErrorModal').click();
      }

    });

  }

  okBtnClicked(){
    $('#auditLogPopUpModal .close').click();
  }

}
