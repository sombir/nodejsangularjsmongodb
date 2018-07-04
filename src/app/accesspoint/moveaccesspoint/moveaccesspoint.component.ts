import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Location } from '@angular/common'; 
import { Router } from '@angular/router'; 
import { ActivatedRoute, Params } from '@angular/router'; 
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CDSService } from '../../../services/httpAPI.service';
import { ApDataArray, ApListResponse } from '../../../models/ap';
import { ResponseData, ErrorResponse } from '../../../models/response';
import { ClusterListData, ClusterData, ZonesData } from '../../../models/cluster';
import { SharedService } from '../../../services/shared.service';

@Component({
  selector: 'app-moveaccesspoint',
  templateUrl: './moveaccesspoint.component.html',
  styleUrls: ['./moveaccesspoint.component.css']
})
export class MoveaccesspointComponent implements OnInit, OnChanges {
	moveApForm: FormGroup;
  selectedApCount : any;
  @Input() multipleAPsSelected : any;
  @Input() moveAP : ApDataArray;
  @Output() refeshAPList = new EventEmitter<boolean>();
  @Output() click = new EventEmitter();
  moveSelectedAP : ApDataArray[]=[];
  clusterList : ClusterData[] = [];
  clusterIp : string;
  zoneList : ZonesData[];
  loaderDisplay : string = 'none';
  change : boolean = false;
  errorResponse: ErrorResponse;
  response : ResponseData;
  isClusterSelected : boolean = false;
  isZoneSelected : boolean = false;
  successfulMultipleMove : number =0;
  unsuccessfulMultipleMove : number =0;
  moveAPTitle:string="";
  moveAPMessage:string="";
  resMessageArr = [];
  constructor(private route: ActivatedRoute, private apiData: CDSService, private location: Location, fb: FormBuilder, private sharedService:SharedService) { 
  	this.moveApForm = fb.group({
      ClusterData: ['', Validators.required ],
      zoneData: [],
      apName: []
    });
  }

  ngOnInit() {
    console.log("in move AP ngOnInit"); 
    let view = this;
    view.moveApForm.reset();
    /*view.apiData.cdsCLusterListService().subscribe(function(val){
      console.log('cdsCLusterListService move AP');
      view.clusterList = val.list;
    }); */

    view.sharedService.clusterList.subscribe(val=>{
      console.log("update cl in move AP");
      view.clusterList=val.list;
    });  

    $(document).click(function(event) {
      if (event.target.textContent.includes('Move AP') && (event.originalEvent.srcElement.id == 'moveApModal')) {
        console.log(event);
        if (view.moveSelectedAP.length == 1) {
          $('#moveAPName').val(view.moveSelectedAP[0].apname);
          let clusterSelectedText = (view.moveSelectedAP[0].clustername!="")?view.moveSelectedAP[0].clustername:"Select Cluster";
          let zoneSelectedText = (view.moveSelectedAP[0].zonename!="")?view.moveSelectedAP[0].zonename:"Select Zone";
          let selectedClusterIP = '';
          for (let i = 0; i < view.clusterList.length; ++i) {
            if (view.clusterList[i].name == clusterSelectedText) {
              selectedClusterIP=view.clusterList[i].ip;
            }
          }
          view.moveApForm.controls['ClusterData'].setValue(selectedClusterIP);       
          view.moveApForm.controls['zoneData'].setValue((zoneSelectedText != undefined)?zoneSelectedText:"");
        }
        $("#moveApModal .close").click();
        view.sharedService.refresh(true);
        $('#apTable_processing').hide();
         // view.sharedService.dorefreshAPList(true); 
       }
     });
  }

