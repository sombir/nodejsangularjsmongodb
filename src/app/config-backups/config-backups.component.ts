import { Component, OnInit, ViewChild, Inject, ComponentFactoryResolver, ViewContainerRef } from '@angular/core';
import { SharedService } from '../../services/shared.service';
import { Observable } from "rxjs";
import { Router,NavigationEnd,ActivatedRoute,Params } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CookieService } from 'angular2-cookie/core';
import { DataTablesResponse } from '../../models/datatable';
import { ShowConfirmationAlertComponent } from '../show-confirmation-alert/show-confirmation-alert.component';
import { TreeComponent, ITreeOptions } from 'angular-tree-component';
import { CDSService } from '../../services/httpAPI.service';
import { ResponseData, ConfigBackupResponse, CheckbackupfilestatusResponse, ErrorResponse } from '../../models/response';
import { LOCAL_STORAGE, WebStorageService } from 'angular-webstorage-service';
import { BackupTableComponent } from '../config-backups/backup-table/backup-table.component';
import * as moment from 'moment';

@Component({
    selector: 'app-config-backups',
    templateUrl: './config-backups.component.html',
    styleUrls: ['./config-backups.component.css']
})
export class ConfigBackupsComponent implements OnInit {
    @ViewChild(TreeComponent)
    private tree: TreeComponent;
    @ViewChild('showAlert', { read: ViewContainerRef }) showAlert: ViewContainerRef;
    @ViewChild('backupTable', { read: ViewContainerRef }) backupTable: ViewContainerRef;
    files = [];
    clusterName: any;
    clusterVersion: any;
    clusterIP: any;
    clusterStatus: any;
    clusterid : any;
    fileId : any;
    ip: any;
    status: any;
    description: any;
    timestamp: any;
    size: any;
    version: any;
    name: any;
    backupData: any;
    downloadConfigResponse:ConfigBackupResponse;
    backupFileStatusResponse : CheckbackupfilestatusResponse;
    backupDeatils:{backupID, clusterIP}={backupID:'', clusterIP:''};
    sftpChecked: boolean;
    cdsChecked: boolean = true;
    scheduleChecked: boolean;
    serverHost: any;
    serverPassword: any;
    serverPort: any;
    serverRemotedir: any;
    serverUsername: any;
    backupFrequency: any;
    dayOfMonth: boolean;
    month: boolean;
    dayOfWeek: boolean;
    message: String = '';
    modelTitle: String = '';
    errorResponse: ErrorResponse;
    controllerid: String = '';
    backupKeyId: String = '';
    fileCreatedTime: String = '';
    clusterList = [];
    nodes: any[] = [];
    filterClusterName: string = "";
    filterFileName: string = "";
    showText: boolean;
    timezone: string = "";
    apiResponseMessage: String = '';
    loaderDisplay: string = 'none';
    loaderDisplayRestore: string = 'none';
    queryString: any = '';
    configNodeData: any = {};
    selectedFile: File = null;

    constructor(private router: Router, private apiData: CDSService, private http:HttpClient, private _cookieService:CookieService, @Inject(LOCAL_STORAGE) private storage: WebStorageService, private componentFactoryResolver: ComponentFactoryResolver, private sharedService:SharedService) {
    }

