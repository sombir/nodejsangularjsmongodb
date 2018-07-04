import { Component, OnInit, AfterViewInit, ViewChild, Input, ComponentFactoryResolver, ViewContainerRef } from '@angular/core';
import { TreeComponent, ITreeOptions } from 'angular-tree-component';
import { Router } from '@angular/router'; 
import { ActivatedRoute, Params } from '@angular/router'; 
import { CDSService } from '../../services/httpAPI.service';
import { ClusterData, ClusterListData } from '../../models/cluster';
import {CookieService} from 'angular2-cookie/core';
import { ApDataArray, ApListResponse } from '../../models/ap';
import {HttpClient, HttpHeaders, HttpResponse, HttpParams} from '@angular/common/http';
import { ManagedApComponent } from './managed-ap/managed-ap.component';
import { SharedService } from '../../services/shared.service';
import { ResponseData, ErrorResponse } from '../../models/response';

@Component({
  selector: 'app-inventory-list',
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.css']
})
export class InventoryListComponent implements OnInit, AfterViewInit {
  @ViewChild(TreeComponent)
  private tree: TreeComponent;
  @ViewChild('managedAP', { read: ViewContainerRef }) managedAP: ViewContainerRef;
  apFilterText:string="";
  response : ClusterListData;
  errorResponse : ErrorResponse;
  clusterList : ClusterData[] = [];
  event : any;
  nodes: any[] = [{
    isExpanded: true,
    name: 'All Clusters',
    children:[],
    isCluster:true,
    id:'1234512345'
  },{
    isExpanded: false,
    name: 'Unmanaged APs',
    children:[{name:'1'}],
    isCluster:true,
    id:'67896789'
  }];
  options: ITreeOptions = {
    idField: 'id',
    displayField: 'name',
    childrenField: 'children'
  };
  filterClusterName : string="";
  filterZoneName:string="";
  componentFactory:any;
  apsCount : number = 0;
  unmanagedAPResponse : ApListResponse = null;
  managedAPComponentInstance:any;
  clusterName : string = "";
  selectedClusterForAPImport:string="";
  importAPDisplay : string='none';
  selectedZoneName : string="";
  selectedClusterName : string="";
  selectedZoneID : string="";
  selectedClusterID : string="";
  modelTitle: String = '';
  modelMessage: String = '';
  filterOnlineText:string='';
  filterFlaggedText:string='';
  filterOfflineText:string='';
  filterUnmanagedText:string='';

  constructor(private router: Router, private route: ActivatedRoute, private r:ActivatedRoute, private apiData : CDSService, private _cookieService:CookieService, private http:HttpClient, private componentFactoryResolver: ComponentFactoryResolver, private sharedService:SharedService) {
  }

