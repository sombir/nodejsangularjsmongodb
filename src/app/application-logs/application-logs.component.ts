import { Component, OnInit } from '@angular/core';
import {CDSService} from '../../services/httpAPI.service';
import { AdminResponse } from '../../models/admin';
import { ResponseData, ErrorResponse } from '../../models/response';
import { SharedService } from '../../services/shared.service';

let adminDetails: AdminResponse;

@Component({
  selector: 'app-application-logs',
  templateUrl: './application-logs.component.html',
  styleUrls: ['./application-logs.component.css']
})
export class ApplicationLogsComponent implements OnInit {
  appLogsList = [];
  appLogsSettings = [];
  modelTitle: String = '';
  errorResponse: ErrorResponse;
  apiResponseMessage: String = '';
  selectedFiles = [];
  logType : String = '';
  isDisabled : boolean = true;
  selectedLogs = [];
  tableLength:number=0;
  logsList = [];
  selectedAll: any;
  constructor(private apiService: CDSService,private sharedService: SharedService) {}
   selectAll(e: any) {
    var isChecked = $('#selectAllCheck').prop("checked");
      $('#logTable tr:has(td)').find('input[type="checkbox"]').prop('checked', isChecked);
      if($('#selectAllCheck').is(':checked')){
        this.isDisabled = false;
      }else{
        this.isDisabled = true;
      }
  }
  ngOnInit() {
    let view = this;
    $("body").css("background-color", "#D9E0E7");
    view.getLogsList();
    view.apiService.getUserAdminDetail().subscribe(function(adminDtl) {
            adminDetails = adminDtl;
            $('#filelogenabled').prop('checked', adminDtl.data.logsconfig.enable);
            if(adminDtl.data.logsconfig.severity)
              $('#severitySelectboxFile').val(adminDtl.data.logsconfig.severity);
            else
              $('#severitySelectboxFile').val("info");
            if(adminDtl.data.logsconfig.maxfiles)
              $('#maxfiles').val(adminDtl.data.logsconfig.maxfiles);
            else
              $('#maxfiles').val("");
            if(adminDtl.data.logsconfig.filesize)
              $('#filesize').val(adminDtl.data.logsconfig.filesize);
            else
              $('#filesize').val("");
            console.log("adminDetails", adminDetails.data.logsconfig);
        }, function(err) {
            view.errorResponse = err;
            if (view.errorResponse.message.includes('Session')) {
                view.sharedService.logout(true);
            } else {
                view.modelTitle = view.errorResponse.title;
                view.apiResponseMessage = view.errorResponse.message;
                $('#modelDialog').modal('show');
            }
        });
  }
  getLogsList(){
    let view = this;
     $('#overlay').show();
    view.apiService.listAppLogs().subscribe(function(val) {
      view.appLogsList = val.data;
       $('#overlay').hide();
    },function(err) {
      view.errorResponse = err;
      if (view.errorResponse.message.includes('Session')) {
        view.sharedService.logout(true);
      } else {
        view.modelTitle = view.errorResponse.title;
        view.apiResponseMessage = view.errorResponse.message;
        $('#modelDialog').modal('show');
      }
      $('#overlay').hide();
    });
  }
    updateConfig() {
      let view = this;
      const filelogenabled: any = "" + $('#filelogenabled').is(":checked") + "";
      const fileSeverity: any = $('#severitySelectboxFile').val();
      const filesize: any = $('#filesize').val();
      const maxfiles: any = $('#maxfiles').val();
      if(filelogenabled == "true"){
        if (fileSeverity == "" || fileSeverity == undefined) {
          view.modelTitle = 'Error';
          view.apiResponseMessage = 'File logs severity is missing.';
          $('#modelDialog').modal('show');
      } else if (filesize == "" || filesize == undefined) {
          view.modelTitle = 'Error';
          view.apiResponseMessage = 'Logs filesize is missing.';
          $('#modelDialog').modal('show');
      } else if (maxfiles == "" || maxfiles == undefined) {
          view.modelTitle = 'Error';
          view.apiResponseMessage = 'Number of log files is missing.';
          $('#modelDialog').modal('show');
      } else if (isNaN(parseInt(filesize))) {
          view.modelTitle = 'Error';
          view.apiResponseMessage = "File size must be numeric.";
          $('#modelDialog').modal('show');
      } else if (isNaN(parseInt(maxfiles))) {
          view.modelTitle = 'Error';
          view.apiResponseMessage = "Max. files must be numeric.";
          $('#modelDialog').modal('show');
      } else {
          let data = {
              filelogseverity: fileSeverity,
              filelogsenabled: filelogenabled,
              filelogssize: filesize,
              maxlogfiles: maxfiles
          }
            $('#overlay').show();
             view.apiService.appLogsSettingsService(adminDetails, data).subscribe(function(val) {
              if (val.success == true) {
                  view.modelTitle = 'Success';
                  view.apiResponseMessage = val.message;
                  $('#modelDialog').modal('show');
              } else {
                  view.modelTitle = 'Error';
                  view.apiResponseMessage = val.message;
                  $('#modelDialog').modal('show');
              }
                $('#overlay').hide();
          }, function(err) {
              view.errorResponse = err;
              if (view.errorResponse.message.includes('Session')) {
                  view.sharedService.logout(true);
              } else {
                  view.modelTitle = view.errorResponse.title;
                  view.apiResponseMessage = view.errorResponse.message;
                  $('#modelDialog').modal('show');
              }
              $('#overlay').hide();
          });
      }
      }
      else{
        let data = {
              filelogseverity: fileSeverity,
              filelogsenabled: filelogenabled,
              filelogssize: filesize,
              maxlogfiles: maxfiles
          }
             view.apiService.appLogsSettingsService(adminDetails, data).subscribe(function(val) {
              if (val.success == true) {
                  view.modelTitle = 'Success';
                  view.apiResponseMessage = val.message;
                  $('#modelDialog').modal('show');
              } else {
                  view.modelTitle = 'Error';
                  view.apiResponseMessage = val.message;
                  $('#modelDialog').modal('show');
              }
                $('#overlay').hide();
          }, function(err) {
              view.errorResponse = err;
              if (view.errorResponse.message.includes('Session')) {
                  view.sharedService.logout(true);
              } else {
                  view.modelTitle = view.errorResponse.title;
                  view.apiResponseMessage = view.errorResponse.message;
                  $('#modelDialog').modal('show');
              }
                $('#overlay').hide();
          });
      }
  }
refreshLogTableList(){
  this.getLogsList();
}
showHideLogsFile(type){
  if($("#filelist_"+type).hasClass('hide')){
    $("#filelist_"+type).removeClass('hide');
    $("#filelist_"+type).addClass('show');
  }else{
    $("#filelist_"+type).removeClass('show');
    $("#filelist_"+type).addClass('hide');
  }
}
selectLog(data, isSelected: boolean) {
    let view = this;
    view.logType = data.type;
    console.log("logtypes", view.logType);
    if (isSelected) {
        view.selectedFiles.push(data);
        if (view.selectedFiles.length >= 1)
            view.isDisabled = false;
        else
            view.isDisabled = true;
        console.log("selectedFiles", view.selectedFiles);
    } else {
        let index = view.selectedFiles.indexOf(
            view.selectedFiles.find(function(obj): boolean {
                return obj == data;
            })
        );
        view.selectedFiles.splice(index, 1);
        if (view.selectedFiles.length >= 1)
            view.isDisabled = false;
        else
            view.isDisabled = true;
        console.log("after splice", view.selectedFiles);
    }
      // if(($('#logTable tr').length-1) == this.selectedLogs.length) {
      //       this.selectedAll=true;
      //   } else {
      //       this.selectedAll=false;
      //   } 

      //   if (this.selectedLogs.length == this.logsList.length) {
      //       console.log(this.logsList.every(function(item:any) {return item.select == true}));
      //       this.selectedAll = this.logsList.every(function(item:any) {
      //           return item.select == true;
      //       });
      //   }
}
base64ToArrayBuffer(base64) {
  var binaryString = window.atob(base64);
  var binaryLen = binaryString.length;
  var bytes = new Uint8Array(binaryLen);
  for (var i = 0; i < binaryLen; i++) {
    var ascii = binaryString.charCodeAt(i);
    bytes[i] = ascii;
  }
  return bytes;
}
downloadLogFile(filename) {
    let view = this;
    $('#overlay').show();
    view.apiService.appLogsDownloadFileService(filename).subscribe(res => {
        if (!res.success) {
            view.modelTitle = 'Error';
            view.apiResponseMessage = res.message;
            $('#modelDialog').modal('show');
        }
        let response = res.data;
        $('#overlay').hide();
        const filename = response.filename;
        const data = response.data;
        var fileData = view.base64ToArrayBuffer(data);
        var a = document.createElement("a");
        document.body.appendChild(a);
        var blob = new Blob([fileData], {
            type: "octet/stream"
        });
        if (window.navigator.msSaveBlob) { // IE
            window.navigator.msSaveOrOpenBlob(blob, filename)
        } else {
            var url = window.URL.createObjectURL(blob);
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
        }
    }, function(err) {
        view.errorResponse = err;
        if (view.errorResponse.message.includes('Session')) {
            view.sharedService.logout(true);
        } else {
            view.modelTitle = view.errorResponse.title;
            view.apiResponseMessage = view.errorResponse.message;
            $('#modelDialog').modal('show');
        }
          $('#overlay').hide();
    });
}

downloadAllLogFiles(filename){
  let view = this;
  let type :string; 
  if(view.selectedFiles.length == 1){
    if(view.selectedFiles[0].type == "webui")
      type = "webui";
    else if(view.selectedFiles[0].type == "backprocess")
      type = "backprocess";
    $('#overlay').show();
    view.apiService.appLogsDownloadAllFileService(type).subscribe(res => {
        if (!res.success) {
            view.modelTitle = 'Error';
            view.apiResponseMessage = res.message;
            $('#modelDialog').modal('show');
        }
        let response = res.data;
        $('#overlay').hide();
        const filename = response.filename;
        const data = response.data;
        var fileData = view.base64ToArrayBuffer(data);
        var a = document.createElement("a");
        document.body.appendChild(a);
        var blob = new Blob([fileData], {
            type: "octet/stream"
        });
        if (window.navigator.msSaveBlob) {
            window.navigator.msSaveOrOpenBlob(blob, filename)
        } else {
            var url = window.URL.createObjectURL(blob);
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
        }
    }, function(err) {
        view.errorResponse = err;
        if (view.errorResponse.message.includes('Session')) {
            view.sharedService.logout(true);
        } else {
            view.modelTitle = view.errorResponse.title;
            view.apiResponseMessage = view.errorResponse.message;
            $('#modelDialog').modal('show');
        }
          $('#overlay').hide();
    });
  }
  else {
    type = "";
    $('#overlay').show();
    view.apiService.appLogsDownloadAllFileService(type).subscribe(res => {
        if (!res.success) {
            view.modelTitle = 'Error';
            view.apiResponseMessage = res.message;
            $('#modelDialog').modal('show');
        }
        let response = res.data;
        $('#overlay').hide();
        const filename = response.filename;
        const data = response.data;
        var fileData = view.base64ToArrayBuffer(data);
        var a = document.createElement("a");
        document.body.appendChild(a);
        var blob = new Blob([fileData], {
            type: "octet/stream"
        });
        if (window.navigator.msSaveBlob) {
            window.navigator.msSaveOrOpenBlob(blob, filename)
        } else {
            var url = window.URL.createObjectURL(blob);
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
        }
    }, function(err) {
        view.errorResponse = err;
        if (view.errorResponse.message.includes('Session')) {
            view.sharedService.logout(true);
        } else {
            view.modelTitle = view.errorResponse.title;
            view.apiResponseMessage = view.errorResponse.message;
            $('#modelDialog').modal('show');
        }
          $('#overlay').hide();
    });
  }
}
checkCheckbox(type){
  let view = this;
    var isChecked = $('#check_data'+type).prop("checked");
    var isHeaderChecked = $("#selectAllCheck").prop("checked");
    if (isChecked == false && isHeaderChecked)
      $("#selectAllCheck").prop('checked', isChecked);
    else {
      $('#logTable tr:has(td)').find('input[type="checkbox"]').each(function() {
        if ($(this).prop("checked") == false)
          isChecked = false;
      });
      $("#selectAllCheck").prop('checked', isChecked);
    }
}
onOk() {
    this.modelTitle = '';
    this.apiResponseMessage = '';
    $('#modelDialog .close').click();
}
}