  ngOnChanges(changes : SimpleChanges){
    let view = this;
    for (let propName in changes) {
      let change = changes[propName];
      console.log("Prop Name : " + propName + " , Change : " + JSON.stringify(change))
      if (propName == "multipleAPsSelected") {
        if (change.currentValue != undefined) {
          view.selectedApCount = change.currentValue;
          console.log(view.selectedApCount);
        }
      } 
      if (propName == "moveAP") {
        view.moveSelectedAP = change.currentValue;
        console.log(view.moveSelectedAP);
        if (view.moveSelectedAP != null) {
          if (view.moveSelectedAP.length == 1) {
            $('.card').show();
            console.log("view.moveSelectedAP.clustername : "+view.moveSelectedAP[0].clustername);
            console.log("view.moveSelectedAP.zonename : "+view.moveSelectedAP[0].zonename);
            view.apiData.cdsCLusterDetailsService(view.moveSelectedAP[0].clustername).subscribe(function(val){
              console.log(val);
              if(val.data != null){
                view.zoneList = val.data.zones;
                let index = 0;
                for(let zone of view.zoneList){
                  if (zone.name == "Staging Zone") {
                    index = view.zoneList.indexOf(zone);
                  }
                }
                view.zoneList.splice(index,1);
                let clusterSelectedText = (view.moveSelectedAP[0].clustername!="")?view.moveSelectedAP[0].clustername:"Select Cluster";
                let zoneSelectedText = (view.moveSelectedAP[0].zonename!="")?view.moveSelectedAP[0].zonename:"Select Zone";
                let selectedClusterIP = '';
                for (let i = 0; i < view.clusterList.length; ++i) {
                  if (view.clusterList[i].name == clusterSelectedText) {
                    selectedClusterIP=view.clusterList[i].ip;
                  }
                }
                // setTimeout(function(){ $("#zoneDropDown option:contains(" + zoneSelectedText + ")").attr('selected', 'selected');}, 20); 
                view.moveApForm.controls['ClusterData'].setValue(selectedClusterIP);       
                view.moveApForm.controls['zoneData'].setValue((zoneSelectedText != undefined)?zoneSelectedText:"");       
              }else{
                view.zoneList = [];
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
          } else if (view.moveSelectedAP.length > 1) {
            $('.card').hide();
            view.moveApForm.controls['ClusterData'].setValue('');
            view.moveApForm.controls['zoneData'].setValue('');
          }
        }
      }
    }

  }

  selectCluster(){
    this.clusterIp = this.moveApForm.get('ClusterData').value;    
    console.log("slected cluster Ip :"+ this.clusterIp);
    let view = this;
    if(view.clusterIp != ""){
      view.apiData.cdsCLusterDetailsService(view.clusterIp).subscribe(function(val){
        view.moveApForm.controls['zoneData'].setValue('');
        console.log(val);
        if(val.data != null){
          view.zoneList = val.data.zones;
          let index = 0;
          for(let zone of view.zoneList){
            if (zone.name == "Staging Zone") {
              index = view.zoneList.indexOf(zone);
            }
          }
          view.zoneList.splice(index,1);
        }else{
          view.zoneList = [];
          $('#zoneDropDown').children('option:not(:first)').remove();
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
    }else{
      view.moveApForm.controls['zoneData'].setValue('');
      view.zoneList = [];
      $('#zoneDropDown').children('option:not(:first)').remove();
    }
  }

  moveApDetails(event : Event){
    let view = this;
    view.click.next(view.moveSelectedAP);
    console.log(view.moveSelectedAP);
    
    if(view.moveApForm.valid) {
      view.loaderDisplay = 'block';
      view.successfulMultipleMove =0;
      view.unsuccessfulMultipleMove =0;



      if (view.moveSelectedAP.length == 1) {

        let name = view.moveApForm.get('apName').value!=null?view.moveApForm.get('apName').value:view.moveSelectedAP[0].apname;
        let clusterName = "";
        let clusterIP ="";
        for (let i = view.clusterList.length - 1; i >= 0; i--) {
          if (view.moveSelectedAP[0].clustername == view.clusterList[i].name) {
            clusterIP =view.clusterList[i].ip;
          }
        }
        clusterName = view.moveApForm.get('ClusterData').value!=""?view.moveApForm.get('ClusterData').value:clusterIP;
        let zoneName = view.moveApForm.get('zoneData').value!=null?view.moveApForm.get('zoneData').value:view.moveSelectedAP[0].zonename;
        
        view.apiData.cdsMoveAPService(view.moveSelectedAP[0].apserial, name, clusterName, zoneName).subscribe(function(val){
          console.log(val);
          view.response = val;
          view.loaderDisplay = 'none';
          view.refeshAPList.emit(true);
          if (view.response.success) {
            view.showAlertMessage('Success',view.response.message);
            $(view).find('form').trigger('reset');
            localStorage.setItem("checkunmanged", "true");
            view.sharedService.refresh(true);
          } else{
            view.showAlertMessage('Error',view.response.message);
          }
        },function(err){
          view.errorResponse = err;
          $('.modal-backdrop').hide();

          if (view.errorResponse.message.includes('Session')) {
            view.loaderDisplay = 'none';
            $("#moveApModal .close").click();
            view.sharedService.logout(true);
          } else {
            view.loaderDisplay = 'none';
            view.showAlertMessage(view.errorResponse.title,view.errorResponse.message);
          }
        });
      } else if(view.moveSelectedAP.length > 1) {
        for(let i=0;i< view.moveSelectedAP.length ; i++){
          let clusterName = view.moveApForm.get('ClusterData').value!=""?view.moveApForm.get('ClusterData').value:view.moveSelectedAP[i].clustername;
          if (view.moveApForm.get('ClusterData').value!="") {
            let zoneName = view.moveApForm.get('zoneData').value!=null?view.moveApForm.get('zoneData').value:null;
          } else {
            let zoneName = view.moveApForm.get('zoneData').value!=null?view.moveApForm.get('zoneData').value:view.moveSelectedAP[i].zonename;
          }
          view.apiData.cdsMoveAPService(view.moveSelectedAP[i].apserial, view.moveSelectedAP[i].apname, view.moveApForm.get('ClusterData').value, view.moveApForm.get('zoneData').value).subscribe(function(val){
            console.log(val);
            view.response = val;
            if (view.response.success) {
              console.log(view.response.message);
              view.successfulMultipleMove+=1;
              $(view).find('form').trigger('reset');
              localStorage.setItem("checkunmanged", "true");
              view.sharedService.refresh(true);
            } else{
              console.log(view.response.message);
              view.unsuccessfulMultipleMove+=1;
              view.resMessageArr.push(view.response.message);
            }
            if(i == (view.moveSelectedAP.length-1)){
              view.loaderDisplay = 'none';
              view.showAlertMessage('Alert',view.successfulMultipleMove + " APs moved successfully, "+view.unsuccessfulMultipleMove+" APs failed");
              view.moveSelectedAP = [];
              view.refeshAPList.emit(true);
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
    } else {
      view.showAlertMessage('Error','Please enter valid details.');
    }

  }

  cancelApDetails(){
    let view = this;
    $("#moveApModal .close").click();
    $('#apTable_processing').hide();
    if (view.moveSelectedAP && view.moveSelectedAP.length > 0) {
      if (view.moveSelectedAP && view.moveSelectedAP.length == 1) {
        $('#moveAPName').val(view.moveSelectedAP[0].apname);
        let clusterSelectedText = (view.moveSelectedAP[0].clustername!="")?view.moveSelectedAP[0].clustername:"Select Cluster";
        let zoneSelectedText = (view.moveSelectedAP[0].zonename!="")?view.moveSelectedAP[0].zonename:"Select Zone";
        let selectedClusterIP = '';
        for (let i = 0; i < view.clusterList.length; ++i) {
          if (view.clusterList[i].name == clusterSelectedText) {
            selectedClusterIP=view.clusterList[i].ip;
          }
        }
        view.moveApForm.controls['ClusterData'].setValue(selectedClusterIP);       
        view.moveApForm.controls['zoneData'].setValue((zoneSelectedText != undefined)?zoneSelectedText:"");
      } else {
        view.moveApForm.controls['ClusterData'].setValue('');
      }
      // this.refeshAPList.emit(true);
    }
  }

  showAlertMessage(title:string, message:string){
    this.moveAPTitle = title;
    this.moveAPMessage = message;

    $('#openMoveAPpopup').click();
  }

  okMoveAP(){
    this.resMessageArr = [];
    $("#moveApModal .close").click();
    $("#confirmMoveAPModal close").click();
  }

}