  ngOnInit() {
    let view = this;
    $('body').css('background-color', '#D9E0E7');

    view.sharedService.import.subscribe(msg => {
      view.selectedClusterForAPImport = msg;
      this.importAPDisplay = 'block';
    });

    this.sharedService.refreshAP.subscribe(msg => {
      view.clusterName = msg; 
      console.log(msg); 
      console.log(view.clusterName);
      if (view.clusterName != "") {
        for (let i = 0; i < view.tree.treeModel.nodes[0].children.length; ++i) {
          if (view.tree.treeModel.nodes[0].children[i].name == view.clusterName) {
            console.log(view.tree.treeModel.nodes[0].children[i]);
            console.log(view.tree.treeModel.getNodeById(view.tree.treeModel.nodes[0].children[i].id));
            view.tree.treeModel.getNodeById(view.tree.treeModel.nodes[0].children[i].id).toggleActivated();
            return;
          } else {
            view.tree.treeModel.getFirstRoot().toggleActivated();
          }
        } 
      }
    });

    view.sharedService.apCount.subscribe(apcount=>{
      view.apsCount=apcount;
    });

    view.sharedService.doRefreshAPTree.subscribe(val=>{
      if(val) {
        if(!view.tree.treeModel.getFirstRoot().isActive) {
          view.tree.treeModel.getFirstRoot().toggleActivated();
        }else{
          view.tree.treeModel.getFirstRoot().toggleActivated();
          view.tree.treeModel.getFirstRoot().toggleActivated();
        }
      }
    });

    view.sharedService.clusterList.subscribe(val=>{
      console.log('update cl in inventory list > tree');
      view.response = val;
      view.clusterList = view.response.list;
      view.nodes[0].children=[];
      for (let i = 0; i < view.clusterList.length; ++i) {
        let obj = {name : "", id : "", children : [], onlineAP:0, offlineAP:0, flaggedAP:0, isCluster:false};
        obj.name = view.clusterList[i].name;
        obj.id = view.clusterList[i].ip;
        obj.isCluster = true;
        if (view.clusterList[i].stats != null || view.clusterList[i].stats != undefined) {
          console.log('has stats');
          if (view.clusterList[i].stats.zoneinventory != null || view.clusterList[i].stats.zoneinventory != undefined) {
            console.log('has zoneinventory');
            if (view.clusterList[i].stats.zoneinventory.zonesummary != null || view.clusterList[i].stats.zoneinventory.zonesummary != undefined) {
              console.log('has zonesummary');
              for (let j = 0; j < view.clusterList[i].stats.zoneinventory.zonesummary.length; ++j) {
                let childObj = {name : "", id : "", children : [], onlineAP:0, offlineAP:0, flaggedAP:0, isCluster:false};
                childObj.name = view.clusterList[i].stats.zoneinventory.zonesummary[j].zoneName;
                childObj.id = view.clusterList[i].stats.zoneinventory.zonesummary[j].zoneId+'+'+obj.id;
                childObj.onlineAP = view.clusterList[i].stats.zoneinventory.zonesummary[j].apOnline;
                childObj.offlineAP = view.clusterList[i].stats.zoneinventory.zonesummary[j].apOffline;
                childObj.flaggedAP = view.clusterList[i].stats.zoneinventory.zonesummary[j].apFlagged;
                obj.children.push(childObj);
              }
              console.log(obj);
            }
          }
        }
        view.nodes[0].children.push(obj);  
        // view.nodes[1].children.push(obj);  
      }      
      console.log(view.nodes);
      view.tree.treeModel.update();

      view.tree.treeModel.getFirstRoot().toggleActivated();
    });

    


    view.sharedService.onlineManagedAP.subscribe(val=>{
      console.log(' show online managed ap');
      view.sharedService.clusterZoneSelected('All Clusters');
      view.filterOnlineText=val;
      view.filterOfflineText='';
      view.filterFlaggedText='';
      view.filterUnmanagedText='';
      if(!view.tree.treeModel.getNodeById('1234512345').isActive) {
        view.tree.treeModel.getNodeById('1234512345').toggleActivated();
      } else {
        view.tree.treeModel.getNodeById('1234512345').toggleActivated();
        view.tree.treeModel.getNodeById('1234512345').toggleActivated();
      }
    });
    view.sharedService.flaggedManagedAP.subscribe(val=>{
      console.log(' show flagged managed ap');
      view.sharedService.clusterZoneSelected('All Clusters');
      view.filterOnlineText='';
      view.filterOfflineText='';
      view.filterFlaggedText=val;
      view.filterUnmanagedText='';
      if(!view.tree.treeModel.getNodeById('1234512345').isActive) {
        view.tree.treeModel.getNodeById('1234512345').toggleActivated();
      } else {
        view.tree.treeModel.getNodeById('1234512345').toggleActivated();
        view.tree.treeModel.getNodeById('1234512345').toggleActivated();
      }
    });
    view.sharedService.offlineManagedAP.subscribe(val=>{
      console.log(' show offline managed ap');
      view.sharedService.clusterZoneSelected('All Clusters');
      view.filterOnlineText='';
      view.filterOfflineText=val;
      view.filterFlaggedText='';
      view.filterUnmanagedText='';
      if(!view.tree.treeModel.getNodeById('1234512345').isActive) {
        view.tree.treeModel.getNodeById('1234512345').toggleActivated();
      } else {
        view.tree.treeModel.getNodeById('1234512345').toggleActivated();
        view.tree.treeModel.getNodeById('1234512345').toggleActivated();
      }
    });
    view.sharedService.unmanagedAP.subscribe(val=>{
      console.log(' show unmanaged ap');
      view.sharedService.clusterZoneSelected('Unmanaged APs');
      view.filterOnlineText='';
      view.filterOfflineText='';
      view.filterFlaggedText='';
      view.filterUnmanagedText=val;
      if(!view.tree.treeModel.getNodeById('67896789').isActive) {
        view.tree.treeModel.getNodeById('67896789').toggleActivated();
      } else {
        view.tree.treeModel.getNodeById('67896789').toggleActivated();
        view.tree.treeModel.getNodeById('67896789').toggleActivated();
      }
    });

    view.sharedService.doRefresh.subscribe(val=>{
      if(val){
        view.filterOnlineText='';
        view.filterOfflineText='';
        view.filterFlaggedText='';
        view.filterUnmanagedText='';
      }
    });

  }