    ngOnInit() {
        let view = this;
        $('body').css('background-color', '#D9E0E7');
        view.timezone = view.storage.get('TimeZone');
        (<any>$('#startdatetimepicker')).datetimepicker();
        (<any>$('#enddatetimepicker')).datetimepicker(); 
        view.apiData.getUserAdminDetail().subscribe(function(val) {
            view.backupData = val.data.backupsettings;
            console.log(view.backupData);
            if(view.backupData.backuptype.cds && view.backupData.backuptype.tftp) {
                view.sftpChecked = true;
                view.cdsChecked = true;
            }else if (view.backupData.backuptype.cds) {
                view.cdsChecked = true;
            } else if(view.backupData.backuptype.tftp) {
                view.sftpChecked = true;
            }
            if (view.backupData.enabled == true) {
                view.scheduleChecked = true;
            } else {
                view.scheduleChecked = false;
            }
            view.serverHost = view.backupData.tftpserver.host;
            view.serverPassword = view.backupData.tftpserver.password;
            view.serverPort = view.backupData.tftpserver.port;
            view.serverRemotedir = view.backupData.tftpserver.remotedir;
            view.serverUsername = view.backupData.tftpserver.username;
            view.backupFrequency = view.backupData.frequency;

            var arrFreq = (view.backupFrequency).split(" ");
            if (arrFreq[2] != "*") {
                view.dayOfMonth = true;
            } else if (arrFreq[3] != "*") {
                view.month = true;
            } else if (arrFreq[4] != "*") {
                view.dayOfWeek = true;
            }
        },function(err){
            view.errorResponse = err;
            if (view.errorResponse.message.includes('Session')) {
                view.loaderDisplay = 'none';
                view.sharedService.logout(true);
            } else {
                view.loaderDisplay = 'none';
                view.modelTitle= view.errorResponse.title;
                view.message= view.errorResponse.message;
                $('#modelDialogRestoreBckup').modal('show');
            }
        });
    }

    // loadBackupTree(){
    //     let view = this;
    //     view.apiData.getbackupHistory().subscribe(function(val) {
    //         console.log("BAckUP HISTory", val.data);

    //         view.clusterList = val.data;
    //         for (let i = 0; i < view.clusterList.length; ++i) {
    //             let obj = {
    //                 name: "",
    //                 ip: "",
    //                 status: "",
    //                 children: [],
    //                 id: "",
    //                 version:"",
    //                 isCluster: false
    //             };
    //             obj.name = view.clusterList[i].name;
    //             obj.ip = view.clusterList[i].ip;
    //             obj.status = view.clusterList[i].status;
    //             obj.id = view.clusterList[i].id;
    //             obj.version = view.clusterList[i].version;
    //             obj.isCluster = true;
    //             if (view.clusterList[i].backuphistory != null || view.clusterList[i].backuphistory != undefined) {
    //                 console.log('has backuphistory');
    //                 for (let j = 0; j < view.clusterList[i].backuphistory.length; ++j) {
    //                     let childObj = {
    //                         name: "",
    //                         version: "",
    //                         status: "",
    //                         description: "",
    //                         timestamp: "",
    //                         size: "",
    //                         id: "",
    //                         isCluster: false
    //                     };
    //                     childObj.name = view.clusterList[i].backuphistory[j].filename ? view.clusterList[i].backuphistory[j].filename : 'N/A';
    //                     childObj.version = view.clusterList[i].backuphistory[j].version ? view.clusterList[i].backuphistory[j].version : 'N/A';
    //                     childObj.status = view.clusterList[i].backuphistory[j].backupStatus;
    //                     childObj.description = view.clusterList[i].backuphistory[j].description;
    //                     childObj.timestamp = view.clusterList[i].backuphistory[j].backupTimestamp;
    //                     childObj.size = view.clusterList[i].backuphistory[j].filesize ? view.clusterList[i].backuphistory[j].filesize : 'N/A';
    //                     childObj.id = view.clusterList[i].backuphistory[j]._id;
    //                     obj.children.push(childObj);
    //                 }
    //                 console.log(obj);
    //             }
    //             view.nodes.push(obj);
    //         }
    //         console.log(view.nodes);
    //         // view.tree.treeModel.update();
    //     },function(err){
    //         view.errorResponse = err;
    //         if (view.errorResponse.message.includes('Session')) {
    //             view.loaderDisplay = 'none';
    //             view.sharedService.logout(true);
    //         } else {
    //             view.loaderDisplay = 'none';
    //             view.modelTitle= view.errorResponse.title;
    //             view.message= view.errorResponse.message;
    //             $('#modelDialogRestoreBckup').modal('show');
    //         }
    //     });
    // }

