import { Component, OnInit, EventEmitter, Input, Output, OnChanges, SimpleChanges, Inject, ViewChild } from '@angular/core';
import { DataTableDirective } from 'angular-datatables';
import { Subject } from 'rxjs/Subject';
import { CDSService } from '../../services/httpAPI.service';
import { ResponseData, ErrorResponse } from '../../models/response';
import { DataTablesResponse } from '../../models/datatable';
import { ApDataArray, ApListResponse } from '../../models/ap';
import {HttpClient, HttpHeaders, HttpResponse, HttpParams} from '@angular/common/http';
import {CookieService} from 'angular2-cookie/core';
import { SharedService } from '../../services/shared.service';
import {LOCAL_STORAGE, WebStorageService} from 'angular-webstorage-service';

const baseURL = '/api';

class Person {
	id: number;
	firstName: string;
	lastName: string;
}


@Component({
	selector: 'app-accesspoint',
	templateUrl: './accesspoint.component.html',
	styleUrls: ['./accesspoint.component.css'],
	providers:[CDSService]
})

export class AccesspointComponent implements OnInit {
	@ViewChild(DataTableDirective)
	dtElement: DataTableDirective;
	multipleAPsSelected : any;
	moveAP : ApDataArray[]=[];

	dtOptions: any = {};
	dtTrigger: Subject<any> = new Subject();
	response : ApListResponse;
	responseDeleteAP : ResponseData;
	errorResponse:ErrorResponse;
	apsList : ApDataArray[] = [];
	moveSelectedAP : ApDataArray[] = [];
	apsCount : number = 0;
	apFound : boolean = false
	displayAddAp : string = 'none';
	displayMoveAp : string = 'none';
	displaydeleteAp : string = 'none';
	selectedApRows: any;
	selectedApCount : number = 0;
	isCheckedVsz : boolean = false;
	change :boolean = false;
	loaderDisplay : string = 'none';
	listLoaderDisplay : string = 'none';
	persons: Person[];
	timezone : string="";
	selectedAll: any;
	apTitle:string="";
	apMessage:string="";
	selectedAPs = [];
	isEnabled : boolean = true;
	constructor(private apiData: CDSService, private http:HttpClient, private _cookieService:CookieService, private sharedService:SharedService, @Inject(LOCAL_STORAGE) private storage: WebStorageService) {

	}
	
	//initialization
	ngOnInit(): void {
		$('body').css('background-color', '#D9E0E7');
		this.timezone = this.storage.get('TimeZone');
		this.getApsData();
		// $("#apTable .sorting_disabled").css('background-image', 'none'); 
		this.sharedService.doRefreshAPList.subscribe(dorefresh=>{
			if(dorefresh) {
				this.refreshApList();
			}
		});

	}
	
	//call get AP list API
	getApsData() {
		$('#overlay').show();

		let view = this;

		view.dtOptions = {
			pagingType: 'full_numbers',
			pageLength: 25,
			serverSide: true,
			processing: true,
			dom: "Z<'row'<'col-6'i><'col-6'f>>" +
			"<'row'<'col-12'tr>>" +
			"<'row'<'col-8'l><'col-4'p>>",
			ajax: (dataTablesParameters: any, callback) => {
				view.http
				.post<DataTablesResponse>(
					'/api/apList?token='+view._cookieService.get('TOKEN'),
					dataTablesParameters, {}
					).subscribe(resp => {
						console.log(resp);
						view.apFound = true;
						view.apsCount = resp.recordsTotal;
						view.apsList = resp.data;
						view.selectedAll=false;
						$('table.dataTable thead tr.cancel_sorting th:first-child').removeClass('sorting_asc');
						$('table.dataTable thead tr.cancel_sorting th:first-child').addClass('sorting_disabled');
						$('#overlay').hide();
						callback({
							recordsTotal: resp.recordsTotal,
							recordsFiltered: resp.recordsFiltered,
							data: []
						});
					},function(err){
						err=view.apiData.handleLoginError(err);
						view.errorResponse = err.error;
						view.isCheckedVsz = false;

						if (view.errorResponse.message.includes('Session')) {
							view.sharedService.logout(true);
						} else {
							view.showAPAlert(view.errorResponse.title, view.errorResponse.message);
						}
					});
				},
				columns: [{ "orderable": false },{ data: 'apserial' }, { data: 'apname' }, { data: 'mac' }, { data: 'ip' }, { data: 'configmethod' }, { data: 'last_contacted' }, { data: 'clustername' }, { data: 'zonename' }, { data: 'cds_cluster_state' }],
				columnDefs: [{ targets:0, width:'11%' },{ targets:1, width:'11%' },{ targets:2, width:'11%' },{ targets:3, width:'11%' },{ targets:4, width:'11%' },{ targets:5, width:'11%' }],
				language: {
					emptyTable : "No data available in table",
					info: "_START_ - _END_ of _TOTAL_",
					infoEmpty: "0 - 0 of 0",
					lengthMenu:     "Show _MENU_",
					zeroRecords:"",
					searchPlaceholder: "Search AP"
				}
			};

		}