  refreshAPTree(){
    let view=this;
    view.apiData.cdsCLusterListService().subscribe(function(val){
      view.response = val;
      view.clusterList = view.response.list;
      view.nodes[0].children=[];
      for (let i = 0; i < view.clusterList.length; ++i) {
        let obj = {name : "", id : "", children : [], onlineAP:0, offlineAP:0, flaggedAP:0, isCluster:false};
        obj.name = view.clusterList[i].name;
        obj.id = view.clusterList[i].ip;
        obj.isCluster = true;
        if (view.clusterList[i].stats != null || view.clusterList[i].stats != undefined) {
          console.log('has stats');
          if (view.clusterList[i].stats.zoneinventory != null || view.clusterList[i].stats.zoneinventory != undefined) {
            console.log('has zoneinventory');
            if (view.clusterList[i].stats.zoneinventory.zonesummary != null || view.clusterList[i].stats.zoneinventory.zonesummary != undefined) {
              console.log('has zonesummary');
              for (let j = 0; j < view.clusterList[i].stats.zoneinventory.zonesummary.length; ++j) {
                let childObj = {name : "", id : "", children : [], onlineAP:0, offlineAP:0, flaggedAP:0, isCluster:false};
                childObj.name = view.clusterList[i].stats.zoneinventory.zonesummary[j].zoneName;
                childObj.id = view.clusterList[i].stats.zoneinventory.zonesummary[j].zoneId+'+'+obj.id;
                childObj.onlineAP = view.clusterList[i].stats.zoneinventory.zonesummary[j].apOnline;
                childObj.offlineAP = view.clusterList[i].stats.zoneinventory.zonesummary[j].apOffline;
                childObj.flaggedAP = view.clusterList[i].stats.zoneinventory.zonesummary[j].apFlagged;
                obj.children.push(childObj);
              }
              console.log(obj);
            }
          }
        }
        view.nodes[0].children.push(obj);  
        // view.nodes[1].children.push(obj);  
      }      
      console.log(view.nodes);
      view.tree.treeModel.update();
      if(!view.tree.treeModel.getFirstRoot().isActive) {
        view.tree.treeModel.getFirstRoot().toggleActivated();
      } else{
        view.tree.treeModel.getFirstRoot().toggleActivated();
        view.tree.treeModel.getFirstRoot().toggleActivated();
      }
    },function(err){
      view.errorResponse = err;

      if (view.errorResponse.message.includes('Session')) {
        view.sharedService.logout(true);
      } else {
        view.modelTitle= view.errorResponse.title;
        view.modelMessage = view.errorResponse.message;
        jQuery('#inventoryListModelDialog').modal('show');
      }
    });
  }

  ngAfterViewInit(){
    let view= this;
    view.tree.sizeChanged();   
    console.log('ngAfterViewInit'); 

  }

  toggleClick(e){
    console.log(e);
    e.preventDefault();
    this.event = e;
    $("#Wrapper").toggleClass("toggled");
    $('.menu-toggle').find('i').toggleClass('fa-caret-right fa-caret-left');
  }

  onEvent(e){
    let view = this;
    let parentNode=""
    console.log(e);
    view.filterClusterName = "";
    view.filterZoneName = "";
    
    if(e.eventName.includes("activate")){
      console.log(e.node.data.name);

      if (e.node.data.name.includes('All Clusters')) {
        view.apFilterText="(managed)";
        view.sharedService.clusterZoneSelected('All Clusters');
      } else if (!e.node.data.name.includes('Unmanaged APs')) {
        if (e.node.parent.data.name.includes('All Clusters') || e.node.parent.data.name.includes('Unmanaged APs')) {
          view.filterClusterName = e.node.data.name;
          view.apFilterText= "&clustername="+view.filterClusterName;
          view.sharedService.clusterZoneSelected(view.filterClusterName);
          if (e.node.parent.data.name.includes('All Clusters')) {
            view.apFilterText = '(managed)'+view.apFilterText;
          } else if (e.node.parent.data.name.includes('Unmanaged APs')) {
            view.apFilterText = '(unmanaged)'+view.apFilterText;
          }
        } else {
          view.filterClusterName = e.node.parent.data.name;
          view.filterZoneName = e.node.data.name;
          view.apFilterText ="&clustername="+view.filterClusterName+"&zonename="+view.filterZoneName;
          if(e.node.parent.parent.data.name.includes('All Cluster')) {
            view.apFilterText = '(managed)'+view.apFilterText;
          } else if(e.node.parent.parent.data.name.includes('Unmanaged APs')) {
            view.apFilterText = '(unmanaged)'+view.apFilterText;
          }
          view.sharedService.clusterZoneSelected(view.filterClusterName + ' > ' + view.filterZoneName);
        }
      } else if (e.node.data.name.includes('Unmanaged APs')) {
        view.apFilterText="(unmanaged)";
        view.sharedService.clusterZoneSelected('Unmanaged APs');
      }

      const componentFactory = this.componentFactoryResolver.resolveComponentFactory(ManagedApComponent);
      this.managedAP.clear();
      const dyynamicComponent = <ManagedApComponent>this.managedAP.createComponent(componentFactory).instance;
      dyynamicComponent.queryString = view.apFilterText;
      if(view.filterOnlineText!='') {
        dyynamicComponent.searchText=view.filterOnlineText;
      } else if(view.filterFlaggedText!='') {
        dyynamicComponent.searchText=view.filterFlaggedText;
      } else if(view.filterOfflineText!='') {
        dyynamicComponent.searchText=view.filterOfflineText;
      } else if(view.filterUnmanagedText!='') {
        dyynamicComponent.searchText=view.filterUnmanagedText;
      }
    }
  }


  treeHideClick(e){
    e.preventDefault();
    console.log(e);
    $('#SideBar').hide();
    $('#page-content-wrapper').show();
  }

  treeShowClick(e){
    e.preventDefault();
    console.log(e);      
    $('#SideBar').show();
    $('#page-content-wrapper').hide();
  }

  recieveRefresh(event){
    this.sharedService.inventoryUpdated.emit(true);
  }

  onOk(){
    this.modelTitle = '';
    this.modelMessage = '';
    jQuery('#inventoryListModelDialog').modal('hide');
  }

}