    // onEvent(e) {
    //     let view = this;
    //     let parentNode = ""
    //     console.log(e);

    //     if (e.eventName.includes("activate")) {
    //         //console.log(e.node.data.name);
    //         //if (!e.node.data.name.includes('All Clusters')) {
    //             if (e.node.data.isCluster) {
    //                 //view.filterClusterName = e.node.data.name;
    //                 view.showText = true;
    //                 view.clusterName = e.node.data.name;
    //                 view.clusterIP = e.node.data.ip;
    //                 view.clusterid = e.node.data.id;
    //                 view.clusterVersion = e.node.data.version;
    //                 switch (e.node.data.status) {
    //                     case 0:
    //                     {
    //                         view.clusterStatus = 'Down';
    //                         break;
    //                     }
    //                     case 1:
    //                     {
    //                         view.clusterStatus = 'Up';
    //                         break;
    //                     }
    //                     case 2:
    //                     {
    //                         view.clusterStatus = 'Flagged';
    //                         break;
    //                     }
    //                     default:
    //                     break;
    //                 }

    //             } else {
    //                 console.log('EEEEEEEEEEEEEEEEE');
    //                 console.log(e.node);
    //                 view.description = e.node.data.description;
    //                 view.status = e.node.data.status;
    //                 view.timestamp = e.node.data.timestamp;
    //                 view.size = e.node.data.size;
    //                 view.version = e.node.data.version;
    //                 view.name = e.node.data.name;
    //                 view.fileId = e.node.data.id;
    //                 view.showText = false;
    //                 view.configNodeData.timestamp = e.node.data.timestamp;
    //                 view.configNodeData.ip = e.node.parent.data.ip;
    //             }
    //         //}
    //     }
    // }

    showConfigBackup() {
        //this.modelTitle = 'Backup Setting';
        $('#modelDialogBackup').modal('show');
    }

    onOk() {
        $('#modelDialogBackup .close').click();
    }

    updateBackupSettings() {
        let view = this;
        $('#overlay').show();
        let scheduleback: any = ( < HTMLInputElement > document.getElementById("scheduleback")).checked;
        let cds: any = ( < HTMLInputElement > document.getElementById("cds")).checked;
        let sftp: any = ( < HTMLInputElement > document.getElementById("sftp")).checked;
        let dayOfMonth: any = true; // ( < HTMLInputElement > document.getElementById("daily")).checked;
        let dayOfWeek: any = ( < HTMLInputElement > document.getElementById("weekly")).checked;
        let month: any = ( < HTMLInputElement > document.getElementById("monthly")).checked;
        const paramObj = {
            enabled: false,
            backuptypecds: cds,
            backuptypesftp: sftp,
            daily: dayOfMonth,
            weekly: dayOfWeek,
            monthly: month,
            host: view.serverHost,
            port: view.serverPort,
            username: view.serverUsername,
            password: view.serverPassword,
            remotedir: view.serverRemotedir

        }
        console.log("paramObj", paramObj);
        view.apiData.updateBackupSettings(paramObj).subscribe(data => {
            $('#overlay').hide();
            if (data.success) {
                view.modelTitle = 'Update Settings';
                view.message = data.message;
                $('#modelDialogBckupSettings').modal('show');
                //console.log('UPDATE SUCCESS' + data.success);
            } else {
                view.modelTitle = 'Error';
                view.message = data.message;
                $('#modelDialogBckupSettings').modal('show');
            }
        },function(err){
            view.errorResponse = err;
            if (view.errorResponse.message.includes('Session')) {
                view.loaderDisplay = 'none';
                view.sharedService.logout(true);
            } else {
                view.loaderDisplay = 'none';
                view.modelTitle= view.errorResponse.title;
                view.message= view.errorResponse.message;
                $('#modelDialogRestoreBckup').modal('show');
            }
        });
    }

