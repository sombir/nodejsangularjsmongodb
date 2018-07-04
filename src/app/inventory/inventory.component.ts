import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute, Params } from '@angular/router'; 
import { ClusterData, ClusterListData } from '../../models/cluster';
import { DataTableDirective } from 'angular-datatables';
import { DataTablesResponse } from '../../models/datatable';
import { HttpClient, HttpHeaders, HttpResponse, HttpParams } from '@angular/common/http';
import { CookieService} from 'angular2-cookie/core';
import { ApDataArray, ApListResponse } from '../../models/ap';
import { CDSService } from '../../services/httpAPI.service';
import { SharedService } from '../../services/shared.service';
import {LOCAL_STORAGE, WebStorageService} from 'angular-webstorage-service';
import { ResponseData, ErrorResponse } from '../../models/response';

@Component({
	selector: 'app-inventory',
	templateUrl: './inventory.component.html',
	styleUrls: ['./inventory.component.css']
})
export class InventoryComponent implements OnInit {
	@ViewChild(DataTableDirective)
	dtElement: DataTableDirective;
	pageName:string="";
	doRefreshInventory : boolean = false;
	displayAPList:string='none';
	displayAPTree:string='none';
	dtOptions: any = {};
	apFound : boolean = false;
	apsCount : number = 0;
	unmanagedAPResponse : ApListResponse = null;
	unmanagedApsList : ApDataArray[] = [];
	clusterList:ClusterData[]=[];
	onlineClusterCount:number=0;
	offlineClusterCount:number=0;
	flaggedCLusterCount:number=0;
	onlineAPCount:number=0;
	offlineAPCount:number=0;
	flaggedAPCount:number=0;
	errorResponse: ErrorResponse;
	response:ClusterListData;
	timezone : string="";
	inventoryTitle:string='';
	inventoryMessage:string='';
	selectedtreeitem:string='';
	openAPList:boolean=false;
	count:number = 0;
	
	constructor(public router: Router, private http:HttpClient, private _cookieService:CookieService, private apiData : CDSService, private sharedService:SharedService, @Inject(LOCAL_STORAGE) private storage: WebStorageService) {
		/*router.events.forEach((event) => {
			console.log(event);
			if(event instanceof NavigationEnd ) {
				console.log(router.url);

				if (this.router.url.includes('inventory')) {
					if (this.router.url.includes('accesspoints')) {
						this.pageName = "Access Points";
						$('#showInventoryTableBtn').removeClass('selected');
						$('#showAPTableBtn').addClass('selected');
					} else {
						this.pageName = "All Clusters";
						$('#showInventoryTableBtn').addClass('selected');
						$('#showAPTableBtn').removeClass('selected');
					}
				}
			}
		});*/
	}

	ngOnInit(){
		this.timezone = this.storage.get('TimeZone');
		let view = this;
		view.sharedService.inventoryUpdated.subscribe(msg => {
			view.doRefreshInventory = msg; 
			console.log(msg); 
			console.log(view.doRefreshInventory);
			let checkUnmangedFlag = localStorage.getItem("checkunmanged");
			if (view.doRefreshInventory && checkUnmangedFlag == 'true') {
				localStorage.setItem("checkunmanged", "false");
				view.getInventory();
			}
		});

		if(view.pageName.includes('Unmanaged')) {
			$('#unmanagedAPSubTitle').show();
		} else {
			$('#unmanagedAPSubTitle').hide();
		}

		view.sharedService.showText.subscribe(text=>{
			view.pageName = text;
			view.selectedtreeitem=text;
			if(text.includes('Unmanaged')) {
				$('#unmanagedAPSubTitle').show();
			} else {
				$('#unmanagedAPSubTitle').hide();
			}
		});

		let openAPList=localStorage.getItem("openAPList");
		if(openAPList=='APList') {
			$('#showAPDetails').click();
			$('#showInventoryTableBtn').click();
			localStorage.setItem("openAPList", '');
		}
		view.getInventory();

	}


