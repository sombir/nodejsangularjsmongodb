import { Component, Output, Input, EventEmitter, OnChanges, SimpleChanges, OnInit, ViewChild } from '@angular/core';
import { ClusterData } from '../../../models/cluster';
import { CDSService } from '../../../services/httpAPI.service';
import { ResponseData, ErrorResponse } from '../../../models/response';
import { ShowConfirmationAlertComponent } from '../../show-confirmation-alert/show-confirmation-alert.component';
import { SharedService } from '../../../services/shared.service';


@Component({
	selector: 'delete-cluster',
	templateUrl: './deleteCluster.component.html',
	styleUrls: ['./deleteCluster.component.css']
})
export class DeleteClusterComponent implements OnChanges, OnInit {
	@Output() refreshListEvent = new EventEmitter<boolean>();
  @Input() selectedClusterListData : ClusterData[] = [];
  @Input() noCluster : boolean = false;
  @Input() hasAP : boolean = false;
  clusterList : ClusterData[];
  initialized : boolean = false;
  response : ResponseData;
  errorResponse : ErrorResponse;
  change : boolean = false;
  deleteConfirm : boolean = false;
  selectConfirm : boolean = true;
  apConfirm : boolean = false;
  deleteAPTitle:string="";
  deleteAPMessage:string="";
  noofClustersSelected:number=0;
  isAllSelected:boolean = false;
  constructor(private apiData : CDSService, private sharedService:SharedService){
  }

  ngOnInit(){
    // do stuff
    this.initialized = true;
    console.log('delete init');
    this.sharedService.clusterTableEntries.subscribe(noofClusters => {
      console.log(noofClusters);
      this.noofClustersSelected=noofClusters;
    });
  }

  ngOnChanges(changes : SimpleChanges){
    let checkCluster = 0;
    if(this.initialized){
      // do stuff when ngOnInit has been called
      for (let propName in changes) {  
        let change = changes[propName];
        console.log(change);
        if (propName == "selectedClusterListData") {
          // code...
          this.clusterList = change.currentValue;

          if (this.clusterList != null && this.clusterList.length !=0) {
            this.deleteConfirm = true;
            this.selectConfirm = false;
            this.apConfirm = false;
          } else {
            this.deleteConfirm = false;
            this.selectConfirm = true;
            this.apConfirm = false;
          }
          
        } else if (propName == "noCluster") {
          this.deleteConfirm = false;
          this.selectConfirm = true;
          this.apConfirm = false;
        } else if(propName == "hasAP"){
          this.deleteConfirm = false;
          this.selectConfirm = false;
          this.apConfirm = true;
        }
      }
    }
  }

  deleteCluster(){
    let view = this;
    let successTimes=0;
    let errorTimes=0;
    
    if (view.noofClustersSelected == view.clusterList.length) {
      console.log('All Selected');
      view.isAllSelected = true;
    }
    for ( let i=0;i< view.clusterList.length ;i++){
      let ip = view.clusterList[i].ip;
      view.apiData.cdsDeleteClusterService(ip).subscribe(function(val) {
        view.response = val;
        if (view.response.success) {
          successTimes+=1;
        } else {
          errorTimes+=1;
        }
        if (i==(view.clusterList.length-1)) {
          if(successTimes>0) {
            localStorage.setItem("checkunmanged", "true");
            view.sharedService.refresh(true);
          }
          view.showMessage(successTimes,errorTimes);
        }
      },function(err){
        view.errorResponse = err;
        errorTimes+=1;
        if (view.errorResponse.message.includes('Session')) {
          $('#deleteClusterModal .close').click();
          view.sharedService.logout(true);
        } else {
          view.showAlertMessage(view.errorResponse.title,view.errorResponse.message);
        }
      });
    }

  }

  showMessage(successTimes,errorTimes){
    let view=this;
    if ((view.clusterList.length == 1) && (successTimes == view.clusterList.length)) {
      view.showAlertMessage('Success','Cluster deleted successfully');
    } else if (successTimes == view.clusterList.length) {
      view.showAlertMessage('Success', 'All selected clusters deleted successfully');
    } else if ((errorTimes!=0) && (errorTimes == view.clusterList.length) && (view.clusterList.length==1)) {
      view.showAlertMessage('Error', 'Error occured while deleting the cluster');
    } else if ((errorTimes!=0) && (errorTimes == view.clusterList.length) && (view.clusterList.length>1)) {
      view.showAlertMessage('Error', 'Error occured while deleting the selected clusters');
    } else if ((errorTimes>1) && (successTimes>1)) {
      view.showAlertMessage('Alert', successTimes + ' clusters deleted successfully, and error occured while deleting ' + errorTimes + ' clusters');
    } else if ((errorTimes==1) && (successTimes==1)) {
      view.showAlertMessage('Alert', successTimes + ' cluster deleted successfully, and error occured while deleting ' + errorTimes + ' cluster');
    } else if ((errorTimes>1) && (successTimes==1)) {
      view.showAlertMessage('Alert', successTimes + ' cluster deleted successfully, and error occured while deleting ' + errorTimes + ' clusters');
    } else if ((errorTimes==1) && (successTimes>1)) {
      view.showAlertMessage('Alert', successTimes + ' clusters deleted successfully, and error occured while deleting ' + errorTimes + ' cluster');
    }
    view.change=!view.change
    view.refreshListEvent.emit(view.change);
    console.log('view.isAllSelected : ' + view.isAllSelected);
    view.sharedService.isAllDeleted(view.isAllSelected);
  }

  cancel(){
    $('#deleteClusterModal .close').click();
  }

  selectedClusters(clusterList : ClusterData[]){
    this.clusterList = clusterList;
  }
  showAlertMessage(title:string, message:string){
    this.deleteAPMessage=message;
    this.deleteAPTitle=title;

    $('#openDeleteClusterpopup').click();

  }

  okDeleteCluster(){
    $('#deleteClusterModal .close').click();
    $("#confirmDeleteClusterModal close").click();
  }
}
