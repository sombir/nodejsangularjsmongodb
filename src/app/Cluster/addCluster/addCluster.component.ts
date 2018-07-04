import { Component, Inject, EventEmitter, Input, Output, OnChanges, OnInit, ViewChild} from '@angular/core';
import { Location } from '@angular/common'; 
import { Router } from '@angular/router'; 
import { ActivatedRoute, Params } from '@angular/router'; 
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CDSService } from '../../../services/httpAPI.service';
import { SharedService } from '../../../services/shared.service';
import * as $ from 'jquery';
import * as bootstrap from "bootstrap";
import { ResponseData, ErrorResponse } from '../../../models/response';


function clusterNameValidator(control: FormControl) {
	let clusterName = control.value;
	console.log(clusterName);
	let error = { lengthError : 0};
	if (clusterName) {
		if (clusterName.length > 32) {
			error.lengthError = clusterName.length;
		}
	}
	if (error.lengthError!=0) {
		return error;
	}
	return null;
}

function clusterIPValidator(control: FormControl) {
	let clusterIP = control.value;
	let clusterIPv4Pattern = /^([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})$/;
	let clusterIPv6Pattern = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
	let clusterDomainPattern = /^[A-Za-z0-9_@./#&+-]*$/;  
	console.log(clusterIP);
	let error = { lengthError : 0, patternError:null};
	if (clusterIP) {
		if (clusterIP.length > 255) {
			error.lengthError = clusterIP.length;
		}
		if (clusterIP.match(clusterIPv4Pattern) || clusterIP.match(clusterIPv6Pattern) || clusterIP.match(clusterDomainPattern)) {
			error.patternError = null;
		} else{
			error.patternError = clusterIP;
		}
	}
	if (error.lengthError!=0 || error.patternError!=null) {
		return error;
	}
	return null;
}

function isIpaddressIsDomain(ipaddress) {
	let clusterIP = ipaddress;
	let clusterIPv4Pattern = /^([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})$/;
	let clusterIPv6Pattern = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;	
	if (clusterIP.match(clusterIPv4Pattern) || clusterIP.match(clusterIPv6Pattern)) {
		return false
	} else{
		return true;
	}	
}

@Component({
	selector: 'add-cluster',
	templateUrl: './addCluster.component.html',
	styleUrls: ['./addCluster.component.css']
})
export class AddClusterComponent implements OnInit {
	@Output() refreshEvent = new EventEmitter<boolean>();

	title = 'app';
	response: ResponseData;
	addClusterForm: FormGroup;
	errorResponse:ErrorResponse;
	clusterDefaultCluster: FormControl;
	clusterImportAP: FormControl;
	clusterTag: FormControl;
	clusterPassword: FormControl;
	clusterLoginID: FormControl;
	clusterIPaddress: FormControl;
	clusterName: FormControl;
	data: string = 'refresh';
	loaderDisplay: string = 'none';
	change: boolean = false;
	modelMessage: String = '';
	addClusterTitle:string="";
	addClustermessage:string="";
	constructor(private route: ActivatedRoute,
		private apiData: CDSService, private location: Location, fb: FormBuilder, private sharedService:SharedService) {
		this.addClusterForm = fb.group({
			clusterName: [],
			clusterIPaddress: [],
			clusterLoginID: [],
			clusterPassword: [],
			clusterTag: [],
			clusterImportAP: [],
			clusterDefaultCluster: []
		});
		this.addClusterForm.reset();
	}

	ngOnInit() {
		let view = this;
		view.clusterName = new FormControl('', [Validators.required, clusterNameValidator]);
		view.clusterIPaddress = new FormControl('',[Validators.required, clusterIPValidator]);
		view.clusterLoginID = new FormControl();
		view.clusterPassword = new FormControl();
		view.clusterTag = new FormControl('',[clusterNameValidator]);
		view.clusterImportAP = new FormControl();
		view.clusterDefaultCluster = new FormControl();

		view.addClusterForm = new FormGroup({

			clusterName: view.clusterName,
			clusterIPaddress: view.clusterIPaddress,
			clusterLoginID: view.clusterLoginID,
			clusterPassword: view.clusterPassword,
			clusterTag: view.clusterTag,
			clusterImportAP: view.clusterImportAP,
			clusterDefaultCluster: view.clusterDefaultCluster
		});

		view.addClusterForm.reset();

		$(document).click(function(event) {
			if (event.target.textContent.includes('Add New Cluster') && (event.originalEvent.srcElement.id == 'addClusterModal')) {
				console.log(event);
				view.addClusterForm.reset();
				$("#addClusterModal .close").click();
			}
		});

	}

	addClusterDetails() {
		let view = this;
		if(view.addClusterForm.valid) {
			view.loaderDisplay = 'block';
			view.apiData.cdsAddClusterService(
				view.addClusterForm.get('clusterName').value,
				view.addClusterForm.get('clusterIPaddress').value,
				view.addClusterForm.get('clusterLoginID').value,
				view.addClusterForm.get('clusterPassword').value,
				view.addClusterForm.get('clusterTag').value,
				view.addClusterForm.get('clusterImportAP').value,
				view.addClusterForm.get('clusterDefaultCluster').value).subscribe(function(val: any) {
					view.response = val;
					console.log(view.response);
					if (view.response.success) {
						view.change = !view.change
						view.refreshEvent.emit(view.change);
						view.showAlertMessage('Success',view.response.message);
						view.modelMessage = view.response.message;
						view.sharedService.refresh(true);
						localStorage.setItem("checkunmanged", "true");
					} else {
						view.modelMessage = view.response.message;
						view.showAlertMessage('Error',view.response.message);
						console.log(view.modelMessage);
						console.log('ERROR-----');
					}
					view.loaderDisplay = 'none';
					view.addClusterForm.reset();
				},function(err){
					view.errorResponse = err;
					$('.modal-backdrop').hide();
					if (view.errorResponse.message.includes('Session')) {
						$("#addClusterModal .close").click();
						view.loaderDisplay = 'none';
						view.sharedService.logout(true);
					} else {
						view.loaderDisplay = 'none';
						view.showAlertMessage(view.errorResponse.title,view.errorResponse.message);
					}
				});
			} else {
				view.showAlertMessage('Error', 'Please enter valid details.');
			}
		}

		cancel() {
			this.addClusterForm.reset();
			$("#addClusterModal .close").click();
		}

		testConnection() {
			let view = this;
			if(view.addClusterForm.valid) {
				view.loaderDisplay = 'block';
				view.apiData.cdsTestConnectionService(
					view.addClusterForm.value.clusterIPaddress,
					view.addClusterForm.value.clusterLoginID,
					view.addClusterForm.value.clusterPassword, ).subscribe(function(val: any) {
						view.response = val;
						console.log(view.response);
						view.modelMessage = view.response.message;
						view.showAlertMessage('Test',view.response.message);
						view.loaderDisplay = 'none';
					},function(err){
						view.errorResponse = err;
					$('.modal-backdrop').hide();
						if (view.errorResponse.message.includes('Session')) {
							$("#addClusterModal .close").click();
							view.loaderDisplay = 'none';
							view.sharedService.logout(true);
						} else {
							view.loaderDisplay = 'none';
							view.showAlertMessage(view.errorResponse.title,view.errorResponse.message);
						}
					});
				} else {
					view.showAlertMessage('Error', 'Please enter valid details.');
				}
			}

			showAlertMessage(title:string, message:string){
				this.addClusterTitle = title;
				this.addClustermessage = message;
				$('#openAddCluserpopup').click();
			}

			onOk(){
				this.modelMessage = '';
				jQuery('#modelDialog').modal('hide');
			}
			okAddCluster(){
				if (this.addClusterTitle == 'Success') {
					$("#addClusterModal .close").click();
					$("#confirmAddClusterModal close").click();
				} else {
					$("#confirmAddClusterModal close").click();
				}
			}
			checkdnslookup(){
				let view = this
				let hostname = $("#cip").val();
				let isdomain = isIpaddressIsDomain(hostname)
				if(isdomain){
					view.apiData.resolvednsname(hostname).subscribe(function(val: any) {
							view.response = val;
							if(!view.response.success){
								view.showAlertMessage('Alert',view.response.message);
							}
						},function(err){
							 view.errorResponse = err;
							 $('.modal-backdrop').hide();
							  if (view.errorResponse.message.includes('Session')) {
								view.loaderDisplay = 'none';
								view.sharedService.logout(true);
							  } else {
								view.loaderDisplay = 'none';
								view.showAlertMessage(view.errorResponse.title,view.errorResponse.message);
							  }
					});
				}
			}
		}

