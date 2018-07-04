import { Component, OnInit, Inject } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {LOCAL_STORAGE, WebStorageService} from 'angular-webstorage-service';
import { CDSService } from '../../services/httpAPI.service';
import { AdminResponse } from '../../models/admin';
import { ResponseData, ErrorResponse } from '../../models/response';
import { SharedService } from '../../services/shared.service';
import {CookieService} from 'angular2-cookie/core';
import {Router,NavigationEnd,ActivatedRoute,Params} from '@angular/router';

let adminDetails: AdminResponse;

@Component({
    selector: 'app-admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
    clusterList: any;
    selectedFile: File = null;
    imagePreview: File = null;
    apiResponseMessage: String = '';
    modelTitle: String = '';
    errorResponse: ErrorResponse;

    constructor(private router: Router, private _cookieService: CookieService, private http: HttpClient, private apiData: CDSService, @Inject(LOCAL_STORAGE) private storage: WebStorageService, private sharedService: SharedService) {}

    ngOnInit() {
        let view = this;
        $('body').css('background-color', '#D9E0E7');
        view.apiData.cdsCLusterListService().subscribe(function(val) {
            console.log('cdsCLusterListService admin');
            view.clusterList = val.list;
            const clusterListData = val.list;
            for (let i = 0; i < clusterListData.length; i++) {
                if (clusterListData[i].defaultcluster) {
                    setTimeout(function() {
                        $("#defaultCluster option:contains(" + clusterListData[i].name + ")").attr('selected', 'selected');
                    }, 20);
                }
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
        });

        view.apiData.getUserAdminDetail().subscribe(function(adminDtl) {
            adminDetails = adminDtl;
            let frequency:string = adminDtl.data.backprocesssettings.frequency;
            let schedulerValue:string=''
            if(frequency.includes('*/15 * * * *')){
                schedulerValue = '15min';
            }else if(frequency.includes('*/30 * * * *')){
                schedulerValue = '30min';
            }else if(frequency.includes('00 */1 * * *')){
                schedulerValue = '1hr';
            }else if(frequency.includes('00 */12 * * *')){
                schedulerValue = '12hr';
            }else if(frequency.includes('00 00 */1 * *')){
                schedulerValue = '24hr';
            }else if(frequency.includes('00 00 * * */1')){
                schedulerValue = '7days';
            }else{
                schedulerValue = '';
            }

            $('#timeZone').val(adminDtl.data.timezones);
            $('#frequency').val(schedulerValue);
            $('#allowUnregisteredAp').prop('checked', adminDtl.data.allowunregisteredap);
            $('#allowBackupScheduler').prop('checked', adminDtl.data.backprocesssettings.enabled);
            console.log("adminDetails", adminDetails.data.backprocesssettings);
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

    updateDiscovery() {
        let view=this;
        const allowUnregisteredAp = "" + $('#allowUnregisteredAp').is(":checked") + "";
        const selectedCluster = $('#defaultCluster :selected').text();

        const paramObj = {
            allowUnregisteredAp: allowUnregisteredAp,
            selectedAdminCluster: selectedCluster,
        }
        $('#overlay').show();

        view.apiData.updateAdminDiscovery(adminDetails, paramObj).subscribe(data => {
            view.modelTitle = 'Discovery';
            view.apiResponseMessage = 'Discovery was successfully updated.';
            $('#modelDialog').modal('show');
            $('#overlay').hide();
        }, function(err) {
            view.errorResponse = err;
            $('#overlay').hide();

            if (view.errorResponse.message.includes('Session')) {
                view.sharedService.logout(true);
            } else {
                view.modelTitle = view.errorResponse.title;
                view.apiResponseMessage = view.errorResponse.message;
                $('#modelDialog').modal('show');
            }
        });
    }
    updateTimeZone() {
        let view=this;
        const selectedTimeZone = $('#timeZone :selected').val();
        const paramObj = {
            timeZone: selectedTimeZone,
        }
        $('#overlay').show();
        view.apiData.updateAdminTimeZone(adminDetails, paramObj).subscribe(data => {
            view.storage.set('TimeZone', selectedTimeZone);
            $('#overlay').hide();
            view.modelTitle = 'Time Zone';
            view.apiResponseMessage = 'Timezone was successfully updated.';
            $('#modelDialog').modal('show');
            console.log('UPDATE SUCCESS' + data);
        }, function(err) {
            view.errorResponse = err;
            $('#overlay').hide();

            if (view.errorResponse.message.includes('Session')) {
                view.sharedService.logout(true);
            } else {
                view.modelTitle = view.errorResponse.title;
                view.apiResponseMessage = view.errorResponse.message;
                $('#modelDialog').modal('show');
            }
        });
    }

    updatePassword() {
        let view=this;
        let newPassword: string = ( < HTMLInputElement > document.getElementById("newpswd")).value;
        const paramObj = {
            password: newPassword,
        }
        //$('#overlay').show();
        if((( < HTMLInputElement > document.getElementById("curpswd")).value) == ""){
            view.modelTitle = 'Error';
            view.apiResponseMessage = 'Current Password Field is Required.';
            $('#modelDialog').modal('show');
        }else if((( < HTMLInputElement > document.getElementById("newpswd")).value) == ""){
            view.modelTitle = 'Error';
            view.apiResponseMessage = 'New Password Field is Required.';
            $('#modelDialog').modal('show');
        }else if ((( < HTMLInputElement > document.getElementById("curpswd")).value) == adminDetails.data.password) {
            view.apiData.updateAdminPassword(adminDetails, paramObj).subscribe(data => {
                console.log("adminDetails", adminDetails.data.password);
                //$('#overlay').hide();
                view.modelTitle = 'Update Password';
                view.apiResponseMessage = 'Password was successfully updated.\n\nPlease Login Again with New Password.';
                $('#modelDialog').modal('show');
                console.log('UPDATE SUCCESS' + data);
            }, function(err) {
                view.errorResponse = err;
                $('#overlay').hide();

                if (view.errorResponse.message.includes('Session')) {
                    view.sharedService.logout(true);
                } else {
                    view.modelTitle = view.errorResponse.title;
                    view.apiResponseMessage = view.errorResponse.message;
                    $('#modelDialog').modal('show');
                }
            });
            ( < HTMLInputElement > document.getElementById("newpswd")).value = "";
            ( < HTMLInputElement > document.getElementById("curpswd")).value = "";
        } else {
            view.modelTitle = 'Error';
            view.apiResponseMessage = 'Current Password is Invalid.';
            $('#modelDialog').modal('show');
            ( < HTMLInputElement > document.getElementById("newpswd")).value = "";
            ( < HTMLInputElement > document.getElementById("curpswd")).value = "";
        }
    }

    onFileInput(event: any) {
        this.selectedFile = < File > event.target.files[0];
        var reader = new FileReader();
        reader.onload = (event: any) => {
            this.imagePreview = event.target.result;
        }
        reader.readAsDataURL(event.target.files[0]);
    }

    onUpdateLogo() {
        let view=this;
        if (!view.selectedFile) {
            view.modelTitle = 'Custom Logo';
            view.apiResponseMessage = 'Please select logo';
            $('#modelDialog').modal('show');
            return;
        }
        if (!view.validateFile(view.selectedFile.name)) {
            view.modelTitle = 'Custom Logo';
            view.apiResponseMessage = 'Please select png file only';
            $('#modelDialog').modal('show');
            return;
        }
        if (view.checkFileSize(view.selectedFile.size)) {
            view.modelTitle = 'Custom Logo';
            view.apiResponseMessage = 'File size should be less than 1 MB';
            $('#modelDialog').modal('show');
            return;
        }
        $('#overlay').show();
        view.apiData.postFile(view.selectedFile).subscribe(data => {
            $('#overlay').hide();
            view.modelTitle = 'Custom Logo';
            view.apiResponseMessage = 'The logo was successfully uploaded.Please refresh the browser.';
            $('#modelDialog').modal('show');
        }, function(err) {
            view.errorResponse = err;
            $('#overlay').hide();

            if (view.errorResponse.message.includes('Session')) {
                view.sharedService.logout(true);
            } else {
                view.modelTitle = view.errorResponse.title;
                view.apiResponseMessage = view.errorResponse.message;
                $('#modelDialog').modal('show');
            }
        });
    }

    validateFile(name: String) {
        var ext = name.substring(name.lastIndexOf('.') + 1);
        if (ext.toLowerCase() == 'png') {
            return true;
        } else {
            return false;
        }
    }

    checkFileSize(fileSize: number) {
        if (fileSize > 1048576) {
            return true;
        }
    }

    onOk() {
        if (this.modelTitle == 'Update Password') {
            this._cookieService.remove('TOKEN');
            this.router.navigate(['login']);
        }
        this.modelTitle = '';
        this.apiResponseMessage = '';
        $('#modelDialog .close').click();
    }

    updateConfig() {
        let view = this;
        const allowBackupScheduler = $('#allowBackupScheduler').is(":checked");
        console.log('allowBackupScheduler : ' + allowBackupScheduler);

        const frequency:any = $('#frequency :selected').val();
        console.log('frequency : '+ frequency);


        if(allowBackupScheduler && frequency=='') {
            view.modelTitle = 'Error';
            view.apiResponseMessage = "Please select some frequency value.";
            $('#modelDialog').modal('show');
        } else {
            let data = {
                enabled: allowBackupScheduler,
                frequency: frequency
            }
            console.log("DATA --->", data);
            view.apiData.backProcessSchedulerService(adminDetails, data).subscribe(function(val) {
                console.log("Response-->", val);
                if (val.success == true) {
                    view.modelTitle = 'Success';
                    view.apiResponseMessage = val.message;
                    $('#modelDialog').modal('show');
                } else {
                    view.modelTitle = 'Error';
                    view.apiResponseMessage = val.message;
                    $('#modelDialog').modal('show');
                }
            }, function(err) {
                view.errorResponse = err;
                $('#overlay').hide();

                if (view.errorResponse.message.includes('Session')) {
                    view.sharedService.logout(true);
                } else {
                    view.modelTitle = view.errorResponse.title;
                    view.apiResponseMessage = view.errorResponse.message;
                    $('#modelDialog').modal('show');
                }
            });
        }
    }
}