import { Component, Inject, OnInit, Input, Output, EventEmitter, AfterViewInit, OnChanges, SimpleChanges, ViewChild, ComponentFactoryResolver} from '@angular/core';
import { Location } from '@angular/common'; 
import { Router } from '@angular/router'; 
import { ActivatedRoute, Params } from '@angular/router'; 
import { CDSService } from '../../services/httpAPI.service';
import { SharedService } from '../../services/shared.service';
import {CookieService} from 'angular2-cookie/core';
import { ClusterListComponent } from './ClusterList/clusterList.component';
import * as $ from 'jquery';
import { ClusterData } from '../../models/cluster';
import { ResponseData } from '../../models/response';
import { ShowConfirmationAlertComponent } from '../show-confirmation-alert/show-confirmation-alert.component';

@Component({
  selector: 'cluster',
  templateUrl: './cluster.component.html',
  styleUrls: ['./cluster.component.css']
})
export class ClusterComponent implements OnInit, AfterViewInit  {
  @ViewChild(ClusterListComponent) clusterListComponent : ClusterListComponent;
  @Output() goToClusterDetailPageEvent = new EventEmitter<ClusterData>();
  @Output() refreshInventoryPageEvent = new EventEmitter<boolean>();
  selectedClusters : ClusterData[];
  noClusterSelected :boolean;
  numberofclusters : number = 0;
  doAddRefreshList : boolean = null;
  doDeleteRefreshList : boolean = null;
  doImportRefreshList : boolean = null;
  doEditRefreshList : boolean = null;
  doRefreshInventory : boolean = false;
  addClusterdisplay : string = 'none';
  deleteClusterdisplay : string = 'none';
  loaderDisplay : string = 'none';
  importAPDisplay : string='none';
  doDelete:boolean = false;
  doLoad : boolean = false;
  clusterList : ClusterData[]=[];
  selectedClusterListData : ClusterData[]=[];
  selectedClusterForEdit: ClusterData[]=[];
  response : ResponseData;
  errorResponse : ResponseData;
  change : boolean = false;
  changeCluster : boolean = false;
  hasAPCluster : boolean;
  noClusterToEdit:boolean;
  refreshcluster : boolean = false;
  clusterSelected : boolean = false;
  multipleCluserSelected : boolean = false;
  selectedClusterForImport : string="";
  modelTitle: String = '';
  modelMessage: String = '';
  editCluster:boolean;
  btnEnabled:boolean = true;

  constructor(private router: Router, private apiData : CDSService, private _cookieService:CookieService, private sharedService:SharedService, private componentFactoryResolver: ComponentFactoryResolver){
  }

  ngOnInit(){
    // code...
    $('body').css('background-color', '#D9E0E7');
    this.sharedService.currentRefreshInventory.subscribe(msg => this.doRefreshInventory = msg);
  }

  ngAfterViewInit(){
    //code...
  }

  receiveMessage(cnt : number){
    this.numberofclusters = cnt;
  }
  receiveResponse(result : boolean){
    this.btnEnabled = result;
  }
  addClusterBtn(){
    this.addClusterdisplay = 'block';
  }

  deleteClusterBtn(){
    console.log(this.clusterList);
    let hasAPs = 0
    if (this.clusterList.length==0) {
      this.change = !this.change;
      this.noClusterSelected = this.change;
      this.selectedClusterListData = [];
    } else{
      for(let cluster of this.clusterList){
        if (cluster.numberofaps > 0) {
          hasAPs = hasAPs +1;
        }
      }
      if (hasAPs > 0) {
        this.change = !this.change;
        this.hasAPCluster = this.change;
        this.selectedClusterListData = [];
      } else {
        this.selectedClusterListData = this.clusterList;
      }
    } 
    this.deleteClusterdisplay = 'block';
  }

  receiveAddRefresh(isRefresh : boolean){
    this.doAddRefreshList = isRefresh;
    this.addClusterdisplay = 'none;';
  }

  receiveDeleteRefresh(isRefresh : boolean){
    this.doDeleteRefreshList = isRefresh;
    this.deleteClusterdisplay = 'none;';
  }

  receiveImportRefresh(isRefresh : boolean){
    this.doImportRefreshList = isRefresh;
    if (isRefresh) {
    }
  }

  receiveEditRefresh(isRefresh : boolean){
    this.doEditRefreshList= isRefresh;
    if (isRefresh) {
    }
  }

  searchCluster(searchtext:string){
    console.log(searchtext);
  }

  selectedClusterList(clusterList : ClusterData[]){
    this.clusterList = clusterList;
    console.log(this.clusterList);
  }

  refreshClusterBtn(){
    this.changeCluster = !this.changeCluster;
    this.refreshcluster = this.changeCluster;
  }

  goToClusterDetail(){
    if (this.clusterList.length == 1) {
      this.router.navigate(['dashboard/clusterDetail', this.clusterList[0].ip]);
    }
  }

  importBtn(){
    console.log(this.clusterList);
    this.importAPDisplay='block';
    if (this.clusterList.length==0) {
      this.change = !this.change;
      this.noClusterSelected = this.change;
      this.selectedClusterForImport = null;
    } else if (this.clusterList.length == 1) {
      this.change = !this.change;
      this.clusterSelected = this.change;
      this.selectedClusterForImport = this.clusterList[0].name;
    } else {
      this.change = !this.change;
      this.multipleCluserSelected = this.change;
      this.selectedClusterForImport = null;
    }
  }

  editClusterBtn(){
    console.log(this.clusterList);
    if (this.clusterList.length == 1) {
      this.sharedService.editCluter(this.clusterList[0]);  
    } else {
      this.sharedService.editCluter(null);
    }
    this.change=!this.change;
    this.editCluster=this.change;
  }

  onOk(){
    this.modelTitle = '';
    this.modelMessage = '';
    jQuery('#clusterModelDialog').modal('hide');
  }

}
