import { Component, OnInit, Inject, Input } from '@angular/core';
import {HttpClient, HttpHeaders, HttpResponse, HttpParams} from '@angular/common/http';
import { DataTablesResponse } from '../../../models/datatable';
import {LOCAL_STORAGE, WebStorageService} from 'angular-webstorage-service';
import {CookieService} from 'angular2-cookie/core';
import { ResponseData, ErrorResponse } from '../../../models/response';
import { SharedService } from '../../../services/shared.service';
import { CDSService } from '../../../services/httpAPI.service';

@Component({
	selector: 'app-activitiestable',
	templateUrl: './activitiestable.component.html',
	styleUrls: ['./activitiestable.component.css']
})
export class ActivitiestableComponent implements OnInit {

	@Input('queryString') queryString = "";
	dtOptions: any = {};
	selectedAll: any;
	activityList:any=[];
	timezone : string="";
	errorResponse:ErrorResponse;
	adminActivitesTitle:string='';
	adminActivitesMessage:string='';
	// activityItem:any={selectcheckbox:false,dateandtime:1523956035,administrator:'admin',managedby:'System',sourceip:'10.150.84.74',action:'Log on',resource:'Administrator',description:'test description'};

	constructor(private http:HttpClient, private _cookieService:CookieService, private apiData:CDSService, @Inject(LOCAL_STORAGE) private storage: WebStorageService, private sharedService:SharedService) { }

	ngOnInit() {
		console.log(this.queryString);
		this.timezone = this.storage.get('TimeZone');
		this.getActivityData();
	}


	getActivityData(){
		let view = this;
		// view.activityList.push(view.activityItem);
		view.dtOptions = {
			pagingType: 'full_numbers',
			pageLength: 10,
			serverSide: true,
			dom: "Z<'row'<'col-6'i><'col-6'f>>" +
			"<'row'<'col-12'tr>>" +
			"<'row'<'col-8'l><'col-4'p>>",
			ajax: (dataTablesParameters: any, callback) => {
				view.http
				.post<DataTablesResponse>(
					'/api/adminactivitieslistpost?token='+view._cookieService.get('TOKEN')+((view.queryString!='')?'&managedby='+view.queryString:''),
					dataTablesParameters, {}
					).subscribe(resp => {
						console.log(resp);
						view.activityList = resp.data;
						callback({
							recordsTotal: resp.recordsTotal,
							recordsFiltered: resp.recordsFiltered,
							data: []
						});
					},function(err){
						err=view.apiData.handleLoginError(err);
						view.errorResponse = err.error;

						if (view.errorResponse.message.includes('Session')) {
							view.sharedService.logout(true);
						} else {
							view.showAlert(view.errorResponse.title, view.errorResponse.message);
						}
					});
				},
				columns: [{ data: 'activitytime' }, { data: 'username' }, { data: 'sourceip' }, { data: 'action' }, { data: 'resource' }, { data: 'description' }],
				order:[[0, 'desc']],
				// columnDefs: [ { targets: [ 0 ], orderData: [ 0, 1 ] } ],
				language: {
					emptyTable : "No data available in table",
					info: "",
					infoEmpty: "0 - 0 of 0",
					lengthMenu:     "Show _MENU_",
					zeroRecords:"",
					searchPlaceholder: "Search Activity"
				}
			};	
		}

		showAlert(title:string,message:string){
			this.adminActivitesTitle=title;
			this.adminActivitesMessage=message;
			$('#openAdminActivitiesTablePopup').click();
		}

		okadminActivites(){
			if(this.adminActivitesMessage.includes('Session')) {
				this.sharedService.logout(true);
			}
			$('#adminActivitiesPopup .close').click();
			this.adminActivitesMessage='';
			this.adminActivitesTitle='';
		}

	}
