import { Component, EventEmitter, Input, Output, OnChanges, OnInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common'; 
import { Router } from '@angular/router'; 
import { ActivatedRoute, Params } from '@angular/router'; 
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CDSService } from '../../../services/httpAPI.service';
import { ResponseData, ErrorResponse } from '../../../models/response';
import { SharedService } from '../../../services/shared.service';

class AddApData {    
	constructor(public success : boolean, public message : string) {  }
}

function serialnumberValidator(control: FormControl) {
	let serial = control.value;
	let numbers = /^[-+]?[0-9]+$/;
	let error = {lengthError:0,numberError:null};
	console.log(serial);
	if (serial) {
		if (serial.length != 12) {
			error.lengthError = serial.length;
		}
		if (!serial.match(numbers)) {
			error.numberError = serial;
		}
	}
	if (error.lengthError!=0 || error.numberError!=null) {
		return error;
	}
	return null;
}

function apNameValidator(control: FormControl) {
	let apName = control.value;
	let pattern= /^[!-~]((?!\$\()[ -_a-~]){0,62}[!-~]$/;
	let error = {patternError:null};
	console.log(apName);
	if (apName) {
		if (!apName.match(pattern)) {
			error.patternError = apName;
		}
	}
	if (error.patternError!=null) {
		return error;
	}
	return null;
}

@Component({
	selector: 'app-addaccesspoint',
	templateUrl: './addaccesspoint.component.html',
	styleUrls: ['./addaccesspoint.component.css']
})

export class AddaccesspointComponent implements OnInit {
	@Output() refreshEvent = new EventEmitter<boolean>();
	addApForm: FormGroup;
	bulkAPUploadForm : FormGroup;
	response: AddApData;
	clusterList : any;  
	zoneList : any;  
	clusterIp : any;  
	loaderDisplay : string = 'none';
	errorResponse: ErrorResponse;
	apSerial : FormControl;
	apName : FormControl;
	ClusterData : FormControl;
	zoneData : FormControl;
	inputFile : FormControl;
	fileData : Array<any> = new Array();
	dataObject : Object = new Object();
	bulkUploadRequestData : any = {ApList : []};
	responseData : ResponseData;
	bulkUploadLoaderDisplay : string =  'none';
	addAPTitle:string="";
	addAPMessgae:string="";
	bulkApResponseMessage: any = [];
	resMessageArr: any = [];
	dataToBeExtracted :any=null;
	constructor(private route: ActivatedRoute, private apiData: CDSService, private location: Location, fb: FormBuilder, private sharedService:SharedService) {
		this.addApForm = fb.group({
			ClusterData: [],
			zoneData: [],
			apSerial: [],
			apName: []
		});

		// this.bulkAPUploadForm = 
	}

	ngOnInit(){
		let view = this;
		view.resMessageArr = []
		console.log("in add AP ngOnInit");		
		view.createFormControls();
		view.createForm();
		/*view.apiData.cdsCLusterListService().subscribe(function(val){
			console.log('cdsCLusterListService add AP');
			view.clusterList = val.list;
		});*/	

		view.sharedService.clusterList.subscribe(val=>{
			console.log("update cl in add AP");
			view.clusterList=val.list;
		});

		view.addApForm.controls['ClusterData'].setValue('');
		view.addApForm.controls['zoneData'].setValue('');
		$(document).click(function(event) {
			if (event.target.textContent.includes('Add New AP') && (event.originalEvent.srcElement.id == 'addApModal')) {
				view.addApForm.reset();	
				view.addApForm.controls['ClusterData'].setValue('');
				view.addApForm.controls['zoneData'].setValue('');
				// view.refreshEvent.emit(true);
				$("#addApModal .close").click();
			}
		});	
	}

	createFormControls(){
		this.apSerial = new FormControl('', [Validators.required, serialnumberValidator]);
		this.apName = new FormControl('',[apNameValidator]);
		this.ClusterData = new FormControl();
		this.zoneData = new FormControl();
		this.inputFile = new FormControl();
	}

	createForm(){
		let view = this;
		view.addApForm = new FormGroup({
			apSerial : view.apSerial,
			apName : view.apName,
			ClusterData : view.ClusterData,
			zoneData : view.zoneData
		});

		view.bulkAPUploadForm = new FormGroup({
			inputFile : view.inputFile
		});
	}

	//add new AP
	addApDetails(){
		console.log("Start addApDetails function");
		let view = this;
		view.resMessageArr = []
		console.log(view.addApForm.get('apSerial').value);
		if(view.addApForm.valid) {
			view.loaderDisplay = 'block';
			
			view.apiData.cdsAddAPService(
				view.addApForm.get('apSerial').value,
				view.addApForm.get('apName').value,
				view.addApForm.get('ClusterData').value,
				view.addApForm.get('zoneData').value
				).subscribe(function(val){
					view.response = val;
					console.log("this.response addApDetails : "+view.response);
					view.loaderDisplay = 'none';
					if (view.response.success) {

						$('#addApModal').on('hidden.bs.modal', function () {
							$(view).find('form').trigger('reset');
						});
						// view.sharedService.dorefreshAPList(true);
						view.showAlertMessage('Success', view.response.message);
						view.refreshEvent.emit(true);
						localStorage.setItem("checkunmanged", "true");
						view.sharedService.refresh(true);
					} else {
						console.log(" else this.response addApDetails : "+JSON.stringify(view.response));
						view.showAlertMessage('Error', view.response.message);
					}
				},function(err){
					view.errorResponse = err;
					view.loaderDisplay = 'none';
					$('.modal-backdrop').hide();

					if (view.errorResponse.message.includes('Session')) {
						$("#addApModal .close").click();
						view.sharedService.logout(true);
					} else {
						view.showAlertMessage(view.errorResponse.title, view.errorResponse.message);
					}
				});
			} else {
				view.showAlertMessage('Error','Please enter valid details.');
			}
		}	

	//close & reset form data on
	selectCluster(){
		this.clusterIp = this.addApForm.get('ClusterData').value;		
		console.log("slected cluster Ip :"+ this.clusterIp);
		let view = this;
		if(view.clusterIp != ""){
			view.apiData.cdsCLusterDetailsService(view.clusterIp).subscribe(function(val){
				if(val.data != null){
					view.zoneList = val.data.zones;
					let index = 0;
					for(let zone of view.zoneList){
						if (zone.name == "Staging Zone") {
							index = view.zoneList.indexOf(zone);
						}
					}
					view.zoneList.splice(index,1);
				} else{
					view.addApForm.controls['zoneData'].setValue('');
					view.zoneList = [];
					$('#zoneDropDown').children('option:not(:first)').remove();
				}

			},function(err){
				view.errorResponse = err;
				view.loaderDisplay = 'none';
				$('.modal-backdrop').hide();

				if (view.errorResponse.message.includes('Session')) {
					$("#addApModal .close").click();
					view.sharedService.logout(true);
				} else if(view.errorResponse.message.includes('Request')) {
					view.showAlertMessage(view.errorResponse.title, view.errorResponse.message);
				} else {
					view.showAlertMessage(view.errorResponse.title, view.errorResponse.message);
				}
			});
		} else{
			view.addApForm.controls['zoneData'].setValue('');
			view.zoneList = [];
			$('#zoneDropDown').children('option:not(:first)').remove();
		}
	}
	
	//close & reset form data on
	cancelApDetails(){
		$("#addApModal .close").click();
		$('#apTable_processing').hide();
	}

	showBulkImportModal(){
		console.log('showBulkImportModal');
	}

	browseCSVFile(){
		console.log('browseCSVFile');
		$('#inputFile').click();
	}

	bulkUploadAP(){
		let view = this;
		let uploadData = view.extractData(view.dataToBeExtracted);
		let uploadStartStatus :boolean = true;
		let isBulkstarted:boolean=false;
		view.resMessageArr = []
		if(uploadData) {
			view.bulkUploadLoaderDisplay = 'block';
			view.apiData.cdsBulkAPImport(uploadData).subscribe(function(val){
				uploadStartStatus = false
				view.responseData = val;
				view.bulkUploadLoaderDisplay = 'none';
				if(!isBulkstarted) {
					if(Array.isArray(view.responseData.message)){
						view.resMessageArr = view.responseData.message;
					}
					view.showAlertMessage('Alert', view.responseData.message);
				}
				$('#inputFile')[0].dataset.title = "Drag and drop a file";
				view.sharedService.startBulkAPUpload(false);

				view.bulkAPUploadForm.reset();
				$('#bulkUploadModal').modal('hide');
				uploadData = view.extractData(null);
				view.dataToBeExtracted=null;
				view.refreshEvent.emit(true);
				localStorage.setItem("checkunmanged", "true");
				view.sharedService.refresh(true);
			},function(err){
				uploadStartStatus = false
				view.errorResponse = err;
				view.bulkAPUploadForm.reset();
				$('.modal-backdrop').hide();
				$('#bulkUploadModal').modal('hide');
				view.dataToBeExtracted=null;
				uploadData = view.extractData(null);
				if (view.errorResponse.message.includes('Session')) {
					view.sharedService.logout(true);
				} else if(view.errorResponse.message.includes('Request')) {
					if(!isBulkstarted) {
						view.showAlertMessage(view.errorResponse.title, view.errorResponse.message);
					}
				} else if(view.errorResponse.message && view.errorResponse.message != undefined) {
					if(!isBulkstarted) {
						view.showAlertMessage(view.errorResponse.title, view.errorResponse.message);
					}
				}
			});
			setTimeout(()=> {
				if(uploadStartStatus){
					$('#inputFile')[0].dataset.title = "Drag and drop a file";
					view.bulkAPUploadForm.reset();
					view.bulkUploadLoaderDisplay = 'none';
					$('#bulkUploadModal').modal('hide');
					view.showAlertMessage('Alert', 'Bulk AP upload process started successfully. We will notify once it will be completed');
					isBulkstarted=true;
					view.sharedService.startBulkAPUpload(true);
				}				
			}, 30000);
		}
	}

	cancelBulkUpload(){
		$('#inputFile')[0].dataset.title = "Drag and drop a file";
		this.bulkAPUploadForm.reset();
		this.dataToBeExtracted=null;
	}

	readUrl(input){
		let view = this;
		if(!view.validateFile(input.target.files[0].name)){
					//$('#bulkUploadBtn').prop('disabled', true);
					view.showAlertMessage('Error', 'Please select csv file only.');
				} else {
					//$('#bulkUploadBtn').prop('disabled', false);
					if (input != null) {
						let reader = new FileReader();
						if (input.target.files && input.target.files.length >= 0) {
							let file = input.target.files[0];
							let fileName = file.name;
							reader.readAsText(file);
							reader.onload = (e : any) => {
								input.target.dataset.title= input.target.files[0].name;
								view.dataToBeExtracted = e.target.result;
							// view.extractData(e.target.result);
						};
					}
				} else {
					view.dataToBeExtracted = null;
					// view.extractData(null);
				}
			}
		}

		validateFile(name: String) {
			var ext = name.substring(name.lastIndexOf('.') + 1);
			if (ext.toLowerCase() == 'csv') {
				return true;
			}
			else {
				return false;
			}
		}

		extractData(data){
			let view = this;
			if (data != null) {
				console.log(data);
				const splitArr = data.split(/\r\n|\n/);
				let errorMsg: any = [];
				for(let i = 1; i < splitArr.length; i++){
					const apSerial = splitArr[i].split(',')[0];
					if(splitArr[i] && splitArr[i] != '' && apSerial.length != 12){
						if(apSerial.length > 0){
							errorMsg.push('AP Serial number [' + apSerial + '] must be of length 12');
						}
						else{
							errorMsg.push('AP Serial number cannot be blank');
						}
					}
				}
				if(errorMsg.length > 0){
					//$('#bulkUploadBtn').prop('disabled', true);
					view.bulkApResponseMessage = errorMsg;
					$('#bulkApResponse').modal('show');
					$('#inputFile')[0].dataset.title = "Drag and drop a file";
					view.bulkAPUploadForm.reset();
					return false;
				}
				else{
					//$('#bulkUploadBtn').prop('disabled', false);
					view.bulkUploadRequestData = data;
					console.log(view.bulkUploadRequestData);
					return view.bulkUploadRequestData;
				}
			} else {
				return false;
			}
		}

		showAlertMessage(title:string, message:string){
			this.addAPMessgae=message;
			this.addAPTitle=title;

			$('#openAddAPpopup').click();
		}

	// downloadSampleFile(){
	// 	window.open('assets/images/Samplefile.csv', '_blank');
	// }

	okAddAP(){
		this.resMessageArr = []
		if (this.addAPTitle == 'Success') {
			$('#bulkUploadModal .close').click();
			$("#addApModal .close").click();
			$("#confirmAddAPModal close").click();
		} else {
			$("#confirmAddAPModal close").click();
		}
	}
}
