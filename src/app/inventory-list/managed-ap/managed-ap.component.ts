import { Component, OnInit, Input, SimpleChanges, ComponentFactoryResolver, ViewContainerRef, ViewChild, Inject } from '@angular/core';
import {HttpClient, HttpHeaders, HttpResponse, HttpParams} from '@angular/common/http';
import {CookieService} from 'angular2-cookie/core';
import { DataTablesResponse } from '../../../models/datatable';
import { ApDataArray, ApListResponse } from '../../../models/ap';
import { CDSService } from '../../../services/httpAPI.service';
import { DataTableDirective } from 'angular-datatables';
import { Router, NavigationEnd, ActivatedRoute, Params } from '@angular/router'; 
import { ClusterData, ClusterListData } from '../../../models/cluster';
import { SharedService } from '../../../services/shared.service';
import {LOCAL_STORAGE, WebStorageService} from 'angular-webstorage-service';
import { ResponseData, ErrorResponse } from '../../../models/response';
import {Observable} from "rxjs";

@Component({
	selector: 'app-managed-ap',
	templateUrl: './managed-ap.component.html',
	styleUrls: ['./managed-ap.component.css']
})
export class ManagedApComponent implements OnInit{
	@Input('queryString') queryString = "";
	@Input('searchText')searchText='';
	@ViewChild('managedAP', { read: ViewContainerRef }) managedAP: ViewContainerRef;
	@ViewChild(DataTableDirective)
	dataTableElement: DataTableDirective;
	dtOptions: any = {};
	apsCount : number = 0;
	apFound : boolean = false;
	response : ResponseData;
	apsList : ApDataArray[] = [];
	filterText : string="";
	change : boolean = false;
	selectedAll: any;
	selectedClusterForAPImport:string="";
	clusterList : ClusterData[]=[];
	timezone : string="";
	errorResponse : ErrorResponse;
	modelTitle: String = '';
	modelMessage: String = '';
	showmanaged:boolean=true;
	doFilterTable:boolean=false;
	importConfirm:boolean=false;
	noClusterConfirm:boolean=false;
	multipleClusterConfirm:boolean=false;
	showName:string='';
	loaderDisplay : string = 'none';

	constructor(public router: Router, private apiData : CDSService, private http:HttpClient, private _cookieService:CookieService, private componentFactoryResolver: ComponentFactoryResolver, private sharedService:SharedService, @Inject(LOCAL_STORAGE) private storage: WebStorageService) {}


	ngOnInit() {
		let view=this;
		console.log(view.queryString);
		view.timezone = view.storage.get('TimeZone');
		$('#importAPs').hide();
		if (!view.queryString.includes('unmanaged')) {
			view.showmanaged=true;
			console.log('manged : ' + view.queryString.split(')')[1]);
			view.getApsData(view.queryString.split(')')[1]);
			if((view.searchText=='Online') || (view.searchText=='Flagged') || (view.searchText=='Offline')) {
				// $('overlay').show();
				view.filterTable(view.searchText);
			}	
			
		} else if (view.queryString.includes('unmanaged') || (view.searchText=='Unmanaged')) {
			view.showmanaged=false;
			console.log('unmanged : ' + view.queryString.split(')')[1]);
			view.showUnmanagedAP(view.queryString.split(')')[1])
		}

		/*view.sharedService.doRefreshAPTree.subscribe(val=>{
			if(val) {
				view.refreshTable();
			}
		});*/

	}

