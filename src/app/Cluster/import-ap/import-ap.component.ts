import { Component, OnInit, Input, Output, OnChanges, SimpleChanges, EventEmitter, ViewChild } from '@angular/core';
import { ClusterData } from '../../../models/cluster';
import { CDSService } from '../../../services/httpAPI.service';
import { Router } from '@angular/router'; 
import { ResponseData, ErrorResponse } from '../../../models/response';
import { SharedService } from '../../../services/shared.service';

@Component({
	selector: 'app-import-ap',
	templateUrl: './import-ap.component.html',
	styleUrls: ['./import-ap.component.css']
})
export class ImportApComponent implements OnInit, OnChanges {
	@Input() noCluster : boolean = false;
	@Input() selectedClusterForImport : ClusterData;
	@Input() selectedClusterForAPImport : ClusterData;
	@Input() multipleCluserSelected : boolean = false;
	@Output() refreshListEvent = new EventEmitter<boolean>();
	@Output() refreshEvent = new EventEmitter<boolean>();
	
	clusterList : ClusterData;
	importConfirm : boolean = false;
	noClusterConfirm : boolean = false;
	multipleClusterConfirm : boolean = false;
	loaderDisplay : string = 'none';
	response : ResponseData;
	errorResponse : ErrorResponse;
	change : boolean = false;
	name:string="";
	clusterName : string = "";
	showName : string="";
	importAPTitle:string="";
	importAPMessage:string="";
	constructor(private apiData : CDSService, private router: Router, private sharedService:SharedService) { }

	ngOnInit() {
	}

	ngOnChanges(changes : SimpleChanges){
		console.log(changes);
		for (let propName in changes) {  
			let change = changes[propName];
			console.log(change);
			if (propName == "selectedClusterForImport") {
				this.name = change.currentValue;
				if (this.name != null) {
					this.importConfirm = true;
					this.noClusterConfirm = false;
					this.multipleClusterConfirm = false;
				} else {
					this.importConfirm = false;
					this.noClusterConfirm = true;
					this.multipleClusterConfirm = false;
				}
			} else if (propName == "noCluster") {
				this.importConfirm = false;
				this.noClusterConfirm = true;
				this.multipleClusterConfirm = false;
			} else if(propName == "multipleCluserSelected"){
				this.importConfirm = false;
				this.noClusterConfirm = false;
				this.multipleClusterConfirm = true;
			} else if (propName == "selectedClusterForAPImport") {
				this.clusterName = change.currentValue;
				if (this.clusterName != null) {
					this.importConfirm = true;
					this.noClusterConfirm = false;
					this.multipleClusterConfirm = false;
				} else {
					this.importConfirm = false;
					this.noClusterConfirm = true;
					this.multipleClusterConfirm = false;
				}
			}
		}
		this.showName = (this.name!="")?this.name:this.clusterName;

	}

	cancel(){
		$('#importAPModal .close').click();
	}

	importAPs(){
		console.log(this.clusterList);
		let view = this;
		view.loaderDisplay = 'block';
		let cluster = (view.name!="")?view.name:view.clusterName;
		view.apiData.cdsImportAPsInCluster(cluster).subscribe(function(val) {
			console.log(val);
			view.response = val;
			if (view.response.success) {
				view.showAlertMessage('Success',view.response.message);
				view.refreshListEvent.emit(true);
				view.refreshEvent.emit(true);
				localStorage.setItem("checkunmanged", "true");
				view.sharedService.refresh(true);
				view.loaderDisplay = 'none';
				if (window.location.href.includes('accesspoints')) {
					view.router.navigate(['dashboard/inventory/accesspoints']);
				}
			} else {
				view.showAlertMessage('Error',view.response.message);
				view.loaderDisplay = 'none';
			}
		},function(err){
			view.errorResponse = err;
			$('.modal-backdrop').hide();

			if (view.errorResponse.message.includes('Session')) {
				$('#importAPModal .close').click();
				view.loaderDisplay = 'none';
				view.sharedService.logout(true);
			} else {
				view.showAlertMessage(view.errorResponse.title,view.errorResponse.message);
				view.loaderDisplay = 'none';
			}
		});
	}
	
	showAlertMessage(title:string, message:string){
		this.importAPTitle=title;
		this.importAPMessage=message;

		$('#openImportAPpopup').click();

	}

	okImportAP(){
		$('#importAPModal .close').click();
		$("#confirmImportAPModal close").click();
	}
}
