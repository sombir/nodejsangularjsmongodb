import { Component, Inject, EventEmitter, Input, Output, OnInit, OnChanges, ViewChild, SimpleChanges} from '@angular/core';
import { Location } from '@angular/common'; 
import { Router } from '@angular/router'; 
import { ActivatedRoute, Params } from '@angular/router'; 
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ClusterData } from '../../../models/cluster';
import { CDSService } from '../../../services/httpAPI.service';
import { SharedService } from '../../../services/shared.service';
import * as $ from 'jquery';
import * as bootstrap from "bootstrap";
import { ResponseData, ErrorResponse } from '../../../models/response';

function clusterTagValidator(control: FormControl) {
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
  selector: 'app-edit-cluster',
  templateUrl: './edit-cluster.component.html',
  styleUrls: ['./edit-cluster.component.css']
})
export class EditClusterComponent implements OnInit, OnChanges {

  @Input() editCluster:boolean;
  @Output() refreshEditEvent = new EventEmitter<boolean>();
  clusterList : ClusterData[];
  editClusterForm:FormGroup;
  clusterMgmtIP:FormControl;
  clusterLoginID:FormControl;
  clusterPassword:FormControl;
  clusterTag:FormControl;
  clusterImportAP:FormControl;
  clusterDefaultCluster:FormControl;
  editLoaderDisplay:string='none';
  editClusterTitle:string='';
  editClustermessage:string='';
  singleEditconfirm:boolean=false;
  noEditConfirm:boolean=false;
  multipleEditConfirm:boolean=false;
  cluster:ClusterData;
  clusterName:string='';
  clusterIP:string='';
  clusterLogin:string='';
  clusterPwd:string='';
  clustertag:string='';
  clusterip:string='';
  clusterImport:boolean=false;
  clusterDefault:boolean=false;
  response:ResponseData;
  errorResponse:ErrorResponse;
  change:boolean=false;

  constructor( fb: FormBuilder, private sharedService:SharedService, private apiData:CDSService ) {
  	this.editClusterForm=fb.group({
      clusterMgmtIP:[],
      clusterLoginID:[],
      clusterPassword:[],
      clusterTag:[],
      clusterImportAP:[],
      clusterDefaultCluster:[]
    });
  }

  ngOnInit() {
    let view = this;
    view.createFormControls();
    view.createForm();

  }

  ngOnChanges(changes:SimpleChanges){
    let view = this;
    console.log(changes);
    for(let propname in changes){
      let change = changes[propname];
      if (propname == 'editCluster') {
        view.sharedService.cluster.subscribe(msg => view.cluster = msg);
        console.log(view.cluster);
        if (view.cluster == null || view.cluster==undefined) {
          view.noEditConfirm=true;
          view.singleEditconfirm=false;
        } else{
          view.noEditConfirm=false;
          view.singleEditconfirm=true;
          view.editClusterForm.patchValue({
            clusterMgmtIP:view.cluster.ip,
            clusterLoginID:view.cluster.loginid,
            clusterTag:view.cluster.tag,
            clusterImportAP:view.cluster.apsimported,
            clusterDefaultCluster:view.cluster.defaultcluster
          });
          view.clusterName=view.cluster.name;
          view.clusterIP=view.cluster.ip;
          view.clusterImport=view.cluster.apsimported;
          view.clusterDefault=view.cluster.defaultcluster;
          // view.clusterMgmtIP.reset(view.cluster.ip);
          // view.clusterLoginID.reset(view.cluster.loginid);
          // view.clusterTag.reset(view.cluster.tag);
          // view.clusterImportAP.reset(view.cluster.apsimported);
          // view.clusterImportAP.patchValue(view.cluster.apsimported);
          // view.clusterDefaultCluster.reset(view.cluster.defaultcluster);
        }
      }
    }
  }

  createFormControls(){
    this.clusterMgmtIP = new FormControl('',[Validators.required, clusterIPValidator]);
    this.clusterLoginID = new FormControl('',[Validators.required]);
    this.clusterPassword = new FormControl('',[Validators.required]);
    this.clusterTag = new FormControl('',[clusterTagValidator]);
    this.clusterDefaultCluster = new FormControl();
    this.clusterImportAP = new FormControl();
  }