	filterTable(searchText:string){
		let view=this;
		console.log(searchText);
		let t= Observable.interval(100);
		let timeInterval=t.subscribe(function (interval) {
			if(view.dataTableElement.dtInstance!=undefined) {
				view.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
					console.log('dtinstance.search(val)');
					if(searchText != 'Unmanaged') {
						dtInstance.search(searchText).draw();
						// $('overlay').hide();
						timeInterval.unsubscribe();
					}
				});
			}
		});
		
	}

	getApsData(queryString:string){
		let view = this;
		let cluster :ClusterData;
		let clusterName = '';
		if (!queryString.includes('&zonename=')) {
			clusterName = view.queryString.split('=')[1];
			console.log(clusterName);
		} else {
			clusterName = view.queryString.split('=')[1].split('&')[0];
			console.log(clusterName);
		}
		view.apiData.cdsCLusterDetailsService(clusterName).subscribe(function(val){
			console.log(val);
			if (val.success) {
				if (val.data != null) {
					cluster = val.data;
					if (!cluster.apsimported) {
						$('#importAPs').show();
					} else {
						$('#importAPs').hide();
					}
				} else {
					$('#importAPs').hide();
				}			
			}
		},function(err){
			view.errorResponse = err;
			if (view.errorResponse.message.includes('Session')) {
				view.sharedService.logout(true);
			} else {
				view.modelTitle= view.errorResponse.title;
				view.modelMessage = view.errorResponse.message;
				jQuery('#manageApModelDialog').modal('show');
			}
		});
		console.log(cluster);
		view.dtOptions = {
			pagingType: 'full_numbers',
			pageLength: 10,
			serverSide: true,
			dom: "Z<'row'<'col-4'i><'col-8 alignRight'Bf>>" +
			"<'row'<'col-12'tr>>" +
			"<'row'<'col-8'l><'col-4'p>>",
			ajax: (dataTablesParameters: any, callback) => {
				view.http.post<DataTablesResponse>(
					'/api/managedapList?token='+view._cookieService.get('TOKEN')+queryString,
					dataTablesParameters, {}
					).subscribe(resp => {
						console.log(resp);
						view.apFound = true;
						view.apsCount = resp.recordsTotal;
						view.apsList = resp.data;
						
						let numberOfItemsInTable = (resp.recordsTotal-dataTablesParameters.start)>dataTablesParameters.length?dataTablesParameters.length:(resp.recordsTotal-dataTablesParameters.start);
						console.log(numberOfItemsInTable);

						if(numberOfItemsInTable > 10){
							let heightOfTreeView = (((numberOfItemsInTable)*45)+59)>185?(((numberOfItemsInTable)*45)+59):185;
							console.log(heightOfTreeView);
							$("#treeViewPanel").css("height", heightOfTreeView+'px' );
							// view.doFilterTable=true;
							$('.dt-buttons > button.btn').removeClass('btn-secondary');
							$('.dt-buttons > button.btn').removeClass('btn-default');
							// $('table.dataTable thead tr.cancel_sorting th:first-child').removeClass('sorting_asc');
							// $('table.dataTable thead tr.cancel_sorting th:first-child').addClass('sorting_disabled');
							callback({
								recordsTotal: resp.recordsTotal,
								recordsFiltered: resp.recordsFiltered,
								data: []
							});
						}
						else{
							let heightOfTreeView = (((10)*45)+59)>185?(((10)*45)+59):185;
							$("#treeViewPanel").css("height", heightOfTreeView+'px' );
							$('.dt-buttons > button.btn').removeClass('btn-secondary');
							$('.dt-buttons > button.btn').removeClass('btn-default');
							callback({
								recordsTotal: resp.recordsTotal,
								recordsFiltered: resp.recordsFiltered,
								data: []
							});
						}	
					},function(err){
						err=view.apiData.handleLoginError(err);
						view.errorResponse = err.error;
						if (view.errorResponse.message.includes('Session')) {
							$('#importAPModalFromTree .close').click();
							view.loaderDisplay = 'none';
							view.sharedService.logout(true);
						} else {
							view.modelTitle = view.errorResponse.title;
							view.modelMessage = view.errorResponse.message;
							$('#importAPModalFromTree .close').click();
							$('#manageApModelDialog').modal('show');
							view.loaderDisplay = 'none';
						}
					});
				},
				columns: [{ data: 'apserial'}, { data: 'apname' }, { data: 'mac' }, { data: 'ip' }, { data: 'clusterapstate' }, { data: 'clustername' }, { data: 'last_contacted' }],
				language: {
					emptyTable : "No data available in table",
					info: "Managed APs",
					infoEmpty: "0 - 0 of 0",
					lengthMenu:     "Show _MENU_",
					zeroRecords:"",
					searchPlaceholder: "Search AP"
				},
				buttons:[
				{	
					text:'',
					action:function(e,dt,node,config){
					// alert('refresh button clicked');
					view.refreshTable();
				}
			}]
		};			
		view.sharedService.refreshfilter(true);
	}

	showUnmanagedAP(queryString:string){
		console.log('unmanaged AP');

		let view = this;
		view.dtOptions = {
			pagingType: 'full_numbers',
			pageLength: 10,
			serverSide: true,
			processing: true,
			dom: "Z<'row'<'col-4'i><'col-8 alignRight'Bf>>" +
			"<'row'<'col-12'tr>>" +
			"<'row'<'col-8'l><'col-4'p>>",
			ajax: (dataTablesParameters: any, callback) => {
				view.http.post<DataTablesResponse>(
					'/api/unmanagedapList?token='+view._cookieService.get('TOKEN'),
					dataTablesParameters, {}
					).subscribe(resp => {
						console.log(resp);
						view.apFound = true;
						view.apsCount = resp.recordsTotal;
						view.apsList = resp.data;

						let numberOfItemsInTable = (resp.recordsTotal-dataTablesParameters.start)>dataTablesParameters.length?dataTablesParameters.length:(resp.recordsTotal-dataTablesParameters.start);
						console.log(numberOfItemsInTable);
						if(numberOfItemsInTable > 10){
							let heightOfTreeView = (((numberOfItemsInTable)*45)+59)>185?(((numberOfItemsInTable)*45)+59):185;
							console.log(heightOfTreeView);
							$("#treeViewPanel").css("height", heightOfTreeView+'px' );
							$('.dt-buttons > button.btn').removeClass('btn-secondary');
							$('.dt-buttons > button.btn').removeClass('btn-default');
					// $('table.dataTable thead tr.cancel_sorting th:first-child').removeClass('sorting_asc');
					// $('table.dataTable thead tr.cancel_sorting th:first-child').addClass('sorting_disabled');
					callback({
						recordsTotal: resp.recordsTotal,
						recordsFiltered: resp.recordsFiltered,
						data: []
					});
				}
				else{
					let heightOfTreeView = (((10)*45)+59)>185?(((10)*45)+59):185;
					console.log(heightOfTreeView);
					$("#treeViewPanel").css("height", heightOfTreeView+'px' );
					$('.dt-buttons > button.btn').removeClass('btn-secondary');
					$('.dt-buttons > button.btn').removeClass('btn-default');
					callback({
						recordsTotal: resp.recordsTotal,
						recordsFiltered: resp.recordsFiltered,
						data: []
					});
				}

			},function(err){
				err=view.apiData.handleLoginError(err);
				view.errorResponse = err.error;
				if (view.errorResponse.message.includes('Session')) {
					$('#importAPModalFromTree .close').click();
					view.loaderDisplay = 'none';
					view.sharedService.logout(true);
				} else {
					view.modelTitle = view.errorResponse.title;
					view.modelMessage = view.errorResponse.message;
					$('#importAPModalFromTree .close').click();
					$('#manageApModelDialog').modal('show');
					view.loaderDisplay = 'none';
				}
			});
				},
				columns: [{ data: 'apserial' }, { data: 'apname' }, { data: 'mac' }, { data: 'ip' }, { data: 'cds_cluster_state' }, { data: 'clustername' }, { data: 'last_contacted' }],
				language: {
					emptyTable : "No data available in table",
					info: "Unmanaged APs",
					infoEmpty: "0 - 0 of 0",
					lengthMenu:     "Show _MENU_",
					zeroRecords:"",
					searchPlaceholder: "Search AP"
				},
				buttons:[
				{	
					text:'',
					action:function(e,dt,node,config){
						// alert('refresh button clicked');
						view.refreshTable();
					}
				}
				]
			};
		}

		refreshTable(){
			let view=this;
			view.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
			// Destroy the table first
			console.log(dtInstance);
			dtInstance.search('');
			dtInstance.ajax.reload();
		});
		}

		getClusterList():any{
			let view = this;
			let cluster : ClusterData;
		}

		checkAllRows(e: any){
			console.log('event checkAllRows MANAGE APP Component CODE: ' + e);
			let view = this;
			console.log(view);
		// console.log(clusterList)
		for (var i = 0; i < view.apsList.length; ++i) {
			view.apsList[i].selectcheckbox = e.target.checked;
		}	
	}

	checkIfAllSelected() {
		this.selectedAll = this.apsList.every(function(item:any) {
			return item.selectcheckbox == true;
		});
	}

	importAP(){
		let view=this;
		console.log(view.queryString);
		let clusterName='';
		if (!view.queryString.includes('&zonename=')) {
			clusterName = view.queryString.split('=')[1];
			console.log(clusterName);
		} else {
			clusterName = view.queryString.split('=')[1].split('&')[0];
			console.log(clusterName);
		}
		
		if(clusterName!=null) {
			view.showName=clusterName;
			view.importConfirm=true;
			view.multipleClusterConfirm=false;
			view.noClusterConfirm=false;
		} else {
			view.multipleClusterConfirm=true;
			view.noClusterConfirm=true;
			view.importConfirm=false;
		}
	}

	importAPs(){
		let view=this;
		view.loaderDisplay = 'block';
		console.log(view.showName);
		view.apiData.cdsImportAPsInCluster(view.showName).subscribe(function(val) {
			console.log(val);
			view.response = val;
			if (view.response.success) {
				$('#importAPModalFromTree .close').click();

				view.modelTitle = 'Success';
				view.modelMessage = view.response.message;
				$('#manageApModelDialog').modal('show');
				view.refreshTable();
				view.loaderDisplay = 'none';
			} else {
				view.modelTitle = 'Error';
				view.modelMessage = view.response.message;
				$('#importAPModalFromTree .close').click();
				$('#manageApModelDialog').modal('show');
				view.loaderDisplay = 'none';
			}
		},function(err){
			view.errorResponse = err;
			if (view.errorResponse.message.includes('Session')) {
				$('#importAPModalFromTree .close').click();
				view.loaderDisplay = 'none';
				view.sharedService.logout(true);
			} else {
				view.modelTitle = view.errorResponse.title;
				view.modelMessage = view.errorResponse.message;
				$('#importAPModalFromTree .close').click();
				$('#manageApModelDialog').modal('show');
				view.loaderDisplay = 'none';
			}
		});
	}

	recieveRefresh(event){
		if(event){
			console.log(event);
			console.log('unmanaged from managed');
		}
	}

	onOk(){
		this.modelTitle = '';
		this.modelMessage = '';
		jQuery('#manageApModelDialog').modal('hide');
	}

	cancel(){
		$('#importAPModalFromTree .close').click();
	}
}