    // downloadFile(backupFileId) {
    //     let view = this;
    //     let fileId = backupFileId; //backupFileId
    //     view.loaderDisplay = 'block';
    //     view.apiData.getConfigBackupFileInfo(fileId).subscribe(res => {
    //         if(!res.success){
    //             view.modelTitle = 'Error';
    //             view.message = res.message;
    //             $('#modelDialogBckupSettings').modal('show');

    //         }
    //         let response = res.data;
    //         view.loaderDisplay = 'none';
    //         const filename = response.filename;
    //         const data = response.data;
    //         var fileData = view.base64ToArrayBuffer(data);
    //         var a = document.createElement("a");
    //         document.body.appendChild(a);
    //         var blob = new Blob([fileData], {
    //             type: "octet/stream"
    //         });
    //         if (window.navigator.msSaveBlob) { // IE
    //             window.navigator.msSaveOrOpenBlob(blob, filename)
    //         } else {
    //             var url = window.URL.createObjectURL(blob);
    //             a.style.display = 'none';
    //             a.href = url;
    //             a.download = filename;
    //             a.click();
    //             window.URL.revokeObjectURL(url);
    //         }
    //     },function(err){
    //         view.errorResponse = err;
    //         if (view.errorResponse.message.includes('Session')) {
    //             view.loaderDisplay = 'none';
    //             view.sharedService.logout(true);
    //         } else {
    //             view.loaderDisplay = 'none';
    //             view.modelTitle= view.errorResponse.title;
    //             view.message= view.errorResponse.message;
    //             $('#modelDialogRestoreBckup').modal('show');
    //         }
    //     });
    // }
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

    // downloadConfig(clusterip) {
    //     let view = this;
    //     let clusterIp = clusterip; //backupFileId
    //     view.loaderDisplay = 'block';
    //     view.apiData.manualConfigBackup(clusterIp).subscribe(res => {
    //         if(!res.success){
    //             view.modelTitle = 'Error';
    //         }
    //         else{
    //             view.modelTitle = 'Info';
    //         }
    //         view.message = res.message;
    //         $('#modelDialogBckupSettings').modal('show');
    //         let response = res.data;
    //         view.downloadConfigResponse = res;
    //         view.backupDeatils.backupID = view.downloadConfigResponse.backupId;
    //         view.backupDeatils.clusterIP = clusterip;
    //         view.loaderDisplay = 'none';
    //         console.log("downloadConfigResponse",view.downloadConfigResponse.message);
    //     },function(err){
    //         view.errorResponse = err;
    //         if (view.errorResponse.message.includes('Session')) {
    //             view.loaderDisplay = 'none';
    //             view.sharedService.logout(true);
    //         } else {
    //             view.loaderDisplay = 'none';
    //             view.modelTitle= view.errorResponse.title;
    //             view.message= view.errorResponse.message;
    //             $('#modelDialogRestoreBckup').modal('show');
    //         }
    //     });
    // }