	getInventory(){
		let view = this;

		$('body').css('background-color', '#D9E0E7');

		view.getUnmanagedAPTable();	

		view.sharedService.clusterList.subscribe(val=>{
			console.log('update cl in inventory for top numbers');
			view.response=val;
			view.clusterList=view.response.list;
			view.onlineClusterCount=0;
			view.offlineClusterCount=0;
			view.flaggedCLusterCount=0;
			view.onlineAPCount=0;
			view.offlineAPCount=0;
			view.flaggedAPCount=0;
			for (let i = 0; i < view.clusterList.length; ++i) {
				if (view.clusterList[i].status == 1) {
					view.onlineClusterCount = view.onlineClusterCount + 1;
				} else if (view.clusterList[i].status == 0) {
					view.offlineClusterCount = view.offlineClusterCount + 1;
				} else if (view.clusterList[i].status == 2) {
					view.flaggedCLusterCount = view.flaggedCLusterCount + 1;
				}
				console.log(view.clusterList[i]);
				if (view.clusterList[i].hasOwnProperty('stats') && (view.clusterList[i].stats != null)) {
					console.log("have stats");
					if (view.clusterList[i].stats.hasOwnProperty('zoneinventory') && (view.clusterList[i].stats.zoneinventory != null)) {
						console.log("have zoneInventory");
						if (view.clusterList[i].stats.zoneinventory.hasOwnProperty('zonesummary') && (view.clusterList[i].stats.zoneinventory.zonesummary != null)) {
							console.log('has zonesummary');
							for (let j = 0; j < view.clusterList[i].stats.zoneinventory.zonesummary.length; ++j) {
								view.onlineAPCount = view.onlineAPCount + view.clusterList[i].stats.zoneinventory.zonesummary[j].apOnline;
								view.offlineAPCount = view.offlineAPCount + view.clusterList[i].stats.zoneinventory.zonesummary[j].apOffline;
								view.flaggedAPCount = view.flaggedAPCount + view.clusterList[i].stats.zoneinventory.zonesummary[j].apFlagged;
							}
						}
					}
				}
			}
		});
	}

	showClusterTable(){
		this.displayAPTree='none';
		this.displayAPList='none';
		localStorage.setItem("checkshowcluster", "true");
		this.sharedService.dorefresfCluster(true);
	}

	showAPData(){
		$('#showInventoryTableBtn').removeClass('selected');
		$('#showAPTableBtn').addClass('selected');
		this.displayAPTree='block';
		this.displayAPList='none';
		this.sharedService.dorefreshAPTree(true);
		this.pageName = this.selectedtreeitem;
		if(this.pageName.includes('Unmanaged')) {
			$('#unmanagedAPSubTitle').show();
		} else {
			$('#unmanagedAPSubTitle').hide();
		}
	}

	showAPTreeData(){
		$('#showInventoryTableBtn').removeClass('selected');
		$('#showAPTableBtn').addClass('selected');
		this.displayAPTree='block';
		this.displayAPList='none';
		this.sharedService.dorefreshAPTree(true);
		this.pageName = this.selectedtreeitem;
		if(this.pageName.includes('Unmanaged')) {
			$('#unmanagedAPSubTitle').show();
		} else {
			$('#unmanagedAPSubTitle').hide();
		}
	}

	showInventoryTable(){
		$('#showInventoryTableBtn').addClass('selected');
		$('#showAPTableBtn').removeClass('selected');
		this.displayAPTree='none';
		this.displayAPList='block';
		this.sharedService.dorefreshAPList(true);
		this.pageName = 'AP List';
		$('#unmanagedAPSubTitle').hide();
	}

	getUnmanagedAPTable(){
		let view = this;
		view.apiData.getUnmanagedAPCount().subscribe(function(val){
			console.log(val);
			view.unmanagedAPResponse = val;
			if(view.unmanagedAPResponse != null) {
				view.apsCount=view.unmanagedAPResponse.totalCount;
				view.count = view.apsCount;
				view.sharedService.getUnmanagedAPcount(view.count);
			}
		},function(err){
			view.errorResponse = err;
			if (view.errorResponse.message.includes('Session')) {
				view.sharedService.logout(true);
			} else {
				view.showAlert(view.errorResponse.title, view.errorResponse.message);
			}
		});
		view.count=0;
	}

	showOnlineClusters(){
		console.log('show online clusters');
		$('#showClusterTableDetails').click();
		this.sharedService.showOnlineClusters('Online');
	}

	showFlaggedClusters(){
		console.log('show flagged clusters');
		$('#showClusterTableDetails').click();
		this.sharedService.showFlaggedClusters('Flagged');
	}

	showOfflineClusters(){
		console.log('show offline clusters');
		$('#showClusterTableDetails').click();
		this.sharedService.showOfflineClusters('Offline');	
	}

	showOnlineManagedAP(){
		console.log('show online managed ap');
		$('#showAPDetails').click();
		$('#showAPTableBtn').click();
		this.sharedService.showOnlineManagedAP('Online');
	}

	showFlaggedManagedAP(){
		console.log('show flagged managed ap');
		$('#showAPDetails').click();
		$('#showAPTableBtn').click();
		this.sharedService.showFlaggedManagedAP('Flagged');
	}

	showOfflineManagedAP(){
		console.log('show offline managed ap');
		$('#showAPDetails').click();
		$('#showAPTableBtn').click();
		this.sharedService.showOfflineManagedAP('Offline');
	}

	showUnmanagedAP(){
		console.log('show unmanaged ap');
		$('#showAPDetails').click();
		$('#showAPTableBtn').click();
		this.sharedService.showUnmanagedAP('Unmanaged');
	}

	receiveRefresh(e){
		console.log(e);
	}

	showAlert(title:string, msg:string){
		this.inventoryTitle = title;
		this.inventoryMessage = msg;

		$('#openInventorypopup').click();
	}

	okInventoryBtnClicked(){
		$("#confirmInventoryModal close").click();
	}
}