  createForm(){
  	let view = this;
    view.editClusterForm = new FormGroup({
      clusterMgmtIP : view.clusterMgmtIP,
      clusterLoginID : view.clusterLoginID,
      clusterPassword:view.clusterPassword,
      clusterTag: view.clusterTag,
      clusterDefaultCluster: view.clusterDefaultCluster,
      clusterImportAP: view.clusterImportAP
    });
  }

  testConnection(){
  	console.log('test connection');
    let view = this;
    if(view.editClusterForm.valid) {
      view.editLoaderDisplay = 'block';
      view.apiData.cdsTestConnectionService(
        view.editClusterForm.value.clusterMgmtIP,
        view.editClusterForm.value.clusterLoginID,
        view.editClusterForm.value.clusterPassword, ).subscribe(function(val: any) {
          view.response = val;
          console.log(view.response);
          view.showAlertMessage('Test',view.response.message);
          view.editLoaderDisplay = 'none';
        },function(err){
          view.errorResponse = err;
          $('.modal-backdrop').hide();
          if (view.errorResponse.message.includes('Session')) {
            $("#editClusterModal .close").click();
            view.editLoaderDisplay = 'none';
            view.sharedService.logout(true);
          } else {
            view.editLoaderDisplay = 'none';
            view.showAlertMessage(view.errorResponse.title,view.errorResponse.message);
          }
        });
      } else {
        view.showAlertMessage('Error','Please enter valid details.');
      }
    }

    editClusterDetails(){
      console.log('edit cluster');
      let view = this;
      if (view.editClusterForm.valid) {
        view.editLoaderDisplay = 'block';

        console.log('Form data : loginId-'+view.editClusterForm.get('clusterLoginID').value + ', password-' + view.editClusterForm.get('clusterPassword').value + ', tag-' + view.editClusterForm.get('clusterTag').value + ', import-AP-' + view.editClusterForm.get('clusterImportAP').value + ', default-cluster-' + view.editClusterForm.get('clusterDefaultCluster').value + ', IP-' + view.editClusterForm.get('clusterMgmtIP').value);
        let data = {
          name:view.clusterName,
          ip:view.editClusterForm.get('clusterMgmtIP').value,
          previousIP:view.clusterIP,
          tag:view.editClusterForm.get('clusterTag').value,
          loginid:view.editClusterForm.get('clusterLoginID').value,
          password:view.editClusterForm.get('clusterPassword').value,
          defaultcluster:view.editClusterForm.get('clusterDefaultCluster').value,
          importaps:view.editClusterForm.get('clusterImportAP').value
        };
        view.apiData.cdsEditClusterService(data).subscribe(function(val){
          view.response = val;
          if (view.response.success) {
            view.change=!view.change;
            view.refreshEditEvent.emit(view.change);
            view.showAlertMessage('Success',view.response.message);
            localStorage.setItem("checkunmanged", "true");
            view.sharedService.refresh(true);
          } else {
            view.showAlertMessage('Error', view.response.message);
          }
          view.editLoaderDisplay = 'none';
        },function(err){
          view.errorResponse = err;
          $('.modal-backdrop').hide();
          if (view.errorResponse.message.includes('Session')) {
            $("#editClusterModal .close").click();
            view.editLoaderDisplay = 'none';
            view.sharedService.logout(true);
          } else {
            view.editLoaderDisplay = 'none';
            view.showAlertMessage(view.errorResponse.title,view.errorResponse.message);
          }
        });
      } else {
        view.editLoaderDisplay = 'none';
        view.showAlertMessage('Error', 'Please enter valid details');
      }

    }

    cancelEdit(){
      console.log('cancel cluster');
    }

    showAlertMessage(title:string, message:string){
      this.editClusterTitle = title;
      this.editClustermessage = message;

      $('#openEditCluserpopup').click();
    }

    okEditCluster(){
      if (this.editClusterTitle == 'Success') {
        this.editClusterForm.reset();
        $("#editClusterModal .close").click();
        $("#confirmEditClusterModal close").click();
      } else {
        $("#confirmEditClusterModal close").click();
      }
    }
	
	checkdnslookup(){
		let view = this
		let hostname = $("#clusterEditIp").val();
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
						view.editLoaderDisplay = 'none';
						view.sharedService.logout(true);
					  } else {
						view.editLoaderDisplay = 'none';
						view.showAlertMessage(view.errorResponse.title,view.errorResponse.message);
					  }
			});
		}
	}

  }