    onOkBckupSettings() {
        let view = this;
        if (view.modelTitle.includes('Info') ) {
            view.modelTitle = '';
            view.message = '';
            $('#modelDialogBckupSettings .close').click();

            view.apiData.checkbackupfilestatus(view.backupDeatils.backupID, view.backupDeatils.clusterIP).subscribe(res => {
                console.log(res);
                view.backupFileStatusResponse=res;
                if (view.backupFileStatusResponse.download) {
                    // if (view.router.url.includes('configBackups')) {
                        view.modelTitle = 'Success';
                        view.message=view.backupFileStatusResponse.message;
                        setTimeout (() => {
                            console.log("modelDialogBckupSettings setTimeout");
                            $('#modelDialogBckupSettings').modal('show');
                        }, 2000)


                    /*} else {
                        
                        const componentFactory = this.componentFactoryResolver.resolveComponentFactory(ShowConfirmationAlertComponent);
                        this.showAlert.clear();
                        const dyynamicComponent = <ShowConfirmationAlertComponent>this.showAlert.createComponent(componentFactory).instance;
                        dyynamicComponent.title = 'Success';
                        dyynamicComponent.message = view.backupFileStatusResponse.message;
                    }*/
                } else{
                    view.modelTitle = 'Error';
                    view.message=view.backupFileStatusResponse.message;
                    $('#modelDialogBckupSettings').modal('show');
                }
            },function(err){
                view.errorResponse = err;
                $('.modal-backdrop').hide();
                if (view.errorResponse.message.includes('Session')) {
                    view.loaderDisplay = 'none';
                    view.sharedService.logout(true);
                } else {
                    view.loaderDisplay = 'none';
                    view.modelTitle= view.errorResponse.title;
                    view.message= view.errorResponse.message;
                    $('#modelDialogRestoreBckup').modal('show');
                }
            });
        } else if (view.modelTitle.includes('Error')) {
            view.modelTitle = '';
            view.message = '';
            $('#modelDialogBckupSettings .close').click();
        } else if (view.modelTitle.includes('Success')) {
            view.nodes=[];
            // view.loadBackupTree();
            view.modelTitle = '';
            view.message = '';
            $('#modelDialogBckupSettings .close').click();
        }else{
            view.modelTitle = '';
            view.message = '';
            $('#modelDialogBckupSettings .close').click();
        }
        
    }

    // showModalBackupLog(configNodeData, isSetStartDateTime){
    //     let view = this;
    //     let startDateTime: any = '';
    //     let endDateTime: any = '';
    //     let datetime: any = {};
    //     console.log('showModalBackupLog' , configNodeData);

    //     if (isSetStartDateTime){
    //         datetime = view.getCurrentDateTime();
    //         startDateTime = configNodeData.timestamp;
    //         endDateTime = datetime.datetimeSend;
    //         $("#startdatetime").val(view.getStartDateTime(configNodeData.timestamp));
    //         $("#enddatetime").val(datetime.datetimeSet);
    //     } else {
    //         startDateTime = $("#startdatetime").val();
    //         endDateTime = $("#enddatetime").val();
    //         startDateTime = view.calculateDateTime(startDateTime);
    //         endDateTime = view.calculateDateTime(endDateTime);
    //     }

    //     const queryObj = {
    //         ip: configNodeData.ip,
    //         startdatetime: startDateTime,
    //         enddatetime: endDateTime
    //     }; 
    //     const componentFactory = view.componentFactoryResolver.resolveComponentFactory(BackupTableComponent);
    //     view.backupTable.clear();
    //     const dyynamicComponent: any = <BackupTableComponent>view.backupTable.createComponent(componentFactory).instance;
    //     dyynamicComponent.queryString = queryObj;
        
    // }

    // calculateDateTime(datetime){
    //     let dt: any = '';
    //     let t: any = '';
    //     datetime = datetime.replace(/\//g,"-");
    //     console.log(datetime);
    //     dt = datetime.split(" ");
    //     t = dt[1].split(":");
    //     if(datetime.includes('AM') && t[0].length == 1 ){
    //         // if(t[0] < 10){
    //             t[0] = "0" + t[0];
    //         // }
    //     } else{
    //         t[0] = parseInt(t[0]) + 12;
    //     }
    //     let d = dt[0].split('-');
    //     datetime = d[2] + '-' +d[0] + '-' +d[1] + "T" + t[0] + ":" + t[1];
        
    //     return datetime.replace(/\s+(AM|PM)/,"");
    // }

