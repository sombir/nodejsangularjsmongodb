import { Component, OnInit, Inject, ViewChild, ComponentFactoryResolver } from '@angular/core';
import { CDSService } from '../services/httpAPI.service';
import {CookieService} from 'angular2-cookie/core';
import {ResponseData, ErrorResponse} from '../models/response';
import { Router } from '@angular/router'; 
import {Observable} from "rxjs";
import { adminData, AdminResponse } from '../models/admin';
import {LOCAL_STORAGE, WebStorageService} from 'angular-webstorage-service';
import { ShowConfirmationAlertComponent } from './show-confirmation-alert/show-confirmation-alert.component';
import { SharedService } from '../services/shared.service';
import { BulkAPUploadData, BulkAPUploadResponse } from '../models/ap';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
	response: ResponseData;
	errorResponse: ErrorResponse;
	adminResponse:AdminResponse;
	adminData:adminData;
	modelTitle: String = '';
	modelMessage: String = '';
	bulkAPUploadData : BulkAPUploadData;
	bulkAPUploadResponse : BulkAPUploadResponse;
	resMessageArr: any = [];

	constructor(private router: Router, private apiData: CDSService, private _cookieService:CookieService, @Inject(LOCAL_STORAGE) private storage: WebStorageService, private componentFactoryResolver : ComponentFactoryResolver, private sharedService:SharedService){
	}

	ngOnInit(){
		let view = this;
		view.resMessageArr = []
		view.sharedService.isSessionExpired.subscribe(isSessionExpired => {
			if (isSessionExpired) {
				view.modelTitle = 'Session Expired';
				view.modelMessage = "Session Expired!!! Please Login Again.";
				$('#sessionExpireModelDialog').modal('show');
				// var r = confirm("Session Expired!!! Please Login Again.");
				// if (r) {
					// view._cookieService.remove('TOKEN');
					// view.router.navigate(['login']);
				// }
			}
		});
		if(view._cookieService.get('TOKEN') != undefined){
			view.apiData.getUserAdminDetail().subscribe(function(val){
				view.adminResponse = val;
				view.adminData = view.adminResponse.data;
				if (view.adminResponse.success) {
					view.storage.set('TimeZone', view.adminData.timezones);
				}
			}, function(err) {
				view.errorResponse = err;

				if (view.errorResponse.message.includes('Session')) {
					view.sharedService.logout(true);
				} else {
					view.modelTitle = view.errorResponse.title;
					view.modelMessage = view.errorResponse.message;
					$('#sessionExpireModelDialog').modal('show');
				}
			});
		}

		let t= Observable.interval(120000);
		t.subscribe(function(interval) {
			if(view._cookieService.get('TOKEN') != undefined){
				// console.log((interval*10) + " seconds have passed");
				view.apiData.cdsCheckSession().subscribe(function(val) {
					view.response = val;
					// console.log(val.status);
					if (!view.response.success) {
						view.modelTitle = 'Session Expired';
						view.modelMessage = "Session Expired!!! Please Login Again.";
						$('#sessionExpireModelDialog').modal('show');
						// view._cookieService.remove('TOKEN');
						// view.router.navigate(['login']);
					} 
				}, function(err) {
					view.errorResponse = err;
					$('.modal-backdrop').hide();
					if (view.errorResponse.message.includes('Session')) {
						view.sharedService.logout(true);
					} else {
						view.modelTitle = view.errorResponse.title;
						view.modelMessage = view.errorResponse.message;
						$('#sessionExpireModelDialog').modal('show');
					}
				});
			}
		});

		view.sharedService.startUpload.subscribe(val=>{
			if(val) {
				view.apiData.cdsCheckAPUploadStatus().subscribe(function (response) {
					view.bulkAPUploadResponse = response;
					view.resMessageArr = []
					view.bulkAPUploadData = view.bulkAPUploadResponse.data;
					if(view.bulkAPUploadResponse.success) {
						if(view.bulkAPUploadData.status.includes('Running')) {
							// console.log('Bulk AP upload : Running');
							setTimeout(()=> {
								view.sharedService.startBulkAPUpload(true);
							}, 30000);
						} else if(view.bulkAPUploadData.status.includes('Error')) {
							console.log('Bulk AP upload : Error');
							view.modelTitle = 'Bulk AP Upload Notification';
							view.modelMessage = view.bulkAPUploadResponse.message;
							$('#sessionExpireModelDialog').modal('show');
							view.sharedService.startBulkAPUpload(false);
						} else if(view.bulkAPUploadData.status.includes('Completed')) {
							console.log('Bulk AP upload : Completed');
							view.modelTitle = 'Bulk AP Upload Notification';
							view.resMessageArr = view.bulkAPUploadResponse.message.split(',');
							view.modelMessage = view.bulkAPUploadResponse.message;
							$('#sessionExpireModelDialog').modal('show');
							view.sharedService.startBulkAPUpload(false);
						}
					}
				}, function(err) {
					view.errorResponse = err;
					$('.modal-backdrop').hide();

					if (view.errorResponse.message.includes('Session')) {
						view.sharedService.logout(true);
					} else {
						view.modelTitle = view.errorResponse.title;
						view.modelMessage = view.errorResponse.message;
						$('#sessionExpireModelDialog').modal('show');
					}
				});
			} 
		});

	}

	onOk(){
		this.resMessageArr = []
		if(this.modelTitle.includes('Session')) {
			this.modelTitle = '';
			this.modelMessage = '';
			$('#sessionExpireModelDialog').modal('hide');
			this._cookieService.remove('TOKEN');
			this.router.navigate(['login']);
		} else {
			$('#sessionExpireModelDialog').modal('hide');
		}
	}
}