	//refresh AP list page
	refreshApList(){
		let view = this;
		view.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
			// Destroy the table first
			console.log(dtInstance);
			dtInstance.search('');
			dtInstance.ajax.reload();
			view.selectedAPs=[];
			if ($('input#selectAllCheck').is(':checked')) {
				view.selectedAll=false;
				$('#selectAllCheck').prop('checked', false); 
			}
		});
		view.isEnabled =true;
	}

	refreshEventAfterAdd(event: any){
		console.log("receiveRefresh event : "+event);
		this.selectedAll=false;
		$('#selectAllCheck').prop('checked', false); 
		if(event){
			this.refreshApList();
		}
	}


	//check all AP listing rows
	checkAllRows(e: any){
		console.log('event : ' + e);
		let view = this;
		let selectedRows = [];
		for (var i = 0; i < view.apsList.length; ++i) {
			view.apsList[i].selectcheckbox = e.target.checked;
			console.log(view.apsList[i].selectcheckbox);
			selectedRows[i] = view.apsList[i];
			if(e.target.checked){
				view.checkSelectedRows(selectedRows[i], true);
			}
			else{
				view.checkSelectedRows(selectedRows[i], false);
				view.selectedAPs = [];
			}
		}	
	}
	checkSelectedRows(data: String, isSelected: boolean){
		//console.log(event);
		let view = this;
		if (isSelected) {
			view.selectedAPs.push(data);
			if(view.selectedAPs.length >= 1)
				view.isEnabled = false;
			else
				view.isEnabled = true;
			console.log("selected aps", view.selectedAPs);
		} else {
			let index = view.selectedAPs.indexOf(
				view.selectedAPs.find(function(obj): boolean {
					return obj == data;
				})
				);
			view.selectedAPs.splice(index, 1);
			if(view.selectedAPs.length >= 1)
				view.isEnabled = false;
			else
				view.isEnabled = true;
			console.log("after splice", view.selectedAPs);
		}
		view.selectedAll = view.apsList.every(function(item:any) {
			return item.selectcheckbox == true;
		});
		
	}
	
	//delete from smartzone is checked or not
	deleteFromSZ(event: any){
		if(event == true){
			this.isCheckedVsz = true;
		}else{
			this.isCheckedVsz = false;
		}
	}
	
	//display add AP dialog
	addApBtn(){
		console.log("First reset existing form then Open add AP dialog form");
		$('#addApModal').on('hidden.bs.modal', function () {
			$(this).find('form').trigger('reset');
		});
		this.displayAddAp = 'block';
	}

	moveApBtn(){
		let view = this;
		view.moveAP = null;
		view.moveSelectedAP = [];
		view.multipleAPsSelected = null;
		view.displayMoveAp = 'block';
		view.selectedApCount = 0;
		for (var i = 0; i < view.apsList.length; ++i) {
			if(view.apsList[i].selectcheckbox){
				view.selectedApCount++;
				view.moveSelectedAP.push(view.apsList[i]);
			}
		}

		if (view.selectedApCount > 0) {
			view.moveAP = view.moveSelectedAP;
		} 
		view.multipleAPsSelected = view.selectedApCount;
		console.log(view.moveAP);
		// $("#moveApModal .close").click();
		
	}
	
	// display delete AP dialog
	deleteApBtn(){
		let view = this;
		view.selectedApRows = "";
		view.selectedApCount = 0;
		$('#deleteFromSZ').prop('checked', false); 
		for (var i = 0; i < view.apsList.length; ++i) {
			if(view.apsList[i].selectcheckbox){
				if(view.selectedApRows == ""){
					view.selectedApRows = view.apsList[i].apserial;
					view.selectedApCount++;
				}else{
					view.selectedApRows = view.selectedApRows +',' +view.apsList[i].apserial;
					view.selectedApCount++;
				}
			}
		}
	}
	
	//call delete AP API
	deleteApFunction(selectedApStr){
		console.log(" else this.responseDeleteAP deleteApFunction : "+this.responseDeleteAP);
		let view = this;
		let isAllChecked = false;
		if (view.selectedApCount == 1) {
			console.log(selectedApStr);
			console.log($('#apTable tr').length);
			if (($('#apTable tr').length-2) == view.selectedApCount) {
				isAllChecked = true;
			}
			view.apiData.cdsApdeleteService(selectedApStr, view.isCheckedVsz).subscribe(function(val){
				view.responseDeleteAP = val;
				console.log(view.responseDeleteAP);
				if (view.responseDeleteAP.success) {
					$("#deleteApModal .close").click();
					$('#deleteApModal').on('hidden.bs.modal', function () {
						$(view).find('form').trigger('reset');
					});
					if (isAllChecked) {
						$('#selectAllCheck').prop('checked', false); 
						view.selectedAll=false;
					}
					view.isEnabled = true;
					view.showAPAlert('Success', view.responseDeleteAP.message);
					view.isCheckedVsz = false;
					localStorage.setItem("checkunmanged", "true");
					view.sharedService.refresh(true);
					view.refreshApList();
				} else {
					view.isCheckedVsz = false;
					console.log(" else this.responseDeleteAP deleteApFunction : "+view.responseDeleteAP);
					view.showAPAlert('Error', view.responseDeleteAP.message);
				}
			},function(err){
				view.errorResponse = err;
				view.isCheckedVsz = false;
				$('.modal-backdrop').hide();

				if (view.errorResponse.message.includes('Session')) {
					view.sharedService.logout(true);
				} else {
					view.showAPAlert(view.errorResponse.title, view.errorResponse.message);
				}
			});
		} else{
			console.log(selectedApStr);
			let selectedAPArray = selectedApStr.split(',');
			
			console.log($('#apTable tr').length);
			if (($('#apTable tr').length-2) == selectedAPArray.length) {
				isAllChecked = true;
			}
			view.loaderDisplay = 'block';
			view.apiData.cdsBulkAPDelete(selectedApStr, view.isCheckedVsz).subscribe(function(val){
				view.responseDeleteAP = val;
				console.log(view.responseDeleteAP);
				if (view.responseDeleteAP.success) {
					view.isCheckedVsz = false;
					console.log(view.responseDeleteAP.message);
					view.loaderDisplay = 'none';
					if (isAllChecked) {
						$('#selectAllCheck').prop('checked', false); 
						view.selectedAll=false;
					}
					if (view.responseDeleteAP.message == undefined) {
						view.showAPAlert('Success', 'All APs Deleted Successfully');
					} else{
						view.showAPAlert('Success', view.responseDeleteAP.message);
					}
					localStorage.setItem("checkunmanged", "true");
					view.sharedService.refresh(true);
				} else{
					view.isCheckedVsz = false;
					view.loaderDisplay = 'none';
					view.showAPAlert('Error', view.responseDeleteAP.message);
				}
				view.refreshApList();
			},function(err){
				view.errorResponse = err;
				view.isCheckedVsz = false;
				$('.modal-backdrop').hide();

				if (view.errorResponse.message.includes('Session')) {
					view.sharedService.logout(true);
				} else {
					view.showAPAlert(view.errorResponse.title, view.errorResponse.message);
				}
			});
		}
		
	}

	//close & reset form data on
	canceldeleteAp(){
		$("#deleteApModal .close").click();
	}

	showAPAlert(title:string, msg:string){
		this.apTitle = title;
		this.apMessage = msg;

		$('#openpopup').click();
	}

	okAPBtnClicked(){
		$("#deleteApModal .close").click();
		$("#confirmAPModal close").click();
	}
	
}