    // getStartDateTime(startTime) {
    //     let dt = startTime.slice(0,16);
    //     console.log('dtdt');
    //     console.log(dt);
    //     let t = dt.split('T');
    //     console.log(t);
    //     let hour = t[1].split(':');
    //     let isAMorPM = 'AM';
    //     if (hour[0] > 12) {
    //         isAMorPM = 'PM';
    //         hour[0] -= 12;
    //     }
    //     console.log(hour);
    //     // 2018-04-26T06:50
    //     let date = t[0].split('-');
    //     dt = dt.replace(/T/," ");
    //     dt = dt.replace(/-/,"\/");
    //     const startDate = date[1] + '/' + date[2] + '/' + date[0]+ " " + hour[0] + ":" + hour[1] + " " + isAMorPM;

    //     return startDate;
    // }

    // getCurrentDateTime(){
    //     let currentdate = new Date();
    //     let month: any = currentdate.getMonth()+1;
    //     let day: any = currentdate.getDate();
    //     let hour: any = currentdate.getHours();
    //     let minutes: any = currentdate.getMinutes();
    //     let seconds: any = currentdate.getSeconds();
    //     let datetime: any = {};
    //     if (month < 10) 
    //         month = "0" + month;
    //     if (day < 10) 
    //         day = "0" + day;
    //     if (minutes < 10) 
    //         minutes = "0" + minutes;
    //     // if (seconds < 10) 
    //     //     seconds = "0" + seconds;
    //     let isAMorPM = 'AM';
    //     if (hour > 12) {
    //         isAMorPM = 'PM'
    //     }
    //     if (hour < 10) 
    //         hour = "0" + hour;
    //     const d1 = currentdate.getFullYear() + "-" + month  + "-" + day + "T" + hour + ":" + minutes;
    //     const d2 = month + "/" + day  + "/" + currentdate.getFullYear() + " " + ((hour > 12) ? (hour-12) : hour) + ":" + minutes + " " + isAMorPM;  
    //     datetime = {
    //         datetimeSend: d1,
    //         datetimeSet: d2
    //     }

    //     return datetime; 
    // }

    // restoreConfigBackup(backupFileId) {
    //     let view = this;
    //     let fileId = backupFileId; //backupFileId
    //     $('#modelDialogRestoreBckup').modal('hide');
    //     view.loaderDisplayRestore = 'block';
    //     view.apiData.uploadbackuptocontroller(fileId).subscribe(function(val) {
    //         view.loaderDisplayRestore = 'none';
    //         if (val.success == true) {
    //             view.controllerid = val.data.controllerId;
    //             view.backupKeyId = val.data.backupKeyOnController;
    //             view.fileCreatedTime = moment(val.data.backupCreateDate).format("YYYY/MM/DD H:mm:ss");
    //             $('#modelDialogRestoreBckupConfirm').modal('show');
    //         }else{
    //             view.modelTitle = 'Error';
    //             view.message = val.message;
    //             $('#modelDialogRestoreBckup').modal('show');
    //         }
    //     },function(err){
    //         view.errorResponse = err;
    //         if (view.errorResponse.message.includes('Session')) {
    //             view.loaderDisplay = 'none';
    //             view.sharedService.logout(true);
    //         } else {
    //             view.loaderDisplay = 'none';
    //             view.modelTitle= view.errorResponse.title;
    //             view.message= view.errorResponse.message;
    //             $('#modelDialogRestoreBckup').modal('show');
    //         }
    //     });
    // }

    // triggerRestoreConfigBackup(controllerid, backupkey) {
    //     let view = this;
    //     let controllerId = controllerid; 
    //     let backupkeyId = backupkey; 
    //     $('#modelDialogBckupSettings').modal('hide');
    //     view.loaderDisplayRestore = 'block';
    //     view.apiData.triggerrestoreoncontroller(controllerId, backupkeyId).subscribe(function(val) {
    //         view.loaderDisplayRestore = 'none';
    //         if (val.success == true) {
    //             view.modelTitle = 'Success';
    //             view.message = val.message;
    //             $('#modelDialogBckupSettings').modal('show');
    //         }else{
    //             view.modelTitle = 'Error';
    //             view.message = val.message;
    //             $('#modelDialogBckupSettings').modal('show');
    //         }
    //     },function(err){
    //         view.errorResponse = err;
    //         if (view.errorResponse.message.includes('Session')) {
    //             view.loaderDisplay = 'none';
    //             view.sharedService.logout(true);
    //         } else {
    //             view.loaderDisplay = 'none';
    //             view.modelTitle= view.errorResponse.title;
    //             view.message= view.errorResponse.message;
    //             $('#modelDialogRestoreBckup').modal('show');
    //         }
    //     });
    // }

    getExportDBConfig(){
        const view = this;
        $('#overlay').show();
        view.apiData.getExportDBConfig().subscribe(res => {
            console.log(res);
            $('#overlay').hide();
            if(res.success){
                view.modelTitle = 'Success';
                view.message = res.message;
                $('#modelDialogBckupSettings').modal('show'); 
                $('#downloadConfigBtn').removeAttr('disabled');
            }
        }, error => {
            $('#overlay').hide();
            view.modelTitle = 'Error';
            view.message = error;
            $('#modelDialogBckupSettings').modal('show');
            });
    }

    downloadExportDBConfig(){
        const view = this;
        $('#overlay').show();
        view.apiData.downloadExportDBConfig().subscribe(res => {
            if (res.success) {
                let response = res.data;
                $('#configDownloadOverlay').hide();
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
                $('#overlay').hide();
                this.modelTitle = 'Success';
                this.message = 'DB Config file downloaded successfully';
                $('#modelDialogBckupSettings').modal('show');
            } else{
                $('#overlay').hide();
                this.modelTitle = 'Error';
                this.message = res.message;
                $('#modelDialogBckupSettings').modal('show');
            }
        }, error => {
            $('#overlay').hide();
            this.message = error;
            console.log(error);
        });    
    }

    onChangeUploadDbConfig(e){
        const view = this;
        view.selectedFile = < File > e.target.files[0];
        console.log(view.selectedFile);
    }

    onConfirmDbConfigUpload(){
        const view = this;
        if (!view.selectedFile) {
            view.modelTitle = 'DB Config Import';
            view.message = 'Please select file';
            $('#modelDialogBckupSettings').modal('show');
            return;
        }
        if (!view.validateFile(view.selectedFile.name)) {
            view.modelTitle = 'DB Config Import';
            view.message = 'Please select gz compressed file only';
            $('#modelDialogBckupSettings').modal('show');
            return;
        }
        $('#modelDialogConfirmation').modal('show');
    }

    onDbConfigUploadCancel(){
       $('#modelDialogConfirmation .close').click();
    }

    onDbConfigUpload(){
        const view = this;
        $('#modelDialogConfirmation').modal('hide');
        $('#dBConfigUploadModal').modal('hide');
        $('#overlay').show();
        view.apiData.uploadDbConfig(view.selectedFile).subscribe(res => {
            $('#overlay').hide();
            console.log('responseresponse');
            console.log(res);
            view.modelTitle = 'DB Config Import';
            view.message = 'DB Config import was successfully uploaded.Please refresh the browser.';
            $('#modelDialogBckupSettings').modal('show');
        }, error => {
            $('#overlay').hide();
            view.modelTitle = 'Error';
            view.message = error;
            $('#modelDialogBckupSettings').modal('show');
        });
    }

    validateFile(name: String) {
        var ext = name.substring(name.lastIndexOf('.') + 1);
        if (ext.toLowerCase() == 'gz') {
            return true;
        } else {
            return false;
        }
    }

    cancelDbConfigUpload(){
		$('#inputFile')[0].dataset.title = "Drag and drop a file";
		// this.bulkAPUploadForm.reset();
		// this.dataToBeExtracted=null;
	}

    okBtnClicked(){
        $('#modelDialogRestoreBckup').modal('hide');
        $('#modelDialogRestoreBckupConfirm').modal('hide');
    }
}